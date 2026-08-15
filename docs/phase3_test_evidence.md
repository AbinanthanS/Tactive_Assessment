# Phase 3 — Test Automation Evidence

## Overview

This document captures the test automation evidence for the **RateGuard** assessment project, satisfying the Stage 2 requirement for:
- A full automated test run (green run)
- A deliberate failing run (red run) demonstrating TDD red-green understanding

**Test framework:** Jest + Supertest  
**Run mode:** `--runInBand --forceExit` (sequential, database-safe)  
**Total test suites:** 7  
**Total tests:** 22  

---

## ✅ Green Run — All Tests Passing

**Command:**
```bash
npm test
# → jest --runInBand --forceExit
```

**Output:**
```
PASS tests/rateLimiter.test.js      (9.616 s)
PASS tests/rateLimitService.test.js (10.507 s)
PASS tests/apiKeyAuth.test.js       (6.847 s)
PASS tests/auth.test.js             (6.959 s)
PASS tests/apiKeyRoutes.test.js     (5.802 s)
PASS tests/authMiddleware.test.js
PASS tests/health.test.js

Test Suites: 7 passed, 7 total
Tests:       22 passed, 22 total
Snapshots:   0 total
Time:        40.411 s
```

**Result:** ✅ All 7 suites, 22 tests — PASS

---

## Test Suite Breakdown

| Suite | Tests | What it covers |
|---|---|---|
| `health.test.js` | 1 | `GET /health` returns `200 { status: "ok" }` |
| `authMiddleware.test.js` | 3 | Bearer token parsing, missing/invalid token rejection |
| `auth.test.js` | 4 | Register, login, duplicate email `409`, wrong password `401` |
| `apiKeyRoutes.test.js` | 4 | Create key, list keys, revoke key, unauthorized access |
| `apiKeyAuth.test.js` | 3 | Valid API key pass-through, missing/revoked key `401` |
| `rateLimitService.test.js` | 4 | Window counter increment, quota enforcement, multi-key isolation |
| `rateLimiter.test.js` | 3 | `X-RateLimit-*` headers present, `429` on quota exceeded, `Retry-After` header |

---

## 🔴 Red Run — Deliberate Failing Test

**Purpose:** Demonstrate understanding of the TDD red-green-refactor cycle by intentionally breaking a passing test and observing the failure output.

**What was changed:**  
In `tests/health.test.js`, the assertion was changed from:
```js
// CORRECT (green)
expect(response.statusCode).toBe(200);
```
to:
```js
// DELIBERATE BREAK (red run)
expect(response.statusCode).toBe(404);  // wrong — endpoint returns 200
```

**Command:**
```bash
npx jest --runInBand --forceExit tests/health.test.js
```

**Failure Output:**
```
FAIL tests/health.test.js
  Health endpoint
    × GET /health should return 200 (23 ms)

  ● Health endpoint › GET /health should return 200

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 200

       9 |         // RED RUN: deliberately wrong assertion (expecting 404 instead of 200)
    > 10 |         expect(response.statusCode).toBe(404);
         |                                     ^

      at Object.toBe (tests/health.test.js:10:37)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
Time:        0.586 s
```

**Result:** 🔴 1 test FAILED as expected

---

## ✅ Revert & Re-Green

The test was immediately reverted to the correct assertion (`toBe(200)`) after capturing the red run evidence. The full suite continues to pass with 22/22 tests green.

---

## Key Design Decisions for Testability

1. **`--runInBand`** — Tests run sequentially to avoid PostgreSQL connection pool exhaustion and race conditions on shared test data.
2. **`--forceExit`** — Ensures Jest exits cleanly even if open DB connections remain after async teardown.
3. **`tests/teardown.js`** — Global Jest teardown closes the pg pool after all suites complete.
4. **Isolated test users** — Each test suite uses unique `test_*@rateguard.test` email addresses to prevent cross-suite contamination.
5. **Atomic rate limit service** — `rateLimitService.test.js` validates the PostgreSQL `ON CONFLICT DO UPDATE` upsert that guarantees correctness under concurrent load.
