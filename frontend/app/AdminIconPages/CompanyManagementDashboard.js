"use client";
import React, { useState, useEffect } from "react";
import { Building2, Building, ArrowLeft, GitBranch, DollarSign, Layers, Factory, Settings, Briefcase, Shield, LayoutList } from "lucide-react";
import DeskIconGrid from "../components/DeskIconGrid";
import AddCurrency from "../AdminIconPages/AddCurrency";
import AddCompanyType from "../AdminIconPages/AddCompanyType";
import AddIndustryType from "../AdminIconPages/AddIndustryType";
import AddPlant from "../AdminIconPages/AddPlant";
import AddPlantType from "../AdminIconPages/AddPlantType";
import AddRoleDepDesg from "../AdminIconPages/AddRoleDepDesg";
import RoleAccessForCompaniesPlant from "../AdminIconPages/RoleAccessForCompaniesPlant";
import PlantCompanyDetails from "../AdminIconPages/PlantCompanyDetails";
import AddCompany from "../components/AddCompany";
// TODO: Import your actual Company page components below
// import CompanyPlantAccess from "../AdminIconPages/CompanyPlantAccess";
import { usePanelWidth } from "../context/PanelWidthContext";
import { getAccessiblePages } from "../utils/rbacCache";

const TILES_WITH_RIGHT_PANEL = new Set([
  // "company-plant-access",
]);

const getSession = () => {
  try {
    const d = JSON.parse(sessionStorage.getItem("userData") || "{}");
    return d?.user || null;
  } catch {
    return null;
  }
};

const ALL_TILES = [
  {
    key: "add-company",
    label: "Add Company",
    sublabel: "Create & manage companies",
    icon: Building,
    color: "#10b981",
    bg: "#d1fae5",
    path: "add-company",
    // component: AddCompany,
    component: AddCompany,
  },
  {
    key: "company-plant-access",
    label: "Plant Access Control",
    sublabel: "Manage company plant access",
    icon: GitBranch,
    color: "#059669",
    bg: "#a7f3d0",
    path: "company-plant-access",
    // component: CompanyPlantAccess,
    component: null,
  },
  {
    key: "add-currency",
    label: "Add Currency",
    sublabel: "Create & manage currencies",
    icon: DollarSign,
    color: "#f59e0b",
    bg: "#fef3c7",
    path: "add-currency",
    component: AddCurrency,
  },
  {
    key: "add-company-type",
    label: "Add Company Type",
    sublabel: "Create & manage company types",
    icon: Briefcase,
    color: "#6366f1",
    bg: "#eef2ff",
    path: "add-company-type",
    component: AddCompanyType,
  },
  {
    key: "add-industry-type",
    label: "Add Industry Type",
    sublabel: "Create & manage industry types",
    icon: Layers,
    color: "#0ea5e9",
    bg: "#e0f2fe",
    path: "add-industry-type",
    component: AddIndustryType,
  },
  {
    key: "add-plant",
    label: "Add Plant",
    sublabel: "Create & manage plants",
    icon: Factory,
    color: "#8b5cf6",
    bg: "#ede9fe",
    path: "add-plant",
    component: AddPlant,
  },
  {
    key: "add-plant-type",
    label: "Add Plant Type",
    sublabel: "Create & manage plant types",
    icon: Settings,
    color: "#ec4899",
    bg: "#fce7f3",
    path: "add-plant-type",
    component: AddPlantType,
  },
  {
    key: "add-role-dep-desg",
    label: "Role / Dept / Desg",
    sublabel: "Manage roles, departments & designations",
    icon: Building2,
    color: "#14b8a6",
    bg: "#ccfbf1",
    path: "add-role-dep-desg",
    component: AddRoleDepDesg,
  },
  {
    key: "role-access-companies-plant",
    label: "Role Access",
    sublabel: "Manage role access for companies & plants",
    icon: Shield,
    color: "#dc2626",
    bg: "#fee2e2",
    path: "role-access-companies-plant",
    component: RoleAccessForCompaniesPlant,
  },
  {
    key: "plant-company-details",
    label: "Plant & Company Details",
    sublabel: "View complete business hierarchy",
    icon: LayoutList,
    color: "#2563eb",
    bg: "#dbeafe",
    path: "plant-company-details",
    component: PlantCompanyDetails,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// embeddedMode = true  → sirf content render karo (no header/footer)
//                        parent (AdminDashboard) header manage karega
// embeddedMode = false → standalone with own header/footer (default)
// onActiveTileChange   → parent ko batao ki kaunsa tile active hai (for breadcrumb)
// onBack               → parent ka back handler (embedded mode mein)
// backSignal           → parent se back trigger (number, har baar badhta hai)
// ─────────────────────────────────────────────────────────────────────────────
export default function CompanyManagementDashboard({
  embeddedMode = false,
  onActiveTileChange,
  onBack,
  backSignal = 0,
}) {
  const user = getSession();
  const userId = user?.id;

  const { setRightPanelOverride } = usePanelWidth();

  const [allowedPaths, setAllowedPaths] = useState(null);
  const [activeTile,   setActiveTile]   = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!userId) { setLoading(false); return; }
      try {
        const accessiblePages = await getAccessiblePages();
        if (!accessiblePages || accessiblePages.length === 0) {
          setAllowedPaths(null);
          return;
        }
        const paths = new Set(
          accessiblePages
            .map((p) => p.page_url || "")
            .filter(Boolean)
            .map((u) => u.replace(/\/$/, "").split("/").pop())
        );
        setAllowedPaths(paths);
      } catch {
        setAllowedPaths(null);
      } finally {
        setLoading(false);
      }
    };
    checkAccess();
  }, [userId]);

  // ── When parent sends a backSignal, go back to tile grid ──────────────────
  useEffect(() => {
    if (backSignal > 0 && activeTile) {
      if (TILES_WITH_RIGHT_PANEL.has(activeTile)) setRightPanelOverride(null);
      setActiveTile(null);
      if (onActiveTileChange) onActiveTileChange(null);
    }
  }, [backSignal]);

  const handleTileClick = (tile) => {
    setActiveTile(tile.key);
    if (onActiveTileChange) onActiveTileChange(tile);
    if (TILES_WITH_RIGHT_PANEL.has(tile.key)) {
      setRightPanelOverride(tile.path);
    }
  };

  const handleBack = () => {
    if (activeTile) {
      if (TILES_WITH_RIGHT_PANEL.has(activeTile)) setRightPanelOverride(null);
      setActiveTile(null);
      if (onActiveTileChange) onActiveTileChange(null);
    } else if (embeddedMode && onBack) {
      onBack();
    }
  };

  const activeDef       = activeTile ? ALL_TILES.find((t) => t.key === activeTile) : null;
  const ActiveComponent = activeDef?.component || null;

  // ── EMBEDDED MODE — only content, no header/footer ──────────────────────────
  if (embeddedMode) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#94a3b8" }}>
            Loading…
          </div>
        ) : !activeTile ? (
          <div style={{ flex: 1, overflow: "auto" }}>
            <DeskIconGrid
              tiles={ALL_TILES}
              allowedPaths={allowedPaths}
              activeTile={activeTile}
              onTileClick={handleTileClick}
            />
          </div>
        ) : (
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
      </div>
    );
  }

  // ── STANDALONE MODE — with own header/footer ─────────────────────────────────
  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* ── HEADER ── */}
      <div
        className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between flex-shrink-0"
        style={{
          height: "24px",
          paddingRight: "8px",
          background: "linear-gradient(to right, #065f46, #10b981)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {activeTile ? (
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
            <Building2 size={12} color="#fff" />
          )}
          <h2 className="m-0 text-xs font-semibold" style={{ color: "#fff" }}>
            {activeTile ? activeDef?.label : "Company Management Dashboard"}
          </h2>
        </div>
      </div>

      {/* ── CONTENT ── */}
      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#94a3b8" }}>
          Loading…
        </div>
      ) : !activeTile ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <DeskIconGrid
            tiles={ALL_TILES}
            allowedPaths={allowedPaths}
            activeTile={activeTile}
            onTileClick={handleTileClick}
          />
        </div>
      ) : (
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

      {/* ── FOOTER ── */}
      <div
        className="px-2.5 border-t border-gray-300 flex-shrink-0"
        style={{
          height: "8px",
          background: "linear-gradient(to right, #10b981, #065f46)",
        }}
      />
    </div>
  );
}