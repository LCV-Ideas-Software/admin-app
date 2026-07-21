/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Navegador de objetos de um bucket R2 (ST-R2): breadcrumbs por prefixo
 * (delimiter '/'), pastas + arquivos com tamanho/classe/uploaded/etag curto,
 * paginação por cursor com pilha "Anterior" (cursorStackReducer de kvHelpers),
 * seleção múltipla com exclusão em chunks de 40 (barra de progresso + resumo
 * de falhas), download por item e upload via R2UploadDialog.
 */

import { Download, File as FileIcon, Folder, Loader2, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useReducer, useState } from 'react';
import { useNotification } from '../../../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../../../components/ui/Dialog';
import { cfApiErrorMessage, cfApiFetch } from '../../../../shared/cfApi';
import * as api from '../../../api';
import type { R2BucketSummary, R2ObjectEntry, R2ObjectsPayload } from '../../../types';
import { cursorStackReducer, INITIAL_CURSOR_STACK } from '../kv/kvHelpers';
import { R2UploadDialog } from './R2UploadDialog';
import {
  buildR2Breadcrumbs,
  canConfirmR2BulkDelete,
  formatR2Size,
  planR2DeleteChunks,
  R2_BULK_DELETE_TYPE_THRESHOLD,
  r2LastSegment,
  shortR2Etag,
} from './r2Helpers';

const OBJECTS_PAGE_LIMIT = 50;

type R2ObjectBrowserProps = {
  adminActor: string;
  bucket: R2BucketSummary;
};

type BulkProgress = {
  doneChunks: number;
  totalChunks: number;
};

export function R2ObjectBrowser({ adminActor, bucket }: R2ObjectBrowserProps) {
  const { showNotification } = useNotification();

  const [prefix, setPrefix] = useState('');
  const [objects, setObjects] = useState<R2ObjectEntry[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, dispatchCursor] = useReducer(cursorStackReducer, INITIAL_CURSOR_STACK);
  const [loading, setLoading] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTypedCount, setBulkTypedCount] = useState('');
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);
  const [bulkFailures, setBulkFailures] = useState<Array<{ key: string; error: string }>>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const query = new URLSearchParams({ bucket: bucket.name, perPage: String(OBJECTS_PAGE_LIMIT) });
      if (prefix) query.set('prefix', prefix);
      if (cursorStack.current) query.set('cursor', cursorStack.current);
      const result = await cfApiFetch<R2ObjectsPayload>(`/api/cfpw/storage/r2/objects?${query.toString()}`);
      if (cancelled) return;
      if (!result.ok) {
        showNotification(cfApiErrorMessage(result, 'Falha ao listar objetos R2'), 'error');
      } else if (!result.data.ok) {
        showNotification(result.data.error ?? 'Motor reportou falha ao listar objetos R2.', 'error');
      } else {
        setObjects(result.data.objects ?? []);
        setFolders(result.data.folders ?? []);
        setNextCursor(result.data.isTruncated === false ? null : (result.data.cursor ?? null));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bucket.name, prefix, cursorStack, reloadNonce, showNotification]);

  const reload = () => setReloadNonce((nonce) => nonce + 1);

  const navigateToPrefix = (nextPrefix: string) => {
    setPrefix(nextPrefix);
    setSelectedKeys(new Set());
    dispatchCursor({ type: 'reset' });
  };

  const toggleKeySelection = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const runBulkDelete = async () => {
    const keys = [...selectedKeys];
    if (keys.length === 0) return;
    const chunks = planR2DeleteChunks(keys);
    setBulkProgress({ doneChunks: 0, totalChunks: chunks.length });
    setBulkFailures([]);
    const failures: Array<{ key: string; error: string }> = [];
    let deleted = 0;
    try {
      for (const [index, chunk] of chunks.entries()) {
        try {
          const { response, payload } = await api.deleteR2Objects(adminActor, { bucket: bucket.name, keys: chunk });
          if (!response.ok || !payload.ok) {
            throw new Error(payload.error ?? `Falha na exclusão em lote (HTTP ${response.status}).`);
          }
          deleted += payload.deleted ?? 0;
          failures.push(...(payload.failures ?? []));
        } catch (error) {
          // Falha do lote inteiro: registra cada chave e segue para o próximo.
          const message = error instanceof Error ? error.message : 'Falha na exclusão em lote de objetos R2.';
          failures.push(...chunk.map((key) => ({ key, error: message })));
        }
        setBulkProgress({ doneChunks: index + 1, totalChunks: chunks.length });
      }
    } finally {
      setBulkProgress(null);
    }

    setBulkFailures(failures);
    if (failures.length === 0) {
      showNotification(`${deleted} objeto(s) excluído(s).`, 'success');
      setBulkOpen(false);
      setBulkTypedCount('');
      setSelectedKeys(new Set());
      reload();
    } else {
      showNotification(`${deleted} objeto(s) excluído(s); ${failures.length} falha(s) — veja o resumo.`, 'error');
      setSelectedKeys(new Set(failures.map((failure) => failure.key)));
      reload();
    }
  };

  const runDownload = async (key: string) => {
    setDownloadingKey(key);
    try {
      const query = new URLSearchParams({ bucket: bucket.name, key });
      const response = await fetch(`/api/cfpw/storage/r2/object?${query.toString()}`, {
        headers: { 'X-Admin-Actor': adminActor },
      });
      if (!response.ok) {
        throw new Error(`Falha ao baixar o objeto "${key}" (HTTP ${response.status}).`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = r2LastSegment(key);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao baixar o objeto R2.', 'error');
    } finally {
      setDownloadingKey(null);
    }
  };

  const breadcrumbs = buildR2Breadcrumbs(prefix);
  const bulkBusy = bulkProgress !== null;

  return (
    <>
      <div className="storage-toolbar">
        <nav className="storage-breadcrumbs" aria-label="Pastas do bucket">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.prefix || 'raiz'}>
              {index > 0 && <span className="storage-breadcrumb-sep">/</span>}
              {index === breadcrumbs.length - 1 ? (
                <strong>{crumb.label}</strong>
              ) : (
                <button type="button" className="storage-link-button" onClick={() => navigateToPrefix(crumb.prefix)}>
                  {crumb.label}
                </button>
              )}
            </span>
          ))}
        </nav>
        <div className="storage-toolbar-actions">
          <button type="button" className="ghost-button" onClick={reload} disabled={loading} aria-label="Atualizar">
            {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
          </button>
          {selectedKeys.size > 0 && (
            <button
              type="button"
              className="ghost-button storage-danger-button"
              onClick={() => {
                setBulkTypedCount('');
                setBulkFailures([]);
                setBulkOpen(true);
              }}
            >
              <Trash2 size={14} /> Excluir {selectedKeys.size} objeto(s)
            </button>
          )}
          <button type="button" className="primary-button" onClick={() => setUploadOpen(true)}>
            <UploadCloud size={14} /> Enviar arquivo
          </button>
        </div>
      </div>

      {folders.length === 0 && objects.length === 0 && !loading ? (
        <div className="cfpw-empty-state">
          {prefix ? `Nenhum objeto sob o prefixo "${prefix}".` : 'Bucket vazio (nesta página).'}
        </div>
      ) : (
        <div className="storage-table-wrap">
          <table className="storage-table">
            <thead>
              <tr>
                <th aria-label="Seleção" />
                <th>Nome</th>
                <th>Tamanho</th>
                <th>Classe</th>
                <th>Enviado em</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {folders.map((folder) => (
                <tr key={`pasta:${folder}`}>
                  <td />
                  <td>
                    <button
                      type="button"
                      className="storage-link-button"
                      onClick={() => navigateToPrefix(folder)}
                      title={`Abrir a pasta ${folder}`}
                    >
                      <Folder size={14} /> {r2LastSegment(folder)}/
                    </button>
                  </td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td />
                </tr>
              ))}
              {objects.map((object) => {
                const etag = shortR2Etag(object.etag);
                return (
                  <tr key={object.key}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Selecionar objeto ${object.key}`}
                        checked={selectedKeys.has(object.key)}
                        onChange={() => toggleKeySelection(object.key)}
                      />
                    </td>
                    <td>
                      <span className="storage-r2-object-name" title={object.etag ? `etag: ${object.etag}` : undefined}>
                        <FileIcon size={14} /> <code>{r2LastSegment(object.key)}</code>
                        {etag && <span className="storage-badge">{etag}</span>}
                      </span>
                    </td>
                    <td>{formatR2Size(object.size) ?? '—'}</td>
                    <td>{object.storage_class ?? '—'}</td>
                    <td>{api.formatDateTime(object.uploaded)}</td>
                    <td className="storage-row-actions">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => void runDownload(object.key)}
                        disabled={downloadingKey !== null}
                        aria-label={`Baixar ${object.key}`}
                      >
                        {downloadingKey === object.key ? (
                          <Loader2 size={14} className="spin" />
                        ) : (
                          <Download size={14} />
                        )}
                      </button>
                    </td>
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
          {!nextCursor && cursorStack.previous.length === 0 ? ` · ${folders.length + objects.length} item(ns)` : ''}
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

      {/* Exclusão em lote (chunks de 40) */}
      <Dialog open={bulkOpen} onOpenChange={(nextOpen) => (!nextOpen && !bulkBusy ? setBulkOpen(false) : undefined)}>
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">Excluir {selectedKeys.size} objeto(s)</DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Exclusão irreversível dos objetos selecionados em <strong>{bucket.name}</strong>. Lotes de 40 chaves por
            chamada.
          </DialogDescription>
          <div className="cfpw-dialog__form">
            {selectedKeys.size > R2_BULK_DELETE_TYPE_THRESHOLD && (
              <div className="field-group">
                <label htmlFor="st-r2-bulk-count">
                  Mais de {R2_BULK_DELETE_TYPE_THRESHOLD} objetos: digite {selectedKeys.size} para confirmar
                </label>
                <input
                  id="st-r2-bulk-count"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={String(selectedKeys.size)}
                  value={bulkTypedCount}
                  onChange={(event) => setBulkTypedCount(event.target.value)}
                  disabled={bulkBusy}
                />
              </div>
            )}
            {bulkProgress && (
              <div className="storage-progress" role="status">
                <progress value={bulkProgress.doneChunks} max={bulkProgress.totalChunks} />
                <span>
                  Lote {Math.min(bulkProgress.doneChunks + 1, bulkProgress.totalChunks)} de {bulkProgress.totalChunks}
                  ...
                </span>
              </div>
            )}
            {bulkFailures.length > 0 && (
              <div className="cfpw-dialog__warning" role="alert">
                <p>{bulkFailures.length} falha(s) — as chaves com erro permanecem selecionadas:</p>
                <ul className="storage-confirm-list">
                  {bulkFailures.slice(0, 10).map((failure) => (
                    <li key={failure.key}>
                      <code>{failure.key}</code> — {failure.error}
                    </li>
                  ))}
                  {bulkFailures.length > 10 && <li>… e mais {bulkFailures.length - 10} falha(s).</li>}
                </ul>
              </div>
            )}
            <div className="cfpw-dialog__actions">
              <button type="button" className="ghost-button" onClick={() => setBulkOpen(false)} disabled={bulkBusy}>
                {bulkFailures.length > 0 ? 'Fechar' : 'Cancelar'}
              </button>
              <button
                type="button"
                className="primary-button storage-danger-confirm"
                onClick={() => void runBulkDelete()}
                disabled={bulkBusy || !canConfirmR2BulkDelete(selectedKeys.size, bulkTypedCount)}
              >
                {bulkBusy ? <Loader2 size={16} className="spin" /> : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {uploadOpen && (
        <R2UploadDialog
          adminActor={adminActor}
          bucket={bucket.name}
          prefix={prefix}
          listedKeys={objects.map((object) => object.key)}
          onClose={() => setUploadOpen(false)}
          onUploaded={reload}
        />
      )}
    </>
  );
}
