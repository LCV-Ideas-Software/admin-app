import { describe, expect, it } from 'vitest';

import { onRequestGet, onRequestPut } from './about.ts';

type AboutState = {
  about: {
    id: number;
    title: string;
    content: string;
    author: string;
    source_post_id: number | null;
    created_at: string;
    updated_at: string;
  } | null;
  posts: Set<number>;
  comments: Record<number, number>;
  ratings: Record<number, number>;
  summariesDeleted: number[];
  postsDeleted: number[];
};

function createDb(seed?: Partial<AboutState>) {
  const state: AboutState = {
    about: seed?.about ?? null,
    posts: seed?.posts ?? new Set<number>(),
    comments: seed?.comments ?? {},
    ratings: seed?.ratings ?? {},
    summariesDeleted: [],
    postsDeleted: [],
  };

  return {
    state,
    prepare(query: string) {
      const statement = {
        values: [] as Array<string | number | null>,
        bind(...values: Array<string | number | null>) {
          this.values = values;
          return this;
        },
        async first<T>() {
          if (query.includes('FROM mainsite_about')) {
            return state.about as T;
          }

          if (query.includes('COUNT(*) AS total FROM mainsite_comments')) {
            const postId = Number(this.values[0]);
            return { total: state.comments[postId] ?? 0 } as T;
          }

          if (query.includes('COUNT(*) AS total FROM mainsite_ratings')) {
            const postId = Number(this.values[0]);
            return { total: state.ratings[postId] ?? 0 } as T;
          }

          if (query.includes('SELECT id FROM mainsite_posts')) {
            const postId = Number(this.values[0]);
            return (state.posts.has(postId) ? { id: postId } : null) as T | null;
          }

          if (query.includes('FROM mainsite_settings')) {
            return { payload: JSON.stringify({ version: 1, updated_at: '2026-01-01T00:00:00.000Z' }) } as T;
          }

          return null;
        },
        async all<T>() {
          return { results: [] as T[] };
        },
        async run() {
          if (query.includes('INSERT INTO mainsite_about')) {
            state.about = {
              id: 1,
              title: String(this.values[0]),
              content: String(this.values[1]),
              author: String(this.values[2]),
              source_post_id: this.values[3] === null ? null : Number(this.values[3]),
              created_at: state.about?.created_at ?? '2026-04-24 12:00:00',
              updated_at: '2026-04-24 12:00:00',
            };
          }

          if (query.includes('DELETE FROM mainsite_post_ai_summaries')) {
            state.summariesDeleted.push(Number(this.values[0]));
          }

          if (query.includes('DELETE FROM mainsite_posts')) {
            const postId = Number(this.values[0]);
            state.posts.delete(postId);
            state.postsDeleted.push(postId);
          }

          return { meta: { changes: 1 } };
        },
      };

      return statement;
    },
  };
}

describe('mainsite about admin route', () => {
  it('returns null when no about row exists', async () => {
    const db = createDb();
    const response = await onRequestGet({
      request: new Request('https://admin.lcv.app.br/api/mainsite/about'),
      env: { BIGDATA_DB: db },
    });

    const payload = (await response.json()) as { ok: boolean; about: unknown };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.about).toBeNull();
  });

  it('upserts a single sanitized about row', async () => {
    const db = createDb();

    for (const title of ['Sobre Este Site', 'Sobre Este Site Atualizado']) {
      const response = await onRequestPut({
        request: new Request('https://admin.lcv.app.br/api/mainsite/about', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            author: 'Leonardo',
            content: '<p style="text-align:center">Olá</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>',
          }),
        }),
        env: { BIGDATA_DB: db },
      });

      expect(response.status).toBe(200);
    }

    expect(db.state.about?.id).toBe(1);
    expect(db.state.about?.title).toBe('Sobre Este Site Atualizado');
    expect(db.state.about?.content).toContain('<p style="text-align:center">Olá</p>');
    expect(db.state.about?.content).not.toContain('<script');
    expect(db.state.about?.content).not.toContain('javascript:');
  });

  it('blocks conversion when the source post has comments or ratings', async () => {
    const db = createDb({
      posts: new Set([42]),
      comments: { 42: 1 },
      ratings: { 42: 2 },
    });

    const response = await onRequestPut({
      request: new Request('https://admin.lcv.app.br/api/mainsite/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Sobre',
          content: '<p>Texto</p>',
          source_post_id: 42,
          convert_source_post: true,
        }),
      }),
      env: { BIGDATA_DB: db },
    });

    const payload = (await response.json()) as { ok: boolean; engagement: { comments: number; ratings: number } };

    expect(response.status).toBe(409);
    expect(payload.ok).toBe(false);
    expect(payload.engagement).toEqual({ comments: 1, ratings: 2 });
    expect(db.state.posts.has(42)).toBe(true);
    expect(db.state.about).toBeNull();
  });

  it('converts an unengaged post into about and removes its public post row', async () => {
    const db = createDb({ posts: new Set([7]) });

    const response = await onRequestPut({
      request: new Request('https://admin.lcv.app.br/api/mainsite/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Sobre',
          content: '<p>Texto</p>',
          source_post_id: 7,
          convert_source_post: true,
        }),
      }),
      env: { BIGDATA_DB: db },
    });

    const payload = (await response.json()) as { ok: boolean; convertedSourcePostId: number };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.convertedSourcePostId).toBe(7);
    expect(db.state.about?.source_post_id).toBe(7);
    expect(db.state.posts.has(7)).toBe(false);
    expect(db.state.summariesDeleted).toEqual([7]);
    expect(db.state.postsDeleted).toEqual([7]);
  });
});
