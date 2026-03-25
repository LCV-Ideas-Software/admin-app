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

import { useEffect, useState } from 'react'
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

    // Calculate smart dimensions (~90% of screen, capped)
    const screenW = window.screen.availWidth || 1920
    const screenH = window.screen.availHeight || 1080
    const popupW = Math.min(Math.round(screenW * 0.9), 1600)
    const popupH = Math.min(Math.round(screenH * 0.9), 1000)
    const left = Math.round((screenW - popupW) / 2)
    const top = Math.round((screenH - popupH) / 2)

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
        padding: 16px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: var(--background, #f8fafc);
        color: var(--foreground, #1e293b);
        min-height: 100vh;
      }
      #popup-root {
        max-width: 1200px;
        margin: 0 auto;
      }
      #popup-root .form-card {
        border: none;
        box-shadow: none;
        background: transparent;
      }
    `
    popup.document.head.appendChild(popupBaseStyle)

    // Create container and notify React via scheduled setState
    const root = popup.document.getElementById('popup-root')
    if (root) {
      const div = popup.document.createElement('div')
      root.appendChild(div)
      // Schedule state update for next microtask to avoid sync setState in effect
      queueMicrotask(() => setContainerEl(div))
    }

    // Monitor popup closed by OS
    const pollTimer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(pollTimer)
        popupWindow = null
        queueMicrotask(() => setContainerEl(null))
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, title])

  // Render children into popup via portal
  if (!containerEl) return null
  return createPortal(children, containerEl)
}
