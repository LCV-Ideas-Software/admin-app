import { Component, lazy, Suspense, useState, type ComponentType, type ErrorInfo, type ReactNode } from 'react'
import {
  BarChart3,
  BrainCircuit,
  Database,
  DollarSign,
  Globe,
  LayoutGrid,
  Loader2,
  PanelsTopLeft,
  Pin,
  PinOff,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Workflow,
  Wrench,
} from 'lucide-react'
import './styles/variables.css'
import './App.css'
import { FloatingScrollButtons } from './components/FloatingScrollButtons'

/* Lazy-loaded modules — cada módulo vira um chunk separado */
const LAZY_IMPORT_RELOAD_KEY = 'admin-app:lazy-import-reload-once'
const CHUNK_IMPORT_ERROR_REGEX = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk\s+\d+\s+failed/i

type LazyModuleErrorBoundaryState = {
  hasError: boolean
  message: string
}

class LazyModuleErrorBoundary extends Component<{ children: ReactNode }, LazyModuleErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = {
      hasError: false,
      message: '',
    }
  }

  static getDerivedStateFromError(error: unknown): LazyModuleErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error)
    return {
      hasError: true,
      message,
    }
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    void errorInfo
    console.error('[admin-app] lazy module render error', error)
  }

  private handleReload = () => {
    if (typeof window === 'undefined') {
      return
    }

    window.sessionStorage.removeItem(LAZY_IMPORT_RELOAD_KEY)
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const isChunkFailure = CHUNK_IMPORT_ERROR_REGEX.test(this.state.message)

    return (
      <section className="module-error-panel" role="alert" aria-live="assertive">
        <h3>Não foi possível carregar este módulo</h3>
        <p>
          {isChunkFailure
            ? 'A sessão de acesso pode ter expirado. Recarregue para renegociar autenticação e tentar novamente.'
            : 'O módulo encontrou um erro inesperado ao carregar. Recarregue a página para tentar novamente.'}
        </p>
        <div className="module-error-panel__actions">
          <button type="button" className="primary-button" onClick={this.handleReload}>
            Recarregar agora
          </button>
        </div>
      </section>
    )
  }
}

function lazyWithAccessRecovery<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const loadedModule = await importer()
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(LAZY_IMPORT_RELOAD_KEY)
      }
      return loadedModule
    } catch (error) {
      if (typeof window !== 'undefined') {
        const message = error instanceof Error ? error.message : String(error)
        const isChunkFetchFailure = CHUNK_IMPORT_ERROR_REGEX.test(message)

        // Em cenários de expiração do Cloudflare Access, chunks lazy podem retornar 401.
        // Damos um único reload forçado para renegociar sessão e evitar crash permanente do módulo.
        if (isChunkFetchFailure) {
          const alreadyReloaded = window.sessionStorage.getItem(LAZY_IMPORT_RELOAD_KEY) === '1'
          if (!alreadyReloaded) {
            window.sessionStorage.setItem(LAZY_IMPORT_RELOAD_KEY, '1')
            window.location.reload()
            return new Promise<never>(() => {
              // segura a resolução até o reload efetivo da página
            })
          }
        }
      }

      throw error
    }
  })
}

const AstrologoModule = lazyWithAccessRecovery(() => import('./modules/astrologo/AstrologoModule').then(m => ({ default: m.AstrologoModule })))
const ConfigModule = lazyWithAccessRecovery(() => import('./modules/config/ConfigModule').then(m => ({ default: m.ConfigModule })))
const CalculadoraModule = lazyWithAccessRecovery(() => import('./modules/calculadora/CalculadoraModule').then(m => ({ default: m.CalculadoraModule })))
const MainsiteModule = lazyWithAccessRecovery(() => import('./modules/mainsite/MainsiteModule').then(m => ({ default: m.MainsiteModule })))
const MtastsModule = lazyWithAccessRecovery(() => import('./modules/mtasts/MtastsModule').then(m => ({ default: m.MtastsModule })))
const CardHubModule = lazyWithAccessRecovery(() => import('./modules/hubs/CardHubModule').then(m => ({ default: m.CardHubModule })))
const TelemetriaModule = lazyWithAccessRecovery(() => import('./modules/telemetria/TelemetriaModule').then(m => ({ default: m.TelemetriaModule })))
const FinanceiroModule = lazyWithAccessRecovery(() => import('./modules/financeiro/FinanceiroModule').then(m => ({ default: m.FinanceiroModule })))
const CfDnsModule = lazyWithAccessRecovery(() => import('./modules/cfdns/CfDnsModule').then(m => ({ default: m.CfDnsModule })))
const CfPwModule = lazyWithAccessRecovery(() => import('./modules/cfpw/CfPwModule').then(m => ({ default: m.CfPwModule })))
const OraculoModule = lazyWithAccessRecovery(() => import('./modules/oraculo/OraculoModule').then(m => ({ default: m.OraculoModule })))
const NewsPanel = lazyWithAccessRecovery(() => import('./modules/news/NewsPanel').then(m => ({ default: m.NewsPanel })))
const TlsrptModule = lazyWithAccessRecovery(() => import('./modules/tlsrpt/TlsrptModule').then(m => ({ default: m.TlsrptModule })))

const APP_VERSION = 'APP v01.67.02'
type ModuleId = 'overview' | 'astrologo' | 'cardhub' | 'cfdns' | 'cfpw' | 'config' | 'financeiro' | 'oraculo' | 'calculadora' | 'mainsite' | 'mtasts' | 'telemetria' | 'tlsrpt'

const MODULE_LABELS: Record<Exclude<ModuleId, 'overview'>, string> = {
  astrologo: 'Astrólogo', cardhub: 'Card Hub', cfdns: 'CF DNS', cfpw: 'CF P&W', financeiro: 'Financeiro', oraculo: 'Oráculo',
  calculadora: 'Calculadora', mainsite: 'MainSite', mtasts: 'MTA-STS',
  telemetria: 'Telemetria', config: 'Configurações', tlsrpt: 'TLS-RPT',
}

// Regra do menu lateral: Visão Geral sempre primeiro, Configurações sempre último,
// e todos os demais módulos em ordem alfabética.
const navItems: Array<{ id: ModuleId; label: string; icon: typeof PanelsTopLeft }> = [
  { id: 'overview', label: 'Visão Geral', icon: PanelsTopLeft },
  { id: 'astrologo', label: 'Astrólogo', icon: Sparkles },
  { id: 'cardhub', label: 'Card Hub', icon: LayoutGrid },
  { id: 'cfdns', label: 'CF DNS', icon: Globe },
  { id: 'cfpw', label: 'CF P&W', icon: Globe },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'calculadora', label: 'Calculadora', icon: Database },
  { id: 'mainsite', label: 'MainSite', icon: Globe },
  { id: 'mtasts', label: 'MTA-STS', icon: ShieldCheck },
  { id: 'oraculo', label: 'Oráculo', icon: BrainCircuit },
  { id: 'telemetria', label: 'Telemetria', icon: BarChart3 },
  { id: 'tlsrpt', label: 'TLS-RPT', icon: ShieldAlert },
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

        <LazyModuleErrorBoundary>
          <Suspense fallback={<div className="module-loading"><Loader2 size={24} className="spin" /></div>}>
          {activeModule === 'overview' ? (
            <NewsPanel />
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
          ) : activeModule === 'cfdns' ? (
            <CfDnsModule />
          ) : activeModule === 'cfpw' ? (
            <CfPwModule />
          ) : activeModule === 'cardhub' ? (
            <CardHubModule />
          ) : activeModule === 'financeiro' ? (
            <FinanceiroModule />
          ) : activeModule === 'oraculo' ? (
            <OraculoModule />
          ) : activeModule === 'telemetria' ? (
            <TelemetriaModule />
          ) : activeModule === 'tlsrpt' ? (
            <TlsrptModule />
          ) : null}
          </Suspense>
        </LazyModuleErrorBoundary>
        <FloatingScrollButtons />
      </main>
    </div>
  )
}

export default App
