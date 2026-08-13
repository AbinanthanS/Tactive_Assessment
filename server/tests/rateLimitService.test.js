const crypto = require("crypto");
const pool = require("../src/config/db");

const {
    consumeRateLimit
} = require("../src/services/rateLimitService");

describe("Rate limit service", () => {
    let apiKeyId;

    beforeAll(async () => {
        const userResult = await pool.query(
            `
            SELECT id
            FROM users
            LIMIT 1
            `
        );

        if (userResult.rows.length === 0) {
            throw new Error("Create a user before running tests");
        }

        const userId = userResult.rows[0].id;

        const result = await pool.query(
            `
            INSERT INTO api_keys (
                user_id,
                name,
                key_hash,
                plan,
                requests_per_window,
                window_seconds,
                status
            )
            VALUES ($1, $2, $3, 'FREE', 3, 60, 'ACTIVE')
            RETURNING id
            `,
            [
                userId,
                "rate-limit-test",
                crypto.randomBytes(32).toString("hex")
            ]
        );

        apiKeyId = result.rows[0].id;
    });

    afterAll(async () => {
        await pool.query(
            `
            DELETE FROM rate_limit_windows
            WHERE api_key_id = $1
            `,
            [apiKeyId]
        );

        await pool.query(
            `
            DELETE FROM api_keys
            WHERE id = $1
            `,
            [apiKeyId]
        );
    });

    test("should allow requests up to the limit and reject the next request", async () => {
    const results = [];

    for (let i = 0; i < 4; i++) {
        results.push(
            await consumeRateLimit(
                apiKeyId,
                3,
                60
            )
        );
    }

    expect(results[0].allowed).toBe(true);
    expect(results[0].requestCount).toBe(1);

    expect(results[1].allowed).toBe(true);
    expect(results[1].requestCount).toBe(2);

    expect(results[2].allowed).toBe(true);
    expect(results[2].requestCount).toBe(3);

    expect(results[3].allowed).toBe(false);
    expect(results[3].requestCount).toBe(4);
    
    });
});