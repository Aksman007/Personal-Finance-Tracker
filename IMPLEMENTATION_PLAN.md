# Implementation Plan - Sprint Breakdown

> **Sprint duration**: 2 weeks each
> **Constraint**: Working website with auth + file processing by end of Sprint 3 (Week 6)
> **Total planned**: 6 sprints (12 weeks)

---

## Sprint Overview

```
Week  1-2  │ Sprint 1 │ Foundation        │ Scaffold + DB + Auth (end-to-end login working)
Week  3-4  │ Sprint 2 │ Drive + Pipeline  │ Folder picker + PDF/CSV parsing + queue
Week  5-6  │ Sprint 3 │ Dashboard MVP     │ KPI cards + charts + transaction list (USABLE APP)
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
Week  7-8  │ Sprint 4 │ Intelligence      │ AI categorization + anomaly detection
Week  9-10 │ Sprint 5 │ Polish            │ UX refinement + error handling + edge cases
Week 11-12 │ Sprint 6 │ Production        │ Testing + deployment + monitoring
```

---

## Sprint 1: Foundation (Weeks 1-2)

**Goal**: A user can sign in with Google and land on a protected shell UI.

### Priority / Cost Matrix

| #  | Task                                          | Priority | Cost   | Days |
|----|-----------------------------------------------|----------|--------|------|
| 1  | Project scaffolding (Next.js + NestJS)        | P0       | Low    | 0.5  |
| 2  | Docker Compose (PostgreSQL + Redis)            | P0       | Low    | 0.5  |
| 3  | Prisma schema + initial migration             | P0       | Medium | 1    |
| 4  | Seed script (default categories)              | P1       | Low    | 0.5  |
| 5  | Google OAuth backend (Passport strategy)      | P0       | High   | 2    |
| 6  | JWT issuance + httpOnly cookie setup          | P0       | High   | 1    |
| 7  | Token encryption utility (AES-256-GCM)        | P0       | Medium | 1    |
| 8  | Auth guard + refresh token endpoint           | P0       | Medium | 1    |
| 9  | Frontend: Login page                          | P0       | Low    | 0.5  |
| 10 | Frontend: Auth context + protected routes     | P0       | Medium | 1    |
| 11 | Frontend: App shell (sidebar + header + nav)  | P1       | Medium | 1    |
|    |                                               |          | **Total** | **10** |

### Deliverables
- `docker-compose up` starts Postgres + Redis
- `npm run start:dev` runs backend on :3001
- `npm run dev` runs frontend on :3000
- User clicks "Sign in with Google" -> OAuth flow -> JWT cookie set -> redirected to `/dashboard` shell
- `/api/auth/me` returns user profile
- Logout clears session
- Unauthenticated users redirected to `/login`

### Files Created

```
backend/
  src/main.ts, app.module.ts
  src/prisma/prisma.module.ts, prisma.service.ts
  src/auth/auth.module.ts, auth.controller.ts, auth.service.ts
  src/auth/google.strategy.ts, jwt.strategy.ts
  src/auth/guards/jwt-auth.guard.ts
  src/common/crypto.util.ts
  prisma/schema.prisma, seed.ts
frontend/
  src/app/layout.tsx, page.tsx
  src/app/login/page.tsx
  src/app/dashboard/page.tsx (placeholder)
  src/components/layout/sidebar.tsx, header.tsx
  src/hooks/use-auth.ts
  src/lib/api-client.ts
docker-compose.yml
.env.example
```

### Acceptance Criteria
- [ ] Google OAuth login completes successfully
- [ ] JWT access token (15min) + refresh token (7d) in httpOnly cookies
- [ ] Google tokens encrypted in database
- [ ] Protected routes redirect to `/login` when unauthenticated
- [ ] `/api/auth/me` returns user name, email, picture
- [ ] Refresh endpoint issues new access token
- [ ] Sidebar navigation renders (Dashboard, Transactions, Settings links)

---

## Sprint 2: Drive Integration + File Processing (Weeks 3-4)

**Goal**: User selects a Drive folder, app syncs files, and extracts transactions from PDFs/CSVs.

### Priority / Cost Matrix

| #  | Task                                          | Priority | Cost   | Days |
|----|-----------------------------------------------|----------|--------|------|
| 1  | Google Drive API service (list folders)       | P0       | Medium | 1    |
| 2  | Drive endpoints (folders, config)             | P0       | Medium | 1    |
| 3  | Frontend: Folder picker UI                    | P0       | Medium | 1.5  |
| 4  | Save/load drive config (folder selection)     | P0       | Low    | 0.5  |
| 5  | BullMQ queue setup + processor skeleton       | P0       | Medium | 1    |
| 6  | Sync service (poll Drive, detect new files)   | P0       | High   | 1.5  |
| 7  | PDF parser (pdf-parse + text extraction)      | P0       | High   | 2    |
| 8  | CSV parser (csv-parser + column mapping)      | P0       | Medium | 1    |
| 9  | Transaction extractor + normalizer            | P0       | High   | 1.5  |
| 10 | Deduplication logic (file hash + record)      | P1       | Low    | 0.5  |
| 11 | Frontend: Setup/onboarding page               | P1       | Low    | 0.5  |
| 12 | Frontend: File processing status page         | P2       | Low    | 0.5  |
|    |                                               |          | **Total** | **12** |

> Slightly over 10 days — tasks 11-12 are stretch goals; core pipeline is P0.

### Deliverables
- User navigates Drive folder tree and selects a folder
- Backend polls folder every 5 minutes (+ manual sync button)
- New PDF/CSV files are queued and processed
- Extracted transactions saved to DB with normalized schema
- Processed files tracked (no duplicates)
- Onboarding flow: Login -> Select Folder -> "Processing your files..."

### Parser Logic

**PDF Bank Statement** (P0):
```
Input:  Raw PDF text (line-by-line)
Match:  DD/MM/YYYY  |  Description text  |  10,000.00 Dr  |  50,000.00 Cr  |  Balance
Output: { date, description, amount, type: INCOME|EXPENSE }
```

**CSV** (P0):
```
Input:  CSV with headers
Detect: date column, description column, amount/debit/credit columns
Map:    Flexible column aliases (Date/Txn Date/Value Date, etc.)
Output: { date, description, amount, type: INCOME|EXPENSE }
```

**Image OCR** (P2 — deferred to Sprint 4):
```
Tesseract.js extraction → same pattern matching as PDF text
```

### Acceptance Criteria
- [ ] Folder picker shows Drive folders with navigation
- [ ] Selected folder saved to `drive_configs` table
- [ ] Sync service detects new files in folder
- [ ] PDF text extraction works on bank statements
- [ ] CSV parsing handles common bank export formats
- [ ] Transactions appear in DB with correct date, amount, type
- [ ] Same file not processed twice (hash dedup)
- [ ] Manual sync button triggers immediate re-scan
- [ ] Queue retries failed jobs up to 3 times

---

## Sprint 3: Dashboard MVP (Weeks 5-6)

**Goal**: Fully functional dashboard with real data. **This is the "usable app" milestone.**

### Priority / Cost Matrix

| #  | Task                                          | Priority | Cost   | Days |
|----|-----------------------------------------------|----------|--------|------|
| 1  | Dashboard summary API (KPI aggregations)      | P0       | Medium | 1    |
| 2  | Income vs Expense API (time-series)           | P0       | Medium | 1    |
| 3  | Category breakdown API                        | P0       | Medium | 0.5  |
| 4  | Cash flow API                                 | P1       | Low    | 0.5  |
| 5  | Frontend: KPI cards component                 | P0       | Medium | 1    |
| 6  | Frontend: Income vs Expense bar chart         | P0       | Medium | 1    |
| 7  | Frontend: Category pie chart                  | P0       | Medium | 1    |
| 8  | Frontend: Cash flow line chart                | P1       | Medium | 0.5  |
| 9  | Frontend: Date range selector + period toggle | P0       | Medium | 1    |
| 10 | Transaction list page (paginated, filtered)   | P0       | Medium | 1.5  |
| 11 | Rule-based categorizer (keyword matching)     | P0       | Medium | 1    |
| 12 | Re-run categorization on existing transactions| P1       | Low    | 0.5  |
|    |                                               |          | **Total** | **10.5** |

### Deliverables
- Dashboard page with 5 KPI cards: Total Income, Total Expenses, Net Savings, Max Spend, Avg Monthly Spend
- 3 interactive charts: income/expense bars, category pie, cash flow line
- Date range selector: This Month, Last Month, Last 3 Months, Last 6 Months, This Year, Custom
- Transaction list with search, type filter, category filter, pagination
- Rule-based categorizer assigns categories to transactions by keyword

### KPI Card Specifications

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Total Income   │  │ Total Expenses  │  │   Net Savings   │
│   +1,25,000     │  │   -87,500       │  │    37,500       │
│   ▲ 12% vs prev │  │   ▼ 5% vs prev  │  │   ▲ 8% vs prev  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
┌─────────────────┐  ┌─────────────────┐
│   Max Spend     │  │  Avg Monthly    │
│    15,000       │  │    29,167       │
│   Rent Payment  │  │   last 3 months │
└─────────────────┘  └─────────────────┘
```

### Acceptance Criteria
- [ ] KPI cards show correct aggregated values for selected date range
- [ ] Changing date range updates all cards and charts
- [ ] Bar chart shows monthly income vs expense
- [ ] Pie chart shows top spending categories with percentages
- [ ] Cash flow line shows running balance over time
- [ ] Transaction list paginates (20 per page)
- [ ] Transactions filterable by type, category, date
- [ ] Rule-based categorizer covers 15+ common keywords per category
- [ ] Dashboard loads in < 2 seconds for 500 transactions

---

## ── USABLE APP CHECKPOINT (Week 6) ──

At this point the complete user flow works end-to-end:

```
Login with Google
       ↓
Select Drive folder
       ↓
Files auto-sync + process
       ↓
Transactions extracted & categorized
       ↓
Dashboard shows real financial data
       ↓
Browse/filter individual transactions
```

Everything below is polish, intelligence, and production-readiness.

---

## Sprint 4: Intelligence Layer (Weeks 7-8)

**Goal**: AI-powered categorization, anomaly detection, and image OCR.

### Priority / Cost Matrix

| #  | Task                                          | Priority | Cost   | Days |
|----|-----------------------------------------------|----------|--------|------|
| 1  | AI categorizer (Claude API integration)       | P1       | Medium | 1.5  |
| 2  | Categorizer fallback chain (AI → rules)       | P1       | Low    | 0.5  |
| 3  | Batch re-categorize endpoint                  | P1       | Low    | 0.5  |
| 4  | Anomaly detection service (z-score)           | P1       | Medium | 1.5  |
| 5  | Anomaly API endpoint                          | P1       | Low    | 0.5  |
| 6  | Frontend: Anomaly alerts on dashboard         | P1       | Medium | 1    |
| 7  | Image/OCR parser (Tesseract.js)               | P2       | High   | 2    |
| 8  | AI monthly insights generation                | P2       | Medium | 1.5  |
| 9  | Frontend: Insights card on dashboard          | P2       | Low    | 0.5  |
| 10 | Inline category editing on transactions page  | P1       | Medium | 1    |
|    |                                               |          | **Total** | **10.5** |

### AI Categorizer Flow

```
Transaction "SWIGGY ORDER #12345 -Rs 450"
       ↓
  [Claude API]
  prompt: "Categorize this transaction: {description}. Categories: {list}"
  response: { category: "Food & Dining", confidence: 0.95 }
       ↓
  confidence >= 0.7 → accept
  confidence <  0.7 → fall back to rule-based
       ↓
  rule-based: match "SWIGGY" → "Food & Dining"
       ↓
  no match → "Uncategorized"
```

### Anomaly Detection

```
For each new transaction in category C:
  mean = avg(amount) for C over last 6 months
  std  = stddev(amount) for C over last 6 months
  z    = (amount - mean) / std

  |z| > 2.5       → HIGH anomaly (red alert)
  2.0 < |z| < 2.5 → MEDIUM anomaly (yellow warning)

Also flag:
  - First transaction in a new category
  - Amount > 3x the category mean
```

### Acceptance Criteria
- [ ] AI categorizer calls Claude API with transaction descriptions
- [ ] Fallback to rule-based if AI confidence < 0.7 or API fails
- [ ] Anomaly detection flags outlier transactions
- [ ] Dashboard shows anomaly alert cards with details
- [ ] OCR extracts readable text from receipt images
- [ ] Monthly insights card shows AI-generated summary
- [ ] Users can manually re-categorize any transaction

---

## Sprint 5: Polish & UX (Weeks 9-10)

**Goal**: Production-quality UX, edge case handling, responsive design.

### Priority / Cost Matrix

| #  | Task                                          | Priority | Cost   | Days |
|----|-----------------------------------------------|----------|--------|------|
| 1  | Global error handling (API + UI boundaries)   | P0       | Medium | 1    |
| 2  | Loading skeletons for dashboard + lists       | P1       | Low    | 0.5  |
| 3  | Empty states (no data, no folder, new user)   | P1       | Low    | 0.5  |
| 4  | Toast notifications (sync complete, errors)   | P1       | Low    | 0.5  |
| 5  | Mobile responsive layout                      | P1       | Medium | 1.5  |
| 6  | Settings page (manage folder, re-sync, etc.)  | P1       | Medium | 1    |
| 7  | Export transactions to CSV                     | P2       | Low    | 0.5  |
| 8  | Rate limiting on API endpoints                | P0       | Low    | 0.5  |
| 9  | Input validation (class-validator DTOs)        | P0       | Medium | 1    |
| 10 | Token refresh edge cases (expired Google token)| P0      | Medium | 1    |
| 11 | Retry logic for failed file processing        | P1       | Low    | 0.5  |
| 12 | File processing progress indicator            | P2       | Medium | 1    |
| 13 | Dark mode support                             | P2       | Low    | 0.5  |
|    |                                               |          | **Total** | **10** |

### Error Handling Strategy

```
Layer           │ Mechanism
────────────────┼──────────────────────────────────
NestJS Global   │ ExceptionFilter → standardized { error, message, statusCode }
API Client      │ Axios interceptor → auto-refresh on 401, toast on 5xx
React UI        │ ErrorBoundary per route segment
Queue Worker    │ BullMQ retry (3x, exponential backoff) → mark FAILED
Drive API       │ Catch 401 → refresh Google token → retry once
```

### Acceptance Criteria
- [ ] No unhandled errors crash the app
- [ ] All API errors return consistent JSON format
- [ ] Loading skeletons appear while data fetches
- [ ] Empty states guide users to next action
- [ ] Mobile layout usable on 375px+ screens
- [ ] Settings page allows changing Drive folder
- [ ] Transactions exportable to CSV
- [ ] Rate limiting prevents API abuse
- [ ] All inputs validated server-side
- [ ] Expired Google tokens auto-refresh transparently

---

## Sprint 6: Production Readiness (Weeks 11-12)

**Goal**: Deployment, testing, monitoring, documentation.

### Priority / Cost Matrix

| #  | Task                                          | Priority | Cost   | Days |
|----|-----------------------------------------------|----------|--------|------|
| 1  | Unit tests: auth service, crypto util         | P0       | Medium | 1    |
| 2  | Unit tests: parsers (PDF, CSV)                | P0       | Medium | 1.5  |
| 3  | Unit tests: dashboard aggregation service     | P1       | Medium | 1    |
| 4  | Integration tests: auth flow                  | P1       | Medium | 1    |
| 5  | Integration tests: file processing pipeline   | P1       | High   | 1.5  |
| 6  | Dockerfile (frontend + backend)               | P0       | Medium | 1    |
| 7  | docker-compose.prod.yml (full stack)          | P0       | Low    | 0.5  |
| 8  | Nginx reverse proxy config                    | P1       | Low    | 0.5  |
| 9  | CI/CD pipeline (GitHub Actions)               | P2       | Medium | 1    |
| 10 | Health check endpoints                        | P1       | Low    | 0.5  |
| 11 | Logging (structured, request IDs)             | P1       | Low    | 0.5  |
| 12 | README with setup + deployment instructions   | P0       | Low    | 0.5  |
|    |                                               |          | **Total** | **10.5** |

### Test Coverage Targets

| Module              | Unit Tests | Integration Tests |
|---------------------|------------|-------------------|
| Auth service        | 90%        | Auth flow e2e     |
| Crypto util         | 100%       | -                 |
| PDF parser          | 85%        | Sample files      |
| CSV parser          | 90%        | Sample files      |
| Transaction extract | 85%        | -                 |
| Dashboard service   | 80%        | API response      |
| Categorizer         | 80%        | -                 |

### Acceptance Criteria
- [ ] `docker-compose -f docker-compose.prod.yml up` runs entire stack
- [ ] All P0 tests pass
- [ ] Health check at `/api/health` returns status
- [ ] Structured logs include request IDs for tracing
- [ ] README covers: setup, env vars, deployment, architecture
- [ ] No secrets committed to repo

---

## Risk Register

| Risk                                     | Impact | Likelihood | Mitigation                                           |
|------------------------------------------|--------|------------|------------------------------------------------------|
| Google OAuth token expiry during sync    | High   | Medium     | Auto-refresh before each Drive API call              |
| Unstructured PDF formats (no table grid) | High   | High       | Multiple regex patterns + AI fallback + manual flag  |
| BullMQ Redis connection drops            | Medium | Low        | Connection retry config, health checks               |
| Large files (>20 pages) slow processing  | Medium | Medium     | File size limit, pagination, stream processing       |
| AI API rate limits / costs               | Low    | Medium     | Batch requests, cache results, rule-based fallback   |
| Scanned PDFs with poor quality           | Medium | Medium     | Tesseract pre-processing, confidence threshold       |

---

## Dependency Map

```
Sprint 1 ──────────────────────────────────────────────────
   │
   │  Auth, DB, UI shell
   │
   ▼
Sprint 2 ──────────────────────────────────────────────────
   │
   │  Drive API, Parsers, Queue  (depends on: auth, DB)
   │
   ▼
Sprint 3 ──────────────────────────────────────────────────
   │
   │  Dashboard, Rule categorizer  (depends on: transactions in DB)
   │
   ▼
Sprint 4 ──────────────────  Sprint 5 ─────────────────────
   │                            │
   │  AI, Anomalies, OCR        │  UX, Error handling
   │  (depends on: Sprint 3)    │  (depends on: Sprint 3)
   │                            │
   └────────────┬───────────────┘
                │
                ▼
          Sprint 6 ────────────────────────────────────────
                │
                │  Tests, Deployment  (depends on: all features stable)
                │
                ▼
           PRODUCTION
```

> **Note**: Sprints 4 and 5 can be worked in parallel if there are two developers.

---

## Velocity Assumptions

- **Solo developer**: 10 productive days per 2-week sprint (accounting for context switching, debugging, research)
- **Story point mapping**: Low = 0.5d, Medium = 1d, High = 1.5-2d
- **Buffer**: Each sprint has ~0.5d slack for unexpected issues
- **Dependencies**: All external services (Google Cloud project, API keys) set up before Sprint 1

---

## Definition of Done (per task)

- [ ] Code written and compiles without errors
- [ ] Follows project patterns (module structure, naming conventions)
- [ ] Manual testing passes for the feature
- [ ] No regressions in existing functionality
- [ ] Environment variables documented if new ones added
- [ ] Edge cases considered and handled (empty state, error state)
