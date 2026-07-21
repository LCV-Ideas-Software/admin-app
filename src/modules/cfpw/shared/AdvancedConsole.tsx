/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Console avançado (API Cloudflare) — PW-2: card colapsável no rodapé do
 * dashboard do CF P&W. Método + path + body JSON executados via a action
 * raw-cloudflare-request de /api/cfpw/ops (allowlist validada no servidor; a
 * allowlist exibida/pré-validada vem de GET /api/cfpw/raw-allowlist, mesma
 * fonte). Mutações (não-GET) exigem confirmação em Dialog; o resultado é
 * renderizado com o AmigavelViewer compartilhado.
 */

import { AlertTriangle, ChevronDown, ChevronRight, Loader2, Terminal } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/Dialog';
import * as api from '../api';
import { AmigavelViewer } from './AmigavelViewer';
import { validateRawConsoleInput } from './consoleHelpers';

const FALLBACK_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

type AdvancedConsoleProps = {
  adminActor: string;
};

export function AdvancedConsole({ adminActor }: AdvancedConsoleProps) {
  const { showNotification } = useNotification();

  const [expanded, setExpanded] = useState(false);
  const [allowlist, setAllowlist] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>(FALLBACK_METHODS);
  const [allowlistLoaded, setAllowlistLoaded] = useState(false);

  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('');
  const [bodyJson, setBodyJson] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  const loadAllowlist = useCallback(async () => {
    try {
      const { response, payload } = await api.fetchRawAllowlist(adminActor);
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao carregar allowlist.');
      setAllowlist(Array.isArray(payload.allowlist) ? payload.allowlist : []);
      setPatterns(Array.isArray(payload.patterns) ? payload.patterns : []);
      if (Array.isArray(payload.methods) && payload.methods.length > 0) setMethods(payload.methods);
      setAllowlistLoaded(true);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao carregar allowlist.', 'error');
    }
  }, [adminActor, showNotification]);

  useEffect(() => {
    if (expanded && !allowlistLoaded) void loadAllowlist();
  }, [expanded, allowlistLoaded, loadAllowlist]);

  const runRequest = useCallback(async () => {
    setExecuting(true);
    setConfirmOpen(false);
    try {
      const { response, payload } = await api.postOps(adminActor, {
        action: 'raw-cloudflare-request',
        rawMethod: method,
        rawPath: path.trim(),
        rawBodyJson: method === 'GET' ? '' : bodyJson,
      });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha na operação raw.');
      setResult(payload.result ?? null);
      showNotification(api.withReq(`${method} ${path.trim()} concluído.`, payload), 'success');
    } catch (error) {
      setResult(null);
      showNotification(error instanceof Error ? error.message : 'Falha na operação raw.', 'error');
    } finally {
      setExecuting(false);
    }
  }, [adminActor, method, path, bodyJson, showNotification]);

  const handleExecute = () => {
    const validationError = validateRawConsoleInput(method, path, bodyJson, patterns);
    setInputError(validationError);
    if (validationError) return;
    if (method !== 'GET') {
      setConfirmOpen(true);
      return;
    }
    void runRequest();
  };

  return (
    <div className="cfpw-console-card">
      <button
        type="button"
        className="cfpw-console-toggle"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Terminal size={16} />
        <span>Console avançado (API Cloudflare)</span>
      </button>

      {expanded && (
        <div className="cfpw-console-body">
          <div className="cfpw-console-allowlist">
            <strong>Paths permitidos (validados no motor):</strong>
            {allowlist.length === 0 ? (
              <span> carregando allowlist...</span>
            ) : (
              <ul>
                {allowlist.map((entry) => (
                  <li key={entry}>
                    <code>{entry}</code>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="cfpw-console-form">
            <div className="field-group cfpw-console-method">
              <label htmlFor="cfpw-console-method">Método</label>
              <select
                id="cfpw-console-method"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                disabled={executing}
              >
                {methods.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group cfpw-console-path">
              <label htmlFor="cfpw-console-path">Path (relativo a /client/v4)</label>
              <input
                id="cfpw-console-path"
                type="text"
                placeholder="/accounts/{accountId}/workers/scripts"
                value={path}
                onChange={(event) => setPath(event.target.value)}
                disabled={executing}
              />
            </div>
          </div>

          {method !== 'GET' && (
            <div className="field-group">
              <label htmlFor="cfpw-console-body">Body JSON (opcional)</label>
              <textarea
                id="cfpw-console-body"
                className="json-textarea"
                rows={4}
                placeholder='{"exemplo": true}'
                value={bodyJson}
                onChange={(event) => setBodyJson(event.target.value)}
                disabled={executing}
              />
            </div>
          )}

          {inputError && (
            <p className="field-error" role="alert">
              {inputError}
            </p>
          )}

          <button
            type="button"
            className="primary-button"
            style={{ alignSelf: 'flex-start' }}
            onClick={handleExecute}
            disabled={executing}
          >
            {executing ? <Loader2 size={16} className="spin" /> : 'Executar'}
          </button>

          {result != null && (
            <div className="cfpw-console-result">
              <AmigavelViewer data={result} />
            </div>
          )}
        </div>
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={(nextOpen) => (!nextOpen && !executing ? setConfirmOpen(false) : undefined)}
      >
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">
            <AlertTriangle size={18} /> Confirmar mutação na API Cloudflare
          </DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Esta requisição altera recursos reais na Cloudflare: {method} {path.trim()}. Deseja continuar?
          </DialogDescription>
          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={() => setConfirmOpen(false)} disabled={executing}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button cfpw-dialog__danger"
              onClick={() => void runRequest()}
              disabled={executing}
            >
              {executing ? <Loader2 size={16} className="spin" /> : 'Executar mutação'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
