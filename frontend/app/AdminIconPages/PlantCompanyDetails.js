"use client";
import { useState, useEffect } from "react";
import { Search, Building2, Factory, FileText, Trash2, ChevronDown, ChevronRight, Mail, Phone, MapPin, AlertTriangle, DollarSign, Briefcase, Hash, Globe } from "lucide-react";

export default function PlantCompanyDetails({ embeddedMode = false }) {
  const [data, setData] = useState({ companies: [], plants: [], plantTypes: [] });
  const [search, setSearch] = useState("");
  const [view, setView] = useState("companies");
  const [expandedCompanies, setExpandedCompanies] = useState(new Set());
  const [expandedPlants, setExpandedPlants] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ totalCompanies: 0, totalPlants: 0, sharedContacts: 0, uniqueLocations: 0 });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [companies, plants, plantTypes] = await Promise.all([
        fetch("http://localhost:8000/api/companies").then(r => r.json()),
        fetch("http://localhost:8000/api/plants").then(r => r.json()),
        fetch("http://localhost:8000/api/plant-types").then(r => r.json())
      ]);
      setData({ companies, plants, plantTypes });
      calculateStats(companies, plants);
      setError("");
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (companies, plants) => {
    const sharedEmails = new Set();
    const sharedPhones = new Set();
    const locations = new Set();

    companies.forEach(c => {
      if (c.company_email) sharedEmails.add(c.company_email);
      if (c.company_phone) sharedPhones.add(c.company_phone);
      if (c.postal_code?.postal_code) locations.add(c.postal_code.postal_code);
    });

    plants.forEach(p => {
      p.emails?.forEach(e => sharedEmails.add(e.email));
      p.phones?.forEach(ph => sharedPhones.add(ph.phone));
      if (p.primary_location?.postal_code) locations.add(p.primary_location.postal_code);
    });

    setStats({
      totalCompanies: companies.length,
      totalPlants: plants.length,
      sharedContacts: sharedEmails.size + sharedPhones.size,
      uniqueLocations: locations.size
    });
  };

  const handleDelete = async (type, id, name) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      const url = type === 'company' ? `http://localhost:8000/api/companies/${id}` : 
                  type === 'plant' ? `http://localhost:8000/api/plants/${id}` :
                  `http://localhost:8000/api/plant-types/${id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleCompany = (id) => {
    const newSet = new Set(expandedCompanies);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedCompanies(newSet);
  };

  const togglePlant = (id) => {
    const newSet = new Set(expandedPlants);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedPlants(newSet);
  };

  const getAllContactSharing = (email, phone) => {
    const result = { emailSharing: null, phoneSharing: null, hasSharing: false };

    if (email) {
      const companies = data.companies.filter(c => c.company_email === email);
      const plants = data.plants.filter(p => p.emails?.some(e => e.email === email));
      if (companies.length > 0 || plants.length > 0) {
        result.emailSharing = {
          companies: companies.map(c => ({ id: c.id, name: c.company_name, code: c.company_code })),
          plants: plants.map(p => ({ id: p.id, name: p.plant_name, code: p.plant_code, companyName: data.companies.find(c => c.id === p.company?.id)?.company_name }))
        };
        result.hasSharing = companies.length > 1 || plants.length > 0;
      }
    }

    if (phone) {
      const companies = data.companies.filter(c => c.company_phone === phone);
      const plants = data.plants.filter(p => p.phones?.some(ph => ph.phone === phone));
      if (companies.length > 0 || plants.length > 0) {
        result.phoneSharing = {
          companies: companies.map(c => ({ id: c.id, name: c.company_name, code: c.company_code })),
          plants: plants.map(p => ({ id: p.id, name: p.plant_name, code: p.plant_code, companyName: data.companies.find(c => c.id === p.company?.id)?.company_name }))
        };
        result.hasSharing = companies.length > 1 || plants.length > 0;
      }
    }

    return result;
  };

  const getCompanyPlants = (companyId) => {
    return data.plants.filter(p => p.company?.id === companyId);
  };

  const getLocationStats = (company) => {
    const plants = getCompanyPlants(company.id);
    const postalCodes = new Set();
    const cities = new Set();
    const states = new Set();

    if (company.postal_code?.postal_code) postalCodes.add(company.postal_code.postal_code);
    if (company.city?.city_name) cities.add(company.city.city_name);
    if (company.state?.state_name) states.add(company.state.state_name);

    plants.forEach(p => {
      if (p.primary_location?.postal_code) postalCodes.add(p.primary_location.postal_code);
      if (p.primary_location?.city) cities.add(p.primary_location.city);
      if (p.primary_location?.state) states.add(p.primary_location.state);
    });

    return { postalCodes: postalCodes.size, cities: cities.size, states: states.size };
  };

  const filteredCompanies = () => {
    const s = search.toLowerCase();
    return data.companies.filter(c => 
      c.company_name?.toLowerCase().includes(s) || 
      c.company_code?.toLowerCase().includes(s) ||
      c.company_email?.toLowerCase().includes(s) ||
      c.company_phone?.toLowerCase().includes(s) ||
      c.short_name?.toLowerCase().includes(s) ||
      c.company_type?.type_name?.toLowerCase().includes(s) ||
      c.industry_type?.industry_name?.toLowerCase().includes(s)
    );
  };

  const filteredPlantTypes = () => {
    const s = search.toLowerCase();
    return data.plantTypes.filter(t => 
      t.type_name?.toLowerCase().includes(s) ||
      t.type_code?.toLowerCase().includes(s)
    );
  };

  const companies = filteredCompanies();
  const plantTypes = filteredPlantTypes();

  // Compact Styles
  const s1 = { width: "100%", padding: "4px 8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "11px", boxSizing: "border-box", color: "#000", backgroundColor: "#fff" };
  const s3 = { display: "block", fontSize: "10px", fontWeight: "500", marginBottom: "3px", color: "#000" };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", ...(embeddedMode ? {} : { margin: "20px", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }) }}>
        
        {/* Header — hidden in embeddedMode, parent AdminDashboard shows header */}
        {!embeddedMode && (
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #4b5563, #60a5fa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Building2 size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>Business Hierarchy</h2>
          </div>
          
          {/* Stats */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ fontSize: "9px", background: "rgba(255,255,255,0.15)", padding: "3px 8px", borderRadius: "4px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>{stats.totalCompanies}</span>
              <span>Companies</span>
            </div>
            <div style={{ fontSize: "9px", background: "rgba(255,255,255,0.15)", padding: "3px 8px", borderRadius: "4px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>{stats.totalPlants}</span>
              <span>Plants</span>
            </div>
            <div style={{ fontSize: "9px", background: "rgba(255,255,255,0.15)", padding: "3px 8px", borderRadius: "4px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>{stats.uniqueLocations}</span>
              <span>Locations</span>
            </div>
            <div style={{ fontSize: "9px", background: "rgba(255,255,255,0.15)", padding: "3px 8px", borderRadius: "4px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>{stats.sharedContacts}</span>
              <span>Contacts</span>
            </div>
          </div>
        </div>
        )}

        {/* Toolbar */}
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #6a3a3aff", display: "flex", gap: "8px", flexShrink: 0 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#999" }} />
            <input 
              type="text" 
              placeholder="Search by name, code, email, phone..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ 
                width: "100%", 
                padding: "6px 6px 6px 32px", 
                border: "1px solid #000000ff", 
                borderRadius: "4px", 
                fontSize: "11px",
                color: "#000000",
                "::placeholder": { color: "#666666" }
              }}
            />
          </div>
          <button 
            onClick={() => setView('companies')}
            style={{ padding: "6px 14px", background: view === 'companies' ? "linear-gradient(to right, #4b5563, #60a5fa)" : "#f0f0f0", border: "1px solid #ddd", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: view === 'companies' ? "white" : "#333", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <Building2 size={12} />
            Companies
          </button>
          <button 
            onClick={() => setView('plantTypes')}
            style={{ padding: "6px 14px", background: view === 'plantTypes' ? "linear-gradient(to right, #4b5563, #60a5fa)" : "#f0f0f0", border: "1px solid #ddd", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: view === 'plantTypes' ? "white" : "#333", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <FileText size={12} />
            Plant Types
          </button>
        </div>

        {error && (
          <div style={{ margin: "8px 12px 0", padding: "8px 10px", background: "#fee", color: "#c00", borderRadius: "4px", fontSize: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", fontSize: "11px", color: "#666" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>⏳</div>
              <div>Loading data...</div>
            </div>
          ) : view === 'companies' ? (
            companies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", fontSize: "11px", color: "#666" }}>
                <div style={{ fontSize: "48px", marginBottom: "8px" }}>🏢</div>
                <div style={{ fontWeight: "500" }}>No companies found</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {companies.map(company => {
                  const plants = getCompanyPlants(company.id);
                  const isExpanded = expandedCompanies.has(company.id);
                  const companyContactSharing = getAllContactSharing(company.company_email, company.company_phone);
                  const locationStats = getLocationStats(company);
                  
                  return (
                    <div key={company.id} style={{ border: "1px solid #e0e0e0", borderRadius: "6px", overflow: "hidden", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05), 0 0 20px rgba(0,0,0,0.03) inset" }}>
                      {/* Company Header */}
                      <div 
                        onClick={() => toggleCompany(company.id)}
                        style={{ background: "linear-gradient(to right, #60a5fa, #4b5563)", padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                          <Building2 size={16} style={{ color: "white" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{company.company_name}</span>
                              <span style={{ fontSize: "9px", background: "rgba(255,255,255,0.25)", color: "white", padding: "2px 6px", borderRadius: "3px", fontFamily: "monospace", fontWeight: "bold" }}>
                                {company.company_code}
                              </span>
                              {company.short_name && (
                                <span style={{ fontSize: "8px", background: "rgba(255,255,255,0.15)", color: "white", padding: "2px 5px", borderRadius: "3px" }}>
                                  {company.short_name}
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "9px", color: "rgba(255,255,255,0.9)", flexWrap: "wrap" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                <Factory size={10} />
                                {plants.length} Plant{plants.length !== 1 ? 's' : ''}
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                <MapPin size={10} />
                                {locationStats.postalCodes} PIN{locationStats.postalCodes !== 1 ? 's' : ''}
                              </span>
                              {companyContactSharing.hasSharing && (
                                <span style={{ display: "flex", alignItems: "center", gap: "3px", background: "rgba(234,179,8,0.3)", padding: "2px 5px", borderRadius: "3px" }}>
                                  <AlertTriangle size={10} />
                                  Shared Contacts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete('company', company.id, company.company_name); }}
                            style={{ padding: "4px", background: "rgba(239,68,68,0.2)", border: "none", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center" }}
                          >
                            <Trash2 size={12} style={{ color: "white" }} />
                          </button>
                          {isExpanded ? <ChevronDown size={16} style={{ color: "white" }} /> : <ChevronRight size={16} style={{ color: "white" }} />}
                        </div>
                      </div>

                      {/* Company Details */}
                      <div style={{ padding: "10px 12px", background: "#f8f9fa", borderBottom: "1px solid #e0e0e0" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", fontSize: "10px" }}>
                          
                          {/* Business Identity */}
                          <div>
                            <div style={{ fontWeight: "600", marginBottom: "6px", fontSize: "9px", color: "#000", borderBottom: "1px solid #e0e0e0", paddingBottom: "3px" }}>
                              <Hash size={10} style={{ display: "inline", marginRight: "3px" }} />
                              Business Identity
                            </div>
                            <div style={{ background: "white", padding: "6px", borderRadius: "4px", marginBottom: "4px", border: "1px solid #e0e0e0" }}>
                              <label style={s3}>Company Code</label>
                              <div style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: "11px", color: "#1e40af" }}>{company.company_code}</div>
                            </div>
                            {company.short_name && (
                              <div style={{ background: "white", padding: "6px", borderRadius: "4px", marginBottom: "4px", border: "1px solid #e0e0e0" }}>
                                <label style={s3}>Short Name</label>
                                <div style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: "11px", color: "#1eaf92ff" }}>{company.short_name}</div>
                              </div>
                            )}
                            <div style={{ background: "white", padding: "6px", borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                              <label style={s3}>Company ID</label>
                              <div style={{ fontFamily: "monospace", color: "#6b7280" }}>#{company.id}</div>
                            </div>
                          </div>

                          {/* Contact Information */}
                          <div>
                            <div style={{ fontWeight: "600", marginBottom: "6px", fontSize: "9px", color: "#000", borderBottom: "1px solid #e0e0e0", paddingBottom: "3px" }}>
                              <Mail size={10} style={{ display: "inline", marginRight: "3px" }} />
                              Contact Information
                            </div>
                            {company.company_email ? (
                              <div style={{ background: "white", padding: "6px", borderRadius: "4px", marginBottom: "4px", border: "1px solid #e0e0e0" }}>
                                <label style={s3}>Email</label>
                                <div style={{ fontSize: "9px", wordBreak: "break-all", marginBottom: "3px", color: "#000" }}>{company.company_email}</div>
                                {companyContactSharing.emailSharing && (
                                  <div style={{ padding: "4px", background: "#fef3c7", borderLeft: "2px solid #f59e0b", borderRadius: "0 3px 3px 0", fontSize: "8px", marginTop: "4px" }}>
                                    <div style={{ fontWeight: "600", color: "#92400e", marginBottom: "2px", display: "flex", alignItems: "center", gap: "3px" }}>
                                      <AlertTriangle size={8} />
                                      SHARED EMAIL
                                    </div>
                                    {companyContactSharing.emailSharing.companies.length > 1 && (
                                      <div style={{ fontSize: "8px", color: "#78350f" }}>
                                        <strong>Companies ({companyContactSharing.emailSharing.companies.length}):</strong>
                                        {companyContactSharing.emailSharing.companies.map(c => (
                                          <div key={c.id} style={{ marginLeft: "8px", marginTop: "2px" }}>• {c.name} ({c.code})</div>
                                        ))}
                                      </div>
                                    )}
                                    {companyContactSharing.emailSharing.plants.length > 0 && (
                                      <div style={{ fontSize: "8px", color: "#78350f", marginTop: "2px" }}>
                                        <strong>Plants ({companyContactSharing.emailSharing.plants.length}):</strong>
                                        {companyContactSharing.emailSharing.plants.map(p => (
                                          <div key={p.id} style={{ marginLeft: "8px", marginTop: "2px" }}>• {p.name} ({p.code})</div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: "9px", color: "#000", fontStyle: "italic" }}>No email</div>
                            )}
                            {company.company_phone ? (
                              <div style={{ background: "white", padding: "6px", borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                                <label style={s3}>Phone</label>
                                <div style={{ fontSize: "10px", marginBottom: "3px", color: "#000" }}>{company.company_phone}</div>
                                {companyContactSharing.phoneSharing && (
                                  <div style={{ padding: "4px", background: "#fef3c7", borderLeft: "2px solid #f59e0b", borderRadius: "0 3px 3px 0", fontSize: "8px", marginTop: "4px" }}>
                                    <div style={{ fontWeight: "600", color: "#92400e", marginBottom: "2px", display: "flex", alignItems: "center", gap: "3px" }}>
                                      <AlertTriangle size={8} />
                                      SHARED PHONE
                                    </div>
                                    {companyContactSharing.phoneSharing.companies.length > 1 && (
                                      <div style={{ fontSize: "8px", color: "#78350f" }}>
                                        <strong>Companies ({companyContactSharing.phoneSharing.companies.length}):</strong>
                                        {companyContactSharing.phoneSharing.companies.map(c => (
                                          <div key={c.id} style={{ marginLeft: "8px", marginTop: "2px" }}>• {c.name} ({c.code})</div>
                                        ))}
                                      </div>
                                    )}
                                    {companyContactSharing.phoneSharing.plants.length > 0 && (
                                      <div style={{ fontSize: "8px", color: "#78350f", marginTop: "2px" }}>
                                        <strong>Plants ({companyContactSharing.phoneSharing.plants.length}):</strong>
                                        {companyContactSharing.phoneSharing.plants.map(p => (
                                          <div key={p.id} style={{ marginLeft: "8px", marginTop: "2px" }}>• {p.name} ({p.code})</div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: "9px", color: "#000", fontStyle: "italic" }}>No phone</div>
                            )}
                          </div>

                          {/* Business Classification */}
                          <div>
                            <div style={{ fontWeight: "600", marginBottom: "6px", fontSize: "9px", color: "#000", borderBottom: "1px solid #e0e0e0", paddingBottom: "3px" }}>
                              <Briefcase size={10} style={{ display: "inline", marginRight: "3px" }} />
                              Business Classification
                            </div>
                            <div style={{ background: "white", padding: "6px", borderRadius: "4px", marginBottom: "4px", border: "1px solid #e0e0e0" }}>
                              <label style={s3}>Company Type</label>
                              <div style={{ fontWeight: "500", fontSize: "10px", marginBottom: "2px", color: "#7ac0deff" }}>{company.company_type?.type_name || 'Not Set'}</div>
                              <div style={{ fontSize: "8px", color: "#6b7280", fontFamily: "monospace" }}>Code: {company.company_type?.type_code || 'N/A'}</div>
                            </div>
                            <div style={{ background: "white", padding: "6px", borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                              <label style={s3}>Industry Type</label>
                              <div style={{ fontWeight: "500", fontSize: "10px", marginBottom: "2px", color: "#7ac0deff" }}>{company.industry_type?.industry_name || 'Not Set'}</div>
                              <div style={{ fontSize: "8px", color: "#6b7280", fontFamily: "monospace" }}>Code: {company.industry_type?.industry_code || 'N/A'}</div>
                            </div>
                          </div>

                          {/* Financial Info */}
                          <div>
                            <div style={{ fontWeight: "600", marginBottom: "6px", fontSize: "9px", color: "#000", borderBottom: "1px solid #e0e0e0", paddingBottom: "3px" }}>
                              <DollarSign size={10} style={{ display: "inline", marginRight: "3px" }} />
                              Financial Information
                            </div>
                            <div style={{ background: "white", padding: "6px", borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                              <label style={s3}>Currency</label>
                              <div style={{ fontWeight: "500", fontSize: "10px", marginBottom: "3px", color: "#2c777bff" }}>{company.currency?.currency_name || 'Not Set'}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ fontSize: "8px", color: "#6b7280", fontFamily: "monospace" }}>{company.currency?.currency_code || 'N/A'}</span>
                                {company.currency?.currency_symbol && (
                                  <span style={{ fontSize: "14px", fontWeight: "bold", color: "#06ce4fff" }}>{company.currency.currency_symbol}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Location */}
                          <div>
                            <div style={{ fontWeight: "600", marginBottom: "6px", fontSize: "9px", color: "#000", borderBottom: "1px solid #e0e0e0", paddingBottom: "3px" }}>
                              <MapPin size={10} style={{ display: "inline", marginRight: "3px" }} />
                              Primary Location
                            </div>
                            <div style={{ background: "white", padding: "6px", borderRadius: "4px", border: "1px solid #e0e0e0", fontSize: "9px" }}>
                              {company.location?.country && <div style={{ marginBottom: "3px" }}><span style={{ color: "#6b7280" }}>Country:</span> <strong style={{ color: "#4a6745ff" }}>{company.location.country}</strong></div>}
                              {company.location?.state && <div style={{ marginBottom: "3px" }}><span style={{ color: "#6b7280" }}>State:</span> <strong style={{ color: "#4a6745ff" }}>{company.location.state}</strong></div>}
                              {company.location?.city && <div style={{ marginBottom: "3px" }}><span style={{ color: "#6b7280" }}>City:</span> <strong style={{ color: "#4a6745ff" }}>{company.location.city}</strong></div>}
                              {company.location?.area && <div style={{ marginBottom: "3px" }}><span style={{ color: "#6b7280" }}>Area:</span> <strong style={{ color: "#4a6745ff" }}>{company.location.area}</strong></div>}
                              {company.location?.postal_code && (
                                <div style={{ marginTop: "4px", paddingTop: "4px", borderTop: "1px solid #e0e0e0" }}>
                                  <span style={{ background: "#1eafa5ff", color: "white", padding: "2px 6px", borderRadius: "3px", fontSize: "8px", fontFamily: "monospace", fontWeight: "bold" }}>
                                    PIN: {company.location.postal_code}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Plants Section */}
                      {isExpanded && (
                        <div style={{ background: "#f8f9fa" }}>
                          <div style={{ padding: "10px 12px" }}>
                            <div style={{ background: "#e0e7ff", padding: "8px 10px", borderRadius: "6px", marginBottom: "8px", border: "1px solid #c7d2fe", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{ background: "#6366f1", padding: "6px", borderRadius: "4px" }}>
                                  <Factory size={14} style={{ color: "white" }} />
                                </div>
                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#312e81" }}>
                                  Plants Under This Company ({plants.length})
                                </span>
                              </div>
                              {plants.length > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "9px" }}>
                                  <span style={{ background: "white", padding: "3px 6px", borderRadius: "3px", fontWeight: "500", color: "#312e81" }}>
                                    {locationStats.postalCodes} PIN{locationStats.postalCodes !== 1 ? 's' : ''}
                                  </span>
                                  <span style={{ background: "white", padding: "3px 6px", borderRadius: "3px", fontWeight: "500", color: "#312e81" }}>
                                    {locationStats.cities} Cit{locationStats.cities !== 1 ? 'ies' : 'y'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {plants.length === 0 ? (
                              <div style={{ textAlign: "center", padding: "20px", background: "white", border: "1px dashed #d1d5db", borderRadius: "6px", fontSize: "10px", color: "#6b7280" }}>
                                <Factory size={24} style={{ margin: "0 auto 6px", color: "#d1d5db" }} />
                                <div style={{ fontWeight: "500" }}>No plants registered</div>
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {plants.map(plant => {
                                  const isPlantExpanded = expandedPlants.has(plant.id);
                                  
                                  return (
                                    <div key={plant.id} style={{ border: "1px solid #e0e0e0", borderRadius: "6px", overflow: "hidden", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
                                      {/* Plant Header */}
                                      <div 
                                        onClick={() => togglePlant(plant.id)}
                                        style={{ background: "#e0e7ff", padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #c7d2fe" }}
                                      >
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                                          <Factory size={14} style={{ color: "#6366f1" }} />
                                          <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", flexWrap: "wrap" }}>
                                              <span style={{ fontSize: "11px", fontWeight: "600", color: "#1e293b" }}>{plant.plant_name}</span>
                                              <span style={{ fontSize: "8px", background: "#6366f1", color: "white", padding: "2px 5px", borderRadius: "3px", fontFamily: "monospace", fontWeight: "bold" }}>
                                                {plant.plant_code}
                                              </span>
                                              <span style={{ fontSize: "7px", background: "white", color: "#6366f1", padding: "2px 4px", borderRadius: "3px", fontFamily: "monospace", border: "1px solid #c7d2fe" }}>
                                                ID: #{plant.id}
                                              </span>
                                            </div>
                                            <div style={{ fontSize: "9px", color: "#475569" }}>
                                              <span style={{ color: "#64748b" }}>Type:</span> <strong style={{ color: "#6366f1" }}>{plant.plant_type?.type_name || 'Not Set'}</strong>
                                              {plant.primary_location && (
                                                <span style={{ marginLeft: "8px" }}>
                                                  <MapPin size={9} style={{ display: "inline", marginRight: "2px" }} />
                                                  {plant.primary_location.city}, {plant.primary_location.state}
                                                  <span style={{ marginLeft: "4px", background: "#6366f1", color: "white", padding: "1px 4px", borderRadius: "2px", fontSize: "8px", fontFamily: "monospace" }}>
                                                    {plant.primary_location.postal_code}
                                                  </span>
                                                </span>
                                              )}
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", fontSize: "8px" }}>
                                              {plant.emails && plant.emails.length > 0 && (
                                                <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 5px", borderRadius: "3px", display: "flex", alignItems: "center", gap: "2px" }}>
                                                  <Mail size={8} />
                                                  {plant.emails.length}
                                                </span>
                                              )}
                                              {plant.phones && plant.phones.length > 0 && (
                                                <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 5px", borderRadius: "3px", display: "flex", alignItems: "center", gap: "2px" }}>
                                                  <Phone size={8} />
                                                  {plant.phones.length}
                                                </span>
                                              )}
                                              {plant.total_locations > 0 && (
                                                <span style={{ background: "#fed7aa", color: "#9a3412", padding: "2px 5px", borderRadius: "3px", display: "flex", alignItems: "center", gap: "2px" }}>
                                                  <MapPin size={8} />
                                                  {plant.total_locations}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleDelete('plant', plant.id, plant.plant_name); }}
                                            style={{ padding: "4px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center" }}
                                          >
                                            <Trash2 size={11} style={{ color: "#dc2626" }} />
                                          </button>
                                          {isPlantExpanded ? <ChevronDown size={14} style={{ color: "#6366f1" }} /> : <ChevronRight size={14} style={{ color: "#6366f1" }} />}
                                        </div>
                                      </div>

                                      {/* Plant Details */}
                                      {isPlantExpanded && (
                                        <div style={{ padding: "10px", background: "#f9fafb" }}>
                                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", fontSize: "9px" }}>
                                            
                                            {/* Contact Information */}
                                            <div>
                                              <div style={{ fontWeight: "600", marginBottom: "6px", fontSize: "9px", color: "#000", borderBottom: "1px solid #e0e0e0", paddingBottom: "3px" }}>
                                                <Mail size={9} style={{ display: "inline", marginRight: "3px" }} />
                                                Plant Contacts
                                              </div>
                                              
                                              {plant.emails && plant.emails.length > 0 ? (
                                                <div style={{ marginBottom: "6px" }}>
                                                  <label style={{ ...s3, fontSize: "8px" }}>Email Addresses ({plant.emails.length})</label>
                                                  {plant.emails.map((e, idx) => {
                                                    const emailShare = getAllContactSharing(e.email, null);
                                                    return (
                                                      <div key={idx} style={{ background: "white", padding: "5px", borderRadius: "4px", marginBottom: "4px", borderLeft: "2px solid #3b82f6" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px", flexWrap: "wrap" }}>
                                                          <Mail size={8} style={{ color: "#3b82f6" }} />
                                                          <span style={{ fontSize: "8px", wordBreak: "break-all", flex: 1, color: "#000" }}>{e.email}</span>
                                                          {e.is_primary && (
                                                            <span style={{ fontSize: "7px", background: "#22c55e", color: "white", padding: "1px 4px", borderRadius: "2px", fontWeight: "bold" }}>PRIMARY</span>
                                                          )}
                                                        </div>
                                                        {emailShare.emailSharing && (emailShare.emailSharing.companies.length > 0 || emailShare.emailSharing.plants.length > 1) && (
                                                          <div style={{ marginTop: "3px", padding: "4px", background: "#fef3c7", borderLeft: "2px solid #f59e0b", borderRadius: "0 3px 3px 0" }}>
                                                            <div style={{ fontSize: "7px", fontWeight: "600", color: "#92400e", marginBottom: "2px", display: "flex", alignItems: "center", gap: "2px" }}>
                                                              <AlertTriangle size={7} />
                                                              SHARED EMAIL
                                                            </div>
                                                            {emailShare.emailSharing.companies.length > 0 && (
                                                              <div style={{ fontSize: "7px", color: "#78350f" }}>
                                                                <strong>Companies:</strong>
                                                                {emailShare.emailSharing.companies.map(c => (
                                                                  <div key={c.id} style={{ marginLeft: "6px" }}>• {c.name} ({c.code})</div>
                                                                ))}
                                                              </div>
                                                            )}
                                                            {emailShare.emailSharing.plants.filter(p => p.id !== plant.id).length > 0 && (
                                                              <div style={{ fontSize: "7px", color: "#78350f", marginTop: "2px" }}>
                                                                <strong>Other Plants:</strong>
                                                                {emailShare.emailSharing.plants.filter(p => p.id !== plant.id).map(p => (
                                                                  <div key={p.id} style={{ marginLeft: "6px" }}>• {p.name} ({p.code})</div>
                                                                ))}
                                                              </div>
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              ) : (
                                                <div style={{ fontSize: "8px", color: "#000", fontStyle: "italic", marginBottom: "6px" }}>No emails</div>
                                              )}

                                              {plant.phones && plant.phones.length > 0 ? (
                                                <div>
                                                  <label style={{ ...s3, fontSize: "8px" }}>Phone Numbers ({plant.phones.length})</label>
                                                  {plant.phones.map((p, idx) => {
                                                    const phoneShare = getAllContactSharing(null, p.phone);
                                                    return (
                                                      <div key={idx} style={{ background: "white", padding: "5px", borderRadius: "4px", marginBottom: "4px", borderLeft: "2px solid #22c55e" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px", flexWrap: "wrap" }}>
                                                          <Phone size={8} style={{ color: "#22c55e" }} />
                                                          <span style={{ fontSize: "9px", flex: 1, color: "#000" }}>{p.phone}</span>
                                                          {p.is_primary && (
                                                            <span style={{ fontSize: "7px", background: "#22c55e", color: "white", padding: "1px 4px", borderRadius: "2px", fontWeight: "bold" }}>PRIMARY</span>
                                                          )}
                                                        </div>
                                                        {phoneShare.phoneSharing && (phoneShare.phoneSharing.companies.length > 0 || phoneShare.phoneSharing.plants.length > 1) && (
                                                          <div style={{ marginTop: "3px", padding: "4px", background: "#fef3c7", borderLeft: "2px solid #f59e0b", borderRadius: "0 3px 3px 0" }}>
                                                            <div style={{ fontSize: "7px", fontWeight: "600", color: "#92400e", marginBottom: "2px", display: "flex", alignItems: "center", gap: "2px" }}>
                                                              <AlertTriangle size={7} />
                                                              SHARED PHONE
                                                            </div>
                                                            {phoneShare.phoneSharing.companies.length > 0 && (
                                                              <div style={{ fontSize: "7px", color: "#78350f" }}>
                                                                <strong>Companies:</strong>
                                                                {phoneShare.phoneSharing.companies.map(c => (
                                                                  <div key={c.id} style={{ marginLeft: "6px" }}>• {c.name} ({c.code})</div>
                                                                ))}
                                                              </div>
                                                            )}
                                                            {phoneShare.phoneSharing.plants.filter(pl => pl.id !== plant.id).length > 0 && (
                                                              <div style={{ fontSize: "7px", color: "#78350f", marginTop: "2px" }}>
                                                                <strong>Other Plants:</strong>
                                                                {phoneShare.phoneSharing.plants.filter(pl => pl.id !== plant.id).map(pl => (
                                                                  <div key={pl.id} style={{ marginLeft: "6px" }}>• {pl.name} ({pl.code})</div>
                                                                ))}
                                                              </div>
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              ) : (
                                                <div style={{ fontSize: "8px", color: "#000", fontStyle: "italic" }}>No phones</div>
                                              )}
                                            </div>

                                            {/* Location & Address */}
                                            <div>
                                              <div style={{ fontWeight: "600", marginBottom: "6px", fontSize: "9px", color: "#000", borderBottom: "1px solid #e0e0e0", paddingBottom: "3px" }}>
                                                <MapPin size={9} style={{ display: "inline", marginRight: "3px" }} />
                                                Location Details
                                              </div>
                                              
                                              {plant.primary_location ? (
                                                <div>
                                                  <div style={{ background: "white", padding: "6px", borderRadius: "4px", marginBottom: "6px", border: "1px solid #e0e0e0", fontSize: "8px" }}>
                                                    {plant.primary_location.country && <div style={{ marginBottom: "3px" }}><span style={{ color: "#6b7280" }}>Country:</span> <strong style={{ color: "#000" }}>{plant.primary_location.country}</strong></div>}
                                                    {plant.primary_location.state && <div style={{ marginBottom: "3px" }}><span style={{ color: "#6b7280" }}>State:</span> <strong style={{ color: "#000" }}>{plant.primary_location.state}</strong></div>}
                                                    {plant.primary_location.city && <div style={{ marginBottom: "3px" }}><span style={{ color: "#6b7280" }}>City:</span> <strong style={{ color: "#000" }}>{plant.primary_location.city}</strong></div>}
                                                    {plant.primary_location.area && <div style={{ marginBottom: "3px" }}><span style={{ color: "#6b7280" }}>Area:</span> <strong style={{ color: "#000" }}>{plant.primary_location.area}</strong></div>}
                                                    {plant.primary_location.postal_code && (
                                                      <div style={{ marginTop: "4px", paddingTop: "4px", borderTop: "1px solid #e0e0e0" }}>
                                                        <span style={{ background: "#6366f1", color: "white", padding: "2px 6px", borderRadius: "3px", fontSize: "8px", fontFamily: "monospace", fontWeight: "bold" }}>
                                                          PIN: {plant.primary_location.postal_code}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                  
                                                  {(plant.address_line1 || plant.address_line2 || plant.landmark) && (
                                                    <div style={{ background: "#f1f5f9", padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "8px" }}>
                                                      <div style={{ fontWeight: "600", marginBottom: "3px", color: "#000" }}>Detailed Address:</div>
                                                      {plant.address_line1 && <div style={{ marginBottom: "2px", color: "#000" }}>📍 {plant.address_line1}</div>}
                                                      {plant.address_line2 && <div style={{ marginBottom: "2px", color: "#000" }}>📍 {plant.address_line2}</div>}
                                                      {plant.landmark && (
                                                        <div style={{ marginTop: "3px", paddingTop: "3px", borderTop: "1px solid #cbd5e1", fontSize: "7px", color: "#000" }}>
                                                          <strong>Landmark:</strong> {plant.landmark}
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              ) : (
                                                <div style={{ fontSize: "8px", color: "#000", fontStyle: "italic" }}>No location</div>
                                              )}
                                            </div>

                                            {/* Plant Metadata */}
                                            <div>
                                              <div style={{ fontWeight: "600", marginBottom: "6px", fontSize: "9px", color: "#000", borderBottom: "1px solid #e0e0e0", paddingBottom: "3px" }}>
                                                <Hash size={9} style={{ display: "inline", marginRight: "3px" }} />
                                                Plant Metadata
                                              </div>
                                              
                                              <div style={{ background: "white", padding: "6px", borderRadius: "4px", marginBottom: "6px", border: "1px solid #e0e0e0" }}>
                                                <label style={{ ...s3, fontSize: "8px" }}>Identification</label>
                                                <div style={{ fontSize: "8px", marginBottom: "3px" }}>
                                                  <span style={{ color: "#6b7280" }}>Plant ID:</span> <strong style={{ fontFamily: "monospace", color: "#000" }}>#{plant.id}</strong>
                                                </div>
                                                <div style={{ fontSize: "8px", marginBottom: "3px" }}>
                                                  <span style={{ color: "#6b7280" }}>Plant Code:</span> <strong style={{ color: "#6366f1", fontFamily: "monospace" }}>{plant.plant_code}</strong>
                                                </div>
                                                <div style={{ fontSize: "8px" }}>
                                                  <span style={{ color: "#6b7280" }}>Type Code:</span> <strong style={{ fontFamily: "monospace", color: "#000" }}>{plant.plant_type?.type_code || 'N/A'}</strong>
                                                </div>
                                              </div>

                                              <div style={{ background: "white", padding: "6px", borderRadius: "4px", marginBottom: "6px", border: "1px solid #e0e0e0" }}>
                                                <label style={{ ...s3, fontSize: "8px" }}>Relationships</label>
                                                <div style={{ fontSize: "8px", marginBottom: "2px" }}>
                                                  <span style={{ color: "#6b7280" }}>Parent Company:</span>
                                                </div>
                                                <div style={{ fontSize: "9px", fontWeight: "600", color: "#1e40af" }}>{company.company_name}</div>
                                                <div style={{ fontSize: "7px", color: "#6b7280", fontFamily: "monospace", marginTop: "2px" }}>{company.company_code}</div>
                                              </div>

                                              <div style={{ background: "linear-gradient(to br, #dbeafe, #e0e7ff)", padding: "6px", borderRadius: "4px", border: "1px solid #bfdbfe" }}>
                                                <div style={{ fontSize: "8px", fontWeight: "600", color: "#1e40af", marginBottom: "4px" }}>📊 Quick Stats</div>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "8px" }}>
                                                  <div style={{ background: "white", padding: "4px", borderRadius: "3px" }}>
                                                    <div style={{ color: "#6b7280" }}>Emails</div>
                                                    <div style={{ fontWeight: "bold", color: "#3b82f6" }}>{plant.emails?.length || 0}</div>
                                                  </div>
                                                  <div style={{ background: "white", padding: "4px", borderRadius: "3px" }}>
                                                    <div style={{ color: "#6b7280" }}>Phones</div>
                                                    <div style={{ fontWeight: "bold", color: "#22c55e" }}>{plant.phones?.length || 0}</div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            plantTypes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", fontSize: "11px", color: "#666" }}>
                <div style={{ fontSize: "48px", marginBottom: "8px" }}>📋</div>
                <div style={{ fontWeight: "500" }}>No plant types found</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
                {plantTypes.map(type => {
                  const plantsWithType = data.plants.filter(p => p.plant_type?.id === type.id);
                  
                  return (
                    <div key={type.id} style={{ border: "1px solid #e0e0e0", borderRadius: "6px", overflow: "hidden", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05), 0 0 20px rgba(0,0,0,0.03) inset" }}>
                      <div style={{ background: "linear-gradient(to right, #4b5563, #60a5fa)", padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                            <FileText size={16} style={{ color: "white" }} />
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: "600", color: "white", marginBottom: "3px" }}>{type.type_name}</div>
                              <span style={{ fontSize: "8px", background: "rgba(255,255,255,0.25)", color: "white", padding: "2px 5px", borderRadius: "3px", fontFamily: "monospace" }}>
                                {type.type_code}
                              </span>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDelete('plantType', type.id, type.type_name)}
                            style={{ padding: "4px", background: "rgba(239,68,68,0.2)", border: "none", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center" }}
                          >
                            <Trash2 size={11} style={{ color: "white" }} />
                          </button>
                        </div>
                        <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Factory size={10} />
                          {plantsWithType.length} plant{plantsWithType.length !== 1 ? 's' : ''} using this type
                        </div>
                      </div>
                      
                      {type.description && (
                        <div style={{ padding: "8px 10px", background: "#f0fdf4", borderTop: "1px solid #bbf7d0", fontSize: "9px" }}>
                          <div style={{ fontWeight: "600", marginBottom: "3px", color: "#166534" }}>Description:</div>
                          <div style={{ color: "#15803d" }}>{type.description}</div>
                        </div>
                      )}

                      {plantsWithType.length > 0 && (
                        <div style={{ padding: "8px 10px", borderTop: "1px solid #e0e0e0" }}>
                          <div style={{ fontSize: "9px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Plants Using This Type:</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            {plantsWithType.map(plant => (
                              <div key={plant.id} style={{ fontSize: "8px", color: "#4b5563", display: "flex", alignItems: "center", gap: "4px", background: "#f9fafb", padding: "4px 6px", borderRadius: "3px", border: "1px solid #e5e7eb" }}>
                                <Factory size={9} style={{ color: "#6366f1", flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ fontWeight: "500" }}>{plant.plant_name}</span>
                                  <span style={{ color: "#6b7280", marginLeft: "4px", fontFamily: "monospace" }}>({plant.plant_code})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer — hidden in embeddedMode, parent AdminDashboard shows footer */}
        {!embeddedMode && (
        <div style={{ padding: "0px 12px", height: "16px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #4b5563, #60a5fa)", flexShrink: 0 }}></div>
        )}
      </div>
    </div>
  );
}