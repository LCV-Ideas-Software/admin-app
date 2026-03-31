import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { Node as ProseMirrorNode } from 'prosemirror-model'

interface DecorationPluginState {
  decorations: DecorationSet
  term: string
  currentIndex: number
}

interface SearchState {
  term: string
  currentIndex: number
}

export const searchHighlightKey = new PluginKey<DecorationPluginState>('searchHighlight')

let globalSearchState: SearchState = { term: '', currentIndex: 0 }

export function setGlobalSearchState(next: SearchState): void {
  globalSearchState = next
}

export function findAllMatches(doc: ProseMirrorNode, term: string): { from: number; to: number }[] {
  if (!term) return []
  const results: { from: number; to: number }[] = []
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(escaped, 'gi')
  doc.descendants((node, pos) => {
    if (!node.isText) return
    const text = node.text || ''
    let m: RegExpExecArray | null
    while ((m = regex.exec(text)) !== null) {
      results.push({ from: pos + m.index, to: pos + m.index + m[0].length })
    }
  })
  return results
}

const SearchHighlightPlugin = new Plugin({
  key: searchHighlightKey,
  state: {
    init(_config, state) {
      if (!globalSearchState.term) {
        return { decorations: DecorationSet.empty, term: '', currentIndex: 0 }
      }
      const matches = findAllMatches(state.doc, globalSearchState.term)
      const decos = matches.map((m, i) =>
        Decoration.inline(m.from, m.to, {
          class: i === globalSearchState.currentIndex
            ? 'search-current-highlight'
            : 'search-highlight',
        })
      )
      return {
        decorations: DecorationSet.create(state.doc, decos),
        term: globalSearchState.term,
        currentIndex: globalSearchState.currentIndex,
      }
    },
    apply(tr, oldPluginState: DecorationPluginState, _oldState, newState) {
      if (!globalSearchState.term) {
        return { decorations: DecorationSet.empty, term: '', currentIndex: 0 }
      }

      if (!tr.docChanged && oldPluginState.term === globalSearchState.term && oldPluginState.currentIndex === globalSearchState.currentIndex) {
        return oldPluginState
      }

      const matches = findAllMatches(newState.doc, globalSearchState.term)
      const decos = matches.map((m, i) =>
        Decoration.inline(m.from, m.to, {
          class: i === globalSearchState.currentIndex
            ? 'search-current-highlight'
            : 'search-highlight',
        })
      )
      return {
        decorations: DecorationSet.create(newState.doc, decos),
        term: globalSearchState.term,
        currentIndex: globalSearchState.currentIndex,
      }
    },
  },
  props: {
    decorations(state) {
      const pluginState = this.getState(state)
      return pluginState?.decorations ?? DecorationSet.empty
    },
  },
})

export const SearchReplaceExtension = Extension.create({
  name: 'searchReplace',

  addProseMirrorPlugins() {
    return [SearchHighlightPlugin]
  },

  addKeyboardShortcuts() {
    const resolveOwnerDoc = () => {
      try {
        return this.editor.view.dom.ownerDocument
      } catch {
        return null
      }
    }

    return {
      'Mod-f': () => {
        const ownerDoc = resolveOwnerDoc()
        if (!ownerDoc) return false
        ownerDoc.dispatchEvent(new CustomEvent('tiptap:search-toggle', { bubbles: true }))
        return true
      },
      'Mod-h': () => {
        const ownerDoc = resolveOwnerDoc()
        if (!ownerDoc) return false
        ownerDoc.dispatchEvent(new CustomEvent('tiptap:search-toggle', { bubbles: true }))
        return true
      },
    }
  },
})
