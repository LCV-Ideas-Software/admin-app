import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Loader2, Newspaper, RefreshCw } from 'lucide-react'
import { loadNewsSettings, type NewsSettings } from '../../lib/newsSettings'

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

const SOURCE_ICONS: Record<string, string> = {
  g1: '🔴', folha: '📰', bbc: '🌐', techcrunch: '⚡',
}

function sourceIcon(source: string): string {
  const s = source.toLowerCase()
  for (const [key, icon] of Object.entries(SOURCE_ICONS)) {
    if (s.includes(key)) return icon
  }
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
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState('')
  const [settings, setSettings] = useState<NewsSettings>(loadNewsSettings)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Recarregar configurações via evento customizado do ConfigModule
  useEffect(() => {
    const onSettingsChange = () => {
      setSettings(loadNewsSettings())
    }
    window.addEventListener('news-settings-changed', onSettingsChange)
    return () => window.removeEventListener('news-settings-changed', onSettingsChange)
  }, [])

  const fetchNews = useCallback(async (currentSettings: NewsSettings) => {
    try {
      const params = new URLSearchParams()
      if (currentSettings.enabledSources.length > 0) {
        params.set('sources', currentSettings.enabledSources.join(','))
      }
      params.set('max', String(currentSettings.maxItems))

      const res = await fetch(`/api/news/feed?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: NewsFeedResponse = await res.json()
      if (!data.ok || !data.items?.length) {
        throw new Error('Sem notícias disponíveis.')
      }

      // Filtro por palavras-chave (client-side)
      let filtered = data.items
      if (currentSettings.keywords.trim()) {
        const kws = currentSettings.keywords.toLowerCase().split(',').map(k => k.trim()).filter(Boolean)
        if (kws.length > 0) {
          filtered = filtered.filter(item =>
            kws.some(kw => item.title.toLowerCase().includes(kw))
          )
        }
      }

      setItems(filtered)
      setFetchedAt(data.fetched_at)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar notícias.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch inicial + auto-refresh configurável
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
  }, [fetchNews, settings])

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
          {loading ? '...' : `${items.length} itens`}
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

      {/* Feed */}
      {loading && items.length === 0 ? (
        <div className="news-panel__loading">
          <Loader2 size={20} className="spin" />
          <span>Carregando notícias...</span>
        </div>
      ) : error && items.length === 0 ? (
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
          {items.length === 0 && settings.keywords && (
            <p className="news-panel__empty">Nenhuma notícia encontrada com os filtros atuais.</p>
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
