import React, { useState, useEffect } from 'react';
import { Box, Search, Eye, Trash2, CheckCircle, XCircle, AlertCircle, Loader, Grid, List, Plus, Save, Info, Award, Tag, Folder, Layers, Upload } from 'lucide-react';
import ExcelImportPopup from '../pages/ExcelImportPopup';

const API_BASE = 'http://localhost:8000/api';

export default function AddProductClassification() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Master Data (cascading for selection)
  const [itemTypes, setItemTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [existingClassifications, setExistingClassifications] = useState([]);

  // Form State
  const [selectedItemType, setSelectedItemType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [classificationName, setClassificationName] = useState('');
  const [description, setDescription] = useState('');
  const [grade, setGrade] = useState('');
  const [qualityStandard, setQualityStandard] = useState('');
  const [certification, setCertification] = useState('');
  const [codePreview, setCodePreview] = useState('');

  // View State
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [filterProductId, setFilterProductId] = useState('');

  // ── Import State ─────────────────────────────────────────────────────────
  const [showImportPopup,    setShowImportPopup]    = useState(false);
  const [showSelectorModal,  setShowSelectorModal]  = useState(false);
  const [impItemTypeId,      setImpItemTypeId]      = useState('');
  const [impCategoryId,      setImpCategoryId]      = useState('');
  const [impSubCategoryId,   setImpSubCategoryId]   = useState('');
  const [impProductId,       setImpProductId]       = useState('');
  const [impFilteredCats,    setImpFilteredCats]    = useState([]);
  const [impFilteredSubCats, setImpFilteredSubCats] = useState([]);
  const [impFilteredProds,   setImpFilteredProds]   = useState([]);
  const [allCategories,      setAllCategories]      = useState([]);
  const [allSubCategories,   setAllSubCategories]   = useState([]);
  const [allProducts,        setAllProducts]        = useState([]);

  const impItemType    = itemTypes.find(t => String(t.id) === String(impItemTypeId)) || null;
  const impCategory    = allCategories.find(c => String(c.id) === String(impCategoryId)) || null;
  const impSubCategory = allSubCategories.find(s => String(s.id) === String(impSubCategoryId)) || null;
  const impProduct     = allProducts.find(p => String(p.id) === String(impProductId)) || null;

  useEffect(() => {
    const userData = sessionStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setCurrentUser(parsed.user);
      } catch (e) {
        setMessage({ type: 'error', text: 'Failed to load user data' });
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      fetchItemTypes();
      fetchClassifications();
      fetchAllCategories();
      fetchAllSubCategories();
      fetchAllProducts();
    }
  }, [currentUser]);

  // import modal cascading
  useEffect(() => {
    if (impItemTypeId) {
      setImpFilteredCats(allCategories.filter(c => String(c.item_type_id) === String(impItemTypeId)));
    } else {
      setImpFilteredCats(allCategories);
    }
    setImpCategoryId(''); setImpSubCategoryId(''); setImpProductId('');
  }, [impItemTypeId, allCategories]);

  useEffect(() => {
    if (impCategoryId) {
      setImpFilteredSubCats(allSubCategories.filter(s => String(s.category_id) === String(impCategoryId)));
    } else {
      setImpFilteredSubCats([]);
    }
    setImpSubCategoryId(''); setImpProductId('');
  }, [impCategoryId, allSubCategories]);

  useEffect(() => {
    if (impSubCategoryId) {
      setImpFilteredProds(allProducts.filter(p => String(p.sub_category_id) === String(impSubCategoryId)));
    } else {
      setImpFilteredProds([]);
    }
    setImpProductId('');
  }, [impSubCategoryId, allProducts]);

  useEffect(() => {
    if (selectedItemType) {
      setSelectedCategory(''); setSelectedSubCategory(''); setSelectedProduct('');
      setCategories([]); setSubCategories([]); setProducts([]);
      fetchCategoriesByType(selectedItemType);
    }
  }, [selectedItemType]);

  useEffect(() => {
    if (selectedCategory) {
      setSelectedSubCategory(''); setSelectedProduct('');
      setSubCategories([]); setProducts([]);
      fetchSubCategoriesByCat(selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedSubCategory) {
      setSelectedProduct(''); setProducts([]);
      fetchProductsBySubCat(selectedSubCategory);
    }
  }, [selectedSubCategory]);

  useEffect(() => {
    if (currentUser?.id) fetchClassifications();
  }, [filterProductId]);

  // Live code preview
  useEffect(() => {
    if (classificationName.trim() && selectedProduct) {
      const timer = setTimeout(() => {
        fetch(`${API_BASE}/item-product-classification/preview-code?name=${encodeURIComponent(classificationName)}&product_id=${selectedProduct}`)
          .then(r => r.json())
          .then(d => setCodePreview(d.preview_code || ''))
          .catch(() => setCodePreview(''));
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setCodePreview('');
    }
  }, [classificationName, selectedProduct]);

  const fetchItemTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/item-type-master/lov`);
      if (!res.ok) { setItemTypes([]); return; }
      const data = await res.json();
      setItemTypes(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setItemTypes([]); }
  };

  const fetchAllCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/item-category/lov`);
      const data = await res.json();
      setAllCategories(Array.isArray(data) ? data : []);
    } catch { setAllCategories([]); }
  };

  const fetchAllSubCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/item-sub-category/lov`);
      const data = await res.json();
      setAllSubCategories(Array.isArray(data) ? data : []);
    } catch { setAllSubCategories([]); }
  };

  const fetchAllProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/item-product/lov`);
      const data = await res.json();
      setAllProducts(Array.isArray(data) ? data : []);
    } catch { setAllProducts([]); }
  };

  const fetchCategoriesByType = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/item-category/lov?item_type_id=${id}`);
      if (!res.ok) { setCategories([]); return; }
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setCategories([]); }
  };

  const fetchSubCategoriesByCat = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/item-sub-category/lov?category_id=${id}`);
      if (!res.ok) { setSubCategories([]); return; }
      const data = await res.json();
      setSubCategories(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setSubCategories([]); }
  };

  const fetchProductsBySubCat = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/item-product/lov?subcategory_id=${id}`);
      if (!res.ok) { setProducts([]); return; }
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setProducts([]); }
  };

  const fetchClassifications = async () => {
    if (!currentUser?.id) return;
    try {
      let url = `${API_BASE}/item-product-classification/?`;
      if (filterProductId) url += `product_id=${filterProductId}&`;
      const res = await fetch(url);
      if (!res.ok) { setExistingClassifications([]); return; }
      const data = await res.json();
      setExistingClassifications(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setExistingClassifications([]); }
  };

  const handleCreateClassification = async () => {
    if (!selectedProduct) { setMessage({ type: 'error', text: 'Please select a Product' }); return; }
    if (!classificationName.trim()) { setMessage({ type: 'error', text: 'Classification name is required' }); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/item-product-classification/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: parseInt(selectedProduct),
          name: classificationName.trim(),
          description: description.trim() || null,
          grade: grade.trim() || null,
          quality_standard: qualityStandard.trim() || null,
          certification: certification.trim() || null,
          created_by: currentUser?.id || null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Classification "${data.name}" created with code ${data.code}` });
        setClassificationName(''); setDescription(''); setGrade('');
        setQualityStandard(''); setCertification(''); setCodePreview('');
        fetchClassifications();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to create classification' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error creating classification' });
    } finally { setLoading(false); }
  };

  const handleDeleteClassification = async (clsId, clsName) => {
    if (!window.confirm(`Are you sure you want to deactivate "${clsName}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/item-product-classification/${clsId}?updated_by=${currentUser?.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) { setMessage({ type: 'success', text: data.message }); fetchClassifications(); }
      else setMessage({ type: 'error', text: data.detail });
    } catch (err) { setMessage({ type: 'error', text: 'Error deleting classification' }); }
  };

  const filteredClassifications = existingClassifications.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.grade || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSelectedProductInfo    = () => products.find(p => String(p.id) === String(selectedProduct));
  const getSelectedItemTypeInfo   = () => itemTypes.find(t => String(t.id) === String(selectedItemType));
  const getSelectedCategoryInfo   = () => categories.find(c => String(c.id) === String(selectedCategory));
  const getSelectedSubCategoryInfo = () => subCategories.find(s => String(s.id) === String(selectedSubCategory));

  const s1 = { width: "100%", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", boxSizing: "border-box", color: "#000" };
  const s2 = { ...s1, cursor: "pointer" };
  const s3 = { display: "block", fontSize: "9px", fontWeight: "600", marginBottom: "4px", color: "#000" };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "95%", maxWidth: "1200px", height: "90%", maxHeight: "700px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", background: "linear-gradient(to right, #8b5cf6, #a78bfa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Award size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>🏷️ Product Classification Management</h2>
          </div>
          <button
            onClick={() => { setImpItemTypeId(''); setImpCategoryId(''); setImpSubCategoryId(''); setImpProductId(''); setShowSelectorModal(true); }}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 9px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "4px", color: "white", fontSize: "9px", fontWeight: "700", cursor: "pointer" }}
          >
            <Upload size={10} /> Import Classifications
          </button>
        </div>

        {message && (
          <div style={{ margin: "8px 12px 0 12px", padding: "6px 8px", background: message.type === 'success' ? '#dcfce7' : '#fee2e2', border: message.type === 'success' ? "1px solid #86efac" : "1px solid #fca5a5", borderRadius: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
            {message.type === 'success' ? <CheckCircle size={12} style={{ color: "#16a34a" }} /> : <AlertCircle size={12} style={{ color: "#dc2626" }} />}
            <span style={{ fontSize: "10px", color: "#000", fontWeight: "500", flex: 1 }}>{message.text}</span>
            <button onClick={() => setMessage(null)} style={{ padding: "2px", border: "none", background: "transparent", cursor: "pointer" }}>
              <XCircle size={12} color={message.type === 'success' ? '#16a34a' : '#dc2626'} />
            </button>
          </div>
        )}

        <div style={{ display: "flex", borderBottom: "1px solid #e0e0e0", background: "#f9fafb", flexShrink: 0 }}>
          {['create', 'view'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: "6px 12px", fontSize: "10px", fontWeight: "600", cursor: "pointer", border: "none", background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? '#8b5cf6' : '#000', borderBottom: activeTab === tab ? '2px solid #8b5cf6' : 'none' }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                {tab === 'create' ? <><Plus size={12} />Create Classification</> : <><Eye size={12} />View Classifications ({filteredClassifications.length})</>}
              </div>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>

          {activeTab === 'create' && (
            <div>
              <div style={{ background: "#e9d5ff", border: "1px solid #c4b5fd", borderRadius: "6px", padding: "10px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "start", gap: "8px" }}>
                  <Info size={14} style={{ color: "#000", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>🏷️ CLASSIFICATION RULES</div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "9px", color: "#000", lineHeight: "1.5" }}>
                      <li>Select full hierarchy: Item Type → Category → Sub-Category → <strong>Product</strong></li>
                      <li>Enter Classification Name — code auto-generated as <strong>{'{ProductCode}-CLS-{NNNN}'}</strong></li>
                      <li>Grade, Quality Standard, Certification are optional</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Cascade Selectors */}
              <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "10px", color: "#000" }}>Select Hierarchy to find Product</h3>

                {/* Breadcrumb */}
                <div style={{ fontSize: "8px", color: "#666", marginBottom: "10px", display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                  {[
                    { val: selectedItemType,    label: getSelectedItemTypeInfo()?.name   || 'Item Type',      color: "#ede9fe", textColor: "#7c3aed", icon: "🏷️" },
                    { val: selectedCategory,    label: getSelectedCategoryInfo()?.name   || 'Category',       color: "#dbeafe", textColor: "#1d4ed8", icon: "📂" },
                    { val: selectedSubCategory, label: getSelectedSubCategoryInfo()?.name || 'Sub-Cat',       color: "#dcfce7", textColor: "#16a34a", icon: "📚" },
                    { val: selectedProduct,     label: getSelectedProductInfo()?.name    || 'Product',        color: "#fef3c7", textColor: "#b45309", icon: "📦" },
                    { val: classificationName,  label: classificationName                || 'Classification', color: "#fee2e2", textColor: "#dc2626", icon: "🏷️" },
                  ].map((item, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span style={{ color: "#ccc" }}>→</span>}
                      <span style={{ padding: "2px 6px", background: item.val ? item.color : "#f3f4f6", color: item.val ? item.textColor : "#999", borderRadius: "3px", fontWeight: "600" }}>
                        {item.icon} {item.label}
                      </span>
                    </React.Fragment>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
                  <div>
                    <label style={s3}><Tag size={9} style={{ display: "inline", marginRight: "3px" }} />Item Type <span style={{ color: "#dc2626" }}>*</span></label>
                    <select value={selectedItemType} onChange={(e) => setSelectedItemType(e.target.value)} style={s2}>
                      <option value="">— Select —</option>
                      {itemTypes.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s3}><Folder size={9} style={{ display: "inline", marginRight: "3px" }} />Category <span style={{ color: "#dc2626" }}>*</span></label>
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={s2} disabled={!selectedItemType}>
                      <option value="">— Select —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s3}><Layers size={9} style={{ display: "inline", marginRight: "3px" }} />Sub-Category <span style={{ color: "#dc2626" }}>*</span></label>
                    <select value={selectedSubCategory} onChange={(e) => setSelectedSubCategory(e.target.value)} style={s2} disabled={!selectedCategory}>
                      <option value="">— Select —</option>
                      {subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s3}><Box size={9} style={{ display: "inline", marginRight: "3px" }} />Product <span style={{ color: "#dc2626" }}>*</span></label>
                    <select value={selectedProduct} onChange={(e) => { setSelectedProduct(e.target.value); setClassificationName(''); setCodePreview(''); }} style={s2} disabled={!selectedSubCategory}>
                      <option value="">— Select —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                    </select>
                    {selectedSubCategory && products.length === 0 && (
                      <p style={{ margin: "2px 0 0", fontSize: "8px", color: "#dc2626" }}>No products found in this sub-category</p>
                    )}
                  </div>
                </div>

                {selectedProduct && getSelectedProductInfo() && (
                  <div style={{ padding: "6px 8px", background: "#ede9fe", borderRadius: "4px", fontSize: "8px", color: "#000" }}>
                    ✅ Product Code: <strong style={{ fontFamily: "monospace" }}>{getSelectedProductInfo().code}</strong> — Classification code will derive from this
                  </div>
                )}
              </div>

              {/* Classification Details */}
              {selectedProduct && (
                <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "12px" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "10px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Award size={12} />Classification Details
                  </h3>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={s3}>Classification Name <span style={{ color: "#dc2626" }}>*</span></label>
                    <input type="text" value={classificationName} onChange={(e) => setClassificationName(e.target.value)} placeholder="e.g., Finished Goods, Raw Material, Grade A" style={s1} />
                    {codePreview && (
                      <div style={{ marginTop: "6px", padding: "5px 10px", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "4px", fontSize: "9px", color: "#000", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        🔤 Auto Code Preview: <strong style={{ fontFamily: "monospace", color: "#7c3aed" }}>{codePreview}</strong>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={s3}>Grade (Optional)</label>
                      <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g., A, B, Premium" style={s1} />
                    </div>
                    <div>
                      <label style={s3}>Quality Standard (Optional)</label>
                      <input type="text" value={qualityStandard} onChange={(e) => setQualityStandard(e.target.value)} placeholder="e.g., ISO 9001, ASTM" style={s1} />
                    </div>
                  </div>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={s3}>Certification (Optional)</label>
                    <input type="text" value={certification} onChange={(e) => setCertification(e.target.value)} placeholder="e.g., CE, FDA, Organic" style={s1} />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={s3}>Description (Optional)</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." style={{ ...s1, minHeight: "60px", resize: "vertical" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                    <button onClick={() => { setClassificationName(''); setDescription(''); setGrade(''); setQualityStandard(''); setCertification(''); setCodePreview(''); }} style={{ padding: "6px 12px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "10px", fontWeight: "600", cursor: "pointer", color: "#000" }}>Reset</button>
                    <button onClick={handleCreateClassification} disabled={loading} style={{ padding: "6px 16px", background: loading ? "#d1d5db" : "linear-gradient(to right, #8b5cf6, #a78bfa)", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}>
                      {loading ? <><Loader size={12} style={{ animation: "spin 1s linear infinite" }} />Creating...</> : <><Save size={12} />Create Classification</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'view' && (
            <div>
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: "300px" }}>
                  <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                  <input type="text" placeholder="Search classifications..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "6px 6px 6px 32px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }} />
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => setViewMode('grid')} style={{ padding: "6px 10px", background: viewMode === 'grid' ? '#8b5cf6' : 'white', border: "1px solid #e0e0e0", borderRadius: "4px", cursor: "pointer", color: viewMode === 'grid' ? 'white' : '#000' }}><Grid size={12} /></button>
                  <button onClick={() => setViewMode('list')} style={{ padding: "6px 10px", background: viewMode === 'list' ? '#8b5cf6' : 'white', border: "1px solid #e0e0e0", borderRadius: "4px", cursor: "pointer", color: viewMode === 'list' ? 'white' : '#000' }}><List size={12} /></button>
                </div>
              </div>

              {filteredClassifications.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#000" }}>
                  <Award size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <h3 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>No Classifications Found</h3>
                  <p style={{ fontSize: "10px", color: "#666" }}>{searchTerm ? 'Try adjusting your search' : 'Create the first classification'}</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: viewMode === 'grid' ? "repeat(auto-fill, minmax(300px, 1fr))" : "1fr", gap: "10px" }}>
                  {filteredClassifications.map(cls => (
                    <div key={cls.id} style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "12px", transition: "all 0.2s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(139,92,246,0.15)"; e.currentTarget.style.borderColor = "#8b5cf6"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e0e0e0"; }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: "11px", fontWeight: "700", color: "#000", marginBottom: "3px" }}>{cls.name}</h4>
                          <p style={{ fontSize: "9px", color: "#666", fontFamily: "monospace", marginBottom: "4px" }}>Code: {cls.code}</p>
                        </div>
                        <button onClick={() => handleDeleteClassification(cls.id, cls.name)} style={{ padding: "3px 6px", background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "3px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                          <Trash2 size={10} color="#dc2626" />
                        </button>
                      </div>
                      {cls.description && <p style={{ fontSize: "9px", color: "#000", marginBottom: "8px", lineHeight: "1.4" }}>{cls.description}</p>}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "8px", marginBottom: "8px" }}>
                        {cls.product_name  && <span style={{ padding: "3px 6px", background: "#ede9fe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>📦 {cls.product_name}</span>}
                        {cls.grade         && <span style={{ padding: "3px 6px", background: "#dbeafe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>🏆 Grade: {cls.grade}</span>}
                        {cls.quality_standard && <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>📋 {cls.quality_standard}</span>}
                        {cls.certification && <span style={{ padding: "3px 6px", background: "#dcfce7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>✅ {cls.certification}</span>}
                      </div>
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

      {/* ── Selector Modal ──────────────────────────────────────────────── */}
      {showSelectorModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "12px", width: "560px", maxWidth: "96vw", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "linear-gradient(135deg, #8b5cf6, #a78bfa)", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: "700", fontSize: "12px" }}>📥 Import Classifications — Select Context</span>
              <button onClick={() => setShowSelectorModal(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: "16px" }}>
              <p style={{ margin: "0 0 12px", fontSize: "10px", color: "#6b7280" }}>
                Optionally pre-select hierarchy — these will be embedded in the template and pre-filled on every imported row.
              </p>

              {[
                { label: "Step A — Item Type",    items: itemTypes,    selected: impItemTypeId,    setSelected: setImpItemTypeId,    getName: t => t.name, getCode: t => t.code, color: "#8b5cf6" },
                { label: "Step B — Category",     items: impItemTypeId ? impFilteredCats : allCategories, selected: impCategoryId,    setSelected: setImpCategoryId,    getName: c => c.name, getCode: () => '', color: "#d97706" },
                { label: "Step C — Sub-Category", items: impCategoryId ? impFilteredSubCats : [], selected: impSubCategoryId, setSelected: setImpSubCategoryId, getName: s => s.name, getCode: () => '', color: "#16a34a" },
                { label: "Step D — Product",      items: impSubCategoryId ? impFilteredProds : [], selected: impProductId,    setSelected: setImpProductId,    getName: p => p.name, getCode: p => p.code, color: "#0284c7" },
              ].map(step => (
                <div key={step.label} style={{ marginBottom: "12px" }}>
                  <p style={{ fontSize: "10px", fontWeight: "700", color: "#374151", margin: "0 0 6px" }}>{step.label} <span style={{ fontWeight: "400", color: "#9ca3af" }}>(optional)</span></p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                    {step.items.length === 0
                      ? <span style={{ fontSize: "9px", color: "#9ca3af" }}>Select previous step first to filter</span>
                      : step.items.map(item => (
                        <button key={item.id} onClick={() => step.setSelected(p => p === String(item.id) ? '' : String(item.id))}
                          style={{ padding: "5px 12px", borderRadius: "20px", cursor: "pointer", border: step.selected === String(item.id) ? `2px solid ${step.color}` : "1px solid #d1d5db", background: step.selected === String(item.id) ? step.color : "white", color: step.selected === String(item.id) ? "white" : "#374151", fontSize: "10px", fontWeight: "600" }}>
                          {step.getName(item)}{step.getCode(item) ? ` (${step.getCode(item)})` : ''}
                        </button>
                      ))
                    }
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div style={{ padding: "6px 10px", background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: "5px", fontSize: "9px", color: "#7c3aed", marginBottom: "14px" }}>
                {impItemType    ? <span>✓ <strong>{impItemType.name}</strong> </span>    : <span style={{ color: "#9ca3af" }}>No Item Type · </span>}
                {impCategory    ? <span>→ <strong>{impCategory.name}</strong> </span>    : <span style={{ color: "#9ca3af" }}>No Category · </span>}
                {impSubCategory ? <span>→ <strong>{impSubCategory.name}</strong> </span> : <span style={{ color: "#9ca3af" }}>No Sub-Category · </span>}
                {impProduct     ? <span>→ <strong>{impProduct.name}</strong></span>      : <span style={{ color: "#9ca3af" }}>No Product</span>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <button
                  onClick={() => {
                    setShowSelectorModal(false);
                    if (impItemTypeId)    setSelectedItemType(impItemTypeId);
                    if (impCategoryId)    setSelectedCategory(impCategoryId);
                    if (impSubCategoryId) setSelectedSubCategory(impSubCategoryId);
                    if (impProductId)     setSelectedProduct(impProductId);
                    setActiveTab('create');
                  }}
                  style={{ padding: "12px", borderRadius: "8px", cursor: "pointer", textAlign: "left", border: "2px solid #e5e7eb", background: "white" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b5cf6"; e.currentTarget.style.background = "#f5f3ff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "white"; }}
                >
                  <div style={{ fontSize: "18px", marginBottom: "4px" }}>✏️</div>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#111", marginBottom: "2px" }}>Manual Entry</div>
                  <div style={{ fontSize: "8px", color: "#6b7280" }}>Pre-fills form selections from above choices.</div>
                </button>
                <button
                  onClick={() => { setShowSelectorModal(false); setShowImportPopup(true); }}
                  style={{ padding: "12px", borderRadius: "8px", cursor: "pointer", textAlign: "left", border: "2px solid #e5e7eb", background: "white" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b5cf6"; e.currentTarget.style.background = "#f5f3ff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "white"; }}
                >
                  <div style={{ fontSize: "18px", marginBottom: "4px" }}>📤</div>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#111", marginBottom: "2px" }}>Upload Excel Template</div>
                  <div style={{ fontSize: "8px", color: "#6b7280" }}>Bulk import via Excel. Pre-selected fields embedded in template.</div>
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setShowSelectorModal(false)} style={{ padding: "5px 14px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "10px", fontWeight: "600", cursor: "pointer", color: "#374151" }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Excel Import Popup ──────────────────────────────────────────── */}
      <ExcelImportPopup
        isOpen={showImportPopup}
        onClose={() => { setShowImportPopup(false); setImpItemTypeId(''); setImpCategoryId(''); setImpSubCategoryId(''); setImpProductId(''); }}
        onSuccess={(results) => {
          const cnt = results.filter(r => r.status === 'success').length;
          if (cnt > 0) { setMessage({ type: 'success', text: `✅ ${cnt} Classification(s) imported from Excel!` }); fetchClassifications(); }
        }}
        title={
          impProduct     ? `Import Classifications — ${impProduct.name}`
          : impSubCategory ? `Import Classifications — ${impSubCategory.name}`
          : impCategory  ? `Import Classifications — ${impCategory.name}`
          : 'Import Classifications from Excel'
        }
        accentColor="#8b5cf6"
        apiEndpoint={`${API_BASE}/item-product-classification/import`}
        apiMethod="POST"
        fields={[
          { key: 'name',             label: 'Classification Name', required: true  },
          { key: 'grade',            label: 'Grade',               required: false },
          { key: 'quality_standard', label: 'Quality Standard',    required: false },
          { key: 'certification',    label: 'Certification',       required: false },
          { key: 'description',      label: 'Description',         required: false },
        ]}
        templateDropdownFields={(() => {
          const dd = [];
          if (!impItemTypeId)    dd.push({ key: 'item_type_id',   label: 'Item Type',    options: itemTypes.map(t => ({ label: `${t.name} (${t.code})`, value: t.id })) });
          if (!impCategoryId)    dd.push({ key: 'category_id',    label: 'Category',     options: (impItemTypeId ? impFilteredCats : allCategories).map(c => ({ label: `${c.name} (${c.code})`, value: c.id })) });
          if (!impSubCategoryId) dd.push({ key: 'subcategory_id', label: 'Sub-Category', options: (impCategoryId ? impFilteredSubCats : allSubCategories).map(s => ({ label: `${s.name} (${s.code})`, value: s.id })) });
          if (!impProductId)     dd.push({ key: 'product_id',     label: 'Product',      options: (impSubCategoryId ? impFilteredProds : allProducts).map(p => ({ label: `${p.name} (${p.code})`, value: p.id })) });
          return dd;
        })()}
        lookupFields={(() => {
          const lf = [];
          if (!impItemTypeId)    lf.push({ key: 'item_type_id',   label: 'Item Type',    data: itemTypes,       matchKey: 'name', valueKey: 'id', caseSensitive: false });
          if (!impCategoryId)    lf.push({ key: 'category_id',    label: 'Category',     data: impItemTypeId ? impFilteredCats : allCategories, matchKey: 'name', valueKey: 'id', caseSensitive: false });
          if (!impSubCategoryId) lf.push({ key: 'subcategory_id', label: 'Sub-Category', data: impCategoryId ? impFilteredSubCats : allSubCategories, matchKey: 'name', valueKey: 'id', caseSensitive: false });
          if (!impProductId)     lf.push({ key: 'product_id',     label: 'Product',      data: impSubCategoryId ? impFilteredProds : allProducts, matchKey: 'name', valueKey: 'id', caseSensitive: false });
          return lf;
        })()}
        extraFormData={(() => {
          const ex = {};
          if (impProductId)    ex.product_id = impProductId;
          if (currentUser?.id) ex.user_id = currentUser.id;
          return ex;
        })()}
        importNote={
          impProduct     ? `All rows imported under Product: ${impProduct.name}. Classification Code is always auto-generated.`
          : impSubCategory ? `All rows under Sub-Category: ${impSubCategory.name}. Product column auto-resolves to ID.`
          : 'Full hierarchy columns auto-resolve to IDs on import. Classification Code is always auto-generated.'
        }
      />
    </div>
  );
}