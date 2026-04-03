// Módulo: admin-app/functions/api/mainsite/workers-ai/sentiment.ts
// Descrição: Endpoint que usa Distilbert (Cloudflare Workers AI) para análise de sentimento.

interface Env {
  AI: any;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data = await context.request.json<{ text: string }>();
    if (!data.text) {
      return new Response(JSON.stringify({ ok: false, error: 'Text required' }), { status: 400 });
    }

    const response = await context.env.AI.run('@cf/huggingface/distilbert-sst-2-int8', {
      text: data.text
    });

    return new Response(JSON.stringify({ ok: true, sentiment: response }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
};
