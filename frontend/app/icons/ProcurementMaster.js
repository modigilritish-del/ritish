// app/icons/ProcurementMaster.js
"use client";
import { usePanelWidth } from "../context/PanelWidthContext";
import { procurementLinks } from "../config/procurementLinks";

export default function ProcurementMaster() {
  const { addTab } = usePanelWidth();

  const handleItemClick = (item) => {
    addTab(item.path, item.name);
  };

  return (
    <div style={{ padding: "20px", width: "100%", height: "100%", overflow: "auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
          🛒 Procurement & Purchase Planning
        </h1>
        <p style={{ fontSize: "14px", color: "#666" }}>
          Complete procurement management with warehouse, purchase planning, and vendor analysis
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
        {procurementLinks.map((item) => {
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
                e.currentTarget.style.borderColor = "#0ea5e9";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(14,165,233,0.15)";
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
                  background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
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
          {procurementLinks.map((item, index) => {
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
                  borderBottom: index < procurementLinks.length - 1 ? "1px solid #f0f0f0" : "none",
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
                <Icon size={18} color="#0ea5e9" />
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
      <div style={{ marginTop: "30px", padding: "16px", background: "linear-gradient(135deg, #e0f2fe, #bae6fd)", borderRadius: "8px", border: "1px solid #0ea5e9" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#0c4a6e", marginBottom: "8px" }}>
          🎯 About Procurement & Purchase Planning
        </h3>
        <p style={{ fontSize: "12px", color: "#0284c7", lineHeight: "1.6", margin: 0 }}>
          Comprehensive procurement management system with complete control over warehouse details, purchase planning, vendor analysis, and tolerances.
        </p>
        <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
          <div style={{ background: "white", padding: "8px", borderRadius: "4px", fontSize: "11px" }}>
            <strong style={{ color: "#0284c7" }}>Warehouse:</strong> Storage & handling
          </div>
          <div style={{ background: "white", padding: "8px", borderRadius: "4px", fontSize: "11px" }}>
            <strong style={{ color: "#0284c7" }}>Purchase:</strong> Vendor & tolerances
          </div>
          <div style={{ background: "white", padding: "8px", borderRadius: "4px", fontSize: "11px" }}>
            <strong style={{ color: "#0284c7" }}>RBAC:</strong> Access control
          </div>
          <div style={{ background: "white", padding: "8px", borderRadius: "4px", fontSize: "11px" }}>
            <strong style={{ color: "#0284c7" }}>Planning:</strong> Purchase planning
          </div>
        </div>
      </div>
    </div>
  );
}