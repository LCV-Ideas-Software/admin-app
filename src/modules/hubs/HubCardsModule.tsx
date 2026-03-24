import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Loader2, Plus, RefreshCw, Save, Trash2, Wand2 } from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { suggestIcon } from '../../lib/iconSuggestion'
import { formatOperationalSourceLabel } from '../../lib/operationalSource'

type HubCard = {
  name: string
  description: string
  url: string
  icon: string
  badge: string
}

const normalizeCardsForCompare = (items: HubCard[]) => items.map((card) => ({
  name: card.name.trim(),
  description: card.description.trim(),
  url: card.url.trim(),
  icon: card.icon.trim(),
  badge: card.badge.trim(),
}))

type HubConfigPayload = {
  ok: boolean
  error?: string
  fonte: 'bigdata_db' | 'bootstrap-default'
  avisos: string[]
  total: number
  cards: HubCard[]
  request_id?: string
}

type HubCardsModuleProps = {
  title: string
  description: string
  endpoint: '/api/apphub/config' | '/api/adminhub/config'
  adminActorFieldId: string
  adminActorFieldName: string
}

const HUB_CARDS_LIMITS = {
  maxCards: 100,
  nameMaxLength: 120,
  descriptionMaxLength: 600,
  urlMaxLength: 2048,
  iconMaxLength: 32,
  badgeMaxLength: 80,
} as const

const parseApiPayload = async <T,>(response: Response, fallback: string): Promise<T> => {
  const rawText = await response.text()
  const trimmed = rawText.trim()

  if (!trimmed) {
    throw new Error(`${fallback} (HTTP ${response.status}, corpo vazio).`)
  }

  const looksLikeHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')
  if (looksLikeHtml) {
    throw new Error(`${fallback} (HTTP ${response.status}, resposta HTML inesperada).`)
  }

  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new Error(`${fallback} (HTTP ${response.status}, resposta não-JSON).`)
  }
}

export function HubCardsModule({
  title,
  description,
  endpoint,
  adminActorFieldId,
  adminActorFieldName,
}: HubCardsModuleProps) {
  const { showNotification } = useNotification()
  const withTrace = (message: string, payload?: { request_id?: string }) => (
    payload?.request_id ? `${message} (req ${payload.request_id})` : message
  )

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [adminActor, setAdminActor] = useState('admin@app.lcv')
  const [payload, setPayload] = useState<HubConfigPayload | null>(null)
  const [cards, setCards] = useState<HubCard[]>([])
  const [baselineCards, setBaselineCards] = useState<HubCard[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [draggedPreviewIndex, setDraggedPreviewIndex] = useState<number | null>(null)

  const moduleToneClass = endpoint === '/api/apphub/config'
    ? 'module-shell-apphub'
    : 'module-shell-adminhub'
  const previewLevel = endpoint === '/api/apphub/config' ? 'open' : 'restricted'
  const previewSectionId = endpoint === '/api/apphub/config' ? 'section-open-title' : 'section-admin-title'
  const previewSectionLabel = endpoint === '/api/apphub/config' ? 'Acesso Liberado' : 'Ferramentas & Gestão'
  const previewPortalTitle = endpoint === '/api/apphub/config' ? 'Portal de Apps' : 'Painel Administrativo'

  const disabled = useMemo(() => loading || saving, [loading, saving])
  const hasUnsavedCards = useMemo(() => (
    JSON.stringify(normalizeCardsForCompare(cards)) !== JSON.stringify(normalizeCardsForCompare(baselineCards))
  ), [baselineCards, cards])

  const duplicateStats = useMemo(() => {
    const nameCounts = new Map<string, number>()
    const urlCounts = new Map<string, number>()

    for (const card of cards) {
      const normalizedName = card.name.trim().toLowerCase()
      const normalizedUrl = card.url.trim().toLowerCase()

      if (normalizedName) {
        nameCounts.set(normalizedName, (nameCounts.get(normalizedName) ?? 0) + 1)
      }

      if (normalizedUrl) {
        urlCounts.set(normalizedUrl, (urlCounts.get(normalizedUrl) ?? 0) + 1)
      }
    }

    const duplicateNameCount = Array.from(nameCounts.values()).filter((count) => count > 1).length
    const duplicateUrlCount = Array.from(urlCounts.values()).filter((count) => count > 1).length

    return {
      nameCounts,
      urlCounts,
      duplicateNameCount,
      duplicateUrlCount,
    }
  }, [cards])

  const cardFieldErrors = useMemo(() => cards.map((card) => {
    const errors: Partial<Record<keyof HubCard, string>> = {}
    const normalizedName = card.name.trim()
    const normalizedDescription = card.description.trim()
    const normalizedUrl = card.url.trim()
    const normalizedNameKey = normalizedName.toLowerCase()
    const normalizedUrlKey = normalizedUrl.toLowerCase()

    if (!normalizedName) {
      errors.name = 'Nome é obrigatório.'
    } else if (normalizedName.length > HUB_CARDS_LIMITS.nameMaxLength) {
      errors.name = `Nome deve ter no máximo ${HUB_CARDS_LIMITS.nameMaxLength} caracteres.`
    } else if ((duplicateStats.nameCounts.get(normalizedNameKey) ?? 0) > 1) {
      errors.name = 'Nome duplicado no formulário.'
    }

    if (!normalizedDescription) {
      errors.description = 'Descrição é obrigatória.'
    } else if (normalizedDescription.length > HUB_CARDS_LIMITS.descriptionMaxLength) {
      errors.description = `Descrição deve ter no máximo ${HUB_CARDS_LIMITS.descriptionMaxLength} caracteres.`
    }

    if (!normalizedUrl) {
      errors.url = 'URL é obrigatória.'
    } else if (normalizedUrl.length > HUB_CARDS_LIMITS.urlMaxLength) {
      errors.url = `URL deve ter no máximo ${HUB_CARDS_LIMITS.urlMaxLength} caracteres.`
    } else {
      try {
        const parsed = new URL(normalizedUrl)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          errors.url = 'URL deve começar com http:// ou https://.'
        } else if ((duplicateStats.urlCounts.get(normalizedUrlKey) ?? 0) > 1) {
          errors.url = 'URL duplicada no formulário.'
        }
      } catch {
        errors.url = 'URL inválida.'
      }
    }

    return errors
  }), [cards, duplicateStats.nameCounts, duplicateStats.urlCounts])

  const filteredCardEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const entries = cards.map((card, index) => ({ card, index }))
    if (!term) {
      return entries
    }

    return entries.filter(({ card }) => {
      const haystack = [card.name, card.description, card.url, card.badge, card.icon]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [cards, searchTerm])

  const qualityMetrics = useMemo(() => {
    const totalCards = cards.length
    if (totalCards === 0) {
      return {
        score: 0,
        invalidCards: 0,
        status: 'warning' as const,
        summary: 'Sem cards para avaliar qualidade.',
      }
    }

    const invalidCards = cardFieldErrors.reduce((acc, fieldErrors) => (
      Object.keys(fieldErrors).length > 0 ? acc + 1 : acc
    ), 0)

    const validCards = totalCards - invalidCards
    const score = Math.round((validCards / totalCards) * 100)

    const status = score >= 95
      ? 'ok'
      : score >= 70
        ? 'warning'
        : 'error'

    const summary = invalidCards === 0
      ? 'Todos os cards estão válidos para publicação.'
      : `${invalidCards} card(s) com pendências de validação.`

    return {
      score,
      invalidCards,
      status,
      summary,
      duplicateNameCount: duplicateStats.duplicateNameCount,
      duplicateUrlCount: duplicateStats.duplicateUrlCount,
    }
  }, [cardFieldErrors, cards.length, duplicateStats.duplicateNameCount, duplicateStats.duplicateUrlCount])

  const loadConfig = useCallback(async (shouldNotify = false) => {
    setLoading(true)
    try {
      const response = await fetch(endpoint, {
        headers: {
          'X-Admin-Actor': adminActor,
        },
      })

      const nextPayload = await parseApiPayload<HubConfigPayload>(response, `Falha ao carregar configuração de ${title}`)
      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? `Falha ao carregar configuração de ${title}.`)
      }

      setPayload(nextPayload)
      const nextCards = Array.isArray(nextPayload.cards) ? nextPayload.cards : []
      setCards(nextCards)
      setBaselineCards(nextCards)

      if (shouldNotify) {
        showNotification(withTrace(`${title} atualizado com ${nextPayload.total} card(s).`, nextPayload), 'success')
      }

      if (Array.isArray(nextPayload.avisos) && nextPayload.avisos.length > 0) {
        showNotification(nextPayload.avisos[0], 'info')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : `Não foi possível carregar ${title}.`
      showNotification(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [adminActor, endpoint, showNotification, title])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  useEffect(() => {
    if (!hasUnsavedCards) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedCards])

  const updateCardField = (index: number, field: keyof HubCard, value: string) => {
    setCards((current) => current.map((card, cardIndex) => (
      cardIndex === index
        ? { ...card, [field]: value }
        : card
    )))
  }

  /**
   * Atualiza o nome do card e, se o ícone estiver vazio, auto-sugere semanticamente.
   */
  const handleNameChange = (index: number, value: string) => {
    setCards((current) => current.map((card, cardIndex) => {
      if (cardIndex !== index) return card
      const updated = { ...card, name: value }
      if (!card.icon.trim()) {
        const suggested = suggestIcon(value, card.description)
        if (suggested) updated.icon = suggested
      }
      return updated
    }))
  }

  /**
   * Atualiza a descrição do card e, se o ícone estiver vazio, auto-sugere semanticamente.
   */
  const handleDescriptionChange = (index: number, value: string) => {
    setCards((current) => current.map((card, cardIndex) => {
      if (cardIndex !== index) return card
      const updated = { ...card, description: value }
      if (!card.icon.trim()) {
        const suggested = suggestIcon(card.name, value)
        if (suggested) updated.icon = suggested
      }
      return updated
    }))
  }

  /**
   * Força a re-sugestão de ícone com base no nome + descrição atuais do card.
   * Sobrescreve qualquer ícone existente.
   */
  const handleSuggestIcon = (index: number) => {
    setCards((current) => current.map((card, cardIndex) => {
      if (cardIndex !== index) return card
      const suggested = suggestIcon(card.name, card.description)
      return suggested ? { ...card, icon: suggested } : card
    }))
  }

  const addCard = () => {
    if (cards.length >= HUB_CARDS_LIMITS.maxCards) {
      showNotification(`Limite atingido: máximo de ${HUB_CARDS_LIMITS.maxCards} cards por módulo.`, 'error')
      return
    }

    setCards((current) => {
      const next = [
        ...current,
        {
          name: '',
          description: '',
          url: '',
          icon: '',
          badge: '',
        },
      ]
      setSelectedCardIndex(next.length - 1)
      return next
    })
    showNotification('Novo card adicionado ao formulário.', 'info')
  }

  const removeCard = (index: number) => {
    setCards((current) => {
      const next = current.filter((_, cardIndex) => cardIndex !== index)
      setSelectedCardIndex((prev) => {
        if (prev === null) return null
        if (prev === index) return next.length > 0 ? Math.min(index, next.length - 1) : null
        if (prev > index) return prev - 1
        return prev
      })
      return next
    })
    showNotification('Card removido do formulário.', 'info')
  }

  const moveCard = (index: number, direction: 'up' | 'down') => {
    setCards((current) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }

  const restoreSnapshot = () => {
    setCards(baselineCards)
    setSelectedCardIndex(baselineCards.length > 0 ? 0 : null)
    showNotification('Edição de cards restaurada para o último snapshot salvo.', 'info')
  }

  /* -- Drag-and-drop handlers para o Catálogo (preview) -- */
  const handlePreviewDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPreviewIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handlePreviewDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
    setDraggedPreviewIndex(null)
  }

  const handlePreviewDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handlePreviewDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedPreviewIndex === null || draggedPreviewIndex === dropIndex) return

    setCards((current) => {
      const next = [...current]
      const [dragged] = next.splice(draggedPreviewIndex, 1)
      next.splice(dropIndex, 0, dragged)
      return next
    })
    setDraggedPreviewIndex(null)
    showNotification('Ordem atualizada. Salve para persistir.', 'info')
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedCards = cards.map((card) => ({
      name: card.name.trim(),
      description: card.description.trim(),
      url: card.url.trim(),
      icon: card.icon.trim(),
      badge: card.badge.trim(),
    }))

    if (normalizedCards.length === 0) {
      showNotification('Adicione pelo menos um card antes de salvar.', 'error')
      return
    }

    if (normalizedCards.length > HUB_CARDS_LIMITS.maxCards) {
      showNotification(`Limite excedido: máximo de ${HUB_CARDS_LIMITS.maxCards} cards por módulo.`, 'error')
      return
    }

    const firstInvalidIndex = cardFieldErrors.findIndex((fieldErrors) => Object.keys(fieldErrors).length > 0)
    if (firstInvalidIndex >= 0) {
      showNotification(`Card #${firstInvalidIndex + 1} possui campos inválidos. Revise os avisos inline.`, 'error')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({
          cards: normalizedCards,
          adminActor,
        }),
      })

      const savePayload = await parseApiPayload<{ ok: boolean; error?: string; request_id?: string; total?: number }>(
        response,
        `Falha ao salvar configuração de ${title}`,
      )

      if (!response.ok || !savePayload.ok) {
        throw new Error(savePayload.error ?? `Falha ao salvar configuração de ${title}.`)
      }

      await loadConfig()
      showNotification(withTrace(`${title} salvo com sucesso.`, savePayload), 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : `Não foi possível salvar ${title}.`
      showNotification(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={`detail-panel module-shell ${moduleToneClass}`}>
      <div className="detail-header">
        <div className="detail-icon"><Save size={22} /></div>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSave}>
        <div className="result-toolbar">
          <div>
            <h4><Save size={16} /> Configuração de cards</h4>
            <p className="field-hint">Cards persistidos no `bigdata_db`; edição visual com ordenação e validação por campos.</p>
            {hasUnsavedCards && (
              <span className="badge badge-planejado">Alterações não salvas</span>
            )}
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={addCard} disabled={disabled}>
              <Plus size={16} />
              Adicionar card
            </button>
            <button type="button" className="ghost-button" onClick={restoreSnapshot} disabled={disabled || !hasUnsavedCards}>
              <RefreshCw size={16} />
              Restaurar snapshot
            </button>
            <button type="button" className="ghost-button" onClick={() => void loadConfig(true)} disabled={disabled}>
              {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Recarregar
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor={adminActorFieldId}>Administrador responsável</label>
            <input
              id={adminActorFieldId}
              name={adminActorFieldName}
              type="text"
              autoComplete="email"
              placeholder="admin@lcv.app.br"
              value={adminActor}
              onChange={(event) => setAdminActor(event.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="field-group">
            <label htmlFor={`${adminActorFieldId}-fonte`}>Fonte atual</label>
            <input
              id={`${adminActorFieldId}-fonte`}
              name={`${adminActorFieldName}Fonte`}
              value={payload?.fonte ? formatOperationalSourceLabel(payload.fonte) : '—'}
              readOnly
            />
          </div>
        </div>

        <div className="field-group">
          <label>Cards do módulo</label>
          <article className={`quality-banner quality-banner--${qualityMetrics.status}`}>
            <div className="quality-banner__main">
              <strong>Qualidade dos cards: {qualityMetrics.score}%</strong>
              <span>{qualityMetrics.summary}</span>
            </div>
            <div className="quality-banner__meta">
              <span>Total: {cards.length}</span>
              <span>Inválidos: {qualityMetrics.invalidCards}</span>
              <span>Nomes duplicados: {qualityMetrics.duplicateNameCount}</span>
              <span>URLs duplicadas: {qualityMetrics.duplicateUrlCount}</span>
            </div>
          </article>

          <div className="cards-toolbar">
            <input
              id={`${adminActorFieldId}-cards-search`}
              name={`${adminActorFieldName}CardsSearch`}
              type="search"
              placeholder="Buscar por nome, descrição, URL, badge..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              disabled={disabled}
            />
            <span className="cards-toolbar__meta">
              {cards.length} card(s) · {filteredCardEntries.length} visível(is)
            </span>
          </div>

          {cards.length === 0 ? (
            <p className="result-empty">Sem cards no formulário. Clique em "Adicionar card".</p>
          ) : (
            <>
              {/* ── Seletor dropdown (padrão MTA-STS) ─────────────── */}
              <div className="card-selector-group">
                <div className="field-group">
                  <label htmlFor={`${adminActorFieldId}-card-selector`}>Card ativo</label>
                  <select
                    id={`${adminActorFieldId}-card-selector`}
                    name={`${adminActorFieldName}CardSelector`}
                    value={selectedCardIndex ?? ''}
                    onChange={(event) => {
                      const val = event.target.value
                      setSelectedCardIndex(val === '' ? null : Number(val))
                    }}
                    disabled={disabled}
                  >
                    <option value="">Selecione um card...</option>
                    {filteredCardEntries.map(({ card, index }) => {
                      const hasErrors = Object.keys(cardFieldErrors[index] ?? {}).length > 0
                      return (
                        <option key={`${adminActorFieldId}-opt-${index}`} value={index}>
                          #{index + 1} — {card.name.trim() || 'Novo card'}{hasErrors ? ' ⚠️' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
                {selectedCardIndex !== null && selectedCardIndex < cards.length && (
                  <div className="card-selector-nav">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setSelectedCardIndex(Math.max(0, (selectedCardIndex ?? 0) - 1))}
                      disabled={disabled || selectedCardIndex === 0}
                    >
                      <ArrowUp size={14} /> Anterior
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setSelectedCardIndex(Math.min(cards.length - 1, (selectedCardIndex ?? 0) + 1))}
                      disabled={disabled || selectedCardIndex === cards.length - 1}
                    >
                      <ArrowDown size={14} /> Próximo
                    </button>
                  </div>
                )}
              </div>

              {/* ── Editor do card selecionado ──────────────────────── */}
              {selectedCardIndex !== null && selectedCardIndex < cards.length && (() => {
                const index = selectedCardIndex
                const card = cards[index]
                const errors = cardFieldErrors[index] ?? {}
                const nameErrorId = `${adminActorFieldId}-name-${index}-error`
                const urlErrorId = `${adminActorFieldId}-url-${index}-error`
                const descriptionErrorId = `${adminActorFieldId}-description-${index}-error`

                return (
                  <article className="card-editor-item">
                    <header className="card-editor-header">
                      <strong>Card #{index + 1}{card.name.trim() ? ` — ${card.name.trim()}` : ''}</strong>
                      <div className="card-editor-actions">
                        <button type="button" className="ghost-button" onClick={() => moveCard(index, 'up')} disabled={disabled || index === 0}>
                          <ArrowUp size={14} /> Subir
                        </button>
                        <button type="button" className="ghost-button" onClick={() => moveCard(index, 'down')} disabled={disabled || index === cards.length - 1}>
                          <ArrowDown size={14} /> Descer
                        </button>
                        <button type="button" className="ghost-button" onClick={() => removeCard(index)} disabled={disabled}>
                          <Trash2 size={14} /> Remover
                        </button>
                      </div>
                    </header>

                    <div className="form-grid">
                      <div className="field-group">
                        <label htmlFor={`${adminActorFieldId}-name-${index}`}>Nome</label>
                        <input
                          id={`${adminActorFieldId}-name-${index}`}
                          name={`${adminActorFieldName}Name${index}`}
                          value={card.name}
                          onChange={(event) => handleNameChange(index, event.target.value)}
                          disabled={disabled}
                          className={errors.name ? 'field-input-error' : undefined}
                          aria-describedby={errors.name ? nameErrorId : undefined}
                        />
                        {errors.name && <span id={nameErrorId} className="field-error">{errors.name}</span>}
                      </div>
                      <div className="field-group">
                        <label htmlFor={`${adminActorFieldId}-url-${index}`}>URL</label>
                        <input
                          id={`${adminActorFieldId}-url-${index}`}
                          name={`${adminActorFieldName}Url${index}`}
                          type="url"
                          value={card.url}
                          onChange={(event) => updateCardField(index, 'url', event.target.value)}
                          disabled={disabled}
                          className={errors.url ? 'field-input-error' : undefined}
                          aria-describedby={errors.url ? urlErrorId : undefined}
                        />
                        {errors.url && <span id={urlErrorId} className="field-error">{errors.url}</span>}
                      </div>
                    </div>

                    <div className="field-group">
                      <label htmlFor={`${adminActorFieldId}-description-${index}`}>Descrição</label>
                      <textarea
                        id={`${adminActorFieldId}-description-${index}`}
                        name={`${adminActorFieldName}Description${index}`}
                        rows={3}
                        value={card.description}
                        onChange={(event) => handleDescriptionChange(index, event.target.value)}
                        disabled={disabled}
                        className={errors.description ? 'field-input-error' : undefined}
                        aria-describedby={errors.description ? descriptionErrorId : undefined}
                      />
                      {errors.description && <span id={descriptionErrorId} className="field-error">{errors.description}</span>}
                    </div>

                    <div className="form-grid">
                      <div className="field-group">
                        <label htmlFor={`${adminActorFieldId}-icon-${index}`}>Ícone</label>
                        <div className="icon-field-wrapper">
                          {card.icon && (
                            <span className="icon-preview" aria-hidden="true">{card.icon}</span>
                          )}
                          <input
                            id={`${adminActorFieldId}-icon-${index}`}
                            name={`${adminActorFieldName}Icon${index}`}
                            value={card.icon}
                            onChange={(event) => updateCardField(index, 'icon', event.target.value)}
                            disabled={disabled}
                            placeholder="Ex.: 🌌"
                            className="icon-input"
                          />
                          <button
                            type="button"
                            className="icon-suggest-btn"
                            onClick={() => handleSuggestIcon(index)}
                            disabled={disabled || !card.name.trim()}
                            title="Sugerir ícone com base no nome e descrição do card"
                            aria-label="Sugerir ícone automaticamente"
                          >
                            <Wand2 size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="field-group">
                        <label htmlFor={`${adminActorFieldId}-badge-${index}`}>Badge</label>
                        <input
                          id={`${adminActorFieldId}-badge-${index}`}
                          name={`${adminActorFieldName}Badge${index}`}
                          value={card.badge}
                          onChange={(event) => updateCardField(index, 'badge', event.target.value)}
                          disabled={disabled}
                          placeholder="Ex.: Abrir App"
                        />
                      </div>
                    </div>
                  </article>
                )
              })()}
            </>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={disabled}>
            {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            Salvar configuração
          </button>
        </div>
      </form>

      <section className="metrics-grid">
        <article className="metric-card">
          <div className="metric-icon"><Save size={20} /></div>
          <strong>{payload?.total ?? 0}</strong>
          <span>Total de cards ativos.</span>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><RefreshCw size={20} /></div>
          <strong>{payload?.fonte ? formatOperationalSourceLabel(payload.fonte) : '—'}</strong>
          <span>Fonte dos dados carregados.</span>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><Save size={20} /></div>
          <strong>{payload?.avisos?.length ?? 0}</strong>
          <span>Avisos operacionais no carregamento.</span>
        </article>
      </section>

      <article className="result-card">
        <header className="result-header">
          <h4><GripVertical size={16} /> Catálogo (paridade visual — arraste para reordenar)</h4>
          <span>{cards.length} item(ns)</span>
        </header>

        {cards.length === 0 ? (
          <p className="result-empty">Sem cards carregados para este módulo.</p>
        ) : (
          <section className="legacy-hub-preview" aria-labelledby={previewSectionId}>
            <h5 className="legacy-hub-preview__title">{previewPortalTitle}</h5>
            <h6 id={previewSectionId} className="legacy-hub-preview__section-heading">
              <span className={`status-dot ${previewLevel}`} />
              {previewSectionLabel}
            </h6>
            <div className="card-grid card-grid-draggable">
            {cards.map((card, index) => (
              <article
                key={`preview-${card.name}-${index}`}
                className={`card ${draggedPreviewIndex === index ? 'card--dragging' : ''}`}
                data-level={previewLevel}
                draggable
                onDragStart={(e) => handlePreviewDragStart(e, index)}
                onDragEnd={handlePreviewDragEnd}
                onDragOver={handlePreviewDragOver}
                onDrop={(e) => handlePreviewDrop(e, index)}
              >
                <div className="card-drag-handle" title="Arrastar para reordenar">
                  <GripVertical size={16} />
                </div>
                <div className="card-icon">{card.icon || '🧩'}</div>
                <h5 className="card-title">{card.name || 'Sem nome'}</h5>
                <p className="card-desc">{card.description || 'Sem descrição cadastrada.'}</p>
                <p className="field-hint">{card.url}</p>
                <span className="card-badge">{card.badge || 'Abrir'}</span>
              </article>
            ))}
            </div>
          </section>
        )}
      </article>
    </section>
  )
}