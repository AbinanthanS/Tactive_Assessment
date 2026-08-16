# AI Change Loop Evidence Log

> **Project:** RateGuard API Gateway  
> **Evaluation Reference:** Stage 3 — Autonomous AI Change Loop  
> **Author:** Abinanthan S &bull; [GitHub Repository](https://github.com/AbinanthanS/Tactive_Assessment)

---

## 1. Overview & Feature Prompt

This log documents the 4-iteration AI self-correction loop conducted to implement:  
**`GET /api/keys/:id/stats` — Real-Time API Key Usage & Historical Telemetry**.

### Feature Prompt
> *"We need a new endpoint `GET /api/keys/:id/stats` to provide key-level telemetry on the dashboard. It must return: total lifetime requests, total active windows, peak requests in a single window, first and last seen timestamps, and a list of the 10 most recent rate limit windows. It must be JWT-authenticated and enforce strict ownership checks so users cannot inspect other users' keys."*

---

## 2. Tools & Orchestration

| Tool | Role |
|---|---|
| **Antigravity (Gemini 2.5 / 3.7)** | Analyzed codebase, generated database queries, resolved SQL aggregation issues, and enforced tenant isolation |
| **Jest / Supertest Runner** | Executed test suite and detected regression failures |
| **Human Developer** | Provided initial feature prompt and reviewed final security posture |

---

## 3. Iteration Progression

### Iteration 1: Initial Implementation
- **Action:** Created `getKeyStats()` service, controller handler, and registered route in `apiKeyRoutes.js`.
- **Initial Query:**
  ```sql
  SELECT
      SUM(request_count) AS total_requests,
      COUNT(*)           AS total_windows,
      MAX(request_count) AS peak_requests_in_window,
      MIN(window_start)  AS first_seen,
      MAX(window_start)  AS last_seen
  FROM rate_limit_windows
  WHERE api_key_id = $1;
  ```
- **Issues Detected in Tests:**
  1. `SUM()` and `COUNT()` serialize to string values (`"45"`) in `node-postgres`, violating numeric JSON API types.
  2. For new API keys with zero requests, `SUM` and `MAX` returned `null` instead of `0`.

---

### Iteration 2: Type Casting & Null Protection
- **Action:** Injected explicit PostgreSQL integer casts and `COALESCE` defaults.
- **Corrected Query:**
  ```sql
  SELECT
      COALESCE(SUM(request_count), 0)::int AS total_requests,
      COUNT(*)::int                        AS total_windows,
      COALESCE(MAX(request_count), 0)::int AS peak_requests_in_window,
      MIN(window_start)                    AS first_seen,
      MAX(window_start)                    AS last_seen
  FROM rate_limit_windows
  WHERE api_key_id = $1;
  ```
- **Issue Detected in Threat Modeling:** Query filtered exclusively by `api_key_id`. Any authenticated user guessing a valid UUID could read telemetry of other tenants' API keys.

---

### Iteration 3: Multi-Tenant Ownership Guard
- **Action:** Added tenant verification prior to querying window telemetry.
- **Ownership Guard:**
  ```js
  const keyResult = await pool.query(
      `SELECT id, name, plan, requests_per_window, window_seconds, status
       FROM api_keys
       WHERE id = $1 AND user_id = $2`,
      [apiKeyId, userId]
  );

  if (keyResult.rows.length === 0) {
      const error = new Error("API key not found");
      error.statusCode = 404;
      throw error;
  }
  ```
- **Issue Detected:** In `apiKeyRoutes.js`, route order placed `router.delete("/:id")` above sub-resource routes, creating ambiguity for future handlers.

---

### Iteration 4: Route Precedence & Final Verification
- **Action:** Cleaned up Express route registration order and included recent 10-window subquery.
- **Final Route Registration (`apiKeyRoutes.js`):**
  ```js
  router.post("/", authenticate, create);
  router.get("/", authenticate, list);
  router.get("/:id/stats", authenticate, stats); // Sub-resource route registered before generic /:id
  router.delete("/:id", authenticate, revoke);
  ```
- **Verification Output:**
  ```
  PASS tests/apiKeyRoutes.test.js
  PASS tests/rateLimitService.test.js
  PASS tests/rateLimiter.test.js
  PASS tests/apiKeyAuth.test.js
  PASS tests/auth.test.js
  PASS tests/authMiddleware.test.js
  PASS tests/health.test.js

  Test Suites: 7 passed, 7 total
  Tests:       22 passed, 22 total
  ```

---

## 4. Iteration Summary

| Iteration | Issue Identified | AI Action | Outcome |
|---|---|---|---|
| **#1** | Strings in numeric fields; `null` values on unused keys | Injected `::int` casts and `COALESCE(..., 0)` | Clean numeric API payload |
| **#2** | Cross-tenant telemetry access vulnerability | Injected `WHERE id = $1 AND user_id = $2` check with `404` | Multi-tenant isolation verified |
| **#3** | Route precedence ambiguity | Explicitly ordered sub-paths before generic wildcards | Clean router hierarchy |
| **#4** | Full regression testing | Ran complete 7-suite test harness | ✅ **100% Passed (22/22 Green)** |

---

## 5. Collaboration Breakdown

- **Autonomous AI Actions (95%):** Code generation, SQL refactoring, type casting, error handling creation, and test execution.
- **Developer Review (5%):** Prompt input, evaluating `404` vs `403` status for ID enumeration mitigation, and verifying pull request diffs.
