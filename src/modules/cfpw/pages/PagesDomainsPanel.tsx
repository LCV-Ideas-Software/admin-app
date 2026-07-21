/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Aba "Domínios" do projeto Pages (PW-3): lista via ops legado
 * list-page-domains; por domínio, detalhe via GET page-domain (badges de
 * verificação/SSL, certificate_authority, instruções DNS pendentes de
 * validation_data/verification_data com copiar) e "Reverificar" (PATCH sem
 * corpo). Adicionar/remover domínio reusa os ops legados add/delete.
 */

import { AlertTriangle, Copy, Globe, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/Dialog';
import * as api from '../api';
import { valueToText } from '../api';

type PagesDomainsPanelProps = {
  projectName: string;
  adminActor: string;
  /** Subdomínio *.pages.dev do projeto (alvo sugerido do CNAME). */
  projectSubdomain: string | null;
};

type DomainSummary = { name: string; status: string };

export function PagesDomainsPanel({ projectName, adminActor, projectSubdomain }: PagesDomainsPanelProps) {
  const { showNotification } = useNotification();
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<Record<string, Record<string, unknown>>>({});
  const [detailBusy, setDetailBusy] = useState<string | null>(null);
  const [recheckBusy, setRecheckBusy] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const loadDomains = useCallback(async () => {
    setLoading(true);
    try {
      const { response, payload } = await api.postOps(adminActor, { action: 'list-page-domains', projectName });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao listar domínios.');
      const rows = Array.isArray(payload.result) ? (payload.result as Array<Record<string, unknown>>) : [];
      setDomains(
        rows
          .map((row) => ({ name: String(row.name ?? '').trim(), status: String(row.status ?? '—') }))
          .filter((row) => row.name),
      );
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao listar domínios.', 'error');
    } finally {
      setLoading(false);
    }
  }, [adminActor, projectName, showNotification]);

  useEffect(() => {
    void loadDomains();
  }, [loadDomains]);

  const loadDetail = async (domainName: string) => {
    setDetailBusy(domainName);
    try {
      const { response, payload } = await api.fetchPageDomainDetail(adminActor, { projectName, domainName });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `Falha ao ler o domínio ${domainName}.`);
      setDetails((prev) => ({ ...prev, [domainName]: payload.domain ?? {} }));
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao ler o domínio.', 'error');
    } finally {
      setDetailBusy(null);
    }
  };

  const recheck = async (domainName: string) => {
    setRecheckBusy(domainName);
    try {
      const { response, payload } = await api.postPageDomainRecheck(adminActor, { projectName, domainName });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `Falha ao reverificar ${domainName}.`);
      showNotification(api.withReq(`Reverificação de ${domainName} disparada.`, payload), 'success');
      setDetails((prev) => ({ ...prev, [domainName]: payload.domain ?? prev[domainName] ?? {} }));
      await loadDomains();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao reverificar o domínio.', 'error');
    } finally {
      setRecheckBusy(null);
    }
  };

  const addDomain = async () => {
    const domainName = newDomain.trim();
    if (!domainName) return;
    setAddBusy(true);
    try {
      const { response, payload } = await api.postOps(adminActor, {
        action: 'add-page-domain',
        projectName,
        domainName,
      });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `Falha ao adicionar ${domainName}.`);
      showNotification(api.withReq(`Domínio ${domainName} adicionado.`, payload), 'success');
      setNewDomain('');
      await loadDomains();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao adicionar domínio.', 'error');
    } finally {
      setAddBusy(false);
    }
  };

  const executeRemove = async () => {
    if (!pendingRemove) return;
    setRemoveBusy(true);
    try {
      const { response, payload } = await api.postOps(adminActor, {
        action: 'delete-page-domain',
        projectName,
        domainName: pendingRemove,
      });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `Falha ao remover ${pendingRemove}.`);
      showNotification(api.withReq(`Domínio ${pendingRemove} removido.`, payload), 'success');
      setPendingRemove(null);
      await loadDomains();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao remover domínio.', 'error');
    } finally {
      setRemoveBusy(false);
    }
  };

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showNotification('Copiado para a área de transferência.', 'success');
    } catch {
      showNotification('Não foi possível copiar — copie manualmente.', 'error');
    }
  };

  const renderDnsInstructions = (domainName: string, detail: Record<string, unknown>) => {
    const status = String(detail.status ?? '')
      .trim()
      .toLowerCase();
    const validation = (detail.validation_data ?? {}) as Record<string, unknown>;
    const verification = (detail.verification_data ?? {}) as Record<string, unknown>;
    const txtName = String(validation.txt_name ?? '').trim();
    const txtValue = String(validation.txt_value ?? '').trim();
    const verificationError = String(verification.error_message ?? '').trim();
    const cnameTarget = projectSubdomain ?? `${projectName}.pages.dev`;

    if (status === 'active') {
      return null;
    }

    return (
      <div className="cfpw-inline-warning" role="status">
        <AlertTriangle size={14} />
        <span>
          Validação pendente para {domainName}.{' '}
          {txtName && txtValue ? (
            <>
              Crie o registro TXT <code>{txtName}</code> = <code>{txtValue}</code>{' '}
              <button
                type="button"
                className="cfpw-icon-button"
                title="Copiar valor do TXT"
                onClick={() => void copyValue(txtValue)}
              >
                <Copy size={12} />
              </button>
            </>
          ) : (
            <>
              Aponte um CNAME de <code>{domainName}</code> para <code>{cnameTarget}</code>{' '}
              <button
                type="button"
                className="cfpw-icon-button"
                title="Copiar alvo do CNAME"
                onClick={() => void copyValue(cnameTarget)}
              >
                <Copy size={12} />
              </button>
            </>
          )}
          {verificationError && <> · Erro reportado: {verificationError}</>}
        </span>
      </div>
    );
  };

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

      <div className="cfpw-inline-form" style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="www.exemplo.com.br"
          aria-label="Novo domínio"
          value={newDomain}
          onChange={(event) => setNewDomain(event.target.value)}
          disabled={addBusy}
        />
        <button
          type="button"
          className="ghost-button"
          onClick={() => void addDomain()}
          disabled={addBusy || !newDomain.trim()}
        >
          {addBusy ? <Loader2 size={14} className="spin" /> : '+ Adicionar domínio'}
        </button>
      </div>

      {loading && domains.length === 0 ? (
        <div className="cfpw-obs-loading">
          <Loader2 size={20} className="spin" /> Carregando domínios...
        </div>
      ) : domains.length === 0 ? (
        <div className="cfpw-empty-state">Nenhum domínio custom vinculado.</div>
      ) : (
        <div className="cfpw-stage-list">
          {domains.map((domain) => {
            const detail = details[domain.name];
            return (
              <div key={domain.name} className="cfpw-subsection" style={{ marginTop: 0 }}>
                <div className="cfpw-code-header">
                  <h4>
                    <code>{domain.name}</code> <span className="cfpw-status-badge">{domain.status}</span>
                    {detail && (
                      <>
                        {' '}
                        <span className="cfpw-status-badge">
                          SSL: {valueToText((detail.validation_data as Record<string, unknown> | undefined)?.status)}
                        </span>{' '}
                        <span className="cfpw-status-badge">CA: {valueToText(detail.certificate_authority)}</span>
                      </>
                    )}
                  </h4>
                  <span className="cfpw-code-header-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void loadDetail(domain.name)}
                      disabled={detailBusy === domain.name}
                    >
                      {detailBusy === domain.name ? <Loader2 size={14} className="spin" /> : 'Detalhes'}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void recheck(domain.name)}
                      disabled={recheckBusy === domain.name}
                    >
                      {recheckBusy === domain.name ? <Loader2 size={14} className="spin" /> : 'Reverificar'}
                    </button>
                    <button
                      type="button"
                      className="cfpw-icon-button"
                      title="Remover domínio"
                      onClick={() => setPendingRemove(domain.name)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </div>
                {detail && renderDnsInstructions(domain.name, detail)}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dialog remover domínio ── */}
      <Dialog
        open={pendingRemove !== null}
        onOpenChange={(nextOpen) => (!nextOpen && !removeBusy ? setPendingRemove(null) : undefined)}
      >
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">
            <AlertTriangle size={18} /> Remover domínio
          </DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Remove {pendingRemove} do projeto {projectName}. O hostname deixa de servir o site.
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
