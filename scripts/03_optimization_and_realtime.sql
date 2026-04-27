-- ============================================================================
-- Phase 2: Database Latency Optimization & Real-time Connectivity
-- Run this script in the Supabase SQL Editor.
-- ============================================================================

-- 1. Create Indexes for High-Frequency Foreign Key Lookups
-- These indexes drastically reduce latency when querying millions of readings
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);

CREATE INDEX IF NOT EXISTS idx_machine_readings_file_id ON machine_readings(file_id);
CREATE INDEX IF NOT EXISTS idx_machine_readings_user_id ON machine_readings(user_id);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_file_id ON analyses(file_id);

CREATE INDEX IF NOT EXISTS idx_prediction_results_analysis_id ON prediction_results(analysis_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- 2. Enable Realtime Publications
-- Enables Supabase WebSocket connections to dynamically push data to the frontend
-- REPLICA IDENTITY FULL ensures the entire row is broadcasted across the websocket
ALTER TABLE uploaded_files REPLICA IDENTITY FULL;
ALTER TABLE analyses REPLICA IDENTITY FULL;

-- First Drop the publication if it already exists to avoid duplication errors 
-- Usually managed via Supabase Studio, but this ensures it works purely via SQL
BEGIN;
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END $$;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE uploaded_files;
ALTER PUBLICATION supabase_realtime ADD TABLE analyses;
