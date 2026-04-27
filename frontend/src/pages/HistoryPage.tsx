import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../contexts/NotificationContext'
import { useAnalyses, AnalysisRecord } from '../hooks/useAnalyses'
import { History, Trash2, AlertTriangle, CheckCircle, Search, Upload, Pencil, Save, X, Eye } from 'lucide-react'
import axios from 'axios'

const PAGE_SIZE = 20

export default function HistoryPage() {
  const { addNotification }                                   = useNotifications()
  const { analyses, loading, deleteOne, deleteAll, updateNotes } = useAnalyses()
  const navigate                                              = useNavigate()
  const [search, setSearch]                                   = useState('')
  const [page, setPage]                                       = useState(1)
  const [deleteId, setDeleteId]                               = useState<number | null>(null)

  // Notes editing
  const [editNotesId, setEditNotesId]     = useState<number | null>(null)
  const [editNotesValue, setEditNotesValue] = useState('')
  const [notesSaving, setNotesSaving]     = useState(false)

  // Details Modal
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null)
  const [readings, setReadings]             = useState<any[]>([])
  const [loadingReadings, setLoadingReadings] = useState(false)

  const viewDetails = async (record: AnalysisRecord) => {
    setSelectedRecord(record)
    setLoadingReadings(true)
    try {
      const res = await axios.get(`/api/files/${record.fileId}/readings`)
      setReadings(res.data)
    } catch (e) {
      console.error(e)
    } finally { setLoadingReadings(false) }
  }

  const history  = [...analyses].reverse()
  const filtered = search.trim()
    ? history.filter(r =>
        new Date(r.timestamp).toLocaleDateString().includes(search) ||
        String(r.totalRecords).includes(search) ||
        String(r.failureCount).includes(search)
      )
    : history

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const doDelete = async (id: number) => {
    await deleteOne(id)
    setDeleteId(null)
    addNotification('info', 'Record Deleted', 'Analysis record removed from your history.')
  }

  const doDeleteAll = async () => {
    if (!window.confirm('Delete ALL analysis history? This cannot be undone.')) return
    await deleteAll()
    addNotification('info', 'History Cleared', 'All analysis history has been deleted.')
  }

  const startEditNotes = (id: number, current: string) => {
    setEditNotesId(id)
    setEditNotesValue(current)
  }

  const saveNotes = async (id: number) => {
    setNotesSaving(true)
    try {
      await updateNotes(id, editNotesValue)
      setEditNotesId(null)
    } catch {
      addNotification('error', 'Save Failed', 'Could not save notes.')
    } finally { setNotesSaving(false) }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="page-title">Analysis History</h1>
          <p className="page-subtitle">All {analyses.length} analyses stored in the database</p>
        </div>
        <div className="flex items-center gap-2">
          {analyses.length > 0 && (
            <button onClick={doDeleteAll} className="btn btn-secondary text-red-600 border-red-200 hover:bg-red-50 text-sm">
              <Trash2 className="w-4 h-4" />Clear All
            </button>
          )}
          <button onClick={() => navigate('/app/upload')} className="btn btn-primary text-sm">
            <Upload className="w-4 h-4" />New Analysis
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : analyses.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <History className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-600 font-medium mb-1">No history yet</p>
          <p className="text-gray-400 text-sm mb-6">Your analysis runs will appear here</p>
          <button onClick={() => navigate('/app/upload')} className="btn btn-primary">Run Your First Analysis</button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by date or count…" className="input pl-9 py-1.5 text-sm" />
            </div>
            <span className="text-sm text-gray-400">{filtered.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Date & Time', 'Records', 'Failures', 'Failure Rate', 'High Risk', 'Status', 'Notes', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map(record => {
                  const rate = record.failureRate ?? 0
                  return (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="font-medium text-gray-800">{new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-xs text-gray-400">{new Date(record.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{record.totalRecords.toLocaleString()}</td>
                      <td className="px-5 py-3">{record.failureCount > 0 ? <span className="badge-red">{record.failureCount}</span> : <span className="badge-green">0</span>}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${rate > 10 ? 'bg-red-400' : rate > 5 ? 'bg-amber-400' : 'bg-green-400'}`} style={{ width: `${Math.min(rate * 5, 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{rate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">{record.highRiskCount > 0 ? <span className="badge-orange">{record.highRiskCount}</span> : <span className="text-gray-300 text-xs">—</span>}</td>
                      <td className="px-5 py-3">
                        {record.failureCount === 0
                          ? <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle className="w-3.5 h-3.5" />Healthy</span>
                          : <span className="flex items-center gap-1 text-xs text-red-600 font-medium"><AlertTriangle className="w-3.5 h-3.5" />Failures</span>}
                      </td>
                      {/* Notes column */}
                      <td className="px-5 py-3 max-w-[180px]">
                        {editNotesId === record.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              value={editNotesValue}
                              onChange={e => setEditNotesValue(e.target.value)}
                              className="input text-xs py-1 w-32"
                              placeholder="Add note…"
                              autoFocus
                            />
                            <button onClick={() => saveNotes(Number(record.id))} disabled={notesSaving} className="text-green-600 hover:text-green-700 p-1">
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditNotesId(null)} className="text-gray-400 hover:text-gray-600 p-1">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group">
                            <span className="text-xs text-gray-500 truncate max-w-[120px]">{record.notes || <span className="text-gray-300">—</span>}</span>
                            <button
                              onClick={() => startEditNotes(Number(record.id), record.notes)}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary-600 transition-opacity p-0.5"
                              title="Edit note"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {deleteId === record.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-600">Confirm?</span>
                            <button onClick={() => doDelete(Number(record.id))} className="text-xs text-red-600 font-semibold hover:underline">Yes</button>
                            <button onClick={() => setDeleteId(null)} className="text-xs text-gray-400 hover:underline">No</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button onClick={() => viewDetails(record as AnalysisRecord)} className="text-gray-400 hover:text-primary-600 transition-colors p-1" title="View details">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteId(Number(record.id))} className="text-gray-300 hover:text-red-500 transition-colors p-1" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary text-sm disabled:opacity-40">Previous</button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Detail Popup Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Machine Attribute Diagnostics</h2>
                <p className="text-xs text-gray-500">Run ID: {selectedRecord.id} • {new Date(selectedRecord.timestamp).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-white relative">
              {loadingReadings ? (
                <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
                  <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">Loading machine attributes...</p>
                </div>
              ) : readings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-gray-500">
                  <AlertTriangle className="w-8 h-8 mb-2 text-gray-300" />
                  No readings found for this block.
                </div>
              ) : (
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="px-5 py-3 border-b border-gray-100">Row</th>
                      <th className="px-5 py-3 border-b border-gray-100">Type</th>
                      <th className="px-5 py-3 border-b border-gray-100">Air Temp (K)</th>
                      <th className="px-5 py-3 border-b border-gray-100">Process Temp (K)</th>
                      <th className="px-5 py-3 border-b border-gray-100">Speed (RPM)</th>
                      <th className="px-5 py-3 border-b border-gray-100">Torque (Nm)</th>
                      <th className="px-5 py-3 border-b border-gray-100">Tool Wear (min)</th>
                      <th className="px-5 py-3 border-b border-gray-100">Machine Failure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {readings.slice(0, 500).map((row, i) => (
                      <tr key={i} className={`hover:bg-primary-50/30 transition-colors ${row.machine_failure ? 'bg-red-50/30' : ''}`}>
                        <td className="px-5 py-2.5 text-gray-500 text-xs text-center font-mono">#{row.row_number}</td>
                        <td className="px-5 py-2.5 font-medium">{row.machine_type || '—'}</td>
                        <td className="px-5 py-2.5">{row.air_temperature_k}</td>
                        <td className="px-5 py-2.5">{row.process_temperature_k}</td>
                        <td className="px-5 py-2.5">{row.rotational_speed_rpm}</td>
                        <td className="px-5 py-2.5">{row.torque_nm}</td>
                        <td className="px-5 py-2.5">{row.tool_wear_min}</td>
                        <td className="px-5 py-2.5">
                          {row.machine_failure ? (
                            <span className="inline-flex items-center gap-1 text-red-700 font-semibold text-xs bg-red-100 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> FAILED</span>
                          ) : (
                            <span className="text-gray-400 text-xs">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-right flex justify-between items-center">
              <span>Model Confidence: {selectedRecord?.failureRate.toFixed(1)}% Potential Defect Rate</span>
              <span>Showing {Math.min(readings.length, 500)} / {readings.length} attributes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
