"use client";
import React, { useState, useEffect } from "react";
import { Cpu, ArrowLeft } from "lucide-react";
import DeskIconGrid from "../components/DeskIconGrid";
import { usePanelWidth } from "../context/PanelWidthContext";
import { getAccessiblePages } from "../utils/rbacCache";

const TILES_WITH_RIGHT_PANEL = new Set([]);

const getSession = () => {
  try {
    const d = JSON.parse(sessionStorage.getItem("userData") || "{}");
    return d?.user || null;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Add your ERP Control tiles here when ready, e.g.:
// {
//   key: "erp-settings",
//   label: "ERP Settings",
//   sublabel: "Configure ERP settings",
//   icon: Settings,
//   color: "#f59e0b",
//   bg: "#fef3c7",
//   path: "erp-settings",
//   component: ERPSettings,
// },
// ─────────────────────────────────────────────────────────────────────────────
const ALL_TILES = [];

// ─────────────────────────────────────────────────────────────────────────────
// embeddedMode = true  → sirf content render karo (no header/footer)
//                        parent (AdminDashboard) header manage karega
// embeddedMode = false → standalone with own header/footer (default)
// onActiveTileChange   → parent ko batao ki kaunsa tile active hai (for breadcrumb)
// onBack               → parent ka back handler (embedded mode mein)
// ─────────────────────────────────────────────────────────────────────────────
export default function ERPControlDashboard({
  embeddedMode = false,
  onActiveTileChange,
  onBack,
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

  const handleTileClick = (tile) => {
    setActiveTile(tile.key);
    if (onActiveTileChange) onActiveTileChange(tile);
    if (TILES_WITH_RIGHT_PANEL.has(tile.key)) {
      setRightPanelOverride(tile.path);
    }
  };

  const handleBack = () => {
    if (activeTile) {
      if (TILES_WITH_RIGHT_PANEL.has(activeTile)) {
        setRightPanelOverride(null);
      }
      setActiveTile(null);
      if (onActiveTileChange) onActiveTileChange(null);
    } else if (embeddedMode && onBack) {
      onBack();
    }
  };

  const activeDef       = activeTile ? ALL_TILES.find((t) => t.key === activeTile) : null;
  const ActiveComponent = activeDef?.component || null;

  // ── EMPTY STATE UI ────────────────────────────────────────────────────────
  const EmptyState = () => (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: "32px 20px",
        color: "#94a3b8",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: "linear-gradient(135deg, #fef3c7, #fde68a)",
          border: "1.5px solid #f59e0b44",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Cpu size={30} color="#f59e0b" strokeWidth={1.5} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
          ERP Control Management
        </div>
        <div style={{ fontSize: 9.5, color: "#94a3b8", lineHeight: 1.6 }}>
          This section is under construction.
          <br />
          Modules will appear here once configured.
        </div>
      </div>
    </div>
  );

  // ── EMBEDDED MODE ────────────────────────────────────────────────────────
  if (embeddedMode) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: "#94a3b8",
            }}
          >
            Loading…
          </div>
        ) : !activeTile ? (
          ALL_TILES.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ flex: 1, overflow: "auto" }}>
              <DeskIconGrid
                tiles={ALL_TILES}
                allowedPaths={allowedPaths}
                activeTile={activeTile}
                onTileClick={handleTileClick}
              />
            </div>
          )
        ) : (
          <div style={{ flex: 1, overflow: "auto" }}>
            {ActiveComponent ? (
              <ActiveComponent embeddedMode={true} />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  fontSize: 10,
                  color: "#94a3b8",
                }}
              >
                Component coming soon…
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── STANDALONE MODE ──────────────────────────────────────────────────────
  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">

      {/* ── HEADER ── */}
      <div
        className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between flex-shrink-0"
        style={{
          height: "24px",
          paddingRight: "8px",
          background: "linear-gradient(to right, #92400e, #f59e0b)",
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
            <Cpu size={12} color="#fff" />
          )}
          <h2 className="m-0 text-xs font-semibold" style={{ color: "#fff" }}>
            {activeTile ? activeDef?.label : "ERP Control Management Dashboard"}
          </h2>
        </div>
      </div>

      {/* ── CONTENT ── */}
      {loading ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            color: "#94a3b8",
          }}
        >
          Loading…
        </div>
      ) : !activeTile ? (
        ALL_TILES.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ flex: 1, overflow: "auto" }}>
            <DeskIconGrid
              tiles={ALL_TILES}
              allowedPaths={allowedPaths}
              activeTile={activeTile}
              onTileClick={handleTileClick}
            />
          </div>
        )
      ) : (
        <div style={{ flex: 1, overflow: "auto" }}>
          {ActiveComponent ? (
            <ActiveComponent embeddedMode={true} />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                fontSize: 10,
                color: "#94a3b8",
              }}
            >
              Component coming soon…
            </div>
          )}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div
        className="px-2.5 border-t border-gray-300 flex-shrink-0"
        style={{
          height: "8px",
          background: "linear-gradient(to right, #f59e0b, #92400e)",
        }}
      />
    </div>
  );
}