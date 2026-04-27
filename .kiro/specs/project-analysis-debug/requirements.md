# Requirements Document

## Introduction

This document captures the audit, debugging, and quality requirements for the Predictive Maintenance System — a full-stack AI-powered web application. The system uses two Random Forest classifiers to predict equipment failure likelihood and failure reason from industrial sensor data (temperature, speed, torque, tool wear). It is built with a FastAPI backend and a React/TypeScript frontend secured with JWT authentication.

The goal of this spec is to define what "correct and complete" looks like for every layer of the system, identify known bugs and gaps discovered during code analysis, and establish property-based and example-based acceptance criteria that can be used to verify correctness.

**Bugs identified during analysis (to be fixed as part of this work):**

1. **Auth token is not a valid JWT** — `AuthContext.tsx` creates a mock token using `btoa(JSON.stringify({...}))`, which produces a single base64 segment. `jwtDecode` expects `header.payload.signature` (3 dot-separated segments). On every page refresh, `jwtDecode` throws, the catch block removes the token, and the user is logged out. Session persistence is completely broken.

2. **Reason model called on all rows** — `predict_failures` in `ml_service.py` calls `reason_model.predict(features)` on every row, including rows where `will_fail=False`. The reason model was trained only on failure cases, so predicting reasons for non-failures produces semantically invalid output.

3. **Frontend accepts .xlsx but backend rejects it** — The `FileUpload` dropzone accepts `.xls` and `.xlsx` MIME types and shows them as valid, but `validate_file_type` in `validation_service.py` only accepts `.csv`. Users can select an Excel file, click Analyze, and receive a confusing backend error.

4. **CORS wildcard in production config** — `cors_origins` defaults to `["*"]`, which is insecure for any non-local deployment.

5. **Hardcoded credentials in frontend source** — Login credentials (`admin` / `predictive2024`) are hardcoded in `AuthContext.tsx` and visible in the browser bundle. Authentication is entirely client-side with no backend involvement.

6. **train_models.py has an absolute hardcoded path** — `CSV_FILE_PATH` is set to `C:/Users/awmha/projects/...`, making the training script non-portable.

7. **Table shows only first 10 rows with no pagination** — `AnalysisResults.tsx` slices `data.predictions.slice(0, 10)` with no way to view remaining records.

---

## Glossary

- **System**: The complete Predictive Maintenance application (backend + frontend).
- **API**: The FastAPI backend service running on port 8001.
- **Frontend**: The React/TypeScript SPA running on port 3000.
- **ML_Pipeline**: The chain of preprocessing → failure model → reason model → response assembly.
- **Failure_Model**: The binary Random Forest classifier predicting whether a machine will fail.
- **Reason_Model**: The multi-class Random Forest classifier predicting the failure reason, trained only on failure cases.
- **Preprocessor**: The `preprocessing_service.py` module responsible for feature extraction.
- **Validator**: The `validation_service.py` module responsible for CSV structure validation.
- **Auth_Context**: The `AuthContext.tsx` React context managing authentication state.
- **Prediction_Result**: A single row's prediction output containing `row`, `will_fail`, `failure_probability`, `risk_level`, `failure_reason`, and `recommendation`.
- **Prediction_Response**: The full API response containing `status`, `total_records`, and a list of `Prediction_Result` objects.
- **Risk_Level**: One of three strings: `"High Risk"`, `"Medium Risk"`, or `"Low Risk"`.
- **JWT**: JSON Web Token — a signed, three-segment (`header.payload.signature`) authentication token.
- **CSV**: Comma-separated values file containing machine sensor readings.
- **Feature_Array**: A numpy array of shape `(n, 5)` with dtype `float64` representing extracted sensor features.

---

## Requirements

### Requirement 1: Backend API Endpoint Correctness

**User Story:** As a frontend developer, I want the `/predict` and `/health` endpoints to behave according to their documented contracts, so that I can build a reliable UI on top of them.

#### Acceptance Criteria

1. WHEN a valid CSV file with all required columns is uploaded to `/predict`, THE API SHALL return HTTP 200 with a `PredictionResponse` body where `status` equals `"success"`.
2. WHEN a non-CSV file is uploaded to `/predict`, THE API SHALL return HTTP 400 with an error body containing a `message` field and a non-empty `details` list.
3. WHEN a CSV file is uploaded with one or more required columns missing, THE API SHALL return HTTP 400 with a `details` list naming each missing column.
4. WHEN a CSV file is uploaded with non-numeric data in a required column, THE API SHALL return HTTP 400 with a `details` list identifying the affected column and row numbers.
5. WHEN the `/health` endpoint is called and both models are loaded, THE API SHALL return HTTP 200 with `model_loaded` equal to `true` and `status` equal to `"healthy"`.
6. WHEN the `/health` endpoint is called, THE API SHALL return a response that conforms to the `HealthResponse` schema with all four required fields present.
7. THE API SHALL include CORS headers in all responses, allowing the frontend origin to make cross-origin requests.
8. FOR ALL valid CSV uploads, the `total_records` field in the response SHALL equal the number of data rows in the uploaded CSV file.
9. FOR ALL valid CSV uploads, the length of the `predictions` array SHALL equal `total_records`.

---

### Requirement 2: ML Pipeline Correctness

**User Story:** As a data engineer, I want the ML inference pipeline to produce semantically valid and internally consistent predictions, so that the output can be trusted for maintenance decisions.

#### Acceptance Criteria

1. FOR ALL rows in a valid CSV, THE ML_Pipeline SHALL produce a `failure_probability` value in the closed interval `[0.0, 1.0]`.
2. FOR ALL rows in a valid CSV, THE ML_Pipeline SHALL produce a `risk_level` that is exactly one of `"High Risk"`, `"Medium Risk"`, or `"Low Risk"`.
3. FOR ALL rows where `failure_probability >= 0.8`, THE ML_Pipeline SHALL assign `risk_level` equal to `"High Risk"`.
4. FOR ALL rows where `failure_probability >= 0.5` and `failure_probability < 0.8`, THE ML_Pipeline SHALL assign `risk_level` equal to `"Medium Risk"`.
5. FOR ALL rows where `failure_probability < 0.5`, THE ML_Pipeline SHALL assign `risk_level` equal to `"Low Risk"`.
6. FOR ALL rows where `will_fail` is `false`, THE ML_Pipeline SHALL assign `failure_reason` equal to `null`.
7. FOR ALL rows where `will_fail` is `true`, THE ML_Pipeline SHALL assign a non-null `failure_reason` that is one of the five defined failure types: `"Tool Wear Failure"`, `"Heat Dissipation Failure"`, `"Power Failure"`, `"Overstrain Failure"`, or `"Random Failure"`.
8. FOR ALL rows, THE ML_Pipeline SHALL assign `will_fail` equal to `true` if and only if `failure_probability >= 0.5`.
9. FOR ALL rows, THE ML_Pipeline SHALL assign a `recommendation` that is one of: `"Immediate maintenance required"`, `"Schedule maintenance within 7 days"`, or `"Continue normal operations"`.
10. FOR ALL rows where `risk_level` equals `"High Risk"`, THE ML_Pipeline SHALL assign `recommendation` equal to `"Immediate maintenance required"`.
11. FOR ALL rows where `risk_level` equals `"Medium Risk"`, THE ML_Pipeline SHALL assign `recommendation` equal to `"Schedule maintenance within 7 days"`.
12. FOR ALL rows where `risk_level` equals `"Low Risk"`, THE ML_Pipeline SHALL assign `recommendation` equal to `"Continue normal operations"`.

---

### Requirement 3: Preprocessing and Feature Extraction Correctness

**User Story:** As a backend developer, I want the preprocessing service to reliably transform CSV data into model-ready feature arrays, so that the ML models receive correctly shaped and typed input.

#### Acceptance Criteria

1. WHEN `extract_features` is called with a valid DataFrame of `n` rows, THE Preprocessor SHALL return a numpy array with shape `(n, 5)`.
2. WHEN `extract_features` is called with a valid DataFrame, THE Preprocessor SHALL return an array with dtype `float64`.
3. WHEN `extract_features` is called with a DataFrame containing a `NaN` value in any feature column, THE Preprocessor SHALL raise a `ValueError` with a message identifying the column and row number.
4. WHEN `extract_features` is called with a DataFrame missing any required column, THE Preprocessor SHALL raise a `ValueError`.
5. THE Preprocessor SHALL extract feature columns in the fixed order: `Air temperature [K]`, `Process temperature [K]`, `Rotational speed [rpm]`, `Torque [Nm]`, `Tool wear [min]`.
6. FOR ALL valid DataFrames, the row order in the output Feature_Array SHALL match the row order in the input DataFrame.

---

### Requirement 4: CSV Validation Correctness

**User Story:** As a backend developer, I want the validation service to reject malformed inputs early with clear error messages, so that invalid data never reaches the ML models.

#### Acceptance Criteria

1. WHEN `validate_file_type` is called with a filename ending in `.csv` (case-insensitive), THE Validator SHALL not raise an exception.
2. WHEN `validate_file_type` is called with a filename not ending in `.csv`, THE Validator SHALL raise a `ValueError`.
3. WHEN `validate_csv_structure` is called with a DataFrame containing all five required columns with numeric data, THE Validator SHALL not raise an exception.
4. WHEN `validate_csv_structure` is called with a DataFrame missing one or more required columns, THE Validator SHALL raise a `ValueError` listing all missing column names.
5. WHEN `validate_csv_structure` is called with a DataFrame where a required column contains non-numeric string values, THE Validator SHALL raise a `ValueError` identifying the column and the affected row numbers.
6. IF a CSV file contains zero data rows (header only), THEN THE Validator SHALL raise a `ValueError` indicating the file is empty.

---

### Requirement 5: Authentication Correctness

**User Story:** As a user, I want my login session to persist across page refreshes, so that I do not have to log in again every time I reload the dashboard.

#### Acceptance Criteria

1. WHEN a user successfully logs in, THE Auth_Context SHALL store a token in `localStorage` that can be decoded by `jwtDecode` without throwing an exception.
2. WHEN the application loads and a valid, non-expired token exists in `localStorage`, THE Auth_Context SHALL restore the authenticated session without requiring the user to log in again.
3. WHEN the application loads and an expired token exists in `localStorage`, THE Auth_Context SHALL remove the token and present the login page.
4. WHEN the application loads and a malformed token exists in `localStorage`, THE Auth_Context SHALL remove the token and present the login page.
5. WHEN a user logs out, THE Auth_Context SHALL remove the token from `localStorage` and set `isAuthenticated` to `false`.
6. WHEN `isAuthenticated` is `false`, THE Frontend SHALL redirect any navigation to `/dashboard` to the `/login` page.
7. WHEN `isAuthenticated` is `true`, THE Frontend SHALL redirect any navigation to `/login` to the `/dashboard` page.

---

### Requirement 6: Frontend-Backend Contract Alignment

**User Story:** As a frontend developer, I want the TypeScript types and API error handling to match the actual backend response shapes, so that errors are displayed correctly and type safety is maintained.

#### Acceptance Criteria

1. THE Frontend SHALL send CSV upload requests to `/api/predict` using `multipart/form-data` with the file field named `file`.
2. WHEN the backend returns an HTTP error, THE Frontend SHALL display the `message` field from the error response body to the user.
3. THE Frontend SHALL only accept `.csv` files in the file upload dropzone, consistent with what the backend accepts.
4. THE `PredictionResponse` TypeScript interface SHALL match the backend `PredictionResponse` Pydantic schema field-for-field.
5. THE `PredictionResult` TypeScript interface SHALL match the backend `PredictionResult` Pydantic schema field-for-field, including the `failure_reason` field being typed as `string | null`.
6. WHEN a `Prediction_Result` has `failure_reason` equal to JSON `null`, THE Frontend SHALL display `"-"` or `"N/A"` rather than the string `"null"`.

---

### Requirement 7: Results Display Completeness

**User Story:** As an analyst, I want to view all prediction results and download a complete report, so that I can review every machine's status without being limited to a partial view.

#### Acceptance Criteria

1. WHEN analysis results are displayed, THE Frontend SHALL show all prediction records, not only the first 10.
2. WHERE the total number of records exceeds 50, THE Frontend SHALL provide pagination or virtual scrolling to display all records without degrading browser performance.
3. WHEN the "Download Report" button is clicked, THE Frontend SHALL generate and download a CSV file containing all prediction records.
4. THE Frontend SHALL display summary statistics including total records, predicted failures count, high-risk count, and healthy count.
5. WHEN the risk distribution chart is rendered, THE Frontend SHALL display correct counts for all three risk levels based on the actual prediction data.

---

### Requirement 8: Model Training Portability

**User Story:** As a developer setting up the project on a new machine, I want the model training script to work without manual path edits, so that I can reproduce the trained models from any environment.

#### Acceptance Criteria

1. THE `train_models.py` script SHALL accept the dataset file path as a command-line argument or environment variable rather than a hardcoded absolute path.
2. WHEN the dataset file is not found at the specified path, THE `train_models.py` script SHALL print a clear error message and exit with a non-zero exit code.
3. THE `train_models.py` script SHALL save trained models to paths relative to the project root, not absolute paths.

---

### Requirement 9: Security and Configuration Hardening

**User Story:** As a system operator, I want the application to follow security best practices, so that it is safe to deploy beyond a local development environment.

#### Acceptance Criteria

1. THE API SHALL NOT use `cors_origins = ["*"]` in any non-development configuration.
2. THE Frontend SHALL NOT contain hardcoded credentials in any source file that is compiled into the browser bundle.
3. THE API SHALL validate that uploaded files do not exceed a configurable maximum file size, returning HTTP 413 if the limit is exceeded.
4. WHERE authentication is required, THE System SHALL verify credentials against a backend endpoint rather than performing credential checks entirely in client-side JavaScript.
5. THE API SHALL NOT expose internal error details (stack traces, file paths) in HTTP 500 responses sent to clients.

---

### Requirement 10: Property-Based Correctness Properties

**User Story:** As a QA engineer, I want property-based tests that verify the ML pipeline and preprocessing invariants hold for arbitrary valid inputs, so that edge cases are caught automatically.

#### Acceptance Criteria

1. FOR ALL numpy arrays of shape `(n, 5)` with `n >= 1` and finite float64 values, THE ML_Pipeline SHALL return exactly `n` Prediction_Result objects.
2. FOR ALL numpy arrays of shape `(n, 5)` with finite float64 values, THE ML_Pipeline SHALL return `failure_probability` values that are all in `[0.0, 1.0]`.
3. FOR ALL numpy arrays of shape `(n, 5)` with finite float64 values, THE ML_Pipeline SHALL return `risk_level` values that are all members of `{"High Risk", "Medium Risk", "Low Risk"}`.
4. FOR ALL numpy arrays of shape `(n, 5)` with finite float64 values, THE ML_Pipeline SHALL return `row` values equal to `[1, 2, ..., n]` in order.
5. FOR ALL valid DataFrames with `n` rows and all five required columns containing finite numeric values, THE Preprocessor SHALL return a Feature_Array of shape `(n, 5)` with dtype `float64`.
6. FOR ALL failure probability values `p` in `[0.0, 1.0]`, THE ML_Pipeline SHALL assign `will_fail = (p >= 0.5)` and `risk_level` consistent with the defined thresholds.
7. FOR ALL failure probability values `p` in `[0.0, 1.0]`, calling `calculate_risk_level(p)` followed by `generate_recommendation(calculate_risk_level(p))` SHALL return a non-empty string that is one of the three defined recommendation strings.
