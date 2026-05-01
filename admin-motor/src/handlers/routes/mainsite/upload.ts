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
 *
 * Hardening (v02.00.00):
 * - Magic-byte validation: lê os primeiros bytes do arquivo e verifica se
 *   batem com a extensão declarada. Bloqueia o caso `arquivo.exe` renomeado
 *   para `.png` que passaria por todos os checks anteriores (extensão +
 *   content-type vêm do cliente, podem mentir). Mesmo padrão aplicado em
 *   `mainsite-worker/src/routes/uploads.ts` no audit pass v02.18.00.
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

/**
 * v02.00.00 / mainsite-worker parity: magic-byte sniffing.
 * Reads the first ~16 bytes of the file and infers the canonical extension
 * from the signature. Returns null when no signature matches (e.g. the
 * client sent a renamed binary). The byte buffer is consumed once at the
 * caller and passed in here to avoid re-reading the file stream.
 */
function inferExtensionFromMagicBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;

  // JPG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png';
  }

  // GIF: 47 49 46 38 (GIF8)
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return 'gif';
  }

  // WebP: RIFF....WEBP — bytes 0..3 = "RIFF", bytes 8..11 = "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }

  // AVIF: bytes 4..7 = "ftyp", bytes 8..11 in {"avif", "avis", "heic"}
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === 'avif' || brand === 'avis') return 'avif';
  }

  // PDF: %PDF (25 50 44 46)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return 'pdf';
  }

  return null;
}

function magicMatchesExtension(detected: string | null, declared: string): boolean {
  if (!detected) return false;
  if (detected === declared) return true;
  // jpg ↔ jpeg are interchangeable extensions for the same JPEG signature.
  if (detected === 'jpg' && declared === 'jpeg') return true;
  if (detected === 'jpeg' && declared === 'jpg') return true;
  return false;
}

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

    // v02.00.00 / magic-byte validation. The previous gates (extension +
    // content-type) trust the client's declared metadata. A renamed binary
    // (e.g. `payload.exe` → `payload.png` with type forged as `image/png`)
    // would have passed every prior check. Reading the first bytes once and
    // confirming they match the declared extension closes that gap. The
    // ArrayBuffer is then reused for the R2 put so we never read the stream
    // twice.
    const fileBuffer = await file.arrayBuffer();
    const headBytes = new Uint8Array(fileBuffer.slice(0, 16));
    const detectedExt = inferExtensionFromMagicBytes(headBytes);
    if (!magicMatchesExtension(detectedExt, ext)) {
      return Response.json(
        { error: 'Conteúdo do arquivo não corresponde à extensão declarada.' },
        { status: 400 },
      );
    }

    const env = ((context as unknown as { data?: { env?: Env } }).data?.env || context.env) as Env;
    await env.MEDIA_BUCKET.put(safeName, fileBuffer, {
      httpMetadata: { contentType: serverDerivedContentType },
    });

    const publicUrl = `/api/mainsite/media/${safeName}`;

    return Response.json({ success: true, url: publicUrl }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido no upload.';
    return Response.json({ error: message }, { status: 500 });
  }
};
