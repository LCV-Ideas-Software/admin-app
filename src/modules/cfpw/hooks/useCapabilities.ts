/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useQuery } from '@tanstack/react-query';
import { cfApiErrorMessage, cfApiFetch } from '../../shared/cfApi';
import type { CfpwCapabilities, CfpwCapabilitiesPayload } from '../types';

const CAPABILITIES_STALE_TIME_MS = 5 * 60 * 1000;

const fetchCapabilities = async (): Promise<CfpwCapabilitiesPayload> => {
  const result = await cfApiFetch<CfpwCapabilitiesPayload>('/api/cfpw/capabilities');
  if (!result.ok) {
    throw new Error(cfApiErrorMessage(result, 'Falha ao consultar capacidades Cloudflare'));
  }
  if (!result.data.ok) {
    throw new Error(result.data.error ?? 'Motor reportou falha ao sondar capacidades Cloudflare.');
  }
  return result.data;
};

/**
 * Capacidades Cloudflare sondadas pelo motor (GET /api/cfpw/capabilities),
 * cacheadas via React Query por 5 minutos. Ainda não consumido pelo
 * CfPwModule — ondas futuras condicionam seções da UI a este resultado.
 * @public
 */
export function useCapabilities(): {
  capabilities: CfpwCapabilities | null;
  account: { id: string; source: string } | null;
  probedAt: string | null;
  isLoading: boolean;
  error: Error | null;
} {
  const query = useQuery({
    queryKey: ['cfpw-capabilities'],
    queryFn: fetchCapabilities,
    staleTime: CAPABILITIES_STALE_TIME_MS,
  });

  return {
    capabilities: query.data?.capabilities ?? null,
    account: query.data?.account ?? null,
    probedAt: query.data?.probedAt ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
