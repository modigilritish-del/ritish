/**
 * ExcelColumnCalculator.jsx — v3 COMPLETE REBUILD
 *
 * ✅ Processes ENTIRE sheet (allRows — not just current page)
 * ✅ NEW COLUMN mode  → per-row formula, injected as new column
 * ✅ NEW ROW mode     → aggregate result row appended to table bottom
 * ✅ FILTER-AWARE     → works on filtered/searched subset too
 * ✅ 360° DYNAMIC     → column name + literal + row-field matching
 * ✅ ALL OPERATORS:
 *    Arithmetic  + - * / // % **
 *    Comparison  == != > < >= <=
 *    Assignment  = += -= *= /= //= %= **=
 *    Logical     AND OR NOT
 *    Identity    is  is not
 *    Membership  in  not in
 *    Bitwise     & | ^ ~ << >>
 * ✅ AGGREGATE FUNCTIONS: SUM AVG MIN MAX COUNT PRODUCT RANGE STD
 * ✅ Fast single-pass evaluation using compiled JS functions
 *
 * Props:
 *   headers      string[]        all column names
 *   allRows      object[]        FULL unfiltered sheet rows
 *   filteredRows object[]        currently filtered/searched rows
 *   onAddColumn  (name,vals[])→void
 *   onAddRow     (rowObj)→void
 *   COLORS / Icon / ICONS
 */

import { useState, useMemo, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// OPERATOR CATALOG
// ─────────────────────────────────────────────────────────────────────────────
const OP_GROUPS = [
  {
    id: "arith", label: "Arithmetic", emoji: "➕",
    color: "#4f8ef7", bg: "rgba(79,142,247,0.13)", border: "rgba(79,142,247,0.38)",
    ops: [
      { sym: "+",   label: "Add",          ex: "A + B"   },
      { sym: "-",   label: "Subtract",     ex: "A - B"   },
      { sym: "*",   label: "Multiply",     ex: "A × B"   },
      { sym: "/",   label: "Divide",       ex: "A ÷ B"   },
      { sym: "//",  label: "Floor Div",    ex: "A // B"  },
      { sym: "%",   label: "Modulo",       ex: "A % B"   },
      { sym: "**",  label: "Power",        ex: "A ** B"  },
    ],
  },
  {
    id: "cmp", label: "Comparison", emoji: "⚖️",
    color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)",
    ops: [
      { sym: "==",  label: "Equal",          ex: "A == B → T/F"  },
      { sym: "!=",  label: "Not Equal",      ex: "A != B → T/F"  },
      { sym: ">",   label: "Greater",        ex: "A > B"          },
      { sym: "<",   label: "Less",           ex: "A < B"          },
      { sym: ">=",  label: "Greater/Equal",  ex: "A >= B"         },
      { sym: "<=",  label: "Less/Equal",     ex: "A <= B"         },
    ],
  },
  {
    id: "assign", label: "Assignment", emoji: "📝",
    color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)",
    ops: [
      { sym: "+=",  label: "Add Assign",     ex: "x += 2"  },
      { sym: "-=",  label: "Sub Assign",     ex: "x -= 2"  },
      { sym: "*=",  label: "Mul Assign",     ex: "x *= 2"  },
      { sym: "/=",  label: "Div Assign",     ex: "x /= 2"  },
      { sym: "//=", label: "Floor Assign",   ex: "x //= 2" },
      { sym: "%=",  label: "Mod Assign",     ex: "x %= 2"  },
      { sym: "**=", label: "Power Assign",   ex: "x **= 2" },
    ],
  },
  {
    id: "logic", label: "Logical", emoji: "🔗",
    color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)",
    ops: [
      { sym: "AND", label: "AND",  ex: "A AND B"  },
      { sym: "OR",  label: "OR",   ex: "A OR B"   },
      { sym: "NOT", label: "NOT",  ex: "NOT A"    },
    ],
  },
  {
    id: "ident", label: "Identity", emoji: "🪪",
    color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.35)",
    ops: [
      { sym: "is",     label: "Is",     ex: "A is B"     },
      { sym: "is not", label: "Is Not", ex: "A is not B" },
    ],
  },
  {
    id: "memb", label: "Membership", emoji: "🔍",
    color: "#fb923c", bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.35)",
    ops: [
      { sym: "in",     label: "In",     ex: "A in B"     },
      { sym: "not in", label: "Not In", ex: "A not in B" },
    ],
  },
  {
    id: "bit", label: "Bitwise", emoji: "⚙️",
    color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.35)",
    ops: [
      { sym: "&",  label: "AND",         ex: "A & B"  },
      { sym: "|",  label: "OR",          ex: "A | B"  },
      { sym: "^",  label: "XOR",         ex: "A ^ B"  },
      { sym: "~",  label: "NOT",         ex: "~A"     },
      { sym: "<<", label: "Left Shift",  ex: "A << n" },
      { sym: ">>", label: "Right Shift", ex: "A >> n" },
    ],
  },
];

// Aggregate functions (for NEW ROW mode)
const AGG_FUNCS = [
  { id: "SUM",     label: "SUM",     emoji: "Σ",  desc: "Sum of all values"     },
  { id: "AVG",     label: "AVG",     emoji: "x̄",  desc: "Average"               },
  { id: "MIN",     label: "MIN",     emoji: "↓",  desc: "Minimum value"         },
  { id: "MAX",     label: "MAX",     emoji: "↑",  desc: "Maximum value"         },
  { id: "COUNT",   label: "COUNT",   emoji: "#",  desc: "Count non-empty"       },
  { id: "PRODUCT", label: "PRODUCT", emoji: "∏",  desc: "Product of all values" },
  { id: "RANGE",   label: "RANGE",   emoji: "↕",  desc: "MAX - MIN"             },
  { id: "STD",     label: "STD",     emoji: "σ",  desc: "Standard deviation"    },
];

// ─────────────────────────────────────────────────────────────────────────────
// FAST EVALUATOR
// ─────────────────────────────────────────────────────────────────────────────

// Convert token list → JS expression string for a single row
function buildExprForRow(tokens, row) {
  return tokens.map(t => {
    if (t.type === "col") {
      const raw = row[t.value];
      const n   = Number(raw);
      if (raw !== "" && raw !== null && raw !== undefined && !isNaN(n)) return n;
      return JSON.stringify(String(raw ?? ""));
    }
    if (t.type === "lit") {
      const n = Number(t.value);
      return isNaN(n) ? JSON.stringify(t.value) : n;
    }
    // Operator mapping: Python → JS
    const MAP = {
      "AND": "&&", "OR": "||", "NOT": "!",
      "is": "===", "is not": "!==",
      "in": null, "not in": null,   // handled specially
      "//": null,                    // floor div handled specially
    };
    if (t.value in MAP) {
      if (MAP[t.value] === null) return t.value; // keep for post-processing
      return MAP[t.value];
    }
    return t.value;
  }).join(" ");
}

// Evaluate tokens against ONE row — returns result or "ERR"
function evalRow(tokens, row) {
  if (!tokens.length) return "";
  try {
    let expr = buildExprForRow(tokens, row);

    // Handle floor division  A // B  → Math.floor(A / B)
    expr = expr.replace(/(\S+)\s*\/\/\s*(\S+)/g, (_, a, b) => `Math.floor(${a}/${b})`);

    // Handle `in` / `not in`: string.includes or array.includes
    // Pattern:  X in Y  →  String(Y).includes(String(X))
    expr = expr.replace(/(\S+)\s+not in\s+(\S+)/g, (_, a, b) => `!String(${b}).includes(String(${a}))`);
    expr = expr.replace(/(\S+)\s+in\s+(\S+)/g,     (_, a, b) => `String(${b}).includes(String(${a}))`);

    const result = new Function(`"use strict"; return (${expr});`)(); // safe: user-built expression only
    if (result === null || result === undefined) return "";
    if (typeof result === "boolean") return result ? "TRUE" : "FALSE";
    if (typeof result === "number") {
      if (!isFinite(result)) return result > 0 ? "∞" : "-∞";
      return +result.toFixed(10);       // strip float dust
    }
    return String(result);
  } catch { return "ERR"; }
}

// Evaluate assignment operator tokens (+=, -=, etc.) against ONE row
// Returns updated accumulator value
function evalAssignment(tokens, row, accumulator) {
  if (!tokens.length) return accumulator;
  const assignOps = ["+=", "-=", "*=", "/=", "//=", "%=", "**="];
  // Find assignment op
  const aIdx = tokens.findIndex(t => t.type === "op" && assignOps.includes(t.value));
  if (aIdx < 0) return evalRow(tokens, row);   // no assignment op → normal eval

  const op    = tokens[aIdx].value;
  const right = evalRow(tokens.slice(aIdx + 1), row);
  const rn    = Number(right);
  let acc     = Number(accumulator) || 0;

  switch (op) {
    case "+=":  acc += rn; break;
    case "-=":  acc -= rn; break;
    case "*=":  acc *= rn; break;
    case "/=":  acc  = rn !== 0 ? acc / rn : Infinity; break;
    case "//=": acc  = rn !== 0 ? Math.floor(acc / rn) : Infinity; break;
    case "%=":  acc %= rn; break;
    case "**=": acc  = Math.pow(acc, rn); break;
    default:    acc  = rn;
  }
  return +acc.toFixed(10);
}

// Aggregate a column of numeric values
function aggregate(fn, nums) {
  if (!nums.length) return 0;
  switch (fn) {
    case "SUM":     return nums.reduce((a, b) => a + b, 0);
    case "AVG":     return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "MIN":     return Math.min(...nums);
    case "MAX":     return Math.max(...nums);
    case "COUNT":   return nums.length;
    case "PRODUCT": return nums.reduce((a, b) => a * b, 1);
    case "RANGE":   return Math.max(...nums) - Math.min(...nums);
    case "STD": {
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
      return Math.sqrt(variance);
    }
    default: return 0;
  }
}

// Colour per token
function tokColor(t) {
  if (t.type === "col")                    return "#60a5fa";
  if (t.type === "lit")                    return "#34d399";
  if (t.type === "lparen")                 return "#fbbf24";
  if (t.type === "rparen")                 return "#fbbf24";
  if (t.type === "op") {
    for (const g of OP_GROUPS) {
      if (g.ops.some(o => o.sym === t.value)) return g.color;
    }
  }
  return "#e8eaf6";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ExcelColumnCalculator({
  headers = [], allRows = [], filteredRows = [],
  onAddColumn, onAddRow,
  onPopupOpen,   // optional: called when user clicks the "open in popup" button
  popupMode = false,  // when true: fills full height (used inside popup modal)
  COLORS,
}) {
  const C = COLORS || {
    bg: "#0f1117", surface: "#1a1d27", card: "#21253a", border: "#2e3350",
    accent: "#4f8ef7", text: "#e8eaf6", textMuted: "#8b91b0", textFaint: "#555a7a",
    success: "#34d399", danger: "#f87171", dangerBg: "rgba(248,113,113,0.1)",
  };

  // ── Mode: "column" = new column per row | "row" = aggregate row ──
  const [mode,          setMode]          = useState("column");  // "column"|"row"
  const [tokens,        setTokens]        = useState([]);
  const [resultName,    setResultName]    = useState("Result");
  const [litInput,      setLitInput]      = useState("");
  const [activeGroup, setActiveGroup] = useState(() => new Set()); // Set of open group ids
  const [dataScope,     setDataScope]     = useState("filtered"); // "all"|"filtered"
  const [aggFunc,       setAggFunc]       = useState("SUM");
  const [aggCol,        setAggCol]        = useState("");         // column to aggregate
  const [multiAggCols,  setMultiAggCols]  = useState([]);         // for multi-col agg row
  const [showPreview,   setShowPreview]   = useState(true);
  const [injected,      setInjected]      = useState(false);
  const [colSearch,     setColSearch]     = useState("");

  // Scope selector
  const workingRows = dataScope === "all" ? allRows : (filteredRows.length ? filteredRows : allRows);

  // Null-safe Set wrapper for activeGroup
  const activeGroupSet = activeGroup instanceof Set ? activeGroup : new Set();

  // Filtered column list for search
  const visibleHeaders = useMemo(() =>
    colSearch.trim()
      ? headers.filter(h => h.toLowerCase().includes(colSearch.toLowerCase()))
      : headers,
    [headers, colSearch]
  );

  // ── Token helpers ──
  const addToken   = useCallback(t  => { setTokens(p => [...p, t]); setInjected(false); }, []);
  const undoToken  = useCallback(()  => { setTokens(p => p.slice(0, -1)); setInjected(false); }, []);
  const clearTokens= useCallback(()  => { setTokens([]); setInjected(false); }, []);
  const removeAt   = useCallback(i  => { setTokens(p => p.filter((_, j) => j !== i)); setInjected(false); }, []);
  const addLit     = useCallback(()  => {
    if (!litInput.trim()) return;
    addToken({ type: "lit", value: litInput.trim() });
    setLitInput("");
  }, [litInput, addToken]);

  const formulaStr = useMemo(() =>
    tokens.map(t => t.type === "col" ? `[${t.value}]` : t.value).join(" "),
    [tokens]
  );

  // ── COLUMN MODE: compute per-row results across workingRows ──
  const columnResults = useMemo(() => {
    if (mode !== "column" || !tokens.length) return [];
    const assignOps = ["+=", "-=", "*=", "/=", "//=", "%=", "**="];
    const hasAssign = tokens.some(t => t.type === "op" && assignOps.includes(t.value));

    if (hasAssign) {
      // Accumulate across all rows
      let acc = 0;
      return workingRows.map(row => {
        acc = evalAssignment(tokens, row, acc);
        return typeof acc === "number" ? +acc.toFixed(10) : acc;
      });
    }
    return workingRows.map(row => evalRow(tokens, row));
  }, [tokens, workingRows, mode]);

  // ── ROW MODE: aggregate single column or build multi-col agg row ──
  const rowResult = useMemo(() => {
    if (mode !== "row") return null;
    const cols = multiAggCols.length ? multiAggCols : (aggCol ? [aggCol] : []);
    if (!cols.length) return null;
    const result = {};
    cols.forEach(col => {
      const nums = workingRows
        .map(r => Number(r[col]))
        .filter(n => !isNaN(n));
      result[col] = aggregate(aggFunc, nums);
    });
    return result;
  }, [mode, aggCol, multiAggCols, aggFunc, workingRows]);

  // ── Stats for column mode ──
  const numericVals = useMemo(() =>
    columnResults.filter(v => v !== "" && v !== "ERR" && !isNaN(Number(v))).map(Number),
    [columnResults]
  );
  const errCount   = columnResults.filter(v => v === "ERR").length;
  const trueCount  = columnResults.filter(v => v === "TRUE").length;
  const falseCount = columnResults.filter(v => v === "FALSE").length;
  const hasBool    = trueCount + falseCount > 0;

  const statsData = useMemo(() => {
    const fmt   = n => Number(n.toFixed(6)).toLocaleString();
    const total = columnResults.length;

    // Boolean / Comparison results
    if (hasBool) {
      const truePct  = total ? ((trueCount  / total) * 100).toFixed(1) : 0;
      const falsePct = total ? ((falseCount / total) * 100).toFixed(1) : 0;
      return [
        { l: "Total",   v: total.toLocaleString(),          color: "#a5b4fc" },
        { l: "TRUE ✓",  v: trueCount.toLocaleString(),     color: "#34d399", sub: truePct + "%"  },
        { l: "FALSE ✗", v: falseCount.toLocaleString(),    color: "#f87171", sub: falsePct + "%" },
        ...(numericVals.length ? [{ l: "Numeric", v: numericVals.length.toLocaleString(), color: "#fbbf24" }] : []),
        ...(errCount ? [{ l: "ERR", v: errCount, color: "#fb923c", err: true }] : []),
      ];
    }

    // Numeric results
    if (!numericVals.length) return null;
    const sum = numericVals.reduce((a, b) => a + b, 0);
    const avg = sum / numericVals.length;
    const min = Math.min(...numericVals);
    const max = Math.max(...numericVals);
    return [
      { l: "Rows", v: numericVals.length.toLocaleString() },
      { l: "SUM",  v: fmt(sum) },
      { l: "AVG",  v: fmt(avg) },
      { l: "MIN",  v: fmt(min) },
      { l: "MAX",  v: fmt(max) },
      ...(errCount ? [{ l: "ERR", v: errCount, color: "#fb923c", err: true }] : []),
    ];
  }, [numericVals, errCount, trueCount, falseCount, hasBool, columnResults]);

  // ── Inject ──
  const handleInject = useCallback(() => {
    if (mode === "column") {
      if (!tokens.length || !onAddColumn) return;
      // Build full-length values array aligned to allRows indices
      // Map each allRow to its result
      const assignOps = ["+=", "-=", "*=", "/=", "//=", "%=", "**="];
      const hasAssign = tokens.some(t => t.type === "op" && assignOps.includes(t.value));
      let acc = 0;
      const allVals = allRows.map(row => {
        if (hasAssign) {
          acc = evalAssignment(tokens, row, acc);
          return typeof acc === "number" ? +acc.toFixed(10) : acc;
        }
        return evalRow(tokens, row);
      });
      onAddColumn(resultName || "Result", allVals);
      setInjected(true);
    } else {
      if (!rowResult || !onAddRow) return;
      const newRow = { ...rowResult, __isCalcRow: true, __calcLabel: resultName || "RESULT" };
      onAddRow(newRow);
      setInjected(true);
    }
  }, [mode, tokens, rowResult, allRows, onAddColumn, onAddRow, resultName]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: popupMode ? 0 : 10,
      marginBottom: popupMode ? 0 : 14,
      height: popupMode ? "100%" : 230,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      fontFamily: "'Sora','Segoe UI',sans-serif",
      position: "relative",
    }}>

      {/* ── Expand / Popup button — absolute top-right corner ── */}
      {onPopupOpen && (
        <button
          onClick={onPopupOpen}
          title="Open Calculator in popup"
          style={{
            position: "absolute", top: 6, right: 6, zIndex: 10,
            width: 22, height: 22,
            padding: 0, fontSize: 12, fontWeight: 700,
            borderRadius: 5, cursor: "pointer",
            border: `1px solid ${C.border}`,
            background: "rgba(79,142,247,0.13)",
            color: "#4f8ef7",
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
            opacity: 0.7,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
        >⤢</button>
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: "linear-gradient(135deg,#4f8ef7,#a78bfa)",
            borderRadius: 8, width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
          }}>🧮</div>
          <div>
            <span style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>Column Calculator</span>
            <span style={{ color: C.textFaint, fontSize: 11, marginLeft: 8 }}>
              {workingRows.length.toLocaleString()} rows in scope
            </span>
          </div>
        </div>

        {/* Mode + Scope toggles */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {/* Data scope */}
          {["filtered","all"].map(s => (
            <button key={s} onClick={() => setDataScope(s)} style={{
              padding: "3px 10px", fontSize: 10, fontWeight: 600,
              borderRadius: 7, cursor: "pointer", border: "1px solid",
              background: dataScope === s ? "rgba(79,142,247,0.2)" : "transparent",
              borderColor: dataScope === s ? "#4f8ef7" : C.border,
              color: dataScope === s ? "#4f8ef7" : C.textMuted,
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              {s === "filtered" ? "🔍 Filtered" : "📋 All Rows"}
            </button>
          ))}
          <div style={{ width: 1, height: 18, background: C.border }} />
          {/* Mode */}
          {[{id:"column",label:"New Column",e:"📊"},{id:"row",label:"New Row",e:"📏"}].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{
              padding: "3px 11px", fontSize: 10, fontWeight: 600,
              borderRadius: 7, cursor: "pointer", border: "1px solid",
              background: mode === m.id ? "rgba(52,211,153,0.18)" : "transparent",
              borderColor: mode === m.id ? "#34d399" : C.border,
              color: mode === m.id ? "#34d399" : C.textMuted,
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              {m.e} {m.label}
            </button>
          ))}
          {/* Undo / Clear */}
          {tokens.length > 0 && (
            <>
              <button onClick={undoToken} style={{ padding:"3px 9px", fontSize:10, fontWeight:600, borderRadius:7, cursor:"pointer", border:`1px solid ${C.border}`, background:"transparent", color:C.textMuted }}>⌫</button>
              <button onClick={clearTokens} style={{ padding:"3px 9px", fontSize:10, fontWeight:600, borderRadius:7, cursor:"pointer", border:`1px solid ${C.border}`, background:"transparent", color:C.textMuted }}>✕</button>
            </>
          )}
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 8px" }}>

      {/* ════════════ COLUMN MODE UI ════════════ */}
      {mode === "column" && (
        <>
          {/* Formula builder bar */}
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "5px 10px", minHeight: 30,
            marginBottom: 5, display: "flex", alignItems: "center",
            flexWrap: "wrap", gap: 4,
          }}>
            {tokens.length === 0 ? (
              <span style={{ color: C.textFaint, fontSize: 11, fontStyle: "italic" }}>
                👆 Click columns below, then choose an operator...
              </span>
            ) : tokens.map((t, i) => (
              <span key={i} onClick={() => removeAt(i)} title="Click to remove"
                style={{
                  background: t.type === "col" ? "rgba(79,142,247,0.18)"
                            : t.type === "lit" ? "rgba(52,211,153,0.15)"
                            : "rgba(255,255,255,0.05)",
                  border: `1px solid ${tokColor(t)}44`,
                  color: tokColor(t),
                  borderRadius: 5, padding: "2px 9px", fontSize: 12,
                  fontFamily: "monospace", fontWeight: t.type==="col" ? 700 : 500,
                  cursor: "pointer", userSelect: "none", transition: "opacity 0.13s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity="0.5"}
                onMouseLeave={e => e.currentTarget.style.opacity="1"}
              >
                {t.type === "col" ? `[${t.value}]` : t.value}
              </span>
            ))}
          </div>

          {/* Readable formula */}
          {tokens.length > 0 && (
            <div style={{ background:"rgba(79,142,247,0.05)", borderRadius:7, padding:"3px 10px", marginBottom:5, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ color:C.textFaint, fontSize:10 }}>Formula:</span>
              <span style={{ color:"#a5b4fc", fontFamily:"monospace", fontSize:11 }}>{formulaStr}</span>
            </div>
          )}

          {/* ── MAIN LAYOUT: 2-panel in popup, stacked scroll in inline ── */}
          <div style={popupMode ? { display:"grid", gridTemplateColumns:"220px 1fr", gap:8, height: "calc(100% - 80px)", minHeight: 0 } : { display:"flex", flexDirection:"column", gap:6 }}>

            {/* LEFT PANEL: Columns + Literal + Brackets stacked */}
            <div style={{ display:"flex", flexDirection:"column", gap:6, ...(popupMode ? { minHeight:0 } : {}) }}>

              {/* Column picker */}
              <div style={{ display:"flex", flexDirection:"column", ...(popupMode ? { flex:1, minHeight:0 } : {}) }}>
                <div style={{ color:C.textMuted, fontSize:9, fontWeight:700, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.05em" }}>📋 Columns</div>
                <input
                  value={colSearch} onChange={e => setColSearch(e.target.value)}
                  placeholder="Search columns..."
                  style={{
                    width:"100%", background:C.card, border:`1px solid ${C.border}`,
                    borderRadius:6, padding:"4px 8px", color:C.text,
                    fontSize:10, marginBottom:4, outline:"none", fontFamily:"inherit",
                  }}
                />
                <div style={{
                  background:C.card, border:`1px solid ${C.border}`,
                  borderRadius:7, padding:5,
                  ...(popupMode ? { flex:1, overflowY:"auto" } : { maxHeight:70, overflowY:"auto" }),
                  display:"flex", flexWrap:"wrap", gap:3, alignContent:"flex-start",
                }}>
                  {visibleHeaders.length === 0 ? (
                    <span style={{ color:C.textFaint, fontSize:10 }}>No columns found</span>
                  ) : visibleHeaders.map(col => (
                    <button key={col} onClick={() => addToken({ type:"col", value:col })}
                      title={`Add [${col}]`}
                      style={{
                        background:"rgba(79,142,247,0.12)", border:"1px solid rgba(79,142,247,0.3)",
                        color:"#60a5fa", borderRadius:5, padding:"2px 7px", fontSize:10,
                        fontWeight:600, cursor:"pointer", fontFamily:"monospace",
                        transition:"background 0.13s", maxWidth:130, overflow:"hidden",
                        textOverflow:"ellipsis", whiteSpace:"nowrap",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background="rgba(79,142,247,0.25)"}
                      onMouseLeave={e => e.currentTarget.style.background="rgba(79,142,247,0.12)"}
                    >
                      {col.length > 16 ? col.slice(0,14)+"…" : col}
                    </button>
                  ))}
                </div>
              </div>

              {/* Literal input */}
              <div style={{ flexShrink:0 }}>
                <div style={{ color:C.textMuted, fontSize:9, fontWeight:700, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.05em" }}>✏️ Literal</div>
                <div style={{ display:"flex", gap:4 }}>
                  <input
                    value={litInput} onChange={e => setLitInput(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && addLit()}
                    placeholder='100 or "Active"'
                    style={{
                      flex:1, minWidth:0, background:C.card, border:`1px solid ${C.border}`,
                      borderRadius:6, padding:"4px 7px", color:C.text,
                      fontSize:10, fontFamily:"monospace", outline:"none",
                    }}
                  />
                  <button onClick={addLit} style={{
                    background:"rgba(52,211,153,0.15)", border:"1px solid rgba(52,211,153,0.3)",
                    color:"#34d399", borderRadius:6, padding:"4px 10px",
                    fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
                  }}>＋</button>
                </div>
              </div>

              {/* Brackets */}
              <div style={{ flexShrink:0 }}>
                <div style={{ color:C.textMuted, fontSize:9, fontWeight:700, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.05em" }}>🔣 Brackets</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                  {["(",")","{","}","[","]"].map(p => (
                    <button key={p} onClick={() => addToken({ type:p==="("||p==="{"||p==="["?"lparen":"rparen", value:p })}
                      style={{
                        background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.3)",
                        color:"#fbbf24", borderRadius:6, padding:"3px 9px",
                        fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"monospace",
                      }}
                    >{p}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Operators */}
            <div style={{ display:"flex", flexDirection:"column", minHeight:0 }}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4, flexShrink:0 }}>
                <div style={{ color:C.textMuted, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>🔧 Operators</div>
                <button
                  onClick={() => {
                    if (activeGroupSet.size === OP_GROUPS.length) {
                      setActiveGroup(new Set());
                    } else {
                      setActiveGroup(new Set(OP_GROUPS.map(g => g.id)));
                    }
                  }}
                  style={{
                    padding:"1px 8px", fontSize:9, fontWeight:600, borderRadius:5, cursor:"pointer",
                    border:`1px solid ${C.border}`, background:"rgba(165,180,252,0.08)", color:"#a5b4fc",
                  }}
                >
                  {activeGroupSet.size === OP_GROUPS.length ? "⊟ Collapse All" : "⊞ Expand All"}
                </button>
              </div>

              {/* Group toggle buttons */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6, flexShrink:0 }}>
                {OP_GROUPS.map(g => (
                  <button key={g.id}
                    onClick={() => setActiveGroup(prev => {
                      const next = new Set(prev);
                      if (next.has(g.id)) { next.delete(g.id); } else { next.add(g.id); }
                      return next;
                    })}
                    style={{
                      background: activeGroupSet.has(g.id) ? g.bg.replace("0.13","0.3") : g.bg,
                      border:`1px solid ${g.border}`, color:g.color,
                      borderRadius:7, padding:"3px 9px", fontSize:10, fontWeight:600,
                      cursor:"pointer", transition:"all 0.13s",
                      display:"flex", alignItems:"center", gap:3,
                      outline: activeGroupSet.has(g.id) ? `2px solid ${g.color}44` : "none",
                      outlineOffset:1,
                    }}
                  >
                    {g.emoji} {g.label}
                    <span style={{ fontSize:8, opacity:0.7 }}>{activeGroupSet.has(g.id)?"▲":"▼"}</span>
                  </button>
                ))}
              </div>

              {/* Expanded operator panels in 2-column grid (popup) or stacked (inline) */}
              <div style={{ flex:1, overflowY:"auto", gap:5, alignContent:"start",
                ...(popupMode
                  ? { display:"grid", gridTemplateColumns:"1fr 1fr" }
                  : { display:"flex", flexDirection:"column" })
              }}>
                {OP_GROUPS.filter(g => activeGroupSet.has(g.id)).map(g => (
                  <div key={g.id} style={{
                    background:C.card, border:`1px solid ${g.border}`,
                    borderRadius:8, padding:"6px 8px",
                    borderLeft:`3px solid ${g.color}`,
                  }}>
                    <div style={{ color:g.color, fontSize:8, fontWeight:700, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                      {g.emoji} {g.label}
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                      {g.ops.map(op => (
                        <button key={op.sym}
                          onClick={() => addToken({ type:"op", value:op.sym })}
                          title={`${op.label} — ${op.ex}`}
                          style={{
                            display:"flex", alignItems:"center", gap:4,
                            background: g.bg, border:`1px solid ${g.border}`,
                            borderRadius:6, padding:"3px 8px", cursor:"pointer",
                            transition:"background 0.13s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = g.bg.replace("0.12","0.28").replace("0.13","0.28")}
                          onMouseLeave={e => e.currentTarget.style.background = g.bg}
                        >
                          <span style={{ color:g.color, fontFamily:"monospace", fontSize:12, fontWeight:700 }}>{op.sym}</span>
                          <span style={{ color:C.textMuted, fontSize:10 }}>{op.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>{/* end 2-panel row */}
        </>
      )}

      {/* ════════════ ROW MODE UI ════════════ */}
      {mode === "row" && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color:C.textMuted, fontSize:10, fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>
            📊 Aggregate Function
          </div>

          {/* Agg function selector */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
            {AGG_FUNCS.map(fn => (
              <button key={fn.id} onClick={() => setAggFunc(fn.id)} title={fn.desc}
                style={{
                  background: aggFunc===fn.id ? "rgba(52,211,153,0.22)" : "rgba(52,211,153,0.08)",
                  border:`1px solid ${aggFunc===fn.id ? "#34d399" : "rgba(52,211,153,0.25)"}`,
                  color: aggFunc===fn.id ? "#34d399" : C.textMuted,
                  borderRadius:8, padding:"5px 13px", fontSize:12, fontWeight:700,
                  cursor:"pointer", transition:"all 0.13s",
                  outline: aggFunc===fn.id ? "2px solid rgba(52,211,153,0.3)" : "none",
                  outlineOffset:2,
                }}
              >
                <span style={{ marginRight:5 }}>{fn.emoji}</span>{fn.label}
              </button>
            ))}
          </div>

          {/* Column selector for agg */}
          <div style={{ color:C.textMuted, fontSize:10, fontWeight:700, marginBottom:7, textTransform:"uppercase", letterSpacing:"0.05em" }}>
            📋 Select Columns to Aggregate
            <span style={{ color:C.textFaint, fontWeight:400, textTransform:"none", marginLeft:8 }}>
              (click to toggle, multiple allowed)
            </span>
          </div>
          <input
            value={colSearch} onChange={e => setColSearch(e.target.value)}
            placeholder="Search columns..."
            style={{
              width:"100%", background:C.card, border:`1px solid ${C.border}`,
              borderRadius:7, padding:"5px 9px", color:C.text,
              fontSize:11, marginBottom:7, outline:"none", fontFamily:"inherit",
            }}
          />
          <div style={{
            background:C.card, border:`1px solid ${C.border}`,
            borderRadius:9, padding:8, maxHeight:130, overflowY:"auto",
            display:"flex", flexWrap:"wrap", gap:5,
          }}>
            {visibleHeaders.map(col => {
              const sel = multiAggCols.includes(col);
              return (
                <button key={col}
                  onClick={() => {
                    setMultiAggCols(p => sel ? p.filter(c=>c!==col) : [...p, col]);
                    setAggCol(col);
                    setInjected(false);
                  }}
                  style={{
                    background: sel ? "rgba(52,211,153,0.22)" : "rgba(79,142,247,0.1)",
                    border:`1px solid ${sel ? "#34d399" : "rgba(79,142,247,0.25)"}`,
                    color: sel ? "#34d399" : "#60a5fa",
                    borderRadius:6, padding:"3px 9px", fontSize:11,
                    fontWeight:600, cursor:"pointer", fontFamily:"monospace",
                    transition:"all 0.13s",
                  }}
                >
                  {sel ? "✓ " : ""}{col.length>18?col.slice(0,16)+"…":col}
                </button>
              );
            })}
          </div>

          {/* Row result preview */}
          {rowResult && (
            <div style={{ marginTop:12, background:C.card, border:"1px solid rgba(52,211,153,0.25)", borderRadius:10, padding:"10px 14px" }}>
              <div style={{ color:"#34d399", fontSize:11, fontWeight:700, marginBottom:8 }}>
                📊 {aggFunc} Result Preview
                <span style={{ color:C.textFaint, fontWeight:400, marginLeft:8 }}>({(workingRows?.length ?? 0).toLocaleString()} rows processed)</span>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {Object.entries(rowResult).map(([col, val]) => (
                  <div key={col} style={{
                    background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.2)",
                    borderRadius:8, padding:"6px 13px",
                  }}>
                    <div style={{ color:C.textFaint, fontSize:10, marginBottom:2 }}>{col}</div>
                    <div style={{ color:"#34d399", fontFamily:"monospace", fontWeight:700, fontSize:14 }}>
                      {typeof val==="number" ? +val.toFixed(6) : val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Result name + Inject button ── */}
      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginTop:4 }}>
        <input
          value={resultName} onChange={e => setResultName(e.target.value)}
          placeholder={mode==="column" ? "Column name…" : "Row label…"}
          style={{
            flex:1, minWidth:160, background:C.card,
            border:`1px solid ${C.border}`, borderRadius:8,
            padding:"7px 12px", color:C.text, fontSize:12, outline:"none",
          }}
        />
        <button onClick={handleInject}
          disabled={mode==="column" ? tokens.length===0 : !rowResult}
          style={{
            background: injected
              ? "rgba(52,211,153,0.2)"
              : "linear-gradient(135deg,#4f8ef7,#7c6af7)",
            border: injected ? "1px solid rgba(52,211,153,0.5)" : "none",
            color: injected ? "#34d399" : "#fff",
            borderRadius:10, padding:"8px 20px",
            fontSize:13, fontWeight:700, cursor:"pointer",
            opacity: (mode==="column"?tokens.length:rowResult) ? 1 : 0.4,
            transition:"all 0.2s",
          }}
        >
          {injected
            ? (mode==="column" ? "✓ Column Added!" : "✓ Row Added!")
            : (mode==="column" ? "➕ Add as New Column" : "➕ Add as New Row")
          }
        </button>
      </div>

      {/* ── COLUMN MODE: Stats + Preview ── */}
      {mode==="column" && tokens.length>0 && workingRows.length>0 && (
        <div style={{ marginTop:14 }}>

          {/* Stats row */}
          {statsData && (
            <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap" }}>
              {statsData.map(s => (
                <div key={s.l} style={{
                  background: s.err
                    ? "rgba(248,113,113,0.1)"
                    : s.color === "#34d399" ? "rgba(52,211,153,0.08)"
                    : s.color === "#f87171" ? "rgba(248,113,113,0.08)"
                    : C.card,
                  border:`1px solid ${s.err ? "rgba(248,113,113,0.3)" : s.color ? s.color + "44" : C.border}`,
                  borderRadius:9, padding:"7px 14px", flex:1, minWidth:70,
                }}>
                  <div style={{ color: s.color || C.textFaint, fontSize:10, textTransform:"uppercase", marginBottom:2, fontWeight:700 }}>{s.l}</div>
                  <div style={{ color: s.color || C.text, fontWeight:700, fontSize:16, fontFamily:"monospace" }}>{s.v}</div>
                  {s.sub && (
                    <div style={{ color: s.color || C.textFaint, fontSize:11, fontWeight:600, marginTop:2, opacity:0.8 }}>{s.sub}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Preview table */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ color:C.textMuted, fontSize:11, fontWeight:600 }}>
              👁 Preview
              <span style={{ color:C.textFaint, fontWeight:400, marginLeft:6 }}>first 8 rows of {workingRows.length.toLocaleString()}</span>
            </span>
            <button onClick={() => setShowPreview(v=>!v)} style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:11 }}>
              {showPreview?"▲ Hide":"▼ Show"}
            </button>
          </div>

          {showPreview && (
            <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:"auto", maxHeight:220, background:C.card }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11.5 }}>
                <thead>
                  <tr style={{ background:"#1a1d27", borderBottom:`2px solid ${C.border}` }}>
                    <th style={{ padding:"7px 11px", color:"#a5b4fc", fontWeight:600, textAlign:"left", whiteSpace:"nowrap" }}>#</th>
                    {tokens.filter(t=>t.type==="col").map((t,i) => (
                      <th key={i} style={{ padding:"7px 11px", color:"#60a5fa", fontWeight:600, textAlign:"left", whiteSpace:"nowrap" }}>
                        [{t.value}]
                      </th>
                    ))}
                    <th style={{
                      padding:"7px 11px", color:"#34d399", fontWeight:700, textAlign:"left",
                      background:"rgba(52,211,153,0.07)", borderLeft:"2px solid rgba(52,211,153,0.3)",
                      whiteSpace:"nowrap",
                    }}>
                      = {resultName||"Result"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workingRows.slice(0,8).map((row,i) => {
                    const res = columnResults[i];
                    const isErr = res==="ERR";
                    return (
                      <tr key={i} style={{ borderBottom:`1px solid ${C.border}44`, background:i%2?"rgba(255,255,255,0.013)":"transparent" }}>
                        <td style={{ padding:"5px 11px", color:"#555a7a", fontFamily:"monospace" }}>{i+1}</td>
                        {tokens.filter(t=>t.type==="col").map((t,ci) => (
                          <td key={ci} style={{ padding:"5px 11px", color:C.textMuted, fontFamily:"monospace", maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {String(row[t.value]??"")}
                          </td>
                        ))}
                        <td style={{
                          padding:"5px 11px", fontFamily:"monospace", fontWeight:700,
                          color: isErr ? "#f87171" : res==="TRUE" ? "#34d399" : res==="FALSE" ? "#f87171" : "#34d399",
                          background: isErr ? "rgba(248,113,113,0.05)" : res==="TRUE" ? "rgba(52,211,153,0.07)" : res==="FALSE" ? "rgba(248,113,113,0.07)" : "rgba(52,211,153,0.05)",
                          borderLeft:`2px solid ${isErr||res==="FALSE" ? "rgba(248,113,113,0.25)" : "rgba(52,211,153,0.25)"}`,
                        }}>
                          {isErr ? "⚠ Error" : res==="TRUE" ? "✓ TRUE" : res==="FALSE" ? "✗ FALSE" : String(res)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Help footer ── */}
      <div style={{
        marginTop:14, padding:"9px 13px",
        background:"rgba(79,142,247,0.04)", borderRadius:9,
        border:"1px solid rgba(79,142,247,0.1)",
      }}>
        <span style={{ color:"#a5b4fc", fontSize:11, fontWeight:600 }}>💡 </span>
        <span style={{ color:C.textFaint, fontSize:11 }}>
          <b style={{color:C.textMuted}}>Column mode</b>: per-row formula → new column &nbsp;·&nbsp;
          <b style={{color:C.textMuted}}>Row mode</b>: aggregate (SUM/AVG/…) → new row at table bottom &nbsp;·&nbsp;
          Click token in formula to remove &nbsp;·&nbsp;
          🔍 Filtered = uses current search/filter scope &nbsp;·&nbsp;
          📋 All Rows = entire sheet
        </span>
      </div>

      </div>{/* end scrollable content */}
    </div>
  );
}