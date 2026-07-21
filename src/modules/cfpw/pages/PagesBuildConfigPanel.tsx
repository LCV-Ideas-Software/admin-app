/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Aba "Build & Deploy" do projeto Pages (PW-3): form do build_config (build
 * command / output dir / root dir + switch de build caching quando presente),
 * purge do cache de build com confirmação, "Novo deployment" com dropdown de
 * branch (production + branches vistas nos deployments, ou texto livre) — o
 * 409 de projeto de upload direto aparece como aviso — e ativação de Web
 * Analytics (RUM) com resultado (tag + link do dashboard) e hint de permissão.
 */

import { AlertTriangle, BarChart3, Loader2, Rocket, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNotification } from '../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/Dialog';
import * as api from '../api';
import { extractBranchOptions } from './pagesHelpers';

const FREE_BRANCH_OPTION = '__outra__';

type PagesBuildConfigPanelProps = {
  projectName: string;
  adminActor: string;
  project: Record<string, unknown> | null;
  deployments: Array<Record<string, unknown>>;
  /** Chamado após criar um novo deployment (recarrega a lista no shell). */
  onDeployed: () => void;
};

const toBuildConfig = (project: Record<string, unknown> | null): Record<string, unknown> =>
  project && typeof project.build_config === 'object' && project.build_config !== null
    ? (project.build_config as Record<string, unknown>)
    : {};

export function PagesBuildConfigPanel({
  projectName,
  adminActor,
  project,
  deployments,
  onDeployed,
}: PagesBuildConfigPanelProps) {
  const { showNotification } = useNotification();
  const initialConfig = toBuildConfig(project);

  const [buildConfig, setBuildConfig] = useState<Record<string, unknown>>(initialConfig);
  const [buildCommand, setBuildCommand] = useState(String(initialConfig.build_command ?? ''));
  const [destinationDir, setDestinationDir] = useState(String(initialConfig.destination_dir ?? ''));
  const [rootDir, setRootDir] = useState(String(initialConfig.root_dir ?? ''));
  const [buildCaching, setBuildCaching] = useState(initialConfig.build_caching === true);
  const [saving, setSaving] = useState(false);

  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purging, setPurging] = useState(false);

  const [deployOpen, setDeployOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState('');
  const [branchChoice, setBranchChoice] = useState('');
  const [freeBranch, setFreeBranch] = useState('');

  const [waBusy, setWaBusy] = useState(false);
  const [waError, setWaError] = useState('');
  const [waResult, setWaResult] = useState<{ siteTag: string; dashboardUrl: string } | null>(null);

  const productionBranch = String(project?.production_branch ?? '').trim() || null;
  const branchOptions = extractBranchOptions(deployments, productionBranch);
  const hasBuildCachingField = 'build_caching' in buildConfig;
  const existingWebAnalyticsTag = String(buildConfig.web_analytics_tag ?? '').trim();

  const openDeployDialog = () => {
    setDeployError('');
    setFreeBranch('');
    setBranchChoice(branchOptions[0] ?? FREE_BRANCH_OPTION);
    setDeployOpen(true);
  };

  const saveBuildConfig = async () => {
    setSaving(true);
    try {
      const { response, payload } = await api.patchPageBuildConfig(adminActor, {
        projectName,
        buildCommand: buildCommand.trim(),
        destinationDir: destinationDir.trim(),
        rootDir: rootDir.trim(),
        ...(hasBuildCachingField ? { buildCaching } : {}),
      });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao atualizar build config.');
      showNotification(api.withReq('Build config atualizado.', payload), 'success');
      if (payload.buildConfig) setBuildConfig(payload.buildConfig);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao atualizar build config.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const executePurge = async () => {
    setPurging(true);
    try {
      const { response, payload } = await api.postPagePurgeBuildCache(adminActor, { projectName });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao expurgar o cache de build.');
      showNotification(api.withReq('Cache de build expurgado.', payload), 'success');
      setPurgeOpen(false);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao expurgar o cache de build.', 'error');
    } finally {
      setPurging(false);
    }
  };

  const executeDeploy = async () => {
    const branch = branchChoice === FREE_BRANCH_OPTION ? freeBranch.trim() : branchChoice;
    setDeploying(true);
    setDeployError('');
    try {
      const { response, payload } = await api.postPageDeploy(adminActor, {
        projectName,
        ...(branch && branch !== productionBranch ? { branch } : {}),
      });
      if (!response.ok || !payload.ok) {
        // 409 = projeto de upload direto (mensagem diagnóstica do motor).
        setDeployError(payload.error ?? `Falha ao criar deployment (HTTP ${response.status}).`);
        return;
      }
      showNotification(api.withReq('Deployment criado.', payload), 'success');
      setDeployOpen(false);
      onDeployed();
    } catch (error) {
      setDeployError(error instanceof Error ? error.message : 'Falha ao criar deployment.');
    } finally {
      setDeploying(false);
    }
  };

  const enableWebAnalytics = async () => {
    setWaBusy(true);
    setWaError('');
    try {
      const { response, payload } = await api.postPageWebAnalytics(adminActor, { projectName });
      if (!response.ok || !payload.ok) {
        // 403 chega com hint de permissão RUM do motor.
        setWaError(payload.error ?? `Falha ao ativar Web Analytics (HTTP ${response.status}).`);
        return;
      }
      showNotification(api.withReq('Web Analytics ativado.', payload), 'success');
      setWaResult({ siteTag: payload.siteTag ?? '', dashboardUrl: payload.dashboardUrl ?? '' });
    } catch (error) {
      setWaError(error instanceof Error ? error.message : 'Falha ao ativar Web Analytics.');
    } finally {
      setWaBusy(false);
    }
  };

  return (
    <div className="cfpw-panel-card">
      <div className="cfpw-code-header">
        <h3>Build & Deploy</h3>
        <div className="cfpw-code-header-actions">
          <button type="button" className="ghost-button" onClick={() => setPurgeOpen(true)} disabled={saving}>
            <Trash2 size={14} /> Purge build cache
          </button>
          <button type="button" className="primary-button" onClick={openDeployDialog} disabled={saving}>
            <Rocket size={14} /> Novo deployment
          </button>
        </div>
      </div>

      <div className="cfpw-settings-grid">
        <div className="field-group">
          <label htmlFor="cfpw-page-build-command">Build command</label>
          <input
            id="cfpw-page-build-command"
            type="text"
            autoComplete="off"
            placeholder="npm run build"
            value={buildCommand}
            onChange={(event) => setBuildCommand(event.target.value)}
            disabled={saving}
          />
        </div>
        <div className="field-group">
          <label htmlFor="cfpw-page-output-dir">Output dir</label>
          <input
            id="cfpw-page-output-dir"
            type="text"
            autoComplete="off"
            placeholder="dist"
            value={destinationDir}
            onChange={(event) => setDestinationDir(event.target.value)}
            disabled={saving}
          />
        </div>
        <div className="field-group">
          <label htmlFor="cfpw-page-root-dir">Root dir</label>
          <input
            id="cfpw-page-root-dir"
            type="text"
            autoComplete="off"
            placeholder="apps/site"
            value={rootDir}
            onChange={(event) => setRootDir(event.target.value)}
            disabled={saving}
          />
        </div>
        {hasBuildCachingField && (
          <label className="cfpw-dialog__toggle">
            <input
              type="checkbox"
              checked={buildCaching}
              onChange={(event) => setBuildCaching(event.target.checked)}
              disabled={saving}
            />
            <span>Build caching</span>
          </label>
        )}
      </div>
      <div className="cfpw-dialog__actions">
        <button type="button" className="primary-button" onClick={() => void saveBuildConfig()} disabled={saving}>
          {saving ? <Loader2 size={16} className="spin" /> : 'Salvar build config'}
        </button>
      </div>

      {/* ── Web Analytics ── */}
      <div className="cfpw-subsection">
        <h4>
          <BarChart3 size={14} /> Web Analytics
        </h4>
        {existingWebAnalyticsTag && !waResult && (
          <p>
            Já ativado — tag <code>{existingWebAnalyticsTag}</code>.
          </p>
        )}
        {waResult ? (
          <p>
            Ativado — tag <code>{waResult.siteTag}</code>.{' '}
            <a href={waResult.dashboardUrl} target="_blank" rel="noreferrer">
              Ver métricas no dashboard
            </a>
          </p>
        ) : (
          <button type="button" className="ghost-button" onClick={() => void enableWebAnalytics()} disabled={waBusy}>
            {waBusy ? <Loader2 size={14} className="spin" /> : 'Ativar Web Analytics'}
          </button>
        )}
        {waError && (
          <div className="cfpw-inline-warning cfpw-inline-warning--error" role="alert">
            <AlertTriangle size={14} /> {waError}
          </div>
        )}
      </div>

      {/* ── Dialog: purge build cache ── */}
      <Dialog open={purgeOpen} onOpenChange={(nextOpen) => (!nextOpen && !purging ? setPurgeOpen(false) : undefined)}>
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">
            <AlertTriangle size={18} /> Purge build cache
          </DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Expurga o cache de build de {projectName}. O próximo build será completo (mais lento).
          </DialogDescription>
          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={() => setPurgeOpen(false)} disabled={purging}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button cfpw-dialog__danger"
              onClick={() => void executePurge()}
              disabled={purging}
            >
              {purging ? <Loader2 size={16} className="spin" /> : 'Expurgar cache'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: novo deployment ── */}
      <Dialog
        open={deployOpen}
        onOpenChange={(nextOpen) => (!nextOpen && !deploying ? setDeployOpen(false) : undefined)}
      >
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">Novo deployment</DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Dispara um build a partir do Git (somente projetos conectados ao Git). Sem branch, a Cloudflare usa a
            production branch.
          </DialogDescription>
          <div className="field-group">
            <label htmlFor="cfpw-page-deploy-branch">Branch</label>
            <select
              id="cfpw-page-deploy-branch"
              value={branchChoice}
              onChange={(event) => setBranchChoice(event.target.value)}
              disabled={deploying}
            >
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                  {branch === productionBranch ? ' (production)' : ''}
                </option>
              ))}
              <option value={FREE_BRANCH_OPTION}>outra branch…</option>
            </select>
          </div>
          {branchChoice === FREE_BRANCH_OPTION && (
            <div className="field-group">
              <label htmlFor="cfpw-page-deploy-free-branch">Nome da branch</label>
              <input
                id="cfpw-page-deploy-free-branch"
                type="text"
                autoComplete="off"
                placeholder="feature/minha-branch"
                value={freeBranch}
                onChange={(event) => setFreeBranch(event.target.value)}
                disabled={deploying}
              />
            </div>
          )}
          {deployError && (
            <div className="cfpw-inline-warning cfpw-inline-warning--error" role="alert">
              <AlertTriangle size={14} /> {deployError}
            </div>
          )}
          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={() => setDeployOpen(false)} disabled={deploying}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void executeDeploy()}
              disabled={deploying || (branchChoice === FREE_BRANCH_OPTION && !freeBranch.trim())}
            >
              {deploying ? <Loader2 size={16} className="spin" /> : 'Criar deployment'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
