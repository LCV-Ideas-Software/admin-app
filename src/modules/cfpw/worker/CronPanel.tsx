/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Painel de cron triggers (PW-1, aba Domínios & Triggers): carrega/salva os
 * schedules via ops legados (get/update-worker-schedules), valida expressões
 * com croner, humaniza em pt-BR via cronstrue e mostra as próximas 3
 * execuções em UTC. Com observability habilitada (useCapabilities), consulta
 * as execuções recentes do script via POST /api/cfpw/observability.
 */

import { Clock, Loader2, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../components/Notification';
import * as api from '../api';
import { useCapabilities } from '../hooks/useCapabilities';
import { cronNextRunsUtc, describeCronPtBr, formatUtcInstant, validateCronExpression } from './cronHelpers';

type CronPanelProps = {
  scriptName: string;
  adminActor: string;
};

type ObsEventRow = Record<string, unknown>;

/** Extrai a lista de schedules do result do ops (array direto ou {schedules}). */
const parseSchedulesResult = (result: unknown): string[] => {
  const list = Array.isArray(result)
    ? result
    : Array.isArray((result as { schedules?: unknown } | null)?.schedules)
      ? (result as { schedules: unknown[] }).schedules
      : [];
  return list.map((entry) => String((entry as { cron?: unknown } | null)?.cron ?? '').trim()).filter(Boolean);
};

export function CronPanel({ scriptName, adminActor }: CronPanelProps) {
  const { showNotification } = useNotification();
  const { capabilities } = useCapabilities();
  const observabilityEnabled = capabilities?.observability.enabled === true;

  const [schedules, setSchedules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newExpression, setNewExpression] = useState('');
  const [inputError, setInputError] = useState('');
  const [dirty, setDirty] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<ObsEventRow[] | null>(null);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const { response, payload } = await api.postOps(adminActor, {
        action: 'get-worker-schedules',
        scriptName,
      });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao ler cron triggers.');
      setSchedules(parseSchedulesResult(payload.result));
      setDirty(false);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao ler cron triggers.', 'error');
    } finally {
      setLoading(false);
    }
  }, [adminActor, scriptName, showNotification]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const addExpression = () => {
    const candidate = newExpression.trim();
    if (!candidate) return;
    const validationError = validateCronExpression(candidate);
    if (validationError) {
      setInputError(validationError);
      return;
    }
    if (schedules.includes(candidate)) {
      setInputError('Esta expressão já está na lista.');
      return;
    }
    setSchedules((prev) => [...prev, candidate]);
    setNewExpression('');
    setInputError('');
    setDirty(true);
  };

  const removeExpression = (expression: string) => {
    setSchedules((prev) => prev.filter((entry) => entry !== expression));
    setDirty(true);
  };

  const saveSchedules = async () => {
    setSaving(true);
    try {
      const { response, payload } = await api.postOps(adminActor, {
        action: 'update-worker-schedules',
        scriptName,
        schedules: schedules.map((cron) => ({ cron })),
      });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao atualizar cron triggers.');
      showNotification(api.withReq('Cron triggers atualizados.', payload), 'success');
      setDirty(false);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao atualizar cron triggers.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const now = Date.now();
      const res = await fetch('/api/cfpw/observability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'query',
          body: {
            queryId: `cron-${now}-${Math.random().toString(36).slice(2, 8)}`,
            timeframe: { from: now - 86_400_000, to: now },
            view: 'events',
            limit: 20,
            parameters: {
              filters: [
                {
                  kind: 'filter',
                  key: '$workers.scriptName',
                  operation: 'eq',
                  type: 'string',
                  value: scriptName,
                },
              ],
            },
          },
        }),
      });
      const payload = (await res.json()) as { ok: boolean; error?: string; result?: Record<string, unknown> };
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao consultar execuções.');
      const eventsWrapper = (payload.result as { events?: { events?: ObsEventRow[] } } | undefined)?.events;
      setHistory(Array.isArray(eventsWrapper?.events) ? eventsWrapper.events : []);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao consultar execuções.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="cfpw-panel-card">
      <div className="cfpw-code-header">
        <h3>
          <Clock size={16} /> Cron triggers
        </h3>
        <div className="cfpw-code-header-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => void loadSchedules()}
            disabled={loading || saving}
          >
            <RefreshCw size={14} /> Recarregar
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void saveSchedules()}
            disabled={loading || saving || !dirty}
          >
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={14} />} Salvar schedules
          </button>
        </div>
      </div>

      {loading ? (
        <div className="cfpw-obs-loading">
          <Loader2 size={20} className="spin" /> Carregando schedules...
        </div>
      ) : (
        <>
          {schedules.length === 0 ? (
            <div className="cfpw-empty-state">Nenhum cron trigger configurado.</div>
          ) : (
            <ul className="cfpw-cron-list">
              {schedules.map((expression) => {
                const nextRuns = cronNextRunsUtc(expression, 3);
                return (
                  <li key={expression} className="cfpw-cron-item">
                    <div className="cfpw-cron-item-main">
                      <code>{expression}</code>
                      <span>{describeCronPtBr(expression) || 'Expressão não humanizável.'}</span>
                      {nextRuns.length > 0 && (
                        <span className="field-hint">
                          Próximas 3 execuções (UTC): {nextRuns.map(formatUtcInstant).join(' · ')}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="cfpw-icon-button"
                      title="Remover expressão"
                      onClick={() => removeExpression(expression)}
                      disabled={saving}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="field-group">
            <label htmlFor="cfpw-cron-new">Nova expressão cron (UTC)</label>
            <div className="cfpw-inline-form">
              <input
                id="cfpw-cron-new"
                type="text"
                autoComplete="off"
                placeholder="0 5 * * *"
                value={newExpression}
                onChange={(event) => {
                  setNewExpression(event.target.value);
                  if (inputError) setInputError('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addExpression();
                  }
                }}
                disabled={saving}
              />
              <button type="button" className="ghost-button" onClick={addExpression} disabled={saving}>
                Adicionar
              </button>
            </div>
            {inputError ? (
              <p className="field-error" role="alert">
                {inputError}
              </p>
            ) : (
              newExpression.trim() &&
              !validateCronExpression(newExpression) && <p className="field-hint">{describeCronPtBr(newExpression)}</p>
            )}
            {dirty && <p className="field-hint">Alterações pendentes — clique em "Salvar schedules" para aplicar.</p>}
          </div>
        </>
      )}

      {observabilityEnabled && (
        <div className="cfpw-subsection">
          <div className="cfpw-code-header">
            <h4>Execuções recentes (24h)</h4>
            <button type="button" className="ghost-button" onClick={() => void loadHistory()} disabled={historyLoading}>
              {historyLoading ? <Loader2 size={14} className="spin" /> : 'Ver execuções recentes'}
            </button>
          </div>
          {history !== null &&
            (history.length === 0 ? (
              <div className="cfpw-empty-state">Nenhum evento deste worker nas últimas 24h.</div>
            ) : (
              <ul className="cfpw-cron-list">
                {history.map((event, index) => {
                  const workers = (event.$workers ?? {}) as Record<string, unknown>;
                  const meta = (event.$metadata ?? {}) as Record<string, unknown>;
                  const timestamp = Number(event.timestamp ?? meta.startTime ?? 0);
                  const outcome = String(workers.outcome ?? '—');
                  const eventType = String(
                    workers.eventType ?? (workers.event as Record<string, unknown>)?.type ?? '—',
                  );
                  const rowKey = String(meta.id ?? meta.requestId ?? `${timestamp}-${index}`);
                  return (
                    <li key={rowKey} className="cfpw-cron-item">
                      <div className="cfpw-cron-item-main">
                        <code>{timestamp ? new Date(timestamp).toLocaleString('pt-BR') : '—'}</code>
                        <span>
                          {eventType} · outcome: {outcome}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ))}
        </div>
      )}
    </div>
  );
}
