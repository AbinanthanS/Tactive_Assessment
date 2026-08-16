import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import CreateKeyModal from "./components/CreateKeyModal";
import KeySecretModal from "./components/KeySecretModal";
import KeyManagement from "./components/KeyManagement";
import RateLimitPlayground from "./components/RateLimitPlayground";
import ToastContainer from "./components/ToastContainer";
import { keysApi } from "./services/api";
import { Shield, Key, Zap, Lock, ArrowRight, Activity } from "lucide-react";

function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("keys");
  const [keys, setKeys] = useState([]);
  const [keysLoading, setKeysLoading] = useState(false);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdSecretData, setCreatedSecretData] = useState(null);
  const [playgroundApiKey, setPlaygroundApiKey] = useState("");

  const fetchKeys = async () => {
    if (!user) return;
    setKeysLoading(true);
    try {
      const data = await keysApi.getKeys();
      setKeys(data.apiKeys || []);
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    } finally {
      setKeysLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchKeys();
    } else {
      setKeys([]);
    }
  }, [user]);

  const handleKeyCreated = (newKeyData) => {
    setIsCreateOpen(false);
    setCreatedSecretData(newKeyData);
    if (newKeyData?.id && newKeyData?.apiKey) {
      try {
        const stored = JSON.parse(localStorage.getItem("rg_cached_secrets") || "{}");
        stored[newKeyData.id] = newKeyData.apiKey;
        localStorage.setItem("rg_cached_secrets", JSON.stringify(stored));
      } catch (e) {
        console.error("Failed to cache key secret", e);
      }
    }
    fetchKeys();
  };

  const handleGoToPlayground = (apiKey) => {
    setPlaygroundApiKey(apiKey);
    setActiveTab("playground");
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
          Initializing RateGuard Gateway...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar
        onOpenAuth={() => setIsAuthOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {!user ? (
          /* Unauthenticated Landing / Demo Hero */
          <div style={{ maxWidth: "800px", margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "var(--radius-full)",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontSize: "0.8rem",
              fontWeight: 500,
              marginBottom: "20px"
            }}>
              <Zap size={14} color="var(--accent-primary)" />
              PostgreSQL Atomic Fixed-Window Rate Limiter
            </div>

            <h1 style={{ fontSize: "2.5rem", lineHeight: 1.2, marginBottom: "16px" }}>
              API Gateway & Rate Limiting Platform
            </h1>

            <p style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto 32px", lineHeight: "1.6" }}>
              Protect backend services against traffic spikes with atomic in-database rate limiting, cryptographic SHA-256 key management, and standard RFC 6585 headers.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginBottom: "48px" }}>
              <button onClick={() => setIsAuthOpen(true)} className="btn btn-primary">
                <Lock size={16} />
                Get Started / Sign In
              </button>
              <button
                onClick={() => setActiveTab("playground")}
                className="btn btn-secondary"
              >
                <Activity size={16} />
                Open Simulator
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", textAlign: "left" }}>
              <div className="glass-panel" style={{ padding: "20px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                  <Shield size={18} color="var(--accent-primary)" />
                </div>
                <h3 style={{ fontSize: "1rem", marginBottom: "4px" }}>SHA-256 Key Hashing</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Zero raw key storage. Secrets are displayed once and stored strictly as SHA-256 hashes in PostgreSQL.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: "20px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                  <Zap size={18} color="var(--accent-primary)" />
                </div>
                <h3 style={{ fontSize: "1rem", marginBottom: "4px" }}>Atomic Window Engine</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  High-concurrency <code>ON CONFLICT DO UPDATE</code> upserts guarantee precision counter tracking.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: "20px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                  <Key size={18} color="var(--accent-primary)" />
                </div>
                <h3 style={{ fontSize: "1rem", marginBottom: "4px" }}>Tiered Quotas</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Flexible policy controls for Free (100 req/min) and Pro (1,000 req/min) with instant 429 throttling.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <>
            {activeTab === "keys" ? (
              <KeyManagement
                keys={keys}
                loading={keysLoading}
                onRefresh={fetchKeys}
                onOpenCreate={() => setIsCreateOpen(true)}
                onSelectKeyForPlayground={handleGoToPlayground}
              />
            ) : (
              <RateLimitPlayground
                keys={keys}
                initialApiKey={playgroundApiKey}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: "center",
        padding: "24px",
        borderTop: "1px solid var(--border-subtle)",
        color: "var(--text-muted)",
        fontSize: "0.8rem"
      }}>
        RateGuard Assessment Project — Built with Node.js, Express, PostgreSQL & React
      </footer>

      {/* Modals & Toasts */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <CreateKeyModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onKeyCreated={handleKeyCreated}
      />
      <KeySecretModal
        apiKeyData={createdSecretData}
        onClose={() => setCreatedSecretData(null)}
        onGoToPlayground={handleGoToPlayground}
      />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
