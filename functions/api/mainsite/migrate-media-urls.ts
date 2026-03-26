/**
 * Migração de URLs externas para relativas em posts existentes.
 * POST /api/mainsite/migrate-media-urls
 *
 * Substitui todas as ocorrências de URLs externas do mainsite-worker
 * (https://mainsite-app.lcv.rio.br/api/uploads/...) por URLs relativas
 * do próprio admin-app (/api/mainsite/media/...) no conteúdo HTML dos posts.
 */

interface Env {
  BIGDATA_DB: D1Database
  [key: string]: unknown
}

interface PostRow {
  id: number
  content: string
}

const EXTERNAL_MEDIA_PATTERN = /https:\/\/mainsite-app\.lcv\.rio\.br\/api\/uploads\//g
const INTERNAL_MEDIA_PREFIX = '/api/mainsite/media/'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.BIGDATA_DB
  if (!db) {
    return Response.json({ ok: false, error: 'BIGDATA_DB não configurado.' }, { status: 503 })
  }

  try {
    const { results } = await db.prepare(
      "SELECT id, content FROM mainsite_posts WHERE content LIKE '%mainsite-app.lcv.rio.br/api/uploads/%'"
    ).all<PostRow>()

    const posts = results ?? []

    if (posts.length === 0) {
      return Response.json({
        ok: true,
        message: 'Nenhum post contém URLs externas de mídia. Nada a migrar.',
        postsAffected: 0,
      })
    }

    const migrated: Array<{ id: number; replacements: number }> = []

    for (const post of posts) {
      const matches = post.content.match(EXTERNAL_MEDIA_PATTERN)
      const replacements = matches ? matches.length : 0

      if (replacements === 0) continue

      const newContent = post.content.replace(EXTERNAL_MEDIA_PATTERN, INTERNAL_MEDIA_PREFIX)

      await db.prepare(
        'UPDATE mainsite_posts SET content = ? WHERE id = ?'
      ).bind(newContent, post.id).run()

      migrated.push({ id: post.id, replacements })
    }

    return Response.json({
      ok: true,
      postsAffected: migrated.length,
      totalReplacements: migrated.reduce((sum, m) => sum + m.replacements, 0),
      details: migrated,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido na migração.'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
