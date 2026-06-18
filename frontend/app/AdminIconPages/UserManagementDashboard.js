"use client";
import React, { useState, useEffect } from "react";
import { Users, UserPlus, ArrowLeft, Shield } from "lucide-react";
import DeskIconGrid from "../components/DeskIconGrid";
import UserManagementSystem from "../AdminIconPages/AddUser";
import UserPlantCompanyAccess from "../AdminIconPages/UsersPlantCompanyAccess";
import { usePanelWidth } from "../context/PanelWidthContext";
import { getAccessiblePages } from "../utils/rbacCache";

const API_BASE = "http://localhost:8000/api";

const TILES_WITH_RIGHT_PANEL = new Set(["user-plant-company-access"]);

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
];

// ─────────────────────────────────────────────────────────────────────────────
// embeddedMode = true  → sirf content render karo (no header/footer)
//                        parent (AdminDashboard) header manage karega
// embeddedMode = false → standalone with own header/footer (default)
// onActiveTileChange   → parent ko batao ki kaunsa tile active hai (for breadcrumb)
// onBack               → parent ka back handler (embedded mode mein)
// backSignal           → parent se back trigger (number, har baar badhta hai)
// ─────────────────────────────────────────────────────────────────────────────
export default function UserManagementDashboard({
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
    if (onActiveTileChange) onActiveTileChange(tile); // notify parent
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
            {ActiveComponent && <ActiveComponent embeddedMode={true} />}
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
        className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white flex-shrink-0"
        style={{ height: "24px", paddingRight: "8px" }}
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
            <Users size={12} color="#fff" />
          )}
          <h2 className="m-0 text-xs font-semibold">
            {activeTile ? activeDef?.label : "User Management Dashboard"}
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
          {ActiveComponent && <ActiveComponent embeddedMode={true} />}
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