"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Save, Building2 } from "lucide-react";

export default function AddCompanyType({ embeddedMode = false }) {
  const [companyTypes, setCompanyTypes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchCompanyTypes();
  }, []);

  const fetchCompanyTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("http://localhost:8000/api/company-types");
      if (!response.ok) {
        throw new Error("Failed to load company types. Please check backend connection.");
      }
      const data = await response.json();
      setCompanyTypes(data);
    } catch (err) {
      setError(err.message);
      setCompanyTypes([]);
    } finally {
      setLoading(false);
    }
  };

  // Capitalize first letter of each word
  const capitalizeWords = (text) => {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Auto-generate type_code from type_name
  const generateTypeCode = (typeName) => {
    // Generate base code from name (max 6 characters)
    const baseCode = typeName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6);
    
    // Generate random 3-digit number
    const randomNum = Math.floor(100 + Math.random() * 900); // 100-999
    
    // Format: XXXXXX-999 (6 chars + dash + 3 digits = 10 chars max)
    return `${baseCode}-${randomNum}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.type_name.trim()) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      
      // Auto-generate type_code
      const type_code = generateTypeCode(formData.type_name);
      
      const url = editingId 
        ? `http://localhost:8000/api/company-types/${editingId}`
        : "http://localhost:8000/api/company-types";
      
      const method = editingId ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type_name: formData.type_name,
          type_code: type_code
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save company type");
      }

      setSuccess(editingId ? "Company type updated successfully!" : "Company type created successfully!");
      await fetchCompanyTypes();
      
      setTimeout(() => {
        resetForm();
        setSuccess("");
      }, 1500);
      
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type) => {
    setFormData({
      type_name: type.type_name,
    });
    setEditingId(type.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this company type?")) return;

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/company-types/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete company type");

      setSuccess("Company type deleted successfully!");
      await fetchCompanyTypes();
      setTimeout(() => setSuccess(""), 1500);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ type_name: "" });
    setEditingId(null);
    setShowAddForm(false);
  };

  const inputStyle = {
    width: "100%",
    padding: "4px 8px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "11px",
    boxSizing: "border-box",
    color: "#333",
    backgroundColor: "#fff",
  };

  const labelStyle = {
    display: "block",
    fontSize: "10px",
    fontWeight: "500",
    marginBottom: "3px",
    color: "#555",
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", ...(embeddedMode ? {} : { margin: "20px", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }) }}>
        {/* Header — hidden in embeddedMode */}
        {!embeddedMode && (
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #4b5563, #60a5fa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Building2 size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>Company Types Management</h2>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding: "4px 14px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}>
            {showAddForm ? <X size={12} /> : <Plus size={12} />}{showAddForm ? "Cancel" : "Add Type"}
          </button>
        </div>
        )}
        {embeddedMode && (
        <div style={{ padding: "4px 8px", background: "#f8faff", borderBottom: "1px solid #e0e7ff", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding: "4px 14px", background: showAddForm ? "#f0f0f0" : "linear-gradient(to right, #4b5563, #60a5fa)", border: showAddForm ? "1px solid #ddd" : "none", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: showAddForm ? "#333" : "white", display: "flex", alignItems: "center", gap: "4px" }}>
            {showAddForm ? <X size={12} /> : <Plus size={12} />}{showAddForm ? "Cancel" : "Add Type"}
          </button>
        </div>
        )}

        {/* Content - Scrollable */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {error && (
            <div style={{ padding: "10px 12px", background: "#fee", color: "#c00", borderRadius: "4px", marginBottom: "10px", fontSize: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>⚠️</span>
              <div>
                <div style={{ fontWeight: "600", marginBottom: "2px" }}>Error</div>
                <div>{error}</div>
              </div>
            </div>
          )}
          {success && (
            <div style={{ padding: "10px 12px", background: "#efe", color: "#080", borderRadius: "4px", marginBottom: "10px", fontSize: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>✅</span>
              <div style={{ fontWeight: "600" }}>{success}</div>
            </div>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <div style={{ marginBottom: "10px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
                {editingId ? "Edit Company Type" : "Add New Company Type"}
              </h3>
              <div>
                <div style={{ marginBottom: "8px" }}>
                  <label style={labelStyle}>
                    Type Name <span style={{ color: "#c00" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.type_name}
                    onChange={(e) => setFormData({ type_name: capitalizeWords(e.target.value) })}
                    placeholder="e.g., Private Limited"
                    required
                    style={inputStyle}
                  />
                  <div style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>
                    Type code will be auto-generated from the name
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                      padding: "4px 14px",
                      background: loading ? "#ccc" : "rgba(75, 85, 99, 0.9)",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: "500",
                      cursor: loading ? "not-allowed" : "pointer",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Save size={12} />
                    {loading ? "Saving..." : (editingId ? "Update" : "Save")}
                  </button>
                  <button
                    onClick={resetForm}
                    style={{
                      padding: "4px 14px",
                      background: "#f0f0f0",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: "500",
                      cursor: "pointer",
                      color: "#333",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Company Types List */}
          <div style={{ marginBottom: "10px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Company Types List</span>
              <span style={{ fontSize: "9px", fontWeight: "400", color: "#0066cc", background: "linear-gradient(135deg, #e0f2fe 0%, #dcfce7 100%)", padding: "2px 8px", borderRadius: "10px" }}>Total Types: {companyTypes.length}</span>
            </h3>
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
              {loading && companyTypes.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "11px", color: "#666" }}>
                  <div style={{ marginBottom: "10px", fontSize: "36px" }}>⏳</div>
                  <div style={{ fontWeight: "500" }}>Loading company types...</div>
                  <div style={{ fontSize: "9px", marginTop: "4px", color: "#999" }}>Please wait</div>
                </div>
              ) : companyTypes.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "11px", color: "#666" }}>
                  <div style={{ marginBottom: "10px", fontSize: "48px" }}>📋</div>
                  <div style={{ fontWeight: "500", marginBottom: "4px" }}>No company types found</div>
                  <div style={{ fontSize: "9px", color: "#999" }}>Click "Add Type" button to create your first company type</div>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fa" }}>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>ID</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Type Name</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Type Code</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Created At</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyTypes.map((type, index) => (
                      <tr key={type.id} style={{ borderBottom: index < companyTypes.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                        <td style={{ padding: "6px 8px", color: "#666" }}>{type.id}</td>
                        <td style={{ padding: "6px 8px", color: "#333", fontWeight: "500" }}>{type.type_name}</td>
                        <td style={{ padding: "6px 8px" }}>
                          <span style={{ padding: "2px 6px", background: "#e3f2fd", color: "#0066cc", borderRadius: "3px", fontSize: "9px", fontWeight: "600" }}>
                            {type.type_code}
                          </span>
                        </td>
                        <td style={{ padding: "6px 8px", color: "#666" }}>{new Date(type.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: "6px 8px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                            <button
                              onClick={() => handleEdit(type)}
                              style={{
                                padding: "3px 8px",
                                background: "#fff",
                                border: "1px solid #0066cc",
                                borderRadius: "3px",
                                cursor: "pointer",
                                color: "#0066cc",
                                fontSize: "9px",
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                            >
                              <Edit2 size={10} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(type.id)}
                              style={{
                                padding: "3px 8px",
                                background: "#fff",
                                border: "1px solid #dc3545",
                                borderRadius: "3px",
                                cursor: "pointer",
                                color: "#dc3545",
                                fontSize: "9px",
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                            >
                              <Trash2 size={10} />
                              Delete
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