/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Dialog de confirmação reforçada do DNS-3: exige digitar o nome exato da
 * zona e, quando a zona é crítica (hospeda o admin-app), também marcar a
 * ciência explícita do impacto. Reutilizado por excluir zona, pausar zona
 * crítica e desativar DNSSEC da zona crítica.
 */

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/Dialog';
import { isZoneActionConfirmed } from './settingsHelpers';

export type ZoneConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  zoneName: string;
  critical: boolean;
  /** Texto do checkbox de ciência exibido apenas quando critical. */
  criticalAckLabel: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (confirmation: { confirmName: string; confirmCritical: boolean }) => void;
};

export function ZoneConfirmDialog({
  open,
  title,
  description,
  zoneName,
  critical,
  criticalAckLabel,
  confirmLabel,
  busy = false,
  onCancel,
  onConfirm,
}: ZoneConfirmDialogProps) {
  const [typedName, setTypedName] = useState('');
  const [ackChecked, setAckChecked] = useState(false);

  // Sempre reabre limpo: confirmação digitada não sobrevive entre aberturas.
  useEffect(() => {
    if (open) {
      setTypedName('');
      setAckChecked(false);
    }
  }, [open]);

  const confirmed = isZoneActionConfirmed({ name: zoneName, critical }, typedName, ackChecked);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onCancel() : undefined)}>
      <DialogContent overlayClassName="cfdns-zone-dialog-overlay" className="cfdns-zone-dialog">
        <DialogTitle className="cfdns-zone-dialog__title">
          <AlertTriangle size={18} /> {title}
        </DialogTitle>
        <DialogDescription className="cfdns-zone-dialog__description">{description}</DialogDescription>

        <div className="field-group">
          <label htmlFor="cfdns-zone-confirm-name">
            Digite <strong>{zoneName}</strong> para confirmar
          </label>
          <input
            id="cfdns-zone-confirm-name"
            name="cfDnsZoneConfirmName"
            type="text"
            autoComplete="off"
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
            disabled={busy}
          />
        </div>

        {critical && (
          <label className="cfdns-zone-dialog__ack">
            <input
              type="checkbox"
              name="cfDnsZoneConfirmCritical"
              checked={ackChecked}
              onChange={(event) => setAckChecked(event.target.checked)}
              disabled={busy}
            />
            <span>{criticalAckLabel}</span>
          </label>
        )}

        <div className="cfdns-zone-dialog__actions">
          <button type="button" className="ghost-button" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary-button cfdns-zone-dialog__danger"
            onClick={() => onConfirm({ confirmName: typedName.trim(), confirmCritical: ackChecked })}
            disabled={!confirmed || busy}
          >
            {busy ? <Loader2 size={16} className="spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
