import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User } from 'lucide-react'
import axios from 'axios'
import { useAnalyses } from '../hooks/useAnalyses'

interface Message {
  id: number
  role: 'user' | 'assistant'
  text: string
  table?: {
    headers: string[]
    rows: (string | number)[][]
  }
}

let msgId = 0

const SUGGESTIONS = [
  "Show analysis history and takeaways",
  "Show total failures and analytics details",
  "What are my maintenance recommendations?"
]

export default function AIChatPanel() {
  const [open, setOpen]         = useState(false)
  const [input, setInput]       = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { id: ++msgId, role: 'assistant', text: "Hi! I'm PredictIQ's AI assistant. Ask me about your failure rates, trends, or maintenance recommendations." },
  ])
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLInputElement>(null)
  const { analyses }            = useAnalyses()

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const buildContext = () => {
    const totalAnalyses  = analyses.length
    const totalFailures  = analyses.reduce((s, a) => s + a.failureCount, 0)
    const totalRecords   = analyses.reduce((s, a) => s + a.totalRecords, 0)
    const overallRate    = totalRecords > 0 ? (totalFailures / totalRecords) * 100 : 0
    const recent         = analyses.slice(-3)
    const recentRecords  = recent.reduce((s, a) => s + a.totalRecords, 0)
    const recentFailures = recent.reduce((s, a) => s + a.failureCount, 0)
    const recentRate     = recentRecords > 0 ? (recentFailures / recentRecords) * 100 : 0
    const historyData    = analyses.slice(-5).map(a => ({
      timestamp: a.timestamp,
      records: a.totalRecords,
      failures: a.failureCount,
      high_risk: a.highRiskCount,
      rate: a.failureRate
    }))
    return { 
      total_analyses: totalAnalyses, 
      total_failures: totalFailures, 
      overall_rate: overallRate, 
      recent_failure_rate: recentRate,
      history: historyData
    }
  }

  const sendMessage = async (overrideText?: string) => {
    const text = overrideText || input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { id: ++msgId, role: 'user', text }])
    setLoading(true)
    try {
      const res = await axios.post('/api/chat', { message: text, context: buildContext() })
      setMessages(prev => [...prev, { 
        id: ++msgId, 
        role: 'assistant', 
        text: res.data.reply,
        table: res.data.table
      }])
    } catch {
      setMessages(prev => [...prev, { id: ++msgId, role: 'assistant', text: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
        aria-label="Open AI Chat"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-1.5rem)] h-[560px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-primary-600 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-white" />
              <span className="font-semibold text-white text-sm">PredictIQ Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-primary-600' : 'bg-gray-100'}`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Bot className="w-3.5 h-3.5 text-gray-600" />}
                </div>
                <div className="flex flex-col gap-2 max-w-[85%]">
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                  {msg.table && (
                    <div className="overflow-x-auto w-full bg-white border border-gray-200 rounded-xl shadow-sm mt-1">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-600">
                          <tr>
                            {msg.table.headers.map((h, i) => (
                              <th key={i} className="px-3 py-2 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {msg.table.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50/50">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-gray-600" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-gray-100 bg-gray-50/50">
            {SUGGESTIONS.map((sug, i) => (
              <button
                key={i}
                onClick={() => sendMessage(sug)}
                disabled={loading}
                className="text-xs bg-white border border-gray-200 text-primary-700 px-3 py-1.5 rounded-full shadow-sm hover:bg-primary-50 transition-colors disabled:opacity-50 text-left"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about failure rates, trends…"
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-7 h-7 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
