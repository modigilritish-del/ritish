import { useState, useEffect, useRef } from "react";
import { Plus, X, Save, Factory, Building2, MapPin, Mail, Phone, AlertTriangle, Trash2 } from "lucide-react";

export default function AddPlant({ embeddedMode = false }) {
  const [companies, setCompanies] = useState([]);
  const [plantTypes, setPlantTypes] = useState([]);
  const [plants, setPlants] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [useCompanyLocation, setUseCompanyLocation] = useState(true);

  // Email/Phone arrays
  const [emails, setEmails] = useState([{ email: "", is_primary: true }]);
  const [phones, setPhones] = useState([{ phone: "", is_primary: true }]);
  const [existingContacts, setExistingContacts] = useState({ emails: [], phones: [] });

  // Conflict handling
  const [showConflictPopup, setShowConflictPopup] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [relationshipData, setRelationshipData] = useState({
    type: "",
    description: "",
    notes: ""
  });

  const [formData, setFormData] = useState({
    plant_name: "",
    company_id: "",
    plant_type_id: "",
    country_name: "",
    country_id: "",
    postal_code: "",
    postal_code_id: "",
    state_name: "",
    state_id: "",
    city_name: "",
    city_id: "",
    area_name: "",
    area_id: "",
    address_line1: "",
    address_line2: "",
    landmark: "",
  });

  const [searchResults, setSearchResults] = useState({
    countries: [],
    postalCodes: [],
    states: [],
    cities: [],
    areas: [],
  });

  const [showDropdown, setShowDropdown] = useState({
    country: false,
    postalCode: false,
    state: false,
    city: false,
    area: false,
  });

  const searchTimers = useRef({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [companiesRes, plantTypesRes, plantsRes] = await Promise.all([
        fetch("http://localhost:8000/api/companies-for-plant"),
        fetch("http://localhost:8000/api/plant-types"),
        fetch("http://localhost:8000/api/plants"),
      ]);

      const companiesData = await companiesRes.json();
      const plantTypesData = await plantTypesRes.json();
      const plantsData = await plantsRes.json();

      setCompanies(companiesData);
      setPlantTypes(plantTypesData);
      setPlants(plantsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = async (companyId) => {
    setFormData((prev) => ({ 
      ...prev, 
      company_id: companyId,
      country_name: "",
      country_id: "",
      postal_code: "",
      postal_code_id: "",
      state_name: "",
      state_id: "",
      city_name: "",
      city_id: "",
      area_name: "",
      area_id: "",
    }));

    if (!companyId) {
      setSelectedCompany(null);
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/companies/${companyId}/details`);
      const data = await response.json();
      setSelectedCompany(data);
      
      if (useCompanyLocation) {
        setFormData(prev => ({
          ...prev,
          country_name: data.location.country,
          country_id: data.location.country_id,
          postal_code: data.location.postal_code,
          postal_code_id: data.location.postal_code_id,
          state_name: data.location.state,
          state_id: data.location.state_id,
          city_name: data.location.city,
          city_id: data.location.city_id,
          area_name: data.location.area,
          area_id: data.location.area_id,
        }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePlantNameTypeChange = async () => {
    if (!formData.plant_name || !formData.plant_type_id || !formData.company_id) return;

    try {
      // Check if same plant+type exists
      const response = await fetch(
        `http://localhost:8000/api/check-plant-exists?company_id=${formData.company_id}&plant_name=${encodeURIComponent(formData.plant_name)}&plant_type_id=${formData.plant_type_id}`
      );
      const data = await response.json();

      if (data.exists) {
        // Load existing contacts
        const contactsRes = await fetch(`http://localhost:8000/api/plants/${data.plant_id}/contacts`);
        const contactsData = await contactsRes.json();
        setExistingContacts(contactsData);
      } else {
        setExistingContacts({ emails: [], phones: [] });
      }
    } catch (err) {
      console.error("Error checking plant:", err);
    }
  };

  useEffect(() => {
    handlePlantNameTypeChange();
  }, [formData.plant_name, formData.plant_type_id, formData.company_id]);

  const addEmail = () => {
    setEmails([...emails, { email: "", is_primary: false }]);
  };

  const removeEmail = (index) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (index, field, value) => {
    const updated = [...emails];
    if (field === "is_primary" && value) {
      updated.forEach((e, i) => e.is_primary = i === index);
    } else {
      updated[index][field] = value;
    }
    setEmails(updated);
  };

  const addPhone = () => {
    setPhones([...phones, { phone: "", is_primary: false }]);
  };

  const removePhone = (index) => {
    if (phones.length > 1) {
      setPhones(phones.filter((_, i) => i !== index));
    }
  };

  const updatePhone = (index, field, value) => {
    const updated = [...phones];
    if (field === "is_primary" && value) {
      updated.forEach((p, i) => p.is_primary = i === index);
    } else {
      updated[index][field] = value;
    }
    setPhones(updated);
  };

const liveSearch = async (field, query) => {
    if (!query || query.length < 1) {
      setSearchResults(prev => ({
        ...prev,
        [field === 'country' ? 'countries' : 
         field === 'postalCode' ? 'postalCodes' : 
         field === 'state' ? 'states' : 
         field === 'city' ? 'cities' : 'areas']: []
      }));
      return;
    }

    if (searchTimers.current[field]) clearTimeout(searchTimers.current[field]);

    searchTimers.current[field] = setTimeout(async () => {
      try {
        let url = "";
        
        if (field === 'country') {
          url = `http://localhost:8000/api/countries?q=${encodeURIComponent(query)}`;
        } else if (field === 'postalCode' && formData.country_id) {
          url = `http://localhost:8000/api/postal-codes-by-country/${formData.country_id}?q=${encodeURIComponent(query)}`;
        } else if (field === 'state' && formData.postal_code_id) {
          url = `http://localhost:8000/api/states-by-postal/${formData.postal_code_id}?q=${encodeURIComponent(query)}`;
        } else if (field === 'city' && formData.postal_code_id) {
          url = `http://localhost:8000/api/cities-by-postal/${formData.postal_code_id}?q=${encodeURIComponent(query)}`;
        } else if (field === 'area' && formData.city_id) {
          url = `http://localhost:8000/api/areas-by-city/${formData.city_id}?q=${encodeURIComponent(query)}`;
        } else {
          return;
        }

        const data = await fetch(url).then(r => r.json());
        setSearchResults(prev => ({
          ...prev,
          [field === 'country' ? 'countries' : 
           field === 'postalCode' ? 'postalCodes' : 
           field === 'state' ? 'states' : 
           field === 'city' ? 'cities' : 'areas']: data
        }));
      } catch (err) {
        console.error(`Error searching ${field}:`, err);
      }
    }, 300);
  };

  const selectFromDropdown = (field, item) => {
    if (field === 'country') {
      setFormData(prev => ({
        ...prev,
        country_name: item.country_name,
        country_id: item.id,
        postal_code: "",
        postal_code_id: "",
        state_name: "",
        state_id: "",
        city_name: "",
        city_id: "",
        area_name: "",
        area_id: ""
      }));
    } else if (field === 'postalCode') {
      setFormData(prev => ({
        ...prev,
        postal_code: item.postal_code,
        postal_code_id: item.id,
        state_name: "",
        state_id: "",
        city_name: "",
        city_id: "",
        area_name: "",
        area_id: ""
      }));
    } else if (field === 'state') {
      setFormData(prev => ({
        ...prev,
        state_name: item.state_name,
        state_id: item.id,
        city_name: "",
        city_id: "",
        area_name: "",
        area_id: ""
      }));
    } else if (field === 'city') {
      setFormData(prev => ({
        ...prev,
        city_name: item.city_name,
        city_id: item.id,
        area_name: "",
        area_id: ""
      }));
    } else if (field === 'area') {
      setFormData(prev => ({
        ...prev,
        area_name: item.area_name,
        area_id: item.id
      }));
    }
    
    setShowDropdown(prev => ({ ...prev, [field]: false }));
  };

const handleLocationChange = (e, field) => {
    const value = e.target.value;
    const capitalizeWords = (text) => {
      return text.toLowerCase().split(" ").map((word) => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(" ");
    };

    if (field === 'country') {
      const capitalized = capitalizeWords(value);
      setFormData(prev => ({
        ...prev,
        country_name: capitalized,
        country_id: ""
      }));
      liveSearch('country', value);
      setShowDropdown(prev => ({ ...prev, country: value.length > 0 }));
    } else if (field === 'postalCode') {
      setFormData(prev => ({
        ...prev,
        postal_code: value.toUpperCase(),
        postal_code_id: ""
      }));
      if (formData.country_id) {
        liveSearch('postalCode', value);
        setShowDropdown(prev => ({ ...prev, postalCode: value.length > 0 }));
      }
    } else if (field === 'state') {
      const capitalized = capitalizeWords(value);
      setFormData(prev => ({
        ...prev,
        state_name: capitalized,
        state_id: ""
      }));
      if (formData.postal_code_id) {
        liveSearch('state', value);
        setShowDropdown(prev => ({ ...prev, state: value.length > 0 }));
      }
    } else if (field === 'city') {
      const capitalized = capitalizeWords(value);
      setFormData(prev => ({
        ...prev,
        city_name: capitalized,
        city_id: ""
      }));
      if (formData.postal_code_id) {
        liveSearch('city', value);
        setShowDropdown(prev => ({ ...prev, city: value.length > 0 }));
      }
    }  else if (field === 'area') {
      const capitalized = capitalizeWords(value);
      setFormData(prev => ({
        ...prev,
        area_name: capitalized,
        area_id: ""
      }));
      if (formData.city_id) {
        liveSearch('area', value);
        setShowDropdown(prev => ({ ...prev, area: value.length > 0 }));
      }
    }
  };

  const capitalizeWords = (text) => {
    return text.toLowerCase().split(" ").map((word) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: name === "plant_name" ? capitalizeWords(value) : value 
    }));
  };

  const checkConflicts = async () => {
    const allEmails = emails.filter(e => e.email.trim()).map(e => e.email.trim().toLowerCase());
    const allPhones = phones.filter(p => p.phone.trim()).map(p => p.phone.trim());

    if (allEmails.length === 0 && allPhones.length === 0) return true;

    try {
      const params = new URLSearchParams();
      allEmails.forEach(email => params.append('emails', email));
      allPhones.forEach(phone => params.append('phones', phone));
      params.append('current_company_id', formData.company_id);

      const response = await fetch('http://localhost:8000/api/check-contact-conflict', {
        method: 'POST',
        body: params
      });

      const data = await response.json();
      
      if (data.has_conflict) {
        setConflicts(data.conflicts);
        setShowConflictPopup(true);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Error checking conflicts:", err);
      return true;
    }
  };

  const handleSubmit = async (allowSharedContact = false) => {
    if (!formData.plant_name || !formData.company_id || !formData.plant_type_id) {
      setError("Please fill plant name, company and plant type");
      return;
    }

    const validEmails = emails.filter(e => e.email.trim());
    if (validEmails.length === 0) {
      setError("Please add at least one email");
      return;
    }

    if (!useCompanyLocation) {
      if (!formData.country_name || !formData.state_name || !formData.city_name || 
          !formData.area_name || !formData.postal_code) {
        setError("Please fill all location fields");
        return;
      }
    }

    if (!allowSharedContact) {
      const canProceed = await checkConflicts();
      if (!canProceed) return;
    }

    try {
      setLoading(true);

      const submitData = new FormData();
      submitData.append("plant_name", formData.plant_name);
      submitData.append("company_id", formData.company_id);
      submitData.append("plant_type_id", formData.plant_type_id);
      submitData.append("use_company_location", useCompanyLocation);
      submitData.append("allow_shared_contact", allowSharedContact);
      
      submitData.append("emails", JSON.stringify(emails.filter(e => e.email.trim())));
      submitData.append("phones", JSON.stringify(phones.filter(p => p.phone.trim())));
      
      if (!useCompanyLocation) {
        submitData.append("country_name", formData.country_name);
        submitData.append("postal_code", formData.postal_code);
        submitData.append("state_name", formData.state_name);
        submitData.append("city_name", formData.city_name);
        submitData.append("area_name", formData.area_name);
      }
      
      if (formData.address_line1) submitData.append("address_line1", formData.address_line1);
      if (formData.address_line2) submitData.append("address_line2", formData.address_line2);
      if (formData.landmark) submitData.append("landmark", formData.landmark);

      if (allowSharedContact && relationshipData.type) {
        submitData.append("relationship_type", relationshipData.type);
        if (relationshipData.description) submitData.append("relationship_description", relationshipData.description);
        if (relationshipData.notes) submitData.append("relationship_notes", relationshipData.notes);
      }

      const response = await fetch("http://localhost:8000/api/plants", {
        method: "POST",
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create plant");
      }

      const result = await response.json();
      setSuccess(`Plant created! Code: ${result.plant_code}`);

      setTimeout(() => {
        resetForm();
        setSuccess("");
        setShowConflictPopup(false);
      }, 2000);

      const plantsRes = await fetch("http://localhost:8000/api/plants");
      const plantsData = await plantsRes.json();
      setPlants(plantsData);

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      plant_name: "", company_id: "", plant_type_id: "",
      country_name: "", country_id: "", postal_code: "", postal_code_id: "",
      state_name: "", state_id: "", city_name: "", city_id: "", area_name: "", area_id: "",
      address_line1: "", address_line2: "", landmark: "",
    });
    setSelectedCompany(null);
    setShowAddForm(false);
    setUseCompanyLocation(true);
    setEmails([{ email: "", is_primary: true }]);
    setPhones([{ phone: "", is_primary: true }]);
    setExistingContacts({ emails: [], phones: [] });
    setSearchResults({ countries: [], postalCodes: [], states: [], cities: [], areas: [] });
    setRelationshipData({ type: "", description: "", notes: "" });
  };

  const styles = {
    input: {
      width: "100%", padding: "4px 8px", border: "1px solid #ddd", borderRadius: "4px",
      fontSize: "11px", boxSizing: "border-box", color: "#333", backgroundColor: "#fff",
    },
    label: {
      display: "block", fontSize: "10px", fontWeight: "500", marginBottom: "3px", color: "#555",
    },
    select: {
      width: "100%", padding: "4px 8px", border: "1px solid #ddd", borderRadius: "4px",
      fontSize: "11px", boxSizing: "border-box", color: "#333", backgroundColor: "#fff", cursor: "pointer"
    },
    readOnly: {
      width: "100%", padding: "4px 8px", border: "1px solid #ddd", borderRadius: "4px",
      fontSize: "11px", boxSizing: "border-box", backgroundColor: "#f5f5f5", cursor: "not-allowed"
    },
    dropdown: {
      position: "absolute", top: "100%", left: 0, right: 0, maxHeight: "150px",
      overflowY: "auto", backgroundColor: "white", border: "1px solid #ddd",
      borderTop: "none", borderRadius: "0 0 4px 4px", zIndex: 1000,
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)", marginTop: "1px"
    },
    dropdownItem: {
      padding: "6px 8px", fontSize: "10px", cursor: "pointer",
      borderBottom: "1px solid #f0f0f0", color: "#333", backgroundColor: "white"
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", ...(embeddedMode ? {} : { margin: "20px", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }) }}>
        
        {/* Header — hidden in embeddedMode */}
        {!embeddedMode && (
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #4b5563, #60a5fa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Factory size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>Plant Management</h2>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding: "4px 14px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}>
            {showAddForm ? <X size={12} /> : <Plus size={12} />}{showAddForm ? "Cancel" : "Add Plant"}
          </button>
        </div>
        )}
        {embeddedMode && (
        <div style={{ padding: "4px 8px", background: "#f8faff", borderBottom: "1px solid #e0e7ff", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding: "4px 14px", background: showAddForm ? "#f0f0f0" : "linear-gradient(to right, #4b5563, #60a5fa)", border: showAddForm ? "1px solid #ddd" : "none", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: showAddForm ? "#333" : "white", display: "flex", alignItems: "center", gap: "4px" }}>
            {showAddForm ? <X size={12} /> : <Plus size={12} />}{showAddForm ? "Cancel" : "Add Plant"}
          </button>
        </div>
        )}

        {showConflictPopup && (
          <div style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: "rgba(0,0,0,0.6)",
            zIndex: 10000, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            padding: "20px"
          }}>
            <div style={{ 
              background: "white", 
              borderRadius: "12px", 
              padding: "24px", 
              maxWidth: "550px", 
              width: "100%", 
              maxHeight: "85vh", 
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              color: "#333"
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "10px", 
                marginBottom: "20px",
                paddingBottom: "16px",
                borderBottom: "2px solid #f0f0f0"
              }}>
                <AlertTriangle size={24} color="#f59e0b" />
                <h3 style={{ 
                  margin: 0, 
                  fontSize: "16px", 
                  fontWeight: "700",
                  color: "#1a1a1a"
                }}>Contact Information Conflict</h3>
              </div>
              
              <p style={{ 
                fontSize: "12px", 
                marginBottom: "16px", 
                color: "#555",
                lineHeight: "1.6"
              }}>
                The following contacts are already used by other companies:
              </p>
              
              <div style={{ 
                background: "#fff7ed", 
                padding: "14px", 
                borderRadius: "8px", 
                marginBottom: "20px", 
                fontSize: "11px",
                border: "1px solid #fed7aa",
                color: "#333"
              }}>
                {conflicts.map((c, i) => (
                  <div key={i} style={{ 
                    marginBottom: i < conflicts.length - 1 ? "12px" : "0",
                    paddingBottom: i < conflicts.length - 1 ? "12px" : "0",
                    borderBottom: i < conflicts.length - 1 ? "1px solid #fed7aa" : "none"
                  }}>
                    <div style={{ fontWeight: "700", marginBottom: "4px", color: "#1a1a1a" }}>
                      {c.company_name}
                    </div>
                    <div style={{ color: "#555", marginBottom: "2px" }}>
                      Plant: {c.plant_name}
                    </div>
                    <div style={{ color: "#d97706", fontWeight: "600" }}>
                      {c.type}: {c.value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ 
                  display: "block", 
                  fontSize: "11px", 
                  fontWeight: "600", 
                  marginBottom: "6px", 
                  color: "#333" 
                }}>
                  Relationship Type <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select 
                  value={relationshipData.type} 
                  onChange={(e) => setRelationshipData(prev => ({ ...prev, type: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#333",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                    outline: "none"
                  }}
                >
                  <option value="">Select Relationship</option>
                  <option value="Related Company">Related Company</option>
                  <option value="Integral Part">Integral Part</option>
                  <option value="Third Party">Third Party</option>
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ 
                  display: "block", 
                  fontSize: "11px", 
                  fontWeight: "600", 
                  marginBottom: "6px", 
                  color: "#333" 
                }}>
                  Description
                </label>
                <textarea 
                  value={relationshipData.description}
                  onChange={(e) => setRelationshipData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the relationship..."
                  style={{ 
                    width: "100%", 
                    padding: "8px 10px", 
                    border: "1px solid #d1d5db", 
                    borderRadius: "6px",
                    fontSize: "12px",
                    minHeight: "70px",
                    resize: "vertical",
                    fontFamily: "inherit",
                    color: "#333",
                    backgroundColor: "#fff",
                    outline: "none"
                  }} 
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ 
                  display: "block", 
                  fontSize: "11px", 
                  fontWeight: "600", 
                  marginBottom: "6px", 
                  color: "#333" 
                }}>
                  Notes
                </label>
                <textarea 
                  value={relationshipData.notes}
                  onChange={(e) => setRelationshipData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or context..."
                  style={{ 
                    width: "100%", 
                    padding: "8px 10px", 
                    border: "1px solid #d1d5db", 
                    borderRadius: "6px",
                    fontSize: "12px",
                    minHeight: "70px",
                    resize: "vertical",
                    fontFamily: "inherit",
                    color: "#333",
                    backgroundColor: "#fff",
                    outline: "none"
                  }} 
                />
              </div>

              <div style={{ 
                display: "flex", 
                gap: "10px", 
                justifyContent: "flex-end",
                paddingTop: "16px",
                borderTop: "1px solid #f0f0f0"
              }}>
                <button 
                  onClick={() => { 
                    setShowConflictPopup(false); 
                    setRelationshipData({ type: "", description: "", notes: "" }); 
                  }}
                  style={{ 
                    padding: "8px 16px", 
                    background: "#f3f4f6", 
                    border: "1px solid #d1d5db",
                    borderRadius: "6px", 
                    fontSize: "11px", 
                    cursor: "pointer",
                    fontWeight: "600",
                    color: "#374151",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => e.target.style.background = "#e5e7eb"}
                  onMouseLeave={(e) => e.target.style.background = "#f3f4f6"}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleSubmit(true)}
                  disabled={!relationshipData.type}
                  style={{ 
                    padding: "8px 20px", 
                    background: relationshipData.type ? "#10b981" : "#d1d5db",
                    border: "none", 
                    borderRadius: "6px", 
                    fontSize: "11px", 
                    color: "white",
                    cursor: relationshipData.type ? "pointer" : "not-allowed",
                    fontWeight: "600",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    if (relationshipData.type) e.target.style.background = "#059669";
                  }}
                  onMouseLeave={(e) => {
                    if (relationshipData.type) e.target.style.background = "#10b981";
                  }}
                >
                  Continue & Save
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {error && (
            <div style={{ padding: "10px 12px", background: "#fee", color: "#c00", borderRadius: "4px", marginBottom: "10px",
              fontSize: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>⚠️</span>
              <div><div style={{ fontWeight: "600", marginBottom: "2px" }}>Error</div><div>{error}</div></div>
            </div>
          )}
          {success && (
            <div style={{ padding: "10px 12px", background: "#efe", color: "#080", borderRadius: "4px", marginBottom: "10px",
              fontSize: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>✅</span>
              <div style={{ fontWeight: "600" }}>{success}</div>
            </div>
          )}

          {showAddForm && (
            <div style={{ marginBottom: "10px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333",
                borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>Add New Plant</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                <div>
                  <label style={styles.label}>Select Company <span style={{ color: "#c00" }}>*</span></label>
                  <select value={formData.company_id} onChange={(e) => handleCompanyChange(e.target.value)} style={styles.select}>
                    <option value="">-- Select Company --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.company_name} ({c.company_code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Plant Type <span style={{ color: "#c00" }}>*</span></label>
                  <select value={formData.plant_type_id} 
                    onChange={(e) => setFormData(prev => ({ ...prev, plant_type_id: e.target.value }))}
                    style={styles.select}>
                    <option value="">-- Select Plant Type --</option>
                    {plantTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.type_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label style={styles.label}>Plant Name <span style={{ color: "#c00" }}>*</span></label>
                <input type="text" name="plant_name" value={formData.plant_name} onChange={handleInputChange}
                  placeholder="e.g., Factory Unit 1" style={styles.input} />
                <div style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>
                  💡 Same name allowed with different plant type
                </div>
              </div>

              <div style={{ fontSize: "10px", fontWeight: "600", marginTop: "10px", marginBottom: "6px", color: "#333",
                borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
                <Mail size={12} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                Email Addresses
              </div>

              {existingContacts.emails.length > 0 && (
                <div style={{ background: "#f0f9ff", padding: "8px", borderRadius: "4px", marginBottom: "8px", fontSize: "10px" }}>
                  <div style={{ fontWeight: "600", marginBottom: "4px", color: "#0066cc" }}>Existing Emails:</div>
                  {existingContacts.emails.map((e, i) => (
                    <div key={i} style={{ marginBottom: "2px" }}>
                      {e.email} {e.is_primary && <span style={{ color: "#10b981", fontWeight: "600" }}>(Primary)</span>}
                    </div>
                  ))}
                </div>
              )}

              {emails.map((email, index) => (
                <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px", marginBottom: "8px", alignItems: "end" }}>
                  <div>
                    <label style={styles.label}>Email {index + 1}</label>
                    <input type="email" value={email.email}
                      onChange={(e) => updateEmail(index, "email", e.target.value)}
                      placeholder="email@example.com" style={styles.input} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingBottom: "4px" }}>
                    <input type="checkbox" checked={email.is_primary}
                      onChange={(e) => updateEmail(index, "is_primary", e.target.checked)}
                      style={{ cursor: "pointer" }} />
                    <label style={{ fontSize: "9px", cursor: "pointer" }}>Primary</label>
                  </div>
                  {emails.length > 1 && (
                    <button onClick={() => removeEmail(index)}
                      style={{ padding: "4px 8px", background: "#fee", border: "1px solid #fcc",
                        borderRadius: "4px", cursor: "pointer", color: "#c00", fontSize: "9px" }}>
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              ))}

              <button onClick={addEmail}
                style={{ padding: "4px 12px", background: "#f0f9ff", border: "1px solid #0066cc",
                  borderRadius: "4px", fontSize: "9px", cursor: "pointer", color: "#0066cc", marginBottom: "8px",
                  display: "flex", alignItems: "center", gap: "4px" }}>
                <Plus size={10} />
                Add Email
              </button>

              <div style={{ fontSize: "10px", fontWeight: "600", marginTop: "10px", marginBottom: "6px", color: "#333",
                borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
                <Phone size={12} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                Phone Numbers
              </div>

              {existingContacts.phones.length > 0 && (
                <div style={{ background: "#f0f9ff", padding: "8px", borderRadius: "4px", marginBottom: "8px", fontSize: "10px" }}>
                  <div style={{ fontWeight: "600", marginBottom: "4px", color: "#0066cc" }}>Existing Phones:</div>
                  {existingContacts.phones.map((p, i) => (
                    <div key={i} style={{ marginBottom: "2px" }}>
                      {p.phone} {p.is_primary && <span style={{ color: "#10b981", fontWeight: "600" }}>(Primary)</span>}
                    </div>
                  ))}
                </div>
              )}

              {phones.map((phone, index) => (
                <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px", marginBottom: "8px", alignItems: "end" }}>
                  <div>
                    <label style={styles.label}>Phone {index + 1}</label>
                    <input type="text" value={phone.phone}
                      onChange={(e) => updatePhone(index, "phone", e.target.value)}
                      placeholder="+91 1234567890" style={styles.input} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingBottom: "4px" }}>
                    <input type="checkbox" checked={phone.is_primary}
                      onChange={(e) => updatePhone(index, "is_primary", e.target.checked)}
                      style={{ cursor: "pointer" }} />
                    <label style={{ fontSize: "9px", cursor: "pointer" }}>Primary</label>
                  </div>
                  {phones.length > 1 && (
                    <button onClick={() => removePhone(index)}
                      style={{ padding: "4px 8px", background: "#fee", border: "1px solid #fcc",
                        borderRadius: "4px", cursor: "pointer", color: "#c00", fontSize: "9px" }}>
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              ))}

              <button onClick={addPhone}
                style={{ padding: "4px 12px", background: "#f0f9ff", border: "1px solid #0066cc",
                  borderRadius: "4px", fontSize: "9px", cursor: "pointer", color: "#0066cc", marginBottom: "8px",
                  display: "flex", alignItems: "center", gap: "4px" }}>
                <Plus size={10} />
                Add Phone
              </button>

              <div style={{ fontSize: "10px", fontWeight: "600", marginTop: "10px", marginBottom: "6px", color: "#333",
                borderBottom: "1px solid #e8e8e8", paddingBottom: "3px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div><MapPin size={12} style={{ verticalAlign: "middle", marginRight: "4px" }} />Plant Location</div>
                <label style={{ fontSize: "9px", fontWeight: "400", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                  <input type="checkbox" checked={useCompanyLocation}
                    onChange={(e) => {
                      setUseCompanyLocation(e.target.checked);
                      if (e.target.checked && selectedCompany) {
                        setFormData(prev => ({
                          ...prev,
                          country_name: selectedCompany.location.country,
                          country_id: selectedCompany.location.country_id,
                          postal_code: selectedCompany.location.postal_code,
                          postal_code_id: selectedCompany.location.postal_code_id,
                          state_name: selectedCompany.location.state,
                          state_id: selectedCompany.location.state_id,
                          city_name: selectedCompany.location.city,
                          city_id: selectedCompany.location.city_id,
                          area_name: selectedCompany.location.area,
                          area_id: selectedCompany.location.area_id,
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          country_name: "",
                          country_id: "",
                          postal_code: "",
                          postal_code_id: "",
                          state_name: "",
                          state_id: "",
                          city_name: "",
                          city_id: "",
                          area_name: "",
                          area_id: "",
                        }));
                      }
                    }} />
                  Use Company Location
                </label>
              </div>

              {useCompanyLocation && selectedCompany ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                    <div>
                      <label style={styles.label}>Country</label>
                      <input type="text" value={selectedCompany.location.country} readOnly style={styles.readOnly} />
                    </div>
                    <div>
                      <label style={styles.label}>Postal Code</label>
                      <input type="text" value={selectedCompany.location.postal_code} readOnly style={styles.readOnly} />
                    </div>
                    <div>
                      <label style={styles.label}>State</label>
                      <input type="text" value={selectedCompany.location.state} readOnly style={styles.readOnly} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                    <div>
                      <label style={styles.label}>City</label>
                      <input type="text" value={selectedCompany.location.city} readOnly style={styles.readOnly} />
                    </div>
                    <div>
                      <label style={styles.label}>Area</label>
                      <input type="text" value={selectedCompany.location.area} readOnly style={styles.readOnly} />
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <div style={{ position: "relative" }}>
                    <label style={styles.label}>Country <span style={{ color: "#c00" }}>*</span></label>
                    <input value={formData.country_name}
                      onChange={(e) => handleLocationChange(e, 'country')}
                      onFocus={() => {
                        if (formData.country_name) liveSearch('country', formData.country_name);
                      }}
                      onBlur={() => setTimeout(() => setShowDropdown(p => ({ ...p, country: false })), 200)}
                      placeholder="Type country" style={styles.input} />
                    {showDropdown.country && searchResults.countries.length > 0 && (
                      <div style={styles.dropdown}>
                        {searchResults.countries.map((i) => (
                          <div key={i.id} style={styles.dropdownItem}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f9ff'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                            onMouseDown={() => selectFromDropdown('country', i)}>
                            {i.country_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ position: "relative" }}>
                    <label style={styles.label}>Postal Code <span style={{ color: "#c00" }}>*</span></label>
                    <input value={formData.postal_code}
                      onChange={(e) => handleLocationChange(e, 'postalCode')}
                      onFocus={() => {
                        if (formData.postal_code) liveSearch('postalCode', formData.postal_code);
                      }}
                      onBlur={() => setTimeout(() => setShowDropdown(p => ({ ...p, postalCode: false })), 200)}
                      placeholder="Type postal code"
                      style={{...styles.input, backgroundColor: formData.country_name ? '#fff' : '#f5f5f5'}}
                      disabled={!formData.country_name} />
                    {showDropdown.postalCode && searchResults.postalCodes.length > 0 && (
                      <div style={styles.dropdown}>
                        {searchResults.postalCodes.map((i) => (
                          <div key={i.id} style={styles.dropdownItem}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f9ff'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                            onMouseDown={() => selectFromDropdown('postalCode', i)}>
                            {i.postal_code}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ position: "relative" }}>
                    <label style={styles.label}>State <span style={{ color: "#c00" }}>*</span></label>
                    <input value={formData.state_name}
                      onChange={(e) => handleLocationChange(e, 'state')}
                      onFocus={() => {
                        if (formData.state_name) liveSearch('state', formData.state_name);
                      }}
                      onBlur={() => setTimeout(() => setShowDropdown(p => ({ ...p, state: false })), 200)}
                      placeholder="Type state"
                      style={{...styles.input, backgroundColor: formData.postal_code ? '#fff' : '#f5f5f5'}}
                      disabled={!formData.postal_code} />
                    {showDropdown.state && searchResults.states.length > 0 && (
                      <div style={styles.dropdown}>
                        {searchResults.states.map((i) => (
                          <div key={i.id} style={styles.dropdownItem}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f9ff'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                            onMouseDown={() => selectFromDropdown('state', i)}>
                            {i.state_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ position: "relative" }}>
                    <label style={styles.label}>City <span style={{ color: "#c00" }}>*</span></label>
                    <input value={formData.city_name}
                      onChange={(e) => handleLocationChange(e, 'city')}
                      onFocus={() => {
                        if (formData.city_name) liveSearch('city', formData.city_name);
                      }}
                      onBlur={() => setTimeout(() => setShowDropdown(p => ({ ...p, city: false })), 200)}
                      placeholder="Type city"
                      style={{...styles.input, backgroundColor: formData.postal_code ? '#fff' : '#f5f5f5'}}
                      disabled={!formData.postal_code} />
                    {showDropdown.city && searchResults.cities.length > 0 && (
                      <div style={styles.dropdown}>
                        {searchResults.cities.map((i) => (
                          <div key={i.id} style={styles.dropdownItem}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f9ff'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                            onMouseDown={() => selectFromDropdown('city', i)}>
                            {i.city_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

<div style={{ position: "relative" }}>
  <label style={styles.label}>Area <span style={{ color: "#c00" }}>*</span></label>
  <input value={formData.area_name}
    onChange={(e) => handleLocationChange(e, 'area')}
    onFocus={() => {
      if (formData.area_name) liveSearch('area', formData.area_name);
    }}
    onBlur={() => setTimeout(() => setShowDropdown(p => ({ ...p, area: false })), 200)}
    placeholder="Type area"
    style={{...styles.input, backgroundColor: formData.city_id ? '#fff' : '#f5f5f5'}}
    disabled={!formData.city_id} />  {/* CHANGED: from postal_code to city_id */}
  {showDropdown.area && searchResults.areas.length > 0 && (
    <div style={styles.dropdown}>
      {searchResults.areas.map((i) => (
        <div key={i.id} style={styles.dropdownItem}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f9ff'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
          onMouseDown={() => selectFromDropdown('area', i)}>
          {i.area_name}
        </div>
      ))}
    </div>
  )}
</div>
                </div>
              )}

              <div style={{ fontSize: "10px", fontWeight: "600", marginTop: "10px", marginBottom: "6px", color: "#333",
                borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>Address Details (Optional)</div>

              <div style={{ marginBottom: "8px" }}>
                <label style={styles.label}>Address Line 1</label>
                <input type="text" name="address_line1" value={formData.address_line1} onChange={handleInputChange}
                  placeholder="Building/Plot No, Street" style={styles.input} />
              </div>
              <div style={{ marginBottom: "8px" }}>
                <label style={styles.label}>Address Line 2</label>
                <input type="text" name="address_line2" value={formData.address_line2} onChange={handleInputChange}
                  placeholder="Additional address" style={styles.input} />
              </div>
              <div style={{ marginBottom: "8px" }}>
                <label style={styles.label}>Landmark</label>
                <input type="text" name="landmark" value={formData.landmark} onChange={handleInputChange}
                  placeholder="Near..." style={styles.input} />
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button onClick={() => handleSubmit(false)} disabled={loading}
                  style={{ padding: "4px 14px", background: loading ? "#ccc" : "rgba(75, 85, 99, 0.9)",
                    border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "500",
                    cursor: loading ? "not-allowed" : "pointer", color: "white", display: "flex",
                    alignItems: "center", gap: "4px" }}>
                  <Save size={12} />
                  {loading ? "Creating..." : "Create Plant"}
                </button>
                <button onClick={resetForm}
                  style={{ padding: "4px 14px", background: "#f0f0f0", border: "1px solid #ddd",
                    borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "#333" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: "10px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333",
              borderBottom: "1px solid #e8e8e8", paddingBottom: "3px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Plants List</span>
              <span style={{ fontSize: "9px", fontWeight: "400", color: "#0066cc",
                background: "linear-gradient(135deg, #e0f2fe 0%, #dcfce7 100%)", padding: "2px 8px", borderRadius: "10px" }}>
                Total: {plants.length}
              </span>
            </h3>
            <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
              {loading && plants.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "11px", color: "#666" }}>
                  <div style={{ marginBottom: "10px", fontSize: "36px" }}>⏳</div>
                  <div style={{ fontWeight: "500" }}>Loading...</div>
                </div>
              ) : plants.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "11px", color: "#666" }}>
                  <div style={{ marginBottom: "10px", fontSize: "48px" }}>🏭</div>
                  <div style={{ fontWeight: "500" }}>No plants found</div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                    <thead>
                      <tr style={{ background: "#f8f9fa" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Code</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Plant</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Company</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Type</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Location</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", color: "#555", borderBottom: "1px solid #e0e0e0" }}>Contacts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plants.map((plant, i) => (
                        <tr key={plant.id} style={{ borderBottom: i < plants.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                          <td style={{ padding: "6px 8px" }}>
                            <span style={{ padding: "2px 6px", background: "#e3f2fd", color: "#0066cc",
                              borderRadius: "3px", fontSize: "9px", fontWeight: "600" }}>{plant.plant_code}</span>
                          </td>
                          <td style={{ padding: "6px 8px", color: "#333", fontWeight: "500" }}>{plant.plant_name}</td>
                          <td style={{ padding: "6px 8px", color: "#666" }}>{plant.company.company_name}</td>
                          <td style={{ padding: "6px 8px", color: "#666" }}>{plant.plant_type.type_name}</td>
                          <td style={{ padding: "6px 8px", color: "#666" }}>
                            {plant.primary_location ? `${plant.primary_location.city}, ${plant.primary_location.state}` : "N/A"}
                          </td>
                          <td style={{ padding: "6px 8px", color: "#666", fontSize: "9px" }}>
                            {plant.emails && plant.emails.length > 0 && (
                              <div>📧 {plant.emails.length} email(s)</div>
                            )}
                            {plant.phones && plant.phones.length > 0 && (
                              <div>📞 {plant.phones.length} phone(s)</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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