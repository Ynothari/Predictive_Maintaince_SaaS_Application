-- ============================================================================
-- PredictIQ — Row Level Security + Admin Seed
-- Project Ref: dcshkfozvriypjyxpdkc
-- Run this AFTER supabase_migration.sql — in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ── Enable RLS on all tenant-scoped tables ───────────────────────────────────

ALTER TABLE uploaded_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_readings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configs    ENABLE ROW LEVEL SECURITY;

-- ── Service-role bypass ──────────────────────────────────────────────────────
-- The backend Python API uses the service_role key which automatically
-- bypasses ALL RLS policies. These policies provide defense-in-depth
-- and protect data when accessed via anon/authenticated roles.

-- ── RLS Policies: uploaded_files ─────────────────────────────────────────────

CREATE POLICY "uploaded_files_select_own"
  ON uploaded_files FOR SELECT
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
  );

CREATE POLICY "uploaded_files_insert_own"
  ON uploaded_files FOR INSERT
  WITH CHECK (
    user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
  );

CREATE POLICY "uploaded_files_update_own"
  ON uploaded_files FOR UPDATE
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
  );

CREATE POLICY "uploaded_files_delete_own"
  ON uploaded_files FOR DELETE
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
  );


-- ── RLS Policies: machine_readings ───────────────────────────────────────────

CREATE POLICY "machine_readings_select_own"
  ON machine_readings FOR SELECT
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
  );

CREATE POLICY "machine_readings_insert_own"
  ON machine_readings FOR INSERT
  WITH CHECK (
    user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
  );

CREATE POLICY "machine_readings_delete_own"
  ON machine_readings FOR DELETE
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
  );


-- ── RLS Policies: analyses ───────────────────────────────────────────────────

CREATE POLICY "analyses_select_own"
  ON analyses FOR SELECT
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
  );

CREATE POLICY "analyses_insert_own"
  ON analyses FOR INSERT
  WITH CHECK (
    user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
  );

CREATE POLICY "analyses_update_own"
  ON analyses FOR UPDATE
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
  );

CREATE POLICY "analyses_delete_own"
  ON analyses FOR DELETE
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
  );


-- ── RLS Policies: prediction_results ─────────────────────────────────────────
-- prediction_results don't have user_id directly — join through analyses

CREATE POLICY "prediction_results_select_own"
  ON prediction_results FOR SELECT
  USING (
    analysis_id IN (
      SELECT id FROM analyses
      WHERE user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
    )
  );

CREATE POLICY "prediction_results_insert_own"
  ON prediction_results FOR INSERT
  WITH CHECK (
    analysis_id IN (
      SELECT id FROM analyses
      WHERE user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
    )
  );

CREATE POLICY "prediction_results_delete_own"
  ON prediction_results FOR DELETE
  USING (
    analysis_id IN (
      SELECT id FROM analyses
      WHERE user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
    )
  );


-- ── RLS Policies: audit_logs ─────────────────────────────────────────────────

CREATE POLICY "audit_logs_select_own"
  ON audit_logs FOR SELECT
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
    OR (current_setting('request.jwt.claims', true)::json ->> 'role') = 'super_admin'
  );

CREATE POLICY "audit_logs_insert_any"
  ON audit_logs FOR INSERT
  WITH CHECK (true);


-- ── RLS Policies: scheduled_jobs ─────────────────────────────────────────────

CREATE POLICY "scheduled_jobs_all_own"
  ON scheduled_jobs FOR ALL
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
  );


-- ── RLS Policies: webhook_configs ────────────────────────────────────────────

CREATE POLICY "webhook_configs_all_own"
  ON webhook_configs FOR ALL
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json ->> 'user_id')::bigint
  );


-- ── Super Admin policies (allow admin to see ALL data) ───────────────────────

CREATE POLICY "admin_full_access_uploaded_files"
  ON uploaded_files FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::json ->> 'role') = 'super_admin'
  );

CREATE POLICY "admin_full_access_machine_readings"
  ON machine_readings FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::json ->> 'role') = 'super_admin'
  );

CREATE POLICY "admin_full_access_analyses"
  ON analyses FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::json ->> 'role') = 'super_admin'
  );

CREATE POLICY "admin_full_access_prediction_results"
  ON prediction_results FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::json ->> 'role') = 'super_admin'
  );

CREATE POLICY "admin_full_access_scheduled_jobs"
  ON scheduled_jobs FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::json ->> 'role') = 'super_admin'
  );

CREATE POLICY "admin_full_access_webhook_configs"
  ON webhook_configs FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::json ->> 'role') = 'super_admin'
  );


-- ── Done ─────────────────────────────────────────────────────────────────────
-- The admin user will be seeded by the Python setup script (requires bcrypt).
-- Run: python scripts/setup_supabase.py
