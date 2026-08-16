import React, { useState, useEffect } from "react";
import { Shield, Key, Activity, User, LogOut, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/api";

export default function Navbar({ onOpenAuth, activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const [serverHealthy, setServerHealthy] = useState(null);

  useEffect(() => {
    let interval;
    async function check() {
      try {
        await authApi.checkHealth();
        setServerHealthy(true);
      } catch (err) {
        setServerHealthy(false);
      }
    }
    check();
    interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 28px",
      background: "#0d0d0d",
      borderBottom: "1px solid var(--border-subtle)",
      position: "sticky",
      top: 0,
      zIndex: 100
    }}>
      {/* Brand / Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          background: "#1e1e2e",
          border: "1px solid rgba(99,102,241,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Shield size={18} color="#818cf8" />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.15rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)"
            }}>
              Rate<span className="gradient-text">Guard</span>
            </span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "-2px" }}>
            High-Throughput API Gateway & Rate Limiter
          </p>
        </div>
      </div>

      {/* Center Nav Tabs */}
      {user && (
        <div style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.04)",
          padding: "4px",
          borderRadius: "var(--radius-full)",
          border: "1px solid var(--border-subtle)"
        }}>
          <button
            onClick={() => setActiveTab("keys")}
            className="btn btn-sm"
            style={{
              background: activeTab === "keys" ? "var(--bg-tertiary)" : "transparent",
              color: activeTab === "keys" ? "var(--text-primary)" : "var(--text-secondary)",
              border: activeTab === "keys" ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid transparent",
              borderRadius: "var(--radius-full)",
              padding: "6px 16px"
            }}
          >
            <Key size={14} />
            API Keys
          </button>
          <button
            onClick={() => setActiveTab("playground")}
            className="btn btn-sm"
            style={{
              background: activeTab === "playground" ? "var(--bg-tertiary)" : "transparent",
              color: activeTab === "playground" ? "var(--text-primary)" : "var(--text-secondary)",
              border: activeTab === "playground" ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid transparent",
              borderRadius: "var(--radius-full)",
              padding: "6px 16px"
            }}
          >
            <Activity size={14} />
            Live Playground
          </button>
        </div>
      )}

      {/* Right Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Backend Status Indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          borderRadius: "var(--radius-full)",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid var(--border-subtle)",
          fontSize: "0.75rem",
          color: "var(--text-secondary)"
        }}>
          <span
            className={serverHealthy ? "live-indicator" : ""}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: serverHealthy === true ? "var(--status-success)" : serverHealthy === false ? "var(--status-error)" : "var(--text-muted)"
            }}
          />
          <span>API: {serverHealthy === true ? "Connected (Port 5000)" : serverHealthy === false ? "Offline" : "Checking..."}</span>
        </div>

        {/* User Account / Auth Button */}
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)"
            }}>
              <User size={14} color="var(--text-muted)" />
              <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                {user.email ? user.email.split("@")[0] : "Developer"}
              </span>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary btn-sm"
              title="Logout"
              style={{ padding: "8px" }}
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button onClick={onOpenAuth} className="btn btn-primary btn-sm">
            Sign In / Register
          </button>
        )}
      </div>
    </nav>
  );
}
