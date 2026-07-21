/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Modal de criação de Worker (PW-1): nome com validação client-side, toggles
 * de workers.dev (+previews), erro inline de conflito (409) e, quando a conta
 * ainda não tem subdomínio workers.dev (subdomainPending), oferece a criação
 * do subdomínio da conta na sequência.
 */

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNotification } from '../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/Dialog';
import * as api from '../api';
import { validateWorkerName, WORKER_NAME_HINT } from './workerValidation';

type CreateWorkerModalProps = {
  open: boolean;
  adminActor: string;
  onClose: () => void;
  /** Chamado após criação bem-sucedida (recarrega o overview no shell). */
  onCreated: (scriptName: string) => void;
};

export function CreateWorkerModal({ open, adminActor, onClose, onCreated }: CreateWorkerModalProps) {
  const { showNotification } = useNotification();
  const [name, setName] = useState('');
  const [enableSubdomain, setEnableSubdomain] = useState(true);
  const [previewsEnabled, setPreviewsEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [subdomainPending, setSubdomainPending] = useState(false);
  const [accountSubdomain, setAccountSubdomain] = useState('');
  const [creatingSubdomain, setCreatingSubdomain] = useState(false);

  const nameError = name ? validateWorkerName(name) : null;

  const resetAndClose = () => {
    if (submitting || creatingSubdomain) return;
    setName('');
    setInlineError('');
    setSubdomainPending(false);
    setAccountSubdomain('');
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    const validationError = validateWorkerName(trimmed);
    if (validationError) {
      setInlineError(validationError);
      return;
    }
    setSubmitting(true);
    setInlineError('');
    try {
      const { response, payload } = await api.createWorker(adminActor, {
        scriptName: trimmed,
        enableSubdomain,
        previewsEnabled,
      });
      if (!response.ok || !payload.ok) {
        setInlineError(payload.error ?? `Falha ao criar Worker (HTTP ${response.status}).`);
        return;
      }
      showNotification(api.withReq(`Worker ${trimmed} criado.`, payload), 'success');
      onCreated(trimmed);
      if (payload.subdomainPending) {
        setSubdomainPending(true);
        return;
      }
      setName('');
      onClose();
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : 'Falha ao criar Worker.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAccountSubdomain = async () => {
    const subdomain = accountSubdomain.trim();
    if (!subdomain) return;
    setCreatingSubdomain(true);
    try {
      const { response, payload } = await api.postWorkerSubdomain(adminActor, { accountSubdomain: subdomain });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao criar o subdomínio da conta.');
      showNotification(api.withReq(`Subdomínio ${subdomain}.workers.dev criado.`, payload), 'success');
      setSubdomainPending(false);
      setName('');
      onClose();
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : 'Falha ao criar o subdomínio da conta.');
    } finally {
      setCreatingSubdomain(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? resetAndClose() : undefined)}>
      <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
        <DialogTitle className="cfpw-dialog__title">Criar Worker</DialogTitle>
        <DialogDescription className="cfpw-dialog__description">
          Cria um Worker a partir do template padrão (com observability habilitada).
        </DialogDescription>

        <form onSubmit={(event) => void handleSubmit(event)} className="cfpw-dialog__form">
          <div className="field-group">
            <label htmlFor="cfpw-create-worker-name">Nome do Worker</label>
            <input
              id="cfpw-create-worker-name"
              type="text"
              autoComplete="off"
              placeholder="meu-worker"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (inlineError) setInlineError('');
              }}
              disabled={submitting || subdomainPending}
            />
            {nameError ? (
              <p className="field-error" role="alert">
                {nameError}
              </p>
            ) : (
              <p className="field-hint">{WORKER_NAME_HINT}</p>
            )}
          </div>

          <label className="cfpw-dialog__toggle">
            <input
              type="checkbox"
              checked={enableSubdomain}
              onChange={(event) => setEnableSubdomain(event.target.checked)}
              disabled={submitting || subdomainPending}
            />
            <span>Habilitar URL workers.dev</span>
          </label>
          <label className="cfpw-dialog__toggle">
            <input
              type="checkbox"
              checked={previewsEnabled}
              onChange={(event) => setPreviewsEnabled(event.target.checked)}
              disabled={submitting || subdomainPending || !enableSubdomain}
            />
            <span>Habilitar previews (URLs de versão)</span>
          </label>

          {inlineError && (
            <p className="field-error" role="alert">
              {inlineError}
            </p>
          )}

          {subdomainPending && (
            <div className="cfpw-dialog__warning" role="status">
              <p>
                A conta ainda não tem subdomínio workers.dev — a URL do Worker não resolve até criar um. Defina o
                subdomínio da conta abaixo (opcional).
              </p>
              <div className="field-group">
                <label htmlFor="cfpw-create-account-subdomain">Subdomínio da conta</label>
                <input
                  id="cfpw-create-account-subdomain"
                  type="text"
                  autoComplete="off"
                  placeholder="minha-conta"
                  value={accountSubdomain}
                  onChange={(event) => setAccountSubdomain(event.target.value)}
                  disabled={creatingSubdomain}
                />
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleCreateAccountSubdomain()}
                disabled={creatingSubdomain || !accountSubdomain.trim()}
              >
                {creatingSubdomain ? <Loader2 size={16} className="spin" /> : 'Criar subdomínio da conta'}
              </button>
            </div>
          )}

          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={resetAndClose} disabled={submitting}>
              {subdomainPending ? 'Concluir sem subdomínio' : 'Cancelar'}
            </button>
            {!subdomainPending && (
              <button type="submit" className="primary-button" disabled={submitting || !name.trim() || !!nameError}>
                {submitting ? <Loader2 size={16} className="spin" /> : 'Criar Worker'}
              </button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
