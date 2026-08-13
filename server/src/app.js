const express = require("express");

const authRoutes = require("./routes/authRoutes");
const apiKeyRoutes = require("./routes/apiKeyRoutes");
const errorHandler = require("./middleware/errorHandler");
const authenticate = require("./middleware/auth");

const app = express();

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

app.use("/api/keys", apiKeyRoutes);

app.use(errorHandler);

module.exports = app;