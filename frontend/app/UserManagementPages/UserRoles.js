"use client";
import { Shield } from "lucide-react";

export default function UserRoles() {
  const roles = [
    { name: "Administrator", users: 5, permissions: "Full Access" },
    { name: "Manager", users: 12, permissions: "Read/Write" },
    { name: "User", users: 45, permissions: "Read Only" },
  ];

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
            <Shield size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>
              User Roles & Permissions
            </h2>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {/* Roles List */}
          <div style={{ marginBottom: "10px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
              User Roles
            </h3>
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                <thead>
                  <tr style={{ background: "#f8f9fa" }}>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>
                      Role Name
                    </th>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>
                      Users
                    </th>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>
                      Permissions
                    </th>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role, index) => (
                    <tr key={index} style={{ borderBottom: index < roles.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                      <td style={{ padding: "6px 8px", color: "#333", fontWeight: "500" }}>
                        {role.name}
                      </td>
                      <td style={{ padding: "6px 8px", color: "#666" }}>
                        {role.users}
                      </td>
                      <td style={{ padding: "6px 8px", color: "#666" }}>
                        {role.permissions}
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <button
                          style={{
                            background: "#fff",
                            color: "#0066cc",
                            border: "1px solid #0066cc",
                            padding: "3px 8px",
                            borderRadius: "3px",
                            fontSize: "9px",
                            cursor: "pointer",
                            fontWeight: "500",
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <div style={{ fontSize: "10px", color: "white" }}>
            Total Roles: {roles.length}
          </div>
        </div>
      </div>
    </div>
  );
}
