/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * ModerationPanel — Painel administrador de moderação de comentários.
 * Exibe métricas, lista filtrada por status, e ações em lote/individual.
 * Integrado ao MainsiteModule como seção colapsável.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, XCircle, Clock, Trash2,
  RefreshCw, Loader2, MessageSquare, Reply,
  Shield, Eye, ChevronDown, ChevronUp, Send,
} from 'lucide-react'

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

interface ModerationPanelProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void
}

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

  // ── Fetch comments ────────────────────────────────────────────────────

  const fetchComments = useCallback(async (status: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mainsite/comments/admin/all?status=${status}&limit=100`)
      if (!res.ok) throw new Error('Erro ao carregar comentários')
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
      showNotification('Falha ao carregar comentários para moderação.', 'error')
    } finally {
      setLoading(false)
    }
  }, [showNotification])

  useEffect(() => { fetchComments(activeFilter) }, [activeFilter, fetchComments])

  // ── Single actions ────────────────────────────────────────────────────

  const handleModerate = async (id: number, status: string, notes?: string) => {
    setActionInProgress(id)
    try {
      const res = await fetch(`/api/mainsite/comments/admin/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: notes }),
      })
      if (!res.ok) throw new Error('Falha na moderação')
      showNotification(
        status === 'approved' ? 'Comentário aprovado com sucesso.' : 'Comentário rejeitado.',
        'success'
      )
      await fetchComments(activeFilter)
    } catch {
      showNotification('Erro ao moderar comentário.', 'error')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDelete = async (id: number) => {
    setActionInProgress(id)
    try {
      const res = await fetch(`/api/mainsite/comments/admin/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha na exclusão')
      showNotification('Comentário excluído permanentemente.', 'success')
      await fetchComments(activeFilter)
    } catch {
      showNotification('Erro ao excluir comentário.', 'error')
    } finally {
      setActionInProgress(null)
    }
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
      if (!res.ok) throw new Error('Falha ao responder')
      showNotification('Resposta do autor publicada.', 'success')
      setReplyingTo(null)
      setReplyContent('')
      await fetchComments(activeFilter)
    } catch {
      showNotification('Erro ao publicar resposta.', 'error')
    } finally {
      setActionInProgress(null)
    }
  }

  // ── Bulk actions ──────────────────────────────────────────────────────

  const handleBulk = async (action: 'approve' | 'reject' | 'delete') => {
    if (selectedIds.size === 0) return
    setBulkAction(true)
    try {
      const res = await fetch('/api/mainsite/comments/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      })
      if (!res.ok) throw new Error('Falha na ação em lote')
      showNotification(`Ação em lote concluída: ${selectedIds.size} comentário(s) ${action === 'approve' ? 'aprovados' : action === 'reject' ? 'rejeitados' : 'excluídos'}.`, 'success')
      await fetchComments(activeFilter)
    } catch {
      showNotification('Erro na ação em lote.', 'error')
    } finally {
      setBulkAction(false)
    }
  }

  // ── Select helpers ────────────────────────────────────────────────────

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === comments.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(comments.map(c => c.id)))
  }

  // ── Format date ───────────────────────────────────────────────────────

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
    { key: 'rejected_auto', label: 'Bloqueados IA', count: counts.rejected_auto, icon: Shield },
    { key: 'rejected_manual', label: 'Rejeitados', count: counts.rejected_manual, icon: XCircle },
  ]

  return (
    <div className="result-card" style={{ marginTop: '16px' }}>
      <div className="result-toolbar">
        <div>
          <h4><MessageSquare size={16} /> Moderação de Comentários {totalPending > 0 && <span className="badge badge-em-implantacao">{totalPending} pendente{totalPending !== 1 ? 's' : ''}</span>}</h4>
          <p className="field-hint">Revise, aprove ou rejeite comentários enviados pelos leitores.</p>
        </div>
        <div className="inline-actions">
          <button type="button" className="ghost-button" onClick={() => fetchComments(activeFilter)} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            Atualizar
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`ghost-button ${activeFilter === tab.key ? 'ghost-button--active' : ''}`}
            onClick={() => setActiveFilter(tab.key)}
            style={{
              fontWeight: activeFilter === tab.key ? 700 : 500,
              opacity: activeFilter === tab.key ? 1 : 0.7,
              borderBottom: activeFilter === tab.key ? '2px solid var(--color-primary, #4285f4)' : '2px solid transparent',
              borderRadius: '4px 4px 0 0',
              padding: '6px 12px',
            }}
          >
            <tab.icon size={14} />
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Bulk actions */}
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

      {/* Comment list */}
      {loading ? (
        <div className="module-loading"><Loader2 size={20} className="spin" /></div>
      ) : comments.length === 0 ? (
        <p className="result-empty">Nenhum comentário com status "{activeFilter}".</p>
      ) : (
        <ul className="result-list astro-akashico-scroll" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {/* Select all */}
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
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(comment.id)}
                    style={{ marginTop: '4px', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px' }}>{comment.author_name}</strong>
                      {comment.author_email && <span style={{ fontSize: '11px', opacity: 0.5 }}>{comment.author_email}</span>}
                      <span style={{ fontSize: '11px', opacity: 0.4, marginLeft: 'auto' }}>{formatDate(comment.created_at)}</span>
                    </div>

                    {/* Post title */}
                    <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '6px' }}>
                      em <em>{comment.post_title || `Post #${comment.post_id}`}</em>
                    </div>

                    {/* Content preview */}
                    <div style={{ fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {comment.content.length > 200 && !isExpanded
                        ? comment.content.substring(0, 200) + '...'
                        : comment.content}
                    </div>

                    {/* Expand / Moderation details */}
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

                    {/* Expanded: moderation details */}
                    {isExpanded && (
                      <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', background: 'rgba(128,128,128,0.06)', fontSize: '12px' }}>
                        <div style={{ marginBottom: '4px' }}><strong>Status:</strong> {comment.status}</div>
                        {comment.reviewed_at && <div style={{ marginBottom: '4px' }}><strong>Revisado em:</strong> {formatDate(comment.reviewed_at)}</div>}
                        {comment.admin_notes && <div style={{ marginBottom: '4px' }}><strong>Notas admin:</strong> {comment.admin_notes}</div>}
                        {comment.moderation_decision && (() => {
                          try {
                            const decision = JSON.parse(comment.moderation_decision) as { action: string; reason: string; maxScore: number; maxCategory: string }
                            return (
                              <div>
                                <div><strong>IA Decision:</strong> {decision.action} ({decision.reason})</div>
                                <div><strong>Max score:</strong> {decision.maxScore.toFixed(2)} em {decision.maxCategory}</div>
                              </div>
                            )
                          } catch { return null }
                        })()}
                        {comment.moderation_scores && (
                          <details style={{ marginTop: '6px' }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                              <Eye size={11} style={{ verticalAlign: '-1px' }} /> Scores completos
                            </summary>
                            <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap', marginTop: '4px', maxHeight: '150px', overflow: 'auto' }}>
                              {JSON.stringify(JSON.parse(comment.moderation_scores), null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}

                    {/* Reply form */}
                    {replyingTo === comment.id && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={replyContent}
                          onChange={e => setReplyContent(e.target.value)}
                          placeholder="Sua resposta como autor..."
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
    </div>
  )
}
