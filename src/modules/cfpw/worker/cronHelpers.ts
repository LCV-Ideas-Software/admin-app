/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros do painel de cron triggers (PW-1): validação client-side via
 * croner, próximas execuções em UTC (Cloudflare avalia crons em UTC) e
 * descrição humanizada pt-BR via cronstrue.
 */

import { Cron } from 'croner';
import cronstrue from 'cronstrue';
import 'cronstrue/locales/pt_BR';

/** Valida a expressão cron; devolve mensagem pt-BR ou null quando válida. */
export const validateCronExpression = (expression: string): string | null => {
  const trimmed = expression.trim();
  if (!trimmed) {
    return 'Informe a expressão cron.';
  }
  try {
    new Cron(trimmed, { paused: true });
    return null;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return `Expressão cron inválida: ${detail}`;
  }
};

/** Próximas `count` execuções em UTC a partir de `from` (default: agora). */
export const cronNextRunsUtc = (expression: string, count: number, from?: Date): Date[] => {
  try {
    const cron = new Cron(expression.trim(), { paused: true, timezone: 'UTC' });
    return cron.nextRuns(count, from);
  } catch {
    return [];
  }
};

/** Formata um instante como "YYYY-MM-DD HH:mm UTC". */
export const formatUtcInstant = (date: Date): string => `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;

/** Descrição humanizada pt-BR da expressão; string vazia quando inválida. */
export const describeCronPtBr = (expression: string): string => {
  try {
    return cronstrue.toString(expression.trim(), { locale: 'pt_BR' });
  } catch {
    return '';
  }
};
