/**
 * extensions.ts — TipTap extension definitions for PostEditor
 * Extracted from PostEditor.tsx for structural decomposition.
 * Also includes: FigureImageNode (semantic figure/figcaption block).
 */
import { Extension, Node as TiptapNode, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { Plugin, PluginKey } from 'prosemirror-state'
import StarterKit from '@tiptap/starter-kit'
import { Highlight } from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import LinkExtension from '@tiptap/extension-link'
import { Placeholder } from '@tiptap/extension-placeholder'
import { CharacterCount } from '@tiptap/extension-character-count'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { Typography } from '@tiptap/extension-typography'
import { Dropcursor } from '@tiptap/extension-dropcursor'
import Focus from '@tiptap/extension-focus'
import Image from '@tiptap/extension-image'
import Mention from '@tiptap/extension-mention'
import YoutubeExtension from '@tiptap/extension-youtube'
import { Markdown } from 'tiptap-markdown'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { SlashCommands } from './SlashCommands'
import { SearchReplaceExtension } from './searchReplaceCore'
import {
  ResizableImageNodeView,
  ResizableYoutubeNodeView,
  FigureNodeView,
} from './NodeViews'
import { isYoutubeUrl } from './utils'

export const lowlight = createLowlight(common)

// ── Mention base items ────────────────────────────────────────

export const EDITORIAL_MENTION_BASE_ITEMS = [
  'Leonardo Cardozo Vargas',
  'MainSite',
  'LCV',
  'SEO',
  'CTA',
  'Gemini',
  'Cloudflare',
]

// ── Mention suggestion (vanilla-DOM popup, no new deps) ───────

export const createMentionSuggestion = (rawItems: string[]) => ({
  char: '@',
  items: ({ query }: { query: string }) => {
    const normalizedQuery = query.trim().toLowerCase()
    return rawItems
      .filter((item) => item.toLowerCase().includes(normalizedQuery))
      .slice(0, 6)
      .map((item) => ({ id: item, label: item }))
  },
  render: () => {
    let popup: HTMLDivElement | null = null
    let command: ((item: { id: string; label: string }) => void) | null = null
    let itemsState: Array<{ id: string; label: string }> = []
    let selectedIndex = 0

    const mountPopup = (editorElement: HTMLElement) => {
      const ownerDoc = editorElement.ownerDocument
      popup = ownerDoc.createElement('div')
      popup.className = 'tiptap-mention-menu'
      ownerDoc.body.appendChild(popup)
    }

    const updatePosition = (props: { clientRect?: (() => DOMRect | null) | null; editor: { view: { dom: HTMLElement } } }) => {
      const rect = props.clientRect?.()
      if (!rect || !popup) return
      let ownerDoc: Document
      try {
        ownerDoc = props.editor.view.dom.ownerDocument
      } catch {
        return
      }
      const popupWin = ownerDoc.defaultView || window
      const maxLeft = Math.max(8, popupWin.innerWidth - 260)
      const top = Math.min(rect.bottom + 8, popupWin.innerHeight - 120)
      const left = Math.min(rect.left, maxLeft)
      popup.style.top = `${top}px`
      popup.style.left = `${Math.max(8, left)}px`
    }

    const renderList = () => {
      if (!popup) return
      popup.innerHTML = ''
      if (!itemsState.length) {
        const emptyState = popup.ownerDocument.createElement('div')
        emptyState.className = 'tiptap-mention-menu__empty'
        emptyState.textContent = 'Nenhuma menção encontrada'
        popup.appendChild(emptyState)
        return
      }
      itemsState.forEach((item, index) => {
        const button = popup!.ownerDocument.createElement('button')
        button.type = 'button'
        button.className = `tiptap-mention-menu__item${index === selectedIndex ? ' is-selected' : ''}`
        button.textContent = `@${item.label}`
        button.onmousedown = (event) => { event.preventDefault(); command?.(item) }
        popup!.appendChild(button)
      })
    }

    return {
      onStart: (props: { items: Array<{ id: string; label: string }>; command: (item: { id: string; label: string }) => void; editor: { view: { dom: HTMLElement } }; clientRect?: (() => DOMRect | null) | null }) => {
        command = props.command; itemsState = props.items; selectedIndex = 0
        try {
          mountPopup(props.editor.view.dom)
        } catch {
          return
        }
        renderList(); updatePosition(props)
      },
      onUpdate: (props: { items: Array<{ id: string; label: string }>; command: (item: { id: string; label: string }) => void; editor: { view: { dom: HTMLElement } }; clientRect?: (() => DOMRect | null) | null }) => {
        command = props.command; itemsState = props.items
        if (selectedIndex >= itemsState.length) selectedIndex = 0
        renderList(); updatePosition(props)
      },
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (!itemsState.length) return event.key === 'Escape'
        if (event.key === 'ArrowDown') { selectedIndex = (selectedIndex + 1) % itemsState.length; renderList(); return true }
        if (event.key === 'ArrowUp') { selectedIndex = (selectedIndex + itemsState.length - 1) % itemsState.length; renderList(); return true }
        if (event.key === 'Enter') { command?.(itemsState[selectedIndex]); return true }
        if (event.key === 'Escape') { popup?.remove(); popup = null; return true }
        return false
      },
      onExit: () => { popup?.remove(); popup = null },
    }
  },
})

// ── Custom extensions ─────────────────────────────────────────

/** FontSize — stores font-size as inline textStyle attribute */
export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] } },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
          renderHTML: attributes => {
            if (!attributes.fontSize) return {}
            return { style: `font-size: ${attributes.fontSize}` }
          },
        },
      },
    }]
  },
  addCommands() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setFontSize: (fontSize: string) => ({ chain }: any) => chain().setMark('textStyle', { fontSize }).run(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unsetFontSize: () => ({ chain }: any) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  },
})

const INDENT_LEVELS = [0, 1.5, 2.5, 3.5]

/** TextIndent — four indent levels via paragraph/heading attribute */
export const TextIndent = Extension.create({
  name: 'textIndent',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        textIndent: {
          default: 0,
          parseHTML: el => {
            const v = el.style.textIndent
            if (!v) return 0
            const n = parseFloat(v)
            return isNaN(n) ? 0 : n
          },
          renderHTML: attrs => {
            if (!attrs.textIndent) return {}
            return { style: `text-indent: ${attrs.textIndent}rem` }
          },
        },
      },
    }]
  },
  addCommands() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      increaseIndent: () => ({ tr, state, dispatch }: any) => {
        const { from, to } = state.selection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state.doc.nodesBetween(from, to, (node: any, pos: number) => {
          if (!node.type.isTextblock) return
          const current = node.attrs.textIndent || 0
          const idx = INDENT_LEVELS.findIndex(l => l >= current)
          const next = idx < INDENT_LEVELS.length - 1 ? INDENT_LEVELS[idx + 1] : INDENT_LEVELS[INDENT_LEVELS.length - 1]
          if (next !== current && dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, textIndent: next })
        })
        return true
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decreaseIndent: () => ({ tr, state, dispatch }: any) => {
        const { from, to } = state.selection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state.doc.nodesBetween(from, to, (node: any, pos: number) => {
          if (!node.type.isTextblock) return
          const current = node.attrs.textIndent || 0
          const idx = INDENT_LEVELS.findIndex(l => l >= current)
          const next = idx > 0 ? INDENT_LEVELS[idx - 1] : 0
          if (next !== current && dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, textIndent: next })
        })
        return true
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  },
})

// ── Link extension with automatic target="_blank" ─────────────

export const autoTargetBlankPluginKey = new PluginKey('autoTargetBlank')

export const AutoTargetBlankLink = LinkExtension.extend({
  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() ?? []
    return [
      ...parentPlugins,
      new Plugin({
        key: autoTargetBlankPluginKey,
        appendTransaction(_transactions, _oldState, newState) {
          const { tr, doc, schema } = newState
          const linkType = schema.marks.link
          if (!linkType) return null
          let modified = false
          doc.descendants((node, pos) => {
            if (!node.isText) return
            node.marks.forEach((mark) => {
              if (mark.type !== linkType) return
              const href = mark.attrs.href || ''
              if (isYoutubeUrl(href)) return
              if (mark.attrs.target === '_blank') return
              const newMark = linkType.create({
                ...mark.attrs, target: '_blank', rel: 'noopener noreferrer',
              })
              tr.removeMark(pos, pos + node.nodeSize, mark)
              tr.addMark(pos, pos + node.nodeSize, newMark)
              modified = true
            })
          })
          return modified ? tr : null
        },
      }),
    ]
  },
})

// ── CustomResizableImage / CustomResizableYoutube ─────────────

export const CustomResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: (element) => element.getAttribute('data-width') || element.style.width || element.getAttribute('width') || '100%',
        renderHTML: (attributes) => {
          if (!attributes.width) return {}
          const normalized = String(attributes.width).endsWith('%') ? attributes.width : `${attributes.width}`
          return { 'data-width': normalized, style: `width: ${normalized}; height: auto;` }
        },
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView)
  },
})

export const CustomResizableYoutube = YoutubeExtension.extend({
  parseHTML() {
    return [
      {
        tag: 'div[data-youtube-video] iframe',
      },
      {
        tag: 'iframe',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false
          const src = node.getAttribute('src') || ''
          return /(?:youtube\.com|youtu\.be)\//i.test(src) ? null : false
        },
      },
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableYoutubeNodeView)
  },
})

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
    }
  },

  parseHTML() {
    return [{
      tag: 'figure',
      getAttrs(el) {
        const element = el as HTMLElement
        const img = element.querySelector('img')
        const figcap = element.querySelector('figcaption')
        return {
          src: img?.getAttribute('src') || null,
          alt: img?.getAttribute('alt') || '',
          title: img?.getAttribute('title') || '',
          width: img?.style.width || element.style.width || '100%',
          caption: figcap?.textContent || '',
        }
      },
    }]
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, title, width, caption } = HTMLAttributes
    const figureStyle = width && width !== '100%'
      ? `width: ${width}; max-width: 100%`
      : 'max-width: 100%'
    return [
      'figure',
      mergeAttributes({ class: 'tiptap-figure', style: figureStyle }),
      ['img', { src, alt: alt || '', title: title || '', style: 'width: 100%; height: auto; display: block;' }],
      ['figcaption', {}, caption || ''],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureNodeView)
  },

  addCommands() {
    return {
      setFigureImage: (attrs: {
        src: string; alt?: string; title?: string; width?: string; caption?: string
      }) => ({ commands }: { commands: { insertContent: (content: unknown) => boolean } }) => {
        return commands.insertContent({ type: 'figureImage', attrs })
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  },
})

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
  Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
  TaskList, TaskItem.configure({ nested: true }),
  Dropcursor.configure({ color: '#4285f4', width: 2 }),
  CharacterCount,
  Placeholder.configure({ placeholder: 'Comece a escrever o conteúdo do post...' }),
  AutoTargetBlankLink.configure({
    openOnClick: false, autolink: true,
    HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
  }),
  CustomResizableImage.configure({ inline: false }),
  CustomResizableYoutube.configure({ inline: false, width: 840, height: 472, allowFullscreen: true, nocookie: true }),
  FigureImageNode,
  SlashCommands,
  SearchReplaceExtension,
]
