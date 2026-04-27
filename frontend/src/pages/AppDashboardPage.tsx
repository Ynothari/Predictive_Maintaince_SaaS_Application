import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { BarChart2, AlertTriangle, Activity, TrendingUp, TrendingDown, Clock, Zap, Minus, Settings2 } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { DraggableDashboard, useDashboardCards } from '../components/DraggableDashboard'
import axios from 'axios'
import { supabase } from '../utils/supabaseClient'
import { useEffect } from 'react'

function getTrend(history: { failureCount: number; totalRecords: number }[]): 'up' | 'down' | 'stable' | 'none' {
  if (history.length < 3) return 'none'
  const recent = history.slice(-3).map(r => r.failureCount / Math.max(r.totalRecords, 1))
  const avg01  = (recent[0] + recent[1]) / 2
  const latest = recent[2]
  if (latest > avg01 * 1.2) return 'up'
  if (latest < avg01 * 0.8) return 'down'
  return 'stable'
}

/** Simple linear regression: returns {slope, intercept} */
function linearRegression(xs: number[], ys: number[]) {
  const n = xs.length
  const sumX  = xs.reduce((a, b) => a + b, 0)
  const sumY  = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0)
  const sumX2 = xs.reduce((a, x) => a + x * x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

export default function AppDashboardPage() {
  const { user, token }                   = useAuth()
  const navigate                          = useNavigate()
  const { cards, reorder, toggleCard, resetLayout } = useDashboardCards()
  const [showCardSettings, setShowCardSettings] = useState(false)

  const [stats, setStats] = useState<{ totalAnalyses: number, totalRecords: number, totalFailures: number, overallRate: number, history: any[] } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/dashboard/stats', { headers: { Authorization: `Bearer ${token}` } })
      setStats(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchStats()
    const channel = supabase.channel('public:analyses').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'analyses' }, () => {
      fetchStats()
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [token])

  const history = stats?.history || []

  const totalAnalyses  = stats?.totalAnalyses || 0
  const mostRecentDate = history.at(-1)?.timestamp
    ? new Date(history.at(-1)!.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  const totalFailures  = stats?.totalFailures || 0
  const overallRate    = stats?.overallRate.toFixed(1) || '0.0'
  const recentAnalyses = [...history].reverse().slice(0, 5)
  const trend          = getTrend(history.map(a => ({ failureCount: a.failure_count, totalRecords: a.total_records })))

  // Trend forecast (last 5 analyses)
  const last5 = history.slice(-5)
  const forecastData = last5.map((a, i) => ({
    x: i,
    rate: parseFloat(((a.failure_count / Math.max(a.total_records, 1)) * 100).toFixed(2)),
  }))
  let predictedRate: number | null = null
  let forecastTrend: 'up' | 'down' | 'stable' = 'stable'
  if (last5.length >= 3) {
    const xs = forecastData.map(d => d.x)
    const ys = forecastData.map(d => d.rate)
    const { slope, intercept } = linearRegression(xs, ys)
    predictedRate = parseFloat((slope * last5.length + intercept).toFixed(1))
    predictedRate = Math.max(0, predictedRate)
    if (slope > 0.3) forecastTrend = 'up'
    else if (slope < -0.3) forecastTrend = 'down'
    else forecastTrend = 'stable'
  }
  // Sparkline data includes trend line point
  const sparklineData = forecastData.map(d => ({ rate: d.rate }))

  const summaryCards = [
    { id: 'total_analyses', label: 'Total Analyses', value: totalAnalyses,  sub: 'all time',          icon: BarChart2,    gradient: 'from-blue-50 to-blue-100/60',   iconColor: 'text-blue-600',   border: 'border-blue-100' },
    { id: 'last_analysis',  label: 'Last Analysis',  value: mostRecentDate, sub: 'most recent run',   icon: Clock,        gradient: 'from-purple-50 to-purple-100/60', iconColor: 'text-purple-600', border: 'border-purple-100' },
    { id: 'total_failures', label: 'Total Failures', value: totalFailures,  sub: `${overallRate}% overall`, icon: AlertTriangle, gradient: 'from-red-50 to-red-100/60', iconColor: 'text-red-500', border: 'border-red-100' },
    { id: 'model_accuracy', label: 'Model Accuracy', value: '98.82%',       sub: 'Random Forest',     icon: Zap,          gradient: 'from-green-50 to-green-100/60', iconColor: 'text-green-600',  border: 'border-green-100' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.username || user?.email?.split('@')[0] || 'Admin'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCardSettings(v => !v)}
            className="btn btn-ghost text-xs text-gray-500"
            title="Customize cards"
          >
            <Settings2 size={15} />
            {showCardSettings ? 'Done' : 'Customize'}
          </button>
          <button onClick={() => navigate('/app/upload')} className="btn btn-primary">
            <Activity size={16} />New Analysis
          </button>
        </div>
      </div>

      {/* Card visibility settings */}
      {showCardSettings && (
        <div className="card mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">Visible Cards</p>
            <button onClick={resetLayout} className="text-xs text-gray-400 hover:text-gray-600 underline">Reset layout</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {cards.map(card => (
              <button
                key={card.id}
                onClick={() => toggleCard(card.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  card.visible
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {card.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Drag cards to reorder. Click to show/hide.</p>
        </div>
      )}

      {trend === 'up' && (
        <div className="alert-warning mb-6 animate-slide-up">
          <TrendingUp className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div><p className="font-semibold">Failure rate trending upward</p><p className="text-amber-700 text-xs mt-0.5">Your last 3 analyses show an increasing failure rate.</p></div>
        </div>
      )}
      {trend === 'down' && (
        <div className="alert-success mb-6 animate-slide-up">
          <TrendingDown className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div><p className="font-semibold">Failure rate improving</p><p className="text-green-700 text-xs mt-0.5">Maintenance efforts are paying off.</p></div>
        </div>
      )}

      <div className="mb-8">
        <DraggableDashboard cards={cards} onReorder={reorder}>
        {(card) => {
          const cardData = summaryCards.find(c => c.id === card.id)
          if (!cardData) return <div key={card.id} />
          const Icon = cardData.icon
          return (
            <div className={`bg-gradient-to-br ${cardData.gradient} rounded-2xl border ${cardData.border} p-5 flex flex-col gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cardData.label}</span>
                <Icon className={`w-5 h-5 ${cardData.iconColor} opacity-70`} />
              </div>
              <span className="text-2xl font-bold text-gray-900 leading-none">{cardData.value}</span>
              <span className="text-xs text-gray-400">{cardData.sub}</span>
            </div>
          )
        }}
      </DraggableDashboard>
      </div>

      {/* Trend Forecast Card */}
      <div className="card mb-8 animate-slide-up">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          <h2 className="section-title mb-0">Trend Forecast</h2>
        </div>
        {last5.length < 3 ? (
          <p className="text-sm text-gray-400">Need 3+ analyses for forecast. Run more analyses to unlock predictions.</p>
        ) : (
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-gray-500 mb-1">Predicted failure rate next analysis</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{predictedRate}%</span>
                {forecastTrend === 'up'     && <TrendingUp   className="w-6 h-6 text-red-500" />}
                {forecastTrend === 'down'   && <TrendingDown className="w-6 h-6 text-green-500" />}
                {forecastTrend === 'stable' && <Minus        className="w-6 h-6 text-gray-400" />}
                <span className={`text-xs font-medium ${forecastTrend === 'up' ? 'text-red-500' : forecastTrend === 'down' ? 'text-green-500' : 'text-gray-400'}`}>
                  {forecastTrend === 'up' ? 'Increasing' : forecastTrend === 'down' ? 'Decreasing' : 'Stable'}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-[120px]">
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke={forecastTrend === 'up' ? '#ef4444' : forecastTrend === 'down' ? '#10b981' : '#9ca3af'}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Failure Rate']} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="card animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-800">System Analytics</h3>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">{history.length} Jobs</span>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <BarChart2 className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium mb-1">No analyses yet</p>
            <p className="text-gray-400 text-sm mb-6">Upload your first CSV to get started</p>
            <button onClick={() => navigate('/app/upload')} className="btn btn-primary">Run Your First Analysis</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  {['Date', 'Records', 'Failures', 'Failure Rate'].map(h => (
                    <th key={h} className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentAnalyses.map((r, i) => {
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3">
                        <div className="text-sm font-medium text-gray-900">{new Date(r.timestamp).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">Run #{history.length - i}</div>
                      </td>
                      <td className="px-4 py-3 align-middle text-sm font-medium text-gray-700">{r.total_records.toLocaleString()}</td>
                      <td className="px-4 py-3 align-middle">
                        {r.failure_count > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-semibold">
                            <AlertTriangle size={12} />{r.failure_count}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="text-sm font-medium text-gray-900">{((r.failure_count / Math.max(r.total_records, 1)) * 100).toFixed(1)}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
