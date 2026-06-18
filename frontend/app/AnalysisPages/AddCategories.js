import React, { useState, useEffect } from 'react';
import { FolderPlus, Search, Eye, Trash2, CheckCircle, XCircle, AlertCircle, Loader, Grid, List, Plus, Save, Info, Tag, Upload, RefreshCw } from 'lucide-react';
import ExcelImportPopup from '../pages/ExcelImportPopup';

const API_BASE = 'http://localhost:8000/api';

export default function AddCategories() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showImportPopup, setShowImportPopup] = useState(false);

  // Master Data
  const [itemTypes, setItemTypes] = useState([]);
  const [existingCategories, setExistingCategories] = useState([]);

  // Form State
  const [selectedItemType, setSelectedItemType] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [codePreview, setCodePreview] = useState('');

  // View State
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [filterItemTypeId, setFilterItemTypeId] = useState('');

  // Load user on mount
  useEffect(() => {
    const userData = sessionStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setCurrentUser(parsed.user);
      } catch (e) {
        setMessage({ type: 'error', text: 'Failed to load user data' });
      }
    } else {
      setMessage({ type: 'error', text: 'No user data found. Please login again.' });
    }
  }, []);

  useEffect(() => {
    if (currentUser?.id) fetchItemTypes();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.id) fetchCategories();
  }, [filterItemTypeId, currentUser]);

  // Live code preview when name + item type selected
  useEffect(() => {
    if (categoryName.trim() && selectedItemType) {
      const timer = setTimeout(() => {
        fetch(`${API_BASE}/item-category/preview-code?name=${encodeURIComponent(categoryName)}&item_type_id=${selectedItemType}`)
          .then(r => r.json())
          .then(d => setCodePreview(d.preview_code || ''))
          .catch(() => setCodePreview(''));
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setCodePreview('');
    }
  }, [categoryName, selectedItemType]);

  const fetchItemTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/item-type-master/lov`);
      if (!res.ok) { setItemTypes([]); return; }
      const data = await res.json();
      setItemTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching item types:', err);
      setItemTypes([]);
    }
  };

  const fetchCategories = async () => {
    if (!currentUser?.id) return;
    try {
      let url = `${API_BASE}/item-category/?`;
      if (filterItemTypeId) url += `item_type_id=${filterItemTypeId}&`;
      const res = await fetch(url);
      if (!res.ok) { setExistingCategories([]); return; }
      const data = await res.json();
      setExistingCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setExistingCategories([]);
    }
  };

  const handleCreateCategory = async () => {
    if (!selectedItemType) {
      setMessage({ type: 'error', text: 'Please select an Item Type first' });
      return;
    }
    if (!categoryName.trim()) {
      setMessage({ type: 'error', text: 'Category name is required' });
      return;
    }

    setLoading(true);
    try {
      const body = {
        item_type_id: parseInt(selectedItemType),
        name: categoryName.trim(),
        description: description.trim() || null,
      };

      const res = await fetch(`${API_BASE}/item-category/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: `Category "${data.name}" created successfully with code ${data.code}` });
        setCategoryName('');
        setDescription('');
        setSelectedItemType('');
        setCodePreview('');
        fetchCategories();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to create category' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId, catName) => {
    if (!window.confirm(`Are you sure you want to deactivate "${catName}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/item-category/${categoryId}?updated_by=${currentUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchCategories();
      } else {
        setMessage({ type: 'error', text: data.detail });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deleting category' });
    }
  };

  const filteredCategories = existingCategories.filter(cat =>
    (cat.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const s1 = { width: "100%", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", boxSizing: "border-box", color: "#000" };
  const s2 = { ...s1, cursor: "pointer" };
  const s3 = { display: "block", fontSize: "9px", fontWeight: "600", marginBottom: "4px", color: "#000" };

  if (!currentUser) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Loader size={48} style={{ animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: "14px", color: "#666" }}>Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "95%", maxWidth: "1200px", height: "90%", maxHeight: "700px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #8b5cf6, #a78bfa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FolderPlus size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>📂 Category Management</h2>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={fetchCategories}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "4px", color: "white", padding: "3px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "9px" }}
            >
              <RefreshCw size={10} /> Refresh
            </button>
            <button
              onClick={() => setShowImportPopup(true)}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "4px", color: "white", padding: "3px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "9px" }}
            >
              <Upload size={10} /> Import Categories
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{ margin: "8px 12px 0 12px", padding: "6px 8px", background: message.type === 'success' ? '#dcfce7' : '#fee2e2', border: message.type === 'success' ? "1px solid #86efac" : "1px solid #fca5a5", borderRadius: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
            {message.type === 'success' ? <CheckCircle size={12} style={{ color: "#16a34a" }} /> : <AlertCircle size={12} style={{ color: "#dc2626" }} />}
            <span style={{ fontSize: "10px", color: "#000", fontWeight: "500", flex: 1 }}>{message.text}</span>
            <button onClick={() => setMessage(null)} style={{ padding: "2px", border: "none", background: "transparent", cursor: "pointer" }}>
              <XCircle size={12} color={message.type === 'success' ? '#16a34a' : '#dc2626'} />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #e0e0e0", background: "#f9fafb", flexShrink: 0 }}>
          {['create', 'view'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: "6px 12px", fontSize: "10px", fontWeight: "600", cursor: "pointer", border: "none", background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? '#8b5cf6' : '#000', borderBottom: activeTab === tab ? '2px solid #8b5cf6' : 'none' }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                {tab === 'create' ? <><Plus size={12} /> Create Category</> : <><Eye size={12} /> View Categories ({filteredCategories.length})</>}
              </div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>

          {activeTab === 'create' && (
            <div>
              {/* Info Box */}
              <div style={{ background: "#e9d5ff", border: "1px solid #c4b5fd", borderRadius: "6px", padding: "10px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "start", gap: "8px" }}>
                  <Info size={14} style={{ color: "#000", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>📂 CATEGORY RULES</div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "9px", color: "#000", lineHeight: "1.5" }}>
                      <li><strong>Step 1:</strong> Select Item Type (mandatory — defines root of hierarchy)</li>
                      <li><strong>Step 2:</strong> Enter Category Name — code auto-generated from Item Type code</li>
                      <li>Category code format: <strong>{'{ItemTypeCode}-CAT-{NNNN}'}</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* STEP 1: Item Type */}
              <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Tag size={12} />
                  Step 1: Select Item Type <span style={{ color: "#dc2626" }}>*</span>
                </h3>
                <select value={selectedItemType} onChange={(e) => { setSelectedItemType(e.target.value); setCategoryName(''); setCodePreview(''); }} style={s2}>
                  <option value="">— Select Item Type —</option>
                  {itemTypes.map(it => (
                    <option key={it.id} value={it.id}>{it.name} ({it.code})</option>
                  ))}
                </select>
                {selectedItemType && (
                  <div style={{ marginTop: "6px", padding: "5px 8px", background: "#ede9fe", borderRadius: "4px", fontSize: "8px", color: "#000" }}>
                    ✅ Item Type selected — Code prefix: <strong>{itemTypes.find(t => String(t.id) === String(selectedItemType))?.code}</strong>
                  </div>
                )}
              </div>

              {/* STEP 2: Category Details */}
              {selectedItemType && (
                <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "12px" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "10px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FolderPlus size={12} />
                    Step 2: Category Details
                  </h3>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={s3}>Category Name <span style={{ color: "#dc2626" }}>*</span></label>
                    <input type="text" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g., Electronics, Furniture, Raw Materials" style={s1} />
                    {codePreview && (
                      <div style={{ marginTop: "6px", padding: "5px 10px", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "4px", fontSize: "9px", color: "#000", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        🔤 Auto Code Preview: <strong style={{ fontFamily: "monospace", color: "#7c3aed" }}>{codePreview}</strong>
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={s3}>Description (Optional)</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this category" style={{ ...s1, minHeight: "60px", resize: "vertical" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                    <button onClick={() => { setCategoryName(''); setDescription(''); setCodePreview(''); }} style={{ padding: "6px 12px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "10px", fontWeight: "600", cursor: "pointer", color: "#000" }}>
                      Reset
                    </button>
                    <button onClick={handleCreateCategory} disabled={loading} style={{ padding: "6px 16px", background: loading ? "#d1d5db" : "linear-gradient(to right, #8b5cf6, #a78bfa)", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}>
                      {loading ? <><Loader size={12} style={{ animation: "spin 1s linear infinite" }} />Creating...</> : <><Save size={12} />Create Category</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'view' && (
            <div>
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: "280px" }}>
                  <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                  <input type="text" placeholder="Search categories..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "6px 6px 6px 32px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }} />
                </div>
                <select value={filterItemTypeId} onChange={(e) => setFilterItemTypeId(e.target.value)} style={{ ...s2, maxWidth: "160px" }}>
                  <option value="">All Item Types</option>
                  {itemTypes.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                </select>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => setViewMode('grid')} style={{ padding: "6px 10px", background: viewMode === 'grid' ? '#8b5cf6' : 'white', border: "1px solid #e0e0e0", borderRadius: "4px", cursor: "pointer", color: viewMode === 'grid' ? 'white' : '#000' }}><Grid size={12} /></button>
                  <button onClick={() => setViewMode('list')} style={{ padding: "6px 10px", background: viewMode === 'list' ? '#8b5cf6' : 'white', border: "1px solid #e0e0e0", borderRadius: "4px", cursor: "pointer", color: viewMode === 'list' ? 'white' : '#000' }}><List size={12} /></button>
                </div>
              </div>

              {filteredCategories.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#000" }}>
                  <FolderPlus size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <h3 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#000" }}>No Categories Found</h3>
                  <p style={{ fontSize: "10px", color: "#666" }}>{searchTerm ? 'Try adjusting your search' : 'Create the first category'}</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: viewMode === 'grid' ? "repeat(auto-fill, minmax(280px, 1fr))" : "1fr", gap: "10px" }}>
                  {filteredCategories.map(cat => (
                    <div key={cat.id} style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "12px", transition: "all 0.2s", cursor: "pointer" }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(139,92,246,0.15)"; e.currentTarget.style.borderColor = "#8b5cf6"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e0e0e0"; }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: "11px", fontWeight: "700", color: "#000", marginBottom: "3px" }}>{cat.name}</h4>
                          <p style={{ fontSize: "9px", color: "#666", marginBottom: "4px", fontFamily: "monospace" }}>Code: {cat.code}</p>
                          {cat.item_type_name && (
                            <span style={{ fontSize: "8px", padding: "2px 6px", background: "#ede9fe", color: "#7c3aed", borderRadius: "3px", fontWeight: "600" }}>
                              🏷️ {cat.item_type_name}
                            </span>
                          )}
                        </div>
                        <button onClick={() => handleDeleteCategory(cat.id, cat.name)} style={{ padding: "3px 6px", background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "3px", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}>
                          <Trash2 size={10} color="#dc2626" />
                        </button>
                      </div>
                      {cat.description && <p style={{ fontSize: "9px", color: "#000", marginBottom: "8px", lineHeight: "1.4" }}>{cat.description}</p>}
                      {cat.total_subcategories > 0 && (
                        <div style={{ marginTop: "8px", padding: "6px", background: "#f9fafb", borderRadius: "3px", fontSize: "8px", color: "#000" }}>📚 {cat.total_subcategories} subcategories</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: "0px 12px", height: "16px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #a78bfa, #8b5cf6)", flexShrink: 0 }}></div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>

      {/* ── Excel Import Popup ── */}
      <ExcelImportPopup
        isOpen={showImportPopup}
        onClose={() => setShowImportPopup(false)}
        onSuccess={(results) => {
          const cnt = results.filter(r => r.status === 'success').length;
          if (cnt > 0) {
            setMessage({ type: 'success', text: `✅ ${cnt} Category(s) imported successfully!` });
            fetchCategories();
          }
        }}
        title="Import Categories from Excel"
        accentColor="#8b5cf6"
        apiEndpoint={`${API_BASE}/item-category/import`}
        apiMethod="POST"
        fields={[
          { key: 'name',        label: 'Category Name', required: true  },
          { key: 'description', label: 'Description',   required: false },
        ]}
        lookupFields={[
          {
            key: 'item_type_id',
            label: 'Item Type',
            data: itemTypes,
            matchKey: 'name',
            valueKey: 'id',
            caseSensitive: false,
            required: true,
          },
        ]}
        templateDropdownFields={[
          { key: 'item_type_id', label: 'Item Type', options: itemTypes.map(t => ({ label: t.name, value: t.id })) },
        ]}
        importNote="⚠️ Item Type column is REQUIRED in your Excel. Category Code is auto-generated — do NOT include it. Format: {ItemTypeCode}-CAT-{NAME}-001"
      />
    </>
  );
}