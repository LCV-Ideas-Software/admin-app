/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * v02.00.00 / admin-app audit closure (HIGH): top-level Error Boundary.
 * Pre-fix, only `LazyModuleErrorBoundary` (in ModuleView.tsx) caught chunk
 * import failures; any render-phase exception elsewhere in the tree
 * (router outlet, modal, query consumer) crashed the entire admin into a
 * blank page. React Query and TanStack Router error states are scoped, so
 * a top-level boundary is still required as the last line of defense.
 *
 * Mirrors the boundary shipped in `mainsite-frontend/src/components/ErrorBoundary.tsx`
 * — class component (still required in React 19 for componentDidCatch),
 * logs to `console` + `window.dataLayer`, fallback UI with Reload action.
 */

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[admin-app] ErrorBoundary caught:', error, info.componentStack);
    if (typeof window !== 'undefined' && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: 'admin_app_error',
        error_message: error.message,
        error_name: error.name,
        component_stack: info.componentStack ?? null,
      });
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#0b0b0d',
          color: '#f5f5f5',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Algo deu errado no admin-app.</h1>
          <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 20 }}>
            Um erro inesperado interrompeu a renderização. Recarregar normalmente recupera a sessão. O erro foi
            registrado em <code>console</code> + telemetria.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '10px 20px',
              borderRadius: 6,
              border: '1px solid #444',
              backgroundColor: '#1a1a1d',
              color: '#f5f5f5',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
