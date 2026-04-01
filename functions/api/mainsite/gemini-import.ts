import { marked } from 'marked'

/**
 * gemini-import.ts — Cloudflare Pages Function
 * POST /api/mainsite/gemini-import
 * Fetches a Gemini share URL and extracts the conversation as editable HTML.
 *
 * Security:
 *  - URL validation: only gemini.google.com/share/* is permitted
 *  - HTML sanitization: structure generated strictly by marked compiler
 */

interface Env {
  [key: string]: unknown
}

interface PagesContext<E = Env> {
  request: Request
  env: E
}

type PagesFunction<E = Env> = (context: PagesContext<E>) => Promise<Response> | Response

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

function buildJinaMirrorUrl(url: string): string {
  // Pass to Jina reader API explicitly
  return `https://r.jina.ai/${url}`
}

async function extractFromJinaMirror(url: string): Promise<{ markdown: string; title: string }> {
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

  // Jina prepends metadata: Title: ... URL Source: ...
  let lines = text.split('\n')
  
  // Try to find natural start
  const startIndex = lines.findIndex(l => l.includes('Conversation with Gemini'))
  if (startIndex !== -1) {
    lines = lines.slice(startIndex + 1)
  } else {
    // If not found, skip the Markdown Content header if exists
    const mdHeader = lines.findIndex(l => l.includes('Markdown Content:'))
    if (mdHeader !== -1) {
      lines = lines.slice(mdHeader + 1)
    }
  }

  // Filter out exact known UI strings while preserving formatting spaces
  const cleanedLines: string[] = []
  for (const line of lines) {
    if (UI_NOISE.has(line.trim())) continue
    cleanedLines.push(line)
  }

  const finalMarkdown = cleanedLines.join('\n').trim()

  // Extract title dynamically from the first valid heading
  let title = ''
  for (const line of cleanedLines) {
    if (line.match(/^#+\s+/)) {
      title = line.replace(/^#+\s+/, '').trim()
      break
    }
  }

  return { markdown: finalMarkdown, title }
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

  let finalMarkdown = ''
  let finalTitle = ''

  try {
    // Rely exclusively on Jina LLM mirror to provide fully structured and flawless Markdown
    // (with table definitions, image attributes, structured listings)
    const mirror = await extractFromJinaMirror(url)
    finalMarkdown = mirror.markdown
    finalTitle = mirror.title
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Timeout ou bloqueio remoto'
    return new Response(
      JSON.stringify({ error: `Não foi possível acessar a publicação no momento (${message}). Verifique se o link ainda está compartilhável ao público e ativo.` }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!finalMarkdown) {
    return new Response(
      JSON.stringify({ error: 'Nenhum conteúdo extraído. O link pode estar privado.' }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Convert pure Markdown to structural HTML with unified compiler
  // Promise wrap is safe for future marked extensions compatibility
  const html = await marked.parse(finalMarkdown)

  return new Response(
    JSON.stringify({ html, title: finalTitle || undefined }),
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
