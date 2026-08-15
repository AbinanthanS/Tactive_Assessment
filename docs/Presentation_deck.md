# RateGuard — Presentation Deck

> **Tactive Assessment — Deliverable #5: Presentation Deck**  
> **Project:** RateGuard — AI-Powered Multi-Tenant API Gateway & PostgreSQL Rate Limiter  
> **Presenter:** Abinanthan S  
> **Format:** Slide Outline / Presentation Deck

---

## Slide 1: Title Slide
### **RateGuard: AI-Powered Multi-Tenant API Gateway & PostgreSQL Rate Limiter**
- **Subtitle:** Production-Grade Atomic Rate Limiting Without Redis Overhead
- **Assessment:** Tactive AI-Powered QA Automation, Documentation & Software Engineering Assessment
- **Author:** Abinanthan S
- **Stack:** React 19 + Node.js 20 / Express 5 + PostgreSQL (Neon) + Jest

---

## Slide 2: Problem Statement & Context
### **The Challenge of API Rate Limiting**
- **Distributed API Abuse:** APIs without rate limiting face DDoS risks, noisy neighbor starvation, and credential stuffing.
- **The Redis Dilemma:** Traditional architectures introduce Redis solely for counters, incurring extra infra cost, network hops, and cache-synchronization bugs.
- **The Goal:** Build an enterprise-ready, zero-cache API gateway that guarantees ACID atomic fixed-window rate limiting directly inside PostgreSQL.

---

## Slide 3: System Architecture & Data Flow
### **High-Performance Multi-Tenant Design**
- **Interactive UI (React 19 + Vite):** Key management dashboard, one-time secret display, and live telemetry playground.
- **API Gateway (Express 5):**
  - Bearer JWT authentication for dashboard management.
  - `X-API-Key` SHA-256 validation for public API gateway traffic.
  - Rate limiting middleware with RFC 6585 compliance (`X-RateLimit-*`, `Retry-After`).
- **PostgreSQL Atomic Engine:**
  - `INSERT ... ON CONFLICT DO UPDATE` guarantees race-condition-free counter increments under concurrent bursts.

---

## Slide 4: Deep Dive — PostgreSQL Atomic Fixed Window Algorithm
### **How Zero-Cache Rate Limiting Works**
- **Mathematical Window Alignment:**
  $$\text{Window Start} = \lfloor \text{epoch} / \text{window\_seconds} \rfloor \times \text{window\_seconds}$$
- **Atomic Upsert Query:**
  ```sql
  INSERT INTO rate_limit_windows (api_key_id, window_start, request_count)
  VALUES ($1, to_timestamp(floor(extract(epoch from NOW()) / $2) * $2), 1)
  ON CONFLICT (api_key_id, window_start)
  DO UPDATE SET request_count = rate_limit_windows.request_count + 1
  RETURNING request_count, window_start;
  ```
- **Why It Matters:** Zero cache invalidation bugs; single source of truth; sub-10ms latency.

---

## Slide 5: AI-Driven Test Automation (Stage 2)
### **Comprehensive Quality Assurance Harness**
- **7 Test Suites, 22 Integration Tests:**
  - `health.test.js`, `authMiddleware.test.js`, `auth.test.js`
  - `apiKeyRoutes.test.js`, `apiKeyAuth.test.js`
  - `rateLimitService.test.js`, `rateLimiter.test.js`
- **Coverage Types:** Normal path, edge cases (window boundaries, multi-key concurrency), and negative cases (expired JWTs, revoked keys).
- **Deliberate Red Run:** Intentionally broke test assertions to prove failure capture and test validity, then re-greened cleanly.

---

## Slide 6: The AI Change Loop in Action (Stage 3)
### **Autonomous Feature Engineering: `GET /api/keys/:id/stats`**
- **Prompt:** Add key telemetry endpoint with lifetime totals, peak usage, and window history.
- **Iteration 1:** Initial implementation flagged SQL `numeric`/`bigint` string serialization issues and null aggregations.
- **Iteration 2:** Fixed via explicit `::int` casting and `COALESCE(..., 0)`.
- **Iteration 3:** Detected cross-tenant key ID probing vulnerability; injected ownership checks returning `404`.
- **Iteration 4:** Optimized Express route precedence; verified full 22/22 green test run.

---

## Slide 7: Live Demonstration Walkthrough
### **What We Show in the Live Demo**
1. **User Authentication & Dashboard:** Register/login and JWT session creation.
2. **API Key Issuance:** Cryptographic key generation (`rg_live_...`) with one-time copy modal.
3. **Live Telemetry Playground:**
   - Single request (1x), Burst (5x), and Spam (15x) triggers.
   - Real-time gauge decrement and RFC headers inspection.
   - Triggering `429 Too Many Requests` and watching `Retry-After` countdown.
4. **Key Revocation & Stats Inspection:** Instant `DISABLED` status enforcement.

---

## Slide 8: Evaluation Summary & Conclusion
### **Meeting & Exceeding Assessment Criteria**
- **Completeness (25%):** Full-stack web app running end-to-end with closed Stage 3 loop.
- **Complexity (20%):** Atomic PostgreSQL rate limiting, SHA-256 key hashing, JWT auth.
- **Innovation (20%):** AI orchestration across scaffolding, testing, and self-correcting change loop.
- **Security (15%):** Salted bcrypt, SHA-256 key hashing, parameterized queries, cross-tenant isolation.
- **Documentation (15%):** Complete docs, architecture diagrams, user guide, deck, and video script.
- **Handling of Failure (5%):** Transparent diagnosis of SQL types, route shadowing, and red-run evidence.
