// components/DeskIconGrid.js
// ─────────────────────────────────────────────────────────────────────────────
// Reusable compact icon-tile grid — handles 100+ icons efficiently.
// Props:
//   tiles        : array of { key, label, sublabel, icon: LucideComponent, color, bg, path }
//   allowedPaths : Set of allowed path strings (RBAC). null = show all.
//   onTileClick  : (tile) => void
//   activeTile   : currently active tile key (string | null)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from "react";

const API_BASE = "http://localhost:8000/api";

// Map tile path → API endpoint + display field
const TILE_API_MAP = {
  "add-company":                { endpoint: "/companies",      field: "company_name",  label: "Companies" },
  "add-currency":               { endpoint: "/currencies",     field: "currency_name", label: "Currencies" },
  "add-company-type":           { endpoint: "/company-types",  field: "type_name",     label: "Company Types" },
  "add-industry-type":          { endpoint: "/industry-types", field: "industry_name", label: "Industry Types" },
  "add-plant":                  { endpoint: "/plants",         field: "plant_name",    label: "Plants" },
  "add-plant-type":             { endpoint: "/plant-types",    field: "type_name",     label: "Plant Types" },
  "add-role-dep-desg":          { endpoint: "/roles",          field: "role_name",     label: "Roles" },
  "role-access-companies-plant":{ endpoint: "/role-access",    field: "role_name",     label: "Records" },
  "add-user":                   { endpoint: "/users",          field: "username",      label: "Users" },
  "user-plant-company-access":  { endpoint: "/user-access",    field: "username",      label: "Records" },
};

// ── Single compact tile ───────────────────────────────────────────────────────
const IconTile = ({ tile, active, onClick }) => {
  const Icon = tile.icon;
  const [hovered, setHovered] = useState(false);
  const [count, setCount] = useState(null);
  const [preview, setPreview] = useState([]);

  useEffect(() => {
    const apiInfo = TILE_API_MAP[tile.key];
    if (!apiInfo) return;
    fetch(`${API_BASE}${apiInfo.endpoint}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCount(data.length);
          setPreview(data.slice(0, 3).map(item => item[apiInfo.field] || "").filter(Boolean));
        }
      })
      .catch(() => {});
  }, [tile.key]);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={tile.sublabel || tile.label}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        width: "100%",
        aspectRatio: "1 / 1",
        background: active
          ? `${tile.color}cc`
          : hovered
          ? `${tile.bg}cc`
          : `${tile.bg}77`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "none",
        borderRadius: 0,
        cursor: "pointer",
        transition: "all .2s ease",
        boxShadow: active
          ? `inset 0 0 0 3px ${tile.color}88, inset 0 2px 0 rgba(255,255,255,0.3)`
          : hovered
          ? `inset 0 0 0 2px ${tile.color}33`
          : "none",
        outline: "none",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glass shine overlay */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: "45%",
        background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)",
        borderRadius: "0",
        pointerEvents: "none",
      }} />

      {/* Icon circle — glass style */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: active
            ? "rgba(255,255,255,0.25)"
            : `${tile.bg}bb`,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: `1.5px solid ${active ? "rgba(255,255,255,0.4)" : tile.color + "33"}`,
          boxShadow: `0 2px 8px ${tile.color}22, inset 0 1px 0 rgba(255,255,255,0.5)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={26} color={active ? "#fff" : tile.color} />
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.3,
          color: active ? "#fff" : "#374151",
          wordBreak: "break-word",
          padding: "0 8px",
          textShadow: active ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
        }}
      >
        {tile.label}
      </span>

      {/* Sublabel */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 400,
          textAlign: "center",
          lineHeight: 1.3,
          color: active ? "rgba(255,255,255,0.85)" : tile.color + "aa",
          wordBreak: "break-word",
          padding: "0 8px",
        }}
      >
        {tile.sublabel}
      </span>

      {/* Live count badge */}
      {count !== null && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 4,
          padding: "2px 10px",
          background: active ? "rgba(255,255,255,0.2)" : `${tile.color}18`,
          borderRadius: 20,
          marginTop: 2,
        }}>
          <span style={{
            fontSize: 13, fontWeight: 800,
            color: active ? "#fff" : tile.color,
            lineHeight: 1,
          }}>{count}</span>
          <span style={{
            fontSize: 8, fontWeight: 500,
            color: active ? "rgba(255,255,255,0.8)" : tile.color + "99",
            lineHeight: 1,
          }}>{TILE_API_MAP[tile.key]?.label}</span>
        </div>
      )}

      {/* Preview names */}
      {preview.length > 0 && (
        <div style={{
          width: "100%",
          padding: "4px 10px 0",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {preview.map((name, i) => (
            <div key={i} style={{
              fontSize: 8,
              color: active ? "rgba(255,255,255,0.75)" : "#64748b",
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              padding: "1px 4px",
              background: active ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.03)",
              borderRadius: 3,
            }}>{name}</div>
          ))}
          {count > 3 && (
            <div style={{
              fontSize: 8, textAlign: "center",
              color: active ? "rgba(255,255,255,0.6)" : tile.color + "88",
            }}>+{count - 3} more</div>
          )}
        </div>
      )}
    </button>
  );
};

// ── Main grid component ───────────────────────────────────────────────────────
const DeskIconGrid = ({ tiles = [], allowedPaths = null, onTileClick, activeTile = null }) => {
  // Filter by RBAC
  const visible = tiles.filter(
    (t) => allowedPaths === null || allowedPaths.has(t.path) || allowedPaths.has(t.key)
  );

  if (visible.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "30px 16px",
          color: "#94a3b8",
          fontSize: 10,
        }}
      >
        No modules available. Contact your administrator.
      </div>
    );
  }

  const scrollRef = useRef(null);
  const [showLeft, setShowLeft]   = useState(false);
  const [showRight, setShowRight] = useState(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 4);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  // 4 columns, 2 rows per page — scroll horizontally for more
  const COLS = 4;
  const ROWS = 2;
  const tilesPerPage = COLS * ROWS;
  const pages = Math.ceil(visible.length / tilesPerPage);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>

      {/* Left Arrow */}
      {showLeft && (
        <button
          onClick={() => scroll(-1)}
          style={{
            position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
            zIndex: 10, width: 32, height: 32, borderRadius: "50%",
            background: "rgba(255,255,255,0.95)", border: "1.5px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, color: "#374151", lineHeight: 1,
          }}
        >‹</button>
      )}

      {/* Right Arrow */}
      {showRight && (
        <button
          onClick={() => scroll(1)}
          style={{
            position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
            zIndex: 10, width: 32, height: 32, borderRadius: "50%",
            background: "rgba(255,255,255,0.95)", border: "1.5px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, color: "#374151", lineHeight: 1,
          }}
        >›</button>
      )}

      {/* Scrollable container — scrollbar hidden */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          width: "100%", height: "100%",
          overflowX: "scroll", overflowY: "hidden",
          boxSizing: "border-box",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{".deskgrid-scroll::-webkit-scrollbar { display: none; }"}</style>

        <div
          className="deskgrid-scroll"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${pages * COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            gap: "1.5px",
            padding: "0",
            background: "rgba(0,0,0,0.06)",
            width: `${pages * 100}%`,
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          {visible.map((tile) => (
            <IconTile
              key={tile.key}
              tile={tile}
              active={activeTile === tile.key}
              onClick={() => onTileClick && onTileClick(tile)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeskIconGrid;