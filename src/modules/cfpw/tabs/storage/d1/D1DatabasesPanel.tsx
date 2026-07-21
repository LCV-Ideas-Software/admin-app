/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Painel de bancos D1 (ST-D1): tabela com nome, uuid copiável, tabelas,
 * tamanho e criação; busca server-side; criação e exclusão com confirmação
 * type-name. bigdata_db (protegido) exibe badge/cadeado — sem botão de
 * exclusão — e banner âmbar permanente no detalhe. Banco selecionado abre as
 * sub-abas Console | Tabelas | Exportar/Importar.
 */

import { ArrowLeft, Copy, Loader2, Lock, Plus, RefreshCw, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNotification } from '../../../../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../../../components/ui/Dialog';
import { cfApiErrorMessage, cfApiFetch } from '../../../../shared/cfApi';
import * as api from '../../../api';
import type { D1DatabaseSummary, D1DatabasesPayload } from '../../../types';
import { D1Console } from './D1Console';
import { D1ExportImport } from './D1ExportImport';
import { D1TableBrowser } from './D1TableBrowser';
import { D1_DATABASE_NAME_PATTERN, formatD1FileSize } from './d1Helpers';

type D1DatabasesPanelProps = {
  adminActor: string;
  /** Deep-link (ST-R2): seleciona o banco assim que a lista carregar. */
  initialDatabaseId?: string;
  /** Notifica a seleção (para o hash de deep-link no StorageTab). */
  onSelectedChange?: (databaseId: string | null) => void;
};

type DetailTab = 'console' | 'tables' | 'export';

const PROTECTED_TOOLTIP =
  'bigdata_db é o banco operacional do próprio admin-app (IMUTÁVEL por política do workspace): exclusão e import são bloqueados; SQL de escrita exige frase de confirmação.';

export function D1DatabasesPanel({ adminActor, initialDatabaseId, onSelectedChange }: D1DatabasesPanelProps) {
  const { showNotification } = useNotification();

  const [databases, setDatabases] = useState<D1DatabaseSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<D1DatabaseSummary | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const [selected, setSelected] = useState<D1DatabaseSummary | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('console');
  const appliedInitialRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const query = new URLSearchParams();
      if (appliedSearch) query.set('search', appliedSearch);
      const suffix = query.size > 0 ? `?${query.toString()}` : '';
      const result = await cfApiFetch<D1DatabasesPayload>(`/api/cfpw/storage/d1/databases${suffix}`);
      if (cancelled) return;
      if (!result.ok) {
        showNotification(cfApiErrorMessage(result, 'Falha ao listar bancos D1'), 'error');
      } else if (!result.data.ok) {
        showNotification(result.data.error ?? 'Motor reportou falha ao listar bancos D1.', 'error');
      } else {
        setDatabases(result.data.databases ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [appliedSearch, reloadNonce, showNotification]);

  // Deep-link: aplica a seleção inicial uma única vez, quando a lista chegar.
  useEffect(() => {
    if (!initialDatabaseId || appliedInitialRef.current || databases.length === 0) return;
    const match = databases.find((database) => database.uuid === initialDatabaseId);
    if (match) {
      appliedInitialRef.current = true;
      setSelected(match);
      setDetailTab('console');
      onSelectedChange?.(match.uuid);
    }
  }, [initialDatabaseId, databases, onSelectedChange]);

  const reload = () => setReloadNonce((nonce) => nonce + 1);

  const selectDatabase = (database: D1DatabaseSummary | null) => {
    setSelected(database);
    setDetailTab('console');
    onSelectedChange?.(database?.uuid ?? null);
  };

  const applySearch = () => setAppliedSearch(searchInput.trim());

  const copyDatabaseId = async (databaseId: string) => {
    try {
      await navigator.clipboard.writeText(databaseId);
      showNotification('UUID do banco copiado.', 'success');
    } catch {
      showNotification('Falha ao copiar o UUID — copie manualmente.', 'error');
    }
  };

  const closeDialogs = () => {
    if (dialogBusy) return;
    setCreateOpen(false);
    setDeleteTarget(null);
    setCreateName('');
    setDeleteConfirmName('');
    setDialogError('');
  };

  const runCreate = async () => {
    const name = createName.trim();
    if (!D1_DATABASE_NAME_PATTERN.test(name)) {
      setDialogError(
        'Nome inválido: use 1 a 63 caracteres alfanuméricos, hífen ou underscore, começando por letra/número.',
      );
      return;
    }
    setDialogBusy(true);
    setDialogError('');
    try {
      const { response, payload } = await api.createD1Database(adminActor, { name });
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `Falha ao criar banco D1 (HTTP ${response.status}).`);
      }
      showNotification(api.withReq(`Banco D1 "${name}" criado.`, payload), 'success');
      setDialogBusy(false);
      closeDialogs();
      reload();
    } catch (error) {
      setDialogBusy(false);
      setDialogError(error instanceof Error ? error.message : 'Falha ao criar banco D1.');
    }
  };

  const runDelete = async () => {
    if (!deleteTarget) return;
    setDialogBusy(true);
    setDialogError('');
    try {
      const { response, payload } = await api.deleteD1Database(adminActor, {
        databaseId: deleteTarget.uuid,
        confirmName: deleteConfirmName,
      });
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `Falha ao excluir (HTTP ${response.status}).`);
      }
      showNotification(api.withReq(`Banco D1 "${deleteTarget.name}" excluído.`, payload), 'success');
      setDialogBusy(false);
      closeDialogs();
      reload();
    } catch (error) {
      setDialogBusy(false);
      setDialogError(error instanceof Error ? error.message : 'Falha ao excluir banco D1.');
    }
  };

  if (selected) {
    return (
      <div className="storage-panel">
        <div className="storage-toolbar">
          <div className="storage-toolbar-title">
            <button type="button" className="ghost-button" onClick={() => selectDatabase(null)}>
              <ArrowLeft size={14} /> Bancos D1
            </button>
            <h4>
              {selected.name}{' '}
              {selected.protected && (
                <span className="storage-badge storage-badge--protected" title={PROTECTED_TOOLTIP}>
                  <Lock size={11} /> protegido
                </span>
              )}
            </h4>
          </div>
        </div>

        {selected.protected && (
          <div className="storage-protected-banner" role="alert">
            ⚠️ bigdata_db é o banco operacional do admin-app (IMUTÁVEL — sem rename/rotação). Alterações podem derrubar
            telemetria e módulos.
          </div>
        )}

        <div className="page-tab-nav storage-subtab-nav">
          <button
            type="button"
            className={detailTab === 'console' ? 'page-tab-item active' : 'page-tab-item'}
            onClick={() => setDetailTab('console')}
          >
            Console
          </button>
          <button
            type="button"
            className={detailTab === 'tables' ? 'page-tab-item active' : 'page-tab-item'}
            onClick={() => setDetailTab('tables')}
          >
            Tabelas
          </button>
          <button
            type="button"
            className={detailTab === 'export' ? 'page-tab-item active' : 'page-tab-item'}
            onClick={() => setDetailTab('export')}
          >
            Exportar/Importar
          </button>
        </div>

        {detailTab === 'console' && <D1Console key={selected.uuid} adminActor={adminActor} database={selected} />}
        {detailTab === 'tables' && <D1TableBrowser key={selected.uuid} database={selected} />}
        {detailTab === 'export' && <D1ExportImport key={selected.uuid} adminActor={adminActor} database={selected} />}
      </div>
    );
  }

  return (
    <div className="storage-panel">
      <div className="storage-toolbar">
        <h4>Bancos D1 {appliedSearch && <span className="storage-badge">busca: {appliedSearch}</span>}</h4>
        <div className="storage-toolbar-actions">
          <div className="cfpw-obs-search-bar">
            <Search size={14} />
            <input
              type="text"
              placeholder="Buscar por nome..."
              aria-label="Buscar bancos D1 por nome"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applySearch();
              }}
            />
            <button type="button" className="cfpw-obs-search-btn" onClick={applySearch} disabled={loading}>
              Buscar
            </button>
          </div>
          <button type="button" className="ghost-button" onClick={reload} disabled={loading} aria-label="Atualizar">
            {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
          </button>
          <button type="button" className="primary-button" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Criar banco
          </button>
        </div>
      </div>

      {databases.length === 0 && !loading ? (
        <div className="cfpw-empty-state">
          {appliedSearch ? `Nenhum banco D1 com nome contendo "${appliedSearch}".` : 'Nenhum banco D1 encontrado.'}
        </div>
      ) : (
        <div className="storage-table-wrap">
          <table className="storage-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>UUID</th>
                <th>Tabelas</th>
                <th>Tamanho</th>
                <th>Criado em</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {databases.map((database) => (
                <tr key={database.uuid}>
                  <td>
                    <button
                      type="button"
                      className="storage-link-button"
                      onClick={() => selectDatabase(database)}
                      title="Abrir o banco (console, tabelas, export/import)"
                    >
                      {database.name}
                    </button>{' '}
                    {database.protected && (
                      <span className="storage-badge storage-badge--protected" title={PROTECTED_TOOLTIP}>
                        <Lock size={11} /> protegido
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="storage-id-cell">
                      <code>{database.uuid}</code>
                      <button
                        type="button"
                        className="cfpw-table-action"
                        onClick={() => void copyDatabaseId(database.uuid)}
                        aria-label={`Copiar UUID do banco ${database.name}`}
                      >
                        <Copy size={13} />
                      </button>
                    </span>
                  </td>
                  <td>{database.num_tables ?? '—'}</td>
                  <td>{formatD1FileSize(database.file_size) ?? '—'}</td>
                  <td>{api.formatDateTime(database.created_at)}</td>
                  <td className="storage-row-actions">
                    <button type="button" className="ghost-button" onClick={() => selectDatabase(database)}>
                      Abrir
                    </button>
                    {database.protected ? (
                      <span className="storage-protected-lock" title={PROTECTED_TOOLTIP}>
                        <Lock size={14} />
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="ghost-button storage-danger-button"
                        onClick={() => {
                          setDeleteTarget(database);
                          setDeleteConfirmName('');
                          setDialogError('');
                        }}
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Criar */}
      <Dialog open={createOpen} onOpenChange={(nextOpen) => (!nextOpen ? closeDialogs() : undefined)}>
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">Criar banco D1</DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            1 a 63 caracteres alfanuméricos, hífen ou underscore, começando por letra/número.
          </DialogDescription>
          <div className="cfpw-dialog__form">
            <div className="field-group">
              <label htmlFor="st-d1-create-name">Nome</label>
              <input
                id="st-d1-create-name"
                type="text"
                autoComplete="off"
                placeholder="meu_banco"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                disabled={dialogBusy}
              />
            </div>
            {dialogError && (
              <p className="field-error" role="alert">
                {dialogError}
              </p>
            )}
            <div className="cfpw-dialog__actions">
              <button type="button" className="ghost-button" onClick={closeDialogs} disabled={dialogBusy}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void runCreate()}
                disabled={dialogBusy || !createName.trim()}
              >
                {dialogBusy ? <Loader2 size={16} className="spin" /> : 'Criar banco'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Excluir (type-name; nunca aparece para banco protegido) */}
      <Dialog open={deleteTarget !== null} onOpenChange={(nextOpen) => (!nextOpen ? closeDialogs() : undefined)}>
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">Excluir banco D1</DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            Exclusão irreversível: todas as tabelas e dados de <strong>{deleteTarget?.name}</strong> serão perdidos.
            Digite o nome exato para confirmar.
          </DialogDescription>
          <div className="cfpw-dialog__form">
            <div className="field-group">
              <label htmlFor="st-d1-delete-confirm">Verificação de segurança</label>
              <input
                id="st-d1-delete-confirm"
                type="text"
                autoComplete="off"
                placeholder={`Digite: ${deleteTarget?.name ?? ''}`}
                value={deleteConfirmName}
                onChange={(event) => setDeleteConfirmName(event.target.value)}
                disabled={dialogBusy}
              />
            </div>
            {dialogError && (
              <p className="field-error" role="alert">
                {dialogError}
              </p>
            )}
            <div className="cfpw-dialog__actions">
              <button type="button" className="ghost-button" onClick={closeDialogs} disabled={dialogBusy}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button storage-danger-confirm"
                onClick={() => void runDelete()}
                disabled={dialogBusy || deleteConfirmName !== (deleteTarget?.name ?? '')}
              >
                {dialogBusy ? <Loader2 size={16} className="spin" /> : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
