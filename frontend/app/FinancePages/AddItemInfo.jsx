import React, { useState, useEffect } from 'react';
import { Building, Package, DollarSign, Search, Eye, Trash2, CheckCircle, XCircle, AlertCircle, Loader, Grid, List, Plus, Save, Info } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function AddItemInfo() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Master Data
  const [companiesWithPlants, setCompaniesWithPlants] = useState([]);
  const [glAccounts, setGLAccounts] = useState([]);
  const [existingItems, setExistingItems] = useState([]);
  
  // Form State
  const [selectedCompany, setSelectedCompany] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [selectedGL, setSelectedGL] = useState('');
  const [isStock, setIsStock] = useState(true);
  
  // View State
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [glSearchTerm, setGLSearchTerm] = useState('');

  // Get current user
  useEffect(() => {
    const userData = sessionStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        const user = parsed.user;
        setCurrentUser(user);
        if (user?.id) {
          fetchCompanies(user.id);
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
        setMessage({ type: 'error', text: 'Failed to load user data' });
      }
    }
  }, []);

  // Fetch GL accounts when company selected
  useEffect(() => {
    if (currentUser?.id && selectedCompany) {
      fetchGLAccounts();
    }
  }, [selectedCompany, currentUser]);

  // Fetch items when filter changes
  useEffect(() => {
    if (currentUser?.id) {
      fetchItems();
    }
  }, [filterCompanyId, currentUser]);

  const fetchCompanies = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/user/${userId}/companies-with-plants`);
      const data = await res.json();
      setCompaniesWithPlants(data.companies || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setMessage({ type: 'error', text: 'Failed to load companies' });
    }
  };

  const fetchGLAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE}/gl-accounts/by-user/${currentUser.id}?company_id=${selectedCompany}`);
      const data = await res.json();
      setGLAccounts(data.gl_accounts || []);
    } catch (err) {
      console.error('Error fetching GL accounts:', err);
    }
  };

  const fetchItems = async () => {
    if (!currentUser?.id) return;
    
    try {
      let url = `${API_BASE}/items/by-user/${currentUser.id}`;
      if (filterCompanyId) {
        url += `?company_id=${filterCompanyId}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      setExistingItems(data.items || []);
    } catch (err) {
      console.error('Error fetching items:', err);
      setMessage({ type: 'error', text: 'Failed to load items' });
    }
  };

  const handleCreateItem = async () => {
    if (!itemCode.trim()) {
      setMessage({ type: 'error', text: 'Item code is required' });
      return;
    }

    if (!itemName.trim()) {
      setMessage({ type: 'error', text: 'Item name is required' });
      return;
    }

    if (!selectedCompany) {
      setMessage({ type: 'error', text: 'Please select a company' });
      return;
    }

    if (!selectedGL) {
      setMessage({ type: 'error', text: 'Please select GL account' });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('item_code', itemCode.trim().toUpperCase());
    formData.append('item_name', itemName.trim());
    formData.append('company_id', selectedCompany);
    formData.append('gl_id', selectedGL);
    formData.append('is_stock', isStock);
    formData.append('user_id', currentUser.id);

    try {
      const res = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: `Item "${data.item_code}" created successfully with GL ${data.gl_code}` 
        });
        
        setItemCode('');
        setItemName('');
        setSelectedGL('');
        setIsStock(true);
        
        fetchItems();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to create item' });
      }
    } catch (err) {
      console.error('Error creating item:', err);
      setMessage({ type: 'error', text: 'Error creating item' });
    } finally {
      setLoading(false);
    }
  };

  const getSelectedCompanyName = () => {
    const company = companiesWithPlants.find(c => c.company_id === parseInt(selectedCompany));
    return company?.company_name || '';
  };

  const filteredItems = existingItems.filter(item =>
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGLAccounts = glAccounts.filter(gl =>
    gl.gl_code.toLowerCase().includes(glSearchTerm.toLowerCase()) ||
    gl.gl_name.toLowerCase().includes(glSearchTerm.toLowerCase())
  );

  const s1 = { width: "100%", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", boxSizing: "border-box", color: "#000" };
  const s2 = { ...s1, cursor: "pointer" };
  const s3 = { display: "block", fontSize: "9px", fontWeight: "600", marginBottom: "4px", color: "#000" };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "95%", maxWidth: "1200px", height: "90%", maxHeight: "700px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #8b5cf6, #a78bfa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Package size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>📦 Item Master Management</h2>
          </div>
        </div>

        {message && (
          <div style={{ 
            margin: "8px 12px 0 12px", 
            padding: "6px 8px", 
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            border: message.type === 'success' ? "1px solid #86efac" : "1px solid #fca5a5",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}>
            {message.type === 'success' ? <CheckCircle size={12} style={{ color: "#16a34a" }} /> : <AlertCircle size={12} style={{ color: "#dc2626" }} />}
            <span style={{ fontSize: "10px", color: "#000", fontWeight: "500", flex: 1 }}>
              {message.text}
            </span>
            <button
              onClick={() => setMessage(null)}
              style={{ padding: "2px", border: "none", background: "transparent", cursor: "pointer" }}
            >
              <XCircle size={12} color={message.type === 'success' ? '#16a34a' : '#dc2626'} />
            </button>
          </div>
        )}

        <div style={{ display: "flex", borderBottom: "1px solid #e0e0e0", background: "#f9fafb", flexShrink: 0 }}>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: "6px 12px",
              fontSize: "10px",
              fontWeight: "600",
              cursor: "pointer",
              border: "none",
              background: activeTab === 'create' ? 'white' : 'transparent',
              color: activeTab === 'create' ? '#8b5cf6' : '#000',
              borderBottom: activeTab === 'create' ? '2px solid #8b5cf6' : 'none'
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              <Plus size={12} />
              Create Item
            </div>
          </button>
          <button
            onClick={() => setActiveTab('view')}
            style={{
              flex: 1,
              padding: "6px 12px",
              fontSize: "10px",
              fontWeight: "600",
              cursor: "pointer",
              border: "none",
              background: activeTab === 'view' ? 'white' : 'transparent',
              color: activeTab === 'view' ? '#8b5cf6' : '#000',
              borderBottom: activeTab === 'view' ? '2px solid #8b5cf6' : 'none'
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              <Eye size={12} />
              View Items ({filteredItems.length})
            </div>
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>

          {activeTab === 'create' && (
            <div>
              <div style={{ background: "#e9d5ff", border: "1px solid #c4b5fd", borderRadius: "6px", padding: "10px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "start", gap: "8px" }}>
                  <Info size={14} style={{ color: "#000", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>📦 ITEM MASTER RULES</div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "9px", color: "#000", lineHeight: "1.5" }}>
                      <li>Item code must be unique within the company</li>
                      <li>Each item must be linked to a GL account</li>
                      <li>Stock items are inventory items</li>
                      <li>Non-stock items are expense/service items</li>
                      <li>Use UPPERCASE for item codes</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Building size={12} />
                  Select Company <span style={{ color: "#dc2626" }}>*</span>
                </h3>
                
                <select
                  value={selectedCompany}
                  onChange={(e) => {
                    setSelectedCompany(e.target.value);
                    setSelectedGL('');
                    setGLSearchTerm('');
                  }}
                  style={s2}
                >
                  <option value="">Select Company</option>
                  {companiesWithPlants.map(c => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name} ({c.company_code})
                    </option>
                  ))}
                </select>

                {selectedCompany && (
                  <div style={{ marginTop: "8px", padding: "6px 8px", background: "#ede9fe", borderRadius: "4px", fontSize: "9px", color: "#000", fontWeight: "500" }}>
                    <strong>Selected:</strong> {getSelectedCompanyName()}
                  </div>
                )}
              </div>

              {selectedCompany && (
                <>
                  <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                    <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                      <DollarSign size={12} />
                      Select GL Account <span style={{ color: "#dc2626" }}>*</span>
                    </h3>

                    <div style={{ position: "relative", marginBottom: "8px" }}>
                      <Search size={12} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                      <input
                        type="text"
                        placeholder="Search GL accounts..."
                        value={glSearchTerm}
                        onChange={(e) => setGLSearchTerm(e.target.value)}
                        style={{ width: "100%", padding: "6px 6px 6px 32px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "9px", color: "#000" }}
                      />
                    </div>

                    <select
                      value={selectedGL}
                      onChange={(e) => setSelectedGL(e.target.value)}
                      style={s2}
                    >
                      <option value="">Select GL Account</option>
                      {filteredGLAccounts.map(gl => (
                        <option key={gl.id} value={gl.id}>
                          {gl.gl_code} - {gl.gl_name} ({gl.gl_type.type_name})
                        </option>
                      ))}
                    </select>

                    {glAccounts.length === 0 && (
                      <p style={{ margin: "8px 0 0 0", fontSize: "8px", color: "#dc2626", fontStyle: "italic" }}>
                        No GL accounts found for this company. Please create GL accounts first.
                      </p>
                    )}
                  </div>

                  {selectedGL && (
                    <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "12px" }}>
                      <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "10px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Package size={12} />
                        Item Details
                      </h3>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                        <div>
                          <label style={s3}>
                            Item Code <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={itemCode}
                            onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                            placeholder="e.g., ITEM001, PROD001"
                            style={s1}
                          />
                          <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#666" }}>
                            Will be auto-converted to UPPERCASE
                          </p>
                        </div>

                        <div>
                          <label style={s3}>
                            Item Name <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder="e.g., Steel Rod, Plastic Sheet"
                            style={s1}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: "12px" }}>
                        <label style={{ ...s3, display: "flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="checkbox"
                            checked={isStock}
                            onChange={(e) => setIsStock(e.target.checked)}
                            style={{ cursor: "pointer" }}
                          />
                          Stock Item
                        </label>
                        <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#666" }}>
                          Check if this is an inventory item (uncheck for expenses/services)
                        </p>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                        <button
                          onClick={() => {
                            setItemCode('');
                            setItemName('');
                            setIsStock(true);
                          }}
                          style={{
                            padding: "6px 12px",
                            background: "#f3f4f6",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "600",
                            cursor: "pointer",
                            color: "#000"
                          }}
                        >
                          Reset
                        </button>
                        <button
                          onClick={handleCreateItem}
                          disabled={loading}
                          style={{
                            padding: "6px 16px",
                            background: loading ? "#d1d5db" : "linear-gradient(to right, #8b5cf6, #a78bfa)",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "600",
                            cursor: loading ? "not-allowed" : "pointer",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          {loading ? (
                            <>
                              <Loader size={12} style={{ animation: "spin 1s linear infinite" }} />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Save size={12} />
                              Create Item
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'view' && (
            <div>
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: "300px" }}>
                  <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%", padding: "6px 6px 6px 32px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }}
                  />
                </div>

                <select
                  value={filterCompanyId}
                  onChange={(e) => setFilterCompanyId(e.target.value)}
                  style={{ ...s2, maxWidth: "200px" }}
                >
                  <option value="">All Companies</option>
                  {companiesWithPlants.map(c => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => setViewMode('grid')}
                    style={{
                      padding: "6px 10px",
                      background: viewMode === 'grid' ? '#8b5cf6' : 'white',
                      border: "1px solid #e0e0e0",
                      borderRadius: "4px",
                      cursor: "pointer",
                      color: viewMode === 'grid' ? 'white' : '#000'
                    }}
                  >
                    <Grid size={12} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    style={{
                      padding: "6px 10px",
                      background: viewMode === 'list' ? '#8b5cf6' : 'white',
                      border: "1px solid #e0e0e0",
                      borderRadius: "4px",
                      cursor: "pointer",
                      color: viewMode === 'list' ? 'white' : '#000'
                    }}
                  >
                    <List size={12} />
                  </button>
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#000" }}>
                  <Package size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <h3 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#000" }}>No Items Found</h3>
                  <p style={{ fontSize: "10px", color: "#666" }}>
                    {searchTerm ? 'Try adjusting your search' : 'Create the first item'}
                  </p>
                </div>
              ) : (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: viewMode === 'grid' ? "repeat(auto-fill, minmax(300px, 1fr))" : "1fr",
                  gap: "10px" 
                }}>
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        background: "white",
                        border: "1px solid #e0e0e0",
                        borderRadius: "6px",
                        padding: "12px",
                        transition: "all 0.2s",
                        cursor: "pointer"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(139,92,246,0.15)";
                        e.currentTarget.style.borderColor = "#8b5cf6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.borderColor = "#e0e0e0";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: "11px", fontWeight: "700", color: "#000", marginBottom: "3px" }}>
                            {item.item_name}
                          </h4>
                          <p style={{ fontSize: "9px", color: "#666", marginBottom: "6px" }}>
                            Code: {item.item_code}
                          </p>
                        </div>
                        <span style={{
                          padding: "3px 8px",
                          background: item.is_stock ? "#dcfce7" : "#fef3c7",
                          color: item.is_stock ? "#16a34a" : "#ca8a04",
                          borderRadius: "3px",
                          fontSize: "8px",
                          fontWeight: "600"
                        }}>
                          {item.is_stock ? "Stock" : "Non-Stock"}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "8px" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ padding: "3px 6px", background: "#dbeafe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            🏢 {item.company.name} ({item.company.code})
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ padding: "3px 6px", background: "#ede9fe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            💰 GL: {item.gl_account.gl_code} - {item.gl_account.gl_name}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            📊 {item.gl_account.gl_type}
                          </span>
                          {item.gl_account.gl_category && (
                            <span style={{ padding: "3px 6px", background: "#f3e8ff", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                              🏷️ {item.gl_account.gl_category}
                            </span>
                          )}
                        </div>
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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}