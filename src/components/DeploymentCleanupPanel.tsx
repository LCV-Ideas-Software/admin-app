import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Cloud, Loader2, Play, RotateCcw, Search, Trash2 } from 'lucide-react'
import { useNotification } from './Notification'
import './DeploymentCleanupPanel.css'

/* ── Types ── */
type DeploymentInfo = {
  id: string
  short_id: string
  created_on: string
  environment: string
  url: string
}

type ProjectScan = {
  name: string
  totalDeployments: number
  latestDeployment: {
    id: string
    created_on: string
    environment: string
    url: string
  } | null
  obsoleteDeployments: DeploymentInfo[]
}

type ScanResponse = {
  accountId: string
  projects: ProjectScan[]
  totalProjects: number
  totalDeployments: number
  totalObsolete: number
}

type LogLine = {
  id: number
  text: string
  tone: 'success' | 'error' | 'info' | 'warn' | 'dim' | 'default'
}

type PanelState = 'idle' | 'scanning' | 'scanned' | 'purging' | 'complete'

/* ── Helpers ── */
const fmtDate = (iso: string) => {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 19)
  }
}

const shortId = (id: string) => id.slice(0, 8)

let logIdCounter = 0

/* ── Component ── */
export function DeploymentCleanupPanel() {
  const { showNotification } = useNotification()
  const [state, setState] = useState<PanelState>('idle')
  const [scanData, setScanData] = useState<ScanResponse | null>(null)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [purgeResults, setPurgeResults] = useState({ success: 0, failed: 0 })
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef(false)

  /** Utilitário para adicionar linha ao log */
  const addLog = useCallback((text: string, tone: LogLine['tone'] = 'default') => {
    setLogs((prev) => [...prev, { id: ++logIdCounter, text, tone }])
  }, [])

  /** Auto-scroll do terminal */
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  /* ── SCAN ── */
  const handleScan = useCallback(async () => {
    setState('scanning')
    setScanData(null)
    setLogs([])
    setPurgeResults({ success: 0, failed: 0 })
    setProgress({ current: 0, total: 0 })
    addLog('Iniciando varredura da infraestrutura Cloudflare Pages...', 'info')

    try {
      const res = await fetch('/api/cfpw/cleanup-deployments')
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const data = (await res.json()) as ScanResponse
      setScanData(data)

      addLog(`Conta: ${data.accountId}`, 'dim')
      addLog(`Detectados ${data.totalProjects} projeto(s) com ${data.totalDeployments} deployment(s) total.`, 'info')

      if (data.totalObsolete === 0) {
        addLog('✓ Infraestrutura otimizada — nenhum deployment obsoleto encontrado.', 'success')
        showNotification('Infraestrutura otimizada — nenhum deployment obsoleto.', 'success')
      } else {
        addLog(`⚠ ${data.totalObsolete} deployment(s) obsoleto(s) identificado(s) para expurgo.`, 'warn')
        showNotification(`${data.totalObsolete} deployment(s) obsoleto(s) identificado(s).`, 'info')
      }

      // Log detalhado por projeto
      for (const p of data.projects) {
        if (p.obsoleteDeployments.length > 0) {
          addLog(`  → ${p.name}: ${p.totalDeployments} deploy(s), ${p.obsoleteDeployments.length} obsoleto(s)`, 'warn')
        } else {
          addLog(`  ✓ ${p.name}: ${p.totalDeployments} deploy(s) — OK`, 'dim')
        }
      }

      setState('scanned')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      addLog(`✗ Falha no scan: ${msg}`, 'error')
      showNotification(`Falha no scan: ${msg}`, 'error')
      setState('idle')
    }
  }, [addLog, showNotification])

  /* ── PURGE — abre modal de confirmação ── */
  const handlePurge = useCallback(() => {
    if (!scanData) return
    const allObsolete = scanData.projects.flatMap((p) =>
      p.obsoleteDeployments.map((d) => ({ projectName: p.name, ...d })),
    )
    if (allObsolete.length === 0) return
    setPendingConfirm(true)
  }, [scanData])

  /* ── PURGE — execução real após confirmação ── */
  const executePurge = useCallback(async () => {
    if (!scanData) return
    setPendingConfirm(false)

    const allObsolete = scanData.projects.flatMap((p) =>
      p.obsoleteDeployments.map((d) => ({ projectName: p.name, ...d })),
    )

    setState('purging')
    abortRef.current = false
    const total = allObsolete.length
    setProgress({ current: 0, total })
    setPurgeResults({ success: 0, failed: 0 })

    addLog('', 'dim')
    addLog('═══ Iniciando expurgo de deployments obsoletos ═══', 'info')

    let successCount = 0
    let failedCount = 0

    for (let i = 0; i < allObsolete.length; i++) {
      if (abortRef.current) {
        addLog('⊘ Operação interrompida pelo operador.', 'warn')
        break
      }

      const item = allObsolete[i]
      const label = `[${item.projectName}] ${shortId(item.id)}`

      addLog(`  → Deletando ${label}...`, 'default')

      try {
        const res = await fetch('/api/cfpw/cleanup-deployments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectName: item.projectName,
            deploymentId: item.id,
          }),
        })

        if (res.ok) {
          successCount++
          addLog(`    ✓ ${label} removido`, 'success')
        } else {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string }
          failedCount++
          addLog(`    ✗ ${label}: ${err.error ?? 'Falha'}`, 'error')
        }
      } catch (err) {
        failedCount++
        addLog(`    ✗ ${label}: ${err instanceof Error ? err.message : 'Erro de rede'}`, 'error')
      }

      setProgress({ current: i + 1, total })
      setPurgeResults({ success: successCount, failed: failedCount })
    }

    addLog('', 'dim')
    if (abortRef.current) {
      showNotification('Operação interrompida pelo operador.', 'info')
    } else if (failedCount === 0) {
      addLog(`✓ Governança concluída — ${successCount} deployment(s) destruído(s).`, 'success')
      showNotification(`Governança concluída — ${successCount} deployment(s) destruído(s).`, 'success')
    } else {
      addLog(`⚠ Concluído — ${successCount} sucesso(s), ${failedCount} falha(s).`, 'warn')
      showNotification(`Expurgo parcial: ${successCount} sucesso(s), ${failedCount} falha(s).`, 'error')
    }

    setState('complete')
  }, [scanData, addLog, showNotification])

  /** Abortar operação em andamento */
  const handleAbort = useCallback(() => {
    abortRef.current = true
  }, [])

  /** Reset para o estado inicial */
  const handleReset = useCallback(() => {
    setState('idle')
    setScanData(null)
    setLogs([])
    setProgress({ current: 0, total: 0 })
    setPurgeResults({ success: 0, failed: 0 })
    abortRef.current = false
  }, [])

  const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  const hasObsolete = (scanData?.totalObsolete ?? 0) > 0

  return (
    <div className="deploy-cleanup">
      {/* ── Summary Stats (após scan) ── */}
      {scanData && state !== 'idle' && (
        <div className="deploy-cleanup__summary">
          <div className="deploy-cleanup__stat">
            <span className="deploy-cleanup__stat-value">{scanData.totalProjects}</span>
            <span className="deploy-cleanup__stat-label">Projetos</span>
          </div>
          <div className="deploy-cleanup__stat">
            <span className="deploy-cleanup__stat-value">{scanData.totalDeployments}</span>
            <span className="deploy-cleanup__stat-label">Deployments</span>
          </div>
          <div className="deploy-cleanup__stat">
            <span className="deploy-cleanup__stat-value">{scanData.totalObsolete}</span>
            <span className="deploy-cleanup__stat-label">Obsoletos</span>
          </div>
          <div className="deploy-cleanup__stat">
            <span className="deploy-cleanup__stat-value">
              {scanData.totalDeployments > 0
                ? Math.round(
                    ((scanData.totalDeployments - scanData.totalObsolete) /
                      scanData.totalDeployments) *
                      100,
                  )
                : 100}
              %
            </span>
            <span className="deploy-cleanup__stat-label">Eficiência</span>
          </div>
        </div>
      )}

      {/* ── Project Cards (após scan) ── */}
      {scanData && state === 'scanned' && (
        <div className="deploy-cleanup__projects">
          {scanData.projects.map((p) => {
            const isClean = p.obsoleteDeployments.length === 0
            return (
              <div
                key={p.name}
                className={`deploy-cleanup__project ${isClean ? 'deploy-cleanup__project--clean' : 'deploy-cleanup__project--dirty'}`}
              >
                <div className="deploy-cleanup__project-name">
                  <Cloud size={13} />
                  {p.name}
                  {isClean ? (
                    <span className="deploy-cleanup__badge deploy-cleanup__badge--ok">
                      Otimizado
                    </span>
                  ) : (
                    <span className="deploy-cleanup__badge deploy-cleanup__badge--obsolete">
                      {p.obsoleteDeployments.length} obsoleto(s)
                    </span>
                  )}
                </div>
                <div className="deploy-cleanup__project-meta">
                  <div>Total: {p.totalDeployments} deploy(s)</div>
                  {p.latestDeployment && (
                    <div>
                      Retido: {shortId(p.latestDeployment.id)} —{' '}
                      {fmtDate(p.latestDeployment.created_on)}
                      {p.latestDeployment.environment
                        ? ` (${p.latestDeployment.environment})`
                        : ''}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Progress Bar (durante purge) ── */}
      {(state === 'purging' || state === 'complete') && progress.total > 0 && (
        <div className="deploy-cleanup__progress-wrap">
          <div className="deploy-cleanup__progress-info">
            <span>
              {progress.current}/{progress.total} operação(ões)
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="deploy-cleanup__progress-bar">
            <div
              className={`deploy-cleanup__progress-fill ${state === 'complete' ? 'deploy-cleanup__progress-fill--done' : ''}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Terminal Log ── */}
      {logs.length > 0 && (
        <div className="deploy-cleanup__terminal">
          <div className="deploy-cleanup__terminal-header">
            <div className="deploy-cleanup__terminal-dots">
              <span className="deploy-cleanup__terminal-dot" />
              <span className="deploy-cleanup__terminal-dot" />
              <span className="deploy-cleanup__terminal-dot" />
            </div>
            <span>Cloudflare Pages Deploys</span>
            {state === 'purging' && (
              <span className="deploy-cleanup__scanning-label">● processando</span>
            )}
          </div>
          <div className="deploy-cleanup__terminal-body" ref={terminalRef}>
            {logs.map((log) => (
              <div key={log.id} className="deploy-cleanup__log-line">
                <span className="deploy-cleanup__log-prefix">{'$'}</span>
                <span className={`deploy-cleanup__log-text deploy-cleanup__log-text--${log.tone}`}>
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Complete Summary ── */}
      {state === 'complete' && (
        <div
          className={`deploy-cleanup__complete ${purgeResults.failed === 0 ? 'deploy-cleanup__complete--success' : 'deploy-cleanup__complete--partial'}`}
        >
          <span className="deploy-cleanup__complete-icon">
            {purgeResults.failed === 0 ? '🎯' : '⚠️'}
          </span>
          <div className="deploy-cleanup__complete-text">
            <strong>Governança concluída.</strong>{' '}
            {purgeResults.success > 0 && (
              <span>{purgeResults.success} deployment(s) destruído(s) com sucesso. </span>
            )}
            {purgeResults.failed > 0 && (
              <span>{purgeResults.failed} falha(s) — verifique permissões do token.</span>
            )}
            {purgeResults.success === 0 && purgeResults.failed === 0 && (
              <span>Nenhum deployment processado.</span>
            )}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="deploy-cleanup__actions">
        {state === 'idle' && (
          <button
            type="button"
            className="deploy-cleanup__btn deploy-cleanup__btn--primary"
            onClick={handleScan}
          >
            <Search size={14} />
            Mapear Infraestrutura
          </button>
        )}

        {state === 'scanning' && (
          <span className="deploy-cleanup__scanning-label">
            <Loader2 size={14} style={{ display: 'inline', animation: 'spin 1s linear infinite' }} />{' '}
            Mapeando infraestrutura Cloudflare...
          </span>
        )}

        {state === 'scanned' && (
          <>
            {hasObsolete && (
              <button
                type="button"
                className="deploy-cleanup__btn deploy-cleanup__btn--danger"
                onClick={handlePurge}
              >
                <Trash2 size={14} />
                Expurgar {scanData?.totalObsolete} Obsoleto(s)
              </button>
            )}
            <button
              type="button"
              className="deploy-cleanup__btn deploy-cleanup__btn--ghost"
              onClick={handleScan}
            >
              <RotateCcw size={14} />
              Re-escanear
            </button>
          </>
        )}

        {state === 'purging' && (
          <button
            type="button"
            className="deploy-cleanup__btn deploy-cleanup__btn--ghost"
            onClick={handleAbort}
          >
            ⊘ Interromper
          </button>
        )}

        {state === 'complete' && (
          <>
            <button
              type="button"
              className="deploy-cleanup__btn deploy-cleanup__btn--primary"
              onClick={handleScan}
            >
              <Play size={14} />
              Nova Varredura
            </button>
            <button
              type="button"
              className="deploy-cleanup__btn deploy-cleanup__btn--ghost"
              onClick={handleReset}
            >
              <RotateCcw size={14} />
              Resetar
            </button>
          </>
        )}
      </div>

      {/* ── Confirm Modal (substitui window.confirm) ── */}
      {pendingConfirm && (
        <div className="deploy-cleanup__confirm-overlay" onClick={() => setPendingConfirm(false)}>
          <div className="deploy-cleanup__confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="deploy-cleanup__confirm-icon">
              <AlertTriangle size={28} />
            </div>
            <h4 className="deploy-cleanup__confirm-title">Confirmar Expurgo</h4>
            <p className="deploy-cleanup__confirm-text">
              Confirma a exclusão de <strong>{scanData?.totalObsolete ?? 0}</strong> deployment(s) obsoleto(s)?
            </p>
            <p className="deploy-cleanup__confirm-sub">
              Apenas o deployment ativo de cada projeto será preservado.
            </p>
            <div className="deploy-cleanup__confirm-actions">
              <button
                type="button"
                className="deploy-cleanup__btn deploy-cleanup__btn--danger"
                onClick={executePurge}
              >
                <Trash2 size={14} />
                Confirmar Expurgo
              </button>
              <button
                type="button"
                className="deploy-cleanup__btn deploy-cleanup__btn--ghost"
                onClick={() => setPendingConfirm(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
