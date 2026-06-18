//app/components/LeftPanel.js - RBAC Filtered 
"use client";
import { useRef, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Search, Layout, ChevronRight, ChevronDown, Grid } from "lucide-react";
import { usePanelWidth } from "../context/PanelWidthContext";
import { adminMasterLinks } from "../config/adminMasterLinks";
import { getAllIconPages } from "../utils/iconLoader";
import { filterLinks, filterIconPagesFromCache } from "../utils/rbacCache";

export default function LeftPanel() {
  const { leftWidth, setLeftWidth, isDraggingLeft, setIsDraggingLeft, addTab, isLeftPanelOpen, setShowAddCompany } = usePanelWidth();
  const isDragging = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const [isAdminMasterOpen, setIsAdminMasterOpen] = useState(false);
  const [openIconPages, setOpenIconPages] = useState({});
  
  // User info
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtered links state
  const [filteredAdminLinks, setFilteredAdminLinks] = useState([]);
  const [filteredIconPages, setFilteredIconPages] = useState([]);
  const [filterLoading, setFilterLoading] = useState(true);

  const menuItems = [
    { name: "Home", path: "/", icon: Home },
  ];

  // Load current user from sessionStorage
  useEffect(() => {
    const loadCurrentUser = () => {
      try {
        const storedData = sessionStorage.getItem('userData');
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        
        if (!isLoggedIn || !storedData) {
          console.warn('⚠️ User not logged in');
          setLoading(false);
          return;
        }
        
        const userData = JSON.parse(storedData);
        console.log('✅ Current User Data:', userData);
        
        if (!userData.user) {
          console.error('❌ Invalid user data structure');
          setLoading(false);
          return;
        }
        
        setCurrentUser(userData.user);
        setLoading(false);
        
      } catch (error) {
        console.error('❌ Error loading user data:', error);
        setLoading(false);
      }
    };
    
    loadCurrentUser();
  }, []);

  // Filter links after user loads
  useEffect(() => {
    const applyFilters = async () => {
      if (!currentUser) return;
      
      setFilterLoading(true);
      console.log('🔍 Applying RBAC filters via shared cache...');
      
      try {
        const iconPagesOriginal = getAllIconPages();

        // Run both filters in parallel — they share the same underlying cache fetch
        const [filteredAdmin, filteredIcons] = await Promise.all([
          filterLinks(adminMasterLinks),
          filterIconPagesFromCache(iconPagesOriginal),
        ]);

        // ============================================================
        // 🔥 HIERARCHY FILTER
        // localStorage se saved hierarchy padho.
        // Jo links hierarchy mein CHILD hain (kisi ke under nested hain)
        // woh LeftPanel sub-list mein HIDE ho jayenge.
        // Sirf ROOT pages (parentId = null/undefined) dikhenge.
        // Jo pages hierarchy mein hain hi nahi woh pehle ki tarah dikhte hain.
        // ============================================================
        // Read from new multi-hierarchy key (rbac_multi_hierarchies)
        // Falls back to old single key (rbac_page_hierarchy) for backward compatibility
        let allHierarchiesData = {};
        try {
          const multi = JSON.parse(localStorage.getItem('rbac_multi_hierarchies') || 'null');
          if (multi && typeof multi === 'object') {
            allHierarchiesData = multi;
          } else {
            // Fallback: old single hierarchy
            const old = JSON.parse(localStorage.getItem('rbac_page_hierarchy') || '{}');
            allHierarchiesData = { Default: old };
          }
        } catch {}

        // Collect child IDs across ALL hierarchies
        const childIds = new Set();
        Object.values(allHierarchiesData).forEach(hierData => {
          Object.entries(hierData)
            .filter(([, v]) => v.parentId !== null && v.parentId !== undefined)
            .forEach(([id]) => childIds.add(parseInt(id)));
        });

        // Agar koi child hai to backend se id→page_url map fetch karo
        let childLinkPaths = new Set(); // link.path values jo hide karni hain
        if (childIds.size > 0) {
          try {
            const res = await fetch('http://localhost:8000/api/rbac/pages');
            if (res.ok) {
              const allPages = await res.json();
              // page_url se link.path derive karo:
              // page_url = "/item-master/add-item-info"
              // link.path = "add-item-info"  (last segment)
              allPages.forEach(p => {
                if (childIds.has(p.id) && p.page_url) {
                  // Last URL segment nikalo jo itemMasterLinks mein 'path' ke roop mein hota hai
                  const segments = p.page_url.replace(/\/$/, '').split('/');
                  const lastSegment = segments[segments.length - 1];
                  childLinkPaths.add(lastSegment);
                  childLinkPaths.add(p.page_url); // full URL bhi add karo fallback ke liye
                }
              });
            }
          } catch (e) {
            console.warn('⚠️ [LEFT PANEL] Could not fetch pages for hierarchy filter:', e.message);
          }
        }

        console.log('🌳 [LEFT PANEL] Child paths to hide:', [...childLinkPaths]);

        // Admin links pe bhi hierarchy filter lagao
        const adminWithHierarchyFilter = childLinkPaths.size === 0
          ? filteredAdmin
          : filteredAdmin.filter(link =>
              !childLinkPaths.has(link.path) && !childLinkPaths.has(`/${link.path}`)
            );

        // Icon pages ke links mein se child links filter karo
        const iconsWithHierarchyFilter = filteredIcons.map(iconPage => ({
          ...iconPage,
          links: (iconPage.links || []).filter(link => {
            if (childLinkPaths.size === 0) return true; // hierarchy nahi bani — sab show karo
            // link.path child hai to hide karo
            return !childLinkPaths.has(link.path) && !childLinkPaths.has(`/${link.path}`);
          })
        })).filter(iconPage => iconPage.links.length > 0);

        // 🔥 FIX: AdminMaster upar hardcoded section se already show hota hai,
        // isliye iconPages loop mein se hatao — warna 2 baar dikhega
        setFilteredAdminLinks(adminWithHierarchyFilter);
        setFilteredIconPages(iconsWithHierarchyFilter.filter(p => p.name !== 'AdminMaster'));
        console.log('✅ Filtered Admin Links (with hierarchy):', adminWithHierarchyFilter.length);
        console.log('✅ Filtered Icon Pages (with hierarchy):', iconsWithHierarchyFilter.length);
        
      } catch (error) {
        console.error('❌ Filter error:', error);
        setFilteredAdminLinks([]);
        setFilteredIconPages([]);
      }
      
      setFilterLoading(false);
    };
    
    applyFilters();
  }, [currentUser]);

  // DRAG HANDLERS
  const startDrag = (e) => {
    e.preventDefault();
    isDragging.current = true;
    setIsDraggingLeft(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onDrag = (e) => {
      if (!isDragging.current) return;
      
      requestAnimationFrame(() => {
        let newWidth = e.clientX;
        if (newWidth < 180) newWidth = 180;
        if (newWidth > 500) newWidth = 500;
        setLeftWidth(newWidth);
        localStorage.setItem('leftPanelWidth', newWidth.toString());
      });
    };

    const stopDrag = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setIsDraggingLeft(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);

    return () => {
      document.removeEventListener("mousemove", onDrag);
      document.removeEventListener("mouseup", stopDrag);
    };
  }, [setLeftWidth, setIsDraggingLeft]);

  const handleMenuClick = (item) => {
    if (!isLeftPanelOpen) return;
    setShowAddCompany(false);
    
    if (item.path === "/") {
      addTab("/", "Home");
    } else {
      addTab(item.path, item.name);
    }
    router.push(item.path);
  };

  const handleAdminMasterToggle = () => {
    if (!isLeftPanelOpen) return;
    setIsAdminMasterOpen(!isAdminMasterOpen);
  };

  const handleIconPageToggle = (pageName) => {
    if (!isLeftPanelOpen) return;
    setOpenIconPages(prev => ({
      ...prev,
      [pageName]: !prev[pageName]
    }));
  };

  const handleSubItemClick = (item) => {
    if (!isLeftPanelOpen) return;
    addTab(item.path, item.name);
    
    if (item.path === "add-company") {
      setShowAddCompany(true);
    } else {
      setShowAddCompany(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "43px",
        left: 0,
        bottom: "-10px",
        width: `${leftWidth}px`,
        background: "#1a1a1a",
        color: "white",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #333",
        zIndex: 100,
        overflow: "hidden",
        transition: isDragging.current ? "none" : "width 0.2s ease-out",
      }}
    >
      {/* DRAG HANDLE */}
      <div
        onMouseDown={startDrag}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "6px",
          height: "100%",
          cursor: "col-resize",
          background: "linear-gradient(to left, #4b5563 0%, transparent 100%)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {/* DRAG BUTTON */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#3b82f6",
            color: "white",
            padding: "8px 4px",
            borderRadius: "4px",
            fontSize: "10px",
            fontWeight: "600",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            pointerEvents: "none",
            userSelect: "none"
          }}
        >
          DRAG
        </div>
      </div>

      {/* Right side gray shade overlay */}
      <div style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: "250px",
        background: "linear-gradient(to left, #2d2d2d 0%, #2d2d2d 20%, rgba(45, 45, 45, 0.85) 40%, rgba(45, 45, 45, 0.5) 70%, rgba(45, 45, 45, 0) 100%)",
        pointerEvents: "none",
        zIndex: 1,
      }} />

      {/* Bottom-left corner blue light */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "200px",
          background: "linear-gradient(to top, rgba(135, 206, 235, 0.45) 0%, rgba(106, 154, 186, 0.32) 20%, rgba(90, 122, 154, 0.12) 40%, rgba(50, 60, 72, 0.07) 60%, rgba(20, 22, 24, 0) 100%), radial-gradient(ellipse at bottom left, rgba(32, 35, 36, 0.5) 0%, rgba(52, 73, 87, 0.3) 25%, rgba(45, 48, 51, 0.12) 50%, rgba(7, 7, 8, 0) 100%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* Spider Web Pattern Overlay */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 2,
          opacity: 0.4,
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="webGlow" cx="0%" cy="0%" r="70%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#FFA500" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#DAA520" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8B7355" stopOpacity="0" />
          </radialGradient>
          
          <filter id="webGlow2">
            <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g stroke="url(#webGlow)" strokeWidth="0.8" fill="none" filter="url(#webGlow2)">
          <line x1="0%" y1="0%" x2="55%" y2="70%" />
          <line x1="0%" y1="0%" x2="70%" y2="55%" />
          <line x1="0%" y1="0%" x2="80%" y2="40%" />
          <line x1="0%" y1="0%" x2="85%" y2="30%" />
          <line x1="0%" y1="0%" x2="90%" y2="20%" />
          <line x1="0%" y1="0%" x2="45%" y2="60%" />
          <line x1="0%" y1="0%" x2="60%" y2="45%" />
          <line x1="0%" y1="0%" x2="40%" y2="50%" />
          <line x1="0%" y1="0%" x2="30%" y2="55%" />
          <line x1="0%" y1="0%" x2="50%" y2="35%" />
          <line x1="0%" y1="0%" x2="65%" y2="25%" />
          <line x1="0%" y1="0%" x2="75%" y2="15%" />
          <line x1="0%" y1="0%" x2="35%" y2="65%" />
          <line x1="0%" y1="0%" x2="25%" y2="40%" />
          <line x1="0%" y1="0%" x2="40%" y2="30%" />
          <line x1="0%" y1="0%" x2="15%" y2="25%" />
          <line x1="0%" y1="0%" x2="30%" y2="15%" />
          <line x1="0%" y1="0%" x2="10%" y2="20%" />
          <line x1="0%" y1="0%" x2="5%" y2="30%" />
          <line x1="0%" y1="0%" x2="20%" y2="10%" />
          
          <ellipse cx="0%" cy="0%" rx="80" ry="60" transform="translate(40, 30)" />
          <ellipse cx="0%" cy="0%" rx="140" ry="100" transform="translate(70, 50)" />
          <ellipse cx="0%" cy="0%" rx="200" ry="140" transform="translate(100, 70)" />
          <ellipse cx="0%" cy="0%" rx="260" ry="180" transform="translate(130, 90)" />
          <ellipse cx="0%" cy="0%" rx="320" ry="220" transform="translate(160, 110)" />
          <ellipse cx="0%" cy="0%" rx="380" ry="260" transform="translate(190, 130)" />
          <ellipse cx="0%" cy="0%" rx="440" ry="300" transform="translate(220, 150)" />
          <ellipse cx="0%" cy="0%" rx="500" ry="340" transform="translate(250, 170)" />
        </g>
        
        <g fill="#FFD700" opacity="0.6">
          <circle cx="5%" cy="10%" r="1.5" />
          <circle cx="10%" cy="15%" r="1.5" />
          <circle cx="15%" cy="20%" r="1.5" />
          <circle cx="20%" cy="15%" r="1.5" />
          <circle cx="25%" cy="10%" r="1.5" />
        </g>
      </svg>

      {/* Drag handle */}
      {isLeftPanelOpen && (
        <div
          onMouseDown={startDrag}
          style={{
            position: "absolute",
            right: "-3px",
            top: 0,
            width: "6px",
            height: "100%",
            cursor: "col-resize",
            background: "transparent",
            zIndex: 1000,
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#0066cc";
          }}
          onMouseLeave={(e) => {
            if (!isDragging.current) {
              e.currentTarget.style.background = "transparent";
            }
          }}
        />
      )}

      {/* USER INFO SECTION - Without Role/Dept/Desg */}
      {isLeftPanelOpen && currentUser && (
        <div 
          style={{ 
            padding: "12px 16px", 
            flexShrink: 0, 
            borderBottom: "1px solid #333",
            position: "relative", 
            zIndex: 3,
            background: "linear-gradient(135deg, rgba(0, 102, 204, 0.1) 0%, rgba(0, 102, 204, 0.05) 100%)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "600",
                flexShrink: 0,
              }}
            >
              {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ 
                fontSize: "13px", 
                fontWeight: "600", 
                whiteSpace: "nowrap", 
                overflow: "hidden", 
                textOverflow: "ellipsis",
                color: "#FFD700"
              }}>
                {currentUser.full_name || 'User'}
              </div>
              <div style={{ 
                fontSize: "10px", 
                color: "#aaa", 
                whiteSpace: "nowrap", 
                overflow: "hidden", 
                textOverflow: "ellipsis" 
              }}>
                {currentUser.email || 'No email'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH */}
      {isLeftPanelOpen && (
        <div style={{ padding: "16px 20px", flexShrink: 0, borderBottom: "1px solid #333", position: "relative", zIndex: 3 }}>
          <div
            style={{
              background: "#2a2a2a",
              borderRadius: "6px",
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid #333",
            }}
          >
            <Search size={14} style={{ color: "#666" }} />
            <input
              type="text"
              placeholder="Search..."
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                outline: "none",
                width: "100%",
                fontSize: "13px",
              }}
            />
          </div>
        </div>
      )}

      {/* MENU ITEMS */}
      <nav style={{ flex: 1, padding: isLeftPanelOpen ? "8px 12px" : "8px 8px", overflow: "auto", position: "relative", zIndex: 3 }}>
        {!isLeftPanelOpen && (
          <div
            style={{
              textAlign: "center",
              padding: "20px 8px",
              color: "#666",
              fontSize: "11px",
              lineHeight: "1.4",
              borderBottom: "1px solid #333",
              marginBottom: "8px",
            }}
          >
            Click on <span style={{ color: "#FFD700", fontWeight: "600" }}>Menu</span>
          </div>
        )}

        {/* Loading State */}
        {filterLoading && isLeftPanelOpen && (
          <div style={{
            padding: "20px",
            textAlign: "center",
            color: "#666",
            fontSize: "12px"
          }}>
            Loading menu...
          </div>
        )}

        {/* Show menu only after filtering */}
        {!filterLoading && (
          <>
            {/* Home Menu Item */}
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.path}
                  onClick={() => handleMenuClick(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    margin: "3px 0",
                    borderRadius: "4px",
                    cursor: isLeftPanelOpen ? "pointer" : "not-allowed",
                    background: "transparent",
                    color: isLeftPanelOpen ? "#aaa" : "#555",
                    transition: "all 0.15s ease",
                    justifyContent: isLeftPanelOpen ? "flex-start" : "center",
                    opacity: isLeftPanelOpen ? 1 : 0.5,
                  }}
                  onMouseEnter={(e) => {
                    if (isLeftPanelOpen) {
                      e.currentTarget.style.background = "#0066cc";
                      e.currentTarget.style.color = "white";
                      e.currentTarget.style.boxShadow = "0 0 15px rgba(255, 215, 0, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isLeftPanelOpen) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#aaa";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  <Icon size={16} />
                  {isLeftPanelOpen && (
                    <span style={{ fontSize: "12px", fontWeight: "500" }}>
                      {item.name}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Admin Master Dropdown - FILTERED */}
            {filteredAdminLinks.length > 0 && (
              <div>
                <div
                  onClick={handleAdminMasterToggle}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    margin: "3px 0",
                    borderRadius: "4px",
                    cursor: isLeftPanelOpen ? "pointer" : "not-allowed",
                    background: "transparent",
                    color: isLeftPanelOpen ? "#aaa" : "#555",
                    transition: "all 0.15s ease",
                    justifyContent: isLeftPanelOpen ? "flex-start" : "center",
                    opacity: isLeftPanelOpen ? 1 : 0.5,
                  }}
                  onMouseEnter={(e) => {
                    if (isLeftPanelOpen) {
                      e.currentTarget.style.background = "#0066cc";
                      e.currentTarget.style.color = "white";
                      e.currentTarget.style.boxShadow = "0 0 15px rgba(255, 215, 0, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isLeftPanelOpen) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#aaa";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  {isLeftPanelOpen && (
                    isAdminMasterOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                  )}
                  <Layout size={16} />
                  {isLeftPanelOpen && (
                    <span style={{ fontSize: "12px", fontWeight: "500" }}>
                      Admin Master
                    </span>
                  )}
                </div>

                {/* FILTERED Sub Items */}
                {isAdminMasterOpen && isLeftPanelOpen && (
                  <div style={{ marginLeft: "12px" }}>
                    {filteredAdminLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.path}
                          onClick={() => handleSubItemClick(item)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 12px",
                            margin: "3px 0",
                            borderRadius: "4px",
                            cursor: "pointer",
                            background: "transparent",
                            color: "#aaa",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#3385db";
                            e.currentTarget.style.color = "white";
                            e.currentTarget.style.boxShadow = "0 0 12px rgba(255, 215, 0, 0.3)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#aaa";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <Icon size={14} />
                          <span style={{ fontSize: "11px", fontWeight: "500" }}>
                            {item.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* FILTERED ICON PAGES */}
            {filteredIconPages.map((iconPage) => {
              const iconLinks = iconPage.links || [];
              
              return (
                <div key={iconPage.path}>
                  <div
                    onClick={() => handleIconPageToggle(iconPage.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      margin: "3px 0",
                      borderRadius: "4px",
                      cursor: isLeftPanelOpen ? "pointer" : "not-allowed",
                      background: "transparent",
                      color: isLeftPanelOpen ? "#aaa" : "#555",
                      transition: "all 0.15s ease",
                      justifyContent: isLeftPanelOpen ? "flex-start" : "center",
                      opacity: isLeftPanelOpen ? 1 : 0.5,
                    }}
                    onMouseEnter={(e) => {
                      if (isLeftPanelOpen) {
                        e.currentTarget.style.background = "#0066cc";
                        e.currentTarget.style.color = "white";
                        e.currentTarget.style.boxShadow = "0 0 15px rgba(255, 215, 0, 0.4)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isLeftPanelOpen) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#aaa";
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    {isLeftPanelOpen && (
                      openIconPages[iconPage.name] ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    )}
                    <Grid size={16} />
                    {isLeftPanelOpen && (
                      <span style={{ fontSize: "12px", fontWeight: "500" }}>
                        {iconPage.displayName}
                      </span>
                    )}
                  </div>

                  {/* Icon Page Sub-Links - FILTERED */}
                  {openIconPages[iconPage.name] && isLeftPanelOpen && iconLinks.length > 0 && (
                    <div style={{ marginLeft: "12px" }}>
                      {iconLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <div
                            key={link.path}
                            onClick={() => handleSubItemClick(link)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "8px 12px",
                              margin: "3px 0",
                              borderRadius: "4px",
                              cursor: "pointer",
                              background: "transparent",
                              color: "#aaa",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#3385db";
                              e.currentTarget.style.color = "white";
                              e.currentTarget.style.boxShadow = "0 0 12px rgba(255, 215, 0, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "#aaa";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <Icon size={14} />
                            <span style={{ fontSize: "11px", fontWeight: "500" }}>
                              {link.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* No Access Message */}
            {filteredAdminLinks.length === 0 && filteredIconPages.length === 0 && isLeftPanelOpen && (
              <div style={{
                padding: "20px",
                textAlign: "center",
                color: "#666",
                fontSize: "11px",
                lineHeight: "1.5"
              }}>
                No pages accessible.<br/>
                Contact administrator for access.
              </div>
            )}
          </>
        )}
      </nav>
    </div>
  );
}