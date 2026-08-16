import React, { useState } from "react";
import { Terminal, Trash2, ChevronDown, ChevronRight } from "lucide-react";

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
        padding: "12px 16px",
        background: "var(--bg-tertiary)",
        borderBottom: "1px solid var(--border-subtle)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Terminal size={15} color="var(--accent-primary)" />
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
            Live Request Stream
          </span>
          <span className="badge" style={{ background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: "0.7rem", padding: "1px 6px" }}>
            {logs.length} events
          </span>
        </div>

        {logs.length > 0 && (
          <button
            onClick={onClearLogs}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: "0.75rem", padding: "3px 8px" }}
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
        padding: "10px",
        fontFamily: "var(--font-mono)",
        fontSize: "0.8rem",
        minHeight: "340px",
        maxHeight: "500px",
        background: "var(--bg-primary)"
      }}>
        {logs.length === 0 ? (
          <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            <Terminal size={28} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: "8px" }} />
            <p style={{ fontSize: "0.85rem" }}>No requests logged yet</p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Click Single (1x) or Burst (5x) to test rate limit responses.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {logs.map((log) => {
              const is200 = log.status === 200;
              const is429 = log.status === 429;
              const is401 = log.status === 401;
              const isExpanded = expandedLogId === log.id;

              const statusColor = is200
                ? "var(--status-success-text)"
                : is429
                  ? "var(--status-error-text)"
                  : is401
                    ? "var(--status-warning-text)"
                    : "var(--text-muted)";

              const statusBg = is200
                ? "var(--status-success-bg)"
                : is429
                  ? "var(--status-error-bg)"
                  : is401
                    ? "var(--status-warning-bg)"
                    : "var(--bg-tertiary)";

              return (
                <div
                  key={log.id}
                  style={{
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${isExpanded ? "var(--border-focus)" : "var(--border-subtle)"}`,
                    background: isExpanded ? "var(--bg-secondary)" : "var(--bg-tertiary)",
                    overflow: "hidden"
                  }}
                >
                  {/* Log Summary Row */}
                  <div
                    onClick={() => toggleExpand(log.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      userSelect: "none"
                    }}
                  >
                    {isExpanded ? <ChevronDown size={13} color="var(--text-muted)" /> : <ChevronRight size={13} color="var(--text-muted)" />}

                    {/* Timestamp */}
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {log.timestamp}
                    </span>

                    {/* Method */}
                    <span style={{ fontWeight: 600, color: "var(--accent-primary)" }}>
                      GET
                    </span>

                    {/* Path */}
                    <span style={{ color: "var(--text-primary)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      /api/demo
                    </span>

                    {/* Status Code Badge */}
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: "var(--radius-sm)",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        color: statusColor,
                        background: statusBg,
                        border: `1px solid ${statusColor}40`
                      }}
                    >
                      {log.status} {log.statusText || (is200 ? "OK" : is429 ? "429" : "")}
                    </span>

                    {/* Latency */}
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {log.latency}ms
                    </span>
                  </div>

                  {/* Expanded Telemetry Details */}
                  {isExpanded && (
                    <div style={{
                      padding: "10px 12px",
                      background: "var(--bg-primary)",
                      borderTop: "1px solid var(--border-subtle)",
                      fontSize: "0.75rem"
                    }}>
                      {/* Headers Section */}
                      <div style={{ marginBottom: "8px" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "4px", fontWeight: 600 }}>
                          Response Headers:
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 10px", color: "var(--text-secondary)" }}>
                          <span style={{ color: "var(--accent-primary)" }}>X-RateLimit-Limit:</span>
                          <span>{log.headers?.limit ?? "N/A"}</span>

                          <span style={{ color: "var(--accent-primary)" }}>X-RateLimit-Remaining:</span>
                          <span style={{ fontWeight: 600, color: log.headers?.remaining === 0 ? "var(--status-error-text)" : "var(--text-primary)" }}>
                            {log.headers?.remaining ?? "N/A"}
                          </span>

                          <span style={{ color: "var(--accent-primary)" }}>X-RateLimit-Reset:</span>
                          <span>{log.headers?.reset ? `${log.headers.reset} (${new Date(log.headers.reset * 1000).toLocaleTimeString()})` : "N/A"}</span>

                          {log.headers?.retryAfter && (
                            <>
                              <span style={{ color: "var(--status-error-text)" }}>Retry-After:</span>
                              <span style={{ fontWeight: 600, color: "var(--status-error-text)" }}>{log.headers.retryAfter}s</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* JSON Body Section */}
                      <div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "4px", fontWeight: 600 }}>
                          Response Payload:
                        </div>
                        <pre style={{
                          background: "var(--bg-secondary)",
                          padding: "6px 8px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-primary)",
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
