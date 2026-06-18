// app/icons/InventoryMaster.js
"use client";
import { usePanelWidth } from "../context/PanelWidthContext";
import { itemMasterLinks } from "../config/itemMasterLinks";

export default function InventoryMaster() {
  const { addTab } = usePanelWidth();

  const handleItemClick = (item) => {
    addTab(item.path, item.name);
  };

  return (
    <div style={{ padding: "20px", width: "100%", height: "100%", overflow: "auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
          🏭 Inventory Master System
        </h1>
        <p style={{ fontSize: "14px", color: "#666" }}>
          Complete item management with UOM, GL codes, batch/serial tracking, and classifications
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
        {itemMasterLinks.map((item) => {
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
                e.currentTarget.style.borderColor = "#f59e0b";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(245,158,11,0.15)";
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
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
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
                {item.description && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#666",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.description}
                  </div>
                )}
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
          {itemMasterLinks.map((item, index) => {
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
                  borderBottom: index < itemMasterLinks.length - 1 ? "1px solid #f0f0f0" : "none",
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
                <Icon size={18} color="#f59e0b" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: "#333" }}>
                    {item.name}
                  </div>
                  {item.description && (
                    <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Card */}
      <div style={{ marginTop: "30px", padding: "16px", background: "linear-gradient(135deg, #fef3c7, #fde68a)", borderRadius: "8px", border: "1px solid #f59e0b" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#78350f", marginBottom: "8px" }}>
          🎯 About Inventory Master
        </h3>
        <p style={{ fontSize: "12px", color: "#b45309", lineHeight: "1.6", margin: 0 }}>
          Comprehensive inventory management system with complete control over products, inventory units, GL codes, and batch/serial tracking.
        </p>
        <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
          <div style={{ background: "white", padding: "8px", borderRadius: "4px", fontSize: "11px" }}>
            <strong style={{ color: "#d97706" }}>Base UOM:</strong> Unit management
          </div>
          <div style={{ background: "white", padding: "8px", borderRadius: "4px", fontSize: "11px" }}>
            <strong style={{ color: "#d97706" }}>GL Codes:</strong> Financial linking
          </div>
          <div style={{ background: "white", padding: "8px", borderRadius: "4px", fontSize: "11px" }}>
            <strong style={{ color: "#d97706" }}>Batch/Serial:</strong> Tracking control
          </div>
          <div style={{ background: "white", padding: "8px", borderRadius: "4px", fontSize: "11px" }}>
            <strong style={{ color: "#d97706" }}>Stock/Service:</strong> Item classification
          </div>
        </div>
      </div>
    </div>
  );
}