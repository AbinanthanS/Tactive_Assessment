# RateGuard — Full Documentation Set

> **Tactive Assessment — Deliverable #4: Architecture, Design & User Guide**  
> **Project:** RateGuard — Multi-Tenant API Gateway & PostgreSQL Atomic Rate Limiter  
> **Author:** Abinanthan S  
> **Evaluation Reference:** Tactive Internship Hiring Assessment (Stages 1–4)

---

## AI Tools Used (Ground Rules Compliance)

In accordance with Section 4 (Ground Rules) of the assessment:

| AI Tool | Version / Engine | Purpose & Usage |
|---|---|---|
| **Antigravity (Google DeepMind)** | Gemini 2.5 / 3.7 | Full-stack scaffolding, PostgreSQL atomic query optimization, test generation, and autonomous change loop orchestration |
| **Claude (Anthropic)** | Claude 3.5 Sonnet | Architectural review, threat modeling, and error handling matrix design |
| **GitHub Copilot** | GPT-4o | In-editor autocompletion for React dashboard components and Jest test assertions |

---

# Part 1: Architecture Document

## 1. System Overview

**RateGuard** is a high-performance, multi-tenant API gateway and rate-limiting platform. It provides developers and platform engineers with:
1. **Secure API Key Management:** One-way salted hashing (SHA-256) of API secrets, multi-plan quota assignment (Free / Pro), and instant revocation.
2. **Atomic PostgreSQL Rate Limiting:** High-concurrency, fixed-window rate limiting executed directly within PostgreSQL using atomic `INSERT ... ON CONFLICT DO UPDATE` upserts — eliminating external cache synchronization overheads (no Redis or Memcached required).
3. **Interactive Developer Dashboard:** A React 19 + Vite single-page application featuring key creation modals (one-time secret display), quota management, and a live telemetry playground with real-time rate limit headers inspection.

---

## 2. Technology Choices & Justification ("Why")

| Layer | Technology | Justification & Why Chosen |
|---|---|---|
| **Frontend** | React 19 + Vite | • Sub-millisecond HMR for rapid frontend development.<br>• Minimal bundle overhead compared to full-stack SSR frameworks for a client-side API management console.<br>• Clean component hierarchy for real-time telemetry state. |
| **Backend** | Node.js 20 + Express 5 | • Asynchronous non-blocking I/O ideal for API gateway proxying.<br>• Express 5 provides native Promise-based middleware error handling without `asyncHandler` wrappers.<br>• Lightweight footprint with zero runtime compilation required. |
| **Database** | PostgreSQL (Neon Serverless) | • **Single source of truth:** Eliminates cache-invalidation bugs and race conditions between Redis and SQL DB.<br>• **ACID atomicity:** PostgreSQL's row-level locking during `ON CONFLICT DO UPDATE` guarantees counter accuracy under heavy concurrent bursts.<br>• Native indexing (`idx_rate_limit_windows_api_key`, `idx_api_keys_user_id`) ensures sub-10ms query execution. |
| **Authentication** | JWT (HS256) + bcrypt | • Stateless token authentication enables horizontal backend scaling.<br>• bcrypt (cost factor 10) ensures industry-standard password brute-force resistance. |
| **Key Security** | SHA-256 Hashing | • Raw API keys (`rg_live_...`) are generated with 256 bits of entropy and displayed **once**.<br>• Only SHA-256 hashes are stored in the database, preventing plaintext key compromise even in the event of a database breach. |
| **Test Automation** | Jest + Supertest | • Automated integration testing against actual HTTP endpoints and database transactions.<br>• In-band sequential execution (`--runInBand`) ensures zero cross-test database contention. |

---

## 3. Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Browser (localhost:5173)                         │
│                                                                         │
│  ┌──────────────────┐  ┌─────────────────────┐  ┌────────────────────┐  │
│  │   Navbar (Auth)  │  │    KeyManagement    │  │ RateLimitPlayground│  │
│  │   Register/Login │  │  Create / Revoke /  │  │ Live Burst & Spam  │  │
│  │   Session state  │  │  View Usage Stats   │  │ Telemetry Monitor  │  │
│  └─────────┬────────┘  └──────────┬──────────┘  └─────────┬──────────┘  │
└────────────┼──────────────────────┼───────────────────────┼─────────────┘
             │                      │                       │
             │ fetch() + JWT        │ fetch() + JWT         │ fetch() + X-API-Key
             ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Express API Gateway (localhost:5000)                 │
│                                                                         │
│  [CORS + Access-Control-Expose-Headers]                                 │
│                                                                         │
│  ┌───────────────────────┬──────────────────────┬────────────────────┐  │
│  │  Public Routes        │ Protected Key Routes │ Gateway Demo Route │  │
│  │  POST /api/auth/*     │ POST /api/keys       │ GET /api/demo      │  │
│  │  GET  /health         │ GET  /api/keys       │                    │  │
│  │                       │ GET  /api/keys/:id/st│                    │  │
│  │                       │ DELETE /api/keys/:id │                    │  │
│  └──────────┬────────────┴──────────┬───────────┴─────────┬──────────┘  │
│             │                       │                     │             │
│             ▼                       ▼                     ▼             │
│       authController         [authenticate]          [apiKeyAuth]       │
│             │                  (JWT Verify)          (SHA-256 Lookup)   │
│             │                       │                     │             │
│             ▼                       ▼                     ▼             │
│        authService            apiKeyService          [rateLimiter]      │
│             │                       │               (Atomic Upsert)     │
│             └───────────────────────┼─────────────────────┘             │
└─────────────────────────────────────┼───────────────────────────────────┘
                                      │ pg (node-postgres connection pool)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL Database (Neon)                        │
│                                                                         │
│  ┌──────────────────┐     ┌──────────────────┐     ┌─────────────────┐  │
│  │      users       │     │     api_keys     │     │rate_limit_window│  │
│  │ ──────────────── │ 1:N │ ──────────────── │ 1:N │ ─────────────── │  │
│  │ id (PK, UUID)    ├────►│ id (PK, UUID)    ├────►│ id (PK, UUID)   │  │
│  │ email (UNIQUE)   │     │ user_id (FK)     │     │ api_key_id (FK) │  │
│  │ password_hash    │     │ key_hash (UNIQUE)│     │ window_start    │  │
│  │ created_at       │     │ plan (FREE/PRO)  │     │ request_count   │  │
│  │                  │     │ requests_per_win │     │ UNIQUE(key,win) │  │
│  │                  │     │ window_seconds   │     │                 │  │
│  │                  │     │ status (ACTIVE)  │     │                 │  │
│  └──────────────────┘     └──────────────────┘     └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### High-Level Data Flow Diagram (Mermaid)

```mermaid
flowchart TB
    %% --- FRONTEND ---
    subgraph Frontend ["🌐 Client Application (React 19 + Vite)"]
        direction TB
        Nav["Navbar (Session & Auth State)"]
        KeyMgmt["KeyManagement (Create, List, Revoke Keys, View Stats)"]
        Playground["RateLimitPlayground (Single, Burst, Spam Telemetry)"]
    end

    %% --- NETWORK ---
    HTTP{{"HTTP Requests / CORS (Exposed Rate Limit Headers)"}}

    %% --- BACKEND ---
    subgraph Backend ["⚙️ Express 5 API Gateway Server"]
        direction TB
        
        %% Routes
        AuthRoutes["POST /api/auth/register<br>POST /api/auth/login<br>GET /api/me"]
        KeyRoutes["POST /api/keys<br>GET /api/keys<br>GET /api/keys/:id/stats<br>DELETE /api/keys/:id"]
        DemoRoute["GET /api/demo (Protected by API Key + Rate Limiter)"]
        HealthRoute["GET /health"]

        %% Middlewares
        AuthMW{"[authenticate]<br>Verify Bearer JWT"}
        KeyAuthMW{"[apiKeyAuth]<br>Hash & Verify X-API-Key"}
        RateLimitMW{"[rateLimiter]<br>Atomic Upsert & Quota Check"}

        %% Handlers & Services
        AuthService["authService / authController"]
        KeyService["apiKeyService / apiKeyController"]
        DemoService["Demo Controller (200 OK + Payload)"]
        HealthResponse["Health Check (200 OK)"]

        %% Routing Flow
        AuthRoutes --> AuthService
        KeyRoutes --> AuthMW --> KeyService
        DemoRoute --> KeyAuthMW --> RateLimitMW --> DemoService
        HealthRoute --> HealthResponse
    end

    %% --- DATABASE ---
    subgraph Database ["🗄️ PostgreSQL Database (Neon Serverless)"]
        direction LR
        UsersDB[("users<br>• id (PK)<br>• email (UQ)<br>• password_hash")]
        KeysDB[("api_keys<br>• id (PK)<br>• user_id (FK)<br>• key_hash (UQ)<br>• plan, limits, status")]
        RateDB[("rate_limit_windows<br>• id (PK)<br>• api_key_id (FK)<br>• window_start<br>• request_count<br>• UNIQUE(api_key_id, window_start)")]
    end

    %% --- WIRING ---
    Nav ==>|Bearer JWT| HTTP
    KeyMgmt ==>|Bearer JWT| HTTP
    Playground ==>|X-API-Key Header| HTTP

    HTTP --> AuthRoutes
    HTTP --> KeyRoutes
    HTTP --> DemoRoute
    HTTP --> HealthRoute

    AuthService -->|Query / Insert| UsersDB
    KeyService -->|CRUD Keys & Stats| KeysDB
    KeyService -.->|Aggregate Query| RateDB
    KeyAuthMW -->|SELECT WHERE key_hash| KeysDB
    RateLimitMW -->|Atomic Upsert & Counter Increment| RateDB

    %% Styling
    classDef client fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0f172a;
    classDef server fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#0f172a;
    classDef db fill:#fef08a,stroke:#ca8a04,stroke-width:2px,color:#0f172a;
    classDef network fill:#f3f4f6,stroke:#9ca3af,stroke-width:2px,color:#0f172a,stroke-dasharray: 5 5;

    class Frontend client;
    class Backend server;
    class Database db;
    class HTTP network;
```

---

## 4. End-to-End Data Flows

### A. Authentication & Session Flow
1. User submits email and password via dashboard.
2. `authController` queries PostgreSQL `users` table, verifies password with `bcrypt.compare`.
3. Server signs a JSON Web Token (HS256) containing `userId` and `role`.
4. Dashboard stores the token in memory/localStorage and attaches `Authorization: Bearer <token>` to subsequent management requests.

### B. API Key Creation & Storage Flow
1. Authenticated user requests a new API key with a selected plan tier (`FREE` or `PRO`).
2. Server generates a cryptographically secure random string with prefix: `rg_live_<64 hex characters>`.
3. Server computes SHA-256 hash of the key: `SHA256(raw_key)`.
4. Hash is inserted into `api_keys` with plan parameters (`requests_per_window`, `window_seconds`).
5. **Raw key is returned in the API response once** for the client modal. The database stores strictly the hash.

### C. Rate-Limited Request Gateway Flow
1. Client makes request to `/api/demo` with `X-API-Key: rg_live_...`.
2. `apiKeyAuth` middleware hashes the header value and retrieves the matching active record from `api_keys`.
3. `rateLimiter` middleware computes the current window timestamp:
   $$\text{window\_start} = \lfloor \text{epoch} / \text{window\_seconds} \rfloor \times \text{window\_seconds}$$
4. `rateLimitService.incrementWindow()` executes the atomic upsert.
5. If `request_count <= requests_per_window`:
   - Sets headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
   - Passes execution to downstream endpoint handler (`200 OK`).
6. If `request_count > requests_per_window`:
   - Sets `Retry-After: <seconds_until_reset>`.
   - Immediately terminates with `429 Too Many Requests`.

---

# Part 2: Design Document

## 1. Database Schema & Data Model

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. User accounts
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER'
        CHECK (role IN ('USER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. API keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    plan VARCHAR(20) NOT NULL
        CHECK (plan IN ('FREE', 'PRO')),
    requests_per_window INTEGER NOT NULL
        CHECK (requests_per_window > 0),
    window_seconds INTEGER NOT NULL
        CHECK (window_seconds > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'DISABLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Rate limit time windows
CREATE TABLE IF NOT EXISTS rate_limit_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0
        CHECK (request_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (api_key_id, window_start)
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_windows_api_key ON rate_limit_windows(api_key_id);
```

---

## 2. Rate Limiting Algorithm (Fixed Window Atomic Counter)

RateGuard implements the **Fixed Window Algorithm** with mathematical epoch alignment and PostgreSQL atomic locking.

### Mathematical Boundary Formula
For any given timestamp $T$ and window duration $W$ (in seconds):
$$\text{Window Start} = \lfloor \frac{T}{W} \rfloor \times W$$
$$\text{Window End} = \text{Window Start} + W$$
$$\text{Reset In (seconds)} = \text{Window End} - T$$

### Atomic Upsert Query
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

**Concurrency Guarantees:**
- If 100 concurrent requests arrive simultaneously in the same millisecond, PostgreSQL's row-level lock on the unique constraint `(api_key_id, window_start)` serializes the counter increments sequentially without dirty reads, lost updates, or deadlock risks.

---

## 3. Plan Tiers & Quota Configurations

| Plan Tier | Max Requests per Window | Window Duration | Target Workload |
|---|---|---|---|
| **FREE** | 100 requests | 60 seconds | Development, testing, low-volume integrations |
| **PRO** | 1,000 requests | 60 seconds | Production microservices, high-throughput pipelines |

---

## 4. API Interface Specification

### Public & Auth Endpoints

#### `POST /api/auth/register`
- **Request Body:** `{ "email": "dev@example.com", "password": "securepassword123" }`
- **Success (201):** `{ "message": "User registered successfully", "user": { "id": "...", "email": "dev@example.com" } }`
- **Failure (400 / 409):** `{ "error": "Email already in use" }`

#### `POST /api/auth/login`
- **Request Body:** `{ "email": "dev@example.com", "password": "securepassword123" }`
- **Success (200):** `{ "token": "jwt.token.here", "user": { "id": "...", "email": "dev@example.com" } }`
- **Failure (401):** `{ "error": "Invalid email or password" }`

#### `GET /api/me`
- **Headers:** `Authorization: Bearer <token>`
- **Success (200):** `{ "user": { "id": "...", "email": "dev@example.com", "role": "USER" } }`

---

### Key Management Endpoints (JWT Authenticated)

#### `POST /api/keys`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** `{ "name": "Payment Service", "plan": "FREE" }`
- **Success (201):**
  ```json
  {
    "message": "API key generated successfully",
    "key": {
      "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
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
- **Headers:** `Authorization: Bearer <token>`
- **Success (200):** Array of all API keys owned by requesting user (excluding raw keys and key hashes).

#### `GET /api/keys/:id/stats` *(AI Change Loop Feature)*
- **Headers:** `Authorization: Bearer <token>`
- **Success (200):**
  ```json
  {
    "key": {
      "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "name": "Payment Service",
      "plan": "FREE",
      "requestsPerWindow": 100,
      "windowSeconds": 60,
      "status": "ACTIVE"
    },
    "stats": {
      "totalRequests": 142,
      "totalWindows": 3,
      "peakRequestsInWindow": 100,
      "firstSeen": "2026-08-15T23:10:00.000Z",
      "lastSeen": "2026-08-15T23:12:00.000Z"
    },
    "recentWindows": [
      { "window_start": "2026-08-15T23:12:00.000Z", "request_count": 42, "window_limit": 100 },
      { "window_start": "2026-08-15T23:11:00.000Z", "request_count": 100, "window_limit": 100 }
    ]
  }
  ```

#### `DELETE /api/keys/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Success (200):** `{ "message": "API key revoked successfully", "key": { "id": "...", "status": "DISABLED" } }`

---

### Rate-Limited Demo Gateway Endpoint

#### `GET /api/demo`
- **Headers:** `X-API-Key: rg_live_...`
- **Success (200 OK):**
  - **Headers:**
    - `X-RateLimit-Limit: 100`
    - `X-RateLimit-Remaining: 99`
    - `X-RateLimit-Reset: 1723751760`
  - **Body:**
    ```json
    {
      "message": "API request successful",
      "apiKey": { "id": "...", "name": "Payment Service", "plan": "FREE" },
      "rateLimit": { "remaining": 99, "resetTimestamp": 1723751760 }
    }
    ```
- **Rate Limit Exceeded (429 Too Many Requests):**
  - **Headers:**
    - `X-RateLimit-Limit: 100`
    - `X-RateLimit-Remaining: 0`
    - `X-RateLimit-Reset: 1723751760`
    - `Retry-After: 48`
  - **Body:**
    ```json
    {
      "error": "Too Many Requests",
      "message": "Rate limit exceeded. Please retry in 48 seconds.",
      "retryAfterSeconds": 48
    }
    ```

---

## 5. Comprehensive Error Handling Matrix

| HTTP Status | Condition / Scenario | JSON Error Response Body | Exposed Headers |
|---|---|---|---|
| `400 Bad Request` | Missing required fields (e.g. invalid plan or empty body) | `{"error": "Name and valid plan (FREE or PRO) are required"}` | `Content-Type` |
| `401 Unauthorized` | Missing, malformed, or expired JWT Bearer token | `{"error": "Access token is missing or invalid"}` | `Content-Type` |
| `401 Unauthorized` | Missing, invalid, or revoked `X-API-Key` | `{"error": "Invalid or revoked API key"}` | `Content-Type` |
| `404 Not Found` | Key ID does not exist or belongs to another user | `{"error": "API key not found"}` | `Content-Type` |
| `409 Conflict` | Attempting to register with an already existing email | `{"error": "User with this email already exists"}` | `Content-Type` |
| `429 Too Many Requests` | Request count exceeds plan limit within active window | `{"error": "Too Many Requests", "message": "...", "retryAfterSeconds": N}` | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` |
| `500 Internal Server Error` | Database connection error or unhandled exception | `{"error": "Internal server error"}` | `Content-Type` |

---

# Part 3: User Guide

## 1. Quick Start Guide for Developers

### Prerequisites
- **Node.js:** v20.x or higher
- **PostgreSQL:** Neon Serverless or local PostgreSQL instance (v14+)
- **Git**

### Installation & Execution

```bash
# 1. Clone repository
git clone https://github.com/AbinanthanS/Tactive_Assessment.git
cd Tactive_Assessment

# 2. Configure Backend Environment
cd server
cp .env.example .env
# Edit .env with your PostgreSQL credentials:
# DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
# JWT_SECRET=your_jwt_secret_key_here
# PORT=5000

# 3. Install dependencies & initialize DB
npm install
# Initialize schema:
psql $DATABASE_URL -f src/config/schema.sql

# 4. Start backend server
npm run dev
# Server running at http://localhost:5000

# 5. Start frontend dashboard (in a separate terminal)
cd ../client
npm install
npm run dev
# Frontend running at http://localhost:5173
```

---

## 2. Non-Technical Walkthrough (Step-by-Step)

### Step 1: Create an Account & Sign In
1. Open your browser and navigate to `http://localhost:5173`.
2. Click **"Get Started / Sign In"** on the hero banner.
3. Select the **Register** tab.
4. Enter your email (e.g. `jane@company.com`) and a secure password.
5. Click **Register**. You are automatically signed in and redirected to your workspace.

---

### Step 2: Generate an API Key
1. In the **API Keys** management tab, click the **"+ Create New Key"** button.
2. In the modal:
   - **Key Name:** Enter an identifier (e.g., `Stripe Webhook Service`).
   - **Plan Tier:** Select **FREE** (100 req/min) or **PRO** (1,000 req/min).
3. Click **Generate Key**.
4. **Important Security Notice:** A popup will show your secret key (starting with `rg_live_...`).
5. Click **"Copy to Clipboard"** and save it securely. The system hashes this key immediately and will never display it again.

---

### Step 3: Test Rate Limiting in the Live Playground
1. Click the **"Live Playground"** tab in the top navigation bar.
2. Select your newly created key from the dropdown menu (or paste your raw key).
3. Test the rate limiting engine using the three action triggers:
   - **Single Request (1x):** Fires a single request. Observe the remaining quota decrement by 1 and the live response payload.
   - **Burst (5x):** Sends 5 concurrent requests simultaneously. Watch the gauge update smoothly.
   - **Spam (15x):** Sends 15 rapid-fire requests.
4. **Hit the limit:** Continue pressing Burst/Spam until remaining requests hit `0`.
5. **Observe 429 Status:** The console immediately flags `429 Too Many Requests` in red, displaying the exact `Retry-After` countdown seconds.
6. Once the 60-second window expires, the counter automatically resets back to full capacity.

---

### Step 4: Inspect Key Usage Statistics
1. Return to the **API Keys** tab.
2. Click the **"Stats"** icon next to your key.
3. Review key metrics:
   - **Total Lifetime Requests**
   - **Peak Requests in a Single Window**
   - **Active Window History breakdown**

---

### Step 5: Revoke an API Key
1. In the **API Keys** table, locate the key you wish to decommission.
2. Click the **"Revoke"** button.
3. Confirm revocation. The status changes immediately to `DISABLED`.
4. Any requests sent using this key will now be blocked with `401 Unauthorized`.
