/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * ModerationPanel — Painel administrador completo de moderação de comentários.
 * Exibe métricas, lista filtrada por status, ações em lote/individual,
 * e configurações avançadas do motor de moderação automática (GCP NL API v2).
 * Todas as configurações persistem no D1 via mainsite_settings.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, XCircle, Clock, Trash2,
  RefreshCw, Loader2, MessageSquare, Reply,
  Shield, Eye, ChevronDown, ChevronUp, Send,
  Settings, Save, ToggleLeft, ToggleRight, Sliders,
  AlertTriangle, Link2, Mail, Timer, Lock,
} from 'lucide-react'

// ── Tipos ───────────────────────────────────────────────────────────────────

interface ModerationComment {
  id: number
  post_id: number
  parent_id: number | null
  author_name: string
  author_email: string | null
  content: string
  status: string
  moderation_scores: string | null
  moderation_decision: string | null
  admin_notes: string | null
  is_author_reply: number
  created_at: string
  reviewed_at: string | null
  post_title?: string
}

interface StatusCounts {
  pending: number
  approved: number
  rejected_auto: number
  rejected_manual: number
}

interface ModerationSettings {
  commentsEnabled: boolean
  ratingsEnabled: boolean
  allowAnonymous: boolean
  requireEmail: boolean
  requireApproval: boolean
  minCommentLength: number
  maxCommentLength: number
  maxNestingDepth: number
  autoApproveThreshold: number
  autoRejectThreshold: number
  criticalCategories: string[]
  apiUnavailableBehavior: 'pending' | 'approve'
  rateLimitPerIpPerHour: number
  blocklistWords: string[]
  linkPolicy: 'allow' | 'pending' | 'block'
  duplicateWindowHours: number
  autoCloseAfterDays: number
  notifyOnNewComment: boolean
  notifyEmail: string
}

interface ModerationPanelProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void
}

// ── Categorias do Google Cloud NL API v2 (moderateText) ─────────────────────

const GCP_CATEGORIES: { id: string; label: string }[] = [
  { id: 'Toxic', label: 'Tóxico' },
  { id: 'Insult', label: 'Insulto' },
  { id: 'Profanity', label: 'Profanidade' },
  { id: 'Derogatory', label: 'Depreciativo' },
  { id: 'Sexual', label: 'Sexual' },
  { id: 'Death, Harm & Tragedy', label: 'Morte e Tragédia' },
  { id: 'Violent', label: 'Violência' },
  { id: 'Firearms & Weapons', label: 'Armas' },
  { id: 'Public Safety', label: 'Segurança Pública' },
  { id: 'Health', label: 'Saúde' },
  { id: 'Religion & Belief', label: 'Religião' },
  { id: 'Illicit Drugs', label: 'Drogas Ilícitas' },
  { id: 'War & Conflict', label: 'Guerra e Conflito' },
  { id: 'Politics', label: 'Política' },
  { id: 'Finance', label: 'Finanças' },
  { id: 'Legal', label: 'Jurídico' },
]

const DEFAULT_SETTINGS: ModerationSettings = {
  commentsEnabled: true,
  ratingsEnabled: true,
  allowAnonymous: true,
  requireEmail: false,
  requireApproval: false,
  minCommentLength: 3,
  maxCommentLength: 2000,
  maxNestingDepth: 2,
  autoApproveThreshold: 0.3,
  autoRejectThreshold: 0.8,
  criticalCategories: ['Toxic', 'Insult', 'Profanity', 'Sexual', 'Violent', 'Derogatory'],
  apiUnavailableBehavior: 'pending',
  rateLimitPerIpPerHour: 10,
  blocklistWords: [],
  linkPolicy: 'allow',
  duplicateWindowHours: 24,
  autoCloseAfterDays: 0,
  notifyOnNewComment: true,
  notifyEmail: 'cal@reflexosdaalma.blog',
}

// ── Componentes auxiliares ───────────────────────────────────────────────────

function Toggle({ checked, onChange, label, hint, icon: Icon, color }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string;
  icon?: typeof ToggleRight; color?: string;
}) {
  return (
    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 10px', borderRadius: '8px', transition: 'background 0.15s', background: checked ? 'rgba(52,168,83,0.04)' : 'transparent' }}>
      <div style={{ paddingTop: '1px', flexShrink: 0 }}>
        {checked
          ? <ToggleRight size={22} style={{ color: color || 'var(--color-success, #34a853)' }} />
          : <ToggleLeft size={22} style={{ opacity: 0.35 }} />
        }
      </div>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
          {Icon && <Icon size={13} style={{ opacity: 0.5 }} />}
          {label}
        </div>
        {hint && <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px', lineHeight: '1.4' }}>{hint}</div>}
      </div>
    </label>
  )
}

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon?: typeof Sliders }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
      {Icon && <Icon size={15} style={{ opacity: 0.5 }} />}
      <strong style={{ fontSize: '13px', letterSpacing: '0.02em' }}>{children}</strong>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────

export function ModerationPanel({ showNotification }: ModerationPanelProps) {
  const [comments, setComments] = useState<ModerationComment[]>([])
  const [counts, setCounts] = useState<StatusCounts>({ pending: 0, approved: 0, rejected_auto: 0, rejected_manual: 0 })
  const [activeFilter, setActiveFilter] = useState<string>('pending')
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [actionInProgress, setActionInProgress] = useState<number | null>(null)
  const [bulkAction, setBulkAction] = useState(false)

  // ── Settings ──
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<ModerationSettings>(DEFAULT_SETTINGS)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [blocklistInput, setBlocklistInput] = useState('')

  // ── Fetch comments ────────────────────────────────────────────────────

  const fetchComments = useCallback(async (status: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mainsite/comments/admin/all?status=${status}&limit=100`)
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json() as { comments: ModerationComment[]; counts: Record<string, number> }
      setComments(data.comments || [])
      setCounts({
        pending: data.counts?.pending || 0,
        approved: data.counts?.approved || 0,
        rejected_auto: data.counts?.rejected_auto || 0,
        rejected_manual: data.counts?.rejected_manual || 0,
      })
      setSelectedIds(new Set())
    } catch {
      showNotification('Falha ao carregar comentários.', 'error')
    } finally {
      setLoading(false)
    }
  }, [showNotification])

  useEffect(() => { fetchComments(activeFilter) }, [activeFilter, fetchComments])

  // ── Fetch settings ────────────────────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true)
    try {
      const res = await fetch('/api/mainsite/comments/admin/settings')
      if (!res.ok) throw new Error('Falha')
      const data = await res.json() as { settings: ModerationSettings }
      setSettings(data.settings)
      setBlocklistInput((data.settings.blocklistWords || []).join(', '))
      setSettingsLoaded(true)
    } catch {
      showNotification('Falha ao carregar configurações de moderação.', 'error')
    } finally {
      setSettingsLoading(false)
    }
  }, [showNotification])

  useEffect(() => {
    if (showSettings && !settingsLoaded) fetchSettings()
  }, [showSettings, settingsLoaded, fetchSettings])

  // ── Save settings ─────────────────────────────────────────────────────

  const saveSettings = async () => {
    setSettingsSaving(true)
    try {
      // Converte blocklist string para array
      const payload = {
        ...settings,
        blocklistWords: blocklistInput
          .split(',')
          .map(w => w.trim())
          .filter(w => w.length > 0),
      }
      const res = await fetch('/api/mainsite/comments/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        throw new Error(err.error || 'Falha ao salvar')
      }
      const data = await res.json() as { settings: ModerationSettings }
      if (data.settings) {
        setSettings(data.settings)
        setBlocklistInput((data.settings.blocklistWords || []).join(', '))
      }
      showNotification('Configurações salvas com sucesso.', 'success')
    } catch (err) {
      showNotification((err instanceof Error ? err.message : 'Erro ao salvar.'), 'error')
    } finally {
      setSettingsSaving(false)
    }
  }

  // ── Moderation actions ────────────────────────────────────────────────

  const handleModerate = async (id: number, status: string) => {
    setActionInProgress(id)
    try {
      const res = await fetch(`/api/mainsite/comments/admin/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Falha')
      showNotification(status === 'approved' ? 'Comentário aprovado.' : 'Comentário rejeitado.', 'success')
      await fetchComments(activeFilter)
    } catch { showNotification('Erro ao moderar.', 'error') }
    finally { setActionInProgress(null) }
  }

  const handleDelete = async (id: number) => {
    setActionInProgress(id)
    try {
      const res = await fetch(`/api/mainsite/comments/admin/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha')
      showNotification('Comentário excluído.', 'success')
      await fetchComments(activeFilter)
    } catch { showNotification('Erro ao excluir.', 'error') }
    finally { setActionInProgress(null) }
  }

  const handleReply = async (parentId: number) => {
    if (!replyContent.trim()) return
    setActionInProgress(parentId)
    try {
      const res = await fetch(`/api/mainsite/comments/admin/${parentId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim() }),
      })
      if (!res.ok) throw new Error('Falha')
      showNotification('Resposta publicada.', 'success')
      setReplyingTo(null)
      setReplyContent('')
      await fetchComments(activeFilter)
    } catch { showNotification('Erro ao responder.', 'error') }
    finally { setActionInProgress(null) }
  }

  const handleBulk = async (action: 'approve' | 'reject' | 'delete') => {
    if (selectedIds.size === 0) return
    setBulkAction(true)
    try {
      const res = await fetch('/api/mainsite/comments/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      })
      if (!res.ok) throw new Error('Falha')
      const label = action === 'approve' ? 'aprovados' : action === 'reject' ? 'rejeitados' : 'excluídos'
      showNotification(`${selectedIds.size} comentário(s) ${label}.`, 'success')
      await fetchComments(activeFilter)
    } catch { showNotification('Erro na ação em lote.', 'error') }
    finally { setBulkAction(false) }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === comments.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(comments.map(c => c.id)))
  }

  const toggleCategory = (catId: string) => {
    setSettings(prev => ({
      ...prev,
      criticalCategories: prev.criticalCategories.includes(catId)
        ? prev.criticalCategories.filter(c => c !== catId)
        : [...prev.criticalCategories, catId],
    }))
  }

  const formatDate = (raw: string | null): string => {
    if (!raw) return '—'
    try {
      const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z')
      return d.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return raw }
  }

  // ── Render ────────────────────────────────────────────────────────────

  const totalPending = counts.pending
  const filterTabs = [
    { key: 'pending', label: 'Pendentes', count: counts.pending, icon: Clock },
    { key: 'approved', label: 'Aprovados', count: counts.approved, icon: CheckCircle },
    { key: 'rejected_auto', label: 'Bloqueados pela IA', count: counts.rejected_auto, icon: Shield },
    { key: 'rejected_manual', label: 'Rejeitados', count: counts.rejected_manual, icon: XCircle },
  ]

  return (
    <div className="result-card" style={{ marginTop: '16px' }}>
      <div className="result-toolbar">
        <div>
          <h4>
            <MessageSquare size={16} /> Moderação de Comentários
            {totalPending > 0 && (
              <span className="badge badge-em-implantacao" style={{ marginLeft: '8px' }}>
                {totalPending} pendente{totalPending !== 1 ? 's' : ''}
              </span>
            )}
          </h4>
          <p className="field-hint">Revise, aprove ou rejeite comentários enviados pelos leitores.</p>
        </div>
        <div className="inline-actions">
          <button type="button" className="ghost-button" onClick={() => setShowSettings(s => !s)} title="Configurações">
            <Settings size={16} />
            {showSettings ? 'Voltar à Lista' : 'Configurações'}
          </button>
          <button type="button" className="ghost-button" onClick={() => fetchComments(activeFilter)} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            Atualizar
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* PAINEL DE CONFIGURAÇÕES                                             */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {showSettings ? (
        <div style={{ padding: '4px 0' }}>
          {settingsLoading ? (
            <div className="module-loading"><Loader2 size={20} className="spin" /> Carregando configurações...</div>
          ) : (
            <>
              {/* ── Seção 1: Funcionalidades ── */}
              <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(66,133,244,0.03)', border: '1px solid rgba(66,133,244,0.08)', marginBottom: '14px' }}>
                <SectionTitle icon={ToggleRight}>Funcionalidades</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '4px' }}>
                  <Toggle checked={settings.commentsEnabled} onChange={v => setSettings(s => ({ ...s, commentsEnabled: v }))}
                    label="Comentários habilitados" hint="Permitir envio de novos comentários nos posts"
                    icon={MessageSquare}
                  />
                  <Toggle checked={settings.ratingsEnabled} onChange={v => setSettings(s => ({ ...s, ratingsEnabled: v }))}
                    label="Avaliações habilitadas" hint="Permitir que leitores avaliem os posts"
                  />
                  <Toggle checked={!settings.allowAnonymous} onChange={v => setSettings(s => ({ ...s, allowAnonymous: !v }))}
                    label="Exigir nome" hint="Tornar o campo de nome obrigatório"
                  />
                  <Toggle checked={settings.requireEmail} onChange={v => setSettings(s => ({ ...s, requireEmail: v }))}
                    label="Exigir email" hint="Tornar o campo de email obrigatório"
                    icon={Mail}
                  />
                  <Toggle checked={settings.requireApproval} onChange={v => setSettings(s => ({ ...s, requireApproval: v }))}
                    label="Aprovação manual obrigatória" hint="Todos os comentários ficam pendentes até revisão manual"
                    icon={Lock} color="var(--color-warning, #f59e0b)"
                  />
                  <Toggle checked={settings.notifyOnNewComment} onChange={v => setSettings(s => ({ ...s, notifyOnNewComment: v }))}
                    label="Notificações por email" hint="Receber email a cada novo comentário"
                    icon={Mail}
                  />
                </div>
                {settings.notifyOnNewComment && (
                  <div style={{ marginTop: '10px', paddingLeft: '10px' }}>
                    <label htmlFor="mod-notify-email" style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Email de notificação
                    </label>
                    <input
                      id="mod-notify-email" type="email" placeholder="seuemail@dominio.com"
                      value={settings.notifyEmail}
                      onChange={e => setSettings(s => ({ ...s, notifyEmail: e.target.value }))}
                      style={{ maxWidth: '350px', width: '100%' }}
                    />
                  </div>
                )}
              </div>

              {/* ── Seção 2: Limites de conteúdo ── */}
              <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(66,133,244,0.03)', border: '1px solid rgba(66,133,244,0.08)', marginBottom: '14px' }}>
                <SectionTitle icon={Sliders}>Limites de Conteúdo</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="field-group">
                    <label htmlFor="mod-min-length" style={{ fontSize: '12px', fontWeight: 600 }}>
                      Tamanho mínimo <span style={{ fontWeight: 400, opacity: 0.5 }}>(caracteres)</span>
                    </label>
                    <input id="mod-min-length" type="number" min="1" max="500" step="1"
                      value={settings.minCommentLength}
                      onChange={e => setSettings(s => ({ ...s, minCommentLength: Math.max(1, parseInt(e.target.value) || 3) }))}
                    />
                    <p className="field-hint">Mínimo de caracteres para aceitar um comentário.</p>
                  </div>
                  <div className="field-group">
                    <label htmlFor="mod-max-length" style={{ fontSize: '12px', fontWeight: 600 }}>
                      Tamanho máximo <span style={{ fontWeight: 400, opacity: 0.5 }}>(caracteres)</span>
                    </label>
                    <input id="mod-max-length" type="number" min="10" max="10000" step="100"
                      value={settings.maxCommentLength}
                      onChange={e => setSettings(s => ({ ...s, maxCommentLength: Math.max(10, parseInt(e.target.value) || 2000) }))}
                    />
                    <p className="field-hint">Limite máximo de caracteres por comentário (10–10.000).</p>
                  </div>
                  <div className="field-group">
                    <label htmlFor="mod-nesting" style={{ fontSize: '12px', fontWeight: 600 }}>
                      Profundidade de respostas
                    </label>
                    <input id="mod-nesting" type="number" min="0" max="10" step="1"
                      value={settings.maxNestingDepth}
                      onChange={e => setSettings(s => ({ ...s, maxNestingDepth: Math.max(0, Math.min(10, parseInt(e.target.value) || 2)) }))}
                    />
                    <p className="field-hint">Quantos níveis de respostas aninhadas são permitidos (0 = sem respostas).</p>
                  </div>
                  <div className="field-group">
                    <label htmlFor="mod-auto-close" style={{ fontSize: '12px', fontWeight: 600 }}>
                      Fechar após <span style={{ fontWeight: 400, opacity: 0.5 }}>(dias)</span>
                    </label>
                    <input id="mod-auto-close" type="number" min="0" max="3650" step="1"
                      value={settings.autoCloseAfterDays}
                      onChange={e => setSettings(s => ({ ...s, autoCloseAfterDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                    />
                    <p className="field-hint">Bloquear comentários em posts mais antigos que N dias (0 = nunca fechar).</p>
                  </div>
                </div>
              </div>

              {/* ── Seção 3: Moderação automática ── */}
              <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(52,168,83,0.03)', border: '1px solid rgba(52,168,83,0.08)', marginBottom: '14px' }}>
                <SectionTitle icon={Shield}>Moderação Automática (Google Cloud NL API)</SectionTitle>

                {/* Thresholds */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px' }}>
                  <div className="field-group">
                    <label htmlFor="mod-auto-approve" style={{ fontSize: '12px', fontWeight: 600 }}>
                      Limite de aprovação automática
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input id="mod-auto-approve" type="range" min="0" max="1" step="0.05"
                        value={settings.autoApproveThreshold}
                        onChange={e => setSettings(s => ({ ...s, autoApproveThreshold: parseFloat(e.target.value) }))}
                        style={{ flex: 1, accentColor: '#34a853' }}
                      />
                      <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, minWidth: '48px', textAlign: 'center', padding: '3px 6px', borderRadius: '6px', background: 'rgba(52,168,83,0.1)', color: '#34a853' }}>
                        {settings.autoApproveThreshold.toFixed(2)}
                      </span>
                    </div>
                    <p className="field-hint">Score máximo abaixo deste valor → <strong style={{ color: '#34a853' }}>aprovado automaticamente</strong>.</p>
                  </div>
                  <div className="field-group">
                    <label htmlFor="mod-auto-reject" style={{ fontSize: '12px', fontWeight: 600 }}>
                      Limite de rejeição automática
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input id="mod-auto-reject" type="range" min="0" max="1" step="0.05"
                        value={settings.autoRejectThreshold}
                        onChange={e => setSettings(s => ({ ...s, autoRejectThreshold: parseFloat(e.target.value) }))}
                        style={{ flex: 1, accentColor: '#ea4335' }}
                      />
                      <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, minWidth: '48px', textAlign: 'center', padding: '3px 6px', borderRadius: '6px', background: 'rgba(234,67,53,0.1)', color: '#ea4335' }}>
                        {settings.autoRejectThreshold.toFixed(2)}
                      </span>
                    </div>
                    <p className="field-hint">Score acima deste valor → <strong style={{ color: '#ea4335' }}>rejeitado automaticamente</strong>.</p>
                  </div>
                </div>

                <p className="field-hint" style={{ marginBottom: '14px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                  <AlertTriangle size={12} style={{ verticalAlign: '-2px', marginRight: '4px', color: '#f59e0b' }} />
                  Scores entre os dois limites geram status <strong>"pendente"</strong> para revisão manual.
                </p>

                {/* API falha behavior */}
                <div className="field-group" style={{ marginBottom: '16px' }}>
                  <label htmlFor="mod-api-fallback" style={{ fontSize: '12px', fontWeight: 600 }}>
                    Comportamento quando a API estiver indisponível
                  </label>
                  <select id="mod-api-fallback" value={settings.apiUnavailableBehavior}
                    onChange={e => setSettings(s => ({ ...s, apiUnavailableBehavior: e.target.value as 'pending' | 'approve' }))}
                    style={{ maxWidth: '400px' }}
                  >
                    <option value="pending">Marcar como pendente (mais seguro)</option>
                    <option value="approve">Aprovar automaticamente (mais permissivo)</option>
                  </select>
                  <p className="field-hint">O que acontece com comentários quando o Google Cloud NL API não responde.</p>
                </div>

                {/* Categorias críticas */}
                <div style={{ marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                    Categorias monitoradas pela IA
                  </label>
                  <p className="field-hint" style={{ marginBottom: '10px' }}>
                    Apenas as categorias selecionadas serão consideradas na análise. Categorias desmarcadas serão ignoradas pelo motor de decisão.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {GCP_CATEGORIES.map(cat => {
                      const active = settings.criticalCategories.includes(cat.id)
                      return (
                        <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)}
                          style={{
                            padding: '5px 12px', fontSize: '12px', fontWeight: active ? 600 : 400,
                            borderRadius: '16px', cursor: 'pointer', transition: 'all 0.15s ease',
                            border: active ? '1.5px solid var(--color-primary, #4285f4)' : '1px solid rgba(128,128,128,0.2)',
                            background: active ? 'rgba(66,133,244,0.1)' : 'transparent',
                            color: active ? 'var(--color-primary, #4285f4)' : 'inherit',
                            opacity: active ? 1 : 0.55,
                          }}
                        >
                          {active ? '✓ ' : ''}{cat.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* ── Seção 4: Anti-spam ── */}
              <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(234,67,53,0.03)', border: '1px solid rgba(234,67,53,0.08)', marginBottom: '14px' }}>
                <SectionTitle icon={Shield}>Proteção Anti-Spam</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div className="field-group">
                    <label htmlFor="mod-rate-limit" style={{ fontSize: '12px', fontWeight: 600 }}>
                      Limite por hora/IP
                    </label>
                    <input id="mod-rate-limit" type="number" min="0" max="100" step="1"
                      value={settings.rateLimitPerIpPerHour}
                      onChange={e => setSettings(s => ({ ...s, rateLimitPerIpPerHour: Math.max(0, parseInt(e.target.value) || 0) }))}
                    />
                    <p className="field-hint">Máximo de comentários por endereço IP por hora (0 = sem limite).</p>
                  </div>
                  <div className="field-group">
                    <label htmlFor="mod-dedup-window" style={{ fontSize: '12px', fontWeight: 600 }}>
                      Janela de duplicatas <span style={{ fontWeight: 400, opacity: 0.5 }}>(horas)</span>
                    </label>
                    <input id="mod-dedup-window" type="number" min="1" max="720" step="1"
                      value={settings.duplicateWindowHours}
                      onChange={e => setSettings(s => ({ ...s, duplicateWindowHours: Math.max(1, parseInt(e.target.value) || 24) }))}
                    />
                    <p className="field-hint">Período em que comentários idênticos do mesmo IP são recusados.</p>
                  </div>
                  <div className="field-group">
                    <label htmlFor="mod-link-policy" style={{ fontSize: '12px', fontWeight: 600 }}>
                      <Link2 size={12} style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                      Política de links
                    </label>
                    <select id="mod-link-policy" value={settings.linkPolicy}
                      onChange={e => setSettings(s => ({ ...s, linkPolicy: e.target.value as 'allow' | 'pending' | 'block' }))}
                    >
                      <option value="allow">Permitir livremente</option>
                      <option value="pending">Enviar para revisão manual</option>
                      <option value="block">Bloquear totalmente</option>
                    </select>
                    <p className="field-hint">Como tratar comentários contendo URLs.</p>
                  </div>
                </div>

                {/* Blocklist */}
                <div className="field-group">
                  <label htmlFor="mod-blocklist" style={{ fontSize: '12px', fontWeight: 600 }}>
                    Lista de palavras bloqueadas
                  </label>
                  <textarea
                    id="mod-blocklist"
                    value={blocklistInput}
                    onChange={e => setBlocklistInput(e.target.value)}
                    placeholder="palavra1, frase proibida, termo3..."
                    rows={3}
                    style={{ width: '100%', fontFamily: 'inherit', fontSize: '13px', resize: 'vertical' }}
                  />
                  <p className="field-hint">
                    Palavras e frases separadas por vírgula. Comentários contendo qualquer termo listado serão <strong>rejeitados imediatamente</strong>, sem passar pela IA.
                  </p>
                </div>
              </div>

              {/* ── Ações de salvamento ── */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', padding: '4px 0' }}>
                <button type="button" className="primary-button" onClick={() => void saveSettings()} disabled={settingsSaving}>
                  {settingsSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                  Salvar Configurações
                </button>
                <button type="button" className="ghost-button" onClick={() => {
                  setSettings(DEFAULT_SETTINGS)
                  setBlocklistInput('')
                  showNotification('Valores restaurados para padrão. Salve para confirmar.', 'info')
                }}>
                  Restaurar Padrão
                </button>
                <span style={{ fontSize: '11px', opacity: 0.4, marginLeft: 'auto' }}>
                  <Timer size={11} style={{ verticalAlign: '-1px', marginRight: '3px' }} />
                  As configurações são aplicadas imediatamente após salvar.
                </span>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════════ */
        /* LISTA DE COMENTÁRIOS                                               */
        /* ════════════════════════════════════════════════════════════════════ */
        <>
          {/* Tabs de filtro */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {filterTabs.map(tab => (
              <button key={tab.key} type="button"
                className={`ghost-button ${activeFilter === tab.key ? 'ghost-button--active' : ''}`}
                onClick={() => setActiveFilter(tab.key)}
                style={{
                  fontWeight: activeFilter === tab.key ? 700 : 500,
                  opacity: activeFilter === tab.key ? 1 : 0.7,
                  borderBottom: activeFilter === tab.key ? '2px solid var(--color-primary, #4285f4)' : '2px solid transparent',
                  borderRadius: '4px 4px 0 0', padding: '6px 12px',
                }}
              >
                <tab.icon size={14} />
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Ações em lote */}
          {selectedIds.size > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
              borderRadius: '8px', background: 'rgba(66,133,244,0.06)', marginBottom: '12px',
              fontSize: '13px', flexWrap: 'wrap',
            }}>
              <strong>{selectedIds.size} selecionado(s)</strong>
              <button type="button" className="ghost-button" onClick={() => handleBulk('approve')} disabled={bulkAction}>
                <CheckCircle size={14} /> Aprovar
              </button>
              <button type="button" className="ghost-button" onClick={() => handleBulk('reject')} disabled={bulkAction}>
                <XCircle size={14} /> Rejeitar
              </button>
              <button type="button" className="ghost-button" onClick={() => handleBulk('delete')} disabled={bulkAction}>
                <Trash2 size={14} /> Excluir
              </button>
              {bulkAction && <Loader2 size={14} className="spin" />}
            </div>
          )}

          {/* Lista de comentários */}
          {loading ? (
            <div className="module-loading"><Loader2 size={20} className="spin" /></div>
          ) : comments.length === 0 ? (
            <p className="result-empty">Nenhum comentário com este status no momento.</p>
          ) : (
            <ul className="result-list astro-akashico-scroll" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {/* Selecionar todos */}
              <li style={{ padding: '6px 12px', fontSize: '12px', opacity: 0.6, cursor: 'pointer' }} onClick={toggleSelectAll}>
                <input type="checkbox" checked={selectedIds.size === comments.length && comments.length > 0} readOnly style={{ marginRight: '8px' }} />
                Selecionar todos ({comments.length})
              </li>

              {comments.map(comment => {
                const isExpanded = expandedId === comment.id
                const isBusy = actionInProgress === comment.id
                const isSelected = selectedIds.has(comment.id)

                return (
                  <li key={comment.id} className={`post-row ${isSelected ? 'post-row--selected' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(comment.id)} style={{ marginTop: '4px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Cabeçalho */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '13px' }}>{comment.author_name}</strong>
                          {comment.author_email && <span style={{ fontSize: '11px', opacity: 0.5 }}>{comment.author_email}</span>}
                          <span style={{ fontSize: '11px', opacity: 0.4, marginLeft: 'auto' }}>{formatDate(comment.created_at)}</span>
                        </div>

                        {/* Título do post */}
                        <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '6px' }}>
                          em <em>{comment.post_title || `Post #${comment.post_id}`}</em>
                        </div>

                        {/* Conteúdo */}
                        <div style={{ fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                          {comment.content.length > 200 && !isExpanded
                            ? comment.content.substring(0, 200) + '...'
                            : comment.content}
                        </div>

                        {/* Ações por comentário */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <button type="button" className="ghost-button" onClick={() => setExpandedId(isExpanded ? null : comment.id)} style={{ fontSize: '11px', padding: '2px 8px' }}>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {isExpanded ? 'Menos' : 'Detalhes'}
                          </button>

                          {activeFilter === 'pending' && (
                            <>
                              <button type="button" className="ghost-button" onClick={() => handleModerate(comment.id, 'approved')} disabled={isBusy} style={{ color: 'var(--color-success, #34a853)', fontSize: '11px', padding: '2px 8px' }}>
                                {isBusy ? <Loader2 size={12} className="spin" /> : <CheckCircle size={12} />} Aprovar
                              </button>
                              <button type="button" className="ghost-button" onClick={() => handleModerate(comment.id, 'rejected_manual')} disabled={isBusy} style={{ color: 'var(--color-danger, #ea4335)', fontSize: '11px', padding: '2px 8px' }}>
                                {isBusy ? <Loader2 size={12} className="spin" /> : <XCircle size={12} />} Rejeitar
                              </button>
                            </>
                          )}

                          {activeFilter === 'approved' && (
                            <button type="button" className="ghost-button" onClick={() => { setReplyingTo(comment.id); setReplyContent('') }} style={{ fontSize: '11px', padding: '2px 8px' }}>
                              <Reply size={12} /> Responder como Autor
                            </button>
                          )}

                          <button type="button" className="ghost-button" onClick={() => handleDelete(comment.id)} disabled={isBusy} style={{ color: 'var(--color-danger, #ea4335)', fontSize: '11px', padding: '2px 8px' }}>
                            {isBusy ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />} Excluir
                          </button>
                        </div>

                        {/* Detalhes expandidos */}
                        {isExpanded && (
                          <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', background: 'rgba(128,128,128,0.06)', fontSize: '12px' }}>
                            <div style={{ marginBottom: '4px' }}><strong>Status:</strong> {
                              comment.status === 'approved' ? 'Aprovado'
                              : comment.status === 'pending' ? 'Pendente'
                              : comment.status === 'rejected_auto' ? 'Bloqueado pela IA'
                              : comment.status === 'rejected_manual' ? 'Rejeitado manualmente'
                              : comment.status
                            }</div>
                            {comment.reviewed_at && <div style={{ marginBottom: '4px' }}><strong>Revisado em:</strong> {formatDate(comment.reviewed_at)}</div>}
                            {comment.admin_notes && <div style={{ marginBottom: '4px' }}><strong>Observações:</strong> {comment.admin_notes}</div>}
                            {comment.moderation_decision && (() => {
                              try {
                                const decision = JSON.parse(comment.moderation_decision) as { action: string; reason: string; maxScore: number; maxCategory: string }
                                const catLabel = GCP_CATEGORIES.find(c => c.id === decision.maxCategory)?.label || decision.maxCategory
                                return (
                                  <div>
                                    <div><strong>Decisão da IA:</strong> {
                                      decision.action === 'approved' ? 'Aprovado' : decision.action === 'rejected_auto' ? 'Rejeitado' : 'Pendente'
                                    } — {decision.reason}</div>
                                    <div><strong>Maior score:</strong> {decision.maxScore.toFixed(2)} na categoria <em>{catLabel}</em></div>
                                  </div>
                                )
                              } catch { return null }
                            })()}
                            {comment.moderation_scores && (
                              <details style={{ marginTop: '6px' }}>
                                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                                  <Eye size={11} style={{ verticalAlign: '-1px' }} /> Scores completos da IA
                                </summary>
                                <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap', marginTop: '4px', maxHeight: '150px', overflow: 'auto' }}>
                                  {JSON.stringify(JSON.parse(comment.moderation_scores), null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        )}

                        {/* Formulário de resposta */}
                        {replyingTo === comment.id && (
                          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                            <input type="text" value={replyContent}
                              onChange={e => setReplyContent(e.target.value)}
                              placeholder="Sua resposta como autor do post..."
                              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(128,128,128,0.2)', fontSize: '13px', fontFamily: 'inherit' }}
                              onKeyDown={e => { if (e.key === 'Enter') handleReply(comment.id) }}
                            />
                            <button type="button" className="ghost-button" onClick={() => handleReply(comment.id)} disabled={isBusy || !replyContent.trim()}>
                              <Send size={14} /> Enviar
                            </button>
                            <button type="button" className="ghost-button" onClick={() => setReplyingTo(null)}>
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
