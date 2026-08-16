import React, { useState, useEffect } from "react";
import { Copy, Check, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "../context/AuthContext";

export default function KeySecretModal({ apiKeyData, onClose, onGoToPlayground }) {
  const { addToast } = useAuth();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Trigger celebratory confetti on key creation
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // Ignore if confetti fails
    }
  }, []);

  if (!apiKeyData) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKeyData.apiKey);
    setCopied(true);
    addToast("API Key copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: "560px" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            background: "var(--accent-gradient-emerald)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "12px",
            boxShadow: "var(--shadow-glow-emerald)"
          }}>
            <ShieldCheck size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: "1.45rem", marginBottom: "4px" }}>
            API Key Generated
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            For key <strong style={{ color: "var(--text-primary)" }}>{apiKeyData.name}</strong> ({apiKeyData.plan} Tier)
          </p>
        </div>

        {/* Security Warning Box */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          padding: "14px",
          background: "var(--status-warning-bg)",
          border: "1px solid var(--status-warning-border)",
          borderRadius: "var(--radius-md)",
          marginBottom: "20px"
        }}>
          <AlertTriangle size={20} color="var(--status-warning)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "0.82rem", color: "#fcd34d", lineHeight: "1.4" }}>
            <strong>Save this key immediately!</strong> For security, this secret token is only displayed once and cannot be recovered later.
          </div>
        </div>

        {/* API Key Box with 1-Click Copy */}
        <div style={{ marginBottom: "24px" }}>
          <label className="input-label" style={{ marginBottom: "8px", display: "block" }}>
            Raw API Secret Key:
          </label>
          <div style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid var(--border-glow)",
            borderRadius: "var(--radius-md)",
            padding: "8px 12px",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)"
          }}>
            <code style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              color: "#38bdf8",
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
                  <Check size={14} color="var(--status-success)" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy Key
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "18px" }}>
          <button onClick={onClose} className="btn btn-secondary">
            Done & Close
          </button>
          <button
            onClick={() => {
              onClose();
              if (onGoToPlayground) onGoToPlayground(apiKeyData.apiKey);
            }}
            className="btn btn-primary"
          >
            Test in Live Playground
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
