/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes dos helpers puros do DNS-3: dirty-diff das configurações DNS (incl.
 * a regra "soa completo se qualquer campo soa mudou"), gating da confirmação
 * reforçada de zona crítica e lista de nameservers para copiar.
 */

import { describe, expect, it } from 'vitest';
import {
  buildDnsSettingsPatch,
  buildNameServerCopyList,
  type DnsSettingsFormState,
  isZoneActionConfirmed,
  toDnsSettingsFormState,
} from './settingsHelpers';
import type { DnsSettings } from './types';

const SNAPSHOT: DnsSettings = {
  flatten_all_cnames: false,
  foundation_dns: false,
  multi_provider: false,
  ns_ttl: 86400,
  secondary_overrides: false,
  zone_mode: 'standard',
  nameservers: { type: 'cloudflare.standard' },
  soa: {
    expire: 604800,
    min_ttl: 1800,
    mname: 'kristina.ns.cloudflare.com',
    refresh: 10000,
    retry: 2400,
    rname: 'admin.example.com',
    ttl: 3600,
  },
};

const baseForm = (): DnsSettingsFormState => toDnsSettingsFormState(SNAPSHOT);

describe('toDnsSettingsFormState', () => {
  it('maps the API snapshot to input strings and defaults', () => {
    expect(baseForm()).toEqual({
      flattenAllCnames: false,
      foundationDns: false,
      multiProvider: false,
      secondaryOverrides: false,
      nsTtl: '86400',
      zoneMode: 'standard',
      nameserversType: 'cloudflare.standard',
      nameserversNsSet: '',
      soaExpire: '604800',
      soaMinTtl: '1800',
      soaMname: 'kristina.ns.cloudflare.com',
      soaRefresh: '10000',
      soaRetry: '2400',
      soaRname: 'admin.example.com',
      soaTtl: '3600',
    });
  });

  it('falls back to defaults when the snapshot is empty', () => {
    const form = toDnsSettingsFormState({});
    expect(form.zoneMode).toBe('standard');
    expect(form.nameserversType).toBe('cloudflare.standard');
    expect(form.nsTtl).toBe('');
  });
});

describe('buildDnsSettingsPatch', () => {
  it('returns an empty patch when nothing changed', () => {
    const { settings, issues } = buildDnsSettingsPatch(SNAPSHOT, baseForm());
    expect(settings).toEqual({});
    expect(issues).toEqual([]);
  });

  it('includes only the dirty top-level keys', () => {
    const form = { ...baseForm(), flattenAllCnames: true, nsTtl: '300' };
    const { settings, issues } = buildDnsSettingsPatch(SNAPSHOT, form);

    expect(issues).toEqual([]);
    expect(settings).toEqual({ flatten_all_cnames: true, ns_ttl: 300 });
  });

  it('sends the COMPLETE soa object when any soa field is dirty', () => {
    const form = { ...baseForm(), soaTtl: '7200' };
    const { settings, issues } = buildDnsSettingsPatch(SNAPSHOT, form);

    expect(issues).toEqual([]);
    expect(settings).toEqual({
      soa: {
        expire: 604800,
        min_ttl: 1800,
        mname: 'kristina.ns.cloudflare.com',
        refresh: 10000,
        retry: 2400,
        rname: 'admin.example.com',
        ttl: 7200,
      },
    });
  });

  it('keeps soa out of the patch when no soa field changed', () => {
    const form = { ...baseForm(), zoneMode: 'dns_only' as const };
    const { settings } = buildDnsSettingsPatch(SNAPSHOT, form);

    expect(settings).toEqual({ zone_mode: 'dns_only' });
    expect(settings.soa).toBeUndefined();
  });

  it('reports range issues instead of emitting invalid values', () => {
    const form = { ...baseForm(), nsTtl: '10', soaTtl: '1' };
    const { settings, issues } = buildDnsSettingsPatch(SNAPSHOT, form);

    expect(issues.some((issue) => issue.includes('ns_ttl'))).toBe(true);
    expect(issues.some((issue) => issue.includes('SOA ttl'))).toBe(true);
    expect(settings.ns_ttl).toBeUndefined();
  });

  it('sends nameservers as a full object when the type changes, with ns_set only for custom types', () => {
    const customForm = { ...baseForm(), nameserversType: 'custom.account' as const, nameserversNsSet: '2' };
    const custom = buildDnsSettingsPatch(SNAPSHOT, customForm);
    expect(custom.issues).toEqual([]);
    expect(custom.settings).toEqual({ nameservers: { type: 'custom.account', ns_set: 2 } });

    const backToStandard = buildDnsSettingsPatch(
      { ...SNAPSHOT, nameservers: { type: 'custom.account', ns_set: 2 } },
      { ...baseForm(), nameserversType: 'cloudflare.standard' as const, nameserversNsSet: '2' },
    );
    expect(backToStandard.settings).toEqual({ nameservers: { type: 'cloudflare.standard' } });
  });

  it('flags ns_set out of the 1..5 range', () => {
    const form = { ...baseForm(), nameserversType: 'custom.zone' as const, nameserversNsSet: '9' };
    const { issues } = buildDnsSettingsPatch(SNAPSHOT, form);
    expect(issues.some((issue) => issue.includes('ns_set'))).toBe(true);
  });

  it('requires mname/rname when soa is dirty', () => {
    const form = { ...baseForm(), soaMname: '  ', soaRname: '' };
    const { issues } = buildDnsSettingsPatch(SNAPSHOT, form);

    expect(issues.some((issue) => issue.includes('mname'))).toBe(true);
    expect(issues.some((issue) => issue.includes('rname'))).toBe(true);
  });
});

describe('isZoneActionConfirmed', () => {
  const criticalZone = { name: 'lcv.app.br', critical: true };
  const normalZone = { name: 'example.com', critical: false };

  it('requires the exact zone name (case-insensitive, trimmed)', () => {
    expect(isZoneActionConfirmed(normalZone, 'example.com', false)).toBe(true);
    expect(isZoneActionConfirmed(normalZone, '  EXAMPLE.COM  ', false)).toBe(true);
    expect(isZoneActionConfirmed(normalZone, 'exemplo.com', false)).toBe(false);
    expect(isZoneActionConfirmed(normalZone, '', false)).toBe(false);
  });

  it('additionally requires the explicit ack for critical zones', () => {
    expect(isZoneActionConfirmed(criticalZone, 'lcv.app.br', false)).toBe(false);
    expect(isZoneActionConfirmed(criticalZone, 'lcv.app.br', true)).toBe(true);
    expect(isZoneActionConfirmed(criticalZone, 'outra.com', true)).toBe(false);
  });
});

describe('buildNameServerCopyList', () => {
  it('joins one nameserver per line, dropping empty entries', () => {
    expect(buildNameServerCopyList(['a.ns.cloudflare.com', ' b.ns.cloudflare.com ', '', null, undefined])).toBe(
      'a.ns.cloudflare.com\nb.ns.cloudflare.com',
    );
  });

  it('returns an empty string for an empty list', () => {
    expect(buildNameServerCopyList([])).toBe('');
  });
});
