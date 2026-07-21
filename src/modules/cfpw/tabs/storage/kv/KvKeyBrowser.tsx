/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Navegador de chaves de um namespace KV (ST-KV): busca por prefixo,
 * paginação por cursor com pilha para "Anterior" (cursorStackReducer),
 * seleção múltipla com exclusão em lote (confirmação numérica acima de 25)
 * e abertura do KvValueDrawer para inspecionar/editar/criar chaves.
 */

import { ArrowLeft, Loader2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useEffect, useReducer, useState } from 'react';
import { useNotification } from '../../../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../../../components/ui/Dialog';
import { cfApiErrorMessage, cfApiFetch } from '../../../../shared/cfApi';
import * as api from '../../../api';
import type { KvKeyEntry, KvKeysPayload, KvNamespaceSummary } from '../../../types';
import { KvValueDrawer } from './KvValueDrawer';
import {
  canConfirmBulkDelete,
  cursorStackReducer,
  formatKvExpiration,
  INITIAL_CURSOR_STACK,
  KV_BULK_DELETE_TYPE_THRESHOLD,
} from './kvHelpers';

const KEYS_PAGE_LIMIT = 100;

type KvKeyBrowserProps = {
  adminActor: string;
  namespace: KvNamespaceSummary;
  onBack: () => void;
};

type DrawerState = { mode: 'edit'; entry: KvKeyEntry } | { mode: 'create' } | null;

export function KvKeyBrowser({ adminActor, namespace, onBack }: KvKeyBrowserProps) {
  const { showNotification } = useNotification();

  const [keys, setKeys] = useState<KvKeyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [listComplete, setListComplete] = useState(true);
  const [cursorStack, dispatchCursor] = useReducer(cursorStackReducer, INITIAL_CURSOR_STACK);
  const [prefixInput, setPrefixInput] = useState('');
  const [appliedPrefix, setAppliedPrefix] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkTypedCount, setBulkTypedCount] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [drawer, setDrawer] = useState<DrawerState>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const query = new URLSearchParams({ namespaceId: namespace.id, limit: String(KEYS_PAGE_LIMIT) });
      if (appliedPrefix) query.set('prefix', appliedPrefix);
      if (cursorStack.current) query.set('cursor', cursorStack.current);
      const result = await cfApiFetch<KvKeysPayload>(`/api/cfpw/storage/kv/keys?${query.toString()}`);
      if (cancelled) return;
      if (!result.ok) {
        showNotification(cfApiErrorMessage(result, 'Falha ao listar chaves KV'), 'error');
      } else if (!result.data.ok) {
        showNotification(result.data.error ?? 'Motor reportou falha ao listar chaves KV.', 'error');
      } else {
        setKeys(result.data.keys ?? []);
        setNextCursor(result.data.cursor ?? null);
        setListComplete(result.data.listComplete !== false);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [namespace.id, appliedPrefix, cursorStack, reloadNonce, showNotification]);

  const reload = () => setReloadNonce((nonce) => nonce + 1);

  const applyPrefix = () => {
    setAppliedPrefix(prefixInput.trim());
    setSelectedKeys(new Set());
    dispatchCursor({ type: 'reset' });
  };

  const toggleKeySelection = (name: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const runBulkDelete = async () => {
    const names = [...selectedKeys];
    if (names.length === 0) return;
    setBulkDeleting(true);
    try {
      const { response, payload } = await api.postKvBulkDelete(adminActor, {
        namespaceId: namespace.id,
        keys: names,
      });
      if (!response.ok || !payload.ok)
        throw new Error(payload.error ?? `Falha na exclusão em lote (HTTP ${response.status}).`);
      showNotification(api.withReq(`${names.length} chave(s) excluída(s).`, payload), 'success');
      setBulkDialogOpen(false);
      setBulkTypedCount('');
      setSelectedKeys(new Set());
      reload();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha na exclusão em lote de chaves KV.', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const closeDrawer = () => setDrawer(null);
  const handleDrawerChanged = () => {
    setSelectedKeys(new Set());
    reload();
  };

  return (
    <div className="storage-panel">
      <div className="storage-toolbar">
        <div className="storage-toolbar-title">
          <button type="button" className="ghost-button" onClick={onBack}>
            <ArrowLeft size={14} /> Namespaces
          </button>
          <h4>
            Chaves de <strong>{namespace.title}</strong>
          </h4>
        </div>
        <div className="storage-toolbar-actions">
          <div className="cfpw-obs-search-bar">
            <Search size={14} />
            <input
              type="text"
              placeholder="Filtrar por prefixo..."
              aria-label="Filtrar chaves por prefixo"
              value={prefixInput}
              onChange={(event) => setPrefixInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyPrefix();
              }}
            />
            <button type="button" className="cfpw-obs-search-btn" onClick={applyPrefix} disabled={loading}>
              Filtrar
            </button>
          </div>
          <button type="button" className="ghost-button" onClick={reload} disabled={loading} aria-label="Atualizar">
            {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
          </button>
          {selectedKeys.size > 0 && (
            <button
              type="button"
              className="ghost-button storage-danger-button"
              onClick={() => {
                setBulkTypedCount('');
                setBulkDialogOpen(true);
              }}
            >
              <Trash2 size={14} /> Excluir {selectedKeys.size} chave(s)
            </button>
          )}
          <button type="button" className="primary-button" onClick={() => setDrawer({ mode: 'create' })}>
            <Plus size={14} /> Nova chave
          </button>
        </div>
      </div>

      {keys.length === 0 && !loading ? (
        <div className="cfpw-empty-state">
          {appliedPrefix ? `Nenhuma chave com o prefixo "${appliedPrefix}".` : 'Nenhuma chave neste namespace.'}
        </div>
      ) : (
        <div className="storage-table-wrap">
          <table className="storage-table">
            <thead>
              <tr>
                <th aria-label="Seleção" />
                <th>Chave</th>
                <th>Expiração</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((entry) => {
                const expirationLabel = formatKvExpiration(entry.expiration);
                return (
                  <tr key={entry.name}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Selecionar chave ${entry.name}`}
                        checked={selectedKeys.has(entry.name)}
                        onChange={() => toggleKeySelection(entry.name)}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="storage-link-button"
                        onClick={() => setDrawer({ mode: 'edit', entry })}
                        title="Inspecionar valor"
                      >
                        <code>{entry.name}</code>
                      </button>
                    </td>
                    <td>{expirationLabel ?? '—'}</td>
                    <td>{entry.metadata != null ? <span className="storage-badge">metadata</span> : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="storage-pagination">
        <button
          type="button"
          className="ghost-button"
          onClick={() => dispatchCursor({ type: 'prev' })}
          disabled={loading || cursorStack.previous.length === 0}
        >
          ← Anterior
        </button>
        <span>
          Página {cursorStack.previous.length + 1}
          {listComplete && cursorStack.previous.length === 0 ? ` · ${keys.length} chave(s)` : ''}
        </span>
        <button
          type="button"
          className="ghost-button"
          onClick={() => {
            if (nextCursor) dispatchCursor({ type: 'next', cursor: nextCursor });
          }}
          disabled={loading || !nextCursor}
        >
          Próxima →
        </button>
      </div>

      {/* Exclusão em lote */}
      <Dialog
        open={bulkDialogOpen}
        onOpenChange={(nextOpen) => (!nextOpen && !bulkDeleting ? setBulkDialogOpen(false) : undefined)}
      >
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">Excluir {selectedKeys.size} chave(s)</DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Exclusão irreversível das chaves selecionadas em <strong>{namespace.title}</strong>.
          </DialogDescription>
          <div className="cfpw-dialog__form">
            {selectedKeys.size > KV_BULK_DELETE_TYPE_THRESHOLD && (
              <div className="field-group">
                <label htmlFor="st-kv-bulk-count">
                  Mais de {KV_BULK_DELETE_TYPE_THRESHOLD} chaves: digite {selectedKeys.size} para confirmar
                </label>
                <input
                  id="st-kv-bulk-count"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={String(selectedKeys.size)}
                  value={bulkTypedCount}
                  onChange={(event) => setBulkTypedCount(event.target.value)}
                  disabled={bulkDeleting}
                />
              </div>
            )}
            <div className="cfpw-dialog__actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setBulkDialogOpen(false)}
                disabled={bulkDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button storage-danger-confirm"
                onClick={() => void runBulkDelete()}
                disabled={bulkDeleting || !canConfirmBulkDelete(selectedKeys.size, bulkTypedCount)}
              >
                {bulkDeleting ? <Loader2 size={16} className="spin" /> : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {drawer && (
        <KvValueDrawer
          adminActor={adminActor}
          namespaceId={namespace.id}
          mode={drawer.mode}
          entry={drawer.mode === 'edit' ? drawer.entry : null}
          onClose={closeDrawer}
          onChanged={handleDrawerChanged}
        />
      )}
    </div>
  );
}
