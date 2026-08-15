const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const apiKeyRoutes = require("./routes/apiKeyRoutes");
const apiKeyAuth = require("./middleware/apiKeyAuth");
const rateLimiter = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");
const authenticate = require("./middleware/auth");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "rateguard"
    });
});

app.use("/api/auth", authRoutes);

app.get("/api/me", authenticate, (req, res) => {
    res.status(200).json({
        user: req.user
    });
});

app.get("/api/demo", apiKeyAuth, rateLimiter, (req, res) => {
    res.status(200).json({
        message: "API request successful",
        apiKey: {
            id: req.apiKey.id,
            name: req.apiKey.name,
            plan: req.apiKey.plan
        },
        rateLimit: {
            remaining: req.rateLimit.remaining,
            resetTimestamp: req.rateLimit.resetTimestamp
        }
    });
});

app.use("/api/keys", apiKeyRoutes);

app.use(errorHandler);

module.exports = app;