/**
 * PostEditor — TipTap rich-text editor sub-component.
 *
 * Extracted from MainsiteModule to enable code-splitting.
 * This component is lazy-loaded via React.lazy only when the user
 * clicks "Novo Post" or edits an existing post.
 *
 * All TipTap dependencies (24 extensions, ~450kB) are isolated in
 * this chunk, keeping the core MainsiteModule lightweight.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight,
  Bold, CheckSquare, Code, FilePlus2,
  Heading1, Heading2, Highlighter, Italic, List, ListOrdered,
  Loader2, Minus, Palette, Quote, Save, Strikethrough, Type,
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

// ── Media utilities ──────────────────────────────────────────

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

/** TipTap YouTube extension */
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

// ── Component props ───────────────────────────────────────────
export type PostEditorProps = {
  editingPostId: number | null
  initialTitle: string
  initialContent: string
  savingPost: boolean
  adminActor: string
  showNotification: (msg: string, type: 'info' | 'success' | 'error') => void
  onSave: (title: string, htmlContent: string) => void
  onClose: () => void
}

// ── PostEditor component ──────────────────────────────────────
export default function PostEditor({
  editingPostId, initialTitle, initialContent,
  savingPost, showNotification,
  onSave, onClose,
}: PostEditorProps) {
  const [postTitle, setPostTitle] = useState(initialTitle)
  const [promptModal, setPromptModal] = useState<PromptModalState>(PROMPT_MODAL_INITIAL)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    content: initialContent || '',
  })

  // Sync initial content when editing a different post
  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent)
    }
  }, [editor, initialContent])

  // Sync initial title
  useEffect(() => {
    setPostTitle(initialTitle)
  }, [initialTitle])

  // ── Media handler functions ─────────────────────────────────

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

  // ── Form submission ─────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const title = postTitle.trim()
    const content = editor?.getHTML()?.trim() ?? ''
    if (!title || !content || content === '<p></p>') {
      showNotification('Título e conteúdo são obrigatórios para salvar o post.', 'error')
      return
    }
    onSave(title, content)
  }

  const handleClear = () => {
    setPostTitle('')
    editor?.commands.clearContent()
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="result-toolbar">
        <div>
          <h4>{editingPostId ? `Editar post #${editingPostId}` : 'Novo post (NOVO)'}</h4>
          <p className="field-hint">Cria e altera posts diretamente no `bigdata_db` com persistência imediata.</p>
        </div>
        <div className="inline-actions">
          <button type="button" className="ghost-button" onClick={handleClear} disabled={savingPost}>
            <X size={16} />
            Limpar
          </button>
          <button type="button" className="ghost-button" onClick={onClose} disabled={savingPost}>
            <X size={16} />
            Fechar
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
            {/* ── Media toolbar ── */}
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
  )
}
