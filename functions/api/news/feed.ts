/**
 * /api/news/feed — Pages Function
 * Busca RSS de múltiplas fontes, faz parse XML → JSON,
 * retorna headlines unificadas ordenadas por data.
 * Cache via Cloudflare Cache API (TTL 10 min).
 *
 * Fix de encoding: usa ArrayBuffer + TextDecoder com charset
 * extraído do Content-Type ou prólogo XML para suportar
 * feeds ISO-8859-1 / Latin-1 (comum em portais brasileiros).
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

// Fontes RSS configuráveis — cada fonte tem nome e URL
const RSS_SOURCES: Array<{ id: string; name: string; url: string; category: string }> = [
  { id: 'g1',        name: 'G1',          url: 'https://g1.globo.com/rss/g1/',                              category: 'brasil' },
  { id: 'folha',     name: 'Folha',       url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml',    category: 'brasil' },
  { id: 'bbc',       name: 'BBC Brasil',  url: 'https://www.bbc.com/portuguese/index.xml',                  category: 'mundo' },
  { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/feed/',                              category: 'tech' },
]

const DEFAULT_MAX_ITEMS = 30
const CACHE_TTL_SECONDS = 600 // 10 minutos

/**
 * Detecta o charset a partir do Content-Type header ou do prólogo XML.
 * Fallback: UTF-8.
 */
function detectCharset(contentType: string | null, rawBytes: ArrayBuffer): string {
  // 1. Tentar extrair do Content-Type header
  if (contentType) {
    const match = contentType.match(/charset=([^\s;]+)/i)
    if (match) return match[1].toLowerCase().replace(/['"]/g, '')
  }

  // 2. Tentar extrair do prólogo XML (peek nos primeiros 200 bytes como ASCII)
  const peek = new TextDecoder('ascii', { fatal: false }).decode(rawBytes.slice(0, 200))
  const xmlMatch = peek.match(/encoding=["']([^"']+)["']/i)
  if (xmlMatch) return xmlMatch[1].toLowerCase()

  return 'utf-8'
}

/**
 * Converte charset aliases comuns para nomes reconhecidos pelo TextDecoder.
 */
function normalizeCharset(charset: string): string {
  const map: Record<string, string> = {
    'iso-8859-1': 'windows-1252',
    'latin1': 'windows-1252',
    'latin-1': 'windows-1252',
    'iso_8859-1': 'windows-1252',
    'iso8859-1': 'windows-1252',
  }
  return map[charset] ?? charset
}

/**
 * Faz parse de um feed RSS XML e retorna itens normalizados.
 */
function parseRSSFeed(xmlText: string, sourceName: string, sourceId: string, maxItems: number): NewsItem[] {
  const items: NewsItem[] = []

  // Extrair todos os <item>...</item> blocos
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xmlText)) !== null && items.length < maxItems) {
    const block = match[1]

    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link')
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'dc:date')

    if (!title || !link) continue

    const timestamp = pubDate ? new Date(pubDate).getTime() : 0

    // Thumbnail: tenta múltiplas estratégias
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
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim()
}

/**
 * Busca um feed RSS individual com timeout e detecção de charset.
 */
async function fetchFeed(
  source: { id: string; name: string; url: string },
  maxItems: number
): Promise<NewsItem[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LCV-AdminApp-NewsPanel/2.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.warn(`[news] Feed ${source.name} retornou HTTP ${response.status}`)
      return []
    }

    // Encoding fix: ler como ArrayBuffer e decodificar com charset correto
    const contentType = response.headers.get('Content-Type')
    const buffer = await response.arrayBuffer()
    const charset = normalizeCharset(detectCharset(contentType, buffer))

    let xml: string
    try {
      xml = new TextDecoder(charset, { fatal: false }).decode(buffer)
    } catch {
      // Fallback genérico se charset não suportado
      xml = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    }

    return parseRSSFeed(xml, source.name, source.id, maxItems)
  } catch (error) {
    console.warn(`[news] Erro ao buscar feed ${source.name}:`, error)
    return []
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)

  // Parâmetros de query opcionais
  const sourcesParam = url.searchParams.get('sources') // ex: "g1,folha,bbc"
  const maxParam = parseInt(url.searchParams.get('max') ?? '', 10)
  const maxItems = (maxParam > 0 && maxParam <= 50) ? maxParam : DEFAULT_MAX_ITEMS

  // Filtrar fontes se especificado
  const activeSources = sourcesParam
    ? RSS_SOURCES.filter(s => sourcesParam.toLowerCase().split(',').includes(s.id))
    : RSS_SOURCES

  // Cache key inclui query params
  const cacheKey = new Request(url.toString(), context.request)
  const cache = caches.default

  const cachedResponse = await cache.match(cacheKey)
  if (cachedResponse) {
    return cachedResponse
  }

  // Buscar todos os feeds em paralelo
  const feedResults = await Promise.allSettled(
    activeSources.map((source) => fetchFeed(source, maxItems))
  )

  // Unificar e ordenar por data
  const allItems: NewsItem[] = []
  for (const result of feedResults) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value)
    }
  }

  allItems.sort((a, b) => b.timestamp - a.timestamp)
  const items = allItems.slice(0, maxItems)

  const body = JSON.stringify({
    ok: true,
    items,
    total: items.length,
    sources: activeSources.map(s => ({ id: s.id, name: s.name, category: s.category })),
    available_sources: RSS_SOURCES.map(s => ({ id: s.id, name: s.name, category: s.category })),
    cached: false,
    fetched_at: new Date().toISOString(),
  })

  const response = new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
      'Access-Control-Allow-Origin': '*',
    },
  })

  context.waitUntil(cache.put(cacheKey, response.clone()))

  return response
}
