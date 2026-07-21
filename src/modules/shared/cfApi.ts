/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Camada fina sobre `apiFetchJson` para os módulos Cloudflare do frontend.
 *
 * Regras:
 * - NÃO envia header X-Admin-Actor: o motor resolve o ator real via headers do
 *   Cloudflare Access; um ator fixo no cliente poluiria a trilha de auditoria.
 * - Mensagens de erro sempre diagnósticas em pt-BR (problema real + status +
 *   request_id quando disponível), nunca "erro desconhecido" genérico.
 */

import { type ApiFailure, type ApiResult, apiFetchJson } from '../../lib/apiClient';

type CfApiFetchOptions = {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
};

/**
 * Chama o motor (mesma origem) com JSON defensivo: serializa `body` e define
 * `Content-Type` quando presente. Devolve `ApiResult<T>` — o chamador DEVE
 * inspecionar `.ok`.
 * @public
 */
export async function cfApiFetch<T>(path: string, opts: CfApiFetchOptions = {}): Promise<ApiResult<T>> {
  const { method = 'GET', body, timeoutMs } = opts;

  return apiFetchJson<T>(path, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
  });
}

type ParsedFailureBody = {
  error: string | null;
  requestId: string | null;
};

const parseFailureBody = (bodyPreview: string): ParsedFailureBody => {
  const empty: ParsedFailureBody = { error: null, requestId: null };
  if (!bodyPreview.trim()) {
    return empty;
  }

  try {
    const parsed = JSON.parse(bodyPreview) as { error?: unknown; request_id?: unknown };
    return {
      error: typeof parsed.error === 'string' && parsed.error.trim() ? parsed.error.trim() : null,
      requestId: typeof parsed.request_id === 'string' && parsed.request_id.trim() ? parsed.request_id.trim() : null,
    };
  } catch {
    // Preview não-JSON (HTML de erro do proxy etc.) — tratado pelo chamador.
    return empty;
  }
};

const statusMeaningPtBr = (status: number): string => {
  if (status === 0) {
    return 'falha de rede ou tempo limite — a requisição nem chegou ao motor';
  }
  if (status === 401 || status === 403) {
    return `sessão expirada ou sem permissão (HTTP ${status})`;
  }
  if (status === 404) {
    return 'rota inexistente no motor — versão do motor desatualizada? (HTTP 404)';
  }
  if (status === 429) {
    return 'limite de requisições atingido — aguarde e tente novamente (HTTP 429)';
  }
  if (status >= 500) {
    return `falha no motor ou no upstream Cloudflare (HTTP ${status})`;
  }
  return `HTTP ${status}`;
};

/**
 * Monta a mensagem diagnóstica em pt-BR para uma falha de `cfApiFetch`:
 * contexto da operação + erro real reportado pelo servidor (campo `error` do
 * corpo, quando houver) + significado do status HTTP + request_id.
 * @public
 */
export function cfApiErrorMessage(failure: ApiFailure, contexto: string): string {
  const parsedBody = parseFailureBody(failure.bodyPreview);
  const serverError = parsedBody.error;

  const details: string[] = [statusMeaningPtBr(failure.status)];
  if (!serverError && failure.bodyPreview.trim()) {
    const preview = failure.bodyPreview.trim().replace(/\s+/g, ' ');
    details.push(`resposta: ${preview.length > 160 ? `${preview.slice(0, 160)}…` : preview}`);
  }
  if (parsedBody.requestId) {
    details.push(`req ${parsedBody.requestId}`);
  }

  return `${contexto}: ${serverError ?? failure.error} (${details.join('; ')})`;
}
