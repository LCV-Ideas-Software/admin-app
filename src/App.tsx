import { useState } from 'react'
import {
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

const MODULE_LABELS: Record<Exclude<ModuleId, 'overview'>, string> = {
  astrologo: 'Astrólogo', cardhub: 'Card Hub', financeiro: 'Financeiro',
  itau: 'Itaú', mainsite: 'MainSite', mtasts: 'MTA-STS',
  telemetria: 'Telemetria', config: 'Configurações',
}

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

  const handleModuleClick = (moduleId: ModuleId) => {
    setActiveModule(moduleId)
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
            <h2>{activeModule === 'overview' ? 'Visão Geral' : MODULE_LABELS[activeModule as Exclude<ModuleId, 'overview'>] ?? activeModule}</h2>
          </div>
          <div className="status-cluster">
            <span className="status-pill">{APP_VERSION}</span>
          </div>
        </header>

        {activeModule === 'overview' ? (
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
        ) : null}
      </main>
    </div>
  )
}

export default App
