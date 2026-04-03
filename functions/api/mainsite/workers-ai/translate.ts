// Módulo: admin-app/functions/api/mainsite/workers-ai/translate.ts
// Descrição: Endpoint que usa m2m100 (Cloudflare Workers AI) para tradução de idiomas.

interface Env {
  AI: any;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data = await context.request.json<{ text: string, source_lang?: string, target_lang?: string }>();
    if (!data.text) {
      return new Response(JSON.stringify({ ok: false, error: 'Text required' }), { status: 400 });
    }

    const response = await context.env.AI.run('@cf/meta/m2m100-1.2b', {
      text: data.text,
      source_lang: data.source_lang || 'en',
      target_lang: data.target_lang || 'pt'
    });

    return new Response(JSON.stringify({ ok: true, translation: (response as { translated_text: string }).translated_text }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
};
