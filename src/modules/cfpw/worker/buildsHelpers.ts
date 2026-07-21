/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros da aba Builds (PW-2): parsing defensivo dos builds crus da API
 * Workers Builds (variantes de chave observadas na API/MCP da CF), mapeamento
 * de status/outcome → pill, formatação de duração e normalização das linhas
 * de log ([timestamp, texto] ou string).
 */

export type BuildPillTone = 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'unknown';

export type BuildPill = {
  label: string;
  tone: BuildPillTone;
};

export type ParsedBuild = {
  id: string;
  status: string;
  outcome: string;
  branch: string | null;
  commitHash: string | null;
  commitMessage: string | null;
  createdOn: string | null;
  startedOn: string | null;
  completedOn: string | null;
  raw: Record<string, unknown>;
};

const textOrNull = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  return text || null;
};

/**
 * Mapeia status/outcome do build para a pill exibida. Outcome terminal tem
 * precedência sobre o status (um build "stopped" com outcome "success" é
 * sucesso, não cancelado).
 */
export const mapBuildStatus = (status: unknown, outcome: unknown): BuildPill => {
  const normalizedOutcome = String(outcome ?? '')
    .trim()
    .toLowerCase();
  const normalizedStatus = String(status ?? '')
    .trim()
    .toLowerCase();

  if (normalizedOutcome.includes('success')) return { label: 'sucesso', tone: 'success' };
  if (normalizedOutcome.startsWith('fail') || normalizedOutcome === 'error') return { label: 'falhou', tone: 'failed' };
  if (normalizedOutcome.includes('cancel')) return { label: 'cancelado', tone: 'cancelled' };

  if (normalizedStatus.includes('queue') || normalizedStatus.includes('pending'))
    return { label: 'na fila', tone: 'queued' };
  if (normalizedStatus.includes('run') || normalizedStatus.includes('build') || normalizedStatus.includes('deploy'))
    return { label: 'executando', tone: 'running' };
  if (normalizedStatus.includes('cancel')) return { label: 'cancelado', tone: 'cancelled' };
  if (normalizedStatus.includes('stop')) return { label: 'parado', tone: 'cancelled' };

  return { label: normalizedStatus || '—', tone: 'unknown' };
};

/** Pill em estado não-terminal (habilita "Cancelar" e o polling de 5s). */
export const isBuildInProgress = (pill: BuildPill): boolean => pill.tone === 'queued' || pill.tone === 'running';

/**
 * Duração humana entre início e fim ('—' sem início; 'em andamento' sem fim).
 * Aceita ISO strings; valores não parseáveis viram '—'.
 */
export const formatBuildDuration = (startedOn: string | null, completedOn: string | null): string => {
  if (!startedOn) return '—';
  const start = new Date(startedOn).getTime();
  if (Number.isNaN(start)) return '—';
  if (!completedOn) return 'em andamento';
  const end = new Date(completedOn).getTime();
  if (Number.isNaN(end) || end < start) return '—';

  const totalSeconds = Math.round((end - start) / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

/** Hash curto de commit (7 caracteres) ou null. */
export const shortCommitHash = (hash: string | null): string | null => {
  if (!hash) return null;
  const trimmed = hash.trim();
  return trimmed ? trimmed.slice(0, 7) : null;
};

/**
 * Parsing defensivo de um build cru. As variantes de chave (build_uuid/id,
 * build_outcome/outcome, trigger.trigger_metadata/build_trigger_metadata)
 * cobrem os formatos observados na API de Builds — campos ausentes viram null.
 */
export const parseBuild = (raw: Record<string, unknown>): ParsedBuild => {
  const trigger = (raw.trigger ?? {}) as Record<string, unknown>;
  const triggerMetadata = (trigger.trigger_metadata ??
    raw.build_trigger_metadata ??
    raw.trigger_metadata ??
    {}) as Record<string, unknown>;

  return {
    id: String(raw.build_uuid ?? raw.id ?? '').trim(),
    status: String(raw.status ?? '').trim(),
    outcome: String(raw.build_outcome ?? raw.outcome ?? '').trim(),
    branch: textOrNull(triggerMetadata.branch ?? raw.branch),
    commitHash: textOrNull(triggerMetadata.commit_hash ?? raw.commit_hash),
    commitMessage: textOrNull(triggerMetadata.commit_message ?? raw.commit_message),
    createdOn: textOrNull(raw.created_on ?? raw.created_at),
    startedOn: textOrNull(raw.initializing_on ?? raw.running_on ?? raw.started_on ?? raw.created_on ?? raw.created_at),
    completedOn: textOrNull(raw.stopped_on ?? raw.completed_on ?? raw.finished_on),
    raw,
  };
};

/** Normaliza uma linha de log ([timestamp, texto], objeto {line} ou string). */
export const buildLogLineToText = (line: unknown): string => {
  if (typeof line === 'string') return line;
  if (Array.isArray(line)) {
    // Formato [timestamp, mensagem] da API de logs de build.
    return line
      .filter((part) => typeof part === 'string')
      .join(' ')
      .trim();
  }
  if (line && typeof line === 'object') {
    const record = line as Record<string, unknown>;
    const text = record.line ?? record.message ?? record.text;
    if (typeof text === 'string') return text;
  }
  return String(line ?? '');
};
