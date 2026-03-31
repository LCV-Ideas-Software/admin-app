/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Database, Loader2, RefreshCw, Save } from 'lucide-react'
import { useNotification } from './Notification'

// ── Generic policy type (superset of both Calculadora and Astrólogo/MainSite schemas) ──

type GenericPolicy = {
  route_key?: string
  route?: string
  label: string
  enabled: boolean
  max_requests: number
  window_minutes: number
  updated_at?: string | number | null
  updated_by?: string | null
  defaults: {
    enabled: boolean
    max_requests: number
    window_minutes: number
  }
  stats: {
    total_requests_window: number
    distinct_ips_window?: number
    distinct_keys_window?: number
  }
}

/** Get the unique identifier for a policy (supports both `route_key` and `route`). */
const policyId = (p: GenericPolicy) => p.route_key ?? p.route ?? ''

const normalizePoliciesForCompare = (items: GenericPolicy[]) => [...items]
  .sort((a, b) => policyId(a).localeCompare(policyId(b)))
  .map((p) => ({
    id: policyId(p),
    enabled: Boolean(p.enabled),
    max_requests: Number(p.max_requests),
    window_minutes: Number(p.window_minutes),
  }))

// ── Props ──

type RateLimitPanelProps = {
  /** Display label for the module group (e.g. "Calculadora", "Astrólogo", "MainSite") */
  moduleLabel: string
  /** API endpoint for read/write (e.g. "/api/calculadora/rate-limit") */
  endpoint: string
  /** Prefix for HTML ids to ensure uniqueness */
  idPrefix: string
}

// ── Component ──

export function RateLimitPanel({ moduleLabel, endpoint, idPrefix }: RateLimitPanelProps) {
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(false)
  const [updatingRoute, setUpdatingRoute] = useState<string | null>(null)
  const [policies, setPolicies] = useState<GenericPolicy[]>([])
  const [baselinePolicies, setBaselinePolicies] = useState<GenericPolicy[]>([])

  const hasUnsaved = useMemo(
    () => JSON.stringify(normalizePoliciesForCompare(policies)) !== JSON.stringify(normalizePoliciesForCompare(baselinePolicies)),
    [policies, baselinePolicies],
  )

  const loadPolicies = useCallback(async (shouldNotify = false) => {
    setLoading(true)
    try {
      const res = await fetch(endpoint, { headers: { 'X-Admin-Actor': 'admin@app.lcv' } })
      const payload = await res.json() as { ok: boolean; error?: string; policies?: GenericPolicy[] }
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? `Falha ao carregar rate limit de ${moduleLabel}.`)
      const next = Array.isArray(payload.policies) ? payload.policies : []
      setPolicies(next)
      setBaselinePolicies(next)
      if (shouldNotify) showNotification(`Rate limit de ${moduleLabel} atualizado.`, 'success')
    } catch {
      showNotification(`Não foi possível carregar rate limit de ${moduleLabel}.`, 'error')
    } finally {
      setLoading(false)
    }
  }, [endpoint, moduleLabel, showNotification])

  useEffect(() => { void loadPolicies() }, [loadPolicies])

  // ── Unsaved guard ──
  useEffect(() => {
    if (!hasUnsaved) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsaved])

  const handleChange = (id: string, field: 'enabled' | 'max_requests' | 'window_minutes', value: boolean | number) => {
    setPolicies((c) => c.map((p) => policyId(p) === id ? { ...p, [field]: value } : p))
  }

  const persistPolicy = async (id: string, action: 'update' | 'restore_default') => {
    const policy = policies.find((p) => policyId(p) === id)
    if (!policy) { showNotification('Policy não encontrada.', 'error'); return }

    setUpdatingRoute(id)
    try {
      const body = policy.route_key
        ? { action, route_key: id, enabled: policy.enabled, max_requests: policy.max_requests, window_minutes: policy.window_minutes, adminActor: 'admin@app.lcv' }
        : { action, route: id, enabled: policy.enabled, max_requests: policy.max_requests, window_minutes: policy.window_minutes, adminActor: 'admin@app.lcv' }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': 'admin@app.lcv' },
        body: JSON.stringify(body),
      })
      const payload = await res.json() as { ok: boolean; error?: string; policies?: GenericPolicy[] }
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? `Falha ao salvar policy de ${moduleLabel}.`)
      const next = Array.isArray(payload.policies) ? payload.policies : []
      setPolicies(next)
      setBaselinePolicies(next)
      showNotification(action === 'restore_default' ? `Policy ${id} restaurada.` : `Policy ${id} salva.`, 'success')
    } catch {
      showNotification(`Erro ao salvar policy de ${moduleLabel}.`, 'error')
    } finally {
      setUpdatingRoute(null)
    }
  }

  const restoreLocal = (id: string) => {
    setPolicies((c) => c.map((p) => {
      if (policyId(p) !== id) return p
      return { ...p, enabled: p.defaults.enabled, max_requests: p.defaults.max_requests, window_minutes: p.defaults.window_minutes }
    }))
  }

  const restoreAllLocal = () => {
    setPolicies((c) => c.map((p) => ({
      ...p, enabled: p.defaults.enabled, max_requests: p.defaults.max_requests, window_minutes: p.defaults.window_minutes,
    })))
    showNotification(`Padrões de ${moduleLabel} restaurados localmente.`, 'info')
  }

  const saveAll = async () => {
    if (!hasUnsaved) { showNotification('Nenhuma alteração pendente.', 'info'); return }
    setUpdatingRoute('__all__')
    try {
      for (const p of policies) {
        const id = policyId(p)
        const body = p.route_key
          ? { action: 'update', route_key: id, enabled: p.enabled, max_requests: p.max_requests, window_minutes: p.window_minutes, adminActor: 'admin@app.lcv' }
          : { action: 'update', route: id, enabled: p.enabled, max_requests: p.max_requests, window_minutes: p.window_minutes, adminActor: 'admin@app.lcv' }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': 'admin@app.lcv' },
          body: JSON.stringify(body),
        })
        const payload = await res.json() as { ok: boolean; error?: string }
        if (!res.ok || !payload.ok) throw new Error(payload.error ?? `Falha ao salvar policy ${id}.`)
      }
      await loadPolicies()
      showNotification(`Rate limit de ${moduleLabel} salvo com sucesso.`, 'success')
    } catch {
      showNotification(`Erro ao salvar rate limit de ${moduleLabel}.`, 'error')
    } finally {
      setUpdatingRoute(null)
    }
  }

  return (
    <article className="result-card ratelimit-group">
      <div className="result-toolbar">
        <div>
          <h4><Database size={16} /> {moduleLabel} — Rate Limit</h4>
          <p className="field-hint">Políticas por rota com atualização em tempo real e restauração de padrão.</p>
          {hasUnsaved && <span className="badge badge-planejado">Alterações não salvas</span>}
        </div>
        <div className="inline-actions">
          <button type="button" className="ghost-button" onClick={() => void loadPolicies(true)} disabled={loading || updatingRoute !== null}>
            {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            Atualizar
          </button>
          <button type="button" className="ghost-button" onClick={restoreAllLocal} disabled={loading || updatingRoute !== null || policies.length === 0}>
            <RefreshCw size={16} />
            Restaurar padrão
          </button>
          <button type="button" className="primary-button" onClick={() => void saveAll()} disabled={loading || updatingRoute !== null || !hasUnsaved}>
            {updatingRoute === '__all__' ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            Salvar tudo
          </button>
        </div>
      </div>

      {policies.length === 0 ? (
        <p className="result-empty">Sem policies de rate limit carregadas.</p>
      ) : (
        <ul className="result-list">
          {policies.map((policy) => {
            const id = policyId(policy)
            const isBusy = updatingRoute === id
            return (
              <li key={id} className="post-row">
                <div className="post-row-main">
                  <strong>{policy.label}</strong>
                  <div className="post-row-meta">
                    <span>rota: {id}</span>
                    <span>janela: {policy.stats.total_requests_window} req / {policy.stats.distinct_ips_window ?? policy.stats.distinct_keys_window ?? 0} chaves</span>
                    {policy.updated_by && <span>updated by: {policy.updated_by}</span>}
                  </div>
                </div>

                <div className="form-grid">
                  <div className="field-group">
                    <label htmlFor={`${idPrefix}-rate-enabled-${id}`}>Escudo habilitado</label>
                    <select
                      id={`${idPrefix}-rate-enabled-${id}`}
                      name={`${idPrefix}RateEnabled${id}`}
                      value={policy.enabled ? '1' : '0'}
                      onChange={(e) => handleChange(id, 'enabled', e.target.value === '1')}
                      disabled={isBusy}
                    >
                      <option value="1">Ativo</option>
                      <option value="0">Inativo</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label htmlFor={`${idPrefix}-rate-max-${id}`}>Máx. requisições/IP</label>
                    <input
                      id={`${idPrefix}-rate-max-${id}`}
                      name={`${idPrefix}RateMax${id}`}
                      type="number" min={1} max={5000}
                      value={policy.max_requests}
                      onChange={(e) => handleChange(id, 'max_requests', Number(e.target.value))}
                      disabled={isBusy}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`${idPrefix}-rate-window-${id}`}>Janela (min)</label>
                    <input
                      id={`${idPrefix}-rate-window-${id}`}
                      name={`${idPrefix}RateWindow${id}`}
                      type="number" min={1} max={1440}
                      value={policy.window_minutes}
                      onChange={(e) => handleChange(id, 'window_minutes', Number(e.target.value))}
                      disabled={isBusy}
                    />
                  </div>
                </div>

                <div className="post-row-actions">
                  <button type="button" className="ghost-button" onClick={() => void persistPolicy(id, 'update')} disabled={isBusy}>
                    {isBusy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                    Salvar
                  </button>
                  <button type="button" className="ghost-button" onClick={() => restoreLocal(id)} disabled={isBusy}>
                    <RefreshCw size={16} />
                    Restaurar
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}
