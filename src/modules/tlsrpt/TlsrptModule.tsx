import { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import {
  AlertTriangle,
  Database,
  FileJson,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
  ChevronRight,
} from 'lucide-react'
import './TlsrptModule.css'
import { useNotification } from '../../components/Notification'

const API_WORKER_URL = '/api/tlsrpt'

type TlsrptReportMeta = {
  id: string
  report_id: string
  org_name: string
  start_date: string
  end_date: string
  created_at: string
}

type PolicySummary = {
  'total-successful-session-count': number
  'total-failure-session-count': number
}

type PolicyItem = {
  policy: {
    'policy-type': string
    'policy-string': string
    'policy-domain': string
  }
  summary: PolicySummary
}

type TlsrptData = {
  'organization-name': string
  'report-id': string
  'date-range': {
    'start-datetime': string
    'end-datetime': string
  }
  policies: PolicyItem[]
}

const formatDate = (date: string) => new Date(date).toLocaleString('pt-BR', { timeZone: 'UTC' })

export function TlsrptModule() {
  const { showNotification } = useNotification()
  const [reportData, setReportData] = useState<TlsrptData | null>(null)
  const [error, setError] = useState('')
  const [cloudReports, setCloudReports] = useState<TlsrptReportMeta[]>([])
  const [isLoadingCloud, setIsLoadingCloud] = useState(false)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [cloudError, setCloudError] = useState('')
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)

  useEffect(() => {
    void fetchCloudReports(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchCloudReports = async (isManualRefresh = false) => {
    setIsLoadingCloud(true)
    setCloudError('')
    try {
      const response = await fetch(API_WORKER_URL)
      if (!response.ok) throw new Error(`HTTP ${response.status} na consulta ao motor.`)
      const data = await response.json() as TlsrptReportMeta[]
      setCloudReports(data)
      if (isManualRefresh) {
        showNotification('Lista de relatórios Cloudflare atualizada com sucesso', 'success')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro genérico'
      setCloudError(`Erro na sincronização de dados: ${msg}`)
      showNotification('Falha ao sincronizar últimos relatórios do D1', 'error')
    } finally {
      setIsLoadingCloud(false)
    }
  }

  const fetchReport = async (reportId: string) => {
    setIsLoadingReport(true)
    setError('')
    try {
      const response = await fetch(`${API_WORKER_URL}/report/${encodeURIComponent(reportId)}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json() as { raw_json: string }
      handleParseJSON(data.raw_json)
      showNotification('Relatório TLS-RPT carregado com integridade', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na obtenção do item.'
      setError(`Erro ao carregar relatório: ${msg}`)
      setReportData(null)
      showNotification('Erro interno do motor D1', 'error')
    } finally {
      setIsLoadingReport(false)
    }
  }

  const handleParseJSON = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString) as Partial<TlsrptData>
      if (!parsed['organization-name'] || !parsed.policies) {
        throw new Error('Esquema JSON não obedece à RFC 8460 ou está incompleto.')
      }
      setReportData(parsed as TlsrptData)
      setError('')
    } catch (err) {
      setReportData(null)
      const msg = err instanceof Error ? err.message : 'Dados corrompidos'
      setError(`Falha no processamento: ${msg}`)
      showNotification('O payload processado não apresenta chaves válidas', 'error')
    }
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result
      if (typeof result === 'string') {
        handleParseJSON(result)
        setSelectedReportId(null)
        showNotification('Arquivo manual lido pelo parser', 'info')
      }
    }
    reader.readAsText(file)
  }

  return (
    <section className="detail-panel module-shell-tlsrpt">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      {/* Header — tipografia clean (tiptap.dev) */}
      <header className="tlsrpt-header">
        <div className="tlsrpt-header-title">
          <div className="tlsrpt-header-icon">
            <Shield size={32} />
          </div>
          <div className="tlsrpt-header-text">
            <h1>Analisador TLS-RPT</h1>
            <p>Monitoramento de relatórios SMTP TLS estritos (RFC 8460)</p>
          </div>
        </div>
      </header>

      <main className="tlsrpt-main">
        {/* ─── Painel Lateral ─── */}
        <aside className="tlsrpt-aside">
          {/* Card Sincronização */}
          <div className="tlsrpt-card">
            <h2 className="tlsrpt-card-title">
              <Server size={16} /> Sincronização D1
            </h2>
            <button
              onClick={() => void fetchCloudReports(true)}
              disabled={isLoadingCloud}
              className="tlsrpt-btn-sync"
            >
              <RefreshCw size={16} className={isLoadingCloud ? 'spin' : ''} />
              {isLoadingCloud ? 'Sincronizando...' : 'Atualizar Dados do Cloud'}
            </button>

            {cloudError && (
              <div className="tlsrpt-alert">
                <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {cloudError}
              </div>
            )}

            {/* Lista de reports — cards interativos */}
            {cloudReports.length > 0 && (
              <div className="tlsrpt-report-list">
                {cloudReports.map((report) => {
                  const isSelected = selectedReportId === report.report_id
                  return (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => {
                        setSelectedReportId(report.report_id)
                        void fetchReport(report.report_id)
                      }}
                      className={`tlsrpt-report-item ${isSelected ? 'is-selected' : ''}`}
                    >
                      <div className="tlsrpt-report-item-header">
                        <span className="tlsrpt-report-item-title">{report.org_name}</span>
                        <ChevronRight size={16} className="tlsrpt-chevron" />
                      </div>
                      <span className="tlsrpt-report-item-date">
                        {formatDate(report.start_date).split(',')[0]}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Card Upload */}
          <div className="tlsrpt-card">
            <h2 className="tlsrpt-card-title">
              <FileJson size={16} /> Upload Manual
            </h2>
            <label className="tlsrpt-upload-zone" htmlFor="tlsrpt-json-upload">
              <Upload size={24} className="tlsrpt-upload-icon" />
              <span className="tlsrpt-upload-text">Arraste o arquivo .json cru</span>
              <input
                id="tlsrpt-json-upload"
                name="tlsrptJsonUpload"
                type="file"
                accept=".json"
                onChange={handleFileUpload}
              />
            </label>
            {error && (
              <div className="tlsrpt-alert">
                <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}
          </div>
        </aside>

        {/* ─── Área Principal ─── */}
        <section className="tlsrpt-section">
          {isLoadingReport ? (
            <div className="tlsrpt-empty-state">
              <RefreshCw size={48} className="tlsrpt-empty-icon spin" style={{ color: '#818cf8' }} />
              <p className="tlsrpt-empty-text">Montando integridade do relatório da RUA...</p>
            </div>
          ) : !reportData ? (
            <div className="tlsrpt-empty-state">
              <Database size={80} className="tlsrpt-empty-icon" />
              <p className="tlsrpt-empty-text">Aguardando entrada de dados para análise técnica de TLS.</p>
            </div>
          ) : (
            <div className="tlsrpt-section">
              {/* Card de Metadados — gradient indigo */}
              <div className="tlsrpt-meta-card">
                <div className="tlsrpt-meta-blur" />
                <div className="tlsrpt-meta-grid">
                  <div className="tlsrpt-meta-item">
                    <p>Organização Origem</p>
                    <p className="tlsrpt-meta-val-lg">{reportData['organization-name']}</p>
                  </div>
                  <div className="tlsrpt-meta-item">
                    <p>Report ID</p>
                    <p className="tlsrpt-meta-val-mono">{reportData['report-id']}</p>
                  </div>
                  <div className="tlsrpt-meta-item">
                    <p>Período Início</p>
                    <p className="tlsrpt-meta-val-med">{formatDate(reportData['date-range']['start-datetime'])}</p>
                  </div>
                  <div className="tlsrpt-meta-item">
                    <p>Período Fim</p>
                    <p className="tlsrpt-meta-val-med">{formatDate(reportData['date-range']['end-datetime'])}</p>
                  </div>
                </div>
              </div>

              {/* Políticas — cards sólidos brancos */}
              {reportData.policies.map((p, i) => {
                const total = p.summary['total-successful-session-count'] + p.summary['total-failure-session-count']
                const rate = total > 0 ? ((p.summary['total-successful-session-count'] / total) * 100).toFixed(2) : "0.00"
                
                return (
                  <div key={i} className="tlsrpt-policy-card">
                    {/* Header da política */}
                    <div className="tlsrpt-policy-header">
                      <div>
                        <h3 className="tlsrpt-policy-title">
                          <span>Domínio:</span> {p.policy['policy-domain']}
                        </h3>
                        <p className="tlsrpt-policy-desc">{p.policy['policy-string']}</p>
                      </div>
                      <span className="tlsrpt-policy-badge">{p.policy['policy-type']}</span>
                    </div>

                    {/* Corpo da política */}
                    <div className="tlsrpt-policy-body">
                      <div className="tlsrpt-policy-rate">
                        <span className="tlsrpt-policy-rate-label">Integridade Criptográfica (MTA-STS TLS)</span>
                        <span className="tlsrpt-policy-rate-val">{rate}%</span>
                      </div>

                      {/* Barra de progresso */}
                      <div className="tlsrpt-progress-bg">
                        <div
                          className="tlsrpt-progress-fill"
                          style={{ width: `${rate}%` }}
                        />
                      </div>

                      {/* Contadores */}
                      <div className="tlsrpt-counters">
                        <div className="tlsrpt-counter-box tlsrpt-counter-success">
                          <div className="tlsrpt-counter-header">
                            <ShieldCheck size={16} />
                            <span className="tlsrpt-counter-label">Autenticado com Sucesso</span>
                          </div>
                          <p className="tlsrpt-counter-val">{p.summary['total-successful-session-count']}</p>
                        </div>
                        <div className="tlsrpt-counter-box tlsrpt-counter-fail">
                          <div className="tlsrpt-counter-header">
                            <ShieldAlert size={16} />
                            <span className="tlsrpt-counter-label">Falhas e Bloqueios</span>
                          </div>
                          <p className="tlsrpt-counter-val">{p.summary['total-failure-session-count']}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </section>
  )
}
