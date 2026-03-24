import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, RefreshCw, Save, Search, ShieldCheck } from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { SyncStatusCard } from '../../components/SyncStatusCard'

type MtastsPayload = {
  ok: boolean
  error?: string
  fonte: 'bigdata_db' | 'legacy-admin'
  filtros: {
    domain: string
    limit: number
  }
  avisos: string[]
  resumo: {
    totalHistorico: number
    totalPolicies: number
  }
  historico: Array<{
    geradoEm: string
    domain: string | null
  }>
  policies: Array<{
    domain: string
    policyText: string
    tlsrptEmail: string | null
    updatedAt: string | null
  }>
}

type MtastsZone = {
  name: string
  id: string
}

type MtastsPolicyResponse = {
  savedPolicy: string | null
  savedEmail: string | null
  dnsTlsRptEmail: string | null
  dnsMtaStsId: string | null
  lastGeneratedId: string | null
  mxRecords: string[]
}

const parseApiPayload = async <T,>(response: Response, fallback: string): Promise<T> => {
  const rawText = await response.text()
  const trimmed = rawText.trim()

  if (!trimmed) {
    throw new Error(`${fallback} (HTTP ${response.status}, corpo vazio).`)
  }

  const looksLikeHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')
  if (looksLikeHtml) {
    throw new Error(`${fallback} (HTTP ${response.status}, resposta HTML inesperada).`)
  }

  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new Error(`${fallback} (HTTP ${response.status}, resposta não-JSON).`)
  }
}

const initialPayload: MtastsPayload = {
  ok: true,
  fonte: 'bigdata_db',
  filtros: {
    domain: '',
    limit: 30,
  },
  avisos: [],
  resumo: {
    totalHistorico: 0,
    totalPolicies: 0,
  },
  historico: [],
  policies: [],
}

export function MtastsModule() {
  const { showNotification } = useNotification()
  const withTrace = (message: string, payload?: { request_id?: string }) => (
    payload?.request_id ? `${message} (req ${payload.request_id})` : message
  )
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [zonesLoading, setZonesLoading] = useState(false)
  const [policyLoading, setPolicyLoading] = useState(false)
  const [orchestrating, setOrchestrating] = useState(false)
  const [domain, setDomain] = useState('')
  const [limit, setLimit] = useState('30')
  const [adminActor, setAdminActor] = useState('admin@app.lcv')
  const [payload, setPayload] = useState<MtastsPayload>(initialPayload)
  const [zones, setZones] = useState<MtastsZone[]>([])
  const [selectedDomain, setSelectedDomain] = useState('')
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [policyText, setPolicyText] = useState('')
  const [tlsrptEmail, setTlsrptEmail] = useState('')
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null)
  const [mxRecords, setMxRecords] = useState<string[]>([])
  const [integrityStatus, setIntegrityStatus] = useState<'idle' | 'ok' | 'warning' | 'error'>('idle')
  const [integrityIssues, setIntegrityIssues] = useState<string[]>([])

  const disabled = useMemo(() => overviewLoading, [overviewLoading])

  const runIntegrityAudit = useCallback(() => {
    if (zones.length === 0 && payload.policies.length === 0) {
      setIntegrityStatus('idle')
      setIntegrityIssues([])
      return
    }

    const errors: string[] = []
    const warnings: string[] = []

    const zoneNames = new Set(zones.map((zone) => zone.name.toLowerCase()))
    const policyDomainMap = new Map(payload.policies.map((policy) => [policy.domain.toLowerCase(), policy]))

    for (const zone of zones) {
      const policy = policyDomainMap.get(zone.name.toLowerCase())
      if (!policy || !policy.policyText?.trim()) {
        errors.push(`Domínio ${zone.name}: policy ausente no histórico salvo.`)
      }
    }

    for (const policy of payload.policies) {
      if (!zoneNames.has(policy.domain.toLowerCase())) {
        warnings.push(`Policy órfã detectada para ${policy.domain} (não encontrada nas zonas atuais).`)
      }
      if (!policy.tlsrptEmail) {
        warnings.push(`Domínio ${policy.domain}: e-mail TLS-RPT não configurado.`)
      }
      if (!policy.updatedAt) {
        warnings.push(`Domínio ${policy.domain}: sem data de atualização registrada.`)
      }
    }

    if (selectedDomain) {
      if (!selectedZoneId) {
        errors.push(`Domínio selecionado (${selectedDomain}) sem Zone ID associado.`)
      }
      if (!policyText.trim()) {
        warnings.push(`Domínio selecionado (${selectedDomain}) com policy em branco no editor.`)
      }
      if (!tlsrptEmail.trim()) {
        warnings.push(`Domínio selecionado (${selectedDomain}) sem e-mail TLS-RPT no editor.`)
      }
      if (!lastGeneratedId) {
        warnings.push(`Domínio selecionado (${selectedDomain}) sem último ID conhecido.`)
      }
      if (mxRecords.length === 0) {
        warnings.push(`Domínio selecionado (${selectedDomain}) sem MX detectado para geração automática.`)
      }
    }

    const nextIssues = [...errors, ...warnings]
    setIntegrityIssues(nextIssues)
    setIntegrityStatus(errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok')
  }, [lastGeneratedId, mxRecords.length, payload.policies, policyText, selectedDomain, selectedZoneId, tlsrptEmail, zones])

  const loadZones = useCallback(async (shouldNotify = false) => {
    setZonesLoading(true)
    try {
      const response = await fetch('/api/mtasts/zones', {
        headers: {
          'X-Admin-Actor': adminActor,
        },
      })
      const nextPayload = await parseApiPayload<{ ok: boolean; error?: string; request_id?: string; zones?: MtastsZone[] }>(response, 'Falha ao carregar zonas do MTA-STS')

      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao carregar zonas do MTA-STS.')
      }

      const nextZones = Array.isArray(nextPayload.zones) ? nextPayload.zones : []
      setZones(nextZones)

      if (nextZones.length > 0 && !selectedDomain) {
        setSelectedDomain(nextZones[0].name)
        setSelectedZoneId(nextZones[0].id)
      }

      if (shouldNotify) {
        showNotification(withTrace('Zonas do MTA-STS atualizadas.', nextPayload), 'success')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar as zonas do MTA-STS.'
      showNotification(message, 'error')
    } finally {
      setZonesLoading(false)
    }
  }, [adminActor, selectedDomain, showNotification])

  const loadPolicy = useCallback(async (domainValue: string, zoneIdValue: string, shouldNotify = false) => {
    if (!domainValue || !zoneIdValue) {
      setPolicyText('')
      setTlsrptEmail('')
      setLastGeneratedId(null)
      setMxRecords([])
      return
    }

    setPolicyLoading(true)
    try {
      const response = await fetch(`/api/mtasts/policy?domain=${encodeURIComponent(domainValue)}&zoneId=${encodeURIComponent(zoneIdValue)}`, {
        headers: {
          'X-Admin-Actor': adminActor,
        },
      })
      const nextPayload = await parseApiPayload<{ ok: boolean; error?: string; request_id?: string; policy?: MtastsPolicyResponse }>(response, 'Falha ao carregar policy do domínio')

      if (!response.ok || !nextPayload.ok || !nextPayload.policy) {
        throw new Error(nextPayload.error ?? 'Falha ao carregar policy do domínio.')
      }

      setPolicyText(nextPayload.policy.savedPolicy ?? '')
      setTlsrptEmail(nextPayload.policy.savedEmail ?? nextPayload.policy.dnsTlsRptEmail ?? '')
      setLastGeneratedId(nextPayload.policy.lastGeneratedId)
      setMxRecords(Array.isArray(nextPayload.policy.mxRecords) ? nextPayload.policy.mxRecords : [])

      if (shouldNotify) {
        showNotification(withTrace(`Policy carregada para ${domainValue}.`, nextPayload), 'success')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar a policy do domínio selecionado.'
      showNotification(message, 'error')
    } finally {
      setPolicyLoading(false)
    }
  }, [adminActor, showNotification])

  useEffect(() => {
    void loadZones()
  }, [loadZones])

  useEffect(() => {
    if (!selectedDomain || !selectedZoneId) {
      return
    }

    void loadPolicy(selectedDomain, selectedZoneId)
  }, [loadPolicy, selectedDomain, selectedZoneId])

  useEffect(() => {
    runIntegrityAudit()
  }, [runIntegrityAudit])

  const buildPolicyFromMx = () => {
    if (!Array.isArray(mxRecords) || mxRecords.length === 0) {
      showNotification('Sem MX retornado para gerar policy automaticamente.', 'info')
      return
    }

    const baseLines = [
      'version: STSv1',
      'mode: enforce',
      'max_age: 604800',
      ...mxRecords.map((record) => `mx: ${record}`),
    ]

    setPolicyText(baseLines.join('\n'))
    showNotification('Policy regenerada a partir dos registros MX atuais.', 'success')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const query = new URLSearchParams({
      domain,
      limit,
    })

    setOverviewLoading(true)
    try {
      const response = await fetch(`/api/mtasts/overview?${query.toString()}`)
      const nextPayload = await parseApiPayload<MtastsPayload>(response, 'Falha ao consultar o módulo MTA-STS')

      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao consultar o módulo MTA-STS.')
      }

      setPayload(nextPayload)
      showNotification(`MTA-STS atualizado: ${nextPayload.resumo.totalHistorico} item(ns) de histórico.`, 'success')
      if (Array.isArray(nextPayload.avisos) && nextPayload.avisos.length > 0) {
        showNotification(nextPayload.avisos[0], 'info')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar o módulo MTA-STS.'
      showNotification(message, 'error')
    } finally {
      setOverviewLoading(false)
    }
  }

  const handleZoneChange = (nextDomain: string) => {
    const zone = zones.find((item) => item.name === nextDomain)
    setSelectedDomain(nextDomain)
    setSelectedZoneId(zone?.id ?? '')
  }

  const handleOrchestrate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedPolicy = policyText.trim()
    if (!selectedDomain || !selectedZoneId || !normalizedPolicy) {
      showNotification('Selecione domínio/zona e informe a policy antes de sincronizar.', 'error')
      return
    }

    setOrchestrating(true)
    try {
      const response = await fetch('/api/mtasts/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({
          domain: selectedDomain,
          zoneId: selectedZoneId,
          policyText: normalizedPolicy,
          tlsrptEmail: tlsrptEmail.trim().toLowerCase(),
          adminActor,
        }),
      })

      const nextPayload = await parseApiPayload<{ ok: boolean; error?: string; id?: string; request_id?: string }>(response, 'Falha ao orquestrar sincronização MTA-STS')
      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao orquestrar sincronização MTA-STS.')
      }

      setLastGeneratedId(nextPayload.id ?? null)
      await Promise.all([
        loadPolicy(selectedDomain, selectedZoneId),
        (async () => {
          const query = new URLSearchParams({
            domain,
            limit,
          })
          const overviewResponse = await fetch(`/api/mtasts/overview?${query.toString()}`)
          if (!overviewResponse.ok) {
            return
          }
          const overviewPayload = await parseApiPayload<MtastsPayload>(overviewResponse, 'Falha ao atualizar overview MTA-STS após orquestração')
          if (overviewPayload.ok) {
            setPayload(overviewPayload)
          }
        })(),
      ])

      showNotification(withTrace(`MTA-STS sincronizado com sucesso para ${selectedDomain}.`, nextPayload), 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível executar a sincronização orquestrada do MTA-STS.'
      showNotification(message, 'error')
    } finally {
      setOrchestrating(false)
    }
  }

  return (
    <section className="detail-panel">
      <div className="detail-header">
        <div className="detail-icon"><ShieldCheck size={22} /></div>
        <div>
          <h3>MTA-STS — Histórico e Policies</h3>
          <p>Consulta híbrida no shell: prioriza `bigdata_db` e recua para legado quando necessário.</p>
        </div>
      </div>

      {integrityStatus !== 'idle' && (
        <article className={`integrity-banner integrity-banner--${integrityStatus}`}>
          <header className="integrity-banner__header">
            <ShieldCheck size={16} />
            <strong>
              {integrityStatus === 'ok' && 'Auditoria de integridade: sem divergências detectadas.'}
              {integrityStatus === 'warning' && `Auditoria de integridade: ${integrityIssues.length} alerta(s) detectado(s).`}
              {integrityStatus === 'error' && `Auditoria de integridade: ${integrityIssues.length} inconsistência(s) crítica(s).`}
            </strong>
          </header>
          {integrityIssues.length > 0 && (
            <ul className="integrity-banner__list">
              {integrityIssues.map((issue, index) => (
                <li key={`${issue}-${index}`}>{issue}</li>
              ))}
            </ul>
          )}
        </article>
      )}

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="mtasts-admin-actor">Administrador responsável</label>
            <input
              id="mtasts-admin-actor"
              name="mtastsAdminActor"
              type="text"
              autoComplete="email"
              placeholder="admin@lcv.app.br"
              value={adminActor}
              onChange={(event) => setAdminActor(event.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="mtasts-filtro-domain">Domínio (opcional)</label>
            <input
              id="mtasts-filtro-domain"
              name="mtastsFiltroDomain"
              type="text"
              autoComplete="url"
              placeholder="ex.: lcv.app.br"
              value={domain}
              onChange={(event) => setDomain(event.target.value.toLowerCase())}
            />
          </div>

          <div className="field-group">
            <label htmlFor="mtasts-filtro-limit">Limite</label>
            <input
              id="mtasts-filtro-limit"
              name="mtastsFiltroLimit"
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={disabled}>
            {overviewLoading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
            Carregar overview
          </button>
        </div>
      </form>

      <form className="form-card" onSubmit={handleOrchestrate}>
        <div className="result-toolbar">
          <div>
            <h4><ShieldCheck size={16} /> Orquestração MTA-STS</h4>
            <p className="field-hint">Sincroniza policy no D1 legado, atualiza DNS na Cloudflare e registra novo ID em histórico.</p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void loadZones(true)} disabled={zonesLoading || orchestrating}>
              {zonesLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Recarregar zonas
            </button>
            <button type="button" className="ghost-button" onClick={buildPolicyFromMx} disabled={policyLoading || orchestrating}>
              <RefreshCw size={16} />
              Gerar policy via MX
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="mtasts-domain-operacao">Domínio alvo</label>
            <select
              id="mtasts-domain-operacao"
              name="mtastsDomainOperacao"
              value={selectedDomain}
              onChange={(event) => handleZoneChange(event.target.value)}
              disabled={zonesLoading || orchestrating}
            >
              <option value="">Selecione um domínio...</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.name}>{zone.name}</option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="mtasts-zone-id">Zone ID</label>
            <input
              id="mtasts-zone-id"
              name="mtastsZoneId"
              value={selectedZoneId}
              readOnly
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="mtasts-tlsrpt-email">E-mail TLS-RPT</label>
          <input
            id="mtasts-tlsrpt-email"
            name="mtastsTlsRptEmail"
            type="email"
            value={tlsrptEmail}
            onChange={(event) => setTlsrptEmail(event.target.value.trim().toLowerCase())}
            disabled={policyLoading || orchestrating}
            placeholder="relatorios@dominio.com"
          />
        </div>

        <div className="field-group">
          <label htmlFor="mtasts-policy-text">Policy mta-sts.txt</label>
          <textarea
            id="mtasts-policy-text"
            name="mtastsPolicyText"
            className="json-textarea"
            rows={8}
            value={policyText}
            onChange={(event) => setPolicyText(event.target.value)}
            disabled={policyLoading || orchestrating}
            placeholder="version: STSv1&#10;mode: enforce&#10;max_age: 604800&#10;mx: mail.exemplo.com"
          />
        </div>

        <div className="post-row-meta">
          <span>Último ID conhecido: <strong>{lastGeneratedId ?? '—'}</strong></span>
          <span>MX detectados: {mxRecords.length}</span>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={orchestrating || policyLoading || zonesLoading}>
            {orchestrating ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            Sincronizar dados + gerar ID
          </button>
        </div>
      </form>

      <section className="metrics-grid">
        <article className="metric-card">
          <div className="metric-icon"><ShieldCheck size={20} /></div>
          <strong>{payload.resumo.totalHistorico}</strong>
          <span>Total de itens de histórico.</span>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><ShieldCheck size={20} /></div>
          <strong>{payload.resumo.totalPolicies}</strong>
          <span>Total de policies carregadas.</span>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><ShieldCheck size={20} /></div>
          <strong>{payload.fonte}</strong>
          <span>Fonte atual de dados.</span>
        </article>
      </section>

      <article className="result-card">
        <header className="result-header">
          <h4><ShieldCheck size={16} /> Histórico recente</h4>
          <span>{payload.historico.length} item(ns)</span>
        </header>

        {payload.historico.length === 0 ? (
          <p className="result-empty">Sem histórico para os filtros atuais.</p>
        ) : (
          <ul className="result-list">
            {payload.historico.map((item, index) => (
              <li key={`${item.geradoEm}-${item.domain ?? 'sem-dominio'}-${index}`}>
                <strong>{item.domain ?? 'sem domínio'}</strong>
                <span>{item.geradoEm}</span>
                <span className="badge badge-em-implantacao">id gerado</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <SyncStatusCard
        module="mtasts"
        endpoint="/api/mtasts/sync"
        title="Sync manual do MTA-STS"
        description="Sincroniza histórico, zonas e policies auditáveis do legado para o `bigdata_db`, preservando o app atual até homologação completa."
      />
    </section>
  )
}
