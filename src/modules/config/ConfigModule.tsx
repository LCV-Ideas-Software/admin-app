import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Database, Loader2, RefreshCw, Save, Settings2, ShieldCheck } from 'lucide-react'
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
            <option value="itau">Itaú</option>
            <option value="mainsite">MainSite</option>
          </select>
        </div>
      </article>

      {selectedRateModule === 'astrologo' && (
        <RateLimitPanel moduleLabel="Astrólogo" endpoint="/api/astrologo/rate-limit" idPrefix="config-ast" />
      )}
      {selectedRateModule === 'itau' && (
        <RateLimitPanel moduleLabel="Itaú" endpoint="/api/itau/rate-limit" idPrefix="config-itau" />
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
            <option value="itau">Itaú</option>
            <option value="mainsite">MainSite</option>
            <option value="mtasts">MTA-STS</option>
          </select>
        </div>
      </article>

      {selectedSyncModule === 'astrologo' && (
        <SyncStatusCard module="astrologo" endpoint="/api/astrologo/sync" title="Sync manual do Astrólogo" description="Replica mapas do legado para o `bigdata_db`, com dry run opcional." />
      )}
      {selectedSyncModule === 'itau' && (
        <SyncStatusCard module="itau" endpoint="/api/itau/sync" title="Sync manual do Itaú" description="Sincroniza observabilidade e policies de rate limit no `bigdata_db`." />
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
