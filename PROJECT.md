# Personal Finance Tracker - Project Plan

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              Next.js Frontend (React + TypeScript)            │  │
│  │  ┌──────────┐ ┌──────────────┐ ┌───────────┐ ┌───────────┐  │  │
│  │  │  Auth    │ │ Drive Picker │ │ Dashboard │ │ Settings  │  │  │
│  │  │  Pages   │ │  Component   │ │   Views   │ │   Page    │  │  │
│  │  └──────────┘ └──────────────┘ └───────────┘ └───────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS (REST API)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS + TypeScript)                     │
│  ┌──────────┐ ┌──────────────┐ ┌───────────────┐ ┌─────────────┐  │
│  │  Auth    │ │  Drive       │ │  Transactions │ │  Dashboard  │  │
│  │  Module  │ │  Module      │ │  Module       │ │  Module     │  │
│  └──────────┘ └──────────────┘ └───────────────┘ └─────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Prisma ORM Layer                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  BullMQ Job Queue                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────┬──────────────────────┬───────────────────┬───────────────┘
           │                      │                   │
           ▼                      ▼                   ▼
┌──────────────────┐  ┌───────────────────┐  ┌────────────────────┐
│   PostgreSQL     │  │      Redis        │  │  Google APIs       │
│   Database       │  │  (Queue + Cache)  │  │  (Drive, OAuth)    │
└──────────────────┘  └───────────────────┘  └────────────────────┘
           │
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKER SERVICE (Separate Process)                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │  PDF Parser  │ │  CSV Parser  │ │  OCR Engine  │               │
│  │  (pdf-parse) │ │ (csv-parser) │ │ (Tesseract)  │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │           Transaction Extraction & Normalization             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │        AI Categorization (OpenAI / Rule-based fallback)     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Google Drive Folder
        │
        ▼
  [Sync Service]  ← polls every 5 min or webhook
        │
        ▼
  [BullMQ Queue]  ← enqueue new/modified files
        │
        ▼
  [Worker Process]
        │
        ├─── PDF? ──→ pdf-parse ──→ extract text ──→ parse transactions
        ├─── CSV? ──→ csv-parser ──→ map columns  ──→ parse transactions
        └─── IMG? ──→ Tesseract  ──→ extract text ──→ parse transactions
                                                          │
                                                          ▼
                                                  [Normalizer]
                                                      │
                                                      ▼
                                              [AI Categorizer]
                                                      │
                                                      ▼
                                              [PostgreSQL DB]
                                                      │
                                                      ▼
                                               [Dashboard API]
```

---

## 2. Database Schema

### Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────────┐
│    users     │     │  drive_configs   │     │ processed_files   │
├──────────────┤     ├──────────────────┤     ├───────────────────┤
│ id (PK)      │──┐  │ id (PK)          │  ┌──│ id (PK)           │
│ email        │  │  │ userId (FK)      │──┘  │ driveConfigId(FK) │
│ name         │  ├──│ folderId         │     │ driveFileId       │
│ picture      │  │  │ folderName       │     │ fileName          │
│ googleId     │  │  │ lastSyncAt       │     │ mimeType          │
│ accessToken  │  │  │ syncEnabled      │     │ fileHash          │
│ refreshToken │  │  │ createdAt        │     │ status            │
│ tokenExpiry  │  │  │ updatedAt        │     │ errorMessage      │
│ createdAt    │  │  └──────────────────┘     │ processedAt       │
│ updatedAt    │  │                           │ createdAt         │
└──────────────┘  │                           └───────────────────┘
                  │
                  │  ┌──────────────────┐     ┌───────────────────┐
                  │  │  transactions    │     │   categories      │
                  │  ├──────────────────┤     ├───────────────────┤
                  └──│ id (PK)          │     │ id (PK)           │
                     │ userId (FK)      │     │ name              │
                     │ fileId (FK)      │  ┌──│ type              │
                     │ date             │  │  │ icon              │
                     │ description      │  │  │ color             │
                     │ amount           │  │  │ isDefault         │
                     │ type (enum)      │  │  └───────────────────┘
                     │ categoryId (FK)  │──┘
                     │ rawText          │
                     │ confidence       │
                     │ source           │
                     │ createdAt        │
                     │ updatedAt        │
                     └──────────────────┘
```

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String        @id @default(cuid())
  email        String        @unique
  name         String?
  picture      String?
  googleId     String        @unique
  accessToken  String        // encrypted at application level
  refreshToken String        // encrypted at application level
  tokenExpiry  DateTime
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  driveConfigs  DriveConfig[]
  transactions  Transaction[]

  @@map("users")
}

model DriveConfig {
  id         String    @id @default(cuid())
  userId     String
  folderId   String    // Google Drive folder ID
  folderName String
  lastSyncAt DateTime?
  syncEnabled Boolean  @default(true)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  processedFiles ProcessedFile[]

  @@unique([userId, folderId])
  @@map("drive_configs")
}

model ProcessedFile {
  id            String           @id @default(cuid())
  driveConfigId String
  driveFileId   String           // Google Drive file ID
  fileName      String
  mimeType      String
  fileHash      String?          // MD5 or SHA hash for dedup
  status        FileStatus       @default(PENDING)
  errorMessage  String?
  processedAt   DateTime?
  createdAt     DateTime         @default(now())

  driveConfig  DriveConfig   @relation(fields: [driveConfigId], references: [id], onDelete: Cascade)
  transactions Transaction[]

  @@unique([driveConfigId, driveFileId])
  @@map("processed_files")
}

enum FileStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  SKIPPED
}

model Transaction {
  id          String          @id @default(cuid())
  userId      String
  fileId      String?
  date        DateTime
  description String
  amount      Decimal         @db.Decimal(12, 2)
  type        TransactionType
  categoryId  String?
  rawText     String?         // original extracted text for debugging
  confidence  Float?          // AI confidence score
  source      String?         // which file this came from
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  user     User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  file     ProcessedFile? @relation(fields: [fileId], references: [id], onDelete: SetNull)
  category Category?      @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  @@index([userId, date])
  @@index([userId, type])
  @@index([userId, categoryId])
  @@map("transactions")
}

enum TransactionType {
  INCOME
  EXPENSE
}

model Category {
  id        String        @id @default(cuid())
  name      String        @unique
  type      TransactionType
  icon      String?
  color     String?
  isDefault Boolean       @default(false)

  transactions Transaction[]

  @@map("categories")
}
```

---

## 3. API Design

### Authentication Endpoints

| Method | Endpoint                  | Description                        | Auth |
|--------|---------------------------|------------------------------------|------|
| GET    | `/api/auth/google`        | Redirect to Google OAuth consent   | No   |
| GET    | `/api/auth/google/callback` | Handle OAuth callback            | No   |
| POST   | `/api/auth/refresh`       | Refresh access token               | Yes  |
| POST   | `/api/auth/logout`        | Invalidate session                 | Yes  |
| GET    | `/api/auth/me`            | Get current user profile           | Yes  |

### Google Drive Endpoints

| Method | Endpoint                     | Description                          | Auth |
|--------|------------------------------|--------------------------------------|------|
| GET    | `/api/drive/folders`         | List root-level folders              | Yes  |
| GET    | `/api/drive/folders/:id`     | List subfolders                      | Yes  |
| POST   | `/api/drive/config`          | Save selected folder config          | Yes  |
| GET    | `/api/drive/config`          | Get current drive config             | Yes  |
| DELETE | `/api/drive/config/:id`      | Remove drive config                  | Yes  |
| POST   | `/api/drive/sync`            | Trigger manual sync                  | Yes  |
| GET    | `/api/drive/files`           | List processed files                 | Yes  |

### Transaction Endpoints

| Method | Endpoint                        | Description                       | Auth |
|--------|---------------------------------|-----------------------------------|------|
| GET    | `/api/transactions`             | List transactions (paginated)     | Yes  |
| GET    | `/api/transactions/:id`         | Get single transaction            | Yes  |
| PATCH  | `/api/transactions/:id`         | Update transaction (re-categorize)| Yes  |
| DELETE | `/api/transactions/:id`         | Delete a transaction              | Yes  |

**Query Params for GET `/api/transactions`:**
```
?startDate=2024-01-01
&endDate=2024-12-31
&type=INCOME|EXPENSE
&categoryId=abc123
&page=1
&limit=20
&sortBy=date
&sortOrder=desc
```

### Dashboard Endpoints

| Method | Endpoint                        | Description                       | Auth |
|--------|---------------------------------|-----------------------------------|------|
| GET    | `/api/dashboard/summary`        | KPI summary for date range        | Yes  |
| GET    | `/api/dashboard/income-expense` | Income vs expense over time       | Yes  |
| GET    | `/api/dashboard/categories`     | Spending breakdown by category    | Yes  |
| GET    | `/api/dashboard/cashflow`       | Time-series cash flow data        | Yes  |
| GET    | `/api/dashboard/anomalies`      | Anomaly detection results         | Yes  |
| GET    | `/api/dashboard/insights`       | AI-generated monthly insights     | Yes  |

**Common Query Params:**
```
?startDate=2024-01-01
&endDate=2024-12-31
&period=monthly|weekly|daily
```

### Payload Examples

**POST `/api/drive/config`**
```json
{
  "folderId": "1a2b3c4d5e6f",
  "folderName": "Finance Documents"
}
```

**GET `/api/dashboard/summary` Response**
```json
{
  "totalIncome": 125000.00,
  "totalExpenses": 87500.00,
  "netSavings": 37500.00,
  "maxSpend": {
    "amount": 15000.00,
    "description": "Rent Payment",
    "date": "2024-03-01"
  },
  "avgMonthlySpend": 29166.67,
  "transactionCount": 156,
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-03-31"
  }
}
```

**GET `/api/dashboard/income-expense` Response**
```json
{
  "data": [
    {
      "period": "2024-01",
      "income": 42000.00,
      "expense": 28500.00,
      "net": 13500.00
    }
  ]
}
```

**GET `/api/dashboard/categories` Response**
```json
{
  "data": [
    {
      "categoryId": "abc",
      "categoryName": "Food & Dining",
      "total": 12500.00,
      "percentage": 14.28,
      "count": 45,
      "color": "#FF6384"
    }
  ]
}
```

---

## 4. Project Structure

```
personal-finance-tracker/
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/                 # App Router pages
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx         # Landing/redirect
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── setup/
│   │   │   │   └── page.tsx     # Folder selection
│   │   │   ├── transactions/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/              # Reusable UI components
│   │   │   ├── charts/          # Chart components
│   │   │   ├── dashboard/       # Dashboard-specific
│   │   │   ├── drive/           # Drive picker components
│   │   │   └── layout/          # Navigation, sidebar
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utilities, API client
│   │   ├── types/               # TypeScript types
│   │   └── styles/              # Global styles
│   ├── public/
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                     # NestJS application
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── google.strategy.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── guards/
│   │   │       └── jwt-auth.guard.ts
│   │   ├── drive/
│   │   │   ├── drive.module.ts
│   │   │   ├── drive.controller.ts
│   │   │   ├── drive.service.ts
│   │   │   └── sync.service.ts
│   │   ├── transactions/
│   │   │   ├── transactions.module.ts
│   │   │   ├── transactions.controller.ts
│   │   │   └── transactions.service.ts
│   │   ├── dashboard/
│   │   │   ├── dashboard.module.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   └── dashboard.service.ts
│   │   ├── processing/
│   │   │   ├── processing.module.ts
│   │   │   ├── queue.processor.ts
│   │   │   ├── parsers/
│   │   │   │   ├── pdf.parser.ts
│   │   │   │   ├── csv.parser.ts
│   │   │   │   ├── image.parser.ts
│   │   │   │   └── parser.interface.ts
│   │   │   ├── extractors/
│   │   │   │   ├── transaction.extractor.ts
│   │   │   │   └── patterns/
│   │   │   │       ├── bank-statement.pattern.ts
│   │   │   │       └── payslip.pattern.ts
│   │   │   └── categorizer/
│   │   │       ├── ai.categorizer.ts
│   │   │       └── rule.categorizer.ts
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   ├── interceptors/
│   │   │   └── pipes/
│   │   └── prisma/
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── nest-cli.json
│   ├── tsconfig.json
│   └── package.json
│
├── docker-compose.yml           # PostgreSQL + Redis
├── .env.example
├── PROJECT.md
└── README.md
```

---

## 5. Step-by-Step Implementation Plan

### Phase 1: Foundation (Steps 1-4)

#### Step 1: Project Scaffolding
- Initialize monorepo structure
- Create Next.js frontend with TypeScript + Tailwind
- Create NestJS backend with TypeScript
- Set up Docker Compose for PostgreSQL + Redis
- Configure ESLint, Prettier, path aliases

#### Step 2: Database Setup
- Write Prisma schema
- Run initial migration
- Create seed script for default categories
- Set up Prisma service in NestJS

#### Step 3: Authentication
- Configure Google OAuth 2.0 (Google Cloud Console)
- Implement Google OAuth strategy in NestJS (Passport.js)
- JWT session management (access + refresh tokens)
- Auth guard middleware
- Frontend: Login page, auth context, protected routes

#### Step 4: Core UI Shell
- Layout component (sidebar, header)
- Navigation between pages
- Auth-aware routing (redirect to login if unauthenticated)
- Loading/error boundary components

### Phase 2: Google Drive Integration (Steps 5-6)

#### Step 5: Drive Folder Browser
- Backend: Google Drive API integration service
- Backend: Folder listing endpoints
- Frontend: Folder browser/picker component
- Save selected folder configuration

#### Step 6: File Sync Service
- Backend: Sync service to poll Drive folder
- Detect new/modified files (by modifiedTime + hash)
- BullMQ queue setup for file processing jobs
- Deduplication logic
- Manual sync trigger endpoint

### Phase 3: File Processing Pipeline (Steps 7-9)

#### Step 7: PDF Parser
- Download file content via Drive API (stream, don't store)
- pdf-parse integration for text-based PDFs
- Tesseract.js fallback for scanned PDFs
- Bank statement pattern matching
- Payslip pattern matching

#### Step 8: CSV Parser
- csv-parser integration
- Column detection/mapping heuristics
- Handle various CSV formats (bank exports)
- Date/amount normalization

#### Step 9: Transaction Extraction & Normalization
- Unified transaction extraction interface
- Date parsing (multiple formats)
- Amount parsing (handle currency symbols, negatives)
- Type inference (income vs expense)
- Confidence scoring

### Phase 4: Categorization (Step 10)

#### Step 10: AI Categorization
- Rule-based categorizer (keyword matching)
- AI categorizer (Claude/OpenAI API for description → category)
- Fallback chain: AI → rules → "Uncategorized"
- Store confidence scores

### Phase 5: Dashboard (Steps 11-13)

#### Step 11: Dashboard API
- Summary/KPI endpoint with aggregation queries
- Income vs Expense time-series endpoint
- Category breakdown endpoint
- Cash flow endpoint
- Optimize with database indexes

#### Step 12: Dashboard UI - KPI Cards
- Summary cards with animated counters
- Period selector (month, quarter, year, custom)
- Responsive grid layout

#### Step 13: Dashboard UI - Charts
- Income vs Expense bar/line chart (Recharts)
- Category pie chart
- Cash flow time-series chart
- Interactive tooltips and legends

### Phase 6: Polish & Bonus (Steps 14-16)

#### Step 14: Transaction Management UI
- Transaction list with search/filter
- Inline category editing
- Bulk operations
- Export to CSV

#### Step 15: Anomaly Detection
- Statistical anomaly detection (z-score based)
- Highlight unusual transactions
- Alert cards on dashboard

#### Step 16: AI Insights
- Monthly spending summary generation
- Trend analysis
- Savings recommendations
- Display on dashboard

---

## 6. Environment Variables

```env
# ─── Database ───
DATABASE_URL="postgresql://fintrack:fintrack_secret@localhost:5432/fintrack_db?schema=public"

# ─── Redis ───
REDIS_HOST="localhost"
REDIS_PORT=6379

# ─── Google OAuth ───
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"

# ─── JWT ───
JWT_SECRET="your-jwt-secret-min-32-chars-long"
JWT_EXPIRY="15m"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars-long"
JWT_REFRESH_EXPIRY="7d"

# ─── Encryption ───
ENCRYPTION_KEY="32-byte-hex-key-for-token-encryption"

# ─── App ───
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3001"
BACKEND_PORT=3001

# ─── AI (Optional - for categorization/insights) ───
ANTHROPIC_API_KEY="sk-ant-..."

# ─── File Processing ───
DRIVE_SYNC_INTERVAL_MS=300000
MAX_FILE_SIZE_MB=50
OCR_ENABLED=true
```

---

## 7. Deployment Guide

### Local Development

```bash
# 1. Clone and install
git clone <repo>
cd personal-finance-tracker

# 2. Start infrastructure
docker-compose up -d   # PostgreSQL + Redis

# 3. Backend setup
cd backend
cp .env.example .env   # Fill in values
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev

# 4. Frontend setup
cd ../frontend
cp .env.example .env.local
npm install
npm run dev
```

### Production Deployment (Docker)

```yaml
# docker-compose.prod.yml includes:
# - frontend (Next.js, port 3000)
# - backend (NestJS, port 3001)
# - postgres (port 5432)
# - redis (port 6379)
# - nginx (reverse proxy, SSL termination)
```

### Google Cloud Console Setup

1. Create a project in Google Cloud Console
2. Enable APIs: Google Drive API, Google OAuth2
3. Configure OAuth consent screen (External or Internal)
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3001/api/auth/google/callback` (dev)
   - `https://yourdomain.com/api/auth/google/callback` (prod)
6. Add scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/drive.readonly`

---

## 8. Security Implementation Details

### Token Encryption
- Google OAuth tokens (access + refresh) encrypted with AES-256-GCM before DB storage
- Encryption key stored in environment variable, never in code

### JWT Strategy
- Short-lived access tokens (15 min) in httpOnly cookies
- Refresh tokens (7 days) in separate httpOnly cookie
- CSRF protection via SameSite cookie attribute

### API Security
- All `/api/*` routes behind JWT auth guard (except auth endpoints)
- Rate limiting on auth endpoints
- Input validation via class-validator (NestJS pipes)
- CORS restricted to frontend origin

### Google Drive Scopes
- Request `drive.readonly` only (minimum required)
- No write access to user's Drive

---

## 9. Default Categories (Seed Data)

| Category          | Type    | Icon  | Color   |
|-------------------|---------|-------|---------|
| Salary            | INCOME  | 💰    | #4CAF50 |
| Freelance         | INCOME  | 💻    | #8BC34A |
| Investment Return | INCOME  | 📈    | #009688 |
| Other Income      | INCOME  | 📥    | #00BCD4 |
| Rent/Mortgage     | EXPENSE | 🏠    | #F44336 |
| Utilities         | EXPENSE | ⚡    | #FF5722 |
| Groceries         | EXPENSE | 🛒    | #FF9800 |
| Food & Dining     | EXPENSE | 🍽️    | #FFC107 |
| Transportation    | EXPENSE | 🚗    | #FFEB3B |
| Healthcare        | EXPENSE | 🏥    | #E91E63 |
| Insurance         | EXPENSE | 🛡️    | #9C27B0 |
| Entertainment     | EXPENSE | 🎬    | #673AB7 |
| Shopping          | EXPENSE | 🛍️    | #3F51B5 |
| Education         | EXPENSE | 📚    | #2196F3 |
| Subscriptions     | EXPENSE | 📱    | #03A9F4 |
| Travel            | EXPENSE | ✈️    | #00ACC1 |
| Personal Care     | EXPENSE | 💇    | #26A69A |
| Gifts/Donations   | EXPENSE | 🎁    | #66BB6A |
| Taxes             | EXPENSE | 📋    | #78909C |
| EMI/Loan          | EXPENSE | 🏦    | #8D6E63 |
| Uncategorized     | EXPENSE | ❓    | #9E9E9E |

---

## 10. Key Technical Decisions

| Decision                     | Choice                | Rationale                                           |
|------------------------------|-----------------------|-----------------------------------------------------|
| Monorepo structure           | Separate dirs         | Simpler CI/CD, clear boundaries                     |
| Auth strategy                | JWT in httpOnly cookie| XSS-safe, stateless, no localStorage tokens         |
| Queue system                 | BullMQ + Redis        | Reliable, retries, concurrency control              |
| File storage                 | None (stream from Drive)| No storage costs, always fresh data              |
| Token encryption             | AES-256-GCM           | Industry standard, authenticated encryption         |
| Chart library                | Recharts              | React-native, composable, good TypeScript support   |
| CSS framework                | Tailwind CSS          | Rapid development, consistent design                |
| ORM                          | Prisma                | Type-safe queries, great migrations, schema-first   |
| AI categorization            | Claude API + fallback | Best accuracy, with rule-based fallback             |
| Background sync              | Polling (5 min)       | Simple, reliable, no webhook complexity initially   |

---

## 11. File Parsing Strategy

### PDF Bank Statements
- Extract text with pdf-parse
- Detect table structure using line-by-line analysis
- Pattern match: date | description | debit | credit | balance
- Common patterns for major banks (SBI, HDFC, ICICI, etc.)

### PDF Payslips
- Extract text, look for key-value pairs
- Match: Basic Pay, HRA, DA, Tax Deductions, Net Pay
- Create single INCOME transaction for net pay

### CSV Files
- Auto-detect delimiter (comma, tab, semicolon)
- Header detection and column mapping
- Flexible date format parsing
- Amount: handle parentheses for negatives, currency symbols

### Images (OCR)
- Tesseract.js for text extraction
- Pre-processing: grayscale, contrast enhancement
- Same pattern matching as PDF text output

---

## 12. Anomaly Detection Algorithm

```
For each transaction:
  1. Get category average and std deviation (last 6 months)
  2. Calculate z-score = (amount - mean) / stddev
  3. Flag as anomaly if |z-score| > 2.5
  4. Also flag:
     - New categories (first-time spending)
     - Amount > 3x category average
     - Transactions at unusual times
```

---

## 13. Development Milestones

| Milestone | Description                        | Est. Complexity |
|-----------|------------------------------------|-----------------|
| M1        | Auth + DB + Project setup          | Medium          |
| M2        | Drive integration + folder picker  | Medium          |
| M3        | File processing pipeline           | High            |
| M4        | Dashboard API + UI                 | High            |
| M5        | AI categorization + insights       | Medium          |
| M6        | Polish, error handling, testing    | Medium          |
