const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const pool = require("../src/config/db");

describe("API Key Routes", () => {
    let token;
    let userId;
    let createdKeyId;

    beforeAll(async () => {
        await pool.query("SELECT 1");

        const email = `apikey-test-${Date.now()}@example.com`;
        const userRes = await pool.query(
            `INSERT INTO users (email, password_hash)
             VALUES ($1, 'dummy_hash')
             RETURNING id`,
            [email]
        );

        userId = userRes.rows[0].id;

        token = jwt.sign(
            { sub: userId, role: "USER" },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
    }, 30000);

    afterAll(async () => {
        await pool.query(`DELETE FROM api_keys WHERE user_id = $1`, [userId]);
        await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }, 30000);

    test("POST /api/keys should create a new FREE API key", async () => {
        const response = await request(app)
            .post("/api/keys")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Production App" });

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe("API key created successfully");
        expect(response.body.apiKey).toHaveProperty("apiKey");
        expect(response.body.apiKey.name).toBe("Production App");
        expect(response.body.apiKey.plan).toBe("FREE");
        expect(response.body.apiKey.requests_per_window).toBe(100);

        createdKeyId = response.body.apiKey.id;
    });

    test("POST /api/keys should create a PRO API key", async () => {
        const response = await request(app)
            .post("/api/keys")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Enterprise App", plan: "PRO" });

        expect(response.statusCode).toBe(201);
        expect(response.body.apiKey.plan).toBe("PRO");
        expect(response.body.apiKey.requests_per_window).toBe(1000);
    });

    test("POST /api/keys should reject empty name", async () => {
        const response = await request(app)
            .post("/api/keys")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "   " });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("API key name cannot be empty");
    });

    test("GET /api/keys should list all keys for user", async () => {
        const response = await request(app)
            .get("/api/keys")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body.apiKeys)).toBe(true);
        expect(response.body.apiKeys.length).toBeGreaterThanOrEqual(2);
    });

    test("DELETE /api/keys/:id should reject invalid UUID with 400", async () => {
        const response = await request(app)
            .delete("/api/keys/not-a-uuid")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Invalid API key ID");
    });

    test("DELETE /api/keys/:id should revoke existing key", async () => {
        const response = await request(app)
            .delete(`/api/keys/${createdKeyId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("API key revoked successfully");
        expect(response.body.apiKey.status).toBe("DISABLED");
    });
});
