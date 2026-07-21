/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Shell do módulo CF DNS: seletor de zona, chip de status e barra de abas
 * ("Registros" / "Zona & DNSSEC" / "Registrar", padrão de abas do CfPwModule).
 * O estado de Registros/Registrar vive nos controllers (useRecordsController /
 * useRegistrarController) chamados aqui, de modo que o chip de status, o
 * seletor de zona e o polling do Registrar se comportem exatamente como antes
 * do split em abas. A aba "Zona & DNSSEC" (DNS-3) é autocontida e recarrega ao
 * ser montada.
 */

import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNotification } from '../../components/Notification';
import { AnalyticsTab } from './AnalyticsTab';
import * as api from './api';
import './CfDnsModule.css';
import { RecordsTab, useRecordsController } from './RecordsTab';
import { RegistrarTab, useRegistrarController } from './RegistrarTab';
import { SettingsTab } from './SettingsTab';
import type { ZoneItem } from './types';

export function CfDnsModule() {
  const { showNotification } = useNotification();
  const [adminActor] = useState('admin@app.lcv');

  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);

  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [selectedZoneName, setSelectedZoneName] = useState('');

  const [activeTab, setActiveTab] = useState<'registros' | 'analises' | 'zona' | 'registrar'>('registros');

  const zoneContextLabel = useMemo(() => {
    const zoneName = selectedZoneName.trim();
    if (zoneName) {
      return zoneName;
    }

    const zoneId = selectedZoneId.trim();
    if (zoneId) {
      return `zone_id:${zoneId}`;
    }

    return 'não selecionada';
  }, [selectedZoneId, selectedZoneName]);

  const loadZones = useCallback(
    async (shouldNotify = false) => {
      setZonesLoading(true);
      try {
        const { response, payload } = await api.fetchZones(adminActor);

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Falha ao carregar domínios da Cloudflare.');
        }

        const nextZones = Array.isArray(payload.zones) ? payload.zones : [];
        setZones(nextZones);

        const firstZone = nextZones[0];
        if (!selectedZoneId && firstZone) {
          setSelectedZoneId(firstZone.id);
          setSelectedZoneName(firstZone.name);
        }

        if (shouldNotify) {
          showNotification(api.withReq('Domínios DNS atualizados.', payload), 'success');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível carregar os domínios da Cloudflare.';
        showNotification(message, 'error');
      } finally {
        setZonesLoading(false);
      }
    },
    [adminActor, selectedZoneId, showNotification],
  );

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  const registrar = useRegistrarController({ adminActor, zones, selectedZoneName });
  const records = useRecordsController({ adminActor, selectedZoneId, zoneContextLabel });

  const handleZoneChange = (zoneId: string) => {
    const zone = zones.find((item) => item.id === zoneId);
    setSelectedZoneId(zoneId);
    setSelectedZoneName(zone?.name ?? '');
    registrar.resetForZoneChange();
    records.resetForZoneChange();
  };

  const statusTone = useMemo(() => {
    if (
      zonesLoading ||
      records.recordsLoading ||
      registrar.registrarLoading ||
      registrar.registrarLookupLoading ||
      registrar.registrarActionLoading ||
      records.saving ||
      records.deletingId
    ) {
      return 'warning';
    }
    if (!selectedZoneId) {
      return 'idle';
    }
    if (records.operationalAlerts.length > 0) {
      return 'warning';
    }
    return 'ok';
  }, [
    records.deletingId,
    records.operationalAlerts.length,
    records.recordsLoading,
    registrar.registrarActionLoading,
    registrar.registrarLoading,
    registrar.registrarLookupLoading,
    records.saving,
    selectedZoneId,
    zonesLoading,
  ]);

  const statusLabel = useMemo(() => {
    if (
      zonesLoading ||
      records.recordsLoading ||
      registrar.registrarLoading ||
      registrar.registrarLookupLoading ||
      registrar.registrarActionLoading ||
      records.saving ||
      records.deletingId
    ) {
      return 'Processando...';
    }
    if (!selectedZoneId) {
      return 'Aguardando domínio';
    }
    if (records.operationalAlerts.length > 0) {
      return `${records.operationalAlerts.length} alerta(s)`;
    }
    return 'Sincronizado';
  }, [
    records.deletingId,
    records.operationalAlerts.length,
    records.recordsLoading,
    registrar.registrarActionLoading,
    registrar.registrarLoading,
    registrar.registrarLookupLoading,
    records.saving,
    selectedZoneId,
    zonesLoading,
  ]);

  return (
    <section className="detail-panel module-shell module-shell-cfdns">
      <div className="detail-header">
        <div className="detail-icon">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h3>CF DNS — Gerenciamento de Zonas e Registros</h3>
        </div>
        <span className={`ops-status-chip ops-status-chip--${statusTone}`}>
          <span className="ops-status-chip__dot" />
          {statusLabel}
        </span>
      </div>

      <article className="form-card">
        <div className="result-toolbar">
          <div>
            <h4>
              <RefreshCw size={16} /> Zona ativa e filtros
            </h4>
            <p className="field-hint">
              Selecione o domínio Cloudflare e filtre por tipo/nome para localizar registros rapidamente.
            </p>
          </div>
          <div className="inline-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => void loadZones(true)}
              disabled={zonesLoading || records.recordsLoading || records.saving}
            >
              {zonesLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Atualizar domínios
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() =>
                void records.loadRecords(selectedZoneId, {
                  shouldNotify: true,
                  pageOverride: records.page,
                })
              }
              disabled={!selectedZoneId || records.recordsLoading || records.saving}
            >
              {records.recordsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Atualizar registros
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="cfdns-zone">Domínio / Zona</label>
            <select
              id="cfdns-zone"
              name="cfDnsZone"
              value={selectedZoneId}
              onChange={(event) => handleZoneChange(event.target.value)}
              disabled={zonesLoading || records.recordsLoading || records.saving}
            >
              <option value="">Selecione um domínio...</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                  {registrar.registrarByDomain.has(zone.name.trim().toLowerCase()) ? ' · Registrar' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="cfdns-zone-id">Zone ID</label>
            <input id="cfdns-zone-id" name="cfDnsZoneId" value={selectedZoneId} readOnly />
          </div>
        </div>
      </article>

      <div className="page-tab-nav">
        <button
          type="button"
          className={`page-tab-item ${activeTab === 'registros' ? 'active' : ''}`}
          onClick={() => setActiveTab('registros')}
        >
          Registros
        </button>
        <button
          type="button"
          className={`page-tab-item ${activeTab === 'analises' ? 'active' : ''}`}
          onClick={() => setActiveTab('analises')}
        >
          Análises
        </button>
        <button
          type="button"
          className={`page-tab-item ${activeTab === 'zona' ? 'active' : ''}`}
          onClick={() => setActiveTab('zona')}
        >
          Zona &amp; DNSSEC
        </button>
        <button
          type="button"
          className={`page-tab-item ${activeTab === 'registrar' ? 'active' : ''}`}
          onClick={() => setActiveTab('registrar')}
        >
          Registrar
        </button>
      </div>

      {activeTab === 'registros' && (
        <RecordsTab controller={records} selectedZoneId={selectedZoneId} selectedZoneName={selectedZoneName} />
      )}

      {activeTab === 'analises' && <AnalyticsTab selectedZoneId={selectedZoneId} />}

      {activeTab === 'zona' && (
        <SettingsTab
          adminActor={adminActor}
          selectedZoneId={selectedZoneId}
          selectedZoneName={selectedZoneName}
          onZonesChanged={() => void loadZones()}
        />
      )}

      {activeTab === 'registrar' && (
        <RegistrarTab
          controller={registrar}
          zones={zones}
          selectedZoneName={selectedZoneName}
          onZoneChange={handleZoneChange}
        />
      )}
    </section>
  );
}
