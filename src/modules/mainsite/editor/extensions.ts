/**
 * extensions.ts — TipTap extension definitions for PostEditor
 * Extracted from PostEditor.tsx for structural decomposition.
 * Also includes: FigureImageNode (semantic figure/figcaption block).
 */

import type { CommandProps } from '@tiptap/core';
import { Extension, mergeAttributes, Node as TiptapNode } from '@tiptap/core';
import { CharacterCount } from '@tiptap/extension-character-count';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Color } from '@tiptap/extension-color';
import { Dropcursor } from '@tiptap/extension-dropcursor';
import Focus from '@tiptap/extension-focus';
import { FontFamily } from '@tiptap/extension-font-family';
import { Highlight } from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Typography } from '@tiptap/extension-typography';
import YoutubeExtension from '@tiptap/extension-youtube';
import { ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Markdown } from 'tiptap-markdown';
import { FigureNodeView, ResizableImageNodeView, ResizableYoutubeNodeView } from './NodeViews';
import { SlashCommands } from './SlashCommands';
import { SearchReplaceExtension } from './searchReplaceCore';
import { isYoutubeUrl } from './utils';

export const lowlight = createLowlight(common);

// ── Mention base items ────────────────────────────────────────

export const EDITORIAL_MENTION_BASE_ITEMS = [
  'Leonardo Cardozo Vargas',
  'MainSite',
  'LCV',
  'SEO',
  'CTA',
  'Gemini',
  'Cloudflare',
];

// ── Mention suggestion (vanilla-DOM popup, no new deps) ───────

export const createMentionSuggestion = (rawItems: string[]) => ({
  char: '@',
  items: ({ query }: { query: string }) => {
    const normalizedQuery = query.trim().toLowerCase();
    return rawItems
      .filter((item) => item.toLowerCase().includes(normalizedQuery))
      .slice(0, 6)
      .map((item) => ({ id: item, label: item }));
  },
  render: () => {
    let popup: HTMLDivElement | null = null;
    let command: ((item: { id: string; label: string }) => void) | null = null;
    let itemsState: Array<{ id: string; label: string }> = [];
    let selectedIndex = 0;

    const mountPopup = (editorElement: HTMLElement) => {
      const ownerDoc = editorElement.ownerDocument;
      popup = ownerDoc.createElement('div');
      popup.className = 'tiptap-mention-menu';
      ownerDoc.body.appendChild(popup);
    };

    const updatePosition = (props: {
      clientRect?: (() => DOMRect | null) | null;
      editor: { view: { dom: HTMLElement } };
    }) => {
      const rect = props.clientRect?.();
      if (!rect || !popup) return;
      let ownerDoc: Document;
      try {
        ownerDoc = props.editor.view.dom.ownerDocument;
      } catch {
        return;
      }
      const popupWin = ownerDoc.defaultView || window;
      const maxLeft = Math.max(8, popupWin.innerWidth - 260);
      const top = Math.min(rect.bottom + 8, popupWin.innerHeight - 120);
      const left = Math.min(rect.left, maxLeft);
      popup.style.top = `${top}px`;
      popup.style.left = `${Math.max(8, left)}px`;
    };

    const renderList = () => {
      if (!popup) return;
      const popupEl = popup;
      popupEl.innerHTML = '';
      if (!itemsState.length) {
        const emptyState = popupEl.ownerDocument.createElement('div');
        emptyState.className = 'tiptap-mention-menu__empty';
        emptyState.textContent = 'Nenhuma menção encontrada';
        popupEl.appendChild(emptyState);
        return;
      }
      itemsState.forEach((item, index) => {
        const button = popupEl.ownerDocument.createElement('button');
        button.type = 'button';
        button.className = `tiptap-mention-menu__item${index === selectedIndex ? ' is-selected' : ''}`;
        button.textContent = `@${item.label}`;
        button.onmousedown = (event) => {
          event.preventDefault();
          command?.(item);
        };
        popupEl.appendChild(button);
      });
    };

    return {
      onStart: (props: {
        items: Array<{ id: string; label: string }>;
        command: (item: { id: string; label: string }) => void;
        editor: { view: { dom: HTMLElement } };
        clientRect?: (() => DOMRect | null) | null;
      }) => {
        command = props.command;
        itemsState = props.items;
        selectedIndex = 0;
        try {
          mountPopup(props.editor.view.dom);
        } catch {
          return;
        }
        renderList();
        updatePosition(props);
      },
      onUpdate: (props: {
        items: Array<{ id: string; label: string }>;
        command: (item: { id: string; label: string }) => void;
        editor: { view: { dom: HTMLElement } };
        clientRect?: (() => DOMRect | null) | null;
      }) => {
        command = props.command;
        itemsState = props.items;
        if (selectedIndex >= itemsState.length) selectedIndex = 0;
        renderList();
        updatePosition(props);
      },
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (!itemsState.length) return event.key === 'Escape';
        if (event.key === 'ArrowDown') {
          selectedIndex = (selectedIndex + 1) % itemsState.length;
          renderList();
          return true;
        }
        if (event.key === 'ArrowUp') {
          selectedIndex = (selectedIndex + itemsState.length - 1) % itemsState.length;
          renderList();
          return true;
        }
        if (event.key === 'Enter') {
          const selected = itemsState[selectedIndex];
          if (selected) command?.(selected);
          return true;
        }
        if (event.key === 'Escape') {
          popup?.remove();
          popup = null;
          return true;
        }
        return false;
      },
      onExit: () => {
        popup?.remove();
        popup = null;
      },
    };
  },
});

// ── Custom extensions ─────────────────────────────────────────

/** FontSize — stores font-size as inline textStyle attribute */
export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});

const INDENT_LEVELS = [0, 1.5, 2.5, 3.5];

/** TextIndent — four indent levels via paragraph/heading attribute.
 * Paragraphs default to 1.5rem (first non-zero level) so new content gets
 * automatic first-line indent without manual increaseIndent. Headings stay at 0
 * because indenting headings is wrong by typographic convention. parseHTML
 * preserves whatever the existing inline style says (legacy roundtrip safe).
 */
export const TextIndent = Extension.create({
  name: 'textIndent',
  addGlobalAttributes() {
    const parseIndent = (el: HTMLElement) => {
      const v = el.style.textIndent;
      if (!v) return null;
      const n = parseFloat(v);
      return Number.isNaN(n) ? null : n;
    };
    const renderIndent = (attrs: { textIndent?: number | null }) => {
      if (!attrs.textIndent) return {};
      return { style: `text-indent: ${attrs.textIndent}rem` };
    };
    return [
      {
        // Paragraphs: bare <p> without inline style picks up the default 1.5
        // on parse, so opening + saving an existing post normalizes it.
        types: ['paragraph'],
        attributes: {
          textIndent: {
            default: 1.5,
            parseHTML: (el) => parseIndent(el),
            renderHTML: renderIndent,
          },
        },
      },
      {
        // Headings stay strict: bare heading = 0 (no auto-indent). User can
        // still increase if needed via toolbar.
        types: ['heading'],
        attributes: {
          textIndent: {
            default: 0,
            parseHTML: (el) => {
              const parsed = parseIndent(el);
              return parsed === null ? 0 : parsed;
            },
            renderHTML: renderIndent,
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      increaseIndent:
        () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ tr, state, dispatch }: any) => {
          const { from, to } = state.selection;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          state.doc.nodesBetween(from, to, (node: any, pos: number) => {
            if (!node.type.isTextblock) return;
            const current = node.attrs.textIndent || 0;
            const idx = INDENT_LEVELS.findIndex((l) => l >= current);
            const next =
              idx < INDENT_LEVELS.length - 1 ? INDENT_LEVELS[idx + 1] : INDENT_LEVELS[INDENT_LEVELS.length - 1];
            if (next !== current && dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, textIndent: next });
          });
          return true;
        },
      decreaseIndent:
        () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ tr, state, dispatch }: any) => {
          const { from, to } = state.selection;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          state.doc.nodesBetween(from, to, (node: any, pos: number) => {
            if (!node.type.isTextblock) return;
            const current = node.attrs.textIndent || 0;
            const idx = INDENT_LEVELS.findIndex((l) => l >= current);
            const next = idx > 0 ? INDENT_LEVELS[idx - 1] : 0;
            if (next !== current && dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, textIndent: next });
          });
          return true;
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});

// ── Link extension with automatic target="_blank" ─────────────

export const autoTargetBlankPluginKey = new PluginKey('autoTargetBlank');

export const AutoTargetBlankLink = LinkExtension.extend({
  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() ?? [];
    return [
      ...parentPlugins,
      new Plugin({
        key: autoTargetBlankPluginKey,
        appendTransaction(_transactions, _oldState, newState) {
          const { tr, doc, schema } = newState;
          const linkType = schema.marks.link;
          if (!linkType) return null;
          let modified = false;
          doc.descendants((node, pos) => {
            if (!node.isText) return;
            node.marks.forEach((mark) => {
              if (mark.type !== linkType) return;
              const href = mark.attrs.href || '';
              if (isYoutubeUrl(href)) return;
              if (mark.attrs.target === '_blank') return;
              const newMark = linkType.create({
                ...mark.attrs,
                target: '_blank',
                rel: 'noopener noreferrer',
              });
              tr.removeMark(pos, pos + node.nodeSize, mark);
              tr.addMark(pos, pos + node.nodeSize, newMark);
              modified = true;
            });
          });
          return modified ? tr : null;
        },
      }),
    ];
  },
});

// ── CustomResizableImage / CustomResizableYoutube ─────────────

export const CustomResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: (element) =>
          element.getAttribute('data-width') || element.style.width || element.getAttribute('width') || '100%',
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          const normalized = String(attributes.width).endsWith('%') ? attributes.width : `${attributes.width}`;
          return { 'data-width': normalized, style: `width: ${normalized}; height: auto;` };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },
});

export const CustomResizableYoutube = YoutubeExtension.extend({
  parseHTML() {
    return [
      {
        tag: 'div[data-youtube-video] iframe',
      },
      {
        tag: 'iframe',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          const src = node.getAttribute('src') || '';
          return /(?:youtube\.com|youtu\.be)\//i.test(src) ? null : false;
        },
      },
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableYoutubeNodeView);
  },
});

// ── FigureImageNode — Semantic <figure> with <figcaption> ─────
//
// Renders as: <figure class="tiptap-figure"><img .../><figcaption>caption</figcaption></figure>
// The caption is stored as a node attribute and is editable inline via FigureNodeView.
// Parses existing <figure> tags on paste/import.

export const FigureImageNode = TiptapNode.create({
  name: 'figureImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      title: { default: '' },
      width: { default: '100%' },
      caption: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        getAttrs(el) {
          const element = el as HTMLElement;
          const img = element.querySelector('img');
          const figcap = element.querySelector('figcaption');
          return {
            src: img?.getAttribute('src') || null,
            alt: img?.getAttribute('alt') || '',
            title: img?.getAttribute('title') || '',
            width: img?.style.width || element.style.width || '100%',
            caption: figcap?.textContent || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, title, width, caption } = HTMLAttributes;
    const figureStyle = width && width !== '100%' ? `width: ${width}; max-width: 100%` : 'max-width: 100%';
    return [
      'figure',
      mergeAttributes({ class: 'tiptap-figure', style: figureStyle }),
      ['img', { src, alt: alt || '', title: title || '', style: 'width: 100%; height: auto; display: block;' }],
      ['figcaption', {}, caption || ''],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureNodeView);
  },

  addCommands() {
    return {
      setFigureImage:
        (attrs: { src: string; alt?: string; title?: string; width?: string; caption?: string }) =>
        ({ commands }: { commands: { insertContent: (content: unknown) => boolean } }) => {
          return commands.insertContent({ type: 'figureImage', attrs });
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});

// ── EditorSpacing — Espaçamento de linhas e parágrafos ─────────
export const EditorSpacing = Extension.create({
  name: 'editorSpacing',
  addOptions() {
    return { types: ['paragraph', 'heading', 'listItem', 'bulletList', 'orderedList'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
          marginTop: {
            default: null,
            parseHTML: (element) => element.style.marginTop || null,
            renderHTML: (attributes) => {
              if (!attributes.marginTop) return {};
              return { style: `margin-top: ${attributes.marginTop}` };
            },
          },
          marginBottom: {
            default: null,
            parseHTML: (element) => element.style.marginBottom || null,
            renderHTML: (attributes) => {
              if (!attributes.marginBottom) return {};
              return { style: `margin-bottom: ${attributes.marginBottom}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ tr, state, dispatch }: CommandProps) => {
          const { selection } = state;
          state.doc.nodesBetween(
            selection.from,
            selection.to,
            (node: { type: { name: string }; attrs: Record<string, unknown> }, pos: number) => {
              if (this.options.types.includes(node.type.name)) {
                if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineHeight });
              }
            },
          );
          return true;
        },
      unsetLineHeight:
        () =>
        ({ tr, state, dispatch }: CommandProps) => {
          const { selection } = state;
          state.doc.nodesBetween(
            selection.from,
            selection.to,
            (node: { type: { name: string }; attrs: Record<string, unknown> }, pos: number) => {
              if (this.options.types.includes(node.type.name)) {
                if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineHeight: null });
              }
            },
          );
          return true;
        },
      setMarginTop:
        (marginTop: string) =>
        ({ tr, state, dispatch }: CommandProps) => {
          const { selection } = state;
          state.doc.nodesBetween(
            selection.from,
            selection.to,
            (node: { type: { name: string }; attrs: Record<string, unknown> }, pos: number) => {
              if (this.options.types.includes(node.type.name)) {
                if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, marginTop });
              }
            },
          );
          return true;
        },
      setMarginBottom:
        (marginBottom: string) =>
        ({ tr, state, dispatch }: CommandProps) => {
          const { selection } = state;
          state.doc.nodesBetween(
            selection.from,
            selection.to,
            (node: { type: { name: string }; attrs: Record<string, unknown> }, pos: number) => {
              if (this.options.types.includes(node.type.name)) {
                if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, marginBottom });
              }
            },
          );
          return true;
        },
    };
  },
});

// ── WordPasteHandler — Higienização do Copy-Paste do Microsoft Word ─────────
export const WordPasteHandler = Extension.create({
  name: 'wordPasteHandler',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('wordPasteHandler'),
        props: {
          transformPastedHTML(html) {
            // Verifica se a marca d'água do Word ou do Office está presente no HTML gerado
            if (!/class="?Mso|xmlns:w="urn:schemas-microsoft-com:office:word"/i.test(html)) {
              return html;
            }

            // 1. Remove os blocos XML ocultos do VML/Office (bloatware cego gerado pelo Word)
            // Parser-based: usa DOMParser para remover comentários e tags <o:p>,
            // evitando classes de incompletude de regex multi-character (CodeQL js/incomplete-multi-character-sanitization).
            const doc = new DOMParser().parseFromString(html, 'text/html');

            // Remove todos os comment nodes
            const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
            const comments: Comment[] = [];
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              comments.push(n as Comment);
            }
            for (const c of comments) c.remove();

            // Remove tags Office <o:p> (qualquer namespace prefix com :)
            for (const el of Array.from(doc.querySelectorAll('*'))) {
              if (el.tagName.includes(':')) el.remove();
            }

            let clean = doc.body.innerHTML;

            // 2. Transforma as declarações do Word de text-align que o Tiptap não assimila inicialmente
            clean = clean.replace(/text-align:\s*start/gi, 'text-align: left');

            // 3. Remove âncoras (bookmarks) fantasmas vazias (<a name="OLE_LINK1"></a>)
            clean = clean.replace(/<a name="[^"]*"><\/a>/gi, '');

            // IMPORTANTE: Deixamos TODOS os spans, text-indent e color passarem integralmente
            // porque eles serão interceptados e digeridos pelas extensões FontFamily, FontSize, Color e EditorSpacing.

            return clean;
          },
        },
      }),
    ];
  },
});

// ── buildTiptapExtensions — full extension list ───────────────

export const buildTiptapExtensions = (mentionItems: string[]) => [
  StarterKit.configure({ dropcursor: false, link: false, codeBlock: false }),
  CodeBlockLowlight.configure({ lowlight }),
  Markdown,
  Highlight,
  Subscript,
  Superscript,
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  TextIndent,
  Typography,
  Focus.configure({ className: 'has-focus', mode: 'all' }),
  Mention.configure({
    HTMLAttributes: { class: 'editor-mention' },
    suggestion: createMentionSuggestion(mentionItems),
    renderText: ({ node, options }) => `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`,
    renderHTML: ({ node, options }) => [
      'span',
      mergeAttributes(options.HTMLAttributes, { class: 'editor-mention' }),
      `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`,
    ],
  }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  TaskList,
  TaskItem.configure({ nested: true }),
  Dropcursor.configure({ color: '#4285f4', width: 2 }),
  CharacterCount,
  Placeholder.configure({ placeholder: 'Comece a escrever o conteúdo do post...' }),
  AutoTargetBlankLink.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
  }),
  CustomResizableImage.configure({ inline: false }),
  CustomResizableYoutube.configure({ inline: false, width: 840, height: 472, allowFullscreen: true, nocookie: true }),
  FigureImageNode,
  SlashCommands,
  SearchReplaceExtension,
  EditorSpacing,
  WordPasteHandler,
];
