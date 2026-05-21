/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  AlertTriangle,
  CalendarClock,
  Cloud,
  ExternalLink,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNotification } from '../../components/Notification';
import {
  classifyRegistrarWorkflowState,
  extractRegistrarWorkflowAction,
  shouldStopRegistrarPolling,
} from './registrarWorkflow';

type ZoneItem = {
  id: string;
  name: string;
};

type RegistrarRegistration = {
  domain_name: string;
  status: string;
  created_at: string | null;
  expires_at: string | null;
  auto_renew: boolean | null;
  privacy_mode: string | null;
  locked: boolean | null;
};

type RegistrarPricing = {
  currency: string;
  registration_cost: string;
  renewal_cost: string;
};

type RegistrarAvailability = {
  name: string;
  registrable: boolean;
  pricing: RegistrarPricing | null;
  reason: string | null;
  tier: string | null;
};

type RegistrarWorkflowStatus = {
  domain_name?: string;
  state?: string;
  completed?: boolean;
  created_at?: string;
  updated_at?: string;
  context?: Record<string, unknown>;
  error?: {
    code?: string;
    message?: string;
  };
  links?: {
    self?: string;
    resource?: string;
  };
};

type RegistrarAccount = {
  accountId?: string;
  accountName?: string | null;
  source?: string;
};

type RegistrarPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  account?: RegistrarAccount;
  registrations?: RegistrarRegistration[];
  pagination?: {
    count?: number;
    totalCount?: number;
  };
};

type RegistrarAvailabilityPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  account?: RegistrarAccount;
  domains?: RegistrarAvailability[];
  skipped?: string[];
};

type RegistrarWorkflowPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  account?: RegistrarAccount;
  status?: RegistrarWorkflowStatus;
  workflow_missing?: boolean;
};

type RegistrarSettingsPatch =
  | { kind: 'registration'; domain: string; label: string; auto_renew: boolean }
  | { kind: 'domain'; domain: string; label: string; locked?: boolean; privacy?: boolean };

type DnsRecord = {
  id?: string;
  type?: string;
  name?: string;
  content?: string;
  data?: Record<string, unknown>;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
  comment?: string;
  modified_on?: string;
};

type RecordsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  records?: DnsRecord[];
  pagination?: {
    page: number;
    perPage: number;
    totalPages: number;
    totalCount: number;
    count: number;
  };
};

type EditorDraft = {
  recordId: string;
  type: string;
  name: string;
  content: string;
  ttl: string;
  proxied: boolean;
  priority: string;
  comment: string;
  srvService: string;
  srvProto: string;
  srvName: string;
  srvPriority: string;
  srvWeight: string;
  srvPort: string;
  srvTarget: string;
  caaFlags: string;
  caaTag: string;
  caaValue: string;
  uriPriority: string;
  uriWeight: string;
  uriTarget: string;
  httpsPriority: string;
  httpsTarget: string;
  httpsValue: string;
};

const RECORD_TYPES = [
  'A',
  'AAAA',
  'CNAME',
  'TXT',
  'MX',
  'NS',
  'SRV',
  'CAA',
  'PTR',
  'TLSA',
  'NAPTR',
  'URI',
  'HTTPS',
  'SVCB',
];

const DEFAULT_DRAFT: EditorDraft = {
  recordId: '',
  type: 'A',
  name: '',
  content: '',
  ttl: '1',
  proxied: false,
  priority: '',
  comment: '',
  srvService: '_sip',
  srvProto: '_tcp',
  srvName: '',
  srvPriority: '10',
  srvWeight: '10',
  srvPort: '443',
  srvTarget: '',
  caaFlags: '0',
  caaTag: 'issue',
  caaValue: '',
  uriPriority: '10',
  uriWeight: '1',
  uriTarget: '',
  httpsPriority: '1',
  httpsTarget: '.',
  httpsValue: '',
};

const parseApiPayload = async <T,>(response: Response, fallback: string): Promise<T> => {
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

const withReq = (message: string, payload?: { request_id?: string }) => {
  if (payload?.request_id) {
    return `${message} (req ${payload.request_id})`;
  }
  return message;
};

const toTtlValue = (raw: string) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.trunc(parsed);
};

const toPriorityValue = (raw: string) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.trunc(parsed);
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateTimeFull = (value?: string) => {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('pt-BR');
};

const formatRegistrarDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getDaysUntil = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Math.ceil((parsed.getTime() - Date.now()) / 86_400_000);
};

const formatRegistrarBoolean = (value: boolean | null, trueLabel: string, falseLabel: string) => {
  if (value == null) {
    return '—';
  }

  return value ? trueLabel : falseLabel;
};

const formatRegistrarPrice = (pricing?: RegistrarPricing | null) => {
  if (!pricing) {
    return '—';
  }

  const currency = pricing.currency || 'USD';
  const registration = pricing.registration_cost || '—';
  const renewal = pricing.renewal_cost || '—';
  return `${currency} ${registration} / renova ${renewal}`;
};

const formatRegistrarReason = (reason?: string | null) => {
  if (!reason) {
    return '—';
  }

  const labels: Record<string, string> = {
    domain_premium: 'premium',
    domain_unavailable: 'indisponível',
    extension_disallows_registration: 'TLD bloqueado',
    extension_not_supported: 'TLD não suportado',
    extension_not_supported_via_api: 'só via dashboard',
  };
  return labels[reason] ?? reason;
};

const formatWorkflowState = (status?: RegistrarWorkflowStatus | null) => {
  if (!status) {
    return '—';
  }

  const state = status.state ?? '—';
  if (status.error?.message) {
    return `${state}: ${status.error.message}`;
  }
  return state;
};

const normalizeDomainInput = (value: string) => value.trim().toLowerCase();

const splitRegistrarExtensions = (value: string) =>
  value
    .split(',')
    .map((extension) => extension.trim().replace(/^\./, '').toLowerCase())
    .filter(Boolean);

const splitRegistrarDomains = (value: string) =>
  value
    .split(/[,\s]+/)
    .map(normalizeDomainInput)
    .filter((domain) => domain.includes('.') && !domain.startsWith('.') && !domain.includes('..'));

const toIntOrFallback = (raw: string, fallback: number) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.trunc(parsed);
};

type HttpsSvcbValidation = {
  normalized: string;
  tokens: string[];
  issues: string[];
  hints: string[];
};

type UriValidation = {
  normalized: string;
  issues: string[];
  hints: string[];
};

type CaaValidation = {
  issues: string[];
  hints: string[];
};

type CommonRecordValidation = {
  issues: string[];
  hints: string[];
};

type DnsOperationalAlert = {
  code: string;
  cause: string;
  action: string;
};

const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_REGEX = /^([0-9a-f]{1,4}:){1,7}[0-9a-f]{1,4}$|^::$|^(([0-9a-f]{1,4}:){1,7}:)$|^(:(:[0-9a-f]{1,4}){1,7})$/i;
const HOSTNAME_REGEX = /^(?:\*\.)?(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?:\.(?!-)[a-z0-9-]{1,63})*\.?$/i;

const parseHttpsSvcbValue = (value: string): HttpsSvcbValidation => {
  const normalized = value.trim().replace(/\s+/g, ' ');

  if (!normalized) {
    return {
      normalized,
      tokens: [],
      issues: ['Parâmetro value está vazio.'],
      hints: ['Exemplo: alpn=h3,h2 port=443 ipv4hint=203.0.113.10'],
    };
  }

  const tokens = normalized.split(' ').filter(Boolean);
  const issues: string[] = [];
  const hints: string[] = [];

  for (const token of tokens) {
    if (!token.includes('=')) {
      issues.push(`Token inválido "${token}" (esperado chave=valor).`);
      continue;
    }

    const splitIndex = token.indexOf('=');
    const key = token.slice(0, splitIndex).trim().toLowerCase();
    const rawVal = token.slice(splitIndex + 1).trim();

    if (!key || !rawVal) {
      issues.push(`Token incompleto "${token}".`);
      continue;
    }

    if (key === 'alpn') {
      const alpns = rawVal
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (alpns.length === 0) {
        issues.push('alpn deve conter ao menos um protocolo (ex.: h2,h3).');
      }
      continue;
    }

    if (key === 'port') {
      const port = Number(rawVal);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        issues.push(`port inválido em "${token}" (use 1-65535).`);
      }
      continue;
    }

    if (key === 'ipv4hint') {
      const ips = rawVal
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (ips.length === 0 || ips.some((ip) => !IPV4_REGEX.test(ip))) {
        issues.push(`ipv4hint inválido em "${token}".`);
      }
      continue;
    }

    if (key === 'ipv6hint') {
      const ips = rawVal
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (ips.length === 0 || ips.some((ip) => !IPV6_REGEX.test(ip))) {
        issues.push(`ipv6hint inválido em "${token}".`);
      }
      continue;
    }

    if (key === 'ech') {
      if (!/^[A-Za-z0-9+/=_-]+$/.test(rawVal)) {
        issues.push('ech deve estar em formato base64/base64url.');
      }
      continue;
    }

    hints.push(`Parâmetro custom "${key}" detectado. Verifique compatibilidade no provider.`);
  }

  return {
    normalized,
    tokens,
    issues,
    hints,
  };
};

const parseUriTarget = (value: string): UriValidation => {
  const normalized = value.trim();
  const issues: string[] = [];
  const hints: string[] = [];

  if (!normalized) {
    issues.push('URI target está vazio.');
    hints.push('Exemplo: https://api.exemplo.com/.well-known/path');
    return { normalized, issues, hints };
  }

  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:', 'mailto:', 'sip:', 'sips:'].includes(parsed.protocol)) {
      issues.push(`URI scheme não usual (${parsed.protocol}).`);
    }
  } catch {
    issues.push('URI target não está em formato de URL/URI válido.');
  }

  if (normalized.length > 1024) {
    issues.push('URI target excede limite recomendado de tamanho (1024).');
  }

  return { normalized, issues, hints };
};

const parseCaaDraft = (flagsRaw: string, tagRaw: string, valueRaw: string): CaaValidation => {
  const issues: string[] = [];
  const hints: string[] = [];

  const flags = Number(flagsRaw);
  const tag = tagRaw.trim().toLowerCase();
  const value = valueRaw.trim();

  if (!Number.isInteger(flags) || flags < 0 || flags > 255) {
    issues.push('CAA flags deve ser inteiro entre 0 e 255.');
  }

  if (!['issue', 'issuewild', 'iodef'].includes(tag)) {
    issues.push('CAA tag deve ser issue, issuewild ou iodef.');
  }

  if (!value) {
    issues.push('CAA value é obrigatório.');
  }

  if (tag === 'iodef' && value && !/^mailto:|^https?:\/\//i.test(value)) {
    issues.push('CAA iodef recomenda value iniciando com mailto: ou http(s)://.');
  }

  if ((tag === 'issue' || tag === 'issuewild') && value === ';') {
    hints.push('CAA value ";" desautoriza emissão de certificados para este escopo.');
  }

  return { issues, hints };
};

const parseCommonRecordDraft = (
  typeRaw: string,
  nameRaw: string,
  contentRaw: string,
  priorityRaw: string,
  proxied: boolean = false,
): CommonRecordValidation => {
  const issues: string[] = [];
  const hints: string[] = [];
  const type = typeRaw.trim().toUpperCase();
  const name = nameRaw.trim();
  const content = contentRaw.trim();

  if (!name) {
    issues.push('Nome do registro é obrigatório.');
  } else if (!HOSTNAME_REGEX.test(name) && name !== '@') {
    issues.push('Nome do registro parece inválido para DNS.');
  }

  // Registros proxied são gerenciados pela Cloudflare, validação dispensada
  if (proxied) {
    return { issues, hints };
  }

  if (!content) {
    issues.push('Conteúdo do registro é obrigatório.');
    return { issues, hints };
  }

  if (type === 'A' && !IPV4_REGEX.test(content)) {
    issues.push('Registro A exige IPv4 válido no conteúdo.');
  }

  if (type === 'AAAA' && !IPV6_REGEX.test(content)) {
    issues.push('Registro AAAA exige IPv6 válido no conteúdo.');
  }

  if (type === 'CNAME') {
    if (content === '@') {
      issues.push('CNAME não deve apontar para @.');
    }
    if (!HOSTNAME_REGEX.test(content)) {
      issues.push('CNAME exige hostname válido no conteúdo.');
    }
  }

  if (type === 'MX') {
    if (!HOSTNAME_REGEX.test(content)) {
      issues.push('MX exige hostname válido no conteúdo.');
    }
    const mxPriority = Number(priorityRaw);
    if (!Number.isInteger(mxPriority) || mxPriority < 0 || mxPriority > 65535) {
      issues.push('MX exige prioridade entre 0 e 65535.');
    }
  }

  if (type === 'TXT' && content.length > 2048) {
    hints.push('TXT muito extenso; verifique necessidade de quebra em múltiplos registros.');
  }

  return { issues, hints };
};

const formatRecordContent = (record: DnsRecord) => {
  const rawContent = String(record.content ?? '').trim();
  if (rawContent) {
    return rawContent;
  }

  const data = record.data;
  if (data && typeof data === 'object') {
    if (String(record.type ?? '').toUpperCase() === 'SRV') {
      const service = String(data.service ?? '').trim();
      const proto = String(data.proto ?? '').trim();
      const name = String(data.name ?? '').trim();
      const priority = String(data.priority ?? '').trim();
      const weight = String(data.weight ?? '').trim();
      const port = String(data.port ?? '').trim();
      const target = String(data.target ?? '').trim();
      return `${service}.${proto}.${name} ${priority} ${weight} ${port} ${target}`.trim();
    }

    if (String(record.type ?? '').toUpperCase() === 'CAA') {
      const flags = String(data.flags ?? '').trim();
      const tag = String(data.tag ?? '').trim();
      const value = String(data.value ?? '').trim();
      return `${flags} ${tag} "${value}"`.trim();
    }

    if (String(record.type ?? '').toUpperCase() === 'URI') {
      const priority = String(data.priority ?? '').trim();
      const weight = String(data.weight ?? '').trim();
      const target = String(data.target ?? '').trim();
      return `${priority} ${weight} "${target}"`.trim();
    }

    if (String(record.type ?? '').toUpperCase() === 'HTTPS' || String(record.type ?? '').toUpperCase() === 'SVCB') {
      const priority = String(data.priority ?? '').trim();
      const target = String(data.target ?? '').trim();
      const value = String(data.value ?? '').trim();
      return `${priority} ${target} ${value}`.trim();
    }

    try {
      return JSON.stringify(data);
    } catch {
      return 'dados estruturados';
    }
  }

  return '—';
};

export function CfDnsModule() {
  const { showNotification } = useNotification();
  const [adminActor] = useState('admin@app.lcv');

  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [registrarRegistrations, setRegistrarRegistrations] = useState<RegistrarRegistration[]>([]);
  const [registrarAccount, setRegistrarAccount] = useState<RegistrarAccount | null>(null);
  const [registrarLoading, setRegistrarLoading] = useState(false);
  const [registrarError, setRegistrarError] = useState('');
  const [registrarQuery, setRegistrarQuery] = useState('');
  const [registrarExtensions, setRegistrarExtensions] = useState('com,net,org,app,dev,cloud,tech,online');
  const [registrarYears, setRegistrarYears] = useState('1');
  const [registrarCreateAutoRenew, setRegistrarCreateAutoRenew] = useState(true);
  const [registrarCreatePrivacyMode, setRegistrarCreatePrivacyMode] = useState<'redaction' | 'off'>('redaction');
  const [registrarSearchResults, setRegistrarSearchResults] = useState<RegistrarAvailability[]>([]);
  const [registrarCheckResults, setRegistrarCheckResults] = useState<RegistrarAvailability[]>([]);
  const [registrarLookupLoading, setRegistrarLookupLoading] = useState(false);
  const [registrarActionLoading, setRegistrarActionLoading] = useState('');
  const [registrarRegistrationStatus, setRegistrarRegistrationStatus] = useState<RegistrarWorkflowStatus | null>(null);
  const [registrarUpdateStatus, setRegistrarUpdateStatus] = useState<RegistrarWorkflowStatus | null>(null);
  const [pendingRegistrarCreate, setPendingRegistrarCreate] = useState<RegistrarAvailability | null>(null);
  const [pendingRegistrarSettings, setPendingRegistrarSettings] = useState<RegistrarSettingsPatch | null>(null);

  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [selectedZoneName, setSelectedZoneName] = useState('');

  // Codex P2: domínio do auto-poll de registro ativo. O poll só escreve em
  // `registrarRegistrationStatus` enquanto esta ref bater com o seu domínio;
  // `handleZoneChange` a limpa, evitando que o status de um domínio antigo
  // sobrescreva o painel de uma zona recém-selecionada.
  const registrationPollDomainRef = useRef('');

  const [filterType, setFilterType] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(100);

  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 100,
    totalPages: 1,
    totalCount: 0,
    count: 0,
  });

  const [draft, setDraft] = useState<EditorDraft>(DEFAULT_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [pendingSaveConfirm, setPendingSaveConfirm] = useState(false);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<DnsRecord | null>(null);

  const isEditing = Boolean(draft.recordId);
  const isSrvDraft = draft.type === 'SRV';
  const isCaaDraft = draft.type === 'CAA';
  const isUriDraft = draft.type === 'URI';
  const isHttpsDraft = draft.type === 'HTTPS' || draft.type === 'SVCB';
  const isProxyValidated = draft.proxied;

  const httpsValidation = useMemo(() => {
    if (!isHttpsDraft) {
      return {
        normalized: '',
        tokens: [],
        issues: [],
        hints: [],
      } satisfies HttpsSvcbValidation;
    }
    return parseHttpsSvcbValue(draft.httpsValue);
  }, [draft.httpsValue, isHttpsDraft]);

  const uriValidation = useMemo(() => {
    if (!isUriDraft) {
      return {
        normalized: '',
        issues: [],
        hints: [],
      } satisfies UriValidation;
    }
    return parseUriTarget(draft.uriTarget);
  }, [draft.uriTarget, isUriDraft]);

  const caaValidation = useMemo(() => {
    if (!isCaaDraft) {
      return { issues: [], hints: [] } satisfies CaaValidation;
    }
    return parseCaaDraft(draft.caaFlags, draft.caaTag, draft.caaValue);
  }, [draft.caaFlags, draft.caaTag, draft.caaValue, isCaaDraft]);

  const commonValidation = useMemo(() => {
    if (isSrvDraft || isCaaDraft || isUriDraft || isHttpsDraft) {
      return { issues: [], hints: [] } satisfies CommonRecordValidation;
    }
    return parseCommonRecordDraft(draft.type, draft.name, draft.content, draft.priority, draft.proxied);
  }, [
    draft.type,
    draft.name,
    draft.content,
    draft.priority,
    draft.proxied,
    isSrvDraft,
    isCaaDraft,
    isUriDraft,
    isHttpsDraft,
  ]);

  const registrarByDomain = useMemo(() => {
    const map = new Map<string, RegistrarRegistration>();
    for (const registration of registrarRegistrations) {
      const domain = String(registration.domain_name ?? '')
        .trim()
        .toLowerCase();
      if (domain) {
        map.set(domain, registration);
      }
    }
    return map;
  }, [registrarRegistrations]);

  const registrarCheckByDomain = useMemo(() => {
    const map = new Map<string, RegistrarAvailability>();
    for (const domain of registrarCheckResults) {
      if (domain.name) {
        map.set(domain.name, domain);
      }
    }
    return map;
  }, [registrarCheckResults]);

  const registrarSuggestionRows = useMemo(() => {
    const rows = registrarSearchResults.length > 0 ? registrarSearchResults : registrarCheckResults;
    const seen = new Set<string>();
    return rows.filter((domain) => {
      if (!domain.name || seen.has(domain.name)) {
        return false;
      }
      seen.add(domain.name);
      return true;
    });
  }, [registrarCheckResults, registrarSearchResults]);

  const selectedRegistration = useMemo(() => {
    const domain = selectedZoneName.trim().toLowerCase();
    if (!domain) {
      return null;
    }
    return registrarByDomain.get(domain) ?? null;
  }, [registrarByDomain, selectedZoneName]);

  const registeredZoneCount = useMemo(
    () => zones.filter((zone) => registrarByDomain.has(zone.name.trim().toLowerCase())).length,
    [registrarByDomain, zones],
  );

  const selectedRegistrationDaysUntilExpiry = useMemo(
    () => getDaysUntil(selectedRegistration?.expires_at),
    [selectedRegistration?.expires_at],
  );

  const registrarDashboardUrl = useMemo(() => {
    const accountId = String(registrarAccount?.accountId ?? '').trim();
    if (!accountId) {
      return '';
    }
    return `https://dash.cloudflare.com/${accountId}/domains/registrations`;
  }, [registrarAccount?.accountId]);

  const zoneContextLabel = useMemo(() => {
    const zoneName = selectedZoneName.trim();
    if (zoneName) {
      return zoneName;
    }

    const zoneId = selectedZoneId.trim();
    if (zoneId) {
      return `zone_id:${zoneId}`;
    }

    return 'não selecionada';
  }, [selectedZoneId, selectedZoneName]);

  const operationalAlerts = useMemo<DnsOperationalAlert[]>(() => {
    const next: DnsOperationalAlert[] = [];

    // Alerta de zona é sempre visível — independe de formulário aberto
    if (!selectedZoneId) {
      next.push({
        code: 'CFDNS-ZONE-MISSING',
        cause: 'Nenhuma zona está selecionada para operar DNS.',
        action: 'Selecione um domínio em "Domínio / Zona" para habilitar leitura e alteração de registros.',
      });
    }

    // Alertas de validação do draft só aparecem quando o formulário de criação/edição está ativo.
    // Em repouso, o draft contém valores padrão vazios (type=A, name='', content='') que
    // gerariam falsos positivos (e.g. CFDNS-A-INVALID) sem interação do usuário.
    const isDraftActive = showRecordForm || isEditing;
    if (!isDraftActive) {
      return next;
    }

    if (!isProxyValidated && draft.ttl && draft.ttl !== '1') {
      const ttl = Number(draft.ttl);
      if (Number.isFinite(ttl) && ttl > 0 && ttl < 300) {
        next.push({
          code: 'CFDNS-TTL-LOW',
          cause: `TTL configurado em ${ttl}s, abaixo do recomendado para estabilidade operacional na zona ${zoneContextLabel}.`,
          action: `Use TTL >= 300s para reduzir flapping de cache na zona ${zoneContextLabel}, salvo quando houver necessidade real de propagação rápida.`,
        });
      }
    }

    if (!isProxyValidated && draft.type === 'MX' && !draft.priority.trim()) {
      next.push({
        code: 'CFDNS-MX-PRIORITY-MISSING',
        cause: `Registro MX sem valor de prioridade na zona ${zoneContextLabel}.`,
        action: `Informe prioridade (0-65535) para ordenar servidores de e-mail corretamente na zona ${zoneContextLabel}.`,
      });
    }

    if (!isProxyValidated && isSrvDraft) {
      if (!draft.srvService.trim() || !draft.srvProto.trim() || !draft.srvTarget.trim() || !draft.srvPort.trim()) {
        next.push({
          code: 'CFDNS-SRV-REQUIRED-FIELDS',
          cause: `Registro SRV sem um ou mais campos obrigatórios (service/proto/port/target) na zona ${zoneContextLabel}.`,
          action: `Preencha todos os campos essenciais do SRV antes de salvar na zona ${zoneContextLabel}.`,
        });
      }
    }

    if (!isProxyValidated && isCaaDraft && (!draft.caaTag.trim() || !draft.caaValue.trim())) {
      next.push({
        code: 'CFDNS-CAA-REQUIRED-FIELDS',
        cause: `Registro CAA sem tag e/ou value na zona ${zoneContextLabel}.`,
        action: `Preencha tag e value para definir corretamente a política de emissão de certificados na zona ${zoneContextLabel}.`,
      });
    }

    if (!isProxyValidated && isCaaDraft && caaValidation.issues.length > 0) {
      for (const issue of caaValidation.issues) {
        next.push({
          code: 'CFDNS-CAA-INVALID',
          cause: `${issue} Zona: ${zoneContextLabel}.`,
          action: `Corrija o(s) campo(s) CAA com erro e salve novamente na zona ${zoneContextLabel}.`,
        });
      }
    }

    if (!isProxyValidated && isUriDraft && !draft.uriTarget.trim()) {
      next.push({
        code: 'CFDNS-URI-TARGET-MISSING',
        cause: `Registro URI sem target na zona ${zoneContextLabel}.`,
        action: `Informe o target URI completo (ex.: https://servico.exemplo/rota) para a zona ${zoneContextLabel}.`,
      });
    }

    if (!isProxyValidated && isUriDraft && uriValidation.issues.length > 0) {
      for (const issue of uriValidation.issues) {
        next.push({
          code: 'CFDNS-URI-INVALID',
          cause: `${issue} Zona: ${zoneContextLabel}.`,
          action: `Ajuste o target URI para formato válido e salve novamente na zona ${zoneContextLabel}.`,
        });
      }
    }

    if (!isProxyValidated && isHttpsDraft && !draft.httpsValue.trim()) {
      next.push({
        code: 'CFDNS-HTTPS-VALUE-MISSING',
        cause: `${draft.type} sem parâmetros em value na zona ${zoneContextLabel}.`,
        action: `Informe parâmetros como alpn, port e hints de IP conforme o cenário na zona ${zoneContextLabel}.`,
      });
    }

    if (!isProxyValidated && isHttpsDraft && httpsValidation.issues.length > 0) {
      for (const issue of httpsValidation.issues) {
        next.push({
          code: 'CFDNS-HTTPS-SEMANTIC-INVALID',
          cause: `${issue} Zona: ${zoneContextLabel}.`,
          action: `Ajuste o parâmetro indicado em value para sintaxe chave=valor válida na zona ${zoneContextLabel}.`,
        });
      }
    }

    if (
      !isProxyValidated &&
      !isSrvDraft &&
      !isCaaDraft &&
      !isUriDraft &&
      !isHttpsDraft &&
      commonValidation.issues.length > 0
    ) {
      for (const issue of commonValidation.issues) {
        next.push({
          code: `CFDNS-${draft.type}-INVALID`,
          cause: `${issue} Zona: ${zoneContextLabel}.`,
          action: `Corrija o campo inválido do registro ${draft.type} antes de salvar na zona ${zoneContextLabel}.`,
        });
      }
    }

    return next;
  }, [
    showRecordForm,
    isEditing,
    draft.caaTag,
    draft.caaValue,
    draft.priority,
    draft.srvPort,
    draft.srvProto,
    draft.srvService,
    draft.srvTarget,
    draft.ttl,
    draft.type,
    draft.uriTarget,
    draft.httpsValue,
    caaValidation.issues,
    uriValidation.issues,
    httpsValidation.issues,
    commonValidation.issues,
    isCaaDraft,
    isHttpsDraft,
    isSrvDraft,
    isUriDraft,
    selectedZoneId,
    zoneContextLabel,
    isProxyValidated,
  ]);

  const statusTone = useMemo(() => {
    if (
      zonesLoading ||
      recordsLoading ||
      registrarLoading ||
      registrarLookupLoading ||
      registrarActionLoading ||
      saving ||
      deletingId
    ) {
      return 'warning';
    }
    if (!selectedZoneId) {
      return 'idle';
    }
    if (operationalAlerts.length > 0) {
      return 'warning';
    }
    return 'ok';
  }, [
    deletingId,
    operationalAlerts.length,
    recordsLoading,
    registrarActionLoading,
    registrarLoading,
    registrarLookupLoading,
    saving,
    selectedZoneId,
    zonesLoading,
  ]);

  const statusLabel = useMemo(() => {
    if (
      zonesLoading ||
      recordsLoading ||
      registrarLoading ||
      registrarLookupLoading ||
      registrarActionLoading ||
      saving ||
      deletingId
    ) {
      return 'Processando...';
    }
    if (!selectedZoneId) {
      return 'Aguardando domínio';
    }
    if (operationalAlerts.length > 0) {
      return `${operationalAlerts.length} alerta(s)`;
    }
    return 'Sincronizado';
  }, [
    deletingId,
    operationalAlerts.length,
    recordsLoading,
    registrarActionLoading,
    registrarLoading,
    registrarLookupLoading,
    saving,
    selectedZoneId,
    zonesLoading,
  ]);

  const resetDraft = () => {
    setDraft(DEFAULT_DRAFT);
  };

  const closeRecordForm = () => {
    resetDraft();
    setShowRecordForm(false);
  };

  const openNewRecordForm = () => {
    resetDraft();
    setShowRecordForm(true);
  };

  const hydrateDraftFromRecord = (record: DnsRecord) => {
    const recordData = record.data && typeof record.data === 'object' ? record.data : {};
    const recordType = String(record.type ?? 'A').toUpperCase();

    setDraft({
      recordId: String(record.id ?? ''),
      type: recordType,
      name: String(record.name ?? '').toLowerCase(),
      content: String(record.content ?? ''),
      ttl: String(record.ttl ?? 1),
      proxied: Boolean(record.proxied),
      priority: record.priority == null ? '' : String(record.priority),
      comment: String(record.comment ?? ''),
      srvService: String(recordData.service ?? '_sip').trim() || '_sip',
      srvProto: String(recordData.proto ?? '_tcp').trim() || '_tcp',
      srvName: String(recordData.name ?? '').trim(),
      srvPriority: String(recordData.priority ?? record.priority ?? 10).trim() || '10',
      srvWeight: String(recordData.weight ?? 10).trim() || '10',
      srvPort: String(recordData.port ?? 443).trim() || '443',
      srvTarget: String(recordData.target ?? '').trim(),
      caaFlags: String(recordData.flags ?? 0).trim() || '0',
      caaTag: String(recordData.tag ?? 'issue').trim() || 'issue',
      caaValue: String(recordData.value ?? '').trim(),
      uriPriority: String(recordData.priority ?? 10).trim() || '10',
      uriWeight: String(recordData.weight ?? 1).trim() || '1',
      uriTarget: String(recordData.target ?? '').trim(),
      httpsPriority: String(recordData.priority ?? 1).trim() || '1',
      httpsTarget: String(recordData.target ?? '.').trim() || '.',
      httpsValue: String(recordData.value ?? '').trim(),
    });
    setShowRecordForm(true);
  };

  const loadZones = useCallback(
    async (shouldNotify = false) => {
      setZonesLoading(true);
      try {
        const response = await fetch('/api/cfdns/zones', {
          headers: {
            'X-Admin-Actor': adminActor,
          },
        });
        const payload = await parseApiPayload<{
          ok: boolean;
          error?: string;
          request_id?: string;
          zones?: ZoneItem[];
        }>(response, 'Falha ao carregar domínios da Cloudflare');

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Falha ao carregar domínios da Cloudflare.');
        }

        const nextZones = Array.isArray(payload.zones) ? payload.zones : [];
        setZones(nextZones);

        const firstZone = nextZones[0];
        if (!selectedZoneId && firstZone) {
          setSelectedZoneId(firstZone.id);
          setSelectedZoneName(firstZone.name);
        }

        if (shouldNotify) {
          showNotification(withReq('Domínios DNS atualizados.', payload), 'success');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível carregar os domínios da Cloudflare.';
        showNotification(message, 'error');
      } finally {
        setZonesLoading(false);
      }
    },
    [adminActor, selectedZoneId, showNotification],
  );

  const loadRegistrarRegistrations = useCallback(
    async (shouldNotify = false) => {
      setRegistrarLoading(true);
      setRegistrarError('');
      try {
        const response = await fetch('/api/cfdns/registrar/registrations', {
          headers: {
            'X-Admin-Actor': adminActor,
          },
        });
        const payload = await parseApiPayload<RegistrarPayload>(response, 'Falha ao carregar Cloudflare Registrar');

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Falha ao carregar Cloudflare Registrar.');
        }

        const nextRegistrations = Array.isArray(payload.registrations) ? payload.registrations : [];
        setRegistrarAccount(payload.account ?? null);
        setRegistrarRegistrations(nextRegistrations);

        if (shouldNotify) {
          showNotification(withReq('Cloudflare Registrar atualizado.', payload), 'success');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível carregar Cloudflare Registrar.';
        setRegistrarError(message);
        showNotification(message, 'error');
      } finally {
        setRegistrarLoading(false);
      }
    },
    [adminActor, showNotification],
  );

  const searchRegistrarDomains = useCallback(async () => {
    const q = registrarQuery.trim();
    if (!q) {
      showNotification('Informe uma marca, termo ou domínio para buscar.', 'error');
      return;
    }

    setRegistrarLookupLoading(true);
    setRegistrarError('');
    try {
      const query = new URLSearchParams({
        q,
        limit: '20',
      });
      const extensions = splitRegistrarExtensions(registrarExtensions);
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

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao buscar domínios no Cloudflare Registrar.');
      }

      setRegistrarAccount(payload.account ?? registrarAccount);
      setRegistrarSearchResults(Array.isArray(payload.domains) ? payload.domains : []);
      setRegistrarCheckResults([]);
      showNotification(withReq('Busca Registrar concluída.', payload), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível buscar domínios no Registrar.';
      setRegistrarError(message);
      showNotification(message, 'error');
    } finally {
      setRegistrarLookupLoading(false);
    }
  }, [adminActor, registrarAccount, registrarExtensions, registrarQuery, showNotification]);

  const checkRegistrarDomains = useCallback(
    async (domainsOverride?: string[]) => {
      const domains = domainsOverride?.length
        ? domainsOverride.map(normalizeDomainInput).filter(Boolean)
        : splitRegistrarDomains(registrarQuery);

      if (domains.length === 0) {
        showNotification('Informe domínio(s) completo(s) para checagem.', 'error');
        return [];
      }

      setRegistrarLookupLoading(true);
      setRegistrarError('');
      try {
        const response = await fetch('/api/cfdns/registrar/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Actor': adminActor,
          },
          body: JSON.stringify({ domains: domains.slice(0, 20) }),
        });
        const payload = await parseApiPayload<RegistrarAvailabilityPayload>(
          response,
          'Falha ao checar disponibilidade no Cloudflare Registrar',
        );

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Falha ao checar disponibilidade no Cloudflare Registrar.');
        }

        const nextDomains = Array.isArray(payload.domains) ? payload.domains : [];
        const skippedDomains = Array.isArray(payload.skipped) ? payload.skipped : [];
        setRegistrarAccount(payload.account ?? registrarAccount);
        setRegistrarCheckResults(nextDomains);
        if (skippedDomains.length > 0) {
          showNotification(
            withReq(
              `Checagem concluída; ${skippedDomains.length} entrada(s) ignorada(s) por formato inválido: ${skippedDomains.join(', ')}.`,
              payload,
            ),
            'info',
          );
        } else {
          showNotification(withReq('Checagem Registrar concluída.', payload), 'success');
        }
        return nextDomains;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível checar domínios no Registrar.';
        setRegistrarError(message);
        showNotification(message, 'error');
        return [];
      } finally {
        setRegistrarLookupLoading(false);
      }
    },
    [adminActor, registrarAccount, registrarQuery, showNotification],
  );

  const loadRegistrarStatuses = useCallback(
    async (domainName: string, shouldNotify = false) => {
      const domain = normalizeDomainInput(domainName);
      if (!domain) {
        return;
      }

      setRegistrarActionLoading(`status:${domain}`);
      try {
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

        if (!registrationResponse.ok || !registrationPayload.ok) {
          throw new Error(registrationPayload.error ?? 'Falha ao consultar workflow de registro.');
        }
        if (!updateResponse.ok || !updatePayload.ok) {
          throw new Error(updatePayload.error ?? 'Falha ao consultar workflow de atualização.');
        }

        setRegistrarRegistrationStatus(registrationPayload.status ?? null);
        setRegistrarUpdateStatus(updatePayload.status ?? null);

        if (shouldNotify) {
          const missingWorkflows = registrationPayload.workflow_missing && updatePayload.workflow_missing;
          showNotification(
            withReq(
              missingWorkflows
                ? 'Nenhum workflow Registrar ativo para este domínio.'
                : 'Workflows Registrar atualizados.',
              updatePayload,
            ),
            missingWorkflows ? 'info' : 'success',
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível consultar workflows Registrar.';
        showNotification(message, 'error');
      } finally {
        setRegistrarActionLoading('');
      }
    },
    [adminActor, showNotification],
  );

  const pollRegistrarRegistrationStatus = useCallback(
    async (domainName: string) => {
      const domain = normalizeDomainInput(domainName);
      if (!domain) {
        return;
      }

      // Codex P2: marca este domínio como alvo do poll ativo.
      registrationPollDomainRef.current = domain;

      // Polling limitado pós-criação: o registro sempre inicia assíncrono
      // (Prefer: respond-async). Para nos estados que não avançam sozinhos.
      const MAX_POLLS = 6;
      const INTERVAL_MS = 3000;

      for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
        await new Promise((resolve) => {
          setTimeout(resolve, INTERVAL_MS);
        });

        try {
          const response = await fetch(
            `/api/cfdns/registrar/registration-status?domain=${encodeURIComponent(domain)}`,
            { headers: { 'X-Admin-Actor': adminActor } },
          );
          const payload = await parseApiPayload<RegistrarWorkflowPayload>(
            response,
            'Falha ao consultar workflow de registro',
          );

          if (!response.ok || !payload.ok) {
            break;
          }

          // Codex P2: se o operador trocou de zona durante o poll, não
          // sobrescreve o painel do domínio agora selecionado — encerra.
          if (registrationPollDomainRef.current !== domain) {
            break;
          }

          const status = payload.status ?? null;
          setRegistrarRegistrationStatus(status);

          if (status?.completed || shouldStopRegistrarPolling(status?.state)) {
            if (classifyRegistrarWorkflowState(status?.state) === 'succeeded') {
              await loadRegistrarRegistrations();
            }
            break;
          }
        } catch {
          // Polling é best-effort; o operador ainda pode usar o botão "Status".
          break;
        }
      }
    },
    [adminActor, loadRegistrarRegistrations],
  );

  const loadRecords = useCallback(
    async (zoneId: string, options?: { shouldNotify?: boolean; pageOverride?: number }) => {
      if (!zoneId) {
        setRecords([]);
        setPagination({
          page: 1,
          perPage,
          totalPages: 1,
          totalCount: 0,
          count: 0,
        });
        return;
      }

      const targetPage = options?.pageOverride ?? page;
      setRecordsLoading(true);
      try {
        const query = new URLSearchParams({
          zoneId,
          page: String(targetPage),
          perPage: String(perPage),
        });

        if (filterType) {
          query.set('type', filterType);
        }

        if (filterSearch.trim()) {
          query.set('search', filterSearch.trim().toLowerCase());
        }

        const response = await fetch(`/api/cfdns/records?${query.toString()}`, {
          headers: {
            'X-Admin-Actor': adminActor,
          },
        });

        const payload = await parseApiPayload<RecordsPayload>(response, 'Falha ao carregar registros DNS');

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Falha ao carregar registros DNS.');
        }

        const nextRecords = Array.isArray(payload.records) ? payload.records : [];
        setRecords(nextRecords);
        setPagination(
          payload.pagination ?? {
            page: targetPage,
            perPage,
            totalPages: 1,
            totalCount: nextRecords.length,
            count: nextRecords.length,
          },
        );

        if (options?.shouldNotify) {
          showNotification(withReq('Registros DNS atualizados.', payload), 'success');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível carregar os registros DNS da zona.';
        showNotification(message, 'error');
      } finally {
        setRecordsLoading(false);
      }
    },
    [adminActor, filterSearch, filterType, page, perPage, showNotification],
  );

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  useEffect(() => {
    void loadRegistrarRegistrations();
  }, [loadRegistrarRegistrations]);

  useEffect(() => {
    if (!selectedZoneId) {
      return;
    }

    void loadRecords(selectedZoneId);
  }, [loadRecords, selectedZoneId]);

  const handleZoneChange = (zoneId: string) => {
    const zone = zones.find((item) => item.id === zoneId);
    setSelectedZoneId(zoneId);
    setSelectedZoneName(zone?.name ?? '');
    setPage(1);
    // Codex P2: invalida qualquer auto-poll em andamento ao trocar de zona.
    registrationPollDomainRef.current = '';
    setRegistrarRegistrationStatus(null);
    setRegistrarUpdateStatus(null);
    resetDraft();
    setShowRecordForm(false);
  };

  const handleApplyFilters = () => {
    if (!selectedZoneId) {
      showNotification('Selecione um domínio antes de aplicar filtros.', 'error');
      return;
    }

    setPage(1);
    void loadRecords(selectedZoneId, { shouldNotify: true, pageOverride: 1 });
  };

  const handleRegistrarCheckFromSearch = (domainName: string) => {
    void checkRegistrarDomains([domainName]);
  };

  const handleRegistrarCreateRequest = (domain: RegistrarAvailability) => {
    const checked = registrarCheckByDomain.get(domain.name) ?? domain;
    if (!checked.registrable) {
      showNotification('Domínio não registrável pela API do Registrar.', 'error');
      return;
    }
    if (checked.tier === 'premium') {
      showNotification('Registro premium não é suportado pela API do Registrar.', 'error');
      return;
    }
    setPendingRegistrarCreate(checked);
  };

  const executeRegistrarCreate = async () => {
    const target = pendingRegistrarCreate;
    if (!target) {
      return;
    }

    setPendingRegistrarCreate(null);
    setRegistrarActionLoading(`create:${target.name}`);
    try {
      const freshCheck = await checkRegistrarDomains([target.name]);
      const checked = freshCheck.find((domain) => domain.name === target.name);
      if (!checked?.registrable || checked.tier === 'premium') {
        throw new Error('Checagem autoritativa bloqueou o registro. Domínio indisponível, premium ou não suportado.');
      }

      const response = await fetch('/api/cfdns/registrar/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({
          domain_name: target.name,
          years: toIntOrFallback(registrarYears, 1),
          auto_renew: registrarCreateAutoRenew,
          privacy_mode: registrarCreatePrivacyMode,
        }),
      });
      const payload = await parseApiPayload<RegistrarWorkflowPayload>(
        response,
        'Falha ao registrar domínio no Cloudflare Registrar',
      );

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao registrar domínio no Cloudflare Registrar.');
      }

      setRegistrarAccount(payload.account ?? registrarAccount);
      setRegistrarRegistrationStatus(payload.status ?? null);
      await loadRegistrarRegistrations();
      showNotification(withReq(`Workflow de registro iniciado para ${target.name}.`, payload), 'success');

      // O registro inicia assíncrono: acompanha o workflow até um estado
      // terminal sem exigir clique manual em "Status".
      if (!shouldStopRegistrarPolling(payload.status?.state)) {
        void pollRegistrarRegistrationStatus(target.name);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível registrar o domínio.';
      showNotification(message, 'error');
    } finally {
      setRegistrarActionLoading('');
    }
  };

  const queueRegistrarSettingsPatch = (patch: RegistrarSettingsPatch) => {
    if (!patch.domain) {
      showNotification('Selecione um domínio registrado.', 'error');
      return;
    }
    setPendingRegistrarSettings(patch);
  };

  const executeRegistrarSettingsPatch = async () => {
    const patch = pendingRegistrarSettings;
    if (!patch) {
      return;
    }

    setPendingRegistrarSettings(null);
    setRegistrarActionLoading(`settings:${patch.domain}`);
    try {
      const query = new URLSearchParams({ domain: patch.domain });

      if (patch.kind === 'registration') {
        // auto_renew passa pelo PATCH do workflow /registrar/registrations.
        const response = await fetch(`/api/cfdns/registrar/registration?${query.toString()}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Actor': adminActor,
          },
          body: JSON.stringify({ auto_renew: patch.auto_renew }),
        });
        const payload = await parseApiPayload<RegistrarWorkflowPayload>(
          response,
          'Falha ao atualizar Cloudflare Registrar',
        );

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Falha ao atualizar Cloudflare Registrar.');
        }

        setRegistrarUpdateStatus(payload.status ?? null);
        await loadRegistrarRegistrations();
        await loadRegistrarStatuses(patch.domain);
        showNotification(withReq(`${patch.label} aplicado em ${patch.domain}.`, payload), 'success');
        return;
      }

      // lock de transferência e privacidade WHOIS passam pelo PUT legado
      // /registrar/domains — o PATCH de registrations não aceita esses campos.
      const body: { locked?: boolean; privacy?: boolean } = {};
      if (typeof patch.locked === 'boolean') {
        body.locked = patch.locked;
      }
      if (typeof patch.privacy === 'boolean') {
        body.privacy = patch.privacy;
      }
      const response = await fetch(`/api/cfdns/registrar/domain?${query.toString()}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify(body),
      });
      const payload = await parseApiPayload<RegistrarPayload>(response, 'Falha ao atualizar domínio Registrar');

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao atualizar domínio Registrar.');
      }

      await loadRegistrarRegistrations();
      showNotification(withReq(`${patch.label} aplicado em ${patch.domain}.`, payload), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar Registrar.';
      showNotification(message, 'error');
    } finally {
      setRegistrarActionLoading('');
    }
  };

  const handleSaveRecord = async () => {
    if (!selectedZoneId) {
      showNotification('Selecione um domínio antes de salvar.', 'error');
      return;
    }

    if (!draft.type.trim() || !draft.name.trim()) {
      showNotification('Tipo e nome do registro são obrigatórios.', 'error');
      return;
    }

    if (!isProxyValidated && !isSrvDraft && !isCaaDraft && !isUriDraft && !isHttpsDraft && !draft.content.trim()) {
      showNotification('Conteúdo é obrigatório para este tipo de registro.', 'error');
      return;
    }

    if (
      !isProxyValidated &&
      isSrvDraft &&
      (!draft.srvService.trim() || !draft.srvProto.trim() || !draft.srvTarget.trim() || !draft.srvPort.trim())
    ) {
      showNotification('SRV exige service, proto, port e target.', 'error');
      return;
    }

    if (!isProxyValidated && isCaaDraft && (!draft.caaTag.trim() || !draft.caaValue.trim())) {
      showNotification('CAA exige tag e value.', 'error');
      return;
    }

    if (!isProxyValidated && isCaaDraft && caaValidation.issues.length > 0) {
      showNotification('CAA com valor inválido. Revise os campos antes de salvar.', 'error');
      return;
    }

    if (!isProxyValidated && isUriDraft && !draft.uriTarget.trim()) {
      showNotification('URI exige target.', 'error');
      return;
    }

    if (!isProxyValidated && isUriDraft && uriValidation.issues.length > 0) {
      showNotification('URI com target inválido. Revise o valor antes de salvar.', 'error');
      return;
    }

    if (!isProxyValidated && isHttpsDraft && !draft.httpsValue.trim()) {
      showNotification('HTTPS/SVCB exige parâmetros em value.', 'error');
      return;
    }

    if (!isProxyValidated && isHttpsDraft && httpsValidation.issues.length > 0) {
      showNotification('HTTPS/SVCB com value inválido. Revise os parâmetros antes de salvar.', 'error');
      return;
    }

    if (
      !isProxyValidated &&
      !isSrvDraft &&
      !isCaaDraft &&
      !isUriDraft &&
      !isHttpsDraft &&
      commonValidation.issues.length > 0
    ) {
      showNotification(`Registro ${draft.type} inválido. Revise os campos antes de salvar.`, 'error');
      return;
    }

    setPendingSaveConfirm(true);
    return;
  };

  const executeSaveRecord = async () => {
    setPendingSaveConfirm(false);
    const modeLabel = isEditing ? 'atualizar' : 'criar';

    setSaving(true);
    try {
      const recordData = isSrvDraft
        ? {
            service: draft.srvService.trim(),
            proto: draft.srvProto.trim(),
            name: draft.srvName.trim(),
            priority: toIntOrFallback(draft.srvPriority, 10),
            weight: toIntOrFallback(draft.srvWeight, 10),
            port: toIntOrFallback(draft.srvPort, 443),
            target: draft.srvTarget.trim(),
          }
        : isCaaDraft
          ? {
              flags: toIntOrFallback(draft.caaFlags, 0),
              tag: draft.caaTag.trim(),
              value: draft.caaValue.trim(),
            }
          : isUriDraft
            ? {
                priority: toIntOrFallback(draft.uriPriority, 10),
                weight: toIntOrFallback(draft.uriWeight, 1),
                target: draft.uriTarget.trim(),
              }
            : isHttpsDraft
              ? {
                  priority: toIntOrFallback(draft.httpsPriority, 1),
                  target: draft.httpsTarget.trim() || '.',
                  value: draft.httpsValue.trim(),
                }
              : null;

      const response = await fetch('/api/cfdns/upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({
          zoneId: selectedZoneId,
          recordId: draft.recordId || undefined,
          adminActor,
          record: {
            type: draft.type.trim().toUpperCase(),
            name: draft.name.trim().toLowerCase(),
            content: isSrvDraft || isCaaDraft || isUriDraft || isHttpsDraft ? '' : draft.content.trim(),
            data: recordData,
            ttl: toTtlValue(draft.ttl),
            proxied: draft.proxied,
            priority: isSrvDraft ? null : draft.priority.trim() ? toPriorityValue(draft.priority) : null,
            comment: draft.comment.trim() || null,
          },
        }),
      });

      const payload = await parseApiPayload<{
        ok: boolean;
        error?: string;
        request_id?: string;
      }>(response, 'Falha ao salvar registro DNS');

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `Falha ao ${modeLabel} registro DNS.`);
      }

      resetDraft();
      setShowRecordForm(false);
      await loadRecords(selectedZoneId, { pageOverride: page });
      showNotification(withReq(`Registro DNS ${isEditing ? 'atualizado' : 'criado'} com sucesso.`, payload), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : `Não foi possível ${modeLabel} o registro DNS.`;
      showNotification(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (record: DnsRecord) => {
    const recordId = String(record.id ?? '').trim();
    if (!selectedZoneId || !recordId) {
      showNotification('Registro inválido para exclusão.', 'error');
      return;
    }

    setPendingDeleteRecord(record);
  };

  const executeDeleteRecord = async () => {
    const record = pendingDeleteRecord;
    if (!record) return;
    setPendingDeleteRecord(null);

    const recordId = String(record.id ?? '').trim();
    if (!selectedZoneId || !recordId) {
      showNotification('Registro inválido para exclusão.', 'error');
      return;
    }

    setDeletingId(recordId);
    try {
      const query = new URLSearchParams({
        zoneId: selectedZoneId,
        recordId,
      });
      const response = await fetch(`/api/cfdns/delete?${query.toString()}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Actor': adminActor,
        },
      });

      const payload = await parseApiPayload<{
        ok: boolean;
        error?: string;
        request_id?: string;
      }>(response, 'Falha ao remover registro DNS');

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao remover registro DNS.');
      }

      if (draft.recordId === recordId) {
        closeRecordForm();
      }

      await loadRecords(selectedZoneId, { pageOverride: page });
      showNotification(withReq('Registro DNS removido com sucesso.', payload), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível remover o registro DNS.';
      showNotification(message, 'error');
    } finally {
      setDeletingId('');
    }
  };

  const renderRegistrarWorkflow = (label: string, status: RegistrarWorkflowStatus | null) => {
    const category = classifyRegistrarWorkflowState(status?.state);
    const action = extractRegistrarWorkflowAction(status?.context);

    return (
      <div className={`cfdns-registrar-workflow-item cfdns-registrar-workflow-item--${category}`}>
        <span>{label}</span>
        <strong>{formatWorkflowState(status)}</strong>
        <small>{formatDateTime(status?.updated_at)}</small>
        {category === 'action_required' ? (
          <small className="cfdns-registrar-workflow-note cfdns-registrar-workflow-note--alert">
            <AlertTriangle size={12} /> Ação necessária do usuário{action ? `: ${action}` : ''}. O workflow não avança
            sozinho.
          </small>
        ) : null}
        {category === 'blocked' ? (
          <small className="cfdns-registrar-workflow-note">
            Bloqueado por terceiro (registro do TLD ou registrar de origem). Pode resolver sem ação sua.
          </small>
        ) : null}
        {category === 'failed' ? (
          <small className="cfdns-registrar-workflow-note cfdns-registrar-workflow-note--alert">
            <AlertTriangle size={12} /> Workflow falhou. Revise o motivo antes de tentar novamente.
          </small>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <section className="detail-panel module-shell module-shell-cfdns">
        <div className="detail-header">
          <div className="detail-icon">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3>CF DNS — Gerenciamento de Zonas e Registros</h3>
          </div>
          <span className={`ops-status-chip ops-status-chip--${statusTone}`}>
            <span className="ops-status-chip__dot" />
            {statusLabel}
          </span>
        </div>

        {operationalAlerts.length > 0 && (
          <article className="integrity-banner integrity-banner--warning">
            <header className="integrity-banner__header">
              <AlertTriangle size={16} />
              <strong>Alertas operacionais do DNS</strong>
            </header>
            <ul className="integrity-banner__list">
              {operationalAlerts.map((alert) => (
                <li key={alert.code}>
                  <strong>{alert.code}</strong> · {alert.cause} Ação recomendada: {alert.action}
                </li>
              ))}
            </ul>
          </article>
        )}

        <article className="form-card">
          <div className="result-toolbar">
            <div>
              <h4>
                <RefreshCw size={16} /> Zona ativa e filtros
              </h4>
              <p className="field-hint">
                Selecione o domínio Cloudflare e filtre por tipo/nome para localizar registros rapidamente.
              </p>
            </div>
            <div className="inline-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => void loadZones(true)}
                disabled={zonesLoading || recordsLoading || saving}
              >
                {zonesLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                Atualizar domínios
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() =>
                  void loadRecords(selectedZoneId, {
                    shouldNotify: true,
                    pageOverride: page,
                  })
                }
                disabled={!selectedZoneId || recordsLoading || saving}
              >
                {recordsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                Atualizar registros
              </button>
            </div>
          </div>

          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="cfdns-zone">Domínio / Zona</label>
              <select
                id="cfdns-zone"
                name="cfDnsZone"
                value={selectedZoneId}
                onChange={(event) => handleZoneChange(event.target.value)}
                disabled={zonesLoading || recordsLoading || saving}
              >
                <option value="">Selecione um domínio...</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                    {registrarByDomain.has(zone.name.trim().toLowerCase()) ? ' · Registrar' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="cfdns-filter-type">Tipo de registro</label>
              <select
                id="cfdns-filter-type"
                name="cfDnsFilterType"
                value={filterType}
                onChange={(event) => setFilterType(event.target.value)}
                disabled={!selectedZoneId || recordsLoading}
              >
                <option value="">Todos</option>
                {RECORD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="cfdns-filter-search">Pesquisar por nome</label>
              <input
                id="cfdns-filter-search"
                name="cfDnsFilterSearch"
                type="text"
                autoComplete="off"
                placeholder="ex.: _acme-challenge, api, www"
                value={filterSearch}
                onChange={(event) => setFilterSearch(event.target.value.toLowerCase())}
                disabled={!selectedZoneId || recordsLoading}
              />
            </div>

            <div className="field-group">
              <label htmlFor="cfdns-zone-id">Zone ID</label>
              <input id="cfdns-zone-id" name="cfDnsZoneId" value={selectedZoneId} readOnly />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="primary-button"
              onClick={handleApplyFilters}
              disabled={!selectedZoneId || recordsLoading}
            >
              {recordsLoading ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
              Aplicar filtros
            </button>
          </div>
        </article>

        <article className="result-card cfdns-registrar-panel">
          <header className="result-header">
            <h4>
              <LockKeyhole size={16} /> Cloudflare Registrar
            </h4>
            <div className="inline-actions">
              <span>
                {registeredZoneCount}/{zones.length} zona(s) registradas · {registrarRegistrations.length} domínio(s)
              </span>
              <button
                type="button"
                className="ghost-button"
                onClick={() => void loadRegistrarRegistrations(true)}
                disabled={registrarLoading || Boolean(registrarActionLoading)}
              >
                {registrarLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                Atualizar Registrar
              </button>
              {registrarDashboardUrl ? (
                <a className="ghost-button" href={registrarDashboardUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  Dashboard
                </a>
              ) : null}
            </div>
          </header>

          {registrarError ? (
            <article className="integrity-banner integrity-banner--warning">
              <header className="integrity-banner__header">
                <AlertTriangle size={16} />
                <strong>Registrar indisponível</strong>
              </header>
              <p className="field-hint">{registrarError}</p>
            </article>
          ) : null}

          <div className="cfdns-registrar-controls">
            <div className="field-group cfdns-registrar-query">
              <label htmlFor="cfdns-registrar-query">Busca / checagem</label>
              <input
                id="cfdns-registrar-query"
                name="cfDnsRegistrarQuery"
                type="text"
                autoComplete="off"
                placeholder="marca, termo ou dominio.com"
                value={registrarQuery}
                onChange={(event) => setRegistrarQuery(event.target.value.toLowerCase())}
                disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="cfdns-registrar-extensions">TLDs</label>
              <input
                id="cfdns-registrar-extensions"
                name="cfDnsRegistrarExtensions"
                type="text"
                autoComplete="off"
                value={registrarExtensions}
                onChange={(event) => setRegistrarExtensions(event.target.value)}
                disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="cfdns-registrar-years">Anos</label>
              <input
                id="cfdns-registrar-years"
                name="cfDnsRegistrarYears"
                type="number"
                min={1}
                max={10}
                value={registrarYears}
                onChange={(event) => setRegistrarYears(event.target.value)}
                disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="cfdns-registrar-new-autorenew">Auto-renew inicial</label>
              <select
                id="cfdns-registrar-new-autorenew"
                name="cfDnsRegistrarNewAutoRenew"
                value={registrarCreateAutoRenew ? 'true' : 'false'}
                onChange={(event) => setRegistrarCreateAutoRenew(event.target.value === 'true')}
                disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="cfdns-registrar-new-privacy">Privacidade inicial</label>
              <select
                id="cfdns-registrar-new-privacy"
                name="cfDnsRegistrarNewPrivacy"
                value={registrarCreatePrivacyMode}
                onChange={(event) => setRegistrarCreatePrivacyMode(event.target.value as 'redaction' | 'off')}
                disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
              >
                <option value="redaction">redaction</option>
                <option value="off">off</option>
              </select>
            </div>

            <div className="cfdns-registrar-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => void searchRegistrarDomains()}
                disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
              >
                {registrarLookupLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                Buscar
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void checkRegistrarDomains()}
                disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
              >
                {registrarLookupLoading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
                Checar
              </button>
            </div>
          </div>

          {registrarSuggestionRows.length > 0 && (
            <div className="cfdns-table-wrap cfdns-registrar-table-wrap">
              <table className="cfdns-table cfdns-registrar-table">
                <thead>
                  <tr>
                    <th>Domínio</th>
                    <th>Disponível</th>
                    <th>Preço</th>
                    <th>Tier / razão</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {registrarSuggestionRows.map((domain) => {
                    const checked = registrarCheckByDomain.get(domain.name);
                    const effective = checked ?? domain;
                    const canRegister = Boolean(checked?.registrable && checked.tier !== 'premium');
                    const isCreating = registrarActionLoading === `create:${domain.name}`;

                    return (
                      <tr key={domain.name}>
                        <td>{domain.name}</td>
                        <td>
                          {checked ? (checked.registrable ? 'Sim' : 'Não') : domain.registrable ? 'Provável' : '—'}
                        </td>
                        <td>{formatRegistrarPrice(effective.pricing)}</td>
                        <td>
                          {effective.tier ?? '—'} / {formatRegistrarReason(effective.reason)}
                        </td>
                        <td>
                          <div className="cfdns-row-actions">
                            <button
                              type="button"
                              className="ghost-button cfrow-action-btn"
                              onClick={() => handleRegistrarCheckFromSearch(domain.name)}
                              disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
                            >
                              <ShieldCheck size={13} />
                              Checar
                            </button>
                            <button
                              type="button"
                              className="primary-button cfrow-action-btn"
                              onClick={() => handleRegistrarCreateRequest(domain)}
                              disabled={!canRegister || registrarLookupLoading || Boolean(registrarActionLoading)}
                            >
                              {isCreating ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
                              Registrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {registrarLoading ? (
            <p className="result-empty inline-loading-message">
              <Loader2 size={16} className="spin" /> Carregando Cloudflare Registrar...
            </p>
          ) : selectedRegistration ? (
            <>
              <div className="cfdns-registrar-grid">
                <div className="cfdns-registrar-item">
                  <span>Status</span>
                  <strong>{selectedRegistration.status || '—'}</strong>
                </div>
                <div className="cfdns-registrar-item">
                  <span>Expiração</span>
                  <strong>
                    <CalendarClock size={14} /> {formatRegistrarDate(selectedRegistration.expires_at)}
                  </strong>
                  {selectedRegistrationDaysUntilExpiry != null && (
                    <small>
                      {selectedRegistrationDaysUntilExpiry >= 0
                        ? `${selectedRegistrationDaysUntilExpiry} dia(s) restantes`
                        : `${Math.abs(selectedRegistrationDaysUntilExpiry)} dia(s) vencido`}
                    </small>
                  )}
                </div>
                <div className="cfdns-registrar-item">
                  <span>Auto-renew</span>
                  <strong>{formatRegistrarBoolean(selectedRegistration.auto_renew, 'Ativo', 'Inativo')}</strong>
                </div>
                <div className="cfdns-registrar-item">
                  <span>Privacidade</span>
                  <strong>{selectedRegistration.privacy_mode || '—'}</strong>
                </div>
                <div className="cfdns-registrar-item">
                  <span>Lock</span>
                  <strong>{formatRegistrarBoolean(selectedRegistration.locked, 'Bloqueado', 'Desbloqueado')}</strong>
                </div>
              </div>

              <div className="cfdns-registrar-actionbar">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    queueRegistrarSettingsPatch({
                      kind: 'registration',
                      domain: selectedRegistration.domain_name,
                      label: selectedRegistration.auto_renew ? 'Auto-renew desativado' : 'Auto-renew ativado',
                      auto_renew: !selectedRegistration.auto_renew,
                    })
                  }
                  disabled={Boolean(registrarActionLoading)}
                >
                  <RefreshCw size={16} />
                  {selectedRegistration.auto_renew ? 'Desativar auto-renew' : 'Ativar auto-renew'}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    queueRegistrarSettingsPatch({
                      kind: 'domain',
                      domain: selectedRegistration.domain_name,
                      label:
                        selectedRegistration.locked === true
                          ? 'Lock de transferência desativado'
                          : 'Lock de transferência ativado',
                      locked: selectedRegistration.locked !== true,
                    })
                  }
                  disabled={Boolean(registrarActionLoading)}
                >
                  <LockKeyhole size={16} />
                  {selectedRegistration.locked === true ? 'Desbloquear transferência' : 'Bloquear transferência'}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    queueRegistrarSettingsPatch({
                      kind: 'domain',
                      domain: selectedRegistration.domain_name,
                      label:
                        selectedRegistration.privacy_mode === 'redaction'
                          ? 'Privacidade WHOIS desativada'
                          : 'Privacidade WHOIS ativada',
                      privacy: selectedRegistration.privacy_mode !== 'redaction',
                    })
                  }
                  disabled={Boolean(registrarActionLoading)}
                >
                  <ShieldCheck size={16} />
                  {selectedRegistration.privacy_mode === 'redaction'
                    ? 'Desativar privacidade WHOIS'
                    : 'Ativar privacidade WHOIS'}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => void loadRegistrarStatuses(selectedRegistration.domain_name, true)}
                  disabled={Boolean(registrarActionLoading)}
                >
                  {registrarActionLoading === `status:${selectedRegistration.domain_name}` ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Status
                </button>
                {registrarDashboardUrl ? (
                  <a className="ghost-button" href={registrarDashboardUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} />
                    Renovar no dashboard
                  </a>
                ) : null}
              </div>

              <div className="cfdns-registrar-workflows">
                {renderRegistrarWorkflow('Registration workflow', registrarRegistrationStatus)}
                {renderRegistrarWorkflow('Update workflow', registrarUpdateStatus)}
              </div>
            </>
          ) : (
            <p className="result-empty">
              {selectedZoneName
                ? 'Zona sem registro ativo no Cloudflare Registrar.'
                : 'Selecione uma zona para cruzar DNS e Registrar.'}
            </p>
          )}

          {registrarRegistrations.length > 0 && (
            <div className="cfdns-table-wrap cfdns-registrar-table-wrap">
              <table className="cfdns-table cfdns-registrar-table">
                <thead>
                  <tr>
                    <th>Registrado</th>
                    <th>Status</th>
                    <th>Expira</th>
                    <th>Auto-renew</th>
                    <th>Lock</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {registrarRegistrations.map((registration) => {
                    const matchingZone = zones.find(
                      (zone) => zone.name.trim().toLowerCase() === registration.domain_name,
                    );

                    return (
                      <tr key={registration.domain_name}>
                        <td>{registration.domain_name}</td>
                        <td>{registration.status || '—'}</td>
                        <td>{formatRegistrarDate(registration.expires_at)}</td>
                        <td>{formatRegistrarBoolean(registration.auto_renew, 'Ativo', 'Inativo')}</td>
                        <td>{formatRegistrarBoolean(registration.locked, 'Bloqueado', 'Desbloqueado')}</td>
                        <td>
                          <div className="cfdns-row-actions">
                            <button
                              type="button"
                              className="ghost-button cfrow-action-btn"
                              onClick={() => {
                                if (matchingZone) {
                                  handleZoneChange(matchingZone.id);
                                }
                                void loadRegistrarStatuses(registration.domain_name, true);
                              }}
                              disabled={Boolean(registrarActionLoading)}
                            >
                              <RefreshCw size={13} />
                              Abrir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="result-card">
          <header className="result-header">
            <h4>
              <ShieldCheck size={16} /> Registros DNS da zona
            </h4>
            <div className="inline-actions">
              <span>
                {pagination.totalCount} registro(s) · página {pagination.page}/{pagination.totalPages}
              </span>
              <button
                type="button"
                className="primary-button"
                onClick={openNewRecordForm}
                disabled={!selectedZoneId || recordsLoading || saving}
              >
                <Plus size={16} />
                Novo Registro DNS
              </button>
            </div>
          </header>

          {!selectedZoneId ? (
            <p className="result-empty">Selecione um domínio para listar os registros DNS.</p>
          ) : recordsLoading ? (
            <p className="result-empty inline-loading-message">
              <Loader2 size={16} className="spin" /> Carregando registros DNS...
            </p>
          ) : records.length === 0 ? (
            <p className="result-empty">Nenhum registro encontrado com os filtros atuais.</p>
          ) : (
            <div className="cfdns-table-wrap">
              <table className="cfdns-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Nome</th>
                    <th>Conteúdo</th>
                    <th>TTL</th>
                    <th>Proxy</th>
                    <th>Atualizado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const recordId = String(record.id ?? '');
                    const isDeleting = deletingId === recordId;
                    const isSelected = recordId && draft.recordId === recordId;

                    return (
                      <Fragment key={recordId || `${record.type}-${record.name}-${record.content}`}>
                        <tr className={isSelected ? 'cfdns-row-selected' : ''}>
                          <td>{String(record.type ?? '').toUpperCase() || '—'}</td>
                          <td title={String(record.name ?? '')}>{String(record.name ?? '') || '—'}</td>
                          <td className="cfdns-cell-content" title={formatRecordContent(record)}>
                            {formatRecordContent(record)}
                          </td>
                          <td>
                            {record.ttl === 1 ? <span className="cfdns-ttl-auto">Auto</span> : (record.ttl ?? 'Auto')}
                          </td>
                          <td>
                            {record.proxied ? (
                              <span
                                className="cfdns-proxy-badge cfdns-proxy-badge--proxied"
                                title="Registro proxied — validação gerenciada pela Cloudflare"
                              >
                                <Cloud size={11} /> Proxied
                              </span>
                            ) : (
                              <span className="cfdns-proxy-badge cfdns-proxy-badge--dns">DNS only</span>
                            )}
                          </td>
                          <td title={formatDateTimeFull(record.modified_on)}>{formatDateTime(record.modified_on)}</td>
                          <td>
                            <div className="cfdns-row-actions">
                              <button
                                type="button"
                                className="ghost-button cfrow-action-btn"
                                onClick={() => hydrateDraftFromRecord(record)}
                                disabled={saving || isDeleting}
                              >
                                <Pencil size={13} />
                                Editar
                              </button>
                              <button
                                type="button"
                                className="ghost-button cfrow-action-btn"
                                onClick={() => void handleDeleteRecord(record)}
                                disabled={saving || isDeleting}
                              >
                                {isDeleting ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>

                        {showRecordForm && isSelected && isEditing ? (
                          <tr className="cfdns-inline-editor-row">
                            <td colSpan={7}>
                              <div className="cfdns-inline-editor">
                                <div className="cfdns-inline-editor__header">
                                  <strong>
                                    Editar registro {draft.type} {draft.name}
                                  </strong>
                                  <div className="cfdns-row-actions">
                                    <button
                                      type="button"
                                      className="ghost-button cfrow-action-btn"
                                      onClick={closeRecordForm}
                                      disabled={saving}
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      className="primary-button cfrow-action-btn"
                                      onClick={() => void handleSaveRecord()}
                                      disabled={saving || !selectedZoneId}
                                    >
                                      {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                                      Salvar
                                    </button>
                                  </div>
                                </div>

                                <div className="cfdns-inline-grid">
                                  <div className="field-group">
                                    <label htmlFor={`cfdns-inline-type-${recordId}`}>Tipo</label>
                                    <select
                                      id={`cfdns-inline-type-${recordId}`}
                                      value={draft.type}
                                      onChange={(event) => {
                                        const nextType = event.target.value.toUpperCase();
                                        setDraft((current) => ({
                                          ...current,
                                          type: nextType,
                                          proxied: current.proxied,
                                        }));
                                      }}
                                      disabled={saving}
                                    >
                                      {RECORD_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                          {type}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="field-group">
                                    <label htmlFor={`cfdns-inline-name-${recordId}`}>Nome</label>
                                    <input
                                      id={`cfdns-inline-name-${recordId}`}
                                      type="text"
                                      value={draft.name}
                                      onChange={(event) =>
                                        setDraft((current) => ({
                                          ...current,
                                          name: event.target.value.toLowerCase(),
                                        }))
                                      }
                                      disabled={saving}
                                    />
                                  </div>

                                  <div className="field-group">
                                    <label htmlFor={`cfdns-inline-ttl-${recordId}`}>TTL</label>
                                    <input
                                      id={`cfdns-inline-ttl-${recordId}`}
                                      type="number"
                                      min={1}
                                      max={86400}
                                      value={draft.ttl}
                                      onChange={(event) =>
                                        setDraft((current) => ({
                                          ...current,
                                          ttl: event.target.value,
                                        }))
                                      }
                                      disabled={saving}
                                    />
                                  </div>

                                  {!isSrvDraft && (
                                    <div className="field-group">
                                      <label htmlFor={`cfdns-inline-priority-${recordId}`}>Priority</label>
                                      <input
                                        id={`cfdns-inline-priority-${recordId}`}
                                        type="number"
                                        min={0}
                                        max={65535}
                                        value={draft.priority}
                                        onChange={(event) =>
                                          setDraft((current) => ({
                                            ...current,
                                            priority: event.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                      />
                                    </div>
                                  )}
                                </div>

                                {!isSrvDraft && !isCaaDraft && !isUriDraft && !isHttpsDraft && (
                                  <div className="field-group">
                                    <label htmlFor={`cfdns-inline-content-${recordId}`}>Conteúdo</label>
                                    <textarea
                                      id={`cfdns-inline-content-${recordId}`}
                                      className="json-textarea"
                                      rows={3}
                                      value={draft.content}
                                      onChange={(event) =>
                                        setDraft((current) => ({
                                          ...current,
                                          content: event.target.value,
                                        }))
                                      }
                                      disabled={saving}
                                    />
                                  </div>
                                )}

                                {isSrvDraft && (
                                  <div className="cfdns-inline-grid">
                                    <div className="field-group">
                                      <label htmlFor={`cfdns-inline-srv-service-${recordId}`}>Service</label>
                                      <input
                                        id={`cfdns-inline-srv-service-${recordId}`}
                                        value={draft.srvService}
                                        onChange={(event) =>
                                          setDraft((current) => ({
                                            ...current,
                                            srvService: event.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                      />
                                    </div>
                                    <div className="field-group">
                                      <label htmlFor={`cfdns-inline-srv-proto-${recordId}`}>Proto</label>
                                      <input
                                        id={`cfdns-inline-srv-proto-${recordId}`}
                                        value={draft.srvProto}
                                        onChange={(event) =>
                                          setDraft((current) => ({
                                            ...current,
                                            srvProto: event.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                      />
                                    </div>
                                    <div className="field-group">
                                      <label htmlFor={`cfdns-inline-srv-target-${recordId}`}>Target</label>
                                      <input
                                        id={`cfdns-inline-srv-target-${recordId}`}
                                        value={draft.srvTarget}
                                        onChange={(event) =>
                                          setDraft((current) => ({
                                            ...current,
                                            srvTarget: event.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                      />
                                    </div>
                                    <div className="field-group">
                                      <label htmlFor={`cfdns-inline-srv-port-${recordId}`}>Port</label>
                                      <input
                                        id={`cfdns-inline-srv-port-${recordId}`}
                                        type="number"
                                        value={draft.srvPort}
                                        onChange={(event) =>
                                          setDraft((current) => ({
                                            ...current,
                                            srvPort: event.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                      />
                                    </div>
                                  </div>
                                )}

                                {isCaaDraft && (
                                  <div className="cfdns-inline-grid">
                                    <div className="field-group">
                                      <label htmlFor={`cfdns-inline-caa-flags-${recordId}`}>Flags</label>
                                      <input
                                        id={`cfdns-inline-caa-flags-${recordId}`}
                                        type="number"
                                        min={0}
                                        max={255}
                                        value={draft.caaFlags}
                                        onChange={(event) =>
                                          setDraft((current) => ({
                                            ...current,
                                            caaFlags: event.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                      />
                                    </div>
                                    <div className="field-group">
                                      <label htmlFor={`cfdns-inline-caa-tag-${recordId}`}>Tag</label>
                                      <select
                                        id={`cfdns-inline-caa-tag-${recordId}`}
                                        value={draft.caaTag}
                                        onChange={(event) =>
                                          setDraft((current) => ({
                                            ...current,
                                            caaTag: event.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                      >
                                        <option value="issue">issue</option>
                                        <option value="issuewild">issuewild</option>
                                        <option value="iodef">iodef</option>
                                      </select>
                                    </div>
                                    <div className="field-group">
                                      <label htmlFor={`cfdns-inline-caa-value-${recordId}`}>Value</label>
                                      <input
                                        id={`cfdns-inline-caa-value-${recordId}`}
                                        value={draft.caaValue}
                                        onChange={(event) =>
                                          setDraft((current) => ({
                                            ...current,
                                            caaValue: event.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                      />
                                    </div>
                                  </div>
                                )}

                                {isUriDraft && (
                                  <div className="cfdns-inline-grid">
                                    <div className="field-group">
                                      <label htmlFor={`cfdns-inline-uri-priority-${recordId}`}>URI Priority</label>
                                      <input
                                        id={`cfdns-inline-uri-priority-${recordId}`}
                                        type="number"
                                        value={draft.uriPriority}
                                        onChange={(event) =>
                                          setDraft((current) => ({
                                            ...current,
                                            uriPriority: event.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                      />
                                    </div>
                                    <div className="field-group">
                                      <label htmlFor={`cfdns-inline-uri-weight-${recordId}`}>URI Weight</label>
                                      <input
                                        id={`cfdns-inline-uri-weight-${recordId}`}
                                        type="number"
                                        value={draft.uriWeight}
                                        onChange={(event) =>
                                          setDraft((current) => ({
                                            ...current,
                                            uriWeight: event.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                      />
                                    </div>
                                    <div className="field-group">
                                      <label htmlFor={`cfdns-inline-uri-target-${recordId}`}>URI Target</label>
                                      <input
                                        id={`cfdns-inline-uri-target-${recordId}`}
                                        value={draft.uriTarget}
                                        onChange={(event) =>
                                          setDraft((current) => ({
                                            ...current,
                                            uriTarget: event.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                      />
                                    </div>
                                  </div>
                                )}

                                {isHttpsDraft && (
                                  <div className="cfdns-inline-grid">
                                    <div className="field-group">
                                      <label htmlFor={`cfdns-inline-https-priority-${recordId}`}>
                                        {draft.type} Priority
                                      </label>
                                      <input
                                        id={`cfdns-inline-https-priority-${recordId}`}
                                        type="number"
                                        value={draft.httpsPriority}
                                        onChange={(event) =>
                                          setDraft((current) => ({
                                            ...current,
                                            httpsPriority: event.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                      />
                                    </div>
                                    <div className="field-group">
                                      <label htmlFor={`cfdns-inline-https-target-${recordId}`}>
                                        {draft.type} Target
                                      </label>
                                      <input
                                        id={`cfdns-inline-https-target-${recordId}`}
                                        value={draft.httpsTarget}
                                        onChange={(event) =>
                                          setDraft((current) => ({
                                            ...current,
                                            httpsTarget: event.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                      />
                                    </div>
                                    <div className="field-group">
                                      <label htmlFor={`cfdns-inline-https-value-${recordId}`}>{draft.type} Value</label>
                                      <input
                                        id={`cfdns-inline-https-value-${recordId}`}
                                        value={draft.httpsValue}
                                        onChange={(event) =>
                                          setDraft((current) => ({
                                            ...current,
                                            httpsValue: event.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="cfdns-inline-grid">
                                  <div className="field-group">
                                    <label htmlFor={`cfdns-inline-comment-${recordId}`}>Comentário</label>
                                    <input
                                      id={`cfdns-inline-comment-${recordId}`}
                                      type="text"
                                      value={draft.comment}
                                      onChange={(event) =>
                                        setDraft((current) => ({
                                          ...current,
                                          comment: event.target.value,
                                        }))
                                      }
                                      disabled={saving}
                                    />
                                  </div>
                                  <div className="field-group">
                                    <label htmlFor={`cfdns-inline-proxy-${recordId}`}>Proxy</label>
                                    <select
                                      id={`cfdns-inline-proxy-${recordId}`}
                                      value={draft.proxied ? 'true' : 'false'}
                                      onChange={(event) =>
                                        setDraft((current) => ({
                                          ...current,
                                          proxied: event.target.value === 'true',
                                        }))
                                      }
                                      disabled={saving}
                                    >
                                      <option value="false">DNS only</option>
                                      <option value="true">Proxied</option>
                                    </select>
                                  </div>
                                </div>

                                {draft.proxied ? (
                                  <p className="field-hint">
                                    Proxy laranja ativo: este registro passa a ser tratado como operacionalmente correto
                                    pelo painel, sem bloqueio por validação semântica.
                                  </p>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="cfdns-pagination">
              <button
                type="button"
                className="ghost-button"
                disabled={recordsLoading || page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Página anterior
              </button>
              <span>
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <button
                type="button"
                className="ghost-button"
                disabled={recordsLoading || page >= pagination.totalPages}
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
              >
                Próxima página
              </button>
            </div>
          )}
        </article>

        {showRecordForm && !isEditing && (
          <article className="form-card">
            <div className="result-toolbar">
              <div>
                <h4>
                  {isEditing ? <Pencil size={16} /> : <Plus size={16} />}{' '}
                  {isEditing ? 'Editar registro DNS' : 'Novo registro DNS'}
                </h4>
                <p className="field-hint">
                  Crie ou atualize registros com validações inteligentes e confirmação antes de salvar.
                </p>
              </div>
              <div className="inline-actions">
                <button type="button" className="ghost-button" onClick={resetDraft} disabled={saving || recordsLoading}>
                  <RefreshCw size={16} />
                  Limpar formulário
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={closeRecordForm}
                  disabled={saving || recordsLoading}
                >
                  <Trash2 size={16} />
                  Fechar formulário
                </button>
              </div>
            </div>

            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="cfdns-draft-type">Tipo</label>
                <select
                  id="cfdns-draft-type"
                  name="cfDnsDraftType"
                  value={draft.type}
                  onChange={(event) => {
                    const nextType = event.target.value.toUpperCase();
                    setDraft((current) => ({
                      ...current,
                      type: nextType,
                      proxied: current.proxied,
                    }));
                  }}
                  disabled={saving}
                >
                  {RECORD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="cfdns-draft-name">Nome do registro</label>
                <input
                  id="cfdns-draft-name"
                  name="cfDnsDraftName"
                  type="text"
                  autoComplete="off"
                  placeholder={selectedZoneName ? `ex.: api.${selectedZoneName}` : 'ex.: api.seudominio.com'}
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value.toLowerCase(),
                    }))
                  }
                  disabled={saving}
                />
              </div>
            </div>

            {!isSrvDraft && !isCaaDraft && !isUriDraft && !isHttpsDraft && (
              <div className="field-group">
                <label htmlFor="cfdns-draft-content">Conteúdo</label>
                <textarea
                  id="cfdns-draft-content"
                  name="cfDnsDraftContent"
                  className="json-textarea"
                  rows={4}
                  placeholder="ex.: 192.168.0.10, cname.exemplo.com, v=spf1 ..."
                  value={draft.content}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  disabled={saving}
                />
                {!isProxyValidated && commonValidation.issues.length > 0 && (
                  <p className="field-error" role="alert">
                    {commonValidation.issues[0]}
                  </p>
                )}
                {!isProxyValidated && commonValidation.hints.length > 0 && (
                  <p className="field-hint">{commonValidation.hints[0]}</p>
                )}
              </div>
            )}

            {isSrvDraft && (
              <>
                <div className="field-group">
                  <label htmlFor="cfdns-srv-service">SRV Service</label>
                  <input
                    id="cfdns-srv-service"
                    name="cfDnsSrvService"
                    type="text"
                    autoComplete="off"
                    placeholder="_sip"
                    value={draft.srvService}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        srvService: event.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </div>

                <div className="form-grid">
                  <div className="field-group">
                    <label htmlFor="cfdns-srv-proto">SRV Proto</label>
                    <input
                      id="cfdns-srv-proto"
                      name="cfDnsSrvProto"
                      type="text"
                      autoComplete="off"
                      placeholder="_tcp"
                      value={draft.srvProto}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          srvProto: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="cfdns-srv-name">SRV Name</label>
                    <input
                      id="cfdns-srv-name"
                      name="cfDnsSrvName"
                      type="text"
                      autoComplete="off"
                      placeholder="example.com"
                      value={draft.srvName}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          srvName: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="field-group">
                    <label htmlFor="cfdns-srv-priority">SRV Priority</label>
                    <input
                      id="cfdns-srv-priority"
                      name="cfDnsSrvPriority"
                      type="number"
                      min={0}
                      max={65535}
                      value={draft.srvPriority}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          srvPriority: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="cfdns-srv-weight">SRV Weight</label>
                    <input
                      id="cfdns-srv-weight"
                      name="cfDnsSrvWeight"
                      type="number"
                      min={0}
                      max={65535}
                      value={draft.srvWeight}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          srvWeight: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="field-group">
                    <label htmlFor="cfdns-srv-port">SRV Port</label>
                    <input
                      id="cfdns-srv-port"
                      name="cfDnsSrvPort"
                      type="number"
                      min={1}
                      max={65535}
                      value={draft.srvPort}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          srvPort: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="cfdns-srv-target">SRV Target</label>
                    <input
                      id="cfdns-srv-target"
                      name="cfDnsSrvTarget"
                      type="text"
                      autoComplete="off"
                      placeholder="sip.example.com"
                      value={draft.srvTarget}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          srvTarget: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </div>
                </div>
              </>
            )}

            {isCaaDraft && (
              <>
                <div className="form-grid">
                  <div className="field-group">
                    <label htmlFor="cfdns-caa-flags">CAA Flags</label>
                    <input
                      id="cfdns-caa-flags"
                      name="cfDnsCaaFlags"
                      type="number"
                      min={0}
                      max={255}
                      value={draft.caaFlags}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          caaFlags: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="cfdns-caa-tag">CAA Tag</label>
                    <select
                      id="cfdns-caa-tag"
                      name="cfDnsCaaTag"
                      value={draft.caaTag}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          caaTag: event.target.value,
                        }))
                      }
                      disabled={saving}
                    >
                      <option value="issue">issue</option>
                      <option value="issuewild">issuewild</option>
                      <option value="iodef">iodef</option>
                    </select>
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="cfdns-caa-value">CAA Value</label>
                  <input
                    id="cfdns-caa-value"
                    name="cfDnsCaaValue"
                    type="text"
                    autoComplete="off"
                    placeholder="letsencrypt.org"
                    value={draft.caaValue}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        caaValue: event.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                  {!isProxyValidated && isCaaDraft && caaValidation.issues.length > 0 && (
                    <p className="field-error" role="alert">
                      {caaValidation.issues[0]}
                    </p>
                  )}
                  {!isProxyValidated && isCaaDraft && caaValidation.hints.length > 0 && (
                    <p className="field-hint">{caaValidation.hints[0]}</p>
                  )}
                </div>
              </>
            )}

            {isUriDraft && (
              <>
                <div className="form-grid">
                  <div className="field-group">
                    <label htmlFor="cfdns-uri-priority">URI Priority</label>
                    <input
                      id="cfdns-uri-priority"
                      name="cfDnsUriPriority"
                      type="number"
                      min={0}
                      max={65535}
                      value={draft.uriPriority}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          uriPriority: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="cfdns-uri-weight">URI Weight</label>
                    <input
                      id="cfdns-uri-weight"
                      name="cfDnsUriWeight"
                      type="number"
                      min={0}
                      max={65535}
                      value={draft.uriWeight}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          uriWeight: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="cfdns-uri-target">URI Target</label>
                  <input
                    id="cfdns-uri-target"
                    name="cfDnsUriTarget"
                    type="text"
                    autoComplete="off"
                    placeholder="https://api.exemplo.com/.well-known"
                    value={draft.uriTarget}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        uriTarget: event.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                  {!isProxyValidated && isUriDraft && uriValidation.issues.length > 0 && (
                    <p className="field-error" role="alert">
                      {uriValidation.issues[0]}
                    </p>
                  )}
                  {!isProxyValidated && isUriDraft && uriValidation.hints.length > 0 && (
                    <p className="field-hint">{uriValidation.hints[0]}</p>
                  )}
                </div>
              </>
            )}

            {isHttpsDraft && (
              <>
                <div className="form-grid">
                  <div className="field-group">
                    <label htmlFor="cfdns-https-priority">{draft.type} Priority</label>
                    <input
                      id="cfdns-https-priority"
                      name="cfDnsHttpsPriority"
                      type="number"
                      min={0}
                      max={65535}
                      value={draft.httpsPriority}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          httpsPriority: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="cfdns-https-target">{draft.type} Target</label>
                    <input
                      id="cfdns-https-target"
                      name="cfDnsHttpsTarget"
                      type="text"
                      autoComplete="off"
                      placeholder="."
                      value={draft.httpsTarget}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          httpsTarget: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="cfdns-https-value">{draft.type} Value</label>
                  <input
                    id="cfdns-https-value"
                    name="cfDnsHttpsValue"
                    type="text"
                    autoComplete="off"
                    placeholder="alpn=h3,h2 port=443 ipv4hint=203.0.113.10"
                    value={draft.httpsValue}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        httpsValue: event.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                  {!isProxyValidated && isHttpsDraft && httpsValidation.issues.length > 0 && (
                    <p className="field-error" role="alert">
                      {httpsValidation.issues[0]}
                    </p>
                  )}
                  {!isProxyValidated && isHttpsDraft && httpsValidation.hints.length > 0 && (
                    <p className="field-hint">{httpsValidation.hints[0]}</p>
                  )}
                  {!isProxyValidated && isHttpsDraft && httpsValidation.tokens.length > 0 && (
                    <p className="field-hint">Tokens parseados: {httpsValidation.tokens.join(' | ')}</p>
                  )}
                </div>
              </>
            )}

            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="cfdns-draft-ttl">TTL</label>
                <input
                  id="cfdns-draft-ttl"
                  name="cfDnsDraftTtl"
                  type="number"
                  min={1}
                  max={86400}
                  placeholder="1 = auto"
                  value={draft.ttl}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      ttl: event.target.value,
                    }))
                  }
                  disabled={saving}
                />
              </div>

              {!isSrvDraft && (
                <div className="field-group">
                  <label htmlFor="cfdns-draft-priority">Priority (MX)</label>
                  <input
                    id="cfdns-draft-priority"
                    name="cfDnsDraftPriority"
                    type="number"
                    min={0}
                    max={65535}
                    value={draft.priority}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        priority: event.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
              )}
            </div>

            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="cfdns-draft-comment">Comentário</label>
                <input
                  id="cfdns-draft-comment"
                  name="cfDnsDraftComment"
                  type="text"
                  autoComplete="off"
                  placeholder="Observação opcional para operação"
                  value={draft.comment}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      comment: event.target.value,
                    }))
                  }
                  disabled={saving}
                />
              </div>

              <div className="field-group">
                <label htmlFor="cfdns-draft-proxied">Proxy Cloudflare</label>
                <select
                  id="cfdns-draft-proxied"
                  name="cfDnsDraftProxied"
                  value={draft.proxied ? 'true' : 'false'}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      proxied: event.target.value === 'true',
                    }))
                  }
                  disabled={saving}
                >
                  <option value="false">DNS only (cinza)</option>
                  <option value="true">Proxied (laranja)</option>
                </select>
              </div>
            </div>

            {draft.proxied ? (
              <p className="field-hint">
                Proxy laranja ativo: todo registro marcado como proxied passa a ser considerado correto pelo módulo,
                independentemente do tipo ou do conteúdo informado.
              </p>
            ) : null}

            <div className="form-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSaveRecord()}
                disabled={saving || !selectedZoneId}
              >
                {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                {isEditing ? 'Salvar alterações' : 'Criar registro'}
              </button>
            </div>
          </article>
        )}
      </section>

      {pendingRegistrarCreate &&
        createPortal(
          // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop — click dismisses; keyboard dismissal handled by Escape
          <div
            className="cleanup-confirm-overlay"
            onClick={() => setPendingRegistrarCreate(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setPendingRegistrarCreate(null);
            }}
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: event guard — isolates modal body from backdrop dismiss */}
            <div
              className="cleanup-confirm-modal"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <AlertTriangle size={32} className="cleanup-confirm-icon" />
              <h3>Registrar domínio</h3>
              <p>
                Confirma o registro billable de <strong>{pendingRegistrarCreate.name}</strong> por {registrarYears}{' '}
                ano(s), {formatRegistrarPrice(pendingRegistrarCreate.pricing)}?
                <br />
                Registros concluídos não são reembolsáveis.
              </p>
              <div className="cleanup-confirm-actions">
                <button
                  type="button"
                  className="cleanup-confirm-cancel"
                  onClick={() => setPendingRegistrarCreate(null)}
                >
                  Cancelar
                </button>
                <button type="button" className="cleanup-confirm-proceed" onClick={() => void executeRegistrarCreate()}>
                  Confirmar registro
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {pendingRegistrarSettings &&
        createPortal(
          // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop — click dismisses; keyboard dismissal handled by Escape
          <div
            className="cleanup-confirm-overlay"
            onClick={() => setPendingRegistrarSettings(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setPendingRegistrarSettings(null);
            }}
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: event guard — isolates modal body from backdrop dismiss */}
            <div
              className="cleanup-confirm-modal"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <AlertTriangle size={32} className="cleanup-confirm-icon" />
              <h3>Atualizar Registrar</h3>
              <p>
                Confirma <strong>{pendingRegistrarSettings.label}</strong> em{' '}
                <strong>{pendingRegistrarSettings.domain}</strong>?
              </p>
              <div className="cleanup-confirm-actions">
                <button
                  type="button"
                  className="cleanup-confirm-cancel"
                  onClick={() => setPendingRegistrarSettings(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="cleanup-confirm-proceed"
                  onClick={() => void executeRegistrarSettingsPatch()}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ── Confirm Modal DNS Save (substitui window.confirm) ── */}
      {pendingSaveConfirm &&
        createPortal(
          // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop — click dismisses; keyboard dismissal handled elsewhere
          <div
            className="cleanup-confirm-overlay"
            onClick={() => setPendingSaveConfirm(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setPendingSaveConfirm(false);
            }}
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: event guard — isolates modal body from backdrop dismiss */}
            <div
              className="cleanup-confirm-modal"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <AlertTriangle size={32} className="cleanup-confirm-icon" />
              <h3>{isEditing ? 'Atualizar registro DNS' : 'Criar registro DNS'}</h3>
              <p>
                Confirma a {isEditing ? 'atualização' : 'criação'} do registro{' '}
                <strong>
                  {draft.type} {draft.name}
                </strong>
                ?
              </p>
              <div className="cleanup-confirm-actions">
                <button type="button" className="cleanup-confirm-cancel" onClick={() => setPendingSaveConfirm(false)}>
                  Cancelar
                </button>
                <button type="button" className="cleanup-confirm-proceed" onClick={() => void executeSaveRecord()}>
                  Confirmar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ── Confirm Modal DNS Delete (substitui window.confirm) ── */}
      {pendingDeleteRecord &&
        createPortal(
          // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop — click dismisses; keyboard dismissal handled elsewhere
          <div
            className="cleanup-confirm-overlay"
            onClick={() => setPendingDeleteRecord(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setPendingDeleteRecord(null);
            }}
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: event guard — isolates modal body from backdrop dismiss */}
            <div
              className="cleanup-confirm-modal"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <AlertTriangle size={32} className="cleanup-confirm-icon" />
              <h3>Excluir registro DNS</h3>
              <p>
                Confirma a exclusão do registro{' '}
                <strong>
                  {String(pendingDeleteRecord?.type ?? '')} {String(pendingDeleteRecord?.name ?? '')}
                </strong>
                ?<br />
                Esta ação é irreversível.
              </p>
              <div className="cleanup-confirm-actions">
                <button type="button" className="cleanup-confirm-cancel" onClick={() => setPendingDeleteRecord(null)}>
                  Cancelar
                </button>
                <button type="button" className="cleanup-confirm-proceed" onClick={() => void executeDeleteRecord()}>
                  Confirmar exclusão
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
