# RateGuard — Architecture, Design & User Guide

> **Project:** RateGuard — Multi-Tenant API Gateway & PostgreSQL Rate Limiter  
> **Author:** Abinanthan S &bull; [GitHub Repository](https://github.com/AbinanthanS/Tactive_Assessment)

---

## 🛠️ AI Tools Compliance (Ground Rules)

| AI Tool | Version / Engine | Role & Scope |
|---|---|---|
| **Antigravity (Google DeepMind)** | Gemini 2.5 / 3.7 | Architecture scaffolding, PostgreSQL atomic queries, automated tests, and AI change loop |
| **Claude (Anthropic)** | Claude 3.5 Sonnet | Threat modeling, RFC compliance review, and error matrix design |
| **GitHub Copilot** | GPT-4o | In-editor autocompletion and Jest test assertion drafting |

---

# Part 1: Architecture

## 1. System Overview

RateGuard is a multi-tenant API gateway and rate-limiting system designed around three core tenets:
1. **In-Database Atomic Rate Limiting:** Enforces concurrency-safe, fixed-window rate limiting directly inside PostgreSQL via atomic upserts (`INSERT ... ON CONFLICT DO UPDATE`), eliminating external cache synchronization (no Redis/Memcached required).
2. **Cryptographic Key Management:** Generates 256-bit API keys (`rg_live_...`), exposes secrets once at creation time, and stores only SHA-256 hashes to prevent plaintext credential exposure.
3. **Interactive Developer Console:** React 19 single-page application providing key lifecycle management, real-time rate limit telemetry, and an interactive traffic burst playground.

---

## 2. Technology Rationale

| Layer | Technology | Decision Rationale |
|---|---|---|
| **Frontend** | React 19 + Vite | Rapid HMR, minimal bundle overhead, and clean component state for real-time telemetry gauges. |
| **Backend** | Node.js 20 + Express 5 | Non-blocking asynchronous I/O with native Promise-based middleware error handling. |
| **Database** | PostgreSQL (Neon Serverless) | ACID atomicity via row-level locking on conflict targets guarantees counter integrity without distributed cache race conditions. |
| **Authentication** | JWT (HS256) + bcrypt | Stateless token verification for API calls; industry-standard bcrypt hashing for user credentials. |
| **Security** | SHA-256 Key Hashing | Raw keys displayed once; one-way cryptographic hashing protects stored credentials against DB breach exposure. |
| **Testing** | Jest + Supertest | Integration testing against live PostgreSQL instances using isolated test namespaces. |

---

## 3. Architecture & Component Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Browser (localhost:5173)                         │
│  ┌──────────────────┐  ┌─────────────────────┐  ┌────────────────────┐  │
│  │   Navbar (Auth)  │  │    KeyManagement    │  │ RateLimitPlayground│  │
│  │   JWT session    │  │  Create/Revoke/Stats│  │ 1x/5x/15x Bursts   │  │
│  └─────────┬────────┘  └──────────┬──────────┘  └─────────┬──────────┘  │
└────────────┼──────────────────────┼───────────────────────┼─────────────┘
             │                      │                       │
             │ Authorization: Bearer <JWT>                  │ X-API-Key: rg_live_...
             ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Express API Gateway (localhost:5000)                 │
│                                                                         │
│  [ Public Auth Routes ]      [ Protected Key Routes ]  [ Gateway Route ]│
│  POST /api/auth/register     POST /api/keys            GET /api/demo    │
│  POST /api/auth/login        GET  /api/keys                   │         │
│  GET  /api/me                GET  /api/keys/:id/stats         │         │
│         │                    DELETE /api/keys/:id             │         │
│         ▼                             │                       ▼         │
│  authController                 [authenticate]          [apiKeyAuth]    │
│         │                        (JWT Verify)         (SHA-256 Lookup)  │
│         ▼                             │                       ▼         │
│    authService                   apiKeyService          [rateLimiter]   │
│         │                             │                (Atomic Upsert)  │
└─────────┼─────────────────────────────┼───────────────────────┼─────────┘
          │                             │                       │
          └─────────────────────────────┼───────────────────────┘
                                        ▼ (node-postgres connection pool)
┌─────────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL Database (Neon)                        │
│                                                                         │
│  ┌──────────────────┐     ┌──────────────────┐     ┌─────────────────┐  │
│  │      users       │ 1:N │     api_keys     │ 1:N │rate_limit_window│  │
│  │ • id (UUID PK)   ├────►│ • id (UUID PK)   ├────►│ • id (UUID PK)  │  │
│  │ • email (UNIQUE) │     │ • user_id (FK)   │     │ • api_key_id(FK)│  │
│  │ • password_hash  │     │ • key_hash (UQ)  │     │ • window_start  │  │
│  └──────────────────┘     │ • plan (FREE/PRO)│     │ • request_count │  │
│                           │ • status (ACTIVE)│     │ • UNIQUE(key,win│  │
│                           └──────────────────┘     └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. End-to-End Execution Flows

### A. Authentication
1. Client submits email/password to `/api/auth/login`.
2. Backend queries `users`, validates hash with `bcrypt.compare`.
3. Signs JWT containing `userId` and `role`.
4. Client attaches `Authorization: Bearer <token>` on management calls.

### B. API Key Provisioning
1. Authenticated user requests a key with a specified plan (`FREE` or `PRO`).
2. Server generates a cryptographically random token: `rg_live_<64 hex chars>`.
3. Computes `SHA-256(raw_key)` and stores record in `api_keys`.
4. **Returns raw key exactly once** to the client. Plaintext key is discarded from memory.

### C. Rate-Limited Gateway Execution
1. Client requests `/api/demo` with `X-API-Key: rg_live_...`.
2. `apiKeyAuth` hashes header value and looks up active key in `api_keys`.
3. `rateLimiter` computes epoch-aligned window start:
   $$\text{window\_start} = \lfloor \text{epoch} / \text{window\_seconds} \rfloor \times \text{window\_seconds}$$
4. Executes atomic PostgreSQL upsert on `rate_limit_windows`.
5. **Within Quota:** Injects `X-RateLimit-*` headers and returns `200 OK`.
6. **Exceeded Quota:** Injects `Retry-After: <seconds>` and halts with `429 Too Many Requests`.

---

# Part 2: Design

## 1. Database Schema

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('FREE', 'PRO')),
    requests_per_window INTEGER NOT NULL CHECK (requests_per_window > 0),
    window_seconds INTEGER NOT NULL CHECK (window_seconds > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Rate Limit Windows
CREATE TABLE IF NOT EXISTS rate_limit_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (api_key_id, window_start)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_windows_api_key ON rate_limit_windows(api_key_id);
```

---

## 2. Rate Limiting Algorithm & Concurrency

### Mathematical Window Alignment
For request time $T$ and window duration $W$ (60s):
- **Window Start:** $T_{\text{start}} = \lfloor \frac{T}{W} \rfloor \times W$
- **Window End:** $T_{\text{end}} = T_{\text{start}} + W$
- **Retry-After / Reset:** $T_{\text{reset}} = T_{\text{end}} - T$

### Atomic SQL Increment
```sql
INSERT INTO rate_limit_windows (api_key_id, window_start, request_count)
VALUES (
    $1,
    to_timestamp(floor(extract(epoch from NOW()) / $2) * $2),
    1
)
ON CONFLICT (api_key_id, window_start)
DO UPDATE SET request_count = rate_limit_windows.request_count + 1
RETURNING request_count, window_start;
```

**Concurrency Guarantee:** Under high concurrency, PostgreSQL acquires a row-level lock on the unique conflict target `(api_key_id, window_start)`, ensuring atomic increments without dirty reads or counter drift.

---

## 3. Plan Configurations

| Plan | Limit | Window | Purpose |
|---|---|---|---|
| **FREE** | 100 requests | 60 seconds | Development, prototyping, light integrations |
| **PRO** | 1,000 requests | 60 seconds | High-throughput production workloads |

---

## 4. API Interface Specification

### Public Endpoints

#### `POST /api/auth/register`
- **Body:** `{ "email": "dev@example.com", "password": "password123" }`
- **Response (201):** `{ "message": "User registered successfully", "user": { "id": "...", "email": "dev@example.com" } }`

#### `POST /api/auth/login`
- **Body:** `{ "email": "dev@example.com", "password": "password123" }`
- **Response (200):** `{ "token": "<jwt>", "user": { "id": "...", "email": "dev@example.com" } }`

#### `GET /api/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):** `{ "user": { "id": "...", "email": "dev@example.com", "role": "USER" } }`

---

### Protected Key Endpoints (JWT Required)

#### `POST /api/keys`
- **Body:** `{ "name": "Payment Service", "plan": "FREE" }`
- **Response (201):**
  ```json
  {
    "message": "API key generated successfully",
    "key": {
      "id": "uuid",
      "name": "Payment Service",
      "plan": "FREE",
      "requestsPerWindow": 100,
      "windowSeconds": 60,
      "status": "ACTIVE"
    },
    "rawKey": "rg_live_f893a741c88d8b49e1..."
  }
  ```

#### `GET /api/keys`
- **Response (200):** Array of API keys owned by user (secrets omitted).

#### `GET /api/keys/:id/stats`
- **Response (200):**
  ```json
  {
    "key": { "id": "uuid", "name": "Payment Service", "plan": "FREE", "status": "ACTIVE" },
    "stats": {
      "totalRequests": 142,
      "totalWindows": 3,
      "peakRequestsInWindow": 100,
      "firstSeen": "2026-08-15T23:10:00.000Z",
      "lastSeen": "2026-08-15T23:12:00.000Z"
    },
    "recentWindows": [
      { "window_start": "2026-08-15T23:12:00.000Z", "request_count": 42, "window_limit": 100 }
    ]
  }
  ```

#### `DELETE /api/keys/:id`
- **Response (200):** `{ "message": "API key revoked successfully", "key": { "id": "...", "status": "DISABLED" } }`

---

### Protected Gateway Route (`X-API-Key` Required)

#### `GET /api/demo`
- **Header:** `X-API-Key: rg_live_...`
- **Success (200 OK):**
  - **Headers:** `X-RateLimit-Limit: 100`, `X-RateLimit-Remaining: 99`, `X-RateLimit-Reset: 1723751760`
  - **Body:** `{ "message": "API request successful", "rateLimit": { "remaining": 99, "resetTimestamp": 1723751760 } }`
- **Limit Exceeded (429 Too Many Requests):**
  - **Headers:** `X-RateLimit-Limit: 100`, `X-RateLimit-Remaining: 0`, `Retry-After: 48`
  - **Body:** `{ "error": "Too Many Requests", "message": "Rate limit exceeded. Please retry in 48 seconds.", "retryAfterSeconds": 48 }`

---

## 5. RFC 6585 Rate Limit Headers

| Header | Type | Description |
|---|---|---|
| `X-RateLimit-Limit` | Integer | Quota cap for the active window (e.g. `100`). |
| `X-RateLimit-Remaining` | Integer | Number of requests remaining in current window. |
| `X-RateLimit-Reset` | Integer (Epoch) | Unix timestamp when the current window expires. |
| `Retry-After` | Integer (Seconds) | Present on `429` responses; seconds until quota reset. |

---

## 6. Error Handling Matrix

| Status | Condition | Response Payload |
|---|---|---|
| `400 Bad Request` | Missing or invalid payload params | `{"error": "Name and valid plan (FREE or PRO) are required"}` |
| `401 Unauthorized` | Missing/invalid JWT or API Key | `{"error": "Invalid or revoked API key"}` |
| `404 Not Found` | Key ID not found or unauthorized tenant | `{"error": "API key not found"}` |
| `409 Conflict` | Email already registered | `{"error": "User with this email already exists"}` |
| `429 Too Many Requests`| Window quota depleted | `{"error": "Too Many Requests", "retryAfterSeconds": 48}` |
| `500 Internal Error` | Database connection failure | `{"error": "Internal server error"}` |

---

# Part 3: User Guide & Walkthrough

## 1. Setup & Execution

### Prerequisites
- Node.js v20+ & PostgreSQL (Neon or local v14+)

```bash
# 1. Setup Backend
cd server
npm install
cp .env.example .env
# Configure DATABASE_URL and JWT_SECRET in .env
psql $DATABASE_URL -f src/config/schema.sql
npm run dev

# 2. Setup Frontend (in separate terminal)
cd ../client
npm install
npm run dev
```

---

## 2. Dashboard Walkthrough

1. **Authentication:** Open `http://localhost:5173`, click **Register**, and create an account.
2. **Generate API Key:** In **API Keys** tab, click **+ Create New Key**, pick a plan (`FREE` or `PRO`), and copy the raw key (`rg_live_...`).
3. **Live Testing:** In **Live Playground**, select your key and trigger **Single (1x)**, **Burst (5x)**, or **Spam (15x)** requests.
4. **Inspect Quota & 429:** Watch remaining requests decrement in real-time. Once depleted, the console highlights the `429 Too Many Requests` response with the `Retry-After` countdown.
5. **View Telemetry:** Click **Stats** on any key to inspect lifetime request counts, peak traffic windows, and historical usage.
6. **Revoke Key:** Click **Revoke** to immediately disable a key. Subsequent calls return `401 Unauthorized`.
