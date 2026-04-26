/**
 * Upload de mídia para Cloudflare R2 (binding direto MEDIA_BUCKET).
 * POST /api/mainsite/upload — recebe FormData com campo `file`.
 * Retorna { success: true, url: "<public URL>" }.
 *
 * Hardening (v01.97.00):
 * - Cap de 10 MB.
 * - Allowlist de extensão e content-type (jpg/jpeg/png/gif/webp/avif/pdf).
 * - SVG explicitamente bloqueado (consistente com mainsite-worker 2026-04-25).
 * - Filename sanitizado para evitar path traversal.
 * - contentType derivado da allowlist server-side, não confia em file.type bruto.
 */

interface Env {
  MEDIA_BUCKET: R2Bucket;
  [key: string]: unknown;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'pdf']);
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'application/pdf',
]);
const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  pdf: 'application/pdf',
};

function sanitizeFilename(filename: string): string | null {
  const base =
    filename
      .replace(/[\\/\0]/g, '')
      .split('/')
      .pop()
      ?.split('\\')
      .pop() || '';
  if (!base || base.startsWith('.')) return null;
  const parts = base.split('.');
  if (parts.length < 2) return null;
  const ext = (parts.pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return null;
  return `${crypto.randomUUID()}.${ext}`;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const formData = await context.request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return Response.json({ error: 'Nenhum arquivo submetido.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: `Arquivo excede o limite de ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 413 },
      );
    }

    const safeName = sanitizeFilename(file.name);
    if (!safeName) {
      return Response.json(
        { error: 'Tipo de arquivo não permitido. Use: jpg, png, gif, webp, avif, pdf.' },
        { status: 400 },
      );
    }

    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return Response.json({ error: 'Content-type de arquivo não permitido.' }, { status: 400 });
    }

    const ext = safeName.split('.').pop() || '';
    const serverDerivedContentType = EXTENSION_TO_CONTENT_TYPE[ext] || 'application/octet-stream';

    const env = ((context as unknown as { data?: { env?: Env } }).data?.env || context.env) as Env;
    await env.MEDIA_BUCKET.put(safeName, await file.arrayBuffer(), {
      httpMetadata: { contentType: serverDerivedContentType },
    });

    const publicUrl = `/api/mainsite/media/${safeName}`;

    return Response.json({ success: true, url: publicUrl }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido no upload.';
    return Response.json({ error: message }, { status: 500 });
  }
};
