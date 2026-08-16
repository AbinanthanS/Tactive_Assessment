import React, { useState } from "react";
import { X, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AuthModal({ isOpen, onClose }) {
  const { login, addToast } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Handle Login
        const res = await authApi.login(email, password);
        login(res.token, res.user);
        onClose();
      } else {
        // Handle Registration
        await authApi.register(email, password);
        addToast("Account created successfully! Logging you in...", "success");
        // Automatically login after registration
        const loginRes = await authApi.login(email, password);
        login(loginRes.token, loginRes.user);
        onClose();
      }
    } catch (err) {
      setError(err.data?.error || err.message || "Authentication failed");
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
            <ShieldCheck size={20} color="var(--accent-primary)" />
          </div>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "4px" }}>
            {isLogin ? "Sign In" : "Create Account"}
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {isLogin
              ? "Access your API keys and rate limit telemetry"
              : "Register to manage API credentials and quotas"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: "flex",
          background: "var(--bg-primary)",
          padding: "3px",
          borderRadius: "var(--radius-md)",
          marginBottom: "16px",
          border: "1px solid var(--border-subtle)"
        }}>
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(""); }}
            style={{
              flex: 1,
              padding: "6px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: isLogin ? "var(--bg-tertiary)" : "transparent",
              color: isLogin ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: 500,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "background var(--transition-fast)"
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(""); }}
            style={{
              flex: 1,
              padding: "6px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: !isLogin ? "var(--bg-tertiary)" : "transparent",
              color: !isLogin ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: 500,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "background var(--transition-fast)"
            }}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: "10px 14px",
            background: "var(--status-error-bg)",
            border: "1px solid var(--status-error-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--status-error-text)",
            fontSize: "0.85rem",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <X size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div style={{ position: "relative" }}>
              <Mail
                size={15}
                color="var(--text-muted)"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="email"
                className="input-field"
                placeholder="developer@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: "36px" }}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div style={{ position: "relative" }}>
              <Lock
                size={15}
                color="var(--text-muted)"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "36px" }}
                required
                minLength={8}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", marginTop: "8px", padding: "10px" }}
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                {isLogin ? "Sign In" : "Register"}
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
