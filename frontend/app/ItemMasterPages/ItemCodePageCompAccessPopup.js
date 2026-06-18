/**
 * ItemCodePageCompAccessPopup.js
 *
 * Standalone popup that wraps the full PageCompanyAccess panel inside the
 * same popup shell as ItemCodeWorkflowStepTwo.
 *
 * Props:
 *   tmpl    — full template object (same shape as WorkflowDashboard passes down)
 *   onClose — called with (false) when dismissed
 *
 * Visual design rules (matching ItemCodeWorkflowStepTwo exactly):
 *   ✅ Fixed overlay · dark modal box · gradient header · gradient footer strip
 *   ✅ Header title: "Link Pages with Primary Company"
 *   ✅ Step 1 ──── [this popup badge] ──── Step 2  shown BETWEEN the two step
 *      circles (centered), so the visual flow reads: 1 → ACCESS → 2
 *   ✅ Only "Item Master" module pages shown in left panel
 *   ✅ Cancel / Close button in footer — same style as StepTwo
 */

import { useState, useEffect, useCallback } from "react";
import { compPageAccessLinks } from "../config/compPageAccesslinks";

const API_BASE = "http://localhost:8000/api";

// ── Only show Item Master pages in this popup ─────────────────────────────────
const ITEM_MASTER_PAGES = compPageAccessLinks.filter(
  p => p.description === "Item Master"
);

// ── Dark palette (identical to ItemCodeWorkflowStepTwo / PageCompanyAccess) ───
const C = {
  bg: "#0f1117", surface: "#1a1d27", card: "#21253a", border: "#2e3349",
  accent: "#4f8ef7", accentSoft: "#1e2d4a",
  green: "#34d399", greenSoft: "#0d2e22",
  red: "#f87171",   redSoft:   "#2e1515",
  yellow: "#fbbf24",
  muted: "#6b7280",  text: "#e2e8f0",  textDim: "#94a3b8",
};

// Badge colour for the center "ACCESS" chip
const ACCESS_COLOR = "#4f8ef7";

// ── Micro-components ──────────────────────────────────────────────────────────
const Badge = ({ children, color = C.accent, bg = C.accentSoft }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:600, color, background:bg, border:`1px solid ${color}22` }}>{children}</span>
);
const Spinner = () => (
  <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${C.border}`, borderTopColor:C.accent, animation:"spin 0.7s linear infinite", display:"inline-block" }} />
);
const EmptyState = ({ icon, msg }) => (
  <div style={{ padding:28, textAlign:"center", color:C.muted, fontSize:11 }}>
    <div style={{ fontSize:26, marginBottom:6 }}>{icon}</div>{msg}
  </div>
);
const SectionTitle = ({ children }) => (
  <div style={{ padding:"7px 12px", borderBottom:`1px solid ${C.border}`, fontSize:9, fontWeight:700, color:C.muted, letterSpacing:0.9, textTransform:"uppercase", flexShrink:0 }}>{children}</div>
);
const Sel = ({ value, onChange, children, disabled = false }) => (
  <select value={value} onChange={onChange} disabled={disabled}
    style={{ background:C.card, border:`1px solid ${C.border}`, color:disabled ? C.muted : C.text, borderRadius:5, padding:"4px 7px", fontSize:11, width:"100%", outline:"none", cursor:disabled ? "not-allowed" : "pointer" }}>
    {children}
  </select>
);
const Inp = ({ value, onChange, placeholder }) => (
  <input value={value} onChange={onChange} placeholder={placeholder}
    style={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, borderRadius:5, padding:"4px 8px", fontSize:11, width:"100%", outline:"none", boxSizing:"border-box" }} />
);
const Btn = ({ onClick, children, color = C.accent, disabled = false, sm = false }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background:disabled ? C.border : `${color}22`, border:`1px solid ${disabled ? C.border : `${color}55`}`, color:disabled ? C.muted : color, borderRadius:6, padding:sm ? "2px 8px" : "5px 12px", fontSize:sm ? 9 : 10, fontWeight:600, cursor:disabled ? "not-allowed" : "pointer", display:"inline-flex", alignItems:"center", gap:4 }}>
    {children}
  </button>
);
const Lbl = ({ text, children }) => (
  <div>
    <div style={{ fontSize:8, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>{text}</div>
    {children}
  </div>
);

// ── Toast ─────────────────────────────────────────────────────────────────────
const showToast = (msg, type = "success") => {
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;top:20px;right:20px;z-index:99999;padding:10px 16px;border-radius:8px;font-size:12px;font-weight:700;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.4);background:${type === "success" ? "#34d399" : "#f87171"};animation:fadeIn .2s ease;`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
};

// ── Confirm dialog ────────────────────────────────────────────────────────────
const confirmDialog = (msg) => new Promise(resolve => {
  const overlay = document.createElement("div");
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:999999;`;
  overlay.innerHTML = `
    <div style="background:#1a1d27;border:1px solid #2e3349;border-radius:12px;padding:20px 24px;width:360px;font-family:'Inter',sans-serif;">
      <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:8px;">⚠️ Confirm Change</div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:16px;line-height:1.5;">${msg}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="cnf-no"  style="padding:6px 16px;background:#2e3349;border:1px solid #2e3349;border-radius:6px;color:#94a3b8;font-size:10px;font-weight:600;cursor:pointer;">Cancel</button>
        <button id="cnf-yes" style="padding:6px 16px;background:#34d39922;border:1px solid #34d39955;border-radius:6px;color:#34d399;font-size:10px;font-weight:600;cursor:pointer;">Yes, Switch</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#cnf-yes").onclick = () => { document.body.removeChild(overlay); resolve(true); };
  overlay.querySelector("#cnf-no").onclick  = () => { document.body.removeChild(overlay); resolve(false); };
});

// ── Step indicator bar (1 ──── ACCESS ──── 2) ────────────────────────────────
function StepIndicator() {
  const circle = (n, label, color, active) => (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
      <div style={{
        width:26, height:26, borderRadius:"50%",
        background: active ? color : C.card,
        border:`2px solid ${color}`,
        color: active ? "#fff" : color,
        fontSize:11, fontWeight:800,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>{n}</div>
      <span style={{ fontSize:8, color: active ? color : C.muted, fontWeight:600, whiteSpace:"nowrap" }}>{label}</span>
    </div>
  );

  const line = () => (
    <div style={{ flex:1, height:1, background:`linear-gradient(to right, ${C.border}, ${ACCESS_COLOR}44, ${C.border})`, margin:"0 6px", marginBottom:12 }} />
  );

  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"8px 24px", background:C.surface,
      borderBottom:`1px solid ${C.border}`,
      flexShrink:0,
    }}>
      {circle(1, "Step 1", "#fb923c", false)}
      {line()}

      {/* Center ACCESS badge */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flexShrink:0 }}>
        <div style={{
          padding:"3px 12px", borderRadius:20,
          background:`${ACCESS_COLOR}22`,
          border:`1.5px solid ${ACCESS_COLOR}55`,
          fontSize:9, fontWeight:800, color:ACCESS_COLOR,
          letterSpacing:0.7, textTransform:"uppercase",
          display:"flex", alignItems:"center", gap:5,
        }}>
          🔗 Access
        </div>
        <span style={{ fontSize:8, color:ACCESS_COLOR, fontWeight:600 }}>Link Pages</span>
      </div>

      {line()}
      {circle(2, "Step 2", "#fb923c", false)}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Inner panel — shows only Item Master pages
// ═════════════════════════════════════════════════════════════════════════════
function PageCompanyAccessPanel() {

  const [companies,     setCompanies]     = useState([]);
  const [selectedPage,  setSelectedPage]  = useState(null);
  const [rules,         setRules]         = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [searchPages,   setSearchPages]   = useState("");
  const [topCompanyId,    setTopCompanyId]    = useState("");
  const [showAttachForm,  setShowAttachForm]  = useState(false);
  const [attachCompanyId, setAttachCompanyId] = useState("");

  // ── Data loaders ──────────────────────────────────────────────────────────
  const loadCompanies = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/companies`);
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : data.companies || []);
    } catch { showToast("Failed to load companies", "error"); }
  }, []);

  const ensurePageInDB = async (configPage) => {
    const listRes  = await fetch(`${API_BASE}/page-access/pages/?search=${encodeURIComponent(configPage.page_key)}`);
    const list     = await listRes.json();
    const existing = Array.isArray(list) ? list.find(p => p.page_key === configPage.page_key) : null;
    if (existing) return existing;
    const regRes = await fetch(`${API_BASE}/page-access/pages/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_key:    configPage.page_key,
        page_name:   configPage.page_name,
        page_route:  configPage.page_route,
        icon:        configPage.icon        || null,
        description: configPage.description || null,
        created_by:  null,
      }),
    });
    return await regRes.json();
  };

  const loadRules = useCallback(async (page) => {
    if (!page) return;
    try {
      const listRes = await fetch(`${API_BASE}/page-access/pages/?search=${encodeURIComponent(page.page_key)}`);
      const list    = await listRes.json();
      const dbPage  = Array.isArray(list) ? list.find(p => p.page_key === page.page_key) : null;
      if (!dbPage) { setRules([]); return; }
      const res  = await fetch(`${API_BASE}/page-access/company-access/?page_id=${dbPage.id}`);
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch { setRules([]); }
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selectPage = (page) => {
    setSelectedPage(page);
    setShowAttachForm(false);
    setAttachCompanyId(topCompanyId);
    loadRules(page);
  };

  const handleAttach = async () => {
    if (!attachCompanyId) { showToast("Select a company", "error"); return; }
    if (!selectedPage)    { showToast("Select a page first", "error"); return; }
    setLoading(true);
    try {
      const dbPage = await ensurePageInDB(selectedPage);
      const body   = { page_id: dbPage.id, company_id: Number(attachCompanyId), created_by: null };

      const res = await fetch(`${API_BASE}/page-access/company-access/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        const errData = await res.json();
        const parts   = (errData.detail || "").split(":");
        const oldName = parts[1] || "another company";
        const oldId   = parts[2] ? parseInt(parts[2]) : null;
        const newName = companies.find(c => String(c.id) === String(attachCompanyId))?.company_name || "selected company";

        setLoading(false);
        const confirmed = await confirmDialog(
          `This page is already linked to <strong>${oldName}</strong>.<br>Do you want to switch the primary company to <strong>${newName}</strong>?<br><span style="color:#f87171;">The old link will be removed.</span>`
        );
        if (!confirmed) return;

        if (oldId) {
          setLoading(true);
          await fetch(`${API_BASE}/page-access/company-access/${oldId}`, { method: "DELETE" });
        }
        const res2 = await fetch(`${API_BASE}/page-access/company-access/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res2.ok) { const e = await res2.json(); throw new Error(e.detail); }
        showToast(`Primary company switched successfully!`);
        setShowAttachForm(false);
        setAttachCompanyId("");
        await loadRules(selectedPage);
        return;
      }

      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      showToast("Access granted successfully!");
      setShowAttachForm(false);
      setAttachCompanyId("");
      await loadRules(selectedPage);
    } catch(e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  };

  const handleRemoveRule = async (ruleId) => {
    if (!confirm("Remove this access rule?")) return;
    try {
      await fetch(`${API_BASE}/page-access/company-access/${ruleId}`, { method: "DELETE" });
      showToast("Rule removed");
      loadRules(selectedPage);
    } catch { showToast("Failed to remove", "error"); }
  };

  // ── Filter Item Master pages by search query ──────────────────────────────
  const filteredPages = ITEM_MASTER_PAGES.filter(p =>
    !searchPages.trim() ||
    p.page_name.toLowerCase().includes(searchPages.toLowerCase()) ||
    p.page_route.toLowerCase().includes(searchPages.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden" }}>

      {/* Top toolbar row (company filter + grant access btn) */}
      <div style={{ padding:"8px 12px", background:C.surface, borderBottom:`1px solid ${C.border}`, display:"flex", gap:8, alignItems:"flex-end", flexWrap:"wrap", flexShrink:0 }}>
        <div style={{ flex:1, minWidth:160 }}>
          <Lbl text="Filter by Company">
            <Sel value={topCompanyId} onChange={e => { setTopCompanyId(e.target.value); setAttachCompanyId(e.target.value); }}>
              <option value="">— All companies —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </Sel>
          </Lbl>
        </div>
        {selectedPage && (
          <Btn onClick={() => { setShowAttachForm(s => !s); setAttachCompanyId(topCompanyId); }} color={C.green}>
            ＋ Grant Access
          </Btn>
        )}
        {loading && <Spinner />}
      </div>

      {/* Inline attach form */}
      {showAttachForm && selectedPage && (
        <div style={{ margin:"8px 12px 0 12px", background:C.card, border:`1px solid ${C.accent}44`, borderRadius:8, padding:"10px 12px", flexShrink:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.accent, marginBottom:8 }}>
            ＋ Grant access to "{selectedPage.page_name}"
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"flex-end", flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:200 }}>
              <Lbl text="Company *">
                <Sel value={attachCompanyId} onChange={e => setAttachCompanyId(e.target.value)}>
                  <option value="">— Select company —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </Sel>
              </Lbl>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <Btn onClick={() => { setShowAttachForm(false); setAttachCompanyId(topCompanyId); }} color={C.muted}>Cancel</Btn>
              <Btn onClick={handleAttach} disabled={loading} color={C.green}>
                {loading ? <Spinner /> : "✓"} Yes, Grant
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Two-panel body */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* LEFT — Item Master pages only */}
        <div style={{ width:220, flexShrink:0, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column" }}>
          <SectionTitle>📦 Item Master ({filteredPages.length} pages)</SectionTitle>

          <div style={{ padding:"7px 10px", borderBottom:`1px solid ${C.border}` }}>
            <Inp value={searchPages} onChange={e => setSearchPages(e.target.value)} placeholder="Search pages…" />
          </div>

          <div style={{ flex:1, overflow:"auto" }}>
            {/* Pages — no folder header, listed directly */}
            {filteredPages.length === 0 ? (
              <EmptyState icon="📄" msg="No pages found" />
            ) : (
              filteredPages.map(page => {
                const active = selectedPage?.page_key === page.page_key;
                return (
                  <div
                    key={page.page_key}
                    onClick={() => selectPage(page)}
                    style={{ padding:"7px 12px", cursor:"pointer", borderBottom:`1px solid ${C.border}11`, background: active ? C.accentSoft : "transparent", borderLeft:`3px solid ${active ? C.accent : "transparent"}`, transition:"background .1s" }}
                  >
                    <div style={{ fontSize:11, fontWeight:600, color: active ? C.accent : C.textDim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      📄 {page.page_name}
                    </div>
                    <div style={{ fontSize:9, color:C.muted, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {page.page_route}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT — rules panel */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:C.bg }}>
          {!selectedPage ? (
            <EmptyState icon="🛡️" msg="← Select a page from Item Master" />
          ) : (
            <>
              {/* Page info bar */}
              <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"8px 14px", flexShrink:0, display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:9, color:C.muted, marginBottom:2 }}>📁 Item Master</div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>📄 {selectedPage.page_name}</div>
                  <div style={{ fontSize:9, color:C.muted, marginTop:1 }}>{selectedPage.page_route}</div>
                </div>
                <Badge color={rules.length > 0 ? C.green : C.muted} bg={rules.length > 0 ? C.greenSoft : C.card}>
                  {rules.length > 0 ? "✅ Linked" : "⚪ Not linked"}
                </Badge>
              </div>

              {/* Rules list */}
              <div style={{ flex:1, overflow:"auto", padding:"12px 14px" }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.7, marginBottom:10 }}>
                  🏢 Primary Company
                </div>

                {rules.length === 0 ? (
                  <div style={{ background:C.surface, border:`1px dashed ${C.border}`, borderRadius:8, padding:"32px 20px", textAlign:"center", color:C.muted, fontSize:11 }}>
                    🌐 No primary company set — click "＋ Grant Access" above
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {rules.map(rule => (
                      <div key={rule.id} style={{ background:C.surface, border:`1px solid ${C.accent}44`, borderRadius:8, padding:"9px 12px", display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ fontSize:18 }}>🏢</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:C.text }}>
                            {rule.company?.company_name || `Company #${rule.company_id}`}
                          </div>
                          <div style={{ fontSize:10, color:C.accent, marginTop:1 }}>🌐 Primary company — all users of this company</div>
                        </div>
                        <Btn onClick={() => handleRemoveRule(rule.id)} color={C.red} sm>✕ Remove</Btn>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main popup wrapper — same shell as ItemCodeWorkflowStepTwo
// ═════════════════════════════════════════════════════════════════════════════
export default function ItemCodePageCompAccessPopup({ tmpl, onClose }) {
  if (!tmpl) return null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9100, background:"rgba(0,0,0,0.72)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <style>{`
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
        select option             { background: ${C.card}; color: ${C.text}; }
      `}</style>

      {/* Modal box */}
      <div style={{
        background: "#131929",
        border: `1.5px solid ${ACCESS_COLOR}33`,
        borderRadius: 14,
        width: "100%",
        maxWidth: 860,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "fadeInUp 0.2s ease",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        color: C.text,
      }}>

        {/* ── Header ── */}
        <div style={{
          height: 32,
          padding: "0 14px",
          background: "linear-gradient(to right, #374151, #4f8ef7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:14 }}>🔗</span>
            <span style={{ fontSize:12, fontWeight:700, color:"#fff" }}>Link Pages with Primary Company</span>
            <span style={{ fontSize:9, color:"#e2e8f0aa", fontFamily:"monospace" }}>{tmpl.code}</span>
          </div>
          <button onClick={() => onClose(false)} style={{ background:"none", border:"none", color:"#fff", cursor:"pointer", fontSize:16, lineHeight:1, padding:0 }}>✕</button>
        </div>

        {/* ── Step indicator: Step 1 ──── ACCESS ──── Step 2 ── */}
        <StepIndicator />

        {/* ── Body: Item Master pages panel ── */}
        <PageCompanyAccessPanel />

        {/* ── Footer ── */}
        <div style={{
          padding: "8px 14px",
          borderTop: `1px solid ${C.border}`,
          background: C.surface,
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          flexShrink: 0,
        }}>
          <Btn onClick={() => onClose(false)} color={C.muted}>✕ Close</Btn>
        </div>

        {/* ── Footer gradient strip ── */}
        <div style={{ height:6, background:"linear-gradient(to right, #4f8ef7, #374151)", flexShrink:0 }} />

      </div>
    </div>
  );
}