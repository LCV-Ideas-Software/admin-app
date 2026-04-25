import type { D1Database } from './operational';

export type Env = {
  BIGDATA_DB?: D1Database;
  MAINSITE_WORKER_API_BASE_URL?: string;
  MAINSITE_WORKER_API_SECRET?: string;
};

export type Context = {
  request: Request;
  env: Env;
};

export type LegacyPost = {
  id?: number;
  title?: string;
  content?: string;
  is_pinned?: number | boolean;
  display_order?: number;
  created_at?: string;
};

export type MainsitePublicSettings = {
  appearance: Record<string, unknown>;
  rotation: Record<string, unknown>;
  disclaimers: Record<string, unknown>;
  aiModels: Record<string, unknown>;
};

// ATENÇÃO: código legado sem chamadores ativos. Se reativado, configurar MAINSITE_WORKER_API_BASE_URL via env.
const DEFAULT_MAINSITE_WORKER_URL = '';

export const toHeaders = () => ({
  'Content-Type': 'application/json',
});

const normalizeBaseUrl = (value: string) => (value.endsWith('/') ? value.slice(0, -1) : value);

export const resolveBaseUrl = (env: Env) =>
  normalizeBaseUrl(env.MAINSITE_WORKER_API_BASE_URL ?? DEFAULT_MAINSITE_WORKER_URL);

const buildErrorMessage = async (response: Response, fallback: string) => {
  const rawText = (await response.text()).trim();
  if (!rawText) {
    return `${fallback}: HTTP ${response.status}`;
  }

  try {
    const payload = JSON.parse(rawText) as { error?: string };
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return `${fallback}: ${payload.error.trim()}`;
    }
  } catch {
    // Ignora payload não-JSON.
  }

  return `${fallback}: ${rawText}`;
};

const withDefaultHeaders = (headers?: HeadersInit) => {
  const nextHeaders = new Headers(headers);
  if (!nextHeaders.has('Accept')) {
    nextHeaders.set('Accept', 'application/json');
  }
  return nextHeaders;
};

const getWorkerSecret = (env: Env) => {
  const secret = env.MAINSITE_WORKER_API_SECRET?.trim();
  if (!secret) {
    throw new Error('MAINSITE_WORKER_API_SECRET não configurado no runtime do admin-app.');
  }
  return secret;
};

export const fetchLegacyJson = async <T>(env: Env, path: string, fallback: string, init?: RequestInit) => {
  const response = await fetch(`${resolveBaseUrl(env)}${path}`, {
    ...init,
    headers: withDefaultHeaders(init?.headers),
  });

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response, fallback));
  }

  return (await response.json()) as T;
};

export const fetchLegacyAdminJson = async <T>(
  env: Env,
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  fallback: string,
  body?: unknown,
  adminActor?: string,
) => {
  const headers = withDefaultHeaders({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getWorkerSecret(env)}`,
  });

  if (typeof adminActor === 'string' && adminActor.trim()) {
    headers.set('X-Admin-Actor', adminActor.trim());
  }

  const response = await fetch(`${resolveBaseUrl(env)}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response, fallback));
  }

  return (await response.json()) as T;
};

const mapPostRow = (post: LegacyPost) => {
  const id = Number(post.id);
  const title = String(post.title ?? '').trim();
  const content = String(post.content ?? '').trim();
  const createdAt = String(post.created_at ?? '').trim();
  const displayOrder = Number(post.display_order ?? 0);

  if (!Number.isFinite(id) || !title || !content || !createdAt) {
    return null;
  }

  return {
    id,
    title,
    content,
    isPinned: Number(post.is_pinned) === 1 || post.is_pinned === true ? 1 : 0,
    displayOrder: Number.isFinite(displayOrder) ? Math.trunc(displayOrder) : 0,
    createdAt,
  };
};

export const upsertPostsIntoBigdata = async (db: D1Database, posts: LegacyPost[]) => {
  let upserted = 0;

  for (const post of posts) {
    const mapped = mapPostRow(post);
    if (!mapped) {
      continue;
    }

    await db
      .prepare(`
      INSERT INTO mainsite_posts (id, title, content, is_pinned, display_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        is_pinned = excluded.is_pinned,
        display_order = excluded.display_order,
        created_at = excluded.created_at
    `)
      .bind(mapped.id, mapped.title, mapped.content, mapped.isPinned, mapped.displayOrder, mapped.createdAt)
      .run();

    upserted += 1;
  }

  return upserted;
};

export const deletePostFromBigdata = async (db: D1Database, id: number) => {
  await db.prepare('DELETE FROM mainsite_posts WHERE id = ?').bind(id).run();
};

export const readLegacyPublicSettings = async (env: Env): Promise<MainsitePublicSettings> => {
  const [appearance, rotation, disclaimers, aiModels] = await Promise.all([
    fetchLegacyJson<Record<string, unknown>>(env, '/api/settings', 'Falha ao ler appearance do MainSite legado'),
    fetchLegacyJson<Record<string, unknown>>(env, '/api/settings/rotation', 'Falha ao ler rotation do MainSite legado'),
    fetchLegacyJson<Record<string, unknown>>(
      env,
      '/api/settings/disclaimers',
      'Falha ao ler disclaimers do MainSite legado',
    ),
    fetchLegacyJson<Record<string, unknown>>(
      env,
      '/api/settings/ai_models',
      'Falha ao ler ai_models do MainSite legado',
    ),
  ]);

  return {
    appearance,
    rotation,
    disclaimers,
    aiModels,
  };
};

export const upsertPublicSettingsIntoBigdata = async (db: D1Database, settings: MainsitePublicSettings) => {
  const rows = [
    ['mainsite/appearance', JSON.stringify(settings.appearance)],
    ['mainsite/rotation', JSON.stringify(settings.rotation)],
    ['mainsite/disclaimers', JSON.stringify(settings.disclaimers)],
    ['mainsite/ai_models', JSON.stringify(settings.aiModels)],
  ] as const;

  for (const [id, payload] of rows) {
    await db
      .prepare(`
      INSERT INTO mainsite_settings (id, payload, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        payload = excluded.payload,
        updated_at = CURRENT_TIMESTAMP
    `)
      .bind(id, payload)
      .run();
  }

  return rows.length;
};
