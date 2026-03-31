/**
 * PromptModal.tsx — Universal input modal for the PostEditor
 * (link, image URL, YouTube, caption, Gemini import URL)
 * Extracted from PostEditor.tsx for structural decomposition.
 */
import { X, Link as LinkIcon, Image as ImageIcon, Type } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────

export type PromptModalState = {
  show: boolean
  title: string
  submitLabel: string
  primaryLabel: string
  placeholder: string
  value: string
  callback: ((payload: PromptModalSubmit) => void) | null
  isLink: boolean
  showLinkText: boolean
  linkText: string
  showCaption: boolean
  caption: string
  showAltText: boolean
  altText: string
  showTitleText: boolean
  titleText: string
}

export type PromptModalSubmit = {
  value: string
  linkText: string
  caption: string
  altText: string
  titleText: string
}

export const PROMPT_MODAL_INITIAL: PromptModalState = {
  show: false,
  title: '',
  submitLabel: 'Inserir',
  primaryLabel: 'Valor',
  placeholder: 'https://...',
  value: '',
  callback: null,
  isLink: false,
  showLinkText: false,
  linkText: '',
  showCaption: false,
  caption: '',
  showAltText: false,
  altText: '',
  showTitleText: false,
  titleText: '',
}

// ── Component ─────────────────────────────────────────────────

interface PromptModalProps {
  modal: PromptModalState
  setModal: (state: PromptModalState) => void
}

export function PromptModal({ modal, setModal }: PromptModalProps) {
  if (!modal.show) return null

  const close = () => setModal(PROMPT_MODAL_INITIAL)

  const submit = () => {
    const callback = modal.callback
    const payload: PromptModalSubmit = {
      value: modal.value.trim(),
      linkText: modal.linkText.trim(),
      caption: modal.caption.trim(),
      altText: modal.altText.trim(),
      titleText: modal.titleText.trim(),
    }
    close()
    // Execute callback after modal unmount to avoid portal reparent race in popup document.
    queueMicrotask(() => callback?.(payload))
  }

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label="Entrada de dados">
      <div className="admin-modal-content">
        <button type="button" title="Fechar diálogo" className="admin-modal-close" onClick={close}>
          <X size={24} />
        </button>
        <div className="admin-modal-header">
          <div className="admin-modal-icon">
            {modal.isLink ? <LinkIcon size={24} /> : modal.showCaption ? <ImageIcon size={24} /> : <Type size={24} />}
          </div>
          <h2 className="admin-modal-title">{modal.title}</h2>
          <p className="admin-modal-subtitle">Insira as informações necessárias abaixo</p>
        </div>
        <div className="admin-modal-form">
          <div className="admin-modal-input-group">
            <label className="admin-modal-label" htmlFor="tiptap-prompt-url">{modal.primaryLabel}</label>
            <input
              className="admin-modal-input" id="tiptap-prompt-url" name="tiptapPromptUrl"
              value={modal.value}
              onChange={(e) => setModal({ ...modal, value: e.target.value })}
              placeholder={modal.placeholder}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && !modal.showAltText && !modal.showCaption) submit() }}
            />
          </div>
          {modal.showLinkText && (
            <div className="admin-modal-input-group">
              <label className="admin-modal-label" htmlFor="tiptap-prompt-text">Texto</label>
              <input className="admin-modal-input" id="tiptap-prompt-text" name="tiptapPromptText"
                value={modal.linkText}
                onChange={(e) => setModal({ ...modal, linkText: e.target.value })}
                placeholder="Texto de exibição" />
            </div>
          )}
          {modal.showAltText && (
            <div className="admin-modal-input-group">
              <label className="admin-modal-label" htmlFor="tiptap-prompt-alt">Texto alternativo</label>
              <input className="admin-modal-input" id="tiptap-prompt-alt" name="tiptapPromptAlt"
                value={modal.altText}
                onChange={(e) => setModal({ ...modal, altText: e.target.value })}
                placeholder="Descreva a imagem para acessibilidade" />
            </div>
          )}
          {modal.showTitleText && (
            <div className="admin-modal-input-group">
              <label className="admin-modal-label" htmlFor="tiptap-prompt-title">Título da mídia</label>
              <input className="admin-modal-input" id="tiptap-prompt-title" name="tiptapPromptTitle"
                value={modal.titleText}
                onChange={(e) => setModal({ ...modal, titleText: e.target.value })}
                placeholder="Opcional" />
            </div>
          )}
          {modal.showCaption && (
            <div className="admin-modal-input-group">
              <label className="admin-modal-label" htmlFor="tiptap-prompt-caption">Legenda (opcional)</label>
              <input className="admin-modal-input" id="tiptap-prompt-caption" name="tiptapPromptCaption"
                value={modal.caption}
                onChange={(e) => setModal({ ...modal, caption: e.target.value })}
                placeholder="Ex.: Foto de março de 2026" />
            </div>
          )}
          <div className="admin-modal-actions">
            <button type="button" className="admin-modal-btn admin-modal-btn--ghost" onClick={close}>Cancelar</button>
            <button type="button" className="admin-modal-btn" onClick={submit}>{modal.submitLabel}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
