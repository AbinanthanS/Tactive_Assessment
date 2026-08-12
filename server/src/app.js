const express = require("express");
const authRoutes = require("./routes/authRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "rateguard"
    });
});

app.use("/api/auth", authRoutes);
app.use(errorHandler);

module.exports = app;