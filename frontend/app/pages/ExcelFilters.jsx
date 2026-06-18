/**
 * ExcelFilters.jsx
 * Handles:
 *   - Column visibility toggle (tabs: Show All / Minimum / Filter=Zero/Null)
 *   - Date filter panel (exact / range / sort)
 *   - Search input
 */

import { useState } from "react";

const ExcelFilters = ({
  // Column visibility
  headers, visibleCols, dateColumns, toggleCol, setVisibleCols,
  // Date filter
  hasDateFilter, activeDateCol, setActiveDateCol,
  dateFilterMode, setDateFilterMode,
  dateExact, setDateExact,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  applyDateFilter, clearDateFilter,
  sortKey, sortDir, setSortKey, setSortDir,
  // Zero filter
  colsWithZeros, zeroNullStats,
  hasZeroFilter, excludeZeroCols, setExcludeZeroCols,
  isServer, runServer, currentFile, activeSheet, buildDateParams, serverSheet,
  // Search
  search: searchVal, pageSize: pageSizeVal,
  // shared
  COLORS, Icon, ICONS, setPage,
}) => {
  const [colPanelSearch, setColPanelSearch] = useState("");
  const [colPanelTab,    setColPanelTab]    = useState("showAll");

  return (
    <>
      {/* ── Column Toggle Panel ── */}
      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.border}`,
        borderRadius: 10, marginBottom: 14, overflow: "hidden",
        height: 230,  display: "flex", flexDirection: "column",
      }}>
        {/* Search bar — always visible */}
        <div style={{ padding: "8px 10px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <Icon d={ICONS.eye} size={13} color={COLORS.textMuted} />
          <input
            value={colPanelSearch}
            onChange={e => setColPanelSearch(e.target.value)}
            placeholder={colPanelTab === "filter" ? "Search zero/null columns..." : "Search columns..."}
            style={{
              flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              borderRadius: 6, padding: "4px 8px", color: COLORS.text,
              fontSize: 11, outline: "none", fontFamily: "inherit",
            }}
          />
        </div>

        {/* Tabs — styled as colored buttons */}
        <div style={{ display: "flex", gap: 6, padding: "7px 8px", borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
          {[
            { key: "showAll", label: "Show All",    color: COLORS.accent,    bg: "rgba(79,142,247,0.15)",  border: "rgba(79,142,247,0.4)"  },
            { key: "minimum", label: "Minimum",     color: "#a78bfa",         bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.4)" },
            { key: "filter",  label: "Filter",      color: "#fb923c",         bg: "rgba(251,146,60,0.15)",  border: "rgba(251,146,60,0.4)"  },
            ...(dateColumns.length > 0 ? [{ key: "date", label: "Date Filter", color: COLORS.dateText || "#818cf8", bg: "rgba(129,140,248,0.15)", border: "rgba(129,140,248,0.4)" }] : []),
          ].map(t => (
            <button key={t.key}
              onClick={() => {
                setColPanelSearch("");
                setColPanelTab(t.key);
                if (t.key === "showAll") setVisibleCols(headers);
                if (t.key === "minimum") setVisibleCols([headers[0]]);
              }}
              style={{
                flex: 1, padding: "5px 4px", fontSize: 11, fontWeight: 700,
                background: colPanelTab === t.key ? t.bg : "transparent",
                color: colPanelTab === t.key ? t.color : COLORS.textMuted,
                border: `1px solid ${colPanelTab === t.key ? t.border : COLORS.border}`,
                borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s",
                outline: colPanelTab === t.key ? `2px solid ${t.color}33` : "none",
                outlineOffset: 2,
              }}
            >
              {t.key === "filter" && hasZeroFilter
                ? `Filter (${excludeZeroCols.length})`
                : t.key === "date" && hasDateFilter
                ? "Date ✦"
                : t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {colPanelTab === "filter" ? (
          /* ── Zero / Null Filter ── */
          <div style={{ flex: 1, overflow: "hidden", padding: "10px 10px 8px", display: "flex", flexDirection: "column" }}>
            {colsWithZeros.length === 0 ? (
              <span style={{ color: COLORS.textFaint, fontSize: 11 }}>No zero/null columns detected</span>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexShrink: 0 }}>
                  <span style={{ color: "#fb923c", fontSize: 11, fontWeight: 600 }}>
                    🔍 Click to hide rows with zero / null / empty:
                    <span style={{ color: COLORS.textFaint, fontWeight: 400, marginLeft: 8 }}>(auto-detected from your data)</span>
                  </span>
                  {hasZeroFilter && (
                    <button
                      onClick={() => {
                        setExcludeZeroCols([]);
                        setPage(1);
                        if (isServer) {
                          runServer("Clearing zero filter…", () =>
                            serverSheet({ file: currentFile, sheet: activeSheet, pg: 1, ps: pageSizeVal, q: searchVal, sk: sortKey, sd: sortDir, ...buildDateParams([]) })
                          );
                        }
                      }}
                      style={{
                        background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
                        color: "#f87171", borderRadius: 7, padding: "3px 10px",
                        fontSize: 11, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                      }}
                    >✕ Clear</button>
                  )}
                </div>
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexWrap: "wrap", gap: 6, alignContent: "flex-start" }}>
                  {(colPanelSearch.trim()
                    ? colsWithZeros.filter(c => c.toLowerCase().includes(colPanelSearch.toLowerCase()))
                    : colsWithZeros
                  ).map(col => {
                    const stat = zeroNullStats[col];
                    const isActive = excludeZeroCols.includes(col);
                    return (
                      <button key={col}
                        className={`zero-col-btn ${isActive ? "active" : ""}`}
                        onClick={() => {
                          const next = isActive
                            ? excludeZeroCols.filter(c => c !== col)
                            : [...excludeZeroCols, col];
                          setExcludeZeroCols(next);
                          setPage(1);
                          if (isServer) {
                            runServer(`Filtering ${col}…`, () =>
                              serverSheet({ file: currentFile, sheet: activeSheet, pg: 1, ps: pageSizeVal, q: searchVal, sk: sortKey, sd: sortDir, ...buildDateParams(next) })
                            );
                          }
                        }}
                      >
                        {isActive ? "✓ " : ""}{col}
                        {stat && (
                          <span style={{
                            background: isActive ? "rgba(251,146,60,0.4)" : "rgba(251,146,60,0.15)",
                            borderRadius: 8, padding: "1px 6px", fontSize: 10, fontWeight: 600,
                          }}>
                            {stat.zeroCount} ({stat.percent}%)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {excludeZeroCols.length > 0 && (
                  <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(251,146,60,0.08)", borderRadius: 7, border: "1px solid rgba(251,146,60,0.2)", flexShrink: 0 }}>
                    <span style={{ color: "#fb923c", fontSize: 11 }}>
                      ⚡ Hiding rows where <strong>{excludeZeroCols.join(", ")}</strong> {excludeZeroCols.length === 1 ? "is" : "are"} zero / null / empty — only rows with values in all selected columns shown
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

        ) : colPanelTab === "date" ? (
          /* ── Date Filter ── */
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <Icon d={ICONS.calendar} size={14} color={COLORS.dateText} />
              <span style={{ color: COLORS.dateText, fontSize: 12, fontWeight: 600 }}>
                Filtering: <strong style={{ color: "#c4b5fd" }}>{activeDateCol}</strong>
              </span>
              {dateColumns.length > 1 && (
                <select className="styled" value={activeDateCol}
                  onChange={e => {
                    setActiveDateCol(e.target.value);
                    setDateFilterMode(""); setDateExact(""); setDateFrom(""); setDateTo("");
                  }}>
                  {dateColumns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {hasDateFilter && (
                <button className="btn btn-danger" style={{ padding: "3px 10px", fontSize: 11, marginLeft: "auto" }}
                  onClick={clearDateFilter}>
                  <Icon d={ICONS.close} size={12} /> Clear
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {[
                { key: "",          label: "No Filter",           icon: ICONS.close    },
                { key: "exact",     label: "Exact Date",          icon: ICONS.calendar },
                { key: "range",     label: "Date Range",          icon: ICONS.filter   },
                { key: "sort-asc",  label: "Sort ↑ Oldest",       icon: ICONS.sortAsc  },
                { key: "sort-desc", label: "Sort ↓ Newest",       icon: ICONS.sortDesc },
              ].map(({ key, label, icon }) => {
                const isSortMode = key.startsWith("sort-");
                const isActive = isSortMode
                  ? (sortKey === activeDateCol && sortDir === (key === "sort-asc" ? "asc" : "desc"))
                  : dateFilterMode === key;
                return (
                  <button key={key}
                    className={`btn btn-date ${isActive ? "active" : ""}`}
                    onClick={() => {
                      if (isSortMode) {
                        const dir = key === "sort-asc" ? "asc" : "desc";
                        setSortKey(activeDateCol); setSortDir(dir); setPage(1);
                        if (isServer) {
                          const dp = {};
                          if (dateFilterMode === "exact" && dateExact) { dp.dateCol = activeDateCol; dp.dateExact = dateExact; }
                          else if (dateFilterMode === "range") { dp.dateCol = activeDateCol; dp.dateFrom = dateFrom; dp.dateTo = dateTo; }
                          runServer(`Sorting by date ${dir === "asc" ? "↑" : "↓"}…`, () =>
                            serverSheet({ file: currentFile, sheet: activeSheet, sk: activeDateCol, sd: dir, pg: 1, ps: pageSizeVal, q: searchVal, ...dp })
                          );
                        }
                      } else {
                        if (key === "") { clearDateFilter(); }
                        else {
                          setDateFilterMode(key);
                          if (key !== "range") { setDateFrom(""); setDateTo(""); }
                          if (key !== "exact") { setDateExact(""); }
                        }
                      }
                    }}
                  >
                    <Icon d={icon} size={12} color={COLORS.dateText} />
                    {label}
                  </button>
                );
              })}
            </div>

            {dateFilterMode === "exact" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ color: COLORS.textMuted, fontSize: 12 }}>Pick date:</span>
                <input type="date" className="date-input" value={dateExact}
                  onChange={e => { setDateExact(e.target.value); applyDateFilter("exact", e.target.value, dateFrom, dateTo, activeDateCol); }} />
                {dateExact && (
                  <span style={{ color: COLORS.dateText, fontSize: 12 }}>
                    Showing rows where <strong>{activeDateCol}</strong> = {new Date(dateExact).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            )}

            {dateFilterMode === "range" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ color: COLORS.textMuted, fontSize: 12 }}>From:</span>
                <input type="date" className="date-input" value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); applyDateFilter("range", dateExact, e.target.value, dateTo, activeDateCol); }} />
                <span style={{ color: COLORS.textMuted, fontSize: 12 }}>To:</span>
                <input type="date" className="date-input" value={dateTo}
                  onChange={e => { setDateTo(e.target.value); applyDateFilter("range", dateExact, dateFrom, e.target.value, activeDateCol); }} />
                {(dateFrom || dateTo) && (
                  <span style={{ color: COLORS.dateText, fontSize: 12 }}>
                    {dateFrom && `From ${new Date(dateFrom).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`}
                    {dateFrom && dateTo && " → "}
                    {dateTo && `To ${new Date(dateTo).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`}
                  </span>
                )}
              </div>
            )}
          </div>

        ) : (
          /* ── Show All / Minimum: column toggle buttons ── */
          <div style={{ flex: 1, overflowY: "auto", padding: "7px 8px", display: "flex", flexWrap: "wrap", gap: 5, alignContent: "flex-start" }}>
            {(() => {
              const filtered = colPanelSearch.trim()
                ? headers.filter(c => c.toLowerCase().includes(colPanelSearch.toLowerCase()))
                : headers;
              return filtered.length === 0
                ? <span style={{ color: COLORS.textFaint, fontSize: 11 }}>No columns found</span>
                : filtered.map(col => (
                    <button key={col}
                      className={`col-filter ${visibleCols.includes(col) ? "on" : ""} ${dateColumns.includes(col) ? "date-col" : ""}`}
                      onClick={() => toggleCol(col)}
                      title={dateColumns.includes(col) ? `📅 Date column: ${col}` : col}
                    >
                      {dateColumns.includes(col) ? "📅 " : ""}{col.length > 16 ? col.substring(0, 14) + "…" : col}
                    </button>
                  ));
            })()}
          </div>
        )}
      </div>


    </>
  );
};

export default ExcelFilters;