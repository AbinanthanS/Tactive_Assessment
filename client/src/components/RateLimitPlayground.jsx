import React, { useState, useEffect, useRef } from "react";
import { Play, Zap, Flame, Shield, Clock, AlertOctagon, CheckCircle2, RotateCcw, Key } from "lucide-react";
import { rateLimitApi } from "../services/api";
import RequestConsole from "./RequestConsole";
import { useAuth } from "../context/AuthContext";

export default function RateLimitPlayground({ keys, initialApiKey }) {
  const { addToast } = useAuth();
  const [apiKeyInput, setApiKeyInput] = useState(initialApiKey || "");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  // Telemetry metrics from latest responses
  const [metrics, setMetrics] = useState({
    limit: null,
    remaining: null,
    resetTimestamp: null,
    lastStatus: null,
  });

  const [secondsUntilReset, setSecondsUntilReset] = useState(null);

  const [selectedKeyId, setSelectedKeyId] = useState("");
  const [cachedSecrets, setCachedSecrets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("rg_cached_secrets") || "{}");
    } catch {
      return {};
    }
  });

  // Update input if initialApiKey changes
  useEffect(() => {
    if (initialApiKey) {
      setApiKeyInput(initialApiKey);
      // If matches any key in keys, select it
      const matchingKey = keys?.find((k) => cachedSecrets[k.id] === initialApiKey);
      if (matchingKey) {
        setSelectedKeyId(matchingKey.id);
      }
    }
  }, [initialApiKey, keys, cachedSecrets]);

  // Load / sync cached secrets when keys change
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("rg_cached_secrets") || "{}");
      setCachedSecrets(stored);
    } catch {
      // ignore
    }
  }, [keys]);

  const handleSelectKey = (e) => {
    const keyId = e.target.value;
    setSelectedKeyId(keyId);
    if (!keyId) return;

    const foundKey = keys?.find((k) => k.id === keyId);
    const secret = cachedSecrets[keyId];

    if (secret) {
      setApiKeyInput(secret);
      addToast(`Selected "${foundKey?.name || "Key"}" (${foundKey?.plan || ""})`, "success");
    } else {
      setApiKeyInput("");
      addToast(`Selected "${foundKey?.name || "Key"}". Please paste its secret key.`, "info");
    }
  };

  const handleApiKeyInputChange = (value) => {
    setApiKeyInput(value);
    // If a key is selected or matches, save to cache
    if (selectedKeyId && value.trim().startsWith("rg_live_")) {
      try {
        const updated = { ...cachedSecrets, [selectedKeyId]: value.trim() };
        setCachedSecrets(updated);
        localStorage.setItem("rg_cached_secrets", JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  // Reset countdown clock
  useEffect(() => {
    if (!metrics.resetTimestamp) return;

    const interval = setInterval(() => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const diff = Math.max(0, metrics.resetTimestamp - nowSeconds);
      setSecondsUntilReset(diff);

      // If reset reached, automatically reset remaining display
      if (diff === 0 && metrics.limit !== null) {
        setMetrics((prev) => ({
          ...prev,
          remaining: prev.limit,
          resetTimestamp: null,
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [metrics.resetTimestamp, metrics.limit]);

  // Execute N requests
  const fireRequests = async (count = 1) => {
    if (!apiKeyInput.trim()) {
      addToast("Please enter or select an API key to test", "error");
      return;
    }

    setLoading(true);

    const promises = Array.from({ length: count }).map(async (_, idx) => {
      // Small staggered delay if sending burst to see sequential logs
      if (count > 1) {
        await new Promise((r) => setTimeout(r, idx * 60));
      }
      return rateLimitApi.sendDemoRequest(apiKeyInput.trim());
    });

    const results = await Promise.all(promises);

    // Update telemetry from last received result with valid headers
    const lastResult = results[results.length - 1];
    if (lastResult) {
      setMetrics({
        limit: lastResult.headers.limit ?? metrics.limit,
        remaining: lastResult.headers.remaining ?? metrics.remaining,
        resetTimestamp: lastResult.headers.reset ?? metrics.resetTimestamp,
        lastStatus: lastResult.status,
      });
    }

    // Append to logs with unique IDs
    const newLogs = results.map((r, i) => ({
      ...r,
      id: `${Date.now()}-${i}-${Math.random()}`,
    }));

    setLogs((prev) => [...newLogs, ...prev].slice(0, 100));
    setLoading(false);

    const blockedCount = results.filter((r) => r.status === 429).length;
    if (blockedCount > 0) {
      addToast(`${blockedCount} request(s) blocked with 429 Too Many Requests!`, "error");
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    setMetrics({
      limit: null,
      remaining: null,
      resetTimestamp: null,
      lastStatus: null,
    });
    setSecondsUntilReset(null);
  };

  // Percentage remaining calculation
  const limit = metrics.limit || 100;
  const remaining = metrics.remaining !== null ? metrics.remaining : limit;
  const consumed = Math.max(0, limit - remaining);
  const percentUsed = Math.min(100, Math.round((consumed / limit) * 100));

  const isRateLimited = metrics.lastStatus === 429 || remaining === 0;

  const meterColor = isRateLimited
    ? "var(--status-error-text)"
    : percentUsed > 75
      ? "var(--status-warning-text)"
      : "var(--status-success-text)";

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 20px" }}>
      {/* Top Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Rate Limit Simulator</h1>
          <span className="badge badge-free" style={{ fontSize: "0.7rem" }}>
            Live
          </span>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Simulate traffic bursts against the atomic PostgreSQL rate limiting engine.
        </p>
      </div>

      {/* Grid Layout: Left Controls + Gauges, Right Request Console */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "20px", alignItems: "start" }}>
        {/* Left Column: API Key & Playground Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* API Key Configuration Card */}
          <div className="glass-panel" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Key size={16} color="var(--accent-primary)" />
              Target API Key
            </h3>

            {/* Selector dropdown if user has keys */}
            {keys && keys.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <label className="input-label">Saved Keys:</label>
                <select
                  className="input-field"
                  style={{ marginTop: "4px", cursor: "pointer" }}
                  value={selectedKeyId}
                  onChange={handleSelectKey}
                >
                  <option value="">-- Select a key from your account --</option>
                  {keys.map((k) => {
                    const hasSecret = Boolean(cachedSecrets[k.id]);
                    return (
                      <option key={k.id} value={k.id}>
                        {k.name} ({k.plan} — {k.requests_per_window} req/{k.window_seconds}s){hasSecret ? " ✓" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Custom/Raw API Key Input */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label className="input-label" style={{ margin: 0 }}>
                  API Key Secret (Header: <code>X-API-Key</code>):
                </label>
                {selectedKeyId && cachedSecrets[selectedKeyId] && (
                  <span style={{ fontSize: "0.75rem", color: "var(--status-success-text)", fontWeight: 500 }}>
                    ✓ Loaded
                  </span>
                )}
              </div>
              <input
                type="text"
                className="input-field"
                placeholder="rg_live_..."
                value={apiKeyInput}
                onChange={(e) => handleApiKeyInputChange(e.target.value)}
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
              />
            </div>
          </div>

          {/* Trigger Actions Card */}
          <div className="glass-panel" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Zap size={16} color="var(--accent-primary)" />
              Simulation Triggers
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {/* Single Request */}
              <button
                onClick={() => fireRequests(1)}
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: "10px 8px", flexDirection: "column", gap: "4px" }}
              >
                <Play size={16} />
                <span style={{ fontSize: "0.8rem" }}>Single (1x)</span>
              </button>

              {/* Burst 5 */}
              <button
                onClick={() => fireRequests(5)}
                disabled={loading}
                className="btn btn-secondary"
                style={{ padding: "10px 8px", flexDirection: "column", gap: "4px" }}
              >
                <Zap size={16} />
                <span style={{ fontSize: "0.8rem" }}>Burst (5x)</span>
              </button>

              {/* Spam 15 */}
              <button
                onClick={() => fireRequests(15)}
                disabled={loading}
                className="btn btn-secondary"
                style={{ padding: "10px 8px", flexDirection: "column", gap: "4px" }}
              >
                <Flame size={16} />
                <span style={{ fontSize: "0.8rem" }}>Spam (15x)</span>
              </button>
            </div>
          </div>

          {/* Live Telemetry Meter Card */}
          <div className="glass-panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock size={16} color="var(--accent-primary)" />
                Telemetry & Quota
              </h3>

              {/* Status Badge */}
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background: isRateLimited ? "var(--status-error-bg)" : "var(--status-success-bg)",
                  color: isRateLimited ? "var(--status-error-text)" : "var(--status-success-text)",
                  border: `1px solid ${isRateLimited ? "var(--status-error-border)" : "var(--status-success-border)"}`
                }}
              >
                {isRateLimited ? "429 RATE LIMITED" : "200 QUOTA HEALTHY"}
              </span>
            </div>

            {/* Quota Progress Bar */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Consumed Window Quota:</span>
                <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                  {consumed} / {limit} reqs ({percentUsed}%)
                </span>
              </div>
              <div style={{
                height: "8px",
                background: "var(--bg-primary)",
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
                border: "1px solid var(--border-subtle)"
              }}>
                <div style={{
                  height: "100%",
                  width: `${percentUsed}%`,
                  background: meterColor,
                  borderRadius: "var(--radius-full)",
                  transition: "width 0.2s ease"
                }} />
              </div>
            </div>

            {/* Telemetry Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "2px" }}>Remaining Capacity</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: meterColor, fontFamily: "var(--font-mono)" }}>
                  {remaining} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>reqs</span>
                </div>
              </div>

              <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "2px" }}>Window Reset In</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {secondsUntilReset !== null ? `${secondsUntilReset}s` : "60s"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Streaming Console */}
        <div>
          <RequestConsole logs={logs} onClearLogs={handleClearLogs} />
        </div>
      </div>
    </div>
  );
}
