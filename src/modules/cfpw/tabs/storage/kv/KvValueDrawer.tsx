/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Drawer de valor KV (ST-KV, Radix Dialog): inspeciona o valor via motor
 * (texto/JSON/binário/grande), edita com toggle de JSON formatado, campos de
 * TTL e metadata com validação client-side, salvar/excluir/baixar. Em modo
 * criação, o mesmo drawer pede o nome da chave com contador de bytes UTF-8.
 */

import { Download, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../../../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../../../components/ui/Dialog';
import { cfApiErrorMessage, cfApiFetch } from '../../../../shared/cfApi';
import * as api from '../../../api';
import type { KvKeyEntry, KvValueInspectPayload } from '../../../types';
import {
  classifyValueType,
  formatKvExpiration,
  KV_KEY_MAX_BYTES,
  utf8ByteLength,
  validateKvKeyName,
  validateMetadataJson,
  validateTtl,
} from './kvHelpers';

type KvValueDrawerProps = {
  adminActor: string;
  namespaceId: string;
  mode: 'create' | 'edit';
  entry: KvKeyEntry | null;
  onClose: () => void;
  /** Chamado após salvar/excluir com sucesso (o chamador recarrega a lista). */
  onChanged: () => void;
};

const toDownloadFilename = (key: string): string => key.split('/').filter(Boolean).pop() || 'kv-value.bin';

export function KvValueDrawer({ adminActor, namespaceId, mode, entry, onClose, onChanged }: KvValueDrawerProps) {
  const { showNotification } = useNotification();
  const editKey = mode === 'edit' ? (entry?.name ?? '') : '';

  const [inspect, setInspect] = useState<KvValueInspectPayload | null>(null);
  const [inspectLoading, setInspectLoading] = useState(mode === 'edit');
  const [inspectError, setInspectError] = useState('');

  const [keyName, setKeyName] = useState(editKey);
  const [editorValue, setEditorValue] = useState('');
  const [jsonFormatted, setJsonFormatted] = useState(false);
  const [ttlInput, setTtlInput] = useState('');
  const [metadataInput, setMetadataInput] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (mode !== 'edit' || !entry) return;
    let cancelled = false;
    setInspectLoading(true);
    void (async () => {
      const query = new URLSearchParams({ namespaceId, key: entry.name, mode: 'inspect' });
      if (typeof entry.expiration === 'number') query.set('expiration', String(entry.expiration));
      const result = await cfApiFetch<KvValueInspectPayload>(`/api/cfpw/storage/kv/value?${query.toString()}`);
      if (cancelled) return;
      if (!result.ok) {
        setInspectError(cfApiErrorMessage(result, `Falha ao ler o valor de ${entry.name}`));
      } else if (!result.data.ok) {
        setInspectError(result.data.error ?? 'Motor reportou falha ao inspecionar o valor KV.');
      } else {
        setInspect(result.data);
        setEditorValue(result.data.value ?? '');
        if (result.data.metadata != null) {
          setMetadataInput(JSON.stringify(result.data.metadata, null, 2));
        }
      }
      setInspectLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, entry, namespaceId]);

  const typeInfo = mode === 'create' ? classifyValueType('text') : classifyValueType(inspect?.type);
  const keyBytes = utf8ByteLength(keyName);
  const expirationLabel = formatKvExpiration(mode === 'edit' ? (inspect?.expiration ?? entry?.expiration) : null);

  const toggleJsonFormatted = (checked: boolean) => {
    try {
      const parsed: unknown = JSON.parse(editorValue);
      setEditorValue(checked ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed));
      setJsonFormatted(checked);
      setInlineError('');
    } catch {
      setInlineError('O conteúdo atual não é JSON válido — corrija antes de alternar a formatação.');
    }
  };

  const runSave = async () => {
    const targetKey = mode === 'create' ? keyName : editKey;
    const keyError = validateKvKeyName(targetKey);
    if (keyError) {
      setInlineError(keyError);
      return;
    }
    const ttlValidation = validateTtl(ttlInput);
    if (!ttlValidation.ok) {
      setInlineError(ttlValidation.error);
      return;
    }
    const metadataValidation = validateMetadataJson(metadataInput);
    if (!metadataValidation.ok) {
      setInlineError(metadataValidation.error);
      return;
    }

    setSaving(true);
    setInlineError('');
    try {
      const { response, payload } = await api.putKvValue(adminActor, {
        namespaceId,
        key: targetKey,
        value: editorValue,
        ...(metadataValidation.metadata !== undefined ? { metadata: metadataValidation.metadata } : {}),
        ...(ttlValidation.ttl !== undefined ? { expirationTtl: ttlValidation.ttl } : {}),
      });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `Falha ao gravar (HTTP ${response.status}).`);
      showNotification(api.withReq(`Chave "${targetKey}" gravada.`, payload), 'success');
      onChanged();
      onClose();
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : 'Falha ao gravar a chave KV.');
    } finally {
      setSaving(false);
    }
  };

  const runDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setInlineError('');
    try {
      const { response, payload } = await api.deleteKvValue(adminActor, { namespaceId, key: editKey });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `Falha ao excluir (HTTP ${response.status}).`);
      showNotification(api.withReq(`Chave "${editKey}" excluída.`, payload), 'success');
      onChanged();
      onClose();
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : 'Falha ao excluir a chave KV.');
    } finally {
      setDeleting(false);
    }
  };

  const runDownload = async () => {
    setDownloading(true);
    setInlineError('');
    try {
      const query = new URLSearchParams({ namespaceId, key: editKey, mode: 'download' });
      const response = await fetch(`/api/cfpw/storage/kv/value?${query.toString()}`, {
        headers: { 'X-Admin-Actor': adminActor },
      });
      if (!response.ok) {
        throw new Error(`Falha ao baixar o valor de "${editKey}" (HTTP ${response.status}).`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = toDownloadFilename(editKey);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : 'Falha ao baixar o valor KV.');
    } finally {
      setDownloading(false);
    }
  };

  const busy = saving || deleting || downloading;

  return (
    <Dialog open onOpenChange={(nextOpen) => (!nextOpen && !busy ? onClose() : undefined)}>
      <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog storage-drawer">
        <DialogTitle className="cfpw-dialog__title">
          {mode === 'create' ? 'Nova chave KV' : `Chave: ${editKey}`}
        </DialogTitle>
        <DialogDescription className="cfpw-dialog__description">
          {mode === 'create'
            ? 'Cria ou sobrescreve uma chave neste namespace.'
            : `Tipo: ${typeInfo.label}${inspect?.size !== undefined ? ` · ${inspect.size} bytes` : ''}${expirationLabel ? ` · expira em ${expirationLabel}` : ''}`}
        </DialogDescription>

        {inspectLoading ? (
          <div className="storage-panel--status" role="status">
            <Loader2 size={16} className="spin" /> Lendo valor...
          </div>
        ) : inspectError ? (
          <p className="field-error" role="alert">
            {inspectError}
          </p>
        ) : (
          <div className="cfpw-dialog__form">
            {mode === 'create' && (
              <div className="field-group">
                <label htmlFor="st-kv-drawer-key">Nome da chave</label>
                <input
                  id="st-kv-drawer-key"
                  type="text"
                  autoComplete="off"
                  placeholder="config/tema"
                  value={keyName}
                  onChange={(event) => setKeyName(event.target.value)}
                  disabled={busy}
                />
                <p className={keyBytes > KV_KEY_MAX_BYTES ? 'field-error' : 'field-hint'}>
                  {keyBytes} / {KV_KEY_MAX_BYTES} bytes UTF-8
                </p>
              </div>
            )}

            {typeInfo.warning && (
              <div className="cfpw-dialog__warning" role="status">
                <p>{typeInfo.warning}</p>
              </div>
            )}

            {typeInfo.editable && (
              <div className="field-group">
                <div className="storage-editor-header">
                  <label htmlFor="st-kv-drawer-value">Valor</label>
                  {mode === 'edit' && inspect?.prettyJson === true && (
                    <label className="cfpw-dialog__toggle storage-json-toggle">
                      <input
                        type="checkbox"
                        checked={jsonFormatted}
                        onChange={(event) => toggleJsonFormatted(event.target.checked)}
                        disabled={busy}
                      />
                      <span>JSON formatado</span>
                    </label>
                  )}
                </div>
                <textarea
                  id="st-kv-drawer-value"
                  className="storage-value-editor"
                  rows={10}
                  value={editorValue}
                  onChange={(event) => setEditorValue(event.target.value)}
                  disabled={busy}
                />
              </div>
            )}

            <div className="field-group">
              <label htmlFor="st-kv-drawer-ttl">TTL em segundos (vazio = sem expiração; mínimo 60)</label>
              <input
                id="st-kv-drawer-ttl"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="ex.: 3600"
                value={ttlInput}
                onChange={(event) => setTtlInput(event.target.value)}
                disabled={busy || !typeInfo.editable}
              />
            </div>

            <div className="field-group">
              <label htmlFor="st-kv-drawer-metadata">Metadata JSON (opcional, objeto ≤ 1024 bytes)</label>
              <textarea
                id="st-kv-drawer-metadata"
                className="storage-metadata-editor"
                rows={3}
                placeholder='{"origem":"painel"}'
                value={metadataInput}
                onChange={(event) => setMetadataInput(event.target.value)}
                disabled={busy || !typeInfo.editable}
              />
            </div>

            {inlineError && (
              <p className="field-error" role="alert">
                {inlineError}
              </p>
            )}

            <div className="cfpw-dialog__actions storage-drawer-actions">
              {mode === 'edit' && (
                <button type="button" className="ghost-button" onClick={() => void runDownload()} disabled={busy}>
                  {downloading ? <Loader2 size={14} className="spin" /> : <Download size={14} />} Baixar
                </button>
              )}
              {mode === 'edit' && (
                <button
                  type="button"
                  className="ghost-button storage-danger-button"
                  onClick={() => void runDelete()}
                  disabled={busy}
                >
                  {deleting ? <Loader2 size={14} className="spin" /> : confirmDelete ? 'Confirmar exclusão' : 'Excluir'}
                </button>
              )}
              <button type="button" className="ghost-button" onClick={onClose} disabled={busy}>
                Cancelar
              </button>
              {typeInfo.editable && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void runSave()}
                  disabled={busy || (mode === 'create' && !keyName.trim())}
                >
                  {saving ? <Loader2 size={16} className="spin" /> : 'Salvar'}
                </button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
