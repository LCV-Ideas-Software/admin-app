/**
 * POST /api/mainsite/post-summaries — Admin endpoint para gerenciar resumos IA.
 * GET  → lista todos os resumos (com join nos posts)
 * POST → ações: generate-all, regenerate, edit
 *
 * Usa D1 direto (BIGDATA_DB) — padrão admin-app.
 */
import { toHeaders } from '../_lib/mainsite-admin'
import { logModuleOperationalEvent } from '../_lib/operational'
import { createResponseTrace } from '../_lib/request-trace'

interface D1PreparedStatement {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement
  first: <T>() => Promise<T | null>
  all: <T>() => Promise<{ results?: T[] }>
  run: () => Promise<unknown>
}

interface D1Database {
  prepare: (query: string) => D1PreparedStatement
}

interface SummaryEnv {
  BIGDATA_DB?: D1Database
  GEMINI_API_KEY?: string
}

interface SummaryContext {
  request: Request
  env: SummaryEnv
}

type SummaryRow = {
  id: number
  post_id: number
  summary_og: string
  summary_ld: string | null
  content_hash: string
  model: string
  is_manual: number
  created_at: string
  updated_at: string
  post_title?: string
}

type PostRow = {
  id: number
  title: string
  content: string
}

// ── Gemini summary generation (self-contained, no external deps) ──

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
}

async function hashContent(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'

// ── v1beta: Safety Settings (BLOCK_ONLY_HIGH) ──
const SUMMARY_SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
]

// ── v1beta: Thinking Model Support — filtra thought blocks ──
function extractTextFromParts(parts: Array<{ text?: string; thought?: boolean }> | undefined): string {
  return (parts || [])
    .filter(p => p.text && !p.thought)
    .map(p => p.text)
    .join('')
}

// ── v1beta: Robust JSON extraction (fences, texto extra) ──
function extractJsonFromText(rawText: string): string {
  let str = rawText.trim()
  // Remover markdown ```json ... ``` fences
  const fenceMatch = str.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) str = fenceMatch[1].trim()
  // Extrair objeto JSON { ... } se houver texto extra ao redor
  if (!str.startsWith('{')) {
    const objMatch = str.match(/\{[\s\S]*\}/)
    if (objMatch) str = objMatch[0]
  }
  return str
}

async function generateShareSummary(
  title: string,
  htmlContent: string,
  apiKey: string,
  model?: string,
): Promise<{ summary_og: string; summary_ld: string } | { error: string }> {
  const resolvedModel = model || DEFAULT_GEMINI_MODEL
  const cleanContent = stripHtml(htmlContent).substring(0, 3000)

  const prompt = `Você é um editor especializado em SEO e compartilhamento social.
Dado o título e o conteúdo de um artigo/post, gere DOIS resumos em português brasileiro:

1. **summary_og** (máx. 160 caracteres): descrição curta, factual e envolvente para Open Graph (og:description). Deve ser atrativa para clique em WhatsApp, Facebook, Twitter.
2. **summary_ld** (máx. 300 caracteres): descrição mais completa para Schema.org/JSON-LD. Deve capturar o tema central e contexto do artigo.

REGRAS:
- Mantenha tom neutro/informativo, sem clickbait exagerado.
- Não inclua o título no resumo — ele já aparece separadamente.
- Retorne APENAS JSON válido no formato: {"summary_og": "...", "summary_ld": "..."}
- Sem markdown, sem explicações, sem texto adicional.

TÍTULO: ${title}
CONTEÚDO: ${cleanContent}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`
  const MAX_RETRIES = 2
  const RETRY_DELAY = 800

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const payload: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: SUMMARY_SAFETY_SETTINGS,
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          // v1beta: Thinking Model Support
          ...(attempt === 0 ? { thinkingConfig: { thinkingLevel: 'LOW' } } : {}),
        },
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errBody = await res.text().catch(() => '(no body)')
        // Se 400/404, pode ser incompatibilidade de thinkingConfig — tentar sem
        if (attempt === 0 && (res.status === 400 || res.status === 404)) {
          await new Promise(r => setTimeout(r, RETRY_DELAY))
          continue
        }
        return { error: `Gemini API ${res.status} (attempt ${attempt + 1}): ${errBody.substring(0, 200)}` }
      }

      const data = await res.json() as Record<string, unknown>
      const candidates = data.candidates as Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> | undefined

      // v1beta: extrair texto filtrando thought blocks
      const rawText = extractTextFromParts(candidates?.[0]?.content?.parts)
      if (!rawText) {
        const preview = JSON.stringify(data).substring(0, 300)
        return { error: `Gemini sem texto útil (attempt ${attempt + 1}). Modelo: ${resolvedModel}. Resposta: ${preview}` }
      }

      // Parsing JSON robusto
      const jsonStr = extractJsonFromText(rawText)
      const parsed = JSON.parse(jsonStr) as { summary_og?: string; summary_ld?: string }
      if (!parsed.summary_og) {
        return { error: `JSON sem summary_og. Raw: ${rawText.substring(0, 150)}` }
      }

      return {
        summary_og: parsed.summary_og.substring(0, 200),
        summary_ld: (parsed.summary_ld || parsed.summary_og).substring(0, 300),
      }
    } catch (err) {
      // Retry: primeira falha pode ser thinkingConfig incompatível
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, RETRY_DELAY))
        continue
      }
      return { error: `Exception (attempt ${attempt + 1}): ${err instanceof Error ? err.message : String(err)}` }
    }
  }

  return { error: 'Gemini API falhou após todas as tentativas.' }
}

// ── Ensure table + self-healing migration for missing columns ──
async function ensureTable(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS mainsite_post_ai_summaries (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id      INTEGER NOT NULL UNIQUE,
      summary_og   TEXT NOT NULL,
      summary_ld   TEXT,
      content_hash TEXT NOT NULL,
      model        TEXT DEFAULT '',
      is_manual    INTEGER DEFAULT 0,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run()

  // Self-healing: add columns that may be missing on pre-existing tables.
  // SQLite throws "duplicate column name" if column already exists — safe to ignore.
  const migrations = [
    `ALTER TABLE mainsite_post_ai_summaries ADD COLUMN is_manual INTEGER DEFAULT 0`,
    `ALTER TABLE mainsite_post_ai_summaries ADD COLUMN content_hash TEXT DEFAULT ''`,
    `ALTER TABLE mainsite_post_ai_summaries ADD COLUMN model TEXT DEFAULT ''`,
  ]
  for (const sql of migrations) {
    try { await db.prepare(sql).run() } catch { /* column already exists — ok */ }
  }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: toHeaders() })

// ── GET: lista resumos ──
export async function onRequestGet(context: SummaryContext) {
  const trace = createResponseTrace(context.request)
  try {
    const db = context.env.BIGDATA_DB
    if (!db) return json({ ok: false, error: 'BIGDATA_DB não configurado.', ...trace }, 500)

    await ensureTable(db)

    const { results } = await db.prepare(`
      SELECT s.*, p.title AS post_title
      FROM mainsite_post_ai_summaries s
      LEFT JOIN mainsite_posts p ON p.id = s.post_id
      ORDER BY s.updated_at DESC
    `).all<SummaryRow>()

    // Also fetch posts without summaries
    const { results: allPosts } = await db.prepare(
      'SELECT id, title FROM mainsite_posts ORDER BY id ASC'
    ).all<{ id: number; title: string }>()

    const summaryPostIds = new Set((results || []).map(s => s.post_id))
    const postsWithout = (allPosts || []).filter(p => !summaryPostIds.has(p.id))

    return json({
      ok: true,
      summaries: results || [],
      postsWithoutSummary: postsWithout,
      totalPosts: (allPosts || []).length,
      ...trace,
    })
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Erro ao listar resumos.', ...trace }, 500)
  }
}

// ── POST: actions (generate-all, regenerate, edit) ──
export async function onRequestPost(context: SummaryContext) {
  const trace = createResponseTrace(context.request)
  try {
    const db = context.env.BIGDATA_DB
    if (!db) return json({ ok: false, error: 'BIGDATA_DB não configurado.', ...trace }, 500)

    await ensureTable(db)

    const body = await context.request.json() as {
      action: string
      postId?: number
      summary_og?: string
      summary_ld?: string
      mode?: string // 'missing' | 'all'
      model?: string // modelo Gemini selecionado pelo usuário
    }

    const apiKey = context.env.GEMINI_API_KEY

    // ── Generate All ──
    if (body.action === 'generate-all') {
      if (!apiKey) return json({ ok: false, error: 'GEMINI_API_KEY não configurada.', ...trace }, 503)

      const mode = body.mode || 'missing'

      const { results: allPosts } = await db.prepare(
        'SELECT id, title, content FROM mainsite_posts ORDER BY id ASC'
      ).all<PostRow>()

      if (!allPosts || allPosts.length === 0) {
        return json({ ok: true, generated: 0, skipped: 0, failed: 0, total: 0, details: [], ...trace })
      }

      const { results: existingSummaries } = await db.prepare(
        'SELECT post_id, content_hash, is_manual FROM mainsite_post_ai_summaries'
      ).all<{ post_id: number; content_hash: string; is_manual: number }>()

      const summaryMap = new Map<number, { content_hash: string; is_manual: number }>()
      for (const s of existingSummaries || []) {
        summaryMap.set(s.post_id, { content_hash: s.content_hash, is_manual: s.is_manual })
      }

      let generated = 0
      let skipped = 0
      let failed = 0
      const details: Array<{ postId: number; title: string; status: string }> = []

      for (const post of allPosts) {
        const cleanContent = stripHtml(post.content)
        const newHash = await hashContent(cleanContent)
        const existing = summaryMap.get(post.id)

        if (existing?.is_manual === 1) {
          skipped++
          details.push({ postId: post.id, title: post.title, status: 'skipped_manual' })
          continue
        }

        if (mode === 'missing' && existing && existing.content_hash === newHash) {
          skipped++
          details.push({ postId: post.id, title: post.title, status: 'skipped_unchanged' })
          continue
        }

        if (cleanContent.length < 50) {
          skipped++
          details.push({ postId: post.id, title: post.title, status: 'skipped_too_short' })
          continue
        }

        try {
          const result = await generateShareSummary(post.title, post.content, apiKey, body.model)
          if ('error' in result) {
            failed++
            details.push({ postId: post.id, title: post.title, status: result.error })
            continue
          }

          const usedModel = body.model || DEFAULT_GEMINI_MODEL
          await db.prepare(`
            INSERT INTO mainsite_post_ai_summaries (post_id, summary_og, summary_ld, content_hash, is_manual, model, updated_at)
            VALUES (?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(post_id) DO UPDATE SET
              summary_og = excluded.summary_og,
              summary_ld = excluded.summary_ld,
              content_hash = excluded.content_hash,
              is_manual = 0,
              model = excluded.model,
              updated_at = CURRENT_TIMESTAMP
          `).bind(post.id, result.summary_og, result.summary_ld, newHash, usedModel).run()

          generated++
          details.push({ postId: post.id, title: post.title, status: 'generated' })
        } catch (err) {
          failed++
          details.push({ postId: post.id, title: post.title, status: `error: ${err instanceof Error ? err.message : 'unknown'}` })
        }
      }

      try {
        await logModuleOperationalEvent(db as never, {
          module: 'mainsite',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: { action: 'generate-all-summaries', generated, skipped, failed },
        })
      } catch { /* telemetria não bloqueia */ }

      return json({ ok: true, generated, skipped, failed, total: allPosts.length, details, ...trace })
    }

    // ── Regenerate single ──
    if (body.action === 'regenerate') {
      if (!apiKey) return json({ ok: false, error: 'GEMINI_API_KEY não configurada.', ...trace }, 503)
      if (!body.postId) return json({ ok: false, error: 'postId é obrigatório.', ...trace }, 400)

      const post = await db.prepare(
        'SELECT id, title, content FROM mainsite_posts WHERE id = ?'
      ).bind(body.postId).first<PostRow>()

      if (!post) return json({ ok: false, error: 'Post não encontrado.', ...trace }, 404)

      const result = await generateShareSummary(post.title, post.content, apiKey, body.model)
      if ('error' in result) return json({ ok: false, error: result.error, ...trace }, 502)

      const contentHash = await hashContent(stripHtml(post.content))

      const usedModel = body.model || DEFAULT_GEMINI_MODEL
      await db.prepare(`
        INSERT INTO mainsite_post_ai_summaries (post_id, summary_og, summary_ld, content_hash, is_manual, model, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(post_id) DO UPDATE SET
          summary_og = excluded.summary_og,
          summary_ld = excluded.summary_ld,
          content_hash = excluded.content_hash,
          is_manual = 0,
          model = excluded.model,
          updated_at = CURRENT_TIMESTAMP
      `).bind(body.postId, result.summary_og, result.summary_ld, contentHash, usedModel).run()

      return json({ ok: true, ...result, ...trace })
    }

    // ── Edit (manual override) ──
    if (body.action === 'edit') {
      if (!body.postId) return json({ ok: false, error: 'postId é obrigatório.', ...trace }, 400)
      if (!body.summary_og?.trim()) return json({ ok: false, error: 'summary_og é obrigatório.', ...trace }, 400)

      const post = await db.prepare(
        'SELECT content FROM mainsite_posts WHERE id = ?'
      ).bind(body.postId).first<{ content: string }>()

      if (!post) return json({ ok: false, error: 'Post não encontrado.', ...trace }, 404)

      const contentHash = await hashContent(stripHtml(post.content))

      await db.prepare(`
        INSERT INTO mainsite_post_ai_summaries (post_id, summary_og, summary_ld, content_hash, is_manual, updated_at)
        VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(post_id) DO UPDATE SET
          summary_og = excluded.summary_og,
          summary_ld = excluded.summary_ld,
          content_hash = excluded.content_hash,
          is_manual = 1,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        body.postId,
        body.summary_og.trim().substring(0, 200),
        (body.summary_ld || body.summary_og).trim().substring(0, 300),
        contentHash,
      ).run()

      return json({ ok: true, ...trace })
    }

    return json({ ok: false, error: `Ação desconhecida: ${body.action}`, ...trace }, 400)
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Erro no endpoint de resumos.', ...trace }, 500)
  }
}
