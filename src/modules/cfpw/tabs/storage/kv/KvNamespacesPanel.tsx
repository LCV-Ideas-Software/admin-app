/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Painel de namespaces KV (ST-KV): tabela com título e id copiável, busca por
 * título (server-side no motor), paginação por página, criação, renomeação e
 * exclusão com confirmação por digitação do título exato.
 */

import { Copy, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../../../components/ui/Dialog';
import { cfApiErrorMessage, cfApiFetch } from '../../../../shared/cfApi';
import * as api from '../../../api';
import type { KvNamespaceSummary, KvNamespacesPagination, KvNamespacesPayload } from '../../../types';

const NAMESPACES_PER_PAGE = 20;
const NAMESPACE_TITLE_MAX_CHARS = 512;

type KvNamespacesPanelProps = {
  adminActor: string;
  onSelect: (namespace: KvNamespaceSummary) => void;
};

export function KvNamespacesPanel({ adminActor, onSelect }: KvNamespacesPanelProps) {
  const { showNotification } = useNotification();

  const [namespaces, setNamespaces] = useState<KvNamespaceSummary[]>([]);
  const [pagination, setPagination] = useState<KvNamespacesPagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [renameTarget, setRenameTarget] = useState<KvNamespaceSummary | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<KvNamespaceSummary | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const query = new URLSearchParams({ page: String(page), perPage: String(NAMESPACES_PER_PAGE) });
      if (appliedSearch) query.set('search', appliedSearch);
      const result = await cfApiFetch<KvNamespacesPayload>(`/api/cfpw/storage/kv/namespaces?${query.toString()}`);
      if (cancelled) return;
      if (!result.ok) {
        showNotification(cfApiErrorMessage(result, 'Falha ao listar namespaces KV'), 'error');
      } else if (!result.data.ok) {
        showNotification(result.data.error ?? 'Motor reportou falha ao listar namespaces KV.', 'error');
      } else {
        setNamespaces(result.data.namespaces ?? []);
        setPagination(result.data.pagination ?? null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [page, appliedSearch, reloadNonce, showNotification]);

  const reload = useCallback(() => setReloadNonce((nonce) => nonce + 1), []);

  const applySearch = () => {
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const copyNamespaceId = async (namespaceId: string) => {
    try {
      await navigator.clipboard.writeText(namespaceId);
      showNotification('ID do namespace copiado.', 'success');
    } catch {
      showNotification('Falha ao copiar o ID — copie manualmente.', 'error');
    }
  };

  const closeDialogs = () => {
    if (dialogBusy) return;
    setCreateOpen(false);
    setRenameTarget(null);
    setDeleteTarget(null);
    setCreateTitle('');
    setRenameTitle('');
    setDeleteConfirmTitle('');
    setDialogError('');
  };

  const runCreate = async () => {
    const title = createTitle.trim();
    if (!title || title.length > NAMESPACE_TITLE_MAX_CHARS) {
      setDialogError(`Informe um título de 1 a ${NAMESPACE_TITLE_MAX_CHARS} caracteres.`);
      return;
    }
    setDialogBusy(true);
    setDialogError('');
    try {
      const { response, payload } = await api.createKvNamespace(adminActor, { title });
      if (!response.ok || !payload.ok)
        throw new Error(payload.error ?? `Falha ao criar namespace (HTTP ${response.status}).`);
      showNotification(api.withReq(`Namespace "${title}" criado.`, payload), 'success');
      setDialogBusy(false);
      closeDialogs();
      reload();
    } catch (error) {
      setDialogBusy(false);
      setDialogError(error instanceof Error ? error.message : 'Falha ao criar namespace KV.');
    }
  };

  const runRename = async () => {
    if (!renameTarget) return;
    const title = renameTitle.trim();
    if (!title || title.length > NAMESPACE_TITLE_MAX_CHARS) {
      setDialogError(`Informe um título de 1 a ${NAMESPACE_TITLE_MAX_CHARS} caracteres.`);
      return;
    }
    setDialogBusy(true);
    setDialogError('');
    try {
      const { response, payload } = await api.renameKvNamespace(adminActor, {
        namespaceId: renameTarget.id,
        title,
      });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `Falha ao renomear (HTTP ${response.status}).`);
      showNotification(api.withReq(`Namespace renomeado para "${title}".`, payload), 'success');
      setDialogBusy(false);
      closeDialogs();
      reload();
    } catch (error) {
      setDialogBusy(false);
      setDialogError(error instanceof Error ? error.message : 'Falha ao renomear namespace KV.');
    }
  };

  const runDelete = async () => {
    if (!deleteTarget) return;
    setDialogBusy(true);
    setDialogError('');
    try {
      const { response, payload } = await api.deleteKvNamespace(adminActor, {
        namespaceId: deleteTarget.id,
        confirmTitle: deleteConfirmTitle,
      });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `Falha ao excluir (HTTP ${response.status}).`);
      showNotification(api.withReq(`Namespace "${deleteTarget.title}" excluído.`, payload), 'success');
      setDialogBusy(false);
      closeDialogs();
      reload();
    } catch (error) {
      setDialogBusy(false);
      setDialogError(error instanceof Error ? error.message : 'Falha ao excluir namespace KV.');
    }
  };

  return (
    <div className="storage-panel">
      <div className="storage-toolbar">
        <h4>Namespaces KV {appliedSearch && <span className="storage-badge">busca: {appliedSearch}</span>}</h4>
        <div className="storage-toolbar-actions">
          <div className="cfpw-obs-search-bar">
            <Search size={14} />
            <input
              type="text"
              placeholder="Buscar por título..."
              aria-label="Buscar namespaces por título"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applySearch();
              }}
            />
            <button type="button" className="cfpw-obs-search-btn" onClick={applySearch} disabled={loading}>
              Buscar
            </button>
          </div>
          <button type="button" className="ghost-button" onClick={reload} disabled={loading} aria-label="Atualizar">
            {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
          </button>
          <button type="button" className="primary-button" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Criar namespace
          </button>
        </div>
      </div>

      {namespaces.length === 0 && !loading ? (
        <div className="cfpw-empty-state">
          {appliedSearch
            ? `Nenhum namespace com título contendo "${appliedSearch}".`
            : 'Nenhum namespace KV encontrado.'}
        </div>
      ) : (
        <div className="storage-table-wrap">
          <table className="storage-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>ID</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {namespaces.map((namespace) => (
                <tr key={namespace.id}>
                  <td>
                    <button
                      type="button"
                      className="storage-link-button"
                      onClick={() => onSelect(namespace)}
                      title="Abrir chaves do namespace"
                    >
                      {namespace.title}
                    </button>
                  </td>
                  <td>
                    <span className="storage-id-cell">
                      <code>{namespace.id}</code>
                      <button
                        type="button"
                        className="cfpw-table-action"
                        onClick={() => void copyNamespaceId(namespace.id)}
                        aria-label={`Copiar ID do namespace ${namespace.title}`}
                      >
                        <Copy size={13} />
                      </button>
                    </span>
                  </td>
                  <td className="storage-row-actions">
                    <button type="button" className="ghost-button" onClick={() => onSelect(namespace)}>
                      Chaves
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        setRenameTarget(namespace);
                        setRenameTitle(namespace.title);
                        setDialogError('');
                      }}
                    >
                      Renomear
                    </button>
                    <button
                      type="button"
                      className="ghost-button storage-danger-button"
                      onClick={() => {
                        setDeleteTarget(namespace);
                        setDeleteConfirmTitle('');
                        setDialogError('');
                      }}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && !appliedSearch && pagination.totalPages > 1 && (
        <div className="storage-pagination">
          <button
            type="button"
            className="ghost-button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={loading || page <= 1}
          >
            ← Anterior
          </button>
          <span>
            Página {pagination.page} de {pagination.totalPages} · {pagination.totalCount} namespaces
          </span>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={loading || page >= pagination.totalPages}
          >
            Próxima →
          </button>
        </div>
      )}

      {/* Criar */}
      <Dialog open={createOpen} onOpenChange={(nextOpen) => (!nextOpen ? closeDialogs() : undefined)}>
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">Criar namespace KV</DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            O título identifica o namespace na conta (máx. {NAMESPACE_TITLE_MAX_CHARS} caracteres).
          </DialogDescription>
          <div className="cfpw-dialog__form">
            <div className="field-group">
              <label htmlFor="st-kv-create-title">Título</label>
              <input
                id="st-kv-create-title"
                type="text"
                autoComplete="off"
                placeholder="meu-namespace"
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                disabled={dialogBusy}
              />
            </div>
            {dialogError && (
              <p className="field-error" role="alert">
                {dialogError}
              </p>
            )}
            <div className="cfpw-dialog__actions">
              <button type="button" className="ghost-button" onClick={closeDialogs} disabled={dialogBusy}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void runCreate()}
                disabled={dialogBusy || !createTitle.trim()}
              >
                {dialogBusy ? <Loader2 size={16} className="spin" /> : 'Criar namespace'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Renomear */}
      <Dialog open={renameTarget !== null} onOpenChange={(nextOpen) => (!nextOpen ? closeDialogs() : undefined)}>
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">Renomear namespace</DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Título atual: <strong>{renameTarget?.title}</strong>
          </DialogDescription>
          <div className="cfpw-dialog__form">
            <div className="field-group">
              <label htmlFor="st-kv-rename-title">Novo título</label>
              <input
                id="st-kv-rename-title"
                type="text"
                autoComplete="off"
                value={renameTitle}
                onChange={(event) => setRenameTitle(event.target.value)}
                disabled={dialogBusy}
              />
            </div>
            {dialogError && (
              <p className="field-error" role="alert">
                {dialogError}
              </p>
            )}
            <div className="cfpw-dialog__actions">
              <button type="button" className="ghost-button" onClick={closeDialogs} disabled={dialogBusy}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void runRename()}
                disabled={dialogBusy || !renameTitle.trim() || renameTitle.trim() === renameTarget?.title}
              >
                {dialogBusy ? <Loader2 size={16} className="spin" /> : 'Renomear'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Excluir (type-title) */}
      <Dialog open={deleteTarget !== null} onOpenChange={(nextOpen) => (!nextOpen ? closeDialogs() : undefined)}>
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">Excluir namespace KV</DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Exclusão irreversível: todas as chaves de <strong>{deleteTarget?.title}</strong> serão perdidas. Digite o
            título exato para confirmar.
          </DialogDescription>
          <div className="cfpw-dialog__form">
            <div className="field-group">
              <label htmlFor="st-kv-delete-confirm">Verificação de segurança</label>
              <input
                id="st-kv-delete-confirm"
                type="text"
                autoComplete="off"
                placeholder={`Digite: ${deleteTarget?.title ?? ''}`}
                value={deleteConfirmTitle}
                onChange={(event) => setDeleteConfirmTitle(event.target.value)}
                disabled={dialogBusy}
              />
            </div>
            {dialogError && (
              <p className="field-error" role="alert">
                {dialogError}
              </p>
            )}
            <div className="cfpw-dialog__actions">
              <button type="button" className="ghost-button" onClick={closeDialogs} disabled={dialogBusy}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button storage-danger-confirm"
                onClick={() => void runDelete()}
                disabled={dialogBusy || deleteConfirmTitle !== (deleteTarget?.title ?? '')}
              >
                {dialogBusy ? <Loader2 size={16} className="spin" /> : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
