/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import './Notification.css'

type NotificationTone = 'success' | 'error' | 'info' | 'warning'

type NotificationItem = {
  id: number
  message: string
  type: NotificationTone
}

type NotificationContextType = {
  showNotification: (message: string, type?: NotificationTone) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
} satisfies Record<NotificationTone, typeof Info>

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const ids = useRef(0)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const removeNotification = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const showNotification = useCallback((message: string, type: NotificationTone = 'info') => {
    const id = ids.current++
    // Mantém no máximo 3 toasts visíveis
    setItems((current) => [...current.slice(-2), { id, message, type }])
    const timer = setTimeout(() => removeNotification(id), 4000)
    timers.current.set(id, timer)
  }, [removeNotification])

  // Cleanup de timers ao desmontar
  useEffect(() => {
    const currentTimers = timers.current
    return () => {
      currentTimers.forEach((t) => clearTimeout(t))
    }
  }, [])

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="notification-container">
        {items.map((item) => {
          const Icon = iconMap[item.type]
          return (
            <div key={item.id} className={`notification notification-${item.type}`} role="status" aria-live="polite">
              <div className="notification-body">
                <div className="notification-icon"><Icon size={15} /></div>
                <span className="notification-message">{item.message}</span>
                <button type="button" className="notification-close" onClick={() => removeNotification(item.id)} aria-label="Fechar notificação">
                  ×
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </NotificationContext.Provider>
  )
}