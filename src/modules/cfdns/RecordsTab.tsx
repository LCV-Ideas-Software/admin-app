/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Aba "Registros" do módulo CF DNS: filtros, tabela de registros com editor
 * inline, formulário de criação, modais de confirmação e alertas operacionais.
 * O estado vive em useRecordsController (chamado pelo shell CfDnsModule) para
 * que o chip de status e o seletor de zona continuem enxergando os mesmos
 * dados de antes do split — comportamento movido verbatim de CfDnsModule.tsx.
 */

/* eslint-disable react-refresh/only-export-components -- Padrão controller-hook + componente de aba (mesmo racional de Notification.tsx): o estado precisa viver no shell para preservar chip/polling entre abas. */

import {
  AlertTriangle,
  Cloud,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNotification } from '../../components/Notification';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/Dialog';
import { cfApiErrorMessage } from '../shared/cfApi';
import * as api from './api';
import { BatchBar } from './BatchBar';
import { type BulkEditFormState, buildBulkEditPatches, toggleIdSelection, togglePageSelection } from './batchHelpers';
import { ImportExportPanel } from './ImportExportPanel';
import {
  CaaDraftFields,
  CertDraftFields,
  DnskeyDraftFields,
  DsDraftFields,
  HttpsDraftFields,
  InlineRecordEditor,
  LocDraftFields,
  NaptrDraftFields,
  SrvDraftFields,
  SshfpDraftFields,
  TagsInput,
  TlsaDraftFields,
  UriDraftFields,
} from './recordEditors';
import {
  type AdvancedRecordFilters,
  type CaaValidation,
  type CommonRecordValidation,
  DEFAULT_ADVANCED_FILTERS,
  DEFAULT_COMMENT_MAX_LENGTH,
  DEFAULT_DRAFT,
  type DnsOperationalAlert,
  type DnsRecord,
  type EditorDraft,
  type HttpsSvcbValidation,
  RECORD_TYPES,
  type RecordsSortDirection,
  type RecordsSortField,
  STRUCTURED_DATA_TYPES,
  type UriValidation,
  type ZoneCapabilities,
} from './types';
import {
  buildRecordDataFromDraft,
  countActiveAdvancedFilters,
  formatDateTime,
  formatDateTimeFull,
  formatRecordContent,
  parseCaaDraft,
  parseCommonRecordDraft,
  parseHttpsSvcbValue,
  parseStructuredDraft,
  parseUriTarget,
  toPriorityValue,
  toTtlValue,
} from './validators';

type RecordsControllerArgs = {
  adminActor: string;
  selectedZoneId: string;
  zoneContextLabel: string;
};

export function useRecordsController({ adminActor, selectedZoneId, zoneContextLabel }: RecordsControllerArgs) {
  const { showNotification } = useNotification();

  const [filterType, setFilterType] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const [sortOrder, setSortOrder] = useState<RecordsSortField>('');
  const [sortDirection, setSortDirection] = useState<RecordsSortDirection>('asc');

  // Filtros avançados: o rascunho alimenta o painel; o aplicado alimenta as
  // consultas (só muda em "Aplicar filtros"/"Limpar", evitando refetch por tecla).
  const [advancedDraft, setAdvancedDraft] = useState<AdvancedRecordFilters>(DEFAULT_ADVANCED_FILTERS);
  const [advancedApplied, setAdvancedApplied] = useState<AdvancedRecordFilters>(DEFAULT_ADVANCED_FILTERS);

  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 100,
    totalPages: 1,
    totalCount: 0,
    count: 0,
  });

  // Capacidades da zona (tags/limite de comentário), com cache por zoneId.
  // Falha aqui nunca bloqueia registros: caímos nos defaults e mostramos hint.
  const [capabilities, setCapabilities] = useState<ZoneCapabilities | null>(null);
  const [capabilitiesHint, setCapabilitiesHint] = useState('');
  const capabilitiesCacheRef = useRef(new Map<string, ZoneCapabilities>());

  useEffect(() => {
    if (!selectedZoneId) {
      setCapabilities(null);
      setCapabilitiesHint('');
      return;
    }

    const cached = capabilitiesCacheRef.current.get(selectedZoneId);
    if (cached) {
      setCapabilities(cached);
      setCapabilitiesHint('');
      return;
    }

    let cancelled = false;
    setCapabilities(null);
    setCapabilitiesHint('');

    void (async () => {
      const result = await api.fetchZoneCapabilities(selectedZoneId);
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setCapabilitiesHint(cfApiErrorMessage(result, 'Não foi possível carregar as capacidades da zona'));
        return;
      }

      const payload = result.data;
      if (!payload.ok) {
        setCapabilitiesHint(
          payload.error
            ? `Não foi possível carregar as capacidades da zona: ${payload.error}`
            : 'Não foi possível carregar as capacidades da zona.',
        );
        return;
      }

      const next: ZoneCapabilities = {
        tagsSupported: payload.tagsSupported !== false,
        commentMaxLength:
          typeof payload.commentMaxLength === 'number' && payload.commentMaxLength > 0
            ? payload.commentMaxLength
            : DEFAULT_COMMENT_MAX_LENGTH,
      };
      capabilitiesCacheRef.current.set(selectedZoneId, next);
      setCapabilities(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedZoneId]);

  const tagsSupported = capabilities?.tagsSupported ?? true;
  const commentMaxLength = capabilities?.commentMaxLength ?? DEFAULT_COMMENT_MAX_LENGTH;

  const [draft, setDraft] = useState<EditorDraft>(DEFAULT_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [pendingSaveConfirm, setPendingSaveConfirm] = useState(false);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<DnsRecord | null>(null);

  // ── DNS-2: seleção multi-registro para operações em lote ──
  // A seleção sobrevive à navegação de páginas dentro da mesma zona; o mapa de
  // metadados (tipo+nome) alimenta o modal de confirmação mesmo para registros
  // selecionados em páginas que não estão mais carregadas.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const selectedMetaRef = useRef(new Map<string, { type: string; name: string }>());
  const [batchApplying, setBatchApplying] = useState(false);

  const clearSelection = useCallback(() => {
    selectedMetaRef.current.clear();
    setSelectedIds(new Set());
  }, []);

  const rememberRecordMeta = (record: DnsRecord) => {
    const recordId = String(record.id ?? '').trim();
    if (recordId) {
      selectedMetaRef.current.set(recordId, {
        type: String(record.type ?? '').toUpperCase(),
        name: String(record.name ?? ''),
      });
    }
  };

  const toggleRecordSelection = (record: DnsRecord) => {
    const recordId = String(record.id ?? '').trim();
    if (!recordId) {
      return;
    }
    rememberRecordMeta(record);
    setSelectedIds((current) => toggleIdSelection(current, recordId));
  };

  const togglePageRecordsSelection = (pageRecords: DnsRecord[], selectAll: boolean) => {
    const pageIds: string[] = [];
    for (const record of pageRecords) {
      const recordId = String(record.id ?? '').trim();
      if (recordId) {
        pageIds.push(recordId);
        if (selectAll) {
          rememberRecordMeta(record);
        }
      }
    }
    setSelectedIds((current) => togglePageSelection(current, pageIds, selectAll));
  };

  const selectedRecordsMeta = useMemo(
    () =>
      [...selectedIds].map((id) => ({
        id,
        type: selectedMetaRef.current.get(id)?.type ?? '',
        name: selectedMetaRef.current.get(id)?.name ?? id,
      })),
    [selectedIds],
  );

  const isEditing = Boolean(draft.recordId);
  const isSrvDraft = draft.type === 'SRV';
  const isCaaDraft = draft.type === 'CAA';
  const isUriDraft = draft.type === 'URI';
  const isHttpsDraft = draft.type === 'HTTPS' || draft.type === 'SVCB';
  // Tipos com editor estruturado dedicado (DS/DNSKEY/SSHFP/SMIMEA/TLSA/CERT/LOC/NAPTR).
  const isStructuredDataDraft = STRUCTURED_DATA_TYPES.includes(draft.type);
  const isProxyValidated = draft.proxied;

  const httpsValidation = useMemo(() => {
    if (!isHttpsDraft) {
      return {
        normalized: '',
        tokens: [],
        issues: [],
        hints: [],
      } satisfies HttpsSvcbValidation;
    }
    return parseHttpsSvcbValue(draft.httpsValue);
  }, [draft.httpsValue, isHttpsDraft]);

  const uriValidation = useMemo(() => {
    if (!isUriDraft) {
      return {
        normalized: '',
        issues: [],
        hints: [],
      } satisfies UriValidation;
    }
    return parseUriTarget(draft.uriTarget);
  }, [draft.uriTarget, isUriDraft]);

  const caaValidation = useMemo(() => {
    if (!isCaaDraft) {
      return { issues: [], hints: [] } satisfies CaaValidation;
    }
    return parseCaaDraft(draft.caaFlags, draft.caaTag, draft.caaValue);
  }, [draft.caaFlags, draft.caaTag, draft.caaValue, isCaaDraft]);

  const structuredValidation = useMemo(() => parseStructuredDraft(draft), [draft]);

  const commonValidation = useMemo(() => {
    if (isSrvDraft || isCaaDraft || isUriDraft || isHttpsDraft || isStructuredDataDraft) {
      return { issues: [], hints: [] } satisfies CommonRecordValidation;
    }
    return parseCommonRecordDraft(draft.type, draft.name, draft.content, draft.priority, draft.proxied);
  }, [
    draft.type,
    draft.name,
    draft.content,
    draft.priority,
    draft.proxied,
    isSrvDraft,
    isCaaDraft,
    isUriDraft,
    isHttpsDraft,
    isStructuredDataDraft,
  ]);

  const operationalAlerts = useMemo<DnsOperationalAlert[]>(() => {
    const next: DnsOperationalAlert[] = [];

    // Alerta de zona é sempre visível — independe de formulário aberto
    if (!selectedZoneId) {
      next.push({
        code: 'CFDNS-ZONE-MISSING',
        cause: 'Nenhuma zona está selecionada para operar DNS.',
        action: 'Selecione um domínio em "Domínio / Zona" para habilitar leitura e alteração de registros.',
      });
    }

    // Alertas de validação do draft só aparecem quando o formulário de criação/edição está ativo.
    // Em repouso, o draft contém valores padrão vazios (type=A, name='', content='') que
    // gerariam falsos positivos (e.g. CFDNS-A-INVALID) sem interação do usuário.
    const isDraftActive = showRecordForm || isEditing;
    if (!isDraftActive) {
      return next;
    }

    if (!isProxyValidated && draft.ttl && draft.ttl !== '1') {
      const ttl = Number(draft.ttl);
      if (Number.isFinite(ttl) && ttl > 0 && ttl < 300) {
        next.push({
          code: 'CFDNS-TTL-LOW',
          cause: `TTL configurado em ${ttl}s, abaixo do recomendado para estabilidade operacional na zona ${zoneContextLabel}.`,
          action: `Use TTL >= 300s para reduzir flapping de cache na zona ${zoneContextLabel}, salvo quando houver necessidade real de propagação rápida.`,
        });
      }
    }

    if (!isProxyValidated && draft.type === 'MX' && !draft.priority.trim()) {
      next.push({
        code: 'CFDNS-MX-PRIORITY-MISSING',
        cause: `Registro MX sem valor de prioridade na zona ${zoneContextLabel}.`,
        action: `Informe prioridade (0-65535) para ordenar servidores de e-mail corretamente na zona ${zoneContextLabel}.`,
      });
    }

    if (!isProxyValidated && isSrvDraft) {
      if (!draft.srvService.trim() || !draft.srvProto.trim() || !draft.srvTarget.trim() || !draft.srvPort.trim()) {
        next.push({
          code: 'CFDNS-SRV-REQUIRED-FIELDS',
          cause: `Registro SRV sem um ou mais campos obrigatórios (service/proto/port/target) na zona ${zoneContextLabel}.`,
          action: `Preencha todos os campos essenciais do SRV antes de salvar na zona ${zoneContextLabel}.`,
        });
      }
    }

    if (!isProxyValidated && isCaaDraft && (!draft.caaTag.trim() || !draft.caaValue.trim())) {
      next.push({
        code: 'CFDNS-CAA-REQUIRED-FIELDS',
        cause: `Registro CAA sem tag e/ou value na zona ${zoneContextLabel}.`,
        action: `Preencha tag e value para definir corretamente a política de emissão de certificados na zona ${zoneContextLabel}.`,
      });
    }

    if (!isProxyValidated && isCaaDraft && caaValidation.issues.length > 0) {
      for (const issue of caaValidation.issues) {
        next.push({
          code: 'CFDNS-CAA-INVALID',
          cause: `${issue} Zona: ${zoneContextLabel}.`,
          action: `Corrija o(s) campo(s) CAA com erro e salve novamente na zona ${zoneContextLabel}.`,
        });
      }
    }

    if (!isProxyValidated && isUriDraft && !draft.uriTarget.trim()) {
      next.push({
        code: 'CFDNS-URI-TARGET-MISSING',
        cause: `Registro URI sem target na zona ${zoneContextLabel}.`,
        action: `Informe o target URI completo (ex.: https://servico.exemplo/rota) para a zona ${zoneContextLabel}.`,
      });
    }

    if (!isProxyValidated && isUriDraft && uriValidation.issues.length > 0) {
      for (const issue of uriValidation.issues) {
        next.push({
          code: 'CFDNS-URI-INVALID',
          cause: `${issue} Zona: ${zoneContextLabel}.`,
          action: `Ajuste o target URI para formato válido e salve novamente na zona ${zoneContextLabel}.`,
        });
      }
    }

    if (!isProxyValidated && isHttpsDraft && !draft.httpsValue.trim()) {
      next.push({
        code: 'CFDNS-HTTPS-VALUE-MISSING',
        cause: `${draft.type} sem parâmetros em value na zona ${zoneContextLabel}.`,
        action: `Informe parâmetros como alpn, port e hints de IP conforme o cenário na zona ${zoneContextLabel}.`,
      });
    }

    if (!isProxyValidated && isHttpsDraft && httpsValidation.issues.length > 0) {
      for (const issue of httpsValidation.issues) {
        next.push({
          code: 'CFDNS-HTTPS-SEMANTIC-INVALID',
          cause: `${issue} Zona: ${zoneContextLabel}.`,
          action: `Ajuste o parâmetro indicado em value para sintaxe chave=valor válida na zona ${zoneContextLabel}.`,
        });
      }
    }

    // Tipos estruturados novos (DS/DNSKEY/SSHFP/SMIMEA/TLSA/CERT/LOC/NAPTR):
    // os validadores já emitem issues para campos obrigatórios ausentes e
    // faixas violadas — mesmo estilo de alerta dos tipos SRV/CAA/URI/HTTPS.
    if (!isProxyValidated && isStructuredDataDraft && structuredValidation.issues.length > 0) {
      for (const issue of structuredValidation.issues) {
        next.push({
          code: `CFDNS-${draft.type}-INVALID`,
          cause: `${issue} Zona: ${zoneContextLabel}.`,
          action: `Corrija o(s) campo(s) do registro ${draft.type} antes de salvar na zona ${zoneContextLabel}.`,
        });
      }
    }

    if (
      !isProxyValidated &&
      !isSrvDraft &&
      !isCaaDraft &&
      !isUriDraft &&
      !isHttpsDraft &&
      !isStructuredDataDraft &&
      commonValidation.issues.length > 0
    ) {
      for (const issue of commonValidation.issues) {
        next.push({
          code: `CFDNS-${draft.type}-INVALID`,
          cause: `${issue} Zona: ${zoneContextLabel}.`,
          action: `Corrija o campo inválido do registro ${draft.type} antes de salvar na zona ${zoneContextLabel}.`,
        });
      }
    }

    return next;
  }, [
    showRecordForm,
    isEditing,
    draft.caaTag,
    draft.caaValue,
    draft.priority,
    draft.srvPort,
    draft.srvProto,
    draft.srvService,
    draft.srvTarget,
    draft.ttl,
    draft.type,
    draft.uriTarget,
    draft.httpsValue,
    caaValidation.issues,
    uriValidation.issues,
    httpsValidation.issues,
    commonValidation.issues,
    structuredValidation.issues,
    isCaaDraft,
    isHttpsDraft,
    isSrvDraft,
    isUriDraft,
    isStructuredDataDraft,
    selectedZoneId,
    zoneContextLabel,
    isProxyValidated,
  ]);

  const resetDraft = () => {
    setDraft(DEFAULT_DRAFT);
  };

  const closeRecordForm = () => {
    resetDraft();
    setShowRecordForm(false);
  };

  const openNewRecordForm = () => {
    resetDraft();
    setShowRecordForm(true);
  };

  const hydrateDraftFromRecord = (record: DnsRecord) => {
    const recordData = record.data && typeof record.data === 'object' ? record.data : {};
    const recordType = String(record.type ?? 'A').toUpperCase();

    setDraft({
      recordId: String(record.id ?? ''),
      type: recordType,
      name: String(record.name ?? '').toLowerCase(),
      content: String(record.content ?? ''),
      ttl: String(record.ttl ?? 1),
      proxied: Boolean(record.proxied),
      priority: record.priority == null ? '' : String(record.priority),
      comment: String(record.comment ?? ''),
      srvService: String(recordData.service ?? '_sip').trim() || '_sip',
      srvProto: String(recordData.proto ?? '_tcp').trim() || '_tcp',
      srvName: String(recordData.name ?? '').trim(),
      srvPriority: String(recordData.priority ?? record.priority ?? 10).trim() || '10',
      srvWeight: String(recordData.weight ?? 10).trim() || '10',
      srvPort: String(recordData.port ?? 443).trim() || '443',
      srvTarget: String(recordData.target ?? '').trim(),
      caaFlags: String(recordData.flags ?? 0).trim() || '0',
      caaTag: String(recordData.tag ?? 'issue').trim() || 'issue',
      caaValue: String(recordData.value ?? '').trim(),
      uriPriority: String(recordData.priority ?? 10).trim() || '10',
      uriWeight: String(recordData.weight ?? 1).trim() || '1',
      uriTarget: String(recordData.target ?? '').trim(),
      httpsPriority: String(recordData.priority ?? 1).trim() || '1',
      httpsTarget: String(recordData.target ?? '.').trim() || '.',
      httpsValue: String(recordData.value ?? '').trim(),
      tags: Array.isArray(record.tags) ? record.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
      dsKeyTag: String(recordData.key_tag ?? '').trim(),
      dsAlgorithm: String(recordData.algorithm ?? 13).trim() || '13',
      dsDigestType: String(recordData.digest_type ?? 2).trim() || '2',
      dsDigest: String(recordData.digest ?? '').trim(),
      dnskeyFlags: String(recordData.flags ?? 257).trim() || '257',
      dnskeyProtocol: String(recordData.protocol ?? 3).trim() || '3',
      dnskeyAlgorithm: String(recordData.algorithm ?? 13).trim() || '13',
      dnskeyPublicKey: String(recordData.public_key ?? '').trim(),
      sshfpAlgorithm: String(recordData.algorithm ?? 4).trim() || '4',
      sshfpType: String(recordData.type ?? 2).trim() || '2',
      sshfpFingerprint: String(recordData.fingerprint ?? '').trim(),
      tlsaUsage: String(recordData.usage ?? 3).trim() || '3',
      tlsaSelector: String(recordData.selector ?? 1).trim() || '1',
      tlsaMatchingType: String(recordData.matching_type ?? 1).trim() || '1',
      tlsaCertificate: String(recordData.certificate ?? '').trim(),
      certType: String(recordData.type ?? 1).trim() || '1',
      certKeyTag: String(recordData.key_tag ?? 0).trim() || '0',
      certAlgorithm: String(recordData.algorithm ?? 13).trim() || '13',
      certCertificate: String(recordData.certificate ?? '').trim(),
      locLatDegrees: String(recordData.lat_degrees ?? 0).trim() || '0',
      locLatMinutes: String(recordData.lat_minutes ?? 0).trim() || '0',
      locLatSeconds: String(recordData.lat_seconds ?? 0).trim() || '0',
      locLatDirection: String(recordData.lat_direction ?? 'N').trim() || 'N',
      locLongDegrees: String(recordData.long_degrees ?? 0).trim() || '0',
      locLongMinutes: String(recordData.long_minutes ?? 0).trim() || '0',
      locLongSeconds: String(recordData.long_seconds ?? 0).trim() || '0',
      locLongDirection: String(recordData.long_direction ?? 'E').trim() || 'E',
      locAltitude: String(recordData.altitude ?? 0).trim() || '0',
      locSize: String(recordData.size ?? 1).trim() || '1',
      locPrecisionHorz: String(recordData.precision_horz ?? 10000).trim() || '10000',
      locPrecisionVert: String(recordData.precision_vert ?? 10).trim() || '10',
      naptrOrder: String(recordData.order ?? 10).trim() || '10',
      naptrPreference: String(recordData.preference ?? 10).trim() || '10',
      naptrFlags: String(recordData.flags ?? 'S').trim(),
      naptrService: String(recordData.service ?? '').trim(),
      naptrRegex: String(recordData.regex ?? '').trim(),
      naptrReplacement: String(recordData.replacement ?? '.').trim() || '.',
    });
    setShowRecordForm(true);
  };

  const loadRecords = useCallback(
    async (
      zoneId: string,
      options?: { shouldNotify?: boolean; pageOverride?: number; advancedOverride?: AdvancedRecordFilters },
    ) => {
      if (!zoneId) {
        setRecords([]);
        setPagination({
          page: 1,
          perPage,
          totalPages: 1,
          totalCount: 0,
          count: 0,
        });
        return;
      }

      const targetPage = options?.pageOverride ?? page;
      const advanced = options?.advancedOverride ?? advancedApplied;
      setRecordsLoading(true);
      try {
        const query = api.buildRecordsQuery({
          zoneId,
          page: targetPage,
          perPage,
          type: filterType,
          search: filterSearch,
          order: sortOrder,
          direction: sortDirection,
          ...advanced,
        });

        const { response, payload } = await api.fetchRecords(adminActor, query);

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Falha ao carregar registros DNS.');
        }

        const nextRecords = Array.isArray(payload.records) ? payload.records : [];
        setRecords(nextRecords);
        setPagination(
          payload.pagination ?? {
            page: targetPage,
            perPage,
            totalPages: 1,
            totalCount: nextRecords.length,
            count: nextRecords.length,
          },
        );

        if (options?.shouldNotify) {
          showNotification(api.withReq('Registros DNS atualizados.', payload), 'success');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível carregar os registros DNS da zona.';
        showNotification(message, 'error');
      } finally {
        setRecordsLoading(false);
      }
    },
    [adminActor, advancedApplied, filterSearch, filterType, page, perPage, showNotification, sortDirection, sortOrder],
  );

  useEffect(() => {
    if (!selectedZoneId) {
      return;
    }

    void loadRecords(selectedZoneId);
  }, [loadRecords, selectedZoneId]);

  // Reset aplicado pelo shell ao trocar de zona (mesmas escritas do antigo
  // handleZoneChange que pertenciam à seção de registros). A seleção em lote
  // também é zerada: ids de uma zona não valem na outra.
  const resetForZoneChange = () => {
    setPage(1);
    resetDraft();
    setShowRecordForm(false);
    clearSelection();
  };

  const applyBulkDelete = async (): Promise<boolean> => {
    if (!selectedZoneId || selectedIds.size === 0) {
      showNotification('Selecione ao menos um registro para excluir em lote.', 'error');
      return false;
    }

    setBatchApplying(true);
    try {
      const deletes = [...selectedIds].map((id) => ({ id }));
      const { response, payload } = await api.applyRecordsBatch(adminActor, {
        zoneId: selectedZoneId,
        adminActor,
        deletes,
      });

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao excluir registros DNS em lote.');
      }

      const deletedCount = payload.result?.deletes?.length ?? deletes.length;
      clearSelection();
      if (page !== 1) {
        // Voltar à página 1 dispara o refetch pelo useEffect de loadRecords.
        setPage(1);
      } else {
        await loadRecords(selectedZoneId, { pageOverride: 1 });
      }
      showNotification(api.withReq(`${deletedCount} registro(s) DNS excluído(s) em lote.`, payload), 'success');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir os registros DNS em lote.';
      showNotification(message, 'error');
      return false;
    } finally {
      setBatchApplying(false);
    }
  };

  const applyBulkEdit = async (form: BulkEditFormState): Promise<boolean> => {
    if (!selectedZoneId || selectedIds.size === 0) {
      showNotification('Selecione ao menos um registro para editar em lote.', 'error');
      return false;
    }

    setBatchApplying(true);
    try {
      const patches = buildBulkEditPatches([...selectedIds], form);
      const { response, payload } = await api.applyRecordsBatch(adminActor, {
        zoneId: selectedZoneId,
        adminActor,
        patches,
      });

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao editar registros DNS em lote.');
      }

      const patchedCount = payload.result?.patches?.length ?? patches.length;
      clearSelection();
      await loadRecords(selectedZoneId, { pageOverride: page });
      showNotification(api.withReq(`${patchedCount} registro(s) DNS atualizado(s) em lote.`, payload), 'success');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível editar os registros DNS em lote.';
      showNotification(message, 'error');
      return false;
    } finally {
      setBatchApplying(false);
    }
  };

  const handleApplyFilters = () => {
    if (!selectedZoneId) {
      showNotification('Selecione um domínio antes de aplicar filtros.', 'error');
      return;
    }

    setPage(1);
    setAdvancedApplied(advancedDraft);
    void loadRecords(selectedZoneId, { shouldNotify: true, pageOverride: 1, advancedOverride: advancedDraft });
  };

  const handleClearAdvancedFilters = () => {
    setAdvancedDraft(DEFAULT_ADVANCED_FILTERS);
    setAdvancedApplied(DEFAULT_ADVANCED_FILTERS);
    setPage(1);
    if (selectedZoneId) {
      void loadRecords(selectedZoneId, { pageOverride: 1, advancedOverride: DEFAULT_ADVANCED_FILTERS });
    }
  };

  const activeAdvancedFilterCount = useMemo(() => countActiveAdvancedFilters(advancedApplied), [advancedApplied]);

  // Ciclo de ordenação por coluna: nenhum → asc → desc → nenhum. A mudança de
  // estado recria loadRecords e o useEffect acima refaz a consulta na página 1.
  const handleSort = (field: Exclude<RecordsSortField, ''>) => {
    if (sortOrder !== field) {
      setSortOrder(field);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortOrder('');
      setSortDirection('asc');
    }
    setPage(1);
  };

  const handlePerPageChange = (nextPerPage: number) => {
    setPerPage(nextPerPage);
    setPage(1);
  };

  const handlePageJump = (rawValue: string) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return;
    }
    const clamped = Math.min(Math.max(Math.trunc(parsed), 1), Math.max(1, pagination.totalPages));
    setPage(clamped);
  };

  const handleSaveRecord = async () => {
    if (!selectedZoneId) {
      showNotification('Selecione um domínio antes de salvar.', 'error');
      return;
    }

    if (!draft.type.trim() || !draft.name.trim()) {
      showNotification('Tipo e nome do registro são obrigatórios.', 'error');
      return;
    }

    if (
      !isProxyValidated &&
      !isSrvDraft &&
      !isCaaDraft &&
      !isUriDraft &&
      !isHttpsDraft &&
      !isStructuredDataDraft &&
      !draft.content.trim()
    ) {
      showNotification('Conteúdo é obrigatório para este tipo de registro.', 'error');
      return;
    }

    if (
      !isProxyValidated &&
      isSrvDraft &&
      (!draft.srvService.trim() || !draft.srvProto.trim() || !draft.srvTarget.trim() || !draft.srvPort.trim())
    ) {
      showNotification('SRV exige service, proto, port e target.', 'error');
      return;
    }

    if (!isProxyValidated && isCaaDraft && (!draft.caaTag.trim() || !draft.caaValue.trim())) {
      showNotification('CAA exige tag e value.', 'error');
      return;
    }

    if (!isProxyValidated && isCaaDraft && caaValidation.issues.length > 0) {
      showNotification('CAA com valor inválido. Revise os campos antes de salvar.', 'error');
      return;
    }

    if (!isProxyValidated && isUriDraft && !draft.uriTarget.trim()) {
      showNotification('URI exige target.', 'error');
      return;
    }

    if (!isProxyValidated && isUriDraft && uriValidation.issues.length > 0) {
      showNotification('URI com target inválido. Revise o valor antes de salvar.', 'error');
      return;
    }

    if (!isProxyValidated && isHttpsDraft && !draft.httpsValue.trim()) {
      showNotification('HTTPS/SVCB exige parâmetros em value.', 'error');
      return;
    }

    if (!isProxyValidated && isHttpsDraft && httpsValidation.issues.length > 0) {
      showNotification('HTTPS/SVCB com value inválido. Revise os parâmetros antes de salvar.', 'error');
      return;
    }

    if (!isProxyValidated && isStructuredDataDraft && structuredValidation.issues.length > 0) {
      showNotification(`Registro ${draft.type} inválido. Revise os campos antes de salvar.`, 'error');
      return;
    }

    if (
      !isProxyValidated &&
      !isSrvDraft &&
      !isCaaDraft &&
      !isUriDraft &&
      !isHttpsDraft &&
      !isStructuredDataDraft &&
      commonValidation.issues.length > 0
    ) {
      showNotification(`Registro ${draft.type} inválido. Revise os campos antes de salvar.`, 'error');
      return;
    }

    setPendingSaveConfirm(true);
    return;
  };

  const executeSaveRecord = async () => {
    setPendingSaveConfirm(false);
    const modeLabel = isEditing ? 'atualizar' : 'criar';

    setSaving(true);
    try {
      // Mapeamento draft → data centralizado em buildRecordDataFromDraft
      // (SRV/CAA/URI/HTTPS/SVCB + tipos estruturados novos); null = content puro.
      const recordData = buildRecordDataFromDraft(draft);

      const { response, payload } = await api.upsertRecord(adminActor, {
        zoneId: selectedZoneId,
        recordId: draft.recordId || undefined,
        adminActor,
        record: {
          type: draft.type.trim().toUpperCase(),
          name: draft.name.trim().toLowerCase(),
          content: recordData ? '' : draft.content.trim(),
          data: recordData,
          ttl: toTtlValue(draft.ttl),
          proxied: draft.proxied,
          priority: isSrvDraft ? null : draft.priority.trim() ? toPriorityValue(draft.priority) : null,
          comment: draft.comment.trim() || null,
          tags: draft.tags,
        },
      });

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `Falha ao ${modeLabel} registro DNS.`);
      }

      resetDraft();
      setShowRecordForm(false);
      await loadRecords(selectedZoneId, { pageOverride: page });
      showNotification(
        api.withReq(`Registro DNS ${isEditing ? 'atualizado' : 'criado'} com sucesso.`, payload),
        'success',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : `Não foi possível ${modeLabel} o registro DNS.`;
      showNotification(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (record: DnsRecord) => {
    const recordId = String(record.id ?? '').trim();
    if (!selectedZoneId || !recordId) {
      showNotification('Registro inválido para exclusão.', 'error');
      return;
    }

    setPendingDeleteRecord(record);
  };

  const executeDeleteRecord = async () => {
    const record = pendingDeleteRecord;
    if (!record) return;
    setPendingDeleteRecord(null);

    const recordId = String(record.id ?? '').trim();
    if (!selectedZoneId || !recordId) {
      showNotification('Registro inválido para exclusão.', 'error');
      return;
    }

    setDeletingId(recordId);
    try {
      const { response, payload } = await api.deleteRecord(adminActor, selectedZoneId, recordId);

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao remover registro DNS.');
      }

      if (draft.recordId === recordId) {
        closeRecordForm();
      }

      await loadRecords(selectedZoneId, { pageOverride: page });
      showNotification(api.withReq('Registro DNS removido com sucesso.', payload), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível remover o registro DNS.';
      showNotification(message, 'error');
    } finally {
      setDeletingId('');
    }
  };

  return {
    adminActor,
    filterType,
    setFilterType,
    filterSearch,
    setFilterSearch,
    page,
    setPage,
    perPage,
    selectedIds,
    selectedRecordsMeta,
    batchApplying,
    toggleRecordSelection,
    togglePageRecordsSelection,
    clearSelection,
    applyBulkDelete,
    applyBulkEdit,
    sortOrder,
    sortDirection,
    advancedDraft,
    setAdvancedDraft,
    activeAdvancedFilterCount,
    records,
    recordsLoading,
    pagination,
    draft,
    setDraft,
    saving,
    deletingId,
    showRecordForm,
    pendingSaveConfirm,
    setPendingSaveConfirm,
    pendingDeleteRecord,
    setPendingDeleteRecord,
    isEditing,
    isSrvDraft,
    isCaaDraft,
    isUriDraft,
    isHttpsDraft,
    isStructuredDataDraft,
    isProxyValidated,
    httpsValidation,
    uriValidation,
    caaValidation,
    commonValidation,
    structuredValidation,
    operationalAlerts,
    tagsSupported,
    commentMaxLength,
    capabilitiesHint,
    resetDraft,
    closeRecordForm,
    openNewRecordForm,
    hydrateDraftFromRecord,
    loadRecords,
    resetForZoneChange,
    handleApplyFilters,
    handleClearAdvancedFilters,
    handleSort,
    handlePerPageChange,
    handlePageJump,
    handleSaveRecord,
    executeSaveRecord,
    handleDeleteRecord,
    executeDeleteRecord,
  };
}

type RecordsController = ReturnType<typeof useRecordsController>;

type RecordsTabProps = {
  controller: RecordsController;
  selectedZoneId: string;
  selectedZoneName: string;
};

export function RecordsTab({ controller, selectedZoneId, selectedZoneName }: RecordsTabProps) {
  const {
    adminActor,
    filterType,
    setFilterType,
    filterSearch,
    setFilterSearch,
    page,
    setPage,
    perPage,
    selectedIds,
    selectedRecordsMeta,
    batchApplying,
    toggleRecordSelection,
    togglePageRecordsSelection,
    clearSelection,
    applyBulkDelete,
    applyBulkEdit,
    sortOrder,
    sortDirection,
    advancedDraft,
    setAdvancedDraft,
    activeAdvancedFilterCount,
    records,
    recordsLoading,
    pagination,
    draft,
    setDraft,
    saving,
    deletingId,
    showRecordForm,
    pendingSaveConfirm,
    setPendingSaveConfirm,
    pendingDeleteRecord,
    setPendingDeleteRecord,
    isEditing,
    isSrvDraft,
    isCaaDraft,
    isUriDraft,
    isHttpsDraft,
    isStructuredDataDraft,
    isProxyValidated,
    httpsValidation,
    uriValidation,
    caaValidation,
    commonValidation,
    structuredValidation,
    operationalAlerts,
    tagsSupported,
    commentMaxLength,
    capabilitiesHint,
    resetDraft,
    closeRecordForm,
    openNewRecordForm,
    hydrateDraftFromRecord,
    loadRecords,
    handleApplyFilters,
    handleClearAdvancedFilters,
    handleSort,
    handlePerPageChange,
    handlePageJump,
    handleSaveRecord,
    executeSaveRecord,
    handleDeleteRecord,
    executeDeleteRecord,
  } = controller;

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [pageJumpValue, setPageJumpValue] = useState('');

  const pageRecordIds = records.map((record) => String(record.id ?? '')).filter(Boolean);
  const allOnPageSelected = pageRecordIds.length > 0 && pageRecordIds.every((id) => selectedIds.has(id));

  const sortIndicator = (field: RecordsSortField) => {
    if (sortOrder !== field) {
      return '';
    }
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const sortableHeader = (field: Exclude<RecordsSortField, ''>, label: string) => (
    <th aria-sort={sortOrder === field ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button
        type="button"
        className="cfdns-sort-button"
        onClick={() => handleSort(field)}
        disabled={!selectedZoneId || recordsLoading}
        title={`Ordenar por ${label}`}
      >
        {label}
        {sortIndicator(field)}
      </button>
    </th>
  );

  return (
    <>
      {operationalAlerts.length > 0 && (
        <article className="integrity-banner integrity-banner--warning">
          <header className="integrity-banner__header">
            <AlertTriangle size={16} />
            <strong>Alertas operacionais do DNS</strong>
          </header>
          <ul className="integrity-banner__list">
            {operationalAlerts.map((alert) => (
              <li key={alert.code}>
                <strong>{alert.code}</strong> · {alert.cause} Ação recomendada: {alert.action}
              </li>
            ))}
          </ul>
        </article>
      )}

      <article className="form-card">
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="cfdns-filter-type">Tipo de registro</label>
            <select
              id="cfdns-filter-type"
              name="cfDnsFilterType"
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
              disabled={!selectedZoneId || recordsLoading}
            >
              <option value="">Todos</option>
              {RECORD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="cfdns-filter-search">Pesquisar por nome</label>
            <input
              id="cfdns-filter-search"
              name="cfDnsFilterSearch"
              type="text"
              autoComplete="off"
              placeholder="ex.: _acme-challenge, api, www"
              value={filterSearch}
              onChange={(event) => setFilterSearch(event.target.value.toLowerCase())}
              disabled={!selectedZoneId || recordsLoading}
            />
          </div>
        </div>

        <div className="cfdns-advanced-toggle">
          <button
            type="button"
            className="ghost-button"
            onClick={() => setShowAdvancedFilters((current) => !current)}
            disabled={!selectedZoneId || recordsLoading}
          >
            <SlidersHorizontal size={16} />
            Filtros avançados
            {!showAdvancedFilters && activeAdvancedFilterCount > 0 && (
              <span className="cfdns-filter-badge">{activeAdvancedFilterCount}</span>
            )}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="cfdns-advanced-panel">
            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="cfdns-adv-name-contains">Nome contém</label>
                <input
                  id="cfdns-adv-name-contains"
                  name="cfDnsAdvNameContains"
                  type="text"
                  autoComplete="off"
                  placeholder="ex.: api"
                  value={advancedDraft.nameContains}
                  onChange={(event) =>
                    setAdvancedDraft((current) => ({ ...current, nameContains: event.target.value }))
                  }
                  disabled={!selectedZoneId || recordsLoading}
                />
              </div>

              <div className="field-group">
                <label htmlFor="cfdns-adv-content-contains">Conteúdo contém</label>
                <input
                  id="cfdns-adv-content-contains"
                  name="cfDnsAdvContentContains"
                  type="text"
                  autoComplete="off"
                  placeholder="ex.: 192.0.2"
                  value={advancedDraft.contentContains}
                  onChange={(event) =>
                    setAdvancedDraft((current) => ({ ...current, contentContains: event.target.value }))
                  }
                  disabled={!selectedZoneId || recordsLoading}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="cfdns-adv-comment-contains">Comentário contém</label>
                <input
                  id="cfdns-adv-comment-contains"
                  name="cfDnsAdvCommentContains"
                  type="text"
                  autoComplete="off"
                  placeholder="ex.: migrado"
                  value={advancedDraft.commentContains}
                  onChange={(event) =>
                    setAdvancedDraft((current) => ({ ...current, commentContains: event.target.value }))
                  }
                  disabled={!selectedZoneId || recordsLoading}
                />
              </div>

              <div className="field-group">
                <label htmlFor="cfdns-adv-comment-present">Presença de comentário</label>
                <select
                  id="cfdns-adv-comment-present"
                  name="cfDnsAdvCommentPresent"
                  value={advancedDraft.commentPresent}
                  onChange={(event) =>
                    setAdvancedDraft((current) => ({
                      ...current,
                      commentPresent: event.target.value as AdvancedRecordFilters['commentPresent'],
                    }))
                  }
                  disabled={!selectedZoneId || recordsLoading}
                >
                  <option value="">Qualquer</option>
                  <option value="true">Com comentário</option>
                  <option value="false">Sem comentário</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="cfdns-adv-tag-exact">Tag exata (nome:valor)</label>
                <input
                  id="cfdns-adv-tag-exact"
                  name="cfDnsAdvTagExact"
                  type="text"
                  autoComplete="off"
                  placeholder="ex.: ambiente:producao"
                  value={advancedDraft.tagExact}
                  onChange={(event) => setAdvancedDraft((current) => ({ ...current, tagExact: event.target.value }))}
                  disabled={!selectedZoneId || recordsLoading}
                />
              </div>

              <div className="field-group">
                <label htmlFor="cfdns-adv-tag-present">Tag presente (nome)</label>
                <input
                  id="cfdns-adv-tag-present"
                  name="cfDnsAdvTagPresent"
                  type="text"
                  autoComplete="off"
                  placeholder="ex.: ambiente"
                  value={advancedDraft.tagPresent}
                  onChange={(event) => setAdvancedDraft((current) => ({ ...current, tagPresent: event.target.value }))}
                  disabled={!selectedZoneId || recordsLoading}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="cfdns-adv-proxied">Proxy</label>
                <select
                  id="cfdns-adv-proxied"
                  name="cfDnsAdvProxied"
                  value={advancedDraft.proxied}
                  onChange={(event) =>
                    setAdvancedDraft((current) => ({
                      ...current,
                      proxied: event.target.value as AdvancedRecordFilters['proxied'],
                    }))
                  }
                  disabled={!selectedZoneId || recordsLoading}
                >
                  <option value="">Todos</option>
                  <option value="true">Proxied</option>
                  <option value="false">DNS only</option>
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="cfdns-adv-match">Modo de combinação</label>
                <select
                  id="cfdns-adv-match"
                  name="cfDnsAdvMatch"
                  value={advancedDraft.match}
                  onChange={(event) =>
                    setAdvancedDraft((current) => ({
                      ...current,
                      match: event.target.value as AdvancedRecordFilters['match'],
                    }))
                  }
                  disabled={!selectedZoneId || recordsLoading}
                >
                  <option value="">Todos os critérios</option>
                  <option value="any">Qualquer critério</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={handleClearAdvancedFilters}
                disabled={!selectedZoneId || recordsLoading}
              >
                <Trash2 size={16} />
                Limpar
              </button>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleApplyFilters}
            disabled={!selectedZoneId || recordsLoading}
          >
            {recordsLoading ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
            Aplicar filtros
          </button>
        </div>
      </article>

      <ImportExportPanel
        adminActor={adminActor}
        selectedZoneId={selectedZoneId}
        selectedZoneName={selectedZoneName}
        disabled={recordsLoading || saving || batchApplying}
        onImported={() => loadRecords(selectedZoneId, { pageOverride: page })}
      />

      <article className="result-card">
        <header className="result-header">
          <h4>
            <ShieldCheck size={16} /> Registros DNS da zona
          </h4>
          <div className="inline-actions">
            <span>
              {pagination.totalCount} registro(s) · página {pagination.page}/{pagination.totalPages}
            </span>
            <button
              type="button"
              className="primary-button"
              onClick={openNewRecordForm}
              disabled={!selectedZoneId || recordsLoading || saving}
            >
              <Plus size={16} />
              Novo Registro DNS
            </button>
          </div>
        </header>

        {capabilitiesHint && <p className="field-hint">{capabilitiesHint}</p>}

        {selectedIds.size > 0 && (
          <BatchBar
            selectedCount={selectedIds.size}
            selectedMeta={selectedRecordsMeta}
            busy={batchApplying || recordsLoading}
            tagsSupported={tagsSupported}
            commentMaxLength={commentMaxLength}
            onClearSelection={clearSelection}
            onApplyDelete={applyBulkDelete}
            onApplyEdit={applyBulkEdit}
          />
        )}

        {!selectedZoneId ? (
          <p className="result-empty">Selecione um domínio para listar os registros DNS.</p>
        ) : recordsLoading ? (
          <p className="result-empty inline-loading-message">
            <Loader2 size={16} className="spin" /> Carregando registros DNS...
          </p>
        ) : records.length === 0 ? (
          <p className="result-empty">Nenhum registro encontrado com os filtros atuais.</p>
        ) : (
          <div className="cfdns-table-wrap">
            <table className="cfdns-table">
              <thead>
                <tr>
                  <th className="cfdns-select-col">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos os registros da página"
                      checked={allOnPageSelected}
                      onChange={(event) => togglePageRecordsSelection(records, event.target.checked)}
                      disabled={recordsLoading || batchApplying}
                    />
                  </th>
                  {sortableHeader('type', 'Tipo')}
                  {sortableHeader('name', 'Nome')}
                  {sortableHeader('content', 'Conteúdo')}
                  {sortableHeader('ttl', 'TTL')}
                  {sortableHeader('proxied', 'Proxy')}
                  <th>Atualizado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const recordId = String(record.id ?? '');
                  const isDeleting = deletingId === recordId;
                  const isSelected = recordId && draft.recordId === recordId;

                  return (
                    <Fragment key={recordId || `${record.type}-${record.name}-${record.content}`}>
                      <tr className={isSelected ? 'cfdns-row-selected' : ''}>
                        <td className="cfdns-select-col">
                          <input
                            type="checkbox"
                            aria-label={`Selecionar registro ${String(record.type ?? '').toUpperCase()} ${String(record.name ?? '')}`}
                            checked={selectedIds.has(recordId)}
                            onChange={() => toggleRecordSelection(record)}
                            disabled={!recordId || batchApplying}
                          />
                        </td>
                        <td>{String(record.type ?? '').toUpperCase() || '—'}</td>
                        <td title={String(record.name ?? '')}>{String(record.name ?? '') || '—'}</td>
                        <td className="cfdns-cell-content" title={formatRecordContent(record)}>
                          {formatRecordContent(record)}
                        </td>
                        <td>
                          {record.ttl === 1 ? <span className="cfdns-ttl-auto">Auto</span> : (record.ttl ?? 'Auto')}
                        </td>
                        <td>
                          {record.proxied ? (
                            <span
                              className="cfdns-proxy-badge cfdns-proxy-badge--proxied"
                              title="Registro proxied — validação gerenciada pela Cloudflare"
                            >
                              <Cloud size={11} /> Proxied
                            </span>
                          ) : (
                            <span className="cfdns-proxy-badge cfdns-proxy-badge--dns">DNS only</span>
                          )}
                        </td>
                        <td title={formatDateTimeFull(record.modified_on)}>{formatDateTime(record.modified_on)}</td>
                        <td>
                          <div className="cfdns-row-actions">
                            <button
                              type="button"
                              className="ghost-button cfrow-action-btn"
                              onClick={() => hydrateDraftFromRecord(record)}
                              disabled={saving || isDeleting}
                            >
                              <Pencil size={13} />
                              Editar
                            </button>
                            <button
                              type="button"
                              className="ghost-button cfrow-action-btn"
                              onClick={() => void handleDeleteRecord(record)}
                              disabled={saving || isDeleting}
                            >
                              {isDeleting ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>

                      {showRecordForm && isSelected && isEditing ? (
                        <InlineRecordEditor
                          recordId={recordId}
                          draft={draft}
                          setDraft={setDraft}
                          saving={saving}
                          selectedZoneId={selectedZoneId}
                          isSrvDraft={isSrvDraft}
                          isCaaDraft={isCaaDraft}
                          isUriDraft={isUriDraft}
                          isHttpsDraft={isHttpsDraft}
                          isProxyValidated={isProxyValidated}
                          structuredValidation={structuredValidation}
                          tagsSupported={tagsSupported}
                          commentMaxLength={commentMaxLength}
                          closeRecordForm={closeRecordForm}
                          handleSaveRecord={handleSaveRecord}
                        />
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedZoneId && !recordsLoading && records.length > 0 && (
          <div className="cfdns-pagination">
            <div className="cfdns-pagination__nav">
              <button
                type="button"
                className="ghost-button"
                disabled={recordsLoading || page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Página anterior
              </button>
              <button
                type="button"
                className="ghost-button"
                disabled={recordsLoading || page >= pagination.totalPages}
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
              >
                Próxima página
              </button>
            </div>
            <span>
              Página {pagination.page} de {pagination.totalPages} — {pagination.totalCount} registros
            </span>
            <div className="cfdns-pagination__controls">
              <label htmlFor="cfdns-per-page">Por página</label>
              <select
                id="cfdns-per-page"
                name="cfDnsPerPage"
                value={String(perPage)}
                onChange={(event) => handlePerPageChange(Number(event.target.value))}
                disabled={recordsLoading}
              >
                {[20, 50, 100, 200, 500].map((size) => (
                  <option key={size} value={String(size)}>
                    {size}
                  </option>
                ))}
              </select>
              <label htmlFor="cfdns-page-jump">Ir para página</label>
              <input
                id="cfdns-page-jump"
                name="cfDnsPageJump"
                className="cfdns-page-jump-input"
                type="number"
                min={1}
                max={pagination.totalPages}
                placeholder={String(pagination.page)}
                value={pageJumpValue}
                onChange={(event) => setPageJumpValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handlePageJump(pageJumpValue);
                  }
                }}
                disabled={recordsLoading}
              />
              <button
                type="button"
                className="ghost-button"
                onClick={() => handlePageJump(pageJumpValue)}
                disabled={recordsLoading || !pageJumpValue.trim()}
              >
                Ir
              </button>
            </div>
          </div>
        )}
      </article>

      {showRecordForm && !isEditing && (
        <article className="form-card">
          <div className="result-toolbar">
            <div>
              <h4>
                {isEditing ? <Pencil size={16} /> : <Plus size={16} />}{' '}
                {isEditing ? 'Editar registro DNS' : 'Novo registro DNS'}
              </h4>
              <p className="field-hint">
                Crie ou atualize registros com validações inteligentes e confirmação antes de salvar.
              </p>
            </div>
            <div className="inline-actions">
              <button type="button" className="ghost-button" onClick={resetDraft} disabled={saving || recordsLoading}>
                <RefreshCw size={16} />
                Limpar formulário
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={closeRecordForm}
                disabled={saving || recordsLoading}
              >
                <Trash2 size={16} />
                Fechar formulário
              </button>
            </div>
          </div>

          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="cfdns-draft-type">Tipo</label>
              <select
                id="cfdns-draft-type"
                name="cfDnsDraftType"
                value={draft.type}
                onChange={(event) => {
                  const nextType = event.target.value.toUpperCase();
                  setDraft((current) => ({
                    ...current,
                    type: nextType,
                    proxied: current.proxied,
                  }));
                }}
                disabled={saving}
              >
                {RECORD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="cfdns-draft-name">Nome do registro</label>
              <input
                id="cfdns-draft-name"
                name="cfDnsDraftName"
                type="text"
                autoComplete="off"
                placeholder={selectedZoneName ? `ex.: api.${selectedZoneName}` : 'ex.: api.seudominio.com'}
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value.toLowerCase(),
                  }))
                }
                disabled={saving}
              />
            </div>
          </div>

          {!isSrvDraft && !isCaaDraft && !isUriDraft && !isHttpsDraft && !isStructuredDataDraft && (
            <div className="field-group">
              <label htmlFor="cfdns-draft-content">Conteúdo</label>
              <textarea
                id="cfdns-draft-content"
                name="cfDnsDraftContent"
                className="json-textarea"
                rows={4}
                placeholder="ex.: 192.168.0.10, cname.exemplo.com, v=spf1 ..."
                value={draft.content}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                disabled={saving}
              />
              {!isProxyValidated && commonValidation.issues.length > 0 && (
                <p className="field-error" role="alert">
                  {commonValidation.issues[0]}
                </p>
              )}
              {!isProxyValidated && commonValidation.hints.length > 0 && (
                <p className="field-hint">{commonValidation.hints[0]}</p>
              )}
            </div>
          )}

          {isSrvDraft && <SrvDraftFields draft={draft} setDraft={setDraft} saving={saving} />}

          {isCaaDraft && (
            <CaaDraftFields
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              caaValidation={caaValidation}
            />
          )}

          {isUriDraft && (
            <UriDraftFields
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              uriValidation={uriValidation}
            />
          )}

          {isHttpsDraft && (
            <HttpsDraftFields
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              httpsValidation={httpsValidation}
            />
          )}

          {draft.type === 'DS' && (
            <DsDraftFields
              idPrefix="cfdns-ds"
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              validation={structuredValidation}
            />
          )}

          {draft.type === 'DNSKEY' && (
            <DnskeyDraftFields
              idPrefix="cfdns-dnskey"
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              validation={structuredValidation}
            />
          )}

          {draft.type === 'SSHFP' && (
            <SshfpDraftFields
              idPrefix="cfdns-sshfp"
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              validation={structuredValidation}
            />
          )}

          {(draft.type === 'SMIMEA' || draft.type === 'TLSA') && (
            <TlsaDraftFields
              idPrefix="cfdns-tlsa"
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              validation={structuredValidation}
            />
          )}

          {draft.type === 'CERT' && (
            <CertDraftFields
              idPrefix="cfdns-cert"
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              validation={structuredValidation}
            />
          )}

          {draft.type === 'LOC' && (
            <LocDraftFields
              idPrefix="cfdns-loc"
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              validation={structuredValidation}
            />
          )}

          {draft.type === 'NAPTR' && (
            <NaptrDraftFields
              idPrefix="cfdns-naptr"
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              validation={structuredValidation}
            />
          )}

          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="cfdns-draft-ttl">TTL</label>
              <input
                id="cfdns-draft-ttl"
                name="cfDnsDraftTtl"
                type="number"
                min={1}
                max={86400}
                placeholder="1 = auto"
                value={draft.ttl}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    ttl: event.target.value,
                  }))
                }
                disabled={saving}
              />
            </div>

            {!isSrvDraft && (
              <div className="field-group">
                <label htmlFor="cfdns-draft-priority">Priority (MX)</label>
                <input
                  id="cfdns-draft-priority"
                  name="cfDnsDraftPriority"
                  type="number"
                  min={0}
                  max={65535}
                  value={draft.priority}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      priority: event.target.value,
                    }))
                  }
                  disabled={saving}
                />
              </div>
            )}
          </div>

          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="cfdns-draft-comment">Comentário</label>
              <input
                id="cfdns-draft-comment"
                name="cfDnsDraftComment"
                type="text"
                autoComplete="off"
                maxLength={commentMaxLength}
                placeholder="Observação opcional para operação"
                value={draft.comment}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    comment: event.target.value,
                  }))
                }
                disabled={saving}
              />
              <p className="field-hint">
                {draft.comment.length}/{commentMaxLength}
              </p>
            </div>

            <div className="field-group">
              <label htmlFor="cfdns-draft-proxied">Proxy Cloudflare</label>
              <select
                id="cfdns-draft-proxied"
                name="cfDnsDraftProxied"
                value={draft.proxied ? 'true' : 'false'}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    proxied: event.target.value === 'true',
                  }))
                }
                disabled={saving}
              >
                <option value="false">DNS only (cinza)</option>
                <option value="true">Proxied (laranja)</option>
              </select>
            </div>
          </div>

          <TagsInput
            idPrefix="cfdns-draft"
            tags={draft.tags}
            onTagsChange={(tags) => setDraft((current) => ({ ...current, tags }))}
            disabled={saving}
            tagsSupported={tagsSupported}
          />

          {draft.proxied ? (
            <p className="field-hint">
              Proxy laranja ativo: todo registro marcado como proxied passa a ser considerado correto pelo módulo,
              independentemente do tipo ou do conteúdo informado.
            </p>
          ) : null}

          <div className="form-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSaveRecord()}
              disabled={saving || !selectedZoneId}
            >
              {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
              {isEditing ? 'Salvar alterações' : 'Criar registro'}
            </button>
          </div>
        </article>
      )}

      {/* ── Confirm Modal DNS Save (substitui window.confirm) ── */}
      <Dialog
        open={pendingSaveConfirm}
        onOpenChange={(nextOpen) => (!nextOpen ? setPendingSaveConfirm(false) : undefined)}
      >
        <DialogContent overlayClassName="cfdns-zone-dialog-overlay" className="cfdns-zone-dialog">
          <DialogTitle className="cfdns-zone-dialog__title">
            <AlertTriangle size={18} /> {isEditing ? 'Atualizar registro DNS' : 'Criar registro DNS'}
          </DialogTitle>
          <DialogDescription className="cfdns-zone-dialog__description">
            Confirma a {isEditing ? 'atualização' : 'criação'} do registro{' '}
            <strong>
              {draft.type} {draft.name}
            </strong>
            ?
          </DialogDescription>
          <div className="cfdns-zone-dialog__actions">
            <button type="button" className="ghost-button" onClick={() => setPendingSaveConfirm(false)}>
              Cancelar
            </button>
            <button type="button" className="primary-button" onClick={() => void executeSaveRecord()}>
              Confirmar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Modal DNS Delete (substitui window.confirm) ── */}
      <Dialog
        open={pendingDeleteRecord !== null}
        onOpenChange={(nextOpen) => (!nextOpen ? setPendingDeleteRecord(null) : undefined)}
      >
        <DialogContent overlayClassName="cfdns-zone-dialog-overlay" className="cfdns-zone-dialog">
          <DialogTitle className="cfdns-zone-dialog__title">
            <AlertTriangle size={18} /> Excluir registro DNS
          </DialogTitle>
          <DialogDescription className="cfdns-zone-dialog__description">
            Confirma a exclusão do registro{' '}
            <strong>
              {String(pendingDeleteRecord?.type ?? '')} {String(pendingDeleteRecord?.name ?? '')}
            </strong>
            ?<br />
            Esta ação é irreversível.
          </DialogDescription>
          <div className="cfdns-zone-dialog__actions">
            <button type="button" className="ghost-button" onClick={() => setPendingDeleteRecord(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button cfdns-zone-dialog__danger"
              onClick={() => void executeDeleteRecord()}
            >
              Confirmar exclusão
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
