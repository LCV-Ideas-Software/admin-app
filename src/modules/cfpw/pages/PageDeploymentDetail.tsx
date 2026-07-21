/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Detalhe de um deployment Pages (PW-3): timeline de stages (status +
 * início/fim + duração), branch/commit/mensagem do trigger, links de
 * url/aliases, log completo em monospace com auto-scroll e polling de 5s via
 * logsOnly enquanto o deployment está ativo (a cada 3º tick refaz o detalhe
 * completo para atualizar os stages; para no unmount). Ações: retry/rollback
 * (ops legados) e exclusão do deployment.
 */

import { AlertTriangle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotification } from '../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/Dialog';
import * as api from '../api';
import { formatDateTime, valueToText } from '../api';
import type { PartialWarning } from '../types';
import { formatStageDuration, isActiveDeploymentStatus } from './pagesHelpers';

const POLL_INTERVAL_MS = 5000;
const FULL_REFRESH_EVERY_TICKS = 3;

type PageDeploymentDetailProps = {
  projectName: string;
  deploymentId: string;
  adminActor: string;
  onBack: () => void;
  /** Chamado após retry/rollback/delete para o chamador recarregar a lista. */
  onChanged: () => void;
};

type LogLine = { ts?: string; line?: string };

const toLogLines = (logs: Record<string, unknown> | null): LogLine[] => {
  if (!logs || !Array.isArray(logs.data)) return [];
  return (logs.data as Array<Record<string, unknown>>).map((entry) => ({
    ...(typeof entry.ts === 'string' ? { ts: entry.ts } : {}),
    ...(typeof entry.line === 'string' ? { line: entry.line } : {}),
  }));
};

export function PageDeploymentDetail({
  projectName,
  deploymentId,
  adminActor,
  onBack,
  onChanged,
}: PageDeploymentDetailProps) {
  const { showNotification } = useNotification();
  const [deployment, setDeployment] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<Record<string, unknown> | null>(null);
  const [warnings, setWarnings] = useState<PartialWarning[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const logRef = useRef<HTMLPreElement | null>(null);

  const load = useCallback(
    async (logsOnly: boolean) => {
      try {
        const { response, payload } = await api.fetchPageDeployment(adminActor, {
          projectName,
          deploymentId,
          ...(logsOnly ? { logsOnly: true } : {}),
        });
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao carregar o deployment.');
        if (payload.logs !== undefined) setLogs(payload.logs ?? null);
        if (!logsOnly) {
          setDeployment(payload.deployment ?? null);
          setWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
        }
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'Falha ao carregar o deployment.', 'error');
      }
    },
    [adminActor, deploymentId, projectName, showNotification],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void load(false).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const latestStage = deployment?.latest_stage as Record<string, unknown> | undefined;
  const polling = isActiveDeploymentStatus(latestStage?.status);

  useEffect(() => {
    if (!polling) return;
    let tick = 0;
    const interval = window.setInterval(() => {
      tick += 1;
      // logsOnly barato a cada tick; detalhe completo a cada 3º tick para
      // atualizar stages/status (e encerrar o polling quando terminar).
      void load(tick % FULL_REFRESH_EVERY_TICKS !== 0);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [polling, load]);

  const logText = toLogLines(logs)
    .map((entry) => `${entry.ts ? `[${entry.ts}] ` : ''}${entry.line ?? ''}`)
    .join('\n');

  // Auto-scroll: acompanha o final do log a cada atualização.
  useEffect(() => {
    const element = logRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [logText]);

  const runOpsAction = async (action: 'retry-page-deployment' | 'rollback-page-deployment') => {
    setActionBusy(true);
    try {
      const { response, payload } = await api.postOps(adminActor, { action, projectName, deploymentId });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `Falha na operação ${action}.`);
      showNotification(api.withReq(`Operação (${action}) concluída.`, payload), 'success');
      await load(false);
      onChanged();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha na operação.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const executeDelete = async () => {
    setActionBusy(true);
    try {
      const { response, payload } = await api.deletePageDeployment(adminActor, { projectName, deploymentId });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao remover o deployment.');
      showNotification(api.withReq(`Deployment ${deploymentId} removido.`, payload), 'success');
      setDeleteOpen(false);
      onChanged();
      onBack();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao remover o deployment.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const trigger = deployment?.deployment_trigger as Record<string, unknown> | undefined;
  const metadata = trigger?.metadata as Record<string, unknown> | undefined;
  const stages = Array.isArray(deployment?.stages) ? (deployment?.stages as Array<Record<string, unknown>>) : [];
  const aliases = Array.isArray(deployment?.aliases) ? (deployment?.aliases as unknown[]) : [];
  const url = valueToText(deployment?.url);
  const commitHash = String(metadata?.commit_hash ?? '').trim();

  return (
    <div className="cfpw-panel-card">
      <div className="cfpw-code-header">
        <h3>
          Deployment {deploymentId.slice(0, 8)} {loading && <Loader2 size={14} className="spin" />}
          {polling && <span className="cfpw-status-badge warning">em andamento</span>}
        </h3>
        <div className="cfpw-code-header-actions">
          <button type="button" className="ghost-button" onClick={onBack} disabled={actionBusy}>
            ← Voltar à lista
          </button>
          <button type="button" className="ghost-button" onClick={() => void load(false)} disabled={actionBusy}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => void runOpsAction('retry-page-deployment')}
            disabled={actionBusy}
          >
            Refazer (retry)
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => void runOpsAction('rollback-page-deployment')}
            disabled={actionBusy}
          >
            Rollback
          </button>
          <button
            type="button"
            className="ghost-button"
            style={{ color: '#d93025' }}
            onClick={() => setDeleteOpen(true)}
            disabled={actionBusy}
          >
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="cfpw-inline-warning" role="status">
          <AlertTriangle size={14} />
          <span>{warnings.map((warning) => warning.message ?? warning.code).join(' · ')}</span>
        </div>
      )}

      <div className="cfpw-subsection">
        <h4>Contexto</h4>
        <p>
          Ambiente: <strong>{valueToText(deployment?.environment)}</strong> · Branch:{' '}
          <strong>{valueToText(metadata?.branch)}</strong>
          {commitHash && (
            <>
              {' '}
              · Commit: <code>{commitHash.slice(0, 7)}</code>
            </>
          )}
        </p>
        {String(metadata?.commit_message ?? '').trim() && <p>“{String(metadata?.commit_message).trim()}”</p>}
        {url !== '—' && (
          <p>
            URL:{' '}
            <a href={String(url)} target="_blank" rel="noreferrer">
              {String(url)}
            </a>
          </p>
        )}
        {aliases.length > 0 && (
          <p>
            Aliases:{' '}
            {aliases.map((alias, index) => (
              <span key={String(alias)}>
                {index > 0 && ' · '}
                <a href={String(alias)} target="_blank" rel="noreferrer">
                  {String(alias)}
                </a>
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="cfpw-subsection">
        <h4>Stages</h4>
        {stages.length === 0 ? (
          <div className="cfpw-empty-state">Sem stages reportados.</div>
        ) : (
          <div className="cfpw-stage-list">
            {stages.map((stage) => (
              <div className="cfpw-stage-item" key={String(stage.name)}>
                <strong>{valueToText(stage.name)}</strong>
                <span className="cfpw-status-badge">{valueToText(stage.status)}</span>
                <span>
                  {formatDateTime(typeof stage.started_on === 'string' ? stage.started_on : null)} →{' '}
                  {formatDateTime(typeof stage.ended_on === 'string' ? stage.ended_on : null)} ·{' '}
                  {formatStageDuration(stage.started_on, stage.ended_on)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cfpw-subsection">
        <h4>Log do build {polling && <Loader2 size={12} className="spin" />}</h4>
        {logText === '' ? (
          <div className="cfpw-empty-state">Nenhuma linha de log disponível.</div>
        ) : (
          <pre className="cfpw-deploy-log" ref={logRef}>
            {logText}
          </pre>
        )}
      </div>

      <Dialog
        open={deleteOpen}
        onOpenChange={(nextOpen) => (!nextOpen && !actionBusy ? setDeleteOpen(false) : undefined)}
      >
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">
            <AlertTriangle size={18} /> Excluir deployment
          </DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Remove o deployment {deploymentId} de {projectName} (com force — aliases ativos deixam de responder). Ação
            irreversível.
          </DialogDescription>
          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={() => setDeleteOpen(false)} disabled={actionBusy}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button cfpw-dialog__danger"
              onClick={() => void executeDelete()}
              disabled={actionBusy}
            >
              {actionBusy ? <Loader2 size={16} className="spin" /> : 'Excluir deployment'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
