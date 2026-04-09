import SumUp from '@sumup/sdk';

type InsightsEnv = {
  SUMUP_API_KEY_PRIVATE?: string;
  SUMUP_MERCHANT_CODE?: string;
  MP_ACCESS_TOKEN?: string;
};

type InsightsContext = {
  request: Request;
  env: InsightsEnv;
};

 
type AnyRecord = Record<string, any>;

const FINANCIAL_CUTOFF_BRT = '2026-03-01T00:00:00-03:00';
const FINANCIAL_CUTOFF_DATE = '2026-03-01';
const FINANCIAL_CUTOFF_UTC = new Date(FINANCIAL_CUTOFF_BRT);
const FINANCIAL_CUTOFF_ISO = FINANCIAL_CUTOFF_UTC.toISOString();

const getStartIsoWithCutoff = (rawDate: string | null): string => {
  if (!rawDate) return FINANCIAL_CUTOFF_ISO;
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return FINANCIAL_CUTOFF_ISO;
  return parsed.getTime() < FINANCIAL_CUTOFF_UTC.getTime() ? FINANCIAL_CUTOFF_ISO : parsed.toISOString();
};

const isOnOrAfterCutoff = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() >= FINANCIAL_CUTOFF_UTC.getTime();
};

export const handleFinanceiroInsightsGet = async (context: InsightsContext) => {
  const url = new URL(context.request.url);
  const provider = url.searchParams.get('provider') || '';
  const type = url.searchParams.get('type') || '';

  if (provider === 'sumup') {
    const token = context.env.SUMUP_API_KEY_PRIVATE;
    const merchantCode = context.env.SUMUP_MERCHANT_CODE;
    if (!token || !merchantCode) {
      return Response.json({ error: 'SUMUP_API_KEY_PRIVATE ou SUMUP_MERCHANT_CODE ausentes.' }, { status: 503 });
    }

    const client = new SumUp({ apiKey: token });

    if (type === 'payment-methods') {
      try {
        const amountRaw = Number(url.searchParams.get('amount'));
        const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 10;
        const currency = (url.searchParams.get('currency') || 'BRL').toUpperCase();

        const data = await client.checkouts.listAvailablePaymentMethods(merchantCode, { amount, currency }) as AnyRecord;
        const methods = Array.isArray(data?.available_payment_methods)
          ? data.available_payment_methods.map((m: AnyRecord) => m.id).filter(Boolean)
          : [];

        return Response.json({ success: true, amount, currency, methods });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : 'Falha ao listar métodos SumUp.' }, { status: 500 });
      }
    }

    if (type === 'transactions-summary') {
      try {
        const limitRaw = Number(url.searchParams.get('limit'));
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;
        const changesSince = getStartIsoWithCutoff(url.searchParams.get('changes_since') || url.searchParams.get('start_date'));

        const txData = await client.transactions.list(merchantCode, {
          order: 'descending', limit, changes_since: changesSince,
        }) as AnyRecord;

        const rawItems: AnyRecord[] = Array.isArray(txData?.items) ? txData.items : [];
        const items = rawItems.filter((tx) => isOnOrAfterCutoff(tx?.timestamp));

        const byStatus: Record<string, number> = {};
        const byType: Record<string, number> = {};
        let totalAmount = 0;
        for (const tx of items) {
          const status = (tx?.status || 'UNKNOWN').toUpperCase();
          const txType = (tx?.type || 'UNKNOWN').toUpperCase();
          byStatus[status] = (byStatus[status] || 0) + 1;
          byType[txType] = (byType[txType] || 0) + 1;
          totalAmount += Number(tx?.amount || 0);
        }

        return Response.json({
          success: true, scanned: items.length, limit, totalAmount, byStatus, byType,
          hasMore: Array.isArray(txData?.links) && txData.links.length > 0,
        });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : 'Falha no resumo SumUp.' }, { status: 500 });
      }
    }

    if (type === 'transactions-advanced') {
      try {
        const limitRaw = Number(url.searchParams.get('limit'));
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;
        const changesSince = getStartIsoWithCutoff(url.searchParams.get('changes_since') || url.searchParams.get('start_date'));

        const txData = await client.transactions.list(merchantCode, {
          order: 'descending', limit, changes_since: changesSince,
        }) as AnyRecord;

        const rawItems: AnyRecord[] = Array.isArray(txData?.items) ? txData.items : [];
        const normalized = rawItems.filter((tx) => isOnOrAfterCutoff(tx?.timestamp)).map((tx) => ({
          id: tx?.id || tx?.transaction_id || null,
          transactionCode: tx?.transaction_code || null,
          amount: Number(tx?.amount || 0),
          currency: tx?.currency || 'BRL',
          status: tx?.status || 'UNKNOWN',
          type: tx?.type || 'UNKNOWN',
          paymentType: tx?.payment_type || 'UNKNOWN',
          entryMode: tx?.entry_mode || null,
          cardType: tx?.card_type || null,
          timestamp: tx?.timestamp || null,
          user: tx?.user || null,
          payerEmail: typeof tx?.user === 'string' && tx.user.includes('@') ? tx.user : null,
          refundedAmount: Number(tx?.refunded_amount || 0),
          authCode: tx?.auth_code || null,
          internalId: tx?.internal_id || null,
          installments: tx?.installments_count || null,
        }));

        return Response.json({ success: true, total: normalized.length, items: normalized });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : 'Falha em transações avançadas SumUp.' }, { status: 500 });
      }
    }

    if (type === 'payouts-summary') {
      try {
        const now = new Date();
        const requestedStart = url.searchParams.get('start_date') || FINANCIAL_CUTOFF_DATE;
        const startDate = requestedStart < FINANCIAL_CUTOFF_DATE ? FINANCIAL_CUTOFF_DATE : requestedStart;
        const endDate = url.searchParams.get('end_date') || now.toISOString().slice(0, 10);

        const payouts = await client.payouts.list(merchantCode, {
          start_date: startDate, end_date: endDate, order: 'desc', limit: 100,
        }) as AnyRecord[];

        const list: AnyRecord[] = Array.isArray(payouts) ? payouts : [];
        let totalAmount = 0;
        let totalFee = 0;
        const byStatus: Record<string, number> = {};

        for (const p of list) {
          totalAmount += Number(p?.amount || 0);
          totalFee += Number(p?.fee || 0);
          const status = (p?.status || 'UNKNOWN').toUpperCase();
          byStatus[status] = (byStatus[status] || 0) + 1;
        }

        return Response.json({ success: true, startDate, endDate, count: list.length, totalAmount, totalFee, byStatus });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : 'Falha em payouts SumUp.' }, { status: 500 });
      }
    }
  }

  if (provider === 'mp') {
    const token = context.env.MP_ACCESS_TOKEN;
    if (!token) return Response.json({ error: 'MP_ACCESS_TOKEN ausente.' }, { status: 503 });

    const mpHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };

    const readMpError = async (res: globalThis.Response, fallback: string): Promise<string> => {
      try {
        const body = await res.text();
        const parsed = JSON.parse(body) as { message?: string; error?: string };
        return parsed.message || parsed.error || `MP API ${res.status}: ${body.slice(0, 200)}`;
      } catch {
        return `MP API ${res.status}: ${fallback}`;
      }
    };

    if (type === 'payment-methods') {
      try {
        const res = await fetch('https://api.mercadopago.com/v1/payment_methods', { headers: mpHeaders });
        if (!res.ok) {
          const errMsg = await readMpError(res, res.statusText);
          return Response.json({ error: errMsg }, { status: res.status });
        }
        const methodsRaw = await res.json() as AnyRecord[];
        const methods = [...new Set(methodsRaw.map((m) => m?.id).filter(Boolean))];
        const types = [...new Set(methodsRaw.map((m) => m?.payment_type_id).filter(Boolean))];

        return Response.json({ success: true, scanned: methodsRaw.length, methods, types });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : 'Falha ao listar métodos MP.' }, { status: 500 });
      }
    }

    if (type === 'transactions-summary') {
      try {
        const limitRaw = Number(url.searchParams.get('limit'));
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;
        const begin_date = getStartIsoWithCutoff(url.searchParams.get('begin_date') || url.searchParams.get('start_date'));
        const end_date = url.searchParams.get('end_date') ? new Date(url.searchParams.get('end_date')!).toISOString() : new Date().toISOString();

        const searchUrl = new URL('https://api.mercadopago.com/v1/payments/search');
        searchUrl.searchParams.set('sort', 'date_created');
        searchUrl.searchParams.set('criteria', 'desc');
        searchUrl.searchParams.set('range', 'date_created');
        searchUrl.searchParams.set('begin_date', begin_date);
        searchUrl.searchParams.set('end_date', end_date);
        searchUrl.searchParams.set('limit', String(limit));
        searchUrl.searchParams.set('offset', '0');

        const res = await fetch(searchUrl.toString(), { headers: mpHeaders });
        if (!res.ok) {
          const errMsg = await readMpError(res, res.statusText);
          return Response.json({ error: errMsg }, { status: res.status });
        }

        const payload = await res.json() as AnyRecord;
        const items: AnyRecord[] = Array.isArray(payload?.results) ? payload.results : [];
        const byStatus: Record<string, number> = {};
        const byType: Record<string, number> = {};
        let totalAmount = 0;
        let totalNetAmount = 0;

        for (const tx of items) {
          const status = String(tx?.status || 'unknown').toUpperCase();
          const txType = String(tx?.payment_type_id || 'unknown').toUpperCase();
          byStatus[status] = (byStatus[status] || 0) + 1;
          byType[txType] = (byType[txType] || 0) + 1;
          totalAmount += Number(tx?.transaction_amount || 0);
          totalNetAmount += Number(tx?.transaction_details?.net_received_amount || 0);
        }

        return Response.json({
          success: true,
          scanned: items.length,
          limit,
          totalAmount,
          totalNetAmount,
          byStatus,
          byType,
          paging: payload?.paging || { total: 0, limit, offset: 0 },
        });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : 'Falha no resumo MP.' }, { status: 500 });
      }
    }

    if (type === 'transactions-advanced') {
      try {
        const limitRaw = Number(url.searchParams.get('limit'));
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;
        const offsetRaw = Number(url.searchParams.get('offset'));
        const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.trunc(offsetRaw) : 0;
        const begin_date = getStartIsoWithCutoff(url.searchParams.get('begin_date') || url.searchParams.get('start_date'));
        const end_date = url.searchParams.get('end_date') ? new Date(url.searchParams.get('end_date')!).toISOString() : new Date().toISOString();

        const searchUrl = new URL('https://api.mercadopago.com/v1/payments/search');
        searchUrl.searchParams.set('sort', 'date_created');
        searchUrl.searchParams.set('criteria', 'desc');
        searchUrl.searchParams.set('range', 'date_created');
        searchUrl.searchParams.set('begin_date', begin_date);
        searchUrl.searchParams.set('end_date', end_date);
        searchUrl.searchParams.set('limit', String(limit));
        searchUrl.searchParams.set('offset', String(offset));

        const res = await fetch(searchUrl.toString(), { headers: mpHeaders });
        if (!res.ok) {
          const errMsg = await readMpError(res, res.statusText);
          return Response.json({ error: errMsg }, { status: res.status });
        }

        const payload = await res.json() as AnyRecord;
        const items: AnyRecord[] = Array.isArray(payload?.results) ? payload.results : [];
        const normalized = items.map((tx) => ({
          id: tx?.id ?? null,
          status: tx?.status ?? 'unknown',
          statusDetail: tx?.status_detail ?? null,
          paymentType: tx?.payment_type_id ?? 'unknown',
          paymentMethod: tx?.payment_method_id ?? null,
          transactionAmount: Number(tx?.transaction_amount || 0),
          netReceivedAmount: Number(tx?.transaction_details?.net_received_amount || 0),
          totalPaidAmount: Number(tx?.transaction_details?.total_paid_amount || 0),
          installmentAmount: Number(tx?.transaction_details?.installment_amount || 0),
          installments: tx?.installments ?? null,
          currency: tx?.currency_id ?? 'BRL',
          dateCreated: tx?.date_created ?? null,
          dateApproved: tx?.date_approved ?? null,
          payerEmail: tx?.payer?.email ?? null,
          payerId: tx?.payer?.id ?? null,
          description: tx?.description ?? null,
          externalReference: tx?.external_reference ?? null,
          orderId: tx?.order?.id ?? null,
        }));

        return Response.json({
          success: true,
          total: normalized.length,
          items: normalized,
          paging: payload?.paging || { total: 0, limit, offset },
        });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : 'Falha em transações avançadas MP.' }, { status: 500 });
      }
    }
  }

  return Response.json({ error: 'Parâmetros inválidos: provider e type são obrigatórios.' }, { status: 400 });
};
