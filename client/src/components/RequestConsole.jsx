import React, { useState } from "react";
import { Terminal, Trash2, CheckCircle2, AlertOctagon, AlertTriangle, Clock, ChevronDown, ChevronRight } from "lucide-react";

export default function RequestConsole({ logs, onClearLogs }) {
  const [expandedLogId, setExpandedLogId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="glass-panel" style={{ overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Console Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 20px",
        background: "rgba(0, 0, 0, 0.4)",
        borderBottom: "1px solid var(--border-subtle)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Terminal size={16} color="var(--accent-secondary)" />
          <span style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.02em" }}>
            Live Request Stream & Telemetry
          </span>
          <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", fontSize: "0.7rem", padding: "1px 6px" }}>
            {logs.length} events
          </span>
        </div>

        {logs.length > 0 && (
          <button
            onClick={onClearLogs}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: "0.75rem", padding: "4px 8px" }}
          >
            <Trash2 size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Console Body */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "12px",
        fontFamily: "var(--font-mono)",
        fontSize: "0.82rem",
        minHeight: "360px",
        maxHeight: "520px",
        background: "rgba(5, 8, 15, 0.95)"
      }}>
        {logs.length === 0 ? (
          <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            <Terminal size={32} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: "8px" }} />
            <p style={{ fontSize: "0.85rem" }}>No requests captured yet</p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Click "Send Single Request" or "Simulate Burst" to trigger live API telemetry.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {logs.map((log) => {
              const is200 = log.status === 200;
              const is429 = log.status === 429;
              const is401 = log.status === 401;
              const isExpanded = expandedLogId === log.id;

              const statusColor = is200
                ? "var(--status-success)"
                : is429
                  ? "var(--status-error)"
                  : is401
                    ? "var(--status-warning)"
                    : "var(--text-muted)";

              const statusBg = is200
                ? "var(--status-success-bg)"
                : is429
                  ? "var(--status-error-bg)"
                  : is401
                    ? "var(--status-warning-bg)"
                    : "rgba(255,255,255,0.05)";

              return (
                <div
                  key={log.id}
                  style={{
                    borderRadius: "6px",
                    border: `1px solid ${isExpanded ? "rgba(99, 102, 241, 0.3)" : "rgba(255, 255, 255, 0.05)"}`,
                    background: isExpanded ? "rgba(18, 24, 40, 0.9)" : "rgba(11, 15, 26, 0.6)",
                    overflow: "hidden",
                    transition: "all var(--transition-fast)"
                  }}
                >
                  {/* Log Summary Row */}
                  <div
                    onClick={() => toggleExpand(log.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      cursor: "pointer",
                      userSelect: "none"
                    }}
                  >
                    {isExpanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}

                    {/* Timestamp */}
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {log.timestamp}
                    </span>

                    {/* Method */}
                    <span style={{ fontWeight: 700, color: "var(--accent-secondary)" }}>
                      GET
                    </span>

                    {/* Path */}
                    <span style={{ color: "var(--text-primary)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      /api/demo
                    </span>

                    {/* Status Code Badge */}
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        color: statusColor,
                        background: statusBg,
                        border: `1px solid ${statusColor}40`
                      }}
                    >
                      {log.status} {log.statusText || (is200 ? "OK" : is429 ? "TOO MANY REQUESTS" : is401 ? "UNAUTHORIZED" : "")}
                    </span>

                    {/* Latency */}
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {log.latency}ms
                    </span>
                  </div>

                  {/* Expanded Telemetry Details */}
                  {isExpanded && (
                    <div style={{
                      padding: "12px",
                      background: "rgba(0, 0, 0, 0.4)",
                      borderTop: "1px solid var(--border-subtle)",
                      fontSize: "0.78rem"
                    }}>
                      {/* Headers Section */}
                      <div style={{ marginBottom: "10px" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "4px", fontWeight: 700 }}>
                          Response Headers:
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", color: "var(--text-secondary)" }}>
                          <span style={{ color: "#38bdf8" }}>X-RateLimit-Limit:</span>
                          <span>{log.headers?.limit ?? "N/A"}</span>

                          <span style={{ color: "#38bdf8" }}>X-RateLimit-Remaining:</span>
                          <span style={{ fontWeight: 700, color: log.headers?.remaining === 0 ? "var(--status-error)" : "var(--text-primary)" }}>
                            {log.headers?.remaining ?? "N/A"}
                          </span>

                          <span style={{ color: "#38bdf8" }}>X-RateLimit-Reset:</span>
                          <span>{log.headers?.reset ? `${log.headers.reset} (${new Date(log.headers.reset * 1000).toLocaleTimeString()})` : "N/A"}</span>

                          {log.headers?.retryAfter && (
                            <>
                              <span style={{ color: "var(--status-error)" }}>Retry-After:</span>
                              <span style={{ fontWeight: 700, color: "var(--status-error)" }}>{log.headers.retryAfter} seconds</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* JSON Body Section */}
                      <div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "4px", fontWeight: 700 }}>
                          Response Payload:
                        </div>
                        <pre style={{
                          background: "rgba(0, 0, 0, 0.5)",
                          padding: "8px 10px",
                          borderRadius: "4px",
                          color: is200 ? "#a7f3d0" : is429 ? "#fecdd3" : "#fde68a",
                          overflowX: "auto"
                        }}>
                          {JSON.stringify(log.body, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
