/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { createContext, useContext } from 'react';

export type RouteParams = {
  moduleId?: string;
};

export type NavigateTarget =
  | string
  | {
      to: string;
      params?: RouteParams;
    };

export type RouterContextValue = {
  navigate: (target: NavigateTarget) => void;
  params: RouteParams;
};

export const RouterContext = createContext<RouterContextValue | null>(null);

export function useNavigate() {
  const context = useContext(RouterContext);
  if (!context) throw new Error('useNavigate must be used within RouterProvider');
  return context.navigate;
}

export function useParams(_options?: unknown) {
  const context = useContext(RouterContext);
  if (!context) throw new Error('useParams must be used within RouterProvider');
  return context.params;
}
