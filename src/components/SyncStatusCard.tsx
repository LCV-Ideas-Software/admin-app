import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { useNotification } from './Notification'

type OperationalSyncStatus = {
  module: string
  totalRuns: number
  successRuns: number
  errorRuns: number
  lastStatus: string
  lastFinishedAt: number | null
}

type OperationalOverviewPayload = {
  ok: boolean
  sync: OperationalSyncStatus[]
}

type SyncRunPayload = {
  ok: boolean
  error?: string
  dryRun: boolean
  recordsRead: number
  recordsUpserted: number
  observabilidade?: {
    lidas: number
    inseridas: number
  }
  rateLimit?: {
    lidas: number
    upserted: number
  }
}

type SyncStatusCardProps = {
  module: 'astrologo' | 'itau' | 'mainsite' | 'mtasts'
  endpoint: '/api/astrologo/sync' | '/api/itau/sync' | '/api/mainsite/sync' | '/api/mtasts/sync'
  title: string
  description: string
}

const formatDateTime = (value: number | null) => {
  if (!value) {
    return 'ainda não executado'
  }

  return new Date(value).toLocaleString('pt-BR')
}

const buildSuccessMessage = (moduleTitle: string, payload: SyncRunPayload) => {
  if (payload.dryRun) {
    return `${moduleTitle}: dry run concluído com ${payload.recordsRead} registro(s) lido(s).`
  }

  if (payload.observabilidade && payload.rateLimit) {
    return `${moduleTitle}: sync concluído com ${payload.recordsUpserted} alteração(ões) aplicadas.`
  }

  return `${moduleTitle}: sync concluído com ${payload.recordsUpserted} registro(s) aplicados.`
}

export function SyncStatusCard({ module, endpoint, title, description }: SyncStatusCardProps) {
  const { showNotification } = useNotification()
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [runningSync, setRunningSync] = useState(false)
  const [simulateBeforeSync, setSimulateBeforeSync] = useState(true)
  const [status, setStatus] = useState<OperationalSyncStatus | null>(null)

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const response = await fetch('/api/overview/operational')
      const payload = await response.json() as OperationalOverviewPayload

      if (!response.ok || !payload.ok) {
        throw new Error('Falha ao carregar overview operacional.')
      }

      const nextStatus = payload.sync.find((item) => item.module === module) ?? null
      setStatus(nextStatus)
    } catch {
      showNotification(`Não foi possível carregar o status de sync de ${title}.`, 'error')
    } finally {
      setLoadingStatus(false)
    }
  }, [module, showNotification, title])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const lastRunLabel = useMemo(() => formatDateTime(status?.lastFinishedAt ?? null), [status?.lastFinishedAt])
  const statusTone = status?.lastStatus === 'success' ? 'badge-em-implantacao' : 'badge-planejado'
  const statusLabel = status?.lastStatus === 'success'
    ? 'último sync OK'
    : status?.lastStatus === 'error'
      ? 'último sync com erro'
      : status?.lastStatus === 'running'
        ? 'sync em execução'
        : 'sem histórico'

  const handleRunSync = async (dryRun: boolean) => {
    setRunningSync(true)
    try {
      const response = await fetch(`${endpoint}?dryRun=${dryRun ? '1' : '0'}`, {
        method: 'POST',
      })
      const payload = await response.json() as SyncRunPayload

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `Falha ao executar sync de ${title}.`)
      }

      showNotification(buildSuccessMessage(title, payload), 'success')
      void loadStatus()
    } catch {
      showNotification(`Não foi possível concluir o sync de ${title}.`, 'error')
    } finally {
      setRunningSync(false)
    }
  }

  return (
    <article className="result-card sync-card">
      <header className="result-header sync-header">
        <div>
          <h4><RefreshCw size={16} /> {title}</h4>
          <p className="sync-description">{description}</p>
        </div>
        <span className={`badge ${statusTone}`}>{statusLabel}</span>
      </header>

      {loadingStatus ? (
        <p className="result-empty">Carregando status operacional do sync...</p>
      ) : (
        <div className="sync-summary-grid">
          <div className="sync-summary-item">
            <span className="detail-label">Execuções</span>
            <strong>{status?.totalRuns ?? 0}</strong>
          </div>
          <div className="sync-summary-item">
            <span className="detail-label">Sucesso</span>
            <strong>{status?.successRuns ?? 0}</strong>
          </div>
          <div className="sync-summary-item">
            <span className="detail-label">Erros</span>
            <strong>{status?.errorRuns ?? 0}</strong>
          </div>
          <div className="sync-summary-item">
            <span className="detail-label">Última finalização</span>
            <strong>{lastRunLabel}</strong>
          </div>
        </div>
      )}

      <div className="sync-actions">
        <label className="sync-toggle" htmlFor={`sync-toggle-${module}`}>
          <input
            id={`sync-toggle-${module}`}
            type="checkbox"
            checked={simulateBeforeSync}
            onChange={(event) => setSimulateBeforeSync(event.target.checked)}
            disabled={runningSync || loadingStatus}
          />
          <span>Simular antes (dry run)</span>
        </label>
        <button
          type="button"
          className="primary-button"
          disabled={runningSync || loadingStatus}
          onClick={() => void handleRunSync(simulateBeforeSync)}
        >
          {runningSync ? <Loader2 size={18} className="spin" /> : (simulateBeforeSync ? <CheckCircle2 size={18} /> : <RefreshCw size={18} />)}
          {simulateBeforeSync ? 'Executar simulação' : 'Sincronizar'}
        </button>
      </div>
    </article>
  )
}
