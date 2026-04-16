/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/* eslint-disable react-refresh/only-export-components -- Barrel re-export pattern: re-exports Radix primitives alongside wrapper components. Fast refresh loses granularity here but these files rarely change. */
/**
 * Dialog — Wrapper Radix UI para modais/confirmações.
 *
 * Abstrai @radix-ui/react-dialog com:
 * - Root/Trigger/Portal/Overlay/Content/Title/Description/Close já cabeados.
 * - Sem estilo opinativo: consumidor passa className para integrar com CSS existente.
 * - A11y nativa (ARIA, foco trap, Escape para fechar, restauração de foco no trigger).
 *
 * Uso típico:
 * ```tsx
 * <Dialog open={pending} onOpenChange={setPending}>
 *   <DialogContent className="my-modal">
 *     <DialogTitle>Título</DialogTitle>
 *     <DialogDescription>Texto</DialogDescription>
 *     <button onClick={confirm}>Confirmar</button>
 *     <DialogClose asChild><button>Cancelar</button></DialogClose>
 *   </DialogContent>
 * </Dialog>
 * ```
 */
import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  children: ReactNode;
}

/** Root — controla estado open/close. */
export function Dialog({ open, defaultOpen, onOpenChange, modal = true, children }: DialogProps) {
  return (
    <RadixDialog.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} modal={modal}>
      {children}
    </RadixDialog.Root>
  );
}

/** Trigger — botão que abre o dialog (opcional quando controlado via `open`). */
export const DialogTrigger = RadixDialog.Trigger;

/** Close — botão que fecha o dialog. Use `asChild` para envolver outro elemento. */
export const DialogClose = RadixDialog.Close;

export interface DialogContentProps {
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  /** Previne fechar ao clicar fora. */
  preventOutsideClose?: boolean;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  /** Acessibilidade: obrigatório se não houver <DialogTitle> visível. */
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

/** Content — renderiza overlay + container do dialog via portal. */
export function DialogContent({
  children,
  className,
  overlayClassName,
  preventOutsideClose,
  onEscapeKeyDown,
  ...ariaProps
}: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={overlayClassName} />
      <RadixDialog.Content
        className={className}
        onEscapeKeyDown={onEscapeKeyDown}
        onPointerDownOutside={preventOutsideClose ? (e) => e.preventDefault() : undefined}
        onInteractOutside={preventOutsideClose ? (e) => e.preventDefault() : undefined}
        {...ariaProps}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

/** Title — cabeçalho acessível (lido por screen readers). */
export const DialogTitle = RadixDialog.Title;

/** Description — texto descritivo (aria-describedby automático). */
export const DialogDescription = RadixDialog.Description;
