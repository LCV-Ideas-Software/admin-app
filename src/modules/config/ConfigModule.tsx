import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Database, Globe, Loader2, RefreshCw, Save, Settings2, ShieldCheck } from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { RateLimitPanel } from '../../components/RateLimitPanel'
import { SyncStatusCard } from '../../components/SyncStatusCard'

type AdminRuntimeConfig = {
  defaultAdminActor: string
  defaultOverviewLimit: number
  defaultSyncDryRun: boolean
  enableOperationalToasts: boolean
  strictValidationMode: boolean
  requireConfirmBeforeDelete: boolean
}

// ── MainSite settings types (appearance + rotation) ──────────
type AppearanceSettings = {
  allowAutoMode: boolean
  light: { bgColor: string; bgImage: string; fontColor: string; titleColor: string }
  dark: { bgColor: string; bgImage: string; fontColor: string; titleColor: string }
  shared: { fontSize: string; titleFontSize: string; fontFamily: string }
}

type RotationSettings = {
  enabled: boolean
  interval: number
}

const DEFAULT_APPEARANCE: AppearanceSettings = {
  allowAutoMode: true,
  light: { bgColor: '#f8f9fa', bgImage: '', fontColor: '#202124', titleColor: '#1a73e8' },
  dark: { bgColor: '#131314', bgImage: '', fontColor: '#e3e3e3', titleColor: '#8ab4f8' },
  shared: { fontSize: '1rem', titleFontSize: '1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif' },
}

const DEFAULT_ROTATION: RotationSettings = { enabled: false, interval: 60 }

const STORAGE_KEY = 'admin-app/runtime-config/v1'

const DEFAULT_CONFIG: AdminRuntimeConfig = {
  defaultAdminActor: 'admin@app.lcv',
  defaultOverviewLimit: 30,
  defaultSyncDryRun: false,
  enableOperationalToasts: true,
  strictValidationMode: true,
  requireConfirmBeforeDelete: true,
}

const normalizeLimit = (value: number) => Math.max(1, Math.min(100, Math.trunc(value || 1)))

const loadStoredConfig = (): AdminRuntimeConfig => {
  if (typeof window === 'undefined') {
    return DEFAULT_CONFIG
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return DEFAULT_CONFIG
    }

    const parsed = JSON.parse(raw) as Partial<AdminRuntimeConfig>
    return {
      defaultAdminActor: String(parsed.defaultAdminActor ?? DEFAULT_CONFIG.defaultAdminActor).trim() || DEFAULT_CONFIG.defaultAdminActor,
      defaultOverviewLimit: normalizeLimit(Number(parsed.defaultOverviewLimit ?? DEFAULT_CONFIG.defaultOverviewLimit)),
      defaultSyncDryRun: Boolean(parsed.defaultSyncDryRun),
      enableOperationalToasts: parsed.enableOperationalToasts !== false,
      strictValidationMode: parsed.strictValidationMode !== false,
      requireConfirmBeforeDelete: parsed.requireConfirmBeforeDelete !== false,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function ConfigModule() {
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<AdminRuntimeConfig>(DEFAULT_CONFIG)
  const [baselineConfig, setBaselineConfig] = useState<AdminRuntimeConfig>(DEFAULT_CONFIG)
  const [selectedRateModule, setSelectedRateModule] = useState('')
  const [selectedSyncModule, setSelectedSyncModule] = useState('')

  // ── MainSite settings (appearance + rotation) state ──
  const [msAppearance, setMsAppearance] = useState<AppearanceSettings>(DEFAULT_APPEARANCE)
  const [msRotation, setMsRotation] = useState<RotationSettings>(DEFAULT_ROTATION)
  const [msSettingsLoading, setMsSettingsLoading] = useState(false)
  const [msSavingSettings, setMsSavingSettings] = useState(false)
  const [adminActor] = useState('admin@app.lcv')

  const hasUnsavedChanges = useMemo(() => (
    JSON.stringify(config) !== JSON.stringify(baselineConfig)
  ), [baselineConfig, config])

  useEffect(() => {
    const loaded = loadStoredConfig()
    setConfig(loaded)
    setBaselineConfig(loaded)
    setLoading(false)
  }, [])

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

      if (shouldNotify) {
        showNotification('Ajustes do MainSite recarregados do bigdata_db.', 'success')
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
          adminActor,
        }),
      })

      const result = await response.json() as { ok: boolean; error?: string }
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? 'Falha ao salvar ajustes do MainSite.')
      }

      await loadMainsiteSettings()
      showNotification('Ajustes do MainSite salvos no bigdata_db.', 'success')
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

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      setConfig(normalized)
      setBaselineConfig(normalized)
      showNotification('Preferências operacionais salvas neste navegador.', 'success')
    } catch {
      showNotification('Não foi possível salvar preferências operacionais.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const restoreStoredSnapshot = () => {
    const loaded = loadStoredConfig()
    setConfig(loaded)
    setBaselineConfig(loaded)
    showNotification('Preferências restauradas do snapshot salvo.', 'info')
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
          <p>Painel operacional local para preferências de execução e governança do cockpit unificado.</p>
        </div>
      </div>



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
            <label htmlFor="config-default-sync-dry-run">Sync padrão em dry run</label>
            <select
              id="config-default-sync-dry-run"
              name="configDefaultSyncDryRun"
              value={config.defaultSyncDryRun ? '1' : '0'}
              onChange={(event) => setConfig((current) => ({ ...current, defaultSyncDryRun: event.target.value === '1' }))}
              disabled={saving}
            >
              <option value="1">Ligado</option>
              <option value="0">Desligado</option>
            </select>
          </div>

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

      {/* ── Ajustes do MainSite (appearance + rotation via bigdata_db) ── */}
      <form className="form-card" onSubmit={handleSaveMainsiteSettings}>
        <div className="result-toolbar">
          <div>
            <h4><Globe size={16} /> Ajustes do MainSite</h4>
            <p className="field-hint">Configurações visuais e rotação do site principal. Leitura e escrita no `bigdata_db`.</p>
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
            <div className="field-group">
              <label htmlFor="cfg-shared-font-size">Tamanho da Fonte Base</label>
              <input id="cfg-shared-font-size" name="cfgSharedFontSize" value={msAppearance.shared.fontSize} onChange={(e) => setMsAppearance({ ...msAppearance, shared: { ...msAppearance.shared, fontSize: e.target.value } })} placeholder="1rem" />
            </div>
            <div className="field-group">
              <label htmlFor="cfg-shared-title-font-size">Tamanho Títulos (H1)</label>
              <input id="cfg-shared-title-font-size" name="cfgSharedTitleFontSize" value={msAppearance.shared.titleFontSize} onChange={(e) => setMsAppearance({ ...msAppearance, shared: { ...msAppearance.shared, titleFontSize: e.target.value } })} placeholder="1.5rem" />
            </div>
            <div className="field-group">
              <label htmlFor="cfg-shared-font-family">Família da Fonte</label>
              <select id="cfg-shared-font-family" name="cfgSharedFontFamily" value={msAppearance.shared.fontFamily} onChange={(e) => setMsAppearance({ ...msAppearance, shared: { ...msAppearance.shared, fontFamily: e.target.value } })}>
                <option value="system-ui, -apple-system, sans-serif">System UI</option>
                <option value="sans-serif">Sans-Serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
              </select>
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
            <label htmlFor="cfg-dark-bg-image">Imagem de Fundo (URL)</label>
            <input id="cfg-dark-bg-image" name="cfgDarkBgImage" value={msAppearance.dark.bgImage} onChange={(e) => setMsAppearance({ ...msAppearance, dark: { ...msAppearance.dark, bgImage: e.target.value } })} placeholder="https://..." />
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
            <label htmlFor="cfg-light-bg-image">Imagem de Fundo (URL)</label>
            <input id="cfg-light-bg-image" name="cfgLightBgImage" value={msAppearance.light.bgImage} onChange={(e) => setMsAppearance({ ...msAppearance, light: { ...msAppearance.light, bgImage: e.target.value } })} placeholder="https://..." />
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
        <SyncStatusCard module="astrologo" endpoint="/api/astrologo/sync" title="Sync manual do Astrólogo" description="Replica mapas do legado para o `bigdata_db`, com dry run opcional." />
      )}
      {selectedSyncModule === 'calculadora' && (
        <SyncStatusCard module="calculadora" endpoint="/api/calculadora/sync" title="Sync manual do Calculadora" description="Sincroniza observabilidade e policies de rate limit no `bigdata_db`." />
      )}
      {selectedSyncModule === 'mainsite' && (
        <SyncStatusCard module="mainsite" endpoint="/api/mainsite/sync" title="Sync manual do MainSite" description="Validação e saneamento de posts/settings no `bigdata_db` com dry run." />
      )}
      {selectedSyncModule === 'mtasts' && (
        <SyncStatusCard module="mtasts" endpoint="/api/mtasts/sync" title="Sync manual do MTA-STS" description="Sincroniza histórico, zonas e policies no `bigdata_db`." />
      )}
    </section>
  )
}
