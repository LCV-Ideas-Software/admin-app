/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Aba "Versões" do WorkerDetail (PW-1): tabela paginada das versões (id curto
 * copiável, número, criação, autor/source, mensagem, badge Ativa N%) com
 * promote 100%, rollback e split gradual (2 versões somando 100) via POST
 * worker-deployments — confirmação em Dialog (+ frase para protegidos).
 */

import { AlertTriangle, Copy, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/Dialog';
import * as api from '../api';
import { type ParsedWorkerVersion, parseWorkerVersion, shortVersionId, validateSplit } from './versionsHelpers';
import { isProtectedWorker, PROTECTED_CONFIRM_PHRASE } from './workerValidation';

const PER_PAGE = 10;

type DeployAction =
  | { kind: 'promote'; version: ParsedWorkerVersion }
  | { kind: 'rollback'; version: ParsedWorkerVersion }
  | { kind: 'split' };

type VersionsPanelProps = {
  scriptName: string;
  adminActor: string;
};

export function VersionsPanel({ scriptName, adminActor }: VersionsPanelProps) {
  const { showNotification } = useNotification();
  const [versions, setVersions] = useState<ParsedWorkerVersion[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<DeployAction | null>(null);
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [splitA, setSplitA] = useState('');
  const [splitB, setSplitB] = useState('');
  const [splitPercentA, setSplitPercentA] = useState('90');

  const protectedWorker = isProtectedWorker(scriptName);

  const loadVersions = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      try {
        const { response, payload } = await api.fetchWorkerVersions(adminActor, {
          scriptName,
          page: targetPage,
          perPage: PER_PAGE,
        });
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao listar versões.');
        const raw = Array.isArray(payload.versions) ? payload.versions : [];
        setVersions(raw.map(parseWorkerVersion));
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'Falha ao listar versões.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [adminActor, scriptName, showNotification],
  );

  useEffect(() => {
    void loadVersions(page);
  }, [loadVersions, page]);

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      showNotification('Version ID copiado.', 'success');
    } catch {
      showNotification('Não foi possível copiar automaticamente — selecione o texto e copie manualmente.', 'error');
    }
  };

  const activeVersion = versions.find((version) => version.active) ?? null;

  const openAction = (next: DeployAction) => {
    setActionError('');
    setPhrase('');
    if (next.kind === 'split') {
      setSplitA(activeVersion?.id ?? versions[0]?.id ?? '');
      setSplitB(versions.find((version) => version.id !== (activeVersion?.id ?? versions[0]?.id))?.id ?? '');
      setSplitPercentA('90');
    }
    setAction(next);
  };

  const splitEntries = () => {
    const percentA = Number(splitPercentA);
    return [
      { versionId: splitA, percentage: Number.isFinite(percentA) ? percentA : Number.NaN },
      { versionId: splitB, percentage: Number.isFinite(percentA) ? 100 - percentA : Number.NaN },
    ];
  };

  const executeAction = async () => {
    if (!action) return;
    let body: { versions: Array<{ versionId: string; percentage: number }>; message?: string };
    if (action.kind === 'split') {
      const entries = splitEntries();
      const splitError = validateSplit(entries);
      if (splitError) {
        setActionError(splitError);
        return;
      }
      body = { versions: entries, message: 'Split gradual via admin-app' };
    } else if (action.kind === 'rollback') {
      body = { versions: [{ versionId: action.version.id, percentage: 100 }], message: 'Rollback via admin-app' };
    } else {
      body = { versions: [{ versionId: action.version.id, percentage: 100 }], message: 'Promote via admin-app' };
    }

    setBusy(true);
    setActionError('');
    try {
      const { response, payload } = await api.postWorkerDeployments(adminActor, {
        scriptName,
        ...body,
        ...(protectedWorker ? { confirmPhrase: phrase } : {}),
      });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao criar deployment.');
      showNotification(api.withReq('Deployment aplicado.', payload), 'success');
      setAction(null);
      await loadVersions(page);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Falha ao criar deployment.');
    } finally {
      setBusy(false);
    }
  };

  const actionTitle =
    action?.kind === 'split'
      ? 'Split gradual de tráfego'
      : action?.kind === 'rollback'
        ? `Rollback para a versão ${action.version.number ?? shortVersionId(action.version.id)}`
        : action
          ? `Promover versão ${action.version.number ?? shortVersionId(action.version.id)} (100%)`
          : '';

  return (
    <div className="cfpw-detail-section">
      <div className="cfpw-code-header">
        <h3>Versões do Worker</h3>
        <div className="cfpw-code-header-actions">
          <button type="button" className="ghost-button" onClick={() => void loadVersions(page)} disabled={loading}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => openAction({ kind: 'split' })}
            disabled={loading || versions.length < 2}
          >
            Split gradual…
          </button>
        </div>
      </div>

      {loading && versions.length === 0 ? (
        <div className="cfpw-obs-loading">
          <Loader2 size={20} className="spin" /> Carregando versões...
        </div>
      ) : versions.length === 0 ? (
        <div className="cfpw-empty-state">Nenhuma versão encontrada.</div>
      ) : (
        <div className="cfpw-obs-table-wrap">
          <table className="cfpw-obs-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nº</th>
                <th>Criada em</th>
                <th>Autor / Source</th>
                <th>Mensagem</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => {
                const isNewerThanActive =
                  activeVersion?.number != null && version.number != null && version.number > activeVersion.number;
                return (
                  <tr key={version.id}>
                    <td>
                      <code>{shortVersionId(version.id)}</code>{' '}
                      <button
                        type="button"
                        className="cfpw-icon-button"
                        title="Copiar version ID completo"
                        onClick={() => void copyId(version.id)}
                      >
                        <Copy size={12} />
                      </button>
                    </td>
                    <td>{version.number ?? '—'}</td>
                    <td>{api.formatDateTime(version.createdOn)}</td>
                    <td>
                      {version.author ?? '—'}
                      {version.source ? ` · ${version.source}` : ''}
                    </td>
                    <td>{version.message ?? '—'}</td>
                    <td>
                      {version.active ? (
                        <span className="cfpw-status-badge">Ativa {version.percentage ?? 100}%</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {!version.active && (
                        <button
                          type="button"
                          className="ghost-button cfpw-table-action"
                          onClick={() => openAction({ kind: isNewerThanActive ? 'promote' : 'rollback', version })}
                        >
                          {isNewerThanActive ? 'Promover (100%)' : 'Rollback para esta'}
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
              disabled={loading || page === 1}
            >
              ← Anterior
            </button>
            <span style={{ margin: '0 8px' }}>Página {page}</span>
            <button
              type="button"
              className="ghost-button cfpw-table-action"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={loading || versions.length < PER_PAGE}
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      <Dialog open={action !== null} onOpenChange={(nextOpen) => (!nextOpen && !busy ? setAction(null) : undefined)}>
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">
            <AlertTriangle size={18} /> {actionTitle}
          </DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            {action?.kind === 'split'
              ? 'Divide o tráfego entre duas versões (porcentagens somando 100).'
              : 'A versão selecionada passa a receber 100% do tráfego imediatamente.'}
          </DialogDescription>

          {action?.kind === 'split' && (
            <div className="cfpw-split-form">
              <div className="field-group">
                <label htmlFor="cfpw-split-version-a">Versão A</label>
                <select id="cfpw-split-version-a" value={splitA} onChange={(event) => setSplitA(event.target.value)}>
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      #{version.number ?? '—'} · {shortVersionId(version.id)}
                      {version.active ? ' (ativa)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="cfpw-split-version-b">Versão B</label>
                <select id="cfpw-split-version-b" value={splitB} onChange={(event) => setSplitB(event.target.value)}>
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      #{version.number ?? '—'} · {shortVersionId(version.id)}
                      {version.active ? ' (ativa)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="cfpw-split-percent-a">% da versão A (B recebe o restante)</label>
                <input
                  id="cfpw-split-percent-a"
                  type="number"
                  min={1}
                  max={99}
                  value={splitPercentA}
                  onChange={(event) => setSplitPercentA(event.target.value)}
                />
                <p className="field-hint">
                  A: {splitPercentA || '—'}% · B:{' '}
                  {Number.isFinite(Number(splitPercentA)) ? 100 - Number(splitPercentA) : '—'}%
                </p>
              </div>
            </div>
          )}

          {protectedWorker && (
            <div className="cfpw-dialog__warning" role="status">
              <p>'{scriptName}' é um worker de PRODUÇÃO do próprio admin-app.</p>
              <div className="field-group">
                <label htmlFor="cfpw-versions-confirm-phrase">
                  Digite <strong>{PROTECTED_CONFIRM_PHRASE}</strong> para confirmar
                </label>
                <input
                  id="cfpw-versions-confirm-phrase"
                  type="text"
                  autoComplete="off"
                  value={phrase}
                  onChange={(event) => setPhrase(event.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
          )}

          {actionError && (
            <p className="field-error" role="alert">
              {actionError}
            </p>
          )}

          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={() => setAction(null)} disabled={busy}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button cfpw-dialog__danger"
              onClick={() => void executeAction()}
              disabled={busy || (protectedWorker && phrase !== PROTECTED_CONFIRM_PHRASE)}
            >
              {busy ? <Loader2 size={16} className="spin" /> : 'Confirmar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
