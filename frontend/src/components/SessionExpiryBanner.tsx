import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { jwtDecode } from 'jwt-decode'
import { Clock, X } from 'lucide-react'

const WARN_BEFORE_MS = 5 * 60 * 1000 // 5 minutes

export default function SessionExpiryBanner() {
  const { token, logout } = useAuth()
  const [show, setShow]   = useState(false)
  const [minsLeft, setMinsLeft] = useState(5)

  useEffect(() => {
    if (!token) { setShow(false); return }

    const check = () => {
      try {
        const decoded: any = jwtDecode(token)
        const msLeft = decoded.exp * 1000 - Date.now()
        if (msLeft <= 0) {
          logout()
          return
        }
        if (msLeft <= WARN_BEFORE_MS) {
          setMinsLeft(Math.max(1, Math.ceil(msLeft / 60000)))
          setShow(true)
        } else {
          setShow(false)
        }
      } catch {
        logout()
      }
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [token, logout])

  if (!show) return null

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-2xl shadow-lg px-5 py-3 text-sm text-amber-800">
        <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>Your session expires in <strong>{minsLeft} minute{minsLeft !== 1 ? 's' : ''}</strong>. Please save your work.</span>
        <button onClick={() => setShow(false)} className="text-amber-500 hover:text-amber-700 ml-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
