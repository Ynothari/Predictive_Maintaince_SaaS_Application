import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import crypto from 'crypto';
import { supabaseAdmin, getSupabaseUserClient } from '../utils/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { FEATURE_COLUMNS, predictFailures } from '../services/ml';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper to hash files
const computeFileHash = (buffer: Buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

// Column Map for DB
const COLUMN_MAP: Record<string, string> = {
  "Air temperature [K]": "air_temperature_k",
  "Process temperature [K]": "process_temperature_k",
  "Rotational speed [rpm]": "rotational_speed_rpm",
  "Torque [Nm]": "torque_nm",
  "Tool wear [min]": "tool_wear_min",
  "Product ID": "product_id",
  "Type": "machine_type",
  "Machine failure": "machine_failure",
  "TWF": "failure_type_twf",
  "HDF": "failure_type_hdf",
  "PWF": "failure_type_pwf",
  "OSF": "failure_type_osf",
  "RNF": "failure_type_rnf",
};

router.post('/', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No file uploaded' });
    }

    const { originalname, buffer, size } = req.file;
    const lowerName = originalname.toLowerCase();
    if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
      return res.status(400).json({ detail: 'Invalid file type. Expected .csv, .xlsx, or .xls.' });
    }

    // Parse Excel/CSV from buffer
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawData: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (rawData.length === 0) {
      return res.status(400).json({ detail: 'File is empty' });
    }

    // Validate structure
    const keys = Object.keys(rawData[0]);
    const missing = FEATURE_COLUMNS.filter(c => !keys.includes(c));
    if (missing.length > 0) {
      return res.status(400).json({ detail: `Missing required columns: ${missing.join(', ')}` });
    }

    // Prepare Supabase Client operating as the User (enforces RLS automatically)
    const userClient = getSupabaseUserClient(req.headers.authorization!);
    const userId = req.user!.id;
    const fileHash = computeFileHash(buffer);
    const fileType = lowerName.endsWith('.csv') ? 'csv' : 'xlsx';

    // 1. Create UploadedFile record
    const { data: uploadRec, error: fileErr } = await userClient.from('uploaded_files').insert({
      user_id: userId,
      file_name: `user_${new Date().getTime()}_${originalname}`,
      original_name: originalname,
      file_type: fileType,
      file_size: size,
      row_count: rawData.length,
      column_count: keys.length,
      columns_json: keys,
      file_hash: fileHash,
      status: 'processing'
    }).select('id').single();

    if (fileErr || !uploadRec) {
      return res.status(500).json({ detail: 'Failed to store file metadata: ' + (fileErr?.message || '') });
    }
    const fileId = uploadRec.id;

    // 2. Extract features & readings
    const readings: any[] = [];
    const featuresMatrix: number[][] = [];

    rawData.forEach((row, index) => {
      const reading: any = { file_id: fileId, user_id: userId, row_number: index + 1 };
      const extra: any = {};
      const features: number[] = [];

      for (const [csvCol, val] of Object.entries(row)) {
        const dbCol = COLUMN_MAP[csvCol];
        if (dbCol) {
          reading[dbCol] = val;
        } else {
          extra[csvCol] = val;
        }

        if (FEATURE_COLUMNS.includes(csvCol)) {
          features.push(Number(val));
        }
      }
      if (Object.keys(extra).length > 0) reading.extra_data = extra;
      readings.push(reading);
      featuresMatrix.push(features);
    });

    // 3. Bulk Insert Readings (Supabase limits inserts to ~1000 per request, so we chunk)
    for (let i = 0; i < readings.length; i += 500) {
      const batch = readings.slice(i, i + 500);
      await userClient.from('machine_readings').insert(batch);
    }

    // 4. ML Predictions
    const predictions = predictFailures(featuresMatrix);

    const failureCount = predictions.filter(p => p.will_fail).length;
    const highRisk = predictions.filter(p => p.risk_level === 'High Risk').length;
    const mediumRisk = predictions.filter(p => p.risk_level === 'Medium Risk').length;
    const lowRisk = predictions.filter(p => p.risk_level === 'Low Risk').length;
    const failureRate = predictions.length > 0 ? (failureCount / predictions.length) * 100 : 0;
    const avgProb = predictions.reduce((sum, p) => sum + p.failure_probability, 0) / (predictions.length || 1);

    // 5. Create Analysis
    const { data: analysisRec, error: analysisErr } = await userClient.from('analyses').insert({
      user_id: userId,
      file_id: fileId,
      total_records: predictions.length,
      failure_count: failureCount,
      high_risk_count: highRisk,
      medium_risk_count: mediumRisk,
      low_risk_count: lowRisk,
      failure_rate: failureRate,
      avg_probability: avgProb,
    }).select('id').single();

    if (analysisErr) throw analysisErr;
    const analysisId = analysisRec.id;

    // 6. Bulk Insert Predictions
    const dbPredictions = predictions.map(p => ({
      analysis_id: analysisId,
      row_number: p.row,
      will_fail: p.will_fail,
      failure_probability: p.failure_probability,
      risk_level: p.risk_level,
      failure_reason: p.failure_reason,
      recommendation: p.recommendation,
      confidence_low: p.confidence_low,
      confidence_high: p.confidence_high,
      shap_contributors: p.shap_contributors,
    }));

    for (let i = 0; i < dbPredictions.length; i += 500) {
      await userClient.from('prediction_results').insert(dbPredictions.slice(i, i + 500));
    }

    // 7. Success! Update status
    await userClient.from('uploaded_files').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('id', fileId);
    await userClient.from('audit_logs').insert({ user_id: userId, action: 'prediction_completed', details: `File: ${originalname}, Records: ${predictions.length}` });

    res.json({
      status: 'success',
      total_records: predictions.length,
      predictions
    });

  } catch (err: any) {
    next(err);
  }
});

// File Management APIs
router.get('/files', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    // Utilize RLS properly here by using the user's token directly
    const userClient = getSupabaseUserClient(req.headers.authorization!);
    const { data, error } = await userClient.from('uploaded_files').select('*').order('uploaded_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/files/:fileId/readings', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userClient = getSupabaseUserClient(req.headers.authorization!);
    const { data, error } = await userClient.from('machine_readings').select('*').eq('file_id', req.params.fileId).order('row_number');
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/files/:fileId/analysis', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userClient = getSupabaseUserClient(req.headers.authorization!);
    
    // Fetch the analysis metadata
    const { data: analysis, error } = await userClient
      .from('analyses')
      .select('*')
      .eq('file_id', req.params.fileId)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows
    
    if (!analysis) {
      return res.status(404).json({ detail: 'No analysis found for this file' });
    }

    // Fetch the high risk prediction results for the popup summary 
    // Usually we don't return all 10,000 predictions, just a summary or the top anomalies
    const { data: anomalies, error: anomalyErr } = await userClient
      .from('prediction_results')
      .select('row_number, failure_probability, risk_level, failure_reason, recommendation')
      .eq('analysis_id', analysis.id)
      .eq('will_fail', true)
      .limit(100);

    if (anomalyErr) throw anomalyErr;

    res.json({
      analysis,
      anomalies
    });

  } catch (err) { next(err); }
});

router.delete('/files/:fileId', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userClient = getSupabaseUserClient(req.headers.authorization!);
    const { error } = await userClient.from('uploaded_files').delete().eq('id', req.params.fileId);
    if (error) throw error;
    res.json({ status: 'deleted', file_id: req.params.fileId });
  } catch (err) { next(err); }
});

export default router;
