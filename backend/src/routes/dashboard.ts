import { Router, Response, NextFunction } from 'express';
import { getSupabaseUserClient } from '../utils/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userClient = getSupabaseUserClient(req.headers.authorization!);
    
    // Fetch all analyses tied to the user for accurate, secure dashboard trends
    // In production with millions of rows, we might use a materialized view instead
    const { data: analyses, error } = await userClient
      .from('analyses')
      .select('id, file_id, timestamp, total_records, failure_count, high_risk_count, failure_rate')
      .order('timestamp', { ascending: true }); // True so we can chart a timeline

    if (error) throw error;

    const totalAnalyses = analyses.length;
    const totalRecords = analyses.reduce((sum, a) => sum + (a.total_records || 0), 0);
    const totalFailures = analyses.reduce((sum, a) => sum + (a.failure_count || 0), 0);
    const overallRate = totalRecords > 0 ? (totalFailures / totalRecords) * 100 : 0;
    
    // Grab the 5 most recent for the table display
    const recentAnalyses = [...analyses].reverse().slice(0, 5);

    res.json({
      totalAnalyses,
      totalRecords,
      totalFailures,
      overallRate,
      recentAnalyses,
      history: analyses // Full history for the trend charts
    });

  } catch (err) {
    next(err);
  }
});

export default router;
