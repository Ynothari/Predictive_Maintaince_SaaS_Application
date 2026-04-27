# Implementation Plan: SaaS Upgrade — Predictive Maintenance

## Overview

Transform the existing single-user Predictive Maintenance app into a multi-user SaaS platform. Backend work comes first (user store, schemas, auth routes, startup wiring, dependencies), followed by frontend restructuring (routing, layout, sidebar), new pages, modifications to existing components, and finally tests.

## Tasks

- [x] 1. Add passlib[bcrypt] to requirements.txt
  - Append `passlib[bcrypt]==1.7.4` to `requirements.txt`
  - _Requirements: 10.2_

- [x] 2. Create app/services/user_store.py
  - [x] 2.1 Implement user_store module with all CRUD functions
    - Define `UserRecord` TypedDict with fields: `username`, `email`, `full_name`, `hashed_password`
    - Implement `load_users() -> list[UserRecord]` — reads `data/users.json`, returns `[]` on missing file, raises descriptive exception on corrupted JSON
    - Implement `save_users(users: list[UserRecord]) -> None` — writes JSON to `data/users.json`
    - Implement `find_user_by_username(username: str) -> UserRecord | None`
    - Implement `find_user_by_email(email: str) -> UserRecord | None`
    - Implement `append_user(user_record: UserRecord) -> None` — load, append, save
    - Implement `init_user_store() -> None` — creates `data/` directory and empty `data/users.json` if either is missing
    - _Requirements: 3.6, 3.8, 3.9_

  - [ ]* 2.2 Write unit tests for user_store in tests/test_user_store.py
    - Test `init_user_store()` creates `data/` and `data/users.json` when missing
    - Test `append_user` persists a record retrievable by `find_user_by_username` and `find_user_by_email`
    - Test `find_user_by_username` returns `None` for unknown username
    - Test `find_user_by_email` returns `None` for unknown email
    - Test `load_users` raises descriptive exception on corrupted JSON
    - Use `tmp_path` fixture to isolate file I/O from real `data/` directory
    - _Requirements: 3.6, 3.8, 3.9_

- [x] 3. Extend app/schemas/auth_schema.py
  - Add `RegisterRequest(BaseModel)` with fields: `full_name: str`, `email: EmailStr`, `username: str`, `password: str = Field(min_length=8)`
  - Add `RegisterResponse(BaseModel)` with fields: `access_token: str`, `token_type: Literal["bearer"]`
  - Add `ChangePasswordRequest(BaseModel)` with fields: `current_password: str`, `new_password: str = Field(min_length=8)`
  - Import `EmailStr` from `pydantic` and `Field` from `pydantic`
  - _Requirements: 3.1, 3.4, 9.9_

- [x] 4. Extend app/routes/auth.py with register and change-password endpoints
  - [x] 4.1 Extend POST /auth/login to check user store first
    - Import `find_user_by_username` from `app.services.user_store`
    - Import `CryptContext` from `passlib.context`
    - In the login handler: call `find_user_by_username(body.username)` first; if found, verify bcrypt hash; if not found, fall back to existing hardcoded admin comparison
    - Preserve existing JWT payload shape (`sub`, `email`, `exp`, `iat`) and error response shape
    - _Requirements: 3.10, 3.11_

  - [x] 4.2 Implement POST /auth/register
    - Accept `RegisterRequest` body
    - Call `find_user_by_username` → return HTTP 409 `{"detail": "Username already exists"}` if found
    - Call `find_user_by_email` → return HTTP 409 `{"detail": "Email already registered"}` if found
    - Hash password with `CryptContext(schemes=["bcrypt"]).hash(password)`
    - Call `append_user({username, email, full_name, hashed_password})`
    - Issue JWT with same payload shape as login (`sub`, `email`, `exp`, `iat`, 24h expiry)
    - Return `RegisterResponse`
    - Catch user store exceptions and return HTTP 500 `{"detail": "User store unavailable"}`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 4.3 Implement POST /auth/change-password
    - Require `Authorization: Bearer <token>` header; decode JWT → HTTP 401 if invalid/missing
    - Call `find_user_by_username(token.sub)` → HTTP 401 if not found (admin cannot use this endpoint)
    - Verify `current_password` against stored hash → HTTP 401 `{"detail": "Current password is incorrect"}` if mismatch
    - Hash `new_password`, update record in user store via `save_users`
    - Return HTTP 200
    - _Requirements: 9.9, 9.10, 9.11_

- [x] 5. Update app/main.py — call init_user_store() in lifespan startup
  - Import `init_user_store` from `app.services.user_store`
  - Call `init_user_store()` inside the `lifespan` async context manager before `yield`
  - _Requirements: 3.8_

- [ ] 6. Checkpoint — backend wiring complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Add AnalysisRecord type to frontend/src/types/index.ts
  - Export `interface AnalysisRecord` with fields: `id: string`, `timestamp: string`, `totalRecords: number`, `failureCount: number`, `highRiskCount: number`
  - _Requirements: 6.4, 6.5_

- [x] 8. Extend AuthContext.tsx with register and changePassword methods
  - Add `register(fullName: string, email: string, username: string, password: string): Promise<void>` — POST `/auth/register`, on success caller navigates to `/login`
  - Add `changePassword(currentPassword: string, newPassword: string): Promise<void>` — POST `/auth/change-password` with `Authorization: Bearer <token>` header
  - Update `AuthContextType` interface to include both new methods
  - _Requirements: 2.7, 2.8, 9.6_

- [x] 9. Restructure App.tsx with new route tree
  - Add `RootRedirect` component: renders `<Navigate to="/app/dashboard" replace />` if authenticated, else renders `<LandingPage />`
  - Add `PublicRoute` component: renders `<Navigate to="/app/dashboard" replace />` if authenticated, else renders children
  - Replace existing routes with:
    - `<Route path="/" element={<RootRedirect />} />`
    - `<Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />`
    - `<Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />`
    - `<Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>` with nested routes for `dashboard`, `upload`, `analytics`, `settings`
    - Index route under `/app` redirects to `/app/dashboard`
  - _Requirements: 1.1, 1.8, 2.1, 4.1, 10.6_

- [x] 10. Create frontend/src/layouts/AppLayout.tsx
  - Render `<Sidebar />` and `<Outlet />` side by side in a full-height flex container
  - Main content area: `flex-1 overflow-y-auto bg-gray-50`
  - _Requirements: 4.1, 4.9_

- [x] 11. Create frontend/src/components/Sidebar.tsx
  - Define `navItems` array: Dashboard (`/app/dashboard`, `LayoutDashboard` icon), Upload Data (`/app/upload`, `Upload` icon), Analytics (`/app/analytics`, `BarChart2` icon), Settings (`/app/settings`, `Settings` icon)
  - Use `useLocation()` to determine active item; apply `ring-2` / active highlight class to matching nav item only
  - Display authenticated user's username and initials avatar at the bottom
  - Render "Logout" button that calls `logout()` and navigates to `/login`
  - Mobile: hamburger button (`md:hidden`) toggles `isSidebarOpen` state; overlay `<div>` closes sidebar on click
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 12. Create frontend/src/pages/LandingPage.tsx
  - Hero section: headline, subheadline, "Get Started" `<Link to="/signup">`, "Sign In" `<Link to="/login">`
  - Features section: at least 3 feature cards with lucide-react icons
  - "How It Works" section: 3-step numbered list describing the analysis workflow
  - CTA footer section: "Get Started" button linking to `/signup`
  - No auth state needed; use `<Link>` from react-router-dom throughout
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 13. Create frontend/src/pages/SignupPage.tsx
  - Form fields: full name, email, username, password, confirm password
  - Client-side validation on submit: all fields required, email matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, password ≥ 8 chars, confirm password matches password
  - Display inline error messages per field without clearing fields on validation failure
  - On submit: call `register()` from `useAuth()`; on success navigate to `/login` with state `{ message: 'Account created. Please sign in.' }`
  - On 409 response: display backend error message inline, preserve fields
  - Include `<Link to="/login">` for existing users
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_

- [x] 14. Create frontend/src/pages/AppDashboardPage.tsx
  - Read `analyses_${user.username}` from localStorage; parse as `AnalysisRecord[]`; treat parse errors as empty array
  - Summary cards: total analyses (`history.length`), most recent date (`history.at(-1)?.timestamp` formatted), total failures (`history.reduce`), model accuracy (hardcoded `"98.82%"`)
  - "Recent Analyses" list: `history.slice(-5).reverse()` — each row shows date, record count, failure count
  - Empty state when `history.length === 0`: message + "Run Your First Analysis" button → `navigate('/app/upload')`
  - "New Analysis" button → `navigate('/app/upload')`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 15. Create frontend/src/pages/UploadPage.tsx (replaces DashboardPage)
  - Move existing `FileUpload` + `AnalysisResults` composition from `DashboardPage.tsx` into this new file at `frontend/src/pages/UploadPage.tsx`
  - In `handleAnalysisComplete`: build `AnalysisRecord` (`crypto.randomUUID()`, `new Date().toISOString()`, `total_records`, `failureCount`, `highRiskCount`), read existing array from `analyses_${user.username}`, append, write back
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 16. Create frontend/src/pages/AnalyticsPage.tsx
  - Read `analyses_${user.username}` from localStorage; treat parse errors as empty array
  - Line chart (Recharts `LineChart`): x-axis = `new Date(r.timestamp).toLocaleDateString()`, y-axis = `r.failureCount`
  - Pie chart (Recharts `PieChart`): High Risk vs Non-High-Risk aggregated from `highRiskCount` across all records
  - Bar chart placeholder or omit (failure reasons not stored in `AnalysisRecord`)
  - Empty state when no records: message + "Run Your First Analysis" button → `/app/upload`
  - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 8.7_

- [x] 17. Create frontend/src/pages/SettingsPage.tsx
  - Display `user.username` and `user.email` as read-only inputs
  - Change password form: `currentPassword`, `newPassword`, `confirmPassword` state
  - Client-side validation: new password ≥ 8 chars, confirm matches
  - On submit: call `changePassword(currentPassword, newPassword)` from `useAuth()`
  - On success: show success banner, clear all three form fields
  - On 401: show inline error, preserve fields
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.12_

- [x] 18. Modify frontend/src/components/AnalysisResults.tsx — interactive filter cards
  - Add `type FilterType = 'all' | 'failures' | 'high_risk' | 'healthy'`
  - Add `const [activeFilter, setActiveFilter] = useState<FilterType>('all')`
  - Add `useEffect(() => { setActiveFilter('all') }, [data])` to reset on new data
  - Add `filteredPredictions` via `useMemo`: `'failures'` → `p.will_fail`, `'high_risk'` → `p.risk_level === 'High Risk'`, `'healthy'` → `!p.will_fail`, `'all'` → all rows
  - Apply `filteredPredictions` to pagination (replace `data.predictions` references in pagination/table)
  - Make each metric card a `<button>` with `onClick` that sets the corresponding filter; clicking the already-active card resets to `'all'`
  - Apply `ring-2 ring-offset-2 ring-{color}-500` class to the active card
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [ ] 19. Checkpoint — frontend wiring complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Write unit tests for user store (tests/test_user_store.py)
  - Test `init_user_store()` creates `data/` and `data/users.json` when missing
  - Test `append_user` + `find_user_by_username` round-trip
  - Test `append_user` + `find_user_by_email` round-trip
  - Test `find_user_by_username` returns `None` for unknown username
  - Test `load_users` raises on corrupted JSON
  - Use `tmp_path` and monkeypatch to redirect `DATA_FILE` path
  - _Requirements: 3.6, 3.8, 3.9_

- [x] 21. Write unit tests for auth register and change-password (tests/test_auth_register.py)
  - Test valid registration returns 200 with JWT
  - Test duplicate username returns 409
  - Test duplicate email returns 409
  - Test password < 8 chars returns 422
  - Test registered user can login via `/auth/login`
  - Test hardcoded admin credentials still work after user store is active
  - Test `/auth/change-password` with valid current password returns 200
  - Test `/auth/change-password` with incorrect current password returns 401
  - Test `/auth/change-password` without JWT returns 401
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 3.10, 3.11, 9.9, 9.10, 9.11_

- [ ] 22. Write property-based tests for auth correctness properties (tests/test_auth_properties.py)
  - [ ]* 22.1 Property 1 — short passwords rejected by register and change-password
    - `@given(st.text(max_size=7))` — POST `/auth/register` with short password returns 422
    - `@given(st.text(max_size=7))` — POST `/auth/change-password` with short new_password returns 422
    - **Property 1: Password length validation**
    - **Validates: Requirements 2.5, 3.4, 9.4**

  - [ ]* 22.2 Property 3 — duplicate username/email returns 409, store unchanged
    - Register a user, then attempt to register again with same username → 409
    - Register a user, then attempt to register again with same email → 409
    - Verify user store length unchanged after conflict
    - **Property 3: User uniqueness enforcement**
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 22.3 Property 4 — hashed password verifies with plaintext
    - `@given(st.text(min_size=8, alphabet=st.characters(blacklist_categories=('Cs',))))` — register user, read `data/users.json`, verify stored hash is not plaintext and `CryptContext.verify(plaintext, hash)` is True
    - **Property 4: Password hashing round-trip**
    - **Validates: Requirements 3.5, 10.2**

  - [ ]* 22.4 Property 5 — registered user findable in store
    - `@given(user_record_strategy)` — after successful register, `find_user_by_username` returns record with matching username, email, full_name
    - **Property 5: User persistence round-trip**
    - **Validates: Requirements 3.6**

  - [ ]* 22.5 Property 6 — register then login succeeds
    - `@given(user_record_strategy)` — register user, then POST `/auth/login` with same credentials returns 200 with JWT
    - **Property 6: Register-then-login round-trip**
    - **Validates: Requirements 3.10**

  - [ ]* 22.6 Property 7 — change password then login with new password succeeds
    - `@given(user_record_strategy, st.text(min_size=8, alphabet=st.characters(blacklist_categories=('Cs',))))` — register, change password, login with new password → 200; login with old password → 401
    - **Property 7: Change-password round-trip**
    - **Validates: Requirements 9.10**

  - [ ]* 22.7 Property 8 — wrong current password returns 401, hash unchanged
    - `@given(user_record_strategy, st.text())` — register user, POST `/auth/change-password` with wrong current_password → 401; verify stored hash unchanged
    - **Property 8: Incorrect current password rejected**
    - **Validates: Requirements 9.11**

- [x] 23. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties across many generated inputs
- Unit tests validate specific examples and edge cases
- `DashboardPage.tsx` content moves to `UploadPage.tsx`; the old file can be deleted once `App.tsx` is updated
