/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Tela de detalhe de um Cloudflare Worker (PW-1/PW-2) com abas: Visão Geral
 * (deployments + sidebar técnica), Código (CodeEditorPanel), Versões
 * (VersionsPanel), Builds (BuildsPanel — só com capabilities.builds),
 * Métricas (WorkerMetricsPanel — só com capabilities.analytics),
 * Configurações (WorkerSettingsPanel + BindingsEditor + SecretsManager + ops
 * legados restantes) e Domínios & Triggers (WorkerDomainsPanel + CronPanel +
 * ops de rotas). A aba é estado local; a troca é guardada quando o editor de
 * código tem alterações não salvas.
 */

import { Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { formatDateTime, valueToText } from '../api';
import { useCapabilities } from '../hooks/useCapabilities';
import { SecretsManager } from '../shared/SecretsManager';
import type { StorageDeepLink } from '../tabs/storage/storageDeepLink';
import type { OpsActionDefinition, WorkerDetailsPayload } from '../types';
import { BindingsEditor } from './BindingsEditor';
import { BuildsPanel } from './BuildsPanel';
import { CodeEditorPanel } from './CodeEditorPanel';
import { CronPanel } from './CronPanel';
import { UNSAVED_CHANGES_MESSAGE } from './codeHelpers';
import { VersionsPanel } from './VersionsPanel';
import { WorkerDomainsPanel } from './WorkerDomainsPanel';
import { WorkerMetricsPanel } from './WorkerMetricsPanel';
import { WorkerSettingsPanel } from './WorkerSettingsPanel';

/** Ops legados que permanecem na aba Configurações. */
const WORKER_OPS_SETTINGS: OpsActionDefinition[] = [
  {
    value: 'get-worker-schedules',
    label: 'Ler cron triggers do Worker',
    description: 'Consulta os schedules configurados para execução automática.',
    fields: ['scriptName'],
    outcomeLabel: 'Schedules retornados pela Cloudflare',
  },
  {
    value: 'update-worker-schedules',
    label: 'Atualizar cron triggers do Worker',
    description: 'Substitui a lista atual de schedules. Informe um cron por linha.',
    fields: ['scriptName', 'schedules'],
    outcomeLabel: 'Resultado da atualização de schedules',
  },
  {
    value: 'get-worker-usage-model',
    label: 'Ler usage model do Worker',
    description: 'Mostra o modelo de cobrança atualmente aplicado.',
    fields: ['scriptName'],
    outcomeLabel: 'Usage model atual',
  },
  {
    value: 'update-worker-usage-model',
    label: 'Atualizar usage model do Worker',
    description: 'Altera o usage model do Worker.',
    fields: ['scriptName', 'usageModel'],
    outcomeLabel: 'Resultado da troca de usage model',
  },
  {
    value: 'list-worker-versions',
    label: 'Listar versões do Worker',
    description: 'Consulta as versões publicadas para apoiar rollback.',
    fields: ['scriptName'],
    outcomeLabel: 'Versões retornadas',
  },
];

/** Ops legados de rotas de zona — acessíveis na aba Domínios & Triggers. */
const WORKER_OPS_ROUTES: OpsActionDefinition[] = [
  {
    value: 'list-worker-routes',
    label: 'Listar rotas por zona',
    description: 'Consulta rotas vinculadas a uma zona Cloudflare.',
    fields: ['zoneId'],
    outcomeLabel: 'Rotas encontradas na zona',
  },
  {
    value: 'add-worker-route',
    label: 'Adicionar rota do Worker',
    description: 'Vincula o Worker a um pattern de rota.',
    fields: ['zoneId', 'routePattern', 'scriptName'],
    outcomeLabel: 'Resultado da criação da rota',
  },
  {
    value: 'delete-worker-route',
    label: 'Remover rota',
    description: 'Exclui uma rota específica usando zoneId e routeId.',
    fields: ['zoneId', 'routeId'],
    outcomeLabel: 'Resultado da remoção da rota',
  },
];

type WorkerTab = 'overview' | 'code' | 'versions' | 'builds' | 'metrics' | 'settings' | 'domains';

type WorkerDetailProps = {
  scriptName: string;
  payload: WorkerDetailsPayload;
  deployments: Array<Record<string, unknown>>;
  detailsLoading: boolean;
  adminActor: string;
  onBack: () => void;
  onRequestDelete: () => void;
  onOpenAction: (action: OpsActionDefinition) => void;
  /** Cross-nav ST-R2: abre a aba Armazenamento no alvo do binding. */
  onOpenStorage?: (target: StorageDeepLink) => void;
};

export const WorkerDetail: React.FC<WorkerDetailProps> = ({
  scriptName,
  payload,
  deployments,
  detailsLoading,
  adminActor,
  onBack,
  onRequestDelete,
  onOpenAction,
  onOpenStorage,
}) => {
  const [tab, setTab] = useState<WorkerTab>('overview');
  const codeDirtyRef = useRef(false);

  // Abas de Builds/Métricas só existem quando a capacidade correspondente
  // está habilitada na conta (sondada pelo motor via /capabilities).
  const { capabilities } = useCapabilities();
  const buildsEnabled = capabilities?.builds.enabled === true;
  const analyticsEnabled = capabilities?.analytics.enabled === true;

  const workerTabs = useMemo<Array<{ key: WorkerTab; label: string }>>(
    () => [
      { key: 'overview', label: 'Visão Geral' },
      { key: 'code', label: 'Código' },
      { key: 'versions', label: 'Versões' },
      ...(buildsEnabled ? [{ key: 'builds' as const, label: 'Builds' }] : []),
      ...(analyticsEnabled ? [{ key: 'metrics' as const, label: 'Métricas' }] : []),
      { key: 'settings', label: 'Configurações' },
      { key: 'domains', label: 'Domínios & Triggers' },
    ],
    [buildsEnabled, analyticsEnabled],
  );

  const handleCodeDirtyChange = useCallback((dirty: boolean) => {
    codeDirtyRef.current = dirty;
  }, []);

  const guardCodeExit = (): boolean => {
    if (tab !== 'code' || !codeDirtyRef.current) return true;
    return window.confirm(UNSAVED_CHANGES_MESSAGE);
  };

  const requestTab = (next: WorkerTab) => {
    if (next === tab) return;
    if (!guardCodeExit()) return;
    setTab(next);
  };

  const handleBack = () => {
    if (!guardCodeExit()) return;
    onBack();
  };

  return (
    <div className="cfpw-detail-view">
      <div className="cfpw-detail-view-header">
        <button type="button" className="ghost-button" onClick={handleBack} style={{ padding: '8px', border: 'none' }}>
          ← Voltar
        </button>
        <div className="cfpw-detail-view-header-content">
          <h2>
            {scriptName} {detailsLoading && <Loader2 size={16} className="spin" />}
          </h2>
          <p>Cloudflare Worker</p>
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
        {workerTabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`page-tab-item ${tab === key ? 'active' : ''}`}
            onClick={() => requestTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="cfpw-detail-body" style={tab === 'overview' ? undefined : { gridTemplateColumns: '1fr' }}>
        <div className="cfpw-detail-content">
          {tab === 'overview' && (
            <div className="cfpw-detail-section">
              <h3>Histórico de Deployments ({deployments.length})</h3>
              {deployments.length > 0 ? (
                <div className="cfpw-deploy-list">
                  {deployments.slice(0, 15).map((deployment) => {
                    const id = valueToText(deployment.id ?? deployment.short_id);
                    const environment = valueToText(deployment.environment);
                    const status = valueToText(
                      (deployment.latest_stage as Record<string, unknown> | undefined)?.status ?? deployment.strategy,
                    );
                    const url = valueToText(deployment.url);

                    return (
                      <div className="cfpw-deploy-item" key={id}>
                        <div className="cfpw-deploy-type">{environment}</div>
                        <div className="cfpw-deploy-item-main">
                          <strong>{id}</strong>
                          <span>
                            {formatDateTime(typeof deployment.created_on === 'string' ? deployment.created_on : null)} •{' '}
                            {status}
                          </span>
                        </div>
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
              ) : (
                <div className="cfpw-empty-state">Sem deployments ativos</div>
              )}
            </div>
          )}

          {tab === 'code' && (
            <CodeEditorPanel scriptName={scriptName} adminActor={adminActor} onDirtyChange={handleCodeDirtyChange} />
          )}

          {tab === 'versions' && <VersionsPanel scriptName={scriptName} adminActor={adminActor} />}

          {tab === 'builds' && buildsEnabled && <BuildsPanel scriptName={scriptName} adminActor={adminActor} />}

          {tab === 'metrics' && analyticsEnabled && (
            <WorkerMetricsPanel scriptName={scriptName} adminActor={adminActor} />
          )}

          {tab === 'settings' && (
            <div className="cfpw-detail-section">
              <WorkerSettingsPanel scriptName={scriptName} adminActor={adminActor} />
              <BindingsEditor scriptName={scriptName} adminActor={adminActor} onOpenStorage={onOpenStorage} />
              <SecretsManager domainType="worker" resourceId={scriptName} adminActor={adminActor} />
              <h3>Ações de Gerenciamento</h3>
              <div className="cfpw-action-list">
                {WORKER_OPS_SETTINGS.map((action) => (
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

          {tab === 'domains' && (
            <div className="cfpw-detail-section">
              <WorkerDomainsPanel
                scriptName={scriptName}
                adminActor={adminActor}
                routeOps={WORKER_OPS_ROUTES}
                onOpenAction={onOpenAction}
              />
              <CronPanel scriptName={scriptName} adminActor={adminActor} />
            </div>
          )}
        </div>

        {tab === 'overview' && (
          <div className="cfpw-detail-sidebar">
            <div className="cfpw-detail-section">
              <h3>Informações Técnicas</h3>
              <div className="cfpw-detail-kpi">
                <span>Usage Model</span>
                <strong>{String(payload.worker?.usage_model || 'N/A')}</strong>
              </div>
              <div className="cfpw-detail-kpi" style={{ marginTop: '12px' }}>
                <span>Compatibility Date</span>
                <strong>{String(payload.worker?.compatibility_date || 'N/A')}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
