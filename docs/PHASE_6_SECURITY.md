# PHASE 6 — ENTERPRISE SECURITY

## 1. JWT + Refresh Token Architecture

### Current State Problem
Your system uses a single JWT with no refresh mechanism. When the token expires, the user is logged out. This creates poor UX and security issues (users set long expiry to avoid re-login → tokens are valid for days if stolen).

### Enterprise Token Architecture

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Login   │────────►│  Access  │────────►│  API     │
│  Request │         │  Token   │         │ Request  │
└──────────┘         │ (15 min) │         └──────────┘
     │               └──────────┘              │
     │                                         │ Token expired?
     ▼                                         ▼
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Refresh │────────►│  New     │────────►│  Retry   │
│  Token   │         │  Access  │         │  Request │
│ (7 days) │         │  Token   │         └──────────┘
│ (HTTP-   │         └──────────┘
│  Only    │
│  Cookie) │
└──────────┘
```

### How It Works

```
LOGIN FLOW:
  1. User sends credentials: POST /api/v1/auth/login
  2. Server validates password (bcrypt.compare)
  3. Server generates:
     - Access Token (JWT, 15min expiry, contains: user_id, role, email)
     - Refresh Token (opaque UUID, 7-day expiry)
  4. Refresh token is:
     - Hashed (SHA-256) and stored in users.refresh_token_hash
     - Sent to client as HTTP-Only, Secure, SameSite=Strict cookie
  5. Access token sent in response body → client stores in memory (NOT localStorage)
  
TOKEN REFRESH FLOW:
  1. Access token expires (401 response)
  2. Frontend intercepts 401 via Axios interceptor
  3. Sends: POST /api/v1/auth/refresh (refresh token sent automatically via cookie)
  4. Server:
     a. Extracts refresh token from cookie
     b. Hashes it → compares with users.refresh_token_hash
     c. Checks if refresh token is expired (7 days)
     d. If valid: generates new access token + new refresh token (rotation)
     e. Old refresh token is invalidated (prevents replay)
  5. New access token returned → retry original request

LOGOUT FLOW:
  1. POST /api/v1/auth/logout
  2. Server: SET users.refresh_token_hash = NULL WHERE id = user_id
  3. Clear HTTP-Only cookie
  4. Optionally: Add current access token JTI to Redis blacklist (TTL = remaining expiry)
```

### Why This Is Secure

| Measure | Protection Against |
|---------|-------------------|
| Short access token (15min) | Token theft — attacker has max 15min window |
| HTTP-Only cookie for refresh | XSS — JavaScript cannot access refresh token |
| Refresh token rotation | Token replay — old refresh token becomes invalid |
| Refresh token hashing in DB | Database breach — plaintext tokens not stored |
| Access token in memory only | XSS/CSRF — not in localStorage, not in cookies |
| SameSite=Strict cookie | CSRF — cookie not sent on cross-origin requests |

---

## 2. RBAC (Role-Based Access Control)

### Role Hierarchy

```
ROLES:
  admin   → Full system access. User management. System configuration.
  auditor → Read-only access to all data. Audit log access. Cannot modify data.
  user    → Standard user. CRUD own data only. No access to other users' data.
```

### Permission Matrix

```
Resource              │ user          │ auditor       │ admin
──────────────────────┼───────────────┼───────────────┼──────────────
Own transactions      │ CRUD          │ Read          │ CRUD
Other's transactions  │ ✗             │ Read          │ CRUD
Own budgets           │ CRUD          │ Read          │ CRUD
Groups (member)       │ CRUD own      │ Read          │ CRUD
Groups (admin)        │ CRUD + manage │ Read          │ CRUD + manage
Analytics (own)       │ Read          │ Read          │ Read
Analytics (all users) │ ✗             │ Read          │ Read
Audit logs            │ Own actions   │ All           │ All
User management       │ Own profile   │ ✗             │ Full CRUD
System settings       │ ✗             │ ✗             │ Full
CSV imports           │ Own           │ Read all      │ Full
File uploads          │ Own           │ Read all      │ Full
```

### Middleware Implementation

```
Authorization middleware chain:

  authenticate(req)         → Verify JWT, extract user_id and role
       │
       ▼
  authorize('admin')        → Check role against required role
       │
       ▼
  authorizeOwnership(req)   → Check if resource belongs to user
       │
       ▼
  Controller handler        → Business logic
  
Route examples:
  GET    /api/v1/transactions       → authenticate + authorizeOwnership
  DELETE /api/v1/transactions/:id   → authenticate + authorizeOwnership  
  GET    /api/v1/admin/users        → authenticate + authorize('admin')
  GET    /api/v1/audit-logs         → authenticate + authorize('admin', 'auditor')
```

---

## 3. File Upload Security

### Attack Vectors & Mitigations

```
1. MALICIOUS FILE UPLOAD (e.g., .exe disguised as .jpg)
   Mitigation:
   - Check MIME type from file content (magic bytes), not just extension
   - Whitelist: ['image/jpeg', 'image/png', 'image/webp', 'text/csv']
   - Re-encode images with Sharp (strips embedded scripts)
   
2. PATH TRAVERSAL (filename: "../../etc/passwd")
   Mitigation:
   - Generate UUID filename, never use original filename for storage
   - Store in isolated directory: /uploads/{user_id}/{uuid}.{ext}
   - Serve via API route (not static file serving)
   
3. DENIAL OF SERVICE (100MB file upload)
   Mitigation:
   - Multer file size limits: 10MB for images, 5MB for CSV
   - Request body size limit: express.json({ limit: '10mb' })
   - Rate limit on upload endpoints: 10 uploads per minute per user
   
4. STORAGE EXHAUSTION
   Mitigation:
   - Per-user storage quota: 100MB (configurable)
   - Auto-cleanup: Delete processed CSVs after 24 hours
   - Receipts: Keep only confirmed receipts; delete rejected after 7 days
```

### File Storage Path Pattern
```
/uploads/
  ├── csv/
  │   └── {user_id}/
  │       └── {uuid}.csv          ← Auto-deleted 24h after processing
  ├── receipts/
  │   └── {user_id}/
  │       ├── {uuid}.jpg          ← Original
  │       └── {uuid}_thumb.jpg    ← Thumbnail (300px)
  └── exports/
      └── {user_id}/
          └── {uuid}.pdf          ← Generated reports, auto-deleted 1h after download
```

---

## 4. Input Sanitization

### Defense Layers

```
Layer 1: Joi Schema Validation (existing — already good)
  Every API endpoint has a Joi schema that validates:
  - Data types (string, number, date)
  - Ranges (amount > 0, amount < 10000000)
  - Formats (email, date ISO format)
  - Required vs optional fields
  
Layer 2: SQL Injection Prevention
  Current: Parameterized queries (? placeholders) — already implemented ✓
  Upgraded: Knex.js query builder (eliminates raw SQL entirely)
  
Layer 3: XSS Prevention
  - helmet() middleware sets Content-Security-Policy headers ✓ (existing)
  - All user input stored as-is in DB, sanitized on OUTPUT
  - React auto-escapes JSX expressions ✓ (existing)
  - Never use dangerouslySetInnerHTML with user content
  
Layer 4: NoSQL Injection Prevention
  - JSONB inputs validated with Joi before storage
  - No eval() or Function() on user input
  - No template literal SQL (use parameterized queries only)
  
Layer 5: Request Header Validation
  - Content-Type must match body (JSON endpoints reject form-data)
  - Origin header checked by CORS middleware ✓ (existing)
```

---

## 5. Rate Limiting Strategy

### Tiered Rate Limiting

```
Tier 1: Global Rate Limit (existing — enhanced)
  All /api/* endpoints: 100 requests per minute per IP
  → Prevents general abuse
  
Tier 2: Auth-Specific Limits
  POST /api/v1/auth/login:     5 requests per minute per IP
  POST /api/v1/auth/register:  3 requests per minute per IP
  POST /api/v1/auth/refresh:   10 requests per minute per IP
  → Prevents brute-force attacks

Tier 3: Resource-Intensive Limits
  POST /api/v1/imports/csv:    5 per hour per user
  POST /api/v1/receipts/upload: 20 per hour per user
  POST /api/v1/voice/process:  30 per hour per user
  GET  /api/v1/forecasts:      10 per hour per user
  → Prevents compute abuse

Tier 4: Account Lockout
  5 failed login attempts → Account locked for 15 minutes
  10 failed attempts → Account locked for 1 hour
  → Stored in users.failed_login_attempts + users.locked_until
```

### Implementation

```
Using express-rate-limit with Redis store (ioredis):

Benefits of Redis store:
  - Rate limits shared across all API instances (load-balanced)
  - Survives API restarts (limits persist in Redis)
  - Atomic increment operations (no race conditions)
```

---

## 6. Audit Logging Strategy

### What Gets Logged

```
ALWAYS LOG (every request):
  • user_id, timestamp, IP address, user agent
  • Request method, path, response status code

LOG ON DATA MUTATION:
  • Entity type (transaction, budget, user, group)
  • Entity ID
  • Action (CREATE, UPDATE, DELETE)
  • Old values (for UPDATE/DELETE)
  • New values (for CREATE/UPDATE)
  • Changed fields list

LOG ON SECURITY EVENTS:
  • Login success/failure
  • Password change
  • Role change
  • Token refresh
  • Account lockout
  • Permission denied (403)

LOG ON SYSTEM EVENTS:
  • CSV import start/complete/fail
  • OCR processing start/complete/fail
  • Forecast generation
  • Scheduled job execution
```

### Audit Log Retention Policy

```
Hot storage (PostgreSQL):  90 days — full query capability
Warm storage (compressed): 1 year — archived, queryable with delay
Cold storage (backup):     7 years — regulatory compliance (financial data)

Automated:
  Daily: Partition current month's audit_logs
  Monthly: Compress and archive audit_logs older than 90 days
  Yearly: Move archived logs to cold backup
```

### Audit Log Immutability

```
Protection mechanisms:
  1. Application level: No UPDATE/DELETE methods exposed for audit_logs
  2. Database level: CREATE RULE prevent_audit_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
  3. Database level: CREATE RULE prevent_audit_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
  4. Backup level: Daily backup of audit_logs table (separate from main backup)
```
