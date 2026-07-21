/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Tela de detalhe de um projeto Cloudflare Pages (PW-3) com 5 abas:
 * Deployments (lista com paginação "Carregar mais" + filtro de ambiente +
 * detalhe de deployment com stages/log), Build & Deploy
 * (PagesBuildConfigPanel), Variáveis & Bindings (PagesEnvEditor), Domínios
 * (PagesDomainsPanel) e Configurações (legado: SecretsManager + PAGE_OPS via
 * OpsModal do shell). A aba é estado local, como no WorkerDetail.
 */

import { Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNotification } from '../../../components/Notification';
import * as api from '../api';
import { formatDateTime, valueToText } from '../api';
import { SecretsManager } from '../shared/SecretsManager';
import type { StorageDeepLink } from '../tabs/storage/storageDeepLink';
import type { OpsActionDefinition, PageDetailsPayload } from '../types';
import { PageDeploymentDetail } from './PageDeploymentDetail';
import { PagesBuildConfigPanel } from './PagesBuildConfigPanel';
import { PagesDomainsPanel } from './PagesDomainsPanel';
import { PagesEnvEditor } from './PagesEnvEditor';

const PAGE_OPS: OpsActionDefinition[] = [
  {
    value: 'create-page-project',
    label: 'Criar projeto Pages',
    description: 'Cria um projeto Pages informando o nome e a branch.',
    fields: ['projectName', 'projectBranch'],
    outcomeLabel: 'Resumo do projeto criado',
  },
  {
    value: 'list-page-domains',
    label: 'Listar domínios',
    description: 'Consulta os domínios já vinculados ao projeto.',
    fields: ['projectName'],
    outcomeLabel: 'Domínios configurados',
  },
  {
    value: 'add-page-domain',
    label: 'Adicionar domínio',
    description: 'Vincula um domínio customizado ao projeto Pages.',
    fields: ['projectName', 'domainName'],
    outcomeLabel: 'Resultado da adição do domínio',
  },
  {
    value: 'delete-page-domain',
    label: 'Remover domínio',
    description: 'Remove um domínio customizado do projeto.',
    fields: ['projectName', 'domainName'],
    outcomeLabel: 'Resultado da remoção do domínio',
  },
  {
    value: 'retry-page-deployment',
    label: 'Refazer deployment',
    description: 'Dispara novo processamento para um deployment específico.',
    fields: ['projectName', 'deploymentId'],
    outcomeLabel: 'Resultado do retry',
  },
  {
    value: 'rollback-page-deployment',
    label: 'Executar rollback',
    description: 'Solicita rollback para um deployment específico.',
    fields: ['projectName', 'deploymentId'],
    outcomeLabel: 'Resultado do rollback',
  },
  {
    value: 'get-page-deployment-logs',
    label: 'Ler logs de deployment',
    description: 'Traz o histórico de logs do deployment.',
    fields: ['projectName', 'deploymentId'],
    outcomeLabel: 'Logs retornados',
  },
];

type PageTab = 'deployments' | 'build' | 'env' | 'domains' | 'settings';

const PAGE_TABS: Array<{ key: PageTab; label: string }> = [
  { key: 'deployments', label: 'Deployments' },
  { key: 'build', label: 'Build & Deploy' },
  { key: 'env', label: 'Variáveis & Bindings' },
  { key: 'domains', label: 'Domínios' },
  { key: 'settings', label: 'Configurações' },
];

/** Tamanho de página do "Carregar mais" — igual ao padrão da lista CF (25). */
const DEPLOYMENTS_PER_PAGE = 25;

type EnvFilter = 'todos' | 'production' | 'preview';

type PagedState = {
  env: 'production' | 'preview' | null;
  items: Array<Record<string, unknown>>;
  page: number;
  hasMore: boolean;
};

type PageDetailProps = {
  projectName: string;
  payload: PageDetailsPayload;
  deployments: Array<Record<string, unknown>>;
  detailsLoading: boolean;
  adminActor: string;
  onBack: () => void;
  onRequestDelete: () => void;
  onOpenAction: (action: OpsActionDefinition) => void;
  /** Cross-nav ST-R2: abre a aba Armazenamento no alvo do binding. */
  onOpenStorage?: (target: StorageDeepLink) => void;
  /** Recarrega o page-details no shell (após deploy/retry/rollback/delete). */
  onRefresh: () => void;
};

export const PageDetail: React.FC<PageDetailProps> = ({
  projectName,
  payload,
  deployments,
  detailsLoading,
  adminActor,
  onBack,
  onRequestDelete,
  onOpenAction,
  onOpenStorage,
  onRefresh,
}) => {
  const { showNotification } = useNotification();
  const [tab, setTab] = useState<PageTab>('deployments');
  const [envFilter, setEnvFilter] = useState<EnvFilter>('todos');
  const [paged, setPaged] = useState<PagedState | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null);

  const project = payload.project ?? null;
  const projectSubdomain = String(project?.subdomain ?? '').trim() || null;
  const shownDeployments = paged ? paged.items : deployments;

  const fetchPage = async (env: PagedState['env'], page: number, previous: Array<Record<string, unknown>>) => {
    setListLoading(true);
    try {
      const { response, payload: detailsPayload } = await api.fetchPageDetails(adminActor, projectName, {
        page,
        perPage: DEPLOYMENTS_PER_PAGE,
        ...(env ? { env } : {}),
      });
      if (!response.ok || !detailsPayload.ok) {
        throw new Error(detailsPayload.error ?? 'Falha ao carregar deployments.');
      }
      const items = Array.isArray(detailsPayload.deployments) ? detailsPayload.deployments : [];
      const hasMore = detailsPayload.deploymentsPagination?.hasMore ?? items.length === DEPLOYMENTS_PER_PAGE;
      setPaged({ env, items: [...previous, ...items], page, hasMore });
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao carregar deployments.', 'error');
    } finally {
      setListLoading(false);
    }
  };

  const changeEnvFilter = (next: EnvFilter) => {
    setEnvFilter(next);
    if (next === 'todos') {
      // Volta à lista legada do shell (sem filtro).
      setPaged(null);
      return;
    }
    void fetchPage(next, 1, []);
  };

  const loadMore = () => {
    if (paged) {
      void fetchPage(paged.env, paged.page + 1, paged.items);
      return;
    }
    // 1ª paginação em "todos": a lista legada equivale à página 1 da CF.
    void fetchPage(null, 2, deployments);
  };

  const hasMore = paged ? paged.hasMore : deployments.length >= DEPLOYMENTS_PER_PAGE;

  const renderDeployments = () => {
    if (selectedDeploymentId) {
      return (
        <PageDeploymentDetail
          projectName={projectName}
          deploymentId={selectedDeploymentId}
          adminActor={adminActor}
          onBack={() => setSelectedDeploymentId(null)}
          onChanged={onRefresh}
        />
      );
    }

    return (
      <div className="cfpw-detail-section">
        <div className="cfpw-code-header">
          <h3>Histórico de Deployments ({shownDeployments.length})</h3>
          <select
            aria-label="Filtrar por ambiente"
            value={envFilter}
            onChange={(event) => changeEnvFilter(event.target.value as EnvFilter)}
            disabled={listLoading}
          >
            <option value="todos">todos</option>
            <option value="production">production</option>
            <option value="preview">preview</option>
          </select>
        </div>
        {shownDeployments.length > 0 ? (
          <>
            <div className="cfpw-deploy-list">
              {shownDeployments.map((deployment) => {
                const id = valueToText(deployment.id ?? deployment.short_id);
                const environment = valueToText(deployment.environment);
                const status = valueToText(
                  (deployment.latest_stage as Record<string, unknown> | undefined)?.status ?? deployment.strategy,
                );
                const url = valueToText(deployment.url);

                return (
                  <div className="cfpw-deploy-item" key={id}>
                    <div className="cfpw-deploy-type">{environment}</div>
                    <button
                      type="button"
                      className="cfpw-deploy-item-main cfpw-deploy-item-button"
                      onClick={() => setSelectedDeploymentId(String(deployment.id ?? deployment.short_id ?? ''))}
                      title="Ver detalhes do deployment"
                    >
                      <strong>{id}</strong>
                      <span>
                        {formatDateTime(typeof deployment.created_on === 'string' ? deployment.created_on : null)} •{' '}
                        {status}
                      </span>
                    </button>
                    <div>
                      {url !== '—' && (
                        <a
                          href={String(url)}
                          target="_blank"
                          rel="noreferrer"
                          className="ghost-button"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                        >
                          Acessar URL
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <div className="cfpw-dialog__actions" style={{ justifyContent: 'center' }}>
                <button type="button" className="ghost-button" onClick={loadMore} disabled={listLoading}>
                  {listLoading ? <Loader2 size={14} className="spin" /> : 'Carregar mais'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="cfpw-empty-state">{listLoading ? 'Carregando deployments...' : 'Sem deployments ativos'}</div>
        )}
      </div>
    );
  };

  return (
    <div className="cfpw-detail-view">
      <div className="cfpw-detail-view-header">
        <button type="button" className="ghost-button" onClick={onBack} style={{ padding: '8px', border: 'none' }}>
          ← Voltar
        </button>
        <div className="cfpw-detail-view-header-content">
          <h2>
            {projectName} {detailsLoading && <Loader2 size={16} className="spin" />}
          </h2>
          <p>Pages Project</p>
        </div>
        <button
          type="button"
          className="ghost-button"
          style={{ borderColor: 'rgba(234,67,53,0.3)', color: '#d93025' }}
          onClick={onRequestDelete}
        >
          <Trash2 size={14} /> Excluir projeto
        </button>
      </div>

      <div className="page-tab-nav" style={{ padding: '0 32px' }}>
        {PAGE_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`page-tab-item ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="cfpw-detail-body" style={tab === 'deployments' ? undefined : { gridTemplateColumns: '1fr' }}>
        <div className="cfpw-detail-content">
          {tab === 'deployments' && renderDeployments()}

          {tab === 'build' && (
            <PagesBuildConfigPanel
              projectName={projectName}
              adminActor={adminActor}
              project={project}
              deployments={shownDeployments}
              onDeployed={onRefresh}
            />
          )}

          {tab === 'env' && (
            <PagesEnvEditor projectName={projectName} adminActor={adminActor} onOpenStorage={onOpenStorage} />
          )}

          {tab === 'domains' && (
            <PagesDomainsPanel projectName={projectName} adminActor={adminActor} projectSubdomain={projectSubdomain} />
          )}

          {tab === 'settings' && (
            <div className="cfpw-detail-section">
              <SecretsManager domainType="page" resourceId={projectName} adminActor={adminActor} />
              <h3>Ações de Gerenciamento</h3>
              <div className="cfpw-action-list">
                {PAGE_OPS.map((action) => (
                  <button
                    type="button"
                    className="cfpw-action-item"
                    key={action.value}
                    onClick={() => onOpenAction(action)}
                  >
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
          )}
        </div>

        {tab === 'deployments' && (
          <div className="cfpw-detail-sidebar">
            <div className="cfpw-detail-section">
              <h3>Informações Técnicas</h3>
              <div className="cfpw-detail-kpi">
                <span>Domínios Vinculados</span>
                <strong>{(payload.project?.domains as unknown[])?.length || 0}</strong>
              </div>
              <div className="cfpw-detail-kpi" style={{ marginTop: '12px' }}>
                <span>Branch de Produção</span>
                <strong>{String(payload.project?.production_branch || 'N/A')}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
