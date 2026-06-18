//app/components/FixBottom.js - RBAC Filtered Tabs
"use client";
import { usePanelWidth } from "../context/PanelWidthContext";
import { X, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useEffect, useState } from "react";

import { getAccessiblePathsSet } from "../utils/rbacCache";

export default function FixBottom() {
  const { leftWidth, isDraggingLeft, tabs, removeTab, activeTab, setActiveTab, isLeftPanelOpen, setShowAddCompany } = usePanelWidth();
  const router = useRouter();
  const scrollContainerRef = useRef(null);
  
  // 🔥 NEW: Track accessible pages
  const [accessiblePaths, setAccessiblePaths] = useState(new Set());
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // 🔥 NEW: Load accessible pages on mount
  useEffect(() => {
    loadAccessiblePages();
  }, []);

  // 🔥 NEW: Auto-remove tabs that lost access
  useEffect(() => {
    if (isCheckingAccess || accessiblePaths.size === 0) return;

    // Check each tab
    tabs.forEach(tab => {
      // Skip Home page (always accessible)
      if (tab.path === '/' || tab.path === '/settings') return;

      // Check if tab's path is still accessible
      const hasAccess = Array.from(accessiblePaths).some(path => 
        tab.path.includes(path) || path.includes(tab.path)
      );

      if (!hasAccess) {
        console.log('❌ [TAB] Removing tab (no access):', tab.title);
        removeTab(tab.id);
      }
    });
  }, [tabs, accessiblePaths, isCheckingAccess]);

  // Uses shared cache — no duplicate API call
  const loadAccessiblePages = async () => {
    try {
      setIsCheckingAccess(true);
      const paths = await getAccessiblePathsSet();
      console.log('✅ [TAB] Accessible paths loaded:', paths.size);
      setAccessiblePaths(paths);
    } catch (error) {
      console.error('❌ [TAB] Error loading access:', error);
    } finally {
      setIsCheckingAccess(false);
    }
  };

  const handleTabClick = (tab) => {
    if (!isLeftPanelOpen) return;
    
    setActiveTab(tab.id);
    
    if (tab.id.startsWith("add-company")) {
      setShowAddCompany(true);
    } else {
      setShowAddCompany(false);
      if (tab.path && tab.path !== "/add-company") {
        router.push(tab.path);
      }
    }
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    if (!isLeftPanelOpen) return;
    removeTab(tabId);
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: `${leftWidth}px`,
        right: 0,
        height: "45px",
        backgroundColor: "#ffffff",
        borderTop: "2px solid #0066cc",
        display: "flex",
        alignItems: "center",
        padding: "10px",
        zIndex: 90,
        boxShadow: "0 -2px 6px rgba(0,0,0,0.1)",
        transition: isDraggingLeft ? "none" : "left 0.2s ease-out",
        overflowX: "hidden",
        overflowY: "hidden",
        opacity: isLeftPanelOpen ? 1 : 0.6,
      }}
    >
      {tabs.length === 0 ? (
        <div style={{ padding: "0 20px", fontSize: "14px", color: "#999" }}>
          {isLeftPanelOpen 
            ? "No pages opened yet - Click on menu items to open tabs"
            : "Menu is locked - Open menu to interact with tabs"
          }
        </div>
      ) : (
        <>
          {/* Left Scroll Button */}
          {tabs.length > 0 && (
            <button
              onClick={scrollLeft}
              style={{
                background: "linear-gradient(135deg, #72777cff 0%, #53253bff 100%)",
                border: "none",
                borderRadius: "6px",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                marginRight: "8px",
                flexShrink: 0,
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 3px 6px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }}
            >
              <ChevronLeft size={18} color="white" />
            </button>
          )}

          {/* FIXED HOME TAB - always single, always visible */}
          {(() => {
            const homeTab = tabs.find(t => t.path === "/");
            if (!homeTab) return null;
            return (
              <div
                onClick={() => handleTabClick(homeTab)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  background: activeTab === homeTab.id
                    ? "linear-gradient(135deg, #87CEEB 0%, #FFD700 100%)"
                    : "linear-gradient(135deg, #72777cff 0%, #53253bff 100%)",
                  color: activeTab === homeTab.id ? "#333" : "white",
                  borderRadius: "6px",
                  cursor: isLeftPanelOpen ? "pointer" : "not-allowed",
                  fontSize: "12px",
                  fontWeight: "500",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  minWidth: "fit-content",
                  border: activeTab === homeTab.id ? "1px solid #FFD700" : "1px solid #53253bff",
                  opacity: isLeftPanelOpen ? 1 : 0.7,
                  pointerEvents: isLeftPanelOpen ? "auto" : "none",
                  flexShrink: 0,
                  marginRight: "4px",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== homeTab.id && isLeftPanelOpen) e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== homeTab.id && isLeftPanelOpen) e.currentTarget.style.opacity = "1";
                }}
              >
                <span style={{ whiteSpace: "nowrap" }}>{homeTab.title}</span>
              </div>
            );
          })()}

          {/* Divider between fixed Home and scrollable tabs */}
          {tabs.some(t => t.path === "/") && tabs.length > 1 && (
            <div style={{
              width: "1px",
              height: "24px",
              background: "#aaa",
              flexShrink: 0,
              marginRight: "4px",
            }} />
          )}

          {/* FIXED ACTIVE TAB - always visible next to Home, hidden from scroll area */}
          {(() => {
            const activeTabData = tabs.find(t => t.id === activeTab && t.path !== "/");
            if (!activeTabData) return null;
            return (
              <>
                <div
                  onClick={() => handleTabClick(activeTabData)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "6px",
                    padding: "6px 8px",
                    background: "linear-gradient(135deg, #87CEEB 0%, #FFD700 100%)",
                    color: "#333",
                    borderRadius: "6px",
                    cursor: isLeftPanelOpen ? "pointer" : "not-allowed",
                    fontSize: "12px",
                    fontWeight: "500",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                    width: "140px",
                    minWidth: "140px",
                    maxWidth: "140px",
                    border: "1px solid #FFD700",
                    opacity: isLeftPanelOpen ? 1 : 0.7,
                    pointerEvents: isLeftPanelOpen ? "auto" : "none",
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    flex: 1,
                    textAlign: "center",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>{activeTabData.title}</span>
                  <button
                    onClick={(e) => handleCloseTab(e, activeTabData.id)}
                    disabled={!isLeftPanelOpen}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: isLeftPanelOpen ? "pointer" : "not-allowed",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "3px",
                      color: "#ff4444",
                      transition: "all 0.15s ease",
                      opacity: isLeftPanelOpen ? 1 : 0.5,
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      if (isLeftPanelOpen) e.currentTarget.style.background = "rgba(255,68,68,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      if (isLeftPanelOpen) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
                <div style={{ width: "1px", height: "24px", background: "#aaa", flexShrink: 0, marginRight: "4px" }} />
              </>
            );
          })()}

          {/* SCROLLABLE TABS - all except Home */}
          <div
            ref={scrollContainerRef}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0 8px",
              overflow: "auto",
              width: "100%",
              height: "100%",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {/* Lock indicator */}
            {!isLeftPanelOpen && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  background: "#fff3cd",
                  color: "#856404",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "500",
                  whiteSpace: "nowrap",
                  marginRight: "8px",
                  border: "1px solid #ffc107",
                }}
              >
                <Lock size={14} />
                <span>Locked</span>
              </div>
            )}

            {/* 🔥 SCROLLABLE TABS - all except Home and currently active tab (active is shown fixed) */}
            {tabs.filter(tab => tab.path !== "/" && tab.id !== activeTab).map((tab) => (
              <div
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "6px",
                  padding: "6px 8px",
                  background: activeTab === tab.id 
                    ? "linear-gradient(135deg, #87CEEB 0%, #FFD700 100%)" 
                    : "linear-gradient(135deg, #72777cff 0%, #53253bff 100%)",
                  color: activeTab === tab.id ? "#333" : "white",
                  borderRadius: "6px",
                  cursor: isLeftPanelOpen ? "pointer" : "not-allowed",
                  fontSize: "12px",
                  fontWeight: "500",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  width: "140px",
                  minWidth: "140px",
                  maxWidth: "140px",
                  border: activeTab === tab.id ? "1px solid #FFD700" : "1px solid #53253bff",
                  opacity: isLeftPanelOpen ? 1 : 0.7,
                  pointerEvents: isLeftPanelOpen ? "auto" : "none",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id && isLeftPanelOpen) {
                    e.currentTarget.style.opacity = "0.9";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id && isLeftPanelOpen) {
                    e.currentTarget.style.opacity = "1";
                  }
                }}
              >
                <span style={{
                  flex: 1,
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>{tab.title}</span>
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  disabled={!isLeftPanelOpen}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: isLeftPanelOpen ? "pointer" : "not-allowed",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "3px",
                    color: "#ff4444",
                    transition: "all 0.15s ease",
                    opacity: isLeftPanelOpen ? 1 : 0.5,
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (isLeftPanelOpen) {
                      e.currentTarget.style.background = "rgba(255,68,68,0.2)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isLeftPanelOpen) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Right Scroll Button */}
          {tabs.length > 0 && (
            <button
              onClick={scrollRight}
              style={{
                background: "linear-gradient(135deg, #72777cff 0%, #53253bff 100%)",
                border: "none",
                borderRadius: "6px",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                marginLeft: "8px",
                flexShrink: 0,
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 3px 6px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }}
            >
              <ChevronRight size={18} color="white" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
