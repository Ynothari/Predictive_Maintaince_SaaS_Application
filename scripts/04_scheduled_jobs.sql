-- ============================================================================
-- Phase 2: Scheduled Jobs and Emailing Schema
-- Run this in Supabase SQL Editor to support the Cron Email Dispatcher
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL DEFAULT 'daily_anomaly_report',
    is_active BOOLEAN DEFAULT TRUE,
    cron_expression VARCHAR(50) DEFAULT '0 9 * * *', -- Default 9 AM daily
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- Admins can view/manage all jobs, Users can manage their own
CREATE POLICY scheduled_jobs_view_own ON scheduled_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY scheduled_jobs_update_own ON scheduled_jobs FOR ALL USING (auth.uid() = user_id);

-- Insert a default job for the super admin
DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@predictiq.com' LIMIT 1;
    IF admin_id IS NOT NULL THEN
        INSERT INTO scheduled_jobs (user_id, job_type, is_active)
        VALUES (admin_id, 'daily_anomaly_report', true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
