/**
 * gemini-import.ts — Cloudflare Pages Function
 * POST /api/mainsite/gemini-import
 * Fetches a Gemini share URL and extracts the conversation as editable HTML.
 *
 * Security:
 *  - URL validation: only gemini.google.com/share/* is permitted
 *  - HTML sanitization: only structured block elements are extracted
 *  - No user-supplied HTML is ever passed through unmodified
 */

interface Env {
  [key: string]: unknown
}

interface PagesContext<E = Env> {
  request: Request
  env: E
}

type PagesFunction<E = Env> = (context: PagesContext<E>) => Promise<Response> | Response

interface HTMLRewriterChunk {
  text: string
  lastInTextNode: boolean
}

interface HTMLRewriterTextHandler {
  text: (chunk: HTMLRewriterChunk) => void
}

declare class HTMLRewriter {
  on(selector: string, handlers: HTMLRewriterTextHandler): HTMLRewriter
  transform(response: Response): Response
}

interface ImportRequest {
  url: string
}

// Known Gemini UI chrome strings to skip
const UI_NOISE = new Set([
  'Write', 'Plan', 'Research', 'Learn', 'Ask Gemini', 'Fast', 'Deep Research',
  'Canvas', 'Gems', 'Gemini', 'Google', 'Sign in', 'Sign out',
  'Settings', 'Help', 'Feedback', 'More', 'Show more', 'Show less',
  'Copy', 'Share', 'Edit', 'Delete', 'Thumbs up', 'Thumbs down',
  'Open menu', 'Close menu', 'Expand', 'Collapse',
  'Conversation with Gemini',   // mark: used as start anchor, skip itself
])

const GEMINI_SHARE_RE = /^https:\/\/(?:gemini\.google\.com|g\.co\/gemini)\/share\/[a-zA-Z0-9_-]+\/?(?:\?.*)?$/

function normalizeGeminiShareUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl.trim())
  if (parsed.hostname === 'g.co' && parsed.pathname.startsWith('/gemini/share/')) {
    return `https://gemini.google.com${parsed.pathname}${parsed.search}`
  }
  if (parsed.hostname === 'gemini.google.com' && parsed.pathname.startsWith('/share/')) {
    return parsed.toString()
  }
  return rawUrl.trim()
}

async function fetchGeminiShare(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    redirect: 'follow',
  })
}

function buildJinaMirrorUrl(url: string): string {
  return `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`
}

function plainTextToParagraphHtml(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2000)

  return lines
    .map((line) => `<p>${escapeHtmlAttrib(line)}</p>`)
    .join('\n')
}

async function extractFromJinaMirror(url: string): Promise<{ chunks: string[]; title: string }> {
  const mirrorResponse = await fetch(buildJinaMirrorUrl(url), {
    headers: {
      Accept: 'text/plain,text/markdown;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
  })

  if (!mirrorResponse.ok) {
    throw new Error(`Falha no mirror com status ${mirrorResponse.status}`)
  }

  const text = (await mirrorResponse.text()).trim()
  if (!text) {
    throw new Error('Mirror retornou conteúdo vazio')
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 1)

  const contentLines = lines.filter((line) => !UI_NOISE.has(line))
  const title = contentLines[0]?.slice(0, 120) || ''
  return { chunks: contentLines, title }
}

/**
 * Convert a subset of Markdown to HTML.
 * Handles: **bold**, *em*, `code`, ```fenced```, ## headings, - unordered lists.
 */
function markdownToHtml(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let inCode = false
  let inList = false
  const flushList = () => { if (inList) { out.push('</ul>'); inList = false } }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    // Fenced code blocks
    if (line.startsWith('```')) {
      if (inCode) { out.push('</code></pre>'); inCode = false }
      else { flushList(); out.push('<pre><code>'); inCode = true }
      continue
    }
    if (inCode) { out.push(escapeHtmlAttrib(line)); continue }

    // Headings
    if (line.startsWith('### ')) {
      flushList()
      out.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`)
      continue
    }
    if (line.startsWith('## ')) {
      flushList()
      out.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`)
      continue
    }
    if (line.startsWith('# ')) {
      flushList()
      out.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`)
      continue
    }

    // Unordered list items
    if (/^[-*] /.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true }
      out.push(`<li>${inlineMarkdown(line.slice(2))}</li>`)
      continue
    }

    // Ordered list items
    if (/^\d+\. /.test(line)) {
      if (!inList) { out.push('<ol>'); inList = true }
      out.push(`<li>${inlineMarkdown(line.replace(/^\d+\. /, ''))}</li>`)
      continue
    }

    // Empty line
    if (line === '') { flushList(); continue }

    // Normal paragraph
    flushList()
    out.push(`<p>${inlineMarkdown(line)}</p>`)
  }
  if (inCode) out.push('</code></pre>')
  if (inList) out.push('</ul>')
  return out.join('\n')
}

function inlineMarkdown(text: string): string {
  return escapeHtmlAttrib(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}

function escapeHtmlAttrib(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Extract conversation text from a Gemini share page using HTMLRewriter.
 * Returns the raw text content of all block-level elements.
 */
async function extractConversationText(response: Response): Promise<{ chunks: string[]; title: string }> {
  const chunks: string[] = []
  let title = ''
  let titleDone = false
  let foundStart = false

  await new HTMLRewriter()
    .on('title', {
      text(chunk) {
        if (!titleDone) {
          title += chunk.text
          if (chunk.lastInTextNode) titleDone = true
        }
      },
    })
    // Pick up all structural text carriers
    .on('h1, h2, h3, h4, p, li, pre, blockquote, td, th', {
      text(chunk) {
        const raw = chunk.text.trim()
        if (!raw) return

        // Use "Conversation with Gemini" as a start marker (skip it)
        if (!foundStart && raw.includes('Conversation with Gemini')) {
          foundStart = true
          return
        }
        if (!foundStart) return

        // Skip known UI noise
        if (UI_NOISE.has(raw)) return
        // Skip very short navigation fragments
        if (raw.length < 3 && /^[A-Z]$/.test(raw)) return

        if (chunk.lastInTextNode) {
          chunks.push(raw)
        }
      },
    })
    .transform(response)

  return { chunks, title }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  const contentType = context.request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: ImportRequest
  try {
    const parsed = await context.request.json() as unknown
    body = parsed as ImportRequest
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rawUrl = body.url || ''
  const url = normalizeGeminiShareUrl(rawUrl)

  // Validate: only Gemini share links
  if (!url || !GEMINI_SHARE_RE.test(url)) {
    return new Response(
      JSON.stringify({ error: 'URL inválida. Use um link de compartilhamento do Gemini: https://gemini.google.com/share/...' }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Fetch the share page as a browser would
  let fetchResponse: Response | null = null
  let chunks: string[] = []
  let title = ''
  try {
    fetchResponse = await fetchGeminiShare(url)
  } catch {
    fetchResponse = null
  }

  if (fetchResponse?.ok) {
    const extracted = await extractConversationText(fetchResponse)
    chunks = extracted.chunks
    title = extracted.title
  }

  // Fallback: if direct fetch is blocked or yields no extractable content,
  // use a plain-text mirror that renders dynamic pages server-side.
  if (chunks.length === 0) {
    try {
      const mirror = await extractFromJinaMirror(url)
      chunks = mirror.chunks
      title = title || mirror.title
    } catch {
      const status = fetchResponse?.status
      const message = status
        ? `Gemini retornou status ${status}. O link pode estar privado, expirado ou bloqueado para leitura automática.`
        : 'Não foi possível acessar o link. Verifique se o compartilhamento é público.'
      return new Response(
        JSON.stringify({ error: message }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  if (chunks.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Nenhum conteúdo extraído. O link pode estar privado ou o conteúdo pode estar em JavaScript dinâmico.' }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Convert extracted plain-text chunks to rich HTML
  const fullText = chunks.join('\n')
  const html = fetchResponse?.ok ? markdownToHtml(fullText) : plainTextToParagraphHtml(fullText)

  // Clean up page title for use as post title
  const cleanTitle = title
    .replace(' - Gemini', '')
    .replace(' | Gemini', '')
    .replace('Conversa com o Gemini', '')
    .replace('Conversation with Gemini', '')
    .trim()

  return new Response(
    JSON.stringify({ html, title: cleanTitle || undefined }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
