'use client';
/**
 * FinanceReports.jsx
 * GL Mapping & Report Framework Builder
 * Tabs: Mapping | Frameworks | Preview Report
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Map, BarChart2, Plus, Trash2, Save, ChevronRight,
  ChevronDown, Eye, RefreshCw, AlertCircle, CheckCircle, XCircle,
  Loader, Search, Building, ArrowRight, Info, Edit2, Copy,
  BookOpen, Layers, Tag, Hash, Grid, List,
} from 'lucide-react';

const API = 'http://localhost:8000/api';

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  pri:    '#0f172a',
  acc:    '#6366f1',
  accS:   '#eef2ff',
  accM:   '#818cf8',
  grn:    '#16a34a',
  red:    '#dc2626',
  yel:    '#d97706',
  bdr:    '#e2e8f0',
  bg:     '#f8fafc',
  muted:  '#64748b',
  white:  '#ffffff',
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const s = {
  inp:  { width: '100%', padding: '6px 9px', border: `1px solid ${C.bdr}`, borderRadius: '5px', fontSize: '11px', color: C.pri, outline: 'none', boxSizing: 'border-box', background: C.white },
  sel:  { width: '100%', padding: '6px 9px', border: `1px solid ${C.bdr}`, borderRadius: '5px', fontSize: '11px', color: C.pri, outline: 'none', boxSizing: 'border-box', background: C.white, cursor: 'pointer' },
  lbl:  { display: 'block', fontSize: '9px', fontWeight: '700', marginBottom: '3px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' },
  btn:  (active, color) => ({ padding: '5px 12px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '700', transition: 'all 0.15s', background: active ? (color || C.acc) : C.bg, color: active ? C.white : C.pri, outline: 'none' }),
};

// Framework type colors
const FW_COLORS = {
  IFRS:         { bg: '#dbeafe', text: '#1d4ed8', dot: '#2563eb' },
  IND_AS:       { bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
  SCHEDULE_III: { bg: '#fef3c7', text: '#92400e', dot: '#d97706' },
  CUSTOM:       { bg: '#f3e8ff', text: '#6b21a8', dot: '#9333ea' },
};
const RT_COLORS = {
  BALANCE_SHEET: { bg: '#dbeafe', text: '#1d4ed8' },
  PNL:           { bg: '#dcfce7', text: '#15803d' },
  CASH_FLOW:     { bg: '#fef9c3', text: '#854d0e' },
  CUSTOM:        { bg: '#f3e8ff', text: '#6b21a8' },
};

function Badge({ text, colors }) {
  if (!text) return null;
  return <span style={{ padding: '2px 7px', borderRadius: '20px', fontSize: '8px', fontWeight: '700', background: colors?.bg || C.accS, color: colors?.text || C.acc }}>{text}</span>;
}
function Chip({ label, onRemove }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', background: C.accS, color: C.acc, borderRadius: '12px', fontSize: '9px', fontWeight: '700', marginRight: '4px', marginBottom: '3px' }}>
      {label}
      {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.acc, padding: 0, lineHeight: 1, fontSize: '11px' }}>×</button>}
    </span>
  );
}

// ─── Section header row (in report preview) ──────────────────────────────────
function SectionDivider({ label }) {
  return (
    <tr>
      <td colSpan={3} style={{ padding: '10px 10px 4px', fontSize: '9px', fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', background: C.bg, borderTop: `2px solid ${C.bdr}` }}>
        {label}
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function FinanceReports() {
  // ── Auth / user ──────────────────────────────────────────────────────────────
  const [user, setUser]         = useState(null);
  const [msg, setMsg]           = useState(null);   // {type,text}
  const [loading, setLoading]   = useState(false);

  // ── Master data ───────────────────────────────────────────────────────────────
  const [companies,   setCompanies]   = useState([]);
  const [glTypes,     setGLTypes]     = useState([]);
  const [glSubTypes,  setGLSubTypes]  = useState([]);
  const [glCats,      setGLCats]      = useState([]);
  const [glSubCats,   setGLSubCats]   = useState([]);
  const [glHeads,     setGLHeads]     = useState([]);
  const [frameworks,  setFrameworks]  = useState([]);
  const [templates,   setTemplates]   = useState([]);

  // ── Selected company (global filter) ─────────────────────────────────────────
  const [selCompanyId, setSelCompanyId] = useState('');
  const [glAccounts,   setGLAccounts]   = useState([]);
  const [glLoading,    setGLLoading]    = useState(false);

  // ── Active tab ────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('mapping');   // mapping | frameworks | preview

  // ── GL hierarchy filter (left panel in mapping) ───────────────────────────────
  const [filterType,    setFilterType]    = useState('');
  const [filterSubType, setFilterSubType] = useState('');
  const [filterCat,     setFilterCat]     = useState('');
  const [filterSubCat,  setFilterSubCat]  = useState('');
  const [filterHead,    setFilterHead]    = useState('');
  const [glSearch,      setGLSearch]      = useState('');
  const [glViewMode,    setGLViewMode]    = useState('list');

  // ── Mapping state ─────────────────────────────────────────────────────────────
  const [selFwId,      setSelFwId]      = useState('');   // active framework for mapping
  const [mappings,     setMappings]     = useState({});   // { line_item_id: [gl_id, ...] }
  const [mappingsDirty, setMappingsDirty] = useState(false);
  const [saving,       setSaving]       = useState(false);

  // ── Framework builder ─────────────────────────────────────────────────────────
  const [showFwForm,   setShowFwForm]   = useState(false);
  const [fwForm,       setFwForm]       = useState({ name: '', framework_type: '', report_type: '', description: '', company_id: '', template_key: '' });
  const [fwSaving,     setFwSaving]     = useState(false);

  // ── Framework Type & Report Type — DB-driven ─────────────────────────────
  const [fwTypes,        setFwTypes]       = useState([]);  // [{id,code,label,is_system}]
  const [rptTypes,       setRptTypes]      = useState([]);  // [{id,code,label,is_system}]
  // ── Add FwType / RptType Modal ────────────────────────────────────────────
  const MODAL_EMPTY = { label: '', description: '', display_order: '99' };
  const [showAddFwType,  setShowAddFwType]  = useState(false);
  const [showAddRptType, setShowAddRptType] = useState(false);
  const [fwTypeForm,     setFwTypeForm]     = useState(MODAL_EMPTY);
  const [rptTypeForm,    setRptTypeForm]    = useState(MODAL_EMPTY);
  const [addingFwType,   setAddingFwType]   = useState(false);
  const [addingRptType,  setAddingRptType]  = useState(false);

  const loadFwTypes  = useCallback(async () => {
    const d = await safeFetch(`${API}/finance-reports/fw-types`);
    if (Array.isArray(d)) setFwTypes(d);
  }, []);
  const loadRptTypes = useCallback(async () => {
    const d = await safeFetch(`${API}/finance-reports/rpt-types`);
    if (Array.isArray(d)) setRptTypes(d);
  }, []);

  const doAddFwType = async () => {
    const l = fwTypeForm.label.trim(); if (!l) { showMsg('error', 'Label required'); return; }
    setAddingFwType(true);
    try {
      const fd = new FormData();
      fd.append('label', l);
      if (fwTypeForm.description.trim()) fd.append('description', fwTypeForm.description.trim());
      const res = await fetch(`${API}/finance-reports/fw-types`, { method:'POST', body:fd });
      const data = await res.json();
      if (!res.ok) { showMsg('error', data.detail || 'Failed'); return; }
      setFwTypes(p => [...p, data]);
      setFwForm(p => ({...p, framework_type: data.code}));
      setFwTypeForm({ label: '', description: '', display_order: '99' });
      setShowAddFwType(false);
      showMsg('success', `✅ Framework type "${data.label}" added successfully`);
    } finally { setAddingFwType(false); }
  };
  const doAddRptType = async () => {
    const l = rptTypeForm.label.trim(); if (!l) { showMsg('error', 'Label required'); return; }
    setAddingRptType(true);
    try {
      const fd = new FormData();
      fd.append('label', l);
      if (rptTypeForm.description.trim()) fd.append('description', rptTypeForm.description.trim());
      const res = await fetch(`${API}/finance-reports/rpt-types`, { method:'POST', body:fd });
      const data = await res.json();
      if (!res.ok) { showMsg('error', data.detail || 'Failed'); return; }
      setRptTypes(p => [...p, data]);
      setFwForm(p => ({...p, report_type: data.code}));
      setRptTypeForm({ label: '', description: '', display_order: '99' });
      setShowAddRptType(false);
      showMsg('success', `✅ Report type "${data.label}" added successfully`);
    } finally { setAddingRptType(false); }
  };

  // ── Preview ───────────────────────────────────────────────────────────────────
  const [previewFwId,  setPreviewFwId]  = useState('');
  const [previewData,  setPreviewData]  = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Framework detail (for mapping) ───────────────────────────────────────────
  const [fwDetail, setFwDetail] = useState(null);   // full framework with line_items

  // ── Drag state ────────────────────────────────────────────────────────────────
  const dragGL = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────────
  const safeFetch = async (url) => {
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  };

  const showMsg = (type, text, ms = 4000) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), ms);
  };

  useEffect(() => {
    const ud = sessionStorage.getItem('userData');
    if (ud) { try { setUser(JSON.parse(ud).user); } catch { showMsg('error', 'Login data missing'); } }
    else showMsg('error', 'Please login again');
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const base = API;
    // Load all master data in parallel
    Promise.all([
      safeFetch(`${base}/user/${user.id}/companies-with-plants`),
      safeFetch(`${base}/gl-types?is_active=true`),
      safeFetch(`${base}/gl-sub-types`),
      safeFetch(`${base}/gl-categories?is_active=true`),
      safeFetch(`${base}/gl-sub-categories`),
      safeFetch(`${base}/gl-heads?is_active=true`),
      safeFetch(`${base}/finance-reports/templates`),
      safeFetch(`${base}/finance-reports/fw-types`),
      safeFetch(`${base}/finance-reports/rpt-types`),
    ]).then(([comp, types, subTypes, cats, subCats, heads, tmpl, fwt, rptt]) => {
      if (comp?.companies)         setCompanies(comp.companies);
      if (Array.isArray(types))    setGLTypes(types);
      if (Array.isArray(subTypes)) setGLSubTypes(subTypes);
      if (Array.isArray(cats))     setGLCats(cats);
      if (Array.isArray(subCats))  setGLSubCats(subCats);
      if (Array.isArray(heads))    setGLHeads(heads);
      if (tmpl?.templates)         setTemplates(tmpl.templates);
      if (Array.isArray(fwt))      setFwTypes(fwt);
      if (Array.isArray(rptt))     setRptTypes(rptt);
    });
  }, [user]);

  // Load frameworks when user ready
  const loadFrameworks = useCallback(async () => {
    if (!user?.id) return;
    const d = await safeFetch(`${API}/finance-reports/frameworks?user_id=${user.id}${selCompanyId ? `&company_id=${selCompanyId}` : ''}`);
    if (d?.frameworks) setFrameworks(d.frameworks);
  }, [user, selCompanyId]);

  useEffect(() => { loadFrameworks(); }, [loadFrameworks]);

  // Load GL accounts when company changes
  useEffect(() => {
    if (!selCompanyId || !user?.id) { setGLAccounts([]); return; }
    setGLLoading(true);
    safeFetch(`${API}/finance-reports/gl-hierarchy/${selCompanyId}?user_id=${user.id}`)
      .then(d => { if (d?.gl_accounts) setGLAccounts(d.gl_accounts); })
      .finally(() => setGLLoading(false));
  }, [selCompanyId, user]);

  // Load framework detail when fw selected for mapping
  useEffect(() => {
    if (!selFwId) { setFwDetail(null); setMappings({}); return; }
    safeFetch(`${API}/finance-reports/frameworks/${selFwId}`).then(d => {
      if (!d) return;
      setFwDetail(d);
      // Build mappings map from existing data
      const m = {};
      (d.line_items || []).forEach(li => {
        const forCompany = (li.mappings || []).filter(mp => !selCompanyId || String(mp.company_id) === String(selCompanyId));
        if (forCompany.length) m[li.id] = forCompany.map(mp => mp.gl_id);
      });
      setMappings(m);
      setMappingsDirty(false);
    });
  }, [selFwId, selCompanyId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // DERIVED / FILTERED GL LIST
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredGLs = glAccounts.filter(gl => {
    if (filterType    && String(gl.gl_type?.id)         !== filterType)    return false;
    if (filterSubType && String(gl.gl_sub_type?.id)     !== filterSubType) return false;
    if (filterCat     && String(gl.gl_category?.id)     !== filterCat)     return false;
    if (filterSubCat  && String(gl.gl_sub_category?.id) !== filterSubCat)  return false;
    if (filterHead    && String(gl.gl_head?.id)         !== filterHead)     return false;
    if (glSearch) {
      const q = glSearch.toLowerCase();
      if (!gl.gl_code.toLowerCase().includes(q) && !gl.gl_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filtSubTypes = filterType   ? glSubTypes.filter(st => String(st.gl_type_id) === filterType) : glSubTypes;
  const filtCats     = filterType   ? glCats.filter(c  => String(c.gl_type_id)    === filterType && (!filterSubType || String(c.gl_sub_type_id) === filterSubType)) : glCats;
  const filtSubCats  = filterCat    ? glSubCats.filter(sc => String(sc.gl_category_id) === filterCat) : glSubCats;
  const filtHeads    = filtSubCats  ? glHeads.filter(h  => !filterSubCat || String(h.gl_sub_category_id) === filterSubCat) : glHeads;

  // ─────────────────────────────────────────────────────────────────────────────
  // MAPPING LOGIC
  // ─────────────────────────────────────────────────────────────────────────────
  const addMapping = (lineItemId, glId) => {
    setMappings(prev => {
      const arr = prev[lineItemId] || [];
      if (arr.includes(glId)) return prev;
      return { ...prev, [lineItemId]: [...arr, glId] };
    });
    setMappingsDirty(true);
  };

  const removeMapping = (lineItemId, glId) => {
    setMappings(prev => ({
      ...prev,
      [lineItemId]: (prev[lineItemId] || []).filter(id => id !== glId),
    }));
    setMappingsDirty(true);
  };

  const saveMappings = async () => {
    if (!selFwId || !selCompanyId || !user?.id) {
      showMsg('error', 'Select Company and Framework first'); return;
    }
    setSaving(true);
    const flat = [];
    Object.entries(mappings).forEach(([liId, glIds]) => {
      glIds.forEach(glId => flat.push({ line_item_id: parseInt(liId), gl_id: glId }));
    });
    const fd = new FormData();
    fd.append('company_id', selCompanyId);
    fd.append('mappings', JSON.stringify(flat));
    fd.append('user_id', user.id);
    try {
      const res = await fetch(`${API}/finance-reports/frameworks/${selFwId}/mappings`, { method: 'POST', body: fd });
      const d = await res.json();
      if (res.ok) { showMsg('success', `✅ ${d.saved} mappings saved!`); setMappingsDirty(false); }
      else showMsg('error', d.detail || 'Save failed');
    } catch (e) { showMsg('error', e.message); }
    finally { setSaving(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // FRAMEWORK CREATE
  // ─────────────────────────────────────────────────────────────────────────────
  const createFramework = async () => {
    if (!fwForm.name.trim()) { showMsg('error', 'Framework name required'); return; }
    setFwSaving(true);
    const fd = new FormData();
    Object.entries(fwForm).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
    fd.append('user_id', user.id);
    try {
      const res = await fetch(`${API}/finance-reports/frameworks`, { method: 'POST', body: fd });
      const d = await res.json();
      if (res.ok) {
        showMsg('success', `✅ Framework "${d.name}" created with ${d.line_item_count} line items`);
        setShowFwForm(false);
        setFwForm({ name: '', framework_type: 'IFRS', report_type: 'BALANCE_SHEET', description: '', company_id: '', template_key: '' });
        loadFrameworks();
      } else showMsg('error', d.detail || 'Create failed');
    } catch (e) { showMsg('error', e.message); }
    finally { setFwSaving(false); }
  };

  const deleteFramework = async (fwId) => {
    if (!window.confirm('Delete this framework?')) return;
    await fetch(`${API}/finance-reports/frameworks/${fwId}?user_id=${user.id}`, { method: 'DELETE' });
    loadFrameworks();
    if (selFwId === String(fwId)) { setSelFwId(''); setFwDetail(null); setMappings({}); }
    showMsg('success', 'Framework deleted');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PREVIEW
  // ─────────────────────────────────────────────────────────────────────────────
  const generatePreview = async () => {
    if (!previewFwId || !selCompanyId) { showMsg('error', 'Select Company and Framework'); return; }
    setPreviewLoading(true);
    const d = await safeFetch(`${API}/finance-reports/generate/${previewFwId}/${selCompanyId}?user_id=${user.id}`);
    if (d) setPreviewData(d);
    else showMsg('error', 'Failed to generate report');
    setPreviewLoading(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DRAG-DROP on mapping
  // ─────────────────────────────────────────────────────────────────────────────
  const handleDragStart = (gl) => { dragGL.current = gl; };
  const handleDrop = (e, liId) => {
    e.preventDefault();
    if (dragGL.current) { addMapping(liId, dragGL.current.id); dragGL.current = null; }
  };
  const handleDragOver = (e) => e.preventDefault();

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: C.acc }} />
      </div>
    );
  }

  const selCompany = companies.find(c => String(c.company_id) === String(selCompanyId));
  const selFw      = frameworks.find(f => String(f.id) === String(selFwId));

  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '1400px', height: '100%', maxHeight: '740px', background: C.white, borderRadius: '10px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${C.bdr}` }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ background: C.pri, padding: '0 16px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={14} color={C.accM} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: C.white }}>Finance Reports</span>
            <span style={{ fontSize: '9px', color: '#94a3b8', background: '#1e293b', padding: '2px 7px', borderRadius: '10px' }}>GL Mapping & Framework Builder</span>
          </div>
          {/* Global company selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={11} color='#94a3b8' />
            <select value={selCompanyId} onChange={e => setSelCompanyId(e.target.value)}
              style={{ ...s.sel, width: '200px', background: '#1e293b', color: C.white, border: '1px solid #334155', fontSize: '10px', padding: '4px 8px' }}>
              <option value="">— Select Company —</option>
              {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.company_name} ({c.company_code})</option>)}
            </select>
          </div>
        </div>

        {/* ── Message ─────────────────────────────────────────────────────── */}
        {msg && (
          <div style={{ margin: '6px 12px 0', padding: '6px 10px', background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`, borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {msg.type === 'success' ? <CheckCircle size={12} color={C.grn} /> : <AlertCircle size={12} color={C.red} />}
            <span style={{ fontSize: '10px', flex: 1, color: C.pri }}>{msg.text}</span>
            <button onClick={() => setMsg(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><XCircle size={12} color={C.muted} /></button>
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.bdr}`, background: C.bg, flexShrink: 0 }}>
          {[
            { key: 'mapping',    label: 'GL Mapping',         icon: <Map size={11} /> },
            { key: 'frameworks', label: 'Frameworks',          icon: <Layers size={11} /> },
            { key: 'preview',    label: 'Report Preview',      icon: <Eye size={11} /> },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '7px 16px', border: 'none', background: tab === t.key ? C.white : 'transparent',
              borderBottom: tab === t.key ? `2px solid ${C.acc}` : '2px solid transparent',
              fontSize: '10px', fontWeight: '700', cursor: 'pointer', color: tab === t.key ? C.acc : C.muted,
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

          {/* ══════════════ TAB: GL MAPPING ══════════════ */}
          {tab === 'mapping' && (
            <div style={{ display: 'flex', width: '100%', overflow: 'hidden' }}>

              {/* Left: GL Accounts panel */}
              <div style={{ width: '340px', flexShrink: 0, borderRight: `1px solid ${C.bdr}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg }}>
                {/* Filter header */}
                <div style={{ padding: '10px', borderBottom: `1px solid ${C.bdr}` }}>
                  <p style={{ margin: '0 0 8px', fontSize: '9px', fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🗂️ GL Accounts  {selCompanyId && <span style={{ fontFamily: 'monospace', color: C.acc }}>({selCompany?.company_code})</span>}
                  </p>

                  {/* Search */}
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <Search size={11} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
                    <input value={glSearch} onChange={e => setGLSearch(e.target.value)} placeholder="Search GL code / name..." style={{ ...s.inp, paddingLeft: '26px', fontSize: '10px' }} />
                  </div>

                  {/* Hierarchy filters */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <select value={filterType} onChange={e => { setFilterType(e.target.value); setFilterSubType(''); setFilterCat(''); setFilterSubCat(''); setFilterHead(''); }} style={{ ...s.sel, fontSize: '10px' }}>
                      <option value="">All GL Types</option>
                      {glTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
                    </select>
                    {filterType && (
                      <select value={filterSubType} onChange={e => { setFilterSubType(e.target.value); setFilterCat(''); setFilterSubCat(''); setFilterHead(''); }} style={{ ...s.sel, fontSize: '10px' }}>
                        <option value="">All Sub-Types</option>
                        {filtSubTypes.map(t => <option key={t.id} value={t.id}>{t.sub_type_name}</option>)}
                      </select>
                    )}
                    {filterType && (
                      <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setFilterSubCat(''); setFilterHead(''); }} style={{ ...s.sel, fontSize: '10px' }}>
                        <option value="">All Categories</option>
                        {filtCats.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                      </select>
                    )}
                    {filterCat && (
                      <select value={filterSubCat} onChange={e => { setFilterSubCat(e.target.value); setFilterHead(''); }} style={{ ...s.sel, fontSize: '10px' }}>
                        <option value="">All Sub-Categories</option>
                        {filtSubCats.map(sc => <option key={sc.id} value={sc.id}>{sc.sub_category_name}</option>)}
                      </select>
                    )}
                    {filterSubCat && (
                      <select value={filterHead} onChange={e => setFilterHead(e.target.value)} style={{ ...s.sel, fontSize: '10px' }}>
                        <option value="">All GL Heads</option>
                        {filtHeads.map(h => <option key={h.id} value={h.id}>{h.gl_head_name}</option>)}
                      </select>
                    )}
                  </div>

                  <p style={{ margin: '6px 0 0', fontSize: '9px', color: C.muted }}>
                    {glLoading ? '⏳ Loading...' : `${filteredGLs.length} GL accounts`}
                    {selCompanyId && <span style={{ color: C.acc, marginLeft: '4px' }}>— drag onto line items to map →</span>}
                  </p>
                </div>

                {/* GL list */}
                <div style={{ flex: 1, overflow: 'auto', padding: '6px' }}>
                  {!selCompanyId ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: C.muted }}>
                      <Building size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                      <p style={{ fontSize: '10px' }}>Select a company above to see GL accounts</p>
                    </div>
                  ) : glLoading ? (
                    <div style={{ padding: '20px', textAlign: 'center' }}><Loader size={24} style={{ animation: 'spin 1s linear infinite', color: C.acc }} /></div>
                  ) : filteredGLs.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: C.muted }}>
                      <p style={{ fontSize: '10px' }}>No GL accounts match filters</p>
                    </div>
                  ) : (
                    filteredGLs.map(gl => (
                      <div key={gl.id}
                        draggable
                        onDragStart={() => handleDragStart(gl)}
                        style={{
                          padding: '7px 9px', marginBottom: '4px', borderRadius: '5px',
                          border: `1px solid ${C.bdr}`, background: C.white,
                          cursor: 'grab', transition: 'all 0.1s',
                          userSelect: 'none',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.acc; e.currentTarget.style.background = C.accS; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.bdr; e.currentTarget.style.background = C.white; }}
                      >
                        <div style={{ fontSize: '10px', fontWeight: '700', color: C.pri }}>{gl.gl_name}</div>
                        <div style={{ fontSize: '8px', color: C.muted, fontFamily: 'monospace', marginBottom: '4px' }}>{gl.gl_code}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                          {gl.gl_type     && <span style={{ fontSize: '8px', background: FW_COLORS.IFRS?.bg || '#dbeafe', color: FW_COLORS.IFRS?.text || '#1d4ed8', padding: '1px 5px', borderRadius: '8px', fontWeight: '700' }}>{gl.gl_type.code}</span>}
                          {gl.gl_category && <span style={{ fontSize: '8px', background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: '8px', fontWeight: '700' }}>{gl.gl_category.code}</span>}
                          {gl.gl_head     && <span style={{ fontSize: '8px', background: '#ccfbf1', color: '#0f766e', padding: '1px 5px', borderRadius: '8px', fontWeight: '700' }}>{gl.gl_head.code}</span>}
                          {gl.plant       && <span style={{ fontSize: '8px', background: '#fce7f3', color: '#be185d', padding: '1px 5px', borderRadius: '8px', fontWeight: '700' }}>🏭 {gl.plant.name}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right: Framework mapping panel */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Toolbar */}
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.bdr}`, display: 'flex', alignItems: 'center', gap: '10px', background: C.white, flexShrink: 0, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={s.lbl}>Framework to Map</label>
                    <select value={selFwId} onChange={e => setSelFwId(e.target.value)} style={s.sel}>
                      <option value="">— Select Framework —</option>
                      {frameworks.map(fw => <option key={fw.id} value={fw.id}>{fw.name} ({fw.framework_type} · {fw.report_type})</option>)}
                    </select>
                  </div>
                  {selFwId && selCompanyId && (
                    <>
                      <button onClick={saveMappings} disabled={saving || !mappingsDirty}
                        style={{ ...s.btn(mappingsDirty, C.grn), display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', marginTop: '14px' }}>
                        {saving ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={11} />}
                        {saving ? 'Saving...' : mappingsDirty ? 'Save Mappings*' : 'Saved ✓'}
                      </button>
                      <button onClick={() => { setPreviewFwId(selFwId); setTab('preview'); }}
                        style={{ ...s.btn(false), display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', marginTop: '14px' }}>
                        <Eye size={11} /> Preview Report
                      </button>
                    </>
                  )}
                </div>

                {/* Mapping area */}
                {!selFwId ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: C.muted, padding: '20px' }}>
                    <Map size={48} style={{ opacity: 0.15, marginBottom: '12px' }} />
                    <p style={{ fontSize: '12px', fontWeight: '600' }}>Select a Framework to start mapping</p>
                    <p style={{ fontSize: '10px', marginTop: '6px' }}>Choose from the dropdown above, or create a new one in the Frameworks tab</p>
                  </div>
                ) : !selCompanyId ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: C.muted, padding: '20px' }}>
                    <Building size={48} style={{ opacity: 0.15, marginBottom: '12px' }} />
                    <p style={{ fontSize: '12px', fontWeight: '600' }}>Select a Company</p>
                    <p style={{ fontSize: '10px', marginTop: '6px' }}>Use the company selector in the header to scope this mapping</p>
                  </div>
                ) : !fwDetail ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: C.acc }} />
                  </div>
                ) : (
                  <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
                    {/* Framework info */}
                    <div style={{ marginBottom: '10px', padding: '8px 10px', background: C.accS, borderRadius: '6px', border: `1px solid #c7d2fe`, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <BookOpen size={12} color={C.acc} />
                      <span style={{ fontSize: '10px', fontWeight: '700', color: C.acc }}>{fwDetail.name}</span>
                      <Badge text={fwDetail.framework_type} colors={FW_COLORS[fwDetail.framework_type]} />
                      <Badge text={fwDetail.report_type}    colors={RT_COLORS[fwDetail.report_type]} />
                      <span style={{ fontSize: '9px', color: C.muted }}>Drag GL accounts from the left panel onto line items below</span>
                    </div>

                    {/* Line items */}
                    {(() => {
                      let lastSection = null;
                      return fwDetail.line_items.map(li => {
                        const sectionChanged = li.section !== lastSection;
                        lastSection = li.section;
                        const mapped = mappings[li.id] || [];
                        const mappedGLs = mapped.map(gid => glAccounts.find(g => g.id === gid)).filter(Boolean);

                        return (
                          <React.Fragment key={li.id}>
                            {sectionChanged && !li.is_total && (
                              <div style={{ fontSize: '9px', fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 0 4px', borderTop: `1px solid ${C.bdr}` }}>
                                {li.section}
                              </div>
                            )}
                            <div
                              onDrop={li.is_total ? undefined : e => handleDrop(e, li.id)}
                              onDragOver={li.is_total ? undefined : handleDragOver}
                              style={{
                                marginBottom: '4px',
                                marginLeft: `${li.indent_level * 16}px`,
                                padding: '7px 10px',
                                borderRadius: '5px',
                                border: li.is_total ? `1px solid ${C.bdr}` : `1px dashed ${C.bdr}`,
                                background: li.is_total ? '#f1f5f9' : C.white,
                                transition: 'border-color 0.15s',
                              }}
                              onDragEnter={li.is_total ? undefined : e => { e.currentTarget.style.borderColor = C.acc; e.currentTarget.style.background = C.accS; }}
                              onDragLeave={li.is_total ? undefined : e => { e.currentTarget.style.borderColor = C.bdr; e.currentTarget.style.background = C.white; }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                                  {li.is_total
                                    ? <Hash size={10} color={C.muted} />
                                    : <ArrowRight size={10} color={C.acc} />}
                                  <span style={{ fontSize: li.is_total ? '10px' : '10px', fontWeight: li.is_total ? '800' : '600', color: li.is_total ? C.pri : C.pri }}>
                                    {li.label}
                                  </span>
                                  <span style={{ fontSize: '8px', color: C.muted, fontFamily: 'monospace' }}>{li.code}</span>
                                  {li.is_total && li.total_of?.length > 0 && (
                                    <span style={{ fontSize: '8px', color: C.muted }}>= Σ({li.total_of.join(' + ')})</span>
                                  )}
                                </div>
                                {!li.is_total && (
                                  <span style={{ fontSize: '8px', color: mapped.length > 0 ? C.grn : C.muted }}>
                                    {mapped.length > 0 ? `${mapped.length} GL mapped` : 'Drop GL here'}
                                  </span>
                                )}
                              </div>
                              {/* Mapped GL chips */}
                              {mappedGLs.length > 0 && (
                                <div style={{ marginTop: '5px', paddingTop: '5px', borderTop: `1px solid ${C.bdr}`, display: 'flex', flexWrap: 'wrap' }}>
                                  {mappedGLs.map(gl => (
                                    <Chip key={gl.id} label={`${gl.gl_code} — ${gl.gl_name}`} onRemove={() => removeMapping(li.id, gl.id)} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════ TAB: FRAMEWORKS ══════════════ */}
          {tab === 'frameworks' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>

              {/* Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: C.pri }}>Report Frameworks</p>
                  <p style={{ margin: 0, fontSize: '10px', color: C.muted }}>Create IFRS, Ind AS, Schedule III or custom frameworks — use templates for instant setup</p>
                </div>
                <button onClick={() => setShowFwForm(v => !v)} style={{ ...s.btn(showFwForm, C.acc), display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px' }}>
                  <Plus size={12} /> New Framework
                </button>
              </div>

              {/* ── CREATE FORM ── */}
              {showFwForm && (
                <div style={{ border: `1.5px solid ${C.acc}`, borderRadius: '10px', padding: '16px', marginBottom: '20px', background: C.accS }}>
                  <p style={{ margin: '0 0 14px', fontSize: '11px', fontWeight: '800', color: C.acc }}>✦ Create New Framework</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>

                    {/* Name */}
                    <div>
                      <label style={s.lbl}>Framework Name *</label>
                      <input value={fwForm.name} onChange={e => setFwForm(p => ({...p, name: e.target.value}))} placeholder="e.g., IFRS Balance Sheet 2025" style={s.inp} />
                    </div>

                    {/* Framework Type — DB dropdown + Add to DB */}
                    <div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'3px' }}>
                        <label style={{...s.lbl, margin:0}}>Framework Type *</label>
                        <button onClick={() => { setShowAddFwType(true); setShowAddRptType(false); setFwTypeForm({ label:'', description:'', display_order:'99' }); }}
                          style={{ fontSize:'9px', color: C.acc, background:'none', border:'none', cursor:'pointer', fontWeight:'800', padding:0, display:'flex', alignItems:'center', gap:'2px' }}>
                          <Plus size={10}/> + Add New
                        </button>
                      </div>
                      <select value={fwForm.framework_type} onChange={e => setFwForm(p => ({...p, framework_type: e.target.value}))} style={s.sel}>
                          <option value="">-- Select --</option>
                          {fwTypes.map(t => <option key={t.code} value={t.code}>{t.label}{!t.is_system ? ' ★' : ''}</option>)}
                        </select>
                      <p style={{ margin:'2px 0 0', fontSize:'8px', color:C.muted }}>{fwTypes.length} types in database</p>
                    </div>

                    {/* Report Type — DB dropdown + Add to DB */}
                    <div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'3px' }}>
                        <label style={{...s.lbl, margin:0}}>Report Type *</label>
                        <button onClick={() => { setShowAddRptType(true); setShowAddFwType(false); setRptTypeForm({ label:'', description:'', display_order:'99' }); }}
                          style={{ fontSize:'9px', color: C.acc, background:'none', border:'none', cursor:'pointer', fontWeight:'800', padding:0, display:'flex', alignItems:'center', gap:'2px' }}>
                          <Plus size={10}/> + Add New
                        </button>
                      </div>
                      <select value={fwForm.report_type} onChange={e => setFwForm(p => ({...p, report_type: e.target.value}))} style={s.sel}>
                          <option value="">-- Select --</option>
                          {rptTypes.map(t => <option key={t.code} value={t.code}>{t.label}{!t.is_system ? ' ★' : ''}</option>)}
                        </select>
                      <p style={{ margin:'2px 0 0', fontSize:'8px', color:C.muted }}>{rptTypes.length} types in database</p>
                    </div>

                    {/* Company */}
                    <div>
                      <label style={s.lbl}>Company (optional — global if blank)</label>
                      <select value={fwForm.company_id} onChange={e => setFwForm(p => ({...p, company_id: e.target.value}))} style={s.sel}>
                        <option value="">Global (all companies)</option>
                        {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.company_name} ({c.company_code})</option>)}
                      </select>
                    </div>

                    {/* Template grouped dropdown */}
                    <div>
                      <label style={s.lbl}>Seed from Template</label>
                      <select value={fwForm.template_key} onChange={e => {
                          const tk = e.target.value;
                          if (tk) {
                            const t = templates.find(x => x.key === tk);
                            if (t) setFwForm(p => ({...p, template_key:tk, framework_type:t.framework_type, report_type:t.report_type, name: p.name || t.name}));
                          } else { setFwForm(p => ({...p, template_key:''})); }
                        }} style={s.sel}>
                        <option value="">Blank — start from scratch</option>
                        {(() => {
                          const grouped = {};
                          templates.forEach(t => { if(!grouped[t.framework_type]) grouped[t.framework_type]=[]; grouped[t.framework_type].push(t); });
                          return Object.entries(grouped).map(([fwt,grp]) => (
                            <optgroup key={fwt} label={`── ${fwTypes.find(x=>x.code===fwt)?.label||fwt} ──────────────`}>
                              {grp.map(t => <option key={t.key} value={t.key}>{t.name} ({t.line_item_count} items)</option>)}
                            </optgroup>
                          ));
                        })()}
                      </select>
                    </div>

                    {/* Description */}
                    <div>
                      <label style={s.lbl}>Description</label>
                      <input value={fwForm.description} onChange={e => setFwForm(p => ({...p, description: e.target.value}))} placeholder="Optional notes..." style={s.inp} />
                    </div>
                  </div>

                  {/* Template preview pill */}
                  {fwForm.template_key && (() => {
                    const tmpl = templates.find(t => t.key === fwForm.template_key);
                    if (!tmpl) return null;
                    return (
                      <div style={{ padding:'8px 12px', background:'#dcfce7', border:'1px solid #86efac', borderRadius:'6px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
                        <CheckCircle size={13} color={C.grn}/>
                        <span style={{ fontSize:'9px', color:'#15803d' }}>
                          <strong>{tmpl.name}</strong> — {tmpl.line_item_count} line items ready · {tmpl.description}
                        </span>
                      </div>
                    );
                  })()}

                  <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px' }}>
                    <button onClick={() => setShowFwForm(false)} style={{...s.btn(false), padding:'6px 14px'}}>Cancel</button>
                    <button onClick={createFramework} disabled={fwSaving} style={{...s.btn(true, C.grn), display:'flex', alignItems:'center', gap:'5px', padding:'6px 18px'}}>
                      {fwSaving ? <Loader size={11} style={{animation:'spin 1s linear infinite'}}/> : <Save size={11}/>}
                      {fwSaving ? 'Creating...' : 'Create Framework'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── TEMPLATE CARDS ── */}
              {templates.length > 0 && (
                <div style={{ marginBottom: '22px' }}>
                  <p style={{ margin:'0 0 12px', fontSize:'9px', fontWeight:'800', color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    📦 Professional Templates — click any card to use instantly
                  </p>
                  {[...new Set(templates.map(t => t.framework_type))].sort().map(fwt => {
                    const grp = templates.filter(t => t.framework_type === fwt);
                    if (!grp.length) return null;
                    const gc = FW_COLORS[fwt] || {bg:'#f3f4f6', text:'#374151', dot:'#6b7280'};
                    const _ft = fwTypes.find(x => x.code === fwt);
                    const _icon = {IFRS:'🌍',IND_AS:'🇮🇳',SCHEDULE_III:'📋'}[fwt] || '⚙️';
                    const gLabel = `${_icon}  ${_ft?.label || fwt}${_ft?.description ? ' — '+_ft.description : ''}`;
                    const rtIcon = {BALANCE_SHEET:'🏛️', PNL:'📈', CASH_FLOW:'💧', CUSTOM:'📋'};
                    return (
                      <div key={fwt} style={{ marginBottom:'16px' }}>
                        {/* Group header strip */}
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 12px', background:gc.bg, borderRadius:'7px', marginBottom:'8px', border:`1px solid ${gc.bg}` }}>
                          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:gc.dot, flexShrink:0 }}/>
                          <span style={{ fontSize:'10px', fontWeight:'800', color:gc.text }}>{gLabel}</span>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(255px, 1fr))', gap:'10px' }}>
                          {grp.map(t => {
                            const rc = RT_COLORS[t.report_type] || {bg:'#f3f4f6', text:'#374151'};
                            return (
                              <div key={t.key}
                                style={{ padding:'14px 15px', border:`1.5px solid ${C.bdr}`, borderRadius:'9px', background:C.white, cursor:'pointer', position:'relative', overflow:'hidden', transition:'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor=gc.dot; e.currentTarget.style.boxShadow=`0 6px 20px rgba(0,0,0,0.09)`; e.currentTarget.style.transform='translateY(-2px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor=C.bdr; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}
                                onClick={() => { setFwForm(p => ({...p, name:t.name, framework_type:t.framework_type, report_type:t.report_type, template_key:t.key})); setShowFwForm(true); window.scrollTo({top:0,behavior:'smooth'}); }}
                              >
                                {/* Top accent bar */}
                                <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:gc.dot }}/>
                                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'9px', marginTop:'4px' }}>
                                  <span style={{ fontSize:'24px', lineHeight:1 }}>{rtIcon[t.report_type] || '📋'}</span>
                                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'3px' }}>
                                    <span style={{ padding:'2px 7px', borderRadius:'20px', fontSize:'8px', fontWeight:'700', background:gc.bg, color:gc.text }}>{t.framework_type.replace('_',' ')}</span>
                                    <span style={{ padding:'2px 7px', borderRadius:'20px', fontSize:'8px', fontWeight:'700', background:rc.bg, color:rc.text }}>{t.report_type.replace('_',' ')}</span>
                                  </div>
                                </div>
                                <p style={{ margin:'0 0 5px', fontSize:'11px', fontWeight:'800', color:C.pri, lineHeight:1.3 }}>{t.name}</p>
                                <p style={{ margin:'0 0 10px', fontSize:'9px', color:C.muted, lineHeight:1.5 }}>{t.description}</p>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${C.bdr}`, paddingTop:'8px' }}>
                                  <span style={{ fontSize:'9px', background:C.accS, color:C.acc, padding:'3px 8px', borderRadius:'10px', fontWeight:'700' }}>
                                    {t.line_item_count} line items
                                  </span>
                                  <span style={{ fontSize:'9px', color:gc.text, fontWeight:'700', display:'flex', alignItems:'center', gap:'3px' }}>
                                    Use template <ArrowRight size={9}/>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── SAVED FRAMEWORKS ── */}
              <p style={{ margin:'0 0 8px', fontSize:'9px', fontWeight:'800', color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>📋 Saved Frameworks</p>
              {frameworks.length === 0 ? (
                <div style={{ padding:'30px', textAlign:'center', color:C.muted, border:`1px dashed ${C.bdr}`, borderRadius:'8px' }}>
                  <Layers size={40} style={{ margin:'0 auto 10px', opacity:0.2 }}/>
                  <p style={{ fontSize:'11px' }}>No frameworks yet — create one above or click a template card</p>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'10px' }}>
                  {frameworks.map(fw => (
                    <div key={fw.id} style={{ padding:'12px 14px', border:`1px solid ${C.bdr}`, borderRadius:'8px', background:C.white, transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor=C.acc; e.currentTarget.style.boxShadow=`0 2px 10px rgba(99,102,241,0.1)`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor=C.bdr; e.currentTarget.style.boxShadow='none'; }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'6px', marginBottom:'6px' }}>
                        <p style={{ margin:0, fontSize:'11px', fontWeight:'700', color:C.pri, flex:1 }}>{fw.name}</p>
                        <div style={{ display:'flex', gap:'4px', flexShrink:0 }}>
                          <button onClick={() => { setSelFwId(String(fw.id)); setTab('mapping'); }} title="Map GL Accounts" style={{...s.btn(false), padding:'4px 6px'}}><Map size={11}/></button>
                          <button onClick={() => { setPreviewFwId(String(fw.id)); setTab('preview'); }} title="Preview Report" style={{...s.btn(false), padding:'4px 6px'}}><Eye size={11}/></button>
                          <button onClick={() => deleteFramework(fw.id)} title="Delete" style={{...s.btn(false), padding:'4px 6px', color:C.red}}><Trash2 size={11}/></button>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginBottom:'6px' }}>
                        <Badge text={fw.framework_type} colors={FW_COLORS[fw.framework_type]}/>
                        <Badge text={fw.report_type}    colors={RT_COLORS[fw.report_type]}/>
                        {fw.company_name !== 'Global' && <Badge text={fw.company_name} colors={{bg:'#fce7f3', text:'#be185d'}}/>}
                      </div>
                      <p style={{ margin:0, fontSize:'9px', color:C.muted }}>{fw.line_item_count} line items · {fw.company_name === 'Global' ? '🌍 Global' : `🏢 ${fw.company_name}`}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════ TAB: PREVIEW ══════════════ */}
          {tab === 'preview' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Preview toolbar */}
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.bdr}`, display: 'flex', alignItems: 'flex-end', gap: '10px', background: C.white, flexShrink: 0, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={s.lbl}>Framework</label>
                  <select value={previewFwId} onChange={e => { setPreviewFwId(e.target.value); setPreviewData(null); }} style={s.sel}>
                    <option value="">— Select Framework —</option>
                    {frameworks.map(fw => <option key={fw.id} value={fw.id}>{fw.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label style={s.lbl}>Company</label>
                  <select value={selCompanyId} onChange={e => { setSelCompanyId(e.target.value); setPreviewData(null); }} style={s.sel}>
                    <option value="">— Select Company —</option>
                    {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.company_name} ({c.company_code})</option>)}
                  </select>
                </div>
                <button onClick={generatePreview} disabled={previewLoading || !previewFwId || !selCompanyId}
                  style={{ ...s.btn(!!(previewFwId && selCompanyId), C.acc), display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px' }}>
                  {previewLoading ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={11} />}
                  {previewLoading ? 'Generating...' : 'Generate Report'}
                </button>
              </div>

              {/* Report output */}
              <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px', background: C.bg }}>
                {!previewData ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: C.muted }}>
                    <BarChart2 size={48} style={{ opacity: 0.15, marginBottom: '12px' }} />
                    <p style={{ fontSize: '12px', fontWeight: '600' }}>Select framework + company and click Generate</p>
                    <p style={{ fontSize: '10px', marginTop: '6px' }}>The report will show all line items with their mapped GL balances</p>
                  </div>
                ) : (
                  <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    {/* Report header */}
                    <div style={{ background: C.pri, color: C.white, padding: '16px 20px', borderRadius: '8px 8px 0 0' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{previewData.company_name} ({previewData.company_code})</p>
                      <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '800' }}>{previewData.framework_name}</p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Badge text={previewData.framework_type} colors={FW_COLORS[previewData.framework_type]} />
                        <Badge text={previewData.report_type}    colors={RT_COLORS[previewData.report_type]} />
                      </div>
                    </div>

                    {/* Note */}
                    <div style={{ background: '#fef9c3', padding: '6px 12px', fontSize: '9px', color: '#78350f', borderLeft: '4px solid #d97706', marginBottom: '2px' }}>
                      ℹ️ {previewData.generated_note}
                    </div>

                    {/* Table */}
                    <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <thead>
                          <tr style={{ background: C.bg }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '9px', fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.bdr}` }}>Line Item</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: '9px', fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.bdr}`, width: '80px' }}>GL Mapped</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '9px', fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.bdr}`, width: '120px' }}>Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let lastSection = null;
                            return previewData.line_items.map(li => {
                              const rows = [];
                              if (li.section !== lastSection) {
                                lastSection = li.section;
                                rows.push(<SectionDivider key={`sec-${li.section}`} label={li.section} />);
                              }
                              const isMainTotal = li.indent_level === 0 && li.is_total;
                              const isSectionTotal = li.indent_level === 1 && li.is_total;
                              rows.push(
                                <tr key={li.id} style={{ borderBottom: `1px solid ${C.bdr}`, background: isMainTotal ? '#1e293b' : isSectionTotal ? '#f1f5f9' : C.white }}>
                                  <td style={{ padding: `${isMainTotal ? 10 : 7}px 12px`, paddingLeft: `${12 + li.indent_level * 20}px` }}>
                                    <span style={{ fontSize: isMainTotal ? '11px' : isSectionTotal ? '10px' : '10px', fontWeight: isMainTotal ? '800' : isSectionTotal ? '700' : '500', color: isMainTotal ? C.white : C.pri }}>
                                      {li.label}
                                    </span>
                                    {li.mapped_gls?.length > 0 && !li.is_total && (
                                      <div style={{ marginTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                        {li.mapped_gls.map(g => <span key={g.gl_id} style={{ fontSize: '8px', background: C.accS, color: C.acc, padding: '1px 5px', borderRadius: '8px', fontFamily: 'monospace' }}>{g.gl_code}</span>)}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                                    {!li.is_total && li.mapped_count > 0 && (
                                      <span style={{ fontSize: '9px', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '10px', fontWeight: '700' }}>{li.mapped_count}</span>
                                    )}
                                    {!li.is_total && li.mapped_count === 0 && (
                                      <span style={{ fontSize: '9px', background: '#fee2e2', color: C.red, padding: '2px 6px', borderRadius: '10px', fontWeight: '700' }}>—</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: isMainTotal ? '12px' : '10px', fontWeight: isMainTotal ? '800' : isSectionTotal ? '700' : '400', color: isMainTotal ? C.white : li.amount >= 0 ? C.pri : C.red }}>
                                    {li.amount !== 0 || li.is_total ? `₹ ${Math.abs(li.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                  </td>
                                </tr>
                              );
                              return rows;
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* Unmapped warning */}
                    {(() => {
                      const unmapped = previewData.line_items.filter(li => !li.is_total && li.mapped_count === 0);
                      if (!unmapped.length) return null;
                      return (
                        <div style={{ marginTop: '10px', padding: '10px 12px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '9px', color: '#78350f' }}>
                          <strong>⚠️ {unmapped.length} line item(s) have no GL mapping:</strong>
                          <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {unmapped.map(li => <span key={li.id} style={{ background: '#fef3c7', padding: '2px 7px', borderRadius: '8px', fontFamily: 'monospace', fontWeight: '700' }}>{li.code}</span>)}
                          </div>
                          <p style={{ margin: '6px 0 0' }}>Go to <strong>GL Mapping</strong> tab to assign GL accounts to these line items.</p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
      {/* ══════════ MODAL: Add Framework Type ══════════ */}
      {showAddFwType && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddFwType(false); }}>
          <div style={{ background:C.white, borderRadius:'12px', width:'100%', maxWidth:'460px', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', overflow:'hidden' }}>
            {/* Modal Header */}
            <div style={{ background: C.pri, padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <Tag size={14} color={C.accM} />
                <span style={{ fontSize:'12px', fontWeight:'800', color:C.white }}>Add Framework Type</span>
              </div>
              <button onClick={() => setShowAddFwType(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0, lineHeight:1 }}>
                <XCircle size={16} />
              </button>
            </div>
            {/* Modal Body */}
            <div style={{ padding:'20px 18px' }}>
              <p style={{ margin:'0 0 14px', fontSize:'10px', color:C.muted }}>
                A new framework type will be added to the database and auto-selected. The code is auto-generated from the label.
              </p>

              {/* Label */}
              <div style={{ marginBottom:'12px' }}>
                <label style={s.lbl}>Type Label <span style={{ color:C.red }}>*</span></label>
                <input
                  autoFocus
                  value={fwTypeForm.label}
                  onChange={e => setFwTypeForm(p => ({...p, label: e.target.value}))}
                  onKeyDown={e => e.key === 'Enter' && doAddFwType()}
                  placeholder="e.g. US GAAP, Local GAAP, IFRS 17…"
                  style={{ ...s.inp, fontSize:'12px', padding:'8px 10px' }}
                />
                {fwTypeForm.label.trim() && (
                  <p style={{ margin:'4px 0 0', fontSize:'9px', color:C.muted }}>
                    Code will be: <span style={{ fontFamily:'monospace', fontWeight:'800', color:C.acc, background:C.accS, padding:'1px 6px', borderRadius:'4px' }}>
                      {fwTypeForm.label.trim().toUpperCase().replace(/\s+/g,'_').replace(/[^A-Z0-9_]/g,'')}
                    </span>
                  </p>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom:'16px' }}>
                <label style={s.lbl}>Description <span style={{ color:C.muted }}>(optional)</span></label>
                <textarea
                  value={fwTypeForm.description}
                  onChange={e => setFwTypeForm(p => ({...p, description: e.target.value}))}
                  placeholder="Brief description of this framework type…"
                  rows={2}
                  style={{ ...s.inp, fontSize:'11px', padding:'8px 10px', resize:'vertical', minHeight:'56px' }}
                />
              </div>

              {/* Info note */}
              <div style={{ background:'#fef9c3', border:'1px solid #fde68a', borderRadius:'6px', padding:'8px 10px', marginBottom:'16px', display:'flex', gap:'6px', alignItems:'flex-start' }}>
                <Info size={11} color='#92400e' style={{ marginTop:'1px', flexShrink:0 }} />
                <p style={{ margin:0, fontSize:'9px', color:'#92400e' }}>
                  <strong>is_system</strong> will be set to <strong>false</strong> (user-created). Display order defaults to 99.
                </p>
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                <button onClick={() => { setShowAddFwType(false); setFwTypeForm({ label:'', description:'', display_order:'99' }); }}
                  style={{ ...s.btn(false), padding:'8px 16px', fontSize:'11px' }}>
                  Cancel
                </button>
                <button onClick={doAddFwType} disabled={addingFwType || !fwTypeForm.label.trim()}
                  style={{ ...s.btn(true, C.acc), padding:'8px 18px', fontSize:'11px', display:'flex', alignItems:'center', gap:'6px', opacity: (!fwTypeForm.label.trim() || addingFwType) ? 0.6 : 1 }}>
                  {addingFwType ? <Loader size={11} style={{ animation:'spin 1s linear infinite' }} /> : <CheckCircle size={11} />}
                  {addingFwType ? 'Saving…' : 'Save Framework Type'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: Add Report Type ══════════ */}
      {showAddRptType && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddRptType(false); }}>
          <div style={{ background:C.white, borderRadius:'12px', width:'100%', maxWidth:'460px', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', overflow:'hidden' }}>
            {/* Modal Header */}
            <div style={{ background: C.pri, padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <FileText size={14} color={C.accM} />
                <span style={{ fontSize:'12px', fontWeight:'800', color:C.white }}>Add Report Type</span>
              </div>
              <button onClick={() => setShowAddRptType(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0, lineHeight:1 }}>
                <XCircle size={16} />
              </button>
            </div>
            {/* Modal Body */}
            <div style={{ padding:'20px 18px' }}>
              <p style={{ margin:'0 0 14px', fontSize:'10px', color:C.muted }}>
                A new report type will be added to the database and auto-selected. The code is auto-generated from the label.
              </p>

              {/* Label */}
              <div style={{ marginBottom:'12px' }}>
                <label style={s.lbl}>Type Label <span style={{ color:C.red }}>*</span></label>
                <input
                  autoFocus
                  value={rptTypeForm.label}
                  onChange={e => setRptTypeForm(p => ({...p, label: e.target.value}))}
                  onKeyDown={e => e.key === 'Enter' && doAddRptType()}
                  placeholder="e.g. Segment Report, Trial Balance…"
                  style={{ ...s.inp, fontSize:'12px', padding:'8px 10px' }}
                />
                {rptTypeForm.label.trim() && (
                  <p style={{ margin:'4px 0 0', fontSize:'9px', color:C.muted }}>
                    Code will be: <span style={{ fontFamily:'monospace', fontWeight:'800', color:C.acc, background:C.accS, padding:'1px 6px', borderRadius:'4px' }}>
                      {rptTypeForm.label.trim().toUpperCase().replace(/\s+/g,'_').replace(/[^A-Z0-9_]/g,'')}
                    </span>
                  </p>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom:'16px' }}>
                <label style={s.lbl}>Description <span style={{ color:C.muted }}>(optional)</span></label>
                <textarea
                  value={rptTypeForm.description}
                  onChange={e => setRptTypeForm(p => ({...p, description: e.target.value}))}
                  placeholder="Brief description of this report type…"
                  rows={2}
                  style={{ ...s.inp, fontSize:'11px', padding:'8px 10px', resize:'vertical', minHeight:'56px' }}
                />
              </div>

              {/* Info note */}
              <div style={{ background:'#fef9c3', border:'1px solid #fde68a', borderRadius:'6px', padding:'8px 10px', marginBottom:'16px', display:'flex', gap:'6px', alignItems:'flex-start' }}>
                <Info size={11} color='#92400e' style={{ marginTop:'1px', flexShrink:0 }} />
                <p style={{ margin:0, fontSize:'9px', color:'#92400e' }}>
                  <strong>is_system</strong> will be set to <strong>false</strong> (user-created). Display order defaults to 99.
                </p>
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                <button onClick={() => { setShowAddRptType(false); setRptTypeForm({ label:'', description:'', display_order:'99' }); }}
                  style={{ ...s.btn(false), padding:'8px 16px', fontSize:'11px' }}>
                  Cancel
                </button>
                <button onClick={doAddRptType} disabled={addingRptType || !rptTypeForm.label.trim()}
                  style={{ ...s.btn(true, C.acc), padding:'8px 18px', fontSize:'11px', display:'flex', alignItems:'center', gap:'6px', opacity: (!rptTypeForm.label.trim() || addingRptType) ? 0.6 : 1 }}>
                  {addingRptType ? <Loader size={11} style={{ animation:'spin 1s linear infinite' }} /> : <CheckCircle size={11} />}
                  {addingRptType ? 'Saving…' : 'Save Report Type'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
