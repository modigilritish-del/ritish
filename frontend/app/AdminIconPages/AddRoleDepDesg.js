"use client";
import { useState, useEffect, useRef } from "react";
import { Users, Save, X, Search, Plus } from "lucide-react";

export default function AddRoleDepDesg({ embeddedMode = false }) {
  const [formData, setFormData] = useState({
    company_id: "",
    role_name: "",
    department_name: "",
    designation_name: "",
  });

  const [companies, setCompanies] = useState([]);
  const [searchResults, setSearchResults] = useState({
    roles: [],
    departments: [],
    designations: [],
  });

  const [showDropdown, setShowDropdown] = useState({
    role: false,
    department: false,
    designation: false,
  });

  const [selectedFields, setSelectedFields] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const searchTimers = useRef({});

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/companies");
      const data = await response.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to load companies");
    }
  };

  const autoCapitalize = (text) => {
    if (!text) return "";
    
    // Remove multiple consecutive spaces and trim
    let cleaned = text.replace(/\s+/g, ' ');
    
    // Capitalize first letter of each word
    return cleaned.split(' ').map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  };

  const liveSearch = async (field, query) => {
    if (!query || query.length < 1) {
      setSearchResults(prev => ({ ...prev, [field + 's']: [] }));
      return;
    }

    if (searchTimers.current[field]) {
      clearTimeout(searchTimers.current[field]);
    }

    searchTimers.current[field] = setTimeout(async () => {
      try {
        let url = "";
        
        if (field === 'role') {
          url = `http://localhost:8000/api/roles?q=${encodeURIComponent(query)}`;
        } else if (field === 'department') {
          url = `http://localhost:8000/api/departments?q=${encodeURIComponent(query)}`;
        } else if (field === 'designation') {
          url = `http://localhost:8000/api/designations?q=${encodeURIComponent(query)}`;
        }
        
        const data = await fetch(url).then(r => r.json());
        setSearchResults(prev => ({ ...prev, [field + 's']: data }));
      } catch (err) {
        console.error(`Error searching ${field}:`, err);
      }
    }, 300);
  };

  const selectFromDropdown = (field, item) => {
    if (field === 'role') {
      setFormData(prev => ({ ...prev, role_name: item.role_name }));
      if (selectedFields.length === 3 && currentStep === 0) {
        setTimeout(() => setCurrentStep(1), 200);
      }
    } else if (field === 'department') {
      setFormData(prev => ({ ...prev, department_name: item.department_name }));
      if (selectedFields.length === 3 && currentStep === 1) {
        setTimeout(() => setCurrentStep(2), 200);
      }
    } else if (field === 'designation') {
      setFormData(prev => ({ ...prev, designation_name: item.designation_name }));
    }
    
    setShowDropdown(prev => ({ ...prev, [field]: false }));
  };

  const handleFieldChange = (e, field) => {
    let value = e.target.value;
    
    // Prevent multiple consecutive spaces - allow only single space
    value = value.replace(/\s{2,}/g, ' ');
    
    // Auto-capitalize each word as user types
    const words = value.split(' ');
    const capitalizedWords = words.map((word, index) => {
      // Only capitalize if word has changed or if it's a complete word (followed by space)
      if (index < words.length - 1 || value.endsWith(' ')) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      // For the current word being typed (last word without trailing space)
      if (word.length > 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word;
    });
    
    value = capitalizedWords.join(' ');
    
    if (field === 'role') {
      setFormData(prev => ({ ...prev, role_name: value }));
      if (value.length > 0) {
        liveSearch('role', value);
        setShowDropdown(prev => ({ ...prev, role: true }));
      } else {
        setShowDropdown(prev => ({ ...prev, role: false }));
      }
    } else if (field === 'department') {
      setFormData(prev => ({ ...prev, department_name: value }));
      if (value.length > 0) {
        liveSearch('department', value);
        setShowDropdown(prev => ({ ...prev, department: true }));
      } else {
        setShowDropdown(prev => ({ ...prev, department: false }));
      }
    } else if (field === 'designation') {
      setFormData(prev => ({ ...prev, designation_name: value }));
      if (value.length > 0) {
        liveSearch('designation', value);
        setShowDropdown(prev => ({ ...prev, designation: true }));
      } else {
        setShowDropdown(prev => ({ ...prev, designation: false }));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError("");
  };

  const handleFieldSelection = (field) => {
    if (field === 'all') {
      setSelectedFields(['role', 'department', 'designation']);
      setCurrentStep(0);
      setFormData(prev => ({
        ...prev,
        role_name: '',
        department_name: '',
        designation_name: ''
      }));
    } else {
      setSelectedFields([field]);
      setCurrentStep(0);
      setFormData(prev => ({
        ...prev,
        role_name: field === 'role' ? prev.role_name : '',
        department_name: field === 'department' ? prev.department_name : '',
        designation_name: field === 'designation' ? prev.designation_name : ''
      }));
    }
  };

  const handleNextStep = () => {
    if (selectedFields.length === 3) {
      if (currentStep === 0 && formData.role_name.trim()) {
        setCurrentStep(1);
      } else if (currentStep === 1 && formData.department_name.trim()) {
        setCurrentStep(2);
      }
    }
  };

  const handlePreviousStep = () => {
    if (selectedFields.length === 3) {
      if (currentStep === 2) {
        setCurrentStep(1);
      } else if (currentStep === 1) {
        setCurrentStep(0);
      }
    }
  };

  const handleReset = () => {
    setFormData({
      company_id: "",
      role_name: "",
      department_name: "",
      designation_name: "",
    });
    setSelectedFields([]);
    setCurrentStep(0);
    setError("");
    setSuccess("");
    setSearchResults({
      roles: [],
      departments: [],
      designations: [],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.company_id) {
      setError("Please select a company");
      return;
    }

    if (selectedFields.length === 0) {
      setError("Please select which fields to create");
      return;
    }

    const hasRole = selectedFields.includes('role');
    const hasDept = selectedFields.includes('department');
    const hasDesg = selectedFields.includes('designation');

    if ((hasRole && !formData.role_name.trim()) || 
        (hasDept && !formData.department_name.trim()) || 
        (hasDesg && !formData.designation_name.trim())) {
      setError("Please fill in all selected fields");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const params = new URLSearchParams();
      params.append('company_id', String(formData.company_id));
      
      // Auto-capitalize before sending to API
      if (hasRole) params.append('role_name', autoCapitalize(formData.role_name.trim()));
      if (hasDept) params.append('department_name', autoCapitalize(formData.department_name.trim()));
      if (hasDesg) params.append('designation_name', autoCapitalize(formData.designation_name.trim()));

      const response = await fetch("http://localhost:8000/api/role-access", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
        let errorMessage = "Failed to create role access";
        
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' ? errorData.detail : 
            Array.isArray(errorData.detail) ? errorData.detail.map(err => `${err.loc?.join('.') || 'Field'}: ${err.msg}`).join(', ') : errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      let successMsg = `✅ Successfully created for ${result.company_name}!`;
      if (result.created_items) {
        successMsg += `\n📝 Created: ${result.created_items.join(', ')}`;
      } else {
        successMsg += `\n📝 Role: ${result.role_name}\n🏢 Department: ${result.department_name}\n👤 Designation: ${result.designation_name}`;
      }
      
      setSuccess(successMsg);
      
      setTimeout(() => {
        handleReset();
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError(err.message || "Error creating role access");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "5px 8px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "11px",
    boxSizing: "border-box",
    color: "#333",
    backgroundColor: "#fff",
  };

  const selectStyle = {
    width: "100%",
    padding: "5px 8px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "11px",
    boxSizing: "border-box",
    color: "#333",
    backgroundColor: "#fff",
    cursor: "pointer",
  };

  const labelStyle = {
    display: "block",
    fontSize: "10px",
    fontWeight: "500",
    marginBottom: "3px",
    color: "#555",
  };

  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    maxHeight: "200px",
    overflowY: "auto",
    backgroundColor: "white",
    border: "1px solid #ddd",
    borderTop: "none",
    borderRadius: "0 0 4px 4px",
    zIndex: 1000,
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    marginTop: "1px",
  };

  const dropdownItemStyle = {
    padding: "8px 10px",
    fontSize: "11px",
    cursor: "pointer",
    borderBottom: "1px solid #f0f0f0",
    color: "#333",
    backgroundColor: "white",
    transition: "background-color 0.2s",
  };

  const buttonStyle = (isSelected) => ({
    padding: "6px 14px",
    border: isSelected ? "2px solid #8b5cf6" : "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: "500",
    cursor: "pointer",
    backgroundColor: isSelected ? "#f3e8ff" : "#fff",
    color: isSelected ? "#6b21a8" : "#333",
    transition: "all 0.2s",
  });

  const isFieldEnabled = (field) => {
    if (selectedFields.length === 3) {
      if (field === 'role') return currentStep >= 0;
      if (field === 'department') return currentStep >= 1;
      if (field === 'designation') return currentStep >= 2;
    } else {
      return selectedFields.includes(field);
    }
    return false;
  };

  const isFieldActive = (field) => {
    if (selectedFields.length === 3) {
      if (field === 'role') return currentStep === 0;
      if (field === 'department') return currentStep === 1;
      if (field === 'designation') return currentStep === 2;
    }
    return selectedFields.includes(field);
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", ...(embeddedMode ? {} : { margin: "20px", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }) }}>

        {/* Header — hidden in embeddedMode */}
        {!embeddedMode && (
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #4b5563, #60a5fa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>Add Role, Department & Designation</h2>
          </div>
          {selectedFields.length === 3 && (
            <div style={{ fontSize: "10px", fontWeight: "500", padding: "2px 8px", background: "rgba(255,255,255,0.2)", borderRadius: "4px" }}>
              Step {currentStep + 1} of 3
            </div>
          )}
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
            <div style={{ padding: "10px 12px", background: "#efe", color: "#080", borderRadius: "4px", marginBottom: "10px", fontSize: "10px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>✅</span>
              <div style={{ fontWeight: "600", whiteSpace: "pre-line" }}>{success}</div>
            </div>
          )}

          <div style={{ marginBottom: "12px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px", color: "#333", borderBottom: "2px solid #60a5fa", paddingBottom: "4px" }}>
              Select Company
            </h3>
            <div>
              <label style={labelStyle}>Company <span style={{ color: "#c00" }}>*</span></label>
              <select 
                name="company_id" 
                value={formData.company_id} 
                onChange={handleChange} 
                required 
                style={selectStyle}
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.company_name} ({company.company_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.company_id && (
            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px", color: "#333", borderBottom: "2px solid #60a5fa", paddingBottom: "4px" }}>
                Select Fields to Create
              </h3>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button 
                  type="button"
                  onClick={() => handleFieldSelection('all')}
                  style={buttonStyle(selectedFields.length === 3)}
                >
                  All (Role → Department → Designation)
                </button>
                <button 
                  type="button"
                  onClick={() => handleFieldSelection('role')}
                  style={buttonStyle(selectedFields.length === 1 && selectedFields.includes('role'))}
                >
                  Role Only
                </button>
                <button 
                  type="button"
                  onClick={() => handleFieldSelection('department')}
                  style={buttonStyle(selectedFields.length === 1 && selectedFields.includes('department'))}
                >
                  Department Only
                </button>
                <button 
                  type="button"
                  onClick={() => handleFieldSelection('designation')}
                  style={buttonStyle(selectedFields.length === 1 && selectedFields.includes('designation'))}
                >
                  Designation Only
                </button>
              </div>
            </div>
          )}

          {selectedFields.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px", color: "#333", borderBottom: "2px solid #60a5fa", paddingBottom: "4px" }}>
                Enter Details (Auto-capitalizes & Single Space Only)
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                
                <div style={{ position: "relative", opacity: isFieldEnabled('role') ? 1 : 0.5 }}>
                  <label style={{...labelStyle, display: "flex", alignItems: "center", gap: "4px"}}>
                    {isFieldActive('role') && <span style={{color: "#10b981", fontSize: "14px"}}>👉</span>}
                    Role {isFieldEnabled('role') && <span style={{ color: "#c00" }}>*</span>}
                    {selectedFields.length === 3 && currentStep > 0 && formData.role_name && (
                      <span style={{color: "#10b981", fontSize: "14px"}}>✓</span>
                    )}
                  </label>
                  <input 
                    value={formData.role_name} 
                    onChange={(e) => handleFieldChange(e, 'role')}
                    onFocus={() => {
                      if (formData.role_name) liveSearch('role', formData.role_name);
                    }}
                    onBlur={() => setTimeout(() => setShowDropdown(prev => ({ ...prev, role: false })), 200)}
                    placeholder="Type role name" 
                    required 
                    style={{
                      ...inputStyle, 
                      backgroundColor: isFieldEnabled('role') ? (isFieldActive('role') ? '#fff' : '#f0f9ff') : '#f5f5f5',
                      border: isFieldActive('role') ? '2px solid #60a5fa' : '1px solid #ddd'
                    }}
                    disabled={!isFieldEnabled('role')}
                  />
                  {showDropdown.role && searchResults.roles.length > 0 && isFieldEnabled('role') && (
                    <div style={dropdownStyle}>
                      {searchResults.roles.map((item) => (
                        <div 
                          key={item.id} 
                          style={dropdownItemStyle}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f9ff'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                          onMouseDown={() => selectFromDropdown('role', item)}
                        >
                          {item.role_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div style={{ position: "relative", opacity: isFieldEnabled('department') ? 1 : 0.5 }}>
                  <label style={{...labelStyle, display: "flex", alignItems: "center", gap: "4px"}}>
                    {isFieldActive('department') && <span style={{color: "#10b981", fontSize: "14px"}}>👉</span>}
                    Department {isFieldEnabled('department') && <span style={{ color: "#c00" }}>*</span>}
                    {selectedFields.length === 3 && currentStep > 1 && formData.department_name && (
                      <span style={{color: "#10b981", fontSize: "14px"}}>✓</span>
                    )}
                  </label>
                  <input 
                    value={formData.department_name} 
                    onChange={(e) => handleFieldChange(e, 'department')}
                    onFocus={() => {
                      if (formData.department_name) liveSearch('department', formData.department_name);
                    }}
                    onBlur={() => setTimeout(() => setShowDropdown(prev => ({ ...prev, department: false })), 200)}
                    placeholder="Type department name" 
                    required 
                    style={{
                      ...inputStyle, 
                      backgroundColor: isFieldEnabled('department') ? (isFieldActive('department') ? '#fff' : '#f0f9ff') : '#f5f5f5',
                      border: isFieldActive('department') ? '2px solid #60a5fa' : '1px solid #ddd'
                    }}
                    disabled={!isFieldEnabled('department')}
                  />
                  {showDropdown.department && searchResults.departments.length > 0 && isFieldEnabled('department') && (
                    <div style={dropdownStyle}>
                      {searchResults.departments.map((item) => (
                        <div 
                          key={item.id} 
                          style={dropdownItemStyle}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f9ff'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                          onMouseDown={() => selectFromDropdown('department', item)}
                        >
                          {item.department_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div style={{ position: "relative", opacity: isFieldEnabled('designation') ? 1 : 0.5 }}>
                  <label style={{...labelStyle, display: "flex", alignItems: "center", gap: "4px"}}>
                    {isFieldActive('designation') && <span style={{color: "#10b981", fontSize: "14px"}}>👉</span>}
                    Designation {isFieldEnabled('designation') && <span style={{ color: "#c00" }}>*</span>}
                    {formData.designation_name && (
                      <span style={{color: "#10b981", fontSize: "14px"}}>✓</span>
                    )}
                  </label>
                  <input 
                    value={formData.designation_name} 
                    onChange={(e) => handleFieldChange(e, 'designation')}
                    onFocus={() => {
                      if (formData.designation_name) liveSearch('designation', formData.designation_name);
                    }}
                    onBlur={() => setTimeout(() => setShowDropdown(prev => ({ ...prev, designation: false })), 200)}
                    placeholder="Type designation name" 
                    required 
                    style={{
                      ...inputStyle, 
                      backgroundColor: isFieldEnabled('designation') ? (isFieldActive('designation') ? '#fff' : '#f0f9ff') : '#f5f5f5',
                      border: isFieldActive('designation') ? '2px solid #60a5fa' : '1px solid #ddd'
                    }}
                    disabled={!isFieldEnabled('designation')}
                  />
                  {showDropdown.designation && searchResults.designations.length > 0 && isFieldEnabled('designation') && (
                    <div style={dropdownStyle}>
                      {searchResults.designations.map((item) => (
                        <div 
                          key={item.id} 
                          style={dropdownItemStyle}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f9ff'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                          onMouseDown={() => selectFromDropdown('designation', item)}
                        >
                          {item.designation_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedFields.length === 3 && (
                <div style={{ display: "flex", gap: "10px", marginTop: "12px", justifyContent: "center" }}>
                  {currentStep > 0 && (
                    <button
                      type="button"
                      onClick={handlePreviousStep}
                      style={{
                        padding: "6px 16px",
                        background: "#fff",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: "500",
                        cursor: "pointer",
                        color: "#333",
                      }}
                    >
                      ← Previous
                    </button>
                  )}
                  {currentStep < 2 && (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={
                        (currentStep === 0 && !formData.role_name.trim()) ||
                        (currentStep === 1 && !formData.department_name.trim())
                      }
                      style={{
                        padding: "6px 16px",
                        background: 
                          (currentStep === 0 && !formData.role_name.trim()) ||
                          (currentStep === 1 && !formData.department_name.trim())
                            ? "#ccc"
                            : "#60a5fa",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: "500",
                        cursor: 
                          (currentStep === 0 && !formData.role_name.trim()) ||
                          (currentStep === 1 && !formData.department_name.trim())
                            ? "not-allowed"
                            : "pointer",
                        color: "white",
                      }}
                    >
                      Next →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedFields.length > 0 && (
            <div style={{ padding: "10px 12px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "6px", fontSize: "10px", color: "#0369a1" }}>
              <strong>💡 How it works:</strong> 
              {selectedFields.length === 3 
                ? " Fill fields step by step. Text auto-capitalizes and only single spaces allowed!"
                : " Type to search or enter new. Text auto-capitalizes and only single spaces allowed!"
              }
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "0px 12px", height: "32px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #4b5563, #60a5fa)", flexShrink: 0, alignItems: "center" }}>
          <button 
            type="button" 
            onClick={handleReset} 
            disabled={loading} 
            style={{ padding: "4px 14px", background: loading ? "#ccc" : "rgba(255, 255, 255, 0.2)", border: "1px solid rgba(255, 255, 255, 0.3)", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: loading ? "not-allowed" : "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <X size={12} />
            Reset
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={loading} 
            style={{ padding: "4px 18px", background: loading ? "#ccc" : "rgba(255, 255, 255, 0.3)", border: "1px solid rgba(255, 255, 255, 0.4)", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: loading ? "not-allowed" : "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <Save size={12} />
            {loading ? "Creating..." : "Create Access"}
          </button>
        </div>

        {/* Footer — hidden in embeddedMode */}
        {!embeddedMode && (
        <div style={{ padding: "0px 12px", height: "16px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #60a5fa, #4b5563)", flexShrink: 0 }}></div>
        )}
      </div>
    </div>
  );
}