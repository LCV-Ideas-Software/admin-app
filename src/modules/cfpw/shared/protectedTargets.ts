/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Alvos protegidos do módulo CF P&W: recursos que servem a própria admin-app
 * em produção — excluí-los derruba esta interface. Espelho do guard do motor
 * (admin-motor routes/cfpw/_protected.ts, que segue sendo a autoridade): o
 * modal exige a frase extra e a envia como confirmPhrase no POST de exclusão.
 */

import type { DetailType } from '../types';

export const PROTECTED_CONFIRM_PHRASE = 'EU ENTENDO O RISCO';

const PROTECTED_WORKERS = ['admin-motor', 'tlsrpt-motor'];
const PROTECTED_PAGES_PROJECTS = ['admin-app'];

/** Worker/projeto Pages que serve a própria admin-app em produção. */
export const isProtectedTarget = (type: DetailType, id: string): boolean =>
  type === 'worker' ? PROTECTED_WORKERS.includes(id) : PROTECTED_PAGES_PROJECTS.includes(id);
