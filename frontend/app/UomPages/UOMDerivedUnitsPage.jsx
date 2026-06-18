import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Link, Save, Check, X, AlertCircle, Info, Eye, Loader, Calculator, ArrowRight, Zap } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/uom';

const UOMDerivedUnitsPage = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [derivedUnits, setDerivedUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [baseUnits, setBaseUnits] = useState([]);
  const [allUnits, setAllUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [editingUnit, setEditingUnit] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showConversionPreview, setShowConversionPreview] = useState({});

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    category_id: '',
    base_uom_id: '',
    conversion_factor: '',
    rounding_precision: '0.0001',
    is_active: true
  });

  // Common conversion examples for guidance
  const CONVERSION_EXAMPLES = {
    'WEIGHT': [
      { from: 'KG', to: 'G', factor: '0.001', example: '1 KG = 1000 G' },
      { from: 'KG', to: 'MG', factor: '0.000001', example: '1 KG = 1,000,000 MG' },
      { from: 'KG', to: 'QTL', factor: '100', example: '1 QTL = 100 KG' },
      { from: 'KG', to: 'TON', factor: '1000', example: '1 TON = 1000 KG' }
    ],
    'LENGTH': [
      { from: 'M', to: 'CM', factor: '0.01', example: '1 M = 100 CM' },
      { from: 'M', to: 'MM', factor: '0.001', example: '1 M = 1000 MM' },
      { from: 'M', to: 'KM', factor: '1000', example: '1 KM = 1000 M' },
      { from: 'M', to: 'IN', factor: '0.0254', example: '1 IN = 0.0254 M' }
    ],
    'VOLUME': [
      { from: 'L', to: 'ML', factor: '0.001', example: '1 L = 1000 ML' },
      { from: 'L', to: 'KL', factor: '1000', example: '1 KL = 1000 L' },
      { from: 'L', to: 'GAL', factor: '3.78541', example: '1 GAL = 3.78541 L' }
    ],
    'AREA': [
      { from: 'SQM', to: 'SQFT', factor: '0.092903', example: '1 SQFT = 0.092903 SQM' },
      { from: 'SQM', to: 'ACRE', factor: '4046.86', example: '1 ACRE = 4046.86 SQM' },
      { from: 'SQM', to: 'HECTARE', factor: '10000', example: '1 HECTARE = 10000 SQM' }
    ],
    'QUANTITY': [
      { from: 'PCS', to: 'DOZ', factor: '12', example: '1 DOZ = 12 PCS' },
      { from: 'PCS', to: 'GROSS', factor: '144', example: '1 GROSS = 144 PCS' }
    ],
    'TIME': [
      { from: 'SEC', to: 'MIN', factor: '60', example: '1 MIN = 60 SEC' },
      { from: 'SEC', to: 'HR', factor: '3600', example: '1 HR = 3600 SEC' },
      { from: 'SEC', to: 'DAY', factor: '86400', example: '1 DAY = 86400 SEC' }
    ]
  };

  useEffect(() => {
    fetchCategories();
    fetchDerivedUnits();
  }, []);

  useEffect(() => {
    if (filterCategory) fetchDerivedUnits(filterCategory);
    else fetchDerivedUnits();
  }, [filterCategory]);

  useEffect(() => {
    if (formData.category_id) {
      fetchBaseUnit(formData.category_id);
      fetchAllUnitsInCategory(formData.category_id);
    }
  }, [formData.category_id]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories?is_active=true`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data.items || []);
    } catch (err) {
      showError('Error fetching categories: ' + err.message);
    }
  };

  const fetchDerivedUnits = async (categoryCode = null) => {
    setLoading(true);
    try {
      let url = `${API_BASE}/units?is_base=false&limit=500`;
      if (categoryCode) url += `&category_code=${categoryCode}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch derived units');
      const data = await res.json();
      setDerivedUnits(data.items || []);
    } catch (err) {
      showError('Error fetching derived units: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBaseUnit = async (categoryId) => {
    try {
      const res = await fetch(`${API_BASE}/units?category_id=${categoryId}&is_base=true`);
      if (!res.ok) throw new Error('Failed to fetch base unit');
      const data = await res.json();
      setBaseUnits(data.items || []);
    } catch (err) {
      setBaseUnits([]);
      showError('No base unit found in this category');
    }
  };

  const fetchAllUnitsInCategory = async (categoryId) => {
    try {
      const res = await fetch(`${API_BASE}/units?category_id=${categoryId}&limit=500`);
      if (!res.ok) throw new Error('Failed to fetch units');
      const data = await res.json();
      setAllUnits(data.items || []);
    } catch (err) {
      setAllUnits([]);
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
    if (!formData.base_uom_id) newErrors.base_uom = 'Base unit is required';
    
    const factor = parseFloat(formData.conversion_factor);
    if (!formData.conversion_factor || isNaN(factor)) {
      newErrors.conversion_factor = 'Valid conversion factor required';
    } else if (factor === 1) {
      newErrors.conversion_factor = '⚠️ Factor = 1 means BASE UNIT! Use factor ≠ 1';
    } else if (factor <= 0) {
      newErrors.conversion_factor = 'Factor must be greater than 0';
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
      const url = editingUnit
        ? `${API_BASE}/units/${editingUnit.id}`
        : `${API_BASE}/units`;
      const method = editingUnit ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        is_base: false,
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
        throw new Error(error.detail || 'Failed to save derived unit');
      }
      
      await fetchDerivedUnits(filterCategory || null);
      resetForm();
      setActiveTab('list');
      showSuccess(editingUnit ? 'Derived unit updated!' : 'Derived unit created!');
      
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (unit) => {
    setFormData({
      code: unit.code,
      name: unit.name,
      symbol: unit.symbol || '',
      category_id: unit.category_id,
      base_uom_id: unit.base_uom_id || '',
      conversion_factor: unit.conversion_factor.toString(),
      rounding_precision: unit.rounding_precision.toString(),
      is_active: unit.is_active
    });
    setEditingUnit(unit);
    setActiveTab('form');
  };

  const handleDelete = async (unitId) => {
    if (!window.confirm('Deactivate this derived unit?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/units/${unitId}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to deactivate');
      }
      
      await fetchDerivedUnits(filterCategory || null);
      showSuccess('Derived unit deactivated!');
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
      base_uom_id: '',
      conversion_factor: '',
      rounding_precision: '0.0001',
      is_active: true
    });
    setEditingUnit(null);
    setErrors({});
    setBaseUnits([]);
    setAllUnits([]);
  };

  const getConversionPreview = () => {
    if (!formData.conversion_factor || !baseUnits.length) return null;
    
    const factor = parseFloat(formData.conversion_factor);
    const baseUnit = baseUnits[0];
    const unitCode = formData.code || 'UNIT';
    
    if (factor === 1) {
      return `⚠️ This will create a BASE UNIT (not derived)`;
    }
    
    if (factor > 1) {
      return `1 ${unitCode} = ${factor} ${baseUnit.code} (Larger unit)`;
    } else {
      const inverse = (1 / factor).toFixed(2);
      return `1 ${baseUnit.code} = ${inverse} ${unitCode} (Smaller unit)`;
    }
  };

  const getLiveCalculation = () => {
    if (!formData.conversion_factor || !baseUnits.length) return null;
    
    const factor = parseFloat(formData.conversion_factor);
    const baseUnit = baseUnits[0];
    const unitCode = formData.code || 'UNIT';
    
    const examples = [
      { qty: 1, result: (1 * factor).toFixed(6) },
      { qty: 10, result: (10 * factor).toFixed(6) },
      { qty: 100, result: (100 * factor).toFixed(6) }
    ];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {examples.map(ex => (
          <div key={ex.qty} style={{ fontSize: '9px', color: '#000', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{ex.qty} {unitCode}</span>
            <ArrowRight size={10} />
            <span style={{ fontWeight: '600' }}>{ex.result} {baseUnit.code}</span>
          </div>
        ))}
      </div>
    );
  };

  const getUnitConversionPreview = (unit) => {
    const factor = parseFloat(unit.conversion_factor);
    const baseCode = unit.base_uom_code || 'BASE';
    
    const examples = [
      { qty: 1, result: (1 * factor).toFixed(6) },
      { qty: 10, result: (10 * factor).toFixed(6) },
      { qty: 100, result: (100 * factor).toFixed(6) }
    ];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px', background: 'white', borderRadius: '4px', border: '1px solid #c4b5fd' }}>
        <div style={{ fontSize: '9px', fontWeight: '600', color: '#000', marginBottom: '2px' }}>
          Calculation Examples:
        </div>
        {examples.map(ex => (
          <div key={ex.qty} style={{ fontSize: '9px', color: '#000', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{ex.qty} {unit.code}</span>
            <ArrowRight size={10} />
            <span style={{ fontWeight: '600' }}>{ex.result} {baseCode}</span>
          </div>
        ))}
      </div>
    );
  };

  const toggleConversionPreview = (unitId) => {
    setShowConversionPreview(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  const filteredUnits = derivedUnits.filter(unit =>
    unit.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCategory = categories.find(c => c.id === formData.category_id);
  const categoryExamples = selectedCategory ? CONVERSION_EXAMPLES[selectedCategory.code] || [] : [];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "95%", maxWidth: "1200px", height: "90%", maxHeight: "700px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #8b5cf6, #a78bfa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>🔗 Derived Units Manager</h2>
          </div>
          <button
            onClick={() => { resetForm(); setActiveTab('form'); }}
            style={{ padding: "2px 10px", background: "rgba(255, 255, 255, 0.2)", border: "1px solid rgba(255, 255, 255, 0.3)", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <Plus size={12} />
            Add Derived Unit
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMsg && (
          <div style={{ margin: "8px 12px 0 12px", padding: "6px 8px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Check size={12} style={{ color: "#16a34a" }} />
            <span style={{ fontSize: "10px", color: "#000", fontWeight: "500" }}>{successMsg}</span>
          </div>
        )}
        
        {errorMsg && (
          <div style={{ margin: "8px 12px 0 12px", padding: "6px 8px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertCircle size={12} style={{ color: "#dc2626" }} />
            <span style={{ fontSize: "10px", color: "#000", fontWeight: "500" }}>{errorMsg}</span>
          </div>
        )}

        {/* Tabs */}
        <div style={{ borderBottom: "1px solid #e0e0e0", background: "#f9fafb", display: "flex", flexShrink: 0 }}>
          <button
            onClick={() => setActiveTab('list')}
            style={{ flex: 1, padding: "6px 12px", fontSize: "10px", fontWeight: "600", cursor: "pointer", border: "none", background: activeTab === 'list' ? 'white' : 'transparent', color: activeTab === 'list' ? '#8b5cf6' : '#000', borderBottom: activeTab === 'list' ? '2px solid #8b5cf6' : 'none' }}
          >
            Derived Units List ({filteredUnits.length})
          </button>
          <button
            onClick={() => setActiveTab('form')}
            style={{ flex: 1, padding: "6px 12px", fontSize: "10px", fontWeight: "600", cursor: "pointer", border: "none", background: activeTab === 'form' ? 'white' : 'transparent', color: activeTab === 'form' ? '#8b5cf6' : '#000', borderBottom: activeTab === 'form' ? '2px solid #8b5cf6' : 'none' }}
          >
            {editingUnit ? 'Edit Derived Unit' : 'Add Derived Unit'}
          </button>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {activeTab === 'list' && (
            <div>
              {/* Filters */}
              <div style={{ marginBottom: "12px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px" }}>
                <div style={{ position: "relative" }}>
                  <Search style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#999" }} size={14} />
                  <input
                    type="text"
                    placeholder="Search derived units..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%", paddingLeft: "32px", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px" }}
                  />
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{ padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }}
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Units Table */}
              {loading ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <Loader style={{ animation: "spin 1s linear infinite", color: "#8b5cf6", margin: "0 auto" }} size={32} />
                </div>
              ) : filteredUnits.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "48px", marginBottom: "8px" }}>🔗</div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>No derived units found</div>
                  <div style={{ fontSize: "9px", color: "#666" }}>
                    {searchTerm || filterCategory ? 'Try adjusting filters' : 'Click "Add Derived Unit" to create your first derived unit'}
                  </div>
                </div>
              ) : (
                <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "#f9fafb", borderBottom: "1px solid #e0e0e0" }}>
                      <tr>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: "9px", fontWeight: "600", color: "#000" }}>CODE</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: "9px", fontWeight: "600", color: "#000" }}>NAME</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: "9px", fontWeight: "600", color: "#000" }}>CATEGORY</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: "9px", fontWeight: "600", color: "#000" }}>BASE UNIT</th>
                        <th style={{ padding: "8px", textAlign: "right", fontSize: "9px", fontWeight: "600", color: "#000" }}>FACTOR</th>
                        <th style={{ padding: "8px", textAlign: "right", fontSize: "9px", fontWeight: "600", color: "#000" }}>PRECISION</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: "9px", fontWeight: "600", color: "#000" }}>CONVERSION</th>
                        <th style={{ padding: "8px", textAlign: "right", fontSize: "9px", fontWeight: "600", color: "#000" }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUnits.map((unit) => {
                        const factor = parseFloat(unit.conversion_factor);
                        const conversion = factor > 1 
                          ? `1 ${unit.code} = ${factor} ${unit.base_uom_code || 'BASE'}`
                          : `1 ${unit.base_uom_code || 'BASE'} = ${(1/factor).toFixed(2)} ${unit.code}`;
                        
                        return (
                          <React.Fragment key={unit.id}>
                            <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                              <td style={{ padding: "8px" }}>
                                <span style={{ padding: "2px 6px", background: "#e9d5ff", color: "#000", borderRadius: "3px", fontSize: "9px", fontWeight: "600" }}>
                                  {unit.code}
                                </span>
                              </td>
                              <td style={{ padding: "8px", fontSize: "10px", fontWeight: "500", color: "#000" }}>{unit.name}</td>
                              <td style={{ padding: "8px", fontSize: "9px", color: "#000" }}>{unit.category_name}</td>
                              <td style={{ padding: "8px" }}>
                                <span style={{ padding: "2px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontSize: "9px", fontWeight: "600" }}>
                                  {unit.base_uom_code || 'N/A'}
                                </span>
                              </td>
                              <td style={{ padding: "8px", textAlign: "right", fontSize: "9px", color: "#000", fontFamily: "monospace" }}>
                                {factor.toFixed(6)}
                              </td>
                              <td style={{ padding: "8px", textAlign: "right", fontSize: "9px", color: "#000", fontFamily: "monospace" }}>
                                {parseFloat(unit.rounding_precision).toFixed(6)}
                              </td>
                              <td style={{ padding: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontSize: "8px", color: "#666" }}>{conversion}</span>
                                  <button
                                    onClick={() => toggleConversionPreview(unit.id)}
                                    style={{ padding: "2px", color: "#8b5cf6", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                                    title="View conversion preview"
                                  >
                                    <Eye size={12} />
                                  </button>
                                </div>
                              </td>
                              <td style={{ padding: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                                  <button
                                    onClick={() => handleEdit(unit)}
                                    style={{ padding: "4px", color: "#8b5cf6", background: "transparent", border: "none", cursor: "pointer" }}
                                    title="Edit"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(unit.id)}
                                    style={{ padding: "4px", color: "#ef4444", background: "transparent", border: "none", cursor: "pointer" }}
                                    title="Deactivate"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {showConversionPreview[unit.id] && (
                              <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                                <td colSpan="8" style={{ padding: "8px", background: "linear-gradient(to bottom right, #e9d5ff, #ddd6fe)" }}>
                                  {getUnitConversionPreview(unit)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'form' && (
            <div style={{ maxWidth: "900px", margin: "0 auto" }}>
              {/* Info Box */}
              <div style={{ background: "#e9d5ff", border: "1px solid #c4b5fd", borderRadius: "6px", padding: "10px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "start", gap: "8px" }}>
                  <Info size={14} style={{ color: "#000", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>🔗 DERIVED UNIT RULES</div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "9px", color: "#000", lineHeight: "1.5" }}>
                      <li>Conversion factor MUST be ≠ 1 (factor = 1 means BASE unit)</li>
                      <li>Factor &gt; 1 → LARGER unit (QTL, TON, KM)</li>
                      <li>Factor &lt; 1 → SMALLER unit (G, MG, CM, MM)</li>
                      <li>Formula: 1 YOUR_UNIT = FACTOR × BASE_UNIT</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                {/* Main Form */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* Basic Info */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                        Code <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                        placeholder="G, MG, CM, KM"
                        disabled={!!editingUnit}
                        style={{ width: "100%", padding: "6px 8px", border: errors.code ? "1px solid #ef4444" : "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", background: editingUnit ? "#f0f0f0" : "white", color: "#000" }}
                      />
                      {errors.code && <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#ef4444" }}>{errors.code}</p>}
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                        Name <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Gram, Milligram"
                        style={{ width: "100%", padding: "6px 8px", border: errors.name ? "1px solid #ef4444" : "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }}
                      />
                      {errors.name && <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#ef4444" }}>{errors.name}</p>}
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>Symbol</label>
                      <input
                        value={formData.symbol}
                        onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                        placeholder="g, mg, cm"
                        style={{ width: "100%", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }}
                      />
                    </div>
                  </div>
              {/* Category */}
              <div>
                <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                  Category <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value, base_uom_id: ''})}
                  disabled={!!editingUnit}
                  style={{ width: "100%", padding: "6px 8px", border: errors.category ? "1px solid #ef4444" : "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", background: editingUnit ? "#f0f0f0" : "white", color: "#000" }}
                >
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
                {errors.category && <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#ef4444" }}>{errors.category}</p>}
              </div>

              {/* Base Unit */}
              {formData.category_id && (
                <div>
                  <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                    Base Unit <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  {baseUnits.length === 0 ? (
                    <div style={{ padding: "8px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "4px", fontSize: "9px", color: "#000" }}>
                      ⚠️ No base unit found! Create base unit first.
                    </div>
                  ) : (
                    <>
                      <select
                        value={formData.base_uom_id}
                        onChange={(e) => setFormData({...formData, base_uom_id: e.target.value})}
                        style={{ width: "100%", padding: "6px 8px", border: errors.base_uom ? "1px solid #ef4444" : "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }}
                      >
                        <option value="">Select Base Unit</option>
                        {baseUnits.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.code}) - BASE UNIT
                          </option>
                        ))}
                      </select>
                      {errors.base_uom && <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#ef4444" }}>{errors.base_uom}</p>}
                    </>
                  )}
                </div>
              )}

              {/* Conversion Factor & Precision */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                    Conversion Factor <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.conversion_factor}
                    onChange={(e) => setFormData({...formData, conversion_factor: e.target.value})}
                    placeholder="0.001 or 1000"
                    style={{ width: "100%", padding: "6px 8px", border: errors.conversion_factor ? "1px solid #ef4444" : "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }}
                  />
                  {errors.conversion_factor && <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#ef4444" }}>{errors.conversion_factor}</p>}
                  <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#666" }}>
                    1 {formData.code || 'YOUR_UNIT'} = FACTOR × BASE
                  </p>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                    Rounding Precision
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.rounding_precision}
                    onChange={(e) => setFormData({...formData, rounding_precision: e.target.value})}
                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }}
                  />
                  <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#666" }}>
                    Smallest decimal allowed
                  </p>
                </div>
              </div>

              {/* Live Preview */}
              {formData.conversion_factor && baseUnits.length > 0 && (
                <div style={{ padding: "10px", background: "linear-gradient(to bottom right, #e9d5ff, #ddd6fe)", border: "2px solid #c4b5fd", borderRadius: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
                    <Eye size={12} style={{ color: "#000" }} />
                    <span style={{ fontSize: "10px", fontWeight: "600", color: "#000" }}>Live Preview</span>
                  </div>
                  <div style={{ background: "white", padding: "8px", borderRadius: "4px", border: "1px solid #c4b5fd", marginBottom: "6px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#000" }}>
                      {getConversionPreview()}
                    </div>
                  </div>
                  <div style={{ background: "white", padding: "8px", borderRadius: "4px", border: "1px solid #c4b5fd" }}>
                    <div style={{ fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                      Calculation Examples:
                    </div>
                    {getLiveCalculation()}
                  </div>
                </div>
              )}

              {/* Active Status */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px", background: "#f9fafb", borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  style={{ width: "14px", height: "14px" }}
                />
                <label htmlFor="is_active" style={{ fontSize: "10px", fontWeight: "600", color: "#000", cursor: "pointer" }}>
                  Active Status
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "8px", paddingTop: "8px" }}>
                <button
                  onClick={handleSubmit}
                  disabled={loading || baseUnits.length === 0}
                  style={{ flex: 1, padding: "8px 12px", background: "linear-gradient(to right, #8b5cf6, #a78bfa)", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "600", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", opacity: (loading || baseUnits.length === 0) ? 0.5 : 1 }}
                >
                  {loading ? (
                    <>
                      <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      {editingUnit ? 'Update Derived Unit' : 'Create Derived Unit'}
                    </>
                  )}
                </button>
                <button
                  onClick={() => { resetForm(); setActiveTab('list'); }}
                  style={{ padding: "8px 12px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "4px", fontSize: "10px", fontWeight: "600", cursor: "pointer", color: "#000" }}
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Conversion Examples Sidebar */}
            <div style={{ background: "#f9fafb", borderRadius: "6px", padding: "10px", border: "1px solid #e0e0e0", maxHeight: "100%", overflow: "auto" }}>
              <div style={{ fontSize: "10px", fontWeight: "600", color: "#000", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                <Calculator size={12} />
                Common Examples
              </div>
              
              {selectedCategory ? (
                categoryExamples.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {categoryExamples.map((ex, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          const baseUnit = baseUnits[0];
                          if (baseUnit && baseUnit.code === ex.from) {
                            setFormData({
                              ...formData,
                              code: ex.to,
                              conversion_factor: ex.factor
                            });
                          }
                        }}
                        style={{ background: "white", padding: "8px", borderRadius: "4px", border: "1px solid #e0e0e0", cursor: "pointer", transition: "all 0.2s" }}
                      >
                        <div style={{ fontSize: "9px", fontWeight: "600", color: "#8b5cf6", marginBottom: "2px" }}>
                          {ex.to}
                        </div>
                        <div style={{ fontSize: "8px", color: "#666", marginBottom: "3px" }}>
                          Factor: {ex.factor}
                        </div>
                        <div style={{ fontSize: "8px", color: "#000", fontWeight: "500", background: "#e9d5ff", padding: "3px 4px", borderRadius: "3px" }}>
                          {ex.example}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "20px", fontSize: "9px", color: "#999" }}>
                    No examples available
                  </div>
                )
              ) : (
                <div style={{ textAlign: "center", padding: "20px", fontSize: "9px", color: "#999" }}>
                  Select a category to see examples
                </div>
              )}

              {/* Quick Reference */}
              <div style={{ marginTop: "12px", padding: "8px", background: "#fef3c7", borderRadius: "4px", border: "1px solid #fde047" }}>
                <div style={{ fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                  💡 Quick Reference
                </div>
                <div style={{ fontSize: "8px", color: "#000", lineHeight: "1.4" }}>
                  <div>• Factor &lt; 1 = Smaller unit</div>
                  <div>• Factor &gt; 1 = Larger unit</div>
                  <div>• Factor = 1 = BASE (not allowed)</div>
                </div>
              </div>

              {/* All Units in Category */}
              {allUnits.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "6px" }}>
                    Existing Units in Category:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {allUnits.map(u => (
                      <div key={u.id} style={{ fontSize: "8px", padding: "4px 6px", background: u.is_base ? "#fef3c7" : "#e9d5ff", borderRadius: "3px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "600" }}>{u.code}</span>
                        <span>{u.is_base ? 'BASE' : `×${parseFloat(u.conversion_factor).toFixed(3)}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Footer */}
    <div style={{ padding: "0px 12px", height: "16px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #a78bfa, #8b5cf6)", flexShrink: 0 }}></div>
  </div>
</div>
);
};
export default UOMDerivedUnitsPage;