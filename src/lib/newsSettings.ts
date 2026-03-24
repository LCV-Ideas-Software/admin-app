/**
 * Configurações do painel de notícias — utilitário compartilhado.
 * Salva/lê do localStorage para uso em NewsPanel (leitura) e ConfigModule (edição).
 */

export interface NewsSettings {
  refreshMinutes: number
  maxItems: number
  enabledSources: string[]
  keywords: string
}

export const NEWS_STORAGE_KEY = 'lcv-news-settings'

export const DEFAULT_NEWS_SETTINGS: NewsSettings = {
  refreshMinutes: 5,
  maxItems: 30,
  enabledSources: ['g1', 'folha', 'bbc', 'techcrunch'],
  keywords: '',
}

export const AVAILABLE_SOURCES = [
  { id: 'g1',         name: 'G1',          category: 'Brasil' },
  { id: 'folha',      name: 'Folha',       category: 'Brasil' },
  { id: 'bbc',        name: 'BBC Brasil',  category: 'Mundo' },
  { id: 'techcrunch', name: 'TechCrunch',  category: 'Tecnologia' },
]

export function loadNewsSettings(): NewsSettings {
  try {
    const raw = localStorage.getItem(NEWS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_NEWS_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<NewsSettings>
    return { ...DEFAULT_NEWS_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_NEWS_SETTINGS }
  }
}

export function saveNewsSettings(settings: NewsSettings): void {
  localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(settings))
}

/** Emite evento customizado para notificar NewsPanel sobre mudanças de config */
export function dispatchNewsSettingsChange(): void {
  window.dispatchEvent(new CustomEvent('news-settings-changed'))
}
