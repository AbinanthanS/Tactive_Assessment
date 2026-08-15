# RateGuard — Video Presentation & Demo Script

> **Tactive Assessment — Deliverable #6: Video Demo Guide**  
> **Total Duration:** 5:00 Minutes  
> **Structure:** 2:00 Min Problem / Approach / Architecture + 3:00 Min Live Technical Demo  
> **Author:** Abinanthan S

---

## Part 1: Problem, Approach & Architecture (0:00 – 2:00)

### 0:00 – 0:35 | Problem Statement
- **Visual:** Title slide / Architecture overview slide.
- **Spoken Script:**
  > *"Hello, my name is Abinanthan, and this is RateGuard — an AI-powered, multi-tenant API gateway and rate-limiting platform. In modern API architectures, protecting backend microservices from traffic surges, brute-force attacks, and noisy neighbor resource starvation is critical. However, most traditional rate-limiting solutions force teams to deploy and maintain an external cache layer like Redis just for counters, introducing cache synchronization bugs, extra cloud costs, and operational complexity."*

### 0:35 – 1:15 | Approach & Technical Innovation
- **Visual:** Rate limiting formula & PostgreSQL atomic upsert query diagram.
- **Spoken Script:**
  > *"For this assessment, I designed RateGuard to achieve production-grade, atomic fixed-window rate limiting directly inside PostgreSQL using serverless Neon DB. By leveraging mathematical epoch alignment and PostgreSQL's atomic `INSERT ... ON CONFLICT DO UPDATE` query, we eliminate Redis entirely. Even under heavy concurrent bursts, PostgreSQL row-level locks guarantee 100% accurate counter increments with zero race conditions and sub-10ms response times."*

### 1:15 – 2:00 | Security & AI Change Loop
- **Visual:** Component architecture & AI change loop summary table.
- **Spoken Script:**
  > *"Security is first-class: raw API keys are generated with 256 bits of entropy, displayed once, and stored exclusively as one-way SHA-256 hashes. In Stage 3, we orchestrated an autonomous AI change loop to implement key usage analytics. Over 4 iterations, the AI detected SQL type serialization mismatches, eliminated cross-tenant data leakage risks, resolved route precedence conflicts, and verified all 22 integration tests passing green. Let's see it live."*

---

## Part 2: Live Technical Demonstration (2:00 – 5:00)

### 2:00 – 2:45 | Dashboard & Key Management
- **Visual:** Browser showing `http://localhost:5173`.
- **Actions:**
  1. Open the RateGuard dashboard.
  2. Sign in to the authenticated developer account.
  3. Click **"+ Create New Key"**, name it `Billing Webhook`, select **FREE** plan (100 req/min).
  4. Display the **KeySecretModal** showing the one-time secret key (`rg_live_...`), copy it to clipboard.

### 2:45 – 3:45 | Live Rate Limiting Playground & Telemetry
- **Visual:** Navigate to **"Live Playground"** tab.
- **Actions:**
  1. Paste or select the generated key.
  2. Trigger **Single (1x)** request: show 200 OK, counter decrements by 1, and RFC headers displayed (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).
  3. Trigger **Burst (5x)** and **Spam (15x)** requests: show live telemetry gauge smoothly updating.
  4. Rapidly exhaust remaining quota to hit **0**:
     - Demonstrate immediate `429 Too Many Requests` error response.
     - Point out `Retry-After: N` seconds header countdown.

### 3:45 – 4:25 | AI Change Loop Feature: Telemetry & Key Revocation
- **Visual:** Navigate back to **"API Keys"** tab.
- **Actions:**
  1. Click **"Stats"** on the key: show the AI-built `GET /api/keys/:id/stats` telemetry (lifetime requests, peak window, recent windows history).
  2. Click **"Revoke"** on the key: confirm revocation.
  3. Return to Playground and fire a request with the revoked key: demonstrate immediate `401 Unauthorized` blocking.

### 4:25 – 5:00 | Test Automation & Deliberate Red Run
- **Visual:** Terminal running Jest test suite.
- **Actions:**
  1. Run `npm test` in the `server` directory: showcase all 7 test suites and 22 integration tests passing green.
  2. Highlight the red-run test evidence where a deliberate assertion caught the failure and re-greened cleanly.
- **Closing Script:**
  > *"All source code, 7 test suites, deliberate red run logs, AI change loop evidence, and architectural documentation are fully organized in the repository. Thank you for your time!"*
