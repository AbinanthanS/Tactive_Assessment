const { registerUser } = require("../services/authService");

async function register(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        if (typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({
                error: "Email and password must be strings"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: "Password must be at least 8 characters"
            });
        }

        const user = await registerUser(email, password);

        return res.status(201).json({
            message: "User registered successfully",
            user
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    register
};