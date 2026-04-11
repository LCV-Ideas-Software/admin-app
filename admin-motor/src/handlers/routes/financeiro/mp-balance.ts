// admin-motor — GET /api/financeiro/mp-balance
// Calcula total recebido líquido e pendente via /v1/payments/search.
//
// Nota: a API do Mercado Pago não expõe saldo real da conta para contas
// tipo "personal" com integração Checkout Bricks. Os valores retornados
// representam soma de pagamentos (líquido de taxas), não saldo bancário.

interface Env {
  MP_ACCESS_TOKEN: string;
}

type BalanceContext = { request: Request; env: Env };

const FINANCIAL_CUTOFF = '2026-03-01';
const MP_API = 'https://api.mercadopago.com';

type PaymentResult = {
  transaction_amount?: number;
  transaction_details?: { net_received_amount?: number };
};

async function fetchAllPayments(token: string, status: string, startDate: string): Promise<PaymentResult[]> {
  const all: PaymentResult[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${MP_API}/v1/payments/search?status=${status}&begin_date=${startDate}T00:00:00-03:00&limit=${limit}&offset=${offset}&sort=date_created&criteria=desc`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) break;

    const data = (await res.json()) as { results?: PaymentResult[]; paging?: { total?: number } };
    const results = data.results || [];
    all.push(...results);

    offset += limit;
    if (offset >= (data.paging?.total ?? 0) || results.length === 0) break;
  }

  return all;
}

export const onRequestGet = async (context: BalanceContext) => {
  const token = ((context as any).data?.env || context.env).MP_ACCESS_TOKEN;
  if (!token) return Response.json({ available_balance: 0, unavailable_balance: 0 });

  const url = new URL(context.request.url);
  const rawStart = url.searchParams.get('start_date') || FINANCIAL_CUTOFF;
  const startDate = rawStart < FINANCIAL_CUTOFF ? FINANCIAL_CUTOFF : rawStart;

  try {
    const [approved, pending, inProcess] = await Promise.all([
      fetchAllPayments(token, 'approved', startDate),
      fetchAllPayments(token, 'pending', startDate),
      fetchAllPayments(token, 'in_process', startDate),
    ]);

    const sumNet = (items: PaymentResult[]) =>
      items.reduce((s, tx) => s + Number(tx?.transaction_details?.net_received_amount ?? tx?.transaction_amount ?? 0), 0);
    const sumGross = (items: PaymentResult[]) =>
      items.reduce((s, tx) => s + Number(tx?.transaction_amount ?? 0), 0);

    return Response.json({
      available_balance: Math.round(sumNet(approved) * 100) / 100,
      unavailable_balance: Math.round(sumGross([...pending, ...inProcess]) * 100) / 100,
    });
  } catch (err) {
    console.error('[MP Balance] Erro:', (err as Error).message);
    return Response.json({ available_balance: 0, unavailable_balance: 0 });
  }
};
