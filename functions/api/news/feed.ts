/**
 * /api/news/feed — Pages Function
 * Busca RSS de múltiplas fontes, faz parse XML → JSON,
 * retorna headlines unificadas ordenadas por data.
 * Cache via Cloudflare Cache API (TTL 10 min).
 */

interface Env {
  BIGDATA_DB: D1Database
}

interface NewsItem {
  title: string
  link: string
  source: string
  pubDate: string
  timestamp: number
  thumbnail: string | null
}

// Fontes RSS configuráveis
const RSS_SOURCES: Array<{ name: string; url: string }> = [
  { name: 'G1', url: 'https://g1.globo.com/rss/g1/' },
  { name: 'Folha', url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml' },
  { name: 'BBC Brasil', url: 'https://www.bbc.com/portuguese/index.xml' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
]

const MAX_ITEMS = 20
const CACHE_TTL_SECONDS = 600 // 10 minutos



/**
 * Faz parse de um feed RSS XML e retorna itens normalizados.
 */
function parseRSSFeed(xmlText: string, sourceName: string): NewsItem[] {
  // Cloudflare Workers não tem DOMParser nativo — usamos regex parsing
  const items: NewsItem[] = []

  // Extrair todos os <item>...</item> blocos
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xmlText)) !== null && items.length < MAX_ITEMS) {
    const block = match[1]

    // Extrair campos com regex (mais robusto que DOM em Workers)
    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link')
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'dc:date')

    if (!title || !link) continue

    const timestamp = pubDate ? new Date(pubDate).getTime() : 0

    // Thumbnail: media:content url, enclosure, ou img no description
    let thumbnail: string | null = null
    const mediaMatch = block.match(/<media:content[^>]+url=["']([^"']+)["']/)
    if (mediaMatch) thumbnail = mediaMatch[1]

    if (!thumbnail) {
      const mediaThumbMatch = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/)
      if (mediaThumbMatch) thumbnail = mediaThumbMatch[1]
    }

    if (!thumbnail) {
      const enclosureMatch = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image\//)
      if (enclosureMatch) thumbnail = enclosureMatch[1]
    }

    if (!thumbnail) {
      const descImgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/)
      if (descImgMatch) thumbnail = descImgMatch[1]
    }

    items.push({
      title: cleanHtml(title),
      link,
      source: sourceName,
      pubDate: pubDate || new Date().toISOString(),
      timestamp: isNaN(timestamp) ? 0 : timestamp,
      thumbnail,
    })
  }

  return items
}

/**
 * Extrai conteúdo de uma tag XML específica, tratando CDATA.
 */
function extractTag(block: string, tag: string): string {
  // Tenta com CDATA primeiro
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i')
  const cdataMatch = block.match(cdataRegex)
  if (cdataMatch) return cdataMatch[1].trim()

  // Sem CDATA
  const simpleRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const simpleMatch = block.match(simpleRegex)
  if (simpleMatch) return simpleMatch[1].trim()

  return ''
}

/**
 * Remove tags HTML e decodifica entidades comuns.
 */
function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/**
 * Busca um feed RSS individual com timeout.
 */
async function fetchFeed(source: { name: string; url: string }): Promise<NewsItem[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LCV-AdminApp-NewsPanel/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.warn(`[news] Feed ${source.name} retornou HTTP ${response.status}`)
      return []
    }

    const xml = await response.text()
    return parseRSSFeed(xml, source.name)
  } catch (error) {
    console.warn(`[news] Erro ao buscar feed ${source.name}:`, error)
    return []
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const cacheUrl = new URL(context.request.url)
  const cacheKey = new Request(cacheUrl.toString(), context.request)
  const cache = caches.default

  // Verificar cache
  const cachedResponse = await cache.match(cacheKey)
  if (cachedResponse) {
    return cachedResponse
  }

  // Buscar todos os feeds em paralelo
  const feedResults = await Promise.allSettled(
    RSS_SOURCES.map((source) => fetchFeed(source))
  )

  // Unificar e ordenar por data
  const allItems: NewsItem[] = []
  for (const result of feedResults) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value)
    }
  }

  allItems.sort((a, b) => b.timestamp - a.timestamp)
  const items = allItems.slice(0, MAX_ITEMS)

  const body = JSON.stringify({
    ok: true,
    items,
    total: items.length,
    sources: RSS_SOURCES.map((s) => s.name),
    cached: false,
    fetched_at: new Date().toISOString(),
  })

  const response = new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
      'Access-Control-Allow-Origin': '*',
    },
  })

  // Salvar no cache (non-blocking)
  context.waitUntil(cache.put(cacheKey, response.clone()))

  return response
}
