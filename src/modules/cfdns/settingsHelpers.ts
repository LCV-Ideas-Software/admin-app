/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros do DNS-3 (aba "Zona & DNSSEC"): montagem do formulário de
 * configurações DNS a partir do snapshot da API, dirty-diff do PATCH (com a
 * regra "soa completo se qualquer campo soa mudou"), gating da confirmação
 * reforçada em zonas críticas e lista de nameservers para copiar.
 */

import type { DnsSettings, DnsSettingsNameserversType, DnsSettingsSoa } from './types';

export type DnsSettingsFormState = {
  flattenAllCnames: boolean;
  foundationDns: boolean;
  multiProvider: boolean;
  secondaryOverrides: boolean;
  nsTtl: string;
  zoneMode: 'standard' | 'cdn_only' | 'dns_only';
  nameserversType: DnsSettingsNameserversType;
  nameserversNsSet: string;
  soaExpire: string;
  soaMinTtl: string;
  soaMname: string;
  soaRefresh: string;
  soaRetry: string;
  soaRname: string;
  soaTtl: string;
};

const NUMBER_OR_EMPTY = (value: number | undefined) => (value == null ? '' : String(value));

/** Snapshot da API → estado do formulário (números viram strings de input). */
export const toDnsSettingsFormState = (settings: DnsSettings): DnsSettingsFormState => ({
  flattenAllCnames: Boolean(settings.flatten_all_cnames),
  foundationDns: Boolean(settings.foundation_dns),
  multiProvider: Boolean(settings.multi_provider),
  secondaryOverrides: Boolean(settings.secondary_overrides),
  nsTtl: NUMBER_OR_EMPTY(settings.ns_ttl),
  zoneMode: settings.zone_mode ?? 'standard',
  nameserversType: settings.nameservers?.type ?? 'cloudflare.standard',
  nameserversNsSet: NUMBER_OR_EMPTY(settings.nameservers?.ns_set),
  soaExpire: NUMBER_OR_EMPTY(settings.soa?.expire),
  soaMinTtl: NUMBER_OR_EMPTY(settings.soa?.min_ttl),
  soaMname: settings.soa?.mname ?? '',
  soaRefresh: NUMBER_OR_EMPTY(settings.soa?.refresh),
  soaRetry: NUMBER_OR_EMPTY(settings.soa?.retry),
  soaRname: settings.soa?.rname ?? '',
  soaTtl: NUMBER_OR_EMPTY(settings.soa?.ttl),
});

export type DnsSettingsPatchResult = {
  /** Somente as chaves top-level alteradas em relação ao snapshot. */
  settings: DnsSettings;
  /** Problemas de validação em pt-BR; quando não vazio, não envie o PATCH. */
  issues: string[];
};

type SoaFieldSpec = {
  formKey: 'soaExpire' | 'soaMinTtl' | 'soaRefresh' | 'soaRetry' | 'soaTtl';
  soaKey: 'expire' | 'min_ttl' | 'refresh' | 'retry' | 'ttl';
  min: number;
  max: number;
};

const SOA_NUMERIC_FIELDS: SoaFieldSpec[] = [
  { formKey: 'soaExpire', soaKey: 'expire', min: 86400, max: 2419200 },
  { formKey: 'soaMinTtl', soaKey: 'min_ttl', min: 60, max: 86400 },
  { formKey: 'soaRefresh', soaKey: 'refresh', min: 600, max: 86400 },
  { formKey: 'soaRetry', soaKey: 'retry', min: 600, max: 86400 },
  { formKey: 'soaTtl', soaKey: 'ttl', min: 300, max: 86400 },
];

const parseIntInRange = (raw: string, label: string, min: number, max: number, issues: string[]): number | null => {
  const trimmed = raw.trim();
  const parsed = Number(trimmed);
  if (!trimmed || !Number.isInteger(parsed) || parsed < min || parsed > max) {
    issues.push(`${label}: informe um inteiro entre ${min} e ${max}.`);
    return null;
  }
  return parsed;
};

/**
 * Dirty-diff do formulário contra o snapshot carregado: só as chaves top-level
 * alteradas entram no PATCH. Regras especiais:
 * - soa: se QUALQUER campo soa mudou, o objeto soa vai COMPLETO (a Cloudflare
 *   substitui o objeto inteiro);
 * - nameservers: enviado como objeto { type, ns_set? } quando o tipo ou o
 *   ns_set mudou (ns_set só acompanha tipos custom).
 */
export const buildDnsSettingsPatch = (snapshot: DnsSettings, form: DnsSettingsFormState): DnsSettingsPatchResult => {
  const settings: DnsSettings = {};
  const issues: string[] = [];

  if (form.flattenAllCnames !== Boolean(snapshot.flatten_all_cnames)) {
    settings.flatten_all_cnames = form.flattenAllCnames;
  }
  if (form.foundationDns !== Boolean(snapshot.foundation_dns)) {
    settings.foundation_dns = form.foundationDns;
  }
  if (form.multiProvider !== Boolean(snapshot.multi_provider)) {
    settings.multi_provider = form.multiProvider;
  }
  if (form.secondaryOverrides !== Boolean(snapshot.secondary_overrides)) {
    settings.secondary_overrides = form.secondaryOverrides;
  }

  if (form.nsTtl.trim() !== NUMBER_OR_EMPTY(snapshot.ns_ttl)) {
    const nsTtl = parseIntInRange(form.nsTtl, 'TTL dos nameservers (ns_ttl)', 30, 86400, issues);
    if (nsTtl != null) {
      settings.ns_ttl = nsTtl;
    }
  }

  if (form.zoneMode !== (snapshot.zone_mode ?? 'standard')) {
    settings.zone_mode = form.zoneMode;
  }

  const usesCustomNsSet = form.nameserversType !== 'cloudflare.standard';
  const snapshotNsType = snapshot.nameservers?.type ?? 'cloudflare.standard';
  const snapshotNsSet = NUMBER_OR_EMPTY(snapshot.nameservers?.ns_set);
  const nsTypeDirty = form.nameserversType !== snapshotNsType;
  const nsSetDirty = usesCustomNsSet && form.nameserversNsSet.trim() !== snapshotNsSet;
  if (nsTypeDirty || nsSetDirty) {
    const nameservers: DnsSettings['nameservers'] = { type: form.nameserversType };
    if (usesCustomNsSet && form.nameserversNsSet.trim()) {
      const nsSet = parseIntInRange(form.nameserversNsSet, 'Conjunto de nameservers (ns_set)', 1, 5, issues);
      if (nsSet != null) {
        nameservers.ns_set = nsSet;
      }
    }
    settings.nameservers = nameservers;
  }

  const snapshotSoa = snapshot.soa;
  const soaDirty =
    form.soaExpire.trim() !== NUMBER_OR_EMPTY(snapshotSoa?.expire) ||
    form.soaMinTtl.trim() !== NUMBER_OR_EMPTY(snapshotSoa?.min_ttl) ||
    form.soaMname.trim() !== (snapshotSoa?.mname ?? '') ||
    form.soaRefresh.trim() !== NUMBER_OR_EMPTY(snapshotSoa?.refresh) ||
    form.soaRetry.trim() !== NUMBER_OR_EMPTY(snapshotSoa?.retry) ||
    form.soaRname.trim() !== (snapshotSoa?.rname ?? '') ||
    form.soaTtl.trim() !== NUMBER_OR_EMPTY(snapshotSoa?.ttl);

  if (soaDirty) {
    const soa: Partial<DnsSettingsSoa> = {};
    for (const field of SOA_NUMERIC_FIELDS) {
      const value = parseIntInRange(form[field.formKey], `SOA ${field.soaKey}`, field.min, field.max, issues);
      if (value != null) {
        soa[field.soaKey] = value;
      }
    }
    if (!form.soaMname.trim()) {
      issues.push('SOA mname: informe o nameserver primário.');
    } else {
      soa.mname = form.soaMname.trim();
    }
    if (!form.soaRname.trim()) {
      issues.push('SOA rname: informe o e-mail do responsável (com . no lugar de @).');
    } else {
      soa.rname = form.soaRname.trim();
    }
    settings.soa = soa as DnsSettingsSoa;
  }

  return { settings, issues };
};

/**
 * Gating da confirmação reforçada: o nome digitado deve bater exatamente com o
 * nome da zona (case-insensitive) e, em zona crítica, a ciência explícita
 * (checkbox) também é obrigatória.
 */
export const isZoneActionConfirmed = (
  zone: { name: string; critical: boolean },
  typedName: string,
  ackChecked: boolean,
): boolean => {
  const matches = typedName.trim().toLowerCase() === zone.name.trim().toLowerCase();
  return matches && (!zone.critical || ackChecked);
};

/** Lista de nameservers para copiar: um por linha, sem entradas vazias. */
export const buildNameServerCopyList = (nameServers: Array<string | null | undefined>): string =>
  nameServers
    .map((nameServer) => String(nameServer ?? '').trim())
    .filter(Boolean)
    .join('\n');
