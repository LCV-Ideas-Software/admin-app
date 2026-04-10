/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import App from './App';
import { ModuleView } from './ModuleView';

const rootRoute = createRootRoute({ component: App });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async () => {
    let targetModule = 'overview';
    try {
      const r = await fetch('/api/config-store?module=admin-app%2Fhomepage');
      if (r.ok) {
        const data = (await r.json()) as { ok?: boolean; config?: { moduleId?: string } | null };
        const saved = data?.config?.moduleId;
        if (saved && saved !== 'overview') {
          targetModule = saved;
        }
      }
    } catch {
      /* fallback to overview */
    }
    throw redirect({ to: '/$moduleId', params: { moduleId: targetModule } });
  },
  component: () => null,
});

const moduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$moduleId',
  component: ModuleView,
});

const routeTree = rootRoute.addChildren([indexRoute, moduleRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
