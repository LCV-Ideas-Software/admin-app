import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  AppWindow,
  ArrowUpRight,
  Database,
  FolderKanban,
  Globe,
  Lock,
  PanelsTopLeft,
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
import { ItauModule } from './modules/itau/ItauModule'
import { MainsiteModule } from './modules/mainsite/MainsiteModule'
import { MtastsModule } from './modules/mtasts/MtastsModule'
import { ApphubModule } from './modules/hubs/ApphubModule'
import { AdminhubModule } from './modules/hubs/AdminhubModule'

const APP_VERSION = 'APP v01.19.00'

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

type ModuleId = 'overview' | 'astrologo' | 'config' | 'itau' | 'mainsite' | 'mtasts' | 'apphub' | 'adminhub'

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
    id: 'itau',
    title: 'Itaú Calculadora',
    description: 'Observabilidade cambial, parâmetros dinâmicos, backtests e políticas operacionais.',
    status: 'em-implantacao',
    endpoint: '/api/calculadora/*',
    database: 'itau-calc-db',
    legacyAdmin: 'admin-itau.lcv.app.br',
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
  { id: 'astrologo', label: 'Astrólogo', icon: Sparkles },
  { id: 'config', label: 'Configurações', icon: Wrench },
  { id: 'itau', label: 'Itaú', icon: Database },
  { id: 'mainsite', label: 'MainSite', icon: Globe },
  { id: 'mtasts', label: 'MTA-STS', icon: ShieldCheck },
  { id: 'apphub', label: 'AppHub', icon: AppWindow },
  { id: 'adminhub', label: 'AdminHub', icon: FolderKanban },
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <div className="brand-icon"><Workflow size={24} /></div>
          <div>
            <p className="eyebrow">Cloudflare Access + Pages</p>
            <h1>Admin LCV</h1>
          </div>
        </div>

        <nav className="nav-list" aria-label="Módulos administrativos">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`nav-item ${activeModule === id ? 'nav-item-active' : ''}`}
              onClick={() => handleModuleClick(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="sidebar-title">Guia de rollout</p>
          <ul>
            <li>Novo shell entra em produção sem desligar os admins legados.</li>
            <li>Segredos reais ficam apenas em runtime server-side.</li>
            <li>`bigdata_db` entra na fase seguinte, com migração controlada e prefixação por contexto.</li>
            <li>Diretriz vigente: `adminhub` e `apphub` em consolidação como módulos internos com persistência em D1.</li>
          </ul>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Painel administrativo unificado</p>
            <h2>{activeModule === 'overview' ? 'Visão Geral da Fase 1' : selectedModule?.title}</h2>
          </div>
          <div className="status-cluster">
            <span className="status-pill"><Lock size={14} /> Access protegido</span>
            <span className="status-pill"><Database size={14} /> `bigdata_db` reservado</span>
            <span className="status-pill">{APP_VERSION}</span>
          </div>
        </header>

        {activeModule === 'overview' ? (
          <>
            <section className="hero-panel">
              <div>
                <p className="eyebrow">Estratégia aprovada</p>
                <h3>Fase 1: cockpit paralelo em `admin.lcv.app.br`</h3>
                <p className="hero-copy">
                  Este projeto nasce como camada central de operação. Os admins individuais continuam ativos,
                  enquanto o shell unificado consolida UX, governança, segurança e telemetria.
                </p>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => showNotification('Estrutura base criada. Próximo passo: ligar APIs por módulo.', 'success')}
              >
                <Sparkles size={18} /> Confirmar scaffold inicial
              </button>
            </section>

            <section className="metrics-grid">
              <article className="metric-card">
                <div className="metric-icon"><PanelsTopLeft size={20} /></div>
                <strong>6 módulos</strong>
                <span>Astrólogo, Itaú, MainSite, MTA-STS, AppHub e AdminHub no shell.</span>
              </article>
              <article className="metric-card">
                <div className="metric-icon"><ShieldCheck size={20} /></div>
                <strong>Segurança</strong>
                <span>Cloudflare Access e secrets centralizados como baseline obrigatório.</span>
              </article>
              <article className="metric-card">
                <div className="metric-icon"><Database size={20} /></div>
                <strong>D1 futura</strong>
                <span>`bigdata_db` já definido com prefixação por contexto para evitar colisões.</span>
              </article>
            </section>

            <article className="result-card">
              <header className="result-header">
                <h4><Activity size={16} /> Telemetria operacional (24h)</h4>
                <span>{operationalOverview?.source ?? 'sem dados'}</span>
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
                      <span>eventos: {item.totalEvents24h} · fallback: {item.fallbackEvents24h} · erros: {item.errorEvents24h}</span>
                      <span className={`badge ${item.fallbackEvents24h > 0 || !item.lastOk ? 'badge-planejado' : 'badge-em-implantacao'}`}>
                        {item.lastSource}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
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
        ) : activeModule === 'itau' ? (
          <ItauModule />
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
