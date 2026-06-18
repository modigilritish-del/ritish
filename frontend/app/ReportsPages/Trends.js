"use client";
import { LineChart } from "lucide-react";

export default function Trends() {
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
            <LineChart size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>
              Business Trends
            </h2>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {/* Trend Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px" }}>
            {/* Revenue Trend */}
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "10px", background: "#f8fff8" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
                Revenue Trend
              </h3>
              <div style={{ marginBottom: "8px" }}>
                <div style={{ fontSize: "9px", color: "#666", marginBottom: "2px" }}>This Month</div>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#10b981" }}>$45,231</div>
                <div style={{ fontSize: "8px", color: "#10b981", marginTop: "2px" }}>↑ 18% vs last month</div>
              </div>
              <div style={{ height: "50px", display: "flex", alignItems: "flex-end", gap: "2px", marginTop: "8px" }}>
                {[40, 55, 45, 70, 60, 85, 75].map((height, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: `${height}%`,
                      background: "linear-gradient(to top, #10b981, #34d399)",
                      borderRadius: "2px 2px 0 0",
                    }}
                  ></div>
                ))}
              </div>
            </div>

            {/* Customer Growth */}
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "10px", background: "#f0f8ff" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
                Customer Growth
              </h3>
              <div style={{ marginBottom: "8px" }}>
                <div style={{ fontSize: "9px", color: "#666", marginBottom: "2px" }}>New Customers</div>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#3b82f6" }}>+342</div>
                <div style={{ fontSize: "8px", color: "#3b82f6", marginTop: "2px" }}>↑ 24% vs last month</div>
              </div>
              <div style={{ height: "50px", display: "flex", alignItems: "flex-end", gap: "2px", marginTop: "8px" }}>
                {[30, 45, 55, 50, 65, 75, 80].map((height, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: `${height}%`,
                      background: "linear-gradient(to top, #3b82f6, #60a5fa)",
                      borderRadius: "2px 2px 0 0",
                    }}
                  ></div>
                ))}
              </div>
            </div>

            {/* Conversion Rate */}
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "10px", background: "#faf5ff" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
                Conversion Rate
              </h3>
              <div style={{ marginBottom: "8px" }}>
                <div style={{ fontSize: "9px", color: "#666", marginBottom: "2px" }}>Current Rate</div>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#8b5cf6" }}>3.42%</div>
                <div style={{ fontSize: "8px", color: "#8b5cf6", marginTop: "2px" }}>↑ 0.8% vs last month</div>
              </div>
              <div style={{ height: "50px", display: "flex", alignItems: "flex-end", gap: "2px", marginTop: "8px" }}>
                {[50, 48, 52, 55, 53, 58, 62].map((height, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: `${height}%`,
                      background: "linear-gradient(to top, #8b5cf6, #a78bfa)",
                      borderRadius: "2px 2px 0 0",
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div style={{ marginBottom: "10px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
              Key Insights
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { title: "Peak Sales Hours", desc: "Most sales occur between 2 PM - 6 PM", trend: "↑ 23%" },
                { title: "Top Product Category", desc: "Electronics showing strongest growth", trend: "↑ 45%" },
                { title: "Customer Retention", desc: "Repeat customer rate increased", trend: "↑ 12%" },
              ].map((insight, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px",
                    background: "#f8f9fa",
                    borderRadius: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid #e8e8e8",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "500", color: "#333", marginBottom: "2px" }}>
                      {insight.title}
                    </div>
                    <div style={{ fontSize: "9px", color: "#666" }}>{insight.desc}</div>
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: "600", color: "#10b981" }}>{insight.trend}</div>
                </div>
              ))}
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
            Trends updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
