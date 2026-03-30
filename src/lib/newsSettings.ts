/**
 * Configurações do painel de notícias — utilitário compartilhado.
 * Salva/lê do D1 (via /api/config-store) para uso em NewsPanel (leitura)
 * e ConfigModule (edição).
 *
 * Fontes são dinâmicas: o usuário pode adicionar quantas fontes quiser.
 * Cada fonte precisa de: id (slug único), name (nome de exibição),
 * url (URL do feed RSS) e category (etiqueta livre).
 */

export interface NewsSource {
  /** Identificador único (slug). Ex.: "g1", "cnn-brasil" */
  id: string
  /** Nome de exibição. Ex.: "G1", "CNN Brasil" */
  name: string
  /** URL completa do feed RSS/Atom. Ex.: "https://g1.globo.com/rss/g1/" */
  url: string
  /** Categoria livre. Ex.: "Brasil", "Tecnologia", "Economia" */
  category: string
}

export interface NewsSettings {
  refreshMinutes: number
  maxItems: number
  /** IDs das fontes ativas (presentes em `sources`) */
  enabledSources: string[]
  keywords: string
  /** Lista completa de fontes configuradas pelo usuário */
  sources: NewsSource[]
}

export const NEWS_STORAGE_KEY = 'lcv-news-settings'

/** Fontes pré-configuradas (instalação inicial) */
export const BUILTIN_SOURCES: NewsSource[] = [
  { id: 'g1',         name: 'G1',          url: 'https://g1.globo.com/rss/g1/',                            category: 'Brasil' },
  { id: 'folha',      name: 'Folha',       url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml',  category: 'Brasil' },
  { id: 'bbc',        name: 'BBC Brasil',  url: 'https://www.bbc.com/portuguese/index.xml',                category: 'Mundo' },
  { id: 'techcrunch', name: 'TechCrunch',  url: 'https://techcrunch.com/feed/',                            category: 'Tecnologia' },
]

export const DEFAULT_NEWS_SETTINGS: NewsSettings = {
  refreshMinutes: 5,
  maxItems: 30,
  enabledSources: BUILTIN_SOURCES.map(s => s.id),
  keywords: '',
  sources: [...BUILTIN_SOURCES],
}

/**
 * Carrega settings do D1 via /api/config-store.
 * Fallback: localStorage (migração one-shot).
 */
export async function loadNewsSettings(): Promise<NewsSettings> {
  try {
    const res = await fetch(`/api/config-store?module=${encodeURIComponent(NEWS_STORAGE_KEY)}`)
    const data = await res.json() as { ok: boolean; config?: NewsSettings | null }
    if (data.ok && data.config) {
      const parsed = data.config
      const sources = Array.isArray(parsed.sources) && parsed.sources.length > 0
        ? parsed.sources
        : [...BUILTIN_SOURCES]
      return { ...DEFAULT_NEWS_SETTINGS, ...parsed, sources }
    }
  } catch { /* D1/rede indisponível — tentar fallback */ }

  // Fallback: migração one-shot do localStorage
  try {
    const raw = localStorage.getItem(NEWS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<NewsSettings>
      const sources = Array.isArray(parsed.sources) && parsed.sources.length > 0
        ? parsed.sources
        : [...BUILTIN_SOURCES]
      const settings = { ...DEFAULT_NEWS_SETTINGS, ...parsed, sources }
      // Migrar para D1
      void persistNewsSettingsToD1(settings)
      localStorage.removeItem(NEWS_STORAGE_KEY)
      return settings
    }
  } catch { /* ignorar */ }

  return { ...DEFAULT_NEWS_SETTINGS, sources: [...BUILTIN_SOURCES] }
}

/**
 * Salva settings no D1 via /api/config-store.
 */
export async function saveNewsSettings(settings: NewsSettings): Promise<void> {
  try {
    await fetch('/api/config-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: NEWS_STORAGE_KEY, config: settings }),
    })
  } catch { /* Silencioso — não bloqueia UX */ }
}

/** Fire-and-forget D1 write (alias interno) */
async function persistNewsSettingsToD1(settings: NewsSettings): Promise<void> {
  await saveNewsSettings(settings)
}

/** Emite evento customizado para notificar NewsPanel sobre mudanças de config */
export function dispatchNewsSettingsChange(): void {
  window.dispatchEvent(new CustomEvent('news-settings-changed'))
}

/** Gera um slug a partir do nome da fonte */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
