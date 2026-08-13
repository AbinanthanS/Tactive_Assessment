const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");

describe("Authentication", () => {
    const email = `test-${Date.now()}@example.com`;
    const password = "password123";

    // Pay the connection/SSL-handshake cost once, up front, so it doesn't
    // eat into the first test's timeout budget.
    beforeAll(async () => {
        await pool.query("SELECT 1");
    }, 30000);

    // // Close the pool so Jest doesn't hang on an open TCP handle afterward.
    // afterAll(async () => {
    //     await pool.end();
    // });

    test("should register a new user", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                email,
                password
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.message)
            .toBe("User registered successfully");

        expect(response.body.user.email)
            .toBe(email);

        expect(response.body.user)
            .not.toHaveProperty("password");

        expect(response.body.user)
            .not.toHaveProperty("password_hash");
    });

    test("should reject duplicate email", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                email,
                password
            });

        expect(response.statusCode).toBe(409);

        expect(response.body.error)
            .toBe("Email is already registered");
    });

    test("should login successfully", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email,
                password
            });

        expect(response.statusCode).toBe(200);

        expect(response.body.message)
            .toBe("Login successful");

        expect(response.body.token)
            .toBeDefined();

        expect(response.body.user.email)
            .toBe(email);
    });

    test("should reject incorrect password", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email,
                password: "wrongpassword"
            });

        expect(response.statusCode).toBe(401);

        expect(response.body.error)
            .toBe("Invalid email or password");
    });

    test("should reject login for unknown email", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "unknown@example.com",
                password
            });

        expect(response.statusCode).toBe(401);

        expect(response.body.error)
            .toBe("Invalid email or password");
    });
});