import SumUp from '@sumup/sdk';
import { MercadoPagoConfig, Payment, PaymentRefund } from 'mercadopago';

type Env = {
  SUMUP_API_KEY_PRIVATE?: string;
  MP_ACCESS_TOKEN?: string;
};

type Context = {
  request: Request;
  env: Env;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const handleSumupRefundPost = async (context: Context) => {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  if (!id) return json({ success: false, error: 'ID do pagamento ausente.' }, 400);

  const token = context.env.SUMUP_API_KEY_PRIVATE;
  if (!token) return json({ success: false, error: 'SUMUP_API_KEY_PRIVATE ausente.' }, 503);

  try {
    let amount: number | null = null;
    try {
      const body = (await context.request.json()) as { amount?: number };
      if (body?.amount) amount = Number(body.amount);
    } catch {
      // Estorno total sem body.
    }

    const client = new SumUp({ apiKey: token });

    let txnId = id;
    let originalAmount = 0;
    try {
      const checkout = (await client.checkouts.get(id)) as {
        amount?: number;
        transactions?: Array<{ id?: string; amount?: number }>;
      };
      const extracted = checkout?.transactions?.[0]?.id;
      if (extracted) txnId = extracted;
      originalAmount = Number(checkout?.amount || checkout?.transactions?.[0]?.amount || 0);
    } catch {
      // Fallback com o id original.
    }

    try {
      const refundPayload = amount ? { amount } : undefined;
      await client.transactions.refund(txnId, refundPayload);
    } catch (apiErr) {
      let errMsg = apiErr instanceof Error ? apiErr.message : 'Falha no estorno.';
      try {
        if (errMsg.includes('{')) {
          const jsonStr = errMsg.substring(errMsg.indexOf('{'));
          const parsed = JSON.parse(jsonStr) as { message?: string; detail?: string; error_code?: string };
          if (parsed?.message) errMsg = parsed.message;
          if (parsed?.detail) errMsg = parsed.detail;
          if (parsed?.error_code === 'NOT FOUND') errMsg = 'Transacao nao encontrada ou aguardando compensacao.';
          if (parsed?.error_code === 'CONFLICT') errMsg = 'A transacao nao pode ser estornada no estado atual.';
        }
      } catch {
        // Mantem mensagem original.
      }
      return json({ success: false, error: `Estorno recusado pela SumUp: ${errMsg}` }, 400);
    }

    let newStatus = 'REFUNDED';
    if (amount && originalAmount > 0 && amount < originalAmount) newStatus = 'PARTIALLY_REFUNDED';

    return json({ success: true, status: newStatus });
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : 'Falha estrutural ao estornar.' }, 500);
  }
};

export const handleSumupCancelPost = async (context: Context) => {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  if (!id) return json({ success: false, error: 'ID do pagamento ausente.' }, 400);

  const token = context.env.SUMUP_API_KEY_PRIVATE;
  if (!token) return json({ success: false, error: 'SUMUP_API_KEY_PRIVATE ausente.' }, 503);

  try {
    const client = new SumUp({ apiKey: token });

    try {
      await client.checkouts.deactivate(id);
    } catch (apiErr) {
      let errMsg = apiErr instanceof Error ? apiErr.message : 'Falha ao cancelar.';

      try {
        if (errMsg.includes('{')) {
          const jsonStr = errMsg.substring(errMsg.indexOf('{'));
          const parsed = JSON.parse(jsonStr) as { message?: string; detail?: string; error_code?: string };
          if (parsed?.message) errMsg = parsed.message;
          if (parsed?.detail) errMsg = parsed.detail;
          if (parsed?.error_code === 'NOT FOUND') errMsg = 'Checkout nao encontrado.';
          if (parsed?.error_code === 'CONFLICT') errMsg = 'Este checkout nao pode ser cancelado no estado atual.';
        }
      } catch {
        // Mantem mensagem original.
      }

      const isConflict = errMsg.includes('cancelado no estado atual') || (apiErr instanceof Error && apiErr.message.includes('409'));
      if (isConflict) {
        try {
          const checkRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (checkRes.ok) {
            const checkoutData = (await checkRes.json()) as {
              status?: string;
              transactions?: Array<{ id?: string; status?: string }>;
            };
            const txStatus = checkoutData.transactions?.[0]?.status;
            const rawStatus = String(txStatus || checkoutData.status || 'UNKNOWN').toUpperCase();
            const realStatus = rawStatus === 'PAID' ? 'SUCCESSFUL' : rawStatus;
            if (checkoutData.status === 'PAID' || realStatus === 'SUCCESSFUL') {
              return json({ success: false, error: 'A transacao foi confirmada/paga na SumUp. Atualize o painel e utilize Estornar Transacao (Refund) ao inves de cancelar.' }, 400);
            }
          }
        } catch {
          // Ignora erro secundario.
        }
      } else {
        return json({ success: false, error: `Cancelamento recusado pela SumUp: ${errMsg}` }, 400);
      }
    }

    return json({ success: true });
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : 'Falha estrutural ao cancelar.' }, 500);
  }
};

export const handleMpRefundPost = async (context: Context) => {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'ID do pagamento ausente.' }, 400);

  const token = context.env.MP_ACCESS_TOKEN;
  if (!token) return json({ error: 'MP_ACCESS_TOKEN ausente.' }, 503);

  try {
    const client = new MercadoPagoConfig({ accessToken: token });
    const refundApi = new PaymentRefund(client);

    const refundBody: { payment_id: string; body?: { amount: number } } = { payment_id: id };
    try {
      const body = (await context.request.json()) as { amount?: number };
      if (body.amount) refundBody.body = { amount: Number(body.amount) };
    } catch {
      // Estorno total sem body.
    }

    await refundApi.create(refundBody as { payment_id: string; body?: { amount: number } });

    return json({ success: true, status: refundBody.body?.amount ? 'partially_refunded' : 'refunded' });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Falha no estorno.' }, 500);
  }
};

export const handleMpCancelPost = async (context: Context) => {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'ID do pagamento ausente.' }, 400);

  const token = context.env.MP_ACCESS_TOKEN;
  if (!token) return json({ error: 'MP_ACCESS_TOKEN ausente.' }, 503);

  try {
    const client = new MercadoPagoConfig({ accessToken: token });
    const paymentApi = new Payment(client);
    await paymentApi.cancel({ id });
    return json({ success: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Falha ao cancelar.' }, 500);
  }
};
