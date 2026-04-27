import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts'
import { BarChart2, TrendingUp, AlertTriangle, Activity, CheckCircle, Info } from 'lucide-react'
import { useAnalyses } from '../hooks/useAnalyses'

const RISK_COLORS = ['#ef4444', '#f59e0b', '#10b981']

export default function AnalyticsPage() {
  const { analyses: history, loading } = useAnalyses()
  const navigate = useNavigate()

  const totalHighRisk   = history.reduce((s, r) => s + r.highRiskCount, 0)
  const totalMediumRisk = history.reduce((s, r) => s + (r.mediumRiskCount ?? 0), 0)
  const totalFailures   = history.reduce((s, r) => s + r.failureCount, 0)
  const totalRecords    = history.reduce((s, r) => s + r.totalRecords, 0)
  const totalLowRisk    = Math.max(0, totalFailures - totalHighRisk - totalMediumRisk)
  const overallRate     = totalRecords > 0 ? ((totalFailures / totalRecords) * 100).toFixed(1) : '0.0'
  const avgPerAnalysis  = history.length > 0 ? (totalFailures / history.length).toFixed(1) : '0'

  const lineData = history.map(r => ({
    date:     new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    failures: r.failureCount,
    rate:     parseFloat(((r.failureCount / Math.max(r.totalRecords, 1)) * 100).toFixed(1)),
  }))

  const pieData = [
    { name: 'High Risk',   value: totalHighRisk },
    { name: 'Medium Risk', value: totalMediumRisk },
    { name: 'Low Risk',    value: totalLowRisk },
  ]

  const summaryCards = [
    { label: 'Total Analyses', value: history.length,               icon: BarChart2,    color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Total Records',  value: totalRecords.toLocaleString(), icon: Activity,     color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Failures', value: totalFailures,                 icon: AlertTriangle, color: 'text-red-500',   bg: 'bg-red-50' },
    { label: 'Overall Rate',   value: `${overallRate}%`,             icon: TrendingUp,   color: 'text-amber-600',  bg: 'bg-amber-50' },
    { label: 'Avg / Analysis', value: avgPerAnalysis,                icon: CheckCircle,  color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'High Risk Total',value: totalHighRisk,                 icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' },
  ]

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Aggregated trends across all your analyses</p>
        </div>
        <div className="card flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <BarChart2 className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-600 font-medium mb-1">No data yet</p>
          <p className="text-gray-400 text-sm mb-6">Run an analysis to start seeing trends here</p>
          <button onClick={() => navigate('/app/upload')} className="btn btn-primary">Run Your First Analysis</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in space-y-6">
      <div className="page-header mb-0">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Aggregated trends across {history.length} {history.length === 1 ? 'analysis' : 'analyses'}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4 flex flex-col gap-2">
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="section-title">Failure Rate Over Time (%)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={lineData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip formatter={(v: number) => [`${v}%`, 'Failure Rate']} />
            <Area type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} fill="url(#rateGrad)" dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} name="Failure Rate" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="section-title">Failure Count Per Analysis</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="failures" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} name="Failures" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="section-title">Risk Distribution (All Time)</h2>
          {totalFailures === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">No failure data to display</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={RISK_COLORS[i % RISK_COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Top Failure Reasons</h2>
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
          <div>
            <p className="font-semibold">Per-reason breakdown available in live results</p>
            <p className="text-xs mt-0.5 text-blue-700">Run an analysis on the Upload page to see the Top Failure Reasons chart for that specific dataset.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
