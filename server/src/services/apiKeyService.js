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

async function createApiKey(userId, name, plan) {
    const normalizedPlan = plan.toUpperCase();

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

module.exports = {
    createApiKey
};