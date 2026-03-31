/**
 * NodeViews.tsx — Custom ReactNodeView components for PostEditor
 * Extracted from PostEditor.tsx for structural decomposition.
 */
import React, { useEffect, useRef, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { NodeSelection } from 'prosemirror-state'
import { MousePointer2 } from 'lucide-react'
import { getEmbedUrlFromYoutubeUrl } from '@tiptap/extension-youtube'
import { clamp } from './utils'

// ── Shared helpers ────────────────────────────────────────────

export function migrateLegacyCaptions(html: string): string {
  if (!html) return html

  const normalizeCaption = (caption: string) =>
    caption
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  const wrappedImagePattern = /<p[^>]*>\s*(<img\b[^>]*>)\s*<\/p>\s*<p[^>]*text-align\s*:\s*center[^>]*>\s*(?:<em>|<i>)\s*([\s\S]*?)\s*(?:<\/em>|<\/i>)\s*<\/p>/gi
  const plainImagePattern = /(<img\b[^>]*>)\s*<p[^>]*text-align\s*:\s*center[^>]*>\s*(?:<em>|<i>)\s*([\s\S]*?)\s*(?:<\/em>|<\/i>)\s*<\/p>/gi

  let migrated = html.replace(wrappedImagePattern, (_m, imgTag: string, captionRaw: string) => {
    const caption = normalizeCaption(captionRaw)
    if (!caption) return `<figure class="tiptap-figure">${imgTag}</figure>`
    return `<figure class="tiptap-figure">${imgTag}<figcaption>${caption}</figcaption></figure>`
  })

  migrated = migrated.replace(plainImagePattern, (_m, imgTag: string, captionRaw: string) => {
    const caption = normalizeCaption(captionRaw)
    if (!caption) return `<figure class="tiptap-figure">${imgTag}</figure>`
    return `<figure class="tiptap-figure">${imgTag}<figcaption>${caption}</figcaption></figure>`
  })

  return migrated
}

// ── Shared sub-components ─────────────────────────────────────

export const ResizableMediaHandle = ({
  onStartResize,
  tone = 'neutral',
}: {
  onStartResize: (e: React.MouseEvent | React.TouchEvent) => void
  tone?: string
}) => (
  <button
    type="button"
    className={`media-resize-handle tone-${tone}`}
    contentEditable={false}
    onMouseDown={onStartResize}
    onPointerDown={onStartResize}
    title="Arraste para redimensionar"
    aria-label="Arraste para redimensionar"
  />
)

export const SelectMediaButton = ({ onSelect }: { onSelect: () => void }) => (
  <button
    type="button"
    className="media-select-btn"
    contentEditable={false}
    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onSelect() }}
    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onSelect() }}
    title="Selecionar mídia"
    aria-label="Selecionar mídia"
  >
    <MousePointer2 size={13} className="media-select-btn-icon" />
    <span className="media-select-btn-label">Selecionar</span>
  </button>
)

export const IMAGE_SNAPS = [
  { label: '25%', v: '25%' },
  { label: '50%', v: '50%' },
  { label: '75%', v: '75%' },
  { label: '100%', v: '100%' },
]

export const MediaSnapBar = ({ onSnap }: { onSnap: (v: string) => void }) => (
  <div className="media-snap-bar" contentEditable={false} onMouseDown={e => e.preventDefault()}>
    {IMAGE_SNAPS.map(({ label, v }) => (
      <button key={v} type="button" onClick={() => onSnap(v)} title={v}>{label}</button>
    ))}
  </div>
)

export const VIDEO_SNAPS = [
  { label: '480p', w: 853, h: 480 },
  { label: '720p', w: 1280, h: 720 },
  { label: '840px', w: 840, h: 472 },
]

export const YoutubeSnapBar = ({ onSnap }: { onSnap: (w: number, h: number) => void }) => (
  <div className="media-snap-bar" contentEditable={false} onMouseDown={e => e.preventDefault()}>
    {VIDEO_SNAPS.map(({ label, w, h }) => (
      <button key={label} type="button" onClick={() => onSnap(w, h)} title={`${w}×${h}`}>{label}</button>
    ))}
  </div>
)

// ── FigureNodeView ─────────────────────────────────────────────

export const FigureNodeView = ({ node, updateAttributes, selected, editor, getPos }: NodeViewProps) => {
  const captionRef = useRef<HTMLElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(100)
  const imageRef = useRef<HTMLImageElement>(null)
  const [localTone, setLocalTone] = useState('neutral')

  useEffect(() => {
    const img = imageRef.current
    if (!img) return

    const analyzeTone = () => {
      try {
        const sample = 24
        const canvas = document.createElement('canvas')
        canvas.width = sample
        canvas.height = sample
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          setLocalTone('neutral')
          return
        }

        ctx.drawImage(img, 0, 0, sample, sample)
        const { data } = ctx.getImageData(0, 0, sample, sample)
        let total = 0
        let count = 0

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3]
          if (a < 32) continue
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          total += (0.299 * r) + (0.587 * g) + (0.114 * b)
          count += 1
        }

        if (!count) {
          setLocalTone('neutral')
          return
        }

        const luma = (total / count) / 255
        setLocalTone(luma >= 0.56 ? 'light' : 'dark')
      } catch {
        setLocalTone('neutral')
      }
    }

    if (img.complete) analyzeTone()
    img.addEventListener('load', analyzeTone)
    return () => img.removeEventListener('load', analyzeTone)
  }, [node.attrs.src])

  const onStartResize = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const point = ('touches' in event) ? event.touches[0] : (event as React.MouseEvent)
    startXRef.current = point.clientX
    startWidthRef.current = Number(String(node.attrs.width || '100').replace('%', '')) || 100

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const p = ('touches' in moveEvent) ? moveEvent.touches[0] : (moveEvent as MouseEvent)
      const deltaX = p.clientX - startXRef.current
      const next = clamp(Math.round(startWidthRef.current + (deltaX * 0.22)), 20, 100)
      updateAttributes({ width: `${next}%` })
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
  }

  const selectCurrentNode = () => {
    const pos = getPos?.()
    if (typeof pos !== 'number') return
    const tr = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos))
    editor.view.dispatch(tr)
    editor.commands.focus()
  }

  const handleSelectMedia = (event: React.MouseEvent | React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    selectCurrentNode()
  }

  // Sync caption text back to attrs on blur
  const handleCaptionBlur = () => {
    const text = captionRef.current?.innerText?.trim() ?? ''
    updateAttributes({ caption: text })
  }

  const stopEvents = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <NodeViewWrapper
      className={`tiptap-figure-nv resizable-media media-image tone-${localTone} ${selected ? 'is-selected' : ''}`}
      contentEditable={false}
      style={{ width: node.attrs.width || '100%' }}
      onMouseDown={handleSelectMedia}
      onPointerDown={handleSelectMedia}
    >
      <MediaSnapBar onSnap={(size) => updateAttributes({ width: size })} />
      <SelectMediaButton onSelect={selectCurrentNode} />
      <figure className="tiptap-figure" style={{ margin: 0, width: '100%', height: 'auto', display: 'block' }}>
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          title={node.attrs.title || ''}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          draggable="false"
          onMouseDown={handleSelectMedia}
          onPointerDown={handleSelectMedia}
        />
        <figcaption
          ref={captionRef as React.RefObject<HTMLElement>}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleCaptionBlur}
          onKeyDown={(e) => {
            stopEvents(e)
            if (e.key === 'Enter') { e.preventDefault(); captionRef.current?.blur() }
          }}
          onKeyUp={stopEvents}
          onKeyPress={stopEvents}
          onInput={stopEvents}
          onMouseDown={stopEvents}
          onClick={stopEvents}
          style={{ outline: 'none', cursor: 'text', minHeight: '1.4em' }}
          data-placeholder="Clique para adicionar legenda..."
        >
          {node.attrs.caption || ''}
        </figcaption>
      </figure>
      <ResizableMediaHandle onStartResize={onStartResize} tone={localTone} />
    </NodeViewWrapper>
  )
}

// ── ResizableImageNodeView ─────────────────────────────────────

export const ResizableImageNodeView = ({
  node, updateAttributes, selected, editor, getPos,
}: NodeViewProps) => {
  const startXRef = useRef(0)
  const startWidthRef = useRef(100)
  const imageRef = useRef<HTMLImageElement>(null)
  const [localTone, setLocalTone] = useState('neutral')

  useEffect(() => {
    const img = imageRef.current
    if (!img) return

    const analyzeTone = () => {
      try {
        const sample = 24
        const canvas = document.createElement('canvas')
        canvas.width = sample
        canvas.height = sample
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) { setLocalTone('neutral'); return }
        ctx.drawImage(img, 0, 0, sample, sample)
        const { data } = ctx.getImageData(0, 0, sample, sample)
        let total = 0; let count = 0
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3]; if (a < 32) continue
          total += (0.299 * data[i]) + (0.587 * data[i + 1]) + (0.114 * data[i + 2])
          count += 1
        }
        if (!count) { setLocalTone('neutral'); return }
        setLocalTone((total / count) / 255 >= 0.56 ? 'light' : 'dark')
      } catch { setLocalTone('neutral') }
    }

    if (img.complete) analyzeTone()
    img.addEventListener('load', analyzeTone)
    return () => img.removeEventListener('load', analyzeTone)
  }, [node.attrs.src])

  const onStartResize = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault(); event.stopPropagation()
    const point = ('touches' in event) ? event.touches[0] : (event as React.MouseEvent)
    startXRef.current = point.clientX
    startWidthRef.current = Number(String(node.attrs.width || '100').replace('%', '')) || 100

    const onMove = (e: MouseEvent | TouchEvent) => {
      const p = ('touches' in e) ? e.touches[0] : (e as MouseEvent)
      const next = clamp(Math.round(startWidthRef.current + ((p.clientX - startXRef.current) * 0.22)), 20, 100)
      updateAttributes({ width: `${next}%` })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp)
    }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true }); window.addEventListener('touchend', onUp)
  }

  const selectCurrentNode = () => {
    const pos = getPos?.()
    if (typeof pos !== 'number') return
    const tr = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos))
    editor.view.dispatch(tr); editor.commands.focus()
  }

  const handleSelectMedia = (event: React.MouseEvent | React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    selectCurrentNode()
  }

  return (
    <NodeViewWrapper
      className={`resizable-media media-image tone-${localTone} ${selected ? 'is-selected' : ''}`}
      contentEditable={false}
      style={{ width: node.attrs.width || '100%' }}
      onMouseDown={handleSelectMedia}
      onPointerDown={handleSelectMedia}
    >
      <MediaSnapBar onSnap={(size) => updateAttributes({ width: size })} />
      <SelectMediaButton onSelect={selectCurrentNode} />
      <img
        ref={imageRef}
        src={node.attrs.src}
        alt={node.attrs.alt || ''}
        title={node.attrs.title || ''}
        draggable="false"
        onMouseDown={handleSelectMedia}
        onPointerDown={handleSelectMedia}
      />
      <ResizableMediaHandle onStartResize={onStartResize} tone={localTone} />
    </NodeViewWrapper>
  )
}

// ── ResizableYoutubeNodeView ───────────────────────────────────

export const ResizableYoutubeNodeView = ({
  node, updateAttributes, selected, editor, getPos,
}: NodeViewProps) => {
  const startXRef = useRef(0)
  const startWidthRef = useRef(840)
  const currentW = Number(node.attrs.width) || 840
  const currentH = Number(node.attrs.height) || Math.round((currentW * 9) / 16)

  const onStartResize = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault(); event.stopPropagation()
    const point = ('touches' in event) ? event.touches[0] : (event as React.MouseEvent)
    startXRef.current = point.clientX
    startWidthRef.current = currentW

    const onMove = (e: MouseEvent | TouchEvent) => {
      const p = ('touches' in e) ? e.touches[0] : (e as MouseEvent)
      const nextW = clamp(Math.round(startWidthRef.current + ((p.clientX - startXRef.current) * 1.2)), 320, 1200)
      updateAttributes({ width: nextW, height: Math.round((nextW * 9) / 16) })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp)
    }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true }); window.addEventListener('touchend', onUp)
  }

  const selectCurrentNode = () => {
    const pos = getPos?.()
    if (typeof pos !== 'number') return
    const tr = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos))
    editor.view.dispatch(tr); editor.commands.focus()
  }

  const handleSelectMedia = (event: React.MouseEvent | React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    selectCurrentNode()
  }

  const embedSrc = getEmbedUrlFromYoutubeUrl({
    url: node.attrs.src, allowFullscreen: true, autoplay: false, nocookie: true,
  }) || node.attrs.src

  return (
    <NodeViewWrapper
      className={`resizable-media media-youtube ${selected ? 'is-selected' : ''}`}
      contentEditable={false}
      style={{ width: `${currentW}px`, maxWidth: '100%' }}
      onMouseDown={handleSelectMedia}
      onPointerDown={handleSelectMedia}
    >
      <YoutubeSnapBar onSnap={(w, h) => updateAttributes({ width: w, height: h })} />
      <SelectMediaButton onSelect={selectCurrentNode} />
      <div data-youtube-video onMouseDown={handleSelectMedia} onPointerDown={handleSelectMedia}>
        <iframe
          src={embedSrc}
          width={currentW}
          height={currentH}
          title="YouTube video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <ResizableMediaHandle onStartResize={onStartResize} tone="neutral" />
    </NodeViewWrapper>
  )
}
