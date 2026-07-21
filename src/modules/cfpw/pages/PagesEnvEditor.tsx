/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Aba "Variáveis & Bindings" do projeto Pages (PW-3): editor por ambiente
 * (Production/Preview) de env vars (secret existente mostra •••• e só pode ser
 * removido/substituído com valor novo) e de bindings Pages (KV/D1/R2/Service
 * editáveis; os demais grupos são exibidos read-only). "Salvar alterações"
 * envia SOMENTE deltas via buildPageEnvPatch; após o sucesso, banner com
 * "Reimplantar agora?" (as mudanças valem a partir do próximo deployment).
 * ST-R2: bindings KV/D1/R2 ganham "Abrir no Armazenamento" e o picker
 * "Escolher…" nos campos de ID (o campo texto continua editável).
 */

import { AlertTriangle, ExternalLink, Loader2, RefreshCw, Rocket, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../components/Notification';
import * as api from '../api';
import { StoragePickerDialog } from '../shared/StoragePickerDialog';
import type { StoragePickerKind } from '../shared/storagePickerHelpers';
import type { StorageDeepLink } from '../tabs/storage/storageDeepLink';
import type { PageEnvVarEntry } from '../types';
import { buildPageEnvPatch, type PageEnvOriginal } from './pagesEnvHelpers';

type PagesEnvironment = 'production' | 'preview';

/** Grupos editáveis (form dedicado); demais grupos do GET ficam read-only. */
const EDITABLE_GROUPS = [
  { key: 'kvNamespaces', label: 'KV', fields: [{ key: 'namespace_id', label: 'Namespace ID' }] },
  { key: 'd1Databases', label: 'D1', fields: [{ key: 'id', label: 'Database ID' }] },
  { key: 'r2Buckets', label: 'R2', fields: [{ key: 'name', label: 'Bucket' }] },
  {
    key: 'services',
    label: 'Service',
    fields: [
      { key: 'service', label: 'Service' },
      { key: 'environment', label: 'Environment', optional: true },
    ],
  },
] as const;

const GROUP_LABELS: Record<string, string> = {
  kvNamespaces: 'KV',
  d1Databases: 'D1',
  r2Buckets: 'R2',
  services: 'Service',
  durableObjectNamespaces: 'Durable Object',
  queueProducers: 'Queue',
  analyticsEngineDatasets: 'Analytics Engine',
  aiBindings: 'AI',
  hyperdriveBindings: 'Hyperdrive',
  browsers: 'Browser',
  vectorizeBindings: 'Vectorize',
};

type EditableGroupKey = (typeof EDITABLE_GROUPS)[number]['key'];

/** Grupos com recurso navegável na aba Armazenamento (ST-R2). */
const STORAGE_GROUPS: Partial<Record<EditableGroupKey, { kind: StoragePickerKind; fieldKey: string }>> = {
  kvNamespaces: { kind: 'kv', fieldKey: 'namespace_id' },
  d1Databases: { kind: 'd1', fieldKey: 'id' },
  r2Buckets: { kind: 'r2', fieldKey: 'name' },
};

/** Alvo do deep-link de um binding KV/D1/R2; null quando não navegável. */
const toStorageTarget = (group: EditableGroupKey, value: Record<string, unknown>): StorageDeepLink | null => {
  const spec = STORAGE_GROUPS[group];
  if (!spec) return null;
  const id = String(value[spec.fieldKey] ?? '').trim();
  return id ? { kind: spec.kind, id } : null;
};

type BindingDraft = {
  group: EditableGroupKey;
  editingName: string | null;
  name: string;
  fields: Record<string, string>;
};

type PagesEnvEditorProps = {
  projectName: string;
  adminActor: string;
  /** Cross-nav ST-R2: abre a aba Armazenamento no alvo do binding. */
  onOpenStorage?: ((target: StorageDeepLink) => void) | undefined;
};

export function PagesEnvEditor({ projectName, adminActor, onOpenStorage }: PagesEnvEditorProps) {
  const { showNotification } = useNotification();
  const [environment, setEnvironment] = useState<PagesEnvironment>('production');
  const [original, setOriginal] = useState<PageEnvOriginal | null>(null);
  const [readOnlyGroups, setReadOnlyGroups] = useState<Record<string, Record<string, Record<string, unknown>>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [showRedeployBanner, setShowRedeployBanner] = useState(false);

  // Edits pendentes: null = remover; objeto = criar/substituir.
  const [varEdits, setVarEdits] = useState<Record<string, PageEnvVarEntry | null>>({});
  const [bindingEdits, setBindingEdits] = useState<Record<string, Record<string, Record<string, unknown> | null>>>({});

  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<'plain_text' | 'secret_text'>('plain_text');
  const [newVarValue, setNewVarValue] = useState('');
  const [bindingDraft, setBindingDraft] = useState<BindingDraft | null>(null);
  const [inlineError, setInlineError] = useState('');
  const [picker, setPicker] = useState<{ kind: StoragePickerKind; fieldKey: string } | null>(null);

  const pendingChanges = Object.keys(varEdits).length > 0 || Object.keys(bindingEdits).length > 0;

  const loadEnv = useCallback(
    async (targetEnvironment: PagesEnvironment) => {
      setLoading(true);
      setInlineError('');
      try {
        const { response, payload } = await api.fetchPageEnv(adminActor, {
          projectName,
          environment: targetEnvironment,
        });
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao ler variáveis do ambiente.');
        const bindings = payload.bindings ?? {};
        const editable: PageEnvOriginal['bindings'] = {};
        const readOnly: Record<string, Record<string, Record<string, unknown>>> = {};
        for (const [group, entries] of Object.entries(bindings)) {
          if (EDITABLE_GROUPS.some((candidate) => candidate.key === group)) {
            editable[group] = entries;
          } else if (Object.keys(entries).length > 0) {
            readOnly[group] = entries;
          }
        }
        setOriginal({ envVars: payload.envVars ?? {}, bindings: editable });
        setReadOnlyGroups(readOnly);
        setVarEdits({});
        setBindingEdits({});
        setBindingDraft(null);
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'Falha ao ler variáveis do ambiente.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [adminActor, projectName, showNotification],
  );

  useEffect(() => {
    void loadEnv(environment);
  }, [environment, loadEnv]);

  const addVar = () => {
    const name = newVarName.trim();
    if (!name) {
      setInlineError('Informe o nome da variável.');
      return;
    }
    if (newVarType === 'secret_text' && !newVarValue.trim()) {
      setInlineError('Variável secreta exige um valor não vazio.');
      return;
    }
    setInlineError('');
    setVarEdits((prev) => ({ ...prev, [name]: { type: newVarType, value: newVarValue } }));
    setNewVarName('');
    setNewVarValue('');
    setNewVarType('plain_text');
  };

  const toggleRemoveVar = (name: string) => {
    setVarEdits((prev) => {
      const next = { ...prev };
      if (next[name] === null) {
        delete next[name];
      } else {
        next[name] = null;
      }
      return next;
    });
  };

  const startReplaceVar = (name: string, entry: PageEnvVarEntry) => {
    setNewVarName(name);
    setNewVarType(entry.type);
    setNewVarValue(entry.type === 'plain_text' ? (entry.value ?? '') : '');
    setInlineError('');
  };

  const applyBindingDraft = () => {
    if (!bindingDraft) return;
    const name = bindingDraft.name.trim();
    if (!name) {
      setInlineError('Informe o nome (variável) do binding.');
      return;
    }
    const spec = EDITABLE_GROUPS.find((candidate) => candidate.key === bindingDraft.group);
    if (!spec) return;
    const value: Record<string, unknown> = {};
    for (const field of spec.fields) {
      const fieldValue = (bindingDraft.fields[field.key] ?? '').trim();
      if (!fieldValue) {
        if ('optional' in field && field.optional) continue;
        setInlineError(`Informe ${field.label} para o binding ${spec.label}.`);
        return;
      }
      value[field.key] = fieldValue;
    }
    setInlineError('');
    setBindingEdits((prev) => ({
      ...prev,
      [bindingDraft.group]: { ...(prev[bindingDraft.group] ?? {}), [name]: value },
    }));
    setBindingDraft(null);
  };

  const toggleRemoveBinding = (group: string, name: string) => {
    setBindingEdits((prev) => {
      const groupEdits = { ...(prev[group] ?? {}) };
      if (groupEdits[name] === null) {
        delete groupEdits[name];
      } else {
        groupEdits[name] = null;
      }
      const next = { ...prev, [group]: groupEdits };
      if (Object.keys(groupEdits).length === 0) delete next[group];
      return next;
    });
  };

  const save = async () => {
    if (!original) return;
    const { patch, error } = buildPageEnvPatch(original, { envVars: varEdits, bindings: bindingEdits });
    if (error) {
      setInlineError(error);
      return;
    }
    if (!patch) {
      showNotification('Nenhuma alteração para salvar.', 'info');
      return;
    }
    setSaving(true);
    setInlineError('');
    try {
      const { response, payload } = await api.patchPageEnv(adminActor, { projectName, environment, ...patch });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao salvar alterações.');
      showNotification(api.withReq('Alterações salvas.', payload), 'success');
      setShowRedeployBanner(true);
      await loadEnv(environment);
    } catch (error2) {
      showNotification(error2 instanceof Error ? error2.message : 'Falha ao salvar alterações.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const redeployNow = async () => {
    setDeploying(true);
    try {
      const { response, payload } = await api.postPageDeploy(adminActor, { projectName });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao criar deployment.');
      showNotification(api.withReq('Deployment disparado.', payload), 'success');
      setShowRedeployBanner(false);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao criar deployment.', 'error');
    } finally {
      setDeploying(false);
    }
  };

  // ── Visões derivadas (original + edits) ──
  const varRows: Array<{ name: string; entry: PageEnvVarEntry; state: 'original' | 'editado' | 'novo' | 'removido' }> =
    [];
  if (original) {
    for (const [name, entry] of Object.entries(original.envVars)) {
      const edit = varEdits[name];
      if (edit === null) {
        varRows.push({ name, entry, state: 'removido' });
      } else if (edit !== undefined) {
        varRows.push({ name, entry: edit, state: 'editado' });
      } else {
        varRows.push({ name, entry, state: 'original' });
      }
    }
    for (const [name, edit] of Object.entries(varEdits)) {
      if (edit !== null && !(name in original.envVars)) {
        varRows.push({ name, entry: edit, state: 'novo' });
      }
    }
  }

  const bindingRows = (group: EditableGroupKey) => {
    const rows: Array<{
      name: string;
      value: Record<string, unknown>;
      state: 'original' | 'editado' | 'novo' | 'removido';
    }> = [];
    const originalGroup = original?.bindings[group] ?? {};
    const edits = bindingEdits[group] ?? {};
    for (const [name, value] of Object.entries(originalGroup)) {
      const edit = edits[name];
      if (edit === null) {
        rows.push({ name, value, state: 'removido' });
      } else if (edit !== undefined) {
        rows.push({ name, value: edit, state: 'editado' });
      } else {
        rows.push({ name, value, state: 'original' });
      }
    }
    for (const [name, edit] of Object.entries(edits)) {
      if (edit !== null && !(name in originalGroup)) {
        rows.push({ name, value: edit, state: 'novo' });
      }
    }
    return rows;
  };

  const describeBinding = (value: Record<string, unknown>) =>
    Object.entries(value)
      .map(([key, entryValue]) => `${key}=${String(entryValue)}`)
      .join(' · ');

  return (
    <div className="cfpw-panel-card">
      <div className="cfpw-code-header">
        <h3>Variáveis & Bindings</h3>
        <div className="cfpw-code-header-actions">
          <select
            aria-label="Ambiente"
            value={environment}
            onChange={(event) => setEnvironment(event.target.value as PagesEnvironment)}
            disabled={loading || saving}
          >
            <option value="production">Production</option>
            <option value="preview">Preview</option>
          </select>
          <button
            type="button"
            className="ghost-button"
            onClick={() => void loadEnv(environment)}
            disabled={loading || saving}
          >
            <RefreshCw size={14} /> Recarregar
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void save()}
            disabled={loading || saving || !pendingChanges}
          >
            {saving ? <Loader2 size={16} className="spin" /> : 'Salvar alterações'}
          </button>
        </div>
      </div>

      {showRedeployBanner && (
        <div className="cfpw-inline-warning" role="status">
          <Rocket size={14} />
          <span>Alterações valem a partir do próximo deployment — Reimplantar agora?</span>
          <button type="button" className="ghost-button" onClick={() => void redeployNow()} disabled={deploying}>
            {deploying ? <Loader2 size={14} className="spin" /> : 'Reimplantar agora'}
          </button>
        </div>
      )}

      {loading && !original ? (
        <div className="cfpw-obs-loading">
          <Loader2 size={20} className="spin" /> Carregando variáveis...
        </div>
      ) : (
        <>
          {/* ── Env vars ── */}
          <div className="cfpw-subsection">
            <h4>Variáveis de ambiente ({environment})</h4>
            {varRows.length === 0 ? (
              <div className="cfpw-empty-state">Nenhuma variável configurada.</div>
            ) : (
              <div className="cfpw-obs-table-wrap">
                <table className="cfpw-obs-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Estado</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {varRows.map(({ name, entry, state }) => (
                      <tr key={name} className={state === 'removido' ? 'cfpw-row-removed' : ''}>
                        <td>
                          <code>{name}</code>
                        </td>
                        <td>{entry.type}</td>
                        <td>{entry.type === 'secret_text' ? '••••' : (entry.value ?? '')}</td>
                        <td>{state === 'original' ? '—' : state}</td>
                        <td>
                          <span className="cfpw-code-header-actions">
                            <button
                              type="button"
                              className="ghost-button"
                              style={{ padding: '2px 8px', fontSize: '12px' }}
                              onClick={() => startReplaceVar(name, entry)}
                              disabled={saving || state === 'removido'}
                            >
                              {entry.type === 'secret_text' ? 'Substituir' : 'Editar'}
                            </button>
                            <button
                              type="button"
                              className="cfpw-icon-button"
                              title={state === 'removido' ? 'Desfazer remoção' : 'Remover'}
                              onClick={() => toggleRemoveVar(name)}
                              disabled={saving}
                            >
                              <Trash2 size={14} />
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="cfpw-inline-form" style={{ marginTop: '12px' }}>
              <input
                type="text"
                placeholder="NOME_DA_VARIAVEL"
                aria-label="Nome da variável"
                value={newVarName}
                onChange={(event) => setNewVarName(event.target.value)}
                disabled={saving}
              />
              <select
                aria-label="Tipo da variável"
                value={newVarType}
                onChange={(event) => setNewVarType(event.target.value as 'plain_text' | 'secret_text')}
                disabled={saving}
              >
                <option value="plain_text">plain_text</option>
                <option value="secret_text">secret_text</option>
              </select>
              <input
                type={newVarType === 'secret_text' ? 'password' : 'text'}
                placeholder="valor"
                aria-label="Valor da variável"
                value={newVarValue}
                onChange={(event) => setNewVarValue(event.target.value)}
                disabled={saving}
              />
              <button type="button" className="ghost-button" onClick={addVar} disabled={saving}>
                + Adicionar variável
              </button>
            </div>
          </div>

          {/* ── Bindings editáveis ── */}
          {EDITABLE_GROUPS.map((group) => {
            const rows = bindingRows(group.key);
            return (
              <div className="cfpw-subsection" key={group.key}>
                <div className="cfpw-code-header">
                  <h4>Bindings {group.label}</h4>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setInlineError('');
                      setBindingDraft({ group: group.key, editingName: null, name: '', fields: {} });
                    }}
                    disabled={saving}
                  >
                    + Adicionar
                  </button>
                </div>
                {rows.length === 0 ? (
                  <div className="cfpw-empty-state">Nenhum binding {group.label} configurado.</div>
                ) : (
                  <div className="cfpw-obs-table-wrap">
                    <table className="cfpw-obs-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Alvo</th>
                          <th>Estado</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ name, value, state }) => {
                          const storageTarget = onOpenStorage ? toStorageTarget(group.key, value) : null;
                          return (
                            <tr key={name} className={state === 'removido' ? 'cfpw-row-removed' : ''}>
                              <td>
                                <code>{name}</code>
                              </td>
                              <td>{describeBinding(value)}</td>
                              <td>{state === 'original' ? '—' : state}</td>
                              <td>
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
                                    className="ghost-button"
                                    style={{ padding: '2px 8px', fontSize: '12px' }}
                                    onClick={() => {
                                      setInlineError('');
                                      setBindingDraft({
                                        group: group.key,
                                        editingName: name,
                                        name,
                                        fields: Object.fromEntries(
                                          Object.entries(value).map(([key, entryValue]) => [key, String(entryValue)]),
                                        ),
                                      });
                                    }}
                                    disabled={saving || state === 'removido'}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="cfpw-icon-button"
                                    title={state === 'removido' ? 'Desfazer remoção' : 'Remover'}
                                    onClick={() => toggleRemoveBinding(group.key, name)}
                                    disabled={saving}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Form de binding (novo/edição) ── */}
          {bindingDraft && (
            <div className="cfpw-binding-form">
              <h4>
                {bindingDraft.editingName
                  ? `Editar binding ${bindingDraft.editingName}`
                  : `Novo binding ${GROUP_LABELS[bindingDraft.group]}`}
              </h4>
              <div className="cfpw-settings-grid">
                <div className="field-group">
                  <label htmlFor="cfpw-page-binding-name">Nome (variável)</label>
                  <input
                    id="cfpw-page-binding-name"
                    type="text"
                    autoComplete="off"
                    value={bindingDraft.name}
                    onChange={(event) => setBindingDraft({ ...bindingDraft, name: event.target.value })}
                    disabled={saving}
                  />
                </div>
                {(EDITABLE_GROUPS.find((candidate) => candidate.key === bindingDraft.group)?.fields ?? []).map(
                  (field) => {
                    const pickerSpec = STORAGE_GROUPS[bindingDraft.group];
                    const hasPicker = pickerSpec !== undefined && pickerSpec.fieldKey === field.key;
                    return (
                      <div className="field-group" key={field.key}>
                        <label htmlFor={`cfpw-page-binding-${field.key}`}>
                          {field.label}
                          {'optional' in field && field.optional ? ' (opcional)' : ''}
                        </label>
                        <div className={hasPicker ? 'storage-field-with-picker' : undefined}>
                          <input
                            id={`cfpw-page-binding-${field.key}`}
                            type="text"
                            autoComplete="off"
                            value={bindingDraft.fields[field.key] ?? ''}
                            onChange={(event) =>
                              setBindingDraft({
                                ...bindingDraft,
                                fields: { ...bindingDraft.fields, [field.key]: event.target.value },
                              })
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
                  },
                )}
              </div>
              <div className="cfpw-dialog__actions">
                <button type="button" className="ghost-button" onClick={() => setBindingDraft(null)} disabled={saving}>
                  Cancelar
                </button>
                <button type="button" className="primary-button" onClick={applyBindingDraft} disabled={saving}>
                  {bindingDraft.editingName ? 'Atualizar na lista' : 'Adicionar à lista'}
                </button>
              </div>
            </div>
          )}

          {/* ── Grupos read-only ── */}
          {Object.keys(readOnlyGroups).length > 0 && (
            <div className="cfpw-subsection">
              <h4>Outros bindings (somente leitura)</h4>
              <div className="cfpw-obs-table-wrap">
                <table className="cfpw-obs-table">
                  <thead>
                    <tr>
                      <th>Grupo</th>
                      <th>Nome</th>
                      <th>Definição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(readOnlyGroups).flatMap(([group, entries]) =>
                      Object.entries(entries).map(([name, value]) => (
                        <tr key={`${group}:${name}`}>
                          <td>{GROUP_LABELS[group] ?? group}</td>
                          <td>
                            <code>{name}</code>
                          </td>
                          <td>{JSON.stringify(value)}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {picker && bindingDraft && (
        <StoragePickerDialog
          kind={picker.kind}
          onPick={(value) =>
            setBindingDraft({ ...bindingDraft, fields: { ...bindingDraft.fields, [picker.fieldKey]: value } })
          }
          onClose={() => setPicker(null)}
        />
      )}

      {inlineError && (
        <div className="cfpw-inline-warning cfpw-inline-warning--error" role="alert">
          <AlertTriangle size={14} /> {inlineError}
        </div>
      )}
    </div>
  );
}
