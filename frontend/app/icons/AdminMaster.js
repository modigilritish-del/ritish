"use client";
import { usePanelWidth } from "../context/PanelWidthContext";
import { adminMasterLinks } from "../config/adminMasterLinks";

export default function AdminMaster() {
  const { addTab } = usePanelWidth();

  const handleItemClick = (item) => {
    addTab(item.path, item.name);
  };

  return (
    <div style={{ padding: "20px", width: "100%", height: "100%", overflow: "auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
          Admin Master
        </h1>
        <p style={{ fontSize: "14px", color: "#666" }}>
          Manage your system settings and configurations
        </p>
      </div>

      {/* Grid Layout - Dashboard style */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "16px",
        }}
      >
        {adminMasterLinks.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              onClick={() => handleItemClick(item)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "16px",
                background: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8f9fa";
                e.currentTarget.style.borderColor = "#0066cc";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,102,204,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.borderColor = "#e0e0e0";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #0066cc 0%, #0052a3 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={20} color="white" />
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#333",
                    marginBottom: "4px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* List Layout - Sidebar style */}
      <div style={{ marginTop: "40px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#333", marginBottom: "16px" }}>
          Quick Access (List View)
        </h2>
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e0e0e0", overflow: "hidden" }}>
          {adminMasterLinks.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={`list-${item.name}`}
                onClick={() => handleItemClick(item)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderBottom: index < adminMasterLinks.length - 1 ? "1px solid #f0f0f0" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8f9fa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Icon size={18} color="#0066cc" />
                <span style={{ fontSize: "14px", fontWeight: "500", color: "#333" }}>
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
