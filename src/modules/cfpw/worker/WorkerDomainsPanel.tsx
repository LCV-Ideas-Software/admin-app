/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Aba "Domínios & Triggers" — seção de domínios (PW-1): workers.dev (URL,
 * toggles enabled/previews e criação do subdomínio da conta), domínios custom
 * (tabela + adicionar com dropdown de zonas de /api/cfdns/zones + remover) e
 * acesso aos ops legados de rotas de zona via OpsModal.
 */

import { AlertTriangle, Globe, Loader2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/Dialog';
import * as api from '../api';
import type { OpsActionDefinition, PartialWarning } from '../types';

type ZoneOption = { id: string; name: string };

type WorkerDomainsPanelProps = {
  scriptName: string;
  adminActor: string;
  /** Ops legados de rotas de zona (list/add/delete) — abrem o OpsModal do shell. */
  routeOps: OpsActionDefinition[];
  onOpenAction: (action: OpsActionDefinition) => void;
};

export function WorkerDomainsPanel({ scriptName, adminActor, routeOps, onOpenAction }: WorkerDomainsPanelProps) {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [domains, setDomains] = useState<Array<Record<string, unknown>>>([]);
  const [scriptSubdomain, setScriptSubdomain] = useState<{ enabled: boolean; previews_enabled: boolean } | null>(null);
  const [accountSubdomain, setAccountSubdomain] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<PartialWarning[]>([]);
  const [subdomainBusy, setSubdomainBusy] = useState(false);
  const [newAccountSubdomain, setNewAccountSubdomain] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [hostname, setHostname] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState('');
  const [pendingRemove, setPendingRemove] = useState<{ id: string; hostname: string } | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const loadDomains = useCallback(async () => {
    setLoading(true);
    try {
      const { response, payload } = await api.fetchWorkerDomains(adminActor, scriptName);
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao listar domínios.');
      setDomains(Array.isArray(payload.domains) ? payload.domains : []);
      setScriptSubdomain(payload.scriptSubdomain ?? null);
      setAccountSubdomain(payload.accountSubdomain ?? null);
      setWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao listar domínios.', 'error');
    } finally {
      setLoading(false);
    }
  }, [adminActor, scriptName, showNotification]);

  useEffect(() => {
    void loadDomains();
  }, [loadDomains]);

  const updateScriptSubdomain = async (next: { enabled: boolean; previewsEnabled: boolean }) => {
    setSubdomainBusy(true);
    try {
      const { response, payload } = await api.postWorkerSubdomain(adminActor, { scriptName, ...next });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao configurar workers.dev.');
      showNotification(api.withReq('Subdomínio workers.dev atualizado.', payload), 'success');
      await loadDomains();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao configurar workers.dev.', 'error');
    } finally {
      setSubdomainBusy(false);
    }
  };

  const createAccountSubdomain = async () => {
    const subdomain = newAccountSubdomain.trim();
    if (!subdomain) return;
    setSubdomainBusy(true);
    try {
      const { response, payload } = await api.postWorkerSubdomain(adminActor, { accountSubdomain: subdomain });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao criar o subdomínio da conta.');
      showNotification(api.withReq(`Subdomínio ${subdomain}.workers.dev criado.`, payload), 'success');
      setNewAccountSubdomain('');
      await loadDomains();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao criar o subdomínio da conta.', 'error');
    } finally {
      setSubdomainBusy(false);
    }
  };

  const openAddDialog = async () => {
    setAddError('');
    setHostname('');
    setAddOpen(true);
    if (zones.length === 0) {
      try {
        const { response, payload } = await api.fetchDnsZones(adminActor);
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao carregar zonas.');
        const options = (payload.zones ?? [])
          .map((zone) => ({ id: String(zone.id ?? '').trim(), name: String(zone.name ?? '').trim() }))
          .filter((zone) => zone.id && zone.name);
        setZones(options);
        setZoneId((current) => current || options[0]?.id || '');
      } catch (error) {
        setAddError(error instanceof Error ? error.message : 'Falha ao carregar zonas.');
      }
    }
  };

  const executeAdd = async () => {
    const trimmedHostname = hostname.trim();
    if (!trimmedHostname || !zoneId) {
      setAddError('Informe o hostname e selecione a zona.');
      return;
    }
    setAddBusy(true);
    setAddError('');
    try {
      const { response, payload } = await api.attachWorkerDomain(adminActor, {
        scriptName,
        hostname: trimmedHostname,
        zoneId,
      });
      if (!response.ok || !payload.ok) {
        // Erro de permissão (401/403) traz diagnóstico do backend — exibe em destaque.
        setAddError(payload.error ?? `Falha ao anexar ${trimmedHostname} (HTTP ${response.status}).`);
        return;
      }
      showNotification(api.withReq(`Domínio ${trimmedHostname} anexado.`, payload), 'success');
      setAddOpen(false);
      await loadDomains();
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Falha ao anexar domínio.');
    } finally {
      setAddBusy(false);
    }
  };

  const executeRemove = async () => {
    if (!pendingRemove) return;
    setRemoveBusy(true);
    try {
      const { response, payload } = await api.deleteWorkerDomain(adminActor, pendingRemove.id);
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao remover domínio.');
      showNotification(api.withReq(`Domínio ${pendingRemove.hostname} removido.`, payload), 'success');
      setPendingRemove(null);
      await loadDomains();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao remover domínio.', 'error');
    } finally {
      setRemoveBusy(false);
    }
  };

  const workersDevUrl = accountSubdomain ? `${scriptName}.${accountSubdomain}.workers.dev` : null;

  return (
    <div className="cfpw-panel-card">
      <div className="cfpw-code-header">
        <h3>
          <Globe size={16} /> Domínios
        </h3>
        <button type="button" className="ghost-button" onClick={() => void loadDomains()} disabled={loading}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="cfpw-inline-warning" role="status">
          <AlertTriangle size={14} />
          <span>{warnings.map((warning) => warning.message ?? warning.code).join(' · ')}</span>
        </div>
      )}

      {/* ── workers.dev ── */}
      <div className="cfpw-subsection">
        <h4>workers.dev</h4>
        {loading && !scriptSubdomain ? (
          <div className="cfpw-obs-loading">
            <Loader2 size={16} className="spin" /> Carregando...
          </div>
        ) : (
          <>
            {workersDevUrl ? (
              <p>
                URL:{' '}
                <a href={`https://${workersDevUrl}`} target="_blank" rel="noreferrer">
                  {workersDevUrl}
                </a>
              </p>
            ) : (
              <div className="cfpw-inline-warning" role="status">
                <AlertTriangle size={14} /> A conta ainda não tem subdomínio workers.dev — a URL do Worker não resolve.
                <span className="cfpw-inline-form">
                  <input
                    type="text"
                    placeholder="minha-conta"
                    aria-label="Subdomínio da conta"
                    value={newAccountSubdomain}
                    onChange={(event) => setNewAccountSubdomain(event.target.value)}
                    disabled={subdomainBusy}
                  />
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => void createAccountSubdomain()}
                    disabled={subdomainBusy || !newAccountSubdomain.trim()}
                  >
                    Criar subdomínio da conta
                  </button>
                </span>
              </div>
            )}
            <label className="cfpw-dialog__toggle">
              <input
                type="checkbox"
                checked={scriptSubdomain?.enabled === true}
                onChange={(event) =>
                  void updateScriptSubdomain({
                    enabled: event.target.checked,
                    previewsEnabled: scriptSubdomain?.previews_enabled === true,
                  })
                }
                disabled={subdomainBusy}
              />
              <span>URL workers.dev habilitada</span>
            </label>
            <label className="cfpw-dialog__toggle">
              <input
                type="checkbox"
                checked={scriptSubdomain?.previews_enabled === true}
                onChange={(event) =>
                  void updateScriptSubdomain({
                    enabled: scriptSubdomain?.enabled === true,
                    previewsEnabled: event.target.checked,
                  })
                }
                disabled={subdomainBusy || scriptSubdomain?.enabled !== true}
              />
              <span>Previews (URLs de versão)</span>
            </label>
          </>
        )}
      </div>

      {/* ── Domínios custom ── */}
      <div className="cfpw-subsection">
        <div className="cfpw-code-header">
          <h4>Domínios custom</h4>
          <button type="button" className="ghost-button" onClick={() => void openAddDialog()} disabled={loading}>
            + Adicionar domínio
          </button>
        </div>
        {domains.length === 0 ? (
          <div className="cfpw-empty-state">Nenhum domínio custom anexado.</div>
        ) : (
          <div className="cfpw-obs-table-wrap">
            <table className="cfpw-obs-table">
              <thead>
                <tr>
                  <th>Hostname</th>
                  <th>Zona</th>
                  <th>Certificado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((domain) => {
                  const id = String(domain.id ?? '');
                  const domainHostname = String(domain.hostname ?? '—');
                  const zoneName = String(domain.zone_name ?? domain.zone_id ?? '—');
                  const certStatus = String(domain.cert_status ?? domain.status ?? '—');
                  return (
                    <tr key={id || domainHostname}>
                      <td>
                        <code>{domainHostname}</code>
                      </td>
                      <td>{zoneName}</td>
                      <td>
                        <span className="cfpw-status-badge">{certStatus}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="cfpw-icon-button"
                          title="Remover domínio"
                          onClick={() => setPendingRemove({ id, hostname: domainHostname })}
                          disabled={!id}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Rotas de zona (ops legados) ── */}
      <div className="cfpw-subsection">
        <h4>Rotas de zona</h4>
        <div className="cfpw-action-list">
          {routeOps.map((action) => (
            <button type="button" className="cfpw-action-item" key={action.value} onClick={() => onOpenAction(action)}>
              <div className="action-icon">
                <ShieldCheck size={20} />
              </div>
              <div className="cfpw-action-item-text">
                <strong>{action.label}</strong>
                <span>{action.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Dialog adicionar domínio ── */}
      <Dialog open={addOpen} onOpenChange={(nextOpen) => (!nextOpen && !addBusy ? setAddOpen(false) : undefined)}>
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">Adicionar domínio custom</DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Anexa um hostname de uma zona da conta ao Worker {scriptName} (DNS + certificado gerenciados pela
            Cloudflare).
          </DialogDescription>
          <div className="field-group">
            <label htmlFor="cfpw-domain-hostname">Hostname</label>
            <input
              id="cfpw-domain-hostname"
              type="text"
              autoComplete="off"
              placeholder="api.exemplo.com.br"
              value={hostname}
              onChange={(event) => setHostname(event.target.value)}
              disabled={addBusy}
            />
          </div>
          <div className="field-group">
            <label htmlFor="cfpw-domain-zone">Zona</label>
            <select
              id="cfpw-domain-zone"
              value={zoneId}
              onChange={(event) => setZoneId(event.target.value)}
              disabled={addBusy || zones.length === 0}
            >
              {zones.length === 0 && <option value="">Carregando zonas...</option>}
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
          {addError && (
            <div className="cfpw-inline-warning cfpw-inline-warning--error" role="alert">
              <AlertTriangle size={14} /> {addError}
            </div>
          )}
          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={() => setAddOpen(false)} disabled={addBusy}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void executeAdd()}
              disabled={addBusy || !hostname.trim() || !zoneId}
            >
              {addBusy ? <Loader2 size={16} className="spin" /> : 'Anexar domínio'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog remover domínio ── */}
      <Dialog
        open={pendingRemove !== null}
        onOpenChange={(nextOpen) => (!nextOpen && !removeBusy ? setPendingRemove(null) : undefined)}
      >
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">
            <AlertTriangle size={18} /> Remover domínio custom
          </DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Remove o attachment de {pendingRemove?.hostname} deste Worker. O hostname deixa de responder pelo script.
          </DialogDescription>
          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={() => setPendingRemove(null)} disabled={removeBusy}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button cfpw-dialog__danger"
              onClick={() => void executeRemove()}
              disabled={removeBusy}
            >
              {removeBusy ? <Loader2 size={16} className="spin" /> : 'Remover'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
