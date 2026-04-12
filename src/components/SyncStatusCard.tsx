/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import { useNotification } from './Notification'

type OperationalSyncStatus = {
  module: string
  totalRuns: number
  successRuns: number
  errorRuns: number
  lastStatus: string
  lastFinishedAt: number | null
}

type OperationalOverviewPayload = {
  ok: boolean
  sync: OperationalSyncStatus[]
}

type SyncRunPayload = {
  ok: boolean
  error?: string
  recordsRead: number
  recordsUpserted: number
  observabilidade?: {
    lidas: number
    inseridas: number
  }
  rateLimit?: {
    lidas: number
    upserted: number
  }
}

type SyncStatusCardProps = {
  module: 'astrologo' | 'calculadora' | 'mainsite' | 'mtasts'
  endpoint: '/api/astrologo/sync' | '/api/calculadora/sync' | '/api/mainsite/sync' | '/api/mtasts/sync'
  title: string
  description: string
}

const formatDateTime = (value: number | null) => {
  if (!value) {
    return 'ainda não executado'
  }

  return new Date(value).toLocaleString('pt-BR')
}

const buildSuccessMessage = (moduleTitle: string, payload: SyncRunPayload) => {
  if (payload.observabilidade && payload.rateLimit) {
    return `${moduleTitle}: sync concluído com ${payload.recordsUpserted} alteração(ões) aplicadas.`
  }

  return `${moduleTitle}: sync concluído com ${payload.recordsUpserted} registro(s) aplicados.`
}

const OPERATIONAL_QUERY_KEY = ['operational-overview'] as const

async function fetchOperationalOverview(): Promise<OperationalOverviewPayload> {
  const response = await fetch('/api/overview/operational')
  const payload = (await response.json()) as OperationalOverviewPayload
  if (!response.ok || !payload.ok) {
    throw new Error('Falha ao carregar overview operacional.')
  }
  return payload
}

export function SyncStatusCard({ module, endpoint, title, description }: SyncStatusCardProps) {
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const { data, isLoading: loadingStatus, isError } = useQuery({
    queryKey: OPERATIONAL_QUERY_KEY,
    queryFn: fetchOperationalOverview,
    staleTime: 30_000,
    retry: 1,
  })

  useEffect(() => {
    if (isError) {
      showNotification(`Não foi possível carregar o status de sync de ${title}.`, 'error')
    }
  }, [isError, showNotification, title])

  const { mutate: triggerSync, isPending: runningSync } = useMutation({
    mutationFn: async () => {
      const response = await fetch(endpoint, { method: 'POST' })
      const payload = (await response.json()) as SyncRunPayload
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `Falha ao executar sync de ${title}.`)
      }
      return payload
    },
    onSuccess: (payload) => {
      showNotification(buildSuccessMessage(title, payload), 'success')
      void queryClient.invalidateQueries({ queryKey: OPERATIONAL_QUERY_KEY })
    },
    onError: () => {
      showNotification(`Não foi possível concluir o sync de ${title}.`, 'error')
    },
  })

  const status = data?.sync.find((item) => item.module === module) ?? null
  const lastRunLabel = useMemo(() => formatDateTime(status?.lastFinishedAt ?? null), [status?.lastFinishedAt])
  const statusTone = status?.lastStatus === 'success' ? 'badge-em-implantacao' : 'badge-planejado'
  const statusLabel =
    status?.lastStatus === 'success'
      ? 'último sync OK'
      : status?.lastStatus === 'error'
        ? 'último sync com erro'
        : status?.lastStatus === 'running'
          ? 'sync em execução'
          : 'sem histórico'

  return (
    <article className="result-card sync-card">
      <header className="result-header sync-header">
        <div>
          <h4>
            <RefreshCw size={16} /> {title}
          </h4>
          <p className="sync-description">{description}</p>
        </div>
        <span className={`badge ${statusTone}`}>{statusLabel}</span>
      </header>

      {loadingStatus ? (
        <p className="result-empty">Carregando status operacional do sync...</p>
      ) : (
        <div className="sync-summary-grid">
          <div className="sync-summary-item">
            <span className="detail-label">Execuções</span>
            <strong>{status?.totalRuns ?? 0}</strong>
          </div>
          <div className="sync-summary-item">
            <span className="detail-label">Sucesso</span>
            <strong>{status?.successRuns ?? 0}</strong>
          </div>
          <div className="sync-summary-item">
            <span className="detail-label">Erros</span>
            <strong>{status?.errorRuns ?? 0}</strong>
          </div>
          <div className="sync-summary-item">
            <span className="detail-label">Última finalização</span>
            <strong>{lastRunLabel}</strong>
          </div>
        </div>
      )}

      <div className="sync-actions">
        <button
          type="button"
          className="primary-button"
          disabled={runningSync || loadingStatus}
          onClick={() => triggerSync()}
        >
          {runningSync ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
          Sincronizar
        </button>
      </div>
    </article>
  )
}
