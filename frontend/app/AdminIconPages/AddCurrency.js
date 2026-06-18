"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Save, DollarSign } from "lucide-react";

export default function AddCurrency({ embeddedMode = false }) {
  const [currencies, setCurrencies] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    currency_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("http://localhost:8000/api/currencies");
      if (!response.ok) {
        throw new Error("Failed to load currencies. Please check backend connection.");
      }
      const data = await response.json();
      setCurrencies(data);
    } catch (err) {
      setError(err.message);
      setCurrencies([]);
    } finally {
      setLoading(false);
    }
  };

  const capitalizeWords = (text) => {
    return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const generateCurrencyCode = (currencyName) => {
    const baseCode = currencyName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${baseCode}-${randomNum}`;
  };

  const generateCurrencySymbol = (currencyName) => {
    const symbolMap = {
      'dollar': '$', 'euro': '€', 'pound': '£', 'rupee': '₹', 'yen': '¥',
      'yuan': '¥', 'franc': '₣', 'won': '₩', 'ruble': '₽', 'real': 'R$',
      'rand': 'R', 'peso': '₱', 'riyal': '﷼', 'dirham': 'د.إ', 'dinar': 'د.ك',
      'shekel': '₪', 'lira': '₺', 'krona': 'kr', 'krone': 'kr'
    };
    
    const lowerName = currencyName.toLowerCase();
    for (const [key, symbol] of Object.entries(symbolMap)) {
      if (lowerName.includes(key)) return symbol;
    }
    return currencyName.substring(0, 3).toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.currency_name.trim()) {
      setError("Please fill in currency name");
      return;
    }

    try {
      setLoading(true);
      const currency_code = generateCurrencyCode(formData.currency_name);
      const currency_symbol = generateCurrencySymbol(formData.currency_name);
      
      const url = editingId ? `http://localhost:8000/api/currencies/${editingId}` : "http://localhost:8000/api/currencies";
      const method = editingId ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency_name: formData.currency_name,
          currency_code: currency_code,
          currency_symbol: currency_symbol
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save currency");
      }

      setSuccess(editingId ? "Currency updated successfully!" : "Currency created successfully!");
      await fetchCurrencies();
      setTimeout(() => { resetForm(); setSuccess(""); }, 1500);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (currency) => {
    setFormData({ currency_name: currency.currency_name });
    setEditingId(currency.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this currency?")) return;
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/currencies/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete currency");
      setSuccess("Currency deleted successfully!");
      await fetchCurrencies();
      setTimeout(() => setSuccess(""), 1500);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ currency_name: "" });
    setEditingId(null);
    setShowAddForm(false);
  };

  const inputStyle = { width: "100%", padding: "4px 8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "11px", boxSizing: "border-box", color: "#333", backgroundColor: "#fff" };
  const labelStyle = { display: "block", fontSize: "10px", fontWeight: "500", marginBottom: "3px", color: "#555" };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", ...(embeddedMode ? {} : { margin: "20px", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }) }}>
        {/* Header — hidden in embeddedMode */}
        {!embeddedMode && (
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #4b5563, #60a5fa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <DollarSign size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>Currency Management</h2>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding: "4px 14px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}>
            {showAddForm ? <X size={12} /> : <Plus size={12} />}{showAddForm ? "Cancel" : "Add Currency"}
          </button>
        </div>
        )}
        {embeddedMode && (
        <div style={{ padding: "4px 8px", background: "#f8faff", borderBottom: "1px solid #e0e7ff", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding: "4px 14px", background: showAddForm ? "#f0f0f0" : "linear-gradient(to right, #4b5563, #60a5fa)", border: showAddForm ? "1px solid #ddd" : "none", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: showAddForm ? "#333" : "white", display: "flex", alignItems: "center", gap: "4px" }}>
            {showAddForm ? <X size={12} /> : <Plus size={12} />}{showAddForm ? "Cancel" : "Add Currency"}
          </button>
        </div>
        )}

        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {error && (
            <div style={{ padding: "10px 12px", background: "#fee", color: "#c00", borderRadius: "4px", marginBottom: "10px", fontSize: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>⚠️</span>
              <div><div style={{ fontWeight: "600", marginBottom: "2px" }}>Error</div><div>{error}</div></div>
            </div>
          )}
          {success && (
            <div style={{ padding: "10px 12px", background: "#efe", color: "#080", borderRadius: "4px", marginBottom: "10px", fontSize: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>✅</span>
              <div style={{ fontWeight: "600" }}>{success}</div>
            </div>
          )}

          {showAddForm && (
            <div style={{ marginBottom: "10px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
                {editingId ? "Edit Currency" : "Add New Currency"}
              </h3>
              <div>
                <div style={{ marginBottom: "8px" }}>
                  <label style={labelStyle}>Currency Name <span style={{ color: "#c00" }}>*</span></label>
                  <input type="text" value={formData.currency_name} onChange={(e) => setFormData({...formData, currency_name: capitalizeWords(e.target.value)})} placeholder="e.g., US Dollar" required style={inputStyle} />
                </div>
                <div style={{ fontSize: "9px", color: "#666", marginBottom: "8px" }}>Currency code and symbol will be auto-generated from the name</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={handleSubmit} disabled={loading} style={{ padding: "4px 14px", background: loading ? "#ccc" : "rgba(75, 85, 99, 0.9)", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: loading ? "not-allowed" : "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Save size={12} />
                    {loading ? "Saving..." : (editingId ? "Update" : "Save")}
                  </button>
                  <button onClick={resetForm} style={{ padding: "4px 14px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "#333" }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: "10px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Currencies List</span>
              <span style={{ fontSize: "9px", fontWeight: "400", color: "#0066cc", background: "linear-gradient(135deg, #e0f2fe 0%, #dcfce7 100%)", padding: "2px 8px", borderRadius: "10px" }}>Total Currencies: {currencies.length}</span>
            </h3>
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
              {loading && currencies.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "11px", color: "#666" }}>
                  <div style={{ marginBottom: "10px", fontSize: "36px" }}>⏳</div>
                  <div style={{ fontWeight: "500" }}>Loading currencies...</div>
                  <div style={{ fontSize: "9px", marginTop: "4px", color: "#999" }}>Please wait</div>
                </div>
              ) : currencies.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "11px", color: "#666" }}>
                  <div style={{ marginBottom: "10px", fontSize: "48px" }}>💱</div>
                  <div style={{ fontWeight: "500", marginBottom: "4px" }}>No currencies found</div>
                  <div style={{ fontSize: "9px", color: "#999" }}>Click "Add Currency" button to create your first currency</div>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fa" }}>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>ID</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Currency Name</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Symbol</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Currency Code</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Created At</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currencies.map((currency, index) => (
                      <tr key={currency.id} style={{ borderBottom: index < currencies.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                        <td style={{ padding: "6px 8px", color: "#666" }}>{currency.id}</td>
                        <td style={{ padding: "6px 8px", color: "#333", fontWeight: "500" }}>{currency.currency_name}</td>
                        <td style={{ padding: "6px 8px" }}>
                          <span style={{ padding: "2px 6px", background: "#fff3cd", color: "#856404", borderRadius: "3px", fontSize: "11px", fontWeight: "600" }}>
                            {currency.currency_symbol || "N/A"}
                          </span>
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <span style={{ padding: "2px 6px", background: "#e3f2fd", color: "#0066cc", borderRadius: "3px", fontSize: "9px", fontWeight: "600" }}>
                            {currency.currency_code}
                          </span>
                        </td>
                        <td style={{ padding: "6px 8px", color: "#666" }}>{new Date(currency.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: "6px 8px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                            <button onClick={() => handleEdit(currency)} style={{ padding: "3px 8px", background: "#fff", border: "1px solid #0066cc", borderRadius: "3px", cursor: "pointer", color: "#0066cc", fontSize: "9px", fontWeight: "500", display: "flex", alignItems: "center", gap: "3px" }}>
                              <Edit2 size={10} />Edit
                            </button>
                            <button onClick={() => handleDelete(currency.id)} style={{ padding: "3px 8px", background: "#fff", border: "1px solid #dc3545", borderRadius: "3px", cursor: "pointer", color: "#dc3545", fontSize: "9px", fontWeight: "500", display: "flex", alignItems: "center", gap: "3px" }}>
                              <Trash2 size={10} />Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer — hidden in embeddedMode */}
        {!embeddedMode && (
        <div style={{ padding: "0px 12px", height: "16px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #60a5fa, #4b5563)", flexShrink: 0 }}></div>
        )}
      </div>
    </div>
  );
}