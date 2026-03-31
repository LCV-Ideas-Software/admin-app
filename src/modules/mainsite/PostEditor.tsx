import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight,
  Bold, CheckSquare, Code, FilePlus2,
  Heading1, Heading2, Heading3, Highlighter, Italic, List, ListOrdered,
  Loader2, Minus, Palette, Quote, Save, Strikethrough, Type,
  Underline as UnderlineIcon, WrapText, X,
  Link as LinkIcon, Unlink, Indent, Outdent,
  Subscript as SubIcon, Superscript as SuperIcon,
  Table as TableIcon,
  Upload, Image as ImageIcon, ZoomIn, ZoomOut, MessageSquare,
  Sparkles, Wand2, Send, Download,
  Undo2, Redo2, GripVertical
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import { DragHandle } from '@tiptap/extension-drag-handle-react'
import {
  buildTiptapExtensions,
  EDITORIAL_MENTION_BASE_ITEMS,
} from './editor/extensions'
import { clamp, formatImageUrl, isYoutubeUrl, migrateLegacyCaptions } from './editor/utils'
import { TIPTAP_SLASH_EVENTS } from './editor/SlashCommands'
import { SearchReplacePanel } from './editor/SearchReplace'
import { EditorBubbleMenu } from './editor/BubbleMenu'
import { EditorFloatingMenu } from './editor/FloatingMenu'
import {
  PromptModal as EditorPromptModal,
} from './editor/PromptModal'
import {
  type PromptModalState,
  PROMPT_MODAL_INITIAL,
} from './editor/promptModalState'

type SaveFeedback = { message: string; type: 'success' | 'error' } | null

type GeminiImportProgress = {
  active: boolean
  stage: 'idle' | 'validating' | 'requesting' | 'processing' | 'inserting' | 'done' | 'error'
  message: string
  percent: number
}

const GEMINI_IMPORT_IDLE: GeminiImportProgress = {
  active: false,
  stage: 'idle',
  message: '',
  percent: 0,
}

export type PostEditorProps = {
  editingPostId: number | null
  initialTitle: string
  initialAuthor: string
  initialContent: string
  savingPost: boolean
  showNotification: (msg: string, type: 'info' | 'success' | 'error') => void
  onSave: (title: string, author: string, htmlContent: string) => Promise<boolean>
  onClose: () => void
}

export default function PostEditor({
  editingPostId,
  initialTitle,
  initialAuthor,
  initialContent,
  savingPost,
  showNotification,
  onSave,
  onClose,
}: PostEditorProps) {
  const [postTitle, setPostTitle] = useState(initialTitle)
  const [postAuthor, setPostAuthor] = useState(initialAuthor)
  const [promptModal, setPromptModal] = useState<PromptModalState>(PROMPT_MODAL_INITIAL)
  const [isUploading, setIsUploading] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [isImportingGemini, setIsImportingGemini] = useState(false)
  const [geminiImportProgress, setGeminiImportProgress] = useState<GeminiImportProgress>(GEMINI_IMPORT_IDLE)
  const [lastGeminiImportUrl, setLastGeminiImportUrl] = useState('')
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback>(null)
  const saveFeedbackTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [aiChatInput, setAiChatInput] = useState('')
  const aiChatBtnRef = useRef<HTMLButtonElement>(null)
  const migratedInitialContent = useMemo(() => migrateLegacyCaptions(initialContent || ''), [initialContent])

  const mentionItems = useMemo(() => {
    const baseItems = initialAuthor.trim()
      ? [initialAuthor.trim(), ...EDITORIAL_MENTION_BASE_ITEMS]
      : EDITORIAL_MENTION_BASE_ITEMS
    return Array.from(new Set(baseItems))
  }, [initialAuthor])
  const tiptapExtensions = useMemo(() => buildTiptapExtensions(mentionItems), [mentionItems])

  const editor = useEditor({
    extensions: tiptapExtensions,
    content: migratedInitialContent,
  })

  // Force re-render on transaction AND selection change for Word-like dynamic button state
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!editor) return
    const forceUpdate = () => { try { if (editor.view?.dom) setTick(t => t + 1) } catch { /* view not ready */ } }
    editor.on('transaction', forceUpdate)
    editor.on('selectionUpdate', forceUpdate)
    return () => { editor.off('transaction', forceUpdate); editor.off('selectionUpdate', forceUpdate) }
  }, [editor])

  // Sync initial content when editing a different post
  useEffect(() => {
    if (editor && migratedInitialContent) {
      editor.commands.setContent(migratedInitialContent)
    }
  }, [editor, migratedInitialContent])

  // Sync initial title
  useEffect(() => {
    setPostTitle(initialTitle)
  }, [initialTitle])

  useEffect(() => {
    setPostAuthor(initialAuthor)
  }, [initialAuthor])

  const handleAIFreeform = async () => {
    if (!editor) return
    const instruction = aiChatInput.trim()
    if (!instruction) return
    const { from, to, empty } = editor.state.selection
    const text = empty ? editor.getHTML() : editor.state.doc.textBetween(from, to, ' ')
    if (!text) { showNotification('O editor está vazio.', 'error'); return }
    setIsGeneratingAI(true)
    setAiChatOpen(false)
    showNotification('Gemini está processando sua instrução...', 'info')
    try {
      const res = await fetch('/api/mainsite/ai/transform', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'freeform', text, instruction })
      })
      const data = await res.json() as { text?: string; error?: string }
      if (!res.ok) throw new Error(data.error || 'Erro na geração por IA.')
      if (data.text) {
        if (empty) editor.commands.setContent(data.text)
        else editor.chain().focus().deleteSelection().insertContent(data.text).run()
      }
      showNotification('Instrução aplicada com sucesso.', 'success')
      setAiChatInput('')
    } catch (err) { showNotification(err instanceof Error ? err.message : 'Erro desconhecido na IA.', 'error') }
    finally { setIsGeneratingAI(false) }
  }

  const handleAITransform = async (action: string) => {
    if (!editor) return

    const { from, to, empty } = editor.state.selection
    if (empty) {
      showNotification("Por favor, selecione um trecho de texto no editor para aplicar a IA.", "error")
      return
    }

    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    setIsGeneratingAI(true)
    showNotification("Processando transformação textual no Gemini...", "info")

    try {
      const res = await fetch(`/api/mainsite/ai/transform`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, text: selectedText })
      })
      const data = await res.json() as { text?: string; error?: string }
      if (!res.ok) throw new Error(data.error || "Erro na geração por IA.")

      if (data.text) {
        editor.chain().focus().deleteSelection().insertContent(data.text).run()
      }
      showNotification("Transformação aplicada com sucesso.", "success")
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Erro desconhecido na IA.", "error")
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // ── Media handler functions ─────────────────────────────────

  const insertCaptionBlock = useCallback((caption: string) => {
    const safeCaption = (caption || '').trim()
    if (!safeCaption || !editor) return
    // Resolve a posição imediatamente após o nó selecionado (imagem/vídeo)
    // para evitar que insertContent substitua o nó selecionado
    const { to } = editor.state.selection
    editor.chain().focus().insertContentAt(to, {
      type: 'paragraph',
      attrs: { textAlign: 'center' },
      content: [{ type: 'text', text: safeCaption, marks: [{ type: 'italic' }] }],
    }).run()
  }, [editor])

  const openPromptModal = useCallback((nextState: Partial<PromptModalState>) => {
    setPromptModal({
      ...PROMPT_MODAL_INITIAL,
      ...nextState,
      show: true,
    })
  }, [])

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return
    const file = event.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    showNotification('Enviando arquivo...', 'info')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/mainsite/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Falha na consolidação do arquivo.')
      const data = await res.json() as { url: string }
      showNotification('Upload concluído com sucesso.', 'success')
      openPromptModal({
        title: 'Finalizar inserção da imagem:',
        submitLabel: 'Inserir imagem',
        primaryLabel: 'URL',
        placeholder: data.url,
        value: data.url,
        showAltText: true,
        showTitleText: true,
        showCaption: true,
        callback: ({ value, altText, titleText, caption }) => {
          const imageUrl = formatImageUrl(value || data.url)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          editor.chain().focus().setImage({ src: imageUrl, alt: altText.trim(), title: titleText.trim(), width: '100%' } as any).run()
          insertCaptionBlock(caption)
        },
      })
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro no upload.', 'error')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [editor, showNotification, insertCaptionBlock, openPromptModal])

  const addImageUrl = useCallback(() => {
    if (!editor) return
    openPromptModal({
      title: 'URL da Imagem (Drive/Externa):',
      submitLabel: 'Inserir imagem',
      primaryLabel: 'URL da imagem',
      showCaption: true,
      showAltText: true,
      showTitleText: true,
      callback: ({ value, caption, altText, titleText }) => {
        if (!value) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.chain().focus().setImage({ src: formatImageUrl(value), alt: altText.trim(), title: titleText.trim(), width: '100%' } as any).run()
        insertCaptionBlock(caption)
      },
    })
  }, [editor, insertCaptionBlock, openPromptModal])

  const addFigureImage = useCallback(() => {
    if (!editor) return
    openPromptModal({
      title: 'Figura semântica com legenda:',
      submitLabel: 'Inserir figura',
      primaryLabel: 'URL da imagem',
      showCaption: true,
      showAltText: true,
      showTitleText: true,
      callback: ({ value, caption, altText, titleText }) => {
        const src = formatImageUrl(value)
        if (!src) return
        const commands = editor.commands as unknown as {
          setFigureImage?: (attrs: { src: string; alt?: string; title?: string; caption?: string; width?: string }) => boolean
        }
        if (commands.setFigureImage) {
          commands.setFigureImage({
            src,
            alt: altText.trim(),
            title: titleText.trim(),
            caption: caption.trim(),
            width: '100%',
          })
          return
        }
        // Fallback for legacy extension stack
        editor.chain().focus().setImage({ src, alt: altText.trim(), title: titleText.trim(), width: '100%' } as unknown as { src: string; alt?: string; title?: string; width?: number }).run()
        insertCaptionBlock(caption)
      },
    })
  }, [editor, insertCaptionBlock, openPromptModal])

  const addYoutube = useCallback(() => {
    if (!editor) return
    openPromptModal({
      title: 'Código ou URL do vídeo (YouTube):',
      submitLabel: 'Inserir vídeo',
      primaryLabel: 'URL ou código',
      placeholder: 'Ex.: dQw4w9WgXcQ ou https://youtube.com/watch?v=...',
      showCaption: true,
      callback: ({ value, caption }) => {
        if (!value) return
        // Aceita código puro (sem barras nem protocolo) e converte para URL completa
        const isPlainCode = /^[\w-]+$/.test(value.trim())
        const src = isPlainCode ? `https://www.youtube.com/watch?v=${value.trim()}` : value.trim()
        editor.chain().focus().setYoutubeVideo({ src, width: 840, height: 472 }).run()
        insertCaptionBlock(caption)
      },
    })
  }, [editor, insertCaptionBlock, openPromptModal])

  const addLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href || ''
    openPromptModal({
      title: 'Inserir Link de Hipertexto:',
      submitLabel: 'Aplicar link',
      primaryLabel: 'URL',
      value: prev as string,
      isLink: true,
      showLinkText: editor.state.selection.empty,
      callback: ({ value, linkText }) => {
        const url = value.trim()
        const text = linkText.trim()
        if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
        const linkAttrs = isYoutubeUrl(url)
          ? { href: url }
          : { href: url, target: '_blank' as const, rel: 'noopener noreferrer' }
        if (editor.state.selection.empty && text) {
          editor.chain().focus().insertContent(`<a href="${url}"${isYoutubeUrl(url) ? '' : ' target="_blank" rel="noopener noreferrer"'}>${text}</a>`).run()
        } else {
          editor.chain().focus().extendMarkRange('link').setLink(linkAttrs).run()
        }
      },
    })
  }, [editor, openPromptModal])

  useEffect(() => {
    if (!editor) return
    let ownerDoc: Document
    try {
      ownerDoc = editor.view.dom.ownerDocument
    } catch {
      ownerDoc = document
    }

    const onFigure = () => addFigureImage()
    const onUpload = () => fileInputRef.current?.click()
    const onYoutube = () => addYoutube()
    const onAi = () => setAiChatOpen(true)

    ownerDoc.addEventListener(TIPTAP_SLASH_EVENTS.figure, onFigure)
    ownerDoc.addEventListener(TIPTAP_SLASH_EVENTS.upload, onUpload)
    ownerDoc.addEventListener(TIPTAP_SLASH_EVENTS.youtube, onYoutube)
    ownerDoc.addEventListener(TIPTAP_SLASH_EVENTS.ai, onAi)

    return () => {
      ownerDoc.removeEventListener(TIPTAP_SLASH_EVENTS.figure, onFigure)
      ownerDoc.removeEventListener(TIPTAP_SLASH_EVENTS.upload, onUpload)
      ownerDoc.removeEventListener(TIPTAP_SLASH_EVENTS.youtube, onYoutube)
      ownerDoc.removeEventListener(TIPTAP_SLASH_EVENTS.ai, onAi)
    }
  }, [editor, addFigureImage, addYoutube])

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
    openPromptModal({
      title: existingCaption ? 'Editar legenda da mídia:' : 'Adicionar legenda à mídia:',
      submitLabel: 'Salvar legenda',
      primaryLabel: 'Legenda',
      placeholder: 'Texto da legenda...',
      value: existingCaption,
      callback: ({ value }) => {
        const trimmed = (value || '').trim()
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
          editor!.commands.setTextSelection(nodeEnd)
          insertCaptionBlock(trimmed)
        }
      },
    })
  }, [editor, showNotification, insertCaptionBlock, openPromptModal])

  // ── Local feedback helper (visible in popup window) ─────────
  const flashFeedback = useCallback((message: string, type: 'success' | 'error') => {
    if (saveFeedbackTimer.current) clearTimeout(saveFeedbackTimer.current)
    setSaveFeedback({ message, type })
    saveFeedbackTimer.current = setTimeout(() => setSaveFeedback(null), 5000)
  }, [])

  const runTableCommand = useCallback((command: (chain: ReturnType<typeof editor.chain>) => { run: () => boolean }, successMessage: string, errorMessage: string) => {
    if (!editor) return
    const chain = editor.chain().focus()
    if (!command(chain).run()) {
      showNotification(errorMessage, 'info')
      return
    }
    showNotification(successMessage, 'success')
  }, [editor, showNotification])

  // ── Deterministic link sanitizer at save-time ────────────────
  // Ensures ALL non-YouTube links get target="_blank" + secure rel,
  // regardless of whether the ProseMirror plugin had a chance to run.
  const sanitizeLinksTargetBlank = (html: string): string => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const anchors = doc.querySelectorAll('a[href]')
    let changed = false
    anchors.forEach((a) => {
      const href = a.getAttribute('href') || ''
      if (isYoutubeUrl(href)) return
      if (a.getAttribute('target') !== '_blank') {
        a.setAttribute('target', '_blank')
        changed = true
      }
      if (a.getAttribute('rel') !== 'noopener noreferrer') {
        a.setAttribute('rel', 'noopener noreferrer')
        changed = true
      }
    })
    return changed ? doc.body.innerHTML : html
  }

  // ── Form submission ─────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const title = postTitle.trim()
    const author = postAuthor.trim()
    const rawContent = editor?.getHTML()?.trim() ?? ''
    if (!title || !rawContent || rawContent === '<p></p>') {
      flashFeedback('Título e conteúdo são obrigatórios para salvar o post.', 'error')
      showNotification('Título e conteúdo são obrigatórios para salvar o post.', 'error')
      return
    }
    // Enforce target="_blank" on all non-YouTube links before persisting
    const content = sanitizeLinksTargetBlank(rawContent)
    const success = await onSave(title, author, content)
    if (success) {
      flashFeedback(editingPostId ? 'Post atualizado com sucesso ✓' : 'Post criado com sucesso ✓', 'success')
    } else {
      flashFeedback('Falha ao salvar o post. Verifique e tente novamente.', 'error')
    }
  }

  const handleClear = () => {
    setPostTitle('')
    setPostAuthor('')
    editor?.commands.clearContent()
  }

  const handleGeminiImport = useCallback(async (url: string) => {
    if (!url || !editor) return

    const normalizedUrl = url.trim()
    const updateProgress = (next: Partial<GeminiImportProgress>) => {
      setGeminiImportProgress((prev) => ({ ...prev, ...next, active: true }))
    }

    const resolveImportError = (status: number | null, backendMessage?: string): string => {
      if (backendMessage) {
        if (/privado|expirado|bloqueado/i.test(backendMessage)) {
          return 'O link do Gemini parece privado, expirado ou bloqueado. Gere um novo link de compartilhamento publico e tente novamente.'
        }
        if (/nenhum conteudo extraido/i.test(backendMessage)) {
          return 'Nao consegui extrair conteudo desse link. Abra o compartilhamento, confirme se o texto aparece publicamente e tente de novo.'
        }
      }
      if (status === 422) {
        return 'URL invalida. Use um link de compartilhamento do Gemini no formato https://gemini.google.com/share/....'
      }
      if (status === 502) {
        return 'Falha ao ler o compartilhamento do Gemini no servidor. Tente novamente em instantes ou gere um novo link publico.'
      }
      if (status === 400) {
        return 'A requisicao de importacao foi rejeitada. Verifique o link informado.'
      }
      return backendMessage || 'Erro ao importar do Gemini.'
    }

    updateProgress({ stage: 'validating', percent: 12, message: 'Validando link compartilhado do Gemini...' })

    if (!/^https:\/\//i.test(normalizedUrl)) {
      const message = 'URL invalida. O link precisa comecar com https://.'
      updateProgress({ stage: 'error', percent: 100, message })
      showNotification(message, 'error')
      setTimeout(() => setGeminiImportProgress(GEMINI_IMPORT_IDLE), 2400)
      return
    }

    setLastGeminiImportUrl(normalizedUrl)

    setIsImportingGemini(true)
    updateProgress({ stage: 'requesting', percent: 36, message: 'Conectando ao endpoint de importacao...' })
    showNotification('Importando conteúdo do Gemini...', 'info')

    try {
      const res = await fetch('/api/mainsite/gemini-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      })

      updateProgress({ stage: 'processing', percent: 70, message: 'Processando conteudo retornado...' })

      let data: { html?: string; title?: string; error?: string } = {}
      try {
        data = await res.json() as { html?: string; title?: string; error?: string }
      } catch {
        data = {}
      }

      if (!res.ok) {
        throw new Error(resolveImportError(res.status, data.error))
      }

      updateProgress({ stage: 'inserting', percent: 90, message: 'Inserindo conteudo no editor...' })

      if (data.html) {
        editor.chain().focus().insertContent(data.html).run()
        if (data.title && !postTitle.trim()) setPostTitle(data.title)
      }

      updateProgress({ stage: 'done', percent: 100, message: 'Importacao concluida com sucesso.' })
      showNotification('Conteúdo importado com sucesso!', 'success')
      setTimeout(() => setGeminiImportProgress(GEMINI_IMPORT_IDLE), 1400)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido.'
      updateProgress({ stage: 'error', percent: 100, message })
      showNotification(message, 'error')
      setTimeout(() => setGeminiImportProgress(GEMINI_IMPORT_IDLE), 2800)
    } finally {
      setIsImportingGemini(false)
    }
  }, [editor, showNotification, postTitle])

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="result-toolbar">
        <div>
          <h4>{editingPostId ? `Editar post #${editingPostId}` : 'Novo post (NOVO)'}</h4>
          <p className="field-hint">Crie e edite posts com salvamento imediato.</p>
        </div>
        <div className="inline-actions">
          <button type="submit" className="primary-button" disabled={savingPost}>
            {savingPost ? <Loader2 size={16} className="spin" /> : editingPostId ? <Save size={16} /> : <FilePlus2 size={16} />}
            {editingPostId ? 'Salvar alterações' : 'Criar post'}
          </button>
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

      {/* ── Inline save feedback (visible in popup window) ── */}
      {saveFeedback && (
        <div
          className={`post-editor-feedback post-editor-feedback--${saveFeedback.type}`}
          role="status"
          aria-live="polite"
        >
          {saveFeedback.type === 'success' ? <CheckSquare size={16} /> : <X size={16} />}
          <span>{saveFeedback.message}</span>
          <button type="button" className="post-editor-feedback__close" onClick={() => setSaveFeedback(null)} aria-label="Fechar">×</button>
        </div>
      )}

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
        <label htmlFor="mainsite-post-author">Autor do post</label>
        <input
          id="mainsite-post-author"
          name="mainsitePostAuthor"
          value={postAuthor}
          onChange={(event) => setPostAuthor(event.target.value)}
          placeholder="Leonardo Cardozo Vargas"
          disabled={savingPost}
        />
      </div>

      {/* ── TipTap Editor ────────────────────────────────────────────── */}
      <div className="tiptap-container">
        {editor && (
          <div className="tiptap-toolbar">
            <EditorPromptModal
              modal={promptModal}
              setModal={setPromptModal}
            />

            {/* AI Action Tool */}
            <div className="tiptap-ai-group">
              <Sparkles size={14} color="#1a73e8" />
              <select id="ai-action" name="aiAction" title="Inteligência Artificial (Gemini 2.5 Pro)" autoComplete="off" onChange={(e) => { if (e.target.value) { handleAITransform(e.target.value); e.target.value = ''; } }} disabled={isGeneratingAI}>
                <option value="">{isGeneratingAI ? 'Processando...' : 'IA: Aprimorar Texto'}</option>
                <option value="grammar">Corrigir Gramática</option>
                <option value="summarize">Resumir Seleção</option>
                <option value="expand">Expandir Conteúdo</option>
                <option value="formal">Tornar Formal</option>
              </select>
            </div>
            <span className="tiptap-divider" />

            <button type="button" title="Desfazer (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={!editor.can().undo() ? 'disabled' : ''}><Undo2 size={15} /></button>
            <button type="button" title="Refazer (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={!editor.can().redo() ? 'disabled' : ''}><Redo2 size={15} /></button>
            <span className="tiptap-divider" />

            <button type="button" title="Negrito (Ctrl+B)" className={editor.isActive('bold') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></button>
            <button type="button" title="Itálico (Ctrl+I)" className={editor.isActive('italic') ? 'active' : ''} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></button>
            <button type="button" title="Sublinhado (Ctrl+U)" className={editor.isActive('underline') ? 'active' : ''} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></button>
            <button type="button" title="Tachado (Ctrl+Shift+X)" className={editor.isActive('strike') ? 'active' : ''} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></button>
            <button type="button" title="Marca-texto (Ctrl+Shift+H)" className={editor.isActive('highlight') ? 'active' : ''} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter size={15} /></button>
            <span className="tiptap-divider" />
            <button type="button" title="Subscrito (Ctrl+,)" className={editor.isActive('subscript') ? 'active' : ''} onClick={() => editor.chain().focus().toggleSubscript().run()}><SubIcon size={15} /></button>
            <button type="button" title="Sobrescrito (Ctrl+.)" className={editor.isActive('superscript') ? 'active' : ''} onClick={() => editor.chain().focus().toggleSuperscript().run()}><SuperIcon size={15} /></button>
            <button type="button" title="Bloco de código (Ctrl+Alt+C)" className={editor.isActive('codeBlock') ? 'active' : ''} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code size={15} /></button>
            <button type="button" title="Citação (Ctrl+Shift+B)" className={editor.isActive('blockquote') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></button>
            <span className="tiptap-divider" />
            <button type="button" title="Esquerda (Ctrl+Shift+L)" className={editor.isActive({ textAlign: 'left' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={15} /></button>
            <button type="button" title="Centro (Ctrl+Shift+E)" className={editor.isActive({ textAlign: 'center' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={15} /></button>
            <button type="button" title="Direita (Ctrl+Shift+R)" className={editor.isActive({ textAlign: 'right' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={15} /></button>
            <button type="button" title="Justificar (Ctrl+Shift+J)" className={editor.isActive({ textAlign: 'justify' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify size={15} /></button>
            <span className="tiptap-divider" />
            <button type="button" title="Título 1 (Ctrl+Alt+1)" className={editor.isActive('heading', { level: 1 }) ? 'active' : ''} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={15} /></button>
            <button type="button" title="Título 2 (Ctrl+Alt+2)" className={editor.isActive('heading', { level: 2 }) ? 'active' : ''} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></button>
            <button type="button" title="Título 3 (Ctrl+Alt+3)" className={editor.isActive('heading', { level: 3 }) ? 'active' : ''} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></button>
            <button type="button" title="Marcadores (Ctrl+Shift+8)" className={editor.isActive('bulletList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></button>
            <button type="button" title="Numeração (Ctrl+Shift+7)" className={editor.isActive('orderedList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></button>
            <button type="button" title="Tarefas (Ctrl+Shift+9)" className={editor.isActive('taskList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleTaskList().run()}><CheckSquare size={15} /></button>
            <button type="button" title="Linha horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={15} /></button>
            <button type="button" title="Inserir tabela 3×3" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon size={15} /></button>
            {editor.isActive('table') && (
              <>
                <button type="button" className="tiptap-button-textual" title="Adicionar linha abaixo" onClick={() => runTableCommand((chain) => chain.addRowAfter(), 'Linha adicionada à tabela.', 'Posicione o cursor dentro da tabela para adicionar uma linha.')}><span className="tiptap-button-text">L+</span></button>
                <button type="button" className="tiptap-button-textual" title="Remover linha" onClick={() => runTableCommand((chain) => chain.deleteRow(), 'Linha removida da tabela.', 'Posicione o cursor dentro da tabela para remover uma linha.')}><span className="tiptap-button-text">L-</span></button>
                <button type="button" className="tiptap-button-textual" title="Adicionar coluna à direita" onClick={() => runTableCommand((chain) => chain.addColumnAfter(), 'Coluna adicionada à tabela.', 'Posicione o cursor dentro da tabela para adicionar uma coluna.')}><span className="tiptap-button-text">C+</span></button>
                <button type="button" className="tiptap-button-textual" title="Remover coluna" onClick={() => runTableCommand((chain) => chain.deleteColumn(), 'Coluna removida da tabela.', 'Posicione o cursor dentro da tabela para remover uma coluna.')}><span className="tiptap-button-text">C-</span></button>
                <button type="button" className="tiptap-button-textual" title="Alternar cabeçalho da linha" onClick={() => runTableCommand((chain) => chain.toggleHeaderRow(), 'Cabeçalho da tabela atualizado.', 'Posicione o cursor dentro da tabela para atualizar o cabeçalho.')}><span className="tiptap-button-text">Hdr</span></button>
                <button type="button" className="tiptap-button-textual" title="Mesclar ou dividir células" onClick={() => runTableCommand((chain) => chain.mergeOrSplit(), 'Estrutura de células atualizada.', 'Selecione células válidas para mesclar ou dividir.')}><span className="tiptap-button-text">Mix</span></button>
                <button type="button" className="tiptap-button-textual" title="Excluir tabela" onClick={() => runTableCommand((chain) => chain.deleteTable(), 'Tabela removida.', 'Posicione o cursor dentro da tabela para excluí-la.')}><span className="tiptap-button-text">Del</span></button>
              </>
            )}
            <button type="button" title="Quebra de linha (Shift+Enter)" onClick={() => editor.chain().focus().setHardBreak().run()}><WrapText size={15} /></button>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <button type="button" title="Aumentar recuo (Tab)" onClick={() => (editor.chain().focus() as any).increaseIndent().run()}><Indent size={15} /></button>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <button type="button" title="Diminuir recuo (Shift+Tab)" onClick={() => (editor.chain().focus() as any).decreaseIndent().run()}><Outdent size={15} /></button>
            <span className="tiptap-divider" />
            <button type="button" title="Link (Ctrl+K)" className={editor.isActive('link') ? 'active' : ''} onClick={addLink}><LinkIcon size={15} /></button>
            <button type="button" title="Remover link" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} className={!editor.isActive('link') ? 'disabled' : ''}><Unlink size={15} /></button>
            <span className="tiptap-divider" />
            {/* ── Media toolbar ── */}
            <input id="tiptap-file-upload" ref={fileInputRef} name="tiptapFileUpload" type="file" accept="image/*" title="Upload de imagem" className="tiptap-hidden-input" onChange={handleImageUpload} />
            <button type="button" title="Upload de imagem (R2)" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>{isUploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}</button>
            <button type="button" title="Imagem por URL / Google Drive" onClick={addImageUrl}><ImageIcon size={15} /></button>
            <button type="button" title="Vídeo do YouTube" onClick={addYoutube}><span>YT</span></button>
            <button type="button" title="Reduzir mídia" onClick={() => adjustSelectedMediaSize(-1)} disabled={!editor.isActive('image') && !editor.isActive('youtube')}><ZoomOut size={15} /></button>
            <button type="button" title="Ampliar mídia" onClick={() => adjustSelectedMediaSize(1)} disabled={!editor.isActive('image') && !editor.isActive('youtube')}><ZoomIn size={15} /></button>
            <button type="button" title="Legenda da mídia" onClick={editCaption} disabled={!editor.isActive('image') && !editor.isActive('youtube')}><MessageSquare size={15} /></button>
            <button type="button" title="Importar do Gemini" onClick={() => openPromptModal({
              title: 'Importar do Gemini (link compartilhado):',
              submitLabel: 'Importar',
              primaryLabel: 'URL do compartilhamento',
              placeholder: 'https://gemini.google.com/share/...',
              callback: ({ value }) => handleGeminiImport(value),
            })} disabled={isImportingGemini}>{isImportingGemini ? <Loader2 size={15} className="spin" /> : <Download size={15} />}</button>
            
            <span className="tiptap-divider" />
            
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
            <div className="tiptap-select-group">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <select id="tiptap-font-size" name="tiptapFontSize" title="Tamanho da fonte" onChange={(e) => (editor.chain().focus() as any).setFontSize(e.target.value).run()} value={(editor.getAttributes('textStyle').fontSize as string) || ''}>
                <option value="">Tam.</option>
                <option value="12px">12px</option>
                <option value="14px">14px</option>
                <option value="16px">16px</option>
                <option value="18px">18px</option>
                <option value="20px">20px</option>
                <option value="24px">24px</option>
                <option value="30px">30px</option>
              </select>
            </div>

            <span className="tiptap-divider" />

            {/* AI Freeform Command (Wand2) */}
            <div className="tiptap-ai-popover-anchor">
              <button ref={aiChatBtnRef} type="button" title="IA: Instrução Livre (Gemini)" onClick={() => setAiChatOpen(!aiChatOpen)} className={aiChatOpen ? 'active' : ''} disabled={isGeneratingAI}>
                {isGeneratingAI ? <Loader2 size={15} className="spin" /> : <Wand2 size={15} />}
              </button>
              {aiChatOpen && (() => {
                const btnRect = aiChatBtnRef.current?.getBoundingClientRect()
                const ownerDoc = aiChatBtnRef.current?.ownerDocument
                const popupWin = ownerDoc?.defaultView
                const vpW = popupWin?.innerWidth || 800
                let popLeft = btnRect ? btnRect.left : 0
                const popW = 340
                if (popLeft + popW > vpW - 8) popLeft = vpW - popW - 8
                if (popLeft < 8) popLeft = 8
                return ReactDOM.createPortal(
                  <div className="ai-freeform-popover" style={{ position: 'fixed', top: btnRect ? btnRect.bottom + 6 : 100, left: popLeft, width: `${popW}px`, zIndex: 99999 }}>
                    <div className="ai-freeform-popover__header">
                      <Wand2 size={14} color="#1a73e8" />
                      <span className="ai-freeform-popover__title">IA: Instrução Livre</span>
                      <span className="ai-freeform-popover__scope">{editor?.state.selection.empty ? 'Texto inteiro' : 'Seleção'}</span>
                    </div>
                    <textarea
                      className="ai-freeform-popover__textarea"
                      autoFocus
                      rows={3}
                      placeholder="Ex: Traduza para inglês, resuma em 3 bullets, torne poético..."
                      value={aiChatInput}
                      onChange={e => setAiChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAIFreeform() } if (e.key === 'Escape') setAiChatOpen(false) }}
                    />
                    <div className="ai-freeform-popover__actions">
                      <button type="button" className="ai-freeform-popover__btn ai-freeform-popover__btn--ghost" onClick={() => setAiChatOpen(false)}>Cancelar</button>
                      <button type="button" className="ai-freeform-popover__btn ai-freeform-popover__btn--primary" onClick={handleAIFreeform} disabled={!aiChatInput.trim()}>
                        <Send size={12} /> Enviar
                      </button>
                    </div>
                  </div>,
                  ownerDoc?.body || document.body
                )
              })()}
            </div>
          </div>
        )}
        {geminiImportProgress.active && (
          <div
            className={`gemini-import-progress gemini-import-progress--${geminiImportProgress.stage}`}
            role="status"
            aria-live="polite"
          >
            <div className="gemini-import-progress__meta">
              <span>Importacao Gemini</span>
              <span>{geminiImportProgress.percent}%</span>
            </div>
            <div className="gemini-import-progress__track" aria-hidden="true">
              <div className="gemini-import-progress__fill" style={{ width: `${geminiImportProgress.percent}%` }} />
            </div>
            <p className="gemini-import-progress__message">{geminiImportProgress.message}</p>
            {geminiImportProgress.stage === 'error' && (
              <div className="gemini-import-progress__actions">
                <button
                  type="button"
                  className="gemini-import-progress__btn gemini-import-progress__btn--primary"
                  onClick={() => handleGeminiImport(lastGeminiImportUrl)}
                  disabled={!lastGeminiImportUrl || isImportingGemini}
                >
                  Tentar novamente
                </button>
                <button
                  type="button"
                  className="gemini-import-progress__btn gemini-import-progress__btn--ghost"
                  onClick={() => setGeminiImportProgress(GEMINI_IMPORT_IDLE)}
                  disabled={isImportingGemini}
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        )}
        {editor && (
          <DragHandle editor={editor} className="tiptap-drag-handle" onNodeChange={() => undefined}>
            <GripVertical size={14} strokeWidth={2.2} />
          </DragHandle>
        )}
        <EditorContent editor={editor} className="tiptap-editor" />
        {editor && <SearchReplacePanel editor={editor} />}
        {editor && <EditorBubbleMenu editor={editor} onLinkClick={addLink} />}
        {editor && <EditorFloatingMenu editor={editor} onInsertTable={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />}
        {editor && (
          <div className="tiptap-status-bar">
            {editor.storage.characterCount.characters()} caracteres &middot; {editor.storage.characterCount.words()} palavras
          </div>
        )}
      </div>


    </form>
  )
}
