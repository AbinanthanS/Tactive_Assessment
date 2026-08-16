import React, { useState } from "react";
import { Copy, Check, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function KeySecretModal({ apiKeyData, onClose, onGoToPlayground }) {
  const { addToast } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!apiKeyData) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKeyData.apiKey);
    setCopied(true);
    addToast("API Key copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: "520px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "var(--radius-md)",
            background: "var(--status-success-bg)",
            border: "1px solid var(--status-success-border)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "12px"
          }}>
            <ShieldCheck size={24} color="var(--status-success-text)" />
          </div>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "4px" }}>
            API Key Generated
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Key: <strong style={{ color: "var(--text-primary)" }}>{apiKeyData.name}</strong> ({apiKeyData.plan} Tier)
          </p>
        </div>

        {/* Security Warning Box */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          padding: "12px",
          background: "var(--status-warning-bg)",
          border: "1px solid var(--status-warning-border)",
          borderRadius: "var(--radius-md)",
          marginBottom: "18px"
        }}>
          <AlertTriangle size={18} color="var(--status-warning-text)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "0.8rem", color: "var(--status-warning-text)", lineHeight: "1.4" }}>
            <strong>Save this key now.</strong> For security, this secret token is only displayed once and cannot be recovered later.
          </div>
        </div>

        {/* API Key Box with 1-Click Copy */}
        <div style={{ marginBottom: "20px" }}>
          <label className="input-label" style={{ marginBottom: "6px", display: "block" }}>
            Secret Token:
          </label>
          <div style={{
            display: "flex",
            alignItems: "center",
            background: "var(--bg-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "8px 12px"
          }}>
            <code style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              color: "var(--accent-primary)",
              flex: 1,
              overflowX: "auto",
              padding: "4px",
              whiteSpace: "nowrap"
            }}>
              {apiKeyData.apiKey}
            </code>
            <button
              onClick={handleCopy}
              className={`btn btn-sm ${copied ? "btn-secondary" : "btn-primary"}`}
              style={{ flexShrink: 0, marginLeft: "8px" }}
            >
              {copied ? (
                <>
                  <Check size={14} color="var(--status-success-text)" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Done & Close
          </button>
          <button
            onClick={() => {
              onClose();
              if (onGoToPlayground) onGoToPlayground(apiKeyData.apiKey);
            }}
            className="btn btn-primary btn-sm"
          >
            Open in Playground
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
