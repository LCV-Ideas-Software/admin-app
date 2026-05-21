/**
 * SlashCommands.ts — Slash-command popup for quick block insertion
 * Triggered by typing '/' at the start of an empty text block.
 * Uses vanilla-DOM popup (same pattern as Mention) — no extra deps.
 */

import type { Editor } from '@tiptap/core';
import { Extension } from '@tiptap/core';

export const TIPTAP_SLASH_EVENTS = {
  figure: 'tiptap:slash-figure',
  upload: 'tiptap:slash-upload',
  youtube: 'tiptap:slash-youtube',
  ai: 'tiptap:slash-ai',
} as const;

interface SlashCommand {
  label: string;
  description: string;
  icon: string;
  keywords: string[];
  command: (editor: Editor) => void;
}

interface SlashStorage {
  cleanup: (() => void) | null;
  triggerPos: number;
  isActive: boolean;
  handleSelectionUpdate: (() => void) | null;
}

const createSlashCommands = (ownerDoc: Document): SlashCommand[] => [
  {
    label: 'Parágrafo',
    description: 'Texto simples',
    icon: '¶',
    keywords: ['parágrafo', 'texto', 'p', 'paragraph', 'text'],
    command: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    label: 'Título 1',
    description: 'Cabeçalho grande',
    icon: 'H1',
    keywords: ['h1', 'título', 'title', 'heading 1', 'cabeçalho'],
    command: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: 'Título 2',
    description: 'Cabeçalho médio',
    icon: 'H2',
    keywords: ['h2', 'título', 'heading 2', 'cabeçalho'],
    command: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: 'Título 3',
    description: 'Cabeçalho pequeno',
    icon: 'H3',
    keywords: ['h3', 'título', 'heading 3', 'cabeçalho'],
    command: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: 'Lista com marcadores',
    description: 'Lista não ordenada',
    icon: '•',
    keywords: ['lista', 'bullet', 'ul', 'marcadores'],
    command: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    label: 'Lista numerada',
    description: 'Lista ordenada',
    icon: '1.',
    keywords: ['numerada', 'ordered', 'ol', 'numeração'],
    command: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    label: 'Lista de tarefas',
    description: 'Checklist interativo',
    icon: '☑',
    keywords: ['tarefas', 'checklist', 'todo', 'task'],
    command: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    label: 'Citação',
    description: 'Bloco de citação',
    icon: '"',
    keywords: ['citação', 'blockquote', 'quote', 'aspas'],
    command: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    label: 'Bloco de código',
    description: 'Código com syntax highlight',
    icon: '</>',
    keywords: ['código', 'code', 'pre', 'programação'],
    command: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: 'Linha horizontal',
    description: 'Separador de seções',
    icon: '—',
    keywords: ['linha', 'hr', 'separador', 'divider', 'horizontal'],
    command: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    label: 'Tabela',
    description: 'Tabela 3×3',
    icon: '⊞',
    keywords: ['tabela', 'table', 'grid'],
    command: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    label: 'Imagem com legenda',
    description: 'Figura semântica com figcaption',
    icon: '🖼',
    keywords: ['imagem', 'figura', 'legenda', 'image', 'figure', 'figcaption'],
    command: () => ownerDoc.dispatchEvent(new CustomEvent(TIPTAP_SLASH_EVENTS.figure, { bubbles: true })),
  },
  {
    label: 'Upload de imagem',
    description: 'Enviar imagem do computador',
    icon: '⤴',
    keywords: ['upload', 'arquivo', 'imagem', 'file', 'enviar'],
    command: () => ownerDoc.dispatchEvent(new CustomEvent(TIPTAP_SLASH_EVENTS.upload, { bubbles: true })),
  },
  {
    label: 'Vídeo do YouTube',
    description: 'Inserir vídeo com proporção 16:9',
    icon: 'YT',
    keywords: ['youtube', 'video', 'vídeo', 'yt'],
    command: () => ownerDoc.dispatchEvent(new CustomEvent(TIPTAP_SLASH_EVENTS.youtube, { bubbles: true })),
  },
  {
    label: 'IA: Instrução Livre',
    description: 'Abrir comando livre do Gemini',
    icon: '✦',
    keywords: ['ia', 'gemini', 'assistente', 'ai'],
    command: () => ownerDoc.dispatchEvent(new CustomEvent(TIPTAP_SLASH_EVENTS.ai, { bubbles: true })),
  },
];

/**
 * Creates a vanilla-DOM slash-command popup anchored to the editor view.
 */
function createSlashPopup(editor: Editor, query: string, triggerPos: number): (() => void) | null {
  let ownerDoc: Document;
  let coords: { top: number; bottom: number; left: number };
  try {
    ownerDoc = editor.view.dom.ownerDocument;
    coords = editor.view.coordsAtPos(triggerPos);
  } catch {
    return null;
  }
  const popupWin = ownerDoc.defaultView;
  const commands = createSlashCommands(ownerDoc);

  const filtered = commands.filter((cmd) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.includes(q))
    );
  });

  if (filtered.length === 0) return null;

  const menu = ownerDoc.createElement('div');
  menu.className = 'slash-commands-menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', 'Comandos');
  Object.assign(menu.style, {
    position: 'fixed',
    zIndex: '999999',
    maxHeight: '320px',
    overflowY: 'auto',
  });

  const menuW = 320;
  const vpW = popupWin?.innerWidth || 1280;
  const vpH = popupWin?.innerHeight || 720;
  let top = coords.bottom + 4;
  let left = coords.left;
  if (left + menuW > vpW - 8) left = vpW - menuW - 8;
  if (left < 8) left = 8;
  if (top > vpH - 80) top = Math.max(8, coords.top - 300);
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;

  let selectedIndex = 0;

  const renderItems = () => {
    menu.innerHTML = '';
    filtered.forEach((cmd, i) => {
      const item = ownerDoc.createElement('div');
      item.className = `slash-commands-item${i === selectedIndex ? ' is-selected' : ''}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(i === selectedIndex));
      item.innerHTML = `
        <span class="slash-cmd-icon">${cmd.icon}</span>
        <span class="slash-cmd-text">
          <span class="slash-cmd-label">${cmd.label}</span>
          <span class="slash-cmd-desc">${cmd.description}</span>
        </span>
      `;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectCommand(i);
      });
      menu.appendChild(item);
    });
    // Scroll selected into view
    const selectedEl = menu.querySelector('.is-selected') as HTMLElement | null;
    selectedEl?.scrollIntoView({ block: 'nearest' });
  };

  const selectCommand = (index: number) => {
    // Delete the '/' + query
    const { from } = editor.state.selection;
    editor.chain().deleteRange({ from: triggerPos, to: from }).run();
    filtered[index]?.command(editor);
    cleanup();
  };

  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      selectedIndex = (selectedIndex + 1) % filtered.length;
      renderItems();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      selectedIndex = (selectedIndex - 1 + filtered.length) % filtered.length;
      renderItems();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      selectCommand(selectedIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cleanup();
    }
  };

  const cleanup = () => {
    menu.remove();
    ownerDoc.removeEventListener('keydown', keyHandler, true);
  };

  renderItems();
  ownerDoc.body.appendChild(menu);
  ownerDoc.addEventListener('keydown', keyHandler, true);

  return cleanup;
}

/**
 * SlashCommands TipTap Extension.
 * Intercepts '/' on an empty text block and shows the command popup.
 */
export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addStorage() {
    return {
      cleanup: null,
      triggerPos: -1,
      isActive: false,
      handleSelectionUpdate: null,
    } as SlashStorage;
  },

  onCreate() {
    const storage = this.storage as SlashStorage;
    storage.handleSelectionUpdate = () => {
      if (!storage.isActive) return;
      const { empty } = this.editor.state.selection;
      if (!empty) {
        storage.cleanup?.();
        storage.cleanup = null;
        storage.isActive = false;
        return;
      }
      const $from = this.editor.state.selection.$from;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      if (!textBefore.startsWith('/')) {
        storage.cleanup?.();
        storage.cleanup = null;
        storage.isActive = false;
        return;
      }
      const query = textBefore.slice(1);
      storage.cleanup?.();
      storage.cleanup = createSlashPopup(this.editor, query, storage.triggerPos);
    };

    this.editor.on('selectionUpdate', storage.handleSelectionUpdate);
    this.editor.on('update', storage.handleSelectionUpdate);
  },

  onDestroy() {
    const storage = this.storage as SlashStorage;
    if (storage.handleSelectionUpdate) {
      this.editor.off('selectionUpdate', storage.handleSelectionUpdate);
      this.editor.off('update', storage.handleSelectionUpdate);
    }
    storage.cleanup?.();
    storage.cleanup = null;
    storage.handleSelectionUpdate = null;
    storage.isActive = false;
  },

  addKeyboardShortcuts() {
    const storage = this.storage as SlashStorage;

    return {
      '/': () => {
        const { empty, $from } = this.editor.state.selection;
        if (!empty) return false;
        const isEmptyBlock = $from.parent.textContent === '' && $from.parent.type.isTextblock;
        if (!isEmptyBlock) return false;
        storage.isActive = true;
        storage.triggerPos = this.editor.state.selection.from;
        // Let the character be inserted first, then show popup
        setTimeout(() => {
          storage.cleanup?.();
          storage.cleanup = createSlashPopup(this.editor, '', storage.triggerPos);
        }, 0);
        return false; // don't prevent default — let '/' be typed
      },
    };
  },
});
