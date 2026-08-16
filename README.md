# RateGuard — API Rate Limiter

> **Multi-tenant API Gateway & Atomic PostgreSQL Rate Limiting**  
> **Author:** Abinanthan S &bull; [GitHub Repository](https://github.com/AbinanthanS/Tactive_Assessment)

---

## ⚡ Highlights

- **Atomic Fixed-Window Rate Limiting:** Enforced entirely within PostgreSQL via atomic upserts (`INSERT ... ON CONFLICT DO UPDATE`), eliminating external caching layers like Redis while guaranteeing zero race conditions.
- **Cryptographic Key Management:** API keys (`rg_live_...`) generated with 256-bit entropy, displayed once, and stored exclusively as SHA-256 hashes.
- **RFC 6585 Compliance:** Returns standard rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`).
- **Real-Time Telemetry Dashboard:** React 19 SPA featuring key management, live usage analytics, and an interactive test playground (1x, 5x, 15x request bursts).
- **Comprehensive Test Suite:** 7 integration test suites with 22 automated tests covering normal paths, edge cases, and failure modes.

---

## 🛠️ Tech Stack & AI Ground Rules Compliance

| Layer | Technology | Key Responsibility |
|---|---|---|
| **Frontend** | React 19, Vite, TailwindCSS / CSS | Dashboard, key management UI, real-time telemetry |
| **Backend** | Node.js 20, Express 5 | API gateway routing, JWT auth, middleware pipeline |
| **Database** | PostgreSQL (Neon Serverless) | Atomic rate limit windows, users, and API key hashes |
| **Testing** | Jest, Supertest | End-to-end integration and concurrency testing |

### AI Tools Utilized
- **Antigravity (Google DeepMind / Gemini):** Full-stack scaffolding, PostgreSQL atomic query optimization, test suite generation, and change loop orchestration.
- **Claude 3.5 Sonnet (Anthropic):** Architectural review, threat modeling, and error handling design.
- **GitHub Copilot (OpenAI / GPT-4o):** In-editor autocompletion and test assertion drafting.

---

## 🏗️ Architecture

```
[ React 19 Frontend (Port 5173) ]
  ├── Navbar (Auth & Session State)
  ├── KeyManagement (CRUD Keys & Usage Stats)
  └── RateLimitPlayground (Live Bursts & Telemetry)
             │
             │ HTTP (Authorization: Bearer <JWT> | X-API-Key: rg_live_...)
             ▼
[ Express 5 API Gateway (Port 5000) ]
  ├── /api/auth/*    ──► [authController]    ──► (users)
  ├── /api/keys/*    ──► [authenticate MW]   ──► [apiKeyService] ──► (api_keys)
  └── /api/demo      ──► [apiKeyAuth MW]     ──► [rateLimiter MW] ──► (rate_limit_windows)
             │
             │ node-postgres (Connection Pool)
             ▼
[ PostgreSQL Database ]
  ├── users                (id, email, password_hash, role)
  ├── api_keys             (id, user_id, name, key_hash, plan, status)
  └── rate_limit_windows   (api_key_id, window_start, request_count) [UNIQUE constraint]
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js:** v20+
- **PostgreSQL:** Neon Serverless or local instance (v14+)
- **Git**

### 1. Clone & Configure Server

```bash
git clone https://github.com/AbinanthanS/Tactive_Assessment.git
cd Tactive_Assessment/server
npm install
cp .env.example .env
```

Update `server/.env`:
```env
PORT=5000
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=your_jwt_secret_key
```

Apply database schema:
```bash
psql $DATABASE_URL -f src/config/schema.sql
```

Start the backend:
```bash
npm run dev
# Running at http://localhost:5000
```

### 2. Configure & Start Client

In a separate terminal:
```bash
cd Tactive_Assessment/client
npm install
npm run dev
# Running at http://localhost:5173
```

---

## 📡 API Overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create new user account |
| `POST` | `/api/auth/login` | Public | Authenticate user & get JWT |
| `GET` | `/api/me` | Bearer JWT | Retrieve current user profile |
| `POST` | `/api/keys` | Bearer JWT | Generate new API key (`FREE` or `PRO`) |
| `GET` | `/api/keys` | Bearer JWT | List all keys for active user |
| `GET` | `/api/keys/:id/stats` | Bearer JWT | Key telemetry, lifetime requests & recent windows |
| `DELETE` | `/api/keys/:id` | Bearer JWT | Revoke an API key |
| `GET` | `/api/demo` | `X-API-Key` | Rate-limited gateway endpoint |
| `GET` | `/health` | Public | Service health check |

---

## 🧪 Testing & Verification

Run the automated integration test suite:

```bash
cd server
npm test
```

```
PASS tests/rateLimiter.test.js
PASS tests/rateLimitService.test.js
PASS tests/apiKeyAuth.test.js
PASS tests/auth.test.js
PASS tests/apiKeyRoutes.test.js
PASS tests/authMiddleware.test.js
PASS tests/health.test.js

Test Suites: 7 passed, 7 total
Tests:       22 passed, 22 total
```

> **Deliberate Red Run:** A intentional failure test run was executed to verify the test harness catches real issues. Full logs and screenshots are in [`docs/Test_evidence.md`](docs/Test_evidence.md).

---

## 🔄 AI Change Loop (Stage 3)

The `GET /api/keys/:id/stats` endpoint was developed through an autonomous 4-step AI iteration loop:
1. **Attempt 1:** Initial service/controller generated; identified SQL string serialization and null aggregations.
2. **Attempt 2:** Added `::int` casting and `COALESCE(..., 0)`; detected cross-tenant data vulnerability.
3. **Attempt 3:** Injected user ownership validation returning `404 Not Found`.
4. **Attempt 4:** Fixed route order precedence and verified 100% pass across all 22 tests.

Detailed prompt logs and diffs are in [`docs/AI_change_loop.md`](docs/AI_change_loop.md).


