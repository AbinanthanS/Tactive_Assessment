import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ToastContainer() {
  const { toasts, removeToast } = useAuth();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            className={`toast ${isSuccess ? "toast-success" : isError ? "toast-error" : ""}`}
          >
            {isSuccess ? (
              <CheckCircle2 size={18} color="var(--status-success)" />
            ) : isError ? (
              <AlertCircle size={18} color="var(--status-error)" />
            ) : (
              <Info size={18} color="var(--status-info)" />
            )}
            <span style={{ fontSize: "0.88rem", flex: 1, color: "var(--text-primary)" }}>
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center"
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
