/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Aba "Registrar" do módulo CF DNS: painel Cloudflare Registrar completo
 * (busca/checagem, registro billable, ajustes de auto-renew/lock/privacidade)
 * com seus modais e a lógica de polling de workflow (registrarWorkflow.ts).
 * O estado vive em useRegistrarController (chamado pelo shell CfDnsModule)
 * para que o polling e os dados sobrevivam à troca de aba — comportamento
 * movido verbatim de CfDnsModule.tsx.
 */

/* eslint-disable react-refresh/only-export-components -- Padrão controller-hook + componente de aba (mesmo racional de Notification.tsx): o estado precisa viver no shell para preservar chip/polling entre abas. */

import {
  AlertTriangle,
  ArrowRightLeft,
  CalendarClock,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNotification } from '../../components/Notification';
import * as api from './api';
import {
  buildRegistrantContacts,
  EMPTY_REGISTRANT_CONTACT_DRAFT,
  getExpiryBadge,
  type RegistrantContactDraft,
} from './registrarHelpers';
import {
  classifyRegistrarWorkflowState,
  extractRegistrarWorkflowAction,
  shouldStopRegistrarPolling,
} from './registrarWorkflow';
import type {
  RegistrarAccount,
  RegistrarAvailability,
  RegistrarRegistration,
  RegistrarRegistrationDetailPayload,
  RegistrarSettingsPatch,
  RegistrarWorkflowStatus,
  ZoneItem,
} from './types';
import {
  formatDateTime,
  formatRegistrarBoolean,
  formatRegistrarDate,
  formatRegistrarPrice,
  formatRegistrarReason,
  formatWorkflowState,
  getDaysUntil,
  normalizeDomainInput,
  splitRegistrarDomains,
  splitRegistrarExtensions,
  toIntOrFallback,
} from './validators';

type RegistrarControllerArgs = {
  adminActor: string;
  zones: ZoneItem[];
  selectedZoneName: string;
};

export function useRegistrarController({ adminActor, zones, selectedZoneName }: RegistrarControllerArgs) {
  const { showNotification } = useNotification();

  const [registrarRegistrations, setRegistrarRegistrations] = useState<RegistrarRegistration[]>([]);
  const [registrarAccount, setRegistrarAccount] = useState<RegistrarAccount | null>(null);
  const [registrarLoading, setRegistrarLoading] = useState(false);
  const [registrarError, setRegistrarError] = useState('');
  const [registrarQuery, setRegistrarQuery] = useState('');
  const [registrarExtensions, setRegistrarExtensions] = useState('com,net,org,app,dev,cloud,tech,online');
  const [registrarYears, setRegistrarYears] = useState('1');
  const [registrarCreateAutoRenew, setRegistrarCreateAutoRenew] = useState(true);
  const [registrarCreatePrivacyMode, setRegistrarCreatePrivacyMode] = useState<'redaction' | 'off'>('redaction');
  const [registrarSearchResults, setRegistrarSearchResults] = useState<RegistrarAvailability[]>([]);
  const [registrarCheckResults, setRegistrarCheckResults] = useState<RegistrarAvailability[]>([]);
  const [registrarLookupLoading, setRegistrarLookupLoading] = useState(false);
  const [registrarActionLoading, setRegistrarActionLoading] = useState('');
  const [registrarRegistrationStatus, setRegistrarRegistrationStatus] = useState<RegistrarWorkflowStatus | null>(null);
  const [registrarUpdateStatus, setRegistrarUpdateStatus] = useState<RegistrarWorkflowStatus | null>(null);
  const [pendingRegistrarCreate, setPendingRegistrarCreate] = useState<RegistrarAvailability | null>(null);
  const [pendingRegistrarSettings, setPendingRegistrarSettings] = useState<RegistrarSettingsPatch | null>(null);

  // DNS-4: contato opcional do registrante (accordion do modal de registro) e
  // drawer de detalhes de uma registration.
  const [registrarContactDraft, setRegistrarContactDraft] =
    useState<RegistrantContactDraft>(EMPTY_REGISTRANT_CONTACT_DRAFT);
  const [registrarDetail, setRegistrarDetail] = useState<{
    domain: string;
    loading: boolean;
    payload: RegistrarRegistrationDetailPayload | null;
  } | null>(null);

  // Codex P2: domínio do auto-poll de registro ativo. O poll só escreve em
  // `registrarRegistrationStatus` enquanto esta ref bater com o seu domínio;
  // `handleZoneChange` a limpa, evitando que o status de um domínio antigo
  // sobrescreva o painel de uma zona recém-selecionada.
  const registrationPollDomainRef = useRef('');

  const registrarByDomain = useMemo(() => {
    const map = new Map<string, RegistrarRegistration>();
    for (const registration of registrarRegistrations) {
      const domain = String(registration.domain_name ?? '')
        .trim()
        .toLowerCase();
      if (domain) {
        map.set(domain, registration);
      }
    }
    return map;
  }, [registrarRegistrations]);

  const registrarCheckByDomain = useMemo(() => {
    const map = new Map<string, RegistrarAvailability>();
    for (const domain of registrarCheckResults) {
      if (domain.name) {
        map.set(domain.name, domain);
      }
    }
    return map;
  }, [registrarCheckResults]);

  const registrarSuggestionRows = useMemo(() => {
    const rows = registrarSearchResults.length > 0 ? registrarSearchResults : registrarCheckResults;
    const seen = new Set<string>();
    return rows.filter((domain) => {
      if (!domain.name || seen.has(domain.name)) {
        return false;
      }
      seen.add(domain.name);
      return true;
    });
  }, [registrarCheckResults, registrarSearchResults]);

  const selectedRegistration = useMemo(() => {
    const domain = selectedZoneName.trim().toLowerCase();
    if (!domain) {
      return null;
    }
    return registrarByDomain.get(domain) ?? null;
  }, [registrarByDomain, selectedZoneName]);

  const registeredZoneCount = useMemo(
    () => zones.filter((zone) => registrarByDomain.has(zone.name.trim().toLowerCase())).length,
    [registrarByDomain, zones],
  );

  const selectedRegistrationDaysUntilExpiry = useMemo(
    () => getDaysUntil(selectedRegistration?.expires_at),
    [selectedRegistration?.expires_at],
  );

  const registrarDashboardUrl = useMemo(() => {
    const accountId = String(registrarAccount?.accountId ?? '').trim();
    if (!accountId) {
      return '';
    }
    return `https://dash.cloudflare.com/${accountId}/domains/registrations`;
  }, [registrarAccount?.accountId]);

  const loadRegistrarRegistrations = useCallback(
    async (shouldNotify = false) => {
      setRegistrarLoading(true);
      setRegistrarError('');
      try {
        const { response, payload } = await api.fetchRegistrarRegistrations(adminActor);

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Falha ao carregar Cloudflare Registrar.');
        }

        const nextRegistrations = Array.isArray(payload.registrations) ? payload.registrations : [];
        setRegistrarAccount(payload.account ?? null);
        setRegistrarRegistrations(nextRegistrations);

        if (shouldNotify) {
          showNotification(api.withReq('Cloudflare Registrar atualizado.', payload), 'success');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível carregar Cloudflare Registrar.';
        setRegistrarError(message);
        showNotification(message, 'error');
      } finally {
        setRegistrarLoading(false);
      }
    },
    [adminActor, showNotification],
  );

  useEffect(() => {
    void loadRegistrarRegistrations();
  }, [loadRegistrarRegistrations]);

  // Reset aplicado pelo shell ao trocar de zona (mesmas escritas do antigo
  // handleZoneChange que pertenciam à seção do Registrar).
  const resetForZoneChange = () => {
    // Codex P2: invalida qualquer auto-poll em andamento ao trocar de zona.
    registrationPollDomainRef.current = '';
    setRegistrarRegistrationStatus(null);
    setRegistrarUpdateStatus(null);
  };

  const searchRegistrarDomains = useCallback(async () => {
    const q = registrarQuery.trim();
    if (!q) {
      showNotification('Informe uma marca, termo ou domínio para buscar.', 'error');
      return;
    }

    setRegistrarLookupLoading(true);
    setRegistrarError('');
    try {
      const extensions = splitRegistrarExtensions(registrarExtensions);
      const { response, payload } = await api.searchRegistrarDomains(adminActor, q, extensions);

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao buscar domínios no Cloudflare Registrar.');
      }

      setRegistrarAccount(payload.account ?? registrarAccount);
      setRegistrarSearchResults(Array.isArray(payload.domains) ? payload.domains : []);
      setRegistrarCheckResults([]);
      showNotification(api.withReq('Busca Registrar concluída.', payload), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível buscar domínios no Registrar.';
      setRegistrarError(message);
      showNotification(message, 'error');
    } finally {
      setRegistrarLookupLoading(false);
    }
  }, [adminActor, registrarAccount, registrarExtensions, registrarQuery, showNotification]);

  const checkRegistrarDomains = useCallback(
    async (domainsOverride?: string[]) => {
      const domains = domainsOverride?.length
        ? domainsOverride.map(normalizeDomainInput).filter(Boolean)
        : splitRegistrarDomains(registrarQuery);

      if (domains.length === 0) {
        showNotification('Informe domínio(s) completo(s) para checagem.', 'error');
        return [];
      }

      setRegistrarLookupLoading(true);
      setRegistrarError('');
      try {
        const { response, payload } = await api.checkRegistrarDomains(adminActor, domains.slice(0, 20));

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Falha ao checar disponibilidade no Cloudflare Registrar.');
        }

        const nextDomains = Array.isArray(payload.domains) ? payload.domains : [];
        const skippedDomains = Array.isArray(payload.skipped) ? payload.skipped : [];
        setRegistrarAccount(payload.account ?? registrarAccount);
        setRegistrarCheckResults(nextDomains);
        if (skippedDomains.length > 0) {
          showNotification(
            api.withReq(
              `Checagem concluída; ${skippedDomains.length} entrada(s) ignorada(s) por formato inválido: ${skippedDomains.join(', ')}.`,
              payload,
            ),
            'info',
          );
        } else {
          showNotification(api.withReq('Checagem Registrar concluída.', payload), 'success');
        }
        return nextDomains;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível checar domínios no Registrar.';
        setRegistrarError(message);
        showNotification(message, 'error');
        return [];
      } finally {
        setRegistrarLookupLoading(false);
      }
    },
    [adminActor, registrarAccount, registrarQuery, showNotification],
  );

  const loadRegistrarStatuses = useCallback(
    async (domainName: string, shouldNotify = false) => {
      const domain = normalizeDomainInput(domainName);
      if (!domain) {
        return;
      }

      setRegistrarActionLoading(`status:${domain}`);
      try {
        const { registrationResponse, registrationPayload, updateResponse, updatePayload } =
          await api.fetchRegistrarWorkflowStatuses(adminActor, domain);

        if (!registrationResponse.ok || !registrationPayload.ok) {
          throw new Error(registrationPayload.error ?? 'Falha ao consultar workflow de registro.');
        }
        if (!updateResponse.ok || !updatePayload.ok) {
          throw new Error(updatePayload.error ?? 'Falha ao consultar workflow de atualização.');
        }

        setRegistrarRegistrationStatus(registrationPayload.status ?? null);
        setRegistrarUpdateStatus(updatePayload.status ?? null);

        if (shouldNotify) {
          const missingWorkflows = registrationPayload.workflow_missing && updatePayload.workflow_missing;
          showNotification(
            api.withReq(
              missingWorkflows
                ? 'Nenhum workflow Registrar ativo para este domínio.'
                : 'Workflows Registrar atualizados.',
              updatePayload,
            ),
            missingWorkflows ? 'info' : 'success',
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível consultar workflows Registrar.';
        showNotification(message, 'error');
      } finally {
        setRegistrarActionLoading('');
      }
    },
    [adminActor, showNotification],
  );

  const updateRegistrarContactField = (field: keyof RegistrantContactDraft, value: string) => {
    setRegistrarContactDraft((current) => ({ ...current, [field]: value }));
  };

  // DNS-4: abre o drawer de detalhes com o GET por domínio + os dois workflows.
  const openRegistrarDetails = useCallback(
    async (domainName: string) => {
      const domain = normalizeDomainInput(domainName);
      if (!domain) {
        return;
      }

      setRegistrarDetail({ domain, loading: true, payload: null });
      void loadRegistrarStatuses(domain);
      try {
        const { response, payload } = await api.fetchRegistrarRegistrationDetail(adminActor, domain);

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Falha ao consultar detalhes do registro Registrar.');
        }

        setRegistrarDetail((current) => (current?.domain === domain ? { domain, loading: false, payload } : current));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível carregar os detalhes do registro.';
        showNotification(message, 'error');
        setRegistrarDetail((current) =>
          current?.domain === domain ? { domain, loading: false, payload: null } : current,
        );
      }
    },
    [adminActor, loadRegistrarStatuses, showNotification],
  );

  const closeRegistrarDetails = () => setRegistrarDetail(null);

  const pollRegistrarRegistrationStatus = useCallback(
    async (domainName: string) => {
      const domain = normalizeDomainInput(domainName);
      if (!domain) {
        return;
      }

      // Codex P2: marca este domínio como alvo do poll ativo.
      registrationPollDomainRef.current = domain;

      // Polling limitado pós-criação: o registro sempre inicia assíncrono
      // (Prefer: respond-async). Para nos estados que não avançam sozinhos.
      const MAX_POLLS = 6;
      const INTERVAL_MS = 3000;

      for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
        await new Promise((resolve) => {
          setTimeout(resolve, INTERVAL_MS);
        });

        try {
          const { response, payload } = await api.fetchRegistrationStatus(adminActor, domain);

          if (!response.ok || !payload.ok) {
            break;
          }

          // Codex P2: se o operador trocou de zona durante o poll, não
          // sobrescreve o painel do domínio agora selecionado — encerra.
          if (registrationPollDomainRef.current !== domain) {
            break;
          }

          const status = payload.status ?? null;
          setRegistrarRegistrationStatus(status);

          if (status?.completed || shouldStopRegistrarPolling(status?.state)) {
            if (classifyRegistrarWorkflowState(status?.state) === 'succeeded') {
              await loadRegistrarRegistrations();
            }
            break;
          }
        } catch {
          // Polling é best-effort; o operador ainda pode usar o botão "Status".
          break;
        }
      }
    },
    [adminActor, loadRegistrarRegistrations],
  );

  const handleRegistrarCheckFromSearch = (domainName: string) => {
    void checkRegistrarDomains([domainName]);
  };

  const handleRegistrarCreateRequest = (domain: RegistrarAvailability) => {
    const checked = registrarCheckByDomain.get(domain.name) ?? domain;
    if (!checked.registrable) {
      showNotification('Domínio não registrável pela API do Registrar.', 'error');
      return;
    }
    if (checked.tier === 'premium') {
      showNotification('Registro premium não é suportado pela API do Registrar.', 'error');
      return;
    }
    setPendingRegistrarCreate(checked);
  };

  const executeRegistrarCreate = async () => {
    const target = pendingRegistrarCreate;
    if (!target) {
      return;
    }

    setPendingRegistrarCreate(null);
    setRegistrarActionLoading(`create:${target.name}`);
    try {
      const freshCheck = await checkRegistrarDomains([target.name]);
      const checked = freshCheck.find((domain) => domain.name === target.name);
      if (!checked?.registrable || checked.tier === 'premium') {
        throw new Error('Checagem autoritativa bloqueou o registro. Domínio indisponível, premium ou não suportado.');
      }

      // DNS-4: contato do registrante é opcional — com todos os campos vazios
      // omitimos `contacts` e a Cloudflare usa o address book padrão da conta.
      const contacts = buildRegistrantContacts(registrarContactDraft);
      const { response, payload } = await api.createRegistrarRegistration(adminActor, {
        domain_name: target.name,
        years: toIntOrFallback(registrarYears, 1),
        auto_renew: registrarCreateAutoRenew,
        privacy_mode: registrarCreatePrivacyMode,
        ...(contacts !== undefined ? { contacts } : {}),
      });

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao registrar domínio no Cloudflare Registrar.');
      }

      setRegistrarAccount(payload.account ?? registrarAccount);
      setRegistrarRegistrationStatus(payload.status ?? null);
      await loadRegistrarRegistrations();
      showNotification(api.withReq(`Workflow de registro iniciado para ${target.name}.`, payload), 'success');

      // O registro inicia assíncrono: acompanha o workflow até um estado
      // terminal sem exigir clique manual em "Status".
      if (!shouldStopRegistrarPolling(payload.status?.state)) {
        void pollRegistrarRegistrationStatus(target.name);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível registrar o domínio.';
      showNotification(message, 'error');
    } finally {
      setRegistrarActionLoading('');
    }
  };

  const queueRegistrarSettingsPatch = (patch: RegistrarSettingsPatch) => {
    if (!patch.domain) {
      showNotification('Selecione um domínio registrado.', 'error');
      return;
    }
    setPendingRegistrarSettings(patch);
  };

  const executeRegistrarSettingsPatch = async () => {
    const patch = pendingRegistrarSettings;
    if (!patch) {
      return;
    }

    setPendingRegistrarSettings(null);
    setRegistrarActionLoading(`settings:${patch.domain}`);
    try {
      if (patch.kind === 'registration') {
        // auto_renew passa pelo PATCH do workflow /registrar/registrations.
        const { response, payload } = await api.patchRegistrarRegistration(adminActor, patch.domain, {
          auto_renew: patch.auto_renew,
        });

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Falha ao atualizar Cloudflare Registrar.');
        }

        setRegistrarUpdateStatus(payload.status ?? null);
        await loadRegistrarRegistrations();
        await loadRegistrarStatuses(patch.domain);
        showNotification(api.withReq(`${patch.label} aplicado em ${patch.domain}.`, payload), 'success');
        return;
      }

      // lock de transferência e privacidade WHOIS passam pelo PUT legado
      // /registrar/domains — o PATCH de registrations não aceita esses campos.
      const body: { locked?: boolean; privacy?: boolean } = {};
      if (typeof patch.locked === 'boolean') {
        body.locked = patch.locked;
      }
      if (typeof patch.privacy === 'boolean') {
        body.privacy = patch.privacy;
      }
      const { response, payload } = await api.putRegistrarDomain(adminActor, patch.domain, body);

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao atualizar domínio Registrar.');
      }

      await loadRegistrarRegistrations();
      showNotification(api.withReq(`${patch.label} aplicado em ${patch.domain}.`, payload), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar Registrar.';
      showNotification(message, 'error');
    } finally {
      setRegistrarActionLoading('');
    }
  };

  return {
    registrarRegistrations,
    registrarLoading,
    registrarError,
    registrarQuery,
    setRegistrarQuery,
    registrarExtensions,
    setRegistrarExtensions,
    registrarYears,
    setRegistrarYears,
    registrarCreateAutoRenew,
    setRegistrarCreateAutoRenew,
    registrarCreatePrivacyMode,
    setRegistrarCreatePrivacyMode,
    registrarLookupLoading,
    registrarActionLoading,
    registrarRegistrationStatus,
    registrarUpdateStatus,
    pendingRegistrarCreate,
    setPendingRegistrarCreate,
    pendingRegistrarSettings,
    setPendingRegistrarSettings,
    registrarContactDraft,
    updateRegistrarContactField,
    registrarDetail,
    openRegistrarDetails,
    closeRegistrarDetails,
    registrarByDomain,
    registrarCheckByDomain,
    registrarSuggestionRows,
    selectedRegistration,
    registeredZoneCount,
    selectedRegistrationDaysUntilExpiry,
    registrarDashboardUrl,
    loadRegistrarRegistrations,
    resetForZoneChange,
    searchRegistrarDomains,
    checkRegistrarDomains,
    loadRegistrarStatuses,
    handleRegistrarCheckFromSearch,
    handleRegistrarCreateRequest,
    executeRegistrarCreate,
    queueRegistrarSettingsPatch,
    executeRegistrarSettingsPatch,
  };
}

export type RegistrarController = ReturnType<typeof useRegistrarController>;

type RegistrarTabProps = {
  controller: RegistrarController;
  zones: ZoneItem[];
  selectedZoneName: string;
  onZoneChange: (zoneId: string) => void;
};

export function RegistrarTab({ controller, zones, selectedZoneName, onZoneChange }: RegistrarTabProps) {
  const {
    registrarRegistrations,
    registrarLoading,
    registrarError,
    registrarQuery,
    setRegistrarQuery,
    registrarExtensions,
    setRegistrarExtensions,
    registrarYears,
    setRegistrarYears,
    registrarCreateAutoRenew,
    setRegistrarCreateAutoRenew,
    registrarCreatePrivacyMode,
    setRegistrarCreatePrivacyMode,
    registrarLookupLoading,
    registrarActionLoading,
    registrarRegistrationStatus,
    registrarUpdateStatus,
    pendingRegistrarCreate,
    setPendingRegistrarCreate,
    pendingRegistrarSettings,
    setPendingRegistrarSettings,
    registrarContactDraft,
    updateRegistrarContactField,
    registrarDetail,
    openRegistrarDetails,
    closeRegistrarDetails,
    registrarCheckByDomain,
    registrarSuggestionRows,
    selectedRegistration,
    registeredZoneCount,
    selectedRegistrationDaysUntilExpiry,
    registrarDashboardUrl,
    loadRegistrarRegistrations,
    searchRegistrarDomains,
    checkRegistrarDomains,
    loadRegistrarStatuses,
    handleRegistrarCheckFromSearch,
    handleRegistrarCreateRequest,
    executeRegistrarCreate,
    queueRegistrarSettingsPatch,
    executeRegistrarSettingsPatch,
  } = controller;

  // DNS-4: deep-links do dashboard (renovação/transferência não têm API pública).
  const renewUrl = registrarDashboardUrl || 'https://dash.cloudflare.com/?to=/:account/domains/registrations';
  const transferUrl = 'https://dash.cloudflare.com/?to=/:account/domains/transfer';

  const renderRegistrarWorkflow = (label: string, status: RegistrarWorkflowStatus | null) => {
    const category = classifyRegistrarWorkflowState(status?.state);
    const action = extractRegistrarWorkflowAction(status?.context);

    return (
      <div className={`cfdns-registrar-workflow-item cfdns-registrar-workflow-item--${category}`}>
        <span>{label}</span>
        <strong>{formatWorkflowState(status)}</strong>
        <small>{formatDateTime(status?.updated_at)}</small>
        {category === 'action_required' ? (
          <small className="cfdns-registrar-workflow-note cfdns-registrar-workflow-note--alert">
            <AlertTriangle size={12} /> Ação necessária do usuário{action ? `: ${action}` : ''}. O workflow não avança
            sozinho.
          </small>
        ) : null}
        {category === 'blocked' ? (
          <small className="cfdns-registrar-workflow-note">
            Bloqueado por terceiro (registro do TLD ou registrar de origem). Pode resolver sem ação sua.
          </small>
        ) : null}
        {category === 'failed' ? (
          <small className="cfdns-registrar-workflow-note cfdns-registrar-workflow-note--alert">
            <AlertTriangle size={12} /> Workflow falhou. Revise o motivo antes de tentar novamente.
          </small>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <article className="result-card cfdns-registrar-panel">
        <header className="result-header">
          <h4>
            <LockKeyhole size={16} /> Cloudflare Registrar
          </h4>
          <div className="inline-actions">
            <span>
              {registeredZoneCount}/{zones.length} zona(s) registradas · {registrarRegistrations.length} domínio(s)
            </span>
            <button
              type="button"
              className="ghost-button"
              onClick={() => void loadRegistrarRegistrations(true)}
              disabled={registrarLoading || Boolean(registrarActionLoading)}
            >
              {registrarLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Atualizar Registrar
            </button>
            {registrarDashboardUrl ? (
              <a className="ghost-button" href={registrarDashboardUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                Dashboard
              </a>
            ) : null}
          </div>
        </header>

        {registrarError ? (
          <article className="integrity-banner integrity-banner--warning">
            <header className="integrity-banner__header">
              <AlertTriangle size={16} />
              <strong>Registrar indisponível</strong>
            </header>
            <p className="field-hint">{registrarError}</p>
          </article>
        ) : null}

        <div className="cfdns-registrar-controls">
          <div className="field-group cfdns-registrar-query">
            <label htmlFor="cfdns-registrar-query">Busca / checagem</label>
            <input
              id="cfdns-registrar-query"
              name="cfDnsRegistrarQuery"
              type="text"
              autoComplete="off"
              placeholder="marca, termo ou dominio.com"
              value={registrarQuery}
              onChange={(event) => setRegistrarQuery(event.target.value.toLowerCase())}
              disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="cfdns-registrar-extensions">TLDs</label>
            <input
              id="cfdns-registrar-extensions"
              name="cfDnsRegistrarExtensions"
              type="text"
              autoComplete="off"
              value={registrarExtensions}
              onChange={(event) => setRegistrarExtensions(event.target.value)}
              disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="cfdns-registrar-years">Anos</label>
            <input
              id="cfdns-registrar-years"
              name="cfDnsRegistrarYears"
              type="number"
              min={1}
              max={10}
              value={registrarYears}
              onChange={(event) => setRegistrarYears(event.target.value)}
              disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="cfdns-registrar-new-autorenew">Auto-renew inicial</label>
            <select
              id="cfdns-registrar-new-autorenew"
              name="cfDnsRegistrarNewAutoRenew"
              value={registrarCreateAutoRenew ? 'true' : 'false'}
              onChange={(event) => setRegistrarCreateAutoRenew(event.target.value === 'true')}
              disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="cfdns-registrar-new-privacy">Privacidade inicial</label>
            <select
              id="cfdns-registrar-new-privacy"
              name="cfDnsRegistrarNewPrivacy"
              value={registrarCreatePrivacyMode}
              onChange={(event) => setRegistrarCreatePrivacyMode(event.target.value as 'redaction' | 'off')}
              disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
            >
              <option value="redaction">redaction</option>
              <option value="off">off</option>
            </select>
          </div>

          <div className="cfdns-registrar-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => void searchRegistrarDomains()}
              disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
            >
              {registrarLookupLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Buscar
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void checkRegistrarDomains()}
              disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
            >
              {registrarLookupLoading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
              Checar
            </button>
          </div>
        </div>

        {registrarSuggestionRows.length > 0 && (
          <div className="cfdns-table-wrap cfdns-registrar-table-wrap">
            <table className="cfdns-table cfdns-registrar-table">
              <thead>
                <tr>
                  <th>Domínio</th>
                  <th>Disponível</th>
                  <th>Preço</th>
                  <th>Tier / razão</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {registrarSuggestionRows.map((domain) => {
                  const checked = registrarCheckByDomain.get(domain.name);
                  const effective = checked ?? domain;
                  const canRegister = Boolean(checked?.registrable && checked.tier !== 'premium');
                  const isCreating = registrarActionLoading === `create:${domain.name}`;

                  return (
                    <tr key={domain.name}>
                      <td>{domain.name}</td>
                      <td>{checked ? (checked.registrable ? 'Sim' : 'Não') : domain.registrable ? 'Provável' : '—'}</td>
                      <td>{formatRegistrarPrice(effective.pricing)}</td>
                      <td>
                        {effective.tier ?? '—'} / {formatRegistrarReason(effective.reason)}
                      </td>
                      <td>
                        <div className="cfdns-row-actions">
                          <button
                            type="button"
                            className="ghost-button cfrow-action-btn"
                            onClick={() => handleRegistrarCheckFromSearch(domain.name)}
                            disabled={registrarLookupLoading || Boolean(registrarActionLoading)}
                          >
                            <ShieldCheck size={13} />
                            Checar
                          </button>
                          <button
                            type="button"
                            className="primary-button cfrow-action-btn"
                            onClick={() => handleRegistrarCreateRequest(domain)}
                            disabled={!canRegister || registrarLookupLoading || Boolean(registrarActionLoading)}
                          >
                            {isCreating ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
                            Registrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {registrarLoading ? (
          <p className="result-empty inline-loading-message">
            <Loader2 size={16} className="spin" /> Carregando Cloudflare Registrar...
          </p>
        ) : selectedRegistration ? (
          <>
            <div className="cfdns-registrar-grid">
              <div className="cfdns-registrar-item">
                <span>Status</span>
                <strong>{selectedRegistration.status || '—'}</strong>
              </div>
              <div className="cfdns-registrar-item">
                <span>Expiração</span>
                <strong>
                  <CalendarClock size={14} /> {formatRegistrarDate(selectedRegistration.expires_at)}
                </strong>
                {(() => {
                  const badge = getExpiryBadge(selectedRegistrationDaysUntilExpiry);
                  return badge ? (
                    <small>
                      <span className={`cfdns-zone-badge cfdns-zone-badge--${badge.warning ? 'warn' : 'muted'}`}>
                        {badge.label}
                      </span>
                    </small>
                  ) : null;
                })()}
              </div>
              <div className="cfdns-registrar-item">
                <span>Auto-renew</span>
                <strong>{formatRegistrarBoolean(selectedRegistration.auto_renew, 'Ativo', 'Inativo')}</strong>
              </div>
              <div className="cfdns-registrar-item">
                <span>Privacidade</span>
                <strong>{selectedRegistration.privacy_mode || '—'}</strong>
              </div>
              <div className="cfdns-registrar-item">
                <span>Lock</span>
                <strong>{formatRegistrarBoolean(selectedRegistration.locked, 'Bloqueado', 'Desbloqueado')}</strong>
              </div>
            </div>

            <div className="cfdns-registrar-actionbar">
              <button
                type="button"
                className="ghost-button"
                onClick={() =>
                  queueRegistrarSettingsPatch({
                    kind: 'registration',
                    domain: selectedRegistration.domain_name,
                    label: selectedRegistration.auto_renew ? 'Auto-renew desativado' : 'Auto-renew ativado',
                    auto_renew: !selectedRegistration.auto_renew,
                  })
                }
                disabled={Boolean(registrarActionLoading)}
              >
                <RefreshCw size={16} />
                {selectedRegistration.auto_renew ? 'Desativar auto-renew' : 'Ativar auto-renew'}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() =>
                  queueRegistrarSettingsPatch({
                    kind: 'domain',
                    domain: selectedRegistration.domain_name,
                    label:
                      selectedRegistration.locked === true
                        ? 'Lock de transferência desativado'
                        : 'Lock de transferência ativado',
                    locked: selectedRegistration.locked !== true,
                  })
                }
                disabled={Boolean(registrarActionLoading)}
              >
                <LockKeyhole size={16} />
                {selectedRegistration.locked === true ? 'Desbloquear transferência' : 'Bloquear transferência'}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() =>
                  queueRegistrarSettingsPatch({
                    kind: 'domain',
                    domain: selectedRegistration.domain_name,
                    label:
                      selectedRegistration.privacy_mode === 'redaction'
                        ? 'Privacidade WHOIS desativada'
                        : 'Privacidade WHOIS ativada',
                    privacy: selectedRegistration.privacy_mode !== 'redaction',
                  })
                }
                disabled={Boolean(registrarActionLoading)}
              >
                <ShieldCheck size={16} />
                {selectedRegistration.privacy_mode === 'redaction'
                  ? 'Desativar privacidade WHOIS'
                  : 'Ativar privacidade WHOIS'}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => void loadRegistrarStatuses(selectedRegistration.domain_name, true)}
                disabled={Boolean(registrarActionLoading)}
              >
                {registrarActionLoading === `status:${selectedRegistration.domain_name}` ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Status
              </button>
              <a className="ghost-button" href={renewUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                Renovar no dashboard
              </a>
            </div>

            <div className="cfdns-registrar-workflows">
              {renderRegistrarWorkflow('Registration workflow', registrarRegistrationStatus)}
              {renderRegistrarWorkflow('Update workflow', registrarUpdateStatus)}
            </div>
          </>
        ) : (
          <p className="result-empty">
            {selectedZoneName
              ? 'Zona sem registro ativo no Cloudflare Registrar.'
              : 'Selecione uma zona para cruzar DNS e Registrar.'}
          </p>
        )}

        {registrarRegistrations.length > 0 && (
          <div className="cfdns-table-wrap cfdns-registrar-table-wrap">
            <table className="cfdns-table cfdns-registrar-table">
              <thead>
                <tr>
                  <th>Registrado</th>
                  <th>Status</th>
                  <th>Expira</th>
                  <th>Auto-renew</th>
                  <th>Lock</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {registrarRegistrations.map((registration) => {
                  const matchingZone = zones.find(
                    (zone) => zone.name.trim().toLowerCase() === registration.domain_name,
                  );
                  const expiryBadge = getExpiryBadge(getDaysUntil(registration.expires_at));

                  return (
                    <tr key={registration.domain_name}>
                      <td>{registration.domain_name}</td>
                      <td>{registration.status || '—'}</td>
                      <td>
                        {formatRegistrarDate(registration.expires_at)}{' '}
                        {expiryBadge ? (
                          <span
                            className={`cfdns-zone-badge cfdns-zone-badge--${expiryBadge.warning ? 'warn' : 'muted'}`}
                          >
                            {expiryBadge.label}
                          </span>
                        ) : null}
                      </td>
                      <td>{formatRegistrarBoolean(registration.auto_renew, 'Ativo', 'Inativo')}</td>
                      <td>{formatRegistrarBoolean(registration.locked, 'Bloqueado', 'Desbloqueado')}</td>
                      <td>
                        <div className="cfdns-row-actions">
                          <button
                            type="button"
                            className="ghost-button cfrow-action-btn"
                            onClick={() => {
                              if (matchingZone) {
                                onZoneChange(matchingZone.id);
                              }
                              void loadRegistrarStatuses(registration.domain_name, true);
                            }}
                            disabled={Boolean(registrarActionLoading)}
                          >
                            <RefreshCw size={13} />
                            Abrir
                          </button>
                          <button
                            type="button"
                            className="ghost-button cfrow-action-btn"
                            onClick={() => void openRegistrarDetails(registration.domain_name)}
                            disabled={Boolean(registrarActionLoading)}
                          >
                            <Info size={13} />
                            Detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="cfdns-transfer-card">
          <h5>
            <ArrowRightLeft size={14} /> Transferir domínio para a Cloudflare
          </h5>
          <p className="field-hint">
            A transferência de entrada exige o código EPP/autorização do registrador atual e é concluída no dashboard da
            Cloudflare — não há API pública para iniciá-la.
          </p>
          <a className="ghost-button" href={transferUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            Abrir transferência no dashboard
          </a>
        </div>
      </article>

      {pendingRegistrarCreate &&
        createPortal(
          // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop — click dismisses; keyboard dismissal handled by Escape
          <div
            className="cleanup-confirm-overlay"
            onClick={() => setPendingRegistrarCreate(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setPendingRegistrarCreate(null);
            }}
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: event guard — isolates modal body from backdrop dismiss */}
            <div
              className="cleanup-confirm-modal"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <AlertTriangle size={32} className="cleanup-confirm-icon" />
              <h3>Registrar domínio</h3>
              <p>
                Confirma o registro billable de <strong>{pendingRegistrarCreate.name}</strong> por {registrarYears}{' '}
                ano(s), {formatRegistrarPrice(pendingRegistrarCreate.pricing)}?
                <br />
                Registros concluídos não são reembolsáveis.
              </p>
              <div className="field-group">
                <label htmlFor="cfdns-registrar-modal-years">Anos</label>
                <select
                  id="cfdns-registrar-modal-years"
                  name="cfDnsRegistrarModalYears"
                  value={registrarYears}
                  onChange={(event) => setRegistrarYears(event.target.value)}
                >
                  {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((years) => (
                    <option key={years} value={years}>
                      {years}
                    </option>
                  ))}
                </select>
              </div>
              <details className="cfdns-advanced-accordion">
                <summary>Contato do registrante (opcional)</summary>
                <p className="field-hint">Sem contato informado, a Cloudflare usa o cadastro padrão da conta.</p>
                <div className="cfdns-registrar-contact-grid">
                  {(
                    [
                      ['first_name', 'Nome'],
                      ['last_name', 'Sobrenome'],
                      ['organization', 'Organização'],
                      ['address', 'Endereço'],
                      ['address2', 'Complemento'],
                      ['city', 'Cidade'],
                      ['state', 'Estado (UF)'],
                      ['zip', 'CEP'],
                      ['country', 'País (código, ex.: BR)'],
                      ['email', 'E-mail'],
                      ['phone', 'Telefone (+55.51...)'],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="field-group">
                      <label htmlFor={`cfdns-registrar-contact-${field}`}>{label}</label>
                      <input
                        id={`cfdns-registrar-contact-${field}`}
                        name={`cfDnsRegistrarContact_${field}`}
                        type="text"
                        autoComplete="off"
                        value={registrarContactDraft[field]}
                        onChange={(event) => updateRegistrarContactField(field, event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </details>
              <div className="cleanup-confirm-actions">
                <button
                  type="button"
                  className="cleanup-confirm-cancel"
                  onClick={() => setPendingRegistrarCreate(null)}
                >
                  Cancelar
                </button>
                <button type="button" className="cleanup-confirm-proceed" onClick={() => void executeRegistrarCreate()}>
                  Confirmar registro
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {pendingRegistrarSettings &&
        createPortal(
          // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop — click dismisses; keyboard dismissal handled by Escape
          <div
            className="cleanup-confirm-overlay"
            onClick={() => setPendingRegistrarSettings(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setPendingRegistrarSettings(null);
            }}
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: event guard — isolates modal body from backdrop dismiss */}
            <div
              className="cleanup-confirm-modal"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <AlertTriangle size={32} className="cleanup-confirm-icon" />
              <h3>Atualizar Registrar</h3>
              <p>
                Confirma <strong>{pendingRegistrarSettings.label}</strong> em{' '}
                <strong>{pendingRegistrarSettings.domain}</strong>?
              </p>
              <div className="cleanup-confirm-actions">
                <button
                  type="button"
                  className="cleanup-confirm-cancel"
                  onClick={() => setPendingRegistrarSettings(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="cleanup-confirm-proceed"
                  onClick={() => void executeRegistrarSettingsPatch()}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {registrarDetail &&
        createPortal(
          // biome-ignore lint/a11y/noStaticElementInteractions: backdrop do drawer — clique fecha; teclado fecha via Escape
          <div
            className="cfdns-registrar-drawer-overlay"
            onClick={closeRegistrarDetails}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeRegistrarDetails();
            }}
          >
            {/* Guarda de eventos: isola o corpo do drawer do fechamento pelo backdrop. */}
            <aside
              className="cfdns-registrar-drawer"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div className="cfdns-registrar-drawer__header">
                <h3>
                  <FileText size={16} /> Detalhes — {registrarDetail.domain}
                </h3>
                <button type="button" className="ghost-button" onClick={closeRegistrarDetails}>
                  Fechar
                </button>
              </div>

              {registrarDetail.loading ? (
                <p className="result-empty inline-loading-message">
                  <Loader2 size={16} className="spin" /> Carregando detalhes do registro...
                </p>
              ) : registrarDetail.payload?.registration ? (
                (() => {
                  const detail = registrarDetail.payload.registration;
                  const detailBadge = getExpiryBadge(getDaysUntil(detail.expires_at));
                  return (
                    <>
                      <div className="cfdns-registrar-drawer__grid">
                        <div className="cfdns-registrar-drawer__field">
                          <span>Status</span>
                          <strong>{detail.status || '—'}</strong>
                        </div>
                        <div className="cfdns-registrar-drawer__field">
                          <span>Criado em</span>
                          <strong>{formatRegistrarDate(detail.created_at)}</strong>
                        </div>
                        <div className="cfdns-registrar-drawer__field">
                          <span>Expira em</span>
                          <strong>{formatRegistrarDate(detail.expires_at)}</strong>
                          {detailBadge ? (
                            <span
                              className={`cfdns-zone-badge cfdns-zone-badge--${detailBadge.warning ? 'warn' : 'muted'}`}
                            >
                              {detailBadge.label}
                            </span>
                          ) : null}
                        </div>
                        <div className="cfdns-registrar-drawer__field">
                          <span>Auto-renew</span>
                          <strong>{formatRegistrarBoolean(detail.auto_renew, 'Ativo', 'Inativo')}</strong>
                        </div>
                        <div className="cfdns-registrar-drawer__field">
                          <span>Privacidade</span>
                          <strong>{detail.privacy_mode || '—'}</strong>
                        </div>
                        <div className="cfdns-registrar-drawer__field">
                          <span>Lock</span>
                          <strong>{formatRegistrarBoolean(detail.locked, 'Bloqueado', 'Desbloqueado')}</strong>
                        </div>
                      </div>

                      {Array.isArray(detail.name_servers) && detail.name_servers.length > 0 ? (
                        <div className="cfdns-registrar-drawer__field">
                          <span>Name servers do registro</span>
                          <pre>{detail.name_servers.join('\n')}</pre>
                        </div>
                      ) : null}

                      {detail.contacts && Object.keys(detail.contacts).length > 0 ? (
                        <div className="cfdns-registrar-drawer__field">
                          <span>Contatos</span>
                          <pre>{JSON.stringify(detail.contacts, null, 2)}</pre>
                        </div>
                      ) : null}
                    </>
                  );
                })()
              ) : (
                <p className="result-empty">Sem detalhes disponíveis para este domínio.</p>
              )}

              <div className="cfdns-registrar-workflows">
                {renderRegistrarWorkflow('Registration workflow', registrarRegistrationStatus)}
                {renderRegistrarWorkflow('Update workflow', registrarUpdateStatus)}
              </div>

              <a className="ghost-button" href={renewUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                Renovar no dashboard
              </a>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
