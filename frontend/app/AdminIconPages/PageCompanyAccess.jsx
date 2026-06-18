/**
 * AdminIconPages/PageCompanyAccess.jsx
 * Page–Company Access Control Admin Panel
 *
 * LEFT panel: Pages grouped by module (description field se group hota hai)
 *   - Module name click → expands/collapses pages under it
 *   - Page click → middle panel mein primary company dikhti hai
 * MIDDLE: Selected page ki primary company + grant/remove
 *
 * ONE PRIMARY COMPANY PER PAGE — 409 on conflict → confirm dialog → switch
 * REMOVED: Plant, User overrides, Preview
 */

import React, { useState, useEffect, useCallback } from 'react';
import { compPageAccessLinks } from '../config/compPageAccesslinks';

const API_BASE = 'http://localhost:8000/api';

// ── Dark palette ──────────────────────────────────────────────────────────────
const C = {
  bg: "#0f1117", surface: "#1a1d27", card: "#21253a", border: "#2e3349",
  accent: "#4f8ef7", accentSoft: "#1e2d4a",
  green: "#34d399", greenSoft: "#0d2e22",
  red: "#f87171",   redSoft:   "#2e1515",
  yellow: "#fbbf24",
  muted: "#6b7280",  text: "#e2e8f0",  textDim: "#94a3b8",
};

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
    style={{ background:C.card, border:`1px solid ${C.border}`, color: disabled ? C.muted : C.text, borderRadius:5, padding:"4px 7px", fontSize:11, width:"100%", outline:"none", cursor: disabled ? "not-allowed" : "pointer" }}>
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
const toast = (msg, type = 'success') => {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;top:20px;right:20px;z-index:99999;padding:10px 16px;border-radius:8px;font-size:12px;font-weight:700;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.4);background:${type === 'success' ? '#34d399' : '#f87171'};animation:fadeIn .2s ease;`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
};

// ── Confirm Dialog ────────────────────────────────────────────────────────────
const confirmDialog = (msg) => new Promise(resolve => {
  const overlay = document.createElement('div');
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
  overlay.querySelector('#cnf-yes').onclick = () => { document.body.removeChild(overlay); resolve(true); };
  overlay.querySelector('#cnf-no').onclick  = () => { document.body.removeChild(overlay); resolve(false); };
});

// ── Group pages by their description field (= module name) ───────────────────
const groupPagesByModule = (pagesList) => {
  const groups = {};
  pagesList.forEach(p => {
    const mod = p.description || 'Other';
    if (!groups[mod]) groups[mod] = [];
    groups[mod].push(p);
  });
  return groups; // { "Item Master": [...], "Other": [...] }
};

// ═════════════════════════════════════════════════════════════════════════════
export default function PageCompanyAccess() {

  const pages        = compPageAccessLinks;
  const groupedPages = groupPagesByModule(pages);
  const moduleNames  = Object.keys(groupedPages);

  const [companies,      setCompanies]      = useState([]);
  const [selectedPage,   setSelectedPage]   = useState(null);
  const [rules,          setRules]          = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [searchPages,    setSearchPages]    = useState('');

  // Which modules are expanded in left panel (default: all open)
  const [expandedMods,   setExpandedMods]   = useState(() => {
    const init = {};
    moduleNames.forEach(m => { init[m] = true; });
    return init;
  });

  const [topCompanyId,    setTopCompanyId]    = useState('');
  const [showAttachForm,  setShowAttachForm]  = useState(false);
  const [attachCompanyId, setAttachCompanyId] = useState('');

  // ── Load helpers ─────────────────────────────────────────────────────────────
  const loadCompanies = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/companies`);
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : data.companies || []);
    } catch { toast('Failed to load companies', 'error'); }
  }, []);

  const ensurePageInDB = async (configPage) => {
    const listRes = await fetch(`${API_BASE}/page-access/pages/?search=${encodeURIComponent(configPage.page_key)}`);
    const list    = await listRes.json();
    const existing = Array.isArray(list) ? list.find(p => p.page_key === configPage.page_key) : null;
    if (existing) return existing;
    const regRes = await fetch(`${API_BASE}/page-access/pages/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page_key:    configPage.page_key,
        page_name:   configPage.page_name,
        page_route:  configPage.page_route,
        icon:        configPage.icon        || null,
        description: configPage.description || null,
        created_by:  null,
      }),
    });
    if (!regRes.ok) { const e = await regRes.json(); throw new Error(e.detail || 'Failed to register page'); }
    return await regRes.json();
  };

  const loadRulesForPage = async (pageKey) => {
    try {
      const listRes = await fetch(`${API_BASE}/page-access/pages/?search=${encodeURIComponent(pageKey)}`);
      const list    = await listRes.json();
      const dbPage  = Array.isArray(list) ? list.find(p => p.page_key === pageKey) : null;
      if (!dbPage) { setRules([]); return; }
      const res = await fetch(`${API_BASE}/page-access/company-access/?page_id=${dbPage.id}`);
      setRules(await res.json());
    } catch { setRules([]); }
  };

  useEffect(() => { loadCompanies(); }, [loadCompanies]);
  useEffect(() => { setAttachCompanyId(topCompanyId); }, [topCompanyId]);

  const selectPage = (page) => {
    setSelectedPage(page);
    setShowAttachForm(false);
    loadRulesForPage(page.page_key);
  };

  const toggleModule = (modName) => {
    setExpandedMods(prev => ({ ...prev, [modName]: !prev[modName] }));
  };

  // ── Grant access with ONE-PRIMARY-COMPANY logic ───────────────────────────────
  const handleAttach = async () => {
    if (!attachCompanyId) { toast('Select a company', 'error'); return; }
    if (!selectedPage)    { toast('Select a page first', 'error'); return; }
    setLoading(true);
    try {
      const dbPage = await ensurePageInDB(selectedPage);
      const body   = { page_id: dbPage.id, company_id: Number(attachCompanyId), created_by: null };

      const res = await fetch(`${API_BASE}/page-access/company-access/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        const errData = await res.json();
        const parts   = (errData.detail || '').split(':');
        const oldName = parts[1] || 'another company';
        const oldId   = parts[2] ? parseInt(parts[2]) : null;
        const newName = companies.find(c => String(c.id) === String(attachCompanyId))?.company_name || 'selected company';

        setLoading(false);
        const confirmed = await confirmDialog(
          `This page is already linked to <strong>${oldName}</strong>.<br>Do you want to switch the primary company to <strong>${newName}</strong>?<br><span style="color:#f87171;">The old link will be removed.</span>`
        );
        if (!confirmed) return;

        if (oldId) {
          setLoading(true);
          await fetch(`${API_BASE}/page-access/company-access/${oldId}`, { method: 'DELETE' });
        }
        const res2 = await fetch(`${API_BASE}/page-access/company-access/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res2.ok) { const e = await res2.json(); throw new Error(e.detail); }
        toast(`✅ Primary company switched to ${newName}!`);
        setShowAttachForm(false);
        setAttachCompanyId(topCompanyId);
        loadRulesForPage(selectedPage.page_key);
        return;
      }

      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      toast('✅ Access granted successfully!');
      setShowAttachForm(false);
      setAttachCompanyId(topCompanyId);
      loadRulesForPage(selectedPage.page_key);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleRemoveRule = async (ruleId) => {
    if (!confirm('Remove this access rule?')) return;
    try {
      await fetch(`${API_BASE}/page-access/company-access/${ruleId}`, { method: 'DELETE' });
      toast('Rule removed');
      loadRulesForPage(selectedPage.page_key);
    } catch { toast('Failed to remove', 'error'); }
  };

  // ── Filtered grouped pages ────────────────────────────────────────────────────
  const filteredGrouped = {};
  Object.entries(groupedPages).forEach(([mod, modPages]) => {
    const filtered = modPages.filter(p =>
      p.page_name.toLowerCase().includes(searchPages.toLowerCase()) ||
      p.page_key.toLowerCase().includes(searchPages.toLowerCase())
    );
    if (filtered.length > 0) filteredGrouped[mod] = filtered;
  });

  const totalFiltered = Object.values(filteredGrouped).reduce((a, b) => a + b.length, 0);

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:C.bg, fontFamily:"'Inter','Segoe UI',sans-serif", fontSize:12, overflow:'hidden', color:C.text }}>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:${C.bg}; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
        input::placeholder, select option { color:${C.muted}; background:${C.card}; }
        .mod-row:hover { background: #ffffff08 !important; }
        .page-row:hover { background: ${C.accentSoft} !important; }
      `}</style>

      {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:'10px 16px', flexShrink:0 }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:C.text }}>🌐 Primary Page Access Control</div>
            <div style={{ fontSize:9, color:C.muted, marginTop:1 }}>Grant page access to companies — one primary company per page</div>
          </div>
        </div>

        {/* Step row */}
        <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>

          {/* Step 1 — Company */}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:8, fontWeight:700, color: topCompanyId ? C.green : C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 }}>
              {topCompanyId ? '✓' : '1'} Company *
            </div>
            <Sel value={topCompanyId} onChange={e => setTopCompanyId(e.target.value)}>
              <option value="">— Select company —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </Sel>
          </div>

          <div style={{ color:C.muted, fontSize:14, paddingTop:16 }}>›</div>

          {/* Step 2 — Page */}
          <div style={{ flex:1, opacity: topCompanyId ? 1 : 0.4 }}>
            <div style={{ fontSize:8, fontWeight:700, color: selectedPage ? C.accent : C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 }}>
              {selectedPage ? '✓' : '2'} Page
            </div>
            <div style={{ background:C.card, border:`1px solid ${selectedPage ? C.accent+'66' : C.border}`, borderRadius:5, padding:'4px 8px', fontSize:11, color: selectedPage ? C.text : C.muted, minHeight:26, display:'flex', alignItems:'center' }}>
              {selectedPage ? `📄 ${selectedPage.page_name}` : 'Click a page from the left ←'}
            </div>
          </div>

          {/* Grant button */}
          {topCompanyId && selectedPage && (
            <>
              <div style={{ color:C.muted, fontSize:14, paddingTop:16 }}>›</div>
              <div style={{ paddingTop:14 }}>
                <Btn onClick={() => setShowAttachForm(f => !f)} color={showAttachForm ? C.red : C.green}>
                  {showAttachForm ? '✕ Close' : '＋ Set As Primary'}
                </Btn>
              </div>
            </>
          )}

          {!topCompanyId && (
            <div style={{ display:'flex', alignItems:'center', gap:6, paddingTop:14, color:C.yellow, fontSize:10 }}>
              ⚠ Select a company first
            </div>
          )}
        </div>

        {/* Inline Attach Form */}
        {showAttachForm && selectedPage && (
          <div style={{ marginTop:10, background:C.card, border:`1px solid ${C.accent}44`, borderRadius:8, padding:'10px 12px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.accent, marginBottom:8 }}>
              ＋ Grant access to "{selectedPage.page_name}"
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:200 }}>
                <Lbl text="Company *">
                  <Sel value={attachCompanyId} onChange={e => setAttachCompanyId(e.target.value)}>
                    <option value="">— Select company —</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </Sel>
                </Lbl>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <Btn onClick={() => { setShowAttachForm(false); setAttachCompanyId(topCompanyId); }} color={C.muted}>Cancel</Btn>
                <Btn onClick={handleAttach} disabled={loading} color={C.green}>
                  {loading ? <Spinner /> : '✓'} Yes, Grant
                </Btn>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ MAIN 2-PANEL ════════════════════════════════════════════════════ */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* LEFT — Grouped pages */}
        <div style={{ width:240, flexShrink:0, background:C.surface, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column' }}>
          <SectionTitle>📦 Modules ({totalFiltered} pages)</SectionTitle>

          {/* Search */}
          <div style={{ padding:'7px 10px', borderBottom:`1px solid ${C.border}` }}>
            <Inp value={searchPages} onChange={e => setSearchPages(e.target.value)} placeholder="Search pages…" />
          </div>

          <div style={{ flex:1, overflow:'auto' }}>
            {Object.keys(filteredGrouped).length === 0 ? (
              <EmptyState icon="📄" msg="No pages found" />
            ) : (
              Object.entries(filteredGrouped).map(([modName, modPages]) => (
                <div key={modName}>
                  {/* Module header row */}
                  <div
                    className="mod-row"
                    onClick={() => toggleModule(modName)}
                    style={{
                      padding:'7px 12px',
                      cursor:'pointer',
                      display:'flex',
                      alignItems:'center',
                      gap:7,
                      background: C.card,
                      borderBottom:`1px solid ${C.border}`,
                      userSelect:'none',
                    }}
                  >
                    <span style={{ fontSize:11, transition:'transform .15s', display:'inline-block', transform: expandedMods[modName] ? 'rotate(90deg)' : 'rotate(0deg)', color:C.muted }}>▶</span>
                    <span style={{ fontSize:11, fontWeight:700, color:C.text, flex:1 }}>📁 {modName}</span>
                    <Badge color={C.muted} bg={C.surface}>{modPages.length}</Badge>
                  </div>

                  {/* Pages under this module */}
                  {expandedMods[modName] && modPages.map(page => {
                    const active = selectedPage?.page_key === page.page_key;
                    return (
                      <div
                        key={page.page_key}
                        className="page-row"
                        onClick={() => selectPage(page)}
                        style={{
                          padding:'7px 12px 7px 28px',
                          cursor:'pointer',
                          borderBottom:`1px solid ${C.border}11`,
                          background: active ? C.accentSoft : 'transparent',
                          borderLeft:`3px solid ${active ? C.accent : 'transparent'}`,
                          transition:'background .1s',
                        }}
                      >
                        <div style={{ fontSize:11, fontWeight:600, color: active ? C.accent : C.textDim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          📄 {page.page_name}
                        </div>
                        <div style={{ fontSize:9, color:C.muted, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {page.page_route}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* MIDDLE — Rules */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:C.bg }}>
          {!selectedPage ? (
            <EmptyState icon="🛡️" msg={topCompanyId ? '← Select a module and click a page' : '⬆ Select a company first, then choose a page'} />
          ) : (
            <>
              {/* Page info bar */}
              <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:'8px 14px', flexShrink:0, display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:9, color:C.muted, marginBottom:2 }}>
                    📁 {selectedPage.description || 'Other'}
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>📄 {selectedPage.page_name}</div>
                  <div style={{ fontSize:9, color:C.muted, marginTop:1 }}>{selectedPage.page_route}</div>
                </div>
                <Badge color={rules.length > 0 ? C.green : C.muted} bg={rules.length > 0 ? C.greenSoft : C.card}>
                  {rules.length > 0 ? '✅ Linked' : '⚪ Not linked'}
                </Badge>
              </div>

              {/* Rules */}
              <div style={{ flex:1, overflow:'auto', padding:'12px 14px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.7, marginBottom:10 }}>
                  🏢 Primary Company
                </div>

                {rules.length === 0 ? (
                  <div style={{ background:C.surface, border:`1px dashed ${C.border}`, borderRadius:8, padding:'32px 20px', textAlign:'center', color:C.muted, fontSize:11 }}>
                    🌐 No primary company set — click "＋ Grant Access" above
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {rules.map(rule => (
                      <div key={rule.id} style={{ background:C.surface, border:`1px solid ${C.accent}44`, borderRadius:8, padding:'9px 12px', display:'flex', alignItems:'center', gap:10 }}>
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