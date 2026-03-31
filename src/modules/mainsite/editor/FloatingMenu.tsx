/**
 * FloatingMenu.tsx — Contextual insertion toolbar on empty blocks
 * Extracted from PostEditor.tsx for structural decomposition.
 * Features: drag-and-drop, viewport clamping, shows on empty text blocks.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import {
  Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare,
  Quote, Code2, Minus, Table,
} from 'lucide-react'
import type { useEditor } from '@tiptap/react'

interface EditorFloatingMenuProps {
  editor: ReturnType<typeof useEditor>
  onInsertTable: () => void
}

export function EditorFloatingMenu({ editor, onInsertTable }: EditorFloatingMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [autoPos, setAutoPos] = useState<{ top: number; left: number } | null>(null)
  const [dragPos, setDragPos] = useState<{ top: number; left: number } | null>(null)
  const dragRef = useRef({ active: false, offsetX: 0, offsetY: 0 })
  const scrollRef = useRef(false)

  const getPopupWindow = useCallback(() => {
    try {
      return editor?.view?.dom?.ownerDocument?.defaultView || null
    } catch {
      return null
    }
  }, [editor])

  const getPortalTarget = useCallback(() => {
    try {
      return editor?.view?.dom?.ownerDocument?.body || document.body
    } catch {
      return document.body
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return

    const update = () => {
      if (scrollRef.current) { setAutoPos(null); return }
      const { empty, $from } = editor.state.selection
      if (!empty) { setAutoPos(null); return }
      const isEmptyBlock = $from.parent.textContent === '' && $from.parent.type.isTextblock
      if (!isEmptyBlock) { setAutoPos(null); return }
      try {
        const ownerDoc = editor.view.dom.ownerDocument
        const popupWin = ownerDoc.defaultView
        const pos = editor.view.coordsAtPos($from.pos)
        const menuH = 44, menuW = 460
        const vpW = popupWin?.innerWidth || 800
        const vpH = popupWin?.innerHeight || 600
        let top = pos.top - menuH / 2 + (pos.bottom - pos.top) / 2
        let left = pos.left + 32
        if (left + menuW > vpW - 4) left = pos.left - menuW - 8
        left = Math.max(4, Math.min(left, vpW - menuW - 4))
        top = Math.max(4, Math.min(top, vpH - menuH - 4))
        setAutoPos({ top, left })
        setDragPos(null)
      } catch { setAutoPos(null) }
    }

    const popupWin = getPopupWindow()
    const handleScroll = () => { scrollRef.current = true; setAutoPos(null) }
    const handleScrollEnd = () => { scrollRef.current = false; update() }
    popupWin?.addEventListener('scroll', handleScroll, true)
    popupWin?.addEventListener('scrollend', handleScrollEnd, true)
    editor.on('selectionUpdate', update)
    editor.on('blur', () => { setAutoPos(null); setDragPos(null) })
    return () => {
      editor.off('selectionUpdate', update)
      popupWin?.removeEventListener('scroll', handleScroll, true)
      popupWin?.removeEventListener('scrollend', handleScrollEnd, true)
    }
  }, [editor, getPopupWindow])

  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    const menuEl = ref.current
    if (!menuEl) return
    const rect = menuEl.getBoundingClientRect()
    dragRef.current = { active: true, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top }
    menuEl.classList.add('dragging')
    const ownerDoc = menuEl.ownerDocument
    const popupWin = ownerDoc.defaultView
    const menuW = rect.width, menuH = rect.height
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current.active) return
      const vpW = popupWin?.innerWidth || 800
      const vpH = popupWin?.innerHeight || 600
      let nx = ev.clientX - dragRef.current.offsetX
      let ny = ev.clientY - dragRef.current.offsetY
      nx = Math.max(0, Math.min(nx, vpW - menuW))
      ny = Math.max(0, Math.min(ny, vpH - menuH))
      setDragPos({ top: ny, left: nx })
    }
    const onUp = () => {
      dragRef.current.active = false
      menuEl.classList.remove('dragging')
      ownerDoc.removeEventListener('mousemove', onMove)
      ownerDoc.removeEventListener('mouseup', onUp)
    }
    ownerDoc.addEventListener('mousemove', onMove)
    ownerDoc.addEventListener('mouseup', onUp)
  }

  if (!autoPos || !editor) return null
  const pos = dragPos || autoPos
  const portalTarget = getPortalTarget()

  const btn = (title: string, active: boolean, onClick: () => void, Icon: React.ElementType) => (
    <button
      key={title}
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={active ? 'is-active' : ''}
      title={title}
    >
      <Icon size={14} />
    </button>
  )

  return ReactDOM.createPortal(
    <div
      ref={ref}
      className="floating-menu"
      onMouseDown={startDrag}
      style={{ position: 'fixed', top: `${pos.top}px`, left: `${pos.left}px`, zIndex: 99998, cursor: 'grab' }}
    >
      {btn('Título 1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), Heading1)}
      {btn('Título 2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), Heading2)}
      {btn('Título 3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), Heading3)}
      <span className="bubble-divider" />
      {btn('Lista com marcadores', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), List)}
      {btn('Lista numerada', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), ListOrdered)}
      {btn('Lista de tarefas', editor.isActive('taskList'), () => editor.chain().focus().toggleTaskList().run(), CheckSquare)}
      <span className="bubble-divider" />
      {btn('Citação', editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), Quote)}
      {btn('Bloco de código', editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), Code2)}
      {btn('Linha horizontal', false, () => editor.chain().focus().setHorizontalRule().run(), Minus)}
      {btn('Tabela', false, onInsertTable, Table)}
    </div>,
    portalTarget
  )
}
