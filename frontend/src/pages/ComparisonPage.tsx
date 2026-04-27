import { useState } from 'react'
import { useAnalyses } from '../hooks/useAnalyses'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { GitCompare, BarChart2 } from 'lucide-react'

function fmt(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatCard({ label, a, b }: { label: string; a: number | string; b: number | string }) {
  return (
    <div className="grid grid-cols-3 items-center py-2.5 border-b border-gray-50 last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-center font-semibold text-blue-700">{a}</span>
      <span className="text-center font-semibold text-purple-700">{b}</span>
    </div>
  )
}

export default function ComparisonPage() {
  const { analyses, loading } = useAnalyses()
  const [idA, setIdA] = useState<number | ''>('')
  const [idB, setIdB] = useState<number | ''>('')

  const recA = analyses.find(a => a.id === idA) ?? null
  const recB = analyses.find(a => a.id === idB) ?? null

  const chartData = recA && recB ? [
    { name: 'Failures',   A: recA.failureCount,  B: recB.failureCount },
    { name: 'High Risk',  A: recA.highRiskCount, B: recB.highRiskCount },
    { name: 'Med Risk',   A: recA.mediumRiskCount, B: recB.mediumRiskCount },
  ] : []

  const options = [...analyses].reverse()

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Compare Analyses</h1>
        <p className="page-subtitle">Select two analyses to compare side-by-side</p>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : analyses.length < 2 ? (
        <div className="card flex flex-col items-center justify-center py-24 text-center">
          <BarChart2 className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-600 font-medium mb-1">Not enough data</p>
          <p className="text-gray-400 text-sm">You need at least 2 analyses to compare.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { label: 'Analysis A', value: idA, set: setIdA, color: 'text-blue-700' },
              { label: 'Analysis B', value: idB, set: setIdB, color: 'text-purple-700' },
            ] as const).map(({ label, value, set, color }) => (
              <div key={label} className="card">
                <label className={`block text-sm font-semibold ${color} mb-2`}>{label}</label>
                <select
                  value={value}
                  onChange={e => set(e.target.value ? Number(e.target.value) : '')}
                  className="input text-sm"
                >
                  <option value="">Select an analysis…</option>
                  {options.map(a => (
                    <option key={a.id} value={a.id}>
                      {fmt(a.timestamp)} — {a.totalRecords} records, {a.failureCount} failures ({a.failureRate}%)
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {(!recA || !recB) && (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <GitCompare className="w-12 h-12 text-gray-200 mb-4" />
              <p className="text-gray-500 text-sm">Select analyses to compare</p>
            </div>
          )}

          {/* Comparison */}
          {recA && recB && (
            <>
              {/* Side-by-side cards */}
              <div className="card">
                <div className="grid grid-cols-3 text-xs font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100 mb-1">
                  <span>Metric</span>
                  <span className="text-center text-blue-600">Analysis A</span>
                  <span className="text-center text-purple-600">Analysis B</span>
                </div>
                <StatCard label="Date"          a={fmt(recA.timestamp)}       b={fmt(recB.timestamp)} />
                <StatCard label="Total Records" a={recA.totalRecords}         b={recB.totalRecords} />
                <StatCard label="Failures"      a={recA.failureCount}         b={recB.failureCount} />
                <StatCard label="Failure Rate"  a={`${recA.failureRate}%`}    b={`${recB.failureRate}%`} />
                <StatCard label="High Risk"     a={recA.highRiskCount}        b={recB.highRiskCount} />
                <StatCard label="Medium Risk"   a={recA.mediumRiskCount}      b={recB.mediumRiskCount} />
              </div>

              {/* Bar chart */}
              <div className="card">
                <h2 className="section-title">Comparison Chart</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="A" name="Analysis A" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="B" name="Analysis B" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
