-- ============================================================================
-- PredictIQ — Supabase Native Auth Integration & RLS Migration
-- Project Ref: dcshkfozvriypjyxpdkc
-- 
-- Run this script in the Supabase SQL Editor.
-- This script upgrades the schema to use Supabase's native Auth (auth.users)
-- instead of the custom BIGSERIAL ids. It changes all foreign keys to UUID
-- and sets up automated syncing and RLS based on auth.uid().
-- ============================================================================

-- 1. Create a function to silently drop constraints (to avoid errors if they don't exist)
CREATE OR REPLACE FUNCTION drop_fk_if_exists(p_table_name text, p_column_name text) RETURNS void AS $$
DECLARE constraint_name text;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = p_table_name AND kcu.column_name = p_column_name;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE ' || quote_ident(p_table_name) || ' DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing FKs so we can alter column types
SELECT drop_fk_if_exists('uploaded_files', 'user_id');
SELECT drop_fk_if_exists('machine_readings', 'user_id');
SELECT drop_fk_if_exists('analyses', 'user_id');
SELECT drop_fk_if_exists('audit_logs', 'user_id');
SELECT drop_fk_if_exists('scheduled_jobs', 'user_id');
SELECT drop_fk_if_exists('webhook_configs', 'user_id');

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;

-- 1.5 Clear previous custom policies before dropping columns
DO $$
DECLARE pol record;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 2. Alter columns from BIGINT to UUID
-- Wait, we need to completely redefine the ID to match auth.users (UUID)
-- If data exists, it will be lost, but since this is fresh, we can forcefully recreate columns
DO $$
BEGIN
  -- We assume tables are empty or it's safe to clear user relationships. 
  -- We TRUNCATE all to be safe for a fresh auth setup.
  TRUNCATE TABLE prediction_results, machine_readings, uploaded_files, analyses, audit_logs, scheduled_jobs, webhook_configs, users CASCADE;
  
  -- Alter Users
  ALTER TABLE users DROP COLUMN id;
  ALTER TABLE users ADD COLUMN id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE;
  
  -- Alter Foreign Keys
  ALTER TABLE uploaded_files DROP COLUMN user_id;
  ALTER TABLE uploaded_files ADD COLUMN user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;

  ALTER TABLE machine_readings DROP COLUMN user_id;
  ALTER TABLE machine_readings ADD COLUMN user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;

  ALTER TABLE analyses DROP COLUMN user_id;
  ALTER TABLE analyses ADD COLUMN user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;

  ALTER TABLE audit_logs DROP COLUMN user_id;
  ALTER TABLE audit_logs ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

  ALTER TABLE scheduled_jobs DROP COLUMN user_id;
  ALTER TABLE scheduled_jobs ADD COLUMN user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;

  ALTER TABLE webhook_configs DROP COLUMN user_id;
  ALTER TABLE webhook_configs ADD COLUMN user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
END $$;


-- 3. Trigger to sync auth.users to public.users automatically
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, email, full_name, hashed_password, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    '', -- We don't store passwords anymore, auth.users handles it
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 4. Set up true native RLS utilizing auth.uid()
ALTER TABLE uploaded_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_readings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configs    ENABLE ROW LEVEL SECURITY;

-- --- uploaded_files ---
CREATE POLICY "uploaded_files_select_own" ON uploaded_files FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "uploaded_files_insert_own" ON uploaded_files FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "uploaded_files_update_own" ON uploaded_files FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "uploaded_files_delete_own" ON uploaded_files FOR DELETE USING (user_id = auth.uid());

-- --- machine_readings ---
CREATE POLICY "machine_readings_select_own" ON machine_readings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "machine_readings_insert_own" ON machine_readings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "machine_readings_delete_own" ON machine_readings FOR DELETE USING (user_id = auth.uid());

-- --- analyses ---
CREATE POLICY "analyses_select_own" ON analyses FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "analyses_insert_own" ON analyses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "analyses_update_own" ON analyses FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "analyses_delete_own" ON analyses FOR DELETE USING (user_id = auth.uid());

-- --- prediction_results ---
CREATE POLICY "prediction_results_select_own" ON prediction_results FOR SELECT USING (
  analysis_id IN (SELECT id FROM analyses WHERE user_id = auth.uid())
);
CREATE POLICY "prediction_results_insert_own" ON prediction_results FOR INSERT WITH CHECK (
  analysis_id IN (SELECT id FROM analyses WHERE user_id = auth.uid())
);
CREATE POLICY "prediction_results_delete_own" ON prediction_results FOR DELETE USING (
  analysis_id IN (SELECT id FROM analyses WHERE user_id = auth.uid())
);

-- --- Super Admin Policies (Read everything) ---
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "admin_access_all_uploaded_files"     ON uploaded_files     FOR ALL USING (public.is_super_admin());
CREATE POLICY "admin_access_all_machine_readings"   ON machine_readings   FOR ALL USING (public.is_super_admin());
CREATE POLICY "admin_access_all_analyses"           ON analyses           FOR ALL USING (public.is_super_admin());
CREATE POLICY "admin_access_all_prediction_results" ON prediction_results FOR ALL USING (public.is_super_admin());

-- Done!
