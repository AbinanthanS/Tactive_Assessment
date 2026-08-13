const bcrypt = require("bcrypt");
const pool = require("../config/db");

async function registerUser(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
        const error = new Error("Email is already registered");
        error.statusCode = 409;
        throw error;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email, role, created_at`,
        [normalizedEmail, passwordHash]
    );
    return result.rows[0];
}

async function loginUser(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
        `SELECT id, email, password_hash, role
         FROM users
         WHERE email = $1`,
        [normalizedEmail]
    );

    if (result.rows.length === 0) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!passwordMatches) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    return {
        id: user.id,
        email: user.email,
        role: user.role
    };
}

module.exports = {
    registerUser,
    loginUser
};