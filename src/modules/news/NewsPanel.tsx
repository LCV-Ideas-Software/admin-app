import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, Newspaper, RefreshCw } from 'lucide-react'

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
  sources: string[]
  fetched_at: string
}

const AUTO_ROTATE_MS = 10_000
const AUTO_REFRESH_MS = 300_000 // 5 min

/**
 * Ícone-fonte por nome do portal (emoji simplificado).
 */
function sourceIcon(source: string): string {
  const s = source.toLowerCase()
  if (s.includes('g1') || s.includes('globo')) return '🔴'
  if (s.includes('folha')) return '📰'
  if (s.includes('bbc')) return '🌐'
  if (s.includes('tech')) return '⚡'
  return '📄'
}

/**
 * Formata data relativa ("há X min", "há X h", etc.)
 */
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

export function NewsPanel() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [fetchedAt, setFetchedAt] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news/feed')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: NewsFeedResponse = await res.json()
      if (!data.ok || !data.items?.length) {
        throw new Error('Sem notícias disponíveis.')
      }
      setItems(data.items)
      setFetchedAt(data.fetched_at)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar notícias.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch inicial + auto-refresh a cada 5 min
  useEffect(() => {
    void fetchNews()
    const refreshInterval = setInterval(() => void fetchNews(), AUTO_REFRESH_MS)
    return () => clearInterval(refreshInterval)
  }, [fetchNews])

  // Auto-rotação a cada 10s (pausa no hover)
  useEffect(() => {
    if (isPaused || items.length <= 1) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length)
    }, AUTO_ROTATE_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, items.length])

  // Reset progress bar animation on index change
  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.animation = 'none'
      // Force reflow
      void progressRef.current.offsetHeight
      progressRef.current.style.animation = ''
    }
  }, [activeIndex])

  const goTo = (index: number) => {
    setActiveIndex(index)
  }

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length)
  }

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length)
  }

  if (loading) {
    return (
      <article className="news-panel news-panel--loading">
        <div className="news-panel__header">
          <Newspaper size={18} />
          <h4>Notícias</h4>
        </div>
        <div className="news-panel__loading">
          <Loader2 size={20} className="spin" />
          <span>Carregando notícias...</span>
        </div>
      </article>
    )
  }

  if (error || items.length === 0) {
    return (
      <article className="news-panel news-panel--error">
        <div className="news-panel__header">
          <Newspaper size={18} />
          <h4>Notícias</h4>
          <button type="button" className="news-panel__refresh" onClick={() => { setLoading(true); void fetchNews() }} title="Recarregar">
            <RefreshCw size={14} />
          </button>
        </div>
        <p className="news-panel__empty">{error ?? 'Nenhuma notícia disponível no momento.'}</p>
      </article>
    )
  }

  const active = items[activeIndex]

  return (
    <article
      className="news-panel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Painel de notícias"
      aria-roledescription="carousel"
    >
      {/* Header */}
      <div className="news-panel__header">
        <Newspaper size={18} />
        <h4>Notícias</h4>
        <span className="news-panel__counter">
          {activeIndex + 1}/{items.length}
        </span>
        <button type="button" className="news-panel__refresh" onClick={() => { setLoading(true); void fetchNews() }} title="Recarregar notícias">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Carousel content area */}
      <div className="news-carousel" aria-live="polite">
        <a
          href={active.link}
          target="_blank"
          rel="noopener noreferrer"
          className="news-card"
          key={`${activeIndex}-${active.link}`}
          aria-label={`${active.title} — ${active.source}`}
        >
          {active.thumbnail && (
            <div className="news-card__thumb">
              <img src={active.thumbnail} alt="" loading="lazy" />
            </div>
          )}
          <div className="news-card__body">
            <div className="news-card__meta">
              <span className="news-card__source">
                <span className="news-card__source-icon">{sourceIcon(active.source)}</span>
                {active.source}
              </span>
              <span className="news-card__time">{timeAgo(active.pubDate)}</span>
            </div>
            <h5 className="news-card__title">{active.title}</h5>
            <span className="news-card__open">
              Ler mais <ExternalLink size={12} />
            </span>
          </div>
        </a>
      </div>

      {/* Progress bar */}
      <div className="news-panel__progress-track">
        <div
          ref={progressRef}
          className={`news-panel__progress-bar ${isPaused ? 'news-panel__progress-bar--paused' : ''}`}
          style={{ animationDuration: `${AUTO_ROTATE_MS}ms` }}
        />
      </div>

      {/* Navigation */}
      <div className="news-panel__nav">
        <button type="button" className="news-nav-btn" onClick={goPrev} aria-label="Notícia anterior">
          <ChevronLeft size={16} />
        </button>
        <div className="news-panel__dots">
          {items.slice(0, 10).map((_, i) => (
            <button
              key={i}
              type="button"
              className={`news-dot ${i === activeIndex ? 'news-dot--active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Notícia ${i + 1}`}
            />
          ))}
          {items.length > 10 && <span className="news-dots-more">+{items.length - 10}</span>}
        </div>
        <button type="button" className="news-nav-btn" onClick={goNext} aria-label="Próxima notícia">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Footer */}
      {fetchedAt && (
        <p className="news-panel__footer">
          Atualizado {timeAgo(fetchedAt)} · pausa ao passar o mouse
        </p>
      )}
    </article>
  )
}
