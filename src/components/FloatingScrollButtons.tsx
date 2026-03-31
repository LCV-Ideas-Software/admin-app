/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * FloatingScrollButtons — botões inteligentes de rolagem (paridade mainsite-frontend).
 * Mostra "Subir" quando rolado para baixo e "Descer" quando não está no final.
 * Observa o elemento scrollável do painel de conteúdo do admin-app.
 */

import { useCallback, useEffect, useState } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'

const SCROLL_THRESHOLD = 200

export function FloatingScrollButtons() {
  const [showTop, setShowTop] = useState(false)
  const [showBottom, setShowBottom] = useState(false)

  const updateVisibility = useCallback(() => {
    // O painel scrollável do admin-app é .content
    const el = document.querySelector('.content') as HTMLElement | null
    if (!el) return

    const { scrollTop, scrollHeight, clientHeight } = el
    setShowTop(scrollTop > SCROLL_THRESHOLD)
    setShowBottom(scrollHeight - scrollTop - clientHeight > SCROLL_THRESHOLD)
  }, [])

  useEffect(() => {
    const el = document.querySelector('.content') as HTMLElement | null
    if (!el) return

    requestAnimationFrame(updateVisibility)
    el.addEventListener('scroll', updateVisibility, { passive: true })

    // Também observar mudanças de conteúdo (navegação entre módulos)
    const observer = new MutationObserver(updateVisibility)
    observer.observe(el, { childList: true, subtree: true })

    return () => {
      el.removeEventListener('scroll', updateVisibility)
      observer.disconnect()
    }
  }, [updateVisibility])

  const scrollTo = useCallback((direction: 'top' | 'bottom') => {
    const el = document.querySelector('.content') as HTMLElement | null
    if (!el) return
    el.scrollTo({
      top: direction === 'top' ? 0 : el.scrollHeight,
      behavior: 'smooth',
    })
  }, [])

  if (!showTop && !showBottom) return null

  return (
    <div className="floating-scroll-btns">
      {showTop && (
        <button
          type="button"
          className="floating-scroll-btn"
          onClick={() => scrollTo('top')}
          title="Voltar ao topo"
          aria-label="Voltar ao topo"
        >
          <ArrowUp size={20} />
        </button>
      )}
      {showBottom && (
        <button
          type="button"
          className="floating-scroll-btn"
          onClick={() => scrollTo('bottom')}
          title="Ir para o final"
          aria-label="Ir para o final"
        >
          <ArrowDown size={20} />
        </button>
      )}
    </div>
  )
}
