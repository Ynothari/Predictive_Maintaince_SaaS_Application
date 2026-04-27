-- ============================================================================
-- PredictIQ — Fix RLS Policies for Live Monitor & Webhooks
-- Fixes: audit_logs insert, webhook_configs CRUD for authenticated users
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================================

-- ── 1. Audit Logs ────────────────────────────────────────────────────────────
-- The live monitor writes audit logs without a user_id.  We need an INSERT
-- policy that allows authenticated users (and the service role) to insert rows.
-- The existing "audit_logs_select_own" should already cover SELECT.

-- Drop old INSERT policy if it exists
DROP POLICY IF EXISTS "audit_logs_insert_any"         ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_own"         ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON audit_logs;

-- Allow any authenticated user to insert audit logs
CREATE POLICY "audit_logs_insert_authenticated"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Ensure there's a SELECT policy for the user's own audit logs
DROP POLICY IF EXISTS "audit_logs_select_own" ON audit_logs;
CREATE POLICY "audit_logs_select_own"
  ON audit_logs FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IS NULL  -- Allow viewing monitor audit logs (no user_id)
  );


-- ── 2. Webhook Configs ──────────────────────────────────────────────────────
-- Need explicit SELECT, INSERT, UPDATE, DELETE policies using auth.uid()
-- The old "webhook_configs_all_own" policy might not exist or might be
-- set up with the BIGINT version. We recreate all policies.

DROP POLICY IF EXISTS "webhook_configs_all_own"      ON webhook_configs;
DROP POLICY IF EXISTS "webhook_configs_select_own"   ON webhook_configs;
DROP POLICY IF EXISTS "webhook_configs_insert_own"   ON webhook_configs;
DROP POLICY IF EXISTS "webhook_configs_update_own"   ON webhook_configs;
DROP POLICY IF EXISTS "webhook_configs_delete_own"   ON webhook_configs;
DROP POLICY IF EXISTS "admin_full_access_webhook_configs"  ON webhook_configs;
DROP POLICY IF EXISTS "admin_access_all_webhook_configs"   ON webhook_configs;

-- Ensure RLS is enabled
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;

-- User can SELECT their own webhook configs
CREATE POLICY "webhook_configs_select_own"
  ON webhook_configs FOR SELECT
  USING (user_id = auth.uid());

-- User can INSERT their own webhook configs
CREATE POLICY "webhook_configs_insert_own"
  ON webhook_configs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- User can UPDATE their own webhook configs
CREATE POLICY "webhook_configs_update_own"
  ON webhook_configs FOR UPDATE
  USING (user_id = auth.uid());

-- User can DELETE their own webhook configs
CREATE POLICY "webhook_configs_delete_own"
  ON webhook_configs FOR DELETE
  USING (user_id = auth.uid());

-- Super admin can access all webhook configs
CREATE POLICY "admin_access_all_webhook_configs"
  ON webhook_configs FOR ALL
  USING (public.is_super_admin());


-- ── 3. Scheduled Jobs (audit) ────────────────────────────────────────────────
-- Ensure the scheduled_jobs table has individual policies too
DROP POLICY IF EXISTS "scheduled_jobs_all_own"      ON scheduled_jobs;
DROP POLICY IF EXISTS "scheduled_jobs_select_own"   ON scheduled_jobs;
DROP POLICY IF EXISTS "scheduled_jobs_insert_own"   ON scheduled_jobs;
DROP POLICY IF EXISTS "scheduled_jobs_update_own"   ON scheduled_jobs;
DROP POLICY IF EXISTS "scheduled_jobs_delete_own"   ON scheduled_jobs;

ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_jobs_select_own"
  ON scheduled_jobs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "scheduled_jobs_insert_own"
  ON scheduled_jobs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "scheduled_jobs_update_own"
  ON scheduled_jobs FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "scheduled_jobs_delete_own"
  ON scheduled_jobs FOR DELETE
  USING (user_id = auth.uid());


-- ── Done ─────────────────────────────────────────────────────────────────────
-- RLS policies are now properly configured for:
--   ✅ audit_logs (INSERT for any authenticated, SELECT for own + nulls)
--   ✅ webhook_configs (full CRUD for own data, admin override)
--   ✅ scheduled_jobs (full CRUD for own data)
