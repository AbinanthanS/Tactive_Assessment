const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");

describe("JWT authentication middleware", () => {

    test("should reject request without token", async () => {
        const response = await request(app)
            .get("/api/me");

        expect(response.statusCode).toBe(401);

        expect(response.body.error)
            .toBe("Authorization header is required");
    });

    test("should reject invalid token", async () => {
        const response = await request(app)
            .get("/api/me")
            .set("Authorization", "Bearer invalid-token");

        expect(response.statusCode).toBe(401);

        expect(response.body.error)
            .toBe("Invalid or expired token");
    });

    test("should accept a valid token", async () => {
        const token = jwt.sign(
            {
                sub: "test-user-id",
                role: "USER"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        const response = await request(app)
            .get("/api/me")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);

        expect(response.body.user).toEqual({
            id: "test-user-id",
            role: "USER"
        });
    });
});