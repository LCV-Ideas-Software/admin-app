/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback } from 'react';
import { useNotification } from '../../../components/Notification';
import type { ApiResult } from '../../../lib/apiClient';
import { cfApiErrorMessage, cfApiFetch } from '../../shared/cfApi';

const CFPW_BASE_PATH = '/api/cfpw';

/**
 * Wrapper fino sobre cfApi.ts para o módulo cfpw: `get`/`post` já prefixados
 * com /api/cfpw e toast de erro diagnóstico em pt-BR via useNotification.
 * Ainda não consumido — ondas futuras migram os fetch sites do CfPwModule.
 * @public
 */
export function useCfpwApi() {
  const { showNotification } = useNotification();

  const get = useCallback(
    async <T>(path: string, contexto: string): Promise<ApiResult<T>> => {
      const result = await cfApiFetch<T>(`${CFPW_BASE_PATH}${path}`);
      if (!result.ok) {
        showNotification(cfApiErrorMessage(result, contexto), 'error');
      }
      return result;
    },
    [showNotification],
  );

  const post = useCallback(
    async <T>(path: string, body: unknown, contexto: string): Promise<ApiResult<T>> => {
      const result = await cfApiFetch<T>(`${CFPW_BASE_PATH}${path}`, { method: 'POST', body });
      if (!result.ok) {
        showNotification(cfApiErrorMessage(result, contexto), 'error');
      }
      return result;
    },
    [showNotification],
  );

  return { get, post };
}
