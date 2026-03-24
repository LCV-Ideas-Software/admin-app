import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Activity, AlertTriangle, AlignCenter, AlignJustify, AlignLeft, AlignRight,
  Bold, CheckSquare, Code, FilePlus2, Globe, GripVertical,
  Heading1, Heading2, Highlighter, Italic, List, ListOrdered,
  Loader2, Minus, Palette, Pencil, Pin, Quote, RefreshCw,
  Save, Search, Strikethrough, Trash2, Type,
  Underline as UnderlineIcon, WrapText, X,
  Link as LinkIcon, Unlink,
  Subscript as SubIcon, Superscript as SuperIcon,
  Table as TableIcon,
  Upload, Image as ImageIcon, Youtube, ZoomIn, ZoomOut, MessageSquare,
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
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
import Image from '@tiptap/extension-image'
import YoutubeExtension from '@tiptap/extension-youtube'
import { Markdown } from 'tiptap-markdown'
import { useNotification } from '../../components/Notification'

// ── Media utilities (ported from mainsite-admin EditorPanel.jsx) ──

/** Detects Google Drive share links and converts to direct embed URL */
const formatImageUrl = (url: string): string => {
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
  if (driveMatch) return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`
  return url
}

/** Clamp a numeric value between min and max */
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

/** Predefined snap widths for images (percentage) */
const IMAGE_SNAPS = [
  { label: '25%', value: 25 },
  { label: '50%', value: 50 },
  { label: '75%', value: 75 },
  { label: '100%', value: 100 },
]

/** Predefined snap sizes for YouTube embeds (width px) */
const VIDEO_SNAPS = [
  { label: '480p', width: 640, height: 360 },
  { label: '720p', width: 840, height: 472 },
  { label: '1080p', width: 1200, height: 675 },
]

/** TipTap Image extension with width attribute for resizing */
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: '100%', parseHTML: (el) => el.getAttribute('width') || el.style.width || '100%', renderHTML: (attrs) => ({ width: attrs.width, style: `width: ${attrs.width}` }) },
    }
  },
})

/** TipTap YouTube extension (already supports width/height via extension config) */
const ResizableYoutube = YoutubeExtension.configure({
  width: 840, height: 472, allowFullscreen: true, nocookie: true,
})

// ── TipTap extensions ─────────────────────────────────────────
const TIPTAP_EXTENSIONS = [
  StarterKit.configure({ dropcursor: false, link: false }),
  Markdown,
  Underline,
  Highlight,
  Subscript,
  Superscript,
  TextStyle,
  Color,
  FontFamily,
  Typography,
  TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'justify' }),
  Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
  TaskList, TaskItem.configure({ nested: true }),
  Dropcursor.configure({ color: '#3b82f6', width: 2 }),
  CharacterCount,
  Placeholder.configure({ placeholder: 'Comece a escrever o conteúdo do post...' }),
  LinkExtension.configure({ openOnClick: false, autolink: true, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
  ResizableImage,
  ResizableYoutube,
]

// ── Prompt modal state type ───────────────────────────────────
type PromptModalState = {
  show: boolean
  title: string
  placeholder: string
  value: string
  callback: ((url: string, text: string, caption: string) => void) | null
  isLink: boolean
  linkText: string
  showCaption: boolean
  caption: string
}

const PROMPT_MODAL_INITIAL: PromptModalState = {
  show: false, title: '', placeholder: 'https://...', value: '',
  callback: null, isLink: false, linkText: '', showCaption: false, caption: '',
}

type OverviewPayload = {
  ok: boolean
  error?: string
  fonte: 'bigdata_db'
  filtros: {
    limit: number
  }
  avisos: string[]
  resumo: {
    totalPosts: number
    totalPinned: number
    totalFinancialLogs: number | null
    totalApprovedFinancialLogs: number | null
  }
  ultimosPosts: Array<{
    id: number
    title: string
    createdAt: string
    isPinned: boolean
  }>
}

type ManagedPost = {
  id: number
  title: string
  content: string
  created_at: string
  is_pinned: number | boolean
  display_order?: number
}

type ConfirmDeleteState = {
  show: boolean
  id: number | null
  title: string
}

type DisclaimerItem = {
  id: string
  title: string
  text: string
  buttonText: string
  isDonationTrigger: boolean
}

type DisclaimersSettings = {
  enabled: boolean
  items: DisclaimerItem[]
}

const DEFAULT_DISCLAIMERS: DisclaimersSettings = { enabled: true, items: [] }

const initialPayload: OverviewPayload = {
  ok: true,
  fonte: 'bigdata_db',
  filtros: { limit: 20 },
  avisos: [],
  resumo: {
    totalPosts: 0,
    totalPinned: 0,
    totalFinancialLogs: null,
    totalApprovedFinancialLogs: null,
  },
  ultimosPosts: [],
}


export function MainsiteModule() {
  const { showNotification } = useNotification()
  const withTrace = (message: string, payload?: { request_id?: string }) => (
    payload?.request_id ? `${message} (req ${payload.request_id})` : message
  )
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [savingPost, setSavingPost] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [actionPostId, setActionPostId] = useState<number | null>(null)
  const [limit, setLimit] = useState('20')
  const [adminActor] = useState('admin@app.lcv')
  const [payload, setPayload] = useState<OverviewPayload>(initialPayload)
  const [managedPosts, setManagedPosts] = useState<ManagedPost[]>([])
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  const [postTitle, setPostTitle] = useState('')
  // Structured settings state — only disclaimers (appearance+rotation moved to ConfigModule)
  const [disclaimers, setDisclaimers] = useState<DisclaimersSettings>(DEFAULT_DISCLAIMERS)
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>({ show: false, id: null, title: '' })
  const [draggedPostIndex, setDraggedPostIndex] = useState<number | null>(null)
  const [promptModal, setPromptModal] = useState<PromptModalState>(PROMPT_MODAL_INITIAL)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // TipTap editor instance
  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    content: '',
  })

  // ── Media handler functions (ported from reference) ─────────

  /** Insert a styled caption paragraph after the current cursor position */
  const insertCaptionBlock = useCallback((caption: string) => {
    if (!editor) return
    const safe = (caption || '').trim()
    if (!safe) return
    editor.chain().focus().insertContent({
      type: 'paragraph',
      attrs: { textAlign: 'center' },
      content: [{ type: 'text', text: safe, marks: [{ type: 'italic' }] }],
    }).run()
  }, [editor])

  /** Upload file to R2 via admin-app upload endpoint */
  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return
    const file = event.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    showNotification('Enviando arquivo para o Cloudflare R2...', 'info')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/mainsite/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Falha na consolidação do arquivo.')
      const data = await res.json() as { url: string }
      editor.chain().focus().setImage({ src: data.url }).run()
      // Apply width attribute after insertion
      editor.chain().focus().updateAttributes('image', { width: '100%' }).run()
      showNotification('Upload concluído com sucesso.', 'success')
      setPromptModal({
        ...PROMPT_MODAL_INITIAL,
        show: true,
        title: 'Legenda da imagem (opcional):',
        placeholder: 'Ex.: Foto tirada em março de 2026',
        callback: (captionText) => insertCaptionBlock(captionText),
      })
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro no upload.', 'error')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [editor, showNotification, insertCaptionBlock])

  /** Insert image from URL (supports Google Drive auto-detect) */
  const addImageUrl = useCallback(() => {
    if (!editor) return
    setPromptModal({
      ...PROMPT_MODAL_INITIAL,
      show: true,
      title: 'URL da Imagem (Drive/Externa):',
      showCaption: true,
      callback: (url, _text, caption) => {
        if (!url) return
        editor.chain().focus().setImage({ src: formatImageUrl(url) }).run()
        editor.chain().focus().updateAttributes('image', { width: '100%' }).run()
        insertCaptionBlock(caption)
      },
    })
  }, [editor, insertCaptionBlock])

  /** Insert YouTube video */
  const addYoutube = useCallback(() => {
    if (!editor) return
    setPromptModal({
      ...PROMPT_MODAL_INITIAL,
      show: true,
      title: 'URL do vídeo (YouTube):',
      showCaption: true,
      callback: (url, _text, caption) => {
        if (!url) return
        editor.chain().focus().setYoutubeVideo({ src: url, width: 840, height: 472 }).run()
        insertCaptionBlock(caption)
      },
    })
  }, [editor, insertCaptionBlock])

  /** Insert hyperlink */
  const addLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href || ''
    setPromptModal({
      ...PROMPT_MODAL_INITIAL,
      show: true,
      title: 'Inserir Link de Hipertexto:',
      value: prev as string,
      isLink: true,
      callback: (url, text) => {
        if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
        if (editor.state.selection.empty && text) {
          editor.chain().focus().insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`).run()
        } else {
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
        }
      },
    })
  }, [editor])

  /** Adjust media size (image ±10%, video ±80px width maintaining 16:9) */
  const adjustSelectedMediaSize = useCallback((direction: 1 | -1) => {
    if (!editor) return
    if (editor.isActive('image')) {
      const attrs = editor.getAttributes('image')
      const current = Number(String(attrs.width || '100').replace('%', '')) || 100
      const next = clamp(current + (direction * 10), 20, 100)
      editor.chain().focus().updateAttributes('image', { width: `${next}%` }).run()
      showNotification(`Imagem redimensionada para ${next}%`, 'success')
      return
    }
    if (editor.isActive('youtube')) {
      const attrs = editor.getAttributes('youtube')
      const currentW = Number(attrs.width) || 840
      const nextW = clamp(currentW + (direction * 80), 320, 1200)
      const nextH = Math.round((nextW * 9) / 16)
      editor.chain().focus().updateAttributes('youtube', { width: nextW, height: nextH }).run()
      showNotification(`Vídeo redimensionado para ${nextW}x${nextH}`, 'success')
      return
    }
    showNotification('Selecione uma imagem ou vídeo para redimensionar.', 'info')
  }, [editor, showNotification])

  /** Add or edit caption on media */
  const editCaption = useCallback(() => {
    if (!editor) return
    const isImg = editor.isActive('image')
    const isVid = editor.isActive('youtube')
    if (!isImg && !isVid) {
      showNotification('Selecione uma imagem ou vídeo para adicionar/editar a legenda.', 'info')
      return
    }
    const { selection, doc } = editor.state
    const nodeSize = (selection as unknown as { node?: { nodeSize: number } }).node?.nodeSize || 1
    const nodeEnd = selection.from + nodeSize
    // Detect existing caption immediately after media
    let existingCaption = ''
    let captionFrom: number | null = null
    let captionTo: number | null = null
    const nextNode = doc.nodeAt(nodeEnd)
    if (nextNode && nextNode.type.name === 'paragraph' && nextNode.attrs?.textAlign === 'center' && nextNode.textContent) {
      let hasItalic = false
      nextNode.forEach(child => {
        if (child.isText && child.marks.some(m => m.type.name === 'italic')) hasItalic = true
      })
      if (hasItalic) {
        existingCaption = nextNode.textContent
        captionFrom = nodeEnd
        captionTo = nodeEnd + nextNode.nodeSize
      }
    }
    setPromptModal({
      ...PROMPT_MODAL_INITIAL,
      show: true,
      title: existingCaption ? 'Editar legenda da mídia:' : 'Adicionar legenda à mídia:',
      placeholder: 'Texto da legenda...',
      value: existingCaption,
      callback: (text) => {
        const trimmed = (text || '').trim()
        if (captionFrom !== null && captionTo !== null) {
          const tr = editor.state.tr.delete(captionFrom, captionTo)
          editor.view.dispatch(tr)
          if (trimmed) {
            editor.commands.insertContentAt(captionFrom, {
              type: 'paragraph',
              attrs: { textAlign: 'center' },
              content: [{ type: 'text', text: trimmed, marks: [{ type: 'italic' }] }],
            })
          }
        } else if (trimmed) {
          editor.commands.setTextSelection(nodeEnd)
          insertCaptionBlock(trimmed)
        }
      },
    })
  }, [editor, showNotification, insertCaptionBlock])

  const disabled = useMemo(() => overviewLoading, [overviewLoading])

  const loadOverview = useCallback(async (shouldNotify = false) => {
    const query = new URLSearchParams({ limit })

    setOverviewLoading(true)
    try {
      const response = await fetch(`/api/mainsite/overview?${query.toString()}`)
      const nextPayload = await response.json() as OverviewPayload

      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao consultar o módulo MainSite.')
      }

      setPayload(nextPayload)

      if (shouldNotify) {
        showNotification(`MainSite atualizado: ${nextPayload.resumo.totalPosts} post(s) no recorte.`, 'success')
      }

      if (Array.isArray(nextPayload.avisos) && nextPayload.avisos.length > 0) {
        showNotification(nextPayload.avisos[0], 'info')
      }
    } catch {
      showNotification('Não foi possível carregar o módulo MainSite.', 'error')
    } finally {
      setOverviewLoading(false)
    }
  }, [limit, showNotification])

  const loadManagedPosts = useCallback(async (shouldNotify = false) => {
    setPostsLoading(true)
    try {
      const response = await fetch('/api/mainsite/posts', {
        headers: {
          'X-Admin-Actor': adminActor,
        },
      })
      const nextPayload = await response.json() as { ok: boolean; error?: string; posts?: ManagedPost[] }

      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao listar posts do MainSite.')
      }

      setManagedPosts(Array.isArray(nextPayload.posts) ? nextPayload.posts : [])

      if (shouldNotify) {
        showNotification('Lista de posts do MainSite atualizada.', 'success')
      }
    } catch {
      showNotification('Não foi possível listar os posts do MainSite.', 'error')
    } finally {
      setPostsLoading(false)
    }
  }, [adminActor, showNotification])

  const loadPublicSettings = useCallback(async (shouldNotify = false) => {
    setSettingsLoading(true)
    try {
      const response = await fetch('/api/mainsite/settings', {
        headers: { 'X-Admin-Actor': adminActor },
      })
      const nextPayload = await response.json() as { ok: boolean; error?: string; settings?: Record<string, unknown> }

      if (!response.ok || !nextPayload.ok || !nextPayload.settings) {
        throw new Error(nextPayload.error ?? 'Falha ao carregar disclaimers do MainSite.')
      }

      setDisclaimers(nextPayload.settings.disclaimers as DisclaimersSettings ?? DEFAULT_DISCLAIMERS)

      if (shouldNotify) {
        showNotification('Disclaimers do MainSite recarregados.', 'success')
      }
    } catch {
      showNotification('Não foi possível carregar disclaimers do MainSite.', 'error')
    } finally {
      setSettingsLoading(false)
    }
  }, [adminActor, showNotification])

  useEffect(() => {
    void loadManagedPosts()
    void loadPublicSettings()
  }, [loadManagedPosts, loadPublicSettings])

  const resetPostEditor = () => {
    setEditingPostId(null)
    setPostTitle('')
    editor?.commands.clearContent()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    await loadOverview(true)
  }

  const handleEditPost = async (id: number) => {
    setActionPostId(id)
    try {
      const response = await fetch(`/api/mainsite/posts?id=${id}`, {
        headers: {
          'X-Admin-Actor': adminActor,
        },
      })
      const nextPayload = await response.json() as { ok: boolean; error?: string; post?: ManagedPost }

      if (!response.ok || !nextPayload.ok || !nextPayload.post) {
        throw new Error(nextPayload.error ?? 'Falha ao carregar o post para edição.')
      }

      setEditingPostId(nextPayload.post.id)
      setPostTitle(nextPayload.post.title)
      editor?.commands.setContent(nextPayload.post.content)
      showNotification(`Post #${nextPayload.post.id} carregado para edição.`, 'info')
    } catch {
      showNotification('Não foi possível carregar o post selecionado.', 'error')
    } finally {
      setActionPostId(null)
    }
  }

  const handleSavePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const title = postTitle.trim()
    const content = editor?.getHTML()?.trim() ?? ''

    if (!title || !content || content === '<p></p>') {
      showNotification('Título e conteúdo são obrigatórios para salvar o post.', 'error')
      return
    }

    setSavingPost(true)
    try {
      const isEditing = editingPostId !== null
      const response = await fetch('/api/mainsite/posts', {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({
          id: editingPostId,
          title,
          content,
          adminActor,
        }),
      })

      const nextPayload = await response.json() as { ok: boolean; error?: string; request_id?: string }

      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao salvar o post do MainSite.')
      }

      resetPostEditor()
      await Promise.all([loadManagedPosts(), loadOverview()])
      showNotification(withTrace(isEditing ? 'Post do MainSite atualizado com sucesso.' : 'Post do MainSite criado com sucesso.', nextPayload), 'success')
    } catch {
      showNotification('Não foi possível salvar o post do MainSite.', 'error')
    } finally {
      setSavingPost(false)
    }
  }

  const requestDeletePost = (id: number, title: string) => {
    setConfirmDelete({ show: true, id, title })
  }

  const executeDeletePost = async () => {
    const { id } = confirmDelete
    setConfirmDelete({ show: false, id: null, title: '' })
    if (!id) return

    setActionPostId(id)
    try {
      const response = await fetch('/api/mainsite/posts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({ id, adminActor }),
      })

      const nextPayload = await response.json() as { ok: boolean; error?: string; request_id?: string }
      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao excluir o post do MainSite.')
      }

      if (editingPostId === id) {
        resetPostEditor()
      }
      if (selectedPostId === id) {
        setSelectedPostId(null)
      }

      await Promise.all([loadManagedPosts(), loadOverview()])
      showNotification(withTrace('Post do MainSite excluído com sucesso.', nextPayload), 'success')
    } catch {
      showNotification('Não foi possível excluir o post do MainSite.', 'error')
    } finally {
      setActionPostId(null)
    }
  }

  // ── DnD reorder ─────────────────────────────────────────────
  const handlePostDragStart = (index: number) => setDraggedPostIndex(index)
  const handlePostDragEnd = () => setDraggedPostIndex(null)

  const handlePostDrop = async (dropIndex: number) => {
    if (draggedPostIndex === null || draggedPostIndex === dropIndex) return
    const next = [...managedPosts]
    const [dragged] = next.splice(draggedPostIndex, 1)
    next.splice(dropIndex, 0, dragged)
    setManagedPosts(next)
    setDraggedPostIndex(null)

    try {
      const items = next.map((post, idx) => ({ id: post.id, display_order: idx }))
      const response = await fetch('/api/mainsite/posts-reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': adminActor },
        body: JSON.stringify({ items, adminActor }),
      })
      const result = await response.json() as { ok: boolean; error?: string }
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'Falha ao reordenar posts.')
      showNotification('Ordem dos posts sincronizada.', 'success')
    } catch {
      showNotification('Erro ao reordenar posts.', 'error')
      void loadManagedPosts()
    }
  }

  const handleTogglePin = async (id: number) => {
    setActionPostId(id)
    try {
      const response = await fetch('/api/mainsite/posts-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({ id, adminActor }),
      })

      const nextPayload = await response.json() as { ok: boolean; error?: string; isPinned?: boolean; request_id?: string }
      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao alternar fixação do post do MainSite.')
      }

      await Promise.all([loadManagedPosts(), loadOverview()])
      showNotification(withTrace(nextPayload.isPinned ? 'Post fixado com sucesso.' : 'Post desafixado com sucesso.', nextPayload), 'success')
    } catch {
      showNotification('Não foi possível alternar a fixação do post.', 'error')
    } finally {
      setActionPostId(null)
    }
  }

  // Merge-save: fetch current settings to preserve appearance+rotation (managed by ConfigModule)
  const handleSaveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingSettings(true)
    try {
      // 1. Fetch current full settings to preserve appearance + rotation
      const currentRes = await fetch('/api/mainsite/settings', {
        headers: { 'X-Admin-Actor': adminActor },
      })
      const currentPayload = await currentRes.json() as { ok: boolean; settings?: Record<string, unknown> }
      const currentAppearance = currentPayload.settings?.appearance ?? {}
      const currentRotation = currentPayload.settings?.rotation ?? {}

      // 2. Merge: preserve appearance + rotation, update disclaimers
      const response = await fetch('/api/mainsite/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': adminActor },
        body: JSON.stringify({
          appearance: currentAppearance,
          rotation: currentRotation,
          disclaimers,
          adminActor,
        }),
      })

      const nextPayload = await response.json() as { ok: boolean; error?: string; request_id?: string }
      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao salvar disclaimers do MainSite.')
      }

      await loadPublicSettings()
      showNotification(withTrace('Disclaimers do MainSite salvos com sucesso.', nextPayload), 'success')
    } catch {
      showNotification('Não foi possível salvar disclaimers do MainSite.', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <section className="detail-panel module-shell module-shell-mainsite">
      <div className="detail-header">
        <div className="detail-icon"><Globe size={22} /></div>
        <div>
          <h3>MainSite Admin — Sistema, Auditoria e Financeiro</h3>
          <p>Operação interna no shell unificado: leitura e escrita diretas em `bigdata_db`.</p>
        </div>
      </div>

      {/* ── Diálogo de confirmação ────────────────────── */}
      {confirmDelete.show && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label="Confirmar exclusão">
          <div className="confirm-dialog">
            <div className="confirm-dialog__icon">
              <AlertTriangle size={28} />
            </div>
            <h4>Excluir post</h4>
            <p>Deseja apagar permanentemente o post &ldquo;{confirmDelete.title}&rdquo;?</p>
            <div className="confirm-dialog__actions">
              <button type="button" className="ghost-button" onClick={() => setConfirmDelete({ show: false, id: null, title: '' })}>Cancelar</button>
              <button type="button" className="primary-button danger" onClick={() => void executeDeletePost()}>Apagar</button>
            </div>
          </div>
        </div>
      )}

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="overview-inline-form">
          <div className="field-group field-group--fixed-120">
            <label htmlFor="mainsite-filtro-limit">Qtd. posts</label>
            <input
              id="mainsite-filtro-limit"
              name="mainsiteFiltroLimit"
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
          </div>
          <button type="submit" className="primary-button button--align-end" disabled={disabled}>
            {overviewLoading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
            Carregar overview
          </button>
        </div>
      </form>


      <article className="result-card">
        <header className="result-header">
          <h4><Activity size={16} /> Últimos posts</h4>
          <span className="source-badge">{payload.fonte}</span>
        </header>

        {payload.ultimosPosts.length === 0 ? (
          <p className="result-empty">Sem posts para os filtros atuais.</p>
        ) : (
          <ul className="result-list astro-akashico-scroll">
            {payload.ultimosPosts.map((post) => (
              <li key={post.id}>
                <strong>{post.title}</strong>
                <span>{new Date(post.createdAt).toLocaleString('pt-BR')}</span>
                <span className={`badge ${post.isPinned ? 'badge-em-implantacao' : 'badge-planejado'}`}>
                  {post.isPinned ? 'fixado' : 'normal'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <form className="form-card" onSubmit={handleSavePost}>
        <div className="result-toolbar">
          <div>
            <h4>{editingPostId ? `Editar post #${editingPostId}` : 'Novo post (NOVO)'}</h4>
            <p className="field-hint">Cria e altera posts diretamente no `bigdata_db` com persistência imediata.</p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={resetPostEditor} disabled={savingPost}>
              <X size={16} />
              Limpar
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="mainsite-post-title">Título do post</label>
            <input
              id="mainsite-post-title"
              name="mainsitePostTitle"
              value={postTitle}
              onChange={(event) => setPostTitle(event.target.value)}
              disabled={savingPost}
            />
          </div>
          <div className="field-group">
            <label htmlFor="mainsite-post-mode">Modo atual</label>
            <input
              id="mainsite-post-mode"
              name="mainsitePostMode"
              value={editingPostId ? `Editando #${editingPostId}` : 'Criando novo post'}
              readOnly
            />
          </div>
        </div>

        {/* ── TipTap Editor ────────────────────────────────────────────── */}
        <div className="tiptap-container">
          {editor && (
            <div className="tiptap-toolbar">
              {/* Universal prompt modal (link / image URL / youtube / caption) */}
              {promptModal.show && (
                <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label="Entrada de dados">
                  <div className="confirm-dialog">
                    <h4>{promptModal.title}</h4>
                    <div className="field-group">
                      <label htmlFor="tiptap-prompt-url">{promptModal.isLink ? 'URL' : 'Valor'}</label>
                      <input id="tiptap-prompt-url" name="tiptapPromptUrl" value={promptModal.value} onChange={(e) => setPromptModal({ ...promptModal, value: e.target.value })} placeholder={promptModal.placeholder} />
                    </div>
                    {promptModal.isLink && editor?.state.selection.empty && (
                      <div className="field-group">
                        <label htmlFor="tiptap-prompt-text">Texto</label>
                        <input id="tiptap-prompt-text" name="tiptapPromptText" value={promptModal.linkText} onChange={(e) => setPromptModal({ ...promptModal, linkText: e.target.value })} placeholder="Texto de exibição" />
                      </div>
                    )}
                    {promptModal.showCaption && (
                      <div className="field-group">
                        <label htmlFor="tiptap-prompt-caption">Legenda (opcional)</label>
                        <input id="tiptap-prompt-caption" name="tiptapPromptCaption" value={promptModal.caption} onChange={(e) => setPromptModal({ ...promptModal, caption: e.target.value })} placeholder="Ex.: Foto de março de 2026" />
                      </div>
                    )}
                    <div className="confirm-dialog__actions">
                      <button type="button" className="ghost-button" onClick={() => setPromptModal(PROMPT_MODAL_INITIAL)}>Cancelar</button>
                      <button type="button" className="primary-button" onClick={() => {
                        promptModal.callback?.(promptModal.value.trim(), promptModal.linkText.trim(), promptModal.caption.trim())
                        setPromptModal(PROMPT_MODAL_INITIAL)
                      }}>Inserir</button>
                    </div>
                  </div>
                </div>
              )}

              <button type="button" title="Negrito" className={editor.isActive('bold') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></button>
              <button type="button" title="Itálico" className={editor.isActive('italic') ? 'active' : ''} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></button>
              <button type="button" title="Sublinhado" className={editor.isActive('underline') ? 'active' : ''} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></button>
              <button type="button" title="Tachado" className={editor.isActive('strike') ? 'active' : ''} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></button>
              <button type="button" title="Marca-texto" className={editor.isActive('highlight') ? 'active' : ''} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter size={15} /></button>
              <span className="tiptap-divider" />
              <button type="button" title="Subscrito" className={editor.isActive('subscript') ? 'active' : ''} onClick={() => editor.chain().focus().toggleSubscript().run()}><SubIcon size={15} /></button>
              <button type="button" title="Sobrescrito" className={editor.isActive('superscript') ? 'active' : ''} onClick={() => editor.chain().focus().toggleSuperscript().run()}><SuperIcon size={15} /></button>
              <button type="button" title="Bloco de código" className={editor.isActive('codeBlock') ? 'active' : ''} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code size={15} /></button>
              <button type="button" title="Citação" className={editor.isActive('blockquote') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></button>
              <span className="tiptap-divider" />
              <button type="button" title="Esquerda" className={editor.isActive({ textAlign: 'left' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={15} /></button>
              <button type="button" title="Centro" className={editor.isActive({ textAlign: 'center' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={15} /></button>
              <button type="button" title="Direita" className={editor.isActive({ textAlign: 'right' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={15} /></button>
              <button type="button" title="Justificar" className={editor.isActive({ textAlign: 'justify' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify size={15} /></button>
              <span className="tiptap-divider" />
              <button type="button" title="Título 1" className={editor.isActive('heading', { level: 1 }) ? 'active' : ''} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={15} /></button>
              <button type="button" title="Título 2" className={editor.isActive('heading', { level: 2 }) ? 'active' : ''} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></button>
              <button type="button" title="Marcadores" className={editor.isActive('bulletList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></button>
              <button type="button" title="Numeração" className={editor.isActive('orderedList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></button>
              <button type="button" title="Tarefas" className={editor.isActive('taskList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleTaskList().run()}><CheckSquare size={15} /></button>
              <button type="button" title="Linha" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={15} /></button>
              <button type="button" title="Tabela" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon size={15} /></button>
              <button type="button" title="Quebra" onClick={() => editor.chain().focus().setHardBreak().run()}><WrapText size={15} /></button>
              <span className="tiptap-divider" />
              <button type="button" title="Link" className={editor.isActive('link') ? 'active' : ''} onClick={addLink}><LinkIcon size={15} /></button>
              <button type="button" title="Remover Link" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} className={!editor.isActive('link') ? 'disabled' : ''}><Unlink size={15} /></button>
              <span className="tiptap-divider" />
              {/* ── Media toolbar (ported from reference) ── */}
              <input id="tiptap-file-upload" ref={fileInputRef} name="tiptapFileUpload" type="file" accept="image/*" title="Upload de imagem" className="tiptap-hidden-input" onChange={handleImageUpload} />
              <button type="button" title="Upload de imagem (R2)" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>{isUploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}</button>
              <button type="button" title="Imagem por URL / Google Drive" onClick={addImageUrl}><ImageIcon size={15} /></button>
              <button type="button" title="Vídeo do YouTube" onClick={addYoutube}><Youtube size={15} /></button>
              <button type="button" title="Reduzir mídia" onClick={() => adjustSelectedMediaSize(-1)} disabled={!editor.isActive('image') && !editor.isActive('youtube')}><ZoomOut size={15} /></button>
              <button type="button" title="Ampliar mídia" onClick={() => adjustSelectedMediaSize(1)} disabled={!editor.isActive('image') && !editor.isActive('youtube')}><ZoomIn size={15} /></button>
              <button type="button" title="Legenda da mídia" onClick={editCaption} disabled={!editor.isActive('image') && !editor.isActive('youtube')}><MessageSquare size={15} /></button>
              {/* Snap bars for images */}
              {editor.isActive('image') && (
                <div className="tiptap-snap-group">
                  {IMAGE_SNAPS.map((snap) => (
                    <button key={snap.label} type="button" title={snap.label} className="snap-btn" onClick={() => editor.chain().focus().updateAttributes('image', { width: `${snap.value}%` }).run()}>{snap.label}</button>
                  ))}
                </div>
              )}
              {/* Snap bars for YouTube */}
              {editor.isActive('youtube') && (
                <div className="tiptap-snap-group">
                  {VIDEO_SNAPS.map((snap) => (
                    <button key={snap.label} type="button" title={snap.label} className="snap-btn" onClick={() => editor.chain().focus().updateAttributes('youtube', { width: snap.width, height: snap.height }).run()}>{snap.label}</button>
                  ))}
                </div>
              )}
              <div className="tiptap-color-group">
                <Palette size={14} />
                <input id="tiptap-text-color" name="tiptapTextColor" type="color" title="Cor do texto" onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()} value={(editor.getAttributes('textStyle').color as string) || '#000000'} />
              </div>
              <div className="tiptap-select-group">
                <Type size={14} />
                <select id="tiptap-font-family" name="tiptapFontFamily" title="Família da fonte" onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()} value={(editor.getAttributes('textStyle').fontFamily as string) || 'inherit'}>
                  <option value="inherit">Padrão</option>
                  <option value="monospace">Monospace</option>
                  <option value="Arial">Arial</option>
                  <option value="'Times New Roman', Times, serif">Times</option>
                </select>
              </div>
            </div>
          )}
          <EditorContent editor={editor} className="tiptap-editor" />
          {editor && (
            <div className="tiptap-status-bar">
              {editor.storage.characterCount.characters()} caracteres &middot; {editor.storage.characterCount.words()} palavras
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={savingPost}>
            {savingPost ? <Loader2 size={18} className="spin" /> : editingPostId ? <Save size={18} /> : <FilePlus2 size={18} />}
            {editingPostId ? 'Salvar alterações' : 'Criar post'}
          </button>
        </div>
      </form>

      <article className="result-card">
        <div className="result-toolbar">
          <div>
            <h4><Globe size={16} /> Arquivo de posts operacionais</h4>
            <p className="field-hint">Lista operacional do `bigdata_db` para edição, fixação e exclusão sem sair do cockpit.</p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void loadManagedPosts(true)} disabled={postsLoading}>
              {postsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Recarregar lista
            </button>
            <button type="button" className="ghost-button" onClick={resetPostEditor} disabled={savingPost}>
              <Pencil size={16} />
              Novo rascunho
            </button>
          </div>
        </div>

        {managedPosts.length === 0 ? (
          <p className="result-empty">Nenhum post encontrado no `bigdata_db`.</p>
        ) : (
          <ul className="result-list astro-akashico-scroll">
            {managedPosts.map((post, index) => {
              const isPinned = Number(post.is_pinned) === 1 || post.is_pinned === true
              const isBusy = actionPostId === post.id
              const isSelected = selectedPostId === post.id
              return (
                <li
                  key={post.id}
                  className={`post-row post-draggable${draggedPostIndex === index ? ' post-draggable--dragging' : ''}${isSelected ? ' post-row--selected' : ''}`}
                  draggable
                  onDragStart={() => handlePostDragStart(index)}
                  onDragEnd={handlePostDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => void handlePostDrop(index)}
                >
                  <div className="post-row-main">
                    <div className="flex-row-center">
                      <GripVertical size={14} className="grip-icon" />
                      <strong>{post.title}</strong>
                    </div>
                    <p className="field-hint">{post.content.length > 220 ? `${post.content.slice(0, 220)}…` : post.content}</p>
                    <div className="post-row-meta">
                      <span>ID #{post.id}</span>
                      <span>{new Date(post.created_at).toLocaleString('pt-BR')}</span>
                      <span className={`badge ${isPinned ? 'badge-em-implantacao' : 'badge-planejado'}`}>
                        {isPinned ? 'fixado' : 'normal'}
                      </span>
                    </div>
                  </div>

                  <div className="post-row-actions">
                    <button type="button" className="ghost-button" onClick={() => { setSelectedPostId(post.id); void handleEditPost(post.id) }} disabled={isBusy || savingPost}>
                      {isBusy ? <Loader2 size={16} className="spin" /> : <Pencil size={16} />}
                      Editar
                    </button>
                    <button type="button" className="ghost-button" onClick={() => void handleTogglePin(post.id)} disabled={isBusy}>
                      {isBusy ? <Loader2 size={16} className="spin" /> : <Pin size={16} />}
                      {isPinned ? 'Desfixar' : 'Fixar'}
                    </button>
                    <button type="button" className="ghost-button" onClick={() => requestDeletePost(post.id, post.title)} disabled={isBusy}>
                      {isBusy ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                      Excluir
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </article>

      <form className="form-card" onSubmit={handleSaveSettings}>
        <div className="result-toolbar">
          <div>
            <h4><Save size={16} /> Janelas de Aviso (Disclaimers)</h4>
            <p className="field-hint">Gerenciamento de disclaimers do MainSite. Leitura e escrita no `bigdata_db`.</p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void loadPublicSettings(true)} disabled={settingsLoading || savingSettings}>
              {settingsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Recarregar
            </button>
          </div>
        </div>

        {/* ── Disclaimers ─────────────────────────────────── */}
        <fieldset className="settings-fieldset">
          <legend>Janelas de Aviso (Disclaimers)</legend>
          <label className="toggle-row">
            <input id="disclaimers-enabled" name="disclaimersEnabled" type="checkbox" checked={disclaimers.enabled} onChange={(e) => setDisclaimers({ ...disclaimers, enabled: e.target.checked })} />
            Exibir Janelas de Aviso antes da leitura dos fragmentos
          </label>

          {disclaimers.enabled && (
            <div className="disclaimers-list astro-akashico-scroll">
              {disclaimers.items.map((item, idx) => (
                <div key={item.id} className="disclaimer-card">
                  <div className="disclaimer-card__header">
                    <span className="disclaimer-card__index">AVISO {idx + 1}</span>
                    <button type="button" className="ghost-button danger" onClick={() => {
                      const next = [...disclaimers.items]
                      next.splice(idx, 1)
                      setDisclaimers({ ...disclaimers, items: next })
                    }}><Trash2 size={14} /> Remover</button>
                  </div>
                  <div className="form-grid">
                    <div className="field-group">
                      <label htmlFor={`disc-title-${idx}`}>Título</label>
                      <input id={`disc-title-${idx}`} name={`discTitle_${idx}`} placeholder="Ex: Termos de Leitura" value={item.title} onChange={(e) => {
                        const next = [...disclaimers.items]; next[idx] = { ...next[idx], title: e.target.value }; setDisclaimers({ ...disclaimers, items: next })
                      }} />
                    </div>
                    <div className="field-group">
                      <label htmlFor={`disc-btn-${idx}`}>Texto do Botão</label>
                      <input id={`disc-btn-${idx}`} name={`discBtn_${idx}`} placeholder="Concordo" value={item.buttonText} onChange={(e) => {
                        const next = [...disclaimers.items]; next[idx] = { ...next[idx], buttonText: e.target.value }; setDisclaimers({ ...disclaimers, items: next })
                      }} />
                    </div>
                  </div>
                  <div className="field-group">
                    <label htmlFor={`disc-text-${idx}`}>Texto do aviso</label>
                    <textarea id={`disc-text-${idx}`} name={`discText_${idx}`} rows={3} value={item.text} onChange={(e) => {
                      const next = [...disclaimers.items]; next[idx] = { ...next[idx], text: e.target.value }; setDisclaimers({ ...disclaimers, items: next })
                    }} />
                  </div>
                  <label className="toggle-row donation-trigger">
                    <input id={`disc-trigger-${idx}`} name={`discTrigger_${idx}`} type="checkbox" checked={item.isDonationTrigger} onChange={(e) => {
                      const next = [...disclaimers.items]; next[idx] = { ...next[idx], isDonationTrigger: e.target.checked }; setDisclaimers({ ...disclaimers, items: next })
                    }} />
                    Gatilho de Doação
                  </label>
                </div>
              ))}
              <button type="button" className="ghost-button" onClick={() => setDisclaimers({
                ...disclaimers,
                items: [...disclaimers.items, { id: crypto.randomUUID(), title: '', text: '', buttonText: 'Concordo', isDonationTrigger: false }],
              })}>
                <FilePlus2 size={16} /> Adicionar Novo Aviso
              </button>
            </div>
          )}
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={savingSettings}>
            {savingSettings ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            Salvar disclaimers
          </button>
        </div>
      </form>

    </section>
  )
}
