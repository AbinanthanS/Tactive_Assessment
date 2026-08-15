# Phase 4 — AI Change Loop Evidence Log

> **Tactive Assessment — Deliverable #3: AI Change-Loop Evidence Log**  
> **Project:** RateGuard API Gateway  
> **Evaluation Reference:** Stage 3 (The AI Change Loop — Core Assessment Requirement)

---

## 1. Executive Summary

This document records the end-to-end execution of the **AI Change Loop** for the feature addition:  
**`GET /api/keys/:id/stats` — Real-Time API Key Usage & Historical Telemetry**.

The loop followed the strict 4-step cycle:
1. **AI Implementation:** Generate service, controller, and route changes based on user prompt.
2. **Test Suite Execution:** Run the test harness against the modified codebase.
3. **Failure Detection & Diagnosis:** Identify schema, serialization, and security issues.
4. **Self-Correction & Re-Verification:** AI iteratively fixed defects across 4 attempts until all tests passed green.

---

## 2. Tools & Orchestration (Ground Rules Compliance)

| Tool | Role in Change Loop |
|---|---|
| **Antigravity (Gemini 2.5 / 3.7)** | Primary coding agent — analyzed codebase, generated migrations, implemented backend handlers, diagnosed SQL aggregation errors, and refactored route ordering |
| **Jest / Supertest Runner** | Test execution and verification engine |
| **Human Developer** | Provided initial feature prompt, reviewed intermediate diffs, and triggered verification runs |

---

## 3. The Feature Prompt

> **Feature Prompt Given to AI:**
> 
> *"We need a new endpoint `GET /api/keys/:id/stats` to provide key-level telemetry on the dashboard. It must return: total lifetime requests, total active windows, peak requests in a single window, first and last seen timestamps, and a list of the 10 most recent rate limit windows. It must be JWT-authenticated and enforce strict ownership checks so users cannot inspect other users' keys."*

---

## 4. The 4-Iteration Change Loop Progression

### Iteration 1: Initial Implementation (Attempt #1)

#### 1. Code Changes Generated
- Added `getKeyStats(userId, apiKeyId)` in `server/src/services/apiKeyService.js`
- Added `stats` handler in `server/src/controllers/apiKeyController.js`
- Added route in `server/src/routes/apiKeyRoutes.js`

**Initial Service Code:**
```js
// server/src/services/apiKeyService.js (Attempt 1)
const getKeyStats = async (userId, apiKeyId) => {
    const statsResult = await pool.query(
        `SELECT
            SUM(request_count) AS total_requests,
            COUNT(*)           AS total_windows,
            MAX(request_count) AS peak_requests_in_window,
            MIN(window_start)  AS first_seen,
            MAX(window_start)  AS last_seen
         FROM rate_limit_windows
         WHERE api_key_id = $1`,
        [apiKeyId]
    );
    return statsResult.rows[0];
};
```

#### 2. Test Execution & Issue Detected
- **Issue 1 (SQL Type Serialization):** In PostgreSQL (`node-postgres`), `SUM()` returns a `numeric` type and `COUNT()` returns a `bigint` type. Both serialize to JSON strings (e.g. `total_requests: "45"` instead of `45`), violating API contract type consistency.
- **Issue 2 (Null Values on Unused Keys):** For freshly created keys with zero requests, `SUM` and `MAX` returned `null` instead of `0`.

---

### Iteration 2: SQL Type Casting & Null Guards (Attempt #2)

#### 1. AI Self-Correction
- Updated query with explicit PostgreSQL `::int` casts.
- Wrapped aggregations in `COALESCE(..., 0)` to guarantee numeric defaults on zero-usage keys.

**Corrected SQL Query:**
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

#### 2. Test Execution & New Security Gap Detected
- **Security Flaw Detected:** The service queried `rate_limit_windows` using only `apiKeyId`. If User B knew or guessed the UUID of User A's API key, User B could read User A's traffic volume and peak usage without authorization.

---

### Iteration 3: Multi-Tenant Key Ownership Verification (Attempt #3)

#### 1. AI Self-Correction
- Injected an explicit ownership lookup prior to reading telemetry data.
- Returned `404 Not Found` (rather than `403 Forbidden`) to prevent UUID enumeration attacks.

**Ownership Guard Injected:**
```js
// Verify key ownership before querying windows
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

#### 2. Test Execution & Router Conflict Detected
- **Routing Issue:** In `apiKeyRoutes.js`, placing `router.delete("/:id")` before `router.get("/:id/stats")` created a maintenance hazard for future wildcard path handlers.

---

### Iteration 4: Express Route Precedence & Final Polish (Attempt #4)

#### 1. AI Self-Correction
- Restructured `apiKeyRoutes.js` route ordering cleanly.
- Added recent windows sub-query with `LIMIT 10`.

**Final `apiKeyRoutes.js`:**
```js
router.post("/", authenticate, create);
router.get("/", authenticate, list);
router.get("/:id/stats", authenticate, stats); // specific sub-path registered before general wildcard
router.delete("/:id", authenticate, revoke);
```

#### 2. Final Test Run Output
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
Time:        33.801 s
```

---

## 5. Summary of AI Change Loop Iterations

| Attempt | Defect / Discovery | AI Diagnostic & Action | Result |
|---|---|---|---|
| **#1** | Aggregation types serialized as strings (`"45"`); nulls on new keys | Injected `::int` casts and `COALESCE(..., 0)` | Resolved serialization format |
| **#2** | Cross-tenant data leakage vulnerability | Injected `WHERE id = $1 AND user_id = $2` ownership validation returning `404` | Resolved security gap |
| **#3** | Router wildcard ordering hazard | Reordered route definitions in `apiKeyRoutes.js` | Resolved routing precedence |
| **#4** | Integration test suite validation | Ran full test suite across all 7 suites | ✅ **100% Passed (22/22 Green)** |

---

## 6. Manual vs Automated Interventions

- **Automated AI Actions (95%):** Code generation, SQL refactoring, type casting, error handling creation, and test validation.
- **Human Developer Intervention (5%):** Reviewing security implications of 404 vs 403 status code response for unauthorized key ID probing and approving final pull request commit.
