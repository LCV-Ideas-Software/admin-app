/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros do Console avançado (PW-2): pré-validação do path contra os
 * regex sources servidos por GET /api/cfpw/raw-allowlist (mesma fonte da
 * validação do servidor em cfpw-api.ts — o servidor segue sendo a autoridade)
 * e validação do corpo JSON de mutações.
 */

/** Pré-valida o path contra os regex sources da allowlist do motor. */
export const isRawPathAllowed = (path: string, patternSources: string[]): boolean => {
  const normalized = path.trim();
  if (!normalized.startsWith('/') || normalized.includes('..')) {
    return false;
  }
  return patternSources.some((source) => {
    try {
      return new RegExp(source).test(normalized);
    } catch {
      // Source inválido vindo do servidor não deve travar o console.
      return false;
    }
  });
};

/**
 * Valida os campos do console antes do envio; devolve mensagem pt-BR ou null.
 * Sem patterns carregados, a checagem de allowlist é pulada (servidor valida).
 */
export const validateRawConsoleInput = (
  method: string,
  path: string,
  bodyJson: string,
  patternSources: string[],
): string | null => {
  const normalizedPath = path.trim();
  if (!normalizedPath) {
    return 'Informe o path da API Cloudflare (começando com "/").';
  }
  if (!normalizedPath.startsWith('/')) {
    return 'O path precisa iniciar com "/".';
  }
  if (normalizedPath.includes('..')) {
    return 'Path inválido: uso de ".." não é permitido.';
  }
  if (patternSources.length > 0 && !isRawPathAllowed(normalizedPath, patternSources)) {
    return 'Path fora do escopo permitido — consulte a allowlist acima.';
  }
  if (method.toUpperCase() !== 'GET' && bodyJson.trim()) {
    try {
      JSON.parse(bodyJson);
    } catch {
      return 'Body inválido: informe JSON válido (ou deixe vazio).';
    }
  }
  return null;
};
