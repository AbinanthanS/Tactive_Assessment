const { consumeRateLimit } = require("../services/rateLimitService");

async function rateLimiter(req, res, next) {
    try {
        const apiKey = req.apiKey;

        if (!apiKey) {
            return res.status(500).json({
                error: "Rate limiter requires apiKeyAuth middleware to run first"
            });
        }

        const rateLimit = await consumeRateLimit(
            apiKey.id,
            apiKey.requests_per_window,
            apiKey.window_seconds
        );

        const limit = apiKey.requests_per_window;
        const remaining = Math.max(0, limit - rateLimit.requestCount);
        const windowStartTime = new Date(rateLimit.windowStart).getTime();
        const resetTimestamp = Math.floor(windowStartTime / 1000) + apiKey.window_seconds;

        res.set("X-RateLimit-Limit", String(limit));
        res.set("X-RateLimit-Remaining", String(remaining));
        res.set("X-RateLimit-Reset", String(resetTimestamp));

        if (!rateLimit.allowed) {
            const nowSeconds = Math.floor(Date.now() / 1000);
            const retryAfter = Math.max(1, resetTimestamp - nowSeconds);
            res.set("Retry-After", String(retryAfter));

            return res.status(429).json({
                error: "Rate limit exceeded. Try again later.",
                limit,
                remaining: 0,
                retryAfter
            });
        }

        req.rateLimit = {
            ...rateLimit,
            remaining,
            resetTimestamp
        };

        next();
    } catch (error) {
        next(error);
    }
}

module.exports = rateLimiter;
