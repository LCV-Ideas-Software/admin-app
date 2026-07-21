/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Tipos compartilhados do módulo CF DNS (zonas, registros DNS, payloads do
 * Cloudflare Registrar e estado do formulário de edição). Extraído de
 * CfDnsModule.tsx sem mudança de comportamento.
 */

export type ZoneItem = {
  id: string;
  name: string;
};

export type ZonesPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  zones?: ZoneItem[];
};

export type RegistrarRegistration = {
  domain_name: string;
  status: string;
  created_at: string | null;
  expires_at: string | null;
  auto_renew: boolean | null;
  privacy_mode: string | null;
  locked: boolean | null;
};

export type RegistrarPricing = {
  currency: string;
  registration_cost: string;
  renewal_cost: string;
};

export type RegistrarAvailability = {
  name: string;
  registrable: boolean;
  pricing: RegistrarPricing | null;
  reason: string | null;
  tier: string | null;
};

export type RegistrarWorkflowStatus = {
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

export type RegistrarAccount = {
  accountId?: string;
  accountName?: string | null;
  source?: string;
};

export type RegistrarPayload = {
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

export type RegistrarAvailabilityPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  account?: RegistrarAccount;
  domains?: RegistrarAvailability[];
  skipped?: string[];
};

export type RegistrarWorkflowPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  account?: RegistrarAccount;
  status?: RegistrarWorkflowStatus;
  workflow_missing?: boolean;
};

export type RegistrarSettingsPatch =
  | { kind: 'registration'; domain: string; label: string; auto_renew: boolean }
  | { kind: 'domain'; domain: string; label: string; locked?: boolean; privacy?: boolean };

export type DnsRecord = {
  id?: string;
  type?: string;
  name?: string;
  content?: string;
  data?: Record<string, unknown>;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
  comment?: string;
  tags?: string[];
  modified_on?: string;
};

export type RecordsPayload = {
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

export type MutationPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
};

export type EditorDraft = {
  recordId: string;
  type: string;
  name: string;
  content: string;
  ttl: string;
  proxied: boolean;
  priority: string;
  comment: string;
  tags: string[];
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
  dsKeyTag: string;
  dsAlgorithm: string;
  dsDigestType: string;
  dsDigest: string;
  dnskeyFlags: string;
  dnskeyProtocol: string;
  dnskeyAlgorithm: string;
  dnskeyPublicKey: string;
  sshfpAlgorithm: string;
  sshfpType: string;
  sshfpFingerprint: string;
  tlsaUsage: string;
  tlsaSelector: string;
  tlsaMatchingType: string;
  tlsaCertificate: string;
  certType: string;
  certKeyTag: string;
  certAlgorithm: string;
  certCertificate: string;
  locLatDegrees: string;
  locLatMinutes: string;
  locLatSeconds: string;
  locLatDirection: string;
  locLongDegrees: string;
  locLongMinutes: string;
  locLongSeconds: string;
  locLongDirection: string;
  locAltitude: string;
  locSize: string;
  locPrecisionHorz: string;
  locPrecisionVert: string;
  naptrOrder: string;
  naptrPreference: string;
  naptrFlags: string;
  naptrService: string;
  naptrRegex: string;
  naptrReplacement: string;
};

export const RECORD_TYPES = [
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
  'DS',
  'DNSKEY',
  'SSHFP',
  'SMIMEA',
  'CERT',
  'LOC',
  'OPENPGPKEY',
];

export const DEFAULT_DRAFT: EditorDraft = {
  recordId: '',
  type: 'A',
  name: '',
  content: '',
  ttl: '1',
  proxied: false,
  priority: '',
  comment: '',
  tags: [],
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
  dsKeyTag: '',
  dsAlgorithm: '13',
  dsDigestType: '2',
  dsDigest: '',
  dnskeyFlags: '257',
  dnskeyProtocol: '3',
  dnskeyAlgorithm: '13',
  dnskeyPublicKey: '',
  sshfpAlgorithm: '4',
  sshfpType: '2',
  sshfpFingerprint: '',
  tlsaUsage: '3',
  tlsaSelector: '1',
  tlsaMatchingType: '1',
  tlsaCertificate: '',
  certType: '1',
  certKeyTag: '0',
  certAlgorithm: '13',
  certCertificate: '',
  locLatDegrees: '0',
  locLatMinutes: '0',
  locLatSeconds: '0',
  locLatDirection: 'N',
  locLongDegrees: '0',
  locLongMinutes: '0',
  locLongSeconds: '0',
  locLongDirection: 'E',
  locAltitude: '0',
  locSize: '1',
  locPrecisionHorz: '10000',
  locPrecisionVert: '10',
  naptrOrder: '10',
  naptrPreference: '10',
  naptrFlags: 'S',
  naptrService: '',
  naptrRegex: '',
  naptrReplacement: '.',
};

export type HttpsSvcbValidation = {
  normalized: string;
  tokens: string[];
  issues: string[];
  hints: string[];
};

export type UriValidation = {
  normalized: string;
  issues: string[];
  hints: string[];
};

export type CaaValidation = {
  issues: string[];
  hints: string[];
};

export type CommonRecordValidation = {
  issues: string[];
  hints: string[];
};

export type DnsOperationalAlert = {
  code: string;
  cause: string;
  action: string;
};

// ── DNS-1: novos tipos estruturados, filtros avançados, ordenação e capacidades ──

export type StructuredDataValidation = {
  issues: string[];
  hints: string[];
};

/** Tipos que enviam payload em `data` via editores estruturados dedicados (além de SRV/CAA/URI/HTTPS/SVCB). */
export const STRUCTURED_DATA_TYPES = ['DS', 'DNSKEY', 'SSHFP', 'SMIMEA', 'TLSA', 'CERT', 'LOC', 'NAPTR'];

export type RecordsSortField = '' | 'type' | 'name' | 'content' | 'ttl' | 'proxied';

export type RecordsSortDirection = 'asc' | 'desc';

export type AdvancedRecordFilters = {
  nameContains: string;
  contentContains: string;
  commentContains: string;
  /** '' = qualquer; 'true' = com comentário; 'false' = sem comentário. */
  commentPresent: '' | 'true' | 'false';
  /** Formato nome:valor. */
  tagExact: string;
  /** Nome da tag que deve estar presente (mapeado para tag.present na API Cloudflare). */
  tagPresent: string;
  /** '' = todos; 'true' = proxied; 'false' = DNS only. */
  proxied: '' | 'true' | 'false';
  /** '' = todos os critérios (padrão do backend); 'any' = qualquer critério. */
  match: '' | 'all' | 'any';
};

export const DEFAULT_ADVANCED_FILTERS: AdvancedRecordFilters = {
  nameContains: '',
  contentContains: '',
  commentContains: '',
  commentPresent: '',
  tagExact: '',
  tagPresent: '',
  proxied: '',
  match: '',
};

export type ZoneCapabilitiesPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  zoneId?: string;
  tagsSupported?: boolean;
  commentMaxLength?: number;
  batchOpsLimit?: number;
  analyticsRetentionDays?: number;
  planLabel?: string | null;
  status?: string | null;
  paused?: boolean;
  nameServers?: string[];
  originalNameServers?: string[] | null;
};

export type ZoneCapabilities = {
  tagsSupported: boolean;
  commentMaxLength: number;
};

export const DEFAULT_COMMENT_MAX_LENGTH = 100;

// ── DNS-3: ciclo de vida de zonas, DNSSEC e configurações DNS ──

export type AdminZone = {
  id: string;
  name: string;
  status: string;
  paused: boolean;
  type: string;
  planLegacyId: string | null;
  planLabel: string | null;
  nameServers: string[];
  originalNameServers: string[] | null;
  /** Hospeda o admin-app: ações destrutivas exigem confirmação reforçada. */
  critical: boolean;
};

export type ZonesAdminPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  zones?: AdminZone[];
};

export type ZoneMutationPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  zone?: AdminZone;
  zoneId?: string;
  zoneName?: string;
};

export type DnssecInfo = {
  status: string | null;
  algorithm: string | null;
  digest: string | null;
  digest_algorithm: string | null;
  digest_type: string | null;
  ds: string | null;
  flags: number | null;
  key_tag: number | null;
  key_type: string | null;
  public_key: string | null;
  dnssec_multi_signer: boolean | null;
  dnssec_presigned: boolean | null;
  dnssec_use_nsec3: boolean | null;
  modified_on: string | null;
};

export type DnssecPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  zoneId?: string;
  dnssec?: DnssecInfo;
};

export type DnssecPatchInput = {
  status?: 'active' | 'disabled';
  dnssecMultiSigner?: boolean;
  dnssecPresigned?: boolean;
  dnssecUseNsec3?: boolean;
  confirmName?: string;
  confirmCritical?: boolean;
};

export type DnsSettingsNameserversType = 'cloudflare.standard' | 'custom.account' | 'custom.tenant' | 'custom.zone';

export type DnsSettingsSoa = {
  expire: number;
  min_ttl: number;
  mname: string;
  refresh: number;
  retry: number;
  rname: string;
  ttl: number;
};

export type DnsSettings = {
  flatten_all_cnames?: boolean;
  foundation_dns?: boolean;
  multi_provider?: boolean;
  ns_ttl?: number;
  secondary_overrides?: boolean;
  zone_mode?: 'standard' | 'cdn_only' | 'dns_only';
  nameservers?: {
    type: DnsSettingsNameserversType;
    ns_set?: number;
  };
  soa?: DnsSettingsSoa;
};

export type DnsSettingsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  zoneId?: string;
  settings?: DnsSettings;
};

// ── DNS-4: análises DNS (dns_analytics) e detalhes do Registrar ──

/**
 * Passthrough do shape de report da CF: em `bytime`, `data[i].metrics` é uma
 * matriz (métrica × intervalos) e `time_intervals` traz os pares [início, fim];
 * no report simples, `metrics` é um vetor de valores por linha.
 */
export type DnsAnalyticsReport = {
  rows?: number;
  data?: Array<{
    dimensions?: string[];
    metrics?: Array<number | number[]>;
  }>;
  totals?: Record<string, number>;
  min?: Record<string, number>;
  max?: Record<string, number>;
  query?: Record<string, unknown>;
  time_intervals?: string[][];
};

export type DnsAnalyticsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  zoneId?: string;
  report?: DnsAnalyticsReport;
};

export type DnsAnalyticsTopDimension = 'queryName' | 'queryType' | 'responseCode';

/** Detalhe de uma registration (GET por domínio): campos extras quando a CF os devolve. */
export type RegistrarRegistrationDetail = RegistrarRegistration & {
  name_servers?: string[];
  contacts?: Record<string, unknown>;
};

export type RegistrarRegistrationDetailPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  account?: RegistrarAccount;
  registration?: RegistrarRegistrationDetail;
};
