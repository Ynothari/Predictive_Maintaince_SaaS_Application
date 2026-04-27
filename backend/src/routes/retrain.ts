import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import crypto from 'crypto';
import { supabaseAdmin } from '../utils/supabase';
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { FEATURE_COLUMNS, loadModels } from '../services/ml';
import { RandomForestClassifier } from 'ml-random-forest';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const computeFileHash = (buffer: Buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

// Retrain model
router.post('/', requireAdmin, upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ detail: 'No training file uploaded' });

    const { originalname, buffer, size } = req.file;
    const lowerName = originalname.toLowerCase();
    
    // Parse
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawData: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (rawData.length < 100) return res.status(400).json({ detail: 'Need at least 100 rows for training' });

    const required = [...FEATURE_COLUMNS, 'Machine failure'];
    const keys = Object.keys(rawData[0] || {});
    const missing = required.filter(c => !keys.includes(c));
    if (missing.length > 0) return res.status(400).json({ detail: `Missing columns: ${missing.join(', ')}` });

    const X: number[][] = [];
    const y: number[] = [];

    rawData.forEach(row => {
      const features = FEATURE_COLUMNS.map(col => Number(row[col]));
      X.push(features);
      y.push(Number(row['Machine failure'] || 0));
    });

    // Train Failure Model 
    // ml-js Random Forest doesn't have class weights easily accessible, but it works adequately for prototyping
    const options = {
      seed: 42,
      maxFeatures: 2,
      replacement: true,
      nEstimators: 50, // Keep trees low for speed in node.js during training
    };
    
    const failureModel = new RandomForestClassifier(options);
    failureModel.train(X, y);
    
    // Evaluate accuracy quickly on training data (in real scenarios use test_split)
    const predictions = failureModel.predict(X);
    let correct = 0;
    for (let i = 0; i < predictions.length; i++) {
        if (predictions[i] === y[i]) correct++;
    }
    const accuracy = correct / y.length;

    // We can save the model to JSON
    const modelJson = failureModel.toJSON();

    const versionTs = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
    
    // Store training file
    const fileHash = computeFileHash(buffer);
    const { data: uploadRec, error: fileErr } = await supabaseAdmin.from('uploaded_files').insert({
      user_id: req.user!.id,
      file_name: `training_${versionTs}_${originalname}`,
      original_name: originalname,
      file_type: lowerName.endsWith('.csv') ? 'csv' : 'xlsx',
      file_size: size,
      row_count: rawData.length,
      column_count: keys.length,
      columns_json: keys,
      file_hash: fileHash,
      status: 'processed' // Training files are pre-processed essentially
    }).select('id').single();

    if (fileErr) throw fileErr;

    // Store version
    const { data: mv, error: mvErr } = await supabaseAdmin.from('model_versions').insert({
      version: versionTs,
      trained_by: req.user!.email,
      training_rows: X.length,
      failure_accuracy: Number((accuracy * 100).toFixed(2)),
      is_active: true,
      training_file_id: uploadRec.id,
      metadata_json: modelJson, // Saving the trained tree structure into DB to be reloaded on start
    }).select('id').single();

    if (mvErr) throw mvErr;

    // Load it into memory immediately
    loadModels(modelJson, null);

    res.json({
        status: 'success',
        version: versionTs,
        training_rows: X.length,
        failure_accuracy: `${(accuracy * 100).toFixed(2)}%`,
        db_version_id: mv.id,
        message: 'Models retrained successfully and loaded into memory.',
    });
  } catch(err) {
    next(err);
  }
});

router.get('/versions', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('model_versions')
            .select('id, version, trained_at, trained_by, training_rows, failure_accuracy, reason_accuracy, is_active')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch(err) {
        next(err);
    }
});

export default router;
