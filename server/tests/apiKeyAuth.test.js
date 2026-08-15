const request = require("supertest");
const crypto = require("crypto");

const app = require("../src/app");
const pool = require("../src/config/db");

describe("API key authentication", () => {
    let rawApiKey;
    let apiKeyId;
    let userId;

    beforeAll(async () => {
        await pool.query("SELECT 1");

        const userResult = await pool.query(
            `
            SELECT id
            FROM users
            LIMIT 1
            `
        );

        if (userResult.rows.length === 0) {
            throw new Error(
                "Create a user before running API key tests"
            );
        }

        userId = userResult.rows[0].id;

        rawApiKey =
            `rg_test_${crypto.randomBytes(32).toString("hex")}`;

        const keyHash = crypto
            .createHash("sha256")
            .update(rawApiKey)
            .digest("hex");

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
            VALUES (
                $1,
                'api-key-auth-test',
                $2,
                'FREE',
                100,
                60,
                'ACTIVE'
            )
            RETURNING id
            `,
            [userId, keyHash]
        );

        apiKeyId = result.rows[0].id;
    }, 30000);

    afterAll(async () => {
        await pool.query(
            `
            DELETE FROM api_keys
            WHERE id = $1
            `,
            [apiKeyId]
        );
    }, 30000);

    test("should reject request without API key", async () => {
        const response = await request(app)
            .get("/api/demo");

        expect(response.statusCode).toBe(401);

        expect(response.body.error)
            .toBe("API key is required");
    });

    test("should reject invalid API key", async () => {
        const response = await request(app)
            .get("/api/demo")
            .set(
                "X-API-Key",
                "rg_test_invalid_key"
            );

        expect(response.statusCode).toBe(401);

        expect(response.body.error)
            .toBe("Invalid API key");
    });

    test("should accept valid API key", async () => {
        const response = await request(app)
            .get("/api/demo")
            .set("X-API-Key", rawApiKey);

        expect(response.statusCode).toBe(200);

        expect(response.body.message)
            .toBe("API request successful");

        expect(response.body.apiKey.plan)
            .toBe("FREE");
    });

    test("should reject disabled API key", async () => {
        await pool.query(
            `
            UPDATE api_keys
            SET status = 'DISABLED'
            WHERE id = $1
            `,
            [apiKeyId]
        );

        const response = await request(app)
            .get("/api/demo")
            .set("X-API-Key", rawApiKey);

        expect(response.statusCode).toBe(401);

        expect(response.body.error)
            .toBe("API key is disabled");
    });
});