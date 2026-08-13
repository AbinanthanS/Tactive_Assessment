const { createApiKey, getApiKeys, revokeApiKey } = require("../services/apiKeyService");

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

async function list(req, res, next) {
    try {
        const apiKeys = await getApiKeys(req.user.id);

        return res.status(200).json({
            apiKeys
        });
    } catch (error) {
        next(error);
    }
}

async function revoke(req, res, next) {
    try {
        const result = await revokeApiKey(
            req.user.id,
            req.params.id
        );

        return res.status(200).json({
            message: "API key revoked successfully",
            apiKey: result
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    create,
    list,
    revoke
};