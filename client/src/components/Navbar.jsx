import React, { useState, useEffect } from "react";
import { Shield, Key, Activity, User, LogOut } from "lucide-react";
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
      background: "var(--bg-secondary)",
      borderBottom: "1px solid var(--border-subtle)",
      position: "sticky",
      top: 0,
      zIndex: 100
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "32px",
          height: "32px",
          borderRadius: "var(--radius-sm)",
          background: "var(--accent-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Shield size={18} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              RateGuard
            </span>
            <span className="badge badge-free" style={{ fontSize: "0.65rem", padding: "1px 6px" }}>
              v1.0
            </span>
          </div>
        </div>
      </div>

      {/* Center Nav Tabs */}
      {user && (
        <div style={{
          display: "flex",
          alignItems: "center",
          background: "var(--bg-primary)",
          padding: "3px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)"
        }}>
          <button
            onClick={() => setActiveTab("keys")}
            className="btn btn-sm"
            style={{
              background: activeTab === "keys" ? "var(--bg-tertiary)" : "transparent",
              color: activeTab === "keys" ? "var(--text-primary)" : "var(--text-secondary)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "5px 14px"
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
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "5px 14px"
            }}
          >
            <Activity size={14} />
            Simulator
          </button>
        </div>
      )}

      {/* Right Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Backend Status Indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-primary)",
          border: "1px solid var(--border-subtle)",
          fontSize: "0.75rem",
          color: "var(--text-secondary)"
        }}>
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: serverHealthy === true ? "var(--status-success-text)" : serverHealthy === false ? "var(--status-error-text)" : "var(--text-muted)"
            }}
          />
          <span>API: {serverHealthy === true ? "Online (5000)" : serverHealthy === false ? "Offline" : "Checking..."}</span>
        </div>

        {/* User Account / Auth Button */}
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-subtle)"
            }}>
              <User size={13} color="var(--accent-primary)" />
              <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-primary)" }}>
                {user.email ? user.email.split("@")[0] : "Developer"}
              </span>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary btn-sm"
              title="Logout"
              style={{ padding: "6px 8px" }}
            >
              <LogOut size={14} />
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
