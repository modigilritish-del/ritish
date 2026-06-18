import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowRight, Calculator, AlertCircle, Copy, History, Zap, CheckCircle, Trash2, Loader } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/uom';

const UOMConverterPage = () => {
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [fromUom, setFromUom] = useState('');
  const [toUom, setToUom] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchCategories();
    loadHistory();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchUoms(selectedCategory);
    } else {
      setUoms([]);
      setFromUom('');
      setToUom('');
      setResult(null);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories?is_active=true`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data.items || []);
    } catch (err) {
      setError('Error loading categories');
    }
  };

  const fetchUoms = async (categoryCode) => {
    try {
      const res = await fetch(`${API_BASE}/units?category_code=${categoryCode}&is_active=true&limit=500`);
      if (!res.ok) throw new Error('Failed to fetch units');
      const data = await res.json();
      setUoms(data.items || []);
    } catch (err) {
      setError('Error loading units');
      setUoms([]);
    }
  };

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem('uom_conversion_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Error loading history');
    }
  };

  const saveToHistory = (conversion) => {
    try {
      const newHistory = [conversion, ...history.slice(0, 19)];
      setHistory(newHistory);
      localStorage.setItem('uom_conversion_history', JSON.stringify(newHistory));
    } catch (err) {
      console.error('Error saving history');
    }
  };

  const handleConvert = async () => {
    if (!selectedCategory || !fromUom || !toUom || !quantity) {
      setError('Please fill all fields');
      return;
    }

    if (parseFloat(quantity) <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_uom: fromUom,
          to_uom: toUom,
          quantity: parseFloat(quantity),
          category_code: selectedCategory
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Conversion failed');
      }

      const data = await res.json();
      setResult(data);
      
      saveToHistory({
        from: fromUom,
        to: toUom,
        quantity: parseFloat(quantity),
        result: data.to_quantity,
        category: selectedCategory,
        categoryName: categories.find(c => c.code === selectedCategory)?.name || selectedCategory,
        timestamp: new Date().toLocaleString()
      });

      showSuccess('Conversion successful!');
      
    } catch (err) {
      setError(err.message || 'Error performing conversion');
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    const temp = fromUom;
    setFromUom(toUom);
    setToUom(temp);
    setResult(null);
  };

  const copyResult = () => {
    if (result) {
      const text = `${result.from_quantity} ${result.from_uom} = ${result.to_quantity} ${result.to_uom}`;
      navigator.clipboard.writeText(text);
      showSuccess('Result copied to clipboard!');
    }
  };

  const useHistoryItem = (item) => {
    setSelectedCategory(item.category);
    setFromUom(item.from);
    setToUom(item.to);
    setQuantity(item.quantity.toString());
    setResult(null);
  };

  const clearHistory = () => {
    if (window.confirm('Clear all conversion history?')) {
      setHistory([]);
      localStorage.removeItem('uom_conversion_history');
      showSuccess('History cleared!');
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const getUnitDisplay = (code) => {
    const unit = uoms.find(u => u.code === code);
    if (!unit) return code;
    return `${unit.name} (${unit.code})${unit.is_base ? ' 🔵' : ''}`;
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "95%", maxWidth: "1200px", height: "90%", maxHeight: "700px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #4b5563, #60a5fa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Calculator size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>UOM Converter</h2>
          </div>
        </div>

        {/* Success Message */}
        {successMsg && (
          <div style={{ margin: "8px 12px 0 12px", padding: "6px 8px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle size={12} style={{ color: "#16a34a" }} />
            <span style={{ fontSize: "10px", color: "#000", fontWeight: "500" }}>{successMsg}</span>
          </div>
        )}

        {/* Main Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", height: "100%" }}>
            
            {/* Main Converter Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              
              {/* Category Selection */}
              <div>
                <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                  Select Category <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setResult(null);
                  }}
                  style={{ width: "100%", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000", background: "white" }}
                >
                  <option value="">Choose a category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.code}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCategory && (
                <>
                  {/* Unit Selection */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "8px", alignItems: "end" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                        From Unit <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        value={fromUom}
                        onChange={(e) => {
                          setFromUom(e.target.value);
                          setResult(null);
                        }}
                        style={{ width: "100%", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000", background: "white" }}
                      >
                        <option value="">Select unit...</option>
                        {uoms.map(uom => (
                          <option key={uom.id} value={uom.code}>
                            {uom.name} ({uom.code}) {uom.is_base && '🔵'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button
                        onClick={handleSwap}
                        disabled={!fromUom || !toUom}
                        style={{ padding: "6px", background: "#e9d5ff", color: "#7c3aed", border: "none", borderRadius: "4px", cursor: "pointer", opacity: (!fromUom || !toUom) ? 0.5 : 1 }}
                        title="Swap units"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                        To Unit <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        value={toUom}
                        onChange={(e) => {
                          setToUom(e.target.value);
                          setResult(null);
                        }}
                        style={{ width: "100%", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000", background: "white" }}
                      >
                        <option value="">Select unit...</option>
                        {uoms.map(uom => (
                          <option key={uom.id} value={uom.code}>
                            {uom.name} ({uom.code}) {uom.is_base && '🔵'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div>
                    <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                      Quantity <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        setResult(null);
                      }}
                      placeholder="Enter quantity..."
                      style={{ width: "100%", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "12px", color: "#000" }}
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div style={{ padding: "6px 8px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "4px", display: "flex", alignItems: "start", gap: "6px" }}>
                      <AlertCircle size={14} style={{ color: "#ef4444", flexShrink: 0, marginTop: "1px" }} />
                      <span style={{ fontSize: "10px", color: "#000" }}>{error}</span>
                    </div>
                  )}

                  {/* Convert Button */}
                  <button
                    onClick={handleConvert}
                    disabled={loading || !fromUom || !toUom || !quantity}
                    style={{ width: "100%", padding: "8px 12px", background: "linear-gradient(to right, #7c3aed, #a78bfa)", border: "none", borderRadius: "4px", fontSize: "11px", fontWeight: "600", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: (loading || !fromUom || !toUom || !quantity) ? 0.5 : 1 }}
                  >
                    {loading ? (
                      <>
                        <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
                        Converting...
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        Convert Now
                      </>
                    )}
                  </button>

                  {/* Result Display */}
                  {result && (
                    <div style={{ background: "linear-gradient(to bottom right, #dcfce7, #d1fae5)", border: "2px solid #86efac", borderRadius: "6px", padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "11px", fontWeight: "600", color: "#000", display: "flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle size={14} />
                          Conversion Result
                        </div>
                        <button
                          onClick={copyResult}
                          style={{ padding: "4px 8px", background: "white", border: "1px solid #86efac", color: "#000", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "9px", fontWeight: "600" }}
                        >
                          <Copy size={12} />
                          Copy
                        </button>
                      </div>

                      {/* Main Result */}
                      <div style={{ background: "white", borderRadius: "4px", padding: "10px", border: "1px solid #86efac" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "18px", fontWeight: "700", color: "#000" }}>
                              {result.from_quantity}
                            </div>
                            <div style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>{result.from_uom}</div>
                          </div>
                          <ArrowRight size={20} style={{ color: "#16a34a" }} strokeWidth={3} />
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: "18px", fontWeight: "700", color: "#000" }}>
                              {parseFloat(result.to_quantity).toFixed(6)}
                            </div>
                            <div style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>{result.to_uom}</div>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        <div style={{ background: "white", borderRadius: "4px", padding: "6px", border: "1px solid #86efac" }}>
                          <div style={{ fontSize: "8px", color: "#666", marginBottom: "2px" }}>Category</div>
                          <div style={{ fontSize: "10px", fontWeight: "600", color: "#000" }}>{result.category}</div>
                        </div>
                        <div style={{ background: "white", borderRadius: "4px", padding: "6px", border: "1px solid #86efac" }}>
                          <div style={{ fontSize: "8px", color: "#666", marginBottom: "2px" }}>Conversion Factor</div>
                          <div style={{ fontSize: "10px", fontWeight: "600", color: "#000" }}>
                            {parseFloat(result.conversion_factor).toFixed(6)}
                          </div>
                        </div>
                        <div style={{ gridColumn: "1 / -1", background: "white", borderRadius: "4px", padding: "6px", border: "1px solid #86efac" }}>
                          <div style={{ fontSize: "8px", color: "#666", marginBottom: "2px" }}>Calculation</div>
                          <div style={{ fontSize: "9px", fontWeight: "600", color: "#000" }}>
                            {result.calculation}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!selectedCategory && (
                <div style={{ textAlign: "center", paddingTop: "60px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "8px" }}>🔢</div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                    Select a category to start converting
                  </div>
                  <div style={{ fontSize: "10px", color: "#666" }}>
                    Choose from Weight, Length, Volume, and more
                  </div>
                </div>
              )}
            </div>

            {/* History Sidebar */}
            <div style={{ background: "#f9fafb", borderRadius: "6px", padding: "10px", border: "1px solid #e0e0e0", maxHeight: "100%", overflow: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ fontSize: "10px", fontWeight: "600", color: "#000", display: "flex", alignItems: "center", gap: "4px" }}>
                  <History size={14} />
                  Recent Conversions
                </div>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    style={{ padding: "4px", color: "#ef4444", background: "transparent", border: "none", cursor: "pointer", borderRadius: "3px" }}
                    title="Clear history"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div style={{ textAlign: "center", paddingTop: "40px" }}>
                  <div style={{ fontSize: "32px", marginBottom: "6px", opacity: 0.3 }}>📋</div>
                  <div style={{ fontSize: "9px", color: "#999" }}>No conversion history yet</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {history.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => useHistoryItem(item)}
                      style={{ background: "white", padding: "6px", borderRadius: "4px", border: "1px solid #e0e0e0", cursor: "pointer" }}
                    >
                      <div style={{ fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "2px" }}>
                        {item.quantity} {item.from} → {parseFloat(item.result).toFixed(3)} {item.to}
                      </div>
                      <div style={{ fontSize: "8px", color: "#666", marginBottom: "2px" }}>{item.categoryName}</div>
                      <div style={{ fontSize: "8px", color: "#999" }}>{item.timestamp}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "0px 12px", height: "16px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #60a5fa, #4b5563)", flexShrink: 0 }}></div>
      </div>
    </div>
  );
};

export default UOMConverterPage;