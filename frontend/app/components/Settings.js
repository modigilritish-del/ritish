"use client";
import { useState } from "react";
import { Settings as SettingsIcon, X } from "lucide-react";
import UserAddResetPassword from "./UserAddResetPassword.jsx";

export default function Settings() {
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);

  return (
    <>
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative" }}>
        <div style={{ width: "95%", maxWidth: "1200px", height: "90%", maxHeight: "700px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #4b5563, #60a5fa)", color: "white", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <SettingsIcon size={14} />
              <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>Settings</h2>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: "auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ marginBottom: "20px", fontSize: "48px" }}>⚙️</div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px", color: "#333" }}>Security Settings</h3>
              <p style={{ fontSize: "11px", color: "#666", marginBottom: "20px" }}>Manage your password and biometric authentication</p>
              <button
                onClick={() => setShowSecuritySettings(true)}
                style={{
                  padding: "8px 20px",
                  background: "rgba(75, 85, 99, 0.9)",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: "500",
                  cursor: "pointer",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <SettingsIcon size={14} />
                Open Security Settings
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: "0px 12px", height: "16px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #60a5fa, #4b5563)", flexShrink: 0 }}></div>
        </div>
      </div>

      {/* Overlay Modal with UserAddResetPassword centered */}
      {showSecuritySettings && (
        <div 
          style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: "rgba(0, 0, 0, 0.6)", 
            zIndex: 9999, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(2px)"
          }}
          onClick={() => setShowSecuritySettings(false)}
        >
          <div 
            style={{ 
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowSecuritySettings(false)}
              style={{
                position: "absolute",
                top: "5%",
                right: "15%",
                zIndex: 10001,
                background: "#ef4444",
                border: "2px solid white",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                cursor: "pointer",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#dc2626";
                e.currentTarget.style.transform = "scale(1.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ef4444";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <X size={22} strokeWidth={2.5} />
            </button>
            
            {/* UserAddResetPassword Component - This will center itself */}
            <UserAddResetPassword />
          </div>
        </div>
      )}
    </>
  );
}
