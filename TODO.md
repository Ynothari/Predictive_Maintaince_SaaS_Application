# PredictIQ — Complete Project TODO & Status

## What We Had Before (Original MVP)
- Single-user FastAPI backend with hardcoded admin
- `/predict`, `/health`, `/auth/login` endpoints
- Two trained Random Forest ML models (98.82% accuracy)
- React + TypeScript frontend with file upload
- Basic analysis results with charts
- JWT authentication (single hardcoded user)

---

## What We Have Now (Current State)

### ✅ DONE — Authentication & Users
- [x] Multi-user registration with bcrypt password hashing
- [x] JWT login with 24h expiry
- [x] JWT refresh tokens (30-day, auto-renew sessions)
- [x] Google Sign-In (OAuth 2.0)
- [x] Change password endpoint
- [x] Profile update (username once, email with uniqueness check)
- [x] API key generation & revocation
- [x] Rate limiting on auth endpoints (10/min login, 5/min register)
- [x] Audit log (all auth events tracked)
- [ ] Two-factor authentication (2FA) — backend done, frontend UI pending
- [ ] Password reset via email

### ✅ DONE — Database
- [x] SQLite via SQLAlchemy (replaced JSON file store)
- [x] Users table with full profile fields
- [x] Analyses table with all metrics
- [x] AuditLog table
- [x] ScheduledJob table
- [ ] Alembic migrations (currently using ALTER TABLE manually)
- [ ] PostgreSQL migration (production-ready)

### ✅ DONE — ML Pipeline
- [x] Random Forest failure prediction (98.82% accuracy)
- [x] Failure reason classification (5 types)
- [x] Risk level classification (High/Medium/Low)
- [x] Maintenance recommendations
- [x] SHAP values per prediction (feature contributions)
- [ ] Confidence intervals on predictions — backend done, frontend display pending
- [ ] Model retraining endpoint
- [ ] Model versioning

### ✅ DONE — Frontend Pages
- [x] Landing page (redesigned with testimonials + pricing)
- [x] Login page (light theme, show/hide password, Google button)
- [x] Signup page (no focus-loss bug, password strength meter)
- [x] Dashboard (trend alerts, summary cards, recent analyses)
- [x] Upload & Analyze page (CSV upload, results, re-analyze button)
- [x] Analytics page (area chart, line chart, pie chart, 6 stat cards)
- [x] History page (paginated, search, per-row delete, inline notes)
- [x] Settings page (4 tabs: Account, Notifications, Data Control + API key)
- [x] Admin panel (users CRUD, edit user, audit log tab)
- [x] Comparison page (side-by-side analysis diff + bar chart)
- [x] Live Monitor page (WebSocket real-time predictions)
- [x] 404 Not Found page
- [ ] 2FA setup UI in Settings
- [ ] Scheduled analysis UI in Upload page
- [ ] Fleet view page

### ✅ DONE — Analysis Results
- [x] 4 interactive metric cards (click to filter table)
- [x] Risk distribution pie chart (3 slices)
- [x] Top failure reasons bar chart
- [x] Feature importance explainability panel
- [x] Predictions table with search + sort + pagination
- [x] Machine drill-down modal (click any row)
- [x] SHAP contributors in drill-down modal
- [x] CSV export
- [x] Excel export (3 sheets: Summary, All, High Risk)
- [x] PDF export (browser print)
- [x] Maintenance schedule .txt download

### ✅ DONE — Navigation & UX
- [x] Sidebar with all nav items (Dashboard, Upload, Monitor, Analytics, History, Compare, Settings)
- [x] Admin Panel link (visible only to admin user)
- [x] Notification bell with unread count badge
- [x] In-app notification system (toasts + slide-in panel)
- [x] Keyboard shortcuts (Ctrl+U/D/H, ? for help)
- [x] Onboarding tour (3-step, first-time users only)
- [x] Session expiry warning banner
- [x] Dark mode removed (light only)

### ✅ DONE — Backend Features
- [x] Rate limiting (slowapi)
- [x] CORS configured for localhost:3000/3001
- [x] Max body size middleware (50MB limit)
- [x] Trusted host middleware
- [x] WebSocket endpoint `/ws/monitor`
- [x] Excel export endpoint `/api/export/excel`
- [x] AI chat endpoint `/api/chat` (rule-based + OpenAI fallback)
- [x] Scheduled analysis endpoints `/api/scheduler`
- [x] 2FA endpoints (setup/verify/disable/status)
- [x] Email alerts (SMTP, fires when failure rate > 15%)
- [x] Audit logging on all key actions

### ✅ DONE — DevOps
- [x] Dockerfile (backend)
- [x] frontend/Dockerfile (nginx)
- [x] docker-compose.yml (backend + frontend)
- [x] frontend/nginx.conf (proxy + WebSocket)
- [x] PWA manifest.json
- [x] PWA meta tags in index.html
- [ ] GitHub Actions CI/CD pipeline
- [ ] .dockerignore files
- [ ] .env.example file

---

## PENDING — Not Yet Implemented

### High Priority — COMPLETED ✅
- [x] 2FA UI in Settings page (QR code display, verification input, enable/disable)
- [x] Confidence intervals display in drill-down modal (backend + frontend done)
- [x] Scheduled analysis UI in Upload page (schedule modal after analysis)
- [x] Predictive trend forecasting card on Dashboard (linear regression on history)
- [x] GitHub Actions CI/CD (.github/workflows/ci.yml)
- [x] .dockerignore + .env.example files

### Medium Priority — Still Pending
- [ ] Fleet view page (`/app/fleet`) — group machines by tag/type
- [ ] Multi-tenant team workspaces (Organization model)
- [ ] Subscription/billing tiers (Stripe integration)
- [ ] Alembic database migrations
- [ ] PostgreSQL support (production database)
- [ ] Redis caching layer
- [ ] Celery background task queue
- [ ] Model retraining endpoint (admin uploads new training data)
- [ ] Model versioning (track which model version per prediction)
- [ ] Drag-and-drop dashboard customization

### Lower Priority
- [ ] Mobile app (React Native / Flutter)
- [ ] Password reset via email flow
- [ ] SSO / SAML for Enterprise
- [ ] Webhook push integrations
- [ ] Multi-file batch upload

---

## Summary

| Category | Done | Pending |
|---|---|---|
| Auth & Users | 9 | 2 |
| Database | 3 | 2 |
| ML Pipeline | 4 | 3 |
| Frontend Pages | 12 | 3 |
| Analysis Results | 11 | 0 |
| Navigation & UX | 8 | 0 |
| Backend Features | 11 | 0 |
| DevOps | 5 | 3 |
| Business Features | 0 | 5 |
| **Total** | **63** | **18** |
