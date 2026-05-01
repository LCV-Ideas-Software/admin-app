/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useEffect } from 'react';

/**
 * v02.00.00 / admin-app audit closure (MEDIUM): centralized ESC-key handler
 * for custom (non-Radix) dialogs. Radix `Dialog.Root` already handles ESC
 * natively; this hook covers modals built directly with `createPortal` —
 * notably `PromptModal` in the PostEditor toolbar, which previously could
 * only be dismissed via the Close button or Submit (WCAG 2.1 AA expects
 * ESC dismissal on dialogs).
 *
 * Mirrors the hook shipped in `mainsite-frontend/src/hooks/useEscapeKey.ts`.
 * Each consumer calls with `enabled` tied to the modal's visibility flag so
 * the listener auto-detaches when the modal closes.
 */
export function useEscapeKey(onEscape: () => void, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        onEscape();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEscape, enabled]);
}
