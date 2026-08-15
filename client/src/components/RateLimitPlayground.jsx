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

  // Update input if initialApiKey changes
  useEffect(() => {
    if (initialApiKey) {
      setApiKeyInput(initialApiKey);
    }
  }, [initialApiKey]);

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
    ? "var(--status-error)"
    : percentUsed > 75
      ? "var(--status-warning)"
      : "var(--status-success)";

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
      {/* Top Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <h1 style={{ fontSize: "1.75rem" }}>Rate Limit Simulator</h1>
          <span className="badge badge-pro" style={{ fontSize: "0.7rem" }}>
            Live Telemetry
          </span>
        </div>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          Test high-concurrency rate limiting against the PostgreSQL atomic window algorithm.
        </p>
      </div>

      {/* Grid Layout: Left Controls + Gauges, Right Request Console */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* Left Column: API Key & Playground Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* API Key Configuration Card */}
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Key size={18} color="var(--accent-primary)" />
              Select Target API Key
            </h3>

            {/* Selector dropdown if user has keys */}
            {keys && keys.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <label className="input-label">Saved Active Keys:</label>
                <select
                  className="input-field"
                  style={{ marginTop: "4px", background: "var(--bg-tertiary)", cursor: "pointer" }}
                  onChange={(e) => {
                    if (e.target.value) setApiKeyInput(e.target.value);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>-- Select a key from your account --</option>
                  {keys.map((k) => (
                    <option key={k.id} value={k.apiKey || ""}>
                      {k.name} ({k.plan} - {k.requests_per_window} req/{k.window_seconds}s)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom/Raw API Key Input */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">API Key Secret (Header: <code>X-API-Key</code>):</label>
              <input
                type="text"
                className="input-field"
                placeholder="rg_live_..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
              />
            </div>
          </div>

          {/* Trigger Actions Card */}
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Zap size={18} color="var(--accent-secondary)" />
              Simulation Triggers
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              {/* Single Request */}
              <button
                onClick={() => fireRequests(1)}
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: "14px 10px", flexDirection: "column", gap: "6px" }}
              >
                <Play size={20} />
                <span style={{ fontSize: "0.85rem" }}>Single (1x)</span>
              </button>

              {/* Burst 5 */}
              <button
                onClick={() => fireRequests(5)}
                disabled={loading}
                className="btn btn-secondary"
                style={{ padding: "14px 10px", flexDirection: "column", gap: "6px", borderColor: "rgba(6, 182, 212, 0.4)" }}
              >
                <Zap size={20} color="#06b6d4" />
                <span style={{ fontSize: "0.85rem", color: "#06b6d4" }}>Burst (5x)</span>
              </button>

              {/* Spam 15 */}
              <button
                onClick={() => fireRequests(15)}
                disabled={loading}
                className="btn btn-danger"
                style={{ padding: "14px 10px", flexDirection: "column", gap: "6px" }}
              >
                <Flame size={20} />
                <span style={{ fontSize: "0.85rem" }}>Spam (15x)</span>
              </button>
            </div>
          </div>

          {/* Live Telemetry Meter Card */}
          <div className={`glass-panel ${isRateLimited ? "toast-error" : ""}`} style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock size={18} color="var(--accent-primary)" />
                Quota & Window Telemetry
              </h3>

              {/* Status Badge */}
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  background: isRateLimited ? "var(--status-error-bg)" : "var(--status-success-bg)",
                  color: isRateLimited ? "var(--status-error)" : "var(--status-success)",
                  border: `1px solid ${isRateLimited ? "var(--status-error-border)" : "var(--status-success-border)"}`,
                  boxShadow: isRateLimited ? "var(--shadow-glow-rose)" : "var(--shadow-glow-emerald)"
                }}
              >
                {isRateLimited ? "429 RATE LIMITED" : "200 QUOTA HEALTHY"}
              </span>
            </div>

            {/* Quota Progress Bar */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Consumed Window Quota:</span>
                <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                  {consumed} / {limit} reqs ({percentUsed}%)
                </span>
              </div>
              <div style={{
                height: "12px",
                background: "rgba(0, 0, 0, 0.4)",
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
                border: "1px solid var(--border-subtle)",
                padding: "2px"
              }}>
                <div style={{
                  height: "100%",
                  width: `${percentUsed}%`,
                  background: meterColor,
                  borderRadius: "var(--radius-full)",
                  transition: "all 0.3s ease",
                  boxShadow: `0 0 10px ${meterColor}80`
                }} />
              </div>
            </div>

            {/* Telemetry Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ padding: "12px", borderRadius: "var(--radius-md)", background: "var(--bg-glass-input)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "2px" }}>Remaining Capacity</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: meterColor, fontFamily: "var(--font-mono)" }}>
                  {remaining} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>reqs</span>
                </div>
              </div>

              <div style={{ padding: "12px", borderRadius: "var(--radius-md)", background: "var(--bg-glass-input)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "2px" }}>Window Reset In</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
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
