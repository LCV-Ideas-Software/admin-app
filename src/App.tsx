import { lazy, Suspense, useState } from 'react'
import {
  BarChart3,
  Database,
  DollarSign,
  Globe,
  LayoutGrid,
  Loader2,
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
import { FloatingScrollButtons } from './components/FloatingScrollButtons'

/* Lazy-loaded modules — cada módulo vira um chunk separado */
const AstrologoModule = lazy(() => import('./modules/astrologo/AstrologoModule').then(m => ({ default: m.AstrologoModule })))
const ConfigModule = lazy(() => import('./modules/config/ConfigModule').then(m => ({ default: m.ConfigModule })))
const ItauModule = lazy(() => import('./modules/itau/ItauModule').then(m => ({ default: m.ItauModule })))
const MainsiteModule = lazy(() => import('./modules/mainsite/MainsiteModule').then(m => ({ default: m.MainsiteModule })))
const MtastsModule = lazy(() => import('./modules/mtasts/MtastsModule').then(m => ({ default: m.MtastsModule })))
const CardHubModule = lazy(() => import('./modules/hubs/CardHubModule').then(m => ({ default: m.CardHubModule })))
const TelemetriaModule = lazy(() => import('./modules/telemetria/TelemetriaModule').then(m => ({ default: m.TelemetriaModule })))
const FinanceiroModule = lazy(() => import('./modules/financeiro/FinanceiroModule').then(m => ({ default: m.FinanceiroModule })))
const NewsPanel = lazy(() => import('./modules/news/NewsPanel').then(m => ({ default: m.NewsPanel })))

const APP_VERSION = 'APP v01.45.00'



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
      <a href="#main-content" className="skip-link">Ir para conteúdo principal</a>
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
            aria-label={sidebarPinned ? 'Recolher menu lateral' : 'Fixar menu lateral'}
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
              aria-current={activeModule === id ? 'page' : undefined}
              title={label}
            >
              <Icon size={18} />
              <span className="sidebar-label">{label}</span>
            </button>
          ))}
        </nav>

      </aside>

      <main id="main-content" className="content" role="main" aria-label="Conteúdo do módulo ativo">
        <header className="topbar">
          <div>
            <p className="eyebrow">Painel administrativo unificado</p>
            <h2>{activeModule === 'overview' ? 'Visão Geral' : MODULE_LABELS[activeModule as Exclude<ModuleId, 'overview'>] ?? activeModule}</h2>
          </div>
          <div className="status-cluster">
            <span className="status-pill">{APP_VERSION}</span>
          </div>
        </header>

        <Suspense fallback={<div className="module-loading"><Loader2 size={24} className="spin" /></div>}>
        {activeModule === 'overview' ? (
          <NewsPanel />
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
        </Suspense>
        <FloatingScrollButtons />
      </main>
    </div>
  )
}

export default App
