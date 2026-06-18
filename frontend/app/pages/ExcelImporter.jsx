/**
 * ExcelImporter.jsx  (REFACTORED)
 *
 * HYBRID APPROACH:
 *   XLSX / XLS  → FastAPI backend  (POST /api/excel/parse + /api/excel/sheet)
 *                 Fast server-side parsing, pagination, search, sort
 *
 *   CSV / TSV   → Client-side XLSX library
 *                 Encoding-safe (handles UTF-8, CP1252, Latin-1, etc.)
 *                 All filtering/sorting done in browser
 *
 * ✅ Auto-detects date columns → shows Date Filter panel with:
 *         • Sort Asc / Desc
 *         • Exact date picker
 *         • Date range (from → to)
 *
 * Components:
 *   ExcelUploadZone  — Drop zone UI
 *   ExcelFilters     — Column toggle, Date filter, Zero filter, Search, Page size
 *   ExcelDataTable   — Table + Pagination
 */

import { useState, useRef, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import ExcelUploadZone from "./ExcelUploadZone";
import ExcelFilters from "./ExcelFilters";
import ExcelDataTable from "./ExcelDataTable";
import ExcelColumnCalculator from "./ExcelColumnCalculator";
// useState is shared from the React import above — ColumnPanel uses it too

// ── Backend URL ────────────────────────────────────────────────────────────────
const API_BASE = "https://item-management-master-1.onrender.com";

const COLORS = {
  bg:         "#0f1117",
  surface:    "#1a1d27",
  card:       "#21253a",
  border:     "#2e3350",
  accent:     "#4f8ef7",
  accentGlow: "rgba(79,142,247,0.18)",
  accentSoft: "rgba(79,142,247,0.10)",
  success:    "#34d399",
  successBg:  "rgba(52,211,153,0.10)",
  warning:    "#fbbf24",
  warningBg:  "rgba(251,191,36,0.10)",
  danger:     "#f87171",
  dangerBg:   "rgba(248,113,113,0.10)",
  text:       "#e8eaf6",
  textMuted:  "#8b91b0",
  textFaint:  "#555a7a",
  highlight:  "#a5b4fc",
  datePurple: "rgba(167,139,250,0.12)",
  dateBorder: "rgba(167,139,250,0.35)",
  dateText:   "#a78bfa",
  zeroOrange: "rgba(251,146,60,0.12)",
  zeroBorder: "rgba(251,146,60,0.35)",
  zeroText:   "#fb923c",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${COLORS.bg};
    color: ${COLORS.text};
    font-family: 'Sora', sans-serif;
    min-height: 100vh;
  }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: ${COLORS.surface}; }
  ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: ${COLORS.accent}; }

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulseRing {
    0%   { box-shadow: 0 0 0 0 rgba(79,142,247,0.4); }
    70%  { box-shadow: 0 0 0 14px rgba(79,142,247,0); }
    100% { box-shadow: 0 0 0 0 rgba(79,142,247,0); }
  }
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position: 600px 0; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes dropBounce {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }

  .animate-in { animation: fadeSlideIn 0.45s cubic-bezier(.22,.61,.36,1) both; }

  .shimmer-row {
    background: linear-gradient(90deg, ${COLORS.card} 25%, ${COLORS.border} 50%, ${COLORS.card} 75%);
    background-size: 600px 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 6px;
  }

  .drop-zone {
    border: 2px dashed ${COLORS.border};
    border-radius: 18px;
    background: ${COLORS.surface};
    transition: all 0.25s ease;
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }
  .drop-zone::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, ${COLORS.accentSoft} 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .drop-zone.dragging {
    border-color: ${COLORS.accent};
    animation: dropBounce 0.35s ease;
  }
  .drop-zone.dragging::before { opacity: 1; }

  .btn {
    font-family: 'Sora', sans-serif;
    font-weight: 500;
    border: none;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    letter-spacing: 0.01em;
  }
  .btn-primary {
    background: ${COLORS.accent};
    color: #fff;
    padding: 9px 20px;
    font-size: 13px;
    box-shadow: 0 4px 18px rgba(79,142,247,0.35);
  }
  .btn-primary:hover { background: #6ba0ff; transform: translateY(-1px); box-shadow: 0 6px 22px rgba(79,142,247,0.45); }
  .btn-primary:active { transform: translateY(0); }
  .btn-ghost {
    background: ${COLORS.card};
    color: ${COLORS.textMuted};
    border: 1px solid ${COLORS.border};
    padding: 8px 16px;
    font-size: 13px;
  }
  .btn-ghost:hover { background: ${COLORS.border}; color: ${COLORS.text}; }
  .btn-danger {
    background: ${COLORS.dangerBg};
    color: ${COLORS.danger};
    border: 1px solid rgba(248,113,113,0.25);
    padding: 7px 14px;
    font-size: 12px;
  }
  .btn-danger:hover { background: rgba(248,113,113,0.2); }
  .btn-date {
    background: ${COLORS.datePurple};
    color: ${COLORS.dateText};
    border: 1px solid ${COLORS.dateBorder};
    padding: 6px 14px;
    font-size: 12px;
    border-radius: 8px;
  }
  .btn-date:hover { background: rgba(167,139,250,0.22); }
  .btn-date.active { background: rgba(167,139,250,0.3); border-color: #a78bfa; color: #c4b5fd; }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .badge-blue  { background: ${COLORS.accentSoft}; color: ${COLORS.accent}; border: 1px solid rgba(79,142,247,0.25); }
  .badge-green { background: ${COLORS.successBg}; color: ${COLORS.success}; border: 1px solid rgba(52,211,153,0.25); }
  .badge-date  { background: ${COLORS.datePurple}; color: ${COLORS.dateText}; border: 1px solid ${COLORS.dateBorder}; }
  .badge-zero  { background: ${COLORS.zeroOrange}; color: ${COLORS.zeroText}; border: 1px solid ${COLORS.zeroBorder}; }

  .data-table-wrap {
    overflow: auto;
    border-radius: 14px;
    border: 1px solid ${COLORS.border};
    background: ${COLORS.surface};
    max-height: 540px;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  .data-table thead {
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .data-table thead tr {
    background: ${COLORS.card};
    border-bottom: 2px solid ${COLORS.border};
  }
  .data-table th {
    padding: 12px 15px;
    text-align: left;
    color: ${COLORS.highlight};
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    transition: color 0.2s;
  }
  .data-table th:hover { color: #fff; }
  .data-table th.date-col { color: ${COLORS.dateText}; }
  .data-table tbody tr {
    border-bottom: 1px solid rgba(46,51,80,0.6);
    transition: background 0.15s;
  }
  .data-table tbody tr:hover { background: ${COLORS.accentSoft}; }
  .data-table tbody tr:last-child { border-bottom: none; }
  .data-table td {
    padding: 10px 15px;
    color: ${COLORS.text};
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
  }
  .data-table td.sn-col {
    color: ${COLORS.textFaint};
    font-size: 11px;
    min-width: 44px;
  }
  .data-table td.date-cell { color: #c4b5fd; }
  .sort-icon { display: inline-block; margin-left: 4px; opacity: 0.5; font-size: 10px; }
  .sort-icon.active { opacity: 1; color: ${COLORS.accent}; }

  .search-input {
    background: ${COLORS.card};
    border: 1px solid ${COLORS.border};
    border-radius: 10px;
    padding: 9px 14px 9px 38px;
    color: ${COLORS.text};
    font-family: 'Sora', sans-serif;
    font-size: 13px;
    width: 100%;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .search-input::placeholder { color: ${COLORS.textFaint}; }
  .search-input:focus { border-color: ${COLORS.accent}; box-shadow: 0 0 0 3px ${COLORS.accentSoft}; }

  .date-input {
    background: ${COLORS.card};
    border: 1px solid ${COLORS.dateBorder};
    border-radius: 8px;
    padding: 7px 11px;
    color: ${COLORS.text};
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    outline: none;
    transition: border-color 0.2s;
    color-scheme: dark;
  }
  .date-input:focus { border-color: #a78bfa; box-shadow: 0 0 0 3px rgba(167,139,250,0.15); }

  .date-filter-panel {
    background: ${COLORS.card};
    border: 1px solid ${COLORS.dateBorder};
    border-radius: 14px;
    padding: 16px 18px;
    margin-bottom: 16px;
    animation: fadeSlideIn 0.3s ease both;
  }

  .stat-card {
    background: ${COLORS.card};
    border: 1px solid ${COLORS.border};
    border-radius: 14px;
    padding: 18px 22px;
    flex: 1;
    min-width: 120px;
    transition: border-color 0.2s, transform 0.2s;
  }
  .stat-card:hover { border-color: ${COLORS.accent}; transform: translateY(-2px); }

  .sheet-tab {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .sheet-tab.active  { background: ${COLORS.accent}; color: #fff; border-color: ${COLORS.accent}; }
  .sheet-tab.inactive{ background: ${COLORS.card}; color: ${COLORS.textMuted}; border-color: ${COLORS.border}; }
  .sheet-tab.inactive:hover { border-color: ${COLORS.accent}; color: ${COLORS.text}; }

  .spinner {
    width: 22px; height: 22px;
    border: 2.5px solid ${COLORS.border};
    border-top-color: ${COLORS.accent};
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }

  .col-filter {
    padding: 6px 11px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid ${COLORS.border};
    background: ${COLORS.card};
    color: ${COLORS.textMuted};
    transition: all 0.18s;
  }
  .col-filter.on { border-color: ${COLORS.accent}; background: ${COLORS.accentSoft}; color: ${COLORS.accent}; }
  .col-filter.date-col { border-color: ${COLORS.dateBorder}; color: ${COLORS.dateText}; }
  .col-filter.date-col.on { background: ${COLORS.datePurple}; }

  .page-btn {
    min-width: 34px; height: 34px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid ${COLORS.border};
    background: ${COLORS.card};
    color: ${COLORS.textMuted};
    transition: all 0.18s;
    display: flex; align-items: center; justify-content: center;
  }
  .page-btn:hover:not(:disabled) { border-color: ${COLORS.accent}; color: ${COLORS.accent}; }
  .page-btn.active { background: ${COLORS.accent}; border-color: ${COLORS.accent}; color: #fff; }
  .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  select.styled {
    background: ${COLORS.card};
    border: 1px solid ${COLORS.border};
    border-radius: 8px;
    padding: 7px 12px;
    color: ${COLORS.text};
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    outline: none;
    cursor: pointer;
  }
  select.styled:focus { border-color: ${COLORS.accent}; }

  .err-banner {
    background: ${COLORS.dangerBg};
    border: 1px solid rgba(248,113,113,0.3);
    border-radius: 12px;
    padding: 13px 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: ${COLORS.danger};
    font-size: 13px;
    margin-bottom: 20px;
  }

  .mode-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-left: 6px;
  }
  .mode-server { background: rgba(79,142,247,0.15); color: ${COLORS.accent}; border: 1px solid rgba(79,142,247,0.3); }
  .mode-client { background: rgba(52,211,153,0.12); color: ${COLORS.success}; border: 1px solid rgba(52,211,153,0.3); }

  .global-loader {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 9999;
    background: ${COLORS.card};
    border: 1px solid ${COLORS.border};
    border-radius: 14px;
    padding: 12px 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
    animation: fadeSlideIn 0.2s ease both;
    pointer-events: none;
  }
  .global-loader-text {
    color: ${COLORS.textMuted};
    font-size: 12.5px;
    font-weight: 500;
    font-family: 'Sora', sans-serif;
  }
  .global-loader-bar {
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: linear-gradient(90deg, ${COLORS.accent}, #7c6af7);
    border-radius: 0 2px 2px 0;
    transition: width 0.4s ease;
    z-index: 9999;
  }

  .zero-filter-panel {
    background: ${COLORS.card};
    border: 1px solid ${COLORS.zeroBorder};
    border-radius: 14px;
    padding: 16px 18px;
    margin-bottom: 16px;
    animation: fadeSlideIn 0.3s ease both;
  }

  .btn-zero {
    font-family: 'Sora', sans-serif;
    font-weight: 500;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    padding: 6px 14px;
    background: ${COLORS.zeroOrange};
    color: ${COLORS.zeroText};
    border: 1px solid ${COLORS.zeroBorder};
  }
  .btn-zero:hover { background: rgba(251,146,60,0.22); }
  .btn-zero.active { background: rgba(251,146,60,0.3); border-color: #fb923c; color: #fed7aa; }

  .zero-col-btn {
    font-family: 'Sora', sans-serif;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 8px;
    padding: 5px 12px;
    border: 1px solid ${COLORS.zeroBorder};
    background: ${COLORS.zeroOrange};
    color: ${COLORS.zeroText};
    transition: all 0.18s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .zero-col-btn:hover { background: rgba(251,146,60,0.18); border-color: #fb923c; }
  .zero-col-btn.active { background: rgba(251,146,60,0.28); border-color: #fb923c; color: #fed7aa; font-weight: 600; }
`;

// ─── Icons ─────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 18, color = "currentColor", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d={d} />
  </svg>
);

const ICONS = {
  upload:    "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  table:     "M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18",
  search:    "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  close:     "M18 6L6 18M6 6l12 12",
  download:  "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  sheet:     "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  rows:      "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  cols:      "M12 3v18M3 12h18M3 3h18v18H3z",
  filter:    "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  eye:       "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  refresh:   "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  alert:     "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  calendar:  "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  sortAsc:   "M3 6h18M7 12h10M11 18h2",
  sortDesc:  "M3 18h18M7 12h10M11 6h2",
  zeroFilter:"M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM8 12h8",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function exportToCSV(headers, rows, filename = "export.csv") {
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csvContent = [
    headers.map(escape).join(","),
    ...rows.map(r => headers.map(h => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const PAGE_SIZES  = [25, 50, 100, 250];
const SERVER_EXTS = ["xlsx", "xls"];
const CLIENT_EXTS = ["csv", "tsv"];

function getExt(filename) { return filename.split(".").pop().toLowerCase(); }

// ─── Date Detection ────────────────────────────────────────────────────────────
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/,
  /^\d{1,2}[\s\-](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-,]*\d{2,4}$/i,
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-,]+\d{4}$/i,
  /^\d{1,2}[\/\-]\d{4}$/,
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*-\d{2}$/i,
  /^\d{4}$/,
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
];

function looksLikeDateValue(val) {
  if (!val && val !== 0) return false;
  if (val instanceof Date) return true;
  const s = String(val).trim();
  if (!s || s.length < 4 || s.length > 32) return false;
  return DATE_PATTERNS.some(p => p.test(s));
}

function isDateColumn(rows, colName, sampleSize = 30) {
  const sample = rows.slice(0, sampleSize);
  const nonEmpty = sample.filter(r => { const v = r[colName]; return v !== "" && v !== null && v !== undefined; });
  if (nonEmpty.length < 2) return false;
  const dateCount = nonEmpty.filter(r => looksLikeDateValue(r[colName])).length;
  return dateCount / nonEmpty.length >= 0.7;
}

function parseAnyDate(val) {
  if (!val && val !== 0) return null;
  if (val instanceof Date) return isNaN(val) ? null : val;
  const s = String(val).trim();
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d)) return d;
  const mmYyyy = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (mmYyyy) return new Date(Number(mmYyyy[2]), Number(mmYyyy[1]) - 1, 1);
  const monYy = s.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*-(\d{2})$/i);
  if (monYy) {
    const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
    const m = months[monYy[1].toLowerCase().slice(0,3)];
    const y = 2000 + Number(monYy[2]);
    return new Date(y, m, 1);
  }
  if (/^\d{4}$/.test(s)) return new Date(Number(s), 0, 1);
  return null;
}

function formatDateDisplay(val) {
  if (!val && val !== 0) return "";
  if (val instanceof Date) return isNaN(val) ? "" : val.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const d = parseAnyDate(val);
  if (!d) return String(val);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Zero / Null Detection ─────────────────────────────────────────────────────
function isZeroValue(val) {
  if (val === null || val === undefined) return true;
  if (typeof val === "number") return val === 0 || isNaN(val);
  const s = String(val).trim().toLowerCase();
  if (s === "") return true;
  if (/^-?0+(\.0+)?$/.test(s)) return true;
  return s === "null" || s === "na" || s === "n/a" || s === "-" || s === "none";
}

function getZeroNullStats(rows, hdrs) {
  if (!rows || rows.length === 0) return {};
  const stats = {};
  hdrs.forEach(col => {
    const total = rows.length;
    const zeroCount = rows.filter(r => isZeroValue(r[col])).length;
    if (zeroCount > 0) stats[col] = { zeroCount, totalCount: total, percent: Math.round((zeroCount / total) * 100) };
  });
  return stats;
}

// ─── Server API helpers ────────────────────────────────────────────────────────
async function serverParse(file, pageSize) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/excel/parse?page=1&page_size=${pageSize}`, { method: "POST", body: fd });
  if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.detail || `Server error HTTP ${res.status}`); }
  return res.json();
}

async function serverSheet({ file, sheet, pg = 1, ps = 50, q = "", sk = null, sd = "asc", dateFrom = "", dateTo = "", dateExact = "", dateCol = "", excludeZeroCols = [] }) {
  if (!file || !sheet) return null;
  const params = new URLSearchParams({ sheet, page: pg, page_size: ps });
  if (q.trim())        params.set("q", q.trim());
  if (sk)              { params.set("sort_key", sk); params.set("sort_dir", sd); }
  if (dateCol)         params.set("date_col", dateCol);
  if (dateFrom)        params.set("date_from", dateFrom);
  if (dateTo)          params.set("date_to", dateTo);
  if (dateExact)       params.set("date_exact", dateExact);
  if (excludeZeroCols && excludeZeroCols.length > 0) params.set("exclude_zero_cols", excludeZeroCols.join(","));
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/excel/sheet?${params}`, { method: "POST", body: fd });
  if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.detail || `Server error HTTP ${res.status}`); }
  return res.json();
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ExcelImporter() {

  // ── Shared state ──
  const [dragging,    setDragging]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [tblLoad,     setTblLoad]     = useState(false);
  const [error,       setError]       = useState("");
  const [fileName,    setFileName]    = useState("");
  const [fileExt,     setFileExt]     = useState("");
  const [sheets,      setSheets]      = useState([]);
  const [activeSheet, setActiveSheet] = useState("");
  const [headers,     setHeaders]     = useState([]);
  const [visibleCols, setVisibleCols] = useState([]);
  const [search,      setSearch]      = useState("");
  const [sortKey,     setSortKey]     = useState(null);
  const [sortDir,     setSortDir]     = useState("asc");
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(50);

  // ── Date filter state ──
  const [dateColumns,    setDateColumns]    = useState([]);
  const [activeDateCol,  setActiveDateCol]  = useState("");
  const [dateFilterMode, setDateFilterMode] = useState("");
  const [dateExact,      setDateExact]      = useState("");
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  // ── Zero / Null filter state ──
  const [zeroNullStats,   setZeroNullStats]   = useState({});
  const [excludeZeroCols, setExcludeZeroCols] = useState([]);
  const [zeroFilterOpen,  setZeroFilterOpen]  = useState(false);

  // ── Processing message ──
  const [processingMsg, setProcessingMsg] = useState("");

  // ── SERVER mode state ──
  const [currentFile, setCurrentFile] = useState(null);
  const [sheetsMeta,  setSheetsMeta]  = useState({});
  const [serverRows,  setServerRows]  = useState([]);
  const [totalRows,   setTotalRows]   = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);

  // ── CLIENT mode state ──
  const [allData, setAllData] = useState({});

  // ── Calculated columns + rows (injected via ExcelColumnCalculator) ──
  const [calcCols, setCalcCols] = useState([]); // [{ name, values[] }]
  const [calcRows, setCalcRows] = useState([]); // [{ ...rowObj, __isCalcRow, __calcLabel }]

  // ── Calculator popup state ──
  const [calcPopupOpen, setCalcPopupOpen] = useState(false);

  const fileRef = useRef();

  const isServer = SERVER_EXTS.includes(fileExt);
  const isClient = CLIENT_EXTS.includes(fileExt);
  const hasData  = !!fileName;

  function applyServerResponse(data) {
    setHeaders(data.headers);
    setVisibleCols(data.headers);
    setServerRows(data.rows);
    setTotalRows(data.total_rows);
    setTotalPages(data.total_pages);
    setPage(data.page);
  }

  function detectDateColumns(rows, hdrs) {
    if (!rows || rows.length === 0) return [];
    return hdrs.filter(col => isDateColumn(rows, col));
  }

  async function runServer(msg, callFn) {
    setTblLoad(true);
    setProcessingMsg(msg);
    try {
      const data = await callFn();
      if (data) applyServerResponse(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setTblLoad(false);
      setProcessingMsg("");
    }
  }

  function buildDateParams(currentZeroCols = excludeZeroCols) {
    const p = {};
    if (activeDateCol && dateFilterMode) {
      if (dateFilterMode === "exact" && dateExact)
        Object.assign(p, { dateCol: activeDateCol, dateExact });
      else if (dateFilterMode === "range" && (dateFrom || dateTo))
        Object.assign(p, { dateCol: activeDateCol, dateFrom, dateTo });
    }
    if (currentZeroCols.length > 0) p.excludeZeroCols = currentZeroCols;
    return p;
  }

  // ── CLIENT MODE parse ──
  function clientParse(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb   = XLSX.read(data, { type: "array", cellDates: true });
          const parsed = {};
          wb.SheetNames.forEach(name => {
            parsed[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
          });
          resolve({ wb, parsed, sheetNames: wb.SheetNames });
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // ── ENTRY POINT ──
  const parseFile = useCallback(async (file) => {
    if (!file) return;
    const ext = getExt(file.name);
    if (!["xlsx", "xls", "csv", "tsv"].includes(ext)) {
      setError("Only .xlsx, .xls, .csv, .tsv files are supported.");
      return;
    }

    setError(""); setLoading(true); setTblLoad(false);
    setProcessingMsg(SERVER_EXTS.includes(ext) ? "Uploading to server…" : "Parsing file…");
    setFileName(file.name); setFileExt(ext);
    setSheets([]); setActiveSheet(""); setHeaders([]); setVisibleCols([]);
    setSearch(""); setSortKey(null); setSortDir("asc"); setPage(1);
    setAllData({}); setServerRows([]); setCurrentFile(null);
    setDateColumns([]); setActiveDateCol(""); setDateFilterMode("");
    setDateExact(""); setDateFrom(""); setDateTo(""); setDateFilterOpen(false);
    setZeroNullStats({}); setExcludeZeroCols([]); setZeroFilterOpen(false);

    try {
      if (SERVER_EXTS.includes(ext)) {
        setCurrentFile(file);
        const data = await serverParse(file, pageSize);
        setSheets(data.sheet_names);
        setActiveSheet(data.active_sheet);
        setSheetsMeta(data.sheets_meta);
        applyServerResponse(data);
        const dc = detectDateColumns(data.rows, data.headers);
        setDateColumns(dc);
        if (dc.length > 0) setActiveDateCol(dc[0]);
        setZeroNullStats(getZeroNullStats(data.rows, data.headers));
      } else {
        const { parsed, sheetNames } = await clientParse(file);
        setAllData(parsed);
        setSheets(sheetNames);
        setActiveSheet(sheetNames[0]);
        const rows = parsed[sheetNames[0]] || [];
        const hdrs = rows.length > 0 ? Object.keys(rows[0]) : [];
        setHeaders(hdrs); setVisibleCols(hdrs);
        const dc = detectDateColumns(rows, hdrs);
        setDateColumns(dc);
        if (dc.length > 0) setActiveDateCol(dc[0]);
        setZeroNullStats(getZeroNullStats(rows, hdrs));
      }
    } catch (err) {
      setError("Error parsing file: " + err.message);
      setFileName("");
    } finally {
      setLoading(false);
      setProcessingMsg("");
    }
  }, [pageSize]);

  const onDrop = (e) => { e.preventDefault(); setDragging(false); parseFile(e.dataTransfer.files[0]); };

  // ── Sheet change ──
  const changeSheet = async (name) => {
    if (name === activeSheet) return;
    setActiveSheet(name);
    setSearch(""); setSortKey(null); setSortDir("asc"); setPage(1);
    setDateColumns([]); setActiveDateCol(""); setDateFilterMode("");
    setDateExact(""); setDateFrom(""); setDateTo(""); setDateFilterOpen(false);
    setZeroNullStats({}); setExcludeZeroCols([]); setZeroFilterOpen(false);

    if (isServer) {
      const cols = sheetsMeta[name]?.columns || [];
      setHeaders(cols); setVisibleCols(cols);
      await runServer("Loading sheet…", async () => {
        const data = await serverSheet({ file: currentFile, sheet: name, pg: 1, ps: pageSize });
        const dc = detectDateColumns(data.rows, data.headers);
        setDateColumns(dc);
        if (dc.length > 0) setActiveDateCol(dc[0]);
        setZeroNullStats(getZeroNullStats(data.rows, data.headers));
        return data;
      });
    } else {
      const rows = allData[name] || [];
      const hdrs = rows.length > 0 ? Object.keys(rows[0]) : [];
      setHeaders(hdrs); setVisibleCols(hdrs);
      const dc = detectDateColumns(rows, hdrs);
      setDateColumns(dc);
      if (dc.length > 0) setActiveDateCol(dc[0]);
      setZeroNullStats(getZeroNullStats(rows, hdrs));
    }
  };

  // ── Sort ──
  const handleSort = async (key) => {
    const dir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    setSortKey(key); setSortDir(dir); setPage(1);
    if (isServer) {
      const dp = buildDateParams();
      await runServer(`Sorting by ${key} ${dir === "asc" ? "↑" : "↓"}…`, () =>
        serverSheet({ file: currentFile, sheet: activeSheet, sk: key, sd: dir, pg: 1, ps: pageSize, q: search, ...dp })
      );
    }
  };

  // ── Search ──
  const handleSearch = async (val) => {
    setSearch(val); setPage(1);
    if (isServer) {
      const dp = buildDateParams();
      await runServer("Searching…", () =>
        serverSheet({ file: currentFile, sheet: activeSheet, q: val, pg: 1, ps: pageSize, sk: sortKey, sd: sortDir, ...dp })
      );
    }
  };

  // ── Page change ──
  const goToPage = async (p) => {
    setPage(p);
    if (isServer) {
      const dp = buildDateParams();
      await runServer(`Loading page ${p}…`, () =>
        serverSheet({ file: currentFile, sheet: activeSheet, pg: p, ps: pageSize, q: search, sk: sortKey, sd: sortDir, ...dp })
      );
    }
  };

  // ── Page size change ──
  const handlePageSize = async (ps) => {
    const n = Number(ps);
    setPageSize(n); setPage(1);
    if (isServer) {
      const dp = buildDateParams();
      await runServer("Applying page size…", () =>
        serverSheet({ file: currentFile, sheet: activeSheet, ps: n, pg: 1, q: search, sk: sortKey, sd: sortDir, ...dp })
      );
    }
  };

  // ── Date filter apply / clear ──
  const applyDateFilter = async (mode, exact, from, to, col) => {
    setDateFilterMode(mode); setDateExact(exact); setDateFrom(from); setDateTo(to); setPage(1);
    if (isServer) {
      const dpArgs = {};
      dpArgs.dateCol = col || activeDateCol;
      if (mode === "exact" && exact)  { dpArgs.dateExact = exact; }
      else if (mode === "range")       { dpArgs.dateFrom = from; dpArgs.dateTo = to; }
      await runServer("Applying date filter…", () =>
        serverSheet({ file: currentFile, sheet: activeSheet, pg: 1, ps: pageSize, q: search, sk: sortKey, sd: sortDir, ...dpArgs })
      );
    }
  };

  const clearDateFilter = () => {
    setDateFilterMode(""); setDateExact(""); setDateFrom(""); setDateTo(""); setPage(1);
    if (isServer) {
      runServer("Clearing date filter…", () =>
        serverSheet({ file: currentFile, sheet: activeSheet, pg: 1, ps: pageSize, q: search, sk: sortKey, sd: sortDir })
      );
    }
  };

  // ── Toggle column ──
  const toggleCol = (col) =>
    setVisibleCols(v => v.includes(col) ? (v.length > 1 ? v.filter(c => c !== col) : v) : [...v, col]);

  // ── Reset ──
  const resetAll = () => {
    setFileName(""); setFileExt(""); setCurrentFile(null);
    setSheets([]); setActiveSheet(""); setSheetsMeta({});
    setHeaders([]); setVisibleCols([]); setAllData({});
    setServerRows([]); setTotalRows(0); setTotalPages(1);
    setSearch(""); setSortKey(null); setSortDir("asc"); setPage(1);
    setError("");
    setDateColumns([]); setActiveDateCol(""); setDateFilterMode("");
    setDateExact(""); setDateFrom(""); setDateTo(""); setDateFilterOpen(false);
    setZeroNullStats({}); setExcludeZeroCols([]); setZeroFilterOpen(false);
    setCalcCols([]); setCalcRows([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── CLIENT MODE: filtered + sorted + paginated ──
  const clientRaw = useMemo(
    () => (isClient ? (allData[activeSheet] || []) : []),
    [isClient, allData, activeSheet]
  );

  const clientDateFiltered = useMemo(() => {
    if (!isClient || !activeDateCol || !dateFilterMode) return clientRaw;
    return clientRaw.filter(row => {
      const d = parseAnyDate(row[activeDateCol]);
      if (!d) return false;
      if (dateFilterMode === "exact" && dateExact) {
        const target = parseAnyDate(dateExact);
        if (!target) return true;
        return d.toDateString() === target.toDateString();
      }
      if (dateFilterMode === "range") {
        const from = dateFrom ? parseAnyDate(dateFrom) : null;
        const to   = dateTo   ? parseAnyDate(dateTo)   : null;
        if (from && d < from) return false;
        if (to   && d > to)   return false;
        return true;
      }
      return true;
    });
  }, [isClient, clientRaw, activeDateCol, dateFilterMode, dateExact, dateFrom, dateTo]);

  const clientZeroFiltered = useMemo(() => {
    if (!isClient || excludeZeroCols.length === 0) return clientDateFiltered;
    return clientDateFiltered.filter(row => excludeZeroCols.every(col => !isZeroValue(row[col])));
  }, [isClient, clientDateFiltered, excludeZeroCols]);

  const clientFiltered = isClient && search.trim()
    ? clientZeroFiltered.filter(row => visibleCols.some(col => String(row[col] ?? "").toLowerCase().includes(search.toLowerCase())))
    : clientZeroFiltered;

  const clientSorted = isClient && sortKey
    ? [...clientFiltered].sort((a, b) => {
        const av = a[sortKey] ?? ""; const bv = b[sortKey] ?? "";
        if (dateColumns.includes(sortKey)) {
          const da = parseAnyDate(av); const db = parseAnyDate(bv);
          if (da && db) { const cmp = da - db; return sortDir === "asc" ? cmp : -cmp; }
        }
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : clientFiltered;

  const clientTotalPages = 1;
  const clientSafePage   = 1;
  // clientPageData removed — all rows shown without pagination

  // ─── Unified display values ────────────────────────────────────────────────
  const baseDisplayRows   = isServer ? serverRows    : clientSorted;
  const displayTotalRows  = isServer ? totalRows     : clientSorted.length;
  const displayTotalPages = isServer ? totalPages    : clientTotalPages;
  const displayPage       = isServer ? page          : clientSafePage;
  const displayFiltered   = isServer ? totalRows     : clientFiltered.length;
  const rawCount          = isServer ? totalRows     : clientRaw.length;

  // Merge calculated columns into display rows + append calc rows at bottom
  const displayRows = useMemo(() => {
    const startIdx = 0;
    // Step 1: merge calcCols into each base row
    const withCols = calcCols.length === 0
      ? baseDisplayRows
      : baseDisplayRows.map((row, i) => {
          const merged = { ...row };
          calcCols.forEach(cc => { merged[cc.name] = cc.values[startIdx + i] ?? ""; });
          return merged;
        });
    // Step 2: append calc rows (aggregate summary rows) on last page or always
    return calcRows.length > 0 ? [...withCols, ...calcRows] : withCols;
  }, [baseDisplayRows, calcCols, calcRows]);

  // Add a new calculated column (from ExcelColumnCalculator)
  const handleAddCalcColumn = useCallback((colName, values) => {
    const name = colName || "Calculated";
    setCalcCols(prev => {
      const filtered = prev.filter(c => c.name !== name);
      return [...filtered, { name, values }];
    });
    setHeaders(prev     => prev.includes(name) ? prev : [...prev, name]);
    setVisibleCols(prev => prev.includes(name) ? prev : [...prev, name]);
  }, []);

  // Add a new aggregate row (from ExcelColumnCalculator ROW mode)
  const handleAddCalcRow = useCallback((rowObj) => {
    setCalcRows(prev => {
      // Replace if same label
      const label = rowObj.__calcLabel || "RESULT";
      const filtered = prev.filter(r => r.__calcLabel !== label);
      return [...filtered, rowObj];
    });
  }, []);

  const isLoading     = loading || tblLoad;
  const hasDateFilter = dateFilterMode === "exact" ? !!dateExact : (dateFilterMode === "range" && (!!dateFrom || !!dateTo));
  const hasZeroFilter = excludeZeroCols.length > 0;
  const colsWithZeros = Object.keys(zeroNullStats);

  // ── Shared props passed to sub-components ──
  const sharedProps = { COLORS, Icon, ICONS };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>

      {/* ── Centered screen overlay when loading ── */}
      {(isLoading || processingMsg) && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(3px)",
        }}>
          <div style={{
            background: "#1a1d27",
            border: "1px solid #2e3350",
            borderRadius: 16,
            padding: "32px 48px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            minWidth: 240,
          }}>
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
            <span style={{
              color: "#e8eaf6",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'Sora', sans-serif",
              letterSpacing: "0.01em",
            }}>
              {processingMsg || (loading ? "Parsing file…" : "Processing…")}
            </span>
            <span style={{ color: "#555a7a", fontSize: 11 }}>Please wait</span>
          </div>
        </div>
      )}

      {/* ── InfoMaster-style outer shell ── */}
      <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">

        {/* ── Header bar (matches InfoMaster) ── */}
        <div className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white" style={{ height: "24px", paddingRight: "8px" }}>
          <h2 className="m-0 text-xs font-semibold">Excel / CSV Dectector 📊</h2>
        </div>

        {/* ── Inner content area ── */}
        <div className="flex-1 overflow-auto" style={{ padding: "10px 12px", background: COLORS.bg }}>

        {/* ── Error banner ── */}
        {error && (
          <div className="err-banner animate-in">
            <Icon d={ICONS.alert} size={16} color={COLORS.danger} />
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.danger, display: "flex" }}>
              <Icon d={ICONS.close} size={14} />
            </button>
          </div>
        )}

        {/* ── Drop Zone ── */}
        {!hasData && (
          <ExcelUploadZone
            dragging={dragging}
            loading={loading}
            fileExt={fileExt}
            SERVER_EXTS={SERVER_EXTS}
            fileRef={fileRef}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onFileSelect={parseFile}
            {...sharedProps}
          />
        )}

        {/* ── Data View ── */}
        {hasData && !loading && (
          <div className="animate-in" style={{ animationDelay: "0.05s" }}>

            {/* ── File info + actions ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
              {/* Left: file info badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "center" }}>
                <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "nowrap", overflowX: "auto", maxWidth: "100%" }}>
                  <Icon d={ICONS.sheet} size={16} color={COLORS.accent} />
                  <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 500, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {fileName}
                  </span>
                  <span className="badge badge-green">Loaded</span>
                  <span className={`mode-badge ${isServer ? "mode-server" : "mode-client"}`}>
                    {isServer ? "⚡ Server" : "🖥 Browser"}
                  </span>
                  {dateColumns.length > 0 && (
                    <span className="badge badge-date">
                      <Icon d={ICONS.calendar} size={10} color={COLORS.dateText} style={{ marginRight: 4 }} />
                      {dateColumns.length} date col{dateColumns.length > 1 ? "s" : ""}
                    </span>
                  )}
                  {colsWithZeros.length > 0 && (
                    <span className="badge badge-zero">
                      ⓪ {colsWithZeros.length} col{colsWithZeros.length > 1 ? "s" : ""} w/ zeros
                    </span>
                  )}
                  {/* ── Inline stats ── */}
                  <span style={{ width: 1, height: 18, background: COLORS.border, margin: "0 2px" }} />
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: COLORS.textMuted, fontSize: 12 }}>
                    <Icon d={ICONS.rows} size={13} color={COLORS.accent} />
                    <span style={{ color: COLORS.text, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{rawCount.toLocaleString()}</span>
                    <span>rows</span>
                  </span>
                  <span style={{ color: COLORS.textFaint, fontSize: 11 }}>·</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: COLORS.textMuted, fontSize: 12 }}>
                    <Icon d={ICONS.cols} size={13} color={COLORS.accent} />
                    <span style={{ color: COLORS.text, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{headers.length}</span>
                    <span>cols</span>
                  </span>
                  <span style={{ color: COLORS.textFaint, fontSize: 11 }}>·</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: COLORS.textMuted, fontSize: 12 }}>
                    <Icon d={ICONS.filter} size={13} color={COLORS.accent} />
                    <span style={{ color: COLORS.text, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{displayFiltered.toLocaleString()}</span>
                    <span>filtered</span>
                  </span>
                  <span style={{ color: COLORS.textFaint, fontSize: 11 }}>·</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: COLORS.textMuted, fontSize: 12 }}>
                    <Icon d={ICONS.sheet} size={13} color={COLORS.accent} />
                    <span style={{ color: COLORS.text, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{sheets.length}</span>
                    <span>sheet{sheets.length > 1 ? "s" : ""}</span>
                  </span>
                </div>
              </div>

              {/* ── 3-column layout: Calculator | Buttons | Filters ── */}
              {/* This outer div replaces the old "Right side" flex container */}
            </div>{/* close the file-info + actions row */}

            {/* ── 3-panel toolbar row ── */}
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 0 }}>

              {/* LEFT: Column Calculator */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <ExcelColumnCalculator
                  headers={headers}
                  allRows={isClient ? (allData[activeSheet] || []) : serverRows}
                  filteredRows={baseDisplayRows}
                  onAddColumn={handleAddCalcColumn}
                  onAddRow={handleAddCalcRow}
                  onPopupOpen={() => setCalcPopupOpen(true)}
                  COLORS={COLORS}
                  Icon={Icon}
                  ICONS={ICONS}
                />
              </div>

              {/* CENTER: Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", flexShrink: 0, width: 130 }}>
                <button className="btn btn-ghost" onClick={() => exportToCSV(visibleCols, displayRows, `export_${activeSheet}.csv`)}>
                  <Icon d={ICONS.download} size={14} /> Export CSV
                </button>
                <button className="btn btn-danger" onClick={resetAll}>
                  <Icon d={ICONS.close} size={13} /> Remove
                </button>
                <button className="btn btn-primary" onClick={() => fileRef.current.click()}>
                  <Icon d={ICONS.refresh} size={14} /> New File
                </button>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.tsv"
                  style={{ display: "none" }} onChange={e => parseFile(e.target.files[0])} />
              </div>

              {/* RIGHT: Filters */}
              <div style={{ flex: 1, minWidth: 0 }}>
                  <ExcelFilters
                    headers={headers}
                    visibleCols={visibleCols}
                    dateColumns={dateColumns}
                    toggleCol={toggleCol}
                    setVisibleCols={setVisibleCols}
                    dateFilterOpen={dateFilterOpen}
                    setDateFilterOpen={setDateFilterOpen}
                    hasDateFilter={hasDateFilter}
                    activeDateCol={activeDateCol}
                    setActiveDateCol={setActiveDateCol}
                    dateFilterMode={dateFilterMode}
                    setDateFilterMode={setDateFilterMode}
                    dateExact={dateExact}
                    setDateExact={setDateExact}
                    dateFrom={dateFrom}
                    setDateFrom={setDateFrom}
                    dateTo={dateTo}
                    setDateTo={setDateTo}
                    applyDateFilter={applyDateFilter}
                    clearDateFilter={clearDateFilter}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    setSortKey={setSortKey}
                    setSortDir={setSortDir}
                    colsWithZeros={colsWithZeros}
                    zeroNullStats={zeroNullStats}
                    zeroFilterOpen={zeroFilterOpen}
                    setZeroFilterOpen={setZeroFilterOpen}
                    hasZeroFilter={hasZeroFilter}
                    excludeZeroCols={excludeZeroCols}
                    setExcludeZeroCols={setExcludeZeroCols}
                    isServer={isServer}
                    runServer={runServer}
                    currentFile={currentFile}
                    activeSheet={activeSheet}
                    pageSize={pageSize}
                    search={search}
                    buildDateParams={buildDateParams}
                    serverSheet={serverSheet}
                    handleSearch={handleSearch}
                    PAGE_SIZES={PAGE_SIZES}
                    handlePageSize={handlePageSize}
                    displayPage={displayPage}
                    displayTotalRows={displayTotalRows}
                    setPage={setPage}
                    {...sharedProps}
                  />
              </div>{/* end right filters */}
            </div>{/* end 3-panel toolbar row */}

            {/* ── Sheet tabs ── */}
            {sheets.length > 1 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                {sheets.map(name => (
                  <div key={name} className={`sheet-tab ${activeSheet === name ? "active" : "inactive"}`}
                    onClick={() => changeSheet(name)}>
                    <Icon d={ICONS.table} size={12} style={{ display: "inline", marginRight: 5 }} />
                    {name}
                  </div>
                ))}
              </div>
            )}

            {/* ── Search ── */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <Icon d={ICONS.search} size={15} color={COLORS.textFaint} />
                </div>
                <input className="search-input" placeholder="Search anything..."
                  value={search}
                  onChange={e => handleSearch(e.target.value)} />
                {search && (
                  <button style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint }}
                    onClick={() => handleSearch("")}>
                    <Icon d={ICONS.close} size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* ── Table + Pagination ── */}
            <ExcelDataTable
              isLoading={isLoading}
              displayRows={displayRows}
              visibleCols={visibleCols}
              dateColumns={dateColumns}
              sortKey={sortKey}
              sortDir={sortDir}
              handleSort={handleSort}
              displayPage={displayPage}
              displayTotalPages={displayTotalPages}
              pageSize={pageSize}
              goToPage={goToPage}
              hasZeroFilter={hasZeroFilter}
              excludeZeroCols={excludeZeroCols}
              formatDateDisplay={formatDateDisplay}
              {...sharedProps}
            />

          </div>
        )}
        </div>{/* end inner content */}

        {/* ── Footer bar (matches InfoMaster) ── */}
        <div className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700" style={{ height: "8px" }} />

      </div>{/* end outer shell */}

      {/* ── Column Calculator Popup Modal ── */}
      {calcPopupOpen && (
        <div
          onClick={() => setCalcPopupOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
            backdropFilter: "blur(3px)",
            animation: "fadeSlideIn 0.2s ease both",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "min(96vw, 900px)",
              height: "min(90vh, 720px)",
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 18,
              boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "fadeSlideIn 0.25s cubic-bezier(.22,.61,.36,1) both",
            }}
          >
            {/* Popup header bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px",
              background: COLORS.card,
              borderBottom: `1px solid ${COLORS.border}`,
              flexShrink: 0,
            }}>
              <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🧮</span> Column Calculator
                <span style={{ color: COLORS.textFaint, fontSize: 11, fontWeight: 400 }}>— popup mode</span>
              </span>
              <button
                onClick={() => setCalcPopupOpen(false)}
                title="Close"
                style={{
                  background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)",
                  color: "#f87171", borderRadius: 8, padding: "4px 10px",
                  cursor: "pointer", fontSize: 13, fontWeight: 700,
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <Icon d={ICONS.close} size={13} color="#f87171" /> Close
              </button>
            </div>

            {/* Calculator fills remaining space */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <ExcelColumnCalculator
                headers={headers}
                allRows={isClient ? (allData[activeSheet] || []) : serverRows}
                filteredRows={baseDisplayRows}
                onAddColumn={handleAddCalcColumn}
                onAddRow={handleAddCalcRow}
                popupMode={true}
                COLORS={COLORS}
                Icon={Icon}
                ICONS={ICONS}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}