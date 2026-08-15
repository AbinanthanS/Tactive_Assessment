# RateGuard — Multi-Tenant API Gateway & PostgreSQL Rate Limiter

> **Internship Hiring Assessment — Tactive**  
> **Author:** Abinanthan S  
> **Repository:** [https://github.com/AbinanthanS/Tactive_Assessment](https://github.com/AbinanthanS/Tactive_Assessment)

---

## 📋 Assessment Deliverables Index

All deliverables mandated by the assessment specification are fully documented and organized in the repository:

| # | Deliverable | Format | Location in Repository |
|---|---|---|---|
| **1** | **Source Code Repository (App + Tests) & README** | Git Repo | [Root Directory](file:///) (Frontend in `/client`, Backend in `/server`) |
| **2** | **Test Suite & Captured Run Output (Green + Red Run)** | Markdown + Logs + Screenshots | [`docs/Test_evidence.md`](file:///docs/Test_evidence.md) |
| **3** | **AI Change-Loop Evidence Log (Prompts, Failures, Fixes)** | Markdown | [`docs/AI_change_loop.md`](file:///docs/AI_change_loop.md) |
| **4** | **Architecture, Design & User Guide Documents** | Markdown | [`docs/Documentation.md`](file:///docs/Documentation.md) |
| **5** | **Presentation Deck (Slide-by-Slide Outline)** | Markdown / Slide Deck | [`docs/Presentation_deck.md`](file:///docs/Presentation_deck.md) |
| **6** | **Video Demonstration Guide (5-Minute Script & Storyboard)** | Markdown / Video Guide | [`docs/Video_demo_guide.md`](file:///docs/Video_demo_guide.md) |

---

## 🛠️ AI Tools Used (Ground Rules Compliance)

In accordance with Section 4 of the assessment guidelines:

- **Antigravity (Google DeepMind / Gemini 2.5 & 3.7):** Primary AI agent for project scaffolding, PostgreSQL atomic query optimization, test generation, and autonomous change loop orchestration.
- **Claude 3.5 Sonnet (Anthropic):** Architectural review, threat modeling, and error handling matrix design.
- **GitHub Copilot (OpenAI / GPT-4o):** Code completion and test assertion drafting.

---

## 🌟 System Overview & Scenario Selection

**RateGuard** is a production-grade, multi-tenant API gateway and rate-limiting platform. It demonstrates how to achieve **high-concurrency atomic fixed-window rate limiting directly inside PostgreSQL** using atomic upserts (`INSERT ... ON CONFLICT DO UPDATE`), eliminating external caching layers (no Redis or Memcached).

### Core Features
- 🔑 **Cryptographic API Key Management:** Raw keys (`rg_live_...`) generated with 256 bits of entropy, displayed once, and stored exclusively as SHA-256 hashes.
- ⚡ **Atomic Rate Limiter Middleware:** Concurrency-safe window increment and quota enforcement with sub-10ms latency.
- 📜 **RFC 6585 Compliance:** Standard rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`).
- 📊 **Real-Time Telemetry Dashboard:** React 19 SPA featuring a live interactive playground with Single (1x), Burst (5x), and Spam (15x) triggers, quota meters, and reset countdowns.
- 📈 **Key Usage Analytics (AI Change Loop):** `GET /api/keys/:id/stats` endpoint returning lifetime requests, peak window traffic, and historical window telemetry.

---

## 🏗️ Architecture & Data Flow

```
[ Browser: React 19 + Vite (localhost:5173) ]
  ├── Navbar (JWT Auth State)
  ├── KeyManagement (CRUD API Keys & Stats)
  └── RateLimitPlayground (Live Telemetry & Gauge)
             │
             │ HTTP + Authorization: Bearer <JWT> OR X-API-Key: rg_live_...
             ▼
[ API Gateway: Express 5 / Node.js 20 (localhost:5000) ]
  ├── /api/auth/*     → [authController]     → (users table)
  ├── /api/keys/*     → [authenticate MW]    → [apiKeyService] → (api_keys table)
  └── /api/demo       → [apiKeyAuth MW]      → [rateLimiter MW] → (rate_limit_windows table)
             │
             │ node-postgres (Connection Pool)
             ▼
[ Database: PostgreSQL (Neon Serverless) ]
  ├── users (id, email, password_hash, role)
  ├── api_keys (id, user_id, name, key_hash, plan, requests_per_window, status)
  └── rate_limit_windows (api_key_id, window_start, request_count) [UNIQUE constraint]
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js:** v20.x or higher
- **PostgreSQL Database:** Neon Serverless connection string or local PostgreSQL (v14+)
- **Git**

---

### Step 1: Clone Repository
```bash
git clone https://github.com/AbinanthanS/Tactive_Assessment.git
cd Tactive_Assessment
```

---

### Step 2: Setup & Start Backend Server
```bash
cd server
npm install

# Configure environment variables (.env)
cp .env.example .env
```

Ensure `server/.env` contains your database connection string and JWT secret:
```env
PORT=5000
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
JWT_SECRET=your_super_secret_jwt_key_here
```

Initialize the database schema:
```bash
# Apply schema to PostgreSQL:
psql $DATABASE_URL -f src/config/schema.sql
```

Start the backend server:
```bash
npm run dev
# Server running at http://localhost:5000
```

---

### Step 3: Setup & Start Frontend Dashboard
Open a new terminal window:
```bash
cd client
npm install
npm run dev
# Frontend running at http://localhost:5173
```

Open `http://localhost:5173` in your browser to access the RateGuard Dashboard.

---

## 🧪 Running Automated Tests

RateGuard includes **7 comprehensive integration test suites with 22 tests** covering normal execution paths, concurrency edge cases, and invalid input rejections.

```bash
cd server
npm test
```

### Expected Output
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
Snapshots:   0 total
Time:        33.801 s
```

> 🔴 **Deliberate Red Run:** See [`docs/Test_evidence.md`](file:///docs/Test_evidence.md#4--red-run--deliberate-failure-demonstration) for full logs and screenshots of the intentional red run failure and subsequent recovery.

---

## 🔄 The AI Change Loop (Stage 3)

The AI change loop was executed to introduce the `GET /api/keys/:id/stats` endpoint:
- **Attempt 1:** Generated initial service and controller; discovered SQL `numeric` string serialization issues and null aggregations on unused keys.
- **Attempt 2:** Injected `::int` casts and `COALESCE(..., 0)` defaults; detected cross-tenant authorization vulnerability.
- **Attempt 3:** Injected user ownership verification returning `404 Not Found`.
- **Attempt 4:** Resolved Express router precedence and verified full 22/22 green test run.

For the full prompt logs, diffs, and diagnostics, see [`docs/AI_change_loop.md`](file:///docs/AI_change_loop.md).

---

## 📚 Complete Documentation Set

- 📖 [Full Architecture, Design & User Guide](file:///docs/Documentation.md)
- 🧪 [Test Automation & Red Run Evidence](file:///docs/Test_evidence.md)
- 🔄 [AI Change Loop Evidence Log](file:///docs/AI_change_loop.md)
- 📊 [Presentation Deck](file:///docs/Presentation_deck.md)
- 🎥 [Video Presentation & Demo Guide](file:///docs/Video_demo_guide.md)
