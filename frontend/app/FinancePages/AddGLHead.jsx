import React, { useState, useEffect, useCallback } from 'react';
import {
  Bookmark, Search, Eye, CheckCircle, XCircle, AlertCircle, Loader,
  Grid, List, Plus, Save, Upload, ChevronRight
} from 'lucide-react';
import ExcelImportPopup from '../pages/ExcelImportPopup';

const API_BASE = 'http://localhost:8000/api';

// ─── Shared design tokens ────────────────────────────────────────────────────
const COLOR      = '#7c3aed';   // violet-700
const COLOR_MED  = '#a78bfa';   // violet-400
const COLOR_SOFT = '#ede9fe';   // violet-100

// ─── Inline styles ───────────────────────────────────────────────────────────
const S = {
  input: {
    width: '100%', padding: '6px 8px', border: '1px solid #e0e0e0',
    borderRadius: '4px', fontSize: '10px', boxSizing: 'border-box', color: '#111', outline: 'none',
  },
  label: { display: 'block', fontSize: '9px', fontWeight: '700', marginBottom: '4px', color: '#374151' },
};

const pillBtn = (selected, color = COLOR) => ({
  padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
  border: selected ? `2px solid ${color}` : '1px solid #d1d5db',
  background: selected ? color : 'white',
  color: selected ? 'white' : '#374151',
  fontSize: '10px', fontWeight: '600',
  display: 'inline-flex', alignItems: 'center', gap: '4px',
});

function CodeBadge({ parts }) {
  if (!parts || parts.every(p => !p.code)) return null;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: '99px', overflow: 'hidden', border: `1px solid ${COLOR_MED}`, fontFamily: 'monospace', fontSize: '9px', fontWeight: '800' }}>
      {parts.filter(p => p.code).map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ background: COLOR_MED, color: 'white', padding: '2px 4px', fontSize: '8px' }}>—</span>}
          <span style={{ background: p.bg || COLOR_SOFT, color: p.color || COLOR, padding: '2px 8px' }}>{p.code}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function StepHeader({ num, title, subtitle, done, locked }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <div style={{
        width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? '#16a34a' : locked ? '#e5e7eb' : COLOR,
        color: 'white', fontSize: '10px', fontWeight: '800',
      }}>
        {done ? <CheckCircle size={12} /> : num}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: locked ? '#9ca3af' : '#111' }}>{title}</p>
        {subtitle && <p style={{ margin: 0, fontSize: '8px', color: '#9ca3af' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function StepBox({ locked, children, style = {} }) {
  return (
    <div style={{
      borderWidth: '1px', borderStyle: 'solid',
      borderColor: locked ? '#e5e7eb' : COLOR_SOFT,
      borderRadius: '8px', padding: '12px', marginBottom: '10px',
      background: locked ? '#fafafa' : 'white',
      opacity: locked ? 0.45 : 1,
      pointerEvents: locked ? 'none' : 'auto',
      transition: 'opacity 0.2s',
      ...style,
    }}>
      {children}
    </div>
  );
}

function buildGLHeadCodePreview(subCategory, headName) {
  const parentCode = subCategory?.sub_category_code || '';
  if (!headName || !parentCode) return '';
  const alpha = headName.toUpperCase().replace(/[^A-Z]/g, '');
  const base = (alpha.substring(0, 4)).padEnd(4, 'X');
  return `${parentCode}-${base}-####`;
}

function RecordCard({ item }) {
  return (
    <div
      style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '12px', transition: 'all 0.2s', cursor: 'default' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 12px rgba(124,58,237,0.15)`; e.currentTarget.style.borderColor = COLOR; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e0e0e0'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: '700', color: '#111' }}>{item.gl_head_name}</h4>
          <p style={{ margin: '0 0 4px', fontSize: '8px', color: '#6b7280', fontFamily: 'monospace' }}>{item.gl_head_code}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            {item.gl_type_name && (
              <span style={{ padding: '1px 6px', background: COLOR_SOFT, color: COLOR, borderRadius: '10px', fontSize: '8px', fontWeight: '700' }}>
                {item.gl_type_code} · {item.gl_type_name}
              </span>
            )}
            {item.gl_sub_type_name && (
              <span style={{ padding: '1px 6px', background: '#f0fdf4', color: '#16a34a', borderRadius: '10px', fontSize: '8px', fontWeight: '700' }}>
                {item.gl_sub_type_name}
              </span>
            )}
            {item.gl_category_name && (
              <span style={{ padding: '1px 6px', background: '#fff7ed', color: '#d97706', borderRadius: '10px', fontSize: '8px', fontWeight: '700' }}>
                {item.gl_category_name}
              </span>
            )}
            {item.gl_sub_category_name && (
              <span style={{ padding: '1px 6px', background: '#fdf4ff', color: '#9333ea', borderRadius: '10px', fontSize: '8px', fontWeight: '700' }}>
                {item.gl_sub_category_name}
              </span>
            )}
          </div>
        </div>
        <span style={{
          padding: '3px 7px', borderRadius: '3px', fontSize: '8px', fontWeight: '600', flexShrink: 0,
          background: item.is_active ? '#dcfce7' : '#fee2e2',
          color: item.is_active ? '#16a34a' : '#dc2626',
        }}>
          {item.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      {item.description && <p style={{ margin: 0, fontSize: '9px', color: '#374151', lineHeight: '1.4' }}>{item.description}</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function AddGLHead() {
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // ── Master data ──────────────────────────────────────────────────────────
  const [glTypes,         setGlTypes]         = useState([]);
  const [glSubTypes,      setGlSubTypes]      = useState([]);
  const [glCategories,    setGlCategories]    = useState([]);
  const [glSubCategories, setGlSubCategories] = useState([]);
  const [glHeads,         setGlHeads]         = useState([]);

  // ── Active tab ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('create');

  // ══ CREATE FORM — 5-step progressive flow ══════════════════════════════
  const [selectedTypeId,    setSelectedTypeId]    = useState('');
  const [selectedSubTypeId, setSelectedSubTypeId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubCatId,  setSelectedSubCatId]  = useState('');
  const [headName,  setHeadName]  = useState('');
  const [headDesc,  setHeadDesc]  = useState('');

  // ── Derived helpers ──────────────────────────────────────────────────────
  const selectedType    = glTypes.find(t => String(t.id) === String(selectedTypeId)) || null;
  const realSubTypeId   = selectedSubTypeId === '__none__' ? '' : selectedSubTypeId;
  const selectedSubType = glSubTypes.find(s => String(s.id) === String(realSubTypeId)) || null;
  const filteredSubTypes = glSubTypes.filter(s => String(s.gl_type_id) === String(selectedTypeId));

  const realCategoryId  = selectedCategoryId === '__none__' ? '' : selectedCategoryId;
  const selectedCategory = glCategories.find(c => String(c.id) === String(realCategoryId)) || null;
  const filteredCategories = glCategories.filter(c => {
    if (!selectedTypeId) return false;
    if (String(c.gl_type_id) !== String(selectedTypeId)) return false;
    if (realSubTypeId && c.gl_sub_type_id && String(c.gl_sub_type_id) !== String(realSubTypeId)) return false;
    return true;
  });

  const selectedSubCategory = glSubCategories.find(s => String(s.id) === String(selectedSubCatId)) || null;
  const filteredSubCats = glSubCategories.filter(sc => {
    if (!realCategoryId) return false;
    return String(sc.gl_category_id) === String(realCategoryId);
  });

  const headCodePreview = buildGLHeadCodePreview(selectedSubCategory, headName);

  // ── IMPORT state ─────────────────────────────────────────────────────────
  const [showImportPopup,    setShowImportPopup]    = useState(false);
  const [showGLTypeSelector, setShowGLTypeSelector] = useState(false);
  const [impTypeId,          setImpTypeId]          = useState('');
  const [impSubTypeId,       setImpSubTypeId]       = useState('');
  const [impCategoryId,      setImpCategoryId]      = useState('');
  const [impSubCatId,        setImpSubCatId]        = useState('');
  const [impFilteredSubs,    setImpFilteredSubs]    = useState([]);
  const [impFilteredCats,    setImpFilteredCats]    = useState([]);
  const [impFilteredSubCats, setImpFilteredSubCats] = useState([]);

  // ── VIEW state ───────────────────────────────────────────────────────────
  const [viewMode,        setViewMode]        = useState('grid');
  const [searchTerm,      setSearchTerm]      = useState('');
  const [filterTypeId,    setFilterTypeId]    = useState('');
  const [filterSubTypeId, setFilterSubTypeId] = useState('');
  const [filterCatId,     setFilterCatId]     = useState('');
  const [filterSubCatId,  setFilterSubCatId]  = useState('');

  // ── API helpers ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    await Promise.all([fetchGLTypes(), fetchGLSubTypes(), fetchCategories(), fetchSubCategories(), fetchHeads()]);
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem('userData');
    if (raw) { try { setCurrentUser(JSON.parse(raw).user); } catch { /* ignore */ } }
    fetchAll();
  }, [fetchAll]);

  // Import filter cascades
  useEffect(() => {
    if (impTypeId) {
      setImpFilteredSubs(glSubTypes.filter(s => String(s.gl_type_id) === String(impTypeId)));
      setImpFilteredCats(glCategories.filter(c => String(c.gl_type_id) === String(impTypeId)));
    } else {
      setImpFilteredSubs([]); setImpFilteredCats([]); setImpFilteredSubCats([]);
    }
    setImpSubTypeId(''); setImpCategoryId(''); setImpSubCatId('');
  }, [impTypeId, glSubTypes, glCategories]);

  useEffect(() => {
    if (impCategoryId) {
      setImpFilteredSubCats(glSubCategories.filter(sc => String(sc.gl_category_id) === String(impCategoryId)));
    } else {
      setImpFilteredSubCats([]);
    }
    setImpSubCatId('');
  }, [impCategoryId, glSubCategories]);

  // ── FIXED fetch functions with Array.isArray() guard ────────────────────
  const fetchGLTypes = async () => {
    try {
      const r = await fetch(`${API_BASE}/gl-types?is_active=true`);
      const data = await r.json();
      setGlTypes(Array.isArray(data) ? data : []);
    } catch { setGlTypes([]); }
  };

  const fetchGLSubTypes = async () => {
    try {
      const r = await fetch(`${API_BASE}/gl-sub-types`);
      const data = await r.json();
      setGlSubTypes(Array.isArray(data) ? data : []);
    } catch { setGlSubTypes([]); }
  };

  const fetchCategories = async () => {
    try {
      const r = await fetch(`${API_BASE}/gl-categories`);
      const data = await r.json();
      setGlCategories(Array.isArray(data) ? data : []);
    } catch { setGlCategories([]); }
  };

  const fetchSubCategories = async () => {
    try {
      const r = await fetch(`${API_BASE}/gl-sub-categories`);
      const data = await r.json();
      setGlSubCategories(Array.isArray(data) ? data : []);
    } catch { setGlSubCategories([]); }
  };

  const fetchHeads = async () => {
    try {
      const r = await fetch(`${API_BASE}/gl-heads`);
      const data = await r.json();
      setGlHeads(Array.isArray(data) ? data : []);
    } catch { setGlHeads([]); }
  };

  // ─── Create GL Head ───────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!selectedTypeId)    { setMessage({ type: 'error', text: 'Please select GL Type (Step 1).' }); return; }
    if (!realCategoryId)    { setMessage({ type: 'error', text: 'Please select GL Category (Step 3).' }); return; }
    if (!selectedSubCatId)  { setMessage({ type: 'error', text: 'Please select GL Sub-Category (Step 4).' }); return; }
    if (!headName.trim())   { setMessage({ type: 'error', text: 'GL Head name is required (Step 5).' }); return; }

    setLoading(true);
    const fd = new FormData();
    fd.append('gl_head_name',       headName.trim());
    fd.append('gl_type_id',         selectedTypeId);
    fd.append('gl_category_id',     realCategoryId);
    fd.append('gl_sub_category_id', selectedSubCatId);
    if (realSubTypeId)     fd.append('gl_sub_type_id', realSubTypeId);
    if (headDesc.trim())   fd.append('description',    headDesc.trim());
    fd.append('user_id', currentUser.id);

    try {
      const res  = await fetch(`${API_BASE}/gl-heads`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `✅ GL Head "${data.gl_head_name}" created — Code: ${data.gl_head_code}` });
        setHeadName(''); setHeadDesc('');
        await fetchHeads();
      } else {
        setMessage({ type: 'error', text: typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail) });
      }
    } catch { setMessage({ type: 'error', text: 'Network error while creating GL Head.' }); }
    finally { setLoading(false); }
  };

  const handleReset = () => {
    setSelectedTypeId(''); setSelectedSubTypeId(''); setSelectedCategoryId('');
    setSelectedSubCatId(''); setHeadName(''); setHeadDesc(''); setMessage(null);
  };

  // ─── Filtered records for View tab ──────────────────────────────────────
  const filteredHeads = glHeads.filter(h => {
    const q = searchTerm.toLowerCase();
    const matchSearch  = !q || h.gl_head_name.toLowerCase().includes(q) || h.gl_head_code.toLowerCase().includes(q);
    const matchType    = !filterTypeId    || String(h.gl_type_id)         === String(filterTypeId);
    const matchSub     = !filterSubTypeId || String(h.gl_sub_type_id)     === String(filterSubTypeId);
    const matchCat     = !filterCatId     || String(h.gl_category_id)     === String(filterCatId);
    const matchSubCat  = !filterSubCatId  || String(h.gl_sub_category_id) === String(filterSubCatId);
    return matchSearch && matchType && matchSub && matchCat && matchSubCat;
  });

  // ─── Import computed values ─────────────────────────────────────────────
  const impType    = glTypes.find(t => String(t.id) === String(impTypeId));
  const impSubType = glSubTypes.find(s => String(s.id) === String(impSubTypeId));
  const impCat     = glCategories.find(c => String(c.id) === String(impCategoryId));
  const impSubCat  = glSubCategories.find(sc => String(sc.id) === String(impSubCatId));

  const templateDropdowns = (() => {
    const dd = [];
    if (!impTypeId)    dd.push({ key: 'gl_type_id',         label: 'GL Type',         options: glTypes.map(t => ({ label: t.type_name,          value: t.id })) });
    if (!impSubTypeId) dd.push({ key: 'gl_sub_type_id',     label: 'GL Sub-Type',     options: (impTypeId ? impFilteredSubs : glSubTypes).map(s => ({ label: s.sub_type_name,      value: s.id })) });
    if (!impCategoryId)dd.push({ key: 'gl_category_id',     label: 'GL Category',     options: (impTypeId ? impFilteredCats : glCategories).map(c => ({ label: c.category_name,    value: c.id })) });
    if (!impSubCatId)  dd.push({ key: 'gl_sub_category_id', label: 'GL Sub-Category', options: (impCategoryId ? impFilteredSubCats : glSubCategories).map(sc => ({ label: sc.sub_category_name, value: sc.id })) });
    return dd;
  })();

  const lookupFields = (() => {
    const lf = [];
    if (!impTypeId)    lf.push({ key: 'gl_type_id',         label: 'GL Type',         data: glTypes,          matchKey: 'type_name',          valueKey: 'id', caseSensitive: false });
    if (!impSubTypeId) lf.push({ key: 'gl_sub_type_id',     label: 'GL Sub-Type',     data: glSubTypes,       matchKey: 'sub_type_name',      valueKey: 'id', caseSensitive: false });
    if (!impCategoryId)lf.push({ key: 'gl_category_id',     label: 'GL Category',     data: glCategories,     matchKey: 'category_name',      valueKey: 'id', caseSensitive: false });
    if (!impSubCatId)  lf.push({ key: 'gl_sub_category_id', label: 'GL Sub-Category', data: glSubCategories,  matchKey: 'sub_category_name',  valueKey: 'id', caseSensitive: false });
    return lf;
  })();

  const extraForm = {};
  if (impTypeId)    extraForm.gl_type_id         = impTypeId;
  if (impSubTypeId) extraForm.gl_sub_type_id      = impSubTypeId;
  if (impCategoryId)extraForm.gl_category_id      = impCategoryId;
  if (impSubCatId)  extraForm.gl_sub_category_id  = impSubCatId;

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ width: '95%', maxWidth: '1200px', height: '90%', maxHeight: '760px', background: 'white', borderRadius: '10px', boxShadow: `0 6px 32px rgba(124,58,237,0.12)`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ padding: '0 14px', height: '34px', background: `linear-gradient(135deg,${COLOR},${COLOR_MED})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bookmark size={14} />
            <span style={{ fontWeight: '700', fontSize: '12px' }}>🔖 GL Head Management ( Account Head / Narration Head / Posting Reference )</span>
          </div>
          <button
            onClick={() => { setImpTypeId(''); setImpSubTypeId(''); setImpCategoryId(''); setImpSubCatId(''); setShowGLTypeSelector(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 9px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', color: 'white', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
          >
            <Upload size={10} /> Import GL Heads
          </button>
        </div>

        {/* ── Message ─────────────────────────────────────────────────────── */}
        {message && (
          <div style={{ margin: '6px 12px 0', padding: '5px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, background: message.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}` }}>
            {message.type === 'success' ? <CheckCircle size={12} color="#16a34a" /> : <AlertCircle size={12} color="#dc2626" />}
            <span style={{ fontSize: '10px', color: '#111', fontWeight: '500', flex: 1 }}>{message.text}</span>
            <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={12} color="#9ca3af" /></button>
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', background: '#f9fafb', flexShrink: 0 }}>
          {[
            { key: 'create', label: '+ Create',     icon: <Plus size={11} /> },
            { key: 'view',   label: `👁 View (${glHeads.length} heads)`, icon: <Eye size={11} /> },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              flex: 1, padding: '7px 12px', fontSize: '10px', fontWeight: '600', cursor: 'pointer',
              border: 'none', borderBottom: activeTab === t.key ? `2px solid ${COLOR}` : '2px solid transparent',
              background: activeTab === t.key ? 'white' : 'transparent',
              color: activeTab === t.key ? COLOR : '#374151',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>

          {/* ════════════ CREATE TAB ════════════════════════════════════════ */}
          {activeTab === 'create' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%' }}>

              {/* ── LEFT: Hierarchy Navigator — Steps 1–3 ─────────────────── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <Bookmark size={13} color={COLOR} />
                  <span style={{ fontWeight: '800', fontSize: '12px', color: COLOR }}>Hierarchy Navigator</span>
                  <span style={{ fontSize: '9px', color: '#9ca3af' }}>— Steps 1–3</span>
                </div>

                {/* STEP 1 — GL Type */}
                {!selectedTypeId ? (
                  <StepBox locked={false}>
                    <StepHeader num="1" title="Select GL Type" subtitle="Required — base of hierarchy" done={false} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {glTypes.length === 0
                        ? <span style={{ fontSize: '9px', color: '#9ca3af' }}>Loading…</span>
                        : glTypes.map(t => (
                          <button key={t.id} onClick={() => { setSelectedTypeId(String(t.id)); setSelectedSubTypeId(''); setSelectedCategoryId(''); setSelectedSubCatId(''); setHeadName(''); setHeadDesc(''); }} style={pillBtn(false)}>
                            <span style={{ fontFamily: 'monospace', fontSize: '8px', opacity: 0.8 }}>{t.type_code}</span>
                            {t.type_name}
                          </button>
                        ))}
                    </div>
                  </StepBox>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '6px 10px', background: COLOR_SOFT, borderWidth: '1px', borderStyle: 'solid', borderColor: COLOR_MED, borderRadius: '8px' }}>
                    <CheckCircle size={13} color={COLOR} />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: COLOR, flex: 1 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '9px', marginRight: '4px', opacity: 0.75 }}>{selectedType?.type_code}</span>
                      {selectedType?.type_name}
                    </span>
                    <button onClick={() => { setSelectedTypeId(''); setSelectedSubTypeId(''); setSelectedCategoryId(''); setSelectedSubCatId(''); setHeadName(''); setHeadDesc(''); }} style={{ fontSize: '9px', color: COLOR, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>Change</button>
                  </div>
                )}

                {/* STEP 2 — GL Sub-Type */}
                {selectedTypeId && !selectedSubTypeId && (
                  <StepBox locked={false}>
                    <StepHeader num="2" title="Select GL Sub-Type" subtitle="Optional — narrows category list" done={false} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <button onClick={() => setSelectedSubTypeId('__none__')} style={{ ...pillBtn(false, '#6b7280') }}>None</button>
                      {filteredSubTypes.length === 0
                        ? <span style={{ fontSize: '9px', color: '#9ca3af', alignSelf: 'center' }}>No sub-types for this GL Type</span>
                        : filteredSubTypes.map(s => (
                          <button key={s.id} onClick={() => setSelectedSubTypeId(String(s.id))} style={pillBtn(false)}>
                            <span style={{ fontFamily: 'monospace', fontSize: '8px', opacity: 0.8 }}>{s.sub_type_code?.split('-').slice(-2).join('-')}</span>
                            {s.sub_type_name}
                          </button>
                        ))}
                    </div>
                  </StepBox>
                )}

                {selectedTypeId && selectedSubTypeId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '6px 10px', background: '#f0fdf4', borderWidth: '1px', borderStyle: 'solid', borderColor: '#86efac', borderRadius: '8px' }}>
                    <CheckCircle size={13} color="#16a34a" />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', flex: 1 }}>
                      {selectedSubTypeId === '__none__' ? 'No Sub-Type' : (
                        <><span style={{ fontFamily: 'monospace', fontSize: '9px', marginRight: '4px', opacity: 0.75 }}>{selectedSubType?.sub_type_code?.split('-').slice(-2).join('-')}</span>{selectedSubType?.sub_type_name}</>
                      )}
                    </span>
                    <button onClick={() => { setSelectedSubTypeId(''); setSelectedCategoryId(''); setSelectedSubCatId(''); }} style={{ fontSize: '9px', color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>Change</button>
                  </div>
                )}

                {/* STEP 3 — GL Category */}
                {selectedTypeId && selectedSubTypeId && !selectedCategoryId && (
                  <StepBox locked={false}>
                    <StepHeader num="3" title="Select GL Category" subtitle="Required — parent category" done={false} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '80px', overflowY: 'auto' }}>
                      {filteredCategories.length === 0
                        ? <span style={{ fontSize: '9px', color: '#9ca3af' }}>No categories for this selection — create from GL Category page first.</span>
                        : filteredCategories.map(c => (
                          <button key={c.id} onClick={() => { setSelectedCategoryId(String(c.id)); setSelectedSubCatId(''); }} style={pillBtn(false, '#d97706')}>
                            <span style={{ fontFamily: 'monospace', fontSize: '8px', opacity: 0.8 }}>{c.category_code?.split('-').slice(-2).join('-')}</span>
                            {c.category_name}
                          </button>
                        ))}
                    </div>
                  </StepBox>
                )}

                {selectedTypeId && selectedSubTypeId && selectedCategoryId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '6px 10px', background: '#fff7ed', borderWidth: '1px', borderStyle: 'solid', borderColor: '#fed7aa', borderRadius: '8px' }}>
                    <CheckCircle size={13} color="#d97706" />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#d97706', flex: 1 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '9px', marginRight: '4px', opacity: 0.75 }}>{selectedCategory?.category_code?.split('-').slice(-2).join('-')}</span>
                      {selectedCategory?.category_name}
                    </span>
                    <button onClick={() => { setSelectedCategoryId(''); setSelectedSubCatId(''); }} style={{ fontSize: '9px', color: '#d97706', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>Change</button>
                  </div>
                )}

                {/* Hierarchy breadcrumb preview */}
                {(selectedType || selectedCategory || selectedSubCategory || headName) && (
                  <div style={{ background: COLOR_SOFT, borderWidth: '1px', borderStyle: 'solid', borderColor: COLOR_MED, borderRadius: '6px', padding: '8px 10px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '8px', fontWeight: '700', color: COLOR }}>📐 Code Hierarchy Preview</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      {selectedType        && <span style={{ padding: '2px 7px', background: COLOR, color: 'white', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{selectedType.type_code}</span>}
                      {selectedType        && <ChevronRight size={10} color="#9ca3af" />}
                      {selectedSubType     && <span style={{ padding: '2px 7px', background: '#d1fae5', color: '#065f46', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{selectedSubType.sub_type_code}</span>}
                      {selectedSubType     && <ChevronRight size={10} color="#9ca3af" />}
                      {selectedCategory    && <span style={{ padding: '2px 7px', background: '#fef3c7', color: '#b45309', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{selectedCategory.category_code}</span>}
                      {selectedCategory    && <ChevronRight size={10} color="#9ca3af" />}
                      {selectedSubCategory && <span style={{ padding: '2px 7px', background: '#fdf4ff', color: '#9333ea', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{selectedSubCategory.sub_category_code}</span>}
                      {selectedSubCategory && headName && <ChevronRight size={10} color="#9ca3af" />}
                      {headName && <span style={{ padding: '2px 7px', background: COLOR_SOFT, color: COLOR, borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{selectedSubCategory?.sub_category_code}-{headName.toUpperCase().replace(/[^A-Z]/g,'').substring(0,4).padEnd(4,'X')}-####</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* ── RIGHT: GL Head — Steps A–C ────────────────────────────── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <Bookmark size={13} color="#9333ea" />
                  <span style={{ fontWeight: '800', fontSize: '12px', color: '#9333ea' }}>GL Head</span>
                  <span style={{ fontSize: '9px', color: '#9ca3af' }}>— Steps A–C</span>
                </div>

                {/* STEP A — GL Sub-Category */}
                {selectedTypeId && selectedSubTypeId && selectedCategoryId && !selectedSubCatId && (
                  <StepBox locked={false} style={{ borderColor: '#e9d5ff' }}>
                    <StepHeader num="A" title="Select GL Sub-Category" subtitle="Required — direct parent of GL Head" done={false} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '80px', overflowY: 'auto' }}>
                      {filteredSubCats.length === 0
                        ? <span style={{ fontSize: '9px', color: '#9ca3af' }}>No sub-categories for this category — create from GL Category page first.</span>
                        : filteredSubCats.map(sc => (
                          <button key={sc.id} onClick={() => setSelectedSubCatId(String(sc.id))} style={pillBtn(false, '#9333ea')}>
                            <span style={{ fontFamily: 'monospace', fontSize: '8px', opacity: 0.8 }}>{sc.sub_category_code?.split('-').slice(-2).join('-')}</span>
                            {sc.sub_category_name}
                          </button>
                        ))}
                    </div>
                  </StepBox>
                )}

                {!(selectedTypeId && selectedSubTypeId && selectedCategoryId) && !selectedSubCatId && (
                  <StepBox locked={true} style={{ borderColor: '#e9d5ff' }}>
                    <StepHeader num="A" title="Select GL Sub-Category" subtitle="Complete Steps 1–3 first" done={false} locked={true} />
                  </StepBox>
                )}

                {selectedTypeId && selectedSubTypeId && selectedCategoryId && selectedSubCatId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '6px 10px', background: '#fdf4ff', borderWidth: '1px', borderStyle: 'solid', borderColor: '#e9d5ff', borderRadius: '8px' }}>
                    <CheckCircle size={13} color="#9333ea" />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#9333ea', flex: 1 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '9px', marginRight: '4px', opacity: 0.75 }}>{selectedSubCategory?.sub_category_code?.split('-').slice(-2).join('-')}</span>
                      {selectedSubCategory?.sub_category_name}
                    </span>
                    <button onClick={() => setSelectedSubCatId('')} style={{ fontSize: '9px', color: '#9333ea', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>Change</button>
                  </div>
                )}

                {/* STEP B — GL Head Details */}
                {selectedTypeId && selectedSubTypeId && selectedCategoryId && selectedSubCatId && (
                  <StepBox locked={false} style={{ borderColor: '#e9d5ff', background: '#fdf4ff' }}>
                    <StepHeader num="B" title="GL Head Details" subtitle="Name, description — code auto-generated" done={!!headName.trim()} />

                    {headCodePreview && (
                      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '9px', color: '#6b7280' }}>Auto code preview:</span>
                        <CodeBadge parts={[
                          { code: selectedType?.type_code, bg: COLOR, color: 'white' },
                          { code: selectedSubTypeId !== '__none__' ? selectedSubType?.sub_type_code?.split('-').slice(-2).join('-') : null, bg: '#d1fae5', color: '#065f46' },
                          { code: selectedCategory?.category_code?.split('-').slice(-2).join('-'), bg: '#fef3c7', color: '#b45309' },
                          { code: selectedSubCategory?.sub_category_code?.split('-').slice(-2).join('-'), bg: '#fdf4ff', color: '#9333ea' },
                          { code: headName ? (headName.toUpperCase().replace(/[^A-Z]/g,'').substring(0,4).padEnd(4,'X') + '-####') : null, bg: COLOR_SOFT, color: COLOR },
                        ]} />
                      </div>
                    )}

                    <div style={{ marginBottom: '8px' }}>
                      <label style={S.label}>GL Head Name <span style={{ color: '#dc2626' }}>*</span></label>
                      <input style={S.input} value={headName} onChange={e => setHeadName(e.target.value)} placeholder="e.g. Cash in Hand, Trade Receivables, Sales Revenue" />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={S.label}>Description (Optional)</label>
                      <textarea style={{ ...S.input, minHeight: '52px', resize: 'vertical' }} value={headDesc} onChange={e => setHeadDesc(e.target.value)} placeholder="Brief description of this GL Head" />
                    </div>

                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button onClick={handleReset} style={{ padding: '5px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', color: '#374151' }}>
                        Reset
                      </button>
                      <button onClick={handleCreate} disabled={loading || !selectedTypeId || !realCategoryId || !selectedSubCatId || !headName.trim()} style={{ padding: '5px 16px', background: (loading || !selectedTypeId || !realCategoryId || !selectedSubCatId || !headName.trim()) ? '#d1d5db' : 'linear-gradient(135deg,#9333ea,#c084fc)', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '700', cursor: (loading || !headName.trim()) ? 'not-allowed' : 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {loading ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={11} />}
                        {loading ? 'Creating…' : 'Create GL Head'}
                      </button>
                    </div>
                  </StepBox>
                )}

                {!(selectedTypeId && selectedSubTypeId && selectedCategoryId && selectedSubCatId) && (
                  <StepBox locked={true} style={{ borderColor: '#e9d5ff' }}>
                    <StepHeader num="B" title="GL Head Details" subtitle="Complete Step A first" done={false} locked={true} />
                  </StepBox>
                )}

                {/* Hierarchy breadcrumb preview — right panel */}
                {(selectedSubCategory || headName) && (
                  <div style={{ background: '#fdf4ff', borderWidth: '1px', borderStyle: 'solid', borderColor: '#e9d5ff', borderRadius: '6px', padding: '8px 10px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '8px', fontWeight: '700', color: '#9333ea' }}>📐 Code Hierarchy Preview</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      {selectedType        && <span style={{ padding: '2px 7px', background: COLOR, color: 'white', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{selectedType.type_code}</span>}
                      {selectedType        && <ChevronRight size={10} color="#9ca3af" />}
                      {selectedSubCategory && <span style={{ padding: '2px 7px', background: '#fdf4ff', color: '#9333ea', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{selectedSubCategory.sub_category_code}</span>}
                      {selectedSubCategory && headName && <ChevronRight size={10} color="#9ca3af" />}
                      {headName && <span style={{ padding: '2px 7px', background: COLOR_SOFT, color: COLOR, borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{selectedSubCategory?.sub_category_code}-{headName.toUpperCase().replace(/[^A-Z]/g,'').substring(0,4).padEnd(4,'X')}-####</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════ VIEW TAB ══════════════════════════════════════════ */}
          {activeTab === 'view' && (
            <div>
              {/* Filters */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '150px', maxWidth: '220px' }}>
                  <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input style={{ ...S.input, paddingLeft: '26px' }} placeholder="Search…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <select style={{ ...S.input, width: '130px' }} value={filterTypeId} onChange={e => { setFilterTypeId(e.target.value); setFilterSubTypeId(''); setFilterCatId(''); setFilterSubCatId(''); }}>
                  <option value="">All GL Types</option>
                  {glTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
                </select>
                {filterTypeId && (
                  <select style={{ ...S.input, width: '140px' }} value={filterSubTypeId} onChange={e => { setFilterSubTypeId(e.target.value); setFilterCatId(''); setFilterSubCatId(''); }}>
                    <option value="">All Sub-Types</option>
                    {glSubTypes.filter(s => String(s.gl_type_id) === String(filterTypeId)).map(s => <option key={s.id} value={s.id}>{s.sub_type_name}</option>)}
                  </select>
                )}
                {filterTypeId && (
                  <select style={{ ...S.input, width: '140px' }} value={filterCatId} onChange={e => { setFilterCatId(e.target.value); setFilterSubCatId(''); }}>
                    <option value="">All Categories</option>
                    {glCategories.filter(c => String(c.gl_type_id) === String(filterTypeId)).map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                  </select>
                )}
                {filterCatId && (
                  <select style={{ ...S.input, width: '150px' }} value={filterSubCatId} onChange={e => setFilterSubCatId(e.target.value)}>
                    <option value="">All Sub-Categories</option>
                    {glSubCategories.filter(sc => String(sc.gl_category_id) === String(filterCatId)).map(sc => <option key={sc.id} value={sc.id}>{sc.sub_category_name}</option>)}
                  </select>
                )}
                <div style={{ display: 'flex', gap: '3px', marginLeft: 'auto' }}>
                  <button onClick={() => setViewMode('grid')} style={{ padding: '5px 8px', background: viewMode === 'grid' ? COLOR : 'white', border: '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer', color: viewMode === 'grid' ? 'white' : '#374151' }}><Grid size={11} /></button>
                  <button onClick={() => setViewMode('list')} style={{ padding: '5px 8px', background: viewMode === 'list' ? COLOR : 'white', border: '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer', color: viewMode === 'list' ? 'white' : '#374151' }}><List size={11} /></button>
                </div>
              </div>

              {filteredHeads.length === 0
                ? <div style={{ textAlign: 'center', padding: '50px', color: '#9ca3af' }}><Bookmark size={40} style={{ margin: '0 auto 10px', opacity: 0.25 }} /><p style={{ fontSize: '11px' }}>No GL Heads found</p></div>
                : <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill,minmax(280px,1fr))' : '1fr', gap: '8px' }}>
                    {filteredHeads.map(h => <RecordCard key={h.id} item={h} />)}
                  </div>
              }
            </div>
          )}
        </div>

        {/* ── Footer bar ──────────────────────────────────────────────────── */}
        <div style={{ height: '14px', background: `linear-gradient(135deg,${COLOR_MED},${COLOR})`, flexShrink: 0 }} />
      </div>

      {/* ══════════════════ IMPORT SELECTOR MODAL ════════════════════════ */}
      {showGLTypeSelector && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', width: '580px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 14px', background: `linear-gradient(135deg,${COLOR},${COLOR_MED})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: '700' }}>📥 Import GL Heads — Select Hierarchy Context</span>
              <button onClick={() => setShowGLTypeSelector(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><XCircle size={16} /></button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {/* Step A — GL Type */}
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>Step A — GL Type <span style={{ fontWeight: '400', color: '#9ca3af' }}>(optional pre-select)</span></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                {glTypes.map(t => (
                  <button key={t.id} onClick={() => setImpTypeId(p => p === String(t.id) ? '' : String(t.id))} style={{ ...pillBtn(impTypeId === String(t.id)), fontSize: '10px' }}>
                    {t.type_name} <span style={{ fontSize: '8px', opacity: 0.75 }}>({t.type_code})</span>
                  </button>
                ))}
              </div>

              {/* Step B — GL Sub-Type */}
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>Step B — GL Sub-Type <span style={{ fontWeight: '400', color: '#9ca3af' }}>(optional)</span></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                {(impTypeId ? impFilteredSubs : glSubTypes).length === 0
                  ? <span style={{ fontSize: '9px', color: '#9ca3af' }}>{impTypeId ? 'No sub-types' : 'Select GL Type first'}</span>
                  : (impTypeId ? impFilteredSubs : glSubTypes).map(s => (
                    <button key={s.id} onClick={() => setImpSubTypeId(p => p === String(s.id) ? '' : String(s.id))} style={{ ...pillBtn(impSubTypeId === String(s.id)), fontSize: '10px' }}>
                      {s.sub_type_name}
                    </button>
                  ))}
              </div>

              {/* Step C — GL Category */}
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>Step C — GL Category <span style={{ fontWeight: '400', color: '#9ca3af' }}>(optional)</span></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                {(impTypeId ? impFilteredCats : glCategories).length === 0
                  ? <span style={{ fontSize: '9px', color: '#9ca3af' }}>Select GL Type first to filter</span>
                  : (impTypeId ? impFilteredCats : glCategories).map(c => (
                    <button key={c.id} onClick={() => setImpCategoryId(p => p === String(c.id) ? '' : String(c.id))} style={{ ...pillBtn(impCategoryId === String(c.id), '#d97706'), fontSize: '10px' }}>
                      {c.category_name}
                    </button>
                  ))}
              </div>

              {/* Step D — GL Sub-Category */}
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>Step D — GL Sub-Category <span style={{ fontWeight: '400', color: '#9ca3af' }}>(optional)</span></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                {(impCategoryId ? impFilteredSubCats : glSubCategories).length === 0
                  ? <span style={{ fontSize: '9px', color: '#9ca3af' }}>Select GL Category first to filter</span>
                  : (impCategoryId ? impFilteredSubCats : glSubCategories).map(sc => (
                    <button key={sc.id} onClick={() => setImpSubCatId(p => p === String(sc.id) ? '' : String(sc.id))} style={{ ...pillBtn(impSubCatId === String(sc.id), '#9333ea'), fontSize: '10px' }}>
                      {sc.sub_category_name}
                    </button>
                  ))}
              </div>

              {/* Summary */}
              <div style={{ padding: '6px 10px', background: COLOR_SOFT, border: `1px solid ${COLOR_MED}`, borderRadius: '5px', fontSize: '9px', color: COLOR, marginBottom: '14px' }}>
                {impType    ? <span>✓ <strong>{impType.type_name}</strong> </span>    : <span style={{ color: '#9ca3af' }}>No GL Type · </span>}
                {impSubType ? <span>→ <strong>{impSubType.sub_type_name}</strong> </span> : <span style={{ color: '#9ca3af' }}>No Sub-Type · </span>}
                {impCat     ? <span>→ <strong>{impCat.category_name}</strong> </span>     : <span style={{ color: '#9ca3af' }}>No Category · </span>}
                {impSubCat  ? <span>→ <strong>{impSubCat.sub_category_name}</strong></span>  : <span style={{ color: '#9ca3af' }}>No Sub-Category</span>}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <button
                  onClick={() => {
                    setShowGLTypeSelector(false);
                    if (impTypeId)    setSelectedTypeId(impTypeId);
                    if (impSubTypeId) setSelectedSubTypeId(impSubTypeId);
                    else if (impTypeId) setSelectedSubTypeId('__none__');
                    if (impCategoryId) setSelectedCategoryId(impCategoryId);
                    if (impSubCatId)   setSelectedSubCatId(impSubCatId);
                    setActiveTab('create');
                  }}
                  style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', border: '2px solid #e5e7eb', background: 'white', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLOR; e.currentTarget.style.background = COLOR_SOFT; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>✏️</div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#111', marginBottom: '2px' }}>Manual Entry</div>
                  <div style={{ fontSize: '8px', color: '#6b7280' }}>Pre-fills step selections from above choices.</div>
                </button>

                <button
                  onClick={() => { setShowGLTypeSelector(false); setShowImportPopup(true); }}
                  style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', border: '2px solid #e5e7eb', background: 'white', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLOR; e.currentTarget.style.background = COLOR_SOFT; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>📤</div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#111', marginBottom: '2px' }}>Upload Excel Template</div>
                  <div style={{ fontSize: '8px', color: '#6b7280' }}>Bulk import via Excel with pre-selected hierarchy.</div>
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowGLTypeSelector(false)} style={{ padding: '5px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', color: '#374151' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ EXCEL IMPORT POPUP ══════════════════════════ */}
      <ExcelImportPopup
        isOpen={showImportPopup}
        onClose={() => { setShowImportPopup(false); setImpTypeId(''); setImpSubTypeId(''); setImpCategoryId(''); setImpSubCatId(''); }}
        onSuccess={(results) => {
          const cnt = results.filter(r => r.status === 'success').length;
          if (cnt > 0) { setMessage({ type: 'success', text: `✅ ${cnt} GL Head(s) imported from Excel!` }); fetchHeads(); }
        }}
        title={impSubCat
          ? `Import GL Heads — ${impSubCat.sub_category_name}`
          : impCat
          ? `Import GL Heads — ${impCat.category_name}`
          : impType
          ? `Import GL Heads — ${impType.type_name}`
          : 'Import GL Heads from Excel'}
        accentColor={COLOR}
        apiEndpoint={`${API_BASE}/gl-heads`}
        apiMethod="POST"
        fields={[
          { key: 'gl_head_name', label: 'GL Head Name', required: true  },
          { key: 'description',  label: 'Description',  required: false },
        ]}
        templateDropdownFields={templateDropdowns}
        lookupFields={lookupFields}
        extraFormData={extraForm}
        importNote={impSubCat
          ? `All rows imported under Sub-Category: ${impSubCat.sub_category_name}. GL Head Code auto-generated.`
          : 'GL Type, Sub-Type, Category and Sub-Category columns auto-resolve to IDs. Code is always auto-generated.'}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { color: #111; }
      `}</style>
    </div>
  );
}