/**
 * useModuleConfig — Hook centralizado para persistência de configurações de módulo.
 * Lê/grava no D1 (BIGDATA_DB) via /api/config-store.
 * Fallback: lê localStorage como cache de último recurso.
 *
 * Uso:
 *   const [config, saveConfig, loading] = useModuleConfig<MyConfig>('my-module', DEFAULT, {
 *     onSaveSuccess: () => showNotification('Salvo!', 'success'),
 *     onSaveError: (err) => showNotification(`Erro: ${err}`, 'error'),
 *   })
 *   saveConfig({ campo: 'valor' })   // merge parcial + grava no D1 + notifica
 */

import { useState, useEffect, useCallback, useRef } from 'react'

type ConfigStoreResponse = {
  ok: boolean
  config?: Record<string, unknown> | null
  error?: string
}

interface ModuleConfigOptions {
  /** Chamado quando a persistência no D1 for bem-sucedida */
  onSaveSuccess?: () => void
  /** Chamado quando a persistência no D1 falhar */
  onSaveError?: (error: string) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useModuleConfig<T extends Record<string, any>>(
  moduleKey: string,
  defaults: T,
  options?: ModuleConfigOptions,
): [T, (patch: Partial<T>) => void, boolean] {
  const [config, setConfig] = useState<T>(defaults)
  const [loading, setLoading] = useState(true)
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Carrega config do D1 no mount
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch(`/api/config-store?module=${encodeURIComponent(moduleKey)}`)
        const data = await res.json() as ConfigStoreResponse
        if (!cancelled && data.ok && data.config) {
          setConfig(prev => ({ ...prev, ...data.config as Partial<T> }))
        } else if (!cancelled && (!data.ok || !data.config)) {
          // D1 vazio — tenta ler localStorage como migração one-shot
          try {
            const raw = localStorage.getItem(moduleKey)
            if (raw) {
              const parsed = JSON.parse(raw) as Partial<T>
              const merged = { ...defaults, ...parsed }
              setConfig(merged)
              // Migrar automaticamente para D1
              void persistToD1(moduleKey, merged, optionsRef.current)
              // Limpar localStorage após migração
              localStorage.removeItem(moduleKey)
            }
          } catch { /* localStorage indisponível ou corrompido — usar defaults */ }
        }
      } catch {
        // Rede falhou — fallback localStorage
        try {
          const raw = localStorage.getItem(moduleKey)
          if (!cancelled && raw) {
            setConfig(prev => ({ ...prev, ...JSON.parse(raw) as Partial<T> }))
          }
        } catch { /* ignorar */ }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey])

  // Salva config (merge parcial) no D1 e notifica o resultado
  const saveConfig = useCallback((patch: Partial<T>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch }
      void persistToD1(moduleKey, next, optionsRef.current)
      return next
    })
  }, [moduleKey])

  return [config, saveConfig, loading]
}

/** Persiste no D1 e chama os callbacks de sucesso/erro */
async function persistToD1<T>(
  moduleKey: string,
  config: T,
  options?: ModuleConfigOptions,
): Promise<void> {
  try {
    const res = await fetch('/api/config-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: moduleKey, config }),
    })
    const data = await res.json() as { ok: boolean; error?: string }
    if (data.ok) {
      options?.onSaveSuccess?.()
    } else {
      options?.onSaveError?.(data.error || 'Erro desconhecido ao salvar.')
    }
  } catch (err) {
    options?.onSaveError?.(String(err))
  }
}
