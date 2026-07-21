/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Dialog "Escolher…" dos campos de ID de bindings (ST-R2): lista namespaces
 * KV, bancos D1 ou buckets R2 via motor, com busca client-side, e devolve o
 * valor escolhido ao campo (que continua editável como texto — fallback PW-1).
 */

import { Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/Dialog';
import { cfApiErrorMessage, cfApiFetch } from '../../shared/cfApi';
import {
  filterStoragePickerOptions,
  STORAGE_PICKER_CONFIG,
  type StoragePickerKind,
  type StoragePickerOption,
  toStoragePickerOptions,
} from './storagePickerHelpers';

type StoragePickerDialogProps = {
  kind: StoragePickerKind;
  onPick: (value: string) => void;
  onClose: () => void;
};

export function StoragePickerDialog({ kind, onPick, onClose }: StoragePickerDialogProps) {
  const config = STORAGE_PICKER_CONFIG[kind];
  const [options, setOptions] = useState<StoragePickerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    void (async () => {
      const result = await cfApiFetch<Parameters<typeof toStoragePickerOptions>[1]>(config.endpoint);
      if (cancelled) return;
      if (!result.ok) {
        setLoadError(cfApiErrorMessage(result, 'Falha ao listar recursos de Armazenamento'));
      } else if (!result.data.ok) {
        setLoadError(result.data.error ?? 'Motor reportou falha ao listar recursos de Armazenamento.');
      } else {
        setOptions(toStoragePickerOptions(kind, result.data));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, config.endpoint]);

  const filtered = useMemo(() => filterStoragePickerOptions(options, search), [options, search]);

  return (
    <Dialog open onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
        <DialogTitle className="cfpw-dialog__title">{config.title}</DialogTitle>
        <DialogDescription className="cfpw-dialog__description">
          Selecione um item para preencher o campo — ele continua editável como texto.
        </DialogDescription>
        <div className="cfpw-dialog__form">
          <div className="cfpw-obs-search-bar">
            <Search size={14} />
            <input
              type="text"
              placeholder="Filtrar..."
              aria-label="Filtrar recursos"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {loading ? (
            <div className="storage-panel--status" role="status">
              <Loader2 size={16} className="spin" /> Carregando lista...
            </div>
          ) : loadError ? (
            <p className="field-error" role="alert">
              {loadError}
            </p>
          ) : filtered.length === 0 ? (
            <div className="cfpw-empty-state">
              {search ? `Nenhum item contém "${search}".` : 'Nenhum recurso encontrado.'}
            </div>
          ) : (
            <ul className="storage-picker-list">
              {filtered.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className="storage-picker-option"
                    onClick={() => {
                      onPick(option.value);
                      onClose();
                    }}
                  >
                    <strong>{option.label}</strong>
                    {option.detail && option.detail !== option.label && <code>{option.detail}</code>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
