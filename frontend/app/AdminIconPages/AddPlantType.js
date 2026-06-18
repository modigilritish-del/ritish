"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Save, Factory } from "lucide-react";

export default function AddPlantType({ embeddedMode = false }) {
  const [plantTypes, setPlantTypes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type_name: "",
    type_code: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchPlantTypes();
  }, []);

  // Real-time code generation when type name changes
  useEffect(() => {
    const generateCode = async () => {
      if (formData.type_name.trim()) {
        try {
          const response = await fetch(
            `http://localhost:8000/api/generate-plant-type-code?type_name=${encodeURIComponent(formData.type_name)}`,
            { method: "POST" }
          );
          if (response.ok) {
            const data = await response.json();
            setFormData(prev => ({ ...prev, type_code: data.type_code }));
          }
        } catch (err) {
          console.error("Failed to generate code:", err);
        }
      } else {
        setFormData(prev => ({ ...prev, type_code: "" }));
      }
    };

    const debounceTimer = setTimeout(generateCode, 300);
    return () => clearTimeout(debounceTimer);
  }, [formData.type_name]);

  const fetchPlantTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("http://localhost:8000/api/plant-types");
      if (!response.ok) {
        throw new Error("Failed to load plant types. Please check backend connection.");
      }
      const data = await response.json();
      setPlantTypes(data);
    } catch (err) {
      setError(err.message);
      setPlantTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const capitalizeWords = (text) => {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.type_name.trim()) {
      setError("Please fill in the Type Name field");
      return;
    }

    if (!formData.description.trim()) {
      setError("Please fill in the Description field");
      return;
    }

    try {
      setLoading(true);
      
      const url = editingId 
        ? `http://localhost:8000/api/plant-types/${editingId}`
        : "http://localhost:8000/api/plant-types";
      
      const method = editingId ? "PUT" : "POST";
      
      const submitData = {
        type_name: formData.type_name,
        type_code: formData.type_code,
        description: formData.description
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save plant type");
      }

      const result = await response.json();
      
      setSuccess(
        editingId 
          ? `Plant type updated successfully! Code: ${result.type_code}` 
          : `Plant type created successfully! Code: ${result.type_code}`
      );
      
      await fetchPlantTypes();
      
      setTimeout(() => {
        resetForm();
        setSuccess("");
      }, 3000);
      
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
      type_code: type.type_code,
      description: type.description || "",
    });
    setEditingId(type.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this plant type?")) return;

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/plant-types/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete plant type");

      setSuccess("Plant type deleted successfully!");
      await fetchPlantTypes();
      setTimeout(() => setSuccess(""), 1500);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ type_name: "", type_code: "", description: "" });
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

  const codeDisplayStyle = {
    ...inputStyle,
    backgroundColor: "#f0f9ff",
    border: "1px solid #0066cc",
    color: "#0066cc",
    fontWeight: "600",
    fontFamily: "monospace",
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
            <Factory size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>{title}</h2>
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
                {editingId ? "Edit Plant Type" : "Add New Plant Type"}
              </h3>
              <div>
                <div style={{ marginBottom: "8px" }}>
                  <label style={labelStyle}>
                    Type Name <span style={{ color: "#c00" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.type_name}
                    onChange={(e) => setFormData({ ...formData, type_name: capitalizeWords(e.target.value) })}
                    placeholder="e.g., Manufacturing Plant"
                    required
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <label style={labelStyle}>
                    Type Code <span style={{ color: "#0066cc", fontSize: "9px" }}>(Auto-Generated)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.type_code}
                    placeholder="Type a name to see generated code..."
                    readOnly
                    style={codeDisplayStyle}
                  />
                  {formData.type_code && (
                    <div style={{ fontSize: "9px", color: "#0066cc", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>✓</span>
                      <span>Code generated successfully</span>
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <label style={labelStyle}>
                    Description <span style={{ color: "#c00" }}>*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter plant type description"
                    required
                    rows={3}
                    style={{...inputStyle, resize: "vertical"}}
                  />
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

          {/* Plant Types List */}
          <div style={{ marginBottom: "10px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Plant Types List</span>
              <span style={{ fontSize: "9px", fontWeight: "400", color: "#0066cc", background: "linear-gradient(135deg, #e0f2fe 0%, #dcfce7 100%)", padding: "2px 8px", borderRadius: "10px" }}>Total Types: {plantTypes.length}</span>
            </h3>
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
              {loading && plantTypes.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "11px", color: "#666" }}>
                  <div style={{ marginBottom: "10px", fontSize: "36px" }}>⏳</div>
                  <div style={{ fontWeight: "500" }}>Loading plant types...</div>
                  <div style={{ fontSize: "9px", marginTop: "4px", color: "#999" }}>Please wait</div>
                </div>
              ) : plantTypes.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "11px", color: "#666" }}>
                  <div style={{ marginBottom: "10px", fontSize: "48px" }}>🏭</div>
                  <div style={{ fontWeight: "500", marginBottom: "4px" }}>No plant types found</div>
                  <div style={{ fontSize: "9px", color: "#999" }}>Click "Add Type" button to create your first plant type</div>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fa" }}>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>ID</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Type Name</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Type Code</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Description</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Created At</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plantTypes.map((type, index) => (
                      <tr key={type.id} style={{ borderBottom: index < plantTypes.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                        <td style={{ padding: "6px 8px", color: "#666" }}>{type.id}</td>
                        <td style={{ padding: "6px 8px", color: "#333", fontWeight: "500" }}>{type.type_name}</td>
                        <td style={{ padding: "6px 8px" }}>
                          <span style={{ padding: "2px 6px", background: "#e3f2fd", color: "#0066cc", borderRadius: "3px", fontSize: "9px", fontWeight: "600", fontFamily: "monospace" }}>
                            {type.type_code}
                          </span>
                        </td>
                        <td style={{ padding: "6px 8px", color: "#666", fontSize: "9px" }}>{type.description || "-"}</td>
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