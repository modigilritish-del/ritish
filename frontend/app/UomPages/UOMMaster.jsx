import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Save, X, AlertCircle, Check, Calculator, 
  Package, Edit2, Trash2, Eye, ArrowRight, Info
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/uom';

const UOMMasterItemCreation = () => {
  const [categories, setCategories] = useState([]);
  const [allUnits, setAllUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // UOM Rows (can add multiple UOMs for an item)
  const [uomRows, setUomRows] = useState([]);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchUnitsForCategory(selectedCategory);
    }
  }, [selectedCategory]);

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

  const fetchUnitsForCategory = async (categoryId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/units?category_id=${categoryId}&is_active=true&limit=500`);
      if (!res.ok) throw new Error('Failed to fetch units');
      const data = await res.json();
      setAllUnits(data.items || []);
    } catch (err) {
      showError('Error fetching units: ' + err.message);
      setAllUnits([]);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  const addUomRow = () => {
    const newRow = {
      id: Date.now(),
      uom_id: '',
      uom_code: '',
      uom_name: '',
      max_loose: '',
      conversion_factor: '',
      net_weight: '1.0',
      gross_weight: '1.0',
      volume: '1.0',
      is_active: true,
      is_base: false
    };
    setUomRows([...uomRows, newRow]);
  };

  const removeUomRow = (rowId) => {
    setUomRows(uomRows.filter(row => row.id !== rowId));
  };

  const updateUomRow = (rowId, field, value) => {
    setUomRows(uomRows.map(row => {
      if (row.id === rowId) {
        if (field === 'uom_id') {
          // When UOM is selected, populate conversion factor and other details
          const selectedUnit = allUnits.find(u => u.id === value);
          if (selectedUnit) {
            return {
              ...row,
              uom_id: value,
              uom_code: selectedUnit.code,
              uom_name: selectedUnit.name,
              conversion_factor: selectedUnit.conversion_factor.toString(),
              is_base: selectedUnit.is_base
            };
          }
        }
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const validateQuantity = (qty, maxLoose) => {
    // EXACT LOGIC: MAX_LOOSE controls decimal places
    const qtyStr = qty.toString();
    const decimalPart = qtyStr.split('.')[1] || '';
    
    if (maxLoose === 0 || maxLoose === '0') {
      // No decimals allowed
      return decimalPart.length === 0;
    }
    
    // Count digits in max_loose
    const maxLooseDigits = maxLoose.toString().length;
    return decimalPart.length <= maxLooseDigits;
  };

  const convertQuantity = (qty, fromRow, toRow) => {
    // EXACT CONVERSION LOGIC
    // Step 1: Convert to base UOM
    const baseQty = parseFloat(qty) * parseFloat(fromRow.conversion_factor);
    
    // Step 2: Convert from base to target UOM
    const result = baseQty / parseFloat(toRow.conversion_factor);
    
    return result.toFixed(6);
  };

  const getDecimalAllowed = (maxLoose) => {
    if (!maxLoose || maxLoose === '0') return '0 (Whole numbers only)';
    return maxLoose.toString().length + ' decimal places';
  };

  const getConversionDisplay = (row) => {
    if (!row.conversion_factor) return '-';
    const factor = parseFloat(row.conversion_factor);
    if (row.is_base) {
      return `1 ${row.uom_code} = BASE UNIT`;
    }
    return `1 ${row.uom_code} = ${factor} BASE`;
  };

  const filteredUnits = allUnits.filter(unit =>
    unit.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "98%", maxWidth: "1600px", height: "95%", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #8b5cf6, #a78bfa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Package size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>📦 Item Master - UOM Configuration</h2>
          </div>
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

        {/* Info Banner */}
        <div style={{ padding: "10px 12px", background: "#e9d5ff", border: "1px solid #c4b5fd", margin: "8px 12px 0 12px", borderRadius: "4px" }}>
          <div style={{ display: "flex", alignItems: "start", gap: "8px" }}>
            <Info size={12} style={{ color: "#000", marginTop: "2px" }} />
            <div>
              <div style={{ fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                💡 MAX LOOSE LOGIC & CONVERSION RULES
              </div>
              <div style={{ fontSize: "8px", color: "#000", lineHeight: "1.4" }}>
                • <strong>Max Loose = 0</strong> → Only whole numbers allowed (no decimals)<br/>
                • <strong>Max Loose = 999</strong> → Up to 3 decimal places (e.g., 1.125)<br/>
                • <strong>Conversion Factor</strong> → 1 YOUR_UOM = FACTOR × BASE_UOM<br/>
                • <strong>Example</strong>: KGS (Base, Factor=1), POUCH-1KG (Derived, Factor=1 means equal to base)
              </div>
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div style={{ padding: "12px", borderBottom: "1px solid #e0e0e0", background: "#f9fafb", flexShrink: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                Select UOM Category <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }}
              >
                <option value="">Choose category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.code})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={addUomRow}
                disabled={!selectedCategory}
                style={{ 
                  padding: "6px 12px", 
                  background: selectedCategory ? "linear-gradient(to right, #8b5cf6, #a78bfa)" : "#e0e0e0", 
                  border: "none", 
                  borderRadius: "4px", 
                  fontSize: "10px", 
                  fontWeight: "600", 
                  cursor: selectedCategory ? "pointer" : "not-allowed", 
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <Plus size={12} />
                Add UOM Row
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - UOM Table */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
          {uomRows.length === 0 ? (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              height: "100%",
              flexDirection: "column",
              gap: "12px"
            }}>
              <Package size={48} style={{ color: "#ddd" }} />
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#000" }}>
                No UOM rows added
              </div>
              <div style={{ fontSize: "9px", color: "#666" }}>
                Select a category and click "Add UOM Row" to begin
              </div>
            </div>
          ) : (
            <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "linear-gradient(to right, #8b5cf6, #a78bfa)" }}>
                    <th style={{ padding: "8px", textAlign: "left", color: "white", fontSize: "9px", fontWeight: "700", width: "30px" }}>
                      #
                    </th>
                    <th style={{ padding: "8px", textAlign: "left", color: "white", fontSize: "9px", fontWeight: "700" }}>
                      UOM <span style={{ color: "#fca5a5" }}>*</span>
                    </th>
                    <th style={{ padding: "8px", textAlign: "center", color: "white", fontSize: "9px", fontWeight: "700", width: "120px" }}>
                      Max. Loose <span style={{ color: "#fca5a5" }}>*</span>
                    </th>
                    <th style={{ padding: "8px", textAlign: "right", color: "white", fontSize: "9px", fontWeight: "700", width: "120px" }}>
                      Conversion Factor <span style={{ color: "#fca5a5" }}>*</span>
                    </th>
                    <th style={{ padding: "8px", textAlign: "right", color: "white", fontSize: "9px", fontWeight: "700", width: "100px" }}>
                      Net Weight
                    </th>
                    <th style={{ padding: "8px", textAlign: "right", color: "white", fontSize: "9px", fontWeight: "700", width: "100px" }}>
                      Gross Weight
                    </th>
                    <th style={{ padding: "8px", textAlign: "right", color: "white", fontSize: "9px", fontWeight: "700", width: "100px" }}>
                      Volume
                    </th>
                    <th style={{ padding: "8px", textAlign: "center", color: "white", fontSize: "9px", fontWeight: "700", width: "80px" }}>
                      Inactive
                    </th>
                    <th style={{ padding: "8px", textAlign: "center", color: "white", fontSize: "9px", fontWeight: "700", width: "100px" }}>
                      UOM Type
                    </th>
                    <th style={{ padding: "8px", textAlign: "center", color: "white", fontSize: "9px", fontWeight: "700", width: "60px" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {uomRows.map((row, index) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f0f0f0", background: index % 2 === 0 ? "white" : "#f9fafb" }}>
                      <td style={{ padding: "8px", fontSize: "10px", color: "#666", textAlign: "center" }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: "8px" }}>
                        <select
                          value={row.uom_id}
                          onChange={(e) => updateUomRow(row.id, 'uom_id', e.target.value)}
                          style={{ width: "100%", padding: "4px 6px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "9px", color: "#000" }}
                        >
                          <option value="">Select UOM...</option>
                          {filteredUnits.map(unit => (
                            <option key={unit.id} value={unit.id}>
                              {unit.code} - {unit.name} {unit.is_base ? '(BASE)' : ''}
                            </option>
                          ))}
                        </select>
                        {row.uom_code && (
                          <div style={{ fontSize: "7px", color: "#666", marginTop: "2px" }}>
                            {getConversionDisplay(row)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <input
                          type="number"
                          value={row.max_loose}
                          onChange={(e) => updateUomRow(row.id, 'max_loose', e.target.value)}
                          placeholder="0"
                          style={{ 
                            width: "90px", 
                            padding: "4px 6px", 
                            border: "1px solid #e0e0e0", 
                            borderRadius: "4px", 
                            fontSize: "9px", 
                            fontFamily: "monospace",
                            textAlign: "center",
                            background: row.max_loose === '0' ? "#fef3c7" : "white"
                          }}
                        />
                        {row.max_loose !== '' && (
                          <div style={{ fontSize: "7px", color: "#666", marginTop: "2px" }}>
                            {getDecimalAllowed(row.max_loose)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px", textAlign: "right" }}>
                        <input
                          type="text"
                          value={row.conversion_factor}
                          readOnly
                          style={{ 
                            width: "100px", 
                            padding: "4px 6px", 
                            border: "1px solid #e0e0e0", 
                            borderRadius: "4px", 
                            fontSize: "9px", 
                            fontFamily: "monospace",
                            textAlign: "right",
                            background: "#f0f0f0"
                          }}
                        />
                      </td>
                      <td style={{ padding: "8px", textAlign: "right" }}>
                        <input
                          type="number"
                          step="0.01"
                          value={row.net_weight}
                          onChange={(e) => updateUomRow(row.id, 'net_weight', e.target.value)}
                          style={{ 
                            width: "80px", 
                            padding: "4px 6px", 
                            border: "1px solid #e0e0e0", 
                            borderRadius: "4px", 
                            fontSize: "9px", 
                            fontFamily: "monospace",
                            textAlign: "right"
                          }}
                        />
                      </td>
                      <td style={{ padding: "8px", textAlign: "right" }}>
                        <input
                          type="number"
                          step="0.01"
                          value={row.gross_weight}
                          onChange={(e) => updateUomRow(row.id, 'gross_weight', e.target.value)}
                          style={{ 
                            width: "80px", 
                            padding: "4px 6px", 
                            border: "1px solid #e0e0e0", 
                            borderRadius: "4px", 
                            fontSize: "9px", 
                            fontFamily: "monospace",
                            textAlign: "right"
                          }}
                        />
                      </td>
                      <td style={{ padding: "8px", textAlign: "right" }}>
                        <input
                          type="number"
                          step="0.01"
                          value={row.volume}
                          onChange={(e) => updateUomRow(row.id, 'volume', e.target.value)}
                          style={{ 
                            width: "80px", 
                            padding: "4px 6px", 
                            border: "1px solid #e0e0e0", 
                            borderRadius: "4px", 
                            fontSize: "9px", 
                            fontFamily: "monospace",
                            textAlign: "right"
                          }}
                        />
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <select
                          value={row.is_active ? 'No' : 'Yes'}
                          onChange={(e) => updateUomRow(row.id, 'is_active', e.target.value === 'No')}
                          style={{ 
                            width: "60px", 
                            padding: "4px 6px", 
                            border: "1px solid #e0e0e0", 
                            borderRadius: "4px", 
                            fontSize: "9px"
                          }}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <span style={{
                          padding: "3px 8px",
                          background: row.is_base ? "#fef3c7" : "#e9d5ff",
                          color: "#000",
                          borderRadius: "4px",
                          fontSize: "8px",
                          fontWeight: "600"
                        }}>
                          {row.is_base ? 'Base UOM' : 'Derived UOM'}
                        </span>
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <button
                          onClick={() => removeUomRow(row.id)}
                          style={{ 
                            padding: "4px", 
                            background: "transparent", 
                            border: "none", 
                            cursor: "pointer",
                            color: "#ef4444"
                          }}
                          title="Remove row"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with Save */}
        <div style={{ padding: "12px", borderTop: "1px solid #e0e0e0", background: "#f9fafb", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontSize: "9px", color: "#666" }}>
            {uomRows.length} UOM row(s) configured
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setUomRows([])}
              style={{ 
                padding: "6px 12px", 
                background: "#f0f0f0", 
                border: "1px solid #ddd", 
                borderRadius: "4px", 
                fontSize: "10px", 
                fontWeight: "600", 
                cursor: "pointer",
                color: "#000"
              }}
            >
              Clear All
            </button>
            <button
              onClick={() => showSuccess('UOM configuration saved! (Demo)')}
              disabled={uomRows.length === 0}
              style={{ 
                padding: "6px 16px", 
                background: uomRows.length > 0 ? "linear-gradient(to right, #8b5cf6, #a78bfa)" : "#e0e0e0", 
                border: "none", 
                borderRadius: "4px", 
                fontSize: "10px", 
                fontWeight: "600", 
                cursor: uomRows.length > 0 ? "pointer" : "not-allowed",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <Save size={12} />
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UOMMasterItemCreation;