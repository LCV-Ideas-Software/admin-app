import { useCallback, useEffect, useState } from 'react'
import {
  Activity, AlertTriangle, BarChart3, Bot, Calendar,
  Database, Loader2, RefreshCw, Share2,
  Trash2, Mail, X,
} from 'lucide-react'
import { useNotification } from '../../components/Notification'

// ── Types ────────────────────────────────────────────────────────

type ModuleAgg = {
  module: string
  total_events: number
  fallback_events: number
  error_events: number
  last_source: string
  last_ok: number
}

type EventLogRow = {
  id: number
  created_at: number
  module: string
  source: string
  fallback_used: number
  ok: number
  error_message: string | null
  metadata_json: string | null
}

type SyncAgg = {
  module: string
  total_runs: number
  success_runs: number
  error_runs: number
  last_status: string
  last_finished_at: number | null
}

type ContactRow = {
  id: number
  name: string
  email: string
  phone: string | null
  message: string
  created_at: string
}

type ShareRow = {
  id: number
  post_id: number | null
  post_title: string
  platform: string
  target: string | null
  created_at: string
}

type ChatLogRow = {
  id: number
  role: 'user' | 'bot'
  message: string
  context_title: string | null
  created_at: string
}

type AuditRow = {
  id: number
  question: string
  context_title: string | null
  total_posts_scanned: number
  context_posts_used: number
  selected_posts_json: string | null
  terms_json: string | null
  created_at: string
}

type TelemetryPayload = {
  ok: boolean
  error?: string
  modules: ModuleAgg[]
  eventLog: EventLogRow[]
  sync: SyncAgg[]
  contacts: ContactRow[]
  shares: ShareRow[]
  chatLogs: ChatLogRow[]
  chatAudit: AuditRow[]
  generatedAt: number
}

// ── Tab config ───────────────────────────────────────────────────

const TABS = [
  { key: 'operacional', label: 'Operacional', icon: Activity },
  { key: 'sync', label: 'Sync', icon: Database },
  { key: 'contatos', label: 'Contatos', icon: Mail },
  { key: 'shares', label: 'Compartilhamentos', icon: Share2 },
  { key: 'chatbot', label: 'Chatbot IA', icon: Bot },
] as const

type TabKey = typeof TABS[number]['key']

// ── Utility: format date with São Paulo timezone ─────────────────
const formatDate = (raw: string | number): string => {
  try {
    const d = typeof raw === 'number' ? new Date(raw) : new Date(String(raw).replace(' ', 'T') + 'Z')
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  } catch { return String(raw) }
}

/** Parse JSON string to array safely */
const parseJsonArray = <T,>(raw: string | null, fallback: T[] = []): T[] => {
  try { const p = JSON.parse(raw || '[]'); return Array.isArray(p) ? p : fallback }
  catch { return fallback }
}

// ── Component ────────────────────────────────────────────────────

export function TelemetriaModule() {
  const { showNotification } = useNotification()
  const [tab, setTab] = useState<TabKey>('operacional')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<TelemetryPayload | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; table: string; id: number; label: string }>({ show: false, table: '', id: 0, label: '' })

  // ── Fetch all telemetry ──
  const fetchTelemetry = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/telemetry/telemetry')
      if (!res.ok) throw new Error('Falha ao carregar telemetria.')
      const payload = await res.json() as TelemetryPayload
      if (!payload.ok) throw new Error(payload.error ?? 'Erro desconhecido.')
      setData(payload)
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro na telemetria.', 'error')
    } finally {
      setLoading(false)
    }
  }, [showNotification])

  useEffect(() => { void fetchTelemetry() }, [fetchTelemetry])

  // Auto-poll every 30s
  useEffect(() => {
    const interval = setInterval(() => void fetchTelemetry(true), 30000)
    return () => clearInterval(interval)
  }, [fetchTelemetry])

  // ── Delete handler ──
  const executeDelete = useCallback(async () => {
    const { table, id } = confirmDelete
    setDeletingId(id)
    try {
      const res = await fetch(`/api/telemetry/delete?table=${encodeURIComponent(table)}&id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao excluir registro.')
      showNotification('Registro excluído com sucesso.', 'success')
      setConfirmDelete({ show: false, table: '', id: 0, label: '' })
      void fetchTelemetry(true)
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro ao excluir.', 'error')
    } finally {
      setDeletingId(null)
    }
  }, [confirmDelete, fetchTelemetry, showNotification])

  const askDelete = (table: string, id: number, label: string) =>
    setConfirmDelete({ show: true, table, id, label })

  // ── Render helpers ──
  const modules = data?.modules ?? []
  const eventLog = data?.eventLog ?? []
  const sync = data?.sync ?? []
  const contacts = data?.contacts ?? []
  const shares = data?.shares ?? []
  const chatLogs = data?.chatLogs ?? []
  const chatAudit = data?.chatAudit ?? []

  const renderOperacional = () => (
    <>
      <article className="result-card">
        <header className="result-header">
          <h4><Activity size={16} /> Eventos operacionais (24 h)</h4>
          <span className="source-badge">operacional</span>
        </header>
        {modules.length === 0 ? (
          <p className="result-empty">Sem eventos operacionais registrados ainda.</p>
        ) : (
          <ul className="result-list">
            {modules.map((m) => (
              <li key={m.module}>
                <strong>{m.module}</strong>
                <span>24h: {m.total_events} evento(s) · fallback: {m.fallback_events} · falhas: {m.error_events}</span>
                <span className={`badge ${m.last_ok === 1 ? 'badge-em-implantacao' : 'badge-planejado'}`}>
                  último: {m.last_ok === 1 ? 'sucesso' : 'falha'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="result-card">
        <header className="result-header">
          <h4><Database size={16} /> Log de eventos (últimos 100)</h4>
          <span>{eventLog.length} registro(s)</span>
        </header>
        {eventLog.length === 0 ? (
          <p className="result-empty">Nenhum evento registrado.</p>
        ) : (
          <ul className="result-list telemetria-event-log">
            {eventLog.map((e) => (
              <li key={e.id} className={e.ok === 0 ? 'telemetria-row-error' : ''}>
                <strong>{e.module}</strong>
                <span>{formatDate(e.created_at)}</span>
                <span className={`badge ${e.ok === 1 ? 'badge-em-implantacao' : 'badge-planejado'}`}>
                  {e.ok === 1 ? 'ok' : 'erro'}
                </span>
                {e.error_message && <span className="field-hint">{e.error_message}</span>}
                <button type="button" className="telemetria-delete-btn" title="Excluir evento" onClick={() => askDelete('adminapp_module_events', e.id, `evento #${e.id}`)}>
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>
    </>
  )

  const renderSync = () => (
    <article className="result-card">
      <header className="result-header">
        <h4><Database size={16} /> Execuções de sync</h4>
        <span>{sync.length} módulo(s)</span>
      </header>
      {sync.length === 0 ? (
        <p className="result-empty">Nenhum sync registrado ainda.</p>
      ) : (
        <ul className="result-list">
          {sync.map((s) => (
            <li key={s.module}>
              <strong>{s.module}</strong>
              <span>execuções: {s.total_runs} · sucesso: {s.success_runs} · erros: {s.error_runs}</span>
              <span className={`badge ${s.last_status === 'success' ? 'badge-em-implantacao' : 'badge-planejado'}`}>
                {s.last_status === 'success' ? 'último sync ok' : s.last_status === 'error' ? 'último sync com erro' : s.last_status}
              </span>
              {s.last_finished_at && <span className="field-hint">{formatDate(s.last_finished_at)}</span>}
            </li>
          ))}
        </ul>
      )}
    </article>
  )

  const renderContatos = () => (
    <article className="result-card">
      <header className="result-header">
        <h4><Mail size={16} /> Formulários de contato recebidos</h4>
        <span>{contacts.length} registro(s)</span>
      </header>
      {contacts.length === 0 ? (
        <p className="result-empty">Nenhum contato registrado.</p>
      ) : (
        <ul className="result-list">
          {contacts.map((c) => (
            <li key={c.id} className="telemetria-contact-row">
              <div className="telemetria-contact-header">
                <strong>{c.name}</strong>
                <span className="field-hint">{c.email}{c.phone ? ` | ${c.phone}` : ''}</span>
              </div>
              <p className="telemetria-contact-message">{c.message}</p>
              <div className="telemetria-contact-footer">
                <span className="telemetria-date-badge"><Calendar size={12} /> {formatDate(c.created_at)}</span>
                <button type="button" className="telemetria-delete-btn" title="Excluir contato" onClick={() => askDelete('mainsite_contact_logs', c.id, `contato de ${c.name}`)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )

  const renderShares = () => (
    <article className="result-card">
      <header className="result-header">
        <h4><Share2 size={16} /> Métricas de compartilhamento</h4>
        <span>{shares.length} registro(s)</span>
      </header>
      {shares.length === 0 ? (
        <p className="result-empty">Nenhum compartilhamento registrado.</p>
      ) : (
        <ul className="result-list">
          {shares.map((s) => (
            <li key={s.id}>
              <span className={`badge ${s.platform === 'whatsapp' ? 'badge-whatsapp' : s.platform === 'email' ? 'badge-email' : 'badge-planejado'}`}>
                {s.platform}
              </span>
              <strong>{s.post_title}</strong>
              {s.target && <span className="field-hint">Destino: {s.target}</span>}
              <span className="telemetria-date-badge"><Calendar size={12} /> {formatDate(s.created_at)}</span>
              <button type="button" className="telemetria-delete-btn" title="Excluir compartilhamento" onClick={() => askDelete('mainsite_shares', s.id, `share #${s.id}`)}>
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  )

  const renderChatbot = () => (
    <>
      {/* ── Seção 1: Conversas ── */}
      <article className="result-card">
        <header className="result-header">
          <h4><Bot size={16} /> Conversas da Consciência Auxiliar</h4>
          <span>{chatLogs.length} mensagem(ns)</span>
        </header>
        {chatLogs.length === 0 ? (
          <p className="result-empty">Nenhuma conversa registrada.</p>
        ) : (
          <ul className="result-list telemetria-chat-list">
            {chatLogs.map((log) => (
              <li key={log.id} className={`telemetria-chat-row ${log.role === 'user' ? 'telemetria-chat-user' : 'telemetria-chat-bot'}`}>
                <div className="telemetria-chat-header">
                  <span className={`telemetria-role-badge ${log.role === 'user' ? 'telemetria-role-user' : 'telemetria-role-bot'}`}>
                    {log.role === 'user' ? '👤 Usuário' : '🤖 IA'}
                  </span>
                  {log.context_title && <span className="field-hint">Contexto: {log.context_title}</span>}
                </div>
                <p className="telemetria-chat-message">{log.message}</p>
                <div className="telemetria-contact-footer">
                  <span className="telemetria-date-badge"><Calendar size={12} /> {formatDate(log.created_at)}</span>
                  <button type="button" className="telemetria-delete-btn" title="Excluir log" onClick={() => askDelete('mainsite_chat_logs', log.id, `chat #${log.id}`)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>

      {/* ── Seção 2: Auditoria de Contexto ── */}
      <article className="result-card">
        <header className="result-header">
          <h4>🧠 Auditoria de Contexto</h4>
          <span>{chatAudit.length} registro(s)</span>
        </header>
        {chatAudit.length === 0 ? (
          <p className="result-empty">Nenhum registro de auditoria de contexto.</p>
        ) : (
          <div className="telemetria-audit-list">
            {chatAudit.map((a) => {
              const posts = parseJsonArray<{ id?: number; title?: string; score?: number; created_at?: string }>(a.selected_posts_json)
              const terms = parseJsonArray<string>(a.terms_json)
              return (
                <div key={a.id} className="telemetria-audit-card">
                  <div className="telemetria-audit-header">
                    <div>
                      <span className="telemetria-audit-badge">🧠 CONTEXTO IA</span>
                      <span className="field-hint">Contexto: {a.context_title || 'Global'}</span>
                    </div>
                    <div className="telemetria-audit-actions">
                      <span className="telemetria-date-badge"><Calendar size={12} /> {formatDate(a.created_at)}</span>
                      <button type="button" className="telemetria-delete-btn" title="Excluir auditoria" onClick={() => askDelete('mainsite_chat_context_audit', a.id, `auditoria #${a.id}`)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="telemetria-audit-question"><strong>Pergunta:</strong> {a.question}</div>
                  <div className="telemetria-audit-metrics">
                    <span className="telemetria-date-badge">Acervo: {a.total_posts_scanned}</span>
                    <span className="telemetria-date-badge">Contexto: {a.context_posts_used}</span>
                  </div>
                  {terms.length > 0 && (
                    <div className="telemetria-audit-terms"><strong>Termos:</strong> {terms.join(', ')}</div>
                  )}
                  {posts.length > 0 && (
                    <div className="telemetria-audit-posts">
                      <strong className="telemetria-audit-posts-label">Publicações selecionadas ({posts.length})</strong>
                      {posts.map((p, idx) => (
                        <div key={`${a.id}-${p.id || idx}`} className="telemetria-audit-post-item">
                          <div>#{p.id ?? 'N/A'} — {p.title || 'Sem título'}</div>
                          <div className="field-hint">Score: {p.score ?? 0}{p.created_at ? ` | ${formatDate(p.created_at)}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </article>
    </>
  )

  const tabRenderers: Record<TabKey, () => React.ReactNode> = {
    operacional: renderOperacional,
    sync: renderSync,
    contatos: renderContatos,
    shares: renderShares,
    chatbot: renderChatbot,
  }

  return (
    <section className="detail-panel module-shell module-shell-telemetria">
      <div className="detail-header">
        <div className="detail-icon"><BarChart3 size={22} /></div>
        <div>
          <h3>Telemetria — Painel Unificado</h3>
        </div>
        <button type="button" className="primary-button telemetria-refresh-btn" onClick={() => void fetchTelemetry()} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
          Atualizar
        </button>
      </div>

      {/* ── Confirmation dialog ── */}
      {confirmDelete.show && (
        <div className="itau-modal-overlay" role="dialog" aria-modal="true" aria-label="Confirmar exclusão">
          <div className="itau-modal-content">
            <button type="button" title="Fechar diálogo" className="itau-modal-close" onClick={() => setConfirmDelete({ show: false, table: '', id: 0, label: '' })}>
              <X size={24} />
            </button>
            <div className="itau-modal-header">
              <div className="itau-modal-icon itau-modal-icon--danger">
                <AlertTriangle size={24} />
              </div>
              <h2 className="itau-modal-title">Excluir registro</h2>
              <p className="itau-modal-subtitle">Deseja apagar permanentemente &ldquo;{confirmDelete.label}&rdquo;?</p>
            </div>
            <div className="itau-modal-form">
              <div className="itau-modal-actions">
                <button type="button" className="itau-modal-btn itau-modal-btn--ghost" onClick={() => setConfirmDelete({ show: false, table: '', id: 0, label: '' })}>
                  Cancelar
                </button>
                <button type="button" className="itau-modal-btn itau-modal-btn--danger" onClick={() => void executeDelete()} disabled={deletingId !== null}>
                  {deletingId !== null ? <Loader2 size={18} className="spin" /> : 'Apagar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <nav className="telemetria-tabs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`telemetria-tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </nav>

      {/* ── Tab content ── */}
      {loading && !data ? (
        <div className="telemetria-loading"><Loader2 size={32} className="spin" /></div>
      ) : (
        tabRenderers[tab]()
      )}

      {data && (
        <p className="telemetria-footer">
          Última atualização: {formatDate(data.generatedAt)} · Auto-refresh a cada 30s
        </p>
      )}
    </section>
  )
}
