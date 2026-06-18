"use client";
import React, { useState, useEffect, useRef } from "react";
import { LayoutDashboard, ArrowLeft, Users, Home, Building2, Cpu, UserPlus, Shield, Building, GitBranch, DollarSign, Layers, Factory, Settings, Briefcase, LayoutList } from "lucide-react";
import UserManagementDashboard from "./UserManagementDashboard";
import CompanyManagementDashboard from "./CompanyManagementDashboard";
import ERPControlDashboard from "./ERPControlDashboard";
import UserManagementSystem from "../AdminIconPages/AddUser";
import UserPlantCompanyAccess from "../AdminIconPages/UsersPlantCompanyAccess";
import AddCurrency from "../AdminIconPages/AddCurrency";
import AddCompanyType from "../AdminIconPages/AddCompanyType";
import AddIndustryType from "../AdminIconPages/AddIndustryType";
import AddPlant from "../AdminIconPages/AddPlant";
import AddPlantType from "../AdminIconPages/AddPlantType";
import AddRoleDepDesg from "../AdminIconPages/AddRoleDepDesg";
import RoleAccessForCompaniesPlant from "../AdminIconPages/RoleAccessForCompaniesPlant";
import PlantCompanyDetails from "../AdminIconPages/PlantCompanyDetails";
import AddCompany from "../components/AddCompany";
import { usePanelWidth } from "../context/PanelWidthContext";
import { getAccessiblePages } from "../utils/rbacCache";

// ── All top-level tiles with their sub-tiles ──────────────────────────────────
const ALL_TILES = [
  {
    key: "user-management-dashboard",
    label: "User Management",
    icon: Users,
    color: "#6366f1",
    colorEnd: "#8b5cf6",
    glow: "rgba(99,102,241,0.3)",
    path: "user-management-dashboard",
    subTiles: [
      {
        key: "add-user",
        label: "Add User",
        sublabel: "Create & manage users",
        icon: UserPlus,
        color: "#6366f1",
        bg: "#eef2ff",
        path: "add-user",
        component: UserManagementSystem,
      },
      {
        key: "user-plant-company-access",
        label: "User Access Control",
        sublabel: "Manage user plant & company access",
        icon: Shield,
        color: "#0ea5e9",
        bg: "#e0f2fe",
        path: "user-plant-company-access",
        component: UserPlantCompanyAccess,
      },
    ],
  },
  {
    key: "company-management-dashboard",
    label: "Company Management",
    icon: Building2,
    color: "#10b981",
    colorEnd: "#059669",
    glow: "rgba(16,185,129,0.3)",
    path: "company-management-dashboard",
    subTiles: [
      { key: "add-company", label: "Add Company", sublabel: "Create & manage companies", icon: Building, color: "#10b981", bg: "#d1fae5", path: "add-company", component: AddCompany },

      { key: "add-currency", label: "Add Currency", sublabel: "Create & manage currencies", icon: DollarSign, color: "#f59e0b", bg: "#fef3c7", path: "add-currency", component: AddCurrency },
      { key: "add-company-type", label: "Add Company Type", sublabel: "Create & manage company types", icon: Briefcase, color: "#6366f1", bg: "#eef2ff", path: "add-company-type", component: AddCompanyType },
      { key: "add-industry-type", label: "Add Industry Type", sublabel: "Create & manage industry types", icon: Layers, color: "#0ea5e9", bg: "#e0f2fe", path: "add-industry-type", component: AddIndustryType },
      { key: "add-plant", label: "Add Plant", sublabel: "Create & manage plants", icon: Factory, color: "#8b5cf6", bg: "#ede9fe", path: "add-plant", component: AddPlant },
      { key: "add-plant-type", label: "Add Plant Type", sublabel: "Create & manage plant types", icon: Settings, color: "#ec4899", bg: "#fce7f3", path: "add-plant-type", component: AddPlantType },
      { key: "add-role-dep-desg", label: "Role / Dept / Desg", sublabel: "Manage roles, departments & designations", icon: Building2, color: "#14b8a6", bg: "#ccfbf1", path: "add-role-dep-desg", component: AddRoleDepDesg },
      { key: "role-access-companies-plant", label: "Role Access", sublabel: "Manage role access for companies & plants", icon: Shield, color: "#dc2626", bg: "#fee2e2", path: "role-access-companies-plant", component: RoleAccessForCompaniesPlant },
      { key: "plant-company-details", label: "Plant & Company Details", sublabel: "View complete business hierarchy", icon: LayoutList, color: "#2563eb", bg: "#dbeafe", path: "plant-company-details", component: PlantCompanyDetails },
    ],
  },
  {
    key: "erp-control-dashboard",
    label: "ERP Control",
    icon: Cpu,
    color: "#f59e0b",
    colorEnd: "#d97706",
    glow: "rgba(245,158,11,0.3)",
    path: "erp-control-dashboard",
    subTiles: [],
  },
];

// ── Compact Top Icon (level-1) ────────────────────────────────────────────────
function TopIcon({ tile, active, onClick }) {
  const Icon = tile.icon;
  return (
    <button
      onClick={onClick}
      title={tile.label}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        padding: "5px 10px",
        background: active ? `${tile.color}18` : "transparent",
        border: active ? `1px solid ${tile.color}55` : "1px solid transparent",
        borderRadius: 8,
        cursor: "pointer",
        transition: "all 0.18s",
        flexShrink: 0,
        minWidth: 60,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = `${tile.color}10`; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: active
          ? `linear-gradient(135deg, ${tile.color}, ${tile.colorEnd})`
          : `${tile.color}20`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.18s",
        boxShadow: active ? `0 2px 8px ${tile.glow}` : "none",
      }}>
        <Icon size={14} color={active ? "#fff" : tile.color} strokeWidth={2} />
      </div>
      <span style={{
        fontSize: 8.5,
        fontWeight: active ? 700 : 500,
        color: active ? tile.color : "#64748b",
        letterSpacing: 0.1,
        whiteSpace: "nowrap",
        lineHeight: 1.2,
        textAlign: "center",
        maxWidth: 64,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {tile.label}
      </span>
      {active && (
        <div style={{ width: 20, height: 2, borderRadius: 1, background: tile.color, marginTop: 1 }} />
      )}
    </button>
  );
}

// ── Sub-Icon (level-2) ────────────────────────────────────────────────────────
function SubIcon({ tile, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  const Icon = tile.icon;
  const isOn = active || hovered;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={tile.sublabel}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "6px 8px",
        background: isOn ? `${tile.color}15` : "transparent",
        border: isOn ? `1px solid ${tile.color}40` : "1px solid #e2e8f0",
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 0.15s",
        flexShrink: 0,
        width: 68,
        minWidth: 68,
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        background: isOn ? tile.color : tile.bg || `${tile.color}15`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s",
        flexShrink: 0,
      }}>
        <Icon size={15} color={isOn ? "#fff" : tile.color} strokeWidth={1.8} />
      </div>
      <span style={{
        fontSize: 8,
        fontWeight: 600,
        color: isOn ? tile.color : "#475569",
        letterSpacing: 0.1,
        whiteSpace: "normal",
        lineHeight: 1.3,
        textAlign: "center",
        width: "100%",
      }}>
        {tile.label}
      </span>
    </button>
  );
}

// ── Main AdminDashboard ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { setRightPanelOverride } = usePanelWidth();

  const [allowedPaths,   setAllowedPaths]   = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [activeTopKey,   setActiveTopKey]   = useState(null); // level-1 tile key
  const [activeSubKey,   setActiveSubKey]   = useState(null); // level-2 sub-tile key

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const accessiblePages = await getAccessiblePages();
        if (!accessiblePages || accessiblePages.length === 0) { setAllowedPaths(new Set()); return; }
        const allowed = new Set();
        ALL_TILES.forEach(tile => {
          const has = accessiblePages.some(page =>
            page.page_url?.includes(tile.path) ||
            page.page_name?.toLowerCase().includes(tile.label.toLowerCase())
          );
          if (has) allowed.add(tile.path);
        });
        setAllowedPaths(allowed);
      } catch { setAllowedPaths(null); }
      finally { setLoading(false); }
    };
    checkAccess();
  }, []);

  const visibleTiles = ALL_TILES.filter(
    t => allowedPaths === null || allowedPaths.has(t.path) || allowedPaths.has(t.key)
  );

  const activeTopTile = activeTopKey ? ALL_TILES.find(t => t.key === activeTopKey) : null;
  const activeSubTile = activeTopTile && activeSubKey
    ? activeTopTile.subTiles.find(s => s.key === activeSubKey)
    : null;

  const ActiveComponent = activeSubTile?.component || null;

  // ── Header title ────────────────────────────────────────────────────────────
  const headerTitle = activeSubTile
    ? activeSubTile.label
    : activeTopTile
    ? activeTopTile.label
    : "Admin Dashboard";

  const handleTopClick = (tile) => {
    if (activeTopKey === tile.key) {
      // toggle off
      setActiveTopKey(null);
      setActiveSubKey(null);
    } else {
      setActiveTopKey(tile.key);
      setActiveSubKey(null);
    }
  };

  const handleSubClick = (sub) => {
    setActiveSubKey(sub.key);
  };

  const handleBack = () => {
    if (activeSubKey) {
      // Sub-tile se wapas sub-icon grid pe (top tile selected rahega)
      setActiveSubKey(null);
    } else if (activeTopKey) {
      // Top tile se wapas dashboard pe
      setActiveTopKey(null);
    }
  };

  const handleHome = () => {
    setActiveTopKey(null);
    setActiveSubKey(null);
    setRightPanelOverride(null);
  };

  const showBack = !!activeTopKey; // Back button tab dikhe jab koi top tile selected ho
  const showHome = !!activeSubKey; // Home button tab dikhe jab sub-tile active ho

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">

      {/* ── HEADER ── */}
      <div
        className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white flex-shrink-0"
        style={{ height: "24px", paddingRight: "8px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {showBack ? (
            <button
              onClick={handleBack}
              style={{
                display: "flex", alignItems: "center", gap: 3,
                background: "rgba(255,255,255,.15)",
                border: "1px solid rgba(255,255,255,.3)",
                color: "#fff", borderRadius: 4,
                padding: "1px 7px", cursor: "pointer",
                fontSize: 9, fontWeight: 700,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.25)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.15)")}
            >
              <ArrowLeft size={9} /> Back
            </button>
          ) : (
            <LayoutDashboard size={12} color="#fff" />
          )}
          <h2 className="m-0 text-xs font-semibold">{headerTitle}</h2>
        </div>
        {showHome && (
          <button
            onClick={handleHome}
            title="Back to Admin Dashboard"
            style={{
              display: "flex", alignItems: "center", gap: 3,
              background: "rgba(255,255,255,.15)",
              border: "1px solid rgba(255,255,255,.3)",
              color: "#fff", borderRadius: 4,
              padding: "1px 7px", cursor: "pointer",
              fontSize: 9, fontWeight: 700,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.15)")}
          >
            <Home size={9} /> Home
          </button>
        )}
      </div>

      {/* ── TOP ICON BAR (always visible, compact) ── */}
      {!loading && (
        <div style={{
          borderBottom: "1px solid #e2e8f0",
          background: "#f8fafc",
          padding: "6px 12px",
          display: "flex",
          alignItems: "center",
          gap: 4,
          flexWrap: "wrap",
          flexShrink: 0,
        }}>
          {visibleTiles.map(tile => (
            <TopIcon
              key={tile.key}
              tile={tile}
              active={activeTopKey === tile.key}
              onClick={() => handleTopClick(tile)}
            />
          ))}
        </div>
      )}

      {/* ── SUB ICON BAR (hamesha dikhe jab top tile selected ho) ── */}
      {activeTopTile && activeTopTile.subTiles.length > 0 && (
        <div style={{
          borderBottom: "1px solid #e2e8f0",
          background: "#fff",
          padding: "8px 12px",
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
          flexWrap: "wrap",
          flexShrink: 0,
        }}>
          {activeTopTile.subTiles.map(sub => (
            <SubIcon
              key={sub.key}
              tile={sub}
              active={activeSubKey === sub.key}
              onClick={() => handleSubClick(sub)}
            />
          ))}
        </div>
      )}

      {/* ── ERP EMPTY STATE ── */}
      {activeTopTile && activeTopTile.subTiles.length === 0 && !activeSubKey && (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          color: "#94a3b8",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `${activeTopTile.color}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {React.createElement(activeTopTile.icon, { size: 26, color: activeTopTile.color, strokeWidth: 1.5 })}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 3 }}>
              {activeTopTile.label}
            </div>
            <div style={{ fontSize: 9.5, color: "#94a3b8", lineHeight: 1.6 }}>
              This section is under construction.
              <br />
              Modules will appear here once configured.
            </div>
          </div>
        </div>
      )}

      {/* ── COMPONENT VIEW ── */}
      {activeSubKey && (
        <div style={{ flex: 1, overflow: "auto" }}>
          {ActiveComponent
            ? <ActiveComponent embeddedMode={true} />
            : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 10, color: "#94a3b8" }}>
                Component coming soon…
              </div>
            )
          }
        </div>
      )}

      {/* ── DEFAULT: No tile selected ── */}
      {!activeTopKey && !loading && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "#94a3b8" }}>
          <LayoutDashboard size={32} color="#cbd5e1" strokeWidth={1.2} />
          <span style={{ fontSize: 10 }}>Select a module above to get started</span>
        </div>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#94a3b8" }}>
          Loading…
        </div>
      )}

      {/* ── FOOTER ── */}
      <div
        className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700 flex-shrink-0"
        style={{ height: "8px" }}
      />
    </div>
  );
}