import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag, Search, Eye, CheckCircle, XCircle, AlertCircle, Loader,
  Grid, List, Plus, Save, Upload, ChevronRight
} from 'lucide-react';
import ExcelImportPopup from '../pages/ExcelImportPopup';

const API_BASE = 'http://localhost:8000/api';

// ─── Shared design tokens ────────────────────────────────────────────────────
const COLOR      = '#7c3aed';
const COLOR_MED  = '#a78bfa';
const COLOR_SOFT = '#ede9fe';

// ─── Inline styles ───────────────────────────────────────────────────────────
const S = {
  input: {
    width: '100%', padding: '6px 8px', border: '1px solid #e0e0e0',
    borderRadius: '4px', fontSize: '10px', boxSizing: 'border-box', color: '#111', outline: 'none',
  },
  label: { display: 'block', fontSize: '9px', fontWeight: '700', marginBottom: '4px', color: '#374151' },
};

// ─── Pill-button style (for step-select buttons) ─────────────────────────────
const pillBtn = (selected, color = COLOR) => ({
  padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
  border: selected ? `2px solid ${color}` : '1px solid #d1d5db',
  background: selected ? color : 'white',
  color: selected ? 'white' : '#374151',
  fontSize: '10px', fontWeight: '600',
  display: 'inline-flex', alignItems: 'center', gap: '4px',
});

// ─── Code badge component (TYPE — SUBTYPE — CATEGORY — SUBCATEGORY) ──────────
function CodeBadge({ parts }) {
  // parts = [{ label, code, color, bg }]
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

// ─── Step header (numbered, dimmed when locked) ──────────────────────────────
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

// ─── Step wrapper (dims + blocks interaction when locked) ────────────────────
function StepBox({ locked, children, style = {} }) {
  return (
    <div style={{
      borderWidth: '1px',
      borderStyle: 'solid',
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

// ─── Auto-generate category code preview (client-side, matches backend logic) ─
// Backend: parent_code-CATX-0001  (parent = sub_type_code or type_code)
// We only show the prefix here; sequence number is assigned by backend.
function buildCategoryCodePreview(glType, glSubType, categoryName) {
  const parentCode = glSubType?.sub_type_code || glType?.type_code || '';
  if (!categoryName || !parentCode) return '';
  const alpha = categoryName.toUpperCase().replace(/[^A-Z]/g, '');
  const base = (alpha.substring(0, 4)).padEnd(4, 'X');
  return `${parentCode}-${base}-####`;
}

function buildSubCategoryCodePreview(category, subCategoryName) {
  const parentCode = category?.category_code || '';
  if (!subCategoryName || !parentCode) return '';
  const alpha = subCategoryName.toUpperCase().replace(/[^A-Z]/g, '');
  const base = (alpha.substring(0, 4)).padEnd(4, 'X');
  return `${parentCode}-${base}-####`;
}

// ─── View card ───────────────────────────────────────────────────────────────
function RecordCard({ item, type }) {
  const titleMap = {
    category:    item.category_name,
    subCategory: item.sub_category_name,
  };
  const codeMap = {
    category:    item.category_code,
    subCategory: item.sub_category_code,
  };
  return (
    <div
      style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '12px', transition: 'all 0.2s', cursor: 'default' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.15)'; e.currentTarget.style.borderColor = COLOR; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e0e0e0'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: '700', color: '#111' }}>{titleMap[type]}</h4>
          <p style={{ margin: '0 0 4px', fontSize: '8px', color: '#6b7280', fontFamily: 'monospace' }}>{codeMap[type]}</p>
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
            {item.category_name && type === 'subCategory' && (
              <span style={{ padding: '1px 6px', background: '#fff7ed', color: '#d97706', borderRadius: '10px', fontSize: '8px', fontWeight: '700' }}>
                {item.category_code} · {item.category_name}
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
export default function AddGLCategory() {
  const [loading, setLoading]           = useState(false);
  const [message, setMessage]           = useState(null);
  const [currentUser, setCurrentUser]   = useState(null);

  // ── Master data ────────────────────────────────────────────────────────────
  const [glTypes,             setGlTypes]             = useState([]);
  const [glSubTypes,          setGlSubTypes]          = useState([]);
  const [glCategories,        setGlCategories]        = useState([]);
  const [glSubCategories,     setGlSubCategories]     = useState([]);

  // ── Active tab ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('create');

  // ══════════════════════════════════════════════════════════════════════════
  // CREATE FORM  — 4-step animated flow
  //   STEP 1: Select GL Type      → pill buttons (only one visible at a time)
  //   STEP 2: Select GL Sub-Type  → pill buttons (filtered by step-1 choice)
  //   STEP 3: Category Details    → name, description, code preview
  //   STEP 4: Sub-Category        → select category + name, description, code preview
  // ══════════════════════════════════════════════════════════════════════════

  // Step 1
  const [selectedTypeId,    setSelectedTypeId]    = useState('');
  // Step 2
  const [selectedSubTypeId, setSelectedSubTypeId] = useState('');
  // Step 3
  const [categoryName,      setCategoryName]      = useState('');
  const [categoryDesc,      setCategoryDesc]      = useState('');
  // Step 4 — sub-category (right panel has its own independent progressive flow)
  const [subCatTypeId,      setSubCatTypeId]      = useState(""); // right panel: GL Type
  const [subCatSubTypeId,   setSubCatSubTypeId]   = useState(""); // right panel: GL Sub-Type
  const [subCatCategoryId,  setSubCatCategoryId]  = useState(""); // which GL Category
  const [subCategoryName,   setSubCategoryName]   = useState("");
  const [subCategoryDesc,   setSubCategoryDesc]   = useState("");

  // ── Derived helpers ───────────────────────────────────────────────────────
  const selectedType    = glTypes.find(t => String(t.id) === String(selectedTypeId))    || null;
  // "__none__" sentinel means user explicitly chose "None" for sub-type
  const realSubTypeId   = selectedSubTypeId === "__none__" ? "" : selectedSubTypeId;
  const selectedSubType = glSubTypes.find(s => String(s.id) === String(realSubTypeId)) || null;
  const filteredSubTypes = glSubTypes.filter(s => String(s.gl_type_id) === String(selectedTypeId));


  const categoryCodePreview    = buildCategoryCodePreview(selectedType, selectedSubType, categoryName);

  // ── RIGHT PANEL: Sub-Category independent derived helpers ─────────────────
  const subCatSelectedType    = glTypes.find(t => String(t.id) === String(subCatTypeId)) || null;
  const realSubCatSubTypeId   = subCatSubTypeId === '__none__' ? '' : subCatSubTypeId;
  const subCatSelectedSubType = glSubTypes.find(s => String(s.id) === String(realSubCatSubTypeId)) || null;
  const subCatFilteredSubTypes = glSubTypes.filter(s => String(s.gl_type_id) === String(subCatTypeId));
  const subCatFilteredCats = glCategories.filter(c => {
    if (!subCatTypeId) return false;
    if (String(c.gl_type_id) !== String(subCatTypeId)) return false;
    if (realSubCatSubTypeId && c.gl_sub_type_id && String(c.gl_sub_type_id) !== String(realSubCatSubTypeId)) return false;
    return true;
  });
  const subCatParent           = glCategories.find(c => String(c.id) === String(subCatCategoryId)) || null;
  const subCategoryCodePreview = buildSubCategoryCodePreview(subCatParent, subCategoryName);

  // ── VIEW tab state ────────────────────────────────────────────────────────
  const [viewMode,         setViewMode]         = useState('grid');
  const [searchTerm,       setSearchTerm]       = useState('');
  const [filterTypeId,     setFilterTypeId]     = useState('');
  const [filterSubTypeId,  setFilterSubTypeId]  = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [viewSubTab,       setViewSubTab]       = useState('categories'); // 'categories' | 'sub_categories'

  // ── IMPORT state ──────────────────────────────────────────────────────────
  const [showImportPopup,    setShowImportPopup]    = useState(false);
  const [showGLTypeSelector, setShowGLTypeSelector] = useState(false);
  const [importTarget,       setImportTarget]       = useState('category'); // 'category' | 'sub_category'

  // import modal context (pre-selected type / subtype / category)
  const [impTypeId,       setImpTypeId]       = useState('');
  const [impSubTypeId,    setImpSubTypeId]    = useState('');
  const [impCategoryId,   setImpCategoryId]   = useState('');
  const [impFilteredSubs, setImpFilteredSubs] = useState([]);
  const [impFilteredCats, setImpFilteredCats] = useState([]);

  // ─── API helpers ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    await Promise.all([fetchGLTypes(), fetchGLSubTypes(), fetchCategories(), fetchSubCategories()]);
  }, []);

  // ─── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem('userData');
    if (raw) {
      try { setCurrentUser(JSON.parse(raw).user); } catch { /* ignore */ }
    }
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (impTypeId) {
      setImpFilteredSubs(glSubTypes.filter(s => String(s.gl_type_id) === String(impTypeId)));
      setImpFilteredCats(glCategories.filter(c => String(c.gl_type_id) === String(impTypeId)));
    } else {
      setImpFilteredSubs([]);
      setImpFilteredCats([]);
    }
    setImpSubTypeId('');
    setImpCategoryId('');
  }, [impTypeId, glSubTypes, glCategories]);

  useEffect(() => {
    if (impSubTypeId) {
      setImpFilteredCats(glCategories.filter(c => String(c.gl_sub_type_id) === String(impSubTypeId)));
    } else if (impTypeId) {
      setImpFilteredCats(glCategories.filter(c => String(c.gl_type_id) === String(impTypeId)));
    }
    setImpCategoryId('');
  }, [impSubTypeId, glCategories, impTypeId]);

  const fetchGLTypes = async () => {
    try { const r = await fetch(`${API_BASE}/gl-types?is_active=true`); setGlTypes(await r.json() || []); } catch { /* ignore */ }
  };
  const fetchGLSubTypes = async () => {
    try { const r = await fetch(`${API_BASE}/gl-sub-types`); setGlSubTypes(await r.json() || []); } catch { /* ignore */ }
  };
  const fetchCategories = async () => {
    try { const r = await fetch(`${API_BASE}/gl-categories`); setGlCategories(await r.json() || []); } catch { /* ignore */ }
  };
  const fetchSubCategories = async () => {
    try { const r = await fetch(`${API_BASE}/gl-sub-categories`); setGlSubCategories(await r.json() || []); } catch { /* ignore */ }
  };

  // ─── Create Category ──────────────────────────────────────────────────────
  const handleCreateCategory = async () => {
    if (!selectedTypeId)      { setMessage({ type: 'error', text: 'Please select a GL Type (Step 1).' }); return; }
    if (!categoryName.trim()) { setMessage({ type: 'error', text: 'Category name is required (Step 3).' }); return; }

    setLoading(true);
    const fd = new FormData();
    fd.append('category_name', categoryName.trim());
    fd.append('gl_type_id', selectedTypeId);
    if (realSubTypeId) fd.append('gl_sub_type_id', realSubTypeId);
    if (categoryDesc.trim()) fd.append('description', categoryDesc.trim());
    fd.append('user_id', currentUser.id);

    try {
      const res  = await fetch(`${API_BASE}/gl-categories`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `✅ GL Category "${data.category_name}" created — Code: ${data.category_code}` });
        setCategoryName(''); setCategoryDesc('');
        await fetchCategories();
        // Auto-pre-fill right panel for sub-category step
        if (selectedTypeId) setSubCatTypeId(selectedTypeId);
        setSubCatSubTypeId(realSubTypeId || '__none__');
        setSubCatCategoryId(String(data.id));
      } else {
        setMessage({ type: 'error', text: typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail) });
      }
    } catch { setMessage({ type: 'error', text: 'Network error while creating category.' }); }
    finally { setLoading(false); }
  };

  // ─── Create Sub-Category ─────────────────────────────────────────────────
  const handleCreateSubCategory = async () => {
    if (!subCatCategoryId)      { setMessage({ type: 'error', text: 'Please select a GL Category for this sub-category.' }); return; }
    if (!subCategoryName.trim()) { setMessage({ type: 'error', text: 'Sub-Category name is required.' }); return; }

    setLoading(true);
    const fd = new FormData();
    fd.append('sub_category_name', subCategoryName.trim());
    fd.append('gl_category_id',    subCatCategoryId);
    fd.append('gl_type_id',        subCatTypeId || String(subCatParent?.gl_type_id || ''));
    if (realSubCatSubTypeId || subCatParent?.gl_sub_type_id)
      fd.append('gl_sub_type_id', realSubCatSubTypeId || String(subCatParent?.gl_sub_type_id));
    if (subCategoryDesc.trim()) fd.append('description', subCategoryDesc.trim());
    fd.append('user_id', currentUser.id);

    try {
      const res  = await fetch(`${API_BASE}/gl-sub-categories`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `✅ GL Sub-Category "${data.sub_category_name}" created — Code: ${data.sub_category_code}` });
        setSubCategoryName(''); setSubCategoryDesc('');
        await fetchSubCategories();
      } else {
        setMessage({ type: 'error', text: typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail) });
      }
    } catch { setMessage({ type: 'error', text: 'Network error while creating sub-category.' }); }
    finally { setLoading(false); }
  };

  // ─── Reset entire form ────────────────────────────────────────────────────
  const handleReset = () => {
    setSelectedTypeId(''); setSelectedSubTypeId('');
    setCategoryName(''); setCategoryDesc('');
    setSubCatTypeId(''); setSubCatSubTypeId('');
    setSubCatCategoryId(''); setSubCategoryName(''); setSubCategoryDesc('');
    setMessage(null);
  };

  // ─── Filtered records for View tab ───────────────────────────────────────
  const filteredCats = glCategories.filter(c => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || c.category_name.toLowerCase().includes(q) || c.category_code.toLowerCase().includes(q) || (c.gl_type_name||'').toLowerCase().includes(q);
    const matchType   = !filterTypeId    || String(c.gl_type_id)    === String(filterTypeId);
    const matchSub    = !filterSubTypeId || String(c.gl_sub_type_id) === String(filterSubTypeId);
    return matchSearch && matchType && matchSub;
  });

  const filteredSubCats = glSubCategories.filter(c => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || c.sub_category_name.toLowerCase().includes(q) || c.sub_category_code.toLowerCase().includes(q);
    const matchType   = !filterTypeId     || String(c.gl_type_id)     === String(filterTypeId);
    const matchSub    = !filterSubTypeId  || String(c.gl_sub_type_id)  === String(filterSubTypeId);
    const matchCat    = !filterCategoryId || String(c.gl_category_id)  === String(filterCategoryId);
    return matchSearch && matchType && matchSub && matchCat;
  });

  // ─── Import popup computed values ─────────────────────────────────────────
  const impType    = glTypes.find(t => String(t.id) === String(impTypeId));
  const impSubType = glSubTypes.find(s => String(s.id) === String(impSubTypeId));
  const impCat     = glCategories.find(c => String(c.id) === String(impCategoryId));

  const categoryTemplateDropdowns = (() => {
    const dd = [];
    if (!impTypeId)    dd.push({ key: 'gl_type_id',     label: 'GL Type',     options: glTypes.map(t => ({ label: t.type_name,     value: t.id })) });
    if (!impSubTypeId) dd.push({ key: 'gl_sub_type_id', label: 'GL Sub-Type', options: (impTypeId ? impFilteredSubs : glSubTypes).map(s => ({ label: s.sub_type_name, value: s.id })) });
    return dd;
  })();

  const subCatTemplateDropdowns = (() => {
    const dd = [];
    if (!impTypeId)     dd.push({ key: 'gl_type_id',     label: 'GL Type',     options: glTypes.map(t => ({ label: t.type_name,     value: t.id })) });
    if (!impSubTypeId)  dd.push({ key: 'gl_sub_type_id', label: 'GL Sub-Type', options: (impTypeId ? impFilteredSubs : glSubTypes).map(s => ({ label: s.sub_type_name, value: s.id })) });
    if (!impCategoryId) dd.push({ key: 'gl_category_id', label: 'GL Category', options: (impTypeId ? impFilteredCats : glCategories).map(c => ({ label: c.category_name, value: c.id })) });
    return dd;
  })();

  const categoryLookupFields = (() => {
    const lf = [];
    if (!impTypeId)    lf.push({ key: 'gl_type_id',     label: 'GL Type',     data: glTypes,      matchKey: 'type_name',     valueKey: 'id', caseSensitive: false });
    if (!impSubTypeId) lf.push({ key: 'gl_sub_type_id', label: 'GL Sub-Type', data: glSubTypes,   matchKey: 'sub_type_name', valueKey: 'id', caseSensitive: false });
    return lf;
  })();

  const subCatLookupFields = (() => {
    const lf = [];
    if (!impTypeId)     lf.push({ key: 'gl_type_id',     label: 'GL Type',     data: glTypes,       matchKey: 'type_name',     valueKey: 'id', caseSensitive: false });
    if (!impSubTypeId)  lf.push({ key: 'gl_sub_type_id', label: 'GL Sub-Type', data: glSubTypes,    matchKey: 'sub_type_name', valueKey: 'id', caseSensitive: false });
    if (!impCategoryId) lf.push({ key: 'gl_category_id', label: 'GL Category', data: glCategories, matchKey: 'category_name', valueKey: 'id', caseSensitive: false });
    return lf;
  })();

  const categoryExtraForm = {};
  if (impTypeId)    categoryExtraForm.gl_type_id    = impTypeId;
  if (impSubTypeId) categoryExtraForm.gl_sub_type_id = impSubTypeId;

  const subCatExtraForm = {};
  if (impTypeId)     subCatExtraForm.gl_type_id     = impTypeId;
  if (impSubTypeId)  subCatExtraForm.gl_sub_type_id  = impSubTypeId;
  if (impCategoryId) subCatExtraForm.gl_category_id  = impCategoryId;

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ width: '95%', maxWidth: '1200px', height: '90%', maxHeight: '760px', background: 'white', borderRadius: '10px', boxShadow: '0 6px 32px rgba(124,58,237,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '0 14px', height: '34px', background: `linear-gradient(135deg,${COLOR},${COLOR_MED})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={14} />
            <span style={{ fontWeight: '700', fontSize: '12px' }}>🏷️ GL Category &amp; Sub-Category Management ( Reporting Head / Line Item  & Sub-line Item / Break-up / Schedule Head )</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => { setImpTypeId(''); setImpSubTypeId(''); setImpCategoryId(''); setImportTarget('category'); setShowGLTypeSelector(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 9px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', color: 'white', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
            >
              <Upload size={10} /> Import Categories
            </button>
            <button
              onClick={() => { setImpTypeId(''); setImpSubTypeId(''); setImpCategoryId(''); setImportTarget('sub_category'); setShowGLTypeSelector(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 9px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', color: 'white', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
            >
              <Upload size={10} /> Import Sub-Categories
            </button>
          </div>
        </div>

        {/* ── Message ────────────────────────────────────────────────────── */}
        {message && (
          <div style={{ margin: '6px 12px 0', padding: '5px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, background: message.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}` }}>
            {message.type === 'success' ? <CheckCircle size={12} color="#16a34a" /> : <AlertCircle size={12} color="#dc2626" />}
            <span style={{ fontSize: '10px', color: '#111', fontWeight: '500', flex: 1 }}>{message.text}</span>
            <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={12} color="#9ca3af" /></button>
          </div>
        )}

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', background: '#f9fafb', flexShrink: 0 }}>
          {[
            { key: 'create', label: '+ Create',       icon: <Plus size={11} /> },
            { key: 'view',   label: `👁 View (${glCategories.length} cats / ${glSubCategories.length} sub-cats)`, icon: <Eye size={11} /> },
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

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>

          {/* ════════════════════ CREATE TAB ══════════════════════════════ */}
          {activeTab === 'create' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%' }}>

              {/* ── LEFT: GL Category — progressive step flow ───────────── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <Tag size={13} color={COLOR} />
                  <span style={{ fontWeight: '800', fontSize: '12px', color: COLOR }}>GL Category</span>
                  <span style={{ fontSize: '9px', color: '#9ca3af' }}>— Steps 1–3</span>
                </div>

                {/* STEP 1 — GL Type: hide once selected, show summary chip instead */}
                {!selectedTypeId ? (
                  <StepBox locked={false}>
                    <StepHeader num="1" title="Select GL Type" subtitle="Required — unlocks steps below" done={false} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {glTypes.length === 0
                        ? <span style={{ fontSize: '9px', color: '#9ca3af' }}>Loading…</span>
                        : glTypes.map(t => (
                          <button key={t.id} onClick={() => { setSelectedTypeId(String(t.id)); setSelectedSubTypeId(''); setCategoryName(''); setCategoryDesc(''); setSubCatCategoryId(''); setSubCategoryName(''); setSubCategoryDesc(''); }} style={pillBtn(false)}>
                            <span style={{ fontFamily: 'monospace', fontSize: '8px', opacity: 0.8 }}>{t.type_code}</span>
                            {t.type_name}
                          </button>
                        ))}
                    </div>
                  </StepBox>
                ) : (
                  /* Compact selected-type banner with change button */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '6px 10px', background: COLOR_SOFT, borderWidth: '1px', borderStyle: 'solid', borderColor: COLOR_MED, borderRadius: '8px' }}>
                    <CheckCircle size={13} color={COLOR} />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: COLOR, flex: 1 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '9px', marginRight: '4px', opacity: 0.75 }}>{selectedType?.type_code}</span>
                      {selectedType?.type_name}
                    </span>
                    <button onClick={() => { setSelectedTypeId(''); setSelectedSubTypeId(''); setCategoryName(''); setCategoryDesc(''); setSubCatCategoryId(''); setSubCategoryName(''); setSubCategoryDesc(''); }} style={{ fontSize: '9px', color: COLOR, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>Change</button>
                  </div>
                )}

                {/* STEP 2 — GL Sub-Type: shown after type selected, hide once sub-type chosen */}
                {selectedTypeId && !selectedSubTypeId && (
                  <StepBox locked={false}>
                    <StepHeader num="2" title="Select GL Sub-Type" subtitle="Optional — refines code hierarchy" done={false} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <button onClick={() => setSelectedSubTypeId('__none__')} style={{ ...pillBtn(false, '#6b7280'), borderWidth: '1px', borderStyle: 'solid', borderColor: '#d1d5db' }}>
                        None
                      </button>
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

                {/* Compact selected-subtype banner (shown after sub-type chosen) */}
                {selectedTypeId && selectedSubTypeId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '6px 10px', background: '#f0fdf4', borderWidth: '1px', borderStyle: 'solid', borderColor: '#86efac', borderRadius: '8px' }}>
                    <CheckCircle size={13} color="#16a34a" />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', flex: 1 }}>
                      {selectedSubTypeId === '__none__' ? 'No Sub-Type' : (
                        <>
                          <span style={{ fontFamily: 'monospace', fontSize: '9px', marginRight: '4px', opacity: 0.75 }}>{selectedSubType?.sub_type_code?.split('-').slice(-2).join('-')}</span>
                          {selectedSubType?.sub_type_name}
                        </>
                      )}
                    </span>
                    <button onClick={() => setSelectedSubTypeId('')} style={{ fontSize: '9px', color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>Change</button>
                  </div>
                )}

                {/* STEP 3 — Category Details: shown after type + subtype both decided */}
                {selectedTypeId && selectedSubTypeId && (
                  <StepBox locked={false}>
                    <StepHeader num="3" title="Category Details" subtitle="Name, description — code is auto-generated" done={!!categoryName.trim()} />

                    {categoryCodePreview && (
                      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '9px', color: '#6b7280' }}>Auto code preview:</span>
                        <CodeBadge parts={[
                          { code: selectedType?.type_code, bg: COLOR, color: 'white' },
                          { code: selectedSubTypeId !== '__none__' ? selectedSubType?.sub_type_code?.split('-').slice(-2).join('-') : null, bg: '#d1fae5', color: '#065f46' },
                          { code: categoryName ? (categoryName.toUpperCase().replace(/[^A-Z]/g,'').substring(0,4).padEnd(4,'X') + '-####') : null, bg: COLOR_SOFT, color: COLOR },
                        ]} />
                      </div>
                    )}

                    <div style={{ marginBottom: '8px' }}>
                      <label style={S.label}>Category Name <span style={{ color: '#dc2626' }}>*</span></label>
                      <input style={S.input} value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="e.g. Inventory, Sales, Tax" />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={S.label}>Description (Optional)</label>
                      <textarea style={{ ...S.input, minHeight: '52px', resize: 'vertical' }} value={categoryDesc} onChange={e => setCategoryDesc(e.target.value)} placeholder="Brief description of this GL category" />
                    </div>

                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button onClick={handleReset} style={{ padding: '5px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', color: '#374151' }}>
                        Reset
                      </button>
                      <button onClick={handleCreateCategory} disabled={loading || !selectedTypeId || !categoryName.trim()} style={{ padding: '5px 16px', background: (loading || !selectedTypeId || !categoryName.trim()) ? '#d1d5db' : `linear-gradient(135deg,${COLOR},${COLOR_MED})`, border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '700', cursor: (loading || !selectedTypeId || !categoryName.trim()) ? 'not-allowed' : 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {loading ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={11} />}
                        {loading ? 'Creating…' : 'Create GL Category'}
                      </button>
                    </div>
                  </StepBox>
                )}
              </div>

              {/* ── RIGHT: Sub-Category — same progressive flow as left ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <Tag size={13} color="#d97706" />
                  <span style={{ fontWeight: '800', fontSize: '12px', color: '#d97706' }}>GL Sub-Category</span>
                  <span style={{ fontSize: '9px', color: '#9ca3af' }}>— Steps A–D</span>
                </div>

                {/* STEP A — GL Type */}
                {!subCatTypeId ? (
                  <StepBox locked={false} style={{ borderColor: '#fed7aa' }}>
                    <StepHeader num="A" title="Select GL Type" subtitle="Required — filter categories below" done={false} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {glTypes.length === 0
                        ? <span style={{ fontSize: '9px', color: '#9ca3af' }}>Loading…</span>
                        : glTypes.map(t => (
                          <button key={t.id} onClick={() => { setSubCatTypeId(String(t.id)); setSubCatSubTypeId(''); setSubCatCategoryId(''); setSubCategoryName(''); setSubCategoryDesc(''); }} style={pillBtn(false, '#d97706')}>
                            <span style={{ fontFamily: 'monospace', fontSize: '8px', opacity: 0.8 }}>{t.type_code}</span>
                            {t.type_name}
                          </button>
                        ))}
                    </div>
                  </StepBox>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '6px 10px', background: '#fff7ed', borderWidth: '1px', borderStyle: 'solid', borderColor: '#fed7aa', borderRadius: '8px' }}>
                    <CheckCircle size={13} color="#d97706" />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#d97706', flex: 1 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '9px', marginRight: '4px', opacity: 0.75 }}>{subCatSelectedType?.type_code}</span>
                      {subCatSelectedType?.type_name}
                    </span>
                    <button onClick={() => { setSubCatTypeId(''); setSubCatSubTypeId(''); setSubCatCategoryId(''); setSubCategoryName(''); setSubCategoryDesc(''); }} style={{ fontSize: '9px', color: '#d97706', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>Change</button>
                  </div>
                )}

                {/* STEP B — GL Sub-Type */}
                {subCatTypeId && !subCatSubTypeId && (
                  <StepBox locked={false} style={{ borderColor: '#fed7aa', background: '#fff7ed' }}>
                    <StepHeader num="B" title="Select GL Sub-Type" subtitle="Optional — refines category filter" done={false} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <button onClick={() => setSubCatSubTypeId('__none__')} style={{ ...pillBtn(false, '#6b7280'), borderWidth: '1px', borderStyle: 'solid', borderColor: '#d1d5db' }}>
                        None
                      </button>
                      {subCatFilteredSubTypes.length === 0
                        ? <span style={{ fontSize: '9px', color: '#9ca3af', alignSelf: 'center' }}>No sub-types for this GL Type</span>
                        : subCatFilteredSubTypes.map(s => (
                          <button key={s.id} onClick={() => setSubCatSubTypeId(String(s.id))} style={pillBtn(false, '#d97706')}>
                            <span style={{ fontFamily: 'monospace', fontSize: '8px', opacity: 0.8 }}>{s.sub_type_code?.split('-').slice(-2).join('-')}</span>
                            {s.sub_type_name}
                          </button>
                        ))}
                    </div>
                  </StepBox>
                )}

                {/* Compact sub-type banner */}
                {subCatTypeId && subCatSubTypeId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '6px 10px', background: '#f0fdf4', borderWidth: '1px', borderStyle: 'solid', borderColor: '#86efac', borderRadius: '8px' }}>
                    <CheckCircle size={13} color="#16a34a" />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', flex: 1 }}>
                      {subCatSubTypeId === '__none__' ? 'No Sub-Type' : (
                        <>
                          <span style={{ fontFamily: 'monospace', fontSize: '9px', marginRight: '4px', opacity: 0.75 }}>{subCatSelectedSubType?.sub_type_code?.split('-').slice(-2).join('-')}</span>
                          {subCatSelectedSubType?.sub_type_name}
                        </>
                      )}
                    </span>
                    <button onClick={() => { setSubCatSubTypeId(''); setSubCatCategoryId(''); }} style={{ fontSize: '9px', color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>Change</button>
                  </div>
                )}

                {/* STEP C — Select Parent Category (shown after type + subtype decided) */}
                {subCatTypeId && subCatSubTypeId && !subCatCategoryId && (
                  <StepBox locked={false} style={{ borderColor: '#fed7aa', background: '#fff7ed' }}>
                    <StepHeader num="C" title="Select Parent GL Category" subtitle="Which category does this sub-category belong to?" done={false} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '100px', overflowY: 'auto' }}>
                      {subCatFilteredCats.length === 0
                        ? <span style={{ fontSize: '9px', color: '#9ca3af' }}>
                            No categories for this GL Type — create one first (left panel).
                          </span>
                        : subCatFilteredCats.map(c => (
                          <button key={c.id} onClick={() => setSubCatCategoryId(String(c.id))} style={pillBtn(false, '#d97706')}>
                            <span style={{ fontFamily: 'monospace', fontSize: '8px', opacity: 0.8 }}>{c.category_code?.split('-').slice(-2).join('-')}</span>
                            {c.category_name}
                          </button>
                        ))}
                    </div>
                  </StepBox>
                )}

                {/* Compact category banner */}
                {subCatTypeId && subCatSubTypeId && subCatCategoryId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '6px 10px', background: '#fff7ed', borderWidth: '1px', borderStyle: 'solid', borderColor: '#fbbf24', borderRadius: '8px' }}>
                    <CheckCircle size={13} color="#d97706" />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#d97706', flex: 1 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '9px', marginRight: '4px', opacity: 0.75 }}>{subCatParent?.category_code?.split('-').slice(-2).join('-')}</span>
                      {subCatParent?.category_name}
                    </span>
                    <button onClick={() => setSubCatCategoryId('')} style={{ fontSize: '9px', color: '#d97706', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>Change</button>
                  </div>
                )}

                {/* STEP D — Sub-Category Details (shown after all 3 decided) */}
                {subCatTypeId && subCatSubTypeId && subCatCategoryId && (
                  <StepBox locked={false} style={{ borderColor: '#fed7aa', background: '#fffbeb' }}>
                    <StepHeader num="D" title="Sub-Category Details" subtitle="Name, description — code auto-generated" done={!!subCategoryName.trim()} />

                    {subCategoryCodePreview && (
                      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '9px', color: '#6b7280' }}>Auto code preview:</span>
                        <CodeBadge parts={[
                          { code: subCatParent?.category_code, bg: '#fef3c7', color: '#b45309' },
                          { code: subCategoryName ? (subCategoryName.toUpperCase().replace(/[^A-Z]/g,'').substring(0,4).padEnd(4,'X') + '-####') : null, bg: '#fff7ed', color: '#d97706' },
                        ]} />
                      </div>
                    )}

                    <div style={{ marginBottom: '8px' }}>
                      <label style={S.label}>Sub-Category Name <span style={{ color: '#dc2626' }}>*</span></label>
                      <input style={S.input} value={subCategoryName} onChange={e => setSubCategoryName(e.target.value)} placeholder="e.g. Raw Material, Finished Goods" />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={S.label}>Description (Optional)</label>
                      <textarea style={{ ...S.input, minHeight: '52px', resize: 'vertical' }} value={subCategoryDesc} onChange={e => setSubCategoryDesc(e.target.value)} placeholder="Brief description of this sub-category" />
                    </div>

                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button onClick={() => { setSubCategoryName(''); setSubCategoryDesc(''); }} style={{ padding: '5px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', color: '#374151' }}>
                        Clear
                      </button>
                      <button onClick={handleCreateSubCategory} disabled={loading || !subCatCategoryId || !subCategoryName.trim()} style={{ padding: '5px 16px', background: (loading || !subCatCategoryId || !subCategoryName.trim()) ? '#d1d5db' : 'linear-gradient(135deg,#d97706,#fbbf24)', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '700', cursor: (loading || !subCatCategoryId || !subCategoryName.trim()) ? 'not-allowed' : 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {loading ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={11} />}
                        {loading ? 'Creating…' : 'Create Sub-Category'}
                      </button>
                    </div>
                  </StepBox>
                )}

                {/* Hierarchy breadcrumb preview */}
                {(subCatSelectedType || subCatParent || subCategoryName) && (
                  <div style={{ background: '#fff7ed', borderWidth: '1px', borderStyle: 'solid', borderColor: '#fed7aa', borderRadius: '6px', padding: '8px 10px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '8px', fontWeight: '700', color: '#d97706' }}>📐 Code Hierarchy Preview</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      {subCatSelectedType && <span style={{ padding: '2px 7px', background: '#d97706', color: 'white', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{subCatSelectedType.type_code}</span>}
                      {subCatSelectedType && <ChevronRight size={10} color="#9ca3af" />}
                      {subCatSelectedSubType && <span style={{ padding: '2px 7px', background: '#d1fae5', color: '#065f46', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{subCatSelectedSubType.sub_type_code}</span>}
                      {subCatSelectedSubType && <ChevronRight size={10} color="#9ca3af" />}
                      {subCatParent && <span style={{ padding: '2px 7px', background: '#fef3c7', color: '#b45309', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{subCatParent.category_code}</span>}
                      {subCatParent && subCategoryName && <ChevronRight size={10} color="#9ca3af" />}
                      {subCategoryName && <span style={{ padding: '2px 7px', background: '#fff7ed', color: '#d97706', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{subCatParent?.category_code}-{subCategoryName.toUpperCase().replace(/[^A-Z]/g,'').substring(0,4).padEnd(4,'X')}-####</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════ VIEW TAB ════════════════════════════════ */}
          {activeTab === 'view' && (
            <div>
              {/* Sub-tab toggle */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {[
                  { key: 'categories',     label: `GL Categories (${glCategories.length})` },
                  { key: 'sub_categories', label: `GL Sub-Categories (${glSubCategories.length})` },
                ].map(t => (
                  <button key={t.key} onClick={() => setViewSubTab(t.key)} style={{ padding: '4px 12px', borderRadius: '99px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', border: viewSubTab === t.key ? `2px solid ${COLOR}` : '1px solid #d1d5db', background: viewSubTab === t.key ? COLOR : 'white', color: viewSubTab === t.key ? 'white' : '#374151', transition: 'all 0.15s' }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '150px', maxWidth: '220px' }}>
                  <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input style={{ ...S.input, paddingLeft: '26px' }} placeholder="Search…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <select style={{ ...S.input, width: '140px' }} value={filterTypeId} onChange={e => { setFilterTypeId(e.target.value); setFilterSubTypeId(''); setFilterCategoryId(''); }}>
                  <option value="">All GL Types</option>
                  {glTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
                </select>
                {filterTypeId && (
                  <select style={{ ...S.input, width: '160px' }} value={filterSubTypeId} onChange={e => { setFilterSubTypeId(e.target.value); setFilterCategoryId(''); }}>
                    <option value="">All Sub-Types</option>
                    {glSubTypes.filter(s => String(s.gl_type_id) === String(filterTypeId)).map(s => <option key={s.id} value={s.id}>{s.sub_type_name}</option>)}
                  </select>
                )}
                {viewSubTab === 'sub_categories' && filterTypeId && (
                  <select style={{ ...S.input, width: '160px' }} value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)}>
                    <option value="">All Categories</option>
                    {glCategories.filter(c => String(c.gl_type_id) === String(filterTypeId)).map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                  </select>
                )}
                <div style={{ display: 'flex', gap: '3px', marginLeft: 'auto' }}>
                  <button onClick={() => setViewMode('grid')} style={{ padding: '5px 8px', background: viewMode === 'grid' ? COLOR : 'white', border: '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer', color: viewMode === 'grid' ? 'white' : '#374151' }}><Grid size={11} /></button>
                  <button onClick={() => setViewMode('list')} style={{ padding: '5px 8px', background: viewMode === 'list' ? COLOR : 'white', border: '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer', color: viewMode === 'list' ? 'white' : '#374151' }}><List size={11} /></button>
                </div>
              </div>

              {/* Records grid */}
              {viewSubTab === 'categories' && (
                filteredCats.length === 0
                  ? <div style={{ textAlign: 'center', padding: '50px', color: '#9ca3af' }}><Tag size={40} style={{ margin: '0 auto 10px', opacity: 0.25 }} /><p style={{ fontSize: '11px' }}>No GL Categories found</p></div>
                  : <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill,minmax(260px,1fr))' : '1fr', gap: '8px' }}>
                      {filteredCats.map(c => <RecordCard key={c.id} item={c} type="category" />)}
                    </div>
              )}

              {viewSubTab === 'sub_categories' && (
                filteredSubCats.length === 0
                  ? <div style={{ textAlign: 'center', padding: '50px', color: '#9ca3af' }}><Tag size={40} style={{ margin: '0 auto 10px', opacity: 0.25 }} /><p style={{ fontSize: '11px' }}>No GL Sub-Categories found</p></div>
                  : <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill,minmax(260px,1fr))' : '1fr', gap: '8px' }}>
                      {filteredSubCats.map(c => <RecordCard key={c.id} item={c} type="subCategory" />)}
                    </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer bar ─────────────────────────────────────────────────── */}
        <div style={{ height: '14px', background: `linear-gradient(135deg,${COLOR_MED},${COLOR})`, flexShrink: 0 }} />
      </div>

      {/* ══════════════════ IMPORT SELECTOR MODAL ════════════════════════ */}
      {showGLTypeSelector && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', width: '580px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Modal header */}
            <div style={{ padding: '10px 14px', background: `linear-gradient(135deg,${COLOR},${COLOR_MED})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: '700' }}>
                📥 Import {importTarget === 'category' ? 'GL Categories' : 'GL Sub-Categories'}
              </span>
              <button onClick={() => setShowGLTypeSelector(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                <XCircle size={16} />
              </button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>

              {/* Step A — GL Type */}
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>
                Step A — Select GL Type <span style={{ fontWeight: '400', color: '#9ca3af' }}>(optional)</span>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                {glTypes.map(t => (
                  <button key={t.id} onClick={() => setImpTypeId(p => p === String(t.id) ? '' : String(t.id))} style={{ ...pillBtn(impTypeId === String(t.id)), fontSize: '10px' }}>
                    {t.type_name}
                    <span style={{ fontSize: '8px', opacity: 0.75 }}>({t.type_code})</span>
                  </button>
                ))}
              </div>

              {/* Step B — GL Sub-Type */}
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>
                Step B — Select GL Sub-Type <span style={{ fontWeight: '400', color: '#9ca3af' }}>(optional)</span>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                {(impTypeId ? impFilteredSubs : glSubTypes).length === 0
                  ? <span style={{ fontSize: '9px', color: '#9ca3af' }}>{impTypeId ? 'No sub-types for this GL Type' : 'Select GL Type first to filter'}</span>
                  : (impTypeId ? impFilteredSubs : glSubTypes).map(s => (
                    <button key={s.id} onClick={() => setImpSubTypeId(p => p === String(s.id) ? '' : String(s.id))} style={{ ...pillBtn(impSubTypeId === String(s.id)), fontSize: '10px' }}>
                      {s.sub_type_name}
                    </button>
                  ))}
              </div>

              {/* Step C — GL Category (only for sub-category import) */}
              {importTarget === 'sub_category' && (
                <>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>
                    Step C — Select GL Category <span style={{ fontWeight: '400', color: '#9ca3af' }}>(optional)</span>
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                    {(impTypeId ? impFilteredCats : glCategories).length === 0
                      ? <span style={{ fontSize: '9px', color: '#9ca3af' }}>Select GL Type first to filter categories</span>
                      : (impTypeId ? impFilteredCats : glCategories).map(c => (
                        <button key={c.id} onClick={() => setImpCategoryId(p => p === String(c.id) ? '' : String(c.id))} style={{ ...pillBtn(impCategoryId === String(c.id), '#d97706', '#fff7ed'), fontSize: '10px' }}>
                          {c.category_name}
                        </button>
                      ))}
                  </div>
                </>
              )}

              {/* Pre-selected summary */}
              <div style={{ padding: '6px 10px', background: '#f5f3ff', border: `1px solid ${COLOR_SOFT}`, borderRadius: '5px', fontSize: '9px', color: COLOR, marginBottom: '14px' }}>
                {impType    ? <span>✓ <strong>{impType.type_name}</strong> </span>    : <span style={{ color: '#9ca3af' }}>No GL Type · </span>}
                {impSubType ? <span>→ <strong>{impSubType.sub_type_name}</strong> </span> : <span style={{ color: '#9ca3af' }}>No Sub-Type · </span>}
                {importTarget === 'sub_category' && (impCat ? <span>→ <strong>{impCat.category_name}</strong></span> : <span style={{ color: '#9ca3af' }}>No Category</span>)}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                {/* Manual Entry */}
                <button
                  onClick={() => {
                    setShowGLTypeSelector(false);
                    if (importTarget === 'category') {
                      if (impTypeId) setSelectedTypeId(impTypeId);
                      if (impSubTypeId) setSelectedSubTypeId(impSubTypeId);
                    } else {
                      if (impTypeId) { setSubCatTypeId(impTypeId); }
                      if (impSubTypeId) setSubCatSubTypeId(impSubTypeId);
                      else if (impTypeId) setSubCatSubTypeId('__none__');
                      if (impCategoryId) setSubCatCategoryId(impCategoryId);
                    }
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

                {/* Upload Template */}
                <button
                  onClick={() => { setShowGLTypeSelector(false); setShowImportPopup(true); }}
                  style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', border: '2px solid #e5e7eb', background: 'white', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLOR; e.currentTarget.style.background = COLOR_SOFT; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>📤</div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#111', marginBottom: '2px' }}>Upload Excel Template</div>
                  <div style={{ fontSize: '8px', color: '#6b7280' }}>Bulk import via Excel. Pre-selected fields embedded in template.</div>
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

      {/* ══════════════════ EXCEL IMPORT POPUP — GL CATEGORY ═════════════ */}
      {importTarget === 'category' && (
        <ExcelImportPopup
          isOpen={showImportPopup}
          onClose={() => { setShowImportPopup(false); setImpTypeId(''); setImpSubTypeId(''); }}
          onSuccess={(results) => {
            const cnt = results.filter(r => r.status === 'success').length;
            if (cnt > 0) { setMessage({ type: 'success', text: `✅ ${cnt} GL Category(s) imported from Excel!` }); fetchCategories(); }
          }}
          title={impType ? `Import GL Categories — ${impType.type_name}${impSubType ? ` › ${impSubType.sub_type_name}` : ''}` : 'Import GL Categories from Excel'}
          accentColor={COLOR}
          apiEndpoint={`${API_BASE}/gl-categories`}
          apiMethod="POST"
          fields={[
            { key: 'category_name', label: 'Category Name', required: true  },
            { key: 'description',   label: 'Description',   required: false },
          ]}
          templateDropdownFields={categoryTemplateDropdowns}
          lookupFields={categoryLookupFields}
          extraFormData={categoryExtraForm}
          importNote={impType
            ? `All rows imported under GL Type: ${impType.type_name}${impSubType ? ` › ${impSubType.sub_type_name}` : ''}. Category Code is always auto-generated.`
            : 'GL Type & Sub-Type columns auto-resolve to IDs on import. Category Code is always auto-generated.'}
        />
      )}

      {/* ══════════════════ EXCEL IMPORT POPUP — GL SUB-CATEGORY ══════════ */}
      {importTarget === 'sub_category' && (
        <ExcelImportPopup
          isOpen={showImportPopup}
          onClose={() => { setShowImportPopup(false); setImpTypeId(''); setImpSubTypeId(''); setImpCategoryId(''); }}
          onSuccess={(results) => {
            const cnt = results.filter(r => r.status === 'success').length;
            if (cnt > 0) { setMessage({ type: 'success', text: `✅ ${cnt} GL Sub-Category(s) imported from Excel!` }); fetchSubCategories(); }
          }}
          title={impCat
            ? `Import GL Sub-Categories — ${impCat.category_name}`
            : impType
            ? `Import GL Sub-Categories — ${impType.type_name}`
            : 'Import GL Sub-Categories from Excel'}
          accentColor="#d97706"
          apiEndpoint={`${API_BASE}/gl-sub-categories`}
          apiMethod="POST"
          fields={[
            { key: 'sub_category_name', label: 'Sub-Category Name', required: true  },
            { key: 'description',       label: 'Description',       required: false },
          ]}
          templateDropdownFields={subCatTemplateDropdowns}
          lookupFields={subCatLookupFields}
          extraFormData={subCatExtraForm}
          importNote={impCat
            ? `All rows imported under Category: ${impCat.category_name}. Sub-Category Code is always auto-generated.`
            : 'GL Type, Sub-Type and Category columns auto-resolve to IDs on import. Sub-Category Code is always auto-generated.'}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { color: #111; }
      `}</style>
    </div>
  );
}