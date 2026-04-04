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
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai'

interface D1PreparedStatement {
  bind: (...values: Array<unknown>) => D1PreparedStatement
  first: <T = unknown>() => Promise<T | null>
  all: <T = unknown>() => Promise<{ results?: T[] }>
  run: () => Promise<unknown>
}

interface D1Database {
  prepare: (query: string) => D1PreparedStatement
}

interface SummaryEnv {
  BIGDATA_DB?: D1Database
  AI?: {
    run?: (model: string, payload: unknown, options?: unknown) => Promise<unknown>
  }
  GEMINI_API_KEY?: string
}

interface SummaryContext {
  request: Request
  env: SummaryEnv
  data?: {
    env?: SummaryEnv
  }
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

// ── Gemini summary generation (v1beta Modernization) ──

function structuredLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: Record<string, unknown>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context })
  }
  console.log(JSON.stringify(logEntry))
}

const GEMINI_CONFIG = {
  model: 'gemini-2.5-flash',
  apiVersion: 'v1beta',
  maxOutputTokens: 8192,
  temperature: 0.3
}

// ── v1beta: Safety Settings (BLOCK_ONLY_HIGH) ──
const SUMMARY_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
]

function stripHtml(html: string): string {
  return html
    // Remove tags HTML
    .replace(/<[^>]*>?/gm, ' ')
    // Remove base64 URIs embutidos (markdown images que escapam do HTML tag regex)
    .replace(/data:image\/[a-zA-Z]*;base64,[^\s"']+/g, '')
    // Remove markdown image syntax e links para evitar lixo no contexto
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function hashContent(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

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

async function estimateTokenCount(ai: GoogleGenAI, prompt: string, model: string): Promise<number> {
  try {
    const resp = await ai.models.countTokens({
      model,
      contents: prompt
    });
    return resp.totalTokens ?? -1;
  } catch (err) {
    structuredLog('WARN', 'Erro ao contar tokens', { error: String(err) });
    return -1;
  }
}

async function generateShareSummary(
  title: string,
  htmlContent: string,
  env: SummaryEnv,
  model: string,
): Promise<{ summary_og: string; summary_ld: string } | { error: string }> {
  const cleanContent = stripHtml(htmlContent)
  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) {
    structuredLog('ERROR', 'GEMINI_API_KEY não configurada')
    return { error: 'GEMINI_API_KEY não configurada.' }
  }

  const ai = new GoogleGenAI({ apiKey })
  const targetModel = model || GEMINI_CONFIG.model

  const systemPrompt = `Você é um editor especializado em SEO e compartilhamento social.
Dado o título e o conteúdo de um artigo/post, gere DOIS resumos em português brasileiro:
1. summary_og (máx. 160 caracteres): descrição curta, factual e envolvente para Open Graph (og:description).
2. summary_ld (máx. 300 caracteres): descrição mais completa para Schema.org/JSON-LD.

REGRAS:
- Retorne APENAS um objeto JSON válido no formato: {"summary_og": "...", "summary_ld": "..."}
- Seja neutro e informativo.
- SEM marcação markdown, SEM explicações. APENAS o JSON puro.`

  const userPrompt = `TÍTULO: ${title}\nCONTEÚDO: ${cleanContent}`
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

  // 1. Validation de Contexto API e Pre-req Token Counting
  const tokenCount = await estimateTokenCount(ai, fullPrompt, targetModel)
  if (tokenCount > 120000) {
    structuredLog('ERROR', 'Conteúdo muito extenso para processar', { tokens: tokenCount })
    return { error: 'Dados muito extensos para geração do resumo.' }
  } else if (tokenCount > 0) {
    structuredLog('INFO', 'Token estimation para summarização', { tokens: tokenCount })
  }

  const MAX_RETRIES = 2
  let lastErrorMsg = 'Desconhecido'
  let parsedResponse

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      parsedResponse = await ai.models.generateContent({
        model: targetModel,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          safetySettings: SUMMARY_SAFETY_SETTINGS,
          temperature: GEMINI_CONFIG.temperature,
          maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
          responseMimeType: 'application/json',
        }
      })
      break
    } catch (err) {
      lastErrorMsg = err instanceof Error ? err.message : String(err)
      structuredLog('WARN', `Tentativa ${attempt + 1}/${MAX_RETRIES} falhou`, { error: lastErrorMsg })
      if (attempt === 0) await new Promise(r => setTimeout(r, 800))
    }
  }

  if (!parsedResponse) {
    structuredLog('ERROR', 'Falha permanente no Gemini após retry', { lastError: lastErrorMsg })
    return { error: `AI falhou. Útimo erro: ${lastErrorMsg.slice(0, 100)}` }
  }

  // Usage Metadata Logging
  if (parsedResponse.usageMetadata) {
    structuredLog('INFO', 'Tokens utilizados no summary', {
      prompt_tokens: parsedResponse.usageMetadata.promptTokenCount,
      cached_tokens: parsedResponse.usageMetadata.cachedContentTokenCount,
      output_tokens: parsedResponse.usageMetadata.candidatesTokenCount,
      total_tokens: parsedResponse.usageMetadata.totalTokenCount,
    })
  }

  const parts = parsedResponse.candidates?.[0]?.content?.parts || []
  const visibleParts = parts.filter(p => p.text && !('thought' in p && p.thought))
  const rawText = visibleParts.map(p => p.text).join('\\n\\n') || parts?.[0]?.text

  if (!rawText) {
    structuredLog('ERROR', 'Resposta vazia ou silenciada pelo safety', { candidates: parsedResponse.candidates })
    return { error: `AI sem texto útil.` }
  }

  try {
    const jsonStr = extractJsonFromText(rawText)
    const parsed = JSON.parse(jsonStr) as { summary_og?: string; summary_ld?: string }
    if (!parsed.summary_og) {
      structuredLog('ERROR', 'JSON retornado inválido', { parsed })
      return { error: `JSON sem summary_og.` }
    }

    return {
      summary_og: parsed.summary_og.substring(0, 200),
      summary_ld: (parsed.summary_ld || parsed.summary_og).substring(0, 300),
    }
  } catch (parseError) {
    structuredLog('ERROR', 'Erro ao extrair JSON da IA', { error: String(parseError), rawText })
    return { error: `Erro no JSON gerado: ${String(parseError).slice(0, 50)}` }
  }
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
    const runtimeEnv = (context.data?.env || context.env)
    const db = runtimeEnv.BIGDATA_DB
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

async function resolveSummaryModel(db: D1Database, reqModel?: string): Promise<string> {
  if (reqModel) return reqModel
  try {
    const row = await db.prepare('SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1').bind('mainsite/ai_models').first<{ payload?: string }>()
    if (row?.payload) {
      const parsed = JSON.parse(row.payload) as Record<string, unknown>
      if (parsed && typeof parsed.summary === 'string' && parsed.summary) {
        return parsed.summary
      }
    }
  } catch {
    // fallback ignorado, usa default
  }
  return GEMINI_CONFIG.model
}

// ── POST: actions (generate-all, regenerate, edit) ──
export async function onRequestPost(context: SummaryContext) {
  const trace = createResponseTrace(context.request)
  try {
    const runtimeEnv = (context.data?.env || context.env)
    const db = runtimeEnv.BIGDATA_DB
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

    // apiKey extracted for Gemini (removed)

    // ── Generate All ──
    if (body.action === 'generate-all') {

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
      const resolvedModel = await resolveSummaryModel(db, body.model)

      const TIMEOUT_LIMIT = 40000 // 40 seconds max to prevent 524 Timeout
      const startTime = Date.now()

      for (const post of allPosts) {
        if (Date.now() - startTime > TIMEOUT_LIMIT) {
          details.push({ postId: post.id, title: post.title, status: 'skipped_timeout_protection' })
          skipped++
          break // Quebra o loop pacificamente garantindo a entrega do payload JSON em vez de falha 524 HTML
        }

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
          const result = await generateShareSummary(post.title, post.content, runtimeEnv, resolvedModel)
          if ('error' in result) {
            failed++
            details.push({ postId: post.id, title: post.title, status: result.error })
            continue
          }

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
          `).bind(post.id, result.summary_og, result.summary_ld, newHash, resolvedModel).run()

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
      if (!body.postId) return json({ ok: false, error: 'postId é obrigatório.', ...trace }, 400)

      const post = await db.prepare(
        'SELECT id, title, content FROM mainsite_posts WHERE id = ?'
      ).bind(body.postId).first<PostRow>()

      if (!post) return json({ ok: false, error: 'Post não encontrado.', ...trace }, 404)

      const resolvedModel = await resolveSummaryModel(db, body.model)

      const result = await generateShareSummary(post.title, post.content, runtimeEnv, resolvedModel)
      if ('error' in result) return json({ ok: false, error: result.error, ...trace }, 500)

      const contentHash = await hashContent(stripHtml(post.content))

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
      `).bind(body.postId, result.summary_og, result.summary_ld, contentHash, resolvedModel).run()

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

