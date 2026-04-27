# Implementation Plan: Project Analysis & Debug

## Overview

Fix 7 confirmed bugs across the FastAPI backend and React/TypeScript frontend, add a real authentication endpoint, and build a property-based + unit test suite using Hypothesis and pytest.

Backend changes come first (config → schemas → auth route → main wiring → ml_service → train_models), followed by frontend fixes, then the full test suite.

## Tasks

- [x] 1. Harden `app/config.py` with secure defaults and auth settings
  - Change `cors_origins` default from `["*"]` to `["http://localhost:3000"]`
  - Add `jwt_secret_key: str` field reading `JWT_SECRET_KEY` env var (default: `"dev-secret-key-change-in-prod"`)
  - Add `auth_username: str` reading `AUTH_USERNAME` env var (default: `"admin"`)
  - Add `auth_password: str` reading `AUTH_PASSWORD` env var (default: `"predictive2024"`)
  - _Requirements: 9.1, 9.4_

- [x] 2. Create `app/schemas/auth_schema.py` with Pydantic auth models
  - [x] 2.1 Implement `LoginRequest` and `LoginResponse` Pydantic models
    - `LoginRequest`: `username: str`, `password: str`
    - `LoginResponse`: `access_token: str`, `token_type: Literal["bearer"]`
    - _Requirements: 5.1, 9.4_

- [x] 3. Create `app/routes/auth.py` — real JWT login endpoint
  - [x] 3.1 Implement `POST /auth/login` using `python-jose` (HS256)
    - Read credentials from `settings.auth_username` / `settings.auth_password`
    - On match: issue JWT with claims `sub`, `email`, `exp` (+24h), `iat` signed with `settings.jwt_secret_key`
    - On mismatch: raise `HTTPException(status_code=401)` with `"Invalid credentials"` message
    - Return `LoginResponse(access_token=token, token_type="bearer")`
    - _Requirements: 5.1, 9.2, 9.4, 9.5_

- [x] 4. Register auth router in `app/main.py`
  - Import `auth_router` from `app.routes.auth`
  - Call `app.include_router(auth_router, tags=["auth"])` inside `create_application()`
  - _Requirements: 5.1, 1.7_

- [x] 5. Fix `app/services/ml_service.py` — reason model called on failures only (Bug 2)
  - [x] 5.1 Refactor `predict_failures` to gate reason model on `will_fail=True` rows
    - Collect `failure_indices` where `failure_probability >= 0.5`
    - Call `reason_model.predict(features[failure_indices])` only when `failure_indices` is non-empty
    - Build `reason_map = dict(zip(failure_indices, reason_predictions))`
    - In the result loop: set `failure_reason = FAILURE_REASON_MAP[reason_map[idx]]` if `idx in reason_map`, else `None`
    - _Requirements: 2.6, 2.7_
  - [ ]* 5.2 Write unit test for `predict_failures` with mixed failing/non-failing rows
    - Assert `failure_reason is None` for every row where `will_fail=False`
    - Assert `failure_reason` is one of the five defined strings for every row where `will_fail=True`
    - _Requirements: 2.6, 2.7_

- [x] 6. Fix `train_models.py` — replace hardcoded path with argparse + env var (Bug 6)
  - Add `import argparse, sys` at the top
  - Replace the hardcoded `CSV_FILE_PATH` assignment with:
    - `parser.add_argument("--data-path", default=os.environ.get("DATA_PATH"))`
    - Exit with code 1 and a clear message if path is missing or file not found
  - _Requirements: 8.1, 8.2_

- [ ] 7. Checkpoint — backend changes complete
  - Ensure all existing pytest tests still pass, ask the user if questions arise.

- [x] 8. Fix `frontend/src/contexts/AuthContext.tsx` — real backend auth (Bugs 1 & 5)
  - [x] 8.1 Replace `btoa` mock token and hardcoded credentials with a real `/auth/login` call
    - Remove the `validCredentials` object and `btoa(JSON.stringify(...))` block
    - Call `axios.post('/auth/login', { username, password })` and extract `access_token`
    - Store the real JWT in `localStorage` and decode it with `jwtDecode`
    - The existing `useEffect` on mount already handles token restoration correctly once the token is a real 3-segment JWT
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 9.2, 9.4_

- [x] 9. Fix `frontend/src/components/FileUpload.tsx` — CSV only (Bug 3)
  - [x] 9.1 Remove Excel MIME types from dropzone `accept` config and update validation
    - Remove `'application/vnd.ms-excel': ['.xls']` and `'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']` entries
    - Update `onDrop` validation: remove `.xlsx` check, keep only `.csv`
    - Update UI text from `"Supported formats: CSV, Excel (.xlsx)"` to `"Supported formats: CSV only"`
    - _Requirements: 6.3, 4.1, 4.2_

- [x] 10. Fix `frontend/src/components/AnalysisResults.tsx` — pagination (Bug 7)
  - [x] 10.1 Replace `.slice(0, 10)` with page-based pagination (page size 50)
    - Add `const [currentPage, setCurrentPage] = useState(1)` and `const PAGE_SIZE = 50`
    - Add `useEffect(() => setCurrentPage(1), [data])` to reset on new results
    - Compute `paginatedPredictions = data.predictions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)`
    - Compute `totalPages = Math.ceil(data.predictions.length / PAGE_SIZE)`
    - Replace `data.predictions.slice(0, 10).map(...)` with `paginatedPredictions.map(...)`
    - Update the "Showing first 10 of N" label to show current range and total
    - Add Previous / Next buttons and a page indicator below the table; disable Previous on page 1, Next on last page
    - _Requirements: 7.1, 7.2_

- [ ] 11. Checkpoint — frontend changes complete
  - Ensure the app compiles without TypeScript errors, ask the user if questions arise.

- [x] 12. Create `tests/` directory and property-based tests for the ML pipeline
  - [x] 12.1 Create `tests/__init__.py` (empty) and `tests/conftest.py` with shared model fixture
    - Load `failure_model` and `reason_model` once via a session-scoped pytest fixture
    - _Requirements: 10.1_
  - [ ]* 12.2 Write property test — Property 1: output count equals input row count
    - **Property 1: Output count equals input row count**
    - **Validates: Requirements 1.8, 1.9, 10.1**
    - Use `@given(npst.arrays(..., shape=(n, 5)))` with `n` drawn from `st.integers(1, 50)`
    - Assert `len(predict_failures(features, ...)) == n`
  - [ ]* 12.3 Write property test — Property 2: all failure probabilities in [0.0, 1.0]
    - **Property 2: All failure probabilities are in [0.0, 1.0]**
    - **Validates: Requirements 2.1, 10.2**
    - Assert `0.0 <= p.failure_probability <= 1.0` for every result
  - [ ]* 12.4 Write property test — Property 3: all risk levels in valid set
    - **Property 3: All risk levels are in the valid set**
    - **Validates: Requirements 2.2, 10.3**
    - Assert `p.risk_level in {"High Risk", "Medium Risk", "Low Risk"}` for every result
  - [ ]* 12.5 Write property test — Property 4: risk level thresholds are correct
    - **Property 4: Risk level thresholds are correct**
    - **Validates: Requirements 2.3, 2.4, 2.5, 10.6**
    - Use `@given(st.floats(min_value=0.0, max_value=1.0, allow_nan=False))`
    - Assert `calculate_risk_level(p) == "High Risk"` iff `p >= 0.8`, etc.
  - [ ]* 12.6 Write property test — Property 5: failure_reason null iff will_fail false
    - **Property 5: failure_reason is null if and only if will_fail is false**
    - **Validates: Requirements 2.6, 2.7**
    - Assert `result.failure_reason is None` iff `result.will_fail is False`
  - [ ]* 12.7 Write property test — Property 6: will_fail determined by 0.5 threshold
    - **Property 6: will_fail is determined by the 0.5 threshold**
    - **Validates: Requirements 2.8, 10.6**
    - Assert `result.will_fail == (result.failure_probability >= 0.5)` for every result
  - [ ]* 12.8 Write property test — Property 7: recommendation chain is correct
    - **Property 7: Recommendation chain is correct**
    - **Validates: Requirements 2.9, 2.10, 2.11, 2.12, 10.7**
    - Use `@given(st.floats(min_value=0.0, max_value=1.0, allow_nan=False))`
    - Assert `generate_recommendation(calculate_risk_level(p))` is one of the three defined strings
  - [ ]* 12.9 Write property test — Property 8: row values are sequential 1..n
    - **Property 8: Row values are sequential 1..n**
    - **Validates: Requirements 10.4**
    - Assert `[r.row for r in results] == list(range(1, n + 1))`

- [x] 13. Create `tests/test_preprocessing_properties.py` — preprocessing property tests
  - [ ]* 13.1 Write property test — Property 9: preprocessor output shape and dtype
    - **Property 9: Preprocessor output shape and dtype**
    - **Validates: Requirements 3.1, 3.2, 10.5**
    - Use `@given(st.integers(min_value=1, max_value=200))` to generate `n_rows`
    - Build a valid DataFrame with `make_valid_dataframe(n_rows)` helper
    - Assert `result.shape == (n_rows, 5)` and `result.dtype == np.float64`
  - [ ]* 13.2 Write property test — Property 10: row order preserved in preprocessing
    - **Property 10: Row order is preserved in preprocessing**
    - **Validates: Requirements 3.6**
    - Assert `output[i]` values match `input.iloc[i]` values for all `i`

- [x] 14. Create `tests/test_pagination_properties.py` — pagination property test
  - [ ]* 14.1 Write property test — Property 11: pagination shows all records
    - **Property 11: Pagination shows all records**
    - **Validates: Requirements 7.1, 7.2**
    - Use `@given(st.integers(min_value=0, max_value=500), st.integers(min_value=1, max_value=100))`
    - Simulate the pagination slice logic and assert union of all pages equals full list with no duplicates

- [x] 15. Create unit tests
  - [x]* 15.1 Create `tests/test_ml_service.py` — unit tests for `calculate_risk_level` and `generate_recommendation`
    - Test exact threshold boundaries: `p=0.5` → Medium Risk, `p=0.8` → High Risk, `p=0.4999` → Low Risk
    - Test `generate_recommendation` for each of the three risk levels
    - _Requirements: 2.3, 2.4, 2.5, 2.9, 2.10, 2.11, 2.12_
  - [x]* 15.2 Create `tests/test_validation_service.py` — unit tests for validators
    - Test `validate_file_type` with `.csv`, `.CSV`, `.xlsx`, `.txt`
    - Test `validate_csv_structure` with missing columns, non-numeric data, empty DataFrame
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x]* 15.3 Create `tests/test_preprocessing_service.py` — unit tests for `extract_features`
    - Test NaN in a feature column raises `ValueError`
    - Test missing required column raises `ValueError`
    - Test correct column order in output
    - _Requirements: 3.3, 3.4, 3.5_
  - [x]* 15.4 Create `tests/test_auth.py` — unit tests for `POST /auth/login`
    - Test valid credentials → HTTP 200 with `access_token` and `token_type: "bearer"`
    - Test invalid credentials → HTTP 401 with `"Invalid credentials"` message
    - _Requirements: 5.1, 9.4_

- [ ] 16. Final checkpoint — Ensure all tests pass
  - Run `pytest tests/ -v` and confirm all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Backend tasks (1–6) must be completed before frontend tasks (8–10)
- Property tests in tasks 12–14 require the task 5 fix to be in place (reason model gating)
- `python-jose` and `hypothesis` are already listed in `requirements.txt`
- Run tests with `pytest tests/ -v` (no watch mode)
