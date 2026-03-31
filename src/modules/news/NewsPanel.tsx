/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Loader2, Newspaper, RefreshCw, Search } from 'lucide-react'
import { loadNewsSettings, DEFAULT_NEWS_SETTINGS, type NewsSettings } from '../../lib/newsSettings'

/* ─── Types ──────────────────────────────────────────── */

interface NewsItem {
  title: string
  link: string
  source: string
  pubDate: string
  timestamp: number
  thumbnail: string | null
}

interface NewsFeedResponse {
  ok: boolean
  items: NewsItem[]
  total: number
  fetched_at: string
}

/* ─── Helpers ────────────────────────────────────────── */

function sourceIcon(source: string): string {
  const s = source.toLowerCase()
  if (s.includes('g1')) return '🔴'
  if (s.includes('folha')) return '📰'
  if (s.includes('bbc')) return '🌐'
  if (s.includes('techcrunch') || s.includes('tech')) return '⚡'
  if (s.includes('cnn')) return '📺'
  if (s.includes('uol')) return '🟡'
  if (s.includes('estad')) return '📋'
  return '📄'
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  if (isNaN(then)) return ''
  const diffMs = now - then
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}

/* ─── Component ──────────────────────────────────────── */

export function NewsPanel() {
  const [allItems, setAllItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState('')
  const [settings, setSettings] = useState<NewsSettings>(DEFAULT_NEWS_SETTINGS)
  const [localKeywords, setLocalKeywords] = useState('')
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Carregar settings do D1 no mount
  useEffect(() => {
    void loadNewsSettings().then(setSettings)
  }, [])

  // Recarregar configurações via evento customizado do ConfigModule
  useEffect(() => {
    const onSettingsChange = () => {
      void loadNewsSettings().then(setSettings)
    }
    window.addEventListener('news-settings-changed', onSettingsChange)
    return () => window.removeEventListener('news-settings-changed', onSettingsChange)
  }, [])

  // Filtro por palavras-chave — instantâneo sobre itens já carregados
  const items = useMemo(() => {
    const kw = localKeywords.trim()
    if (!kw) return allItems
    const kws = kw.toLowerCase().split(',').map(k => k.trim()).filter(Boolean)
    if (kws.length === 0) return allItems
    return allItems.filter(item =>
      kws.some(k => item.title.toLowerCase().includes(k) || item.source.toLowerCase().includes(k))
    )
  }, [allItems, localKeywords])

  const fetchNews = useCallback(async (currentSettings: NewsSettings) => {
    try {
      const params = new URLSearchParams()
      params.set('max', String(currentSettings.maxItems))

      // Enviar fontes ativas completas (com URL) para suportar fontes customizadas
      const activeSources = (currentSettings.sources ?? [])
        .filter(s => currentSettings.enabledSources.includes(s.id))
      if (activeSources.length > 0) {
        params.set('custom_sources', encodeURIComponent(JSON.stringify(activeSources)))
      }

      const res = await fetch(`/api/news/feed?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: NewsFeedResponse = await res.json()
      if (!data.ok || !data.items?.length) {
        throw new Error('Sem notícias disponíveis.')
      }

      setAllItems(data.items)
      setFetchedAt(data.fetched_at)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar notícias.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch quando fontes/max mudam (keywords NÃO disparam novo fetch)
  const fetchKey = useMemo(() => {
    return `${settings.enabledSources.join(',')}_${settings.maxItems}_${JSON.stringify(settings.sources?.map(s => s.id))}`
  }, [settings.enabledSources, settings.maxItems, settings.sources])

  useEffect(() => {
    setLoading(true)
    void fetchNews(settings)

    if (refreshRef.current) clearInterval(refreshRef.current)
    refreshRef.current = setInterval(
      () => void fetchNews(settings),
      settings.refreshMinutes * 60_000
    )

    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchNews, fetchKey, settings.refreshMinutes])

  const handleRefresh = () => {
    setLoading(true)
    void fetchNews(settings)
  }

  /* ─── Render ─────────────────────────────────────── */

  return (
    <article className="news-panel" role="region" aria-label="Painel de notícias">
      {/* Header */}
      <div className="news-panel__header">
        <Newspaper size={18} />
        <h4>Notícias</h4>
        <span className="news-panel__counter">
          {loading ? '...' : items.length !== allItems.length
            ? `${items.length}/${allItems.length} filtradas`
            : `${items.length} itens`
          }
        </span>
        <button
          type="button"
          className="news-panel__refresh"
          onClick={handleRefresh}
          title="Recarregar notícias"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Search bar — filtro instantâneo */}
      <div className="news-panel__search">
        <label htmlFor="news-keyword-filter" className="sr-only">Filtrar notícias por palavra-chave</label>
        <Search size={14} />
        <input
          id="news-keyword-filter"
          name="newsKeywordFilter"
          type="text"
          placeholder="Filtrar notícias... (ex.: economia, tecnologia)"
          value={localKeywords}
          onChange={e => setLocalKeywords(e.target.value)}
          autoComplete="off"
        />
      </div>

      {/* Feed */}
      {loading && allItems.length === 0 ? (
        <div className="news-panel__loading">
          <Loader2 size={20} className="spin" />
          <span>Carregando notícias...</span>
        </div>
      ) : error && allItems.length === 0 ? (
        <p className="news-panel__empty">{error}</p>
      ) : (
        <div className="news-feed">
          {items.map((item, i) => (
            <a
              key={`${item.link}-${i}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="news-card"
              aria-label={`${item.title} — ${item.source}`}
            >
              {item.thumbnail && (
                <div className="news-card__thumb">
                  <img
                    src={item.thumbnail}
                    alt=""
                    loading="lazy"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              )}
              <div className="news-card__body">
                <div className="news-card__meta">
                  <span className="news-card__source">
                    <span className="news-card__source-icon">{sourceIcon(item.source)}</span>
                    {item.source}
                  </span>
                  <span className="news-card__time">{timeAgo(item.pubDate)}</span>
                </div>
                <h5 className="news-card__title">{item.title}</h5>
                <span className="news-card__open">
                  Ler mais <ExternalLink size={12} />
                </span>
              </div>
            </a>
          ))}
          {items.length === 0 && allItems.length > 0 && settings.keywords && (
            <p className="news-panel__empty">Nenhuma notícia corresponde aos filtros: &ldquo;{settings.keywords}&rdquo;</p>
          )}
          {items.length === 0 && allItems.length === 0 && !loading && (
            <p className="news-panel__empty">Nenhuma notícia disponível.</p>
          )}
        </div>
      )}

      {/* Footer */}
      {fetchedAt && (
        <p className="news-panel__footer">
          Atualizado {timeAgo(fetchedAt)} · {settings.enabledSources.length} fonte{settings.enabledSources.length !== 1 ? 's' : ''} · atualização a cada {settings.refreshMinutes}min
        </p>
      )}
    </article>
  )
}
