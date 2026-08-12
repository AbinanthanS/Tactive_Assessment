CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER'
        CHECK (role IN ('USER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    plan VARCHAR(20) NOT NULL
        CHECK (plan IN ('FREE', 'PRO')),
    requests_per_window INTEGER NOT NULL
        CHECK (requests_per_window > 0),
    window_seconds INTEGER NOT NULL
        CHECK (window_seconds > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'DISABLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rate_limit_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0
        CHECK (request_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (api_key_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
    ON api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_rate_limit_windows_api_key
    ON rate_limit_windows(api_key_id);