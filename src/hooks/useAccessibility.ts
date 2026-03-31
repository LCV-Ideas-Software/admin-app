/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * useAccessibility Hook - Keyboard navigation and ARIA utilities
 * 
 * Provides:
 * - Keyboard event handlers (Arrow keys, Tab, Escape, Home, End)
 * - Focus management
 * - Live region announcements
 * - Screen reader support
 * 
 * Usage:
 * ```tsx
 * const { handleKeyDown, announceUpdate, setFocusOnElement } = useAccessibility()
 * ```
 */

import { useCallback, useRef } from 'react'

export interface KeyboardEvent {
  key: string
  code: string
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
}

export interface UseAccessibilityReturn {
  // Keyboard handlers
  handleKeyDown: (e: React.KeyboardEvent) => void
  
  // Focus management
  setFocusOnElement: (selector: string) => void
  setFocusOnId: (id: string) => void
  focusFirst: (containerSelector: string) => void
  focusLast: (containerSelector: string) => void
  
  // Keyboard navigation helpers
  getNextIndex: (currentIndex: number, itemCount: number, circular?: boolean) => number
  getPreviousIndex: (currentIndex: number, itemCount: number, circular?: boolean) => number
  
  // Announcements
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
  announceUpdate: (fieldName: string, newValue: string) => void
  announceSuccess: (message: string) => void
  announceError: (message: string) => void
  
  // ARIA utilities
  getId: (prefix: string) => string
}

export function useAccessibility(): UseAccessibilityReturn {
  const idCounterRef = useRef<Record<string, number>>({})
  const liveRegionRef = useRef<HTMLDivElement | null>(null)

  // Keyboard event handler for common patterns
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleKeyDown = useCallback((_e: React.KeyboardEvent) => {
    // This is exposed for parent to use in their own handlers
    // Example: if (e.key === 'Escape') closeModal()
  }, [])

  // Set focus on element by selector
  const setFocusOnElement = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement
    element?.focus()
  }, [])

  // Set focus on element by ID
  const setFocusOnId = useCallback((id: string) => {
    const element = document.getElementById(id)
    element?.focus()
  }, [])

  // Focus first focusable element in container
  const focusFirst = useCallback((containerSelector: string) => {
    const container = document.querySelector(containerSelector)
    if (!container) return

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    focusableElements[0]?.focus()
  }, [])

  // Focus last focusable element in container
  const focusLast = useCallback((containerSelector: string) => {
    const container = document.querySelector(containerSelector)
    if (!container) return

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    focusableElements[focusableElements.length - 1]?.focus()
  }, [])

  // Get next index in a list (with optional circular navigation)
  const getNextIndex = useCallback((currentIndex: number, itemCount: number, circular = true) => {
    const nextIndex = currentIndex + 1

    if (circular) {
      return nextIndex % itemCount
    }

    return Math.min(nextIndex, itemCount - 1)
  }, [])

  // Get previous index in a list (with optional circular navigation)
  const getPreviousIndex = useCallback((currentIndex: number, itemCount: number, circular = true) => {
    const previousIndex = currentIndex - 1

    if (circular) {
      return previousIndex < 0 ? itemCount - 1 : previousIndex
    }

    return Math.max(previousIndex, 0)
  }, [])

  // Announce to screen reader (polite or assertive)
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Find or create live region
    let liveRegion = liveRegionRef.current
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = 'a11y-live-region'
      liveRegion.setAttribute('role', 'status')
      liveRegion.setAttribute('aria-live', priority)
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.style.position = 'absolute'
      liveRegion.style.left = '-10000px'
      liveRegion.style.width = '1px'
      liveRegion.style.height = '1px'
      liveRegion.style.overflow = 'hidden'
      document.body.appendChild(liveRegion)
      liveRegionRef.current = liveRegion
    }

    liveRegion.setAttribute('aria-live', priority)
    liveRegion.textContent = message

    // Clear after 3 seconds to avoid accumulation
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = ''
      }
    }, 3000)
  }, [])

  // Announce field update
  const announceUpdate = useCallback((fieldName: string, newValue: string) => {
    announceToScreenReader(`${fieldName} atualizado para ${newValue}`, 'polite')
  }, [announceToScreenReader])

  // Announce success message
  const announceSuccess = useCallback((message: string) => {
    announceToScreenReader(`✓ ${message}`, 'polite')
  }, [announceToScreenReader])

  // Announce error message
  const announceError = useCallback((message: string) => {
    announceToScreenReader(`✗ Erro: ${message}`, 'assertive')
  }, [announceToScreenReader])

  // Generate unique IDs with prefix
  const getId = useCallback((prefix: string) => {
    if (!idCounterRef.current[prefix]) {
      idCounterRef.current[prefix] = 0
    }
    idCounterRef.current[prefix]++
    return `${prefix}-${idCounterRef.current[prefix]}`
  }, [])

  return {
    handleKeyDown,
    setFocusOnElement,
    setFocusOnId,
    focusFirst,
    focusLast,
    getNextIndex,
    getPreviousIndex,
    announceToScreenReader,
    announceUpdate,
    announceSuccess,
    announceError,
    getId,
  }
}

/**
 * Keyboard event utilities - detect common keyboard patterns
 */
export const KeyboardPattern = {
  isEscape: (e: React.KeyboardEvent) => e.key === 'Escape',
  isEnter: (e: React.KeyboardEvent) => e.key === 'Enter',
  isTab: (e: React.KeyboardEvent) => e.key === 'Tab',
  isArrowUp: (e: React.KeyboardEvent) => e.key === 'ArrowUp',
  isArrowDown: (e: React.KeyboardEvent) => e.key === 'ArrowDown',
  isArrowLeft: (e: React.KeyboardEvent) => e.key === 'ArrowLeft',
  isArrowRight: (e: React.KeyboardEvent) => e.key === 'ArrowRight',
  isHome: (e: React.KeyboardEvent) => e.key === 'Home',
  isEnd: (e: React.KeyboardEvent) => e.key === 'End',
  isSpace: (e: React.KeyboardEvent) => e.key === ' ',
  isDelete: (e: React.KeyboardEvent) => e.key === 'Delete',
  isBackspace: (e: React.KeyboardEvent) => e.key === 'Backspace',
  isCtrlA: (e: React.KeyboardEvent) => e.ctrlKey && e.key === 'a',
  isCtrlC: (e: React.KeyboardEvent) => e.ctrlKey && e.key === 'c',
  isCtrlV: (e: React.KeyboardEvent) => e.ctrlKey && e.key === 'v',
  isCtrlX: (e: React.KeyboardEvent) => e.ctrlKey && e.key === 'x',
}
