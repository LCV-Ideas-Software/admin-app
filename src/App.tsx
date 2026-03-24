import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  AppWindow,
  ArrowUpRight,
  Database,
  FolderKanban,
  Globe,
  PanelsTopLeft,
  Pin,
  PinOff,
  ShieldCheck,
  Sparkles,
  Workflow,
  Wrench,
} from 'lucide-react'
import './styles/variables.css'
import './App.css'
import { useNotification } from './components/Notification'
import { AstrologoModule } from './modules/astrologo/AstrologoModule'
import { ConfigModule } from './modules/config/ConfigModule'
import { CalculadoraModule } from './modules/calculadora/CalculadoraModule'
import { MainsiteModule } from './modules/mainsite/MainsiteModule'
import { MtastsModule } from './modules/mtasts/MtastsModule'
import { ApphubModule } from './modules/hubs/ApphubModule'
import { AdminhubModule } from './modules/hubs/AdminhubModule'
import { formatOperationalSourceLabel, isLegacyOperationalSource } from './lib/operationalSource'

const APP_VERSION = 'APP v01.35.01'

type OperationalModuleStatus = {
  module: string
  totalEvents24h: number
  fallbackEvents24h: number
  errorEvents24h: number
  lastSource: string
  lastOk: boolean
}

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
  source: string
  generatedAt: number
  modules: OperationalModuleStatus[]
  sync: OperationalSyncStatus[]
}

type ModuleId = 'overview' | 'astrologo' | 'config' | 'calculadora' | 'mainsite' | 'mtasts' | 'apphub' | 'adminhub'

type ModuleCard = {
  id: Exclude<ModuleId, 'overview'>
  title: string
  description: string
  status: 'planejado' | 'em-implantacao'
  endpoint: string
  database: string
  legacyAdmin: string
}

const moduleCards: ModuleCard[] = [
  {
    id: 'astrologo',
    title: 'Astrólogo',
    description: 'Mapas, análise IA, rate limit, leitura operacional e envios administrativos.',
    status: 'em-implantacao',
    endpoint: '/api/astrologo/*',
    database: 'oraculo_astrologico_db',
    legacyAdmin: 'admin-astrologo.lcv.app.br',
  },
  {
    id: 'calculadora',
    title: 'Calculadora Calculadora',
    description: 'Observabilidade cambial, parâmetros dinâmicos, backtests e políticas operacionais.',
    status: 'em-implantacao',
    endpoint: '/api/calculadora/*',
    database: 'calculadora-calc-db',
    legacyAdmin: 'admin.lcv.app.br',
  },
  {
    id: 'mainsite',
    title: 'MainSite',
    description: 'Conteúdo, analytics, financeiro, telemetria e integração com worker principal.',
    status: 'em-implantacao',
    endpoint: 'proxy via worker + /api/mainsite/*',
    database: 'mainsite-db',
    legacyAdmin: 'admin-site.lcv.rio.br',
  },
  {
    id: 'mtasts',
    title: 'MTA-STS',
    description: 'Integridade de políticas, zonas Cloudflare e histórico operacional do serviço.',
    status: 'em-implantacao',
    endpoint: '/api/mtasts/*',
    database: 'mtasts-admin_db',
    legacyAdmin: 'mtasts-admin.lcv.app.br',
  },
  {
    id: 'apphub',
    title: 'AppHub',
    description: 'Catálogo público de apps, agora consolidado como módulo configurável no admin-app.',
    status: 'em-implantacao',
    endpoint: '/api/apphub/config',
    database: 'bigdata_db (apphub_cards)',
    legacyAdmin: 'apphub.lcv.app.br',
  },
  {
    id: 'adminhub',
    title: 'AdminHub',
    description: 'Catálogo administrativo consolidado no cockpit com persistência de configuração em D1.',
    status: 'em-implantacao',
    endpoint: '/api/adminhub/config',
    database: 'bigdata_db (adminhub_cards)',
    legacyAdmin: 'adminhub.lcv.app.br',
  },
]

const navItems: Array<{ id: ModuleId; label: string; icon: typeof PanelsTopLeft }> = [
  { id: 'overview', label: 'Visão Geral', icon: PanelsTopLeft },
  { id: 'adminhub', label: 'AdminHub', icon: FolderKanban },
  { id: 'apphub', label: 'AppHub', icon: AppWindow },
  { id: 'astrologo', label: 'Astrólogo', icon: Sparkles },
  { id: 'calculadora', label: 'Calculadora', icon: Database },
  { id: 'mainsite', label: 'MainSite', icon: Globe },
  { id: 'mtasts', label: 'MTA-STS', icon: ShieldCheck },
  { id: 'config', label: 'Configurações', icon: Wrench },
]

function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('overview')
  const [operationalOverview, setOperationalOverview] = useState<OperationalOverviewPayload | null>(null)
  const { showNotification } = useNotification()

  const selectedModule = useMemo(
    () => moduleCards.find((module) => module.id === activeModule),
    [activeModule],
  )

  const handleModuleClick = (moduleId: ModuleId) => {
    setActiveModule(moduleId)
    if (moduleId !== 'overview') {
      const moduleData = moduleCards.find((item) => item.id === moduleId)
      if (moduleData) {
        showNotification(`${moduleData.title} carregado no cockpit unificado.`, 'info')
      }
    }
  }

  useEffect(() => {
    if (activeModule !== 'overview') {
      return
    }

    let cancelled = false

    const loadOperationalOverview = async () => {
      try {
        const response = await fetch('/api/overview/operational')
        if (!response.ok) {
          return
        }

        const payload = await response.json() as OperationalOverviewPayload
        if (!cancelled) {
          setOperationalOverview(payload)
        }
      } catch {
        // Visão geral operacional é complementar; falha não deve bloquear UX.
      }
    }

    void loadOperationalOverview()

    return () => {
      cancelled = true
    }
  }, [activeModule])

  const [sidebarPinned, setSidebarPinned] = useState(true)

  return (
    <div className={`app-shell${sidebarPinned ? '' : ' sidebar-collapsed'}`}>
      <aside
        className={`sidebar${sidebarPinned ? '' : ' collapsed'}`}
        onMouseEnter={() => { if (!sidebarPinned) document.querySelector('.sidebar')?.classList.add('hovered') }}
        onMouseLeave={() => { if (!sidebarPinned) document.querySelector('.sidebar')?.classList.remove('hovered') }}
      >
        <div className="brand-card">
          <div className="brand-icon"><Workflow size={24} /></div>
          <h1 className="sidebar-label">Admin LCV</h1>
          <button
            type="button"
            className="pin-toggle"
            title={sidebarPinned ? 'Recolher menu' : 'Fixar menu'}
            onClick={() => {
              setSidebarPinned(!sidebarPinned)
              document.querySelector('.sidebar')?.classList.remove('hovered')
            }}
          >
            {sidebarPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
        </div>

        <nav className="nav-list" aria-label="Módulos administrativos">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`nav-item ${activeModule === id ? 'nav-item-active' : ''}`}
              onClick={() => handleModuleClick(id)}
              title={label}
            >
              <Icon size={18} />
              <span className="sidebar-label">{label}</span>
            </button>
          ))}
        </nav>

      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Painel administrativo unificado</p>
            <h2>{activeModule === 'overview' ? 'Visão Geral' : selectedModule?.title}</h2>
          </div>
          <div className="status-cluster">
            <span className="status-pill">{APP_VERSION}</span>
          </div>
        </header>

        {activeModule === 'overview' ? (
          <>
            <article className="result-card">
              <header className="result-header">
                <h4><Activity size={16} /> Telemetria operacional (24h)</h4>
                <span>fonte da consulta: {formatOperationalSourceLabel(operationalOverview?.source ?? 'sem dados')}</span>
              </header>

              {!operationalOverview || operationalOverview.modules.length === 0 ? (
                <p className="result-empty">
                  Sem eventos operacionais registrados ainda. Os indicadores aparecerão após tráfego nos módulos.
                </p>
              ) : (
                <ul className="result-list">
                  {operationalOverview.modules.map((item) => (
                    <li key={item.module}>
                      <strong>{item.module}</strong>
                      <div className="telemetry-metrics">
                        <span>24h: {item.totalEvents24h} evento(s) · fallback: {item.fallbackEvents24h} · falhas: {item.errorEvents24h}</span>
                        <span className={`telemetry-status ${item.lastOk ? 'telemetry-status-ok' : 'telemetry-status-error'}`}>
                          último evento: {item.lastOk ? 'sucesso' : 'falha'}
                        </span>
                      </div>
                      <span className={`badge ${(item.fallbackEvents24h > 0 || !item.lastOk || isLegacyOperationalSource(item.lastSource)) ? 'badge-planejado' : 'badge-em-implantacao'}`}>
                        {formatOperationalSourceLabel(item.lastSource)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {operationalOverview && operationalOverview.modules.length > 0 ? (
                <p className="telemetry-note">
                  Observação: o badge à direita mostra a <strong>fonte do último evento</strong> de cada módulo.
                  O baseline operacional vigente é <strong>BIGDATA_DB</strong> para todos os módulos do cockpit.
                </p>
              ) : null}
            </article>

            <article className="result-card">
              <header className="result-header">
                <h4><Database size={16} /> Execuções de sync</h4>
                <span>{operationalOverview?.sync.length ?? 0} módulo(s)</span>
              </header>

              {!operationalOverview || operationalOverview.sync.length === 0 ? (
                <p className="result-empty">
                  Nenhum sync registrado ainda. Os módulos com ingestão manual mostrarão histórico aqui.
                </p>
              ) : (
                <ul className="result-list">
                  {operationalOverview.sync.map((item) => (
                    <li key={item.module}>
                      <strong>{item.module}</strong>
                      <span>
                        execuções: {item.totalRuns} · sucesso: {item.successRuns} · erros: {item.errorRuns}
                      </span>
                      <span className={`badge ${item.lastStatus === 'success' ? 'badge-em-implantacao' : 'badge-planejado'}`}>
                        {item.lastStatus === 'success'
                          ? 'último sync ok'
                          : item.lastStatus === 'error'
                            ? 'último sync com erro'
                            : item.lastStatus}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <section className="module-grid">
              {moduleCards.map((module) => (
                <article key={module.id} className="module-card">
                  <div className="module-header">
                    <div>
                      <h3>{module.title}</h3>
                      <p>{module.description}</p>
                    </div>
                    <span className={`badge badge-${module.status}`}>{module.status.replace('-', ' ')}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Endpoint alvo</dt>
                      <dd>{module.endpoint}</dd>
                    </div>
                    <div>
                      <dt>Banco atual</dt>
                      <dd>{module.database}</dd>
                    </div>
                    <div>
                      <dt>Admin legado</dt>
                      <dd>{module.legacyAdmin}</dd>
                    </div>
                  </dl>
                  <button type="button" className="ghost-button" onClick={() => handleModuleClick(module.id)}>
                    Abrir módulo <ArrowUpRight size={16} />
                  </button>
                </article>
              ))}
            </section>
          </>
        ) : activeModule === 'astrologo' ? (
          <AstrologoModule />
        ) : activeModule === 'config' ? (
          <ConfigModule />
        ) : activeModule === 'calculadora' ? (
          <CalculadoraModule />
        ) : activeModule === 'mainsite' ? (
          <MainsiteModule />
        ) : activeModule === 'mtasts' ? (
          <MtastsModule />
        ) : activeModule === 'apphub' ? (
          <ApphubModule />
        ) : activeModule === 'adminhub' ? (
          <AdminhubModule />
        ) : (
          <section className="detail-panel">
            <div className="detail-header">
              <div className="detail-icon"><Wrench size={22} /></div>
              <div>
                <h3>{selectedModule?.title}</h3>
                <p>{selectedModule?.description}</p>
              </div>
            </div>

            <div className="detail-grid">
              <article className="detail-card">
                <span className="detail-label">Estado atual</span>
                <strong>{selectedModule?.status === 'em-implantacao' ? 'Integração em construção' : 'Backlog da fase 1'}</strong>
                <p>
                  O shell já prevê espaço para este módulo, mas a conexão operacional será implementada em incrementos pequenos,
                  sempre preservando o admin legado.
                </p>
              </article>

              <article className="detail-card">
                <span className="detail-label">Banco atual</span>
                <strong>{selectedModule?.database}</strong>
                <p>
                  Nesta fase, o módulo continua apontando para a base atual. A migração para `bigdata_db` será coordenada depois,
                  aplicando prefixação por contexto em tabelas, índices e políticas.
                </p>
              </article>

              <article className="detail-card detail-card-alert">
                <span className="detail-label">Risco controlado</span>
                <strong><AlertTriangle size={16} /> Sem corte prematuro</strong>
                <p>
                  O admin individual permanece íntegro e operacional até a homologação completa deste módulo no novo shell.
                </p>
              </article>
            </div>

            <div className="roadmap-card">
              <div>
                <p className="detail-label">Próximo incremento</p>
                <strong>Expandir integração real por módulo + preparar convenção de prefixos D1</strong>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => showNotification(`Módulo ${selectedModule?.title} reservado para integração incremental.`, 'info')}
              >
                <Activity size={18} /> Marcar próximo passo
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
