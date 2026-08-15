const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper to make standard authenticated requests
async function request(endpoint, options = {}) {
  const token = localStorage.getItem("rateguard_token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token && !options.skipAuth) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const error = new Error(data.error || `HTTP error ${res.status}`);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const authApi = {
  async register(email, password) {
    return request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
  },

  async login(email, password) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
  },

  async getMe() {
    return request("/api/me");
  },

  async checkHealth() {
    return request("/health", { skipAuth: true });
  }
};

export const keysApi = {
  async getKeys() {
    return request("/api/keys");
  },

  async createKey(name, plan = "FREE") {
    return request("/api/keys", {
      method: "POST",
      body: JSON.stringify({ name, plan }),
    });
  },

  async revokeKey(id) {
    return request(`/api/keys/${id}`, {
      method: "DELETE",
    });
  }
};

export const rateLimitApi = {
  // Test endpoint that tracks response headers and duration for live telemetry
  async sendDemoRequest(apiKey) {
    const startTime = performance.now();
    const url = `${API_BASE_URL}/api/demo`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
        },
      });

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      const limit = res.headers.get("x-ratelimit-limit");
      const remaining = res.headers.get("x-ratelimit-remaining");
      const reset = res.headers.get("x-ratelimit-reset");
      const retryAfter = res.headers.get("retry-after");

      const body = await res.json().catch(() => ({}));

      return {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        latency,
        body,
        headers: {
          limit: limit !== null ? parseInt(limit, 10) : null,
          remaining: remaining !== null ? parseInt(remaining, 10) : null,
          reset: reset !== null ? parseInt(reset, 10) : null,
          retryAfter: retryAfter !== null ? parseInt(retryAfter, 10) : null,
        },
        timestamp: new Date().toLocaleTimeString(),
      };
    } catch (err) {
      const endTime = performance.now();
      return {
        status: 0,
        statusText: "Network Error",
        ok: false,
        latency: Math.round(endTime - startTime),
        body: { error: err.message },
        headers: {},
        timestamp: new Date().toLocaleTimeString(),
      };
    }
  }
};
