const { createApiKey } = require("../services/apiKeyService");

async function create(req, res, next) {
    try {
        const { name, plan = "FREE" } = req.body;

        if (!name || typeof name !== "string") {
            return res.status(400).json({
                error: "API key name is required"
            });
        }

        if (name.trim().length === 0) {
            return res.status(400).json({
                error: "API key name cannot be empty"
            });
        }

        const apiKey = await createApiKey(
            req.user.id,
            name.trim(),
            plan
        );

        return res.status(201).json({
            message: "API key created successfully",
            apiKey
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    create
};