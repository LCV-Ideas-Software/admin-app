/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Aba "Análises" do módulo CF DNS (DNS-4): série temporal de consultas DNS
 * (total + top-3 responseCodes) e rankings (nomes, tipos, códigos de resposta)
 * da zona selecionada, via dns_analytics. Autocontida como a aba "Zona &
 * DNSSEC": recarrega ao montar e a cada troca de zona/período. Leituras via
 * cfApiFetch; períodos além da retenção do plano ficam desabilitados.
 */

import { AlertTriangle, BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SvgBarChart } from '../../components/charts/SvgBarChart';
import { SvgTimeSeries } from '../../components/charts/SvgTimeSeries';
import { useNotification } from '../../components/Notification';
import type { ApiResult } from '../../lib/apiClient';
import { cfApiErrorMessage } from '../shared/cfApi';
import {
  type BytimeTransform,
  isPeriodAllowed,
  type TopItem,
  toPercentLabel,
  transformBytimeReport,
  transformTopReport,
} from './analyticsHelpers';
import * as api from './api';
import type { DnsAnalyticsPayload, DnsAnalyticsReport } from './types';

const PERIODS = [
  { key: '6h', label: '6h', hours: 6 },
  { key: '24h', label: '24h', hours: 24 },
  { key: '72h', label: '72h', hours: 72 },
  { key: '7d', label: '7 dias', hours: 168 },
  { key: '30d', label: '30 dias', hours: 720 },
] as const;

type PeriodKey = (typeof PERIODS)[number]['key'];

const periodHours = (key: PeriodKey) => PERIODS.find((option) => option.key === key)?.hours ?? 24;

const formatHourTick = (t: number) =>
  new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const formatDayTick = (t: number) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const unwrapAnalytics = (result: ApiResult<DnsAnalyticsPayload>, contexto: string): DnsAnalyticsReport | undefined => {
  if (!result.ok) {
    throw new Error(cfApiErrorMessage(result, contexto));
  }
  if (!result.data.ok) {
    throw new Error(result.data.error ?? `${contexto}.`);
  }
  return result.data.report;
};

type AnalyticsTabProps = {
  selectedZoneId: string;
};

export function AnalyticsTab({ selectedZoneId }: AnalyticsTabProps) {
  const { showNotification } = useNotification();

  const [period, setPeriod] = useState<PeriodKey>('24h');
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [maxWindowHours, setMaxWindowHours] = useState<number | null>(null);
  const retentionCacheRef = useRef(new Map<string, { retentionDays: number; maxWindowHours: number | null }>());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bytime, setBytime] = useState<BytimeTransform | null>(null);
  const [topNames, setTopNames] = useState<TopItem[]>([]);
  const [topTypes, setTopTypes] = useState<TopItem[]>([]);
  const [topCodes, setTopCodes] = useState<TopItem[]>([]);

  // Sequência de requisição: troca rápida de zona/período não pode deixar uma
  // resposta antiga sobrescrever a mais recente.
  const requestSeqRef = useRef(0);

  // Retenção de análises do plano da zona, com cache local por zoneId (mesmo
  // padrão do cache de capacidades do RecordsTab, mas independente dele).
  useEffect(() => {
    if (!selectedZoneId) {
      setRetentionDays(null);
      setMaxWindowHours(null);
      return;
    }

    const cached = retentionCacheRef.current.get(selectedZoneId);
    if (cached != null) {
      setRetentionDays(cached.retentionDays);
      setMaxWindowHours(cached.maxWindowHours);
      return;
    }

    let cancelled = false;
    setRetentionDays(null);
    setMaxWindowHours(null);

    void (async () => {
      const result = await api.fetchZoneCapabilities(selectedZoneId);
      if (cancelled || !result.ok || !result.data.ok) {
        // Limites desconhecidos não bloqueiam a aba: só deixa de desabilitar períodos.
        return;
      }
      const days = result.data.analyticsRetentionDays;
      const windowHours =
        typeof result.data.analyticsMaxWindowHours === 'number' ? result.data.analyticsMaxWindowHours : null;
      if (typeof days === 'number' && days > 0) {
        retentionCacheRef.current.set(selectedZoneId, { retentionDays: days, maxWindowHours: windowHours });
        setRetentionDays(days);
        setMaxWindowHours(windowHours);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedZoneId]);

  // Se os limites carregados invalidam o período atual (ex.: janela de 6h num
  // plano Free), cai para o maior período permitido em vez de consultar uma
  // janela que a CF rejeitaria com o código 1034.
  useEffect(() => {
    if (isPeriodAllowed(periodHours(period), retentionDays, maxWindowHours)) {
      return;
    }
    const largestAllowed = [...PERIODS]
      .reverse()
      .find((option) => isPeriodAllowed(option.hours, retentionDays, maxWindowHours));
    if (largestAllowed && largestAllowed.key !== period) {
      setPeriod(largestAllowed.key);
    }
  }, [retentionDays, maxWindowHours, period]);

  const loadAnalytics = useCallback(
    async (zoneId: string, periodKey: PeriodKey) => {
      const seq = requestSeqRef.current + 1;
      requestSeqRef.current = seq;

      const hours = periodHours(periodKey);
      const untilIso = new Date().toISOString();
      const sinceIso = new Date(Date.now() - hours * 3_600_000).toISOString();

      setLoading(true);
      setError('');
      try {
        const [bytimeResult, namesResult, typesResult, codesResult] = await Promise.all([
          api.fetchDnsAnalyticsBytime(zoneId, sinceIso, untilIso),
          api.fetchDnsAnalyticsTop(zoneId, 'queryName', sinceIso, untilIso),
          api.fetchDnsAnalyticsTop(zoneId, 'queryType', sinceIso, untilIso),
          api.fetchDnsAnalyticsTop(zoneId, 'responseCode', sinceIso, untilIso),
        ]);

        if (requestSeqRef.current !== seq) {
          return;
        }

        setBytime(
          transformBytimeReport(
            unwrapAnalytics(bytimeResult, 'Não foi possível carregar a série temporal de consultas DNS'),
          ),
        );
        setTopNames(
          transformTopReport(unwrapAnalytics(namesResult, 'Não foi possível carregar o top de nomes consultados')),
        );
        setTopTypes(
          transformTopReport(unwrapAnalytics(typesResult, 'Não foi possível carregar o top de tipos de consulta')),
        );
        setTopCodes(
          transformTopReport(unwrapAnalytics(codesResult, 'Não foi possível carregar o top de códigos de resposta')),
        );
      } catch (loadError) {
        if (requestSeqRef.current !== seq) {
          return;
        }
        const message =
          loadError instanceof Error ? loadError.message : 'Não foi possível carregar as análises DNS da zona.';
        setBytime(null);
        setTopNames([]);
        setTopTypes([]);
        setTopCodes([]);
        setError(message);
        showNotification(message, 'error');
      } finally {
        if (requestSeqRef.current === seq) {
          setLoading(false);
        }
      }
    },
    [showNotification],
  );

  useEffect(() => {
    if (!selectedZoneId) {
      setBytime(null);
      setTopNames([]);
      setTopTypes([]);
      setTopCodes([]);
      setError('');
      return;
    }
    void loadAnalytics(selectedZoneId, period);
  }, [selectedZoneId, period, loadAnalytics]);

  const isHourly = periodHours(period) <= 72;
  const hasQueries = (bytime?.totals.queryCount ?? 0) > 0;
  const timeSeries = bytime ? [{ label: 'Total', points: bytime.total }, ...bytime.byResponseCode] : [];

  return (
    <article className="result-card cfdns-analytics-panel">
      <header className="result-header">
        <h4>
          <BarChart3 size={16} /> Análises DNS
        </h4>
        <div className="inline-actions">
          <div className="cfdns-analytics-periods">
            {PERIODS.map((option) => {
              const allowed = isPeriodAllowed(option.hours, retentionDays, maxWindowHours);
              const beyondWindow = maxWindowHours != null && option.hours > maxWindowHours;
              const blockedTitle = beyondWindow
                ? `Além da janela do seu plano (máx. ${maxWindowHours}h por consulta)`
                : `Além da retenção do seu plano (${retentionDays} dias)`;
              return (
                <button
                  key={option.key}
                  type="button"
                  className={period === option.key ? 'primary-button' : 'ghost-button'}
                  onClick={() => setPeriod(option.key)}
                  disabled={loading || !allowed}
                  title={allowed ? undefined : blockedTitle}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => void loadAnalytics(selectedZoneId, period)}
            disabled={!selectedZoneId || loading}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            Atualizar
          </button>
        </div>
      </header>

      {!selectedZoneId ? (
        <p className="result-empty">Selecione uma zona para ver as análises DNS.</p>
      ) : error ? (
        <article className="integrity-banner integrity-banner--warning">
          <header className="integrity-banner__header">
            <AlertTriangle size={16} />
            <strong>Análises indisponíveis</strong>
          </header>
          <p className="field-hint">{error}</p>
          <div className="inline-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => void loadAnalytics(selectedZoneId, period)}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Tentar novamente
            </button>
          </div>
        </article>
      ) : loading || bytime == null ? (
        <div className="cfdns-analytics-loading">
          <div className="cfdns-analytics-skeleton cfdns-analytics-skeleton--kpis" />
          <div className="cfdns-analytics-skeleton" />
          <div className="cfdns-analytics-grid">
            <div className="cfdns-analytics-skeleton" />
            <div className="cfdns-analytics-skeleton" />
            <div className="cfdns-analytics-skeleton" />
          </div>
        </div>
      ) : (
        <>
          <div className="cfdns-analytics-kpis">
            <div className="cfdns-analytics-kpi">
              <span>Total de consultas</span>
              <strong>{bytime.totals.queryCount.toLocaleString('pt-BR')}</strong>
            </div>
            <div className="cfdns-analytics-kpi">
              <span>% uncached</span>
              <strong>{toPercentLabel(bytime.totals.uncachedCount, bytime.totals.queryCount)}</strong>
            </div>
            <div className="cfdns-analytics-kpi">
              <span>% stale</span>
              <strong>{toPercentLabel(bytime.totals.staleCount, bytime.totals.queryCount)}</strong>
            </div>
          </div>

          <div className="cfdns-analytics-card">
            <h5>Consultas DNS</h5>
            {hasQueries ? (
              <SvgTimeSeries
                series={timeSeries}
                ariaLabel="Consultas DNS por intervalo (total e top responseCodes)"
                formatTime={isHourly ? formatHourTick : formatDayTick}
              />
            ) : (
              <p className="result-empty">Sem consultas no período.</p>
            )}
          </div>

          <div className="cfdns-analytics-grid">
            <div className="cfdns-analytics-card">
              <h5>Top nomes consultados</h5>
              <SvgBarChart items={topNames} ariaLabel="Top nomes consultados" />
            </div>
            <div className="cfdns-analytics-card">
              <h5>Top tipos</h5>
              <SvgBarChart items={topTypes} ariaLabel="Top tipos de consulta" />
            </div>
            <div className="cfdns-analytics-card">
              <h5>Top códigos de resposta</h5>
              <SvgBarChart items={topCodes} ariaLabel="Top códigos de resposta" />
            </div>
          </div>
        </>
      )}
    </article>
  );
}
