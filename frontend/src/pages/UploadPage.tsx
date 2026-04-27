import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import FileUpload from '../components/FileUpload'
import AnalysisResults from '../components/AnalysisResults'
import { PredictionResponse } from '../types'
import axios from 'axios'
import { Clock, X, CheckCircle } from 'lucide-react'

export default function UploadPage() {
  const { token, user }         = useAuth()
  const { addNotification }     = useNotifications()
  const [analysisData, setData] = useState<PredictionResponse | null>(null)
  const [loading, setLoading]   = useState(false)
  const [lastFile, setLastFile] = useState<File | null>(null)

  // Schedule modal state
  const [showSchedule, setShowSchedule]     = useState(false)
  const [scheduleValue, setScheduleValue]   = useState('daily')
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState(false)

  const handleAnalysisComplete = async (data: PredictionResponse, file?: File) => {
    setData(data)
    setLoading(false)
    if (file) setLastFile(file)

    const failureCount    = data.predictions.filter(p => p.will_fail).length
    const highRiskCount   = data.predictions.filter(p => p.risk_level === 'High Risk').length
    const mediumRiskCount = data.predictions.filter(p => p.risk_level === 'Medium Risk').length
    const failureRate     = parseFloat(((failureCount / data.total_records) * 100).toFixed(1))

    // Save to backend database
    try {
      await axios.post('/api/analyses', {
        timestamp:          new Date().toISOString(),
        total_records:      data.total_records,
        failure_count:      failureCount,
        high_risk_count:    highRiskCount,
        medium_risk_count:  mediumRiskCount,
        failure_rate:       failureRate,
      }, { headers: { Authorization: `Bearer ${token}` } })
    } catch (err) {
      console.error('Failed to save analysis to database:', err)
    }

    // Threshold alert
    const thresholdKey = `threshold_${user?.username}`
    const threshold = parseInt(localStorage.getItem(thresholdKey) ?? '15', 10)
    if (failureRate > threshold) {
      addNotification('error', 'Threshold Exceeded',
        `Failure rate ${failureRate}% exceeds your alert threshold of ${threshold}%. Immediate review recommended.`)
    }

    // Fire notifications
    if (highRiskCount > 0) {
      addNotification('error', `${highRiskCount} High-Risk Machine${highRiskCount > 1 ? 's' : ''} Detected`,
        `Immediate maintenance required for ${highRiskCount} machine${highRiskCount > 1 ? 's' : ''} in your latest analysis.`)
    } else if (failureCount > 0) {
      addNotification('warning', `${failureCount} Predicted Failure${failureCount > 1 ? 's' : ''}`,
        `${failureRate}% failure rate detected across ${data.total_records.toLocaleString()} records.`)
    } else {
      addNotification('success', 'All Machines Healthy',
        `Analysis of ${data.total_records.toLocaleString()} records complete. No failures predicted.`)
    }
  }

  const handleAnalysisStart = () => { setLoading(true); setData(null) }

  const scheduleAnalysis = async () => {
    if (!lastFile) { addNotification('error', 'No file', 'Please run an analysis first.'); return }
    setScheduleLoading(true)
    try {
      const form = new FormData()
      form.append('file', lastFile)
      form.append('schedule', scheduleValue)
      await axios.post('/api/scheduler', form, { headers: { Authorization: `Bearer ${token}` } })
      setScheduleSuccess(true)
      addNotification('success', 'Analysis Scheduled', `Your analysis will run ${scheduleValue}.`)
      setTimeout(() => { setShowSchedule(false); setScheduleSuccess(false) }, 2000)
    } catch {
      addNotification('error', 'Schedule Failed', 'Could not schedule the analysis. Please try again.')
    } finally {
      setScheduleLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Upload & Analyze</h1>
        <p className="page-subtitle">Upload your machine sensor data to get AI-powered failure predictions.</p>
      </div>
      <FileUpload onAnalysisComplete={handleAnalysisComplete} onAnalysisStart={handleAnalysisStart} />
      {loading && (
        <div className="mt-8 card">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Analyzing your data…</p>
              <p className="text-gray-400 text-sm mt-1">Running ML models on all rows</p>
            </div>
          </div>
        </div>
      )}
      {analysisData && !loading && (
        <>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setShowSchedule(true)}
              className="btn btn-secondary text-sm"
            >
              <Clock className="w-4 h-4" />Schedule This Analysis
            </button>
            <button onClick={() => setData(null)} className="btn btn-secondary text-sm">↑ New Analysis</button>
          </div>
          <AnalysisResults data={analysisData} />
        </>
      )}

      {/* Schedule modal */}
      {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowSchedule(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-600" />Schedule Analysis
              </h3>
              <button onClick={() => setShowSchedule(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            {scheduleSuccess ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <p className="font-semibold text-gray-900">Analysis Scheduled!</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  This will re-run the same analysis automatically on your chosen schedule.
                </p>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Repeat</label>
                  <select
                    value={scheduleValue}
                    onChange={e => setScheduleValue(e.target.value)}
                    className="input"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowSchedule(false)} className="btn btn-secondary flex-1">Cancel</button>
                  <button onClick={scheduleAnalysis} disabled={scheduleLoading} className="btn btn-primary flex-1 disabled:opacity-50">
                    {scheduleLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Clock className="w-4 h-4" />}
                    Schedule
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
