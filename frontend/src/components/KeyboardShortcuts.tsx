import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Keyboard, X } from 'lucide-react'

const SHORTCUTS = [
  { keys: 'Ctrl + U', description: 'Go to Upload' },
  { keys: 'Ctrl + D', description: 'Go to Dashboard' },
  { keys: 'Ctrl + H', description: 'Go to History' },
  { keys: '?',        description: 'Show this shortcuts panel' },
]

export default function KeyboardShortcuts() {
  const navigate          = useNavigate()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.ctrlKey && e.key === 'u') { e.preventDefault(); navigate('/app/upload') }
      else if (e.ctrlKey && e.key === 'd') { e.preventDefault(); navigate('/app/dashboard') }
      else if (e.ctrlKey && e.key === 'h') { e.preventDefault(); navigate('/app/history') }
      else if (e.key === '?') { setShowModal(v => !v) }
      else if (e.key === 'Escape') { setShowModal(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  if (!showModal) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={() => setShowModal(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary-600" />Keyboard Shortcuts
          </h3>
          <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-50">
            {SHORTCUTS.map(({ keys, description }) => (
              <tr key={keys}>
                <td className="py-2.5 pr-4">
                  <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs font-mono text-gray-700">{keys}</kbd>
                </td>
                <td className="py-2.5 text-gray-600">{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-4 text-center">Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono">Esc</kbd> or click outside to close</p>
      </div>
    </div>
  )
}
