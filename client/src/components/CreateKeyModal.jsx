import React, { useState } from "react";
import { X, Key, Zap, Shield, Check } from "lucide-react";
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
            top: "20px",
            right: "20px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: "6px",
            display: "flex",
            alignItems: "center"
          }}
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "var(--accent-gradient)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "12px",
            boxShadow: "0 0 25px rgba(99, 102, 241, 0.4)"
          }}>
            <Key size={24} color="#fff" />
          </div>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "4px" }}>Provision New API Key</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Configure client credentials and rate limiting tier
          </p>
        </div>

        {error && (
          <div style={{
            padding: "10px 14px",
            background: "var(--status-error-bg)",
            border: "1px solid var(--status-error-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--status-error)",
            fontSize: "0.85rem",
            marginBottom: "16px"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Key Name Input */}
          <div className="input-group">
            <label className="input-label">Key Name / Client Description</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Mobile App Production or Webhook Service"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Plan Selector */}
          <div className="input-group">
            <label className="input-label">Rate Limiting Tier</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "4px" }}>
              {/* Free Tier Card */}
              <div
                onClick={() => setPlan("FREE")}
                style={{
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  background: plan === "FREE" ? "rgba(56, 189, 248, 0.1)" : "var(--bg-glass-input)",
                  border: plan === "FREE" ? "2px solid #38bdf8" : "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  transition: "all var(--transition-normal)",
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span className="badge badge-free">FREE</span>
                  {plan === "FREE" && <Check size={16} color="#38bdf8" />}
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  100 req <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)" }}>/ 60s</span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Standard tier for lightweight services & developer testing.
                </p>
              </div>

              {/* Pro Tier Card */}
              <div
                onClick={() => setPlan("PRO")}
                style={{
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  background: plan === "PRO" ? "rgba(217, 70, 239, 0.12)" : "var(--bg-glass-input)",
                  border: plan === "PRO" ? "2px solid #d946ef" : "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  transition: "all var(--transition-normal)",
                  position: "relative",
                  boxShadow: plan === "PRO" ? "0 0 15px rgba(217, 70, 239, 0.25)" : "none"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span className="badge badge-pro">PRO TIER</span>
                  {plan === "PRO" && <Check size={16} color="#d946ef" />}
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  1,000 req <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)" }}>/ 60s</span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  High-throughput rate limit for production systems.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Generating..." : "Generate API Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
