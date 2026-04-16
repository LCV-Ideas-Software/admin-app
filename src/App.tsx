/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from '@tanstack/react-router';
import {
  BarChart3,
  Brain,
  BrainCircuit,
  Database,
  DollarSign,
  Globe,
  Home,
  LayoutGrid,
  PanelsTopLeft,
  Pin,
  PinOff,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Workflow,
  Wrench,
} from 'lucide-react';
import './styles/variables.css';
import './App.css';
import { FloatingScrollButtons } from './components/FloatingScrollButtons';
import { ComplianceBanner } from './components/ComplianceBanner';

const APP_VERSION = 'APP v01.88.02';

export type ModuleId =
  | 'overview'
  | 'ai-status'
  | 'astrologo'
  | 'cardhub'
  | 'cfdns'
  | 'cfpw'
  | 'config'
  | 'financeiro'
  | 'oraculo'
  | 'calculadora'
  | 'mainsite'
  | 'mtasts'
  | 'telemetria'
  | 'tlsrpt'
  | 'compliance';

const MODULE_LABELS: Record<Exclude<ModuleId, 'overview'>, string> = {
  'ai-status': 'AI Status',
  astrologo: 'Astrólogo',
  cardhub: 'Card Hub',
  cfdns: 'CF DNS',
  cfpw: 'CF P&W',
  financeiro: 'Financeiro',
  oraculo: 'Oráculo',
  calculadora: 'Calculadora',
  mainsite: 'MainSite',
  mtasts: 'MTA-STS',
  telemetria: 'Telemetria',
  config: 'Configurações',
  tlsrpt: 'TLS-RPT',
  compliance: 'Conformidade e Licenças',
};

// Regra do menu lateral: Visão Geral sempre primeiro, Configurações sempre último,
// e todos os demais módulos em ordem alfabética.
const navItems: Array<{ id: ModuleId; label: string; icon: typeof PanelsTopLeft }> = [
  { id: 'overview', label: 'Visão Geral', icon: PanelsTopLeft },
  { id: 'ai-status', label: 'AI Status', icon: Brain },
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
];

const HOMEPAGE_CONFIG_KEY = 'admin-app/homepage';

function App() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const activeModule = ((params as { moduleId?: string }).moduleId as ModuleId) || 'overview';

  const [homepageModule, setHomepageModule] = useState<ModuleId | null>(null);

  // Loads the pinned homepage from D1 to show the pin indicator in sidebar.
  // Navigation on initial load is handled by the index route's beforeLoad.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/config-store?module=${encodeURIComponent(HOMEPAGE_CONFIG_KEY)}`)
      .then((r) => r.json())
      .then((data: { ok?: boolean; config?: { moduleId?: string } | null }) => {
        if (cancelled) return;
        const saved = data?.config?.moduleId as ModuleId | undefined;
        if (saved) setHomepageModule(saved);
      })
      .catch(() => {
        /* silently fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveHomepage = useCallback((moduleId: ModuleId | null) => {
    fetch('/api/config-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: HOMEPAGE_CONFIG_KEY, config: { moduleId } }),
    }).catch((err) => console.error('[admin-app] homepage save failed', err));
  }, []);

  const handleHomepageToggle = useCallback(
    (moduleId: ModuleId) => {
      const newValue = homepageModule === moduleId ? null : moduleId;
      setHomepageModule(newValue);
      saveHomepage(newValue);
    },
    [homepageModule, saveHomepage],
  );

  const handleModuleClick = (moduleId: ModuleId) => {
    // Chrome-first: View Transitions API for smooth crossfade between modules
    // Falls back to instant switch on Firefox/Safari (zero regression)
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
    const doNavigate = () => navigate({ to: '/$moduleId', params: { moduleId } });
    if (doc.startViewTransition) {
      doc.startViewTransition(() => void doNavigate());
    } else {
      void doNavigate();
    }
  };

  const [sidebarPinned, setSidebarPinned] = useState(true);

  return (
    <div className={`app-shell${sidebarPinned ? '' : ' sidebar-collapsed'}`}>
      <a href="#main-content" className="skip-link">
        Ir para conteúdo principal
      </a>
      <aside
        className={`sidebar${sidebarPinned ? '' : ' collapsed'}`}
        onMouseEnter={() => {
          if (!sidebarPinned) document.querySelector('.sidebar')?.classList.add('hovered');
        }}
        onMouseLeave={() => {
          if (!sidebarPinned) document.querySelector('.sidebar')?.classList.remove('hovered');
        }}
      >
        <div className="brand-card">
          <div className="brand-icon">
            <Workflow size={24} />
          </div>
          <h1 className="sidebar-label">Admin LCV</h1>
          <button
            type="button"
            className="pin-toggle"
            aria-label={sidebarPinned ? 'Recolher menu lateral' : 'Fixar menu lateral'}
            title={sidebarPinned ? 'Recolher menu' : 'Fixar menu'}
            onClick={() => {
              setSidebarPinned(!sidebarPinned);
              document.querySelector('.sidebar')?.classList.remove('hovered');
            }}
          >
            {sidebarPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
        </div>

        <nav className="nav-list" aria-label="Módulos administrativos">
          {navItems.map(({ id, label, icon: Icon }) => (
            <div key={id} className={`nav-item-row${homepageModule === id ? ' is-homepage' : ''}`}>
              <button
                type="button"
                className={`nav-item ${activeModule === id ? 'nav-item-active' : ''}`}
                onClick={() => handleModuleClick(id)}
                aria-current={activeModule === id ? 'page' : undefined}
                title={label}
              >
                <Icon size={18} />
                <span className="sidebar-label">{label}</span>
              </button>
              {id !== 'overview' && (
                <button
                  type="button"
                  className={`homepage-toggle sidebar-label${homepageModule === id ? ' homepage-active' : ''}`}
                  title={homepageModule === id ? 'Remover como página inicial' : 'Definir como página inicial'}
                  aria-label={
                    homepageModule === id
                      ? `Remover ${label} como página inicial`
                      : `Definir ${label} como página inicial`
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHomepageToggle(id);
                  }}
                >
                  <Home size={13} />
                </button>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <main id="main-content" className="content" role="main" aria-label="Conteúdo do módulo ativo">
        <header className="topbar">
          <div>
            <p className="eyebrow">Painel administrativo unificado</p>
            <h2>
              {activeModule === 'overview'
                ? 'Visão Geral'
                : (MODULE_LABELS[activeModule as Exclude<ModuleId, 'overview'>] ?? activeModule)}
            </h2>
          </div>
          <div className="status-cluster">
            <span className="status-pill">{APP_VERSION}</span>
          </div>
        </header>

        <Outlet />

        <ComplianceBanner onViewLicenses={() => navigate({ to: '/$moduleId', params: { moduleId: 'compliance' } })} />
        <FloatingScrollButtons />
      </main>
    </div>
  );
}

export default App;
