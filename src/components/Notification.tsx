/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import './Notification.css'

type NotificationTone = 'success' | 'error' | 'info'

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
} satisfies Record<NotificationTone, typeof Info>

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
  })
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
    setItems((current) => [...current.slice(-2), { id, message, type }])
    const timer = setTimeout(() => removeNotification(id), 5000)
    timers.current.set(id, timer)
  }, [removeNotification])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 768px)')
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className={`notification-container ${isMobile ? 'notification-container-mobile' : 'notification-container-desktop'}`}>
        {items.map((item) => {
          const Icon = iconMap[item.type]
          return (
            <div key={item.id} className={`notification notification-${item.type}`} role="status" aria-live="polite">
              <div className="notification-body">
                <div className="notification-icon"><Icon size={18} /></div>
                <span className="notification-message">{item.message}</span>
                <button type="button" className="notification-close" onClick={() => removeNotification(item.id)} aria-label="Fechar notificação">
                  ×
                </button>
              </div>
              <span className="notification-progress" />
            </div>
          )
        })}
      </div>
    </NotificationContext.Provider>
  )
}