/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Modal de confirmação de exclusão crítica (Worker ou projeto Pages) com
 * verificação de segurança por digitação do nome exato. Alvos protegidos
 * (recursos que servem a própria admin-app) exigem ainda a frase de risco,
 * repassada ao motor como confirmPhrase. Estado e execução seguem no shell
 * (CfPwModule) e chegam via props.
 */

import { AlertTriangle, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { DetailType } from '../types';
import { isProtectedTarget, PROTECTED_CONFIRM_PHRASE } from './protectedTargets';

type DeleteConfirmModalProps = {
  deleteTarget: { type: DetailType; id: string } | null;
  deleteConfirmation: string;
  deletePhrase: string;
  deleting: boolean;
  onConfirmationChange: (value: string) => void;
  onPhraseChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  deleteTarget,
  deleteConfirmation,
  deletePhrase,
  deleting,
  onConfirmationChange,
  onPhraseChange,
  onCancel,
  onConfirm,
}) => {
  if (!deleteTarget) return null;
  const targetIsProtected = isProtectedTarget(deleteTarget.type, deleteTarget.id);
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
          {targetIsProtected && (
            <>
              <p style={{ color: '#c5221f', fontWeight: 600 }}>
                <AlertTriangle size={16} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }} />
                Este recurso serve a própria admin-app em produção. Excluí-lo derruba esta interface (a recuperação
                exigirá dashboard/wrangler).
              </p>
              <div className="field-group">
                <label htmlFor="cfpw-delete-phrase">Digite {PROTECTED_CONFIRM_PHRASE} para confirmar</label>
                <input
                  id="cfpw-delete-phrase"
                  placeholder={`Digite: ${PROTECTED_CONFIRM_PHRASE}`}
                  value={deletePhrase}
                  onChange={(e) => onPhraseChange(e.target.value)}
                />
              </div>
            </>
          )}
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
            disabled={deleting || (targetIsProtected && deletePhrase !== PROTECTED_CONFIRM_PHRASE)}
          >
            {deleting ? <Loader2 className="spin" size={16} /> : 'Confirmar Destruição'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
