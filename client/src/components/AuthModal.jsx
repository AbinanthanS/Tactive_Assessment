import React, { useState } from "react";
import { X, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
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
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
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
            <ShieldCheck size={26} color="#fff" />
          </div>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "6px" }}>
            {isLogin ? "Welcome Back" : "Create RateGuard Account"}
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {isLogin
              ? "Sign in to manage your API keys and inspect rate limit telemetry"
              : "Register to provision API keys with custom rate-limiting policies"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: "flex",
          background: "var(--bg-glass-input)",
          padding: "4px",
          borderRadius: "var(--radius-md)",
          marginBottom: "20px",
          border: "1px solid var(--border-subtle)"
        }}>
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(""); }}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: isLogin ? "var(--bg-tertiary)" : "transparent",
              color: isLogin ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all var(--transition-fast)"
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(""); }}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: !isLogin ? "var(--bg-tertiary)" : "transparent",
              color: !isLogin ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all var(--transition-fast)"
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
            color: "var(--status-error)",
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
                size={16}
                color="var(--text-muted)"
                style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="email"
                className="input-field"
                placeholder="developer@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: "42px" }}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                color="var(--text-muted)"
                style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "42px" }}
                required
                minLength={8}
              />
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Minimum 8 characters
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", marginTop: "8px", padding: "12px" }}
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                {isLogin ? "Sign In to Account" : "Create New Account"}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
