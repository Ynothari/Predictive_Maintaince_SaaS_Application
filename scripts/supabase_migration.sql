-- ============================================================================
-- PredictIQ — Supabase PostgreSQL Schema Migration
-- Project Ref: dcshkfozvriypjyxpdkc
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- ── 1. Users ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id               BIGSERIAL    PRIMARY KEY,
    username         VARCHAR(100) NOT NULL UNIQUE,
    email            VARCHAR(255) NOT NULL UNIQUE,
    full_name        VARCHAR(255) NOT NULL DEFAULT '',
    hashed_password  TEXT         NOT NULL,
    role             VARCHAR(50)  NOT NULL DEFAULT 'user',
    username_changed BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ           DEFAULT NOW(),
    last_login_at    TIMESTAMPTZ,
    analysis_count   INTEGER      NOT NULL DEFAULT 0,
    api_key          VARCHAR(255) UNIQUE,
    totp_secret      VARCHAR(255),
    totp_enabled     BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_users_username ON users (username);
CREATE INDEX IF NOT EXISTS ix_users_email    ON users (email);
CREATE INDEX IF NOT EXISTS ix_users_api_key  ON users (api_key);


-- ── 2. Uploaded Files (Master Table) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS uploaded_files (
    id            BIGSERIAL    PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name     VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    file_type     VARCHAR(20)  NOT NULL DEFAULT 'csv',
    file_size     BIGINT       NOT NULL DEFAULT 0,
    file_hash     VARCHAR(64),
    storage_path  TEXT,
    row_count     INTEGER      NOT NULL DEFAULT 0,
    column_count  INTEGER      NOT NULL DEFAULT 0,
    columns_json  JSONB,
    status        VARCHAR(50)  NOT NULL DEFAULT 'uploaded',
    error_message TEXT,
    uploaded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    processed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_uploaded_files_user_id ON uploaded_files (user_id);
CREATE INDEX IF NOT EXISTS ix_uploaded_files_status  ON uploaded_files (status);
CREATE INDEX IF NOT EXISTS ix_uploaded_files_hash    ON uploaded_files (file_hash);

COMMENT ON TABLE uploaded_files IS 'Master table for all uploaded CSV/Excel files. Every file uploaded via /predict or /retrain is recorded here.';
COMMENT ON COLUMN uploaded_files.file_hash IS 'SHA-256 hash for duplicate detection';
COMMENT ON COLUMN uploaded_files.columns_json IS 'JSON array of column names from the file';


-- ── 3. Machine Readings (Raw Sensor Data) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS machine_readings (
    id                    BIGSERIAL    PRIMARY KEY,
    file_id               BIGINT       NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    user_id               BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    row_number            INTEGER      NOT NULL,
    air_temperature_k     DOUBLE PRECISION,
    process_temperature_k DOUBLE PRECISION,
    rotational_speed_rpm  DOUBLE PRECISION,
    torque_nm             DOUBLE PRECISION,
    tool_wear_min         DOUBLE PRECISION,
    product_id            VARCHAR(50),
    machine_type          VARCHAR(10),
    machine_failure       BOOLEAN,
    failure_type_twf      BOOLEAN,
    failure_type_hdf      BOOLEAN,
    failure_type_pwf      BOOLEAN,
    failure_type_osf      BOOLEAN,
    failure_type_rnf      BOOLEAN,
    extra_data            JSONB,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_machine_readings_file_id  ON machine_readings (file_id);
CREATE INDEX IF NOT EXISTS ix_machine_readings_user_id  ON machine_readings (user_id);
CREATE INDEX IF NOT EXISTS ix_machine_readings_file_row ON machine_readings (file_id, row_number);

COMMENT ON TABLE machine_readings IS 'Raw sensor data extracted from uploaded files. Each row in the CSV/Excel becomes one record.';
COMMENT ON COLUMN machine_readings.extra_data IS 'Additional columns not mapped to named fields, stored as JSON';


-- ── 4. Analyses ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analyses (
    id                BIGSERIAL    PRIMARY KEY,
    user_id           BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_id           BIGINT       REFERENCES uploaded_files(id) ON DELETE SET NULL,
    "timestamp"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    total_records     INTEGER      NOT NULL,
    failure_count     INTEGER      NOT NULL DEFAULT 0,
    high_risk_count   INTEGER      NOT NULL DEFAULT 0,
    medium_risk_count INTEGER      NOT NULL DEFAULT 0,
    low_risk_count    INTEGER      NOT NULL DEFAULT 0,
    failure_rate      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    avg_probability   DOUBLE PRECISION,
    model_version     VARCHAR(100),
    notes             TEXT         DEFAULT ''
);

CREATE INDEX IF NOT EXISTS ix_analyses_user_id ON analyses (user_id);
CREATE INDEX IF NOT EXISTS ix_analyses_file_id ON analyses (file_id);

COMMENT ON TABLE analyses IS 'Analysis run summaries — aggregate stats from each prediction batch.';


-- ── 5. Prediction Results ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prediction_results (
    id                  BIGSERIAL    PRIMARY KEY,
    analysis_id         BIGINT       NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    row_number          INTEGER      NOT NULL,
    will_fail           BOOLEAN      NOT NULL,
    failure_probability DOUBLE PRECISION NOT NULL,
    risk_level          VARCHAR(50)  NOT NULL,
    failure_reason      VARCHAR(255),
    recommendation      TEXT,
    confidence_low      DOUBLE PRECISION DEFAULT 0.0,
    confidence_high     DOUBLE PRECISION DEFAULT 0.0,
    shap_contributors   JSONB,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_prediction_results_analysis_id  ON prediction_results (analysis_id);
CREATE INDEX IF NOT EXISTS ix_prediction_results_analysis_row ON prediction_results (analysis_id, row_number);

COMMENT ON TABLE prediction_results IS 'Individual prediction records — one per row in the uploaded file.';
COMMENT ON COLUMN prediction_results.shap_contributors IS 'SHAP feature importance values as JSON';


-- ── 6. Audit Logs ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    action     VARCHAR(100) NOT NULL,
    details    TEXT         NOT NULL DEFAULT '',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id    ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at);


-- ── 7. Scheduled Jobs ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id           BIGSERIAL    PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id       VARCHAR(255) NOT NULL UNIQUE,
    csv_filename VARCHAR(500) NOT NULL,
    schedule     VARCHAR(100) NOT NULL,
    last_run     TIMESTAMPTZ,
    next_run     TIMESTAMPTZ,
    active       BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS ix_scheduled_jobs_user_id ON scheduled_jobs (user_id);


-- ── 8. Webhook Configs ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS webhook_configs (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url        TEXT         NOT NULL,
    secret     VARCHAR(255) NOT NULL DEFAULT '',
    enabled    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_webhook_configs_user_id ON webhook_configs (user_id);


-- ── 9. Model Versions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS model_versions (
    id               BIGSERIAL    PRIMARY KEY,
    version          VARCHAR(100) NOT NULL UNIQUE,
    trained_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    trained_by       VARCHAR(100),
    training_rows    INTEGER      NOT NULL DEFAULT 0,
    failure_accuracy DOUBLE PRECISION,
    reason_accuracy  DOUBLE PRECISION,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    training_file_id BIGINT       REFERENCES uploaded_files(id) ON DELETE SET NULL,
    metadata_json    JSONB,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE model_versions IS 'ML model training history — tracks each retrain with accuracy metrics.';


-- ── 10. Row Level Security (optional — enable for multi-tenant) ──────────────

-- Uncomment below to enable RLS on key tables:
-- ALTER TABLE uploaded_files    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE machine_readings  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE analyses          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE prediction_results ENABLE ROW LEVEL SECURITY;


-- ── Done ─────────────────────────────────────────────────────────────────────
-- Run this SQL in Supabase Dashboard → SQL Editor to create all tables.
-- Then set SUPABASE_DB_URL in your .env file and start the backend.
