export interface ShapContributor {
  feature: string
  impact: number
  direction: 'increases' | 'decreases'
  magnitude: 'high' | 'medium' | 'low'
}

export interface PredictionResult {
  row: number
  will_fail: boolean
  failure_probability: number
  risk_level: string
  failure_reason: string | null
  recommendation: string
  shap_contributors: ShapContributor[]
  confidence_low: number
  confidence_high: number
}

export interface PredictionResponse {
  status: string
  total_records: number
  predictions: PredictionResult[]
}

export interface ErrorResponse {
  status: string
  message: string
  details?: string[]
}

// Matches the DB-backed analysis record from useAnalyses hook
export interface AnalysisRecord {
  id: number
  timestamp: string
  totalRecords: number
  failureCount: number
  highRiskCount: number
  mediumRiskCount: number
  failureRate: number
  notes: string
}
