/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros de validação/proteção de Workers (PW-1): validação do nome de
 * script na criação e o guard client-side de workers protegidos (espelha
 * admin-motor/src/handlers/routes/cfpw/_protected.ts — a frase é validada de
 * verdade no backend; aqui apenas orientamos a UI).
 */

const WORKER_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export const WORKER_NAME_HINT =
  'Use apenas letras minúsculas, dígitos e hífens (sem hífen no início/fim), com no máximo 63 caracteres.';

/** Valida o nome do Worker; devolve mensagem pt-BR ou null quando válido. */
export const validateWorkerName = (name: string): string | null => {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Informe o nome do Worker.';
  }
  if (trimmed.length > 63) {
    return 'Nome muito longo: máximo de 63 caracteres.';
  }
  if (!WORKER_NAME_PATTERN.test(trimmed)) {
    return WORKER_NAME_HINT;
  }
  return null;
};

/** Workers de produção do próprio admin-app (mutações exigem frase de confirmação). */
const PROTECTED_WORKERS = ['admin-motor', 'tlsrpt-motor'];

export const PROTECTED_CONFIRM_PHRASE = 'EU ENTENDO O RISCO';

export const isProtectedWorker = (scriptName: string): boolean => PROTECTED_WORKERS.includes(scriptName.trim());
