import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Download, Activity } from 'lucide-react'
import axios from 'axios'
import { PredictionResponse } from '../types'
import { useAuth } from '../contexts/AuthContext'

interface FileUploadProps {
  onAnalysisComplete: (data: PredictionResponse, file?: File) => void
  onAnalysisStart: () => void
}

const TEMPLATE_ROWS = [
  [298.1, 308.6, 1551, 42.8, 0],
  [299.0, 309.1, 1433, 40.1, 10],
  [300.0, 310.0, 1551, 42.8, 20],
  [301.5, 311.5, 1408, 46.3, 50],
  [302.0, 312.0, 1498, 49.4, 80],
]

function downloadTemplate() {
  const header = 'Air temperature [K],Process temperature [K],Rotational speed [rpm],Torque [Nm],Tool wear [min]'
  const rows = TEMPLATE_ROWS.map(r => r.join(',')).join('\n')
  const blob = new Blob([header + '\n' + rows], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'predictiq-template.csv'
  a.click()
  window.URL.revokeObjectURL(url)
}

export default function FileUpload({ onAnalysisComplete, onAnalysisStart }: FileUploadProps) {
  const { token } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0]
    if (!f) return
    if (!f.name.endsWith('.csv')) { setError('Please upload a CSV file'); return }
    setFile(f)
    setError('')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  })

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    onAnalysisStart()
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await axios.post<PredictionResponse>('/api/predict', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` 
        },
      })
      setUploading(false)
      onAnalysisComplete(response.data, file)
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to analyze file. Please check the format and try again.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
      setUploading(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Upload Machine Data</h2>
          <p className="text-sm text-gray-500">Upload a CSV with 5 sensor columns to get AI-powered failure predictions.</p>
        </div>
        <button onClick={downloadTemplate} className="btn btn-secondary text-xs no-print flex-shrink-0">
          <Download className="w-3.5 h-3.5" />
          Download Template
        </button>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={[
          'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200',
          isDragActive ? 'border-primary-500 bg-primary-50 scale-[1.01]' : 'border-gray-200 hover:border-primary-400 hover:bg-gray-50',
          file ? 'bg-green-50 border-green-300' : '',
        ].join(' ')}
      >
        <input {...getInputProps()} />
        {!file ? (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDragActive ? 'bg-primary-200' : 'bg-primary-100'}`}>
                <Upload className="w-7 h-7 text-primary-600" />
              </div>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-800">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your CSV here'}
              </p>
              <p className="text-sm text-gray-400 mt-1">or click to browse</p>
            </div>
            <p className="text-xs text-gray-300">CSV files only</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <p className="font-semibold text-gray-900">{file.name}</p>
              </div>
              <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 alert-error">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Upload Failed</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Actions */}
      {file && (
        <div className="mt-5 flex gap-3">
          <button onClick={handleUpload} disabled={uploading} className="btn btn-primary flex-1 py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            {uploading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                Analyze Data
              </>
            )}
          </button>
          <button onClick={() => { setFile(null); setError('') }} disabled={uploading} className="btn btn-secondary px-5 disabled:opacity-50">
            Remove
          </button>
        </div>
      )}
    </div>
  )
}
