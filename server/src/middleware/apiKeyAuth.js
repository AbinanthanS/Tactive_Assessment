const crypto = require("crypto");
const pool = require("../config/db");

function hashApiKey(apiKey) {
    return crypto
        .createHash("sha256")
        .update(apiKey)
        .digest("hex");
}

async function apiKeyAuth(req, res, next) {
    try {
        const apiKey = req.header("X-API-Key");

        if (!apiKey) {
            return res.status(401).json({
                error: "API key is required"
            });
        }

        const keyHash = hashApiKey(apiKey);

        const result = await pool.query(
            `
            SELECT
                id,
                user_id,
                name,
                plan,
                requests_per_window,
                window_seconds,
                status
            FROM api_keys
            WHERE key_hash = $1
            LIMIT 1
            `,
            [keyHash]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "Invalid API key"
            });
        }

        const key = result.rows[0];

        if (key.status !== "ACTIVE") {
            return res.status(401).json({
                error: "API key is disabled"
            });
        }

        req.apiKey = key;

        next();
    } catch (error) {
        next(error);
    }
}

module.exports = apiKeyAuth;