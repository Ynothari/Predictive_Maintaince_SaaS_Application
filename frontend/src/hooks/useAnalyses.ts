import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

export interface UploadedFileRecord {
  id: string
  file_name: string
  original_name: string
  file_size: number
  row_count: number
  status: string
  uploaded_at: string
}

export function useFiles() {
  const [files, setFiles] = useState<UploadedFileRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFiles = useCallback(async () => {
    try {
      const res = await axios.get('/api/files')
      setFiles(res.data)
    } catch (e: any) {
      console.error('Failed to load files', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  const deleteOne = async (id: string) => {
    await axios.delete(`/api/files/${id}`)
    setFiles(prev => prev.filter(a => a.id !== id))
  }

  return { files, loading, refetch: fetchFiles, deleteOne }
}

// -------------------------------------------------------------
// LEGACY SUPPORT for un-refactored pages
// -------------------------------------------------------------
export interface AnalysisRecord {
  id: number | string
  fileId: number | string
  timestamp: string
  totalRecords: number
  failureCount: number
  highRiskCount: number
  mediumRiskCount: number
  failureRate: number
  notes: string
}

export function useAnalyses() {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAnalyses = useCallback(async () => {
    try {
      const res = await axios.get('/api/dashboard/stats')
      if (res.data && res.data.history) {
        const mapped = res.data.history.map((a: any) => ({
          id: a.id,
          fileId: a.file_id,
          timestamp: a.timestamp,
          totalRecords: a.total_records || 0,
          failureCount: a.failure_count || 0,
          highRiskCount: a.high_risk_count || 0,
          mediumRiskCount: 0,
          failureRate: a.failure_rate || 0,
          notes: ''
        }))
        setAnalyses(mapped)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAnalyses() }, [fetchAnalyses])

  const legacyDeleteOne = async (id: number) => {
    // Legacy mock for UI
    setAnalyses(prev => prev.filter(a => a.id !== id))
  }
  const deleteAll = async () => setAnalyses([])
  const updateNotes = async (id: number, notes: string) => {
    setAnalyses(prev => prev.map(a => a.id === id ? { ...a, notes } : a))
  }

  return { 
    analyses, 
    loading, 
    error: null, 
    refetch: fetchAnalyses, 
    deleteOne: legacyDeleteOne, 
    deleteAll, 
    updateNotes 
  }
}
