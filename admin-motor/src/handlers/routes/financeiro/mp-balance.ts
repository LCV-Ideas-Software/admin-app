// admin-motor — GET /api/financeiro/mp-balance
// Consulta saldo real da conta Mercado Pago.
//
// Estratégia:
// 1. GET /users/me (api.mercadopago.com) → obtém user_id
// 2. GET /users/{id}/mercadopago_account/balance (api.mercadolibre.com)
//    → retorna available_balance e unavailable_balance reais
// 3. Fallback: soma de pagamentos via /v1/payments/search (com paginação)

interface Env {
  MP_ACCESS_TOKEN: string;
}

type BalanceContext = { request: Request; env: Env };

const FINANCIAL_CUTOFF = '2026-03-01';

async function fetchRealBalance(
  token: string,
): Promise<{ available_balance: number; unavailable_balance: number } | null> {
  try {
    // Step 1: Get user_id from MP API
    const userRes = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) {
      console.warn(`[MP Balance] /users/me returned ${userRes.status}`);
      return null;
    }
    const userData = (await userRes.json()) as { id?: number };
    if (!userData.id) return null;

    // Step 2: Get real balance from MercadoLibre API (same auth)
    const balanceRes = await fetch(
      `https://api.mercadolibre.com/users/${userData.id}/mercadopago_account/balance`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!balanceRes.ok) {
      console.warn(`[MP Balance] /mercadopago_account/balance returned ${balanceRes.status}`);
      return null;
    }
    const balanceData = (await balanceRes.json()) as {
      available_balance?: number;
      unavailable_balance?: number;
      total_amount?: number;
      currency_id?: string;
    };

    if (typeof balanceData.available_balance === 'number') {
      return {
        available_balance: balanceData.available_balance,
        unavailable_balance: balanceData.unavailable_balance ?? 0,
      };
    }
    return null;
  } catch (err) {
    console.warn('[MP Balance] Real balance fetch failed:', (err as Error).message);
    return null;
  }
}

async function fetchPaymentTotals(
  token: string,
  startDate: string,
): Promise<{ available_balance: number; unavailable_balance: number }> {
  const fetchAll = async (status: string) => {
    const all: Array<{ transaction_amount?: number; transaction_details?: { net_received_amount?: number } }> = [];
    let offset = 0;
    const limit = 100;
    while (true) {
      const url = `https://api.mercadopago.com/v1/payments/search?status=${status}&begin_date=${startDate}T00:00:00-03:00&limit=${limit}&offset=${offset}&sort=date_created&criteria=desc`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) break;
      const data = (await res.json()) as { results?: typeof all; paging?: { total?: number } };
      const results = data.results || [];
      all.push(...results);
      offset += limit;
      if (offset >= (data.paging?.total ?? 0) || results.length === 0) break;
    }
    return all;
  };

  const [approved, pending, inProcess] = await Promise.all([
    fetchAll('approved'),
    fetchAll('pending'),
    fetchAll('in_process'),
  ]);

  const sumNet = (items: typeof approved) =>
    items.reduce((s, tx) => s + Number(tx?.transaction_details?.net_received_amount ?? tx?.transaction_amount ?? 0), 0);
  const sumGross = (items: typeof approved) =>
    items.reduce((s, tx) => s + Number(tx?.transaction_amount ?? 0), 0);

  return {
    available_balance: Math.round(sumNet(approved) * 100) / 100,
    unavailable_balance: Math.round(sumGross([...pending, ...inProcess]) * 100) / 100,
  };
}

export const onRequestGet = async (context: BalanceContext) => {
  const token = ((context as any).data?.env || context.env).MP_ACCESS_TOKEN;
  if (!token) return Response.json({ available_balance: 0, unavailable_balance: 0 });

  // Strategy 1: Real account balance via MercadoLibre API
  const realBalance = await fetchRealBalance(token);
  if (realBalance) {
    return Response.json({ ...realBalance, source: 'account' });
  }

  // Strategy 2: Fallback to payment search sums
  const url = new URL(context.request.url);
  const rawStart = url.searchParams.get('start_date') || FINANCIAL_CUTOFF;
  const startDate = rawStart < FINANCIAL_CUTOFF ? FINANCIAL_CUTOFF : rawStart;

  try {
    const totals = await fetchPaymentTotals(token, startDate);
    return Response.json({ ...totals, source: 'payments' });
  } catch (err) {
    console.error('[MP Balance] Erro ao consultar saldo:', (err as Error).message);
    return Response.json({ available_balance: 0, unavailable_balance: 0 });
  }
};
