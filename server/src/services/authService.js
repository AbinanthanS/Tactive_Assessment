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

module.exports = {
    registerUser
};