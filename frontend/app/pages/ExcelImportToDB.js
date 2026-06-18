"use client";
import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Upload, Database, ChevronDown, CheckCircle,
  AlertCircle, X, Play, FileSpreadsheet, Layers
} from "lucide-react";

const API_BASE = "http://localhost:8000/api";

// ─── Target Tables Config ───────────────────────────────────────────────────
// Each entry defines: which API to call, which field the value goes into,
// and an optional code-generator (same logic as the original pages).
// ─── Extra config for lookup-based tables (Sub-Category, Product) ────────────
// These tables need a parent ID (category_id / subcategory_id).
// The user picks the parent from a dropdown that appears when the table is selected.
// The import uses FormData + /import endpoint (same as ExcelImportPopup).

const TARGET_TABLES = [
  {
    id: "company-type",
    label: "Company Type",
    emoji: "🏢",
    apiUrl: `${API_BASE}/company-types`,
    useJson: true,
    buildPayload: (value) => {
      const base = value.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 6);
      const code = `${base}-${Math.floor(100 + Math.random() * 900)}`;
      return { type_name: value, type_code: code };
    },
    fieldLabel: "type_name",
  },
  {
    id: "industry-type",
    label: "Industry Type",
    emoji: "🏭",
    apiUrl: `${API_BASE}/industry-types`,
    useJson: true,
    buildPayload: (value) => {
      const base = value.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 6);
      const code = `${base}-${Math.floor(100 + Math.random() * 900)}`;
      return { industry_name: value, industry_code: code };
    },
    fieldLabel: "industry_name",
  },
  {
    id: "plant-type",
    label: "Plant Type",
    emoji: "🌿",
    apiUrl: `${API_BASE}/plant-types`,
    useJson: true,
    buildPayload: (value) => {
      const base = value.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 6);
      const code = `${base}-${Math.floor(100 + Math.random() * 900)}`;
      return { type_name: value, type_code: code };
    },
    fieldLabel: "type_name",
  },
  {
    id: "currency",
    label: "Currency",
    emoji: "💱",
    apiUrl: `${API_BASE}/currencies`,
    useJson: true,
    buildPayload: (value) => {
      const symbolMap = {
        dollar: "$", euro: "€", pound: "£", rupee: "₹", yen: "¥",
        yuan: "¥", franc: "₣", won: "₩", ruble: "₽", real: "R$",
        rand: "R", peso: "₱", riyal: "﷼", dirham: "د.إ",
        shekel: "₪", lira: "₺", krona: "kr", krone: "kr",
      };
      const lower = value.toLowerCase();
      let symbol = value.substring(0, 3).toUpperCase();
      for (const [key, sym] of Object.entries(symbolMap)) {
        if (lower.includes(key)) { symbol = sym; break; }
      }
      const base = value.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 6);
      const code = `${base}-${Math.floor(100 + Math.random() * 900)}`;
      return { currency_name: value, currency_code: code, currency_symbol: symbol };
    },
    fieldLabel: "currency_name",
  },
  // ── Sub-Category: needs a category_id selected by user ──────────────────
  {
    id: "sub-category",
    label: "Sub-Category",
    emoji: "📂",
    apiUrl: `${API_BASE}/item-sub-category/import`,
    useJson: false,          // FormData POST (matches backend /import endpoint)
    requiresParent: true,    // show parent picker
    parentLabel: "Category",
    parentApiUrl: `${API_BASE}/item-category/lov`,
    parentKey: "category_id",
    parentDisplayKey: "name",
    buildPayload: (value, parentId) => {
      // Returns a plain object; runImport will convert to FormData when useJson=false
      return { name: value, category_id: String(parentId) };
    },
    fieldLabel: "name",
  },
  // ── Product: needs a sub_category_id selected by user ───────────────────
  {
    id: "product",
    label: "Product",
    emoji: "📦",
    apiUrl: `${API_BASE}/item-product/import`,
    useJson: false,          // FormData POST (matches backend /import endpoint)
    requiresParent: true,
    parentLabel: "Sub-Category",
    parentApiUrl: `${API_BASE}/item-sub-category/lov`,
    parentKey: "subcategory_id",
    parentDisplayKey: "name",
    buildPayload: (value, parentId) => {
      return { name: value, subcategory_id: String(parentId) };
    },
    fieldLabel: "name",
  },
];

// ─── Capitalize helper ──────────────────────────────────────────────────────
const capitalize = (text) =>
  text.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ExcelImportToDB() {
  const fileRef = useRef(null);

  // File & parse state
  const [fileName, setFileName]       = useState("");
  const [headers, setHeaders]         = useState([]);
  const [rows, setRows]               = useState([]);
  const [dragging, setDragging]       = useState(false);
  const [parsing, setParsing]         = useState(false);

  // Selection state
  const [selectedCol, setSelectedCol] = useState("");
  const [selectedTable, setSelectedTable] = useState(null);

  // Parent picker state (for Sub-Category / Product)
  const [parentOptions, setParentOptions] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [parentLoading, setParentLoading] = useState(false);

  // Import state
  const [preview, setPreview]         = useState([]);      // values to insert
  const [importLog, setImportLog]     = useState([]);      // {value, status, error}
  const [importing, setImporting]     = useState(false);
  const [importDone, setImportDone]   = useState(false);

  // ── Parse File ────────────────────────────────────────────────────────────
  const parseFile = useCallback((file) => {
    if (!file) return;
    setFileName(file.name);
    setHeaders([]); setRows([]); setSelectedCol(""); setSelectedTable(null);
    setPreview([]); setImportLog([]); setImportDone(false);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (data.length > 0) {
          setHeaders(Object.keys(data[0]));
          setRows(data);
        }
      } catch {
        alert("Could not parse file. Please use .xlsx, .xls, or .csv");
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    parseFile(e.dataTransfer.files[0]);
  };

  // ── Table selection — fetch parent options if needed ────────────────────
  const handleTableSelect = async (t) => {
    setSelectedTable(t);
    setSelectedParentId("");
    setParentOptions([]);
    if (t.requiresParent && t.parentApiUrl) {
      setParentLoading(true);
      try {
        const res = await fetch(t.parentApiUrl);
        if (res.ok) {
          const data = await res.json();
          setParentOptions(data);
        }
      } catch { /* silently ignore */ }
      setParentLoading(false);
    }
  };

  // ── Build Preview ─────────────────────────────────────────────────────────
  const buildPreview = (col) => {
    const vals = rows
      .map(r => String(r[col] ?? "").trim())
      .filter(v => v !== "")
      .map(v => capitalize(v));
    // Deduplicate
    setPreview([...new Set(vals)]);
    setImportLog([]);
    setImportDone(false);
  };

  const handleColChange = (col) => {
    setSelectedCol(col);
    if (col) buildPreview(col);
  };

  // ── Import to DB ──────────────────────────────────────────────────────────
  const runImport = async () => {
    if (!selectedTable || preview.length === 0) return;
    if (selectedTable.requiresParent && !selectedParentId) {
      alert(`Please select a ${selectedTable.parentLabel} first.`);
      return;
    }
    setImporting(true);
    setImportDone(false);
    const log = [];

    for (const value of preview) {
      try {
        const payload = selectedTable.buildPayload(value, selectedParentId);

        let res;
        if (selectedTable.useJson) {
          // Original JSON POST (company-type, industry-type, etc.)
          res = await fetch(selectedTable.apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          // FormData POST — used by /import endpoints (sub-category, product)
          const fd = new FormData();
          Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
          res = await fetch(selectedTable.apiUrl, {
            method: "POST",
            body: fd,
          });
        }

        if (res.ok) {
          log.push({ value, status: "success" });
        } else {
          const err = await res.json().catch(() => ({}));
          log.push({ value, status: "error", error: err.detail || `HTTP ${res.status}` });
        }
      } catch (err) {
        log.push({ value, status: "error", error: err.message });
      }
      setImportLog([...log]); // live update
    }

    setImporting(false);
    setImportDone(true);
  };

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = () => {
    setFileName(""); setHeaders([]); setRows([]);
    setSelectedCol(""); setSelectedTable(null);
    setParentOptions([]); setSelectedParentId("");
    setPreview([]); setImportLog([]); setImportDone(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const successCount = importLog.filter(l => l.status === "success").length;
  const errorCount   = importLog.filter(l => l.status === "error").length;

  // ── Styles ────────────────────────────────────────────────────────────────
  const S = {
    wrap:    { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "#f8fafc" },
    card:    { width: "100%", maxWidth: "900px", height: "100%", maxHeight: "640px", background: "#fff", borderRadius: "10px", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", display: "flex", flexDirection: "column", overflow: "hidden" },
    header:  { height: "36px", padding: "0 16px", background: "linear-gradient(to right, #4b5563, #60a5fa)", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 },
    body:    { flex: 1, overflow: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" },
    footer:  { height: "10px", background: "linear-gradient(to right, #60a5fa, #4b5563)", flexShrink: 0 },
    section: { background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 14px" },
    label:   { fontSize: "10px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" },
    select:  { width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", background: "#fff", color: "#111827", outline: "none", cursor: "pointer" },
    btn:     { padding: "7px 18px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" },
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>

        {/* ── Header ── */}
        <div style={S.header}>
          <Database size={15} color="#fff" />
          <span style={{ color: "#fff", fontSize: "13px", fontWeight: "600" }}>Excel → Database Importer</span>
          {fileName && (
            <span style={{ marginLeft: "auto", fontSize: "10px", color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.15)", padding: "2px 10px", borderRadius: "20px" }}>
              {fileName}
            </span>
          )}
          {fileName && (
            <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", padding: "2px" }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div style={S.body}>

          {/* STEP 1 — Upload */}
          {!rows.length ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current.click()}
              style={{
                flex: 1, border: `2px dashed ${dragging ? "#60a5fa" : "#d1d5db"}`,
                borderRadius: "10px", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "12px",
                cursor: "pointer", background: dragging ? "#eff6ff" : "#fafafa",
                transition: "all 0.2s",
              }}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                onChange={e => parseFile(e.target.files[0])} />
              {parsing ? (
                <>
                  <div style={{ width: "32px", height: "32px", border: "3px solid #e5e7eb", borderTopColor: "#60a5fa", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: "13px", color: "#6b7280" }}>Parsing file...</span>
                </>
              ) : (
                <>
                  <div style={{ width: "56px", height: "56px", background: "#eff6ff", border: "2px solid #bfdbfe", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Upload size={26} color="#3b82f6" />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                      {dragging ? "Drop file here!" : "Drag & drop or click to upload"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                      Supports .xlsx, .xls, .csv
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* STEP 2 — Column + Table Selection */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

                {/* Column select */}
                <div style={S.section}>
                  <div style={S.label}>
                    <FileSpreadsheet size={11} style={{ display: "inline", marginRight: "4px" }} />
                    Step 1 — Select Excel Column
                  </div>
                  <select style={S.select} value={selectedCol} onChange={e => handleColChange(e.target.value)}>
                    <option value="">-- Choose a column --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h} ({rows.filter(r => String(r[h] ?? "").trim()).length} values)</option>
                    ))}
                  </select>
                  {selectedCol && (
                    <div style={{ marginTop: "6px", fontSize: "10px", color: "#6b7280" }}>
                      <span style={{ color: "#10b981", fontWeight: "600" }}>{preview.length}</span> unique non-empty values found
                    </div>
                  )}
                </div>

                {/* Table select */}
                <div style={S.section}>
                  <div style={S.label}>
                    <Layers size={11} style={{ display: "inline", marginRight: "4px" }} />
                    Step 2 — Select Target Table
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    {TARGET_TABLES.map(t => (
                      <button key={t.id} onClick={() => handleTableSelect(t)}
                        style={{
                          padding: "6px 8px", border: `1.5px solid ${selectedTable?.id === t.id ? "#3b82f6" : "#e5e7eb"}`,
                          borderRadius: "6px", background: selectedTable?.id === t.id ? "#eff6ff" : "#fff",
                          cursor: "pointer", fontSize: "11px", fontWeight: "500",
                          color: selectedTable?.id === t.id ? "#1d4ed8" : "#374151",
                          display: "flex", alignItems: "center", gap: "5px", transition: "all 0.15s",
                        }}>
                        <span>{t.emoji}</span> {t.label}
                        {selectedTable?.id === t.id && <CheckCircle size={11} color="#3b82f6" style={{ marginLeft: "auto" }} />}
                      </button>
                    ))}
                  </div>

                  {/* Parent picker — shown when selected table needs a parent */}
                  {selectedTable?.requiresParent && (
                    <div style={{ marginTop: "10px" }}>
                      <div style={{ ...S.label, marginBottom: "4px" }}>
                        Select {selectedTable.parentLabel}
                        <span style={{ color: "#ef4444", marginLeft: "3px" }}>*</span>
                      </div>
                      {parentLoading ? (
                        <div style={{ fontSize: "11px", color: "#6b7280", padding: "6px 0" }}>
                          Loading {selectedTable.parentLabel} list…
                        </div>
                      ) : (
                        <select
                          style={S.select}
                          value={selectedParentId}
                          onChange={e => setSelectedParentId(e.target.value)}
                        >
                          <option value="">-- Choose {selectedTable.parentLabel} --</option>
                          {parentOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt[selectedTable.parentDisplayKey]} {opt.code ? `(${opt.code})` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                      {selectedParentId && (
                        <div style={{ marginTop: "4px", fontSize: "10px", color: "#10b981", fontWeight: "600" }}>
                          ✓ {selectedTable.parentLabel} selected
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 3 — Preview */}
              {preview.length > 0 && selectedTable && (
                <div style={S.section}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={S.label} >
                      Step 3 — Preview &amp; Import
                      <span style={{ marginLeft: "8px", color: "#3b82f6", fontSize: "10px", fontWeight: "500", textTransform: "none" }}>
                        Column: <b>{selectedCol}</b> → Table: <b>{selectedTable.label}</b>
                      </span>
                    </div>
                    {!importDone && (
                      <button onClick={runImport} disabled={importing || (selectedTable?.requiresParent && !selectedParentId)}
                        style={{ ...S.btn, background: (importing || (selectedTable?.requiresParent && !selectedParentId)) ? "#9ca3af" : "#10b981", color: "#fff" }}>
                        <Play size={13} />
                        {importing ? `Inserting... (${importLog.length}/${preview.length})` : `Import ${preview.length} rows`}
                      </button>
                    )}
                    {importDone && (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "#10b981", fontWeight: "600" }}>✅ {successCount} inserted</span>
                        {errorCount > 0 && <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: "600" }}>❌ {errorCount} failed</span>}
                      </div>
                    )}
                  </div>

                  {/* Preview table */}
                  <div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                      <thead style={{ position: "sticky", top: 0, background: "#f9fafb", zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: "600", color: "#6b7280", borderBottom: "1px solid #e5e7eb", width: "36px" }}>#</th>
                          <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: "600", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>Value</th>
                          <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: "600", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>Field → {selectedTable.fieldLabel}</th>
                          <th style={{ padding: "6px 10px", textAlign: "center", fontWeight: "600", color: "#6b7280", borderBottom: "1px solid #e5e7eb", width: "80px" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((val, i) => {
                          const log = importLog[i];
                          return (
                            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: log?.status === "error" ? "#fff5f5" : log?.status === "success" ? "#f0fdf4" : "transparent" }}>
                              <td style={{ padding: "5px 10px", color: "#9ca3af" }}>{i + 1}</td>
                              <td style={{ padding: "5px 10px", color: "#111827", fontWeight: "500" }}>{val}</td>
                              <td style={{ padding: "5px 10px", color: "#3b82f6", fontFamily: "monospace", fontSize: "10px" }}>
                                {`${selectedTable.fieldLabel}: "${val}"`}
                              </td>
                              <td style={{ padding: "5px 10px", textAlign: "center" }}>
                                {!log && <span style={{ color: "#d1d5db", fontSize: "10px" }}>—</span>}
                                {log?.status === "success" && <CheckCircle size={14} color="#10b981" />}
                                {log?.status === "error" && (
                                  <span title={log.error}>
                                    <AlertCircle size={14} color="#ef4444" />
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Error details */}
                  {importDone && errorCount > 0 && (
                    <div style={{ marginTop: "8px", padding: "8px 10px", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "10px", color: "#dc2626" }}>
                      <strong>Failed rows:</strong>
                      {importLog.filter(l => l.status === "error").map((l, i) => (
                        <div key={i} style={{ marginTop: "3px" }}>• {l.value}: {l.error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Hint when column selected but no table */}
              {preview.length > 0 && !selectedTable && (
                <div style={{ padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", fontSize: "11px", color: "#92400e", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ChevronDown size={14} /> Please select a target table above to continue
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={S.footer} />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}