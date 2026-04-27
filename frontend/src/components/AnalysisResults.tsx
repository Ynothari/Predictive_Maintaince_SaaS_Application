import { useMemo, useState, useEffect, useRef } from 'react'
import { PredictionResponse, PredictionResult } from '../types'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  AlertTriangle, CheckCircle, AlertCircle, Activity,
  Wrench, Download, FileText, ChevronDown, ChevronUp, Info, X, Calendar,
} from 'lucide-react'

interface AnalysisResultsProps {
  data: PredictionResponse
}

type FilterType = 'all' | 'failures' | 'high_risk' | 'healthy'

// Feature importance weights derived from the trained Random Forest model
const FEATURE_IMPORTANCE: Record<string, number> = {
  'Tool wear [min]': 0.312,
  'Torque [Nm]': 0.278,
  'Rotational speed [rpm]': 0.198,
  'Air temperature [K]': 0.124,
  'Process temperature [K]': 0.088,
}

export default function AnalysisResults({ data }: AnalysisResultsProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [showExplainability, setShowExplainability] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setActiveFilter('all') }, [data])

  const filteredPredictions = useMemo(() => {
    switch (activeFilter) {
      case 'failures': return data.predictions.filter(p => p.will_fail)
      case 'high_risk': return data.predictions.filter(p => p.risk_level === 'High Risk')
      case 'healthy': return data.predictions.filter(p => !p.will_fail)
      default: return data.predictions
    }
  }, [data, activeFilter])

  const stats = useMemo(() => {
    const predictions = data.predictions
    const totalRecords = data.total_records
    const failures = predictions.filter(p => p.will_fail).length
    const noFailures = totalRecords - failures
    const highRisk = predictions.filter(p => p.risk_level === 'High Risk').length
    const mediumRisk = predictions.filter(p => p.risk_level === 'Medium Risk').length
    const lowRisk = predictions.filter(p => p.risk_level === 'Low Risk').length
    const reasonCounts: Record<string, number> = {}
    predictions.forEach(p => {
      if (p.failure_reason && p.failure_reason !== 'null') {
        reasonCounts[p.failure_reason] = (reasonCounts[p.failure_reason] || 0) + 1
      }
    })
    const avgProbability = predictions.reduce((sum, p) => sum + p.failure_probability, 0) / totalRecords
    return { totalRecords, failures, noFailures, failureRate: (failures / totalRecords * 100).toFixed(1), highRisk, mediumRisk, lowRisk, reasonCounts, avgProbability: (avgProbability * 100).toFixed(1) }
  }, [data])

  const PAGE_SIZE = 50
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortCol, setSortCol] = useState<'row' | 'probability' | 'risk'>('row')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedRow, setSelectedRow] = useState<PredictionResult | null>(null)

  useEffect(() => { setCurrentPage(1) }, [data, activeFilter])
  useEffect(() => { setCurrentPage(1) }, [searchQuery, sortCol, sortDir])

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const searchedAndSorted = useMemo(() => {
    let rows = [...filteredPredictions]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      rows = rows.filter(p =>
        String(p.row).toLowerCase().includes(q) ||
        (p.failure_reason ?? '').toLowerCase().includes(q) ||
        p.risk_level.toLowerCase().includes(q) ||
        p.recommendation.toLowerCase().includes(q)
      )
    }
    rows.sort((a, b) => {
      let diff = 0
      if (sortCol === 'row') diff = a.row - b.row
      if (sortCol === 'probability') diff = a.failure_probability - b.failure_probability
      if (sortCol === 'risk') {
        const order = { 'High Risk': 3, 'Medium Risk': 2, 'Low Risk': 1 }
        diff = (order[a.risk_level as keyof typeof order] ?? 0) - (order[b.risk_level as keyof typeof order] ?? 0)
      }
      return sortDir === 'asc' ? diff : -diff
    })
    return rows
  }, [filteredPredictions, searchQuery, sortCol, sortDir])

  const totalPages = Math.ceil(searchedAndSorted.length / PAGE_SIZE)
  const paginatedPredictions = searchedAndSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const SortIcon = ({ col }: { col: typeof sortCol }) => (
    <span className={`ml-1 text-xs ${sortCol === col ? 'text-primary-600' : 'text-gray-300'}`}>
      {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  const riskDistributionData = [
    { name: 'High Risk', value: stats.highRisk, color: '#ef4444' },
    { name: 'Medium Risk', value: stats.mediumRisk, color: '#f59e0b' },
    { name: 'Low Risk', value: stats.lowRisk, color: '#10b981' },
  ]

  const failureReasonData = Object.entries(stats.reasonCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const featureImportanceData = Object.entries(FEATURE_IMPORTANCE)
    .map(([name, value]) => ({ shortName: name.replace(/ \[.*\]/, ''), fullName: name, value: parseFloat((value * 100).toFixed(1)) }))
    .sort((a, b) => b.value - a.value)

  // CSV export
  const downloadCSV = () => {
    const csvContent = [
      ['Row', 'Will Fail', 'Probability', 'Risk Level', 'Failure Reason', 'Recommendation'],
      ...data.predictions.map(p => [
        p.row,
        p.will_fail ? 'Yes' : 'No',
        (p.failure_probability * 100).toFixed(2) + '%',
        p.risk_level,
        p.failure_reason || 'N/A',
        p.recommendation,
      ])
    ].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `failure-analysis-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Excel export
  const downloadExcel = async () => {
    try {
      const res = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `failure-analysis`,
          total_records: data.total_records,
          predictions: data.predictions,
          generated_at: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `failure-analysis-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Excel export failed:', err)
    }
  }

  // PDF export via browser print
  const downloadPDF = () => { window.print() }

  // Maintenance schedule download (Feature 12)
  const downloadSchedule = () => {
    const high = data.predictions.filter(p => p.risk_level === 'High Risk')
    const medium = data.predictions.filter(p => p.risk_level === 'Medium Risk')
    const low = data.predictions.filter(p => p.risk_level === 'Low Risk')
    const lines: string[] = [
      '='.repeat(60),
      'PREDICTIVE MAINTENANCE SCHEDULE',
      `Generated: ${new Date().toLocaleString()}`,
      `Total Machines: ${data.total_records}`,
      '='.repeat(60),
      '',
      '--- HIGH RISK: IMMEDIATE ACTION REQUIRED ---',
      ...(high.length === 0 ? ['  None'] : high.map(p =>
        `  Machine #${p.row} | Prob: ${(p.failure_probability * 100).toFixed(1)}% | ${p.failure_reason || 'Unknown'}\n    → ${p.recommendation}`
      )),
      '',
      '--- MEDIUM RISK: ACTION WITHIN 7 DAYS ---',
      ...(medium.length === 0 ? ['  None'] : medium.map(p =>
        `  Machine #${p.row} | Prob: ${(p.failure_probability * 100).toFixed(1)}% | ${p.failure_reason || 'Unknown'}\n    → ${p.recommendation}`
      )),
      '',
      '--- LOW RISK: MONTHLY CHECK ---',
      ...(low.length === 0 ? ['  None'] : low.map(p =>
        `  Machine #${p.row} | Prob: ${(p.failure_probability * 100).toFixed(1)}%\n    → ${p.recommendation}`
      )),
      '',
      '='.repeat(60),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `maintenance-schedule-${new Date().toISOString().split('T')[0]}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div ref={printRef} className="mt-8 space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>
          <p className="text-gray-500 mt-1 text-sm">
            Analyzed {stats.totalRecords.toLocaleString()} records · 98.82% model accuracy · Avg failure probability: {stats.avgProbability}%
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button onClick={downloadCSV} className="btn btn-secondary text-sm">
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button onClick={downloadExcel} className="btn btn-secondary text-sm">
            <FileText className="w-4 h-4 text-green-600" />
            Excel
          </button>
          <button onClick={downloadSchedule} className="btn btn-secondary text-sm">
            <Calendar className="w-4 h-4" />
            Schedule
          </button>
          <button onClick={downloadPDF} className="btn btn-primary text-sm">
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            filter: 'all' as FilterType,
            label: 'Total Records',
            value: stats.totalRecords,
            sub: '100% of dataset',
            icon: Activity,
            gradient: 'from-blue-50 to-blue-100/60',
            border: 'border-blue-100',
            ring: 'ring-blue-500',
            iconColor: 'text-blue-500',
            textColor: 'text-blue-900',
          },
          {
            filter: 'failures' as FilterType,
            label: 'Predicted Failures',
            value: stats.failures,
            sub: `${stats.failureRate}% of total`,
            icon: AlertTriangle,
            gradient: 'from-red-50 to-red-100/60',
            border: 'border-red-100',
            ring: 'ring-red-500',
            iconColor: 'text-red-500',
            textColor: 'text-red-900',
          },
          {
            filter: 'high_risk' as FilterType,
            label: 'High Risk Items',
            value: stats.highRisk,
            sub: 'Immediate action needed',
            icon: AlertCircle,
            gradient: 'from-orange-50 to-orange-100/60',
            border: 'border-orange-100',
            ring: 'ring-orange-500',
            iconColor: 'text-orange-500',
            textColor: 'text-orange-900',
          },
          {
            filter: 'healthy' as FilterType,
            label: 'Healthy Items',
            value: stats.noFailures,
            sub: 'No action required',
            icon: CheckCircle,
            gradient: 'from-green-50 to-green-100/60',
            border: 'border-green-100',
            ring: 'ring-green-500',
            iconColor: 'text-green-500',
            textColor: 'text-green-900',
          },
        ].map(({ filter, label, value, sub, icon: Icon, gradient, border, ring, iconColor, textColor }) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(activeFilter === filter ? 'all' : filter)}
            className={`bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-5 text-left w-full transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${activeFilter === filter ? `ring-2 ring-offset-2 ${ring} shadow-md` : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className={`text-sm font-semibold ${textColor}`}>{label}</p>
              <Icon className={`w-5 h-5 ${iconColor} opacity-60`} />
            </div>
            <p className={`text-3xl font-bold ${textColor} leading-none mb-1`}>{value.toLocaleString()}</p>
            <p className={`text-xs ${textColor} opacity-60`}>{sub}</p>
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="section-title">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
              <Pie data={riskDistributionData} cx="50%" cy="50%" outerRadius={90} dataKey="value">
                {riskDistributionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [v, 'Count']} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="section-title">Top Failure Reasons</h3>
          {failureReasonData.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">No failures detected</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={failureReasonData} margin={{ top: 5, right: 20, bottom: 55, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Feature Explainability Panel */}
      <div className="card no-print">
        <button
          onClick={() => setShowExplainability(!showExplainability)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary-600" />
            <h3 className="section-title mb-0">Feature Importance — What Drives Predictions?</h3>
          </div>
          {showExplainability ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showExplainability && (
          <div className="mt-5 animate-slide-up">
            <p className="text-sm text-gray-500 mb-5">
              These are the global feature importances from the trained Random Forest model — showing which sensor readings have the most influence on failure predictions across all rows.
            </p>
            <div className="space-y-3">
              {featureImportanceData.map(({ shortName: _s, fullName, value }) => (
                <div key={fullName}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{fullName}</span>
                    <span className="text-sm font-bold text-primary-600">{value}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-700"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {value >= 25 ? 'High impact — most influential predictor' :
                      value >= 15 ? 'Medium impact — significant contributor' :
                        'Lower impact — supporting predictor'}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
              <strong>How to read this:</strong> Tool wear and torque are the strongest predictors of machine failure in this dataset. Machines with high tool wear (above ~200 min) combined with high torque are most likely to fail. Monitor these two sensors most closely.
            </div>
          </div>
        )}
      </div>

      {/* Predictions Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="section-title mb-0">Detailed Predictions</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by row, reason, risk…"
              className="input py-1.5 text-sm w-52"
            />
            <span className="text-sm text-gray-400">
              {searchedAndSorted.length === 0
                ? 'No records'
                : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, searchedAndSorted.length)} of ${searchedAndSorted.length.toLocaleString()}`}
            </span>
          </div>
        </div>

        {activeFilter !== 'all' && (
          <div className="mb-4 flex items-center gap-2">
            <span className="badge-blue">Filter: {activeFilter.replace('_', ' ')}</span>
            <button onClick={() => setActiveFilter('all')} className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-600" onClick={() => toggleSort('row')}>
                  Row <SortIcon col="row" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-600" onClick={() => toggleSort('probability')}>
                  Probability <SortIcon col="probability" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-600" onClick={() => toggleSort('risk')}>
                  Risk Level <SortIcon col="risk" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Failure Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Recommendation</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {paginatedPredictions.map((prediction) => (
                <tr
                  key={prediction.row}
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedRow(prediction)}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-500">#{prediction.row}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {prediction.will_fail
                      ? <span className="badge-red"><AlertTriangle className="w-3 h-3" />Failure</span>
                      : <span className="badge-green"><CheckCircle className="w-3 h-3" />Healthy</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${prediction.failure_probability >= 0.8 ? 'bg-red-400' : prediction.failure_probability >= 0.5 ? 'bg-orange-400' : 'bg-green-400'}`}
                          style={{ width: `${prediction.failure_probability * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700">{(prediction.failure_probability * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={
                      prediction.risk_level === 'High Risk' ? 'badge-red' :
                        prediction.risk_level === 'Medium Risk' ? 'badge-orange' : 'badge-green'
                    }>
                      {prediction.risk_level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {prediction.failure_reason && prediction.failure_reason !== 'null' ? prediction.failure_reason : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-3 h-3 flex-shrink-0" />
                      {prediction.recommendation}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedPredictions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    No records match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn btn-secondary text-sm disabled:opacity-40">
              Previous
            </button>
            <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn btn-secondary text-sm disabled:opacity-40">
              Next
            </button>
          </div>
        )}
      </div>

      {/* Machine drill-down modal */}
      {selectedRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedRow(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Machine #{selectedRow.row}</h3>
              <button onClick={() => setSelectedRow(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2 mb-5">
              {selectedRow.will_fail
                ? <span className="badge-red text-sm"><AlertTriangle className="w-4 h-4" />Predicted Failure</span>
                : <span className="badge-green text-sm"><CheckCircle className="w-4 h-4" />Healthy</span>}
              <span className={
                selectedRow.risk_level === 'High Risk' ? 'badge-red' :
                  selectedRow.risk_level === 'Medium Risk' ? 'badge-orange' : 'badge-green'
              }>{selectedRow.risk_level}</span>
            </div>

            {/* Failure probability gauge */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700">Failure Probability</span>
                <span className="text-sm font-bold text-gray-900">{(selectedRow.failure_probability * 100).toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${selectedRow.failure_probability >= 0.8 ? 'bg-red-500' :
                      selectedRow.failure_probability >= 0.5 ? 'bg-orange-400' : 'bg-green-400'
                    }`}
                  style={{ width: `${selectedRow.failure_probability * 100}%` }}
                />
              </div>
              {(selectedRow.confidence_low !== undefined && selectedRow.confidence_high !== undefined &&
                (selectedRow.confidence_low > 0 || selectedRow.confidence_high > 0)) && (
                  <p className="text-xs text-gray-400 mt-1">
                    Confidence range: {(selectedRow.confidence_low * 100).toFixed(1)}% – {(selectedRow.confidence_high * 100).toFixed(1)}%
                  </p>
                )}
            </div>

            {/* Details */}
            <div className="space-y-3 text-sm">
              <div className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="font-medium text-gray-500 w-32 flex-shrink-0">Failure Reason</span>
                <span className="text-gray-800">
                  {selectedRow.failure_reason && selectedRow.failure_reason !== 'null'
                    ? selectedRow.failure_reason : '—'}
                </span>
              </div>
              <div className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="font-medium text-gray-500 w-32 flex-shrink-0">Recommendation</span>
                <span className="text-gray-800 flex items-start gap-1.5">
                  <Wrench className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                  {selectedRow.recommendation}
                </span>
              </div>
            </div>

            {/* SHAP contributors */}
            {selectedRow.shap_contributors && selectedRow.shap_contributors.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Why this prediction?</p>
                <div className="space-y-2">
                  {selectedRow.shap_contributors.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs">
                      <span className="font-medium text-gray-700 truncate max-w-[160px]">{c.feature}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${c.direction === 'increases' ? 'text-red-600' : 'text-green-600'}`}>
                          {c.direction === 'increases' ? '↑' : '↓'} {c.direction} risk
                        </span>
                        <span className={`badge text-[10px] px-1.5 py-0.5 ${c.magnitude === 'high' ? 'bg-red-100 text-red-700' :
                            c.magnitude === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                          }`}>{c.magnitude}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setSelectedRow(null)} className="btn btn-secondary w-full mt-5">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
