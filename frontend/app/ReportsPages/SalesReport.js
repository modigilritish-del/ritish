"use client";
import { TrendingUp } from "lucide-react";

export default function SalesReport() {
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
            <TrendingUp size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>
              Sales Report
            </h2>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {/* Sales Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px" }}>
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "10px", background: "#f8fff8" }}>
              <div style={{ fontSize: "10px", color: "#666", marginBottom: "4px" }}>Total Sales</div>
              <div style={{ fontSize: "18px", fontWeight: "600", color: "#10b981" }}>$125,430</div>
              <div style={{ fontSize: "9px", color: "#10b981", marginTop: "2px" }}>↑ 12.5% from last month</div>
            </div>

            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "10px", background: "#f0f8ff" }}>
              <div style={{ fontSize: "10px", color: "#666", marginBottom: "4px" }}>Orders</div>
              <div style={{ fontSize: "18px", fontWeight: "600", color: "#3b82f6" }}>1,234</div>
              <div style={{ fontSize: "9px", color: "#3b82f6", marginTop: "2px" }}>↑ 8.3% from last month</div>
            </div>

            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "10px", background: "#faf5ff" }}>
              <div style={{ fontSize: "10px", color: "#666", marginBottom: "4px" }}>Avg Order Value</div>
              <div style={{ fontSize: "18px", fontWeight: "600", color: "#8b5cf6" }}>$101.65</div>
              <div style={{ fontSize: "9px", color: "#8b5cf6", marginTop: "2px" }}>↑ 3.2% from last month</div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div style={{ marginBottom: "10px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
              Recent Transactions
            </h3>
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                <thead>
                  <tr style={{ background: "#f8f9fa" }}>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Order ID</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Customer</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Amount</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: "#ORD-001", customer: "John Doe", amount: "$245.00", status: "Completed" },
                    { id: "#ORD-002", customer: "Jane Smith", amount: "$189.50", status: "Processing" },
                    { id: "#ORD-003", customer: "Bob Johnson", amount: "$320.00", status: "Completed" },
                  ].map((order, idx) => (
                    <tr key={idx} style={{ borderBottom: idx < 2 ? "1px solid #f0f0f0" : "none" }}>
                      <td style={{ padding: "6px 8px", color: "#0066cc", fontWeight: "500" }}>{order.id}</td>
                      <td style={{ padding: "6px 8px", color: "#333" }}>{order.customer}</td>
                      <td style={{ padding: "6px 8px", color: "#333", fontWeight: "500" }}>{order.amount}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "9px",
                          fontWeight: "500",
                          background: order.status === "Completed" ? "#d1fae5" : "#fef3c7",
                          color: order.status === "Completed" ? "#065f46" : "#92400e",
                        }}>
                          {order.status}
                        </span>
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
            Report generated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
