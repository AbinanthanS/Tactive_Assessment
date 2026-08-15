const pool = require("../config/db");

async function consumeRateLimit(apiKeyId, limit, windowSeconds) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        /*
         * Calculate the beginning of the current fixed window.
         *
         * Example:
         * windowSeconds = 60
         *
         * 23:53:17
         *     ↓
         * 23:53:00
         */
        const result = await client.query(
            `
            INSERT INTO rate_limit_windows (
                api_key_id,
                window_start,
                request_count
            )
            VALUES (
                $1,
                to_timestamp(floor(extract(epoch from NOW()) / $2) * $2),
                1
            )
            ON CONFLICT (api_key_id, window_start)
            DO UPDATE
            SET request_count =
                rate_limit_windows.request_count + 1
            RETURNING
                request_count,
                window_start
            `,
            [apiKeyId, windowSeconds]
        );

        const row = result.rows[0];

        await client.query("COMMIT");

        const allowed = row.request_count <= limit;

        return {
            allowed,
            requestCount: row.request_count,
            windowStart: row.window_start
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    consumeRateLimit
};