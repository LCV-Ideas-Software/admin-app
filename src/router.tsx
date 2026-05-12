/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { type NavigateTarget, type RouteParams, RouterContext, type RouterContextValue } from './router-context';

const HOMEPAGE_CONFIG_KEY = 'admin-app/homepage';
const DEFAULT_MODULE_ID = 'overview';

function browserPathname(): string {
  if (typeof window === 'undefined') return `/${DEFAULT_MODULE_ID}`;
  return window.location.pathname || '/';
}

function modulePath(moduleId: string): string {
  return `/${encodeURIComponent(moduleId || DEFAULT_MODULE_ID)}`;
}

function parseParams(pathname: string): RouteParams {
  const [firstSegment] = pathname.split('/').filter(Boolean);
  return { moduleId: firstSegment ? decodeURIComponent(firstSegment) : DEFAULT_MODULE_ID };
}

function resolveTarget(target: NavigateTarget): string {
  if (typeof target === 'string') return target;
  if (target.to === '/$moduleId') return modulePath(target.params?.moduleId || DEFAULT_MODULE_ID);
  return target.to || modulePath(DEFAULT_MODULE_ID);
}

async function resolveHomepageModule(): Promise<string> {
  try {
    const response = await fetch(`/api/config-store?module=${encodeURIComponent(HOMEPAGE_CONFIG_KEY)}`);
    if (!response.ok) return DEFAULT_MODULE_ID;
    const data = (await response.json()) as { ok?: boolean; config?: { moduleId?: string } | null };
    return data?.config?.moduleId || DEFAULT_MODULE_ID;
  } catch {
    return DEFAULT_MODULE_ID;
  }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState(browserPathname);

  const navigate = useCallback((target: NavigateTarget) => {
    if (typeof window === 'undefined') return;
    const nextPath = resolveTarget(target);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setPathname(window.location.pathname);
  }, []);

  useEffect(() => {
    const handlePopState = () => setPathname(browserPathname());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (pathname !== '/') return;
    let cancelled = false;
    resolveHomepageModule().then((moduleId) => {
      if (!cancelled) navigate({ to: '/$moduleId', params: { moduleId } });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate, pathname]);

  const value = useMemo<RouterContextValue>(
    () => ({
      navigate,
      params: parseParams(pathname),
    }),
    [navigate, pathname],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}
