import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder, Search, Eye, Trash2, CheckCircle, XCircle,
  AlertCircle, Loader, Grid, List, Plus, Save, Layers, Info, Tag, Upload,
} from 'lucide-react';
import ExcelImportPopup from '../pages/ExcelImportPopup';

const API_BASE = 'http://localhost:8000/api';

// ─── Design tokens (purple — matches page header) ─────────────────────────────
const COLOR      = '#8b5cf6';
const COLOR_MED  = '#a78bfa';
const COLOR_SOFT = '#ede9fe';

// ─── Pill button (for selector modal) ────────────────────────────────────────
const pillBtn = (selected, color = COLOR) => ({
  padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
  border: selected ? `2px solid ${color}` : '1px solid #d1d5db',
  background: selected ? color : 'white',
  color: selected ? 'white' : '#374151',
  fontSize: '10px', fontWeight: '600',
  display: 'inline-flex', alignItems: 'center', gap: '4px',
});

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function AddSubCategories() {
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // ── Master Data ───────────────────────────────────────────────────────────
  const [itemTypes,     setItemTypes]     = useState([]);
  const [categories,    setCategories]    = useState([]);   // filtered by selected item type (create form)
  const [allCategories, setAllCategories] = useState([]);   // all active (for import popup lookup)
  const [subCategories, setSubCategories] = useState([]);

  // ── Create Form State ─────────────────────────────────────────────────────
  const [selectedItemType, setSelectedItemType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subCategoryName,  setSubCategoryName]  = useState('');
  const [description,      setDescription]      = useState('');
  const [codePreview,      setCodePreview]       = useState('');

  // ── View State ────────────────────────────────────────────────────────────
  const [viewMode,           setViewMode]           = useState('grid');
  const [searchTerm,         setSearchTerm]         = useState('');
  const [activeTab,          setActiveTab]           = useState('create');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');

  // ── View Tab independent filter state ────────────────────────────────────
  const [allSubCategories,   setAllSubCategories]   = useState([]);
  const [allSubCatLoading,   setAllSubCatLoading]   = useState(false);
  const [viewFilterItemType, setViewFilterItemType] = useState('');
  const [viewFilterCategory, setViewFilterCategory] = useState('');
  const [viewFilterCats,     setViewFilterCats]     = useState([]);

  // ══════════════════════════════════════════════════════════════════════════
  // IMPORT STATE  (same pattern as AddGLCategory)
  // ══════════════════════════════════════════════════════════════════════════
  const [showImportPopup,   setShowImportPopup]   = useState(false);
  const [showSelectorModal, setShowSelectorModal] = useState(false);

  // import modal context — pre-selected item type / category
  const [impItemTypeId,   setImpItemTypeId]   = useState('');
  const [impCategoryId,   setImpCategoryId]   = useState('');
  const [impFilteredCats, setImpFilteredCats] = useState([]);

  // derived helpers for import modal
  const impItemType = itemTypes.find(t => String(t.id) === String(impItemTypeId))       || null;
  const impCat      = allCategories.find(c => String(c.id) === String(impCategoryId)) || null;

  // When impItemTypeId changes → filter categories for modal
  useEffect(() => {
    if (impItemTypeId) {
      setImpFilteredCats(allCategories.filter(c => String(c.item_type_id) === String(impItemTypeId)));
    } else {
      setImpFilteredCats([]);
    }
    setImpCategoryId('');
  }, [impItemTypeId, allCategories]);

  // ══════════════════════════════════════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════════════════════════════════════
  const fetchAll = useCallback(async () => {
    await Promise.all([fetchItemTypes(), fetchAllCategories()]);
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem('userData');
    if (raw) { try { setCurrentUser(JSON.parse(raw).user); } catch { /* ignore */ } }
    fetchAll();
  }, [fetchAll]);

  // fetch categories when item type selected (create form)
  useEffect(() => {
    if (selectedItemType) {
      setSelectedCategory('');
      setSubCategories([]);
      fetchCategoriesByType(selectedItemType);
    } else {
      setCategories([]);
      setSelectedCategory('');
    }
  }, [selectedItemType]);

  // fetch sub-categories when category selected
  useEffect(() => {
    if (selectedCategory) fetchSubCategories(selectedCategory);
    else setSubCategories([]);
  }, [selectedCategory]);

  // live code preview
  useEffect(() => {
    if (subCategoryName.trim() && selectedCategory) {
      const t = setTimeout(() => {
        fetch(`${API_BASE}/item-sub-category/preview-code?name=${encodeURIComponent(subCategoryName)}&category_id=${selectedCategory}`)
          .then(r => r.json())
          .then(d => setCodePreview(d.preview_code || ''))
          .catch(() => setCodePreview(''));
      }, 300);
      return () => clearTimeout(t);
    } else { setCodePreview(''); }
  }, [subCategoryName, selectedCategory]);

  // view tab: filter categories by item type
  useEffect(() => {
    if (viewFilterItemType) {
      setViewFilterCats(allCategories.filter(c => String(c.item_type_id) === String(viewFilterItemType)));
    } else {
      setViewFilterCats(allCategories);
    }
    setViewFilterCategory('');
  }, [viewFilterItemType, allCategories]);

  // view tab: fetch all sub-categories whenever tab opens or filter changes
  useEffect(() => {
    if (activeTab === 'view') fetchAllSubCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, viewFilterCategory]);

  // ══════════════════════════════════════════════════════════════════════════
  // API CALLS
  // ══════════════════════════════════════════════════════════════════════════
  const fetchItemTypes = async () => {
    try { const r = await fetch(`${API_BASE}/item-type-master/lov`); setItemTypes((await r.json()) || []); } catch { setItemTypes([]); }
  };

  const fetchAllCategories = async () => {
    try { const r = await fetch(`${API_BASE}/item-category/lov`); const d = await r.json(); setAllCategories(Array.isArray(d) ? d : []); } catch { setAllCategories([]); }
  };

  const fetchCategoriesByType = async (itemTypeId) => {
    try { const r = await fetch(`${API_BASE}/item-category/lov?item_type_id=${itemTypeId}`); setCategories((await r.json()) || []); } catch { setCategories([]); }
  };

  const fetchSubCategories = async (catId) => {
    try { const r = await fetch(`${API_BASE}/item-sub-category/?category_id=${catId}&is_active=true`); setSubCategories((await r.json()) || []); } catch { setSubCategories([]); }
  };

  const fetchAllSubCategories = async () => {
    setAllSubCatLoading(true);
    try {
      const url = viewFilterCategory
        ? `${API_BASE}/item-sub-category/?category_id=${viewFilterCategory}`
        : `${API_BASE}/item-sub-category/`;
      const r = await fetch(url);
      setAllSubCategories((await r.json()) || []);
    } catch { setAllSubCategories([]); }
    finally { setAllSubCatLoading(false); }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════════════════
  const handleCreateSubCategory = async () => {
    if (!selectedItemType)       { setMessage({ type: 'error', text: 'Please select an Item Type' }); return; }
    if (!selectedCategory)       { setMessage({ type: 'error', text: 'Please select a parent Category' }); return; }
    if (!subCategoryName.trim()) { setMessage({ type: 'error', text: 'Sub-category name is required' }); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/item-sub-category/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: parseInt(selectedCategory), name: subCategoryName.trim(), description: description.trim() || null, created_by: currentUser?.id || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Sub-category "${data.name}" created with code ${data.code}` });
        setSubCategoryName(''); setDescription(''); setCodePreview('');
        fetchSubCategories(selectedCategory);
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to create sub-category' });
      }
    } catch { setMessage({ type: 'error', text: 'Error creating sub-category' }); }
    finally { setLoading(false); }
  };

  const handleDeleteSubCategory = async (subCatId, subCatName) => {
    if (!window.confirm(`Are you sure you want to deactivate "${subCatName}"?`)) return;
    try {
      const res  = await fetch(`${API_BASE}/item-sub-category/${subCatId}?updated_by=${currentUser?.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) { setMessage({ type: 'success', text: data.message }); fetchSubCategories(selectedCategory); fetchAllSubCategories(); }
      else        { setMessage({ type: 'error',   text: data.detail }); }
    } catch { setMessage({ type: 'error', text: 'Error deleting sub-category' }); }
  };

  const handleImportSuccess = (results) => {
    const cnt = results.filter(r => r.status === 'success').length;
    if (cnt > 0) {
      setMessage({ type: 'success', text: `✅ ${cnt} Sub-Category(s) imported from Excel!` });
      if (selectedCategory) fetchSubCategories(selectedCategory);
      fetchAllSubCategories();
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getSelectedCategoryInfo = () => categories.find(c => String(c.id) === String(selectedCategory));
  const getSelectedItemTypeInfo = () => itemTypes.find(t => String(t.id) === String(selectedItemType));

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
    cat.code.toLowerCase().includes(categorySearchTerm.toLowerCase())
  );

  const filteredSubCategories = subCategories.filter(sc =>
    (sc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sc.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // filtered list for View tab (independent of create tab selections)
  const filteredAllSubCategories = allSubCategories.filter(sc => {
    const matchSearch = !searchTerm ||
      (sc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sc.code || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchItemType = !viewFilterItemType ||
      (() => {
        const cat = allCategories.find(c => String(c.id) === String(sc.category_id));
        return cat && String(cat.item_type_id) === String(viewFilterItemType);
      })();
    return matchSearch && matchItemType;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // IMPORT POPUP COMPUTED VALUES  (same pattern as AddGLCategory)
  // ══════════════════════════════════════════════════════════════════════════

  // Template dropdowns: only add if NOT pre-selected in selector modal
  const templateDropdownFields = (() => {
    const dd = [];
    if (!impItemTypeId) dd.push({ key: 'item_type_id', label: 'Item Type', options: itemTypes.map(t => ({ label: `${t.name} (${t.code})`, value: t.id })) });
    if (!impCategoryId) dd.push({ key: 'category_id',  label: 'Category',  options: (impItemTypeId ? impFilteredCats : allCategories).map(c => ({ label: `${c.name} (${c.code})`, value: c.id })) });
    return dd;
  })();

  // Lookup fields: resolve name → id during import (only if not pre-selected)
  const lookupFields = (() => {
    const lf = [];
    if (!impItemTypeId) lf.push({ key: 'item_type_id', label: 'Item Type', data: itemTypes,                                              matchKey: 'name', valueKey: 'id', caseSensitive: false });
    if (!impCategoryId) lf.push({ key: 'category_id',  label: 'Category',  data: impItemTypeId ? impFilteredCats : allCategories, matchKey: 'name', valueKey: 'id', caseSensitive: false });
    return lf;
  })();

  // Extra form data: pre-selected IDs sent in every row
  const extraFormData = {};
  if (impCategoryId)   extraFormData.category_id = impCategoryId;
  if (currentUser?.id) extraFormData.created_by  = currentUser.id;

  // Import note
  const importNote = impCat
    ? `All rows imported under Category: ${impCat.name} (${impCat.code}). Sub-Category Code is always auto-generated.`
    : impItemType
    ? `All rows imported under Item Type: ${impItemType.name}. Category column in Excel auto-resolves to ID. Sub-Category Code is always auto-generated.`
    : 'Item Type & Category columns auto-resolve to IDs on import. Sub-Category Code is always auto-generated.';

  // Inline styles
  const s1 = { width: '100%', padding: '6px 8px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '10px', boxSizing: 'border-box', color: '#000' };
  const s2 = { ...s1, cursor: 'pointer' };
  const s3 = { display: 'block', fontSize: '9px', fontWeight: '600', marginBottom: '4px', color: '#000' };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ width: '95%', maxWidth: '1200px', height: '90%', maxHeight: '700px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '0 14px', height: '34px', background: `linear-gradient(135deg,${COLOR},${COLOR_MED})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={14} />
            <span style={{ fontWeight: '700', fontSize: '12px' }}>📚 Sub-Category Management</span>
          </div>
          {/* Import button — same style as AddGLCategory header buttons */}
          <button
            onClick={() => { setImpItemTypeId(''); setImpCategoryId(''); setShowSelectorModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 9px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', color: 'white', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
          >
            <Upload size={10} /> Import Sub-Categories
          </button>
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
          {['create', 'view'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '6px 12px', fontSize: '10px', fontWeight: '600', cursor: 'pointer',
              border: 'none', borderBottom: activeTab === tab ? `2px solid ${COLOR}` : '2px solid transparent',
              background: activeTab === tab ? 'white' : 'transparent',
              color: activeTab === tab ? COLOR : '#374151',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            }}>
              {tab === 'create' ? <><Plus size={12} />Create Sub-Category</> : <><Eye size={12} />View Sub-Categories ({filteredAllSubCategories.length})</>}
            </button>
          ))}
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>

          {/* ════════════ CREATE TAB ════════════════════════════════════ */}
          {activeTab === 'create' && (
            <div>
              <div style={{ background: COLOR_SOFT, border: `1px solid ${COLOR_MED}`, borderRadius: '6px', padding: '10px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                  <Info size={14} style={{ color: COLOR, flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '600', color: '#000', marginBottom: '4px' }}>📚 SUB-CATEGORY RULES</div>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '9px', color: '#000', lineHeight: '1.5' }}>
                      <li><strong>Step 1:</strong> Select Item Type</li>
                      <li><strong>Step 2:</strong> Select Category (filtered by Item Type)</li>
                      <li><strong>Step 3:</strong> Enter Sub-Category Name — code auto-generated</li>
                      <li>Code format: <strong>{'{CategoryCode}-SC-{NNNN}'}</strong></li>
                      <li>Use <strong>Import Sub-Categories</strong> button (top-right) to bulk import via Excel</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 1: Item Type */}
              <div style={{ marginBottom: '12px', background: '#f8f9fa', padding: '10px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                <h3 style={{ fontSize: '10px', fontWeight: '700', marginBottom: '8px', color: '#000', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={12} />Step 1: Select Item Type <span style={{ color: '#dc2626' }}>*</span>
                </h3>
                <select value={selectedItemType} onChange={e => setSelectedItemType(e.target.value)} style={s2}>
                  <option value="">— Select Item Type —</option>
                  {itemTypes.map(it => <option key={it.id} value={it.id}>{it.name} ({it.code})</option>)}
                </select>
              </div>

              {/* Step 2: Category */}
              {selectedItemType && (
                <div style={{ marginBottom: '12px', background: '#f8f9fa', padding: '10px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                  <h3 style={{ fontSize: '10px', fontWeight: '700', marginBottom: '8px', color: '#000', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Folder size={12} />Step 2: Select Parent Category <span style={{ color: '#dc2626' }}>*</span>
                  </h3>
                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input type="text" placeholder="Search categories..." value={categorySearchTerm} onChange={e => setCategorySearchTerm(e.target.value)} style={{ width: '100%', padding: '6px 6px 6px 28px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '9px', color: '#000' }} />
                  </div>
                  <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setSubCategoryName(''); setCodePreview(''); }} style={s2}>
                    <option value="">— Select Category —</option>
                    {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                  {categories.length === 0 && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '8px', color: '#dc2626' }}>No categories found for this Item Type. Create a category first.</p>
                  )}
                  {selectedCategory && getSelectedCategoryInfo() && (
                    <div style={{ marginTop: '8px', padding: '8px', background: COLOR_SOFT, borderRadius: '4px' }}>
                      <div style={{ fontSize: '8px', color: '#000', fontWeight: '600', marginBottom: '3px' }}>Selected: {getSelectedCategoryInfo().name}</div>
                      <div style={{ fontSize: '8px', color: '#666' }}>Code: {getSelectedCategoryInfo().code} | Type: {getSelectedCategoryInfo().item_type_name}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Sub-Category Details */}
              {selectedCategory && (
                <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '12px' }}>
                  <h3 style={{ fontSize: '10px', fontWeight: '700', marginBottom: '10px', color: '#000', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={12} />Step 3: Sub-Category Details
                  </h3>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={s3}>Sub-Category Name <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={subCategoryName} onChange={e => setSubCategoryName(e.target.value)} placeholder="e.g., Mobile, Laptop, Chair" style={s1} />
                    {codePreview && (
                      <div style={{ marginTop: '6px', padding: '5px 10px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '4px', fontSize: '9px', color: '#000', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        🔤 Auto Code Preview: <strong style={{ fontFamily: 'monospace', color: COLOR }}>{codePreview}</strong>
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={s3}>Description (Optional)</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." style={{ ...s1, minHeight: '60px', resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button onClick={() => { setSubCategoryName(''); setDescription(''); setCodePreview(''); }} style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', color: '#000' }}>Reset</button>
                    <button onClick={handleCreateSubCategory} disabled={loading} style={{ padding: '6px 16px', background: loading ? '#d1d5db' : `linear-gradient(to right,${COLOR},${COLOR_MED})`, border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {loading ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />Creating...</> : <><Save size={12} />Create Sub-Category</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════ VIEW TAB ══════════════════════════════════════ */}
          {activeTab === 'view' && (
            <div>
              {/* ── Filter bar ── */}
              <div style={{ marginBottom: '12px', padding: '10px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 160px', minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>Filter by Item Type</label>
                  <select value={viewFilterItemType} onChange={e => setViewFilterItemType(e.target.value)} style={{ width: '100%', padding: '5px 8px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '10px', color: '#000', cursor: 'pointer' }}>
                    <option value="">— All Item Types —</option>
                    {itemTypes.map(it => <option key={it.id} value={it.id}>{it.name} ({it.code})</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 180px', minWidth: '150px' }}>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>Filter by Category</label>
                  <select value={viewFilterCategory} onChange={e => setViewFilterCategory(e.target.value)} style={{ width: '100%', padding: '5px 8px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '10px', color: '#000', cursor: 'pointer' }}>
                    <option value="">— All Categories —</option>
                    {(viewFilterItemType ? viewFilterCats : allCategories).map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
                <div style={{ flex: '2 1 200px', minWidth: '160px' }}>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>Search</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input type="text" placeholder="Search by name or code..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '5px 8px 5px 26px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '10px', color: '#000', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', paddingBottom: '1px' }}>
                  <button onClick={() => setViewMode('grid')} style={{ padding: '6px 10px', background: viewMode === 'grid' ? COLOR : 'white', border: '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer', color: viewMode === 'grid' ? 'white' : '#000' }}><Grid size={12} /></button>
                  <button onClick={() => setViewMode('list')} style={{ padding: '6px 10px', background: viewMode === 'list' ? COLOR : 'white', border: '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer', color: viewMode === 'list' ? 'white' : '#000' }}><List size={12} /></button>
                  <button onClick={fetchAllSubCategories} title="Refresh" style={{ padding: '6px 10px', background: 'white', border: '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer', color: '#374151' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                  </button>
                </div>
              </div>

              {/* ── Count badge ── */}
              <div style={{ marginBottom: '10px', fontSize: '10px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {allSubCatLoading
                  ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</>
                  : <><span style={{ fontWeight: '700', color: COLOR }}>{filteredAllSubCategories.length}</span> sub-categor{filteredAllSubCategories.length === 1 ? 'y' : 'ies'} found</>
                }
              </div>

              {/* ── Cards / list ── */}
              {!allSubCatLoading && filteredAllSubCategories.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#000' }}>
                  <Layers size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <h3 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>No Sub-Categories Found</h3>
                  <p style={{ fontSize: '10px', color: '#666' }}>{searchTerm || viewFilterCategory || viewFilterItemType ? 'Try adjusting your filters' : 'No sub-categories exist yet. Create one first.'}</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(250px, 1fr))' : '1fr', gap: '10px' }}>
                  {filteredAllSubCategories.map(subcat => {
                    const catInfo = allCategories.find(c => String(c.id) === String(subcat.category_id));
                    return (
                      <div key={subcat.id}
                        style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '12px', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(139,92,246,0.15)'; e.currentTarget.style.borderColor = COLOR; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e0e0e0'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#000', marginBottom: '3px' }}>{subcat.name}</h4>
                            <p style={{ fontSize: '9px', color: '#666', fontFamily: 'monospace' }}>Code: {subcat.code}</p>
                          </div>
                          <button onClick={() => handleDeleteSubCategory(subcat.id, subcat.name)} style={{ padding: '3px 6px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={10} color="#dc2626" />
                          </button>
                        </div>
                        {subcat.description && <p style={{ fontSize: '9px', color: '#000', marginBottom: '8px', lineHeight: '1.4' }}>{subcat.description}</p>}
                        <div style={{ fontSize: '8px', color: '#666', marginTop: '8px', padding: '4px 6px', background: '#f9fafb', borderRadius: '3px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {catInfo && <span>📂 {catInfo.name}</span>}
                          {catInfo?.item_type_name && <span>🏷️ {catInfo.item_type_name}</span>}
                          <span>{new Date(subcat.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '0px 12px', height: '16px', borderTop: '1px solid #e0e0e0', background: `linear-gradient(to right,${COLOR_MED},${COLOR})`, flexShrink: 0 }} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          GL-STYLE SELECTOR MODAL
          User picks Item Type (optional) → Category (optional) → then:
            ✏️ Manual Entry  — pre-fills create form and closes modal
            📤 Upload Excel  — opens ExcelImportPopup with pre-selected context
      ════════════════════════════════════════════════════════════════════════ */}
      {showSelectorModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '520px', maxWidth: '96vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>

            {/* Modal header */}
            <div style={{ padding: '12px 16px', background: `linear-gradient(135deg,${COLOR},${COLOR_MED})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: '700', fontSize: '12px' }}>📥 Import Sub-Categories — Select Context</span>
              <button onClick={() => setShowSelectorModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '16px' }}>
              <p style={{ margin: '0 0 12px', fontSize: '10px', color: '#6b7280' }}>
                Optionally pre-select an Item Type and/or Category — these will be embedded in the Excel template and pre-filled on every imported row.
              </p>

              {/* Step A — Item Type */}
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>
                Step A — Select Item Type <span style={{ fontWeight: '400', color: '#9ca3af' }}>(optional)</span>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                {itemTypes.length === 0
                  ? <span style={{ fontSize: '9px', color: '#9ca3af' }}>Loading…</span>
                  : itemTypes.map(t => (
                    <button key={t.id} onClick={() => setImpItemTypeId(p => p === String(t.id) ? '' : String(t.id))} style={{ ...pillBtn(impItemTypeId === String(t.id)), fontSize: '10px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '8px', opacity: 0.8 }}>{t.code}</span> {t.name}
                    </button>
                  ))}
              </div>

              {/* Step B — Category */}
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>
                Step B — Select Category <span style={{ fontWeight: '400', color: '#9ca3af' }}>(optional)</span>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                {(impItemTypeId ? impFilteredCats : allCategories).length === 0
                  ? <span style={{ fontSize: '9px', color: '#9ca3af' }}>{impItemTypeId ? 'No categories for this Item Type' : 'Select Item Type first to filter'}</span>
                  : (impItemTypeId ? impFilteredCats : allCategories).map(c => (
                    <button key={c.id} onClick={() => setImpCategoryId(p => p === String(c.id) ? '' : String(c.id))} style={{ ...pillBtn(impCategoryId === String(c.id), '#d97706'), fontSize: '10px' }}>
                      {c.name}
                    </button>
                  ))}
              </div>

              {/* Pre-selected summary */}
              <div style={{ padding: '6px 10px', background: COLOR_SOFT, border: `1px solid ${COLOR_MED}`, borderRadius: '5px', fontSize: '9px', color: COLOR, marginBottom: '14px' }}>
                {impItemType ? <span>✓ <strong>{impItemType.name}</strong> </span>  : <span style={{ color: '#9ca3af' }}>No Item Type · </span>}
                {impCat      ? <span>→ <strong>{impCat.name}</strong></span>        : <span style={{ color: '#9ca3af' }}>No Category</span>}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                {/* Manual Entry */}
                <button
                  onClick={() => {
                    setShowSelectorModal(false);
                    if (impItemTypeId) setSelectedItemType(impItemTypeId);
                    if (impCategoryId) setSelectedCategory(impCategoryId);
                    setActiveTab('create');
                  }}
                  style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', border: '2px solid #e5e7eb', background: 'white', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLOR; e.currentTarget.style.background = COLOR_SOFT; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>✏️</div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#111', marginBottom: '2px' }}>Manual Entry</div>
                  <div style={{ fontSize: '8px', color: '#6b7280' }}>Pre-fills form selections from above choices.</div>
                </button>

                {/* Upload Template */}
                <button
                  onClick={() => { setShowSelectorModal(false); setShowImportPopup(true); }}
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
                <button onClick={() => setShowSelectorModal(false)} style={{ padding: '5px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', color: '#374151' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          EXCEL IMPORT POPUP
          Uses existing  POST /api/item-sub-category/  (JSON)
          category_id resolved via lookupFields OR sent via extraFormData.
          No new backend route needed.
      ════════════════════════════════════════════════════════════════════════ */}
      <ExcelImportPopup
        isOpen={showImportPopup}
        onClose={() => { setShowImportPopup(false); setImpItemTypeId(''); setImpCategoryId(''); }}
        onSuccess={handleImportSuccess}
        title={
          impCat      ? `Import Sub-Categories — ${impCat.name}`
          : impItemType ? `Import Sub-Categories — ${impItemType.name}`
          : 'Import Sub-Categories from Excel'
        }
        accentColor={COLOR}
        apiEndpoint={`${API_BASE}/item-sub-category/`}
        apiMethod="POST"
        fields={[
          { key: 'name',        label: 'Sub-Category Name', required: true  },
          { key: 'description', label: 'Description',        required: false },
        ]}
        templateDropdownFields={templateDropdownFields}
        lookupFields={lookupFields}
        extraFormData={extraFormData}
        importNote={importNote}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } select option { color: #111; }`}</style>
    </div>
  );
}