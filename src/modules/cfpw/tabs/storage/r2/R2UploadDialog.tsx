/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Dialog de upload de objeto R2 (ST-R2): file input com tamanho exibido,
 * bloqueio client-side acima de 90 MiB (espelho do 413 do motor), select de
 * storage class, aviso de overwrite quando a chave já aparece na página
 * listada e PUT com o corpo do File direto (progresso indeterminado).
 */

import { Loader2, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { useNotification } from '../../../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../../../components/ui/Dialog';
import * as api from '../../../api';
import { formatR2Size, isR2OverwriteRisk, validateR2UploadSize } from './r2Helpers';

const STORAGE_CLASS_OPTIONS = ['Standard', 'InfrequentAccess'] as const;

type R2UploadDialogProps = {
  adminActor: string;
  bucket: string;
  /** Prefixo atual do browser; a chave final é prefix + nome do arquivo. */
  prefix: string;
  /** Chaves da página listada, para o aviso de overwrite. */
  listedKeys: string[];
  onClose: () => void;
  /** Chamado após upload com sucesso (o chamador recarrega a lista). */
  onUploaded: () => void;
};

export function R2UploadDialog({ adminActor, bucket, prefix, listedKeys, onClose, onUploaded }: R2UploadDialogProps) {
  const { showNotification } = useNotification();
  const [file, setFile] = useState<File | null>(null);
  const [storageClass, setStorageClass] = useState<(typeof STORAGE_CLASS_OPTIONS)[number]>('Standard');
  const [uploading, setUploading] = useState(false);
  const [inlineError, setInlineError] = useState('');

  const sizeError = file ? validateR2UploadSize(file.size) : null;
  const targetKey = file ? `${prefix}${file.name}` : '';
  const overwriteRisk = file !== null && isR2OverwriteRisk(listedKeys, targetKey);

  const runUpload = async () => {
    if (!file || sizeError) return;
    setUploading(true);
    setInlineError('');
    try {
      const { response, payload } = await api.putR2Object(adminActor, {
        bucket,
        key: targetKey,
        ...(storageClass !== 'Standard' ? { storageClass } : {}),
        file,
      });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `Falha ao enviar (HTTP ${response.status}).`);
      showNotification(api.withReq(`Arquivo "${file.name}" enviado.`, payload), 'success');
      onUploaded();
      onClose();
    } catch (error) {
      // Erro 429 (rate limit) chega já traduzido pelo motor.
      setInlineError(error instanceof Error ? error.message : 'Falha ao enviar o arquivo ao R2.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(nextOpen) => (!nextOpen && !uploading ? onClose() : undefined)}>
      <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
        <DialogTitle className="cfpw-dialog__title">
          <UploadCloud size={18} /> Enviar arquivo
        </DialogTitle>
        <DialogDescription className="cfpw-dialog__description">
          Destino: <strong>{bucket}</strong>
          {prefix ? (
            <>
              {' '}
              / <code>{prefix}</code>
            </>
          ) : null}{' '}
          — limite de 90 MiB pelo painel.
        </DialogDescription>
        <div className="cfpw-dialog__form">
          <div className="field-group">
            <label htmlFor="st-r2-upload-file">Arquivo</label>
            <input
              id="st-r2-upload-file"
              type="file"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setInlineError('');
              }}
              disabled={uploading}
            />
            {file && (
              <p className={sizeError ? 'field-error' : 'field-hint'}>
                {sizeError ?? `${file.name} · ${formatR2Size(file.size) ?? `${file.size} B`} · chave: ${targetKey}`}
              </p>
            )}
          </div>
          <div className="field-group">
            <label htmlFor="st-r2-upload-class">Storage class</label>
            <select
              id="st-r2-upload-class"
              value={storageClass}
              onChange={(event) => setStorageClass(event.target.value as (typeof STORAGE_CLASS_OPTIONS)[number])}
              disabled={uploading}
            >
              {STORAGE_CLASS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          {overwriteRisk && (
            <div className="cfpw-dialog__warning" role="status">
              <p>
                Já existe um objeto com a chave <code>{targetKey}</code> nesta página — o upload vai sobrescrevê-lo.
              </p>
            </div>
          )}
          {uploading && (
            <div className="storage-panel--status" role="status">
              <Loader2 size={16} className="spin" /> Enviando arquivo...
            </div>
          )}
          {inlineError && (
            <p className="field-error" role="alert">
              {inlineError}
            </p>
          )}
          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={uploading}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void runUpload()}
              disabled={uploading || !file || sizeError !== null}
            >
              {uploading ? <Loader2 size={16} className="spin" /> : 'Enviar'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
