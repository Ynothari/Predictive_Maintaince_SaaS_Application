# PredictIQ — Next Level Roadmap

## Priority Order (P1 = highest impact, P3 = lower)

---

## P1 — Game Changers (Build First)

- [ ] 1. Real-time WebSocket monitoring dashboard
  - FastAPI WebSocket endpoint `/ws/monitor`
  - Live sensor readings → instant predictions
  - Frontend live dashboard with green/amber/red machine status
  - Live failure probability gauges updating every few seconds

- [ ] 2. AI-powered chat assistant ("Ask PredictIQ")
  - Chat panel in the app sidebar or floating button
  - LLM answers questions about machine health, trends, recommendations
  - Context: user's analysis history + current predictions
  - Technology: OpenAI GPT-4o API or local Ollama

- [ ] 3. Predictive trend forecasting
  - Use analysis history to forecast future failure rates
  - "Predicted failure rate next week: 8.2%" card on dashboard
  - Time-series model (ARIMA/Prophet) trained on user's history
  - Technology: `statsmodels` or `prophet`

- [ ] 4. Multi-machine fleet view
  - Group machines by equipment type or location (user-defined tags)
  - Aggregate health scores per group
  - Highlight which groups need attention
  - Users tag machines via extra CSV column

- [ ] 5. Automated scheduled analysis
  - Upload CSV once, set a schedule (daily/weekly/monthly)
  - Backend runs analysis automatically on cron schedule
  - Email results to user automatically
  - Technology: APScheduler + existing SMTP

---

## P1 — Infrastructure Upgrades (Critical for Production)

- [ ] 6. Replace SQLite with PostgreSQL
  - Switch connection string to PostgreSQL
  - Use Docker Compose for local dev
  - Free Supabase or Railway for cloud deployment
  - SQLAlchemy code barely changes

- [ ] 7. Add Alembic migrations
  - Proper schema versioning — no more manual ALTER TABLE
  - Migration history tracked in version control
  - Technology: Alembic

- [ ] 8. Docker + Docker Compose
  - Containerize FastAPI backend
  - Containerize Vite frontend (nginx)
  - Add PostgreSQL + Redis services
  - One command: `docker-compose up`

- [ ] 9. Add Redis for caching
  - Cache analysis results per user
  - Cache session tokens
  - Speed up dashboard for users with large history
  - Technology: Redis + `redis-py`

- [ ] 10. Add Celery for background tasks
  - Move ML inference to background workers
  - Users get job ID, results appear when ready
  - No timeout issues for large files (10k+ rows)
  - Technology: Celery + Redis as broker

---

## P1 — ML Model Upgrades

- [ ] 11. Model retraining endpoint
  - Admin can upload new training data
  - Backend retrains models and saves new versions
  - Model versioning — track which version produced each prediction

- [ ] 12. SHAP values per prediction
  - Per-row feature contribution (not just global importance)
  - Show "This machine failed because: Tool wear 45%, Torque 32%..."
  - Technology: `shap` Python library

- [ ] 13. Confidence intervals
  - Show uncertainty ranges on predictions
  - "Failure probability: 73% ± 8%"
  - More honest and useful than point estimates

---

## P2 — Business Features

- [ ] 14. Multi-tenant team workspaces
  - Add `Organization` model
  - Users belong to an org
  - Analyses shared within org
  - Team member management
  - Admin manages org members

- [ ] 15. Subscription/billing tiers
  - Free: 50 analyses/month
  - Pro: unlimited analyses + API access
  - Enterprise: team workspaces + priority support
  - Enforce limits in backend
  - Technology: Stripe integration

- [ ] 16. Mobile app
  - React Native or Flutter app
  - Same API, native mobile experience
  - Push notifications for high-risk alerts
  - Check machine health from factory floor

---

## P2 — UX/Design Upgrades

- [ ] 17. Redesign landing page
  - Animated hero with live demo (auto-playing analysis)
  - Customer testimonials section
  - Pricing table
  - Interactive feature showcase

- [ ] 18. Dark mode (properly)
  - CSS custom properties instead of Tailwind dark: classes
  - Reliable, no flash of wrong theme
  - Persisted per user preference

- [ ] 19. Progressive Web App (PWA)
  - `manifest.json` + service worker
  - Install on desktop/phone like native app
  - Works offline for viewing cached results

- [ ] 20. Drag-and-drop dashboard customization
  - Users rearrange dashboard cards
  - Pin/unpin charts
  - Save layout per user
  - Technology: `@dnd-kit/core`

- [ ] 21. Export to Excel (.xlsx)
  - Multiple sheets: Summary, All Predictions, High Risk Only
  - Charts embedded in Excel
  - Technology: `openpyxl` (Python) or `xlsx` (frontend)

---

## P2 — Security Upgrades

- [ ] 22. Rate limiting on auth endpoints
  - Prevent brute-force attacks on login/register
  - Technology: `slowapi` FastAPI middleware

- [ ] 23. Two-factor authentication (2FA)
  - TOTP-based (Google Authenticator compatible)
  - QR code setup in Settings
  - Technology: `pyotp` Python library

- [ ] 24. JWT refresh tokens
  - Sessions stay alive seamlessly
  - No more 24h logout surprises
  - Refresh token stored in httpOnly cookie

- [ ] 25. Input sanitization
  - Proper validation on all endpoints
  - Prevent injection attacks
  - Add request size limits

---

## P3 — CI/CD & DevOps

- [ ] 26. CI/CD pipeline
  - GitHub Actions: run tests on every push
  - Auto-deploy to Railway/Render/Fly.io on merge to main
  - Environment-specific configs (dev/staging/prod)

---

## Implementation Order

Start with P1 items in this sequence:
1. Docker + Docker Compose (#8) — foundation for everything else
2. PostgreSQL + Alembic (#6, #7) — production database
3. Redis + Celery (#9, #10) — scalable background processing
4. Real-time WebSocket (#1) — highest wow factor
5. SHAP values (#12) — immediate ML value
6. AI chat assistant (#2) — user engagement
7. Predictive forecasting (#3) — forward-looking insights
8. Rate limiting + 2FA (#22, #23) — security before going public
9. Scheduled analysis (#5) — automation
10. Fleet view (#4) — power user feature
11. Team workspaces (#14) — SaaS monetization
12. Billing/Stripe (#15) — revenue
