/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros dos residuais do Registrar (DNS-4): montagem do contato de
 * registrante no shape da API Cloudflare e badge de countdown de expiração.
 */

/** Campos do accordion "Contato do registrante" (todos opcionais). */
export type RegistrantContactDraft = {
  first_name: string;
  last_name: string;
  organization: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email: string;
  phone: string;
};

export const EMPTY_REGISTRANT_CONTACT_DRAFT: RegistrantContactDraft = {
  first_name: '',
  last_name: '',
  organization: '',
  address: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  email: '',
  phone: '',
};

const POSTAL_FIELDS = [
  'first_name',
  'last_name',
  'organization',
  'address',
  'address2',
  'city',
  'state',
  'zip',
] as const;

/**
 * Monta `contacts: {registrant: {...}}` no shape da API CF (email/phone na
 * raiz; demais em postal_info, com country → country_code). Campos vazios são
 * omitidos individualmente; com TODOS vazios devolve undefined — o backend
 * então usa o address book padrão da conta Cloudflare.
 */
export const buildRegistrantContacts = (draft: RegistrantContactDraft): Record<string, unknown> | undefined => {
  const trimmed = Object.fromEntries(
    Object.entries(draft).map(([key, value]) => [key, String(value ?? '').trim()]),
  ) as Record<keyof RegistrantContactDraft, string>;

  const registrant: Record<string, unknown> = {};
  if (trimmed.email) {
    registrant.email = trimmed.email;
  }
  if (trimmed.phone) {
    registrant.phone = trimmed.phone;
  }

  const postalInfo: Record<string, string> = {};
  for (const field of POSTAL_FIELDS) {
    if (trimmed[field]) {
      postalInfo[field] = trimmed[field];
    }
  }
  if (trimmed.country) {
    postalInfo.country_code = trimmed.country;
  }
  if (Object.keys(postalInfo).length > 0) {
    registrant.postal_info = postalInfo;
  }

  if (Object.keys(registrant).length === 0) {
    return undefined;
  }
  return { registrant };
};

export const EXPIRY_WARNING_DAYS = 30;

export type ExpiryBadge = {
  label: string;
  warning: boolean;
};

/** Badge "expira em N dias" (warning quando ≤30 dias ou vencido); null sem data. */
export const getExpiryBadge = (daysUntilExpiry: number | null): ExpiryBadge | null => {
  if (daysUntilExpiry == null) {
    return null;
  }
  if (daysUntilExpiry < 0) {
    return { label: `vencido há ${Math.abs(daysUntilExpiry)} dia(s)`, warning: true };
  }
  return { label: `expira em ${daysUntilExpiry} dia(s)`, warning: daysUntilExpiry <= EXPIRY_WARNING_DAYS };
};
