/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Modal de ações operacionais do CF P&W: formulário dinâmico por campos da
 * ação selecionada + visualizador amigável (AmigavelViewer) do resultado.
 * Estado e execução seguem no shell (CfPwModule) e chegam via props; apenas o
 * toggle de exibição do secret é local (o componente fica sempre montado).
 */

import { CheckCircle, Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { OpsActionDefinition } from '../types';
import { AmigavelViewer } from './AmigavelViewer';

type OpsModalProps = {
  open: boolean;
  selectedOp: OpsActionDefinition | null;
  opsLoading: boolean;
  opsState: Record<string, string>;
  opsResult: unknown;
  onUpdateField: (key: string, value: string) => void;
  onClose: () => void;
  onExecute: (action: OpsActionDefinition) => void;
};

export const OpsModal: React.FC<OpsModalProps> = ({
  open,
  selectedOp,
  opsLoading,
  opsState,
  opsResult,
  onUpdateField,
  onClose,
  onExecute,
}) => {
  const [showSecret, setShowSecret] = useState(false);

  if (!selectedOp || !open) return null;

  const visibleFields = new Set(selectedOp.fields);

  return createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop — click dismisses when not loading
    <div
      className="cfpw-modal-overlay"
      onClick={() => {
        if (!opsLoading) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !opsLoading) onClose();
      }}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: event guard — isolates modal body from backdrop dismiss */}
      <div className="cfpw-modal" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <div className="cfpw-modal-header">
          <div>
            <h3>{selectedOp.label}</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#5f6368', marginTop: '4px' }}>
              {selectedOp.description}
            </p>
          </div>
          <button type="button" className="cfpw-modal-close" onClick={onClose}>
            <RefreshCw size={20} />
          </button>
        </div>

        <div className="cfpw-modal-body">
          <div className="form-grid cfpw-ops-grid">
            {visibleFields.has('deploymentId') && (
              <div className="field-group cfpw-ops-grid-full">
                <label htmlFor="cfpw-ops-deploymentId">Deployment ID</label>
                <input
                  id="cfpw-ops-deploymentId"
                  value={opsState.deploymentId || ''}
                  onChange={(e) => onUpdateField('deploymentId', e.target.value)}
                  disabled={opsLoading}
                />
              </div>
            )}
            {visibleFields.has('domainName') && (
              <div className="field-group cfpw-ops-grid-full">
                <label htmlFor="cfpw-ops-domainName">Domínio</label>
                <input
                  id="cfpw-ops-domainName"
                  value={opsState.domainName || ''}
                  onChange={(e) => onUpdateField('domainName', e.target.value)}
                  disabled={opsLoading}
                />
              </div>
            )}
            {visibleFields.has('secretName') && (
              <div className="field-group">
                <label htmlFor="cfpw-ops-secretName">Nome do Secret</label>
                <input
                  id="cfpw-ops-secretName"
                  value={opsState.secretName || ''}
                  onChange={(e) => onUpdateField('secretName', e.target.value)}
                  disabled={opsLoading}
                />
              </div>
            )}
            {visibleFields.has('secretValue') && (
              <div className="field-group">
                <label htmlFor="cfpw-ops-secretValue">Valor</label>
                <div className="cfpw-secret-wrap">
                  <input
                    id="cfpw-ops-secretValue"
                    type={showSecret ? 'text' : 'password'}
                    value={opsState.secretValue || ''}
                    onChange={(e) => onUpdateField('secretValue', e.target.value)}
                    disabled={opsLoading}
                  />
                  <button type="button" className="cfpw-secret-toggle" onClick={() => setShowSecret((v) => !v)}>
                    {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}
            {visibleFields.has('usageModel') && (
              <div className="field-group">
                <label htmlFor="cfpw-ops-usageModel">Usage Model</label>
                <select
                  id="cfpw-ops-usageModel"
                  value={opsState.usageModel}
                  onChange={(e) => onUpdateField('usageModel', e.target.value)}
                >
                  <option value="standard">standard</option>
                  <option value="bundled">bundled</option>
                  <option value="unbound">unbound</option>
                </select>
              </div>
            )}
            {visibleFields.has('schedules') && (
              <div className="field-group cfpw-ops-grid-full">
                <label htmlFor="cfpw-ops-schedules">Schedules (Cron, um por linha)</label>
                <textarea
                  id="cfpw-ops-schedules"
                  className="json-textarea"
                  rows={4}
                  value={opsState.schedulesRaw}
                  onChange={(e) => onUpdateField('schedulesRaw', e.target.value)}
                />
              </div>
            )}
            {visibleFields.has('pageSettingsJson') && (
              <div className="field-group cfpw-ops-grid-full">
                <label htmlFor="cfpw-ops-pageSettingsJson">Config JSON (Avançado)</label>
                <textarea
                  id="cfpw-ops-pageSettingsJson"
                  className="json-textarea"
                  rows={4}
                  value={opsState.pageSettingsJson || ''}
                  onChange={(e) => onUpdateField('pageSettingsJson', e.target.value)}
                />
              </div>
            )}
            {visibleFields.has('routePattern') && (
              <div className="field-group cfpw-ops-grid-full">
                <label htmlFor="cfpw-ops-routePattern">Pattern Route</label>
                <input
                  id="cfpw-ops-routePattern"
                  value={opsState.routePattern || ''}
                  onChange={(e) => onUpdateField('routePattern', e.target.value)}
                  disabled={opsLoading}
                />
              </div>
            )}
            {visibleFields.has('zoneId') && (
              <div className="field-group">
                <label htmlFor="cfpw-ops-zoneId">Zone ID</label>
                <input
                  id="cfpw-ops-zoneId"
                  value={opsState.zoneId || ''}
                  onChange={(e) => onUpdateField('zoneId', e.target.value)}
                  disabled={opsLoading}
                />
              </div>
            )}
            {visibleFields.has('routeId') && (
              <div className="field-group">
                <label htmlFor="cfpw-ops-routeId">Route ID (para exclusão)</label>
                <input
                  id="cfpw-ops-routeId"
                  value={opsState.routeId || ''}
                  onChange={(e) => onUpdateField('routeId', e.target.value)}
                  disabled={opsLoading}
                />
              </div>
            )}
          </div>

          {opsResult ? (
            <div
              className="cfpw-result-container"
              style={{ marginTop: '16px', background: '#f8f9fa', padding: '16px', borderRadius: '12px' }}
            >
              <div className="cfpw-result-header" style={{ marginBottom: '8px' }}>
                <span
                  className="cfpw-result-header__badge cfpw-result-header__badge--ok"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    color: '#137333',
                    background: '#e6f4ea',
                    width: 'fit-content',
                    padding: '4px 8px',
                    borderRadius: '12px',
                  }}
                >
                  <CheckCircle size={12} /> Concluído
                </span>
              </div>
              <details open>
                <summary style={{ fontSize: '0.85rem', cursor: 'pointer', color: '#5f6368', paddingBottom: '8px' }}>
                  Visualizar Saída de Dados
                </summary>
                <div
                  style={{
                    background: '#fff',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #dadce0',
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                >
                  <AmigavelViewer data={opsResult} />
                </div>
              </details>
            </div>
          ) : null}
        </div>

        <div className="cfpw-modal-footer">
          <button type="button" className="ghost-button" onClick={onClose} disabled={opsLoading}>
            Fechar
          </button>
          <button type="button" className="primary-button" onClick={() => onExecute(selectedOp)} disabled={opsLoading}>
            {opsLoading ? <Loader2 size={16} className="spin" /> : 'Executar Ação'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
