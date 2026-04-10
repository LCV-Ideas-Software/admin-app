/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { Component, lazy, Suspense, type ComponentType, type ErrorInfo, type ReactNode } from 'react';
import { useParams } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import type { ModuleId } from './App';

/* ─── Lazy-load recovery infrastructure ─── */

const LAZY_IMPORT_RELOAD_KEY = 'admin-app:lazy-import-reload-once';
const CHUNK_IMPORT_ERROR_REGEX =
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk\s+\d+\s+failed/i;

type LazyModuleErrorBoundaryState = { hasError: boolean; message: string };

class LazyModuleErrorBoundary extends Component<
  { children: ReactNode },
  LazyModuleErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): LazyModuleErrorBoundaryState {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, _errorInfo: ErrorInfo) {
    console.error('[admin-app] lazy module render error', error);
  }

  private handleReload = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(LAZY_IMPORT_RELOAD_KEY);
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const isChunkFailure = CHUNK_IMPORT_ERROR_REGEX.test(this.state.message);
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
    );
  }
}

function lazyWithAccessRecovery<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const loadedModule = await importer();
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(LAZY_IMPORT_RELOAD_KEY);
      }
      return loadedModule;
    } catch (error) {
      if (typeof window !== 'undefined') {
        const message = error instanceof Error ? error.message : String(error);
        if (CHUNK_IMPORT_ERROR_REGEX.test(message)) {
          const alreadyReloaded = window.sessionStorage.getItem(LAZY_IMPORT_RELOAD_KEY) === '1';
          if (!alreadyReloaded) {
            window.sessionStorage.setItem(LAZY_IMPORT_RELOAD_KEY, '1');
            window.location.reload();
            return new Promise<never>(() => {
              /* hold until reload */
            });
          }
        }
      }
      throw error;
    }
  });
}

/* ─── Lazy module imports ─── */

const AiStatusModule = lazyWithAccessRecovery(() =>
  import('./modules/ai-status/AiStatusModule').then((m) => ({ default: m.AiStatusModule })),
);
const AstrologoModule = lazyWithAccessRecovery(() =>
  import('./modules/astrologo/AstrologoModule').then((m) => ({ default: m.AstrologoModule })),
);
const ConfigModule = lazyWithAccessRecovery(() =>
  import('./modules/config/ConfigModule').then((m) => ({ default: m.ConfigModule })),
);
const CalculadoraModule = lazyWithAccessRecovery(() =>
  import('./modules/calculadora/CalculadoraModule').then((m) => ({ default: m.CalculadoraModule })),
);
const MainsiteModule = lazyWithAccessRecovery(() =>
  import('./modules/mainsite/MainsiteModule').then((m) => ({ default: m.MainsiteModule })),
);
const MtastsModule = lazyWithAccessRecovery(() =>
  import('./modules/mtasts/MtastsModule').then((m) => ({ default: m.MtastsModule })),
);
const CardHubModule = lazyWithAccessRecovery(() =>
  import('./modules/hubs/CardHubModule').then((m) => ({ default: m.CardHubModule })),
);
const TelemetriaModule = lazyWithAccessRecovery(() =>
  import('./modules/telemetria/TelemetriaModule').then((m) => ({ default: m.TelemetriaModule })),
);
const FinanceiroModule = lazyWithAccessRecovery(() =>
  import('./modules/financeiro/FinanceiroModule').then((m) => ({ default: m.FinanceiroModule })),
);
const CfDnsModule = lazyWithAccessRecovery(() =>
  import('./modules/cfdns/CfDnsModule').then((m) => ({ default: m.CfDnsModule })),
);
const CfPwModule = lazyWithAccessRecovery(() =>
  import('./modules/cfpw/CfPwModule').then((m) => ({ default: m.CfPwModule })),
);
const OraculoModule = lazyWithAccessRecovery(() =>
  import('./modules/oraculo/OraculoModule').then((m) => ({ default: m.OraculoModule })),
);
const NewsPanel = lazyWithAccessRecovery(() =>
  import('./modules/news/NewsPanel').then((m) => ({ default: m.NewsPanel })),
);
const TlsrptModule = lazyWithAccessRecovery(() =>
  import('./modules/tlsrpt/TlsrptModule').then((m) => ({ default: m.TlsrptModule })),
);
const LicencasModule = lazyWithAccessRecovery(() =>
  import('./modules/compliance/LicencasModule').then((m) => ({ default: m.LicencasModule })),
);

/* ─── Module component map ─── */

const MODULE_COMPONENTS: Record<ModuleId, ComponentType<Record<string, never>>> = {
  overview: NewsPanel as ComponentType<Record<string, never>>,
  'ai-status': AiStatusModule as ComponentType<Record<string, never>>,
  astrologo: AstrologoModule as ComponentType<Record<string, never>>,
  cardhub: CardHubModule as ComponentType<Record<string, never>>,
  cfdns: CfDnsModule as ComponentType<Record<string, never>>,
  cfpw: CfPwModule as ComponentType<Record<string, never>>,
  config: ConfigModule as ComponentType<Record<string, never>>,
  financeiro: FinanceiroModule as ComponentType<Record<string, never>>,
  calculadora: CalculadoraModule as ComponentType<Record<string, never>>,
  mainsite: MainsiteModule as ComponentType<Record<string, never>>,
  mtasts: MtastsModule as ComponentType<Record<string, never>>,
  oraculo: OraculoModule as ComponentType<Record<string, never>>,
  telemetria: TelemetriaModule as ComponentType<Record<string, never>>,
  tlsrpt: TlsrptModule as ComponentType<Record<string, never>>,
  compliance: LicencasModule as ComponentType<Record<string, never>>,
};

/* ─── ModuleView ─── */

export function ModuleView() {
  const { moduleId } = useParams({ from: '/$moduleId' });
  const id = moduleId as ModuleId;
  const ModuleComponent = MODULE_COMPONENTS[id];

  return (
    <LazyModuleErrorBoundary key={moduleId}>
      <Suspense fallback={<div className="module-loading"><Loader2 size={24} className="spin" /></div>}>
        {ModuleComponent ? (
          <ModuleComponent />
        ) : (
          <div className="module-loading">Módulo não encontrado: {moduleId}</div>
        )}
      </Suspense>
    </LazyModuleErrorBoundary>
  );
}
