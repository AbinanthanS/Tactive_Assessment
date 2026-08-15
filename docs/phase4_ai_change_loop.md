# Phase 4 — AI Change Loop Evidence Log

## Feature: `GET /api/keys/:id/stats` — API Key Usage Statistics

This document records the iterative, AI-assisted development of a new backend feature
as evidence for the Stage 3 assessment requirement.

---

## Initial Prompt

> **User prompt to AI:**
> "Implement a new endpoint `GET /api/keys/:id/stats` that returns usage statistics
> for a specific API key — total requests made, peak requests in a single window,
> first and last seen timestamps, and a list of the 10 most recent rate limit windows.
> The endpoint must be JWT-authenticated and only return stats for keys owned by the
> requesting user."

---

## Iteration 1 — First Attempt

**AI plan:**
- Add `getKeyStats(userId, apiKeyId)` to `apiKeyService.js`
- Add `stats` controller in `apiKeyController.js`
- Register `GET /:id/stats` route in `apiKeyRoutes.js`

**First implementation (service function):**
```js
// ATTEMPT 1 — initial query (had a problem)
const statsResult = await pool.query(
    `SELECT
        SUM(request_count) AS total_requests,
        COUNT(*)           AS total_windows
     FROM rate_limit_windows
     WHERE api_key_id = $1`,
    [apiKeyId]
);
```

**Problem discovered:**
`SUM(request_count)` returns a PostgreSQL `numeric` type when using aggregation.
When serialized to JSON it becomes a string (e.g., `"47"` instead of `47`).
The frontend would receive `"47"` and `parseInt` would be needed everywhere.
Also, `COUNT(*)` returns `bigint` in pg, which also serializes as a string.

---

## Iteration 2 — Fix: Explicit Integer Casting

**AI correction:**
Cast all aggregated values to `int` explicitly in the SQL query using `::int`
to ensure they serialize as JSON numbers, not strings.

```js
// ATTEMPT 2 — corrected with explicit casts
const statsResult = await pool.query(
    `SELECT
        COALESCE(SUM(request_count), 0)::int   AS total_requests,
        COUNT(*)::int                           AS total_windows,
        COALESCE(MAX(request_count), 0)::int    AS peak_requests_in_window,
        MIN(window_start)                       AS first_seen,
        MAX(window_start)                       AS last_seen
     FROM rate_limit_windows
     WHERE api_key_id = $1`,
    [apiKeyId]
);
```

**Why `COALESCE(..., 0)`?**
If the key has never been used, there are no rows in `rate_limit_windows`.
`SUM` and `MAX` on an empty set return `NULL`. `COALESCE` converts that to `0`
so the response always has a valid number, not `null`.

---

## Iteration 3 — Fix: Ownership Check Before Stats Query

**Problem discovered:**
The first draft queried `rate_limit_windows` directly without first verifying
that the API key exists and belongs to the requesting user. An attacker could
enumerate usage stats for other users' keys using a valid UUID.

**AI correction — added ownership guard:**
```js
// Verify ownership first
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

This returns `404` (not `403`) regardless of whether the key exists but belongs
to another user — preventing information leakage via status code enumeration.

---

## Iteration 4 — Fix: Route Ordering Conflict

**Problem discovered:**
In `apiKeyRoutes.js`, the original order was:
```js
router.get("/", authenticate, list);
router.delete("/:id", authenticate, revoke);
```

When `GET /:id/stats` was added *after* `DELETE /:id`, Express's router would
correctly match `/123/stats` to the stats route since it's more specific.
However, if `GET /:id/stats` had been placed *after* `GET /` without explicit
path specificity, a generic `GET /:id` route (if added later) could shadow it.

**AI correction — explicit ordering:**
```js
router.post("/", authenticate, create);
router.get("/", authenticate, list);
router.get("/:id/stats", authenticate, stats);  // must be before any /:id GET
router.delete("/:id", authenticate, revoke);
```

The stats route is registered before any potential generic `/:id` GET route
to prevent future shadowing bugs.

---

## Final Implementation

### Files Modified

| File | Change |
|---|---|
| `server/src/services/apiKeyService.js` | Added `getKeyStats()` with ownership check, integer casts, COALESCE guards, and recent windows query |
| `server/src/controllers/apiKeyController.js` | Added `stats()` controller action |
| `server/src/routes/apiKeyRoutes.js` | Registered `GET /:id/stats` with correct ordering |

### Final API Response Shape

**`GET /api/keys/:id/stats`** (requires `Authorization: Bearer <token>`)

```json
{
  "key": {
    "id": "uuid-...",
    "name": "My Production Key",
    "plan": "FREE",
    "requestsPerWindow": 100,
    "windowSeconds": 60,
    "status": "ACTIVE"
  },
  "stats": {
    "totalRequests": 247,
    "totalWindows": 5,
    "peakRequestsInWindow": 100,
    "firstSeen": "2026-08-15T17:30:00.000Z",
    "lastSeen": "2026-08-15T23:20:00.000Z"
  },
  "recentWindows": [
    { "window_start": "2026-08-15T23:20:00.000Z", "request_count": 47, "window_limit": 100 },
    { "window_start": "2026-08-15T23:19:00.000Z", "request_count": 100, "window_limit": 100 }
  ]
}
```

---

## Summary of AI Loop Iterations

| Iteration | Problem | Fix Applied |
|---|---|---|
| 1 | Initial implementation drafted | Core structure: service → controller → route |
| 2 | Aggregated SQL values serialized as strings | Added `::int` casts + `COALESCE(..., 0)` guards |
| 3 | No ownership verification before querying | Added `WHERE id = $1 AND user_id = $2` ownership check returning `404` |
| 4 | Route ordering risk for future shadowing | Placed `/:id/stats` explicitly before any generic `/:id` route |

**Total iterations:** 4  
**Feature status:** ✅ Implemented and live on `GET /api/keys/:id/stats`
