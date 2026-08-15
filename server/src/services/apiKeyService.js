const crypto = require("crypto");
const pool = require("../config/db");

const PLANS = {
    FREE: {
        requestsPerWindow: 100,
        windowSeconds: 60
    },
    PRO: {
        requestsPerWindow: 1000,
        windowSeconds: 60
    }
};

function generateApiKey() {
    const randomPart = crypto.randomBytes(32).toString("hex");

    return `rg_live_${randomPart}`;
}

function hashApiKey(apiKey) {
    return crypto
        .createHash("sha256")
        .update(apiKey)
        .digest("hex");
}

async function createApiKey(userId, name, plan = "FREE") {
    const normalizedPlan = (typeof plan === "string" ? plan : "FREE").toUpperCase();

    const planConfig = PLANS[normalizedPlan];

    if (!planConfig) {
        const error = new Error("Invalid plan");
        error.statusCode = 400;
        throw error;
    }

    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);

    const result = await pool.query(
        `INSERT INTO api_keys (
            user_id,
            name,
            key_hash,
            plan,
            requests_per_window,
            window_seconds
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
            id,
            name,
            plan,
            requests_per_window,
            window_seconds,
            status,
            created_at`,
        [
            userId,
            name,
            keyHash,
            normalizedPlan,
            planConfig.requestsPerWindow,
            planConfig.windowSeconds
        ]
    );

    return {
        ...result.rows[0],
        apiKey
    };
}

async function getApiKeys(userId) {
    const result = await pool.query(
        `SELECT
            id,
            name,
            plan,
            requests_per_window,
            window_seconds,
            status,
            created_at
         FROM api_keys
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
    );

    return result.rows;
}

async function revokeApiKey(userId, apiKeyId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(apiKeyId)) {
        const error = new Error("Invalid API key ID");
        error.statusCode = 400;
        throw error;
    }

    const result = await pool.query(
        `UPDATE api_keys
         SET status = 'DISABLED'
         WHERE id = $1
           AND user_id = $2
         RETURNING id, name, status`,
        [apiKeyId, userId]
    );

    if (result.rows.length === 0) {
        const error = new Error("API key not found");
        error.statusCode = 404;
        throw error;
    }

    return result.rows[0];
}

async function getKeyStats(userId, apiKeyId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(apiKeyId)) {
        const error = new Error("Invalid API key ID");
        error.statusCode = 400;
        throw error;
    }

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

    const key = keyResult.rows[0];

    // Aggregate stats from rate_limit_windows
    const statsResult = await pool.query(
        `SELECT
            COALESCE(SUM(request_count), 0)::int        AS total_requests,
            COUNT(*)::int                                AS total_windows,
            COALESCE(MAX(request_count), 0)::int         AS peak_requests_in_window,
            MIN(window_start)                            AS first_seen,
            MAX(window_start)                            AS last_seen
         FROM rate_limit_windows
         WHERE api_key_id = $1`,
        [apiKeyId]
    );

    // Last 10 windows for recent activity
    const recentResult = await pool.query(
        `SELECT
            window_start,
            request_count,
            $2::int                                      AS window_limit
         FROM rate_limit_windows
         WHERE api_key_id = $1
         ORDER BY window_start DESC
         LIMIT 10`,
        [apiKeyId, key.requests_per_window]
    );

    const stats = statsResult.rows[0];

    return {
        key: {
            id: key.id,
            name: key.name,
            plan: key.plan,
            requestsPerWindow: key.requests_per_window,
            windowSeconds: key.window_seconds,
            status: key.status
        },
        stats: {
            totalRequests: stats.total_requests,
            totalWindows: stats.total_windows,
            peakRequestsInWindow: stats.peak_requests_in_window,
            firstSeen: stats.first_seen,
            lastSeen: stats.last_seen
        },
        recentWindows: recentResult.rows
    };
}

module.exports = {
    createApiKey,
    getApiKeys,
    revokeApiKey,
    getKeyStats
};