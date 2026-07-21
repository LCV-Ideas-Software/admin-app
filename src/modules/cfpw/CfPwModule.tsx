/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Shell do módulo CF P&W: dashboard (KPIs, alertas, grids de Pages e Workers),
 * roteamento de estado da tela de detalhe (WorkerDetail / PageDetail) e
 * estado/execução dos modais (OpsModal / DeleteConfirmModal). Fetches tipados
 * vivem em api.ts; catálogos de ações operacionais nas telas de detalhe.
 */

import { AlertTriangle, Loader2, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNotification } from '../../components/Notification';
import { cfApiFetch } from '../shared/cfApi';
import * as api from './api';
import { useCapabilities } from './hooks/useCapabilities';
import { ObservabilityBlock } from './ObservabilityBlock';
import { CreatePagesProjectModal } from './pages/CreatePagesProjectModal';
import { PageDetail } from './pages/PageDetail';
import { AdvancedConsole } from './shared/AdvancedConsole';
import { DeleteConfirmModal } from './shared/DeleteConfirmModal';
import { OpsModal } from './shared/OpsModal';
import { isProtectedTarget } from './shared/protectedTargets';
import { StorageTab } from './tabs/storage/StorageTab';
import { parseStorageHash, type StorageDeepLink } from './tabs/storage/storageDeepLink';
import type {
  AccountSummary,
  DetailState,
  DetailType,
  OperationalAlert,
  OpsActionDefinition,
  PageDetailsPayload,
  PageSummary,
  WorkerMetricsPayload,
  WorkerSummary,
  WorkersPagination,
} from './types';
import { CreateWorkerModal } from './worker/CreateWorkerModal';
import { WorkerDetail } from './worker/WorkerDetail';
import './CfPwModule.css';

const WORKERS_PER_PAGE = 20;

type CfPwTopTab = 'recursos' | 'armazenamento';

const TOP_TABS: Array<{ key: CfPwTopTab; label: string }> = [
  { key: 'recursos', label: 'Recursos' },
  { key: 'armazenamento', label: 'Armazenamento' },
];

type StorageDeepLinkState = StorageDeepLink & { nonce: number };

export function CfPwModule() {
  const { showNotification } = useNotification();
  const [adminActor] = useState('admin@app.lcv');
  // Deep-link #cfpw-storage/<kind>/<id>: lido do hash no mount (ST-R2).
  const [storageDeepLink, setStorageDeepLink] = useState<StorageDeepLinkState | null>(() => {
    const parsed = typeof window !== 'undefined' ? parseStorageHash(window.location.hash) : null;
    return parsed ? { ...parsed, nonce: 0 } : null;
  });
  const [topTab, setTopTab] = useState<CfPwTopTab>(storageDeepLink ? 'armazenamento' : 'recursos');

  // Cross-nav "Abrir no Armazenamento" (bindings de Worker/Pages): seta o hash
  // e abre a aba; o nonce distingue cliques repetidos no mesmo alvo.
  const openStorageTarget = useCallback((target: StorageDeepLink) => {
    setStorageDeepLink((prev) => ({ ...target, nonce: (prev?.nonce ?? 0) + 1 }));
    setTopTab('armazenamento');
  }, []);

  const switchTopTab = (key: CfPwTopTab) => {
    setTopTab(key);
    if (key === 'recursos') {
      // Sai do Armazenamento: limpa o hash sem tocar no router de pathname.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const [loadingOverview, setLoadingOverview] = useState(false);
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [pages, setPages] = useState<PageSummary[]>([]);

  // Busca/paginação de Workers (PW-1): null = listagem completa (modo legado).
  const [workerSearchInput, setWorkerSearchInput] = useState('');
  const [workersQuery, setWorkersQuery] = useState<{ q: string; page: number } | null>(null);
  const [workersPagination, setWorkersPagination] = useState<WorkersPagination | null>(null);
  const [searchFallback, setSearchFallback] = useState(false);
  const [createWorkerOpen, setCreateWorkerOpen] = useState(false);
  const [createPagesOpen, setCreatePagesOpen] = useState(false);

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState<DetailState | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ type: DetailType; id: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [selectedOp, setSelectedOp] = useState<OpsActionDefinition | null>(null);
  const [opsModalOpen, setOpsModalOpen] = useState(false);
  const [opsLoading, setOpsLoading] = useState(false);

  const [opsState, setOpsState] = useState<Record<string, string>>({
    usageModel: 'standard',
    schedulesRaw: '0 5 * * *',
    projectBranch: 'main',
  });

  const [opsResult, setOpsResult] = useState<unknown>(null);

  // KPIs de conta (GraphQL Analytics, últimas 24h) — só com capabilities.analytics.
  const { capabilities } = useCapabilities();
  const analyticsEnabled = capabilities?.analytics.enabled === true;
  const [accountMetrics, setAccountMetrics] = useState<{ requests: number; errors: number } | null>(null);
  const [accountMetricsError, setAccountMetricsError] = useState<string | null>(null);

  useEffect(() => {
    if (!analyticsEnabled) return;
    let cancelled = false;
    void (async () => {
      // Falha vira '—' com title diagnóstico (sem toast nem console).
      const result = await cfApiFetch<WorkerMetricsPayload>('/api/cfpw/account-metrics?hours=24');
      if (cancelled) return;
      if (result.ok && result.data.ok && result.data.totals) {
        setAccountMetrics({ requests: result.data.totals.requests, errors: result.data.totals.errors });
        setAccountMetricsError(null);
      } else {
        setAccountMetrics(null);
        setAccountMetricsError(
          result.ok ? (result.data.error ?? 'Motor reportou falha ao consultar métricas da conta.') : result.error,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analyticsEnabled]);

  const updateOpsState = useCallback((key: string, value: string) => {
    setOpsState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const operationalAlerts = useMemo<OperationalAlert[]>(() => {
    const next: OperationalAlert[] = [];
    if (!account && !loadingOverview) {
      next.push({
        code: 'CFPW-ACCOUNT-UNAVAILABLE',
        cause: 'A conta ativa não foi carregada nesta sessão.',
        action: 'Atualize para sincronizar.',
      });
    }
    if (loadingOverview) {
      next.push({ code: 'CFPW-SYNC-RUNNING', cause: 'Sincronização em andamento.', action: 'Aguarde' });
    }
    if (detailsLoading) {
      next.push({ code: 'CFPW-DETAILS-RUNNING', cause: 'Consulta em processamento.', action: 'Aguarde' });
    }
    if (deleting) {
      next.push({ code: 'CFPW-DELETE-RUNNING', cause: 'Exclusão em execução irreversível.', action: 'Aguarde' });
    }
    if (!loadingOverview && account && workers.length === 0 && pages.length === 0) {
      next.push({ code: 'CFPW-EMPTY-INVENTORY', cause: 'Nenhum recurso encontrado.', action: 'Verifique' });
    }
    return next;
  }, [account, deleting, detailsLoading, loadingOverview, pages.length, workers.length]);

  const loadOverview = useCallback(
    async (notify = false) => {
      setLoadingOverview(true);
      try {
        const params = workersQuery
          ? { q: workersQuery.q, workersPage: workersQuery.page, workersPerPage: WORKERS_PER_PAGE }
          : undefined;
        const { response, payload } = await api.fetchOverview(adminActor, params);
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha.');

        setAccount(payload.account ?? null);
        setWorkers(Array.isArray(payload.workers) ? payload.workers : []);
        setPages(Array.isArray(payload.pages) ? payload.pages : []);
        setWorkersPagination(payload.workersPagination ?? null);
        setSearchFallback(payload.searchFallback === true);
        if (notify) showNotification(api.withReq('Sincronizado.', payload), 'success');
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'Falha.', 'error');
      } finally {
        setLoadingOverview(false);
      }
    },
    [adminActor, showNotification, workersQuery],
  );

  const applyWorkerSearch = () => {
    const q = workerSearchInput.trim();
    setWorkersQuery(q ? { q, page: 1 } : null);
  };

  const openWorkerDetails = useCallback(
    async (scriptName: string) => {
      setDetailsLoading(true);
      try {
        const { response, payload } = await api.fetchWorkerDetails(adminActor, scriptName);
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha.');

        setDetails({ type: 'worker', id: scriptName, payload });
        updateOpsState('scriptName', scriptName);
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'Falha.', 'error');
      } finally {
        setDetailsLoading(false);
      }
    },
    [adminActor, showNotification, updateOpsState],
  );

  const openPageDetails = useCallback(
    async (projectName: string) => {
      setDetailsLoading(true);
      try {
        const { response, payload } = await api.fetchPageDetails(adminActor, projectName);
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha.');

        setDetails({ type: 'page', id: projectName, payload });
        updateOpsState('projectName', projectName);
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'Falha.', 'error');
      } finally {
        setDetailsLoading(false);
      }
    },
    [adminActor, showNotification, updateOpsState],
  );

  const closeDetails = () => {
    setDetails(null);
  };

  const requestDelete = () => {
    if (!details) return;
    setDeleteTarget({ type: details.type, id: details.id });
    setDeleteConfirmation('');
    setDeletePhrase('');
  };

  const runDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const expected = deleteTarget.id;
    if (deleteConfirmation.trim() !== expected) {
      showNotification(`Digite exatamente: ${expected}`, 'error');
      return;
    }
    setDeleting(true);
    try {
      // Alvo protegido (serve a própria admin-app): repassa a frase de risco
      // exigida pelo motor; nos demais o campo nem é enviado.
      const { response, payload } = await api.deleteResource(
        adminActor,
        deleteTarget.type,
        expected,
        isProtectedTarget(deleteTarget.type, expected) ? deletePhrase : undefined,
      );
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha exclusão.');

      showNotification(api.withReq(payload.message ?? 'Excluído.', payload), 'success');
      setDeleteTarget(null);
      setDeleteConfirmation('');
      setDeletePhrase('');
      if (details?.id === expected && details.type === deleteTarget.type) setDetails(null);
      await loadOverview();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Erro', 'error');
    } finally {
      setDeleting(false);
    }
  }, [adminActor, deleteConfirmation, deletePhrase, deleteTarget, details, loadOverview, showNotification]);

  const executeAdvancedOp = useCallback(
    async (actionDef: OpsActionDefinition) => {
      setOpsLoading(true);
      try {
        const schedules = (opsState.schedulesRaw || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((cron) => ({ cron }));

        const { response, payload } = await api.postOps(adminActor, {
          action: actionDef.value,
          scriptName: opsState.scriptName || details?.id,
          projectName: opsState.projectName || details?.id,
          deploymentId: opsState.deploymentId,
          domainName: opsState.domainName,
          secretName: opsState.secretName,
          secretValue: opsState.secretValue,
          usageModel: opsState.usageModel,
          schedules,
          projectBranch: opsState.projectBranch,
          pageSettingsJson: opsState.pageSettingsJson,
          zoneId: opsState.zoneId,
          routeId: opsState.routeId,
          routePattern: opsState.routePattern,
        });
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha na operação');

        setOpsResult(payload.result ?? null);
        showNotification(api.withReq(`Operação (${actionDef.value}) concluída.`, payload), 'success');

        if (actionDef.value === 'rollback-page-deployment' && details?.type === 'page') {
          void openPageDetails(details.id);
        }
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'Erro na operação.', 'error');
      } finally {
        setOpsLoading(false);
      }
    },
    [adminActor, details, opsState, openPageDetails, showNotification],
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const openActionModal = (action: OpsActionDefinition) => {
    setSelectedOp(action);
    setOpsResult(null);

    let defaultDeploymentId = '';
    if (action.fields.includes('deploymentId') && details?.type === 'page') {
      const deploy = (details.payload as PageDetailsPayload).deployments?.[0];
      if (deploy?.id || deploy?.short_id) {
        defaultDeploymentId = String(deploy.id || deploy.short_id);
      }
    }

    setOpsState((prev) => ({
      ...prev,
      deploymentId: defaultDeploymentId || prev.deploymentId || '',
    }));
    setOpsModalOpen(true);
  };

  const detailDeployments = useMemo(() => {
    if (!details) return [] as Array<Record<string, unknown>>;
    return Array.isArray(details.payload.deployments) ? details.payload.deployments : [];
  }, [details]);

  const renderDashboard = () => (
    <>
      <div className="cfpw-dashboard">
        <div className="cfpw-overview-hero">
          <div>
            <h3>Cloudflare Edge Network</h3>
            <p>
              {account ? `Conectado a ${account.accountName}` : 'Aguardando sincronização...'} • Status:{' '}
              <span className={`cfpw-status-badge ${loadingOverview ? 'warning' : 'ok'}`}>
                {loadingOverview ? 'Sincronizando' : 'Ativo'}
              </span>
            </p>
            {analyticsEnabled && (
              <p className="cfpw-account-metrics" title={accountMetricsError ?? undefined}>
                Últimas 24h:{' '}
                {accountMetrics
                  ? `${accountMetrics.requests.toLocaleString('pt-BR')} requests · ${accountMetrics.errors.toLocaleString('pt-BR')} erros`
                  : '—'}
              </p>
            )}
          </div>
          <div className="cfpw-overview-kpis">
            <div className="cfpw-kpi">
              <span>Workers</span>
              <strong>{workers.length}</strong>
            </div>
            <div className="cfpw-kpi">
              <span>Pages</span>
              <strong>{pages.length}</strong>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => void loadOverview(true)}
              disabled={loadingOverview}
              style={{
                alignSelf: 'center',
                height: '40px',
                width: '40px',
                padding: '0',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              {loadingOverview ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
            </button>
          </div>
        </div>

        {operationalAlerts.length > 0 && (
          <article className="integrity-banner integrity-banner--warning" role="status">
            <h4 className="integrity-banner__header">
              <AlertTriangle size={16} /> Alertas
            </h4>
            <ul className="integrity-banner__list">
              {operationalAlerts.map((alert) => (
                <li key={alert.code}>
                  <strong>{alert.code}</strong> · {alert.cause} {alert.action}
                </li>
              ))}
            </ul>
          </article>
        )}

        {/* Pages Grid */}
        <div className="cfpw-workers-toolbar" style={{ margin: '8px 0 0' }}>
          <h4 style={{ margin: 0, fontWeight: 600 }}>Pages Projects</h4>
          <button type="button" className="primary-button" onClick={() => setCreatePagesOpen(true)}>
            <Plus size={14} /> Criar Projeto Pages
          </button>
        </div>
        {pages.length === 0 ? (
          <div className="cfpw-empty-state">Nenhum projeto encontrado.</div>
        ) : (
          <div className="cfpw-dash-grid">
            {pages.map((page) => (
              <div className="cfpw-resource-card" key={page.projectName}>
                <div className="cfpw-resource-header">
                  <div className="cfpw-resource-title">
                    <div className="cfpw-resource-title-icon">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h4>{page.projectName}</h4>
                      <p>{page.subdomain ?? 'Sem subdomínio'}</p>
                    </div>
                  </div>
                  <div className="cfpw-status-badge">{page.productionBranch ?? 'N/A'}</div>
                </div>
                <div className="cfpw-resource-meta">
                  <div className="cfpw-meta-item">
                    <span>Domínios</span>
                    <strong>{page.domains?.length || 0}</strong>
                  </div>
                  <div className="cfpw-meta-item">
                    <span>Atualizado</span>
                    <strong>{api.formatDateTime(page.latestDeployment?.createdAt)}</strong>
                  </div>
                </div>
                <div className="cfpw-resource-actions">
                  <button type="button" className="ghost-button" onClick={() => void openPageDetails(page.projectName)}>
                    Gerenciar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Workers Grid */}
        <div className="cfpw-workers-toolbar">
          <h4 style={{ margin: 0, fontWeight: 600 }}>
            Workers{' '}
            {searchFallback && (
              <span
                className="cfpw-status-badge warning"
                title="Busca paginada indisponível — filtro aplicado localmente"
              >
                busca local
              </span>
            )}
          </h4>
          <div className="cfpw-workers-toolbar-actions">
            <div className="cfpw-obs-search-bar cfpw-workers-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Buscar workers..."
                aria-label="Buscar workers"
                value={workerSearchInput}
                onChange={(event) => setWorkerSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applyWorkerSearch();
                }}
              />
              <button
                type="button"
                className="cfpw-obs-search-btn"
                onClick={applyWorkerSearch}
                disabled={loadingOverview}
              >
                Buscar
              </button>
            </div>
            <button type="button" className="primary-button" onClick={() => setCreateWorkerOpen(true)}>
              <Plus size={14} /> Criar Worker
            </button>
          </div>
        </div>
        {workers.length === 0 ? (
          <div className="cfpw-empty-state">Nenhum Worker encontrado.</div>
        ) : (
          <div className="cfpw-dash-grid">
            {workers.map((worker) => (
              <div className="cfpw-resource-card" key={worker.scriptName}>
                <div className="cfpw-resource-header">
                  <div className="cfpw-resource-title">
                    <div className="cfpw-resource-title-icon">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h4>{worker.scriptName}</h4>
                      <p>{worker.handlers.length > 0 ? worker.handlers.join(', ') : 'No handlers'}</p>
                    </div>
                  </div>
                  <div className="cfpw-status-badge">Ativo</div>
                </div>
                <div className="cfpw-resource-meta">
                  <div className="cfpw-meta-item">
                    <span>Atualizado em</span>
                    <strong>{api.formatDateTime(worker.updatedAt)}</strong>
                  </div>
                </div>
                <div className="cfpw-resource-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => void openWorkerDetails(worker.scriptName)}
                  >
                    Gerenciar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {workersPagination && (
          <div className="cfpw-workers-pagination">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setWorkersQuery((prev) => (prev ? { ...prev, page: Math.max(1, prev.page - 1) } : prev))}
              disabled={loadingOverview || workersPagination.page <= 1}
            >
              ← Anterior
            </button>
            <span>
              Página {workersPagination.page}
              {workersPagination.totalCount !== undefined ? ` · ${workersPagination.totalCount} workers` : ''}
            </span>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setWorkersQuery((prev) => (prev ? { ...prev, page: prev.page + 1 } : prev))}
              disabled={loadingOverview || !workersPagination.hasMore}
            >
              Próxima →
            </button>
          </div>
        )}
      </div>

      {/* ── Observability Block ── */}
      <ObservabilityBlock />

      {/* ── Console avançado (API Cloudflare) ── */}
      <AdvancedConsole adminActor={adminActor} />
    </>
  );

  const renderDetailView = () => {
    if (!details) return null;
    if (details.type === 'worker') {
      return (
        <WorkerDetail
          scriptName={details.id}
          payload={details.payload}
          deployments={detailDeployments}
          detailsLoading={detailsLoading}
          adminActor={adminActor}
          onBack={closeDetails}
          onRequestDelete={requestDelete}
          onOpenAction={openActionModal}
          onOpenStorage={openStorageTarget}
        />
      );
    }
    return (
      <PageDetail
        projectName={details.id}
        payload={details.payload as PageDetailsPayload}
        deployments={detailDeployments}
        detailsLoading={detailsLoading}
        adminActor={adminActor}
        onBack={closeDetails}
        onRequestDelete={requestDelete}
        onOpenAction={openActionModal}
        onOpenStorage={openStorageTarget}
        onRefresh={() => void openPageDetails(details.id)}
      />
    );
  };

  return (
    <section className="module-shell module-shell-cfpw" aria-label="Cloudflare Pages & Workers">
      <div className="page-tab-nav cfpw-top-tab-nav">
        {TOP_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`page-tab-item ${topTab === key ? 'active' : ''}`}
            onClick={() => switchTopTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {topTab === 'armazenamento' ? (
        <StorageTab adminActor={adminActor} deepLink={storageDeepLink} />
      ) : !details ? (
        renderDashboard()
      ) : (
        renderDetailView()
      )}
      <OpsModal
        open={opsModalOpen}
        selectedOp={selectedOp}
        opsLoading={opsLoading}
        opsState={opsState}
        opsResult={opsResult}
        onUpdateField={updateOpsState}
        onClose={() => setOpsModalOpen(false)}
        onExecute={(action) => void executeAdvancedOp(action)}
      />
      <DeleteConfirmModal
        deleteTarget={deleteTarget}
        deleteConfirmation={deleteConfirmation}
        deletePhrase={deletePhrase}
        deleting={deleting}
        onConfirmationChange={setDeleteConfirmation}
        onPhraseChange={setDeletePhrase}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void runDelete()}
      />
      <CreateWorkerModal
        open={createWorkerOpen}
        adminActor={adminActor}
        onClose={() => setCreateWorkerOpen(false)}
        onCreated={() => void loadOverview()}
      />
      <CreatePagesProjectModal
        open={createPagesOpen}
        adminActor={adminActor}
        onClose={() => setCreatePagesOpen(false)}
        onCreated={() => void loadOverview()}
      />
    </section>
  );
}
