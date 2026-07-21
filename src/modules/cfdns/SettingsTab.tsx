/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Aba "Zona & DNSSEC" do módulo CF DNS (DNS-3): ciclo de vida das zonas da
 * conta (criar, pausar, excluir, verificar ativação), DNSSEC e configurações
 * DNS da zona selecionada no shell. Zonas críticas (hospedam o admin-app)
 * exigem confirmação reforçada via ZoneConfirmDialog. Leituras via cfApiFetch;
 * mutações seguem o padrão raw-fetch do módulo com X-Admin-Actor.
 */

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Globe,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/Dialog';
import { cfApiErrorMessage } from '../shared/cfApi';
import * as api from './api';
import {
  buildDnsSettingsPatch,
  buildNameServerCopyList,
  type DnsSettingsFormState,
  toDnsSettingsFormState,
} from './settingsHelpers';
import type { AdminZone, DnsSettings, DnssecInfo, DnssecPatchInput } from './types';
import { ZoneConfirmDialog } from './ZoneConfirmDialog';

const CRITICAL_TOOLTIP = 'Hospeda o admin-app e apps — ações destrutivas exigem confirmação reforçada';

type BadgeTone = 'ok' | 'warn' | 'danger' | 'muted';

const ZONE_STATUS_BADGES: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: 'Ativa', tone: 'ok' },
  pending: { label: 'Pendente', tone: 'warn' },
  initializing: { label: 'Inicializando', tone: 'warn' },
  moved: { label: 'Movida', tone: 'danger' },
  deactivated: { label: 'Desativada', tone: 'danger' },
};

const DNSSEC_STATUS_PILLS: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: 'Ativo', tone: 'ok' },
  pending: { label: 'Aguardando DS no registrador', tone: 'warn' },
  disabled: { label: 'Desativado', tone: 'muted' },
  'pending-disabled': { label: 'Desativação pendente', tone: 'warn' },
  error: { label: 'Erro', tone: 'danger' },
};

const zoneStatusBadge = (status: string) => ZONE_STATUS_BADGES[status] ?? { label: status || '—', tone: 'muted' };

type SettingsTabProps = {
  adminActor: string;
  selectedZoneId: string;
  selectedZoneName: string;
  /** Notifica o shell para recarregar o seletor de zonas após criar/excluir. */
  onZonesChanged: () => void;
};

export function SettingsTab({ adminActor, selectedZoneId, selectedZoneName, onZonesChanged }: SettingsTabProps) {
  const { showNotification } = useNotification();

  // ── Zonas da conta ──
  const [adminZones, setAdminZones] = useState<AdminZone[]>([]);
  const [adminZonesLoading, setAdminZonesLoading] = useState(false);
  const [expandedZoneId, setExpandedZoneId] = useState('');
  const [zoneActionLoading, setZoneActionLoading] = useState('');
  const [addZoneOpen, setAddZoneOpen] = useState(false);
  const [addZoneName, setAddZoneName] = useState('');
  const [createdZone, setCreatedZone] = useState<AdminZone | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminZone | null>(null);
  const [pendingPause, setPendingPause] = useState<AdminZone | null>(null);

  // ── DNSSEC da zona selecionada ──
  const [dnssec, setDnssec] = useState<DnssecInfo | null>(null);
  const [dnssecLoading, setDnssecLoading] = useState(false);
  const [dnssecBusy, setDnssecBusy] = useState(false);
  const [pendingDnssecDisable, setPendingDnssecDisable] = useState(false);

  // ── Configurações DNS da zona selecionada ──
  const [settingsSnapshot, setSettingsSnapshot] = useState<DnsSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<DnsSettingsFormState | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const selectedAdminZone = adminZones.find((zone) => zone.id === selectedZoneId) ?? null;
  const selectedZoneCritical = selectedAdminZone?.critical ?? false;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification(`${label} copiado para a área de transferência.`, 'success');
    } catch {
      showNotification('Não foi possível copiar automaticamente — selecione o texto e copie manualmente.', 'error');
    }
  };

  const loadAdminZones = useCallback(
    async (shouldNotify = false) => {
      setAdminZonesLoading(true);
      const result = await api.fetchZonesAdmin();
      setAdminZonesLoading(false);

      if (!result.ok) {
        showNotification(cfApiErrorMessage(result, 'Não foi possível carregar as zonas da conta'), 'error');
        return;
      }
      if (!result.data.ok) {
        showNotification(result.data.error ?? 'Não foi possível carregar as zonas da conta.', 'error');
        return;
      }

      setAdminZones(Array.isArray(result.data.zones) ? result.data.zones : []);
      if (shouldNotify) {
        showNotification(api.withReq('Zonas da conta atualizadas.', result.data), 'success');
      }
    },
    [showNotification],
  );

  const loadDnssec = useCallback(
    async (zoneId: string) => {
      setDnssecLoading(true);
      const result = await api.fetchDnssec(zoneId);
      setDnssecLoading(false);

      if (!result.ok) {
        setDnssec(null);
        showNotification(cfApiErrorMessage(result, 'Não foi possível carregar o DNSSEC da zona'), 'error');
        return;
      }
      if (!result.data.ok) {
        setDnssec(null);
        showNotification(result.data.error ?? 'Não foi possível carregar o DNSSEC da zona.', 'error');
        return;
      }

      setDnssec(result.data.dnssec ?? null);
    },
    [showNotification],
  );

  const loadDnsSettings = useCallback(
    async (zoneId: string) => {
      setSettingsLoading(true);
      const result = await api.fetchDnsSettings(zoneId);
      setSettingsLoading(false);

      if (!result.ok) {
        setSettingsSnapshot(null);
        setSettingsForm(null);
        showNotification(cfApiErrorMessage(result, 'Não foi possível carregar as configurações DNS da zona'), 'error');
        return;
      }
      if (!result.data.ok) {
        setSettingsSnapshot(null);
        setSettingsForm(null);
        showNotification(result.data.error ?? 'Não foi possível carregar as configurações DNS da zona.', 'error');
        return;
      }

      const settings = result.data.settings ?? {};
      setSettingsSnapshot(settings);
      setSettingsForm(toDnsSettingsFormState(settings));
    },
    [showNotification],
  );

  useEffect(() => {
    void loadAdminZones();
  }, [loadAdminZones]);

  useEffect(() => {
    if (!selectedZoneId) {
      setDnssec(null);
      setSettingsSnapshot(null);
      setSettingsForm(null);
      return;
    }
    void loadDnssec(selectedZoneId);
    void loadDnsSettings(selectedZoneId);
  }, [selectedZoneId, loadDnssec, loadDnsSettings]);

  // ── Ações de zona ──

  const executeActivationCheck = async (zone: AdminZone) => {
    setZoneActionLoading(`activation:${zone.id}`);
    try {
      const { response, payload } = await api.runZoneActivationCheck(adminActor, zone.id);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao disparar a verificação de ativação da zona.');
      }
      showNotification(api.withReq(`Verificação de ativação disparada para ${zone.name}.`, payload), 'success');
      await loadAdminZones();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao disparar a verificação de ativação da zona.';
      showNotification(message, 'error');
    } finally {
      setZoneActionLoading('');
    }
  };

  const executePauseChange = async (
    zone: AdminZone,
    paused: boolean,
    confirmation: { confirmName: string; confirmCritical: boolean } | null,
  ) => {
    setZoneActionLoading(`pause:${zone.id}`);
    try {
      const { response, payload } = await api.patchZonePaused(adminActor, {
        zoneId: zone.id,
        paused,
        ...(confirmation ?? {}),
      });
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao atualizar o estado de pausa da zona.');
      }
      setPendingPause(null);
      showNotification(
        api.withReq(paused ? `Zona ${zone.name} pausada.` : `Zona ${zone.name} despausada.`, payload),
        'success',
      );
      await loadAdminZones();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar o estado de pausa da zona.';
      showNotification(message, 'error');
    } finally {
      setZoneActionLoading('');
    }
  };

  const handlePauseToggle = (zone: AdminZone) => {
    if (zone.paused) {
      void executePauseChange(zone, false, null);
      return;
    }
    if (zone.critical) {
      setPendingPause(zone);
      return;
    }
    void executePauseChange(zone, true, null);
  };

  const executeDelete = async (zone: AdminZone, confirmation: { confirmName: string; confirmCritical: boolean }) => {
    setZoneActionLoading(`delete:${zone.id}`);
    try {
      const { response, payload } = await api.deleteZone(adminActor, {
        zoneId: zone.id,
        confirmName: confirmation.confirmName,
        ...(zone.critical ? { confirmCritical: confirmation.confirmCritical } : {}),
      });
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao excluir a zona na Cloudflare.');
      }
      setPendingDelete(null);
      showNotification(api.withReq(`Zona ${zone.name} excluída.`, payload), 'success');
      await loadAdminZones();
      onZonesChanged();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao excluir a zona na Cloudflare.';
      showNotification(message, 'error');
    } finally {
      setZoneActionLoading('');
    }
  };

  const executeCreate = async () => {
    const name = addZoneName.trim().toLowerCase();
    if (!name) {
      showNotification('Informe o domínio da nova zona (ex.: exemplo.com.br).', 'error');
      return;
    }

    setZoneActionLoading('create');
    try {
      const { response, payload } = await api.createZone(adminActor, name);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao criar a zona na Cloudflare.');
      }
      setCreatedZone(payload.zone ?? null);
      showNotification(api.withReq(`Zona ${name} criada na Cloudflare.`, payload), 'success');
      await loadAdminZones();
      onZonesChanged();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao criar a zona na Cloudflare.';
      showNotification(message, 'error');
    } finally {
      setZoneActionLoading('');
    }
  };

  // ── Ações DNSSEC ──

  const executeDnssecPatch = async (patch: DnssecPatchInput, successMessage: string) => {
    setDnssecBusy(true);
    try {
      const { response, payload } = await api.patchDnssec(adminActor, selectedZoneId, patch);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao alterar o DNSSEC da zona.');
      }
      setPendingDnssecDisable(false);
      setDnssec(payload.dnssec ?? null);
      showNotification(api.withReq(successMessage, payload), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao alterar o DNSSEC da zona.';
      showNotification(message, 'error');
    } finally {
      setDnssecBusy(false);
    }
  };

  const dnssecStatus = dnssec?.status ?? '';
  const dnssecEnabled = dnssecStatus === 'active' || dnssecStatus === 'pending';
  const dnssecPill = DNSSEC_STATUS_PILLS[dnssecStatus] ?? { label: dnssecStatus || '—', tone: 'muted' as BadgeTone };

  // ── Configurações DNS ──

  const updateSettingsForm = (partial: Partial<DnsSettingsFormState>) => {
    setSettingsForm((previous) => (previous ? { ...previous, ...partial } : previous));
  };

  const handleSettingsSave = async () => {
    if (!settingsSnapshot || !settingsForm) {
      return;
    }

    const { settings, issues } = buildDnsSettingsPatch(settingsSnapshot, settingsForm);
    if (issues.length > 0) {
      showNotification(`Corrija antes de salvar: ${issues.join(' ')}`, 'error');
      return;
    }
    if (Object.keys(settings).length === 0) {
      showNotification('Nenhuma alteração para salvar.', 'info');
      return;
    }

    setSettingsSaving(true);
    try {
      const { response, payload } = await api.patchDnsSettings(adminActor, selectedZoneId, settings);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao alterar as configurações DNS da zona.');
      }
      const nextSettings = payload.settings ?? {};
      setSettingsSnapshot(nextSettings);
      setSettingsForm(toDnsSettingsFormState(nextSettings));
      showNotification(api.withReq('Configurações DNS salvas.', payload), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao alterar as configurações DNS da zona.';
      showNotification(message, 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  const busyZones = Boolean(zoneActionLoading) || adminZonesLoading;

  const renderCopyField = (label: string, value: string | number | null) => {
    const text = value == null ? '' : String(value);
    return (
      <div className="cfdns-ds-field">
        <span>{label}</span>
        <div className="cfdns-copy-row">
          <code>{text || '—'}</code>
          <button
            type="button"
            className="ghost-button cfrow-action-btn"
            onClick={() => void copyToClipboard(text, label)}
            disabled={!text}
          >
            <Copy size={13} />
            Copiar
          </button>
        </div>
      </div>
    );
  };

  const renderNameServers = (zone: AdminZone) => {
    const cfList = buildNameServerCopyList(zone.nameServers);
    const originalList = buildNameServerCopyList(zone.originalNameServers ?? []);

    return (
      <div className="cfdns-ns-panel">
        <div className="cfdns-ns-block">
          <strong>Nameservers da Cloudflare</strong>
          <p className="field-hint">Aponte o registrador para estes nameservers.</p>
          <pre>{cfList || '—'}</pre>
          <button
            type="button"
            className="ghost-button cfrow-action-btn"
            onClick={() => void copyToClipboard(cfList, 'Nameservers da Cloudflare')}
            disabled={!cfList}
          >
            <Copy size={13} />
            Copiar
          </button>
        </div>
        <div className="cfdns-ns-block">
          <strong>Nameservers originais</strong>
          <p className="field-hint">Registrados no provedor anterior (referência).</p>
          <pre>{originalList || '—'}</pre>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── Zonas da conta ── */}
      <article className="result-card cfdns-zonesadmin-card">
        <header className="result-header">
          <h4>
            <Globe size={16} /> Zonas da conta
          </h4>
          <div className="inline-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => void loadAdminZones(true)}
              disabled={busyZones}
            >
              {adminZonesLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Atualizar
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setAddZoneName('');
                setCreatedZone(null);
                setAddZoneOpen(true);
              }}
              disabled={busyZones}
            >
              <Plus size={16} />
              Adicionar zona
            </button>
          </div>
        </header>

        {adminZonesLoading && adminZones.length === 0 ? (
          <p className="result-empty inline-loading-message">
            <Loader2 size={16} className="spin" /> Carregando zonas da conta...
          </p>
        ) : adminZones.length === 0 ? (
          <p className="result-empty">Nenhuma zona encontrada na conta Cloudflare.</p>
        ) : (
          <div className="cfdns-table-wrap">
            <table className="cfdns-table cfdns-zonesadmin-table">
              <thead>
                <tr>
                  <th>Zona</th>
                  <th>Status</th>
                  <th>Plano</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {adminZones.map((zone) => {
                  const badge = zoneStatusBadge(zone.status);
                  const isPendingActivation = zone.status === 'pending' || zone.status === 'initializing';
                  const isExpanded = expandedZoneId === zone.id;

                  return (
                    <Fragment key={zone.id}>
                      <tr>
                        <td>
                          <div className="cfdns-zone-name-cell">
                            <strong>{zone.name}</strong>
                            {zone.critical && (
                              <span className="cfdns-zone-badge cfdns-zone-badge--critical" title={CRITICAL_TOOLTIP}>
                                <ShieldCheck size={12} /> crítica
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="cfdns-zone-badges">
                            <span className={`cfdns-zone-badge cfdns-zone-badge--${badge.tone}`}>{badge.label}</span>
                            {zone.paused && <span className="cfdns-zone-badge cfdns-zone-badge--muted">Pausada</span>}
                          </div>
                        </td>
                        <td>{zone.planLabel ?? '—'}</td>
                        <td>
                          <div className="cfdns-row-actions">
                            {isPendingActivation && (
                              <>
                                <button
                                  type="button"
                                  className="ghost-button cfrow-action-btn"
                                  onClick={() => void executeActivationCheck(zone)}
                                  disabled={Boolean(zoneActionLoading)}
                                >
                                  {zoneActionLoading === `activation:${zone.id}` ? (
                                    <Loader2 size={13} className="spin" />
                                  ) : (
                                    <RefreshCw size={13} />
                                  )}
                                  Verificar ativação
                                </button>
                                <button
                                  type="button"
                                  className="ghost-button cfrow-action-btn"
                                  onClick={() => setExpandedZoneId(isExpanded ? '' : zone.id)}
                                >
                                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  Nameservers
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              className="ghost-button cfrow-action-btn"
                              onClick={() => handlePauseToggle(zone)}
                              disabled={Boolean(zoneActionLoading)}
                            >
                              {zoneActionLoading === `pause:${zone.id}` ? (
                                <Loader2 size={13} className="spin" />
                              ) : zone.paused ? (
                                <PlayCircle size={13} />
                              ) : (
                                <PauseCircle size={13} />
                              )}
                              {zone.paused ? 'Despausar' : 'Pausar'}
                            </button>
                            <button
                              type="button"
                              className="ghost-button cfrow-action-btn cfdns-danger-action"
                              onClick={() => setPendingDelete(zone)}
                              disabled={Boolean(zoneActionLoading)}
                            >
                              {zoneActionLoading === `delete:${zone.id}` ? (
                                <Loader2 size={13} className="spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="cfdns-zone-ns-row">
                          <td colSpan={4}>{renderNameServers(zone)}</td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* ── DNSSEC da zona selecionada ── */}
      <article className="result-card cfdns-dnssec-card">
        <header className="result-header">
          <h4>
            <ShieldCheck size={16} /> DNSSEC {selectedZoneName ? `— ${selectedZoneName}` : ''}
          </h4>
          <div className="inline-actions">
            {selectedZoneId && dnssec && (
              <span className={`cfdns-zone-badge cfdns-zone-badge--${dnssecPill.tone}`}>{dnssecPill.label}</span>
            )}
            <button
              type="button"
              className="ghost-button"
              onClick={() => void loadDnssec(selectedZoneId)}
              disabled={!selectedZoneId || dnssecLoading || dnssecBusy}
            >
              {dnssecLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Atualizar
            </button>
            <button
              type="button"
              className={dnssecEnabled ? 'ghost-button cfdns-danger-action' : 'primary-button'}
              onClick={() => {
                if (dnssecEnabled) {
                  setPendingDnssecDisable(true);
                } else {
                  void executeDnssecPatch({ status: 'active' }, 'Ativação do DNSSEC solicitada.');
                }
              }}
              disabled={!selectedZoneId || dnssecLoading || dnssecBusy || !dnssec}
            >
              {dnssecBusy ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
              {dnssecEnabled ? 'Desativar DNSSEC' : 'Ativar DNSSEC'}
            </button>
          </div>
        </header>

        {!selectedZoneId ? (
          <p className="result-empty">Selecione uma zona no topo para gerenciar o DNSSEC.</p>
        ) : dnssecLoading ? (
          <p className="result-empty inline-loading-message">
            <Loader2 size={16} className="spin" /> Carregando DNSSEC...
          </p>
        ) : !dnssec ? (
          <p className="result-empty">DNSSEC indisponível para esta zona no momento.</p>
        ) : (
          <>
            {dnssecEnabled && (
              <div className="cfdns-ds-panel">
                <div className="field-group">
                  <label htmlFor="cfdns-dnssec-ds">Registro DS (cole no registrador)</label>
                  <textarea id="cfdns-dnssec-ds" name="cfDnsDnssecDs" readOnly rows={2} value={dnssec.ds ?? ''} />
                  <button
                    type="button"
                    className="ghost-button cfrow-action-btn"
                    onClick={() => void copyToClipboard(dnssec.ds ?? '', 'Registro DS')}
                    disabled={!dnssec.ds}
                  >
                    <Copy size={13} />
                    Copiar DS
                  </button>
                </div>
                <div className="cfdns-ds-grid">
                  {renderCopyField('Key tag', dnssec.key_tag)}
                  {renderCopyField('Algoritmo', dnssec.algorithm)}
                  {renderCopyField('Tipo de digest', dnssec.digest_type)}
                  {renderCopyField('Digest', dnssec.digest)}
                </div>
              </div>
            )}

            <details className="cfdns-advanced-accordion">
              <summary>Avançado</summary>
              <div className="cfdns-dnssec-toggles">
                <label className="cfdns-settings-switch">
                  <input
                    type="checkbox"
                    name="cfDnsDnssecMultiSigner"
                    checked={dnssec.dnssec_multi_signer === true}
                    onChange={(event) =>
                      void executeDnssecPatch(
                        { dnssecMultiSigner: event.target.checked },
                        'DNSSEC multi-signer atualizado.',
                      )
                    }
                    disabled={dnssecBusy}
                  />
                  <span>
                    Multi-signer
                    <small>Permite múltiplos provedores assinando a zona ao mesmo tempo (RFC 8901).</small>
                  </span>
                </label>
                <label className="cfdns-settings-switch">
                  <input
                    type="checkbox"
                    name="cfDnsDnssecPresigned"
                    checked={dnssec.dnssec_presigned === true}
                    onChange={(event) =>
                      void executeDnssecPatch({ dnssecPresigned: event.target.checked }, 'DNSSEC presigned atualizado.')
                    }
                    disabled={dnssecBusy}
                  />
                  <span>
                    Presigned
                    <small>Usa assinaturas DNSSEC geradas fora da Cloudflare (zonas secundárias).</small>
                  </span>
                </label>
                <label className="cfdns-settings-switch">
                  <input
                    type="checkbox"
                    name="cfDnsDnssecUseNsec3"
                    checked={dnssec.dnssec_use_nsec3 === true}
                    onChange={(event) =>
                      void executeDnssecPatch({ dnssecUseNsec3: event.target.checked }, 'DNSSEC NSEC3 atualizado.')
                    }
                    disabled={dnssecBusy}
                  />
                  <span>
                    NSEC3
                    <small>Responde negativas com NSEC3, dificultando a enumeração dos nomes da zona.</small>
                  </span>
                </label>
              </div>
            </details>
          </>
        )}
      </article>

      {/* ── Configurações DNS da zona selecionada ── */}
      <article className="result-card cfdns-dns-settings-card">
        <header className="result-header">
          <h4>
            <Save size={16} /> Configurações DNS {selectedZoneName ? `— ${selectedZoneName}` : ''}
          </h4>
          <div className="inline-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => void loadDnsSettings(selectedZoneId)}
              disabled={!selectedZoneId || settingsLoading || settingsSaving}
            >
              {settingsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Atualizar
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSettingsSave()}
              disabled={!selectedZoneId || !settingsForm || settingsLoading || settingsSaving}
            >
              {settingsSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              Salvar alterações
            </button>
          </div>
        </header>

        <p className="field-hint">
          Recursos como Foundation DNS e nameservers custom podem exigir plano pago — se a Cloudflare rejeitar, o erro
          retornado será exibido aqui.
        </p>

        {!selectedZoneId ? (
          <p className="result-empty">Selecione uma zona no topo para editar as configurações DNS.</p>
        ) : settingsLoading ? (
          <p className="result-empty inline-loading-message">
            <Loader2 size={16} className="spin" /> Carregando configurações DNS...
          </p>
        ) : !settingsForm ? (
          <p className="result-empty">Configurações DNS indisponíveis para esta zona no momento.</p>
        ) : (
          <div className="cfdns-dns-settings-form">
            <div className="cfdns-dnssec-toggles">
              <label className="cfdns-settings-switch">
                <input
                  type="checkbox"
                  name="cfDnsFlattenAllCnames"
                  checked={settingsForm.flattenAllCnames}
                  onChange={(event) => updateSettingsForm({ flattenAllCnames: event.target.checked })}
                  disabled={settingsSaving}
                />
                <span>
                  Flatten de todos os CNAMEs
                  <small>Resolve CNAMEs para o IP final em todos os níveis, não só no apex.</small>
                </span>
              </label>
              <label className="cfdns-settings-switch">
                <input
                  type="checkbox"
                  name="cfDnsMultiProvider"
                  checked={settingsForm.multiProvider}
                  onChange={(event) => updateSettingsForm({ multiProvider: event.target.checked })}
                  disabled={settingsSaving}
                />
                <span>
                  Multi-provider
                  <small>Permite operar a zona com mais de um provedor DNS autoritativo.</small>
                </span>
              </label>
              <label className="cfdns-settings-switch">
                <input
                  type="checkbox"
                  name="cfDnsSecondaryOverrides"
                  checked={settingsForm.secondaryOverrides}
                  onChange={(event) => updateSettingsForm({ secondaryOverrides: event.target.checked })}
                  disabled={settingsSaving}
                />
                <span>
                  Overrides de zona secundária
                  <small>Permite sobrescrever registros recebidos via transferência de zona (AXFR).</small>
                </span>
              </label>
              <label className="cfdns-settings-switch">
                <input
                  type="checkbox"
                  name="cfDnsFoundationDns"
                  checked={settingsForm.foundationDns}
                  onChange={(event) => updateSettingsForm({ foundationDns: event.target.checked })}
                  disabled={settingsSaving}
                />
                <span>
                  Foundation DNS
                  <small>Nameservers avançados dedicados (recurso pago da Cloudflare).</small>
                </span>
              </label>
            </div>

            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="cfdns-settings-ns-ttl">TTL dos nameservers (ns_ttl)</label>
                <input
                  id="cfdns-settings-ns-ttl"
                  name="cfDnsSettingsNsTtl"
                  type="number"
                  min={30}
                  max={86400}
                  value={settingsForm.nsTtl}
                  onChange={(event) => updateSettingsForm({ nsTtl: event.target.value })}
                  disabled={settingsSaving}
                />
                <p className="field-hint">Entre 30 e 86400 segundos.</p>
              </div>

              <div className="field-group">
                <span className="cfdns-radio-label">Modo da zona</span>
                <div className="cfdns-radio-group">
                  {(['standard', 'cdn_only', 'dns_only'] as const).map((mode) => (
                    <label key={mode}>
                      <input
                        type="radio"
                        name="cfDnsZoneMode"
                        value={mode}
                        checked={settingsForm.zoneMode === mode}
                        onChange={() => updateSettingsForm({ zoneMode: mode })}
                        disabled={settingsSaving}
                      />
                      <span>{mode}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="cfdns-settings-ns-type">Nameservers</label>
                <select
                  id="cfdns-settings-ns-type"
                  name="cfDnsSettingsNsType"
                  value={settingsForm.nameserversType}
                  onChange={(event) =>
                    updateSettingsForm({
                      nameserversType: event.target.value as DnsSettingsFormState['nameserversType'],
                    })
                  }
                  disabled={settingsSaving}
                >
                  <option value="cloudflare.standard">cloudflare.standard</option>
                  <option value="custom.account">custom.account</option>
                  <option value="custom.tenant">custom.tenant</option>
                  <option value="custom.zone">custom.zone</option>
                </select>
              </div>

              {settingsForm.nameserversType !== 'cloudflare.standard' && (
                <div className="field-group">
                  <label htmlFor="cfdns-settings-ns-set">Conjunto de NS (ns_set)</label>
                  <input
                    id="cfdns-settings-ns-set"
                    name="cfDnsSettingsNsSet"
                    type="number"
                    min={1}
                    max={5}
                    value={settingsForm.nameserversNsSet}
                    onChange={(event) => updateSettingsForm({ nameserversNsSet: event.target.value })}
                    disabled={settingsSaving}
                  />
                  <p className="field-hint">Entre 1 e 5.</p>
                </div>
              )}
            </div>

            <fieldset className="cfdns-soa-fieldset">
              <legend>SOA (enviado completo quando qualquer campo muda)</legend>
              <div className="form-grid">
                <div className="field-group">
                  <label htmlFor="cfdns-soa-mname">mname (NS primário)</label>
                  <input
                    id="cfdns-soa-mname"
                    name="cfDnsSoaMname"
                    type="text"
                    value={settingsForm.soaMname}
                    onChange={(event) => updateSettingsForm({ soaMname: event.target.value })}
                    disabled={settingsSaving}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="cfdns-soa-rname">rname (e-mail responsável)</label>
                  <input
                    id="cfdns-soa-rname"
                    name="cfDnsSoaRname"
                    type="text"
                    value={settingsForm.soaRname}
                    onChange={(event) => updateSettingsForm({ soaRname: event.target.value })}
                    disabled={settingsSaving}
                  />
                  <p className="field-hint">Use ponto no lugar de @ (ex.: admin.exemplo.com).</p>
                </div>
                <div className="field-group">
                  <label htmlFor="cfdns-soa-ttl">ttl</label>
                  <input
                    id="cfdns-soa-ttl"
                    name="cfDnsSoaTtl"
                    type="number"
                    min={300}
                    max={86400}
                    value={settingsForm.soaTtl}
                    onChange={(event) => updateSettingsForm({ soaTtl: event.target.value })}
                    disabled={settingsSaving}
                  />
                  <p className="field-hint">300 a 86400.</p>
                </div>
                <div className="field-group">
                  <label htmlFor="cfdns-soa-refresh">refresh</label>
                  <input
                    id="cfdns-soa-refresh"
                    name="cfDnsSoaRefresh"
                    type="number"
                    min={600}
                    max={86400}
                    value={settingsForm.soaRefresh}
                    onChange={(event) => updateSettingsForm({ soaRefresh: event.target.value })}
                    disabled={settingsSaving}
                  />
                  <p className="field-hint">600 a 86400.</p>
                </div>
                <div className="field-group">
                  <label htmlFor="cfdns-soa-retry">retry</label>
                  <input
                    id="cfdns-soa-retry"
                    name="cfDnsSoaRetry"
                    type="number"
                    min={600}
                    max={86400}
                    value={settingsForm.soaRetry}
                    onChange={(event) => updateSettingsForm({ soaRetry: event.target.value })}
                    disabled={settingsSaving}
                  />
                  <p className="field-hint">600 a 86400.</p>
                </div>
                <div className="field-group">
                  <label htmlFor="cfdns-soa-expire">expire</label>
                  <input
                    id="cfdns-soa-expire"
                    name="cfDnsSoaExpire"
                    type="number"
                    min={86400}
                    max={2419200}
                    value={settingsForm.soaExpire}
                    onChange={(event) => updateSettingsForm({ soaExpire: event.target.value })}
                    disabled={settingsSaving}
                  />
                  <p className="field-hint">86400 a 2419200.</p>
                </div>
                <div className="field-group">
                  <label htmlFor="cfdns-soa-min-ttl">min_ttl</label>
                  <input
                    id="cfdns-soa-min-ttl"
                    name="cfDnsSoaMinTtl"
                    type="number"
                    min={60}
                    max={86400}
                    value={settingsForm.soaMinTtl}
                    onChange={(event) => updateSettingsForm({ soaMinTtl: event.target.value })}
                    disabled={settingsSaving}
                  />
                  <p className="field-hint">60 a 86400.</p>
                </div>
              </div>
            </fieldset>
          </div>
        )}
      </article>

      {/* ── Dialog: adicionar zona ── */}
      <Dialog open={addZoneOpen} onOpenChange={(nextOpen) => (!nextOpen ? setAddZoneOpen(false) : undefined)}>
        <DialogContent overlayClassName="cfdns-zone-dialog-overlay" className="cfdns-zone-dialog">
          <DialogTitle className="cfdns-zone-dialog__title">
            <Plus size={18} /> Adicionar zona
          </DialogTitle>
          {createdZone ? (
            <>
              <DialogDescription className="cfdns-zone-dialog__description">
                Zona {createdZone.name} criada. Aponte o registrador para os nameservers atribuídos pela Cloudflare:
              </DialogDescription>
              <pre className="cfdns-zone-dialog__ns">{buildNameServerCopyList(createdZone.nameServers) || '—'}</pre>
              <div className="cfdns-zone-dialog__actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    void copyToClipboard(buildNameServerCopyList(createdZone.nameServers), 'Nameservers da Cloudflare')
                  }
                  disabled={!buildNameServerCopyList(createdZone.nameServers)}
                >
                  <Copy size={16} />
                  Copiar nameservers
                </button>
                <button type="button" className="primary-button" onClick={() => setAddZoneOpen(false)}>
                  Fechar
                </button>
              </div>
            </>
          ) : (
            <>
              <DialogDescription className="cfdns-zone-dialog__description">
                Informe o domínio a adicionar como zona (tipo full) na conta Cloudflare. Após a criação, aponte o
                registrador para os nameservers atribuídos.
              </DialogDescription>
              <div className="field-group">
                <label htmlFor="cfdns-add-zone-name">Domínio</label>
                <input
                  id="cfdns-add-zone-name"
                  name="cfDnsAddZoneName"
                  type="text"
                  autoComplete="off"
                  placeholder="exemplo.com.br"
                  value={addZoneName}
                  onChange={(event) => setAddZoneName(event.target.value.toLowerCase())}
                  disabled={zoneActionLoading === 'create'}
                />
              </div>
              <div className="cfdns-zone-dialog__actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setAddZoneOpen(false)}
                  disabled={zoneActionLoading === 'create'}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void executeCreate()}
                  disabled={!addZoneName.trim() || zoneActionLoading === 'create'}
                >
                  {zoneActionLoading === 'create' ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                  Criar zona
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: excluir zona (type-name + ciência quando crítica) ── */}
      {pendingDelete && (
        <ZoneConfirmDialog
          open
          title={`Excluir zona ${pendingDelete.name}`}
          description={
            pendingDelete.critical
              ? `Excluir ${pendingDelete.name} derruba o admin-app e TODOS os apps hospedados nesta zona. A ação é irreversível.`
              : `Excluir ${pendingDelete.name} remove todos os registros DNS da zona na Cloudflare. A ação é irreversível.`
          }
          zoneName={pendingDelete.name}
          critical={pendingDelete.critical}
          criticalAckLabel="Entendo que esta é a zona crítica que hospeda o admin-app e todos os apps, e que excluí-la os derruba."
          confirmLabel="Excluir zona"
          busy={zoneActionLoading === `delete:${pendingDelete.id}`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={(confirmation) => void executeDelete(pendingDelete, confirmation)}
        />
      )}

      {/* ── Dialog: pausar zona crítica ── */}
      {pendingPause && (
        <ZoneConfirmDialog
          open
          title={`Pausar zona ${pendingPause.name}`}
          description={`Pausar ${pendingPause.name} desativa o proxy da Cloudflare na zona crítica — o admin-app e os apps hospedados nela ficam indisponíveis até despausar.`}
          zoneName={pendingPause.name}
          critical={pendingPause.critical}
          criticalAckLabel="Entendo que esta é a zona crítica que hospeda o admin-app e todos os apps, e que pausá-la os derruba."
          confirmLabel="Pausar zona"
          busy={zoneActionLoading === `pause:${pendingPause.id}`}
          onCancel={() => setPendingPause(null)}
          onConfirm={(confirmation) => void executePauseChange(pendingPause, true, confirmation)}
        />
      )}

      {/* ── Dialog: desativar DNSSEC (reforçado quando zona crítica) ── */}
      {pendingDnssecDisable && selectedZoneCritical && (
        <ZoneConfirmDialog
          open
          title={`Desativar DNSSEC de ${selectedZoneName}`}
          description={`Desativar o DNSSEC da zona crítica ${selectedZoneName} pode derrubar a resolução do admin-app e de todos os apps enquanto o registrador mantiver o registro DS antigo.`}
          zoneName={selectedZoneName}
          critical
          criticalAckLabel="Entendo que desativar o DNSSEC da zona crítica pode derrubar a resolução de todos os apps."
          confirmLabel="Desativar DNSSEC"
          busy={dnssecBusy}
          onCancel={() => setPendingDnssecDisable(false)}
          onConfirm={(confirmation) =>
            void executeDnssecPatch(
              {
                status: 'disabled',
                confirmName: confirmation.confirmName,
                confirmCritical: confirmation.confirmCritical,
              },
              'Desativação do DNSSEC solicitada.',
            )
          }
        />
      )}

      {pendingDnssecDisable && !selectedZoneCritical && (
        <Dialog open onOpenChange={(nextOpen) => (!nextOpen ? setPendingDnssecDisable(false) : undefined)}>
          <DialogContent overlayClassName="cfdns-zone-dialog-overlay" className="cfdns-zone-dialog">
            <DialogTitle className="cfdns-zone-dialog__title">
              <AlertTriangle size={18} /> Desativar DNSSEC
            </DialogTitle>
            <DialogDescription className="cfdns-zone-dialog__description">
              Confirma desativar o DNSSEC de {selectedZoneName}? Remova também o registro DS no registrador para evitar
              falhas de validação.
            </DialogDescription>
            <div className="cfdns-zone-dialog__actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setPendingDnssecDisable(false)}
                disabled={dnssecBusy}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button cfdns-zone-dialog__danger"
                onClick={() => void executeDnssecPatch({ status: 'disabled' }, 'Desativação do DNSSEC solicitada.')}
                disabled={dnssecBusy}
              >
                {dnssecBusy ? <Loader2 size={16} className="spin" /> : null}
                Desativar DNSSEC
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
