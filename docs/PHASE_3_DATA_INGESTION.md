# PHASE 3 — DATA INGESTION PIPELINES

## Overview

Your current system only supports manual transaction entry via form. Enterprise systems ingest data from multiple sources. We add three new ingestion channels, all using **free/open-source tools only**.

```
                    ┌─────────────────────┐
                    │    INGESTION        │
                    │    CHANNELS         │
                    ├─────────────────────┤
   🎤 Voice ───────►│ 1. Web Speech API  │
                    │    + Rule Engine    │
   📄 CSV ─────────►│ 2. File Upload     │──► BullMQ Queue ──► Worker ──► PostgreSQL
                    │    + Parser         │
   📸 Receipt ─────►│ 3. Tesseract OCR   │
                    │    + Regex Extract  │
                    └─────────────────────┘
```

---

## 1️⃣ Voice Entry Flow

### How It Works End-to-End

The Web Speech API is a **browser-native** API (Chrome, Edge, Safari) that converts speech to text **locally on the client**. No paid API is needed.

### Step-by-Step Internal Process

#### Step 1: Speech Capture (Frontend — Browser)

```
User clicks 🎤 button
    │
    ▼
Browser creates SpeechRecognition instance
    │  - language: 'en-IN'
    │  - continuous: false
    │  - interimResults: true
    │
    ▼
User speaks: "I spent 500 rupees on groceries at BigBazaar yesterday"
    │
    ▼
Browser's built-in speech engine converts audio to text
    │  - Interim result: "I spent 500"
    │  - Interim result: "I spent 500 rupees on"
    │  - Final result: "I spent 500 rupees on groceries at BigBazaar yesterday"
    │
    ▼
Frontend sends POST /api/v1/voice/process
    Body: { "transcript": "I spent 500 rupees on groceries at BigBazaar yesterday" }
```

**Why this is free**: Web Speech API uses the browser's built-in speech engine. Chrome uses Google's servers (free for users), Edge uses Azure (free for users), Safari uses Apple's on-device model.

#### Step 2: Intent Detection (Backend — Rule Engine)

The server receives the raw transcript and runs **rule-based intent detection**:

```
Input: "I spent 500 rupees on groceries at BigBazaar yesterday"

Intent Detection Rules (executed in order):

1. EXPENSE patterns:
   Keywords: ["spent", "paid", "bought", "purchased", "cost", "charged"]
   Regex: /(spent|paid|bought|purchased|cost|charged)/i
   → MATCH: "spent" → Intent = EXPENSE

2. INCOME patterns:
   Keywords: ["received", "earned", "got paid", "salary", "income", "credited"]
   → No match

3. TRANSFER patterns:
   Keywords: ["transferred", "sent money", "paid back"]
   → No match

Result: Intent = "EXPENSE"
```

**Why rule-based, not ML**: For transaction intent detection, there are only 3-5 intents (expense, income, transfer, balance_check, help). Rule-based matching achieves 95%+ accuracy with zero training data and zero latency. ML would be over-engineering.

#### Step 3: Entity Extraction (Backend — Regex + Dictionary)

```
Input: "I spent 500 rupees on groceries at BigBazaar yesterday"

Entity Extraction Pipeline:

1. AMOUNT extraction:
   Regex: /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:rupees|rs|₹|inr|dollars|\$)?/i
   Match: "500 rupees" → amount = 500.00

2. DATE extraction:
   Dictionary: {"today": 0, "yesterday": -1, "day before": -2}
   Regex for explicit dates: /(\d{1,2})[\/\-](\d{1,2})[\/\-]?(\d{2,4})?/
   Match: "yesterday" → date = 2026-02-10

3. MERCHANT extraction:
   Regex: /(?:at|from|to)\s+([A-Z][a-zA-Z\s]+)/
   Match: "at BigBazaar" → merchant = "BigBazaar"

4. CATEGORY extraction:
   Keyword dictionary:
   {
     "groceries": "Food & Groceries",
     "food": "Food & Groceries",
     "uber": "Transportation",
     "rent": "Housing",
     "electricity": "Utilities",
     "movie": "Entertainment",
     ...50+ mappings
   }
   Match: "groceries" → category = "Food & Groceries" → category_id = 3

Result: {
  intent: "EXPENSE",
  amount: 500.00,
  date: "2026-02-10",
  merchant: "BigBazaar",
  category: "Food & Groceries",
  category_id: 3,
  confidence: 0.92
}
```

#### Step 4: Confidence Scoring

```
Confidence calculation:
  Base: 0.5 (intent detected)
  + 0.2 if amount found
  + 0.1 if date found
  + 0.1 if merchant found
  + 0.1 if category matched

  Example: 0.5 + 0.2 + 0.1 + 0.1 + 0.1 = 1.0 (very high confidence)

  If confidence >= 0.8: Auto-create transaction (with user toast notification)
  If confidence 0.5-0.8: Show confirmation dialog with pre-filled form
  If confidence < 0.5: Show error "Couldn't understand, please try again"
```

#### Step 5: Validation & Transaction Creation

```
Validation checks:
  ✓ amount > 0 and <= 10,000,000 (reasonable limit)
  ✓ date is not in the future
  ✓ date is not more than 1 year ago
  ✓ category_id exists in user's categories
  ✓ merchant length <= 100 characters

If validation passes:
  1. INSERT into voice_logs (raw transcript + parsed entities + confidence)
  2. INSERT into transactions (with data_source = 'voice', source_reference_id = voice_log.id)
  3. INSERT into audit_logs (action = 'CREATE', entity_type = 'transaction')
  4. Return created transaction to frontend
```

---

## 2️⃣ CSV Upload Flow

### How It Works End-to-End

Users export transaction data from their bank (HDFC, SBI, ICICI all provide CSV exports). Our system imports these CSVs, maps columns intelligently, and bulk-inserts transactions.

### Step-by-Step Internal Process

#### Step 1: File Validation (Synchronous — API Request)

```
User uploads: hdfc_statement_jan2026.csv

Frontend: POST /api/v1/imports/csv (multipart/form-data)

Server-side validation (immediate, before queueing):
  1. File type check: mimetype must be 'text/csv' or 'application/vnd.ms-excel'
  2. File size check: max 5MB (configurable)
  3. File parsing: Read first 5 rows with csv-parser
  4. Row count estimate: Count newlines (fast) → reject if > 10,000 rows
  5. Encoding detection: Detect UTF-8/UTF-16/ISO-8859-1
  
If validation fails → Return 400 with specific error message
If validation passes → Save file to /uploads/csv/{user_id}/{uuid}.csv
```

#### Step 2: Header Mapping Detection (Synchronous)

```
CSV headers: "Transaction Date, Description, Debit, Credit, Balance"

Header mapping algorithm:
  1. Normalize headers: lowercase, trim, remove special chars
  2. Match against known patterns:
  
  DATE patterns: ["date", "transaction date", "txn date", "value date", "posting date"]
  AMOUNT patterns: ["amount", "debit", "credit", "withdrawal", "deposit"]
  DESCRIPTION patterns: ["description", "narration", "particulars", "details", "remarks"]
  MERCHANT patterns: ["merchant", "payee", "beneficiary"]
  CATEGORY patterns: ["category", "type", "head"]

  3. Handle bank-specific formats:
     - HDFC: "Debit" + "Credit" columns → separate income/expense
     - SBI: Single "Amount" column with +/- signs
     - ICICI: "Withdrawal" + "Deposit" columns

Result: column_mapping = {
  "date": "Transaction Date",
  "debit": "Debit",
  "credit": "Credit",
  "description": "Description"
}

Response to user: {
  "import_id": "uuid",
  "detected_mapping": { ... },
  "preview_rows": [ first 5 rows with mapped values ],
  "total_rows": 450,
  "status": "awaiting_confirmation"
}

User reviews mapping on frontend → Clicks "Confirm Import"
```

#### Step 3: Async Processing via Queue

```
User confirms → POST /api/v1/imports/{import_id}/confirm

Server:
  1. Update csv_import_logs: status = 'processing', started_at = NOW()
  2. Enqueue BullMQ job:
     Queue: 'csv-import'
     Job data: { import_id, user_id, file_path, column_mapping }
     Options: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
  3. Return: { "message": "Import started", "job_id": "..." }
```

#### Step 4: Worker Processing (Background)

```
CSV Import Worker picks up the job:

For each row (in batches of 100):

  1. PARSE: Apply column mapping to extract date, amount, description
  
  2. VALIDATE:
     - Is date valid? (parseable, not future, not > 2 years ago)
     - Is amount valid? (numeric, > 0, < 10,000,000)
     - Is description non-empty?
     
  3. DUPLICATE DETECTION:
     - Hash: SHA256(user_id + date + amount + description)
     - Check if hash exists in transactions table (indexed column)
     - If duplicate → Skip row, increment skipped_rows counter
     
  4. AUTO-CATEGORIZE:
     - Run description through category keyword matcher
     - "SWIGGY ORDER" → "Food & Dining"
     - "UBER TRIP" → "Transportation"
     - "AMAZON" → "Shopping"
     - If no match → category = "Uncategorized" with ai_categorized = false
     
  5. BATCH INSERT:
     - Every 100 rows: INSERT INTO transactions (...) VALUES (...), (...), ...
     - Use PostgreSQL's multi-row INSERT for performance
     - Each transaction has data_source = 'csv_import', source_reference_id = import_id

  6. PROGRESS UPDATE:
     - Every 100 rows: Update csv_import_logs with current counts
     - Emit Socket.IO event to frontend: { import_id, progress: 45, imported: 225, total: 500 }

After all rows:
  7. UPDATE csv_import_logs:
     status = 'completed', completed_at = NOW(),
     total_rows = 500, imported_rows = 480, skipped_rows = 15, failed_rows = 5
```

#### Step 5: Import Report

```
Frontend polls: GET /api/v1/imports/{import_id}/status

Response: {
  "status": "completed",
  "total_rows": 500,
  "imported_rows": 480,
  "skipped_rows": 15,    // duplicates
  "failed_rows": 5,      // validation errors
  "row_errors": [
    { "row": 23, "error": "Invalid date format: '32/01/2026'" },
    { "row": 156, "error": "Amount is negative: -500" },
    ...
  ],
  "processing_time_seconds": 12,
  "categories_assigned": {
    "Food & Dining": 120,
    "Transportation": 85,
    "Shopping": 95,
    "Uncategorized": 180
  }
}
```

---

## 3️⃣ Receipt OCR Flow

### How It Works End-to-End

Users photograph paper receipts. Tesseract.js (open-source OCR) extracts text. Regex patterns extract structured data. User confirms before saving.

### Step-by-Step Internal Process

#### Step 1: Image Upload (Synchronous)

```
User captures/selects receipt image

Frontend: POST /api/v1/receipts/upload (multipart/form-data)

Server-side validation:
  1. File type: ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  2. File size: max 10MB
  3. Image dimensions: min 200x200, max 4096x4096
  4. Virus scan: Check magic bytes match declared MIME type (prevent polyglot files)

Storage:
  Save to: /uploads/receipts/{user_id}/{uuid}.{ext}
  Create thumbnail: Resize to 300px width for preview

Database:
  INSERT into ocr_receipts (user_id, original_filename, stored_path, file_size, mime_type, status='pending')

Response: { "receipt_id": "uuid", "status": "pending", "thumbnail_url": "..." }
```

#### Step 2: Queue OCR Job

```
Immediately after upload response:
  Enqueue BullMQ job:
    Queue: 'ocr-processing'
    Job data: { receipt_id, user_id, file_path }
    Options: { attempts: 2, timeout: 60000 }  // 60s timeout
```

#### Step 3: Tesseract OCR Processing (Background Worker)

```
OCR Worker picks up the job:

1. LOAD IMAGE:
   Read file from disk
   
2. PRE-PROCESSING (improves OCR accuracy):
   - Convert to grayscale
   - Increase contrast by 1.5x
   - Apply sharpening filter
   (using sharp library — open source, no native deps needed)

3. RUN TESSERACT:
   const { createWorker } = require('tesseract.js');
   const worker = await createWorker('eng');
   const { data: { text, confidence } } = await worker.recognize(imagePath);
   
   Processing time: 3-15 seconds depending on image quality
   
4. RAW OCR OUTPUT example:
   "BigBazaar
    Store #1234, Koramangala
    Date: 10/02/2026
    
    Rice 5kg          ₹450.00
    Milk 2L            ₹96.00
    Bread               ₹45.00
    Vegetables         ₹180.00
    
    TOTAL             ₹771.00
    Payment: UPI
    Thank you!"
```

#### Step 4: Text Cleaning & Data Extraction (Regex-Based)

```
Cleaned text → Run extraction pipeline:

1. AMOUNT extraction (total):
   Patterns (tried in order):
   - /total[:\s]*[₹$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i
   - /grand\s*total[:\s]*[₹$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i
   - /amount\s*(?:due|paid)?[:\s]*[₹$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i
   - Fallback: Largest number in the text
   
   Match: "TOTAL ₹771.00" → amount = 771.00

2. DATE extraction:
   Patterns:
   - /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/  → DD/MM/YYYY
   - /(jan|feb|mar|...)\s*(\d{1,2}),?\s*(\d{4})/i  → Month DD, YYYY
   - /date[:\s]*(.+)/i → Extract and parse
   
   Match: "Date: 10/02/2026" → date = 2026-02-10

3. MERCHANT extraction:
   Heuristic: First line of receipt text that contains alphabetical characters
   and is not a common header ("receipt", "invoice", "bill")
   
   Match: "BigBazaar" → merchant = "BigBazaar"

4. LINE ITEMS extraction:
   Pattern: /(.+?)\s{2,}[₹$]?\s*(\d+(?:\.\d{2})?)/gm
   
   Matches:
   - "Rice 5kg" → ₹450.00
   - "Milk 2L" → ₹96.00
   - "Bread" → ₹45.00
   - "Vegetables" → ₹180.00

5. UPDATE database:
   UPDATE ocr_receipts SET
     raw_ocr_text = '...',
     extracted_amount = 771.00,
     extracted_date = '2026-02-10',
     extracted_merchant = 'BigBazaar',
     extracted_items = '[{"name":"Rice 5kg","amount":450}, ...]',
     ocr_confidence = 0.85,
     processing_status = 'extracted',
     processing_time_ms = 8500
```

#### Step 5: User Confirmation Before Save

```
Frontend polls: GET /api/v1/receipts/{receipt_id}/status

When status = 'extracted':
  Display to user:
  ┌──────────────────────────────────┐
  │ 📸 Receipt Scanned               │
  │                                  │
  │ Merchant: BigBazaar              │
  │ Amount:   ₹771.00    [edit]      │
  │ Date:     Feb 10, 2026 [edit]    │
  │ Category: Food & Groceries [▼]   │
  │                                  │
  │ Items detected:                  │
  │  • Rice 5kg — ₹450              │
  │  • Milk 2L — ₹96               │
  │  • Bread — ₹45                  │
  │  • Vegetables — ₹180            │
  │                                  │
  │ [Cancel]           [Save] │
  └──────────────────────────────────┘

User confirms → POST /api/v1/receipts/{receipt_id}/confirm
  Body: { amount: 771.00, date: "2026-02-10", category_id: 3, merchant: "BigBazaar" }

Server:
  1. Create transaction (data_source = 'ocr', source_reference_id = receipt_id)
  2. Update ocr_receipts: status = 'confirmed', resulting_txn_id = new_txn.id
  3. Create audit_log entry
```

---

## Why These Pipelines Are Enterprise-Grade

| Aspect | Implementation |
|--------|---------------|
| **Async processing** | Heavy operations (CSV, OCR) run in BullMQ workers, not blocking API |
| **Retry logic** | All jobs have exponential backoff retries (3 attempts for CSV, 2 for OCR) |
| **Progress tracking** | Real-time progress via polling/Socket.IO for long-running imports |
| **Error reporting** | Row-level error reports for CSV; OCR confidence scores for receipts |
| **Duplicate prevention** | SHA256 hash-based dedup for CSV imports |
| **Audit trail** | Every ingested transaction linked back to source via `data_source` + `source_reference_id` |
| **Data quality** | Confidence scoring on voice + OCR; user confirmation before save on low-confidence results |
| **No paid APIs** | Web Speech API (browser), Tesseract.js (MIT), regex parsing (custom) |
