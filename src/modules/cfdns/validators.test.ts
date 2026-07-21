/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes das validações DNS-1: novos tipos estruturados (DS/DNSKEY/SSHFP/
 * SMIMEA/TLSA/CERT/LOC/NAPTR), tags, filtros avançados e mapeamento
 * draft → data do upsert.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_ADVANCED_FILTERS, DEFAULT_DRAFT, type DnsRecord, type EditorDraft } from './types';
import {
  buildRecordDataFromDraft,
  countActiveAdvancedFilters,
  formatRecordContent,
  parseCertDraft,
  parseCommonRecordDraft,
  parseDnskeyDraft,
  parseDsDraft,
  parseLocDraft,
  parseNaptrDraft,
  parseSshfpDraft,
  parseStructuredDraft,
  parseTlsaDraft,
  validateDnsTag,
} from './validators';

const VALID_LOC = {
  latDegrees: '37',
  latMinutes: '46',
  latSeconds: '46.461',
  latDirection: 'N',
  longDegrees: '122',
  longMinutes: '23',
  longSeconds: '35.541',
  longDirection: 'W',
  altitude: '0',
  size: '100',
  precisionHorz: '10',
  precisionVert: '2',
};

describe('parseDsDraft', () => {
  it('accepts a valid DS draft', () => {
    expect(parseDsDraft('2371', '13', '2', '48DB4A9AF12E').issues).toEqual([]);
  });

  it('rejects key_tag above 65535', () => {
    expect(parseDsDraft('65536', '13', '2', 'ABCDEF').issues).toContain('DS key_tag deve ser inteiro entre 0 e 65535.');
  });

  it('rejects non-hex digest', () => {
    expect(parseDsDraft('2371', '13', '2', 'zz-not-hex').issues).toContain(
      'DS digest deve ser hexadecimal (0-9, A-F).',
    );
  });
});

describe('parseDnskeyDraft', () => {
  it('accepts a valid DNSKEY draft', () => {
    expect(parseDnskeyDraft('257', '3', '13', 'mdsswUyr3DPW132mOi8V9xESWE8jTo0d').issues).toEqual([]);
  });

  it('rejects flags above 65535 and empty public_key', () => {
    const { issues } = parseDnskeyDraft('65536', '3', '13', '');
    expect(issues).toContain('DNSKEY flags deve ser inteiro entre 0 e 65535.');
    expect(issues).toContain('DNSKEY public_key é obrigatório.');
  });
});

describe('parseSshfpDraft', () => {
  it('accepts a valid SSHFP draft', () => {
    expect(parseSshfpDraft('4', '2', 'aa38104b0b9b20b8e4b0').issues).toEqual([]);
  });

  it('rejects type above 255 and non-hex fingerprint', () => {
    const { issues } = parseSshfpDraft('4', '256', 'ghij');
    expect(issues).toContain('SSHFP type deve ser inteiro entre 0 e 255.');
    expect(issues).toContain('SSHFP fingerprint deve ser hexadecimal (0-9, A-F).');
  });
});

describe('parseTlsaDraft (TLSA e SMIMEA)', () => {
  it('accepts a valid TLSA draft', () => {
    expect(parseTlsaDraft('TLSA', '3', '1', '1', 'abc123def456').issues).toEqual([]);
  });

  it('rejects usage above 255 naming the SMIMEA label', () => {
    const { issues } = parseTlsaDraft('SMIMEA', '256', '1', '1', 'abc123');
    expect(issues).toContain('SMIMEA usage deve ser inteiro entre 0 e 255.');
  });

  it('rejects empty certificate', () => {
    expect(parseTlsaDraft('TLSA', '3', '1', '1', '  ').issues).toContain('TLSA certificate é obrigatório.');
  });
});

describe('parseCertDraft', () => {
  it('accepts a valid CERT draft', () => {
    expect(parseCertDraft('1', '0', '13', 'MIIBIjANBgkq').issues).toEqual([]);
  });

  it('rejects type above 65535 and algorithm below 0', () => {
    const { issues } = parseCertDraft('65536', '0', '-1', 'MIIBIjANBgkq');
    expect(issues).toContain('CERT type deve ser inteiro entre 0 e 65535.');
    expect(issues).toContain('CERT algorithm deve ser inteiro entre 0 e 255.');
  });
});

describe('parseLocDraft', () => {
  it('accepts a valid LOC draft', () => {
    expect(parseLocDraft(VALID_LOC).issues).toEqual([]);
  });

  it("rejects lat_direction 'X'", () => {
    expect(parseLocDraft({ ...VALID_LOC, latDirection: 'X' }).issues).toContain('LOC lat_direction deve ser N ou S.');
  });

  it('rejects lat_seconds above 59.999 and altitude below -100000', () => {
    const { issues } = parseLocDraft({ ...VALID_LOC, latSeconds: '60', altitude: '-100001' });
    expect(issues).toContain('LOC lat_seconds deve ser número entre 0 e 59.999.');
    expect(issues).toContain('LOC altitude deve ser número entre -100000 e 42849672.95.');
  });
});

describe('parseNaptrDraft', () => {
  it('accepts a valid NAPTR draft', () => {
    expect(parseNaptrDraft('10', '10', 'S', 'SIP+D2U', '', '.').issues).toEqual([]);
  });

  it('rejects missing service', () => {
    expect(parseNaptrDraft('10', '10', 'S', '', '', '.').issues).toContain('NAPTR service é obrigatório.');
  });

  it('rejects order above 65535', () => {
    expect(parseNaptrDraft('65536', '10', 'S', 'SIP+D2U', '', '.').issues).toContain(
      'NAPTR order deve ser inteiro entre 0 e 65535.',
    );
  });
});

describe('parseStructuredDraft', () => {
  it('dispatches by draft type and returns empty for content-based types', () => {
    const dsDraft: EditorDraft = { ...DEFAULT_DRAFT, type: 'DS', dsKeyTag: '65536' };
    expect(parseStructuredDraft(dsDraft).issues).toContain('DS key_tag deve ser inteiro entre 0 e 65535.');
    expect(parseStructuredDraft({ ...DEFAULT_DRAFT, type: 'A' }).issues).toEqual([]);
    expect(parseStructuredDraft({ ...DEFAULT_DRAFT, type: 'OPENPGPKEY' }).issues).toEqual([]);
  });
});

describe('validateDnsTag', () => {
  it('accepts nome-only and nome:valor with unicode value', () => {
    expect(validateDnsTag('ambiente')).toBeNull();
    expect(validateDnsTag('ambiente:produção')).toBeNull();
  });

  it('rejects a 33-character name', () => {
    expect(validateDnsTag('a'.repeat(33))).toMatch(/Tag inválida/);
  });

  it('rejects value longer than 100 characters and invalid name characters', () => {
    expect(validateDnsTag(`nome:${'v'.repeat(101)}`)).toMatch(/Tag inválida/);
    expect(validateDnsTag('nome com espaço')).toMatch(/Tag inválida/);
  });

  it('rejects empty tag', () => {
    expect(validateDnsTag('   ')).toBe('Tag vazia não é permitida.');
  });
});

describe('parseCommonRecordDraft (PTR/NS hostname)', () => {
  it('keeps hostname validation for PTR and NS content', () => {
    expect(parseCommonRecordDraft('PTR', 'ptr.example.com', 'host inválido!', '', false).issues).toContain(
      'Registro PTR exige hostname válido no conteúdo.',
    );
    expect(parseCommonRecordDraft('NS', 'sub.example.com', 'ns1.example.com', '', false).issues).toEqual([]);
  });
});

describe('countActiveAdvancedFilters', () => {
  it('counts only non-empty filters', () => {
    expect(countActiveAdvancedFilters(DEFAULT_ADVANCED_FILTERS)).toBe(0);
    expect(
      countActiveAdvancedFilters({ ...DEFAULT_ADVANCED_FILTERS, nameContains: 'www', proxied: 'true', match: 'any' }),
    ).toBe(3);
  });
});

describe('buildRecordDataFromDraft', () => {
  it('keeps the SRV mapping and returns null for content-based types', () => {
    const srvDraft: EditorDraft = {
      ...DEFAULT_DRAFT,
      type: 'SRV',
      srvService: '_sip',
      srvProto: '_tcp',
      srvName: 'example.com',
      srvPriority: '10',
      srvWeight: '20',
      srvPort: '5060',
      srvTarget: 'sip.example.com',
    };
    expect(buildRecordDataFromDraft(srvDraft)).toEqual({
      service: '_sip',
      proto: '_tcp',
      name: 'example.com',
      priority: 10,
      weight: 20,
      port: 5060,
      target: 'sip.example.com',
    });
    expect(buildRecordDataFromDraft({ ...DEFAULT_DRAFT, type: 'A' })).toBeNull();
    expect(buildRecordDataFromDraft({ ...DEFAULT_DRAFT, type: 'OPENPGPKEY' })).toBeNull();
  });

  it('maps DS and LOC drafts to numeric data payloads', () => {
    const dsDraft: EditorDraft = {
      ...DEFAULT_DRAFT,
      type: 'DS',
      dsKeyTag: '2371',
      dsAlgorithm: '13',
      dsDigestType: '2',
      dsDigest: '48DB4A9AF12E',
    };
    expect(buildRecordDataFromDraft(dsDraft)).toEqual({
      key_tag: 2371,
      algorithm: 13,
      digest_type: 2,
      digest: '48DB4A9AF12E',
    });

    const locDraft: EditorDraft = {
      ...DEFAULT_DRAFT,
      type: 'LOC',
      locLatDegrees: '37',
      locLatMinutes: '46',
      locLatSeconds: '46.461',
      locLatDirection: 'n',
      locLongDegrees: '122',
      locLongMinutes: '23',
      locLongSeconds: '35.541',
      locLongDirection: 'w',
      locAltitude: '0',
      locSize: '100',
      locPrecisionHorz: '10',
      locPrecisionVert: '2',
    };
    expect(buildRecordDataFromDraft(locDraft)).toEqual({
      lat_degrees: 37,
      lat_minutes: 46,
      lat_seconds: 46.461,
      lat_direction: 'N',
      long_degrees: 122,
      long_minutes: 23,
      long_seconds: 35.541,
      long_direction: 'W',
      altitude: 0,
      size: 100,
      precision_horz: 10,
      precision_vert: 2,
    });
  });
});

describe('formatRecordContent (novos shapes de data)', () => {
  it('renders DS, SSHFP and NAPTR data readably', () => {
    const dsRecord: DnsRecord = {
      type: 'DS',
      data: { key_tag: 2371, algorithm: 13, digest_type: 2, digest: '48DB4A9AF12E' },
    };
    expect(formatRecordContent(dsRecord)).toBe('2371 13 2 48DB4A9AF12E');

    const sshfpRecord: DnsRecord = { type: 'SSHFP', data: { algorithm: 4, type: 2, fingerprint: 'aa38104b' } };
    expect(formatRecordContent(sshfpRecord)).toBe('4 2 aa38104b');

    const naptrRecord: DnsRecord = {
      type: 'NAPTR',
      data: { order: 10, preference: 10, flags: 'S', service: 'SIP+D2U', regex: '', replacement: '.' },
    };
    expect(formatRecordContent(naptrRecord)).toBe('10 10 "S" "SIP+D2U" "" .');
  });

  it('renders LOC data with metric suffixes', () => {
    const locRecord: DnsRecord = {
      type: 'LOC',
      data: {
        lat_degrees: 37,
        lat_minutes: 46,
        lat_seconds: 46.461,
        lat_direction: 'N',
        long_degrees: 122,
        long_minutes: 23,
        long_seconds: 35.541,
        long_direction: 'W',
        altitude: 0,
        size: 100,
        precision_horz: 10,
        precision_vert: 2,
      },
    };
    expect(formatRecordContent(locRecord)).toBe('37 46 46.461 N 122 23 35.541 W 0m 100m 10m 2m');
  });
});
