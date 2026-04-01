/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * PopupPortal — Renders React children inside a native OS popup window.
 *
 * Uses window.open() + ReactDOM.createPortal to render a React subtree
 * inside a separate browser window while preserving the parent's React
 * tree, hooks, state, context, and event handlers.
 *
 * Features:
 * - Smart auto-sizing (~90% of screen, capped at reasonable maximums)
 * - Copies all parent stylesheets into the popup for consistent styling
 * - Monitors popup close (via OS X button) and calls onClose
 * - Sets a custom window title
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface PopupPortalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

// Module-scoped popup window reference (safe for single instance)
let popupWindow: Window | null = null

export function PopupPortal({ isOpen, onClose, title = 'LCV Admin', children }: PopupPortalProps) {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)

  // Open or close the popup window
  useEffect(() => {
    if (!isOpen) {
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close()
      }
      popupWindow = null
      return () => { /* noop */ }
    }

    // Already open — skip
    if (popupWindow && !popupWindow.closed && containerEl) return

    lastFocusedElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    // Calculate dimensions to fill the screen (maximized)
    const screenW = window.screen.availWidth || 1920
    const screenH = window.screen.availHeight || 1080
    const popupW = screenW
    const popupH = screenH
    const left = 0
    const top = 0

    const features = [
      `width=${popupW}`,
      `height=${popupH}`,
      `left=${left}`,
      `top=${top}`,
      'resizable=yes',
      'scrollbars=yes',
      'menubar=no',
      'toolbar=no',
      'location=no',
      'status=no',
    ].join(',')

    const popup = window.open('', '_blank', features)
    if (!popup) {
      onClose()
      return
    }

    popupWindow = popup

    // Write basic HTML structure
    popup.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
      </head>
      <body>
        <div id="popup-root"></div>
      </body>
      </html>
    `)
    popup.document.close()

    // Copy all stylesheets from parent into popup
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
      popup.document.head.appendChild(node.cloneNode(true))
    })

    // Inject popup-specific base styles
    const popupBaseStyle = popup.document.createElement('style')
    popupBaseStyle.textContent = `
      body {
        margin: 0;
        padding: 1cm;
        box-sizing: border-box;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: var(--background, #f8fafc);
        color: var(--foreground, #1e293b);
        height: 100vh;
        display: flex;
        flex-direction: column;
      }
      #popup-root {
        margin: 0 auto;
        width: 100%;
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      #popup-root .form-card {
        border: none;
        box-shadow: none;
        background: transparent;
        display: flex;
        flex-direction: column;
        flex: 1;
        margin: 0;
        padding: 0;
      }
      .popup-portal__dialog {
        outline: none;
        display: flex;
        flex-direction: column;
        flex: 1;
      }
    `
    popup.document.head.appendChild(popupBaseStyle)

    // Create container and notify React via scheduled setState
    const root = popup.document.getElementById('popup-root')
    if (root) {
      const div = popup.document.createElement('div')
      div.setAttribute('role', 'dialog')
      div.setAttribute('aria-modal', 'true')
      div.setAttribute('aria-label', title)
      div.className = 'popup-portal__dialog'
      div.tabIndex = -1
      root.appendChild(div)
      // Schedule state update for next microtask to avoid sync setState in effect
      queueMicrotask(() => {
        setContainerEl(div)
        div.focus()
      })
    }

    // Monitor popup closed by OS
    const pollTimer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(pollTimer)
        popupWindow = null
        queueMicrotask(() => setContainerEl(null))
        lastFocusedElementRef.current?.focus()
        onClose()
      }
    }, 300)

    // Cleanup on unmount or when isOpen changes
    return () => {
      clearInterval(pollTimer)
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close()
      }
      popupWindow = null
      lastFocusedElementRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, title])

  // Render children into popup via portal
  if (!containerEl) return null
  return createPortal(children, containerEl)
}
