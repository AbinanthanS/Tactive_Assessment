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
          <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              borderRadius: "var(--radius-full)",
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              color: "var(--accent-primary)",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: "24px"
            }}>
              <Zap size={15} />
              Atomic PostgreSQL Fixed Window Rate Limiting
            </div>

            <h1 style={{ fontSize: "3.2rem", lineHeight: 1.15, marginBottom: "20px" }}>
              Enterprise API Security & <br />
              <span className="gradient-text">Precision Rate Limiting</span>
            </h1>

            <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", maxWidth: "680px", margin: "0 auto 36px", lineHeight: "1.6" }}>
              RateGuard protects your backend APIs against bursts, DDoS, and quota overages with microsecond precision, cryptographic SHA-256 key hashing, and RFC-compliant response headers.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap", marginBottom: "64px" }}>
              <button onClick={() => setIsAuthOpen(true)} className="btn btn-primary btn-lg">
                <Lock size={18} />
                Get Started / Sign In
              </button>
              <button
                onClick={() => {
                  setActiveTab("playground");
                  // Allow trying playground with a dummy or test key
                }}
                className="btn btn-secondary btn-lg"
              >
                <Activity size={18} />
                Explore Rate Limit Simulator
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", textAlign: "left" }}>
              <div className="glass-panel" style={{ padding: "24px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(99, 102, 241, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                  <Shield size={22} color="var(--accent-primary)" />
                </div>
                <h3 style={{ fontSize: "1.15rem", marginBottom: "6px" }}>SHA-256 Key Hashing</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Zero raw API key storage. Raw keys are presented only once at creation and cryptographically hashed with SHA-256 in the database.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: "24px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(6, 182, 212, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                  <Zap size={22} color="#06b6d4" />
                </div>
                <h3 style={{ fontSize: "1.15rem", marginBottom: "6px" }}>Atomic Upsert Windows</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  PostgreSQL transaction-isolated <code>ON CONFLICT DO UPDATE</code> engine with epoch mathematical alignment eliminates race conditions.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: "24px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(217, 70, 239, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                  <Key size={22} color="#d946ef" />
                </div>
                <h3 style={{ fontSize: "1.15rem", marginBottom: "6px" }}>Tiered Quotas</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Dynamic policy enforcement for Free (100 req/60s) and Pro (1000 req/60s) tiers with automatic <code>429</code> throttling.
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
