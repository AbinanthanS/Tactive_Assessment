const request = require("supertest");
const crypto = require("crypto");
const app = require("../src/app");
const pool = require("../src/config/db");

describe("Rate Limiter Middleware", () => {
    let rawApiKey;
    let apiKeyId;
    let userId;

    beforeAll(async () => {
        await pool.query("SELECT 1");

        const userResult = await pool.query(
            `SELECT id FROM users LIMIT 1`
        );

        if (userResult.rows.length === 0) {
            throw new Error("Create a user before running rate limiter tests");
        }

        userId = userResult.rows[0].id;

        rawApiKey = `rg_test_${crypto.randomBytes(32).toString("hex")}`;
        const keyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex");

        const result = await pool.query(
            `INSERT INTO api_keys (
                user_id,
                name,
                key_hash,
                plan,
                requests_per_window,
                window_seconds,
                status
            )
            VALUES ($1, $2, $3, 'FREE', 2, 60, 'ACTIVE')
            RETURNING id`,
            [userId, "rate-limiter-middleware-test", keyHash]
        );

        apiKeyId = result.rows[0].id;
    }, 30000);

    afterAll(async () => {
        await pool.query(
            `DELETE FROM rate_limit_windows WHERE api_key_id = $1`,
            [apiKeyId]
        );
        await pool.query(
            `DELETE FROM api_keys WHERE id = $1`,
            [apiKeyId]
        );
    }, 30000);

    test("should allow requests under quota and return rate limit headers", async () => {
        // First request (1/2)
        const res1 = await request(app)
            .get("/api/demo")
            .set("X-API-Key", rawApiKey);

        expect(res1.statusCode).toBe(200);
        expect(res1.headers["x-ratelimit-limit"]).toBe("2");
        expect(res1.headers["x-ratelimit-remaining"]).toBe("1");
        expect(res1.headers["x-ratelimit-reset"]).toBeDefined();

        // Second request (2/2)
        const res2 = await request(app)
            .get("/api/demo")
            .set("X-API-Key", rawApiKey);

        expect(res2.statusCode).toBe(200);
        expect(res2.headers["x-ratelimit-limit"]).toBe("2");
        expect(res2.headers["x-ratelimit-remaining"]).toBe("0");
    });

    test("should block requests exceeding quota with 429 and Retry-After header", async () => {
        // Third request (3/2) -> exceeds quota
        const res3 = await request(app)
            .get("/api/demo")
            .set("X-API-Key", rawApiKey);

        expect(res3.statusCode).toBe(429);
        expect(res3.headers["x-ratelimit-limit"]).toBe("2");
        expect(res3.headers["x-ratelimit-remaining"]).toBe("0");
        expect(res3.headers["retry-after"]).toBeDefined();
        expect(res3.body.error).toBe("Rate limit exceeded. Try again later.");
    });
});
