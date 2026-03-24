import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Database,
  DollarSign,
  Globe,
  LayoutGrid,
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
import { ItauModule } from './modules/itau/ItauModule'
import { MainsiteModule } from './modules/mainsite/MainsiteModule'
import { MtastsModule } from './modules/mtasts/MtastsModule'
import { CardHubModule } from './modules/hubs/CardHubModule'
import { TelemetriaModule } from './modules/telemetria/TelemetriaModule'
import { FinanceiroModule } from './modules/financeiro/FinanceiroModule'

const APP_VERSION = 'APP v01.37.00'



type ModuleId = 'overview' | 'astrologo' | 'config' | 'financeiro' | 'itau' | 'mainsite' | 'mtasts' | 'cardhub' | 'telemetria'

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
    id: 'cardhub',
    title: 'Card Hub',
    description: 'Catálogo unificado de cards (AdminHub + AppHub), com persistência em D1.',
    status: 'em-implantacao',
    endpoint: '/api/adminhub/config + /api/apphub/config',
    database: 'bigdata_db (adminhub_cards + apphub_cards)',
    legacyAdmin: 'adminhub.lcv.app.br / apphub.lcv.app.br',
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'Logs financeiros, balanço SumUp/MP, insights, sync, estornos e cancelamentos.',
    status: 'em-implantacao',
    endpoint: '/api/financeiro/*',
    database: 'bigdata_db (mainsite_financial_logs)',
    legacyAdmin: 'admin-site.lcv.rio.br (FinancialPanel)',
  },
]

const navItems: Array<{ id: ModuleId; label: string; icon: typeof PanelsTopLeft }> = [
  { id: 'overview', label: 'Visão Geral', icon: PanelsTopLeft },
  { id: 'astrologo', label: 'Astrólogo', icon: Sparkles },
  { id: 'cardhub', label: 'Card Hub', icon: LayoutGrid },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'itau', label: 'Itaú', icon: Database },
  { id: 'mainsite', label: 'MainSite', icon: Globe },
  { id: 'mtasts', label: 'MTA-STS', icon: ShieldCheck },
  { id: 'telemetria', label: 'Telemetria', icon: BarChart3 },
  { id: 'config', label: 'Configurações', icon: Wrench },
]

function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('overview')
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
            <article className="result-card telemetria-overview-link">
              <header className="result-header">
                <h4><BarChart3 size={16} /> Telemetria centralizada</h4>
              </header>
              <p className="result-empty">
                Todos os dados de telemetria operacional, contatos, compartilhamentos, chatbot e auditoria IA foram centralizados no painel <strong>Telemetria</strong>.
              </p>
              <button type="button" className="ghost-button" onClick={() => handleModuleClick('telemetria')}>
                Abrir painel Telemetria <ArrowUpRight size={16} />
              </button>
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
        ) : activeModule === 'cardhub' ? (
          <CardHubModule />
        ) : activeModule === 'financeiro' ? (
          <FinanceiroModule />
        ) : activeModule === 'telemetria' ? (
          <TelemetriaModule />
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
