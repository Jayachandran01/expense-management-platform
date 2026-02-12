# PHASE 5 — BACKGROUND JOB SYSTEM

## Why We Need Redis

Redis is not just a cache — it's the **nervous system** of the background job architecture.

### The Problem Without Redis
```
Without Redis (current state):
  User uploads 5000-row CSV → Express route handler processes all 5000 rows
  → HTTP request hangs for 45 seconds → Nginx/load balancer times out at 30s
  → User sees 504 Gateway Timeout → Data is partially imported, no rollback
  → User retries → Duplicate data
```

### Redis Solves 4 Distinct Problems

| Problem | Redis Solution | Alternative Without Redis |
|---------|---------------|--------------------------|
| Long-running jobs block API | BullMQ job queue (Redis-backed) | setTimeout hacks, lost jobs on crash |
| Forecast results are expensive to compute | Cache with TTL | Re-compute on every request (5-30s wait) |
| Rate limiting across multiple API instances | Shared counter store | Per-process limits (bypassable by hitting different instances) |
| Chat session context (multi-turn) | Hash with TTL | Database queries per message (slow) |

---

## Why BullMQ (Not Celery, Not Agenda)

| Library | Language | Redis Required | Features | Why/Why Not |
|---------|----------|---------------|----------|-------------|
| **BullMQ** | Node.js | Yes | Priority, retry, cron, concurrency, progress events | ✅ Native Node.js, same runtime as API |
| Celery | Python | Yes | Mature, distributed | ❌ Requires Python runtime alongside Node |
| Agenda | Node.js | No (MongoDB) | Simple scheduling | ❌ No priority queues, no progress tracking |
| Bull | Node.js | Yes | Predecessor to BullMQ | ❌ Deprecated in favor of BullMQ |

**BullMQ wins** because it runs in the same Node.js runtime as our API, uses the same Redis instance, and provides enterprise features (priority, dead letter queues, sandboxed processors).

---

## Job Queue Architecture

```
┌─────────────────────────────────────────────────────┐
│                    REDIS                             │
│                                                      │
│  Queue: csv-import        ████░░░░░░  3 jobs         │
│  Queue: ocr-processing    ██░░░░░░░░  1 job          │
│  Queue: forecast-compute  ░░░░░░░░░░  0 jobs (idle)  │
│  Queue: budget-evaluation █░░░░░░░░░  1 job (cron)   │
│  Queue: insight-generation░░░░░░░░░░  0 jobs         │
│  Queue: notification      ██░░░░░░░░  2 jobs         │
│                                                      │
│  Scheduled (Cron):                                   │
│    forecast-compute: Every Sun 2:00 AM               │
│    budget-evaluation: Every day 6:00 AM              │
│    insight-generation: Every day 3:00 AM             │
│    data-cleanup: Every Sun 4:00 AM                   │
└─────────────────────────────────────────────────────┘
         │                    │                │
         ▼                    ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Worker 1   │  │   Worker 2   │  │   Worker 3   │
│              │  │              │  │              │
│ csv-import   │  │ ocr-process  │  │ forecast     │
│ concurrency:3│  │ concurrency:2│  │ concurrency:1│
│              │  │              │  │              │
│ Also handles:│  │ Also handles:│  │ Also handles:│
│ notification │  │ notification │  │ budget-eval  │
│              │  │              │  │ insight-gen  │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## What Runs Async (And Why)

### Jobs That MUST Be Async

| Job | Why Async | Typical Duration | Concurrency |
|-----|-----------|-----------------|-------------|
| CSV Import (1000+ rows) | Would timeout HTTP request | 5-60s | 3 |
| OCR Processing | Tesseract is CPU-bound (3-15s per image) | 3-15s | 2 |
| Forecast Computation | Prophet model fitting + prediction | 10-30s | 1 |

### Jobs That Run on Schedule (Cron)

| Job | Schedule | What It Does |
|-----|----------|-------------|
| **Monthly Forecast** | Every Sunday 2:00 AM | Re-runs Prophet for all active users who have >60 days of data. Stores results in `forecast_results` table + Redis cache |
| **Budget Evaluation** | Every day 6:00 AM | For each active budget: calculate current spending vs budget amount. Generate alerts if threshold exceeded. Insert `ai_insights` records |
| **Insight Generation** | Every day 3:00 AM | Run all insight rules (spending spikes, category creep, recurring detection, etc.) for users who had transactions in the last 7 days |
| **Data Cleanup** | Every Sunday 4:00 AM | Delete expired `ai_insights` (>30 days old, dismissed). Purge old `voice_logs` (>90 days, status=failed). Clean Redis expired keys |

---

## Monthly Forecast Scheduling — Detailed

```
Cron Expression: '0 2 * * 0' (Every Sunday at 2:00 AM)

Job Logic:
  1. Query: SELECT DISTINCT user_id FROM transactions
            WHERE created_at > NOW() - INTERVAL '7 days'
     → Only forecast for users who had recent activity (no wasting compute)

  2. For each active user_id:
     a. Check: SELECT COUNT(DISTINCT transaction_date)
               FROM transactions WHERE user_id = $1
        → Skip if < 60 data points (insufficient history)
     
     b. Check: SELECT valid_until FROM forecast_results
               WHERE user_id = $1 AND forecast_type = 'spending'
               ORDER BY created_at DESC LIMIT 1
        → Skip if forecast is still valid (not expired)
     
     c. Enqueue individual forecast job:
        Queue: 'forecast-compute'
        Data: { user_id, forecast_type: 'spending' }
        Priority: 10 (low — don't compete with user-initiated jobs)

  3. For top 5 categories of each user:
     Enqueue category-specific forecast jobs
     Priority: 15 (even lower)

  4. Processing is throttled: max 1 concurrent forecast job
     (Prophet is memory-hungry, ~200MB per model)
```

---

## Budget Evaluation Jobs — Detailed

```
Cron Expression: '0 6 * * *' (Every day at 6:00 AM)

Job Logic:
  1. Query all active budgets:
     SELECT b.*, u.email, u.full_name
     FROM budgets b
     JOIN users u ON b.user_id = u.id
     WHERE b.is_active = true
     AND b.deleted_at IS NULL
     AND NOW() BETWEEN b.start_date AND b.end_date

  2. For each budget:
     a. Calculate current spending:
        SELECT SUM(amount) FROM transactions
        WHERE user_id = b.user_id
        AND type = 'expense'
        AND transaction_date BETWEEN b.start_date AND b.end_date
        AND (category_id = b.category_id OR b.category_id IS NULL)
     
     b. Calculate percentage: (spent / budget_amount) * 100
     
     c. Generate alerts:
        If percentage > 100%:
          → INSERT ai_insights: type='budget_exceeded', severity='critical'
        Else if percentage > alert_threshold:
          → INSERT ai_insights: type='budget_warning', severity='warning'
        Else if percentage > 50% AND days_remaining < 10:
          → INSERT ai_insights: type='budget_projection', severity='info'
          → (projected spend = current_spend / days_elapsed * total_days)

  3. Invalidate Redis cache: DELETE budget_status:{user_id}
```

---

## Import Processing Jobs — Detailed

```
Queue: 'csv-import'
Concurrency: 3

Job Lifecycle:
  ┌─────────┐    ┌──────────┐    ┌────────────┐    ┌───────────┐
  │ WAITING │───►│  ACTIVE  │───►│ COMPLETED  │    │  FAILED   │
  └─────────┘    └──────────┘    └────────────┘    └───────────┘
                      │                                  ▲
                      │         ┌────────────┐           │
                      └────────►│  DELAYED   │───────────┘
                                │ (retry in  │     (after 3 retries)
                                │  5/15/45s) │
                                └────────────┘

Job Options:
  {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },   // Keep last 100 completed jobs for debugging
    removeOnFail: { age: 7 * 24 * 3600 } // Keep failed jobs for 7 days
  }

Progress Events:
  Worker emits job.updateProgress({ 
    processed: 250, 
    total: 500, 
    imported: 240, 
    skipped: 10 
  });
  
  Frontend polls: GET /api/v1/imports/{import_id}/status
  → API checks BullMQ job progress + csv_import_logs table
```

---

## Worker Process Startup

```
// worker.js — runs as separate Node.js process

const { Worker } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis(process.env.REDIS_URL);

// CSV Import Worker
const csvWorker = new Worker('csv-import', 
  async (job) => { /* processing logic */ },
  { connection, concurrency: 3 }
);

// OCR Worker
const ocrWorker = new Worker('ocr-processing',
  async (job) => { /* Tesseract processing */ },
  { connection, concurrency: 2 }
);

// Forecast Worker
const forecastWorker = new Worker('forecast-compute',
  async (job) => { /* Prophet via python-shell */ },
  { connection, concurrency: 1 }
);

// Budget Evaluation Worker
const budgetWorker = new Worker('budget-evaluation',
  async (job) => { /* Budget checking logic */ },
  { connection, concurrency: 5 }
);

// Insight Generation Worker
const insightWorker = new Worker('insight-generation',
  async (job) => { /* Insight rules evaluation */ },
  { connection, concurrency: 3 }
);

// Cron Job Scheduler (runs in worker process)
const { Queue } = require('bullmq');
const forecastQueue = new Queue('forecast-compute', { connection });
const budgetQueue = new Queue('budget-evaluation', { connection });
const insightQueue = new Queue('insight-generation', { connection });

// Schedule recurring jobs
forecastQueue.add('weekly-forecast', {}, {
  repeat: { cron: '0 2 * * 0' }  // Sunday 2 AM
});

budgetQueue.add('daily-budget-check', {}, {
  repeat: { cron: '0 6 * * *' }  // Daily 6 AM
});

insightQueue.add('daily-insights', {}, {
  repeat: { cron: '0 3 * * *' }  // Daily 3 AM
});

console.log('🔧 All workers started');
```

---

## Running the System

```
Development:
  Terminal 1: npm run dev          # API server (port 3000)
  Terminal 2: npm run worker       # Background workers
  Terminal 3: redis-server         # Redis (port 6379)

Production (PM2):
  pm2 start server.js --name api -i 2          # 2 API instances
  pm2 start worker.js --name worker -i 1       # 1 worker process
  
Production (Docker Compose):
  services:
    api:
      build: .
      command: node server.js
      replicas: 2
    worker:
      build: .
      command: node worker.js
      replicas: 1
    redis:
      image: redis:7-alpine
    postgres:
      image: postgres:15-alpine
```
