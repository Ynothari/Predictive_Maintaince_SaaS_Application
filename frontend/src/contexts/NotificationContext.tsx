import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, AlertTriangle, CheckCircle, Info, Bell } from 'lucide-react'

export type NotifType = 'success' | 'warning' | 'error' | 'info'

export interface Notification {
  id: string
  type: NotifType
  title: string
  message: string
  timestamp: Date
  read: boolean
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isPanelOpen: boolean
  togglePanel: () => void
  addNotification: (type: NotifType, title: string, message: string) => void
  markAllRead: () => void
  dismiss: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const ICONS: Record<NotifType, typeof AlertTriangle> = {
  success: CheckCircle,
  warning: AlertTriangle,
  error:   AlertTriangle,
  info:    Info,
}

const COLORS: Record<NotifType, string> = {
  success: 'text-green-600 bg-green-100',
  warning: 'text-amber-600 bg-amber-100',
  error:   'text-red-600 bg-red-100',
  info:    'text-blue-600 bg-blue-100',
}

const BORDER: Record<NotifType, string> = {
  success: 'border-l-green-500',
  warning: 'border-l-amber-500',
  error:   'border-l-red-500',
  info:    'border-l-blue-500',
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60)  return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return date.toLocaleDateString()
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isPanelOpen, setIsPanelOpen]     = useState(false)
  const [toasts, setToasts]               = useState<Notification[]>([])

  const addNotification = useCallback((type: NotifType, title: string, message: string) => {
    const notif: Notification = {
      id: crypto.randomUUID(),
      type, title, message,
      timestamp: new Date(),
      read: false,
    }
    setNotifications(prev => [notif, ...prev].slice(0, 50))
    // Show toast for 5 seconds
    setToasts(prev => [notif, ...prev])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== notif.id)), 5000)
  }, [])

  const markAllRead  = useCallback(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))), [])
  const dismiss      = useCallback((id: string) => setNotifications(prev => prev.filter(n => n.id !== id)), [])
  const clearAll     = useCallback(() => setNotifications([]), [])
  const togglePanel  = useCallback(() => {
    setIsPanelOpen(v => !v)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, isPanelOpen, togglePanel, addNotification, markAllRead, dismiss, clearAll }}>
      {children}

      {/* Toast stack */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => {
          const Icon = ICONS[toast.type]
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 bg-white rounded-xl shadow-lg border border-gray-100 border-l-4 ${BORDER[toast.type]} p-4 w-80 animate-slide-up`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${COLORS[toast.type]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-gray-300 hover:text-gray-500 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Notification panel */}
      {isPanelOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={togglePanel} />
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100 animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-600" />
                <h2 className="font-semibold text-gray-900 text-sm">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600">Clear all</button>
                )}
                <button onClick={togglePanel} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">No notifications yet</p>
                  <p className="text-gray-400 text-xs mt-1">Alerts will appear here after analyses</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map(n => {
                    const Icon = ICONS[n.type]
                    return (
                      <div key={n.id} className={`flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${COLORS[n.type]}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.timestamp)}</p>
                        </div>
                        <button onClick={() => dismiss(n.id)} className="text-gray-200 hover:text-gray-400 flex-shrink-0 mt-0.5">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
