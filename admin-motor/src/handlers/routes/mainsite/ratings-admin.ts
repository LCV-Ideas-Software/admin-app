/**
 * Admin-side ratings moderation handler.
 * Reads/writes directly to BIGDATA_DB (shared D1) — no external HTTP calls.
 *
 * Routes:
 *   GET    /api/mainsite/ratings/admin/all?post_id=&rating=&reaction_type=&limit=100
 *   GET    /api/mainsite/ratings/admin/stats
 *   PATCH  /api/mainsite/ratings/admin/:id  { rating?, reaction_type? }
 *   DELETE /api/mainsite/ratings/admin/:id
 *   POST   /api/mainsite/ratings/admin/bulk  { ids, action: 'delete' }
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

type RatingsAdminContext = {
  request: Request;
  env: { BIGDATA_DB?: D1Like };
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Tipos de reação válidos — espelhados do mainsite-worker */
const VALID_REACTIONS = ['love', 'insightful', 'thought-provoking', 'inspiring', 'beautiful'] as const;

// ── GET /api/mainsite/ratings/admin/all ──────────────────────────────
export async function handleRatingsAdminAll(ctx: RatingsAdminContext): Promise<Response> {
  const db = ctx.env.BIGDATA_DB;
  if (!db) return json({ ok: false, error: 'BIGDATA_DB não disponível.' }, 503);

  const url = new URL(ctx.request.url);
  const postId = url.searchParams.get('post_id');
  const rating = url.searchParams.get('rating');
  const reactionType = url.searchParams.get('reaction_type');
  const limit = Math.min(Number(url.searchParams.get('limit') || 100), 500);

  try {
    // Construir query com filtros opcionais
    const conditions: string[] = [];
    const binds: unknown[] = [];

    if (postId) {
      conditions.push('r.post_id = ?');
      binds.push(Number(postId));
    }
    if (rating) {
      conditions.push('r.rating = ?');
      binds.push(Number(rating));
    }
    if (reactionType) {
      if (reactionType === 'none') {
        conditions.push('r.reaction_type IS NULL');
      } else {
        conditions.push('r.reaction_type = ?');
        binds.push(reactionType);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    binds.push(limit);

    const ratings = await db
      .prepare(
        `
      SELECT r.*, p.title AS post_title
      FROM mainsite_ratings r
      LEFT JOIN mainsite_posts p ON p.id = r.post_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ?
    `,
      )
      .bind(...binds)
      .all<Record<string, unknown>>();

    // Contagens agregadas
    const stats = await db
      .prepare(
        `
      SELECT
        COUNT(*) AS total,
        COALESCE(AVG(rating), 0) AS avg_rating,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS stars_1,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS stars_2,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS stars_3,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS stars_4,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS stars_5,
        SUM(CASE WHEN reaction_type IS NOT NULL THEN 1 ELSE 0 END) AS total_reactions,
        SUM(CASE WHEN reaction_type = 'love' THEN 1 ELSE 0 END) AS react_love,
        SUM(CASE WHEN reaction_type = 'insightful' THEN 1 ELSE 0 END) AS react_insightful,
        SUM(CASE WHEN reaction_type = 'thought-provoking' THEN 1 ELSE 0 END) AS react_thought,
        SUM(CASE WHEN reaction_type = 'inspiring' THEN 1 ELSE 0 END) AS react_inspiring,
        SUM(CASE WHEN reaction_type = 'beautiful' THEN 1 ELSE 0 END) AS react_beautiful
      FROM mainsite_ratings
    `,
      )
      .bind()
      .first<Record<string, number>>();

    return json({
      ok: true,
      ratings: ratings.results,
      stats: {
        total: stats?.total ?? 0,
        avgRating: Number((stats?.avg_rating ?? 0).toFixed(2)),
        distribution: {
          1: stats?.stars_1 ?? 0,
          2: stats?.stars_2 ?? 0,
          3: stats?.stars_3 ?? 0,
          4: stats?.stars_4 ?? 0,
          5: stats?.stars_5 ?? 0,
        },
        reactions: {
          total: stats?.total_reactions ?? 0,
          love: stats?.react_love ?? 0,
          insightful: stats?.react_insightful ?? 0,
          'thought-provoking': stats?.react_thought ?? 0,
          inspiring: stats?.react_inspiring ?? 0,
          beautiful: stats?.react_beautiful ?? 0,
        },
      },
    });
  } catch (error) {
    console.error('[ratings/admin] all:error', error instanceof Error ? error.message : error);
    return json({ ok: false, error: 'Falha ao listar avaliações.' }, 500);
  }
}

// ── GET /api/mainsite/ratings/admin/stats ────────────────────────────
export async function handleRatingsAdminStats(ctx: RatingsAdminContext): Promise<Response> {
  const db = ctx.env.BIGDATA_DB;
  if (!db) return json({ ok: false, error: 'BIGDATA_DB não disponível.' }, 503);

  try {
    const stats = await db
      .prepare(
        `
      SELECT
        COUNT(*) AS total,
        COALESCE(AVG(rating), 0) AS avg_rating,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS stars_1,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS stars_2,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS stars_3,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS stars_4,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS stars_5,
        SUM(CASE WHEN reaction_type IS NOT NULL THEN 1 ELSE 0 END) AS total_reactions,
        SUM(CASE WHEN reaction_type = 'love' THEN 1 ELSE 0 END) AS react_love,
        SUM(CASE WHEN reaction_type = 'insightful' THEN 1 ELSE 0 END) AS react_insightful,
        SUM(CASE WHEN reaction_type = 'thought-provoking' THEN 1 ELSE 0 END) AS react_thought,
        SUM(CASE WHEN reaction_type = 'inspiring' THEN 1 ELSE 0 END) AS react_inspiring,
        SUM(CASE WHEN reaction_type = 'beautiful' THEN 1 ELSE 0 END) AS react_beautiful
      FROM mainsite_ratings
    `,
      )
      .bind()
      .first<Record<string, number>>();

    // Top posts por avaliações
    const topPosts = await db
      .prepare(
        `
      SELECT r.post_id, p.title AS post_title, COUNT(*) AS vote_count, AVG(r.rating) AS avg_rating
      FROM mainsite_ratings r
      LEFT JOIN mainsite_posts p ON p.id = r.post_id
      GROUP BY r.post_id
      ORDER BY vote_count DESC
      LIMIT 10
    `,
      )
      .bind()
      .all<{ post_id: number; post_title: string | null; vote_count: number; avg_rating: number }>();

    return json({
      ok: true,
      stats: {
        total: stats?.total ?? 0,
        avgRating: Number((stats?.avg_rating ?? 0).toFixed(2)),
        distribution: {
          1: stats?.stars_1 ?? 0,
          2: stats?.stars_2 ?? 0,
          3: stats?.stars_3 ?? 0,
          4: stats?.stars_4 ?? 0,
          5: stats?.stars_5 ?? 0,
        },
        reactions: {
          total: stats?.total_reactions ?? 0,
          love: stats?.react_love ?? 0,
          insightful: stats?.react_insightful ?? 0,
          'thought-provoking': stats?.react_thought ?? 0,
          inspiring: stats?.react_inspiring ?? 0,
          beautiful: stats?.react_beautiful ?? 0,
        },
      },
      topPosts: topPosts.results,
    });
  } catch (error) {
    console.error('[ratings/admin] stats:error', error instanceof Error ? error.message : error);
    return json({ ok: false, error: 'Falha ao carregar estatísticas.' }, 500);
  }
}

// ── PATCH /api/mainsite/ratings/admin/:id ────────────────────────────
export async function handleRatingsAdminUpdate(ctx: RatingsAdminContext, ratingId: number): Promise<Response> {
  const db = ctx.env.BIGDATA_DB;
  if (!db) return json({ ok: false, error: 'BIGDATA_DB não disponível.' }, 503);

  try {
    const body = (await ctx.request.json()) as { rating?: number; reaction_type?: string | null };

    // Validar que pelo menos um campo foi fornecido
    if (body.rating === undefined && body.reaction_type === undefined) {
      return json({ ok: false, error: 'Forneça rating e/ou reaction_type para atualizar.' }, 400);
    }

    // Validar rating se fornecido
    if (body.rating !== undefined) {
      const r = Number(body.rating);
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        return json({ ok: false, error: 'Rating deve ser um inteiro entre 1 e 5.' }, 400);
      }
    }

    // Validar reaction_type se fornecido
    if (body.reaction_type !== undefined && body.reaction_type !== null) {
      if (!VALID_REACTIONS.includes(body.reaction_type as (typeof VALID_REACTIONS)[number])) {
        return json({ ok: false, error: `Reação inválida. Use: ${VALID_REACTIONS.join(', ')}` }, 400);
      }
    }

    // Construir update dinâmico
    const sets: string[] = [];
    const binds: unknown[] = [];

    if (body.rating !== undefined) {
      sets.push('rating = ?');
      binds.push(Number(body.rating));
    }
    if (body.reaction_type !== undefined) {
      sets.push('reaction_type = ?');
      binds.push(body.reaction_type);
    }

    binds.push(ratingId);

    await db
      .prepare(
        `
      UPDATE mainsite_ratings SET ${sets.join(', ')} WHERE id = ?
    `,
      )
      .bind(...binds)
      .run();

    return json({ ok: true, id: ratingId });
  } catch (error) {
    console.error('[ratings/admin] update:error', error instanceof Error ? error.message : error);
    return json({ ok: false, error: 'Falha ao atualizar avaliação.' }, 500);
  }
}

// ── DELETE /api/mainsite/ratings/admin/:id ───────────────────────────
export async function handleRatingsAdminDelete(ctx: RatingsAdminContext, ratingId: number): Promise<Response> {
  const db = ctx.env.BIGDATA_DB;
  if (!db) return json({ ok: false, error: 'BIGDATA_DB não disponível.' }, 503);

  try {
    await db.prepare('DELETE FROM mainsite_ratings WHERE id = ?').bind(ratingId).run();
    return json({ ok: true, deleted: ratingId });
  } catch (error) {
    console.error('[ratings/admin] delete:error', error instanceof Error ? error.message : error);
    return json({ ok: false, error: 'Falha ao excluir avaliação.' }, 500);
  }
}

// ── POST /api/mainsite/ratings/admin/bulk ────────────────────────────
export async function handleRatingsAdminBulk(ctx: RatingsAdminContext): Promise<Response> {
  const db = ctx.env.BIGDATA_DB;
  if (!db) return json({ ok: false, error: 'BIGDATA_DB não disponível.' }, 503);

  try {
    const body = (await ctx.request.json()) as { ids?: number[]; action?: string };
    const { ids, action } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return json({ ok: false, error: 'Nenhum ID fornecido.' }, 400);
    }

    if (action !== 'delete') {
      return json({ ok: false, error: 'Ação inválida. Use: delete.' }, 400);
    }

    const placeholders = ids.map(() => '?').join(',');
    await db
      .prepare(`DELETE FROM mainsite_ratings WHERE id IN (${placeholders})`)
      .bind(...ids)
      .run();

    return json({ ok: true, action, count: ids.length });
  } catch (error) {
    console.error('[ratings/admin] bulk:error', error instanceof Error ? error.message : error);
    return json({ ok: false, error: 'Falha na ação em lote.' }, 500);
  }
}
