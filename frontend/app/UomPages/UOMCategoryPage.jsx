import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, FolderOpen, Save, Check, X, AlertCircle, Loader } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/uom';

const UOMCategoryPage = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data.items || []);
    } catch (err) {
      showError('Error fetching categories: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    } else if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      newErrors.code = 'Code must be uppercase letters, numbers, and underscores only';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
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
    setErrors({});
    
    try {
      const url = editingCategory 
        ? `${API_BASE}/categories/${editingCategory.id}`
        : `${API_BASE}/categories`;
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to save category');
      }
      
      await fetchCategories();
      resetForm();
      setActiveTab('list');
      showSuccess(editingCategory ? 'Category updated successfully!' : 'Category created successfully!');
      
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setFormData({
      code: category.code,
      name: category.name,
      description: category.description || '',
      is_active: category.is_active
    });
    setEditingCategory(category);
    setActiveTab('form');
    setErrors({});
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Are you sure you want to deactivate this category?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/categories/${categoryId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to deactivate category');
      }
      
      await fetchCategories();
      showSuccess('Category deactivated successfully!');
      
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
      description: '',
      is_active: true
    });
    setEditingCategory(null);
    setErrors({});
  };

  const filteredCategories = categories.filter(cat =>
    cat.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "95%", maxWidth: "1200px", height: "90%", maxHeight: "700px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #4b5563, #60a5fa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FolderOpen size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>UOM Categories</h2>
          </div>
          <button
            onClick={() => {
              resetForm();
              setActiveTab('form');
            }}
            style={{ padding: "2px 10px", background: "rgba(255, 255, 255, 0.2)", border: "1px solid rgba(255, 255, 255, 0.3)", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <Plus size={12} />
            Add Category
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
            style={{ flex: 1, padding: "6px 12px", fontSize: "10px", fontWeight: "600", cursor: "pointer", border: "none", background: activeTab === 'list' ? 'white' : 'transparent', color: activeTab === 'list' ? '#3b82f6' : '#000', borderBottom: activeTab === 'list' ? '2px solid #3b82f6' : 'none' }}
          >
            Category List ({filteredCategories.length})
          </button>
          <button
            onClick={() => setActiveTab('form')}
            style={{ flex: 1, padding: "6px 12px", fontSize: "10px", fontWeight: "600", cursor: "pointer", border: "none", background: activeTab === 'form' ? 'white' : 'transparent', color: activeTab === 'form' ? '#3b82f6' : '#000', borderBottom: activeTab === 'form' ? '2px solid #3b82f6' : 'none' }}
          >
            {editingCategory ? 'Edit Category' : 'Add Category'}
          </button>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {activeTab === 'list' && (
            <div>
              {/* Search Bar */}
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <Search style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#999" }} size={14} />
                  <input
                    type="text"
                    placeholder="Search by code or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%", paddingLeft: "32px", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }}
                  />
                </div>
                <div style={{ padding: "6px 12px", background: "#dbeafe", color: "#000", borderRadius: "4px", fontSize: "10px", fontWeight: "600" }}>
                  Total: {filteredCategories.length}
                </div>
              </div>

              {/* Categories List */}
              {loading ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <Loader style={{ animation: "spin 1s linear infinite", color: "#3b82f6", margin: "0 auto" }} size={32} />
                </div>
              ) : filteredCategories.length === 0 ? (
                <div style={{ textAlign: "center", paddingTop: "60px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "8px" }}>📁</div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>No categories found</div>
                  <div style={{ fontSize: "10px", color: "#666", marginBottom: "12px" }}>
                    {searchTerm ? 'Try adjusting your search' : 'Click "Add Category" to create your first category'}
                  </div>
                  {!searchTerm && (
                    <button
                      onClick={() => {
                        resetForm();
                        setActiveTab('form');
                      }}
                      style={{ padding: "6px 12px", background: "#3b82f6", color: "white", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <Plus size={14} />
                      Create First Category
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "10px" }}>
                  {filteredCategories.map((category) => (
                    <div
                      key={category.id}
                      style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "10px", transition: "all 0.2s" }}
                    >
                      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <div style={{ padding: "2px 8px", background: "#dbeafe", color: "#000", borderRadius: "4px", fontSize: "9px", fontWeight: "700" }}>
                            {category.code}
                          </div>
                          {category.is_active ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", padding: "2px 6px", background: "#dcfce7", color: "#000", borderRadius: "10px", fontSize: "8px", fontWeight: "600" }}>
                              <Check size={8} />
                              Active
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", padding: "2px 6px", background: "#fee2e2", color: "#000", borderRadius: "10px", fontSize: "8px", fontWeight: "600" }}>
                              <X size={8} />
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#000", marginBottom: "4px" }}>{category.name}</div>
                      <div style={{ fontSize: "9px", color: "#666", marginBottom: "8px", lineHeight: "1.3", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {category.description || 'No description provided'}
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingTop: "8px", borderTop: "1px solid #f0f0f0" }}>
                        <button
                          onClick={() => handleEdit(category)}
                          style={{ flex: 1, padding: "4px 8px", background: "#dbeafe", color: "#000", border: "none", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", fontSize: "9px", fontWeight: "600" }}
                        >
                          <Edit2 size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          style={{ flex: 1, padding: "4px 8px", background: "#fee2e2", color: "#000", border: "none", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", fontSize: "9px", fontWeight: "600" }}
                        >
                          <Trash2 size={12} />
                          Deactivate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'form' && (
            <div style={{ maxWidth: "600px", margin: "0 auto" }}>
              <div style={{ background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: "6px", padding: "10px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "start", gap: "8px" }}>
                  <AlertCircle size={14} style={{ color: "#000", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>Category Guidelines</div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "9px", color: "#000", lineHeight: "1.5" }}>
                      <li>Code must be UPPERCASE (e.g., WEIGHT, VOLUME)</li>
                      <li>Each category groups related units of measurement</li>
                      <li>Examples: WEIGHT (kg, g, ton), LENGTH (m, cm, km)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Code Field */}
                <div>
                  <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                    Category Code <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., WEIGHT, LENGTH, VOLUME"
                    disabled={editingCategory !== null}
                    style={{ width: "100%", padding: "6px 8px", border: errors.code ? "1px solid #ef4444" : "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", background: editingCategory ? "#f0f0f0" : "white", color: "#000" }}
                  />
                  {errors.code && (
                    <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#ef4444", display: "flex", alignItems: "center", gap: "2px" }}>
                      <AlertCircle size={10} />
                      {errors.code}
                    </p>
                  )}
                </div>

                {/* Name Field */}
                <div>
                  <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                    Category Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Weight, Length, Volume"
                    style={{ width: "100%", padding: "6px 8px", border: errors.name ? "1px solid #ef4444" : "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }}
                  />
                  {errors.name && (
                    <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#ef4444", display: "flex", alignItems: "center", gap: "2px" }}>
                      <AlertCircle size={10} />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Description Field */}
                <div>
                  <label style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief description of this category..."
                    rows="4"
                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000", resize: "none" }}
                  />
                </div>

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
                  <span style={{ marginLeft: "auto", fontSize: "9px", color: "#000" }}>
                    {formData.is_active ? 'Category will be active' : 'Category will be inactive'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "8px", paddingTop: "8px" }}>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{ flex: 1, padding: "8px 12px", background: "linear-gradient(to right, #3b82f6, #60a5fa)", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "600", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", opacity: loading ? 0.5 : 1 }}
                  >
                    {loading ? (
                      <>
                        <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        {editingCategory ? 'Update Category' : 'Create Category'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab('list');
                    }}
                    style={{ padding: "8px 12px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "4px", fontSize: "10px", fontWeight: "600", cursor: "pointer", color: "#000" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0px 12px", height: "16px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #60a5fa, #4b5563)", flexShrink: 0 }}></div>
      </div>
    </div>
  );
};

export default UOMCategoryPage;