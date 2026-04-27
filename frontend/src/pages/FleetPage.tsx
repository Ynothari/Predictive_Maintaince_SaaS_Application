import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnalyses } from '../hooks/useAnalyses'
import { Factory, AlertTriangle, CheckCircle, TrendingUp, Upload, Plus, X } from 'lucide-react'

interface FleetGroup {
  name: string
  analyses: number
  totalRecords: number
  totalFailures: number
  highRisk: number
  failureRate: number
  lastRun: string | null
  trend: 'up' | 'down' | 'stable' | 'none'
}

function getTrend(rates: number[]): 'up' | 'down' | 'stable' | 'none' {
  if (rates.length < 3) return 'none'
  const last3 = rates.slice(-3)
  const avg = (last3[0] + last3[1]) / 2
  if (last3[2] > avg * 1.2) return 'up'
  if (last3[2] < avg * 0.8) return 'down'
  return 'stable'
}

export default function FleetPage() {
  const { analyses, loading } = useAnalyses()
  const navigate              = useNavigate()

  // Fleet groups stored in localStorage per user
  const [groups, setGroups]     = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fleet_groups') ?? '["Line A","Line B","Line C"]') }
    catch { return ['Line A', 'Line B', 'Line C'] }
  })
  const [newGroup, setNewGroup] = useState('')
  const [showAdd, setShowAdd]   = useState(false)

  // Assign analyses to groups round-robin (demo — in production users would tag CSVs)
  const fleetData = useMemo<FleetGroup[]>(() => {
    return groups.map((name, gi) => {
      const groupAnalyses = analyses.filter((_, i) => i % groups.length === gi)
      const totalRecords  = groupAnalyses.reduce((s, a) => s + a.totalRecords, 0)
      const totalFailures = groupAnalyses.reduce((s, a) => s + a.failureCount, 0)
      const highRisk      = groupAnalyses.reduce((s, a) => s + a.highRiskCount, 0)
      const failureRate   = totalRecords > 0 ? parseFloat(((totalFailures / totalRecords) * 100).toFixed(1)) : 0
      const rates         = groupAnalyses.map(a => a.failureRate ?? 0)
      const lastRun       = groupAnalyses.at(-1)?.timestamp ?? null
      return { name, analyses: groupAnalyses.length, totalRecords, totalFailures, highRisk, failureRate, lastRun, trend: getTrend(rates) }
    })
  }, [analyses, groups])

  const addGroup = () => {
    const name = newGroup.trim()
    if (!name || groups.includes(name)) return
    const updated = [...groups, name]
    setGroups(updated)
    localStorage.setItem('fleet_groups', JSON.stringify(updated))
    setNewGroup('')
    setShowAdd(false)
  }

  const removeGroup = (name: string) => {
    const updated = groups.filter(g => g !== name)
    setGroups(updated)
    localStorage.setItem('fleet_groups', JSON.stringify(updated))
  }

  const overallHealth = fleetData.length > 0
    ? fleetData.reduce((s, g) => s + g.failureRate, 0) / fleetData.length
    : 0

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Factory className="w-6 h-6 text-primary-600" />Fleet Overview
          </h1>
          <p className="page-subtitle">Machine groups and aggregate health scores</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAdd(v => !v)} className="btn btn-secondary text-sm">
            <Plus className="w-4 h-4" />Add Group
          </button>
          <button onClick={() => navigate('/app/upload')} className="btn btn-primary text-sm">
            <Upload className="w-4 h-4" />New Analysis
          </button>
        </div>
      </div>

      {/* Add group inline */}
      {showAdd && (
        <div className="card mb-6 animate-slide-up flex items-center gap-3">
          <input
            type="text"
            value={newGroup}
            onChange={e => setNewGroup(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addGroup()}
            placeholder="Group name (e.g. Line D, Building 2)"
            className="input flex-1"
            autoFocus
          />
          <button onClick={addGroup} className="btn btn-primary text-sm">Add</button>
          <button onClick={() => setShowAdd(false)} className="btn btn-ghost p-2"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Overall health banner */}
      <div className={`card mb-6 border-2 ${overallHealth > 15 ? 'border-red-200 bg-red-50' : overallHealth > 5 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fleet Health Score</p>
            <div className="flex items-center gap-3">
              <span className={`text-4xl font-extrabold ${overallHealth > 15 ? 'text-red-600' : overallHealth > 5 ? 'text-amber-600' : 'text-green-600'}`}>
                {(100 - overallHealth).toFixed(0)}%
              </span>
              <span className="text-sm text-gray-500">({overallHealth.toFixed(1)}% avg failure rate)</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{fleetData.length}</p>
              <p className="text-xs text-gray-400">Groups</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{analyses.length}</p>
              <p className="text-xs text-gray-400">Analyses</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{fleetData.reduce((s, g) => s + g.highRisk, 0)}</p>
              <p className="text-xs text-gray-400">High Risk</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {fleetData.map(group => (
            <div key={group.name} className={`card border-2 transition-all hover:shadow-md ${
              group.failureRate > 15 ? 'border-red-200' :
              group.failureRate > 5  ? 'border-amber-200' : 'border-green-200'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    group.failureRate > 15 ? 'bg-red-500' :
                    group.failureRate > 5  ? 'bg-amber-400' : 'bg-green-500'
                  }`} />
                  <h3 className="font-semibold text-gray-900">{group.name}</h3>
                </div>
                <button onClick={() => removeGroup(group.name)} className="text-gray-200 hover:text-red-400 transition-colors p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Health bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Failure Rate</span>
                  <span className={`text-sm font-bold ${group.failureRate > 15 ? 'text-red-600' : group.failureRate > 5 ? 'text-amber-600' : 'text-green-600'}`}>
                    {group.failureRate}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${group.failureRate > 15 ? 'bg-red-500' : group.failureRate > 5 ? 'bg-amber-400' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(group.failureRate * 3, 100)}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400">Analyses</p>
                  <p className="font-semibold text-gray-800">{group.analyses}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400">High Risk</p>
                  <p className={`font-semibold ${group.highRisk > 0 ? 'text-red-600' : 'text-gray-800'}`}>{group.highRisk}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400">Total Records</p>
                  <p className="font-semibold text-gray-800">{group.totalRecords.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400">Failures</p>
                  <p className={`font-semibold ${group.totalFailures > 0 ? 'text-red-600' : 'text-gray-800'}`}>{group.totalFailures}</p>
                </div>
              </div>

              {/* Trend + status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs">
                  {group.trend === 'up'     && <><TrendingUp className="w-3.5 h-3.5 text-red-500" /><span className="text-red-500">Worsening</span></>}
                  {group.trend === 'down'   && <><TrendingUp className="w-3.5 h-3.5 text-green-500 rotate-180" /><span className="text-green-500">Improving</span></>}
                  {group.trend === 'stable' && <span className="text-gray-400">Stable</span>}
                  {group.trend === 'none'   && <span className="text-gray-300">No trend data</span>}
                </div>
                {group.analyses === 0
                  ? <span className="text-xs text-gray-300">No data</span>
                  : group.failureRate === 0
                    ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3.5 h-3.5" />Healthy</span>
                    : <span className="flex items-center gap-1 text-xs text-red-600"><AlertTriangle className="w-3.5 h-3.5" />Needs attention</span>}
              </div>

              {group.lastRun && (
                <p className="text-[10px] text-gray-300 mt-2">
                  Last: {new Date(group.lastRun).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
