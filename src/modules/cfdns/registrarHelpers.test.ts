/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes dos helpers puros dos residuais do Registrar (DNS-4): montagem de
 * contacts no shape da API CF (omissão quando vazio) e badge de expiração.
 */

import { describe, expect, it } from 'vitest';
import { buildRegistrantContacts, EMPTY_REGISTRANT_CONTACT_DRAFT, getExpiryBadge } from './registrarHelpers';

describe('buildRegistrantContacts', () => {
  it('returns undefined when every field is empty (account address book wins)', () => {
    expect(buildRegistrantContacts(EMPTY_REGISTRANT_CONTACT_DRAFT)).toBeUndefined();
    expect(buildRegistrantContacts({ ...EMPTY_REGISTRANT_CONTACT_DRAFT, email: '   ' })).toBeUndefined();
  });

  it('builds the full Cloudflare shape (email/phone at the root, postal_info with country_code)', () => {
    const contacts = buildRegistrantContacts({
      first_name: 'Leonardo',
      last_name: 'Vargas',
      organization: 'LCV Ideas & Software',
      address: 'Rua Exemplo, 100',
      address2: 'Sala 2',
      city: 'Porto Alegre',
      state: 'RS',
      zip: '90000-000',
      country: 'BR',
      email: 'admin@lcv.app.br',
      phone: '+55.51999999999',
    });

    expect(contacts).toEqual({
      registrant: {
        email: 'admin@lcv.app.br',
        phone: '+55.51999999999',
        postal_info: {
          first_name: 'Leonardo',
          last_name: 'Vargas',
          organization: 'LCV Ideas & Software',
          address: 'Rua Exemplo, 100',
          address2: 'Sala 2',
          city: 'Porto Alegre',
          state: 'RS',
          zip: '90000-000',
          country_code: 'BR',
        },
      },
    });
  });

  it('omits empty fields individually and trims values', () => {
    const contacts = buildRegistrantContacts({
      ...EMPTY_REGISTRANT_CONTACT_DRAFT,
      email: '  admin@lcv.app.br  ',
      city: 'Porto Alegre',
    });

    expect(contacts).toEqual({
      registrant: {
        email: 'admin@lcv.app.br',
        postal_info: { city: 'Porto Alegre' },
      },
    });
  });
});

describe('getExpiryBadge', () => {
  it('returns null without an expiry date', () => {
    expect(getExpiryBadge(null)).toBeNull();
  });

  it('warns at 30 days or fewer and stays neutral above the threshold', () => {
    expect(getExpiryBadge(10)).toEqual({ label: 'expira em 10 dia(s)', warning: true });
    expect(getExpiryBadge(30)).toEqual({ label: 'expira em 30 dia(s)', warning: true });
    expect(getExpiryBadge(31)).toEqual({ label: 'expira em 31 dia(s)', warning: false });
    expect(getExpiryBadge(300)).toEqual({ label: 'expira em 300 dia(s)', warning: false });
  });

  it('flags expired registrations', () => {
    expect(getExpiryBadge(-3)).toEqual({ label: 'vencido há 3 dia(s)', warning: true });
  });
});
