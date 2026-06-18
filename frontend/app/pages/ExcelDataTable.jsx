/**
 * ExcelDataTable.jsx
 * Handles:
 *   - Data table rendering with sort support
 *   - Shimmer loading state
 *   - Empty state
 *   - Virtual scrolling (renders only visible rows — handles 50k+ rows without crash)
 */

import { useState, useRef, useEffect, useCallback } from "react";

const ROW_HEIGHT = 38; // px per row (must match CSS td padding)
const OVERSCAN   = 20; // extra rows rendered above/below visible area

const ExcelDataTable = ({
  isLoading,
  displayRows,
  visibleCols,
  dateColumns,
  sortKey,
  sortDir,
  handleSort,
  hasZeroFilter,
  excludeZeroCols,
  formatDateDisplay,
  COLORS,
  Icon,
  ICONS,
}) => {
  const scrollRef   = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(540);

  // Separate calc rows (always rendered at bottom)
  const calcRows  = displayRows.filter(r => r.__isCalcRow === true);
  const dataRows  = displayRows.filter(r => r.__isCalcRow !== true);

  // Which data rows are visible?
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visCount = Math.ceil(viewHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIdx   = Math.min(dataRows.length, startIdx + visCount);
  const visibleDataRows = dataRows.slice(startIdx, endIdx);

  const onScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setViewHeight(entries[0].contentRect.height);
    });
    ro.observe(el);
    setViewHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  // Reset scroll when data changes (new file / filter applied)
  const prevDisplayRowsRef = useRef(displayRows);
  useEffect(() => {
    if (prevDisplayRowsRef.current !== displayRows) {
      prevDisplayRowsRef.current = displayRows;
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [displayRows]);

  const renderCell = (row, col, absIdx, isCalcRow) => {
    const isDateCol = dateColumns.includes(col);
    const rawVal    = row[col];
    const displayVal = isCalcRow
      ? (col === visibleCols[0]
          ? (row.__calcLabel || "RESULT")
          : (rawVal !== undefined && rawVal !== ""
              ? (typeof rawVal === "number" ? +rawVal.toFixed(6) : rawVal)
              : "—"))
      : (isDateCol
          ? formatDateDisplay(rawVal)
          : (rawVal instanceof Date ? rawVal.toLocaleDateString() : String(rawVal ?? "")));
    return (
      <td key={col}
        className={isDateCol && !isCalcRow ? "date-cell" : ""}
        title={String(rawVal ?? "")}
        style={isCalcRow ? {
          color: col === visibleCols[0] ? "#34d399" :
                 (rawVal !== undefined && rawVal !== "" ? "#34d399" : "#555a7a"),
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          background: "rgba(52,211,153,0.04)",
        } : {}}
      >
        {displayVal}
      </td>
    );
  };

  return (
    <>
      {/* Row count badge */}
      {!isLoading && displayRows.length > 0 && (
        <div style={{ marginBottom: 8, fontSize: 12, color: COLORS.textMuted, textAlign: "right" }}>
          Showing <span style={{ color: COLORS.accent, fontWeight: 600 }}>{dataRows.length.toLocaleString()}</span> rows
          {calcRows.length > 0 && <span style={{ color: "#34d399" }}> + {calcRows.length} summary</span>}
          &nbsp;·&nbsp; scroll to view all
        </div>
      )}

      {/* Table */}
      <div
        ref={scrollRef}
        className="data-table-wrap"
        style={{ marginBottom: 18, overflowY: "auto", maxHeight: 600, position: "relative" }}
        onScroll={onScroll}
      >
        {isLoading ? (
          <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="shimmer-row" style={{ height: 36 }} />
            ))}
          </div>
        ) : displayRows.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: COLORS.textMuted }}>
            <Icon d={ICONS.search} size={36} color={COLORS.textFaint} style={{ display: "block", margin: "0 auto 14px" }} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>No results found</p>
            {hasZeroFilter && excludeZeroCols.length > 1 ? (
              <div style={{ marginTop: 10, padding: "10px 20px", background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.3)", borderRadius: 10, maxWidth: 480, margin: "10px auto 0" }}>
                <p style={{ fontSize: 12, color: "#fb923c", fontWeight: 600 }}>Multiple column filters active</p>
                <p style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 4 }}>
                  <strong style={{ color: "#fb923c" }}>{excludeZeroCols.join(" + ")}</strong> — no rows have values in ALL these columns simultaneously.
                </p>
                <p style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 4 }}>
                  Try activating filters one at a time to see each column&apos;s non-zero rows separately.
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 12, marginTop: 6 }}>Try a different search term or clear the filter</p>
            )}
          </div>
        ) : (
          <table className="data-table">
            <colgroup>
                <col style={{ minWidth: 52, width: 52 }} />
                {visibleCols.map(col => (
                  <col key={col} style={{ minWidth: 120 }} />
                ))}
              </colgroup>
            <thead>
              <tr>
                <th className="sn-col" style={{ color: COLORS.textFaint }}>#</th>
                {visibleCols.map(col => (
                  <th key={col}
                    className={dateColumns.includes(col) ? "date-col" : ""}
                    onClick={() => handleSort(col)}>
                    {dateColumns.includes(col) ? "📅 " : ""}{col}
                    <span className={`sort-icon ${sortKey === col ? "active" : ""}`}>
                      {sortKey === col ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Top spacer */}
              {startIdx > 0 && (
                <tr style={{ height: startIdx * ROW_HEIGHT }}>
                  <td colSpan={visibleCols.length + 1} style={{ padding: 0, border: "none" }} />
                </tr>
              )}

              {/* Visible data rows only */}
              {visibleDataRows.map((row, relIdx) => {
                const absIdx = startIdx + relIdx;
                return (
                  <tr key={absIdx} style={{ height: ROW_HEIGHT }}>
                    <td className="sn-col">{absIdx + 1}</td>
                    {visibleCols.map(col => renderCell(row, col, absIdx, false))}
                  </tr>
                );
              })}

              {/* Bottom spacer */}
              {endIdx < dataRows.length && (
                <tr style={{ height: (dataRows.length - endIdx) * ROW_HEIGHT }}>
                  <td colSpan={visibleCols.length + 1} style={{ padding: 0, border: "none" }} />
                </tr>
              )}

              {/* Calc / summary rows — always at bottom */}
              {calcRows.map((row, i) => (
                <tr key={`calc-${i}`} style={{
                  background: "rgba(52,211,153,0.08)",
                  borderTop: "2px solid rgba(52,211,153,0.4)",
                  borderBottom: "2px solid rgba(52,211,153,0.4)",
                  height: ROW_HEIGHT,
                }}>
                  <td className="sn-col" style={{ color: "#34d399", fontWeight: 700 }}>∑</td>
                  {visibleCols.map(col => renderCell(row, col, i, true))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

export default ExcelDataTable;