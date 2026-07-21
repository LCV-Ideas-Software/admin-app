/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Aba "Código" do WorkerDetail (PW-1): carrega os módulos via GET worker-code,
 * edita com CodeMirror lazy (chunk separado), mantém rascunhos por módulo com
 * indicador dirty, e salva com PUT worker-code — Dialog de confirmação de
 * deploy imediato (+ frase para workers protegidos), expectedEtag quando
 * disponível e tratamento de conflito 409 com "Recarregar código".
 */

import { AlertTriangle, Loader2, RefreshCw, Save } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/Dialog';
import * as api from '../api';
import type { WorkerCodeModule } from '../types';
import { buildCodeSaveModules, dirtyModuleNames, hasBinaryModules, UNSAVED_CHANGES_MESSAGE } from './codeHelpers';
import { isProtectedWorker, PROTECTED_CONFIRM_PHRASE } from './workerValidation';

const CodeMirrorEditor = lazy(() => import('./CodeMirrorEditor'));

type CodeEditorPanelProps = {
  scriptName: string;
  adminActor: string;
  /** Informa o pai (guarda de navegação entre abas) sobre alterações não salvas. */
  onDirtyChange: (dirty: boolean) => void;
};

export function CodeEditorPanel({ scriptName, adminActor, onDirtyChange }: CodeEditorPanelProps) {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState<WorkerCodeModule[]>([]);
  const [mainModule, setMainModule] = useState<string | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [conflict, setConflict] = useState(false);

  const protectedWorker = isProtectedWorker(scriptName);
  const dirtyNames = dirtyModuleNames(modules, drafts);
  const binaryPresent = hasBinaryModules(modules);

  const loadCode = useCallback(async () => {
    setLoading(true);
    setConflict(false);
    setSaveError('');
    try {
      const { response, payload } = await api.fetchWorkerCode(adminActor, scriptName);
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao ler o código.');
      const loaded = Array.isArray(payload.modules) ? payload.modules : [];
      setModules(loaded);
      setMainModule(payload.mainModule ?? null);
      setEtag(payload.etag ?? null);
      setDrafts({});
      setActiveModule((current) => {
        if (current && loaded.some((module) => module.name === current)) return current;
        return payload.mainModule ?? loaded[0]?.name ?? null;
      });
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Falha ao ler o código.', 'error');
    } finally {
      setLoading(false);
    }
  }, [adminActor, scriptName, showNotification]);

  useEffect(() => {
    void loadCode();
  }, [loadCode]);

  // Guarda de navegação: pai (troca de aba/voltar) + saída da página.
  useEffect(() => {
    onDirtyChange(dirtyNames.length > 0);
  }, [dirtyNames.length, onDirtyChange]);

  useEffect(() => {
    if (dirtyNames.length === 0) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirtyNames.length]);

  // Ao desmontar (troca de aba já confirmada), limpa a flag no pai.
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const currentModule = modules.find((module) => module.name === activeModule) ?? null;
  const currentContent =
    currentModule && !currentModule.binary ? (drafts[currentModule.name] ?? currentModule.content) : '';

  const executeSave = async () => {
    if (!mainModule) {
      setSaveError('mainModule desconhecido — recarregue o código.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const { response, payload } = await api.putWorkerCode(adminActor, {
        scriptName,
        modules: buildCodeSaveModules(modules, drafts),
        mainModule,
        ...(protectedWorker ? { confirmPhrase: phrase } : {}),
        ...(etag ? { expectedEtag: etag } : {}),
      });
      if (response.status === 409) {
        setConflict(true);
        setConfirmOpen(false);
        setSaveError(payload.error ?? 'Conflito: o worker foi modificado por outra via.');
        return;
      }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao salvar o código.');
      showNotification(api.withReq(`Código de ${scriptName} implantado (100% do tráfego).`, payload), 'success');
      setConfirmOpen(false);
      setPhrase('');
      await loadCode();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Falha ao salvar o código.');
    } finally {
      setSaving(false);
    }
  };

  const handleReload = () => {
    if (dirtyNames.length > 0 && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    void loadCode();
  };

  return (
    <div className="cfpw-detail-section">
      <div className="cfpw-code-header">
        <h3>Código do Worker</h3>
        <div className="cfpw-code-header-actions">
          <button type="button" className="ghost-button" onClick={handleReload} disabled={loading || saving}>
            <RefreshCw size={14} /> Recarregar código
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => setConfirmOpen(true)}
            disabled={loading || saving || dirtyNames.length === 0 || binaryPresent}
          >
            <Save size={14} /> Salvar e implantar
          </button>
        </div>
      </div>

      {binaryPresent && (
        <p className="cfpw-inline-warning" role="status">
          <AlertTriangle size={14} /> Este worker contém módulos binários; o salvamento pela admin-app está bloqueado
          para não descartá-los (o PUT de código substitui o script inteiro e só aceita módulos de texto).
        </p>
      )}

      {conflict && (
        <div className="cfpw-inline-warning cfpw-inline-warning--error" role="alert">
          <AlertTriangle size={14} /> {saveError || 'Conflito de edição detectado.'}
          <button type="button" className="ghost-button" onClick={() => void loadCode()} disabled={loading}>
            Recarregar código
          </button>
        </div>
      )}

      {loading ? (
        <div className="cfpw-obs-loading">
          <Loader2 size={20} className="spin" /> Carregando código...
        </div>
      ) : modules.length === 0 ? (
        <div className="cfpw-empty-state">Nenhum módulo retornado.</div>
      ) : (
        <>
          <div className="cfpw-code-module-tabs" role="tablist">
            {modules.map((module) => {
              const dirty = dirtyNames.includes(module.name);
              return (
                <button
                  key={module.name}
                  type="button"
                  role="tab"
                  aria-selected={module.name === activeModule}
                  className={`cfpw-code-module-tab ${module.name === activeModule ? 'active' : ''}`}
                  onClick={() => setActiveModule(module.name)}
                >
                  {module.name}
                  {module.name === mainModule && <span className="cfpw-code-badge">main</span>}
                  {dirty && (
                    <span className="cfpw-code-dirty-dot" title="Alterações não salvas">
                      ●
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {currentModule?.binary ? (
            <div className="cfpw-empty-state">Módulo binário ({currentModule.contentType}) — não editável.</div>
          ) : currentModule ? (
            <Suspense
              fallback={
                <div className="cfpw-obs-loading">
                  <Loader2 size={20} className="spin" /> Carregando editor...
                </div>
              }
            >
              <CodeMirrorEditor
                key={`${scriptName}:${currentModule.name}`}
                value={currentContent}
                onChange={(next) => setDrafts((prev) => ({ ...prev, [currentModule.name]: next }))}
              />
            </Suspense>
          ) : null}
        </>
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={(nextOpen) => (!nextOpen && !saving ? setConfirmOpen(false) : undefined)}
      >
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">
            <AlertTriangle size={18} /> Deploy imediato
          </DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Deploy imediato: isto publica uma nova versão e a ativa em 100% do tráfego. Módulos alterados:{' '}
            {dirtyNames.join(', ') || '—'}.
          </DialogDescription>

          {protectedWorker && (
            <div className="cfpw-dialog__warning" role="status">
              <p>
                '{scriptName}' é um worker de PRODUÇÃO do próprio admin-app. Um deploy defeituoso pode derrubar esta
                interface (a recuperação exigirá dashboard/wrangler).
              </p>
              <div className="field-group">
                <label htmlFor="cfpw-code-confirm-phrase">
                  Digite <strong>{PROTECTED_CONFIRM_PHRASE}</strong> para confirmar
                </label>
                <input
                  id="cfpw-code-confirm-phrase"
                  type="text"
                  autoComplete="off"
                  value={phrase}
                  onChange={(event) => setPhrase(event.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          )}

          {saveError && !conflict && (
            <p className="field-error" role="alert">
              {saveError}
            </p>
          )}

          <div className="cfpw-dialog__actions">
            <button type="button" className="ghost-button" onClick={() => setConfirmOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button cfpw-dialog__danger"
              onClick={() => void executeSave()}
              disabled={saving || (protectedWorker && phrase !== PROTECTED_CONFIRM_PHRASE)}
            >
              {saving ? <Loader2 size={16} className="spin" /> : 'Implantar agora'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
