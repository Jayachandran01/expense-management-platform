# PHASE 1 — ENTERPRISE ARCHITECTURE DESIGN

## Current State Analysis

Your existing system is a **tightly-coupled monolith**:

| Layer | Current | Problem |
|-------|---------|---------|
| Database | SQLite (single file) | No concurrent writes, no replication, max ~1GB practical |
| Backend | Single Express.js process | One crash kills everything, no isolation |
| AI/Chat | Inline in request cycle | Blocks HTTP thread, no caching, no async |
| File processing | None | No CSV, OCR, or voice support |
| Jobs | None | No scheduled tasks, no background processing |
| Auth | Basic JWT | No refresh tokens, no RBAC, no audit trail |

---

## Why Monolith Is Not Enough

### 1. Single Point of Failure
Your entire app runs in one Node.js process. If the chatbot service throws an unhandled error during analytics computation, it crashes the transaction API too. In enterprise systems, **fault isolation** is mandatory.

### 2. Resource Contention
OCR processing (Tesseract) is CPU-intensive. Running it in the same process as your HTTP server means a single receipt upload can block all API responses for 5-10 seconds. Voice parsing, CSV bulk imports, and AI forecasting have the same problem.

### 3. Scaling Asymmetry
Your transaction API needs low latency and handles many small requests. Your AI forecasting service needs high CPU and handles few long requests. Scaling a monolith means scaling everything equally — wasteful and expensive.

### 4. Deployment Risk
Any change to the chatbot logic requires redeploying the entire application, including auth, transactions, and budgets. Enterprise systems need **independent deployability**.

---

## Target Architecture: Modular Monolith → Service-Oriented

We use a **modular monolith with extracted workers** pattern. This is NOT full microservices (which would be over-engineering). Instead:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                      │
│  Dashboard │ Transactions │ Budgets │ Groups │ Analytics │ Assistant │
│  Voice UI  │ CSV Upload   │ Receipt Upload │ Forecast Charts        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS / REST API
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Express.js)                         │
│                                                                      │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌───────────────┐       │
│  │  Auth    │ │ Transactions │ │ Budgets  │ │   Groups      │       │
│  │ Module   │ │   Module     │ │  Module  │ │   Module      │       │
│  └──────────┘ └──────────────┘ └──────────┘ └───────────────┘       │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌───────────────┐       │
│  │Analytics │ │  Chat/AI     │ │  Audit   │ │ File Upload   │       │
│  │ Module   │ │   Module     │ │  Module  │ │   Module      │       │
│  └──────────┘ └──────────────┘ └──────────┘ └───────────────┘       │
│                                                                      │
│  Middleware: JWT Auth │ RBAC │ Rate Limit │ Validation │ Audit Log   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
┌──────────────────┐ ┌─────────────┐ ┌──────────────────────┐
│   PostgreSQL     │ │    Redis    │ │   Worker Service     │
│                  │ │             │ │   (BullMQ Workers)   │
│ • users          │ │ • Job Queue │ │                      │
│ • transactions   │ │ • Sessions  │ │ ┌──────────────────┐ │
│ • budgets        │ │ • AI Cache  │ │ │ CSV Import Worker│ │
│ • groups         │ │ • Rate Lim  │ │ ├──────────────────┤ │
│ • voice_logs     │ │             │ │ │ OCR Worker       │ │
│ • ocr_receipts   │ └─────────────┘ │ ├──────────────────┤ │
│ • csv_imports    │                  │ │ Forecast Worker  │ │
│ • forecasts      │   ┌───────────┐  │ ├──────────────────┤ │
│ • ai_insights    │   │ File Store│  │ │ Budget Eval      │ │
│ • audit_logs     │   │ (Local/S3)│  │ ├──────────────────┤ │
│                  │   └───────────┘  │ │ Insight Worker   │ │
└──────────────────┘                  │ └──────────────────┘ │
                                      └──────────────────────┘
```

---

## Why We Need Each Component

### 1. Why Separate the Ingestion Service (Worker)
Voice, CSV, and OCR are **I/O-heavy and CPU-heavy** operations. They must not block the main API process.

- **Voice**: Web Speech API runs client-side, but the parsed text needs server-side validation, entity extraction, and intent detection. This involves regex parsing and dictionary lookups — fast but should be queued for consistency.
- **CSV**: A 10,000-row CSV import must be validated, deduplicated, and inserted in batches. Doing this synchronously would timeout (default 30s). The worker processes it in the background and reports progress.
- **OCR**: Tesseract.js takes 3-15 seconds per image. Blocking the API thread for this duration is unacceptable.

### 2. Why We Separate the AI Service (as Module + Worker)
The AI module handles:
- **Categorization**: Keyword matching + fallback model (runs inline, fast)
- **Forecasting**: Prophet-based time series analysis (CPU-heavy, runs as worker job)
- **Budget recommendations**: Statistical analysis on historical data (scheduled job)
- **Insight generation**: Pattern detection across all user data (scheduled job)

Forecasting and insight generation take 2-30 seconds. They run as **scheduled background jobs** via BullMQ, not on user request.

### 3. Why We Use Redis
Redis serves four critical roles:

| Role | Why |
|------|-----|
| **Job Queue** (BullMQ) | CSV imports, OCR, forecasting — all async jobs need a reliable queue |
| **Session Cache** | Refresh token storage with TTL-based expiry |
| **AI Result Cache** | Forecast results cached for 24h to avoid recomputation |
| **Rate Limiting** | Distributed rate limit counts (express-rate-limit can use Redis store) |

Redis is free to run locally and available free-tier on Railway, Render, Upstash.

---

## Service Communication Flow

```
User Action              →  Frontend         →  API Gateway        →  Processing
─────────────────────────────────────────────────────────────────────────────────
Manual Transaction       →  POST /api/v1/    →  Direct DB Insert   →  Sync response
                            transactions        + Audit Log

Voice Entry              →  Web Speech API   →  POST /api/v1/      →  Parse text →
                            (browser)           voice/process         Validate →
                                                                      Create transaction

CSV Upload               →  POST /api/v1/    →  Save file →        →  BullMQ Job →
                            imports/csv         Queue job              Worker validates,
                                                Return job ID          dedupes, inserts

Receipt OCR              →  POST /api/v1/    →  Save image →       →  BullMQ Job →
                            receipts/upload     Queue job              Tesseract OCR →
                                                Return job ID          Extract data →
                                                                       User confirms

AI Forecast              →  GET /api/v1/     →  Check Redis cache  →  If miss: BullMQ
                            forecasts           Return if cached       Job → Prophet →
                                                                       Cache result

Budget Check             →  Cron (daily)     →  BullMQ scheduled   →  Evaluate all
                                                job                    budgets → Generate
                                                                       alerts
```

---

## Data Flow: UI to DB (Complete Path)

### Example: Voice Transaction Entry

```
1. User clicks microphone icon in frontend
2. Browser Web Speech API converts speech to text
3. Frontend sends text to: POST /api/v1/voice/process
4. API Gateway:
   a. JWT middleware validates token → extracts user_id
   b. Rate limiter checks request count
   c. Voice controller receives text
5. Voice Processing Module:
   a. Saves raw transcript to voice_logs table
   b. Runs intent detection (regex: "spent", "paid", "bought" → expense)
   c. Runs entity extraction (regex: amounts, dates, merchants)
   d. Runs category matching (keyword → category_id lookup)
   e. Validates extracted data
6. If confidence > threshold:
   a. Creates transaction in transactions table
   b. Creates audit_log entry
   c. Returns created transaction to frontend
7. If confidence < threshold:
   a. Returns parsed data with confirmation_required: true
   b. Frontend shows confirmation dialog
   c. User confirms/edits → POST /api/v1/transactions (normal flow)
```

---

## Where Background Jobs Run

All background jobs run in a **separate Node.js process** (the Worker Service):

```
Main API Process (Port 3000)          Worker Process (No HTTP port)
────────────────────────────          ─────────────────────────────
Handles HTTP requests                 Subscribes to Redis queues
Enqueues jobs to Redis                Processes jobs:
Serves responses                        • csv-import-queue
                                        • ocr-processing-queue
                                        • forecast-queue
                                        • budget-evaluation-queue
                                        • insight-generation-queue
```

**Startup**: `npm run dev` starts the API. `npm run worker` starts the worker. In production, both run as separate containers/processes.

---

## How Scaling Would Work

### Horizontal Scaling Path

```
Stage 1 (Current: 1-100 users)
├── Single API process
├── Single Worker process
├── PostgreSQL (local or free-tier Neon/Supabase)
├── Redis (local or free-tier Upstash)
└── File storage: local disk

Stage 2 (100-1,000 users)
├── 2 API processes behind nginx/PM2 cluster
├── 2 Worker processes (concurrency: 5 each)
├── PostgreSQL with connection pooling (PgBouncer)
├── Redis (dedicated instance)
└── File storage: S3-compatible (MinIO self-hosted or Cloudflare R2 free)

Stage 3 (1,000-10,000 users)
├── 4+ API processes behind load balancer
├── 4+ Worker processes (specialized: OCR workers, forecast workers)
├── PostgreSQL with read replicas
├── Redis Cluster
├── CDN for static assets
└── File storage: S3 with CloudFront

Stage 4 (10,000+ users)
├── Kubernetes orchestration
├── Auto-scaling API pods
├── Auto-scaling Worker pods
├── PostgreSQL with partitioning (by user_id)
├── Redis Sentinel for HA
└── Full microservices extraction if needed
```

### Why This Scales
- **Stateless API**: No session state in memory → any instance can handle any request
- **Queue-based workers**: Adding workers = adding processing capacity linearly
- **PostgreSQL**: Supports partitioning, read replicas, connection pooling — handles millions of rows
- **Redis**: Single-threaded but handles 100K+ ops/sec — bottleneck is almost never Redis

---

## Service Responsibilities Summary

| Service | Responsibilities | Tech |
|---------|-----------------|------|
| **API Gateway** | HTTP routing, auth, validation, rate limiting, audit logging | Express.js |
| **Auth Module** | JWT issuance, refresh tokens, RBAC, password hashing | bcrypt, jsonwebtoken |
| **Transaction Module** | CRUD transactions, filtering, pagination, search | PostgreSQL |
| **Budget Module** | CRUD budgets, spending calculation, alert thresholds | PostgreSQL |
| **Group Module** | Group CRUD, member management, expense splitting, settlement | PostgreSQL |
| **Analytics Module** | Summary, trends, category breakdown, spending patterns | PostgreSQL aggregations |
| **AI Module** | Categorization, chatbot, insight serving (cached) | Rule engine + Redis cache |
| **Voice Module** | Speech text parsing, intent detection, entity extraction | Regex + keyword matching |
| **File Upload Module** | CSV/image upload, validation, job enqueueing | Multer + BullMQ |
| **Audit Module** | Activity logging, change tracking, compliance | PostgreSQL |
| **Worker Service** | CSV import, OCR, forecasting, budget eval, insight gen | BullMQ workers |
| **Redis** | Job queues, caching, sessions, rate limiting | Redis 7+ |
| **PostgreSQL** | All persistent data storage | PostgreSQL 15+ |
| **File Store** | Receipt images, CSV files, generated reports | Local disk / S3 |

---

## Technology Stack (All Free/Open-Source)

| Component | Technology | License | Why |
|-----------|-----------|---------|-----|
| Runtime | Node.js 20 LTS | MIT | Already using, mature ecosystem |
| Framework | Express.js 4.x | MIT | Already using, lightweight |
| Database | PostgreSQL 15+ | PostgreSQL License | Enterprise-grade, free, ACID |
| Cache/Queue | Redis 7+ | BSD | Industry standard, free |
| Job Queue | BullMQ | MIT | Best Node.js queue library |
| OCR | Tesseract.js 5.x | Apache 2.0 | Already in deps, runs in Node |
| Forecasting | Prophet (via python-shell) | MIT | Facebook's forecasting, free |
| ML | scikit-learn (via python-shell) | BSD | Gradient boosting for budgets |
| ORM | Knex.js | MIT | Query builder, migrations |
| Validation | Joi | BSD | Already using |
| File Upload | Multer | MIT | Standard Express file handling |
| Frontend | React 18 + Vite + TypeScript | MIT | Already using |
| Charts | Chart.js + react-chartjs-2 | MIT | Already using |
| Speech | Web Speech API | Browser native | Free, no API needed |
