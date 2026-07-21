/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Barra de operações em lote do DNS-2: aparece acima da tabela quando há
 * registros selecionados e concentra os modais de exclusão e edição em lote
 * (Radix Dialog). Os handlers assíncronos vêm do controller da aba — a barra
 * só fecha o modal quando a aplicação do lote é confirmada com sucesso.
 */

import { AlertTriangle, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/Dialog';
import {
  type BulkEditFormState,
  buildBulkEditPreview,
  bulkEditIssues,
  DEFAULT_BULK_EDIT_FORM,
  hasBulkEditChanges,
} from './batchHelpers';
import { TagsInput } from './recordEditors';

const BATCH_ACK_LABEL = 'Entendo que a exclusão é aplicada de uma vez (tudo-ou-nada) e a propagação não é atômica.';
const BATCH_EDIT_ACK_LABEL = 'Entendo que a edição é aplicada de uma vez (tudo-ou-nada) e a propagação não é atômica.';

const DELETE_PREVIEW_LIMIT = 20;

type BatchSelectionMeta = {
  id: string;
  type: string;
  name: string;
};

type BatchBarProps = {
  selectedCount: number;
  selectedMeta: BatchSelectionMeta[];
  busy: boolean;
  tagsSupported: boolean;
  commentMaxLength: number;
  onClearSelection: () => void;
  onApplyDelete: () => Promise<boolean>;
  onApplyEdit: (form: BulkEditFormState) => Promise<boolean>;
};

export function BatchBar({
  selectedCount,
  selectedMeta,
  busy,
  tagsSupported,
  commentMaxLength,
  onClearSelection,
  onApplyDelete,
  onApplyEdit,
}: BatchBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAck, setDeleteAck] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAck, setEditAck] = useState(false);
  const [editForm, setEditForm] = useState<BulkEditFormState>(DEFAULT_BULK_EDIT_FORM);

  const editIssues = bulkEditIssues(editForm);
  const editHasChanges = hasBulkEditChanges(editForm);

  const handleDeleteOpenChange = (open: boolean) => {
    setShowDeleteConfirm(open);
    if (!open) {
      setDeleteAck(false);
    }
  };

  const handleEditOpenChange = (open: boolean) => {
    setShowEditModal(open);
    if (!open) {
      setEditAck(false);
      setEditForm(DEFAULT_BULK_EDIT_FORM);
    }
  };

  const executeDelete = async () => {
    const ok = await onApplyDelete();
    if (ok) {
      handleDeleteOpenChange(false);
    }
  };

  const executeEdit = async () => {
    const ok = await onApplyEdit(editForm);
    if (ok) {
      handleEditOpenChange(false);
    }
  };

  return (
    <>
      <div className="cfdns-batchbar" role="toolbar" aria-label="Operações em lote">
        <strong>{selectedCount} selecionado(s)</strong>
        <div className="inline-actions">
          <button type="button" className="ghost-button" onClick={() => setShowEditModal(true)} disabled={busy}>
            <Pencil size={14} />
            Editar em lote…
          </button>
          <button type="button" className="ghost-button" onClick={() => setShowDeleteConfirm(true)} disabled={busy}>
            {busy ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
            Excluir selecionados
          </button>
          <button type="button" className="ghost-button" onClick={onClearSelection} disabled={busy}>
            <X size={14} />
            Limpar seleção
          </button>
        </div>
      </div>

      {/* ── Modal de exclusão em lote ── */}
      <Dialog open={showDeleteConfirm} onOpenChange={handleDeleteOpenChange}>
        <DialogContent className="cfdns-batch-modal" overlayClassName="cfdns-batch-overlay">
          <div className="cfdns-batch-modal__icon">
            <AlertTriangle size={28} />
          </div>
          <DialogTitle className="cfdns-batch-modal__title">
            Excluir {selectedCount} registro(s) DNS em lote
          </DialogTitle>
          <DialogDescription className="cfdns-batch-modal__text">
            Os registros abaixo serão excluídos em uma única chamada. Esta ação é irreversível.
          </DialogDescription>
          <ul className="cfdns-batch-modal__list">
            {selectedMeta.slice(0, DELETE_PREVIEW_LIMIT).map((record) => (
              <li key={record.id}>
                <strong>{record.type || '—'}</strong> {record.name || record.id}
              </li>
            ))}
          </ul>
          {selectedMeta.length > DELETE_PREVIEW_LIMIT && (
            <p className="cfdns-batch-modal__more">e mais {selectedMeta.length - DELETE_PREVIEW_LIMIT}...</p>
          )}
          <label className="cfdns-batch-modal__ack">
            <input
              type="checkbox"
              checked={deleteAck}
              onChange={(event) => setDeleteAck(event.target.checked)}
              disabled={busy}
            />
            {BATCH_ACK_LABEL}
          </label>
          <div className="cfdns-batch-modal__actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void executeDelete()}
              disabled={!deleteAck || busy}
            >
              {busy ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
              Excluir em lote
            </button>
            <DialogClose asChild>
              <button type="button" className="ghost-button" disabled={busy}>
                Cancelar
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal de edição em lote ── */}
      <Dialog open={showEditModal} onOpenChange={handleEditOpenChange}>
        <DialogContent className="cfdns-batch-modal cfdns-batch-modal--edit" overlayClassName="cfdns-batch-overlay">
          <DialogTitle className="cfdns-batch-modal__title">Editar {selectedCount} registro(s) em lote</DialogTitle>
          <DialogDescription className="cfdns-batch-modal__text">
            Somente os campos alterados abaixo entram no lote; os demais permanecem como estão em cada registro.
          </DialogDescription>

          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="cfdns-bulk-ttl">TTL</label>
              <select
                id="cfdns-bulk-ttl"
                name="cfDnsBulkTtl"
                value={editForm.ttlChoice}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    ttlChoice: event.target.value as BulkEditFormState['ttlChoice'],
                  }))
                }
                disabled={busy}
              >
                <option value="keep">Manter</option>
                <option value="1">Auto</option>
                <option value="60">60s</option>
                <option value="300">300s</option>
                <option value="3600">3600s</option>
                <option value="86400">86400s</option>
                <option value="custom">Personalizado…</option>
              </select>
            </div>

            {editForm.ttlChoice === 'custom' && (
              <div className="field-group">
                <label htmlFor="cfdns-bulk-ttl-custom">TTL personalizado (segundos)</label>
                <input
                  id="cfdns-bulk-ttl-custom"
                  name="cfDnsBulkTtlCustom"
                  type="number"
                  min={1}
                  max={86400}
                  placeholder="ex.: 1800"
                  value={editForm.ttlCustom}
                  onChange={(event) => setEditForm((current) => ({ ...current, ttlCustom: event.target.value }))}
                  disabled={busy}
                />
              </div>
            )}

            <div className="field-group">
              <label htmlFor="cfdns-bulk-proxy">Proxy Cloudflare</label>
              <select
                id="cfdns-bulk-proxy"
                name="cfDnsBulkProxy"
                value={editForm.proxyMode}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    proxyMode: event.target.value as BulkEditFormState['proxyMode'],
                  }))
                }
                disabled={busy}
              >
                <option value="keep">Manter</option>
                <option value="on">Ativar</option>
                <option value="off">Desativar</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="cfdns-bulk-comment-mode">Comentário</label>
              <select
                id="cfdns-bulk-comment-mode"
                name="cfDnsBulkCommentMode"
                value={editForm.commentMode}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    commentMode: event.target.value as BulkEditFormState['commentMode'],
                  }))
                }
                disabled={busy}
              >
                <option value="keep">Manter</option>
                <option value="set">Definir</option>
                <option value="clear">Limpar</option>
              </select>
            </div>

            {editForm.commentMode === 'set' && (
              <div className="field-group">
                <label htmlFor="cfdns-bulk-comment">Novo comentário</label>
                <input
                  id="cfdns-bulk-comment"
                  name="cfDnsBulkComment"
                  type="text"
                  autoComplete="off"
                  maxLength={commentMaxLength}
                  value={editForm.commentValue}
                  onChange={(event) => setEditForm((current) => ({ ...current, commentValue: event.target.value }))}
                  disabled={busy}
                />
              </div>
            )}
          </div>

          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="cfdns-bulk-tags-mode">Tags</label>
              <select
                id="cfdns-bulk-tags-mode"
                name="cfDnsBulkTagsMode"
                value={editForm.tagsMode}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    tagsMode: event.target.value as BulkEditFormState['tagsMode'],
                  }))
                }
                disabled={busy}
              >
                <option value="keep">Manter</option>
                <option value="set">Definir lista</option>
              </select>
            </div>
          </div>

          {editForm.tagsMode === 'set' && (
            <TagsInput
              idPrefix="cfdns-bulk"
              tags={editForm.tags}
              onTagsChange={(tags) => setEditForm((current) => ({ ...current, tags }))}
              disabled={busy}
              tagsSupported={tagsSupported}
            />
          )}

          {editIssues.map((issue) => (
            <p key={issue} className="field-error" role="alert">
              {issue}
            </p>
          ))}

          <p className="cfdns-batch-modal__preview">{buildBulkEditPreview(selectedCount, editForm)}</p>

          <label className="cfdns-batch-modal__ack">
            <input
              type="checkbox"
              checked={editAck}
              onChange={(event) => setEditAck(event.target.checked)}
              disabled={busy}
            />
            {BATCH_EDIT_ACK_LABEL}
          </label>

          <div className="cfdns-batch-modal__actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void executeEdit()}
              disabled={!editAck || !editHasChanges || editIssues.length > 0 || busy}
            >
              {busy ? <Loader2 size={14} className="spin" /> : <Pencil size={14} />}
              Aplicar em lote
            </button>
            <DialogClose asChild>
              <button type="button" className="ghost-button" disabled={busy}>
                Cancelar
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
