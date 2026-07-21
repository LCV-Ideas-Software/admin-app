/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers de fetch tipados dos endpoints do módulo CF DNS. Mantém a semântica
 * de fetch crua de CfDnsModule.tsx (incl. header X-Admin-Actor) — cada helper
 * retorna { response, payload } para o chamador aplicar as mesmas checagens
 * de `response.ok`/`payload.ok` de antes.
 */

import { cfApiFetch } from '../shared/cfApi';
import type {
  DnsAnalyticsPayload,
  DnsAnalyticsTopDimension,
  DnsSettings,
  DnsSettingsPayload,
  DnssecPatchInput,
  DnssecPayload,
  MutationPayload,
  RecordsPayload,
  RegistrarAvailabilityPayload,
  RegistrarPayload,
  RegistrarRegistrationDetailPayload,
  RegistrarWorkflowPayload,
  ZoneCapabilitiesPayload,
  ZoneMutationPayload,
  ZonesAdminPayload,
  ZonesPayload,
} from './types';

export const parseApiPayload = async <T>(response: Response, fallback: string): Promise<T> => {
  const rawText = await response.text();
  const trimmed = rawText.trim();

  if (!trimmed) {
    throw new Error(`${fallback} (HTTP ${response.status}, corpo vazio).`);
  }

  const looksLikeHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html');
  if (looksLikeHtml) {
    throw new Error(`${fallback} (HTTP ${response.status}, resposta HTML inesperada).`);
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`${fallback} (HTTP ${response.status}, resposta não-JSON).`);
  }
};

export const withReq = (message: string, payload?: { request_id?: string }) => {
  if (payload?.request_id) {
    return `${message} (req ${payload.request_id})`;
  }
  return message;
};

export const fetchZones = async (adminActor: string) => {
  const response = await fetch('/api/cfdns/zones', {
    headers: {
      'X-Admin-Actor': adminActor,
    },
  });
  const payload = await parseApiPayload<ZonesPayload>(response, 'Falha ao carregar domínios da Cloudflare');
  return { response, payload };
};

export const fetchRegistrarRegistrations = async (adminActor: string) => {
  const response = await fetch('/api/cfdns/registrar/registrations', {
    headers: {
      'X-Admin-Actor': adminActor,
    },
  });
  const payload = await parseApiPayload<RegistrarPayload>(response, 'Falha ao carregar Cloudflare Registrar');
  return { response, payload };
};

export const searchRegistrarDomains = async (adminActor: string, q: string, extensions: string[]) => {
  const query = new URLSearchParams({
    q,
    limit: '20',
  });
  if (extensions.length > 0) {
    query.set('extensions', extensions.join(','));
  }

  const response = await fetch(`/api/cfdns/registrar/search?${query.toString()}`, {
    headers: {
      'X-Admin-Actor': adminActor,
    },
  });
  const payload = await parseApiPayload<RegistrarAvailabilityPayload>(
    response,
    'Falha ao buscar domínios no Cloudflare Registrar',
  );
  return { response, payload };
};

export const checkRegistrarDomains = async (adminActor: string, domains: string[]) => {
  const response = await fetch('/api/cfdns/registrar/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Actor': adminActor,
    },
    body: JSON.stringify({ domains }),
  });
  const payload = await parseApiPayload<RegistrarAvailabilityPayload>(
    response,
    'Falha ao checar disponibilidade no Cloudflare Registrar',
  );
  return { response, payload };
};

export const fetchRegistrarWorkflowStatuses = async (adminActor: string, domain: string) => {
  const [registrationResponse, updateResponse] = await Promise.all([
    fetch(`/api/cfdns/registrar/registration-status?domain=${encodeURIComponent(domain)}`, {
      headers: { 'X-Admin-Actor': adminActor },
    }),
    fetch(`/api/cfdns/registrar/update-status?domain=${encodeURIComponent(domain)}`, {
      headers: { 'X-Admin-Actor': adminActor },
    }),
  ]);

  const registrationPayload = await parseApiPayload<RegistrarWorkflowPayload>(
    registrationResponse,
    'Falha ao consultar workflow de registro',
  );
  const updatePayload = await parseApiPayload<RegistrarWorkflowPayload>(
    updateResponse,
    'Falha ao consultar workflow de atualização',
  );

  return { registrationResponse, registrationPayload, updateResponse, updatePayload };
};

export const fetchRegistrationStatus = async (adminActor: string, domain: string) => {
  const response = await fetch(`/api/cfdns/registrar/registration-status?domain=${encodeURIComponent(domain)}`, {
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<RegistrarWorkflowPayload>(response, 'Falha ao consultar workflow de registro');
  return { response, payload };
};

export const createRegistrarRegistration = async (
  adminActor: string,
  body: {
    domain_name: string;
    years: number;
    auto_renew: boolean;
    privacy_mode: 'redaction' | 'off';
    /** DNS-4: contato do registrante no shape da API CF; omitido → address book da conta. */
    contacts?: Record<string, unknown>;
  },
) => {
  const response = await fetch('/api/cfdns/registrar/registrations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Actor': adminActor,
    },
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<RegistrarWorkflowPayload>(
    response,
    'Falha ao registrar domínio no Cloudflare Registrar',
  );
  return { response, payload };
};

export const patchRegistrarRegistration = async (adminActor: string, domain: string, body: { auto_renew: boolean }) => {
  const query = new URLSearchParams({ domain });
  const response = await fetch(`/api/cfdns/registrar/registration?${query.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Actor': adminActor,
    },
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<RegistrarWorkflowPayload>(response, 'Falha ao atualizar Cloudflare Registrar');
  return { response, payload };
};

export const putRegistrarDomain = async (
  adminActor: string,
  domain: string,
  body: { locked?: boolean; privacy?: boolean },
) => {
  const query = new URLSearchParams({ domain });
  const response = await fetch(`/api/cfdns/registrar/domain?${query.toString()}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Actor': adminActor,
    },
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<RegistrarPayload>(response, 'Falha ao atualizar domínio Registrar');
  return { response, payload };
};

// DNS-4: detalhe completo de uma registration (drawer "Detalhes"), padrão
// raw-fetch do módulo com header X-Admin-Actor.
export const fetchRegistrarRegistrationDetail = async (adminActor: string, domain: string) => {
  const query = new URLSearchParams({ domain });
  const response = await fetch(`/api/cfdns/registrar/registration?${query.toString()}`, {
    headers: {
      'X-Admin-Actor': adminActor,
    },
  });
  const payload = await parseApiPayload<RegistrarRegistrationDetailPayload>(
    response,
    'Falha ao consultar detalhes do registro Registrar',
  );
  return { response, payload };
};

export type RecordsQueryInput = {
  zoneId: string;
  page: number;
  perPage: number;
  type?: string;
  search?: string;
  order?: string;
  direction?: string;
  nameContains?: string;
  contentContains?: string;
  commentContains?: string;
  commentPresent?: string;
  tagExact?: string;
  tagPresent?: string;
  proxied?: string;
  match?: string;
};

/**
 * Monta a query-string de GET /api/cfdns/records: zoneId/page/perPage sempre
 * presentes; demais parâmetros só entram quando não vazios (após trim).
 * `direction` só acompanha um `order` definido.
 */
export const buildRecordsQuery = (input: RecordsQueryInput): URLSearchParams => {
  const query = new URLSearchParams({
    zoneId: input.zoneId,
    page: String(input.page),
    perPage: String(input.perPage),
  });

  const setIfPresent = (key: string, value?: string) => {
    const trimmed = String(value ?? '').trim();
    if (trimmed) {
      query.set(key, trimmed);
    }
  };

  setIfPresent('type', input.type);

  const search = String(input.search ?? '')
    .trim()
    .toLowerCase();
  if (search) {
    query.set('search', search);
  }

  const order = String(input.order ?? '').trim();
  if (order) {
    query.set('order', order);
    setIfPresent('direction', input.direction);
  }

  setIfPresent('nameContains', input.nameContains);
  setIfPresent('contentContains', input.contentContains);
  setIfPresent('commentContains', input.commentContains);
  setIfPresent('commentPresent', input.commentPresent);
  setIfPresent('tagExact', input.tagExact);
  setIfPresent('tagPresent', input.tagPresent);
  setIfPresent('proxied', input.proxied);
  setIfPresent('match', input.match);

  return query;
};

export const fetchRecords = async (adminActor: string, query: URLSearchParams) => {
  const response = await fetch(`/api/cfdns/records?${query.toString()}`, {
    headers: {
      'X-Admin-Actor': adminActor,
    },
  });
  const payload = await parseApiPayload<RecordsPayload>(response, 'Falha ao carregar registros DNS');
  return { response, payload };
};

// Sem X-Admin-Actor de propósito: a rota é somente-leitura e usa cfApiFetch,
// onde o ator real é resolvido pelos headers do Cloudflare Access no motor.
export const fetchZoneCapabilities = (zoneId: string) =>
  cfApiFetch<ZoneCapabilitiesPayload>(`/api/cfdns/zone-capabilities?zoneId=${encodeURIComponent(zoneId)}`);

export const upsertRecord = async (
  adminActor: string,
  body: {
    zoneId: string;
    recordId?: string | undefined;
    adminActor: string;
    record: {
      type: string;
      name: string;
      content: string;
      data: Record<string, unknown> | null;
      ttl: number;
      proxied: boolean;
      priority: number | null;
      comment: string | null;
      tags: string[];
    };
  },
) => {
  const response = await fetch('/api/cfdns/upsert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Actor': adminActor,
    },
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<MutationPayload>(response, 'Falha ao salvar registro DNS');
  return { response, payload };
};

export type BatchRequestBody = {
  zoneId: string;
  adminActor: string;
  deletes?: Array<{ id: string }>;
  patches?: Array<{ id: string } & Record<string, unknown>>;
};

export type BatchResultPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  result?: {
    deletes?: unknown[];
    patches?: unknown[];
    puts?: unknown[];
    posts?: unknown[];
  };
};

export const applyRecordsBatch = async (adminActor: string, body: BatchRequestBody) => {
  const response = await fetch('/api/cfdns/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Actor': adminActor,
    },
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<BatchResultPayload>(response, 'Falha ao aplicar operações DNS em lote');
  return { response, payload };
};

// Sucesso devolve text/plain (arquivo BIND), não JSON: o chamador decide entre
// blob (download) e parse do corpo de erro JSON quando !response.ok.
export const fetchZoneExport = async (adminActor: string, zoneId: string, zoneName: string) => {
  const query = new URLSearchParams({ zoneId });
  if (zoneName.trim()) {
    query.set('zoneName', zoneName.trim());
  }
  return fetch(`/api/cfdns/export?${query.toString()}`, {
    headers: {
      'X-Admin-Actor': adminActor,
    },
  });
};

export type ImportResultPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  recsAdded?: number;
  totalRecordsParsed?: number;
};

// Sem Content-Type manual: o browser define o boundary do multipart/form-data.
export const importZoneFile = async (adminActor: string, zoneId: string, file: File, proxied: boolean) => {
  const formData = new FormData();
  formData.append('zoneId', zoneId);
  formData.append('file', file);
  formData.append('proxied', proxied ? 'true' : 'false');

  const response = await fetch('/api/cfdns/import', {
    method: 'POST',
    headers: {
      'X-Admin-Actor': adminActor,
    },
    body: formData,
  });
  const payload = await parseApiPayload<ImportResultPayload>(response, 'Falha ao importar o arquivo de zona BIND');
  return { response, payload };
};

// ── DNS-3: zonas (admin), DNSSEC e configurações DNS ──
// Leituras via cfApiFetch (ator resolvido pelos headers do Cloudflare Access);
// mutações seguem o padrão raw-fetch do módulo com header X-Admin-Actor.

export const fetchZonesAdmin = () => cfApiFetch<ZonesAdminPayload>('/api/cfdns/zones-admin');

export const fetchDnssec = (zoneId: string) =>
  cfApiFetch<DnssecPayload>(`/api/cfdns/dnssec?zoneId=${encodeURIComponent(zoneId)}`);

export const fetchDnsSettings = (zoneId: string) =>
  cfApiFetch<DnsSettingsPayload>(`/api/cfdns/dns-settings?zoneId=${encodeURIComponent(zoneId)}`);

// ── DNS-4: análises DNS (leituras via cfApiFetch, como zone-capabilities) ──

export const fetchDnsAnalyticsBytime = (zoneId: string, since: string, until: string) =>
  cfApiFetch<DnsAnalyticsPayload>(
    `/api/cfdns/analytics/bytime?zoneId=${encodeURIComponent(zoneId)}&since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`,
  );

export const fetchDnsAnalyticsTop = (
  zoneId: string,
  dimension: DnsAnalyticsTopDimension,
  since: string,
  until: string,
) =>
  cfApiFetch<DnsAnalyticsPayload>(
    `/api/cfdns/analytics/top?zoneId=${encodeURIComponent(zoneId)}&dimension=${encodeURIComponent(dimension)}&since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`,
  );

const jsonMutation = async <T>(adminActor: string, path: string, method: string, body: unknown, fallback: string) => {
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Actor': adminActor,
    },
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<T>(response, fallback);
  return { response, payload };
};

export const createZone = (adminActor: string, name: string) =>
  jsonMutation<ZoneMutationPayload>(
    adminActor,
    '/api/cfdns/zones-admin',
    'POST',
    { name },
    'Falha ao criar a zona na Cloudflare',
  );

export const deleteZone = (
  adminActor: string,
  body: { zoneId: string; confirmName: string; confirmCritical?: boolean },
) =>
  jsonMutation<ZoneMutationPayload>(
    adminActor,
    '/api/cfdns/zones-admin',
    'DELETE',
    body,
    'Falha ao excluir a zona na Cloudflare',
  );

export const patchZonePaused = (
  adminActor: string,
  body: { zoneId: string; paused: boolean; confirmName?: string; confirmCritical?: boolean },
) =>
  jsonMutation<ZoneMutationPayload>(
    adminActor,
    '/api/cfdns/zones-admin',
    'PATCH',
    body,
    'Falha ao atualizar o estado de pausa da zona',
  );

export const runZoneActivationCheck = (adminActor: string, zoneId: string) =>
  jsonMutation<ZoneMutationPayload>(
    adminActor,
    '/api/cfdns/zones-admin/activation-check',
    'POST',
    { zoneId },
    'Falha ao disparar a verificação de ativação da zona',
  );

export const patchDnssec = (adminActor: string, zoneId: string, patch: DnssecPatchInput) =>
  jsonMutation<DnssecPayload>(
    adminActor,
    '/api/cfdns/dnssec',
    'PATCH',
    { zoneId, ...patch },
    'Falha ao alterar o DNSSEC da zona',
  );

export const patchDnsSettings = (adminActor: string, zoneId: string, settings: DnsSettings) =>
  jsonMutation<DnsSettingsPayload>(
    adminActor,
    '/api/cfdns/dns-settings',
    'PATCH',
    { zoneId, settings },
    'Falha ao alterar as configurações DNS da zona',
  );

export const deleteRecord = async (adminActor: string, zoneId: string, recordId: string) => {
  const query = new URLSearchParams({
    zoneId,
    recordId,
  });
  const response = await fetch(`/api/cfdns/delete?${query.toString()}`, {
    method: 'DELETE',
    headers: {
      'X-Admin-Actor': adminActor,
    },
  });
  const payload = await parseApiPayload<MutationPayload>(response, 'Falha ao remover registro DNS');
  return { response, payload };
};
