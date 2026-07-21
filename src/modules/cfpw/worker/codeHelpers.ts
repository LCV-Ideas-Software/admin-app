/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros do editor de código (PW-1): detecção de módulos sujos
 * (rascunho difere do conteúdo carregado), guarda de navegação e montagem dos
 * módulos do PUT (só texto — o motor rejeita módulos binários e o PUT de
 * content substitui o script inteiro).
 */

import type { WorkerCodeModule } from '../types';

export const UNSAVED_CHANGES_MESSAGE = 'Há alterações não salvas no código. Descartar e continuar?';

/** Nomes dos módulos cujo rascunho difere do conteúdo original. */
export const dirtyModuleNames = (modules: WorkerCodeModule[], drafts: Record<string, string>): string[] =>
  modules
    .filter((module) => {
      const draft = drafts[module.name];
      return draft !== undefined && draft !== module.content;
    })
    .map((module) => module.name);

export const hasBinaryModules = (modules: WorkerCodeModule[]): boolean => modules.some((module) => module.binary);

/**
 * Módulos de texto do PUT com os rascunhos aplicados. Módulos binários ficam
 * de fora (o motor os rejeita) — por isso o salvamento é bloqueado na UI
 * quando o worker possui módulos binários.
 */
export const buildCodeSaveModules = (
  modules: WorkerCodeModule[],
  drafts: Record<string, string>,
): Array<{ name: string; content: string }> =>
  modules
    .filter((module) => !module.binary)
    .map((module) => ({ name: module.name, content: drafts[module.name] ?? module.content }));
