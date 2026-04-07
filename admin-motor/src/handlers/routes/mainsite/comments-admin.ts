/**
 * Admin-side comment moderation handler.
 * Reads/writes directly to BIGDATA_DB (shared D1) — no external HTTP calls.
 *
 * Routes:
 *   GET  /api/mainsite/comments/admin/all?status=pending&limit=100
 *   PATCH /api/mainsite/comments/admin/:id  { status, admin_notes }
 *   DELETE /api/mainsite/comments/admin/:id
 *   POST  /api/mainsite/comments/admin/:id/reply  { content }
 *   POST  /api/mainsite/comments/admin/bulk  { ids, action }
 */

type D1Like = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results: T[] }>;
      run(): Promise<unknown>;
    };
  };
};

type ModerationContext = {
  request: Request;
  env: { BIGDATA_DB?: D1Like };
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// ── GET /api/mainsite/comments/admin/all ─────────────────────────────
export async function handleCommentsAdminAll(ctx: ModerationContext): Promise<Response> {
  const db = ctx.env.BIGDATA_DB;
  if (!db) return json({ ok: false, error: 'BIGDATA_DB não disponível.' }, 503);

  const url = new URL(ctx.request.url);
  const status = url.searchParams.get('status') || 'pending';
  const limit = Math.min(Number(url.searchParams.get('limit') || 100), 500);

  try {
    // Fetch comments with post title join
    const comments = await db.prepare(`
      SELECT c.*, p.title AS post_title
      FROM mainsite_comments c
      LEFT JOIN mainsite_posts p ON p.id = c.post_id
      WHERE c.status = ?
      ORDER BY c.created_at DESC
      LIMIT ?
    `).bind(status, limit).all<Record<string, unknown>>();

    // Counts for all statuses
    const countsResult = await db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'rejected_auto' THEN 1 ELSE 0 END) AS rejected_auto,
        SUM(CASE WHEN status = 'rejected_manual' THEN 1 ELSE 0 END) AS rejected_manual
      FROM mainsite_comments
    `).bind().first<{ pending: number; approved: number; rejected_auto: number; rejected_manual: number }>();

    return json({
      ok: true,
      comments: comments.results,
      counts: {
        pending: countsResult?.pending ?? 0,
        approved: countsResult?.approved ?? 0,
        rejected_auto: countsResult?.rejected_auto ?? 0,
        rejected_manual: countsResult?.rejected_manual ?? 0,
      },
    });
  } catch (error) {
    console.error('[comments/admin] all:error', error instanceof Error ? error.message : error);
    return json({ ok: false, error: 'Falha ao listar comentários.' }, 500);
  }
}

// ── PATCH /api/mainsite/comments/admin/:id ───────────────────────────
export async function handleCommentsAdminModerate(ctx: ModerationContext, commentId: number): Promise<Response> {
  const db = ctx.env.BIGDATA_DB;
  if (!db) return json({ ok: false, error: 'BIGDATA_DB não disponível.' }, 503);

  try {
    const body = await ctx.request.json() as { status?: string; admin_notes?: string };
    const newStatus = body.status;
    if (!newStatus || !['approved', 'rejected_manual', 'pending'].includes(newStatus)) {
      return json({ ok: false, error: 'Status inválido.' }, 400);
    }

    await db.prepare(`
      UPDATE mainsite_comments
      SET status = ?, admin_notes = ?, reviewed_at = datetime('now')
      WHERE id = ?
    `).bind(newStatus, body.admin_notes || null, commentId).run();

    return json({ ok: true, id: commentId, status: newStatus });
  } catch (error) {
    console.error('[comments/admin] moderate:error', error instanceof Error ? error.message : error);
    return json({ ok: false, error: 'Falha ao moderar comentário.' }, 500);
  }
}

// ── DELETE /api/mainsite/comments/admin/:id ──────────────────────────
export async function handleCommentsAdminDelete(ctx: ModerationContext, commentId: number): Promise<Response> {
  const db = ctx.env.BIGDATA_DB;
  if (!db) return json({ ok: false, error: 'BIGDATA_DB não disponível.' }, 503);

  try {
    // Delete replies first (cascade)
    await db.prepare('DELETE FROM mainsite_comments WHERE parent_id = ?').bind(commentId).run();
    await db.prepare('DELETE FROM mainsite_comments WHERE id = ?').bind(commentId).run();

    return json({ ok: true, deleted: commentId });
  } catch (error) {
    console.error('[comments/admin] delete:error', error instanceof Error ? error.message : error);
    return json({ ok: false, error: 'Falha ao excluir comentário.' }, 500);
  }
}

// ── POST /api/mainsite/comments/admin/:id/reply ─────────────────────
export async function handleCommentsAdminReply(ctx: ModerationContext, parentId: number): Promise<Response> {
  const db = ctx.env.BIGDATA_DB;
  if (!db) return json({ ok: false, error: 'BIGDATA_DB não disponível.' }, 503);

  try {
    const body = await ctx.request.json() as { content?: string };
    if (!body.content?.trim()) {
      return json({ ok: false, error: 'Conteúdo da resposta vazio.' }, 400);
    }

    // Get parent comment to fetch post_id
    const parent = await db.prepare('SELECT post_id FROM mainsite_comments WHERE id = ?')
      .bind(parentId).first<{ post_id: number }>();

    if (!parent) {
      return json({ ok: false, error: 'Comentário pai não encontrado.' }, 404);
    }

    await db.prepare(`
      INSERT INTO mainsite_comments
        (post_id, parent_id, author_name, author_email, content, status, author_ip_hash, is_author_reply, created_at)
      VALUES (?, ?, 'Autor', null, ?, 'approved', 'admin', 1, datetime('now'))
    `).bind(parent.post_id, parentId, body.content.trim()).run();

    return json({ ok: true, parentId });
  } catch (error) {
    console.error('[comments/admin] reply:error', error instanceof Error ? error.message : error);
    return json({ ok: false, error: 'Falha ao publicar resposta.' }, 500);
  }
}

// ── POST /api/mainsite/comments/admin/bulk ───────────────────────────
export async function handleCommentsAdminBulk(ctx: ModerationContext): Promise<Response> {
  const db = ctx.env.BIGDATA_DB;
  if (!db) return json({ ok: false, error: 'BIGDATA_DB não disponível.' }, 503);

  try {
    const body = await ctx.request.json() as { ids?: number[]; action?: string };
    const { ids, action } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return json({ ok: false, error: 'Nenhum ID fornecido.' }, 400);
    }

    if (!action || !['approve', 'reject', 'delete'].includes(action)) {
      return json({ ok: false, error: 'Ação inválida. Use approve, reject ou delete.' }, 400);
    }

    const placeholders = ids.map(() => '?').join(',');

    if (action === 'delete') {
      // Delete replies first
      await db.prepare(`DELETE FROM mainsite_comments WHERE parent_id IN (${placeholders})`).bind(...ids).run();
      await db.prepare(`DELETE FROM mainsite_comments WHERE id IN (${placeholders})`).bind(...ids).run();
    } else {
      const newStatus = action === 'approve' ? 'approved' : 'rejected_manual';
      await db.prepare(`
        UPDATE mainsite_comments
        SET status = ?, reviewed_at = datetime('now')
        WHERE id IN (${placeholders})
      `).bind(newStatus, ...ids).run();
    }

    return json({ ok: true, action, count: ids.length });
  } catch (error) {
    console.error('[comments/admin] bulk:error', error instanceof Error ? error.message : error);
    return json({ ok: false, error: 'Falha na ação em lote.' }, 500);
  }
}
