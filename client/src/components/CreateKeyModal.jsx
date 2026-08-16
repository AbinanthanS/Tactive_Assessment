import React, { useState } from "react";
import { X, Key, Check } from "lucide-react";
import { keysApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function CreateKeyModal({ isOpen, onClose, onKeyCreated }) {
  const { addToast } = useAuth();
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("FREE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a name for this API key");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await keysApi.createKey(name.trim(), plan);
      addToast(`API Key "${name}" created successfully!`, "success");
      onKeyCreated(res.apiKey);
      setName("");
      setPlan("FREE");
    } catch (err) {
      setError(err.data?.error || err.message || "Failed to create API key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center"
          }}
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-subtle)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "10px"
          }}>
            <Key size={20} color="var(--accent-primary)" />
          </div>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "4px" }}>Generate API Key</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Configure key name and quota tier
          </p>
        </div>

        {error && (
          <div style={{
            padding: "10px 14px",
            background: "var(--status-error-bg)",
            border: "1px solid var(--status-error-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--status-error-text)",
            fontSize: "0.85rem",
            marginBottom: "16px"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Key Name Input */}
          <div className="input-group">
            <label className="input-label">Key Name / Identifier</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Production Service"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Plan Selector */}
          <div className="input-group">
            <label className="input-label">Rate Limiting Tier</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "4px" }}>
              {/* Free Tier Card */}
              <div
                onClick={() => setPlan("FREE")}
                style={{
                  padding: "14px",
                  borderRadius: "var(--radius-md)",
                  background: plan === "FREE" ? "var(--bg-tertiary)" : "var(--bg-primary)",
                  border: plan === "FREE" ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  transition: "border-color var(--transition-fast)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span className="badge badge-free">FREE</span>
                  {plan === "FREE" && <Check size={14} color="var(--accent-primary)" />}
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  100 req <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)" }}>/ 60s</span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Standard tier for testing and development.
                </p>
              </div>

              {/* Pro Tier Card */}
              <div
                onClick={() => setPlan("PRO")}
                style={{
                  padding: "14px",
                  borderRadius: "var(--radius-md)",
                  background: plan === "PRO" ? "var(--bg-tertiary)" : "var(--bg-primary)",
                  border: plan === "PRO" ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  transition: "border-color var(--transition-fast)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span className="badge badge-pro">PRO</span>
                  {plan === "PRO" && <Check size={14} color="var(--accent-primary)" />}
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  1,000 req <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)" }}>/ 60s</span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  High-throughput tier for production workloads.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? "Creating..." : "Create API Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
