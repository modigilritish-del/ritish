import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Ruler, Save, Check, X, AlertCircle, Info, Eye, Loader, Filter, Calculator, ArrowRight, Zap, TrendingUp } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/uom';

const UOMUnitsPageAdvanced = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [uoms, setUoms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [baseUoms, setBaseUoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [editingUom, setEditingUom] = useState(null);
  const [errors, setErrors] = useState({});
  const [hasBaseUnit, setHasBaseUnit] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    category_id: '',
    is_base: false,
    base_uom_id: null,
    conversion_factor: 1,
    rounding_precision: 0.0001,
    is_active: true
  });

  // Common precision defaults by category
  const PRECISION_DEFAULTS = {
    'WEIGHT': 0.0001,
    'VOLUME': 0.0001,
    'LENGTH': 0.0001,
    'AREA': 0.001,
    'QUANTITY': 1,
    'TIME': 1,
    'TEMPERATURE': 1,
    'PACKAGING': 1,
    'ENERGY': 0.001,
    'PRESSURE': 0.01,
    'SPEED': 0.01
  };

  useEffect(() => {
    fetchCategories();
    fetchUoms();
  }, []);

  useEffect(() => {
    if (formData.category_id) {
      fetchBaseUoms(formData.category_id);
      checkBaseUnitExists(formData.category_id);
      
      // Auto-set precision based on category
      const category = categories.find(c => c.id === formData.category_id);
      if (category && !editingUom) {
        const defaultPrecision = PRECISION_DEFAULTS[category.code] || 0.0001;
        setFormData(prev => ({ ...prev, rounding_precision: defaultPrecision }));
      }
    }
  }, [formData.category_id]);

  useEffect(() => {
    if (filterCategory) fetchUoms(filterCategory);
    else fetchUoms();
  }, [filterCategory, filterType]);

  useEffect(() => {
    if (formData.is_base) {
      setFormData(prev => ({ ...prev, conversion_factor: 1, base_uom_id: null }));
    }
  }, [formData.is_base]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data.items || []);
    } catch (err) {
      showError('Error fetching categories: ' + err.message);
    }
  };

  const fetchUoms = async (categoryCode = null) => {
    setLoading(true);
    try {
      let url = `${API_BASE}/units?limit=500`;
      if (categoryCode) url += `&category_code=${categoryCode}`;
      if (filterType === 'base') url += '&is_base=true';
      if (filterType === 'derived') url += '&is_base=false';
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch units');
      const data = await res.json();
      setUoms(data.items || []);
    } catch (err) {
      showError('Error fetching units: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBaseUoms = async (categoryId) => {
    try {
      const res = await fetch(`${API_BASE}/units?category_id=${categoryId}&is_base=true`);
      if (!res.ok) throw new Error('Failed to fetch base units');
      const data = await res.json();
      setBaseUoms(data.items || []);
    } catch (err) {
      setBaseUoms([]);
    }
  };

  const checkBaseUnitExists = async (categoryId) => {
    try {
      const res = await fetch(`${API_BASE}/units?category_id=${categoryId}&is_base=true`);
      const data = await res.json();
      setHasBaseUnit((data.items || []).length > 0);
    } catch (err) {
      setHasBaseUnit(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    } else if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      newErrors.code = 'Code must be uppercase letters, numbers, and underscores';
    }
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.category_id) newErrors.category = 'Category is required';

    if (formData.is_base) {
      if (parseFloat(formData.conversion_factor) !== 1) {
        newErrors.conversion_factor = 'Base unit MUST have factor = 1';
      }
    } else {
      if (!formData.base_uom_id) {
        newErrors.base_uom = 'Select base unit for derived unit';
      }
      const factor = parseFloat(formData.conversion_factor);
      if (factor === 1) {
        newErrors.conversion_factor = 'Derived unit CANNOT have factor = 1. Use "Is Base Unit" checkbox!';
      } else if (factor <= 0) {
        newErrors.conversion_factor = 'Factor must be greater than 0';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const url = editingUom
        ? `${API_BASE}/units/${editingUom.id}`
        : `${API_BASE}/units`;
      const method = editingUom ? 'PUT' : 'POST';
      const payload = {
        ...formData,
        conversion_factor: parseFloat(formData.conversion_factor),
        rounding_precision: parseFloat(formData.rounding_precision)
      };
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to save unit');
      }
      
      await fetchUoms(filterCategory || null);
      resetForm();
      setActiveTab('list');
      showSuccess(editingUom ? 'Unit updated successfully!' : 'Unit created successfully!');
      
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (uom) => {
    setFormData({
      code: uom.code,
      name: uom.name,
      symbol: uom.symbol || '',
      category_id: uom.category_id,
      is_base: uom.is_base,
      base_uom_id: uom.base_uom_id || null,
      conversion_factor: parseFloat(uom.conversion_factor),
      rounding_precision: parseFloat(uom.rounding_precision),
      is_active: uom.is_active
    });
    setEditingUom(uom);
    setActiveTab('form');
  };

  const handleDelete = async (uomId) => {
    if (!window.confirm('Are you sure you want to deactivate this unit?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/units/${uomId}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to deactivate unit');
      }
      
      await fetchUoms(filterCategory || null);
      showSuccess('Unit deactivated successfully!');
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      symbol: '',
      category_id: '',
      is_base: false,
      base_uom_id: null,
      conversion_factor: 1,
      rounding_precision: 0.0001,
      is_active: true
    });
    setEditingUom(null);
    setErrors({});
    setBaseUoms([]);
    setHasBaseUnit(false);
  };

  // 🔥 ADVANCED CALCULATION PREVIEW
  const getAdvancedPreview = () => {
    if (!formData.code || !formData.conversion_factor || !baseUoms.length) return null;
    
    const factor = parseFloat(formData.conversion_factor);
    const precision = parseFloat(formData.rounding_precision);
    const baseUnit = baseUoms[0];
    const unitCode = formData.code || 'UNIT';
    
    // Calculate examples with exact precision
    const examples = [1, 10, 100, 1000].map(qty => {
      const baseQty = qty * factor;
      const rounded = Math.round(baseQty / precision) * precision;
      return { qty, baseQty: rounded.toFixed(10), rounded: rounded.toFixed(6) };
    });
    
    // Reverse calculation
    const reverseExamples = [1, 10, 100].map(qty => {
      const derivedQty = qty / factor;
      const rounded = Math.round(derivedQty / precision) * precision;
      return { qty, derivedQty: rounded.toFixed(10), rounded: rounded.toFixed(6) };
    });
    
    return { examples, reverseExamples, baseUnit, unitCode, factor, precision };
  };

  const getPhysicalMeaning = () => {
    const precision = parseFloat(formData.rounding_precision);
    const category = categories.find(c => c.id === formData.category_id);
    
    if (!category) return null;
    
    const meanings = {
      'WEIGHT': {
        unit: 'KG',
        conversions: [
          { value: 0.0001, meaning: '0.1 gram' },
          { value: 0.001, meaning: '1 gram' },
          { value: 0.01, meaning: '10 grams' }
        ]
      },
      'LENGTH': {
        unit: 'M',
        conversions: [
          { value: 0.0001, meaning: '0.1 mm' },
          { value: 0.001, meaning: '1 mm' },
          { value: 0.01, meaning: '1 cm' }
        ]
      },
      'VOLUME': {
        unit: 'L',
        conversions: [
          { value: 0.0001, meaning: '0.1 ml' },
          { value: 0.001, meaning: '1 ml' },
          { value: 0.01, meaning: '10 ml' }
        ]
      }
    };
    
    const mapping = meanings[category.code];
    if (!mapping) return null;
    
    const match = mapping.conversions.find(c => c.value === precision);
    return match ? match.meaning : `${precision} ${mapping.unit}`;
  };

  const filteredUoms = uoms.filter(uom =>
    uom.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    uom.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const preview = getAdvancedPreview();
  const physicalMeaning = getPhysicalMeaning();

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <div style={{ width: "95%", maxWidth: "1400px", height: "90%", maxHeight: "800px", background: "white", borderRadius: "12px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "0px 16px", height: "40px", borderBottom: "2px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Ruler size={18} />
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>🔥 Advanced UOM Units Management</h2>
          </div>
          <button
            onClick={() => { resetForm(); setActiveTab('form'); }}
            style={{ padding: "4px 14px", background: "rgba(255, 255, 255, 0.25)", border: "1px solid rgba(255, 255, 255, 0.4)", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}
          >
            <Plus size={14} />
            Add Unit
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMsg && (
          <div style={{ margin: "10px 16px 0 16px", padding: "8px 10px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px", animation: "slideIn 0.3s ease" }}>
            <Check size={14} style={{ color: "#16a34a" }} />
            <span style={{ fontSize: "11px", color: "#000", fontWeight: "600" }}>{successMsg}</span>
          </div>
        )}
        
        {errorMsg && (
          <div style={{ margin: "10px 16px 0 16px", padding: "8px 10px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px", animation: "slideIn 0.3s ease" }}>
            <AlertCircle size={14} style={{ color: "#dc2626" }} />
            <span style={{ fontSize: "11px", color: "#000", fontWeight: "600" }}>{errorMsg}</span>
          </div>
        )}

        {/* Tabs */}
        <div style={{ borderBottom: "2px solid #e0e0e0", background: "#f9fafb", display: "flex", flexShrink: 0 }}>
          <button
            onClick={() => setActiveTab('list')}
            style={{ flex: 1, padding: "8px 14px", fontSize: "11px", fontWeight: "700", cursor: "pointer", border: "none", background: activeTab === 'list' ? 'white' : 'transparent', color: activeTab === 'list' ? '#667eea' : '#000', borderBottom: activeTab === 'list' ? '3px solid #667eea' : 'none', transition: "all 0.2s" }}
          >
            📊 Units List ({filteredUoms.length})
          </button>
          <button
            onClick={() => setActiveTab('form')}
            style={{ flex: 1, padding: "8px 14px", fontSize: "11px", fontWeight: "700", cursor: "pointer", border: "none", background: activeTab === 'form' ? 'white' : 'transparent', color: activeTab === 'form' ? '#667eea' : '#000', borderBottom: activeTab === 'form' ? '3px solid #667eea' : 'none', transition: "all 0.2s" }}
          >
            {editingUom ? '✏️ Edit Unit' : '➕ Add Unit'}
          </button>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          {activeTab === 'list' && (
            <div>
              {/* Filters */}
              <div style={{ marginBottom: "14px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px" }}>
                <div style={{ position: "relative" }}>
                  <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#999" }} size={16} />
                  <input
                    type="text"
                    placeholder="Search units..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%", paddingLeft: "38px", padding: "8px 10px", border: "2px solid #e0e0e0", borderRadius: "8px", fontSize: "11px", transition: "all 0.2s" }}
                  />
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{ padding: "8px 10px", border: "2px solid #e0e0e0", borderRadius: "8px", fontSize: "11px", color: "#000", fontWeight: "600" }}
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ padding: "8px 10px", border: "2px solid #e0e0e0", borderRadius: "8px", fontSize: "11px", color: "#000", fontWeight: "600" }}
                >
                  <option value="">All Types</option>
                  <option value="base">🔵 Base Units</option>
                  <option value="derived">🔗 Derived Units</option>
                </select>
              </div>

              {/* Units Table */}
              {loading ? (
                <div style={{ padding: "60px 20px", textAlign: "center" }}>
                  <Loader style={{ animation: "spin 1s linear infinite", color: "#667eea", margin: "0 auto" }} size={40} />
                </div>
              ) : filteredUoms.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "56px", marginBottom: "10px" }}>📏</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#000", marginBottom: "6px" }}>No units found</div>
                  <div style={{ fontSize: "11px", color: "#666" }}>
                    {searchTerm || filterCategory ? 'Try adjusting your filters' : 'Click "Add Unit" to create your first unit'}
                  </div>
                </div>
              ) : (
                <div style={{ background: "white", border: "2px solid #e0e0e0", borderRadius: "10px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white" }}>
                      <tr>
                        <th style={{ padding: "10px", textAlign: "left", fontSize: "10px", fontWeight: "700" }}>CODE</th>
                        <th style={{ padding: "10px", textAlign: "left", fontSize: "10px", fontWeight: "700" }}>NAME</th>
                        <th style={{ padding: "10px", textAlign: "left", fontSize: "10px", fontWeight: "700" }}>SYMBOL</th>
                        <th style={{ padding: "10px", textAlign: "left", fontSize: "10px", fontWeight: "700" }}>CATEGORY</th>
                        <th style={{ padding: "10px", textAlign: "center", fontSize: "10px", fontWeight: "700" }}>TYPE</th>
                        <th style={{ padding: "10px", textAlign: "right", fontSize: "10px", fontWeight: "700" }}>FACTOR</th>
                        <th style={{ padding: "10px", textAlign: "right", fontSize: "10px", fontWeight: "700" }}>PRECISION</th>
                        <th style={{ padding: "10px", textAlign: "center", fontSize: "10px", fontWeight: "700" }}>STATUS</th>
                        <th style={{ padding: "10px", textAlign: "right", fontSize: "10px", fontWeight: "700" }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUoms.map((uom, idx) => (
                        <tr key={uom.id} style={{ borderBottom: "1px solid #f0f0f0", background: idx % 2 === 0 ? "#fafbfc" : "white" }}>
                          <td style={{ padding: "10px" }}>
                            <span style={{ padding: "3px 8px", background: "#dcfce7", color: "#000", borderRadius: "4px", fontSize: "10px", fontWeight: "700" }}>
                              {uom.code}
                            </span>
                          </td>
                          <td style={{ padding: "10px", fontSize: "11px", fontWeight: "600", color: "#000" }}>{uom.name}</td>
                          <td style={{ padding: "10px", fontSize: "10px", color: "#666", fontFamily: "monospace" }}>{uom.symbol || '-'}</td>
                          <td style={{ padding: "10px", fontSize: "10px", color: "#000" }}>{uom.category_name}</td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            {uom.is_base ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "3px 8px", background: "#fef3c7", color: "#000", borderRadius: "12px", fontSize: "9px", fontWeight: "700" }}>
                                🔵 BASE
                              </span>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "3px 8px", background: "#e9d5ff", color: "#000", borderRadius: "12px", fontSize: "9px", fontWeight: "700" }}>
                                🔗 DERIVED
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px", textAlign: "right", fontSize: "10px", color: "#000", fontFamily: "monospace", fontWeight: "600" }}>
                            {parseFloat(uom.conversion_factor).toFixed(6)}
                          </td>
                          <td style={{ padding: "10px", textAlign: "right", fontSize: "10px", color: "#000", fontFamily: "monospace", fontWeight: "600" }}>
                            {parseFloat(uom.rounding_precision).toFixed(6)}
                          </td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            {uom.is_active ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "3px 8px", background: "#dcfce7", color: "#000", borderRadius: "12px", fontSize: "9px", fontWeight: "700" }}>
                                <Check size={10} />
                                Active
                              </span>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "3px 8px", background: "#fee2e2", color: "#000", borderRadius: "12px", fontSize: "9px", fontWeight: "700" }}>
                                <X size={10} />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                              <button
                                onClick={() => handleEdit(uom)}
                                style={{ padding: "5px", color: "#667eea", background: "#e0e7ff", border: "none", cursor: "pointer", borderRadius: "4px", transition: "all 0.2s" }}
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(uom.id)}
                                style={{ padding: "5px", color: "#ef4444", background: "#fee2e2", border: "none", cursor: "pointer", borderRadius: "4px", transition: "all 0.2s" }}
                                title="Deactivate"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'form' && (
            <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
              {/* Info Box */}
              <div style={{ background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)", border: "2px solid #93c5fd", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "start", gap: "10px" }}>
                  <Info size={16} style={{ color: "#000", flexShrink: 0, marginTop: "3px" }} />
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#000", marginBottom: "6px" }}>⚡ ERP CONVERSION RULES</div>
                    <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "10px", color: "#000", lineHeight: "1.6" }}>
                      <li>Only ONE base unit per category (factor = 1)</li>
                      <li>Derived units MUST have factor ≠ 1</li>
                      <li>Example: KG (base, factor=1) → G (derived, factor=0.001) → QTL (derived, factor=100)</li>
                      <li>Precision controls rounding accuracy (0.0001 = 0.1 gram for KG)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
                {/* Main Form */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Basic Info */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#000", marginBottom: "5px" }}>
                        Code <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                        placeholder="KG, G, QTL"
                        disabled={!!editingUom}
                        style={{ width: "100%", padding: "8px 10px", border: errors.code ? "2px solid #ef4444" : "2px solid #e0e0e0", borderRadius: "8px", fontSize: "11px", background: editingUom ? "#f0f0f0" : "white", color: "#000", fontWeight: "600" }}
                      />
                      {errors.code && <p style={{ margin: "3px 0 0 0", fontSize: "9px", color: "#ef4444", fontWeight: "600" }}>{errors.code}</p>}
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#000", marginBottom: "5px" }}>
                        Name <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Kilogram, Gram"
                        style={{ width: "100%", padding: "8px 10px", border: errors.name ? "2px solid #ef4444" : "2px solid #e0e0e0", borderRadius: "8px", fontSize: "11px", color: "#000", fontWeight: "600" }}
                      />
                      {errors.name && <p style={{ margin: "3px 0 0 0", fontSize: "9px", color: "#ef4444", fontWeight: "600" }}>{errors.name}</p>}
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#000", marginBottom: "5px" }}>Symbol</label>
                      <input
                        value={formData.symbol}
                        onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                        placeholder="kg, g, q"
                        style={{ width: "100%", padding: "8px 10px", border: "2px solid #e0e0e0", borderRadius: "8px", fontSize: "11px", color: "#000", fontWeight: "600" }}
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#000", marginBottom: "5px" }}>
                      Category <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({...formData, category_id: e.target.value, base_uom_id: null})}
                      disabled={!!editingUom}
                      style={{ width: "100%", padding: "8px 10px", border: errors.category ? "2px solid #ef4444" : "2px solid #e0e0e0", borderRadius: "8px", fontSize: "11px", background: editingUom ? "#f0f0f0" : "white", color: "#000", fontWeight: "600" }}
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                    {errors.category && <p style={{ margin: "3px 0 0 0", fontSize: "9px", color: "#ef4444", fontWeight: "600" }}>{errors.category}</p>}
                  </div>

                  {/* Base Unit Checkbox */}
                  <div style={{ padding: "10px", border: formData.is_base ? "3px solid #fbbf24" : "2px solid #e0e0e0", borderRadius: "8px", background: formData.is_base ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" : "#f9fafb" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formData.is_base}
                        onChange={(e) => setFormData({...formData, is_base: e.target.checked})}
                        disabled={!!editingUom || (hasBaseUnit && !editingUom?.is_base)}
                        style={{ width: "16px", height: "16px" }}
                      />
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#000" }}>🔵 Is Base Unit</span>
                      {hasBaseUnit && !editingUom?.is_base && (
                        <span style={{ marginLeft: "auto", fontSize: "9px", color: "#ef4444", fontWeight: "600" }}>(Base unit already exists!)</span>
                      )}
                    </label>
                  </div>

                  {/* Base UOM Selection */}
                  {!formData.is_base && formData.category_id && (
                    <div>
                      <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#000", marginBottom: "5px" }}>
                        Base UOM <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      {baseUoms.length === 0 ? (
                        <div style={{ padding: "10px", background: "#fee2e2", border: "2px solid #fca5a5", borderRadius: "8px", display: "flex", alignItems: "start", gap: "8px" }}>
                          <AlertCircle size={16} style={{ color: "#ef4444", flexShrink: 0, marginTop: "2px" }} />
                          <div>
                            <div style={{ fontSize: "10px", fontWeight: "700", color: "#000" }}>No base UOM found!</div>
                            <div style={{ fontSize: "9px", color: "#000" }}>Create a base unit first.</div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <select
                            value={formData.base_uom_id || ''}
                            onChange={(e) => setFormData({...formData, base_uom_id: e.target.value})}
                            style={{ width: "100%", padding: "8px 10px", border: errors.base_uom ? "2px solid #ef4444" : "2px solid #e0e0e0", borderRadius: "8px", fontSize: "11px", color: "#000", fontWeight: "600" }}
                          >
                            <option value="">Select Base UOM</option>
                            {baseUoms.map(u => (
                              <option key={u.id} value={u.id}>🔵 {u.name} ({u.code}) - BASE UNIT</option>
                            ))}
                          </select>
                          {errors.base_uom && <p style={{ margin: "3px 0 0 0", fontSize: "9px", color: "#ef4444", fontWeight: "600" }}>{errors.base_uom}</p>}
                        </>
                      )}
                    </div>
                  )}

                  {/* Conversion Factor & Precision */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#000", marginBottom: "5px" }}>
                        Conversion Factor <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={formData.conversion_factor}
                        onChange={(e) => setFormData({...formData, conversion_factor: parseFloat(e.target.value) || 0})}
                        disabled={formData.is_base}
                        style={{ width: "100%", padding: "8px 10px", border: errors.conversion_factor ? "2px solid #ef4444" : "2px solid #e0e0e0", borderRadius: "8px", fontSize: "11px", background: formData.is_base ? "#f0f0f0" : "white", color: "#000", fontWeight: "600", fontFamily: "monospace" }}
                      />
                      {errors.conversion_factor && <p style={{ margin: "3px 0 0 0", fontSize: "9px", color: "#ef4444", fontWeight: "600" }}>{errors.conversion_factor}</p>}
                      <p style={{ margin: "3px 0 0 0", fontSize: "9px", color: "#666", fontWeight: "500" }}>
                        1 {formData.code || 'YOUR_UNIT'} = FACTOR × BASE
                      </p>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#000", marginBottom: "5px" }}>
                        Rounding Precision
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={formData.rounding_precision}
                        onChange={(e) => setFormData({...formData, rounding_precision: parseFloat(e.target.value) || 0.0001})}
                        style={{ width: "100%", padding: "8px 10px", border: "2px solid #e0e0e0", borderRadius: "8px", fontSize: "11px", color: "#000", fontWeight: "600", fontFamily: "monospace" }}
                      />
                      {physicalMeaning && (
                        <p style={{ margin: "3px 0 0 0", fontSize: "9px", color: "#667eea", fontWeight: "600" }}>
                          📏 Physical: {physicalMeaning}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Active Status */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px", background: "#f9fafb", borderRadius: "8px", border: "2px solid #e0e0e0" }}>
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      style={{ width: "16px", height: "16px" }}
                    />
                    <label htmlFor="is_active" style={{ fontSize: "11px", fontWeight: "700", color: "#000", cursor: "pointer" }}>
                      Active Status
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "10px", paddingTop: "10px" }}>
                    <button
                      onClick={handleSubmit}
                      disabled={loading || (!formData.is_base && baseUoms.length === 0)}
                      style={{ flex: 1, padding: "10px 14px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none", borderRadius: "8px", fontSize: "11px", fontWeight: "700", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: (loading || (!formData.is_base && baseUoms.length === 0)) ? 0.5 : 1, transition: "all 0.2s" }}
                    >
                      {loading ? (
                        <>
                          <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          {editingUom ? 'Update Unit' : 'Create Unit'}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => { resetForm(); setActiveTab('list'); }}
                      style={{ padding: "10px 14px", background: "#f0f0f0", border: "2px solid #ddd", borderRadius: "8px", fontSize: "11px", fontWeight: "700", cursor: "pointer", color: "#000", transition: "all 0.2s" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {/* 🔥 LIVE CALCULATION PREVIEW */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {preview && (
                    <>
                      {/* Main Preview Card */}
                      <div style={{ background: "linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%)", borderRadius: "10px", padding: "12px", border: "3px solid #86efac" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                          <Eye size={16} style={{ color: "#16a34a" }} />
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "#000" }}>🔥 Live Calculation Preview</span>
                        </div>

                        {/* Forward Conversion */}
                        <div style={{ background: "white", borderRadius: "8px", padding: "10px", marginBottom: "10px", border: "2px solid #86efac" }}>
                          <div style={{ fontSize: "10px", fontWeight: "700", color: "#16a34a", marginBottom: "8px" }}>
                            {preview.unitCode} → {preview.baseUnit.code}
                          </div>
                          {preview.examples.map((ex, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", fontSize: "10px" }}>
                              <span style={{ fontWeight: "700", color: "#000", fontFamily: "monospace" }}>{ex.qty} {preview.unitCode}</span>
                              <ArrowRight size={12} style={{ color: "#16a34a" }} />
                              <span style={{ fontWeight: "700", color: "#16a34a", fontFamily: "monospace" }}>{ex.rounded} {preview.baseUnit.code}</span>
                            </div>
                          ))}
                        </div>

                        {/* Reverse Conversion */}
                        <div style={{ background: "white", borderRadius: "8px", padding: "10px", border: "2px solid #86efac" }}>
                          <div style={{ fontSize: "10px", fontWeight: "700", color: "#16a34a", marginBottom: "8px" }}>
                            {preview.baseUnit.code} → {preview.unitCode}
                          </div>
                          {preview.reverseExamples.map((ex, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", fontSize: "10px" }}>
                              <span style={{ fontWeight: "700", color: "#000", fontFamily: "monospace" }}>{ex.qty} {preview.baseUnit.code}</span>
                              <ArrowRight size={12} style={{ color: "#16a34a" }} />
                              <span style={{ fontWeight: "700", color: "#16a34a", fontFamily: "monospace" }}>{ex.rounded} {preview.unitCode}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Technical Details */}
                      <div style={{ background: "#f0f9ff", borderRadius: "10px", padding: "12px", border: "2px solid #93c5fd" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                          <Calculator size={14} style={{ color: "#0284c7" }} />
                          <span style={{ fontSize: "10px", fontWeight: "700", color: "#000" }}>Technical Details</span>
                        </div>
                        <div style={{ fontSize: "9px", color: "#000", lineHeight: "1.6" }}>
                          <div><strong>Factor:</strong> {preview.factor}</div>
                          <div><strong>Precision:</strong> {preview.precision}</div>
                          <div><strong>Formula:</strong> qty × {preview.factor}</div>
                          <div><strong>Rounding:</strong> Math.round(value/{preview.precision}) × {preview.precision}</div>
                        </div>
                      </div>

                      {/* Precision Explanation */}
                      <div style={{ background: "#fef3c7", borderRadius: "10px", padding: "12px", border: "2px solid #fde047" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                          <TrendingUp size={14} style={{ color: "#ca8a04" }} />
                          <span style={{ fontSize: "10px", fontWeight: "700", color: "#000" }}>💡 Precision Guide</span>
                        </div>
                        <div style={{ fontSize: "9px", color: "#000", lineHeight: "1.6" }}>
                          <div>• <strong>0.0001</strong> = 0.1g (KG), 0.1mm (M), 0.1ml (L)</div>
                          <div>• <strong>0.001</strong> = 1g, 1mm, 1ml</div>
                          <div>• <strong>0.01</strong> = 10g, 1cm, 10ml</div>
                          <div>• <strong>1</strong> = Whole units (PCS, DOZ)</div>
                        </div>
                      </div>
                    </>
                  )}

                  {!preview && (
                    <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "30px", border: "2px solid #e0e0e0", textAlign: "center" }}>
                      <Calculator size={32} style={{ color: "#999", margin: "0 auto 10px" }} />
                      <div style={{ fontSize: "10px", color: "#666", fontWeight: "600" }}>
                        Fill the form to see live calculations
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0px 16px", height: "20px", borderTop: "2px solid #e0e0e0", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", flexShrink: 0 }}></div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default UOMUnitsPageAdvanced;