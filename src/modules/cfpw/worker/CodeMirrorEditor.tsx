/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Wrapper mínimo do CodeMirror 6 (PW-1). Default export para React.lazy —
 * este arquivo puxa `codemirror`/`@codemirror/lang-javascript` e por isso
 * DEVE ficar em chunk separado (import dinâmico no CodeEditorPanel).
 * O documento inicial vem de `value`; o pai remonta por `key` ao trocar de
 * módulo, então o efeito roda uma única vez por montagem.
 */

import { javascript } from '@codemirror/lang-javascript';
import { basicSetup, EditorView } from 'codemirror';
import { useEffect, useRef } from 'react';

type CodeMirrorEditorProps = {
  value: string;
  onChange: (next: string) => void;
};

// Tema mínimo dark-friendly via CSS vars (fallbacks claros).
const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--cfpw-code-bg, #ffffff)',
    color: 'var(--cfpw-code-fg, #202124)',
    fontSize: '13px',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    caretColor: 'var(--cfpw-code-caret, #1a73e8)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--cfpw-code-gutter-bg, #f8f9fa)',
    color: 'var(--cfpw-code-gutter-fg, #80868b)',
    border: 'none',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--cfpw-code-selection, rgba(26, 115, 232, 0.18))',
  },
});

export default function CodeMirrorEditor({ value, onChange }: CodeMirrorEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  const initialDocRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const view = new EditorView({
      doc: initialDocRef.current,
      parent: host,
      extensions: [
        basicSetup,
        javascript(),
        editorTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    return () => view.destroy();
  }, []);

  return <div ref={hostRef} className="cfpw-code-editor" />;
}
