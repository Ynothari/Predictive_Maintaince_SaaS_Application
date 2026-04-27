import cron from 'node-cron';
import { supabaseAdmin } from '../utils/supabase';
import { sendAnomalyReport } from './email';

// Runs every 10 minutes to check if any scheduled jobs are due
// Since cron_expression requires parsing, for this example we assume it's a daily job or just run it hourly.
export const startCronJobs = () => {
  console.log('🕒 Starting automated Cron Scheduler for Anomaly Email Reports...');

  // Running every hour at minute 0 (0 * * * *)
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled job sweep...');
    try {
      // 1. Fetch active jobs
      const { data: jobs, error } = await supabaseAdmin
        .from('scheduled_jobs')
        .select('*')
        .eq('is_active', true);

      if (error || !jobs) throw error;

      for (const job of jobs) {
        // Find the user email
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(job.user_id);
        const email = userData?.user?.email;
        if (!email) continue;

        // Fetch recent anomalies for this user
        // We look at analyses created in the last 24 hours
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data: analyses } = await supabaseAdmin
          .from('analyses')
          .select('id, total_records, failure_count, high_risk_count')
          .eq('user_id', job.user_id)
          .gte('created_at', twentyFourHoursAgo.toISOString());

        if (!analyses || analyses.length === 0) continue;

        let totalRecords = 0;
        let failureCount = 0;
        let highRiskCount = 0;

        analyses.forEach(a => {
          totalRecords += a.total_records;
          failureCount += a.failure_count;
          highRiskCount += a.high_risk_count;
        });

        // If there are anomalies, send an email!
        if (highRiskCount > 0 || failureCount > 0) {
          const failureRate = (failureCount / totalRecords) * 100;
          await sendAnomalyReport(email, {
            totalAnalyses: analyses.length,
            highRiskCount,
            failureCount,
            failureRate
          });

          // Mark job updated
          await supabaseAdmin.from('scheduled_jobs')
             .update({ last_run_at: new Date().toISOString() })
             .eq('id', job.id);
        }
      }
    } catch (err) {
      console.error('Error running scheduled job:', err);
    }
  });
};
