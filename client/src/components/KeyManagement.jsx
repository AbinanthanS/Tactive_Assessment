import React, { useState } from "react";
import { Plus, Key, Trash2, Shield, Calendar, RefreshCw, AlertCircle, CheckCircle2, Zap } from "lucide-react";
import { keysApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function KeyManagement({ keys, loading, onRefresh, onOpenCreate, onSelectKeyForPlayground }) {
  const { addToast } = useAuth();
  const [revokingId, setRevokingId] = useState(null);
  const [confirmRevokeKey, setConfirmRevokeKey] = useState(null);

  const handleRevoke = async () => {
    if (!confirmRevokeKey) return;

    setRevokingId(confirmRevokeKey.id);
    try {
      await keysApi.revokeKey(confirmRevokeKey.id);
      addToast(`API Key "${confirmRevokeKey.name}" revoked`, "success");
      setConfirmRevokeKey(null);
      onRefresh();
    } catch (err) {
      addToast(err.message || "Failed to revoke key", "error");
    } finally {
      setRevokingId(null);
    }
  };

  const activeCount = keys.filter(k => k.status === "ACTIVE").length;
  const proCount = keys.filter(k => k.plan === "PRO").length;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 20px" }}>
      {/* Top Banner / Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {/* Metric 1 */}
        <div className="glass-panel" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>Active API Keys</span>
            <div style={{ padding: "6px", borderRadius: "var(--radius-sm)", background: "var(--bg-tertiary)" }}>
              <Key size={16} color="var(--accent-primary)" />
            </div>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{activeCount}</div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
            PostgreSQL provisioned
          </p>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>Pro Tier Quotas</span>
            <div style={{ padding: "6px", borderRadius: "var(--radius-sm)", background: "var(--bg-tertiary)" }}>
              <Shield size={16} color="var(--accent-primary)" />
            </div>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{proCount}</div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
            1,000 req/min capacity
          </p>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>Engine Strategy</span>
            <div style={{ padding: "6px", borderRadius: "var(--radius-sm)", background: "var(--bg-tertiary)" }}>
              <CheckCircle2 size={16} color="var(--status-success-text)" />
            </div>
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "4px" }}>Atomic Fixed Window</div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Epoch alignment
          </p>
        </div>
      </div>

      {/* Main Keys Card */}
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        {/* Table Header Controls */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", marginBottom: "2px" }}>API Credentials</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Keys authenticate client requests to protected endpoints
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onRefresh} className="btn btn-secondary btn-sm" disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : ""} />
              Refresh
            </button>
            <button onClick={onOpenCreate} className="btn btn-primary btn-sm">
              <Plus size={16} />
              New API Key
            </button>
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
            Loading API keys...
          </div>
        ) : keys.length === 0 ? (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px"
            }}>
              <Key size={28} color="var(--text-muted)" />
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "6px" }}>No API Keys Generated Yet</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "380px", margin: "0 auto 20px" }}>
              Provision an API key to access protected routes and simulate rate limiting policies.
            </p>
            <button onClick={onOpenCreate} className="btn btn-primary btn-sm">
              <Plus size={15} />
              Create First API Key
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "rgba(0, 0, 0, 0.2)", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "14px 24px", fontWeight: 600 }}>Name & Identifier</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Plan Tier</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Rate Quota</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Created</th>
                  <th style={{ padding: "14px 24px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => {
                  const isActive = key.status === "ACTIVE";
                  const isPro = key.plan === "PRO";

                  return (
                    <tr
                      key={key.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        transition: "background var(--transition-fast)"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Name & ID */}
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "3px" }}>
                          {key.name}
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          id: {key.id.slice(0, 8)}...{key.id.slice(-6)}
                        </div>
                      </td>

                      {/* Plan */}
                      <td style={{ padding: "16px 20px" }}>
                        <span className={isPro ? "badge badge-pro" : "badge badge-free"}>
                          {key.plan}
                        </span>
                      </td>

                      {/* Quota */}
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {key.requests_per_window} req
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          per {key.window_seconds}s window
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "16px 20px" }}>
                        <span className={isActive ? "badge badge-active" : "badge badge-disabled"}>
                          {key.status}
                        </span>
                      </td>

                      {/* Created */}
                      <td style={{ padding: "16px 20px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {new Date(key.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        {isActive && (
                          <div style={{ display: "inline-flex", gap: "8px" }}>
                            <button
                              onClick={() => {
                                const cached = JSON.parse(localStorage.getItem("rg_cached_secrets") || "{}");
                                const secret = cached[key.id] || "";
                                if (onSelectKeyForPlayground) {
                                  onSelectKeyForPlayground(secret);
                                }
                              }}
                              className="btn btn-secondary btn-sm"
                              title="Test this key in Live Playground"
                              style={{ padding: "6px 10px", borderColor: "rgba(99, 102, 241, 0.3)" }}
                            >
                              <Zap size={14} color="var(--accent-primary)" />
                              Test
                            </button>
                            <button
                              onClick={() => setConfirmRevokeKey(key)}
                              className="btn btn-danger btn-sm"
                              title="Revoke Key"
                              style={{ padding: "6px 10px" }}
                            >
                              <Trash2 size={14} />
                              Revoke
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revoke Confirmation Modal */}
      {confirmRevokeKey && (
        <div className="modal-backdrop" onClick={() => setConfirmRevokeKey(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
            <div style={{ textAlign: "center", marginBottom: "18px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "var(--status-error-bg)",
                border: "1px solid var(--status-error-border)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px"
              }}>
                <AlertCircle size={24} color="var(--status-error)" />
              </div>
              <h3 style={{ fontSize: "1.25rem", marginBottom: "4px" }}>Revoke API Key?</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Are you sure you want to revoke <strong>"{confirmRevokeKey.name}"</strong>? Any services using this key will immediately receive <code>401 Unauthorized</code> errors.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
              <button
                onClick={() => setConfirmRevokeKey(null)}
                className="btn btn-secondary btn-sm"
                disabled={revokingId}
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                className="btn btn-danger btn-sm"
                disabled={revokingId}
              >
                {revokingId ? "Revoking..." : "Yes, Revoke Key"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
