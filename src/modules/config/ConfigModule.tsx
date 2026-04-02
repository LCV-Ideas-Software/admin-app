/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Database, Globe, Loader2, Newspaper, Plus, RefreshCw, Rocket, Save, Search, Settings2, ShieldCheck, Trash2, Zap, Upload, BrainCircuit } from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { RateLimitPanel } from '../../components/RateLimitPanel'
import { SyncStatusCard } from '../../components/SyncStatusCard'
import { DeploymentCleanupPanel } from '../../components/DeploymentCleanupPanel'
import { useModuleConfig } from '../../lib/useModuleConfig'
import {
  loadNewsSettings, saveNewsSettings, dispatchNewsSettingsChange,
  slugify, DEFAULT_NEWS_SETTINGS, type NewsSettings, type NewsSource
} from '../../lib/newsSettings'

export type AIModelRegistry = {
  id: string
  version: string
  displayName: string
  description: string
  inputTokenLimit: number
  outputTokenLimit: number
  supportedGenerationMethods: string[]
  temperature?: number
  topP?: number
  topK?: number
  vision?: boolean
  api: 'gemini'
}

type AdminRuntimeConfig = {
  defaultAdminActor: string
  defaultOverviewLimit: number
  enableOperationalToasts: boolean
  strictValidationMode: boolean
  requireConfirmBeforeDelete: boolean
}

// ── MainSite settings types (appearance + rotation) ──────────
type AppearanceSettings = {
  allowAutoMode: boolean
  light: { bgColor: string; bgImage: string; fontColor: string; titleColor: string }
  dark: { bgColor: string; bgImage: string; fontColor: string; titleColor: string }
  shared: {
    fontSize: string; titleFontSize: string; fontFamily: string
    bodyWeight?: string; titleWeight?: string; lineHeight?: string
    textAlign?: string; textIndent?: string; paragraphSpacing?: string
    contentMaxWidth?: string; linkColor?: string
  }
}

type RotationSettings = {
  enabled: boolean
  interval: number
}

const DEFAULT_APPEARANCE: AppearanceSettings = {
  allowAutoMode: true,
  light: { bgColor: '#f8f9fa', bgImage: '', fontColor: '#202124', titleColor: '#1a73e8' },
  dark: { bgColor: '#131314', bgImage: '', fontColor: '#e3e3e3', titleColor: '#8ab4f8' },
  shared: {
    fontSize: '1rem', titleFontSize: '1.5rem', fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    bodyWeight: '500', titleWeight: '700', lineHeight: '1.9',
    textAlign: 'justify', textIndent: '3.5rem', paragraphSpacing: '2.2rem',
    contentMaxWidth: '1126px', linkColor: '#4da6ff',
  },
}

const DEFAULT_ROTATION: RotationSettings = { enabled: false, interval: 60 }

const STORAGE_KEY = 'admin-app/runtime-config/v1'

const DEFAULT_CONFIG: AdminRuntimeConfig = {
  defaultAdminActor: 'admin@app.lcv',
  defaultOverviewLimit: 30,
  enableOperationalToasts: true,
  strictValidationMode: true,
  requireConfirmBeforeDelete: true,
}

const normalizeLimit = (value: number) => Math.max(1, Math.min(100, Math.trunc(value || 1)))



export function ConfigModule() {
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [runtimeConfig, saveRuntimeConfig] = useModuleConfig<AdminRuntimeConfig>(STORAGE_KEY, DEFAULT_CONFIG)
  const [config, setConfig] = useState<AdminRuntimeConfig>(DEFAULT_CONFIG)
  const [baselineConfig, setBaselineConfig] = useState<AdminRuntimeConfig>(DEFAULT_CONFIG)
  const [selectedRateModule, setSelectedRateModule] = useState('')
  const [selectedSyncModule, setSelectedSyncModule] = useState('')

  // ── MainSite settings (appearance + rotation) state ──
  const [msAppearance, setMsAppearance] = useState<AppearanceSettings>(DEFAULT_APPEARANCE)
  const [msRotation, setMsRotation] = useState<RotationSettings>(DEFAULT_ROTATION)
  const [msAiModels, setMsAiModels] = useState<{ chat: string; summary: string }>({ chat: '', summary: '' })
  const [msSettingsLoading, setMsSettingsLoading] = useState(false)
  const [msSavingSettings, setMsSavingSettings] = useState(false)
  const [adminActor] = useState('admin@app.lcv')
  
  // ── Gemini Models Loader ──
  const [geminiModels, setGeminiModels] = useState<AIModelRegistry[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  
  const loadModels = useCallback(async () => {
    setModelsLoading(true)
    try {
      const res = await fetch('/api/mainsite/modelos', {
        headers: { 'X-Admin-Actor': adminActor },
      })
      const payload = await res.json() as { ok: boolean; models: AIModelRegistry[] }
      if (payload.ok && payload.models) {
        setGeminiModels(payload.models)
      }
    } catch {
      // Falha silenciosa pra não poluir.
    } finally {
      setModelsLoading(false)
    }
  }, [adminActor])

  useEffect(() => {
    void loadModels()
  }, [loadModels])

  // ── Upload state (R2 Backgrounds) ──
  const [isUploadingBg, setIsUploadingBg] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<'dark' | 'light' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatImageUrl = (url: string): string => {
    if (!url) return ''
    const driveRegex = /(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/
    const match = url.match(driveRegex)
    if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`
    return url
  }

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget) return
    setIsUploadingBg(true)
    showNotification(`Enviando fundo para a paleta ${uploadTarget}...`, 'info')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/mainsite/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Falha no upload do backgroud.')
      const data = await res.json() as { url: string }
      setMsAppearance(prev => ({
        ...prev,
        [uploadTarget]: { ...prev[uploadTarget as 'dark' | 'light'], bgImage: data.url }
      }))
      showNotification(`Upload do fundo (${uploadTarget}) concluído.`, 'success')
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro no upload.', 'error')
    } finally {
      setIsUploadingBg(false)
      setUploadTarget(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── News panel settings ──
  const [newsSettings, setNewsSettings] = useState<NewsSettings>(DEFAULT_NEWS_SETTINGS)

  // Carregar do D1 no mount
  useEffect(() => {
    void loadNewsSettings().then(setNewsSettings)
  }, [])

  const updateNewsSettings = useCallback((patch: Partial<NewsSettings>) => {
    setNewsSettings(prev => {
      const next = { ...prev, ...patch }
      void saveNewsSettings(next)
      dispatchNewsSettingsChange()
      showNotification('Configurações de notícias salvas.', 'success')
      return next
    })
  }, [showNotification])

  const handleNewsSourceToggle = useCallback((sourceId: string) => {
    const current = newsSettings.enabledSources
    const next = current.includes(sourceId)
      ? current.filter(id => id !== sourceId)
      : [...current, sourceId]
    if (next.length === 0) return
    updateNewsSettings({ enabledSources: next })
  }, [newsSettings.enabledSources, updateNewsSettings])

  // ── New source form + discovery engine ──
  const [newSourceName, setNewSourceName] = useState('')
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [newSourceCategory, setNewSourceCategory] = useState('')

  // Discovery autocomplete state
  interface RssSuggestion {
    id: string; name: string; url: string; category: string
    source: 'curated' | 'google-news' | 'gemini-ai' | 'auto-detect'
  }
  const [suggestions, setSuggestions] = useState<RssSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [activeField, setActiveField] = useState<'name' | 'url' | 'category' | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const discoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Category filter for sources list
  const [sourceCategoryFilter, setSourceCategoryFilter] = useState('__all__')

  const sourceCategories = useMemo(() => {
    const cats = new Set(newsSettings.sources.map(s => s.category))
    return Array.from(cats).sort()
  }, [newsSettings.sources])

  const filteredSources = useMemo(() => {
    if (sourceCategoryFilter === '__all__') return newsSettings.sources
    return newsSettings.sources.filter(s => s.category === sourceCategoryFilter)
  }, [newsSettings.sources, sourceCategoryFilter])

  // Debounced discovery fetch
  const triggerDiscovery = useCallback((query: string, field: 'name' | 'url' | 'category') => {
    if (discoverTimerRef.current) clearTimeout(discoverTimerRef.current)
    if (!query || query.trim().length < 2) {
      setSuggestions([])
      setLoadingSuggestions(false)
      return
    }
    setLoadingSuggestions(true)
    discoverTimerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query.trim(), field })
        const res = await fetch(`/api/news/discover?${params}`)
        const data = await res.json() as { ok: boolean; suggestions?: RssSuggestion[] }
        if (data.ok && data.suggestions) {
          setSuggestions(data.suggestions)
        } else {
          setSuggestions([])
        }
      } catch {
        setSuggestions([])
      } finally {
        setLoadingSuggestions(false)
      }
    }, 400)
  }, [])

  // Select a suggestion → fill all 3 fields
  const selectSuggestion = useCallback((s: RssSuggestion) => {
    setNewSourceName(s.name)
    setNewSourceUrl(s.url)
    setNewSourceCategory(s.category)
    setSuggestions([])
    setActiveField(null)
    setHighlightedIndex(-1)
  }, [])

  // Keyboard navigation for dropdown
  const handleDiscoverKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[highlightedIndex])
    } else if (e.key === 'Escape') {
      setSuggestions([])
      setActiveField(null)
    }
  }, [suggestions, highlightedIndex, selectSuggestion])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSuggestions([])
        setActiveField(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Source badge labels
  const sourceBadge = (src: RssSuggestion['source']) => {
    switch (src) {
      case 'curated': return { emoji: '📚', label: 'Diretório' }
      case 'google-news': return { emoji: '📰', label: 'Google News' }
      case 'gemini-ai': return { emoji: '🤖', label: 'Gemini AI' }
      case 'auto-detect': return { emoji: '🔍', label: 'Auto-detect' }
    }
  }

  const handleAddSource = useCallback(() => {
    const name = newSourceName.trim()
    const url = newSourceUrl.trim()
    const category = newSourceCategory.trim() || 'Geral'
    if (!name || !url) return
    const id = slugify(name)
    if (newsSettings.sources.some(s => s.id === id)) {
      showNotification('Já existe uma fonte com esse nome.', 'error')
      return
    }
    const newSource: NewsSource = { id, name, url, category }
    updateNewsSettings({
      sources: [...newsSettings.sources, newSource],
      enabledSources: [...newsSettings.enabledSources, id],
    })
    setNewSourceName('')
    setNewSourceUrl('')
    setNewSourceCategory('')
    setSuggestions([])
    showNotification(`Fonte "${name}" adicionada.`, 'success')
  }, [newSourceName, newSourceUrl, newSourceCategory, newsSettings, updateNewsSettings, showNotification])

  const handleRemoveSource = useCallback((sourceId: string) => {
    updateNewsSettings({
      sources: newsSettings.sources.filter(s => s.id !== sourceId),
      enabledSources: newsSettings.enabledSources.filter(id => id !== sourceId),
    })
  }, [newsSettings, updateNewsSettings])

  const hasUnsavedChanges = useMemo(() => (
    JSON.stringify(config) !== JSON.stringify(baselineConfig)
  ), [baselineConfig, config])

  // Sync local state from D1-persisted hook
  useEffect(() => {
    setConfig(runtimeConfig)
    setBaselineConfig(runtimeConfig)
    setLoading(false)
  }, [runtimeConfig])

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // ── MainSite settings: load from bigdata_db ──
  const loadMainsiteSettings = useCallback(async (shouldNotify = false) => {
    setMsSettingsLoading(true)
    try {
      const response = await fetch('/api/mainsite/settings', {
        headers: { 'X-Admin-Actor': adminActor },
      })
      const payload = await response.json() as { ok: boolean; error?: string; settings?: Record<string, unknown> }

      if (!response.ok || !payload.ok || !payload.settings) {
        throw new Error(payload.error ?? 'Falha ao carregar ajustes do MainSite.')
      }

      setMsAppearance(payload.settings.appearance as AppearanceSettings ?? DEFAULT_APPEARANCE)
      setMsRotation(payload.settings.rotation as RotationSettings ?? DEFAULT_ROTATION)
      setMsAiModels((payload.settings.aiModels as { chat: string; summary: string }) ?? { chat: '', summary: '' })

      if (shouldNotify) {
        showNotification('Ajustes do MainSite recarregados com sucesso.', 'success')
      }
    } catch {
      showNotification('Não foi possível carregar os ajustes do MainSite.', 'error')
    } finally {
      setMsSettingsLoading(false)
    }
  }, [adminActor, showNotification])

  useEffect(() => {
    void loadMainsiteSettings()
  }, [loadMainsiteSettings])

  // ── MainSite settings: merge-save to bigdata_db ──
  // Reads current settings first to preserve disclaimers (managed by MainSite module)
  const handleSaveMainsiteSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMsSavingSettings(true)
    try {
      // 1. Fetch current full settings to preserve disclaimers
      const currentRes = await fetch('/api/mainsite/settings', {
        headers: { 'X-Admin-Actor': adminActor },
      })
      const currentPayload = await currentRes.json() as { ok: boolean; settings?: Record<string, unknown> }
      const currentDisclaimers = currentPayload.settings?.disclaimers ?? { enabled: true, items: [] }

      // 2. Merge: update appearance + rotation, preserve disclaimers
      const response = await fetch('/api/mainsite/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': adminActor },
        body: JSON.stringify({
          appearance: msAppearance,
          rotation: msRotation,
          disclaimers: currentDisclaimers,
          aiModels: msAiModels,
          adminActor,
        }),
      })

      const result = await response.json() as { ok: boolean; error?: string }
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? 'Falha ao salvar ajustes do MainSite.')
      }

      await loadMainsiteSettings()
      showNotification('Ajustes do MainSite salvos com sucesso.', 'success')
    } catch {
      showNotification('Não foi possível salvar os ajustes do MainSite.', 'error')
    } finally {
      setMsSavingSettings(false)
    }
  }

  const saveConfig = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)

    try {
      const normalized: AdminRuntimeConfig = {
        ...config,
        defaultAdminActor: config.defaultAdminActor.trim() || DEFAULT_CONFIG.defaultAdminActor,
        defaultOverviewLimit: normalizeLimit(config.defaultOverviewLimit),
      }

      saveRuntimeConfig(normalized)
      setConfig(normalized)
      setBaselineConfig(normalized)
      showNotification('Preferências operacionais salvas no banco de dados.', 'success')
    } catch {
      showNotification('Não foi possível salvar preferências operacionais.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const restoreStoredSnapshot = () => {
    setConfig(runtimeConfig)
    setBaselineConfig(runtimeConfig)
    showNotification('Preferências restauradas do último snapshot salvo.', 'info')
  }

  const restoreFactoryDefaults = () => {
    setConfig(DEFAULT_CONFIG)
    showNotification('Padrões de fábrica aplicados localmente (salve para persistir).', 'info')
  }

  if (loading) {
    return (
      <section className="detail-panel module-shell module-shell-config">
        <div className="result-card">
          <p className="result-empty inline-loading-message">
            <Loader2 size={16} className="spin" /> Carregando configurações locais...
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="detail-panel module-shell module-shell-config">
      <div className="detail-header">
        <div className="detail-icon"><Settings2 size={22} /></div>
        <div>
          <h3>Configurações Globais</h3>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleBgUpload}
      />

      <form className="form-card" onSubmit={saveConfig}>
        <div className="result-toolbar">
          <div>
            <h4><Settings2 size={16} /> Preferências operacionais</h4>
            <p className="field-hint">Configuração local de trabalho para acelerar operações recorrentes no admin-app.</p>
            {hasUnsavedChanges && (
              <span className="badge badge-planejado">Alterações não salvas</span>
            )}
          </div>

          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={restoreStoredSnapshot} disabled={saving}>
              <RefreshCw size={16} />
              Restaurar snapshot
            </button>
            <button type="button" className="ghost-button" onClick={restoreFactoryDefaults} disabled={saving}>
              <RefreshCw size={16} />
              Padrão de fábrica
            </button>
            <button type="submit" className="primary-button" disabled={saving || !hasUnsavedChanges}>
              {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              Salvar preferências
            </button>
          </div>
        </div>

        <div className="form-grid">

          <div className="field-group">
            <label htmlFor="config-default-overview-limit">Limite padrão de overview</label>
            <input
              id="config-default-overview-limit"
              name="configDefaultOverviewLimit"
              type="number"
              min={1}
              max={100}
              value={config.defaultOverviewLimit}
              onChange={(event) => setConfig((current) => ({ ...current, defaultOverviewLimit: Number(event.target.value) || 1 }))}
              disabled={saving}
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="config-enable-operational-toasts">Toasts operacionais</label>
            <select
              id="config-enable-operational-toasts"
              name="configEnableOperationalToasts"
              value={config.enableOperationalToasts ? '1' : '0'}
              onChange={(event) => setConfig((current) => ({ ...current, enableOperationalToasts: event.target.value === '1' }))}
              disabled={saving}
            >
              <option value="1">Ligado</option>
              <option value="0">Desligado</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="config-strict-validation-mode">Validação estrita</label>
            <select
              id="config-strict-validation-mode"
              name="configStrictValidationMode"
              value={config.strictValidationMode ? '1' : '0'}
              onChange={(event) => setConfig((current) => ({ ...current, strictValidationMode: event.target.value === '1' }))}
              disabled={saving}
            >
              <option value="1">Ligado</option>
              <option value="0">Desligado</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="config-require-confirm-before-delete">Confirmar exclusões</label>
            <select
              id="config-require-confirm-before-delete"
              name="configRequireConfirmBeforeDelete"
              value={config.requireConfirmBeforeDelete ? '1' : '0'}
              onChange={(event) => setConfig((current) => ({ ...current, requireConfirmBeforeDelete: event.target.value === '1' }))}
              disabled={saving}
            >
              <option value="1">Obrigatório</option>
              <option value="0">Opcional</option>
            </select>
          </div>
        </div>
      </form>

      {/* ── Ajustes do MainSite (aparência + rotação) ── */}
      <form className="form-card" onSubmit={handleSaveMainsiteSettings}>
        <div className="result-toolbar">
          <div>
            <h4><Globe size={16} /> Ajustes do MainSite</h4>
            <p className="field-hint">Configurações visuais e rotação do site principal.</p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void loadMainsiteSettings(true)} disabled={msSettingsLoading || msSavingSettings}>
              {msSettingsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Recarregar
            </button>
            <button type="submit" className="primary-button" disabled={msSavingSettings}>
              {msSavingSettings ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              Salvar ajustes
            </button>
          </div>
        </div>

        {/* Rotação Autônoma */}
        <fieldset className="settings-fieldset">
          <legend>Engenharia de Automação</legend>
          <label className="toggle-row">
            <input id="cfg-rotation-enabled" name="cfgRotationEnabled" type="checkbox" checked={msRotation.enabled} onChange={(e) => setMsRotation({ ...msRotation, enabled: e.target.checked })} />
            Habilitar Rotação Autônoma da Fila de Textos
          </label>
          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="cfg-rotation-interval">Intervalo (minutos)</label>
              <input id="cfg-rotation-interval" name="cfgRotationInterval" type="number" min={1} value={msRotation.interval} onChange={(e) => setMsRotation({ ...msRotation, interval: parseInt(e.target.value) || 60 })} disabled={!msRotation.enabled} />
            </div>
          </div>
        </fieldset>

        {/* Modo Automático */}
        <fieldset className="settings-fieldset">
          <legend>Customização Visual: Multi-Tema</legend>
          <label className="toggle-row">
            <input id="cfg-allow-auto-mode" name="cfgAllowAutoMode" type="checkbox" checked={msAppearance.allowAutoMode} onChange={(e) => setMsAppearance({ ...msAppearance, allowAutoMode: e.target.checked })} />
            Habilitar Modo Automático (Sincroniza com o SO do Leitor)
          </label>
        </fieldset>

        {/* Configurações Globais */}
        <fieldset className="settings-fieldset">
          <legend>Configurações Globais (Ambos os Temas)</legend>
          <div className="form-grid">
            {/* ─── Tipografia ─── */}
            <div className="field-group">
              <label htmlFor="cfg-shared-font-family">Família da Fonte</label>
              <select id="cfg-shared-font-family" name="cfgSharedFontFamily" value={msAppearance.shared.fontFamily} onChange={(e) => setMsAppearance({ ...msAppearance, shared: { ...msAppearance.shared, fontFamily: e.target.value } })}>
                <option value="'Inter', system-ui, -apple-system, sans-serif">Inter (Recomendada)</option>
                <option value="system-ui, -apple-system, sans-serif">System UI (Nativa)</option>
                <option value="sans-serif">Sans-Serif (Genérica)</option>
                <option value="'Georgia', serif">Georgia (Serifada)</option>
                <option value="'Times New Roman', Times, serif">Times New Roman</option>
                <option value="'Courier New', Courier, monospace">Courier New</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="cfg-shared-font-size">Tamanho da Fonte Base (Corpo)</label>
              <input id="cfg-shared-font-size" name="cfgSharedFontSize" value={msAppearance.shared.fontSize} onChange={(e) => setMsAppearance({ ...msAppearance, shared: { ...msAppearance.shared, fontSize: e.target.value } })} placeholder="Ex: 1.15rem" />
            </div>
            <div className="field-group">
              <label htmlFor="cfg-shared-title-font-size">Tamanho da Fonte dos Títulos (H1)</label>
              <input id="cfg-shared-title-font-size" name="cfgSharedTitleFontSize" value={msAppearance.shared.titleFontSize} onChange={(e) => setMsAppearance({ ...msAppearance, shared: { ...msAppearance.shared, titleFontSize: e.target.value } })} placeholder="Ex: 1.8rem" />
            </div>
            <div className="field-group">
              <label htmlFor="cfg-shared-body-weight">Peso do Corpo de Texto</label>
              <select id="cfg-shared-body-weight" name="cfgSharedBodyWeight" value={msAppearance.shared.bodyWeight || '500'} onChange={(e) => setMsAppearance({ ...msAppearance, shared: { ...msAppearance.shared, bodyWeight: e.target.value } })}>
                <option value="300">Light (300)</option>
                <option value="400">Regular (400)</option>
                <option value="500">Medium (500) — Recomendado</option>
                <option value="600">Semibold (600)</option>
                <option value="700">Bold (700)</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="cfg-shared-title-weight">Peso dos Títulos</label>
              <select id="cfg-shared-title-weight" name="cfgSharedTitleWeight" value={msAppearance.shared.titleWeight || '700'} onChange={(e) => setMsAppearance({ ...msAppearance, shared: { ...msAppearance.shared, titleWeight: e.target.value } })}>
                <option value="500">Medium (500)</option>
                <option value="600">Semibold (600)</option>
                <option value="700">Bold (700) — Recomendado</option>
                <option value="800">Extrabold (800)</option>
                <option value="900">Black (900)</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="cfg-shared-line-height">Altura de Linha (Corpo): <strong className="range-value">{msAppearance.shared.lineHeight || '1.9'}</strong></label>
              <input id="cfg-shared-line-height" name="cfgSharedLineHeight" type="range" min={1.4} max={2.4} step={0.1} value={msAppearance.shared.lineHeight || '1.9'} onChange={(e) => setMsAppearance({ ...msAppearance, shared: { ...msAppearance.shared, lineHeight: e.target.value } })} />
              <div className="range-labels"><span>Compacto</span><span>Confortável</span><span>Espaçoso</span></div>
            </div>

            {/* ─── Layout de Leitura ─── */}
            <div className="field-group">
              <label htmlFor="cfg-shared-text-align">Alinhamento do Texto</label>
              <select id="cfg-shared-text-align" name="cfgSharedTextAlign" value={msAppearance.shared.textAlign || 'justify'} onChange={(e) => setMsAppearance({ ...msAppearance, shared: { ...msAppearance.shared, textAlign: e.target.value } })}>
                <option value="justify">Justificado (Clássico)</option>
                <option value="left">Alinhado à Esquerda (Moderno)</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="cfg-shared-text-indent">Recuo da Primeira Linha (Parágrafo)</label>
              <select id="cfg-shared-text-indent" name="cfgSharedTextIndent" value={msAppearance.shared.textIndent || '3.5rem'} onChange={(e) => setMsAppearance({ ...msAppearance, shared: { ...msAppearance.shared, textIndent: e.target.value } })}>
                <option value="0">Sem recuo (Moderno)</option>
                <option value="1.5rem">Sutil (1.5rem)</option>
                <option value="2.5rem">Médio (2.5rem)</option>
                <option value="3.5rem">Clássico (3.5rem)</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="cfg-shared-paragraph-spacing">Espaçamento entre Parágrafos</label>
              <select id="cfg-shared-paragraph-spacing" name="cfgSharedParagraphSpacing" value={msAppearance.shared.paragraphSpacing || '2.2rem'} onChange={(e) => setMsAppearance({ ...msAppearance, shared: { ...msAppearance.shared, paragraphSpacing: e.target.value } })}>
                <option value="1.2rem">Compacto (1.2rem)</option>
                <option value="1.8rem">Normal (1.8rem)</option>
                <option value="2.2rem">Generoso (2.2rem) — Recomendado</option>
                <option value="3rem">Amplo (3rem)</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="cfg-shared-content-max-width">Largura Máxima de Leitura</label>
              <select id="cfg-shared-content-max-width" name="cfgSharedContentMaxWidth" value={msAppearance.shared.contentMaxWidth || '1126px'} onChange={(e) => setMsAppearance({ ...msAppearance, shared: { ...msAppearance.shared, contentMaxWidth: e.target.value } })}>
                <option value="680px">Estreita (680px) — Foco total</option>
                <option value="800px">Média (800px)</option>
                <option value="960px">Larga (960px)</option>
                <option value="1126px">Ampla (1126px) — Padrão</option>
                <option value="100%">Tela cheia</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="cfg-shared-link-color">Cor dos Links (Conteúdo)</label>
              <div className="theme-color-grid">
                <label className="color-label">Cor ativa <input id="cfg-shared-link-color" name="cfgSharedLinkColor" type="color" value={msAppearance.shared.linkColor || '#4da6ff'} onChange={(e) => setMsAppearance({ ...msAppearance, shared: { ...msAppearance.shared, linkColor: e.target.value } })} /></label>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Paleta Dark */}
        <fieldset className="settings-fieldset">
          <legend>Paleta Tema Escuro</legend>
          <div className="theme-color-grid">
            <label className="color-label">Cor de Fundo <input id="cfg-dark-bg-color" name="cfgDarkBgColor" type="color" value={msAppearance.dark.bgColor} onChange={(e) => setMsAppearance({ ...msAppearance, dark: { ...msAppearance.dark, bgColor: e.target.value } })} /></label>
            <label className="color-label">Cor do Texto <input id="cfg-dark-font-color" name="cfgDarkFontColor" type="color" value={msAppearance.dark.fontColor} onChange={(e) => setMsAppearance({ ...msAppearance, dark: { ...msAppearance.dark, fontColor: e.target.value } })} /></label>
            <label className="color-label">Cor dos Títulos <input id="cfg-dark-title-color" name="cfgDarkTitleColor" type="color" value={msAppearance.dark.titleColor} onChange={(e) => setMsAppearance({ ...msAppearance, dark: { ...msAppearance.dark, titleColor: e.target.value } })} /></label>
          </div>
          <div className="field-group">
            <label htmlFor="cfg-dark-bg-image">Imagem de Fundo (URL ou R2)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="cfg-dark-bg-image"
                name="cfgDarkBgImage"
                value={msAppearance.dark.bgImage}
                onChange={(e) => setMsAppearance({ ...msAppearance, dark: { ...msAppearance.dark, bgImage: formatImageUrl(e.target.value) } })}
                placeholder="https://..."
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="toolbar-btn"
                style={{ height: '42px', width: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => { setUploadTarget('dark'); fileInputRef.current?.click(); }}
                disabled={isUploadingBg}
                title="Fazer upload para o Storage R2"
              >
                {isUploadingBg && uploadTarget === 'dark' ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
              </button>
            </div>
          </div>
        </fieldset>

        {/* Paleta Light */}
        <fieldset className="settings-fieldset">
          <legend>Paleta Tema Claro</legend>
          <div className="theme-color-grid">
            <label className="color-label">Cor de Fundo <input id="cfg-light-bg-color" name="cfgLightBgColor" type="color" value={msAppearance.light.bgColor} onChange={(e) => setMsAppearance({ ...msAppearance, light: { ...msAppearance.light, bgColor: e.target.value } })} /></label>
            <label className="color-label">Cor do Texto <input id="cfg-light-font-color" name="cfgLightFontColor" type="color" value={msAppearance.light.fontColor} onChange={(e) => setMsAppearance({ ...msAppearance, light: { ...msAppearance.light, fontColor: e.target.value } })} /></label>
            <label className="color-label">Cor dos Títulos <input id="cfg-light-title-color" name="cfgLightTitleColor" type="color" value={msAppearance.light.titleColor} onChange={(e) => setMsAppearance({ ...msAppearance, light: { ...msAppearance.light, titleColor: e.target.value } })} /></label>
          </div>
          <div className="field-group">
            <label htmlFor="cfg-light-bg-image">Imagem de Fundo (URL ou R2)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="cfg-light-bg-image"
                name="cfgLightBgImage"
                value={msAppearance.light.bgImage}
                onChange={(e) => setMsAppearance({ ...msAppearance, light: { ...msAppearance.light, bgImage: formatImageUrl(e.target.value) } })}
                placeholder="https://..."
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="toolbar-btn"
                style={{ height: '42px', width: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => { setUploadTarget('light'); fileInputRef.current?.click(); }}
                disabled={isUploadingBg}
                title="Fazer upload para o Storage R2"
              >
                {isUploadingBg && uploadTarget === 'light' ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
              </button>
            </div>
          </div>
        </fieldset>
        
        {/* Modelos de IA (Gemini) */}
        <fieldset className="settings-fieldset" style={{ marginTop: '24px' }}>
          <legend><BrainCircuit size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> Modelos de IA (Gemini)</legend>
          <p className="field-hint" style={{ marginBottom: '16px' }}>
            Selecione de forma unificada os modelos que governarão o chatbot e a sumarização do MainSite.
            {!modelsLoading && geminiModels.length > 0 && <>· {geminiModels.length} modelos disponíveis</>}
          </p>
          <div className="form-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <div className="field-group">
              <label htmlFor="cfg-mainsite-ai-chat">Modelo de Chatbot (Interação Típica)</label>
              <div className="select-wrapper">
                <select
                  id="cfg-mainsite-ai-chat"
                  name="cfgMainsiteAiChat"
                  value={msAiModels.chat}
                  onChange={e => setMsAiModels({ ...msAiModels, chat: e.target.value })}
                >
                  {modelsLoading ? (
                    <option value={msAiModels.chat || ''}>Carregando modelos do Cloudflare...</option>
                  ) : (
                    <>
                      <option value="">Automático (Padrão: gemini-2.5-flash)</option>
                      {geminiModels.length === 0 && msAiModels.chat && <option value={msAiModels.chat}>{msAiModels.chat}</option>}
                      {geminiModels.map(m => (
                        <option key={`chat-${m.id}`} value={m.id}>
                          {m.displayName} {m.vision ? '👁️' : ''} ({m.api})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="cfg-mainsite-ai-summary">Modelo de Sumarização e Extração (SEO/LD)</label>
              <div className="select-wrapper">
                <select
                  id="cfg-mainsite-ai-summary"
                  name="cfgMainsiteAiSummary"
                  value={msAiModels.summary}
                  onChange={e => setMsAiModels({ ...msAiModels, summary: e.target.value })}
                >
                  {modelsLoading ? (
                    <option value={msAiModels.summary || ''}>Carregando modelos do Cloudflare...</option>
                  ) : (
                    <>
                      <option value="">Automático (Padrão: gemini-2.5-flash)</option>
                      {geminiModels.length === 0 && msAiModels.summary && <option value={msAiModels.summary}>{msAiModels.summary}</option>}
                      {geminiModels.map(m => (
                        <option key={`sum-${m.id}`} value={m.id}>
                          {m.displayName} {m.vision ? '👁️' : ''} ({m.api})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
        </fieldset>
      </form>

      <article className="result-card">
        <header className="result-header">
          <h4><ShieldCheck size={16} /> Rate Limit — Controles por módulo</h4>
        </header>
        <div className="field-group">
          <label htmlFor="config-ratelimit-module">Selecione o módulo</label>
          <select
            id="config-ratelimit-module"
            name="configRateLimitModule"
            value={selectedRateModule}
            onChange={(e) => setSelectedRateModule(e.target.value)}
          >
            <option value="">— Escolha um módulo —</option>
            <option value="astrologo">Astrólogo</option>
            <option value="calculadora">Calculadora</option>
            <option value="mainsite">MainSite</option>
            <option value="oraculo">Oráculo</option>
          </select>
        </div>
      </article>

      {selectedRateModule === 'astrologo' && (
        <RateLimitPanel moduleLabel="Astrólogo" endpoint="/api/astrologo/rate-limit" idPrefix="config-ast" />
      )}
      {selectedRateModule === 'calculadora' && (
        <RateLimitPanel moduleLabel="Calculadora" endpoint="/api/calculadora/rate-limit" idPrefix="config-calculadora" />
      )}
      {selectedRateModule === 'mainsite' && (
        <RateLimitPanel moduleLabel="MainSite" endpoint="/api/mainsite/rate-limit" idPrefix="config-mainsite" />
      )}
      {selectedRateModule === 'oraculo' && (
        <RateLimitPanel moduleLabel="Oráculo" endpoint="/api/oraculo/rate-limit" idPrefix="config-oraculo" />
      )}

      <article className="result-card">
        <header className="result-header">
          <h4><Database size={16} /> Sync Manual — Controles por módulo</h4>
        </header>
        <div className="field-group">
          <label htmlFor="config-sync-module">Selecione o módulo</label>
          <select
            id="config-sync-module"
            name="configSyncModule"
            value={selectedSyncModule}
            onChange={(e) => setSelectedSyncModule(e.target.value)}
          >
            <option value="">— Escolha um módulo —</option>
            <option value="astrologo">Astrólogo</option>
            <option value="calculadora">Calculadora</option>
            <option value="mainsite">MainSite</option>
            <option value="mtasts">MTA-STS</option>
          </select>
        </div>
      </article>

      {selectedSyncModule === 'astrologo' && (
        <SyncStatusCard module="astrologo" endpoint="/api/astrologo/sync" title="Sincronização do Astrólogo" description="Replica mapas pendentes com verificação prévia opcional." />
      )}
      {selectedSyncModule === 'calculadora' && (
        <SyncStatusCard module="calculadora" endpoint="/api/calculadora/sync" title="Sincronização da Calculadora" description="Atualiza parâmetros de observabilidade e limites de uso." />
      )}
      {selectedSyncModule === 'mainsite' && (
        <SyncStatusCard module="mainsite" endpoint="/api/mainsite/sync" title="Sincronização do MainSite" description="Validação e saneamento de posts e configurações com verificação prévia." />
      )}
      {selectedSyncModule === 'mtasts' && (
        <SyncStatusCard module="mtasts" endpoint="/api/mtasts/sync" title="Sincronização do MTA-STS" description="Atualiza histórico, domínios e políticas de segurança de e-mail." />
      )}


      {/* ══════════════ Purge de Deployments ══════════════ */}
      <article className="result-card">
        <header className="result-header">
          <h4><Rocket size={16} /> Purge de Deployments — Cloudflare Pages</h4>
          <p className="field-hint">Varre todos os projetos Pages da conta e expurga deployments obsoletos, mantendo apenas o mais recente de cada projeto.</p>
        </header>
        <DeploymentCleanupPanel />
      </article>

      {/* ══════════════ Painel de Notícias ══════════════ */}
      <article className="form-card">
        <div className="result-toolbar">
          <div>
            <h4><Newspaper size={16} /> Painel de Notícias</h4>
            <p className="field-hint">Configure as fontes, frequência de atualização e filtros do painel de notícias exibido na Visão Geral.</p>
          </div>
        </div>

        <div className="form-grid">
          {/* Intervalo de atualização */}
          <div className="field-group">
            <label htmlFor="news-refresh-interval">Atualização automática (minutos)</label>
            <div className="news-settings__slider-group">
              <input
                id="news-refresh-interval"
                name="newsRefreshInterval"
                type="range"
                min={1}
                max={30}
                value={newsSettings.refreshMinutes}
                onChange={e => updateNewsSettings({ refreshMinutes: Number(e.target.value) })}
              />
              <span className="news-settings__value">{newsSettings.refreshMinutes}min</span>
            </div>
          </div>

          {/* Máx. notícias */}
          <div className="field-group">
            <label htmlFor="news-max-items">Número máximo de notícias</label>
            <div className="news-settings__slider-group">
              <input
                id="news-max-items"
                name="newsMaxItems"
                type="range"
                min={5}
                max={50}
                step={5}
                value={newsSettings.maxItems}
                onChange={e => updateNewsSettings({ maxItems: Number(e.target.value) })}
              />
              <span className="news-settings__value">{newsSettings.maxItems}</span>
            </div>
          </div>
        </div>

        {/* Fontes — agrupadas por categoria */}
        <div className="field-group">
          <div className="rss-sources-header">
            <p className="field-label"><strong>Fontes de notícias ativas ({newsSettings.sources.length})</strong></p>
            <select
              id="news-source-category-filter"
              name="newsSourceCategoryFilter"
              title="Filtrar fontes por categoria"
              className="rss-category-filter"
              value={sourceCategoryFilter}
              onChange={e => setSourceCategoryFilter(e.target.value)}
            >
              <option value="__all__">Todas as categorias</option>
              {sourceCategories.map(cat => (
                <option key={cat} value={cat}>{cat} ({newsSettings.sources.filter(s => s.category === cat).length})</option>
              ))}
            </select>
          </div>
          <div className="rss-sources-scroll">
            {filteredSources.map(source => (
              <label key={source.id} className="news-settings__source-toggle">
                <input
                  type="checkbox"
                  checked={newsSettings.enabledSources.includes(source.id)}
                  onChange={() => handleNewsSourceToggle(source.id)}
                />
                <span>{source.name}</span>
                <span className="news-settings__source-cat">{source.category}</span>
                <button
                  type="button"
                  className="news-settings__source-remove"
                  onClick={(e) => { e.preventDefault(); handleRemoveSource(source.id) }}
                  title={`Remover ${source.name}`}
                >
                  <Trash2 size={12} />
                </button>
              </label>
            ))}
            {filteredSources.length === 0 && (
              <p className="field-hint rss-sources-empty">Nenhuma fonte nesta categoria.</p>
            )}
          </div>
        </div>

        {/* Adicionar nova fonte — com descoberta inteligente */}
        <div className="field-group" ref={dropdownRef}>
          <p className="field-label">
            <strong>Adicionar nova fonte RSS</strong>
            {loadingSuggestions && <Loader2 size={14} className="spin" style={{ marginLeft: 8, verticalAlign: 'middle' }} />}
          </p>
          <p className="field-hint">
            <Zap size={12} style={{ verticalAlign: 'middle' }} />{' '}
            Motor inteligente: digite em qualquer campo para descobrir fontes automaticamente.
          </p>
          <div className="news-settings__add-source" onKeyDown={handleDiscoverKeyDown}>
            <label htmlFor="news-new-source-name" className="sr-only">Nome da nova fonte RSS</label>
            <input
              id="news-new-source-name"
              name="newsNewSourceName"
              type="text"
              placeholder="Nome (ex.: CNN Brasil)"
              value={newSourceName}
              onChange={e => { setNewSourceName(e.target.value); setActiveField('name'); triggerDiscovery(e.target.value, 'name') }}
              onFocus={() => { setActiveField('name'); if (newSourceName.trim().length >= 2) triggerDiscovery(newSourceName, 'name') }}
              autoComplete="off"
            />
            <label htmlFor="news-new-source-url" className="sr-only">URL da nova fonte RSS</label>
            <input
              id="news-new-source-url"
              name="newsNewSourceUrl"
              type="url"
              placeholder="URL do feed RSS (ex.: https://...)"
              value={newSourceUrl}
              onChange={e => { setNewSourceUrl(e.target.value); setActiveField('url'); triggerDiscovery(e.target.value, 'url') }}
              onFocus={() => { setActiveField('url'); if (newSourceUrl.trim().length >= 2) triggerDiscovery(newSourceUrl, 'url') }}
              autoComplete="off"
            />
            <label htmlFor="news-new-source-category" className="sr-only">Categoria da nova fonte RSS</label>
            <input
              id="news-new-source-category"
              name="newsNewSourceCategory"
              type="text"
              placeholder="Categoria (ex.: Economia)"
              value={newSourceCategory}
              onChange={e => { setNewSourceCategory(e.target.value); setActiveField('category'); triggerDiscovery(e.target.value, 'category') }}
              onFocus={() => { setActiveField('category'); if (newSourceCategory.trim().length >= 2) triggerDiscovery(newSourceCategory, 'category') }}
              autoComplete="off"
            />
            <button
              type="button"
              className="primary-button"
              disabled={!newSourceName.trim() || !newSourceUrl.trim()}
              onClick={handleAddSource}
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
          <div className="sr-only" aria-live="polite">
            {loadingSuggestions
              ? 'Buscando sugestões de fontes RSS.'
              : suggestions.length > 0
                ? `${suggestions.length} sugestões de fontes RSS disponíveis.`
                : activeField
                  ? 'Nenhuma sugestão disponível.'
                  : ''}
          </div>

          {/* Discovery dropdown */}
          {activeField && suggestions.length > 0 && (
            <div className="rss-discover-dropdown" role="listbox" aria-label="Sugestões de fontes RSS">
              <div className="rss-discover-header">
                <Search size={12} />
                <span>{suggestions.length} sugestões encontradas</span>
              </div>
              {suggestions.map((s, i) => {
                const badge = sourceBadge(s.source)
                const isHighlighted = i === highlightedIndex
                return (
                  isHighlighted ? (
                    <button
                      key={s.id}
                      type="button"
                      role="option"
                      aria-selected="true"
                      className="rss-discover-item rss-discover-item--active"
                      onClick={() => selectSuggestion(s)}
                      onMouseEnter={() => setHighlightedIndex(i)}
                    >
                      <div className="rss-discover-item__info">
                        <span className="rss-discover-item__name">{s.name}</span>
                        <span className="rss-discover-item__url">{s.url}</span>
                      </div>
                      <span className="rss-discover-item__cat">{s.category}</span>
                      <span className={`rss-discover-badge rss-discover-badge--${s.source}`} title={badge.label}>
                        {badge.emoji}
                      </span>
                    </button>
                  ) : (
                    <button
                      key={s.id}
                      type="button"
                      role="option"
                      aria-selected="false"
                      className="rss-discover-item"
                      onClick={() => selectSuggestion(s)}
                      onMouseEnter={() => setHighlightedIndex(i)}
                    >
                      <div className="rss-discover-item__info">
                        <span className="rss-discover-item__name">{s.name}</span>
                        <span className="rss-discover-item__url">{s.url}</span>
                      </div>
                      <span className="rss-discover-item__cat">{s.category}</span>
                      <span className={`rss-discover-badge rss-discover-badge--${s.source}`} title={badge.label}>
                        {badge.emoji}
                      </span>
                    </button>
                  )
                )
              })}
            </div>
          )}
        </div>
      </article>
    </section>
  )
}
