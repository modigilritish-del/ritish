import React, { useState, useEffect } from 'react';
import { Box, Search, Eye, Trash2, CheckCircle, XCircle, AlertCircle, Loader, Grid, List, Plus, Save, Info, Tag, Folder, Layers, Globe, Building, Factory, Upload } from 'lucide-react';
import ExcelImportPopup from '../pages/ExcelImportPopup';

const API_BASE = 'http://localhost:8000/api';

export default function AddProduct() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Master Data (cascading)
  const [itemTypes, setItemTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [existingProducts, setExistingProducts] = useState([]);

  // Scope master data
  const [companiesWithPlants, setCompaniesWithPlants] = useState([]);

  // Form State
  const [selectedItemType, setSelectedItemType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [codePreview, setCodePreview] = useState('');

  // Scope state
  const [scopeType, setScopeType] = useState('global');        // 'global' | 'company' | 'plant' | 'multi_company'
  const [selectedCompanies, setSelectedCompanies] = useState([]); // list of company_ids
  const [selectedPlant, setSelectedPlant] = useState('');

  // View State
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [filterItemTypeId, setFilterItemTypeId] = useState('');

  // ── Import State ─────────────────────────────────────────────────────────
  const [showImportPopup,   setShowImportPopup]   = useState(false);
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [impItemTypeId,     setImpItemTypeId]     = useState('');
  const [impCategoryId,     setImpCategoryId]     = useState('');
  const [impSubCategoryId,  setImpSubCategoryId]  = useState('');
  const [impFilteredCats,   setImpFilteredCats]   = useState([]);
  const [impFilteredSubCats,setImpFilteredSubCats]= useState([]);
  const [allCategories,     setAllCategories]     = useState([]);
  const [allSubCategories,  setAllSubCategories]  = useState([]);

  const impItemType   = itemTypes.find(t => String(t.id) === String(impItemTypeId)) || null;
  const impCategory   = allCategories.find(c => String(c.id) === String(impCategoryId)) || null;
  const impSubCategory= allSubCategories.find(s => String(s.id) === String(impSubCategoryId)) || null;

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
      fetchProducts();
      fetchCompaniesWithPlants(currentUser.id);
      fetchAllCategories();
      fetchAllSubCategories();
    }
  }, [currentUser]);

  // import modal: filter categories by item type
  useEffect(() => {
    if (impItemTypeId) {
      setImpFilteredCats(allCategories.filter(c => String(c.item_type_id) === String(impItemTypeId)));
    } else {
      setImpFilteredCats(allCategories);
    }
    setImpCategoryId('');
    setImpSubCategoryId('');
  }, [impItemTypeId, allCategories]);

  // import modal: filter sub-categories by category
  useEffect(() => {
    if (impCategoryId) {
      setImpFilteredSubCats(allSubCategories.filter(s => String(s.category_id) === String(impCategoryId)));
    } else {
      setImpFilteredSubCats([]);
    }
    setImpSubCategoryId('');
  }, [impCategoryId, allSubCategories]);

  useEffect(() => {
    if (selectedItemType) {
      setSelectedCategory(''); setSelectedSubCategory(''); setSubCategories([]);
      fetchCategoriesByType(selectedItemType);
    } else {
      setCategories([]); setSelectedCategory(''); setSelectedSubCategory('');
    }
  }, [selectedItemType]);

  useEffect(() => {
    if (selectedCategory) {
      setSelectedSubCategory('');
      fetchSubCategoriesByCat(selectedCategory);
    } else {
      setSubCategories([]); setSelectedSubCategory('');
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (currentUser?.id) fetchProducts();
  }, [filterItemTypeId]);

  useEffect(() => {
    if (productName.trim() && selectedSubCategory) {
      const timer = setTimeout(() => {
        fetch(`${API_BASE}/item-product/preview-code?name=${encodeURIComponent(productName)}&subcategory_id=${selectedSubCategory}`)
          .then(r => r.json())
          .then(d => setCodePreview(d.preview_code || ''))
          .catch(() => setCodePreview(''));
      }, 300);
      return () => clearTimeout(timer);
    } else { setCodePreview(''); }
  }, [productName, selectedSubCategory]);

  // Reset plant when scope changes or companies deselected
  useEffect(() => {
    setSelectedPlant('');
  }, [scopeType, selectedCompanies]);

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
      if (!res.ok) { setAllCategories([]); return; }
      const data = await res.json();
      setAllCategories(Array.isArray(data) ? data : []);
    } catch (err) { setAllCategories([]); }
  };

  const fetchAllSubCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/item-sub-category/lov`);
      if (!res.ok) { setAllSubCategories([]); return; }
      const data = await res.json();
      setAllSubCategories(Array.isArray(data) ? data : []);
    } catch (err) { setAllSubCategories([]); }
  };

  const fetchCategoriesByType = async (itemTypeId) => {
    try {
      const res = await fetch(`${API_BASE}/item-category/lov?item_type_id=${itemTypeId}`);
      if (!res.ok) { setCategories([]); return; }
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setCategories([]); }
  };

  const fetchSubCategoriesByCat = async (catId) => {
    try {
      const res = await fetch(`${API_BASE}/item-sub-category/lov?category_id=${catId}`);
      if (!res.ok) { setSubCategories([]); return; }
      const data = await res.json();
      setSubCategories(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setSubCategories([]); }
  };

  const fetchProducts = async () => {
    if (!currentUser?.id) return;
    try {
      let url = `${API_BASE}/item-product/?`;
      if (filterItemTypeId) url += `item_type_id=${filterItemTypeId}&`;
      const res = await fetch(url);
      if (!res.ok) { setExistingProducts([]); return; }
      const data = await res.json();
      setExistingProducts(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setExistingProducts([]); }
  };

  const fetchCompaniesWithPlants = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/user/${userId}/companies-with-plants`);
      if (!res.ok) { setCompaniesWithPlants([]); return; }
      const data = await res.json();
      setCompaniesWithPlants(data.companies || []);
    } catch (err) { console.error(err); setCompaniesWithPlants([]); }
  };

  const handleCompanyToggle = (companyId) => {
    setSelectedCompanies(prev =>
      prev.includes(companyId) ? prev.filter(id => id !== companyId) : [...prev, companyId]
    );
  };

  const handleCreateProduct = async () => {
    if (!selectedItemType) { setMessage({ type: 'error', text: 'Please select an Item Type' }); return; }
    if (!selectedCategory) { setMessage({ type: 'error', text: 'Please select a Category' }); return; }
    if (!selectedSubCategory) { setMessage({ type: 'error', text: 'Please select a Sub-Category' }); return; }
    if (!productName.trim()) { setMessage({ type: 'error', text: 'Product name is required' }); return; }

    // Scope validation
    if ((scopeType === 'company' || scopeType === 'plant') && selectedCompanies.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one company' }); return;
    }
    if (scopeType === 'plant' && !selectedPlant) {
      setMessage({ type: 'error', text: 'Please select a plant' }); return;
    }
    if (scopeType === 'multi_company' && selectedCompanies.length < 2) {
      setMessage({ type: 'error', text: 'Select at least 2 companies for Multi-Company scope' }); return;
    }

    setLoading(true);
    try {
      // Build scope payload
      let scopePayload = {};
      if (scopeType === 'global') {
        scopePayload = { company_id: null, company_ids: null, plant_id: null };
      } else if (scopeType === 'company') {
        scopePayload = { company_id: selectedCompanies[0], company_ids: null, plant_id: null };
      } else if (scopeType === 'plant') {
        scopePayload = { company_id: selectedCompanies[0], company_ids: null, plant_id: parseInt(selectedPlant) };
      } else if (scopeType === 'multi_company') {
        scopePayload = { company_id: null, company_ids: selectedCompanies, plant_id: null };
      }

      const res = await fetch(`${API_BASE}/item-product/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subcategory_id: parseInt(selectedSubCategory),
          name: productName.trim(),
          description: description.trim() || null,
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
          created_by: currentUser?.id || null,
          ...scopePayload,
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Product "${data.name}" created with code ${data.code}` });
        setProductName(''); setDescription(''); setSku(''); setBarcode(''); setCodePreview('');
        setScopeType('global'); setSelectedCompanies([]); setSelectedPlant('');
        fetchProducts();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to create product' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error creating product' });
    } finally { setLoading(false); }
  };

  const handleDeleteProduct = async (productId, pName) => {
    if (!window.confirm(`Are you sure you want to deactivate "${pName}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/item-product/${productId}?updated_by=${currentUser?.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) { setMessage({ type: 'success', text: data.message }); fetchProducts(); }
      else setMessage({ type: 'error', text: data.detail });
    } catch (err) { setMessage({ type: 'error', text: 'Error deleting product' }); }
  };

  const filteredProducts = existingProducts.filter(p =>
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSelectedSubCategoryInfo = () => subCategories.find(s => String(s.id) === String(selectedSubCategory));
  const getSelectedCategoryInfo = () => categories.find(c => String(c.id) === String(selectedCategory));
  const getSelectedItemTypeInfo = () => itemTypes.find(t => String(t.id) === String(selectedItemType));

  // Available plants for selected single company
  const availablePlants = selectedCompanies.length === 1
    ? companiesWithPlants.find(c => c.company_id === selectedCompanies[0])?.plants || []
    : [];

  const scopeBadgeColor = (scope) => {
    if (scope === 'global')        return { bg: '#dcfce7', color: '#15803d' };
    if (scope === 'company')       return { bg: '#dbeafe', color: '#1d4ed8' };
    if (scope === 'plant')         return { bg: '#fef3c7', color: '#b45309' };
    if (scope === 'multi_company') return { bg: '#ede9fe', color: '#7c3aed' };
    return { bg: '#f3f4f6', color: '#666' };
  };

  const s1 = { width: "100%", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", boxSizing: "border-box", color: "#000" };
  const s2 = { ...s1, cursor: "pointer" };
  const s3 = { display: "block", fontSize: "9px", fontWeight: "600", marginBottom: "4px", color: "#000" };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "95%", maxWidth: "1200px", height: "90%", maxHeight: "700px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", background: "linear-gradient(to right, #8b5cf6, #a78bfa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Box size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>📦 Product Management</h2>
          </div>
          <button
            onClick={() => { setImpItemTypeId(''); setImpCategoryId(''); setImpSubCategoryId(''); setShowSelectorModal(true); }}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 9px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "4px", color: "white", fontSize: "9px", fontWeight: "700", cursor: "pointer" }}
          >
            <Upload size={10} /> Import Products
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
                {tab === 'create' ? <><Plus size={12} />Create Product</> : <><Eye size={12} />View Products ({filteredProducts.length})</>}
              </div>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>

          {activeTab === 'create' && (
            <div>
              {/* Info Box */}
              <div style={{ background: "#e9d5ff", border: "1px solid #c4b5fd", borderRadius: "6px", padding: "10px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "start", gap: "8px" }}>
                  <Info size={14} style={{ color: "#000", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>📦 PRODUCT RULES</div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "9px", color: "#000", lineHeight: "1.5" }}>
                      <li><strong>Steps 1–3:</strong> Select Item Type → Category → Sub-Category</li>
                      <li><strong>Step 4 (Scope):</strong> Choose Global, Company-wide, Plant-specific, or Multi-Company</li>
                      <li><strong>Step 5:</strong> Enter Product Name — code auto-generated as <strong>{'{SubCatCode}-PRD-{NNNN}'}</strong></li>
                      <li>SKU and Barcode are optional but must be unique if provided</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Cascade Selectors */}
              <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "10px", color: "#000" }}>Select Hierarchy (Steps 1–3)</h3>
                <div style={{ fontSize: "8px", color: "#666", marginBottom: "10px", display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                  <span style={{ padding: "2px 6px", background: selectedItemType ? "#ede9fe" : "#f3f4f6", color: selectedItemType ? "#7c3aed" : "#999", borderRadius: "3px", fontWeight: "600" }}>🏷️ {selectedItemType ? getSelectedItemTypeInfo()?.name : 'Item Type'}</span>
                  <span style={{ color: "#ccc" }}>→</span>
                  <span style={{ padding: "2px 6px", background: selectedCategory ? "#dbeafe" : "#f3f4f6", color: selectedCategory ? "#1d4ed8" : "#999", borderRadius: "3px", fontWeight: "600" }}>📂 {selectedCategory ? getSelectedCategoryInfo()?.name : 'Category'}</span>
                  <span style={{ color: "#ccc" }}>→</span>
                  <span style={{ padding: "2px 6px", background: selectedSubCategory ? "#dcfce7" : "#f3f4f6", color: selectedSubCategory ? "#16a34a" : "#999", borderRadius: "3px", fontWeight: "600" }}>📚 {selectedSubCategory ? getSelectedSubCategoryInfo()?.name : 'Sub-Category'}</span>
                  <span style={{ color: "#ccc" }}>→</span>
                  <span style={{ padding: "2px 6px", background: productName ? "#fef3c7" : "#f3f4f6", color: productName ? "#b45309" : "#999", borderRadius: "3px", fontWeight: "600" }}>📦 {productName || 'Product'}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={s3}><Tag size={9} style={{ display: "inline", marginRight: "3px" }} />Step 1: Item Type <span style={{ color: "#dc2626" }}>*</span></label>
                    <select value={selectedItemType} onChange={(e) => setSelectedItemType(e.target.value)} style={s2}>
                      <option value="">— Select —</option>
                      {itemTypes.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s3}><Folder size={9} style={{ display: "inline", marginRight: "3px" }} />Step 2: Category <span style={{ color: "#dc2626" }}>*</span></label>
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={s2} disabled={!selectedItemType}>
                      <option value="">— Select —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {selectedItemType && categories.length === 0 && <p style={{ margin: "2px 0 0", fontSize: "8px", color: "#dc2626" }}>No categories found</p>}
                  </div>
                  <div>
                    <label style={s3}><Layers size={9} style={{ display: "inline", marginRight: "3px" }} />Step 3: Sub-Category <span style={{ color: "#dc2626" }}>*</span></label>
                    <select value={selectedSubCategory} onChange={(e) => setSelectedSubCategory(e.target.value)} style={s2} disabled={!selectedCategory}>
                      <option value="">— Select —</option>
                      {subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {selectedCategory && subCategories.length === 0 && <p style={{ margin: "2px 0 0", fontSize: "8px", color: "#dc2626" }}>No sub-categories found</p>}
                  </div>
                </div>
                {selectedSubCategory && getSelectedSubCategoryInfo() && (
                  <div style={{ marginTop: "8px", padding: "6px 8px", background: "#ede9fe", borderRadius: "4px", fontSize: "8px", color: "#000" }}>
                    ✅ Sub-Category Code: <strong style={{ fontFamily: "monospace" }}>{getSelectedSubCategoryInfo().code}</strong> — Product code will derive from this
                  </div>
                )}
              </div>

              {/* ── STEP 4: SCOPE ─────────────────────────────────────────────────── */}
              {selectedSubCategory && (
                <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Globe size={12} />Step 4: Product Scope
                    <span style={{ fontSize: "8px", fontWeight: "400", color: "#666" }}>(optional — default is Global)</span>
                  </h3>

                  {/* Scope type selector */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "10px" }}>
                    {[
                      { key: 'global',        icon: <Globe size={10} />,    label: 'Global',        sub: 'All companies & plants' },
                      { key: 'company',       icon: <Building size={10} />, label: 'Company-wide',  sub: 'Single company, all plants' },
                      { key: 'plant',         icon: <Factory size={10} />,  label: 'Plant-specific', sub: 'Single company & plant' },
                      { key: 'multi_company', icon: <Globe size={10} />,    label: 'Multi-Company', sub: 'Multiple companies' },
                    ].map(opt => (
                      <label key={opt.key} style={{ display: "flex", alignItems: "flex-start", gap: "6px", padding: "8px", border: scopeType === opt.key ? "2px solid #8b5cf6" : "1px solid #e0e0e0", borderRadius: "4px", cursor: "pointer", background: scopeType === opt.key ? "#f3e8ff" : "white" }}>
                        <input type="radio" checked={scopeType === opt.key} onChange={() => { setScopeType(opt.key); setSelectedCompanies([]); setSelectedPlant(''); }} style={{ marginTop: "2px" }} />
                        <div>
                          <div style={{ fontSize: "9px", fontWeight: "600", color: "#000", display: "flex", alignItems: "center", gap: "3px" }}>{opt.icon}{opt.label}</div>
                          <div style={{ fontSize: "8px", color: "#666" }}>{opt.sub}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Global info */}
                  {scopeType === 'global' && (
                    <div style={{ padding: "6px 8px", background: "#dcfce7", borderRadius: "4px", fontSize: "9px", color: "#15803d", fontWeight: "500" }}>
                      🌍 This product will be available globally — no company or plant restriction.
                    </div>
                  )}

                  {/* Company / Plant selectors */}
                  {(scopeType === 'company' || scopeType === 'plant' || scopeType === 'multi_company') && (
                    <div>
                      <label style={s3}>
                        {scopeType === 'multi_company' ? 'Select Companies (min 2)' : 'Select Company'} <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <div style={{ maxHeight: "120px", overflowY: "auto", border: "1px solid #e0e0e0", borderRadius: "4px", background: "white", padding: "6px", marginBottom: "8px" }}>
                        {companiesWithPlants.length === 0 ? (
                          <div style={{ padding: "10px", textAlign: "center", fontSize: "9px", color: "#666" }}>No companies available</div>
                        ) : (
                          companiesWithPlants.map(company => (
                            <label key={company.company_id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 6px", cursor: "pointer", borderRadius: "3px", marginBottom: "2px", background: selectedCompanies.includes(company.company_id) ? "#f3e8ff" : "transparent", border: selectedCompanies.includes(company.company_id) ? "1px solid #8b5cf6" : "1px solid transparent" }}>
                              <input
                                type={scopeType === 'multi_company' ? 'checkbox' : 'radio'}
                                checked={selectedCompanies.includes(company.company_id)}
                                onChange={() => {
                                  if (scopeType === 'multi_company') {
                                    handleCompanyToggle(company.company_id);
                                  } else {
                                    setSelectedCompanies([company.company_id]);
                                    setSelectedPlant('');
                                  }
                                }}
                                style={{ cursor: "pointer" }}
                              />
                              <span style={{ fontSize: "9px", color: "#000", fontWeight: "500" }}>{company.company_name} ({company.company_code})</span>
                            </label>
                          ))
                        )}
                      </div>

                      {/* Plant selector for plant-specific scope */}
                      {scopeType === 'plant' && selectedCompanies.length === 1 && (
                        <div>
                          <label style={s3}>Select Plant <span style={{ color: "#dc2626" }}>*</span></label>
                          <select value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)} style={s2}>
                            <option value="">— Select Plant —</option>
                            {availablePlants.map(p => (
                              <option key={p.plant_id} value={p.plant_id}>{p.plant_name} ({p.plant_code})</option>
                            ))}
                          </select>
                          {availablePlants.length === 0 && (
                            <p style={{ margin: "2px 0 0", fontSize: "8px", color: "#dc2626" }}>No plants found for this company</p>
                          )}
                        </div>
                      )}

                      {/* Scope summary */}
                      {selectedCompanies.length > 0 && (
                        <div style={{ marginTop: "6px", padding: "5px 8px", background: "#ede9fe", borderRadius: "4px", fontSize: "8px", color: "#000" }}>
                          <strong>Scope:</strong>{' '}
                          {scopeType === 'multi_company' && `${selectedCompanies.length} companies selected`}
                          {scopeType === 'company' && `Company-wide — ${companiesWithPlants.find(c => c.company_id === selectedCompanies[0])?.company_name || ''}`}
                          {scopeType === 'plant' && selectedPlant && `Plant-specific — ${availablePlants.find(p => p.plant_id === parseInt(selectedPlant))?.plant_name || ''}`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* ── END SCOPE ─────────────────────────────────────────────────────── */}

              {/* Product Details */}
              {selectedSubCategory && (
                <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "12px" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "10px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Box size={12} />Step 5: Product Details
                  </h3>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={s3}>Product Name <span style={{ color: "#dc2626" }}>*</span></label>
                    <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g., iPhone 15, Samsung S24, Steel Rod 10mm" style={s1} />
                    {codePreview && (
                      <div style={{ marginTop: "6px", padding: "5px 10px", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "4px", fontSize: "9px", color: "#000", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        🔤 Auto Code Preview: <strong style={{ fontFamily: "monospace", color: "#7c3aed" }}>{codePreview}</strong>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={s3}>SKU (Optional)</label>
                      <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g., SKU123456" style={s1} />
                    </div>
                    <div>
                      <label style={s3}>Barcode (Optional)</label>
                      <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="e.g., 1234567890123" style={s1} />
                    </div>
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={s3}>Description (Optional)</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this product" style={{ ...s1, minHeight: "60px", resize: "vertical" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                    <button onClick={() => { setProductName(''); setDescription(''); setSku(''); setBarcode(''); setCodePreview(''); setScopeType('global'); setSelectedCompanies([]); setSelectedPlant(''); }} style={{ padding: "6px 12px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "10px", fontWeight: "600", cursor: "pointer", color: "#000" }}>Reset</button>
                    <button onClick={handleCreateProduct} disabled={loading} style={{ padding: "6px 16px", background: loading ? "#d1d5db" : "linear-gradient(to right, #8b5cf6, #a78bfa)", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}>
                      {loading ? <><Loader size={12} style={{ animation: "spin 1s linear infinite" }} />Creating...</> : <><Save size={12} />Create Product</>}
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
                  <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "6px 6px 6px 32px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }} />
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

              {filteredProducts.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#000" }}>
                  <Box size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <h3 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#000" }}>No Products Found</h3>
                  <p style={{ fontSize: "10px", color: "#666" }}>{searchTerm ? 'Try adjusting your search' : 'Create the first product'}</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: viewMode === 'grid' ? "repeat(auto-fill, minmax(280px, 1fr))" : "1fr", gap: "10px" }}>
                  {filteredProducts.map(product => {
                    const sc = scopeBadgeColor(product.scope);
                    return (
                      <div key={product.id} style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "12px", transition: "all 0.2s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(139,92,246,0.15)"; e.currentTarget.style.borderColor = "#8b5cf6"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e0e0e0"; }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: "11px", fontWeight: "700", color: "#000", marginBottom: "3px" }}>{product.name}</h4>
                            <p style={{ fontSize: "9px", color: "#666", fontFamily: "monospace", marginBottom: "4px" }}>Code: {product.code}</p>
                          </div>
                          <button onClick={() => handleDeleteProduct(product.id, product.name)} style={{ padding: "3px 6px", background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "3px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                            <Trash2 size={10} color="#dc2626" />
                          </button>
                        </div>
                        {product.description && <p style={{ fontSize: "9px", color: "#000", marginBottom: "8px", lineHeight: "1.4" }}>{product.description}</p>}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "8px", marginBottom: "8px" }}>
                          {product.item_type_name && <span style={{ padding: "3px 6px", background: "#ede9fe", color: "#7c3aed", borderRadius: "3px", fontWeight: "500" }}>🏷️ {product.item_type_name}</span>}
                          {product.category_name && <span style={{ padding: "3px 6px", background: "#dbeafe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>📂 {product.category_name}</span>}
                          {product.subcategory_name && <span style={{ padding: "3px 6px", background: "#dcfce7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>📚 {product.subcategory_name}</span>}
                          {product.sku && <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>🏷️ SKU: {product.sku}</span>}
                          {/* Scope badge */}
                          {product.scope_label && (
                            <span style={{ padding: "3px 6px", background: sc.bg, color: sc.color, borderRadius: "3px", fontWeight: "600", fontStyle: "italic" }}>
                              🔎 {product.scope_label}
                            </span>
                          )}
                        </div>
                        {product.total_classifications > 0 && (
                          <div style={{ padding: "6px", background: "#f9fafb", borderRadius: "3px", fontSize: "8px", color: "#000" }}>
                            🏷️ {product.total_classifications} classifications
                          </div>
                        )}
                      </div>
                    );
                  })}
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
          <div style={{ background: "white", borderRadius: "12px", width: "540px", maxWidth: "96vw", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "linear-gradient(135deg, #8b5cf6, #a78bfa)", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: "700", fontSize: "12px" }}>📥 Import Products — Select Context</span>
              <button onClick={() => setShowSelectorModal(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: "16px" }}>
              <p style={{ margin: "0 0 12px", fontSize: "10px", color: "#6b7280" }}>
                Optionally pre-select hierarchy — these will be embedded in the template and pre-filled on every imported row.
              </p>

              {/* Step A — Item Type */}
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#374151", margin: "0 0 6px" }}>Step A — Item Type <span style={{ fontWeight: "400", color: "#9ca3af" }}>(optional)</span></p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "12px" }}>
                {itemTypes.length === 0 ? <span style={{ fontSize: "9px", color: "#9ca3af" }}>Loading…</span> : itemTypes.map(t => (
                  <button key={t.id} onClick={() => setImpItemTypeId(p => p === String(t.id) ? '' : String(t.id))}
                    style={{ padding: "5px 12px", borderRadius: "20px", cursor: "pointer", border: impItemTypeId === String(t.id) ? "2px solid #8b5cf6" : "1px solid #d1d5db", background: impItemTypeId === String(t.id) ? "#8b5cf6" : "white", color: impItemTypeId === String(t.id) ? "white" : "#374151", fontSize: "10px", fontWeight: "600" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "8px", opacity: 0.8 }}>{t.code}</span> {t.name}
                  </button>
                ))}
              </div>

              {/* Step B — Category */}
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#374151", margin: "0 0 6px" }}>Step B — Category <span style={{ fontWeight: "400", color: "#9ca3af" }}>(optional)</span></p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "12px" }}>
                {(impItemTypeId ? impFilteredCats : allCategories).length === 0
                  ? <span style={{ fontSize: "9px", color: "#9ca3af" }}>{impItemTypeId ? "No categories for this Item Type" : "Select Item Type first to filter"}</span>
                  : (impItemTypeId ? impFilteredCats : allCategories).map(c => (
                    <button key={c.id} onClick={() => setImpCategoryId(p => p === String(c.id) ? '' : String(c.id))}
                      style={{ padding: "5px 12px", borderRadius: "20px", cursor: "pointer", border: impCategoryId === String(c.id) ? "2px solid #d97706" : "1px solid #d1d5db", background: impCategoryId === String(c.id) ? "#d97706" : "white", color: impCategoryId === String(c.id) ? "white" : "#374151", fontSize: "10px", fontWeight: "600" }}>
                      {c.name}
                    </button>
                  ))}
              </div>

              {/* Step C — Sub-Category */}
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#374151", margin: "0 0 6px" }}>Step C — Sub-Category <span style={{ fontWeight: "400", color: "#9ca3af" }}>(optional)</span></p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "12px" }}>
                {impFilteredSubCats.length === 0
                  ? <span style={{ fontSize: "9px", color: "#9ca3af" }}>{impCategoryId ? "No sub-categories for this Category" : "Select Category first to filter"}</span>
                  : impFilteredSubCats.map(s => (
                    <button key={s.id} onClick={() => setImpSubCategoryId(p => p === String(s.id) ? '' : String(s.id))}
                      style={{ padding: "5px 12px", borderRadius: "20px", cursor: "pointer", border: impSubCategoryId === String(s.id) ? "2px solid #16a34a" : "1px solid #d1d5db", background: impSubCategoryId === String(s.id) ? "#16a34a" : "white", color: impSubCategoryId === String(s.id) ? "white" : "#374151", fontSize: "10px", fontWeight: "600" }}>
                      {s.name}
                    </button>
                  ))}
              </div>

              {/* Summary */}
              <div style={{ padding: "6px 10px", background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: "5px", fontSize: "9px", color: "#7c3aed", marginBottom: "14px" }}>
                {impItemType    ? <span>✓ <strong>{impItemType.name}</strong> </span>    : <span style={{ color: "#9ca3af" }}>No Item Type · </span>}
                {impCategory    ? <span>→ <strong>{impCategory.name}</strong> </span>    : <span style={{ color: "#9ca3af" }}>No Category · </span>}
                {impSubCategory ? <span>→ <strong>{impSubCategory.name}</strong></span>  : <span style={{ color: "#9ca3af" }}>No Sub-Category</span>}
              </div>

              {/* Action buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <button
                  onClick={() => {
                    setShowSelectorModal(false);
                    if (impItemTypeId)    setSelectedItemType(impItemTypeId);
                    if (impCategoryId)    setSelectedCategory(impCategoryId);
                    if (impSubCategoryId) setSelectedSubCategory(impSubCategoryId);
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
        onClose={() => { setShowImportPopup(false); setImpItemTypeId(''); setImpCategoryId(''); setImpSubCategoryId(''); }}
        onSuccess={(results) => {
          const cnt = results.filter(r => r.status === 'success').length;
          if (cnt > 0) { setMessage({ type: 'success', text: `✅ ${cnt} Product(s) imported from Excel!` }); fetchProducts(); }
        }}
        title={
          impSubCategory ? `Import Products — ${impSubCategory.name}`
          : impCategory  ? `Import Products — ${impCategory.name}`
          : impItemType  ? `Import Products — ${impItemType.name}`
          : 'Import Products from Excel'
        }
        accentColor="#8b5cf6"
        apiEndpoint={`${API_BASE}/item-product/import`}
        apiMethod="POST"
        fields={[
          { key: 'name',        label: 'Product Name', required: true  },
          { key: 'description', label: 'Description',  required: false },
          { key: 'sku',         label: 'SKU',          required: false },
          { key: 'barcode',     label: 'Barcode',       required: false },
        ]}
        templateDropdownFields={(() => {
          const dd = [];
          if (!impItemTypeId)    dd.push({ key: 'item_type_id',    label: 'Item Type',    options: itemTypes.map(t => ({ label: `${t.name} (${t.code})`, value: t.id })) });
          if (!impCategoryId)    dd.push({ key: 'category_id',     label: 'Category',     options: (impItemTypeId ? impFilteredCats : allCategories).map(c => ({ label: `${c.name} (${c.code})`, value: c.id })) });
          if (!impSubCategoryId) dd.push({ key: 'subcategory_id',  label: 'Sub-Category', options: (impCategoryId ? impFilteredSubCats : allSubCategories).map(s => ({ label: `${s.name} (${s.code})`, value: s.id })) });
          return dd;
        })()}
        lookupFields={(() => {
          const lf = [];
          if (!impItemTypeId)    lf.push({ key: 'item_type_id',    label: 'Item Type',    data: itemTypes,       matchKey: 'name', valueKey: 'id', caseSensitive: false });
          if (!impCategoryId)    lf.push({ key: 'category_id',     label: 'Category',     data: impItemTypeId ? impFilteredCats : allCategories, matchKey: 'name', valueKey: 'id', caseSensitive: false });
          if (!impSubCategoryId) lf.push({ key: 'subcategory_id',  label: 'Sub-Category', data: impCategoryId ? impFilteredSubCats : allSubCategories, matchKey: 'name', valueKey: 'id', caseSensitive: false });
          return lf;
        })()}
        extraFormData={(() => {
          const ex = {};
          if (impSubCategoryId) ex.subcategory_id = impSubCategoryId;
          if (currentUser?.id)  ex.user_id = currentUser.id;
          return ex;
        })()}
        importNote={
          impSubCategory ? `All rows imported under Sub-Category: ${impSubCategory.name}. Product Code is always auto-generated.`
          : impCategory  ? `All rows under Category: ${impCategory.name}. Sub-Category column auto-resolves to ID.`
          : 'Item Type, Category, Sub-Category columns auto-resolve to IDs on import. Product Code is always auto-generated.'
        }
      />
    </div>
  );
}