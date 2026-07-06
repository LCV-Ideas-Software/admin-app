/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  AlertTriangle,
  Ban,
  Bot,
  CheckCircle,
  CircleDollarSign,
  FileText,
  GitCompare,
  KeyRound,
  Link2,
  Loader2,
  Play,
  RefreshCw,
  Save,
  UsersRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NotificationProvider, useNotification } from '../../components/Notification';
import { PopupPortal } from '../../components/PopupPortal';
import PostEditor from '../mainsite/PostEditor';

type AgentKey = 'claude' | 'codex' | 'gemini' | 'deepseek' | 'grok' | 'perplexity';
type ArtifactTab = 'text' | 'diff' | 'report' | 'links' | 'meta';

type AgentRate = {
  input_usd_per_million: number;
  output_usd_per_million: number;
  request_usd_per_1k?: number;
};

type AgentSettings = {
  key: AgentKey;
  label: string;
  secret_name: string;
  configured: boolean;
  runtime_ready: boolean;
  financially_ready: boolean;
  model: string;
  rates: AgentRate;
};

type MaestroSettings = {
  protocol_text: string;
  max_cost_usd: number;
  max_runtime_minutes: number | null;
  max_cycles: number;
  rates: Record<AgentKey, AgentRate>;
  models: Record<AgentKey, string>;
  agents: AgentSettings[];
  updated_at: string;
};

type MaestroEvent = {
  at: string;
  agent?: AgentKey;
  role?: 'draft' | 'revision';
  status: 'queued' | 'running' | 'ready' | 'not_ready' | 'blocked' | 'error' | 'finished';
  message: string;
  cost_usd?: number;
  model?: string;
};

type LinkAuditItem = {
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
};

type MaestroSession = {
  id: string;
  title: string;
  status: string;
  initial_agent: AgentKey;
  active_agents: AgentKey[];
  current_author: AgentKey | null;
  current_text: string;
  final_text: string | null;
  observed_cost_usd: number;
  max_cost_usd: number;
  max_runtime_minutes: number | null;
  events: MaestroEvent[];
  created_at: string;
  updated_at: string;
  error: string | null;
};

type MaestroArtifactSummary = {
  id: string;
  session_id: string;
  cycle: number;
  turn: number;
  agent: AgentKey;
  role: 'draft' | 'revision';
  status: string;
  title: string;
  cost_usd: number;
  model: string | null;
  previous_artifact_id: string | null;
  content_bytes: number;
  invalid_links: number;
  created_at: string;
};

type MaestroArtifactDetail = MaestroArtifactSummary & {
  content_md: string;
  revision_report: string;
  link_audit: LinkAuditItem[];
  previous_content_md: string;
};

type ApiTestResult = {
  agent: AgentKey;
  ok: boolean;
  message: string;
  model?: string;
};

const AGENTS: Array<{ key: AgentKey; label: string }> = [
  { key: 'claude', label: 'Claude' },
  { key: 'codex', label: 'Codex' },
  { key: 'gemini', label: 'Gemini' },
  { key: 'deepseek', label: 'DeepSeek' },
  { key: 'grok', label: 'Grok' },
  { key: 'perplexity', label: 'Perplexity' },
];

const ARTIFACT_TABS: Array<{ id: ArtifactTab; label: string; Icon: typeof FileText }> = [
  { id: 'text', label: 'Texto', Icon: FileText },
  { id: 'diff', label: 'Diff', Icon: GitCompare },
  { id: 'report', label: 'Relatório', Icon: AlertTriangle },
  { id: 'links', label: 'Links', Icon: Link2 },
  { id: 'meta', label: 'Metadados', Icon: Bot },
];

const EMPTY_RATES: Record<AgentKey, AgentRate> = {
  claude: { input_usd_per_million: 5, output_usd_per_million: 25 },
  codex: { input_usd_per_million: 5, output_usd_per_million: 30 },
  gemini: { input_usd_per_million: 1.25, output_usd_per_million: 10 },
  deepseek: { input_usd_per_million: 1.74, output_usd_per_million: 3.48 },
  grok: { input_usd_per_million: 1.25, output_usd_per_million: 2.5 },
  perplexity: { input_usd_per_million: 2, output_usd_per_million: 8, request_usd_per_1k: 14 },
};

const EMPTY_MODELS: Record<AgentKey, string> = {
  claude: '',
  codex: '',
  gemini: '',
  deepseek: '',
  grok: '',
  perplexity: '',
};

function PopupNotificationBridge({
  children,
}: {
  children: (
    popupShowNotification: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void,
  ) => ReactNode;
}) {
  const [popupBody, setPopupBody] = useState<HTMLElement | null>(null);

  const detectPopupBody = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const ownerBody = node.ownerDocument?.body;
      if (ownerBody && ownerBody !== document.body) {
        setPopupBody(ownerBody);
      }
    }
  }, []);

  if (!popupBody) {
    return (
      <div ref={detectPopupBody} style={{ display: 'contents' }}>
        {children(() => undefined)}
      </div>
    );
  }

  return (
    <NotificationProvider container={popupBody}>
      <PopupNotificationConsumer>{children}</PopupNotificationConsumer>
    </NotificationProvider>
  );
}

function PopupNotificationConsumer({
  children,
}: {
  children: (
    popupShowNotification: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void,
  ) => ReactNode;
}) {
  const { showNotification } = useNotification();
  return <>{children(showNotification)}</>;
}

const statusLabel: Record<string, string> = {
  queued: 'Na fila',
  running: 'Em execução',
  converged: 'Concluída',
  blocked_cost: 'Bloqueada por custo',
  blocked_time: 'Bloqueada por tempo',
  blocked_max_cycles: 'Sem unanimidade',
  blocked_cycle_limit: 'Limite de turnos atingido',
  blocked_round_incomplete: 'Rodada incompleta',
  blocked_self_review: 'Auto-revisão bloqueada',
  blocked_final_audit: 'Bloqueada na auditoria final',
  blocked_revision_contract: 'Bloqueada por contrato',
  blocked_link_audit: 'Bloqueada por link inválido',
  blocked_cancelled: 'Cancelada',
  error: 'Erro',
};

function agentLabel(agent?: AgentKey | string | null): string {
  return AGENTS.find((item) => item.key === agent)?.label ?? String(agent || 'Maestro AI');
}

function isRunning(status?: string): boolean {
  return status === 'queued' || status === 'running';
}

function eventDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function textToEditorHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\s*</.test(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  if (value < 1024) return `${Math.round(value)} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function simpleDiff(previous: string, current: string): Array<{ type: 'same' | 'added' | 'removed'; text: string }> {
  const before = previous.split(/\r?\n/);
  const after = current.split(/\r?\n/);
  const rows: Array<{ type: 'same' | 'added' | 'removed'; text: string }> = [];
  const max = Math.max(before.length, after.length);
  for (let index = 0; index < max; index += 1) {
    const left = before[index] ?? '';
    const right = after[index] ?? '';
    if (left === right) {
      if (right.trim()) rows.push({ type: 'same', text: right });
      continue;
    }
    if (left.trim()) rows.push({ type: 'removed', text: left });
    if (right.trim()) rows.push({ type: 'added', text: right });
  }
  return rows.slice(0, 220);
}

async function readJson<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let data: T & { ok?: boolean; error?: string };
  try {
    data = JSON.parse(raw) as T & { ok?: boolean; error?: string };
  } catch {
    throw new Error(response.ok ? 'Resposta inesperada do servidor.' : `HTTP ${response.status}`);
  }
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

function mergeSettings(settings: MaestroSettings): MaestroSettings {
  return {
    ...settings,
    rates: Object.fromEntries(
      AGENTS.map((agent) => [agent.key, { ...EMPTY_RATES[agent.key], ...(settings.rates[agent.key] ?? {}) }]),
    ) as Record<AgentKey, AgentRate>,
    models: { ...EMPTY_MODELS, ...settings.models },
  };
}

export function MaestroAiModule() {
  const { showNotification } = useNotification();
  const [sessions, setSessions] = useState<MaestroSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [settings, setSettings] = useState<MaestroSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingApis, setTestingApis] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [postEditorOpen, setPostEditorOpen] = useState(false);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [artifacts, setArtifacts] = useState<MaestroArtifactSummary[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState('');
  const [selectedArtifact, setSelectedArtifact] = useState<MaestroArtifactDetail | null>(null);
  const [artifactTab, setArtifactTab] = useState<ArtifactTab>('text');
  const [title, setTitle] = useState('Artigo acadêmico sem título');
  const [prompt, setPrompt] = useState('');
  const [initialAgent, setInitialAgent] = useState<AgentKey>('claude');
  const [selectedAgents, setSelectedAgents] = useState<AgentKey[]>(AGENTS.map((agent) => agent.key));
  const [editorContent, setEditorContent] = useState('');
  const [apiKeys, setApiKeys] = useState<Record<AgentKey, string>>({
    claude: '',
    codex: '',
    gemini: '',
    deepseek: '',
    grok: '',
    perplexity: '',
  });
  const [protocolText, setProtocolText] = useState('');
  const [maxCostUsd, setMaxCostUsd] = useState<number | ''>(0);
  const [maxRuntimeMinutes, setMaxRuntimeMinutes] = useState<number | ''>('');
  const [maxCycles, setMaxCycles] = useState<number | ''>(2);
  const [rates, setRates] = useState<Record<AgentKey, AgentRate>>(EMPTY_RATES);
  const [models, setModels] = useState<Record<AgentKey, string>>(EMPTY_MODELS);
  const [testResults, setTestResults] = useState<ApiTestResult[]>([]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? sessions[0] ?? null,
    [selectedSessionId, sessions],
  );
  const selectedArtifactSummary = useMemo(
    () => artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? artifacts.at(-1) ?? null,
    [artifacts, selectedArtifactId],
  );

  const latestEvent = selectedSession?.events?.at(-1) ?? null;
  const activeAgent = latestEvent?.status === 'running' ? latestEvent.agent : selectedSession?.current_author;
  const contentForEditor = selectedSession?.final_text || selectedSession?.current_text || editorContent;
  const readyAgents = useMemo(
    () => settings?.agents.filter((agent) => agent.runtime_ready && agent.financially_ready) ?? [],
    [settings],
  );

  const applySettings = useCallback((next: MaestroSettings) => {
    const merged = mergeSettings(next);
    setSettings(merged);
    setProtocolText(merged.protocol_text);
    setMaxCostUsd(Number(merged.max_cost_usd) || 0);
    setMaxRuntimeMinutes(Number(merged.max_runtime_minutes) > 0 ? Number(merged.max_runtime_minutes) : '');
    setMaxCycles(Number(merged.max_cycles) || 2);
    setRates(merged.rates);
    setModels(merged.models);
    const firstReady = merged.agents.find((agent) => agent.configured && agent.financially_ready)?.key;
    const ready = merged.agents
      .filter((agent) => agent.runtime_ready && agent.financially_ready)
      .map((agent) => agent.key);
    if (firstReady) setInitialAgent(firstReady);
    if (ready.length) setSelectedAgents(ready);
  }, []);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const data = await readJson<{ ok: true; settings: MaestroSettings }>(await fetch('/api/maestro-ai/settings'));
      applySettings(data.settings);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Erro ao carregar configurações.', 'error');
    } finally {
      setLoadingSettings(false);
    }
  }, [applySettings, showNotification]);

  const loadSessions = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await readJson<{ ok: true; sessions: MaestroSession[] }>(await fetch('/api/maestro-ai/sessions'));
        setSessions(data.sessions);
        if (!selectedSessionId && data.sessions[0]) setSelectedSessionId(data.sessions[0].id);
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'Erro ao carregar sessões.', 'error');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [selectedSessionId, showNotification],
  );

  const loadArtifacts = useCallback(
    async (sessionId: string, silent = false) => {
      if (!sessionId) return;
      if (!silent) setLoadingArtifacts(true);
      try {
        const data = await readJson<{ ok: true; artifacts: MaestroArtifactSummary[] }>(
          await fetch(`/api/maestro-ai/sessions/${encodeURIComponent(sessionId)}/artifacts`),
        );
        setArtifacts(data.artifacts);
        const nextSelected =
          selectedArtifactId && data.artifacts.some((artifact) => artifact.id === selectedArtifactId)
            ? selectedArtifactId
            : (data.artifacts.at(-1)?.id ?? '');
        setSelectedArtifactId(nextSelected);
      } catch (error) {
        if (!silent) showNotification(error instanceof Error ? error.message : 'Erro ao carregar autos.', 'error');
      } finally {
        if (!silent) setLoadingArtifacts(false);
      }
    },
    [selectedArtifactId, showNotification],
  );

  const loadArtifactDetail = useCallback(
    async (sessionId: string, artifactId: string) => {
      if (!sessionId || !artifactId) {
        setSelectedArtifact(null);
        return;
      }
      try {
        const data = await readJson<{ ok: true; artifact: MaestroArtifactDetail }>(
          await fetch(
            `/api/maestro-ai/sessions/${encodeURIComponent(sessionId)}/artifacts/${encodeURIComponent(artifactId)}`,
          ),
        );
        setSelectedArtifact(data.artifact);
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'Erro ao carregar artefato.', 'error');
      }
    },
    [showNotification],
  );

  useEffect(() => {
    void loadSettings();
    void loadSessions();
  }, [loadSettings, loadSessions]);

  useEffect(() => {
    if (!selectedSession || !isRunning(selectedSession.status)) return;
    const timer = window.setInterval(() => {
      void loadSessions(true);
      void loadArtifacts(selectedSession.id, true);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [loadArtifacts, loadSessions, selectedSession]);

  useEffect(() => {
    if (!selectedSession?.id) {
      setArtifacts([]);
      setSelectedArtifactId('');
      setSelectedArtifact(null);
      return;
    }
    void loadArtifacts(selectedSession.id, true);
  }, [loadArtifacts, selectedSession?.id]);

  useEffect(() => {
    if (!selectedSession?.id || !selectedArtifactSummary?.id) {
      setSelectedArtifact(null);
      return;
    }
    void loadArtifactDetail(selectedSession.id, selectedArtifactSummary.id);
  }, [loadArtifactDetail, selectedArtifactSummary?.id, selectedSession?.id]);

  const updateRate = (agent: AgentKey, key: keyof AgentRate, value: string) => {
    const numeric = Number(value);
    setRates((current) => ({
      ...current,
      [agent]: {
        ...current[agent],
        [key]: Number.isFinite(numeric) ? numeric : 0,
      },
    }));
  };

  const saveSettings = async () => {
    if (!settings) {
      showNotification('Aguarde o carregamento das configurações antes de salvar.', 'error');
      return;
    }
    const nextMaxCostUsd = Number(maxCostUsd);
    const nextMaxRuntimeMinutes = maxRuntimeMinutes === '' ? null : Number(maxRuntimeMinutes);
    const nextMaxCycles = Number(maxCycles);
    if (protocolText.trim().length < 100) {
      showNotification('Protocolo editorial integral deve ter pelo menos 100 caracteres.', 'error');
      return;
    }
    if (!Number.isFinite(nextMaxCostUsd) || nextMaxCostUsd <= 0) {
      showNotification('Teto financeiro em USD deve ser positivo.', 'error');
      return;
    }
    if (!Number.isInteger(nextMaxCycles) || nextMaxCycles < 1 || nextMaxCycles > 5) {
      showNotification('Ciclos máximos devem ser um inteiro entre 1 e 5.', 'error');
      return;
    }
    if (
      nextMaxRuntimeMinutes != null &&
      (!Number.isFinite(nextMaxRuntimeMinutes) || nextMaxRuntimeMinutes < 1 || nextMaxRuntimeMinutes > 720)
    ) {
      showNotification('Limite de tempo opcional deve ficar entre 1 e 720 minutos.', 'error');
      return;
    }
    setSavingSettings(true);
    try {
      const api_keys = Object.fromEntries(
        AGENTS.map((agent) => [agent.key, apiKeys[agent.key].trim()]).filter(([, value]) => Boolean(value)),
      );
      const data = await readJson<{ ok: true; settings: MaestroSettings }>(
        await fetch('/api/maestro-ai/settings', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            protocol_text: protocolText,
            max_cost_usd: nextMaxCostUsd,
            max_runtime_minutes: nextMaxRuntimeMinutes,
            max_cycles: nextMaxCycles,
            rates,
            models,
            api_keys,
          }),
        }),
      );
      applySettings(data.settings);
      setApiKeys({ claude: '', codex: '', gemini: '', deepseek: '', grok: '', perplexity: '' });
      showNotification('Configurações salvas.', 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Erro ao salvar configurações.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const testApis = async () => {
    if (!settings) {
      showNotification('Aguarde o carregamento das configurações antes de testar.', 'error');
      return;
    }
    setTestingApis(true);
    setTestResults([]);
    try {
      const data = await readJson<{ ok: true; results: ApiTestResult[] }>(
        await fetch('/api/maestro-ai/settings/test', { method: 'POST' }),
      );
      setTestResults(data.results);
      const failed = data.results.filter((result) => !result.ok).length;
      showNotification(
        failed ? `${failed} agente(s) exigem atenção.` : 'Todos os agentes configurados responderam.',
        failed ? 'error' : 'success',
      );
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Erro ao testar agentes.', 'error');
    } finally {
      setTestingApis(false);
    }
  };

  const startSession = async () => {
    if (!prompt.trim()) {
      showNotification('Descreva o trabalho editorial antes de iniciar.', 'error');
      return;
    }
    if (readyAgents.length < 2) {
      showNotification('Configure pelo menos dois agentes antes de iniciar.', 'error');
      return;
    }
    const validSelectedAgents = selectedAgents.filter((agent) => readyAgents.some((ready) => ready.key === agent));
    if (validSelectedAgents.length < 2) {
      showNotification('Selecione pelo menos dois agentes prontos para o colegiado.', 'error');
      return;
    }
    if (!validSelectedAgents.includes(initialAgent)) {
      showNotification('O redator inicial deve participar do colegiado selecionado.', 'error');
      return;
    }
    setStarting(true);
    try {
      const data = await readJson<{ ok: true; session: MaestroSession }>(
        await fetch('/api/maestro-ai/sessions', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title,
            prompt,
            initial_agent: initialAgent,
            active_agents: validSelectedAgents,
            initial_content: editorContent,
          }),
        }),
      );
      setSelectedSessionId(data.session.id);
      await loadSessions(true);
      showNotification('Sessão Maestro AI iniciada.', 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Erro ao iniciar sessão.', 'error');
    } finally {
      setStarting(false);
    }
  };

  const cancelSession = async (sessionId: string) => {
    setCancelling(true);
    try {
      await readJson<{ ok: true; session: MaestroSession }>(
        await fetch(`/api/maestro-ai/sessions/${encodeURIComponent(sessionId)}/cancel`, { method: 'POST' }),
      );
      await loadSessions(true);
      showNotification('Sessão cancelada.', 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Erro ao cancelar sessão.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const createMainSitePost = async (
    postTitle: string,
    author: string,
    htmlContent: string,
    isPublished: boolean,
  ): Promise<boolean> => {
    setCreatingPost(true);
    try {
      const response = await fetch('/api/mainsite/posts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-Admin-Actor': 'Maestro AI Web',
        },
        body: JSON.stringify({
          title: postTitle,
          author,
          content: htmlContent,
          is_published: isPublished ? 1 : 0,
          adminActor: 'Maestro AI Web',
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; post?: { id?: number } };
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || 'Falha ao criar post do MainSite.');
      }
      if (payload.post?.id) {
        void fetch('/api/mainsite/post-summaries', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'regenerate', postId: payload.post.id }),
        }).catch(() => undefined);
      }
      setPostEditorOpen(false);
      showNotification(
        payload.post?.id ? `Post #${payload.post.id} criado no MainSite.` : 'Post criado no MainSite.',
        'success',
      );
      return true;
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Erro ao criar post.', 'error');
      return false;
    } finally {
      setCreatingPost(false);
    }
  };

  return (
    <section className="detail-panel module-shell module-shell-maestro-ai">
      <div className="detail-header">
        <div className="detail-icon">
          <Bot size={20} />
        </div>
        <div>
          <p className="eyebrow">Maestro AI</p>
          <strong>Redação editorial em colegiado circular</strong>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {selectedSession && isRunning(selectedSession.status) && (
            <button
              type="button"
              className="ghost-button"
              onClick={() => void cancelSession(selectedSession.id)}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 size={14} className="spin" /> : <Ban size={14} />} Cancelar
            </button>
          )}
          <button type="button" className="ghost-button" onClick={() => void loadSessions()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Atualizar
          </button>
        </div>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginTop: 18 }}>
        <article className="metric-card">
          <span className="eyebrow">Sessão</span>
          <strong>
            {selectedSession ? statusLabel[selectedSession.status] || selectedSession.status : 'Sem sessão'}
          </strong>
        </article>
        <article className="metric-card">
          <span className="eyebrow">Com o trabalho agora</span>
          <strong>{agentLabel(activeAgent)}</strong>
        </article>
        <article className="metric-card">
          <span className="eyebrow">Agentes prontos</span>
          <strong>
            {readyAgents.length} / {AGENTS.length}
          </strong>
        </article>
        <article className="metric-card">
          <span className="eyebrow">Teto configurado</span>
          <strong>US$ {(settings?.max_cost_usd ?? 0).toFixed(2)}</strong>
        </article>
      </div>

      <section aria-labelledby="maestro-session-heading">
        <div className="detail-header" style={{ padding: 0, border: 'none', marginTop: 22 }}>
          <div className="detail-icon">
            <Bot size={16} />
          </div>
          <div>
            <p className="eyebrow">Seção operacional</p>
            <strong id="maestro-session-heading">Sessão</strong>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(340px, 0.8fr) minmax(460px, 1.2fr)',
            gap: 18,
            marginTop: 18,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <form className="form-card" onSubmit={(event) => event.preventDefault()}>
              <div className="detail-header" style={{ padding: 0, border: 'none', marginBottom: 14 }}>
                <div className="detail-icon">
                  <Play size={16} />
                </div>
                <div>
                  <p className="eyebrow">Nova sessão</p>
                  <strong>Pedido editorial</strong>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="maestro-title">Título</label>
                <input id="maestro-title" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="field-group">
                <label htmlFor="maestro-prompt">Pedido do usuário</label>
                <textarea
                  id="maestro-prompt"
                  rows={7}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Descreva o texto, objetivo, público, tom, restrições e fontes desejadas."
                />
              </div>
              <div className="field-group">
                <label htmlFor="maestro-initial-content">Texto inicial opcional</label>
                <textarea
                  id="maestro-initial-content"
                  rows={5}
                  value={editorContent}
                  onChange={(event) => setEditorContent(event.target.value)}
                  placeholder="Cole aqui um rascunho existente caso a sessão deva partir de um texto já produzido."
                />
              </div>
              <div className="field-group">
                <label htmlFor="maestro-initial-agent">Redator inicial</label>
                <select
                  id="maestro-initial-agent"
                  value={initialAgent}
                  onChange={(event) => setInitialAgent(event.target.value as AgentKey)}
                >
                  {AGENTS.map((agent) => (
                    <option
                      key={agent.key}
                      value={agent.key}
                      disabled={!readyAgents.some((ready) => ready.key === agent.key)}
                    >
                      {agent.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label>Colegiado participante</label>
                <div style={{ display: 'grid', gap: 8 }}>
                  {AGENTS.map((agent) => {
                    const ready = readyAgents.some((item) => item.key === agent.key);
                    return (
                      <label key={agent.key} className="result-row" style={{ justifyContent: 'space-between' }}>
                        <span>
                          <strong>{agent.label}</strong>
                          <small style={{ display: 'block', color: '#64748b' }}>
                            {ready ? 'pronto' : 'configure chave e valores em Configurações'}
                          </small>
                        </span>
                        <input
                          type="checkbox"
                          checked={selectedAgents.includes(agent.key)}
                          disabled={!ready}
                          onChange={() => {
                            setSelectedAgents((current) => {
                              const next = current.includes(agent.key)
                                ? current.filter((item) => item !== agent.key)
                                : [...current, agent.key];
                              return next.includes(initialAgent) ? next : [initialAgent, ...next];
                            });
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => void startSession()}
                disabled={starting || loadingSettings}
              >
                {starting ? <Loader2 size={16} className="spin" /> : <Play size={16} />} Iniciar sessão
              </button>
            </form>

            <article className="result-card">
              <div className="detail-header" style={{ padding: 0, border: 'none', marginBottom: 12 }}>
                <div className="detail-icon">
                  <UsersRound size={16} />
                </div>
                <div>
                  <p className="eyebrow">Histórico</p>
                  <strong>Sessões recentes</strong>
                </div>
              </div>
              {sessions.length === 0 ? (
                <p className="result-empty">Nenhuma sessão registrada.</p>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      className="ghost-button"
                      onClick={() => setSelectedSessionId(session.id)}
                      style={{
                        justifyContent: 'space-between',
                        background: selectedSessionId === session.id ? 'var(--module-accent-soft)' : undefined,
                      }}
                    >
                      <span>{session.title}</span>
                      <span>{statusLabel[session.status] || session.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </article>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            <article className="result-card">
              <div className="detail-header" style={{ padding: 0, border: 'none', marginBottom: 12 }}>
                <div className="detail-icon">
                  {selectedSession?.status === 'converged' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                </div>
                <div>
                  <p className="eyebrow">Rastreamento</p>
                  <strong>Agente ativo: {agentLabel(activeAgent)}</strong>
                </div>
              </div>
              {selectedSession?.events?.length ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {selectedSession.events.slice(-8).map((event, index) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: session event log is append-only and timestamp may repeat
                      key={`${event.at}-${index}`}
                      className="result-row"
                      style={{ alignItems: 'flex-start', gap: 10 }}
                    >
                      <span className="status-pill">{event.status}</span>
                      <span style={{ flex: 1 }}>
                        <strong>{agentLabel(event.agent)}</strong>
                        <small style={{ display: 'block', color: '#64748b' }}>
                          {eventDate(event.at)} · {event.message}
                          {event.cost_usd != null ? ` · US$ ${event.cost_usd.toFixed(4)}` : ''}
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="result-empty">Sem eventos para exibir.</p>
              )}
            </article>

            <article className="result-card">
              <div className="detail-header" style={{ padding: 0, border: 'none', marginBottom: 12 }}>
                <div className="detail-icon">
                  <FileText size={16} />
                </div>
                <div>
                  <p className="eyebrow">Autos / Evidências</p>
                  <strong>Cadeia viva de revisão</strong>
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  style={{ marginLeft: 'auto' }}
                  disabled={!selectedSession || loadingArtifacts}
                  onClick={() => selectedSession && void loadArtifacts(selectedSession.id)}
                >
                  <RefreshCw size={14} className={loadingArtifacts ? 'spin' : ''} /> Atualizar autos
                </button>
              </div>
              {artifacts.length === 0 ? (
                <p className="result-empty">
                  Os artefatos aparecerão aqui conforme os agentes produzirem drafts e revisões.
                </p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(220px, 0.75fr) minmax(300px, 1.25fr)',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
                    {artifacts.map((artifact) => (
                      <button
                        key={artifact.id}
                        type="button"
                        className="ghost-button"
                        onClick={() => setSelectedArtifactId(artifact.id)}
                        style={{
                          display: 'grid',
                          gap: 4,
                          justifyItems: 'start',
                          textAlign: 'left',
                          background:
                            selectedArtifactSummary?.id === artifact.id ? 'var(--module-accent-soft)' : undefined,
                        }}
                      >
                        <span>
                          Ciclo {artifact.cycle} · Turno {artifact.turn} · {agentLabel(artifact.agent)}
                        </span>
                        <small style={{ color: '#64748b' }}>
                          {artifact.role} · {artifact.status} · {formatBytes(artifact.content_bytes)}
                          {artifact.invalid_links ? ` · ${artifact.invalid_links} link(s) inválido(s)` : ''}
                        </small>
                      </button>
                    ))}
                  </div>
                  <div className="result-row" style={{ display: 'block', minWidth: 0 }}>
                    {selectedArtifact ? (
                      <>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                          {ARTIFACT_TABS.map(({ id, label, Icon }) => (
                            <button
                              key={id}
                              type="button"
                              className={artifactTab === id ? 'primary-button' : 'ghost-button'}
                              onClick={() => setArtifactTab(id)}
                              style={{ padding: '7px 10px' }}
                            >
                              <Icon size={14} /> {label}
                            </button>
                          ))}
                        </div>
                        {artifactTab === 'text' && (
                          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 420, overflow: 'auto', margin: 0 }}>
                            {selectedArtifact.content_md}
                          </pre>
                        )}
                        {artifactTab === 'diff' && (
                          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 420, overflow: 'auto', margin: 0 }}>
                            {simpleDiff(selectedArtifact.previous_content_md, selectedArtifact.content_md)
                              .map(
                                (row) =>
                                  `${row.type === 'added' ? '+ ' : row.type === 'removed' ? '- ' : '  '}${row.text}`,
                              )
                              .join('\n') || 'Primeiro artefato da sessão.'}
                          </pre>
                        )}
                        {artifactTab === 'report' && (
                          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 420, overflow: 'auto', margin: 0 }}>
                            {selectedArtifact.revision_report || '{}'}
                          </pre>
                        )}
                        {artifactTab === 'links' && (
                          <div style={{ display: 'grid', gap: 8 }}>
                            {selectedArtifact.link_audit.length === 0 ? (
                              <p className="result-empty">Nenhum link encontrado neste artefato.</p>
                            ) : (
                              selectedArtifact.link_audit.map((link) => (
                                <div key={link.url} className="result-row" style={{ justifyContent: 'space-between' }}>
                                  <span style={{ overflowWrap: 'anywhere' }}>{link.url}</span>
                                  <span className="status-pill">
                                    {link.ok
                                      ? 'válido'
                                      : link.status
                                        ? `inválido ${link.status}`
                                        : link.error || 'inválido'}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                        {artifactTab === 'meta' && (
                          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                            {JSON.stringify(
                              {
                                id: selectedArtifact.id,
                                cycle: selectedArtifact.cycle,
                                turn: selectedArtifact.turn,
                                agent: selectedArtifact.agent,
                                role: selectedArtifact.role,
                                status: selectedArtifact.status,
                                model: selectedArtifact.model,
                                cost_usd: selectedArtifact.cost_usd,
                                previous_artifact_id: selectedArtifact.previous_artifact_id,
                                content_bytes: selectedArtifact.content_bytes,
                                created_at: selectedArtifact.created_at,
                              },
                              null,
                              2,
                            )}
                          </pre>
                        )}
                      </>
                    ) : (
                      <p className="result-empty">
                        Selecione um artefato para consultar texto, diff, relatório, links e metadados.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </article>

            <article className="result-card">
              <div className="detail-header" style={{ padding: 0, border: 'none', marginBottom: 12 }}>
                <div className="detail-icon">
                  {selectedSession?.status === 'converged' ? <CheckCircle size={16} /> : <FileText size={16} />}
                </div>
                <div>
                  <p className="eyebrow">Texto</p>
                  <strong>{selectedSession?.status === 'converged' ? 'Texto final' : 'Texto atual'}</strong>
                </div>
                {selectedSession?.status === 'converged' && selectedSession.final_text && (
                  <button
                    type="button"
                    className="primary-button"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setPostEditorOpen(true)}
                  >
                    <FileText size={16} /> Criar Post
                  </button>
                )}
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 360, overflow: 'auto', margin: 0 }}>
                {contentForEditor || 'Nenhum texto produzido ainda.'}
              </pre>
            </article>

            {selectedSession?.error && (
              <article className="result-card" style={{ borderColor: 'rgba(220, 38, 38, 0.35)' }}>
                <strong>Erro operacional</strong>
                <p>{selectedSession.error}</p>
              </article>
            )}
          </div>
        </div>
      </section>

      <PopupPortal
        isOpen={Boolean(postEditorOpen && selectedSession?.final_text)}
        onClose={() => setPostEditorOpen(false)}
        title="Criar Post — Maestro AI"
      >
        {selectedSession?.final_text && (
          <PopupNotificationBridge>
            {(popupNotify) => (
              <PostEditor
                key={`maestro-create-post-${selectedSession.id}-${selectedSession.updated_at}`}
                editingPostId={null}
                initialTitle={selectedSession.title || title}
                initialAuthor="Maestro AI"
                initialContent={textToEditorHtml(selectedSession.final_text ?? '')}
                savingPost={creatingPost}
                showNotification={popupNotify}
                onSave={(postTitle, author, htmlContent, isPublished) =>
                  createMainSitePost(postTitle, author, htmlContent, isPublished)
                }
                onClose={() => setPostEditorOpen(false)}
              />
            )}
          </PopupNotificationBridge>
        )}
      </PopupPortal>

      <section aria-labelledby="maestro-settings-heading">
        <div className="detail-header" style={{ padding: 0, border: 'none', marginTop: 28 }}>
          <div className="detail-icon">
            <KeyRound size={16} />
          </div>
          <div>
            <p className="eyebrow">Seção operacional</p>
            <strong id="maestro-settings-heading">Configurações</strong>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(360px, 0.9fr) minmax(420px, 1.1fr)',
            gap: 18,
            marginTop: 18,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <article className="result-card">
              <div className="detail-header" style={{ padding: 0, border: 'none', marginBottom: 12 }}>
                <div className="detail-icon">
                  <KeyRound size={16} />
                </div>
                <div>
                  <p className="eyebrow">Ajustes</p>
                  <strong>Chaves dos agentes</strong>
                </div>
              </div>
              <p style={{ color: '#64748b', marginTop: 0 }}>
                As chaves são enviadas ao backend apenas para gravação no Cloudflare Secret Store. Valores salvos não
                são retornados para o navegador.
              </p>
              <div style={{ display: 'grid', gap: 10 }}>
                {AGENTS.map((agent) => {
                  const saved = settings?.agents.find((item) => item.key === agent.key);
                  return (
                    <div
                      key={agent.key}
                      className="result-row"
                      style={{ display: 'grid', gridTemplateColumns: '110px 1fr auto', gap: 10, alignItems: 'center' }}
                    >
                      <strong>{agent.label}</strong>
                      <input
                        type="password"
                        value={apiKeys[agent.key]}
                        onChange={(event) => setApiKeys((current) => ({ ...current, [agent.key]: event.target.value }))}
                        placeholder={
                          saved?.configured
                            ? 'Chave já configurada; preencha apenas para substituir'
                            : 'Informe a chave'
                        }
                        autoComplete="off"
                      />
                      <span className="status-pill">
                        {saved?.runtime_ready ? 'ativa' : saved?.configured ? 'salva' : 'pendente'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void saveSettings()}
                  disabled={savingSettings || loadingSettings || !settings}
                >
                  {savingSettings ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Salvar
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => void testApis()}
                  disabled={testingApis || loadingSettings || !settings}
                >
                  {testingApis ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} Testar chaves
                </button>
              </div>
              {testResults.length > 0 && (
                <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                  {testResults.map((result) => (
                    <div key={result.agent} className="result-row" style={{ justifyContent: 'space-between' }}>
                      <span>
                        <strong>{agentLabel(result.agent)}</strong>
                        <small style={{ display: 'block', color: '#64748b' }}>{result.message}</small>
                      </span>
                      <span className="status-pill">{result.ok ? 'ok' : 'falha'}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="result-card">
              <div className="detail-header" style={{ padding: 0, border: 'none', marginBottom: 12 }}>
                <div className="detail-icon">
                  <CircleDollarSign size={16} />
                </div>
                <div>
                  <p className="eyebrow">Custos</p>
                  <strong>Valores dos tokens</strong>
                </div>
              </div>
              <div className="field-group maestro-cost-field">
                <label htmlFor="maestro-settings-max-cost">Teto financeiro por sessão (USD)</label>
                <input
                  id="maestro-settings-max-cost"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={maxCostUsd}
                  onChange={(event) => {
                    const value = event.target.value;
                    setMaxCostUsd(value === '' ? '' : Number(value));
                  }}
                />
              </div>
              <div className="field-group maestro-cost-field">
                <label htmlFor="maestro-settings-max-cycles">Ciclos máximos</label>
                <input
                  id="maestro-settings-max-cycles"
                  type="number"
                  min="1"
                  max="5"
                  step="1"
                  value={maxCycles}
                  onChange={(event) => {
                    const value = event.target.value;
                    setMaxCycles(value === '' ? '' : Number(value));
                  }}
                />
              </div>
              <div className="field-group maestro-cost-field">
                <label htmlFor="maestro-settings-max-runtime">Limite de tempo opcional (minutos)</label>
                <input
                  id="maestro-settings-max-runtime"
                  type="number"
                  min="1"
                  max="720"
                  step="1"
                  value={maxRuntimeMinutes}
                  onChange={(event) => {
                    const value = event.target.value;
                    setMaxRuntimeMinutes(value === '' ? '' : Number(value));
                  }}
                  placeholder="Sem limite"
                />
              </div>
              <div className="maestro-rate-list">
                {AGENTS.map((agent) => (
                  <div key={agent.key} className="result-row maestro-rate-row">
                    <strong>{agent.label}</strong>
                    <input
                      className="maestro-rate-input"
                      aria-label={`${agent.label} input USD per million`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={rates[agent.key].input_usd_per_million}
                      onChange={(event) => updateRate(agent.key, 'input_usd_per_million', event.target.value)}
                      placeholder="Entrada"
                    />
                    <input
                      className="maestro-rate-input"
                      aria-label={`${agent.label} output USD per million`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={rates[agent.key].output_usd_per_million}
                      onChange={(event) => updateRate(agent.key, 'output_usd_per_million', event.target.value)}
                      placeholder="Saída"
                    />
                    {agent.key === 'perplexity' && (
                      <label className="maestro-request-rate">
                        Busca / 1k req.
                        <input
                          className="maestro-rate-input"
                          aria-label="Perplexity search requests USD per thousand"
                          type="number"
                          min="0"
                          step="0.01"
                          value={rates.perplexity.request_usd_per_1k ?? 0}
                          onChange={(event) => updateRate('perplexity', 'request_usd_per_1k', event.target.value)}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </article>

            <article className="result-card">
              <div className="detail-header" style={{ padding: 0, border: 'none', marginBottom: 12 }}>
                <div className="detail-icon">
                  <Bot size={16} />
                </div>
                <div>
                  <p className="eyebrow">Modelos</p>
                  <strong>Modelo por agente</strong>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {AGENTS.map((agent) => (
                  <div
                    key={agent.key}
                    className="result-row"
                    style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 10, alignItems: 'center' }}
                  >
                    <strong>{agent.label}</strong>
                    <input
                      value={models[agent.key]}
                      onChange={(event) => setModels((current) => ({ ...current, [agent.key]: event.target.value }))}
                      placeholder="Modelo padrão"
                    />
                  </div>
                ))}
              </div>
            </article>
          </div>

          <article className="result-card">
            <div className="detail-header" style={{ padding: 0, border: 'none', marginBottom: 12 }}>
              <div className="detail-icon">
                <KeyRound size={16} />
              </div>
              <div>
                <p className="eyebrow">Ajustes internos</p>
                <strong>Protocolo editorial</strong>
              </div>
            </div>
            <p style={{ color: '#64748b', marginTop: 0 }}>
              O protocolo fica salvo no D1 e é carregado automaticamente em todas as sessões.
            </p>
            <div className="field-group">
              <label htmlFor="maestro-protocol">Protocolo editorial integral</label>
              <textarea
                id="maestro-protocol"
                rows={24}
                value={protocolText}
                onChange={(event) => setProtocolText(event.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => void saveSettings()}
                disabled={savingSettings || loadingSettings || !settings}
              >
                {savingSettings ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Salvar configurações
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => void loadSettings()}
                disabled={loadingSettings}
              >
                <RefreshCw size={16} className={loadingSettings ? 'spin' : ''} /> Recarregar
              </button>
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}
