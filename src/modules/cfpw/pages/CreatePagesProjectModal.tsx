/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Modal de criação de projeto Pages (PW-3), wizard em 2 passos: (1) nome +
 * production branch + conexão opcional de repositório GitHub (com aviso de que
 * o GitHub App já deve estar autorizado na conta); (2) build config opcional
 * (build command / output dir / root dir). Erros (409, GitHub App) inline.
 */

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNotification } from '../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/Dialog';
import * as api from '../api';
import { PAGES_PROJECT_NAME_HINT, validatePagesProjectName } from './pagesHelpers';

type CreatePagesProjectModalProps = {
  open: boolean;
  adminActor: string;
  onClose: () => void;
  /** Chamado após criação bem-sucedida (recarrega o overview no shell). */
  onCreated: (projectName: string) => void;
};

export function CreatePagesProjectModal({ open, adminActor, onClose, onCreated }: CreatePagesProjectModalProps) {
  const { showNotification } = useNotification();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [productionBranch, setProductionBranch] = useState('main');
  const [connectRepo, setConnectRepo] = useState(false);
  const [owner, setOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [buildCommand, setBuildCommand] = useState('');
  const [destinationDir, setDestinationDir] = useState('');
  const [rootDir, setRootDir] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState('');

  const nameError = name ? validatePagesProjectName(name) : null;
  const step1Incomplete = !name.trim() || !!nameError || (connectRepo && (!owner.trim() || !repoName.trim()));

  const resetAndClose = () => {
    if (submitting) return;
    setStep(1);
    setName('');
    setProductionBranch('main');
    setConnectRepo(false);
    setOwner('');
    setRepoName('');
    setBuildCommand('');
    setDestinationDir('');
    setRootDir('');
    setInlineError('');
    onClose();
  };

  const advance = () => {
    const validationError = validatePagesProjectName(name);
    if (validationError) {
      setInlineError(validationError);
      return;
    }
    if (connectRepo && (!owner.trim() || !repoName.trim())) {
      setInlineError('Informe owner e repositório para conectar o GitHub.');
      return;
    }
    setInlineError('');
    setStep(2);
  };

  const handleCreate = async () => {
    setSubmitting(true);
    setInlineError('');
    try {
      const trimmedName = name.trim();
      const buildConfigFields = {
        ...(buildCommand.trim() ? { buildCommand: buildCommand.trim() } : {}),
        ...(destinationDir.trim() ? { destinationDir: destinationDir.trim() } : {}),
        ...(rootDir.trim() ? { rootDir: rootDir.trim() } : {}),
      };
      const { response, payload } = await api.createPagesProject(adminActor, {
        name: trimmedName,
        productionBranch: productionBranch.trim() || 'main',
        ...(Object.keys(buildConfigFields).length > 0 ? { buildConfig: buildConfigFields } : {}),
        ...(connectRepo ? { source: { owner: owner.trim(), repoName: repoName.trim() } } : {}),
      });
      if (!response.ok || !payload.ok) {
        setInlineError(payload.error ?? `Falha ao criar projeto Pages (HTTP ${response.status}).`);
        return;
      }
      showNotification(api.withReq(`Projeto Pages ${trimmedName} criado.`, payload), 'success');
      onCreated(trimmedName);
      resetAndClose();
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : 'Falha ao criar projeto Pages.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? resetAndClose() : undefined)}>
      <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
        <DialogTitle className="cfpw-dialog__title">Criar Projeto Pages</DialogTitle>
        <DialogDescription className="cfpw-dialog__description">
          Passo {step} de 2 — {step === 1 ? 'nome, branch e repositório (opcional)' : 'build config (opcional)'}.
        </DialogDescription>

        {step === 1 && (
          <div className="cfpw-dialog__form">
            <div className="field-group">
              <label htmlFor="cfpw-create-page-name">Nome do projeto</label>
              <input
                id="cfpw-create-page-name"
                type="text"
                autoComplete="off"
                placeholder="meu-projeto"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (inlineError) setInlineError('');
                }}
                disabled={submitting}
              />
              {nameError ? (
                <p className="field-error" role="alert">
                  {nameError}
                </p>
              ) : (
                <p className="field-hint">{PAGES_PROJECT_NAME_HINT}</p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="cfpw-create-page-branch">Production branch</label>
              <input
                id="cfpw-create-page-branch"
                type="text"
                autoComplete="off"
                placeholder="main"
                value={productionBranch}
                onChange={(event) => setProductionBranch(event.target.value)}
                disabled={submitting}
              />
            </div>

            <label className="cfpw-dialog__toggle">
              <input
                type="checkbox"
                checked={connectRepo}
                onChange={(event) => setConnectRepo(event.target.checked)}
                disabled={submitting}
              />
              <span>Conectar repositório GitHub</span>
            </label>

            {connectRepo && (
              <>
                <div className="cfpw-dialog__warning" role="status">
                  <p>
                    O GitHub já deve estar autorizado na conta — instale o GitHub App da Cloudflare Pages no dashboard
                    antes de conectar; caso contrário a Cloudflare rejeitará a criação.
                  </p>
                </div>
                <div className="field-group">
                  <label htmlFor="cfpw-create-page-owner">Owner (organização/usuário)</label>
                  <input
                    id="cfpw-create-page-owner"
                    type="text"
                    autoComplete="off"
                    placeholder="minha-org"
                    value={owner}
                    onChange={(event) => setOwner(event.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="cfpw-create-page-repo">Repositório</label>
                  <input
                    id="cfpw-create-page-repo"
                    type="text"
                    autoComplete="off"
                    placeholder="meu-repo"
                    value={repoName}
                    onChange={(event) => setRepoName(event.target.value)}
                    disabled={submitting}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="cfpw-dialog__form">
            <div className="field-group">
              <label htmlFor="cfpw-create-page-build-command">Build command (opcional)</label>
              <input
                id="cfpw-create-page-build-command"
                type="text"
                autoComplete="off"
                placeholder="npm run build"
                value={buildCommand}
                onChange={(event) => setBuildCommand(event.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="field-group">
              <label htmlFor="cfpw-create-page-output-dir">Output dir (opcional)</label>
              <input
                id="cfpw-create-page-output-dir"
                type="text"
                autoComplete="off"
                placeholder="dist"
                value={destinationDir}
                onChange={(event) => setDestinationDir(event.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="field-group">
              <label htmlFor="cfpw-create-page-root-dir">Root dir (opcional)</label>
              <input
                id="cfpw-create-page-root-dir"
                type="text"
                autoComplete="off"
                placeholder="apps/site"
                value={rootDir}
                onChange={(event) => setRootDir(event.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
        )}

        {inlineError && (
          <div className="cfpw-inline-warning cfpw-inline-warning--error" role="alert">
            <AlertTriangle size={14} /> {inlineError}
          </div>
        )}

        <div className="cfpw-dialog__actions">
          <button type="button" className="ghost-button" onClick={resetAndClose} disabled={submitting}>
            Cancelar
          </button>
          {step === 2 && (
            <button type="button" className="ghost-button" onClick={() => setStep(1)} disabled={submitting}>
              ← Voltar
            </button>
          )}
          {step === 1 ? (
            <button type="button" className="primary-button" onClick={advance} disabled={submitting || step1Incomplete}>
              Avançar →
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={() => void handleCreate()} disabled={submitting}>
              {submitting ? <Loader2 size={16} className="spin" /> : 'Criar projeto'}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
