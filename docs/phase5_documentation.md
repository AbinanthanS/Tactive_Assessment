# RateGuard — Full Documentation Set

> Assessment Phase 5: Architecture, Design & User Guide

---

# Part 1: Architecture Document

## System Overview

RateGuard is a full-stack API gateway and rate limiting service that demonstrates
production-grade, atomic fixed-window rate limiting using PostgreSQL — without
any external caching layer (no Redis, no Memcached).

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19 + Vite | SPA dashboard for key management & testing |
| Backend | Node.js 20 + Express 5 | REST API server |
| Database | PostgreSQL (Neon serverless) | Persistent storage + atomic rate limit counters |
| Auth | JWT (HS256, 1h expiry) | Stateless session management |
| Key security | SHA-256 hashing | Raw API keys never stored |
| Testing | Jest + Supertest | 7 suites, 22 integration tests |

---

## Component Architecture

```              
┌───────────────────────────────────────────────────────────── ┐
│                     Browser (localhost:5173)                 │
│                                                              │
│  ┌──────────┐  ┌─────────────┐  ┌────────────────────────┐   │
│  │  Navbar  │  │ KeyManagement│  │  RateLimitPlayground  │   │
│  │  (auth)  │  │  (CRUD keys) │  │  (live telemetry)     │   │
│  └──────────┘  └─────────────┘  └────────────────────────┘   │
│         │              │                    │                │
│         └──────────────┴────────────────────┘                │
│                        │  fetch() + JWT / X-API-Key          │
└────────────────────────┼─────────────────────────────────────┘
                         │ HTTP (CORS + exposedHeaders)
┌────────────────────────▼─────────────────────────────────────┐
│                  Express Server (localhost:5000)             │
│                                                              │
│  POST /api/auth/register   → authController → authService    │
│  POST /api/auth/login      → authController → authService    │
│  GET  /api/me              → [authenticate] → req.user       │
│  POST /api/keys            → [authenticate] → apiKeyService  │
│  GET  /api/keys            → [authenticate] → apiKeyService  │
│  GET  /api/keys/:id/stats  → [authenticate] → apiKeyService  │
│  DELETE /api/keys/:id      → [authenticate] → apiKeyService  │
│  GET  /api/demo            → [apiKeyAuth] → [rateLimiter]    │
│  GET  /health              → 200 { status: "ok" }            │
└────────────────────────┬─────────────────────────────────────┘
                         │ pg (node-postgres)
┌────────────────────────▼─────────────────────────────────────┐
│                  PostgreSQL (Neon)                           │
│                                                              │
│  users              api_keys          rate_limit_windows     │
│  ─────────          ────────          ─────────────────────  │
│  id (uuid)          id (uuid)         api_key_id (uuid, FK)  │
│  email (unique)     user_id (FK)      window_start (ts)      │
│  password_hash      name              request_count (int)    │
│  created_at         key_hash          PRIMARY KEY            │
│                     plan              (api_key_id,           │
│                     requests_per_win   window_start)         │
│                     window_seconds                           │
│                     status                                   │
│                     created_at                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### `users`
```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `api_keys`
```sql
CREATE TABLE api_keys (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    key_hash            TEXT UNIQUE NOT NULL,
    plan                TEXT NOT NULL DEFAULT 'FREE',
    requests_per_window INTEGER NOT NULL DEFAULT 100,
    window_seconds      INTEGER NOT NULL DEFAULT 60,
    status              TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### `rate_limit_windows`
```sql
CREATE TABLE rate_limit_windows (
    api_key_id    UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    window_start  TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (api_key_id, window_start)
);
```

---

## Security Model

| Threat | Mitigation |
|---|---|
| Raw API key exposure | SHA-256 hash stored; raw key shown once only |
| Password brute-force | bcrypt hashing (cost factor 10) |
| JWT tampering | HS256 signed with `JWT_SECRET` env var |
| Cross-user key access | All queries filter by `user_id` from JWT `sub` claim |
| Rate limit race condition | PostgreSQL `ON CONFLICT DO UPDATE` is atomic |
| SQL injection | Parameterized queries throughout (no string concatenation) |
| CORS header leakage | `Access-Control-Expose-Headers` explicitly whitelists rate limit headers |

---

# Part 2: Design Document

## Rate Limiting Algorithm — Fixed Window

The Fixed Window algorithm divides time into discrete buckets (windows) of
`window_seconds` size. Each API key gets a fresh counter at the start of each bucket.

### Window Boundary Calculation
```
window_start = to_timestamp(floor(extract(epoch from NOW()) / window_seconds) * window_seconds)
```

**Example with `window_seconds = 60`:**
```
Request at 23:15:47 UTC
  → floor(epoch / 60) * 60
  → window_start = 23:15:00 UTC
  → counter incremented in that bucket
Request at 23:15:59 UTC  → same bucket (23:15:00), counter++
Request at 23:16:01 UTC  → new bucket (23:16:00), counter resets to 1
```

### Atomic Upsert (prevents race conditions)
```sql
INSERT INTO rate_limit_windows (api_key_id, window_start, request_count)
VALUES ($1, to_timestamp(floor(extract(epoch from NOW()) / $2) * $2), 1)
ON CONFLICT (api_key_id, window_start)
DO UPDATE SET request_count = rate_limit_windows.request_count + 1
RETURNING request_count, window_start;
```

This single statement handles both the "first request in window" and
"subsequent request in window" cases atomically. No `SELECT` + `UPDATE`
race condition is possible.

### RFC-Compliant Response Headers

| Header | Value | Meaning |
|---|---|---|
| `X-RateLimit-Limit` | `100` | Max requests allowed in window |
| `X-RateLimit-Remaining` | `73` | Requests left in current window |
| `X-RateLimit-Reset` | `1723751760` | Unix timestamp when window resets |
| `Retry-After` | `47` | Seconds until retry (on 429 only) |

---

## API Key Lifecycle

```
User creates key (POST /api/keys)
    ↓
Server generates: rg_live_<64 hex chars>
    ↓
SHA-256 hash stored in DB
    ↓
Raw key shown ONCE in KeySecretModal (copy-to-clipboard)
    ↓
Key used in X-API-Key header on /api/demo requests
    ↓
apiKeyAuth middleware: hashes incoming key, looks up hash in DB
    ↓
rateLimiter middleware: runs atomic upsert, checks quota
    ↓
User can revoke key (DELETE /api/keys/:id) → status = DISABLED
```

---

## Plan Tiers

| Plan | Requests per Window | Window Duration |
|---|---|---|
| FREE | 100 | 60 seconds |
| PRO | 1,000 | 60 seconds |

---

# Part 3: User Guide

## Prerequisites

- Node.js 20+
- PostgreSQL database (or Neon connection string)
- Git

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/AbinanthanS/Tactive_Assessment.git
cd Tactive_Assessment

# 2. Install server dependencies
cd server
npm install

# 3. Configure environment
# Create server/.env with:
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
JWT_SECRET=your-secret-key-here
PORT=5000

# 4. Run database migrations
npm run migrate   # or psql -f schema.sql

# 5. Start the server
npm run dev       # → http://localhost:5000

# 6. Install frontend dependencies
cd ../client
npm install

# 7. Start the frontend
npm run dev       # → http://localhost:5173
```

## Using the Dashboard

### Step 1 — Register / Login
1. Open `http://localhost:5173` in your browser
2. Click **"Get Started / Sign In"**
3. Choose the **Register** tab, enter email + password, click Register
4. You'll be automatically logged in and see the API Keys dashboard

### Step 2 — Create an API Key
1. Click **"+ Create New Key"** (top-right of the Keys tab)
2. Enter a name (e.g., "My Test App")
3. Choose **FREE** (100 req/60s) or **PRO** (1000 req/60s)
4. Click **Create Key**
5. ⚠️ The key secret (`rg_live_...`) is shown **once only** — copy it now!

### Step 3 — Test Rate Limiting in the Playground
1. Click the **"Live Playground"** tab in the navbar
2. Your key should be pre-selected from the dropdown, or paste the `rg_live_...` value
3. Use the trigger buttons:
   - **Single (1x)** — fires one request, watch the counter decrement
   - **Burst (5x)** — fires 5 concurrent requests
   - **Spam (15x)** — fires 15 rapid requests, likely to trigger 429
4. Watch the **Quota Meter** fill and the **Reset Countdown** tick
5. When you hit the limit, requests return `429 Too Many Requests` (shown in red in the console)
6. After the window resets (up to 60s), the quota restores automatically

### Step 4 — Revoke a Key
1. Go to the **API Keys** tab
2. Find the key in the table, click **Revoke**
3. Confirm the revocation — the key's status changes to DISABLED immediately
4. Any future requests with that key will return `401 Unauthorized`

## Running Tests

```bash
cd server
npm test
# → 7 test suites, 22 tests, all should pass
```
