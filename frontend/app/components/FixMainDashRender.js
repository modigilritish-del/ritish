//app/components/FixMainDashRender.js
"use client";
import { usePanelWidth } from "../context/PanelWidthContext";
import { useEffect, useState } from "react";
import Home from "../page";
import Settings from "./Settings";
import { Lock } from "lucide-react";

// ✅ Keep existing static imports for backward compatibility
import { adminMasterLinks } from "../config/adminMasterLinks";
import { userManagementLinks } from "../config/userManagementLinks";
import { reportsLinks } from "../config/reportsLinks";
import { ocrLinks } from "../config/ocrLinks";
import { uomLinks } from "../config/uomLinks";
import { analysisLinks } from "../config/analysisLinks";
import { financeLinks } from "../config/financeLinks";
import { itemMasterLinks } from "../config/itemMasterLinks";

// 🔥 NEW: Get dynamic links from enhanced iconLoader
import { getAllConfigLinks } from "../utils/iconLoader";

export default function FixMainDashRender({ children }) {
  const { 
    leftWidth, 
    rightWidth, 
    isDraggingLeft, 
    isLeftPanelOpen, 
    activeTab, 
    getTabFormData, 
    updateTabFormData,
    tabs 
  } = usePanelWidth();

  const [dynamicLinks, setDynamicLinks] = useState([]);

  // 🔥 Load dynamic links from iconLoader (automatically includes ALL config files)
  useEffect(() => {
    try {
      const links = getAllConfigLinks();
      setDynamicLinks(links);
      console.log('🔥 [MAIN DASH] Dynamic links loaded:', links.length);
      console.log('📊 [MAIN DASH] Link breakdown by category:');
      
      // Group by category for logging
      const byCategory = {};
      links.forEach(link => {
        const cat = link.category || 'Uncategorized';
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      });
      
      Object.entries(byCategory).forEach(([cat, count]) => {
        console.log(`  • ${cat}: ${count} links`);
      });
      
    } catch (error) {
      console.error('❌ [MAIN DASH] Error loading dynamic links:', error);
      setDynamicLinks([]);
    }
  }, []);

  // Find the current active tab details
  const currentTab = tabs.find(tab => tab.id === activeTab);
  const isHomeActive = currentTab?.path === "/";
  const isSettingsActive = currentTab?.path === "/settings";
  
  // Create a unique key for each tab
  const tabKey = activeTab || 'default';

  // ✅ COMBINE: Static imports (existing) + Dynamic links (ALL configs auto-discovered)
  const staticLinks = [
    ...adminMasterLinks,
    ...userManagementLinks,
    ...reportsLinks,
    ...ocrLinks,
    ...uomLinks,
    ...analysisLinks,
    ...financeLinks,
    ...itemMasterLinks,
  ];

  // 🔥 ALL links = Static (existing) + Dynamic (auto-discovered from iconLoader)
  // Remove duplicates by path
  const allLinks = [...staticLinks];
  dynamicLinks.forEach(link => {
    // Only add if not already present
    if (!allLinks.find(existing => existing.path === link.path)) {
      allLinks.push(link);
    }
  });

  console.log('📊 [MAIN DASH] Total links available:', allLinks.length);
  console.log('  Static links:', staticLinks.length);
  console.log('  Dynamic links (from iconLoader):', dynamicLinks.length);
  console.log('  Combined (deduplicated):', allLinks.length);

  // 🔥 AUTO PLACEHOLDER - Agar component null hai to automatic placeholder
  const renderAutoPlaceholder = (linkName, linkPath, category) => {
    return (
      <div style={{ padding: "20px", width: "100%", height: "100%" }}>
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#333" }}>
            {linkName}
          </h1>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
            {category || 'Page'} - Under Development
          </p>
        </div>
        
        <div style={{ 
          background: "#fff", 
          padding: "30px", 
          borderRadius: "8px",
          border: "1px solid #e0e0e0",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>🔧</div>
          <p style={{ fontSize: "16px", color: "#666", marginBottom: "10px" }}>
            {linkName} Component - Under Development
          </p>
          <p style={{ fontSize: "14px", color: "#999" }}>
            Path: {linkPath}
          </p>
          {category && (
            <p style={{ fontSize: "13px", color: "#888", marginTop: "8px" }}>
              Category: {category}
            </p>
          )}
          <div style={{ 
            marginTop: "20px", 
            padding: "12px", 
            background: "#f8f9fa",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#666"
          }}>
            💡 Tip: Create component at <code>app/PageCreationFolder/{linkPath}.js</code> and it will auto-load
          </div>
        </div>
      </div>
    );
  };

  // 🔥 SMART COMPONENT RENDERING - Fully Automatic
  const renderActiveComponent = () => {
    // 1. Home page
    if (isHomeActive) {
      return <Home key={tabKey} />;
    }
    
    // 2. Settings page
    if (isSettingsActive) {
      return <Settings key={tabKey} />;
    }
    
    // 3. Icon pages (dropdown categories) - show message
    if (currentTab?.path?.startsWith("icon-")) {
      return (
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          height: "100%",
          fontSize: "16px",
          color: "#666",
          flexDirection: "column",
          gap: "12px"
        }}>
          <div style={{ fontSize: "48px" }}>📂</div>
          <div>Please select an item from the menu</div>
          <div style={{ fontSize: "14px", color: "#999" }}>
            Click on any sub-item to open
          </div>
        </div>
      );
    }

    // 4. Find matching link from ALL config files (static + auto-discovered dynamic)
    const matchedLink = allLinks.find(link => link.path === currentTab?.path);
    
    if (matchedLink) {
      console.log('✅ [MAIN DASH] Rendering:', matchedLink.name);
      console.log('   Category:', matchedLink.category || 'Unknown');
      console.log('   Source:', matchedLink.sourceConfig || 'Static');
      
      // 4a. If component exists, render it
      if (matchedLink.component) {
        const Component = matchedLink.component;
        
        // Special handling for Add Company (with form data)
        if (matchedLink.path === "add-company") {
          return (
            <Component
              key={tabKey}
              onClose={() => {}}
              tabId={activeTab}
              initialData={getTabFormData(activeTab)}
              onDataChange={(data) => updateTabFormData(activeTab, data)}
            />
          );
        }
        
        // Normal component rendering
        return <Component key={tabKey} />;
      }
      
      // 4b. Component null hai? Auto placeholder show karo
      return renderAutoPlaceholder(
        matchedLink.name, 
        matchedLink.path,
        matchedLink.category
      );
    }

    // 5. No match found - default fallback
    console.log('❌ [MAIN DASH] No match for:', currentTab?.path);
    console.log('   Available paths:', allLinks.map(l => l.path).join(', '));
    
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        height: "100%",
        flexDirection: "column",
        gap: "12px"
      }}>
        <div style={{ fontSize: "48px" }}>❓</div>
        <div style={{ fontSize: "18px", color: "#666" }}>Page Not Found</div>
        <div style={{ fontSize: "14px", color: "#999" }}>
          Path: {currentTab?.path || 'Unknown'}
        </div>
        <div style={{ fontSize: "12px", color: "#999", marginTop: "10px" }}>
          Total available pages: {allLinks.length}
        </div>
        <div style={{ fontSize: "11px", color: "#aaa", marginTop: "5px" }}>
          (Auto-discovered from all config files)
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "30px",
        left: `${leftWidth}px`,
        right: `${rightWidth}px`,
        bottom: "37px",
        background: "#f8f9fa",
        overflow: "hidden",
        padding: "20px",
        zIndex: 50,
        willChange: "left, right",
        transition: isDraggingLeft ? "none" : "left 0.2s ease-out",
        pointerEvents: isLeftPanelOpen ? "auto" : "none",
        opacity: isLeftPanelOpen ? 1 : 0.5,
      }}
    >
      {/* Lock Overlay */}
      {!isLeftPanelOpen && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.05)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px 30px",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              border: "2px solid #FFD700",
            }}
          >
            <Lock size={40} color="#FFD700" />
            <div style={{ fontSize: "18px", fontWeight: "600", color: "#333" }}>
              Screen Locked
            </div>
            <div style={{ fontSize: "14px", color: "#666", textAlign: "center" }}>
              Click <span style={{ color: "#FFD700", fontWeight: "600" }}>Menu</span> button to unlock
            </div>
          </div>
        </div>
      )}

      {/* ✅ SMART AUTO RENDERING - Fully Automatic from iconLoader ✅ */}
      <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
        {renderActiveComponent()}
      </div>
    </div>
  );
}
