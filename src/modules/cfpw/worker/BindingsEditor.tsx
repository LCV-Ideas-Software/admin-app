/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Editor de bindings do Worker (PW-1, aba Configurações): lista os bindings do
 * GET worker-settings (nome, tipo, alvo), permite adicionar/editar/remover com
 * form por tipo (demais tipos via JSON validado) e aplica via PATCH montado
 * por buildBindingsPatch — inherit para intocados, definição completa para
 * novos/alterados, removidos ausentes; secret_text é sempre read-only aqui
 * (gerencie em Secrets) e preservado como inherit. ST-R2: bindings kv/d1/r2
 * ganham "Abrir no Armazenamento" e os campos de ID ganham o picker
 * "Escolher…" (o campo texto continua editável — fallback PW-1).
 */

import { AlertTriangle, ExternalLink, Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/Dialog';
import * as api from '../api';
import { StoragePickerDialog } from '../shared/StoragePickerDialog';
import type { StoragePickerKind } from '../shared/storagePickerHelpers';
import type { StorageDeepLink } from '../tabs/storage/storageDeepLink';
import type { WorkerBinding } from '../types';
import { buildBindingsPatch, describeBindingTarget, toBindingList } from './bindingsHelpers';
import { isProtectedWorker, PROTECTED_CONFIRM_PHRASE } from './workerValidation';

const BINDING_TYPES = [
  'plain_text',
  'json',
  'kv_namespace',
  'r2_bucket',
  'd1',
  'service',
  'durable_object_namespace',
  'queue',
  'analytics_engine',
  'ai',
  'browser',
  'hyperdrive',
  'vectorize',
  'version_metadata',
  'outro (JSON)',
] as const;

type BindingTypeOption = (typeof BINDING_TYPES)[number];

type DraftState = {
  /** Nome original quando é edição de binding existente; null quando novo. */
  editingName: string | null;
  type: BindingTypeOption;
  name: string;
  fields: Record<string, string>;
  rawJson: string;
};

const EMPTY_DRAFT: DraftState = { editingName: null, type: 'plain_text', name: '', fields: {}, rawJson: '' };

/** Campos mínimos por tipo (chave CF → rótulo do input). */
const TYPE_FIELDS: Partial<Record<BindingTypeOption, Array<{ key: string; label: string; optional?: boolean }>>> = {
  plain_text: [{ key: 'text', label: 'Valor (texto)' }],
  json: [{ key: 'json', label: 'JSON' }],
  kv_namespace: [{ key: 'namespace_id', label: 'Namespace ID' }],
  r2_bucket: [{ key: 'bucket_name', label: 'Bucket' }],
  d1: [{ key: 'id', label: 'Database ID' }],
  service: [
    { key: 'service', label: 'Service' },
    { key: 'environment', label: 'Environment', optional: true },
  ],
  durable_object_namespace: [
    { key: 'class_name', label: 'Class name' },
    { key: 'script_name', label: 'Script name', optional: true },
  ],
  queue: [{ key: 'queue_name', label: 'Queue' }],
  analytics_engine: [{ key: 'dataset', label: 'Dataset' }],
  hyperdrive: [{ key: 'id', label: 'Config ID' }],
  vectorize: [{ key: 'index_name', label: 'Index' }],
  ai: [],
  browser: [],
  version_metadata: [],
};

/** Monta o binding completo a partir do draft; devolve erro pt-BR quando inválido. */
const draftToBinding = (draft: DraftState): { binding?: WorkerBinding; error?: string } => {
  const name = draft.name.trim();
  if (!name) return { error: 'Informe o nome (variável) do binding.' };

  if (draft.type === 'outro (JSON)') {
    try {
      const parsed = JSON.parse(draft.rawJson) as Record<string, unknown>;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { error: 'O JSON do binding precisa ser um objeto.' };
      }
      const type = String(parsed.type ?? '').trim();
      if (!type) return { error: 'O JSON do binding precisa do campo "type".' };
      if (type === 'secret_text') return { error: 'secret_text não pode ser criado aqui — gerencie em Secrets.' };
      return { binding: { ...parsed, type, name } };
    } catch {
      return { error: 'JSON inválido no binding customizado.' };
    }
  }

  if (draft.type === 'json') {
    const raw = (draft.fields.json ?? '').trim();
    try {
      return { binding: { type: 'json', name, json: JSON.parse(raw) } };
    } catch {
      return { error: 'Valor JSON inválido para o binding json.' };
    }
  }

  const spec = TYPE_FIELDS[draft.type] ?? [];
  const binding: WorkerBinding = { type: draft.type, name };
  for (const field of spec) {
    const value = (draft.fields[field.key] ?? '').trim();
    if (!value) {
      if (field.optional) continue;
      return { error: `Informe ${field.label} para o binding ${draft.type}.` };
    }
    binding[field.key] = value;
  }
  return { binding };
};

/** Tipos de binding com recurso navegável na aba Armazenamento (ST-R2). */
const STORAGE_BINDING_TYPES: Record<string, { kind: StoragePickerKind; fieldKey: string }> = {
  kv_namespace: { kind: 'kv', fieldKey: 'namespace_id' },
  d1: { kind: 'd1', fieldKey: 'id' },
  r2_bucket: { kind: 'r2', fieldKey: 'bucket_name' },
};

/** Alvo do deep-link de um binding kv/d1/r2; null quando não navegável. */
const toStorageTarget = (binding: WorkerBinding): StorageDeepLink | null => {
  const spec = STORAGE_BINDING_TYPES[binding.type];
  if (!spec) return null;
  const id = String(binding[spec.fieldKey] ?? '').trim();
  return id ? { kind: spec.kind, id } : null;
};

type BindingsEditorProps = {
  scriptName: string;
  adminActor: string;
  /** Cross-nav ST-R2: abre a aba Armazenamento no alvo do binding. */
  onOpenStorage?: ((target: StorageDeepLink) => void) | undefined;
};

export function BindingsEditor({ scriptName, adminActor, onOpenStorage }: BindingsEditorProps) {
  const { showNotification } = useNotification();
  const [original, setOriginal] = useState<WorkerBinding[]>([]);
  const [upserts, setUpserts] = useState<Map<string, WorkerBinding>>(new Map());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [draftError, setDraftError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [picker, setPicker] = useState<{ kind: StoragePickerKind; fieldKey: string } | null>(null);

  const protectedWorker = isProtectedWorker(scriptName);
  const pendingChanges = upserts.size > 0 || removed.size > 0;

  const loadBindings = useCallback(async () => {
    setLoading(true);
    try {
      const { response, payload } = await api.fetchWorkerSettings(adminActor, scriptName);
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao ler bindings.');
      setOriginal(toBindingList(payload.settings?.bindings));
      setUpserts(new Map());
      setRemoved(new Set());
      setDraft(null);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao ler bindings.', 'error');
    } finally {
      setLoading(false);
    }
  }, [adminActor, scriptName, showNotification]);

  useEffect(() => {
    void loadBindings();
  }, [loadBindings]);

  // Visão corrente: originais (com upserts aplicados, removidos fora) + novos.
  const view: Array<{ binding: WorkerBinding; state: 'original' | 'editado' | 'novo' | 'removido' }> = [];
  for (const binding of original) {
    if (binding.type !== 'secret_text' && removed.has(binding.name)) {
      view.push({ binding, state: 'removido' });
      continue;
    }
    const upsert = binding.type !== 'secret_text' ? upserts.get(binding.name) : undefined;
    view.push(upsert ? { binding: upsert, state: 'editado' } : { binding, state: 'original' });
  }
  for (const [name, binding] of upserts) {
    if (!original.some((entry) => entry.name === name)) {
      view.push({ binding, state: 'novo' });
    }
  }

  const startEdit = (binding: WorkerBinding) => {
    setDraftError('');
    const knownType = BINDING_TYPES.find((type) => type === binding.type);
    if (!knownType || knownType === 'outro (JSON)') {
      const rest = Object.fromEntries(Object.entries(binding).filter(([key]) => key !== 'name'));
      setDraft({
        editingName: binding.name,
        type: 'outro (JSON)',
        name: binding.name,
        fields: {},
        rawJson: JSON.stringify(rest, null, 2),
      });
      return;
    }
    const fields: Record<string, string> = {};
    for (const field of TYPE_FIELDS[knownType] ?? []) {
      const value = binding[field.key];
      fields[field.key] =
        knownType === 'json' && field.key === 'json' ? JSON.stringify(value ?? null) : String(value ?? '');
    }
    setDraft({ editingName: binding.name, type: knownType, name: binding.name, fields, rawJson: '' });
  };

  const applyDraft = () => {
    if (!draft) return;
    const { binding, error } = draftToBinding(draft);
    if (error || !binding) {
      setDraftError(error ?? 'Binding inválido.');
      return;
    }
    if (
      draft.editingName === null &&
      (original.some((entry) => entry.name === binding.name) || upserts.has(binding.name))
    ) {
      setDraftError(`Já existe um binding chamado "${binding.name}".`);
      return;
    }
    setUpserts((prev) => {
      const next = new Map(prev);
      if (draft.editingName && draft.editingName !== binding.name) {
        next.delete(draft.editingName);
      }
      next.set(binding.name, binding);
      return next;
    });
    // Renomear um binding existente = remover o antigo + criar o novo.
    if (draft.editingName && draft.editingName !== binding.name) {
      setRemoved((prev) => new Set(prev).add(draft.editingName as string));
    }
    setDraft(null);
    setDraftError('');
  };

  const toggleRemove = (name: string) => {
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
    setUpserts((prev) => {
      if (!prev.has(name)) return prev;
      const next = new Map(prev);
      next.delete(name);
      return next;
    });
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      const bindings = buildBindingsPatch(original, {
        upserts: [...upserts.values()],
        removedNames: [...removed],
      });
      const { response, payload } = await api.patchWorkerSettings(adminActor, {
        scriptName,
        ...(protectedWorker ? { confirmPhrase: phrase } : {}),
        settings: { bindings },
      });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao atualizar bindings.');
      showNotification(api.withReq('Bindings atualizados.', payload), 'success');
      setConfirmOpen(false);
      setPhrase('');
      await loadBindings();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao atualizar bindings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cfpw-panel-card">
      <div className="cfpw-code-header">
        <h3>Bindings</h3>
        <div className="cfpw-code-header-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => void loadBindings()}
            disabled={loading || saving}
          >
            <RefreshCw size={14} /> Recarregar
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              setDraftError('');
              setDraft({ ...EMPTY_DRAFT });
            }}
            disabled={loading || saving}
          >
            + Adicionar binding
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setPhrase('');
              setConfirmOpen(true);
            }}
            disabled={loading || saving || !pendingChanges}
          >
            Aplicar alterações
          </button>
        </div>
      </div>

      {loading && original.length === 0 ? (
        <div className="cfpw-obs-loading">
          <Loader2 size={20} className="spin" /> Carregando bindings...
        </div>
      ) : view.length === 0 ? (
        <div className="cfpw-empty-state">Nenhum binding configurado.</div>
      ) : (
        <div className="cfpw-obs-table-wrap">
          <table className="cfpw-obs-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Alvo</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {view.map(({ binding, state }) => {
                const storageTarget = onOpenStorage ? toStorageTarget(binding) : null;
                return (
                  <tr key={binding.name} className={state === 'removido' ? 'cfpw-row-removed' : ''}>
                    <td>
                      <code>{binding.name}</code>
                    </td>
                    <td>{binding.type}</td>
                    <td>
                      {binding.type === 'secret_text' ? (
                        <em className="field-hint">gerencie em Secrets</em>
                      ) : (
                        describeBindingTarget(binding)
                      )}
                    </td>
                    <td>{state === 'original' ? '—' : state}</td>
                    <td>
                      {binding.type === 'secret_text' ? (
                        <em className="field-hint">read-only</em>
                      ) : (
                        <span className="cfpw-code-header-actions">
                          {storageTarget && (
                            <button
                              type="button"
                              className="cfpw-icon-button"
                              title="Abrir no Armazenamento"
                              aria-label={`Abrir ${storageTarget.id} no Armazenamento`}
                              onClick={() => onOpenStorage?.(storageTarget)}
                              disabled={saving}
                            >
                              <ExternalLink size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="cfpw-icon-button"
                            title="Editar"
                            onClick={() => startEdit(binding)}
                            disabled={saving || state === 'removido'}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="cfpw-icon-button"
                            title={state === 'removido' ? 'Desfazer remoção' : 'Remover'}
                            onClick={() => toggleRemove(binding.name)}
                            disabled={saving}
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {draft && (
        <div className="cfpw-binding-form">
          <h4>{draft.editingName ? `Editar binding ${draft.editingName}` : 'Novo binding'}</h4>
          <div className="cfpw-settings-grid">
            <div className="field-group">
              <label htmlFor="cfpw-binding-type">Tipo</label>
              <select
                id="cfpw-binding-type"
                value={draft.type}
                onChange={(event) =>
                  setDraft({ ...draft, type: event.target.value as BindingTypeOption, fields: {}, rawJson: '' })
                }
                disabled={saving}
              >
                {BINDING_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="cfpw-binding-name">Nome (variável)</label>
              <input
                id="cfpw-binding-name"
                type="text"
                autoComplete="off"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                disabled={saving}
              />
            </div>
            {draft.type === 'outro (JSON)' ? (
              <div className="field-group cfpw-settings-grid-full">
                <label htmlFor="cfpw-binding-json">Definição JSON (sem o campo name)</label>
                <textarea
                  id="cfpw-binding-json"
                  className="json-textarea"
                  rows={5}
                  placeholder='{"type": "mtls_certificate", "certificate_id": "..."}'
                  value={draft.rawJson}
                  onChange={(event) => setDraft({ ...draft, rawJson: event.target.value })}
                  disabled={saving}
                />
              </div>
            ) : (
              (TYPE_FIELDS[draft.type] ?? []).map((field) => {
                const pickerSpec = STORAGE_BINDING_TYPES[draft.type];
                const hasPicker = pickerSpec !== undefined && pickerSpec.fieldKey === field.key;
                return (
                  <div className="field-group" key={field.key}>
                    <label htmlFor={`cfpw-binding-field-${field.key}`}>
                      {field.label}
                      {field.optional ? ' (opcional)' : ''}
                    </label>
                    <div className={hasPicker ? 'storage-field-with-picker' : undefined}>
                      <input
                        id={`cfpw-binding-field-${field.key}`}
                        type="text"
                        autoComplete="off"
                        value={draft.fields[field.key] ?? ''}
                        onChange={(event) =>
                          setDraft({ ...draft, fields: { ...draft.fields, [field.key]: event.target.value } })
                        }
                        disabled={saving}
                      />
                      {hasPicker && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => setPicker(pickerSpec)}
                          disabled={saving}
                        >
                          Escolher…
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {draftError && (
            <p className="field-error" role="alert">
              {draftError}
            </p>
          )}
          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={() => setDraft(null)} disabled={saving}>
              Cancelar
            </button>
            <button type="button" className="primary-button" onClick={applyDraft} disabled={saving}>
              {draft.editingName ? 'Atualizar na lista' : 'Adicionar à lista'}
            </button>
          </div>
        </div>
      )}

      {picker && draft && (
        <StoragePickerDialog
          kind={picker.kind}
          onPick={(value) => setDraft({ ...draft, fields: { ...draft.fields, [picker.fieldKey]: value } })}
          onClose={() => setPicker(null)}
        />
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={(nextOpen) => (!nextOpen && !saving ? setConfirmOpen(false) : undefined)}
      >
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">
            <AlertTriangle size={18} /> Aplicar alterações de bindings
          </DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            {upserts.size} novo(s)/alterado(s), {removed.size} removido(s). Bindings intocados são preservados
            (inherit); secrets nunca são alterados por aqui.
          </DialogDescription>

          {protectedWorker && (
            <div className="cfpw-dialog__warning" role="status">
              <p>'{scriptName}' é um worker de PRODUÇÃO do próprio admin-app.</p>
              <div className="field-group">
                <label htmlFor="cfpw-bindings-confirm-phrase">
                  Digite <strong>{PROTECTED_CONFIRM_PHRASE}</strong> para confirmar
                </label>
                <input
                  id="cfpw-bindings-confirm-phrase"
                  type="text"
                  autoComplete="off"
                  value={phrase}
                  onChange={(event) => setPhrase(event.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          )}

          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={() => setConfirmOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button cfpw-dialog__danger"
              onClick={() => void executeSave()}
              disabled={saving || (protectedWorker && phrase !== PROTECTED_CONFIRM_PHRASE)}
            >
              {saving ? <Loader2 size={16} className="spin" /> : 'Aplicar via PATCH'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
