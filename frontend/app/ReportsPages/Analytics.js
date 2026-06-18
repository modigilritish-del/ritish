"use client";
import { BarChart3 } from "lucide-react";

export default function Analytics() {
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
            <BarChart3 size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>
              Analytics Dashboard
            </h2>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {/* Traffic Sources & User Engagement */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
            {/* Traffic Sources */}
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "10px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
                Traffic Sources
              </h3>
              <div style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{ fontSize: "10px", color: "#666" }}>Direct</span>
                  <span style={{ fontSize: "10px", fontWeight: "500", color: "#333" }}>45%</span>
                </div>
                <div style={{ height: "6px", background: "#f0f0f0", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: "45%", height: "100%", background: "#3b82f6" }}></div>
                </div>
              </div>
              <div style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{ fontSize: "10px", color: "#666" }}>Organic Search</span>
                  <span style={{ fontSize: "10px", fontWeight: "500", color: "#333" }}>30%</span>
                </div>
                <div style={{ height: "6px", background: "#f0f0f0", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: "30%", height: "100%", background: "#10b981" }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{ fontSize: "10px", color: "#666" }}>Referral</span>
                  <span style={{ fontSize: "10px", fontWeight: "500", color: "#333" }}>25%</span>
                </div>
                <div style={{ height: "6px", background: "#f0f0f0", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: "25%", height: "100%", background: "#8b5cf6" }}></div>
                </div>
              </div>
            </div>

            {/* User Engagement */}
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "10px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
                User Engagement
              </h3>
              <div style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>Avg Session Duration</div>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#333" }}>3m 42s</div>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>Pages per Session</div>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#333" }}>4.2</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>Bounce Rate</div>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#ef4444" }}>32.5%</div>
              </div>
            </div>
          </div>

          {/* Top Performing Pages */}
          <div style={{ marginBottom: "10px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
              Top Performing Pages
            </h3>
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                <thead>
                  <tr style={{ background: "#f8f9fa" }}>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Page</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Views</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Avg Time</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Bounce Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { page: "/dashboard", views: "12,543", time: "2m 15s", bounce: "28%" },
                    { page: "/products", views: "8,234", time: "3m 42s", bounce: "35%" },
                    { page: "/checkout", views: "5,123", time: "1m 52s", bounce: "22%" },
                  ].map((page, idx) => (
                    <tr key={idx} style={{ borderBottom: idx < 2 ? "1px solid #f0f0f0" : "none" }}>
                      <td style={{ padding: "6px 8px", color: "#0066cc", fontWeight: "500" }}>{page.page}</td>
                      <td style={{ padding: "6px 8px", color: "#333" }}>{page.views}</td>
                      <td style={{ padding: "6px 8px", color: "#333" }}>{page.time}</td>
                      <td style={{ padding: "6px 8px", color: "#333" }}>{page.bounce}</td>
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
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
