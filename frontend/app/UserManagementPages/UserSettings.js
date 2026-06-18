"use client";
import { Settings } from "lucide-react";
import { useState } from "react";

export default function UserSettings() {
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [passwordExpiry, setPasswordExpiry] = useState("90");
  const [success, setSuccess] = useState("");

  const handleSave = () => {
    setSuccess("Settings saved successfully!");
    setTimeout(() => setSuccess(""), 2000);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "95%",
          maxWidth: "1100px",
          height: "85%",
          maxHeight: "600px",
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "0px 12px",
            height: "32px",
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(to right, #4b5563, #60a5fa)",
            color: "white",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Settings size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>
              User Settings
            </h2>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {success && (
            <div style={{ padding: "6px 10px", background: "#efe", color: "#080", borderRadius: "4px", marginBottom: "8px", fontSize: "10px" }}>
              {success}
            </div>
          )}

          {/* General Settings */}
          <div style={{ marginBottom: "10px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
              General Settings
            </h3>
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: "500", color: "#333" }}>
                    Email Notifications
                  </div>
                  <div style={{ fontSize: "9px", color: "#666" }}>
                    Receive email notifications for user activities
                  </div>
                </div>
                <label style={{ position: "relative", display: "inline-block", width: "36px", height: "20px" }}>
                  <input 
                    type="checkbox" 
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }} 
                  />
                  <span style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: emailNotifications ? "#0066cc" : "#ccc",
                    borderRadius: "20px",
                    transition: "0.3s",
                  }}>
                    <span style={{
                      position: "absolute",
                      content: "",
                      height: "14px",
                      width: "14px",
                      left: emailNotifications ? "19px" : "3px",
                      bottom: "3px",
                      background: "white",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}></span>
                  </span>
                </label>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: "500", color: "#333" }}>
                    Auto-approve Users
                  </div>
                  <div style={{ fontSize: "9px", color: "#666" }}>
                    Automatically approve new user registrations
                  </div>
                </div>
                <label style={{ position: "relative", display: "inline-block", width: "36px", height: "20px" }}>
                  <input 
                    type="checkbox" 
                    checked={autoApprove}
                    onChange={(e) => setAutoApprove(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }} 
                  />
                  <span style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: autoApprove ? "#0066cc" : "#ccc",
                    borderRadius: "20px",
                    transition: "0.3s",
                  }}>
                    <span style={{
                      position: "absolute",
                      content: "",
                      height: "14px",
                      width: "14px",
                      left: autoApprove ? "19px" : "3px",
                      bottom: "3px",
                      background: "white",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}></span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div style={{ marginBottom: "10px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
              Security Settings
            </h3>
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: "500", color: "#555", marginBottom: "3px" }}>
                  Password Expiry (days)
                </label>
                <input
                  type="number"
                  value={passwordExpiry}
                  onChange={(e) => setPasswordExpiry(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "4px 8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "11px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div style={{ 
          display: "flex", 
          justifyContent: "flex-end", 
          gap: "10px", 
          padding: "0px 12px",
          height: "32px",
          borderTop: "1px solid #e0e0e0",
          background: "linear-gradient(to right, #4b5563, #60a5fa)",
          flexShrink: 0,
          alignItems: "center",
        }}>
          <button
            onClick={handleSave}
            style={{
              padding: "4px 18px",
              background: "rgba(255, 255, 255, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "500",
              cursor: "pointer",
              color: "white",
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
