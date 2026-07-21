/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Painel de configurações do Worker (PW-1, aba Configurações): formulário de
 * GET worker-settings (compatibility date/flags, placement smart, logpush,
 * tail consumers, observability, limites de CPU, usage model) com PATCH
 * somente das chaves alteradas — bindings vão SEMPRE como inherit (este
 * painel não edita bindings). Frase de confirmação para workers protegidos.
 */

import { AlertTriangle, Loader2, RefreshCw, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/Dialog';
import * as api from '../api';
import type { WorkerSettingsData } from '../types';
import { buildInheritBindings, toBindingList } from './bindingsHelpers';
import { buildWorkerSettingsPatch, toWorkerSettingsForm, type WorkerSettingsFormState } from './workerSettingsHelpers';
import { isProtectedWorker, PROTECTED_CONFIRM_PHRASE } from './workerValidation';

type WorkerSettingsPanelProps = {
  scriptName: string;
  adminActor: string;
};

export function WorkerSettingsPanel({ scriptName, adminActor }: WorkerSettingsPanelProps) {
  const { showNotification } = useNotification();
  const [snapshot, setSnapshot] = useState<WorkerSettingsData | null>(null);
  const [form, setForm] = useState<WorkerSettingsFormState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flagInput, setFlagInput] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phrase, setPhrase] = useState('');

  const protectedWorker = isProtectedWorker(scriptName);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { response, payload } = await api.fetchWorkerSettings(adminActor, scriptName);
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao ler settings.');
      const settings = payload.settings ?? {};
      setSnapshot(settings);
      setForm(toWorkerSettingsForm(settings));
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao ler settings.', 'error');
    } finally {
      setLoading(false);
    }
  }, [adminActor, scriptName, showNotification]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateForm = (patch: Partial<WorkerSettingsFormState>) => {
    setForm((current) => (current ? { ...current, ...patch } : current));
  };

  const addFlag = () => {
    const candidate = flagInput.trim();
    if (!candidate || !form) return;
    if (form.compatibilityFlags.includes(candidate)) {
      showNotification(`Flag "${candidate}" já adicionada.`, 'error');
      return;
    }
    updateForm({ compatibilityFlags: [...form.compatibilityFlags, candidate] });
    setFlagInput('');
  };

  const executeSave = async () => {
    if (!snapshot || !form) return;
    const { settings, issues } = buildWorkerSettingsPatch(snapshot, form);
    if (issues.length > 0) {
      showNotification(issues.join(' '), 'error');
      return;
    }
    if (Object.keys(settings).length === 0) {
      showNotification('Nenhuma alteração para salvar.', 'success');
      setConfirmOpen(false);
      return;
    }
    setSaving(true);
    try {
      const { response, payload } = await api.patchWorkerSettings(adminActor, {
        scriptName,
        ...(protectedWorker ? { confirmPhrase: phrase } : {}),
        settings: { ...settings, bindings: buildInheritBindings(toBindingList(snapshot.bindings)) },
      });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao atualizar settings.');
      showNotification(api.withReq('Configurações atualizadas.', payload), 'success');
      setConfirmOpen(false);
      setPhrase('');
      await loadSettings();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao atualizar settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestSave = () => {
    if (protectedWorker) {
      setPhrase('');
      setConfirmOpen(true);
      return;
    }
    void executeSave();
  };

  if (loading && !form) {
    return (
      <div className="cfpw-obs-loading">
        <Loader2 size={20} className="spin" /> Carregando configurações...
      </div>
    );
  }

  if (!form || !snapshot) {
    return <div className="cfpw-empty-state">Configurações indisponíveis.</div>;
  }

  return (
    <div className="cfpw-panel-card">
      <div className="cfpw-code-header">
        <h3>Configurações do Worker</h3>
        <div className="cfpw-code-header-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => void loadSettings()}
            disabled={loading || saving}
          >
            <RefreshCw size={14} /> Recarregar
          </button>
          <button type="button" className="primary-button" onClick={requestSave} disabled={loading || saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={14} />} Salvar alterações
          </button>
        </div>
      </div>

      <div className="cfpw-settings-grid">
        <div className="field-group">
          <label htmlFor="cfpw-settings-compat-date">Compatibility date</label>
          <input
            id="cfpw-settings-compat-date"
            type="date"
            value={form.compatibilityDate}
            onChange={(event) => updateForm({ compatibilityDate: event.target.value })}
            disabled={saving}
          />
          <p className="field-hint">Data de comportamento do runtime (YYYY-MM-DD, não pode estar no futuro).</p>
        </div>

        <div className="field-group">
          <label htmlFor="cfpw-settings-flag-input">Compatibility flags</label>
          <div className="cfpw-chips-input">
            {form.compatibilityFlags.map((flag) => (
              <span key={flag} className="cfpw-chip">
                {flag}
                <button
                  type="button"
                  aria-label={`Remover flag ${flag}`}
                  onClick={() => updateForm({ compatibilityFlags: form.compatibilityFlags.filter((f) => f !== flag) })}
                  disabled={saving}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              id="cfpw-settings-flag-input"
              type="text"
              autoComplete="off"
              placeholder="flag + Enter"
              value={flagInput}
              onChange={(event) => setFlagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addFlag();
                }
              }}
              disabled={saving}
            />
          </div>
        </div>

        <label className="cfpw-dialog__toggle">
          <input
            type="checkbox"
            checked={form.placementSmart}
            onChange={(event) => updateForm({ placementSmart: event.target.checked })}
            disabled={saving}
          />
          <span>Smart placement</span>
        </label>

        <label className="cfpw-dialog__toggle">
          <input
            type="checkbox"
            checked={form.logpush}
            onChange={(event) => updateForm({ logpush: event.target.checked })}
            disabled={saving}
          />
          <span>
            Logpush <em className="field-hint">(requer plano pago)</em>
          </span>
        </label>

        <div className="field-group cfpw-settings-grid-full">
          <span className="cfpw-settings-label">Tail consumers</span>
          <p className="field-hint">Workers que recebem os tail events deste script (requer plano pago).</p>
          {form.tailConsumers.map((consumer, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: linhas editáveis sem identidade estável
            <div key={index} className="cfpw-tail-consumer-row">
              <input
                type="text"
                placeholder="service"
                aria-label={`Tail consumer ${index + 1}: service`}
                value={consumer.service}
                onChange={(event) =>
                  updateForm({
                    tailConsumers: form.tailConsumers.map((entry, i) =>
                      i === index ? { ...entry, service: event.target.value } : entry,
                    ),
                  })
                }
                disabled={saving}
              />
              <input
                type="text"
                placeholder="environment (opcional)"
                aria-label={`Tail consumer ${index + 1}: environment`}
                value={consumer.environment}
                onChange={(event) =>
                  updateForm({
                    tailConsumers: form.tailConsumers.map((entry, i) =>
                      i === index ? { ...entry, environment: event.target.value } : entry,
                    ),
                  })
                }
                disabled={saving}
              />
              <button
                type="button"
                className="ghost-button cfpw-table-action"
                onClick={() => updateForm({ tailConsumers: form.tailConsumers.filter((_, i) => i !== index) })}
                disabled={saving}
              >
                Remover
              </button>
            </div>
          ))}
          <button
            type="button"
            className="ghost-button cfpw-table-action"
            onClick={() => updateForm({ tailConsumers: [...form.tailConsumers, { service: '', environment: '' }] })}
            disabled={saving}
            style={{ alignSelf: 'flex-start' }}
          >
            + Adicionar tail consumer
          </button>
        </div>

        <label className="cfpw-dialog__toggle">
          <input
            type="checkbox"
            checked={form.observabilityEnabled}
            onChange={(event) => updateForm({ observabilityEnabled: event.target.checked })}
            disabled={saving}
          />
          <span>Observability</span>
        </label>

        <div className="field-group">
          <label htmlFor="cfpw-settings-sampling">Head sampling rate (0 &lt; x ≤ 1)</label>
          <input
            id="cfpw-settings-sampling"
            type="number"
            step="0.01"
            min="0"
            max="1"
            placeholder="1"
            value={form.headSamplingRate}
            onChange={(event) => updateForm({ headSamplingRate: event.target.value })}
            disabled={saving}
          />
        </div>

        <div className="field-group">
          <label htmlFor="cfpw-settings-cpu-ms">Limite de CPU (cpu_ms)</label>
          <input
            id="cfpw-settings-cpu-ms"
            type="number"
            min="1"
            max="300000"
            placeholder="sem limite explícito"
            value={form.cpuMs}
            onChange={(event) => updateForm({ cpuMs: event.target.value })}
            disabled={saving}
          />
          <p className="field-hint">Requer plano pago.</p>
        </div>

        {snapshot.usage_model != null && (
          <div className="field-group">
            <label htmlFor="cfpw-settings-usage-model">Usage model</label>
            <select
              id="cfpw-settings-usage-model"
              value={form.usageModel}
              onChange={(event) => updateForm({ usageModel: event.target.value })}
              disabled={saving}
            >
              <option value="standard">standard</option>
              <option value="bundled">bundled</option>
            </select>
          </div>
        )}
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(nextOpen) => (!nextOpen && !saving ? setConfirmOpen(false) : undefined)}
      >
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">
            <AlertTriangle size={18} /> Atualizar settings de worker protegido
          </DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            '{scriptName}' é um worker de PRODUÇÃO do próprio admin-app — uma configuração defeituosa pode derrubar esta
            interface.
          </DialogDescription>
          <div className="field-group">
            <label htmlFor="cfpw-settings-confirm-phrase">
              Digite <strong>{PROTECTED_CONFIRM_PHRASE}</strong> para confirmar
            </label>
            <input
              id="cfpw-settings-confirm-phrase"
              type="text"
              autoComplete="off"
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              disabled={saving}
            />
          </div>
          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={() => setConfirmOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button cfpw-dialog__danger"
              onClick={() => void executeSave()}
              disabled={saving || phrase !== PROTECTED_CONFIRM_PHRASE}
            >
              {saving ? <Loader2 size={16} className="spin" /> : 'Salvar settings'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
