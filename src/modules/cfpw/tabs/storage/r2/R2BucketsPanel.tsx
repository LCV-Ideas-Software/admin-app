/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Painel de buckets R2 (ST-R2): tabela com nome, localização, classe e
 * criação; criação com location hint + storage class; exclusão com
 * confirmação type-name. mainsite-media (bucket de mídia de PRODUÇÃO do
 * mainsite, binding MEDIA_BUCKET) exibe badge/cadeado — sem botão de
 * exclusão. Bucket selecionado abre as sub-abas Objetos | Configurações.
 */

import { ArrowLeft, Loader2, Lock, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNotification } from '../../../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../../../components/ui/Dialog';
import { cfApiErrorMessage, cfApiFetch } from '../../../../shared/cfApi';
import * as api from '../../../api';
import type { R2BucketSummary, R2BucketsPayload } from '../../../types';
import { R2BucketSettings } from './R2BucketSettings';
import { R2ObjectBrowser } from './R2ObjectBrowser';

const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

const LOCATION_HINT_OPTIONS = [
  { value: '', label: 'automático (sem hint)' },
  { value: 'apac', label: 'apac — Ásia-Pacífico' },
  { value: 'eeur', label: 'eeur — Europa Oriental' },
  { value: 'enam', label: 'enam — América do Norte (leste)' },
  { value: 'weur', label: 'weur — Europa Ocidental' },
  { value: 'wnam', label: 'wnam — América do Norte (oeste)' },
  { value: 'oc', label: 'oc — Oceania' },
] as const;

const STORAGE_CLASS_OPTIONS = ['Standard', 'InfrequentAccess'] as const;

const PROTECTED_TOOLTIP =
  'mainsite-media é o bucket de mídia de produção do mainsite (binding MEDIA_BUCKET): a exclusão é bloqueada pelo motor.';

type R2BucketsPanelProps = {
  adminActor: string;
  /** Deep-link: seleciona o bucket assim que a lista carregar. */
  initialBucket?: string;
  /** Notifica a seleção (para o hash de deep-link no StorageTab). */
  onSelectedChange?: (bucketName: string | null) => void;
};

type DetailTab = 'objects' | 'settings';

export function R2BucketsPanel({ adminActor, initialBucket, onSelectedChange }: R2BucketsPanelProps) {
  const { showNotification } = useNotification();

  const [buckets, setBuckets] = useState<R2BucketSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createHint, setCreateHint] = useState('');
  const [createClass, setCreateClass] = useState<(typeof STORAGE_CLASS_OPTIONS)[number]>('Standard');
  const [deleteTarget, setDeleteTarget] = useState<R2BucketSummary | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const [selected, setSelected] = useState<R2BucketSummary | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('objects');
  const appliedInitialRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const result = await cfApiFetch<R2BucketsPayload>('/api/cfpw/storage/r2/buckets');
      if (cancelled) return;
      if (!result.ok) {
        showNotification(cfApiErrorMessage(result, 'Falha ao listar buckets R2'), 'error');
      } else if (!result.data.ok) {
        showNotification(result.data.error ?? 'Motor reportou falha ao listar buckets R2.', 'error');
      } else {
        setBuckets(result.data.buckets ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadNonce, showNotification]);

  // Deep-link: aplica a seleção inicial uma única vez, quando a lista chegar.
  useEffect(() => {
    if (!initialBucket || appliedInitialRef.current || buckets.length === 0) return;
    const match = buckets.find((bucket) => bucket.name === initialBucket);
    if (match) {
      appliedInitialRef.current = true;
      setSelected(match);
      setDetailTab('objects');
      onSelectedChange?.(match.name);
    }
  }, [initialBucket, buckets, onSelectedChange]);

  const reload = () => setReloadNonce((nonce) => nonce + 1);

  const selectBucket = (bucket: R2BucketSummary | null) => {
    setSelected(bucket);
    setDetailTab('objects');
    onSelectedChange?.(bucket?.name ?? null);
  };

  const closeDialogs = () => {
    if (dialogBusy) return;
    setCreateOpen(false);
    setDeleteTarget(null);
    setCreateName('');
    setCreateHint('');
    setCreateClass('Standard');
    setDeleteConfirmName('');
    setDialogError('');
  };

  const runCreate = async () => {
    const name = createName.trim();
    if (!BUCKET_NAME_PATTERN.test(name)) {
      setDialogError(
        'Nome inválido: use 3 a 63 caracteres com letras minúsculas, números e hífen, começando e terminando por letra/número.',
      );
      return;
    }
    setDialogBusy(true);
    setDialogError('');
    try {
      const { response, payload } = await api.createR2Bucket(adminActor, {
        name,
        ...(createHint ? { locationHint: createHint } : {}),
        ...(createClass !== 'Standard' ? { storageClass: createClass } : {}),
      });
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `Falha ao criar bucket R2 (HTTP ${response.status}).`);
      }
      showNotification(api.withReq(`Bucket "${name}" criado.`, payload), 'success');
      setDialogBusy(false);
      closeDialogs();
      reload();
    } catch (error) {
      setDialogBusy(false);
      setDialogError(error instanceof Error ? error.message : 'Falha ao criar bucket R2.');
    }
  };

  const runDelete = async () => {
    if (!deleteTarget) return;
    setDialogBusy(true);
    setDialogError('');
    try {
      const { response, payload } = await api.deleteR2Bucket(adminActor, {
        bucket: deleteTarget.name,
        confirmName: deleteConfirmName,
      });
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `Falha ao excluir (HTTP ${response.status}).`);
      }
      showNotification(api.withReq(`Bucket "${deleteTarget.name}" excluído.`, payload), 'success');
      setDialogBusy(false);
      closeDialogs();
      reload();
    } catch (error) {
      setDialogBusy(false);
      setDialogError(error instanceof Error ? error.message : 'Falha ao excluir bucket R2.');
    }
  };

  if (selected) {
    return (
      <div className="storage-panel">
        <div className="storage-toolbar">
          <div className="storage-toolbar-title">
            <button type="button" className="ghost-button" onClick={() => selectBucket(null)}>
              <ArrowLeft size={14} /> Buckets R2
            </button>
            <h4>
              {selected.name}{' '}
              {selected.protected && (
                <span className="storage-badge storage-badge--protected" title={PROTECTED_TOOLTIP}>
                  <Lock size={11} /> protegido
                </span>
              )}
            </h4>
          </div>
        </div>

        {selected.protected && (
          <div className="storage-protected-banner" role="alert">
            ⚠️ mainsite-media serve a mídia de produção do mainsite (binding MEDIA_BUCKET). Excluir ou sobrescrever
            objetos afeta o site no ar.
          </div>
        )}

        <div className="page-tab-nav storage-subtab-nav">
          <button
            type="button"
            className={detailTab === 'objects' ? 'page-tab-item active' : 'page-tab-item'}
            onClick={() => setDetailTab('objects')}
          >
            Objetos
          </button>
          <button
            type="button"
            className={detailTab === 'settings' ? 'page-tab-item active' : 'page-tab-item'}
            onClick={() => setDetailTab('settings')}
          >
            Configurações
          </button>
        </div>

        {detailTab === 'objects' && <R2ObjectBrowser key={selected.name} adminActor={adminActor} bucket={selected} />}
        {detailTab === 'settings' && <R2BucketSettings key={selected.name} bucket={selected.name} />}
      </div>
    );
  }

  return (
    <div className="storage-panel">
      <div className="storage-toolbar">
        <h4>Buckets R2</h4>
        <div className="storage-toolbar-actions">
          <button type="button" className="ghost-button" onClick={reload} disabled={loading} aria-label="Atualizar">
            {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
          </button>
          <button type="button" className="primary-button" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Criar bucket
          </button>
        </div>
      </div>

      {buckets.length === 0 && !loading ? (
        <div className="cfpw-empty-state">Nenhum bucket R2 encontrado.</div>
      ) : (
        <div className="storage-table-wrap">
          <table className="storage-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Localização</th>
                <th>Classe</th>
                <th>Criado em</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {buckets.map((bucket) => (
                <tr key={bucket.name}>
                  <td>
                    <button
                      type="button"
                      className="storage-link-button"
                      onClick={() => selectBucket(bucket)}
                      title="Abrir o bucket (objetos e configurações)"
                    >
                      {bucket.name}
                    </button>{' '}
                    {bucket.protected && (
                      <span className="storage-badge storage-badge--protected" title={PROTECTED_TOOLTIP}>
                        <Lock size={11} /> protegido
                      </span>
                    )}
                  </td>
                  <td>{bucket.location ?? '—'}</td>
                  <td>{bucket.storage_class ?? '—'}</td>
                  <td>{api.formatDateTime(bucket.creation_date)}</td>
                  <td className="storage-row-actions">
                    <button type="button" className="ghost-button" onClick={() => selectBucket(bucket)}>
                      Abrir
                    </button>
                    {bucket.protected ? (
                      <span className="storage-protected-lock" title={PROTECTED_TOOLTIP}>
                        <Lock size={14} />
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="ghost-button storage-danger-button"
                        onClick={() => {
                          setDeleteTarget(bucket);
                          setDeleteConfirmName('');
                          setDialogError('');
                        }}
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Criar */}
      <Dialog open={createOpen} onOpenChange={(nextOpen) => (!nextOpen ? closeDialogs() : undefined)}>
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">Criar bucket R2</DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            3 a 63 caracteres com letras minúsculas, números e hífen, começando e terminando por letra/número.
          </DialogDescription>
          <div className="cfpw-dialog__form">
            <div className="field-group">
              <label htmlFor="st-r2-create-name">Nome</label>
              <input
                id="st-r2-create-name"
                type="text"
                autoComplete="off"
                placeholder="meu-bucket"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                disabled={dialogBusy}
              />
            </div>
            <div className="field-group">
              <label htmlFor="st-r2-create-hint">Location hint (opcional)</label>
              <select
                id="st-r2-create-hint"
                value={createHint}
                onChange={(event) => setCreateHint(event.target.value)}
                disabled={dialogBusy}
              >
                {LOCATION_HINT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="st-r2-create-class">Storage class</label>
              <select
                id="st-r2-create-class"
                value={createClass}
                onChange={(event) => setCreateClass(event.target.value as (typeof STORAGE_CLASS_OPTIONS)[number])}
                disabled={dialogBusy}
              >
                {STORAGE_CLASS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
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
                disabled={dialogBusy || !createName.trim()}
              >
                {dialogBusy ? <Loader2 size={16} className="spin" /> : 'Criar bucket'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Excluir (type-name; nunca aparece para o bucket protegido) */}
      <Dialog open={deleteTarget !== null} onOpenChange={(nextOpen) => (!nextOpen ? closeDialogs() : undefined)}>
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">Excluir bucket R2</DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Exclusão irreversível do bucket <strong>{deleteTarget?.name}</strong> (a Cloudflare exige o bucket vazio).
            Digite o nome exato para confirmar.
          </DialogDescription>
          <div className="cfpw-dialog__form">
            <div className="field-group">
              <label htmlFor="st-r2-delete-confirm">Verificação de segurança</label>
              <input
                id="st-r2-delete-confirm"
                type="text"
                autoComplete="off"
                placeholder={`Digite: ${deleteTarget?.name ?? ''}`}
                value={deleteConfirmName}
                onChange={(event) => setDeleteConfirmName(event.target.value)}
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
                disabled={dialogBusy || deleteConfirmName !== (deleteTarget?.name ?? '')}
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
