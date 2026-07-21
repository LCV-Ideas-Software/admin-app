/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes dos helpers puros da aba Builds (PW-2): mapeamento status/outcome →
 * pill, duração humana, parsing defensivo de build cru e normalização de
 * linhas de log.
 */

import { describe, expect, it } from 'vitest';
import {
  buildLogLineToText,
  formatBuildDuration,
  isBuildInProgress,
  mapBuildStatus,
  parseBuild,
  shortCommitHash,
} from './buildsHelpers';

describe('mapBuildStatus', () => {
  it('maps terminal outcomes with precedence over status', () => {
    expect(mapBuildStatus('stopped', 'success')).toEqual({ label: 'sucesso', tone: 'success' });
    expect(mapBuildStatus('stopped', 'failure')).toEqual({ label: 'falhou', tone: 'failed' });
    expect(mapBuildStatus('stopped', 'cancelled')).toEqual({ label: 'cancelado', tone: 'cancelled' });
  });

  it('maps non-terminal statuses when outcome is empty', () => {
    expect(mapBuildStatus('queued', '')).toEqual({ label: 'na fila', tone: 'queued' });
    expect(mapBuildStatus('running', undefined)).toEqual({ label: 'executando', tone: 'running' });
    expect(mapBuildStatus('stopped', null)).toEqual({ label: 'parado', tone: 'cancelled' });
  });

  it('falls back to the raw status with unknown tone', () => {
    expect(mapBuildStatus('weird-state', '')).toEqual({ label: 'weird-state', tone: 'unknown' });
    expect(mapBuildStatus('', '')).toEqual({ label: '—', tone: 'unknown' });
  });

  it('flags queued/running as in progress for cancel/polling', () => {
    expect(isBuildInProgress(mapBuildStatus('running', ''))).toBe(true);
    expect(isBuildInProgress(mapBuildStatus('queued', ''))).toBe(true);
    expect(isBuildInProgress(mapBuildStatus('stopped', 'success'))).toBe(false);
  });
});

describe('formatBuildDuration', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatBuildDuration('2026-07-21T10:00:00Z', '2026-07-21T10:00:42Z')).toBe('42s');
    expect(formatBuildDuration('2026-07-21T10:00:00Z', '2026-07-21T10:03:05Z')).toBe('3m 5s');
    expect(formatBuildDuration('2026-07-21T10:00:00Z', '2026-07-21T11:30:00Z')).toBe('1h 30m');
  });

  it('handles missing or invalid boundaries', () => {
    expect(formatBuildDuration(null, '2026-07-21T10:00:00Z')).toBe('—');
    expect(formatBuildDuration('2026-07-21T10:00:00Z', null)).toBe('em andamento');
    expect(formatBuildDuration('não-é-data', '2026-07-21T10:00:00Z')).toBe('—');
    expect(formatBuildDuration('2026-07-21T10:00:00Z', '2026-07-21T09:00:00Z')).toBe('—');
  });
});

describe('parseBuild', () => {
  it('extracts fields from the trigger metadata variant', () => {
    const parsed = parseBuild({
      build_uuid: 'b-1',
      status: 'stopped',
      build_outcome: 'success',
      created_on: '2026-07-21T10:00:00Z',
      stopped_on: '2026-07-21T10:02:00Z',
      trigger: {
        trigger_metadata: { branch: 'main', commit_hash: 'abcdef1234567', commit_message: 'feat: x' },
      },
    });

    expect(parsed.id).toBe('b-1');
    expect(parsed.branch).toBe('main');
    expect(parsed.commitHash).toBe('abcdef1234567');
    expect(parsed.commitMessage).toBe('feat: x');
    expect(parsed.completedOn).toBe('2026-07-21T10:02:00Z');
  });

  it('tolerates missing fields returning nulls', () => {
    const parsed = parseBuild({});
    expect(parsed.id).toBe('');
    expect(parsed.branch).toBeNull();
    expect(parsed.commitHash).toBeNull();
    expect(parsed.createdOn).toBeNull();
    expect(parsed.completedOn).toBeNull();
  });
});

describe('shortCommitHash', () => {
  it('truncates to 7 chars and handles null/empty', () => {
    expect(shortCommitHash('abcdef1234567')).toBe('abcdef1');
    expect(shortCommitHash(null)).toBeNull();
    expect(shortCommitHash('   ')).toBeNull();
  });
});

describe('buildLogLineToText', () => {
  it('normalizes strings, [timestamp, message] tuples and {line} objects', () => {
    expect(buildLogLineToText('linha simples')).toBe('linha simples');
    expect(buildLogLineToText([1752000000, 'Cloning repository...'])).toBe('Cloning repository...');
    expect(buildLogLineToText(['2026-07-21T10:00:00Z', 'npm install'])).toBe('2026-07-21T10:00:00Z npm install');
    expect(buildLogLineToText({ line: 'do objeto' })).toBe('do objeto');
    expect(buildLogLineToText({ message: 'via message' })).toBe('via message');
    expect(buildLogLineToText(42)).toBe('42');
  });
});
