/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros das telas de Pages (PW-3): validação de nome de projeto,
 * duração de stages do deployment, predicado de polling (status ainda ativo)
 * e extração de branches únicas dos deployments carregados.
 */

const PAGES_PROJECT_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,57}$/;

export const PAGES_PROJECT_NAME_HINT =
  'Use apenas letras minúsculas, dígitos e hífens, iniciando com letra ou dígito, com no máximo 58 caracteres.';

/** Valida o nome do projeto Pages; devolve mensagem pt-BR ou null quando válido. */
export const validatePagesProjectName = (name: string): string | null => {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Informe o nome do projeto Pages.';
  }
  if (trimmed.length > 58) {
    return 'Nome muito longo: máximo de 58 caracteres.';
  }
  if (!PAGES_PROJECT_NAME_PATTERN.test(trimmed)) {
    return PAGES_PROJECT_NAME_HINT;
  }
  return null;
};

/** Duração legível entre started_on/ended_on de um stage ('—' quando incompleto/inválido). */
export const formatStageDuration = (startedOn: unknown, endedOn: unknown): string => {
  if (typeof startedOn !== 'string' || typeof endedOn !== 'string') {
    return '—';
  }
  const startMs = Date.parse(startedOn);
  const endMs = Date.parse(endedOn);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return '—';
  }
  const totalSeconds = Math.round((endMs - startMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

/** Status de latest_stage que indicam deployment ainda em andamento (checagem inclusiva). */
const ACTIVE_DEPLOYMENT_STATUSES = new Set([
  'active',
  'pending',
  'running',
  'queued',
  'initializing',
  'building',
  'deploying',
  'cloning',
]);

/** Predicado do polling do log: true enquanto o deployment ainda está em progresso. */
export const isActiveDeploymentStatus = (status: unknown): boolean =>
  typeof status === 'string' && ACTIVE_DEPLOYMENT_STATUSES.has(status.trim().toLowerCase());

/**
 * Branches únicas para o dropdown de "Novo deployment": production branch
 * primeiro, depois as branches vistas nos deployments carregados (ordem de
 * aparição, sem duplicatas nem vazios).
 */
export const extractBranchOptions = (
  deployments: Array<Record<string, unknown>>,
  productionBranch: string | null | undefined,
): string[] => {
  const options: string[] = [];
  const seen = new Set<string>();

  const push = (raw: unknown) => {
    const branch = String(raw ?? '').trim();
    if (!branch || seen.has(branch)) {
      return;
    }
    seen.add(branch);
    options.push(branch);
  };

  push(productionBranch);
  for (const deployment of deployments) {
    const trigger = deployment.deployment_trigger as Record<string, unknown> | undefined;
    const metadata = trigger?.metadata as Record<string, unknown> | undefined;
    push(metadata?.branch);
  }

  return options;
};
