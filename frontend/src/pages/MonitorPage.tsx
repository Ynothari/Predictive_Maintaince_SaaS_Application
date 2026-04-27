import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Activity, Wifi, WifiOff, Plus, Trash2, AlertTriangle, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface SensorInput {
  id: string
  machine_id: string
  air_temp: string
  process_temp: string
  rpm: string
  torque: string
  tool_wear: string
}

interface MachineStatus {
  machine_id: string
  will_fail: boolean
  failure_probability: number
  risk_level: string
  failure_reason: string | null
  recommendation: string
  timestamp: string
  status: 'ok' | 'error' | 'pending'
}

const DEFAULT_SENSOR: Omit<SensorInput, 'id' | 'machine_id'> = {
  air_temp: '298',
  process_temp: '308',
  rpm: '1500',
  torque: '40',
  tool_wear: '100',
}

function riskColor(risk: string) {
  if (risk === 'High Risk')   return 'text-red-600 bg-red-50 border-red-200'
  if (risk === 'Medium Risk') return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-green-600 bg-green-50 border-green-200'
}

function probBar(prob: number) {
  const pct = Math.round(prob * 100)
  const color = prob >= 0.8 ? 'bg-red-500' : prob >= 0.5 ? 'bg-amber-400' : 'bg-green-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-10 text-right">{pct}%</span>
    </div>
  )
}

export default function MonitorPage() {
  const { token: _token } = useAuth()
  const wsRef     = useRef<WebSocket | null>(null)
  const [connected, setConnected]   = useState(false)
  const [machines, setMachines]     = useState<SensorInput[]>([
    { id: '1', machine_id: 'M-001', ...DEFAULT_SENSOR },
  ])
  const [results, setResults]       = useState<Record<string, MachineStatus>>({})
  const [autoRefresh, setAutoRefresh] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Connect WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/monitor`)
    ws.onopen  = () => { setConnected(true) }
    ws.onclose = () => { setConnected(false); wsRef.current = null }
    ws.onerror = () => { setConnected(false) }
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'pong') return
        if (data.machine_id) {
          setResults(prev => ({
            ...prev,
            [data.machine_id]: { ...data, status: 'ok' },
          }))
        }
      } catch {}
    }
    wsRef.current = ws
  }, [])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    setConnected(false)
  }, [])

  useEffect(() => {
    connect()
    return () => { disconnect(); if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [connect, disconnect])

  // Send all machines to WS
  const sendAll = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    machines.forEach(m => {
      wsRef.current!.send(JSON.stringify({
        machine_id:   m.machine_id,
        air_temp:     parseFloat(m.air_temp)     || 298,
        process_temp: parseFloat(m.process_temp) || 308,
        rpm:          parseFloat(m.rpm)          || 1500,
        torque:       parseFloat(m.torque)       || 40,
        tool_wear:    parseFloat(m.tool_wear)    || 0,
      }))
    })
  }, [machines])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(sendAll, 3000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, sendAll])

  const addMachine = () => {
    const id = String(Date.now())
    setMachines(prev => [...prev, { id, machine_id: `M-00${prev.length + 1}`, ...DEFAULT_SENSOR }])
  }

  const removeMachine = (id: string) => {
    setMachines(prev => prev.filter(m => m.id !== id))
  }

  const updateField = (id: string, field: keyof SensorInput, value: string) => {
    setMachines(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m))
  }

  const highRiskCount  = Object.values(results).filter(r => r.risk_level === 'High Risk').length
  const failureCount   = Object.values(results).filter(r => r.will_fail).length

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-600" />
            Live Monitor
          </h1>
          <p className="page-subtitle">Real-time machine failure prediction via WebSocket</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border ${
            connected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          {!connected && (
            <button onClick={connect} className="btn btn-secondary text-sm">
              <RefreshCw className="w-4 h-4" />Reconnect
            </button>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded accent-primary-600" />
            Auto-refresh (3s)
          </label>
          <button onClick={sendAll} disabled={!connected} className="btn btn-primary text-sm disabled:opacity-50">
            <Activity className="w-4 h-4" />Analyze All
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {Object.keys(results).length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Machines Monitored', value: Object.keys(results).length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Predicted Failures',  value: failureCount,   color: 'text-red-600',   bg: 'bg-red-50' },
            { label: 'High Risk',           value: highRiskCount,  color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                <Activity className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Machine cards */}
      <div className="space-y-4">
        {machines.map(m => {
          const result = results[m.machine_id]
          return (
            <div key={m.id} className={`card border-2 transition-all ${
              result?.risk_level === 'High Risk'   ? 'border-red-200' :
              result?.risk_level === 'Medium Risk' ? 'border-amber-200' :
              result ? 'border-green-200' : 'border-gray-100'
            }`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Inputs */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      value={m.machine_id}
                      onChange={e => updateField(m.id, 'machine_id', e.target.value)}
                      className="input w-28 text-sm font-semibold py-1.5"
                      placeholder="Machine ID"
                    />
                    {result && (
                      <span className={`badge border text-xs ${riskColor(result.risk_level)}`}>
                        {result.risk_level}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { field: 'air_temp',     label: 'Air Temp (K)' },
                      { field: 'process_temp', label: 'Process Temp (K)' },
                      { field: 'rpm',          label: 'RPM' },
                      { field: 'torque',       label: 'Torque (Nm)' },
                      { field: 'tool_wear',    label: 'Tool Wear (min)' },
                    ].map(({ field, label }) => (
                      <div key={field}>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</label>
                        <input
                          type="number"
                          value={m[field as keyof SensorInput]}
                          onChange={e => updateField(m.id, field as keyof SensorInput, e.target.value)}
                          className="input text-sm py-1.5 text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Result panel */}
                <div className="w-64 flex-shrink-0">
                  {result ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {result.will_fail
                          ? <span className="badge-red text-xs"><AlertTriangle className="w-3 h-3" />Failure Predicted</span>
                          : <span className="badge-green text-xs"><CheckCircle className="w-3 h-3" />Healthy</span>}
                      </div>
                      {probBar(result.failure_probability)}
                      {result.failure_reason && (
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Reason:</span> {result.failure_reason}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">Action:</span> {result.recommendation}
                      </p>
                      <p className="text-[10px] text-gray-300">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-300 text-sm py-4">
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      Not analyzed yet
                    </div>
                  )}
                </div>

                {/* Delete */}
                {machines.length > 1 && (
                  <button onClick={() => removeMachine(m.id)} className="text-gray-300 hover:text-red-500 transition-colors mt-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add machine */}
      <button onClick={addMachine} className="mt-4 btn btn-secondary w-full text-sm">
        <Plus className="w-4 h-4" />Add Machine
      </button>
    </div>
  )
}
