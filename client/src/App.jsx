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
          <div style={{ maxWidth: "860px", margin: "0 auto", padding: "72px 24px", textAlign: "center" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontSize: "0.8rem",
              fontWeight: 500,
              marginBottom: "24px"
            }}>
              <Zap size={13} />
              PostgreSQL Atomic Fixed-Window Rate Limiting
            </div>

            <h1 style={{ fontSize: "2.8rem", lineHeight: 1.15, marginBottom: "18px", fontWeight: 600 }}>
              API Rate Limiting &
              <span style={{ color: "var(--accent-primary)" }}> Key Management</span>
            </h1>

            <p style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto 36px", lineHeight: "1.65" }}>
              Protect your backend APIs with cryptographic key hashing, atomic window enforcement, and RFC-compliant rate-limit headers.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginBottom: "64px" }}>
              <button onClick={() => setIsAuthOpen(true)} className="btn btn-primary btn-lg">
                <Lock size={16} />
                Sign In / Register
              </button>
              <button
                onClick={() => { setActiveTab("playground"); }}
                className="btn btn-secondary btn-lg"
              >
                <Activity size={16} />
                Explore Playground
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", textAlign: "left" }}>
              <div className="glass-panel" style={{ padding: "20px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                  <Shield size={16} color="var(--accent-primary)" />
                </div>
                <h3 style={{ fontSize: "1rem", marginBottom: "6px", fontWeight: 600 }}>SHA-256 Key Hashing</h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: "1.55" }}>
                  Raw keys shown once at creation, stored only as one-way SHA-256 hashes.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: "20px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                  <Zap size={16} color="var(--text-secondary)" />
                </div>
                <h3 style={{ fontSize: "1rem", marginBottom: "6px", fontWeight: 600 }}>Atomic Upsert Windows</h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: "1.55" }}>
                  PostgreSQL <code>ON CONFLICT DO UPDATE</code> with epoch alignment eliminates race conditions.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: "20px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                  <Key size={16} color="var(--text-secondary)" />
                </div>
                <h3 style={{ fontSize: "1rem", marginBottom: "6px", fontWeight: 600 }}>Tiered Quotas</h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: "1.55" }}>
                  Free (100 req/60s) and Pro (1000 req/60s) tiers with automatic <code>429</code> throttling.
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
