/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Aba "Builds" do WorkerDetail (PW-2, Workers Builds/CI): checa a conexão de
 * CI via build-config (404 CF → empty state com deep-link para o dashboard,
 * já que a conexão do GitHub App só existe lá), lista os builds com pill de
 * status/branch/commit/duração e abre o detalhe com viewer de logs
 * (monoespaçado, auto-scroll, "Carregar mais" por cursor e polling de 5s
 * enquanto o build roda). Ações: Reexecutar (retry com branch opcional) e
 * Cancelar (somente builds na fila/executando).
 */

import { AlertTriangle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotification } from '../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/Dialog';
import * as api from '../api';
import {
  buildLogLineToText,
  formatBuildDuration,
  isBuildInProgress,
  mapBuildStatus,
  type ParsedBuild,
  parseBuild,
  shortCommitHash,
} from './buildsHelpers';

const PER_PAGE = 20;
const RUNNING_POLL_MS = 5_000;

type BuildsPanelProps = {
  scriptName: string;
  adminActor: string;
};

export function BuildsPanel({ scriptName, adminActor }: BuildsPanelProps) {
  const { showNotification } = useNotification();

  const [configLoading, setConfigLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);

  const [builds, setBuilds] = useState<ParsedBuild[]>([]);
  const [buildsLoading, setBuildsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<ParsedBuild | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logCursor, setLogCursor] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  const [retryOpen, setRetryOpen] = useState(false);
  const [retryBranch, setRetryBranch] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const deepLink = `https://dash.cloudflare.com/?to=/:account/workers/services/view/${encodeURIComponent(scriptName)}/production/settings`;

  const loadBuilds = useCallback(
    async (targetPage: number): Promise<ParsedBuild[]> => {
      setBuildsLoading(true);
      try {
        const { response, payload } = await api.fetchBuilds(adminActor, {
          scriptName,
          page: targetPage,
          perPage: PER_PAGE,
        });
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao listar builds.');
        const raw = Array.isArray(payload.builds) ? payload.builds : [];
        const parsed = raw.map(parseBuild);
        setBuilds(parsed);
        return parsed;
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'Falha ao listar builds.', 'error');
        return [];
      } finally {
        setBuildsLoading(false);
      }
    },
    [adminActor, scriptName, showNotification],
  );

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const { response, payload } = await api.fetchBuildConfig(adminActor, scriptName);
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao ler config de builds.');
      setConnected(payload.connected === true);
    } catch (error) {
      setConnected(null);
      showNotification(error instanceof Error ? error.message : 'Falha ao ler config de builds.', 'error');
    } finally {
      setConfigLoading(false);
    }
  }, [adminActor, scriptName, showNotification]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (connected === true) void loadBuilds(page);
  }, [connected, page, loadBuilds]);

  // ── Detalhe + logs ──

  const loadLogs = useCallback(
    async (buildId: string, cursor: string | null, append: boolean) => {
      setLogsLoading(true);
      try {
        const { response, payload } = await api.fetchBuildLogs(adminActor, {
          buildId,
          ...(cursor ? { cursor } : {}),
        });
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao ler logs do build.');
        const lines = (Array.isArray(payload.lines) ? payload.lines : []).map(buildLogLineToText);
        setLogLines((prev) => (append ? [...prev, ...lines] : lines));
        setLogCursor(payload.cursor ?? null);
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'Falha ao ler logs do build.', 'error');
      } finally {
        setLogsLoading(false);
      }
    },
    [adminActor, showNotification],
  );

  const openBuild = (build: ParsedBuild) => {
    setSelected(build);
    setLogLines([]);
    setLogCursor(null);
    void loadLogs(build.id, null, false);
  };

  const closeBuild = () => {
    setSelected(null);
    setLogLines([]);
    setLogCursor(null);
  };

  // Polling de 5s enquanto o build selecionado ainda roda (limpo no unmount).
  useEffect(() => {
    if (!selected || !isBuildInProgress(mapBuildStatus(selected.status, selected.outcome))) return;
    const interval = setInterval(() => {
      void loadLogs(selected.id, null, false);
      void loadBuilds(page).then((refreshedList) => {
        const refreshed = refreshedList.find((item) => item.id === selected.id);
        if (refreshed) setSelected(refreshed);
      });
    }, RUNNING_POLL_MS);
    return () => clearInterval(interval);
  }, [selected, page, loadLogs, loadBuilds]);

  // Auto-scroll para o fim do log a cada atualização.
  useEffect(() => {
    const container = logContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [logLines]);

  // ── Ações ──

  const runRetry = async () => {
    setActionBusy(true);
    try {
      const branch = retryBranch.trim();
      const { response, payload } = await api.postBuildRetry(adminActor, {
        scriptName,
        ...(branch ? { branch } : {}),
      });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao reexecutar build.');
      showNotification(api.withReq('Novo build disparado.', payload), 'success');
      setRetryOpen(false);
      setRetryBranch('');
      closeBuild();
      await loadBuilds(1);
      setPage(1);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao reexecutar build.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const runCancel = async (build: ParsedBuild) => {
    setActionBusy(true);
    try {
      const { response, payload } = await api.postBuildCancel(adminActor, { buildId: build.id });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao cancelar build.');
      showNotification(api.withReq('Build cancelado.', payload), 'success');
      await loadBuilds(page);
      if (selected?.id === build.id) void loadLogs(build.id, null, false);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao cancelar build.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  // ── Renderização ──

  if (configLoading) {
    return (
      <div className="cfpw-detail-section">
        <div className="cfpw-obs-loading">
          <Loader2 size={20} className="spin" /> Verificando conexão de CI (Workers Builds)...
        </div>
      </div>
    );
  }

  if (connected === false) {
    return (
      <div className="cfpw-detail-section">
        <h3>Builds (CI/CD)</h3>
        <div className="cfpw-empty-state cfpw-builds-empty">
          <p>
            <strong>Worker sem CI conectado.</strong>
          </p>
          <p>
            A conexão com o repositório (GitHub App) só pode ser feita no dashboard da Cloudflare — a API não expõe o
            fluxo de instalação do app.
          </p>
          <a className="ghost-button" href={deepLink} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Conectar repositório no dashboard
          </a>
        </div>
      </div>
    );
  }

  if (connected === null) {
    return (
      <div className="cfpw-detail-section">
        <h3>Builds (CI/CD)</h3>
        <div className="cfpw-empty-state">
          Não foi possível verificar a conexão de CI deste Worker.
          <button
            type="button"
            className="ghost-button"
            style={{ marginLeft: '8px' }}
            onClick={() => void loadConfig()}
          >
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const selectedPill = selected ? mapBuildStatus(selected.status, selected.outcome) : null;

  return (
    <div className="cfpw-detail-section">
      <div className="cfpw-code-header">
        <h3>Builds (CI/CD)</h3>
        <div className="cfpw-code-header-actions">
          <button type="button" className="ghost-button" onClick={() => void loadBuilds(page)} disabled={buildsLoading}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button type="button" className="primary-button" onClick={() => setRetryOpen(true)} disabled={actionBusy}>
            Reexecutar…
          </button>
        </div>
      </div>

      {selected ? (
        <div className="cfpw-build-detail">
          <button type="button" className="ghost-button" onClick={closeBuild} style={{ alignSelf: 'flex-start' }}>
            ← Voltar aos builds
          </button>
          <div className="cfpw-build-detail-meta">
            <span className={`cfpw-build-pill cfpw-build-pill--${selectedPill?.tone}`}>{selectedPill?.label}</span>
            <code>{selected.id}</code>
            <span>{selected.branch ?? '—'}</span>
            <span>
              {shortCommitHash(selected.commitHash) ?? '—'}
              {selected.commitMessage ? ` · ${selected.commitMessage}` : ''}
            </span>
            <span>Início: {api.formatDateTime(selected.startedOn)}</span>
            <span>Duração: {formatBuildDuration(selected.startedOn, selected.completedOn)}</span>
            {selectedPill && isBuildInProgress(selectedPill) && (
              <button
                type="button"
                className="ghost-button cfpw-table-action"
                onClick={() => void runCancel(selected)}
                disabled={actionBusy}
              >
                Cancelar
              </button>
            )}
          </div>
          <div className="cfpw-build-log" ref={logContainerRef}>
            {logLines.length === 0 ? (
              <span className="cfpw-build-log-empty">
                {logsLoading ? 'Carregando logs...' : 'Sem linhas de log para este build.'}
              </span>
            ) : (
              logLines.map((line, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: linhas de log são texto plano sem identidade estável
                <div key={index} className="cfpw-build-log-line">
                  {line}
                </div>
              ))
            )}
          </div>
          <div className="cfpw-build-log-actions">
            {logCursor && (
              <button
                type="button"
                className="ghost-button"
                onClick={() => void loadLogs(selected.id, logCursor, true)}
                disabled={logsLoading}
              >
                {logsLoading ? <Loader2 size={14} className="spin" /> : 'Carregar mais'}
              </button>
            )}
            {selectedPill && isBuildInProgress(selectedPill) && (
              <span className="cfpw-build-polling-hint">
                <Loader2 size={12} className="spin" /> atualizando a cada 5s
              </span>
            )}
          </div>
        </div>
      ) : buildsLoading && builds.length === 0 ? (
        <div className="cfpw-obs-loading">
          <Loader2 size={20} className="spin" /> Carregando builds...
        </div>
      ) : builds.length === 0 ? (
        <div className="cfpw-empty-state">Nenhum build encontrado para este Worker.</div>
      ) : (
        <div className="cfpw-obs-table-wrap">
          <table className="cfpw-obs-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Branch</th>
                <th>Commit</th>
                <th>Início</th>
                <th>Duração</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {builds.map((build) => {
                const pill = mapBuildStatus(build.status, build.outcome);
                return (
                  <tr key={build.id} className="cfpw-obs-row-clickable" onClick={() => openBuild(build)}>
                    <td>
                      <span className={`cfpw-build-pill cfpw-build-pill--${pill.tone}`}>{pill.label}</span>
                    </td>
                    <td>{build.branch ?? '—'}</td>
                    <td>
                      <code>{shortCommitHash(build.commitHash) ?? '—'}</code>
                      {build.commitMessage ? (
                        <span className="cfpw-build-commit-msg"> {build.commitMessage}</span>
                      ) : null}
                    </td>
                    <td>{api.formatDateTime(build.startedOn)}</td>
                    <td>{formatBuildDuration(build.startedOn, build.completedOn)}</td>
                    <td>
                      {isBuildInProgress(pill) && (
                        <button
                          type="button"
                          className="ghost-button cfpw-table-action"
                          onClick={(event) => {
                            event.stopPropagation();
                            void runCancel(build);
                          }}
                          disabled={actionBusy}
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="cfpw-obs-table-footer">
            <button
              type="button"
              className="ghost-button cfpw-table-action"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={buildsLoading || page === 1}
            >
              ← Anterior
            </button>
            <span style={{ margin: '0 8px' }}>Página {page}</span>
            <button
              type="button"
              className="ghost-button cfpw-table-action"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={buildsLoading || builds.length < PER_PAGE}
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      <Dialog
        open={retryOpen}
        onOpenChange={(nextOpen) => (!nextOpen && !actionBusy ? setRetryOpen(false) : undefined)}
      >
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">
            <AlertTriangle size={18} /> Reexecutar build
          </DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Dispara um novo build pelo trigger de CI conectado. A branch é opcional (vazio usa a branch do trigger).
          </DialogDescription>
          <div className="field-group">
            <label htmlFor="cfpw-build-retry-branch">Branch (opcional)</label>
            <input
              id="cfpw-build-retry-branch"
              type="text"
              placeholder="main"
              value={retryBranch}
              onChange={(event) => setRetryBranch(event.target.value)}
              disabled={actionBusy}
            />
          </div>
          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={() => setRetryOpen(false)} disabled={actionBusy}>
              Cancelar
            </button>
            <button type="button" className="primary-button" onClick={() => void runRetry()} disabled={actionBusy}>
              {actionBusy ? <Loader2 size={16} className="spin" /> : 'Disparar build'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
