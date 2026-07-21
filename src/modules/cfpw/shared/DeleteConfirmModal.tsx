/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Modal de confirmação de exclusão crítica (Worker ou projeto Pages) com
 * verificação de segurança por digitação do nome exato. Estado e execução
 * seguem no shell (CfPwModule) e chegam via props.
 */

import { AlertTriangle, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { DetailType } from '../types';

type DeleteConfirmModalProps = {
  deleteTarget: { type: DetailType; id: string } | null;
  deleteConfirmation: string;
  deleting: boolean;
  onConfirmationChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  deleteTarget,
  deleteConfirmation,
  deleting,
  onConfirmationChange,
  onCancel,
  onConfirm,
}) => {
  if (!deleteTarget) return null;
  return createPortal(
    <div className="cfpw-modal-overlay">
      <div className="cfpw-modal" style={{ maxWidth: '400px' }}>
        <div className="cfpw-modal-header" style={{ background: '#fce8e6' }}>
          <h3 style={{ color: '#c5221f', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={24} /> Remoção Crítica
          </h3>
        </div>
        <div className="cfpw-modal-body">
          <p>
            Você está prestes a excluir o projeto <strong>{deleteTarget.id}</strong> (Tipo: {deleteTarget.type}). Essa
            ação é irreversível.
          </p>
          <div className="field-group">
            <label htmlFor="cfpw-delete-confirmation">Verificação de Segurança</label>
            <input
              id="cfpw-delete-confirmation"
              placeholder={`Digite: ${deleteTarget.id}`}
              value={deleteConfirmation}
              onChange={(e) => onConfirmationChange(e.target.value)}
            />
          </div>
        </div>
        <div className="cfpw-modal-footer">
          <button type="button" className="ghost-button" onClick={onCancel} disabled={deleting}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary-button"
            style={{ background: '#d93025', borderColor: '#d93025', color: '#fff' }}
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="spin" size={16} /> : 'Confirmar Destruição'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
