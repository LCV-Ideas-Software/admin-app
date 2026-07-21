/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Funções puras de parsing/validação e formatação do módulo CF DNS.
 * Extraído de CfDnsModule.tsx sem mudança de comportamento.
 */

import type {
  AdvancedRecordFilters,
  CaaValidation,
  CommonRecordValidation,
  DnsRecord,
  EditorDraft,
  HttpsSvcbValidation,
  RegistrarPricing,
  RegistrarWorkflowStatus,
  StructuredDataValidation,
  UriValidation,
} from './types';

export const toTtlValue = (raw: string) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.trunc(parsed);
};

export const toPriorityValue = (raw: string) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.trunc(parsed);
};

export const formatDateTime = (value?: string) => {
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

export const formatDateTimeFull = (value?: string) => {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('pt-BR');
};

export const formatRegistrarDate = (value?: string | null) => {
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

export const getDaysUntil = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Math.ceil((parsed.getTime() - Date.now()) / 86_400_000);
};

export const formatRegistrarBoolean = (value: boolean | null, trueLabel: string, falseLabel: string) => {
  if (value == null) {
    return '—';
  }

  return value ? trueLabel : falseLabel;
};

export const formatRegistrarPrice = (pricing?: RegistrarPricing | null) => {
  if (!pricing) {
    return '—';
  }

  const currency = pricing.currency || 'USD';
  const registration = pricing.registration_cost || '—';
  const renewal = pricing.renewal_cost || '—';
  return `${currency} ${registration} / renova ${renewal}`;
};

export const formatRegistrarReason = (reason?: string | null) => {
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

export const formatWorkflowState = (status?: RegistrarWorkflowStatus | null) => {
  if (!status) {
    return '—';
  }

  const state = status.state ?? '—';
  if (status.error?.message) {
    return `${state}: ${status.error.message}`;
  }
  return state;
};

export const normalizeDomainInput = (value: string) => value.trim().toLowerCase();

export const splitRegistrarExtensions = (value: string) =>
  value
    .split(',')
    .map((extension) => extension.trim().replace(/^\./, '').toLowerCase())
    .filter(Boolean);

export const splitRegistrarDomains = (value: string) =>
  value
    .split(/[,\s]+/)
    .map(normalizeDomainInput)
    .filter((domain) => domain.includes('.') && !domain.startsWith('.') && !domain.includes('..'));

export const toIntOrFallback = (raw: string, fallback: number) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.trunc(parsed);
};

const toNumberOrFallback = (raw: string, fallback: number) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
};

const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_REGEX = /^([0-9a-f]{1,4}:){1,7}[0-9a-f]{1,4}$|^::$|^(([0-9a-f]{1,4}:){1,7}:)$|^(:(:[0-9a-f]{1,4}){1,7})$/i;
const HOSTNAME_REGEX = /^(?:\*\.)?(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?:\.(?!-)[a-z0-9-]{1,63})*\.?$/i;

export const parseHttpsSvcbValue = (value: string): HttpsSvcbValidation => {
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

export const parseUriTarget = (value: string): UriValidation => {
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

export const parseCaaDraft = (flagsRaw: string, tagRaw: string, valueRaw: string): CaaValidation => {
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

export const parseCommonRecordDraft = (
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

  if ((type === 'PTR' || type === 'NS') && !HOSTNAME_REGEX.test(content)) {
    issues.push(`Registro ${type} exige hostname válido no conteúdo.`);
  }

  if (type === 'TXT' && content.length > 2048) {
    hints.push('TXT muito extenso; verifique necessidade de quebra em múltiplos registros.');
  }

  return { issues, hints };
};

// ── DNS-1: validação dos novos tipos estruturados (espelha faixas do motor) ──

const HEX_VALUE_REGEX = /^[0-9A-Fa-f]+$/;

const pushIntIssue = (issues: string[], label: string, raw: string, min: number, max: number) => {
  const trimmed = raw.trim();
  const parsed = Number(trimmed);
  if (!trimmed || !Number.isInteger(parsed) || parsed < min || parsed > max) {
    issues.push(`${label} deve ser inteiro entre ${min} e ${max}.`);
  }
};

const pushNumberIssue = (issues: string[], label: string, raw: string, min: number, max: number) => {
  const trimmed = raw.trim();
  const parsed = Number(trimmed);
  if (!trimmed || !Number.isFinite(parsed) || parsed < min || parsed > max) {
    issues.push(`${label} deve ser número entre ${min} e ${max}.`);
  }
};

const pushHexIssue = (issues: string[], label: string, raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    issues.push(`${label} é obrigatório.`);
    return;
  }
  if (!HEX_VALUE_REGEX.test(trimmed)) {
    issues.push(`${label} deve ser hexadecimal (0-9, A-F).`);
  }
};

const pushRequiredTextIssue = (issues: string[], label: string, raw: string) => {
  if (!raw.trim()) {
    issues.push(`${label} é obrigatório.`);
  }
};

export const parseDsDraft = (
  keyTagRaw: string,
  algorithmRaw: string,
  digestTypeRaw: string,
  digestRaw: string,
): StructuredDataValidation => {
  const issues: string[] = [];
  pushIntIssue(issues, 'DS key_tag', keyTagRaw, 0, 65535);
  pushIntIssue(issues, 'DS algorithm', algorithmRaw, 0, 255);
  pushIntIssue(issues, 'DS digest_type', digestTypeRaw, 0, 255);
  pushHexIssue(issues, 'DS digest', digestRaw);
  return { issues, hints: [] };
};

export const parseDnskeyDraft = (
  flagsRaw: string,
  protocolRaw: string,
  algorithmRaw: string,
  publicKeyRaw: string,
): StructuredDataValidation => {
  const issues: string[] = [];
  pushIntIssue(issues, 'DNSKEY flags', flagsRaw, 0, 65535);
  pushIntIssue(issues, 'DNSKEY protocol', protocolRaw, 0, 255);
  pushIntIssue(issues, 'DNSKEY algorithm', algorithmRaw, 0, 255);
  pushRequiredTextIssue(issues, 'DNSKEY public_key', publicKeyRaw);
  return { issues, hints: [] };
};

export const parseSshfpDraft = (
  algorithmRaw: string,
  typeRaw: string,
  fingerprintRaw: string,
): StructuredDataValidation => {
  const issues: string[] = [];
  pushIntIssue(issues, 'SSHFP algorithm', algorithmRaw, 0, 255);
  pushIntIssue(issues, 'SSHFP type', typeRaw, 0, 255);
  pushHexIssue(issues, 'SSHFP fingerprint', fingerprintRaw);
  return { issues, hints: [] };
};

/** Valida SMIMEA e TLSA (mesmo shape usage/selector/matching_type/certificate). */
export const parseTlsaDraft = (
  typeLabel: string,
  usageRaw: string,
  selectorRaw: string,
  matchingTypeRaw: string,
  certificateRaw: string,
): StructuredDataValidation => {
  const issues: string[] = [];
  const label = typeLabel.trim().toUpperCase() || 'TLSA';
  pushIntIssue(issues, `${label} usage`, usageRaw, 0, 255);
  pushIntIssue(issues, `${label} selector`, selectorRaw, 0, 255);
  pushIntIssue(issues, `${label} matching_type`, matchingTypeRaw, 0, 255);
  pushRequiredTextIssue(issues, `${label} certificate`, certificateRaw);
  return { issues, hints: [] };
};

export const parseCertDraft = (
  typeRaw: string,
  keyTagRaw: string,
  algorithmRaw: string,
  certificateRaw: string,
): StructuredDataValidation => {
  const issues: string[] = [];
  pushIntIssue(issues, 'CERT type', typeRaw, 0, 65535);
  pushIntIssue(issues, 'CERT key_tag', keyTagRaw, 0, 65535);
  pushIntIssue(issues, 'CERT algorithm', algorithmRaw, 0, 255);
  pushRequiredTextIssue(issues, 'CERT certificate', certificateRaw);
  return { issues, hints: [] };
};

export type LocDraftInput = {
  latDegrees: string;
  latMinutes: string;
  latSeconds: string;
  latDirection: string;
  longDegrees: string;
  longMinutes: string;
  longSeconds: string;
  longDirection: string;
  altitude: string;
  size: string;
  precisionHorz: string;
  precisionVert: string;
};

export const parseLocDraft = (input: LocDraftInput): StructuredDataValidation => {
  const issues: string[] = [];
  pushIntIssue(issues, 'LOC lat_degrees', input.latDegrees, 0, 90);
  pushIntIssue(issues, 'LOC lat_minutes', input.latMinutes, 0, 59);
  pushNumberIssue(issues, 'LOC lat_seconds', input.latSeconds, 0, 59.999);
  if (!['N', 'S'].includes(input.latDirection.trim().toUpperCase())) {
    issues.push('LOC lat_direction deve ser N ou S.');
  }
  pushIntIssue(issues, 'LOC long_degrees', input.longDegrees, 0, 180);
  pushIntIssue(issues, 'LOC long_minutes', input.longMinutes, 0, 59);
  pushNumberIssue(issues, 'LOC long_seconds', input.longSeconds, 0, 59.999);
  if (!['E', 'W'].includes(input.longDirection.trim().toUpperCase())) {
    issues.push('LOC long_direction deve ser E ou W.');
  }
  pushNumberIssue(issues, 'LOC altitude', input.altitude, -100000, 42849672.95);
  pushNumberIssue(issues, 'LOC size', input.size, 0, 90000000);
  pushNumberIssue(issues, 'LOC precision_horz', input.precisionHorz, 0, 90000000);
  pushNumberIssue(issues, 'LOC precision_vert', input.precisionVert, 0, 90000000);
  return { issues, hints: [] };
};

export const parseNaptrDraft = (
  orderRaw: string,
  preferenceRaw: string,
  _flagsRaw: string,
  serviceRaw: string,
  _regexRaw: string,
  replacementRaw: string,
): StructuredDataValidation => {
  const issues: string[] = [];
  pushIntIssue(issues, 'NAPTR order', orderRaw, 0, 65535);
  pushIntIssue(issues, 'NAPTR preference', preferenceRaw, 0, 65535);
  pushRequiredTextIssue(issues, 'NAPTR service', serviceRaw);
  pushRequiredTextIssue(issues, 'NAPTR replacement', replacementRaw);
  return { issues, hints: ['NAPTR flags e regex são opcionais; replacement "." indica ausência de substituição.'] };
};

/** Despacha a validação estruturada conforme o tipo do draft; tipos sem editor estruturado novo retornam vazio. */
export const parseStructuredDraft = (draft: EditorDraft): StructuredDataValidation => {
  const type = draft.type.trim().toUpperCase();
  if (type === 'DS') {
    return parseDsDraft(draft.dsKeyTag, draft.dsAlgorithm, draft.dsDigestType, draft.dsDigest);
  }
  if (type === 'DNSKEY') {
    return parseDnskeyDraft(draft.dnskeyFlags, draft.dnskeyProtocol, draft.dnskeyAlgorithm, draft.dnskeyPublicKey);
  }
  if (type === 'SSHFP') {
    return parseSshfpDraft(draft.sshfpAlgorithm, draft.sshfpType, draft.sshfpFingerprint);
  }
  if (type === 'SMIMEA' || type === 'TLSA') {
    return parseTlsaDraft(type, draft.tlsaUsage, draft.tlsaSelector, draft.tlsaMatchingType, draft.tlsaCertificate);
  }
  if (type === 'CERT') {
    return parseCertDraft(draft.certType, draft.certKeyTag, draft.certAlgorithm, draft.certCertificate);
  }
  if (type === 'LOC') {
    return parseLocDraft({
      latDegrees: draft.locLatDegrees,
      latMinutes: draft.locLatMinutes,
      latSeconds: draft.locLatSeconds,
      latDirection: draft.locLatDirection,
      longDegrees: draft.locLongDegrees,
      longMinutes: draft.locLongMinutes,
      longSeconds: draft.locLongSeconds,
      longDirection: draft.locLongDirection,
      altitude: draft.locAltitude,
      size: draft.locSize,
      precisionHorz: draft.locPrecisionHorz,
      precisionVert: draft.locPrecisionVert,
    });
  }
  if (type === 'NAPTR') {
    return parseNaptrDraft(
      draft.naptrOrder,
      draft.naptrPreference,
      draft.naptrFlags,
      draft.naptrService,
      draft.naptrRegex,
      draft.naptrReplacement,
    );
  }
  return { issues: [], hints: [] };
};

// ── DNS-1: tags (mesmos limites do motor: máx. 20, nome 1-32 [A-Za-z0-9_.-], valor até 100) ──

const DNS_TAG_REGEX = /^[A-Za-z0-9_.-]{1,32}(:.{0,100})?$/;
export const MAX_DNS_TAGS = 20;

/** Retorna a mensagem de erro (pt-BR) ou null quando a tag é válida. */
export const validateDnsTag = (tagRaw: string): string | null => {
  const tag = tagRaw.trim();
  if (!tag) {
    return 'Tag vazia não é permitida.';
  }
  if (!DNS_TAG_REGEX.test(tag)) {
    return `Tag inválida: "${tag}". Use nome (1-32 caracteres A-Za-z0-9_.-) ou nome:valor (valor com até 100 caracteres).`;
  }
  return null;
};

export const countActiveAdvancedFilters = (filters: AdvancedRecordFilters) =>
  Object.values(filters).filter((value) => String(value).trim() !== '').length;

/** Monta o objeto `data` do upsert a partir do draft (null para tipos que usam content puro). */
export const buildRecordDataFromDraft = (draft: EditorDraft): Record<string, unknown> | null => {
  const type = draft.type.trim().toUpperCase();

  if (type === 'SRV') {
    return {
      service: draft.srvService.trim(),
      proto: draft.srvProto.trim(),
      name: draft.srvName.trim(),
      priority: toIntOrFallback(draft.srvPriority, 10),
      weight: toIntOrFallback(draft.srvWeight, 10),
      port: toIntOrFallback(draft.srvPort, 443),
      target: draft.srvTarget.trim(),
    };
  }
  if (type === 'CAA') {
    return {
      flags: toIntOrFallback(draft.caaFlags, 0),
      tag: draft.caaTag.trim(),
      value: draft.caaValue.trim(),
    };
  }
  if (type === 'URI') {
    return {
      priority: toIntOrFallback(draft.uriPriority, 10),
      weight: toIntOrFallback(draft.uriWeight, 1),
      target: draft.uriTarget.trim(),
    };
  }
  if (type === 'HTTPS' || type === 'SVCB') {
    return {
      priority: toIntOrFallback(draft.httpsPriority, 1),
      target: draft.httpsTarget.trim() || '.',
      value: draft.httpsValue.trim(),
    };
  }
  if (type === 'DS') {
    return {
      key_tag: toIntOrFallback(draft.dsKeyTag, 0),
      algorithm: toIntOrFallback(draft.dsAlgorithm, 0),
      digest_type: toIntOrFallback(draft.dsDigestType, 0),
      digest: draft.dsDigest.trim(),
    };
  }
  if (type === 'DNSKEY') {
    return {
      flags: toIntOrFallback(draft.dnskeyFlags, 0),
      protocol: toIntOrFallback(draft.dnskeyProtocol, 3),
      algorithm: toIntOrFallback(draft.dnskeyAlgorithm, 0),
      public_key: draft.dnskeyPublicKey.trim(),
    };
  }
  if (type === 'SSHFP') {
    return {
      algorithm: toIntOrFallback(draft.sshfpAlgorithm, 0),
      type: toIntOrFallback(draft.sshfpType, 0),
      fingerprint: draft.sshfpFingerprint.trim(),
    };
  }
  if (type === 'SMIMEA' || type === 'TLSA') {
    return {
      usage: toIntOrFallback(draft.tlsaUsage, 0),
      selector: toIntOrFallback(draft.tlsaSelector, 0),
      matching_type: toIntOrFallback(draft.tlsaMatchingType, 0),
      certificate: draft.tlsaCertificate.trim(),
    };
  }
  if (type === 'CERT') {
    return {
      type: toIntOrFallback(draft.certType, 0),
      key_tag: toIntOrFallback(draft.certKeyTag, 0),
      algorithm: toIntOrFallback(draft.certAlgorithm, 0),
      certificate: draft.certCertificate.trim(),
    };
  }
  if (type === 'LOC') {
    return {
      lat_degrees: toIntOrFallback(draft.locLatDegrees, 0),
      lat_minutes: toIntOrFallback(draft.locLatMinutes, 0),
      lat_seconds: toNumberOrFallback(draft.locLatSeconds, 0),
      lat_direction: draft.locLatDirection.trim().toUpperCase() || 'N',
      long_degrees: toIntOrFallback(draft.locLongDegrees, 0),
      long_minutes: toIntOrFallback(draft.locLongMinutes, 0),
      long_seconds: toNumberOrFallback(draft.locLongSeconds, 0),
      long_direction: draft.locLongDirection.trim().toUpperCase() || 'E',
      altitude: toNumberOrFallback(draft.locAltitude, 0),
      size: toNumberOrFallback(draft.locSize, 0),
      precision_horz: toNumberOrFallback(draft.locPrecisionHorz, 0),
      precision_vert: toNumberOrFallback(draft.locPrecisionVert, 0),
    };
  }
  if (type === 'NAPTR') {
    return {
      order: toIntOrFallback(draft.naptrOrder, 0),
      preference: toIntOrFallback(draft.naptrPreference, 0),
      flags: draft.naptrFlags.trim(),
      service: draft.naptrService.trim(),
      regex: draft.naptrRegex.trim(),
      replacement: draft.naptrReplacement.trim(),
    };
  }
  return null;
};

export const formatRecordContent = (record: DnsRecord) => {
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

    const recordType = String(record.type ?? '').toUpperCase();

    if (recordType === 'DS') {
      return `${String(data.key_tag ?? '').trim()} ${String(data.algorithm ?? '').trim()} ${String(data.digest_type ?? '').trim()} ${String(data.digest ?? '').trim()}`.trim();
    }

    if (recordType === 'DNSKEY') {
      return `${String(data.flags ?? '').trim()} ${String(data.protocol ?? '').trim()} ${String(data.algorithm ?? '').trim()} ${String(data.public_key ?? '').trim()}`.trim();
    }

    if (recordType === 'SSHFP') {
      return `${String(data.algorithm ?? '').trim()} ${String(data.type ?? '').trim()} ${String(data.fingerprint ?? '').trim()}`.trim();
    }

    if (recordType === 'SMIMEA' || recordType === 'TLSA') {
      return `${String(data.usage ?? '').trim()} ${String(data.selector ?? '').trim()} ${String(data.matching_type ?? '').trim()} ${String(data.certificate ?? '').trim()}`.trim();
    }

    if (recordType === 'CERT') {
      return `${String(data.type ?? '').trim()} ${String(data.key_tag ?? '').trim()} ${String(data.algorithm ?? '').trim()} ${String(data.certificate ?? '').trim()}`.trim();
    }

    if (recordType === 'LOC') {
      const lat = `${String(data.lat_degrees ?? '').trim()} ${String(data.lat_minutes ?? '').trim()} ${String(data.lat_seconds ?? '').trim()} ${String(data.lat_direction ?? '').trim()}`;
      const long = `${String(data.long_degrees ?? '').trim()} ${String(data.long_minutes ?? '').trim()} ${String(data.long_seconds ?? '').trim()} ${String(data.long_direction ?? '').trim()}`;
      const metrics = `${String(data.altitude ?? '').trim()}m ${String(data.size ?? '').trim()}m ${String(data.precision_horz ?? '').trim()}m ${String(data.precision_vert ?? '').trim()}m`;
      return `${lat} ${long} ${metrics}`.trim();
    }

    if (recordType === 'NAPTR') {
      return `${String(data.order ?? '').trim()} ${String(data.preference ?? '').trim()} "${String(data.flags ?? '').trim()}" "${String(data.service ?? '').trim()}" "${String(data.regex ?? '').trim()}" ${String(data.replacement ?? '').trim()}`.trim();
    }

    try {
      return JSON.stringify(data);
    } catch {
      return 'dados estruturados';
    }
  }

  return '—';
};
