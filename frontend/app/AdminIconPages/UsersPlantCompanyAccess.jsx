import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Key, Users, Building, Factory, UserCheck, X, Check, AlertCircle, Eye, EyeOff, Copy, CheckCircle, Save, Mail, Phone, Calendar, Shield, Briefcase, Award, Lock, TrendingUp, BarChart3 } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const UserPlantCompanyAccess = ({ embeddedMode = false }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  const [editingAccess, setEditingAccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [primaryCompanyInfo, setPrimaryCompanyInfo] = useState(null);
  const [userRoleInfo, setUserRoleInfo] = useState(null);

  // 🎯 SMART ACCESS STATE
  const [assignmentStatus, setAssignmentStatus] = useState(null);
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [availablePlants, setAvailablePlants] = useState([]);
  const [selectedPlants, setSelectedPlants] = useState([]);

  const [accessForm, setAccessForm] = useState({
    company_id: '',
    plant_ids: [],
    is_primary_plant: false
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchPrimaryCompanyInfo = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/primary-company`);
      const data = await res.json();
      setPrimaryCompanyInfo(data);
    } catch (err) {
      console.error('Error fetching primary company:', err);
    }
  };

  const fetchUserRoleInfo = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/role-info`);
      const data = await res.json();
      setUserRoleInfo(data);
    } catch (err) {
      console.error('Error fetching role info:', err);
    }
  };

  // 🎯 SMART ACCESS FUNCTIONS
  const fetchAssignmentStatus = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/assignment-status`);
      const data = await res.json();
      setAssignmentStatus(data);
    } catch (err) {
      console.error('Error fetching assignment status:', err);
    }
  };

  const fetchAvailableCompanies = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/available-companies-for-access`);
      const data = await res.json();
      setAvailableCompanies(data.available_companies || []);
    } catch (err) {
      console.error('Error fetching available companies:', err);
    }
  };

  const fetchAvailablePlants = async (userId, companyId) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/available-plants-for-company/${companyId}`);
      const data = await res.json();
      setAvailablePlants(data.available_plants || []);
    } catch (err) {
      console.error('Error fetching available plants:', err);
    }
  };

  const viewUserDetails = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`);
      const data = await res.json();
      setSelectedUser(data);
      setActiveTab('details');

      await fetchPrimaryCompanyInfo(userId);
      await fetchUserRoleInfo(userId);
      await fetchAssignmentStatus(userId);
      await fetchAvailableCompanies(userId);
    } catch (err) {
      alert('Error fetching user details');
    }
  };

  const handleResetPassword = async (userId) => {
    if (!confirm('Generate new password for this user?')) return;

    try {
      const res = await fetch(`${API_BASE}/users/${userId}/reset-password`, {
        method: 'POST'
      });

      const data = await res.json();

      if (res.ok) {
        setCredentials({
          full_name: selectedUser?.full_name || 'User',
          email: selectedUser?.email || '',
          user_login_id: selectedUser?.user_id || '',
          auto_generated_password: data.new_password
        });
        setActiveTab('credentials');
      }
    } catch (err) {
      alert('Error resetting password');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This will remove all their access.')) return;

    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchUsers();
        setSelectedUser(null);
        setActiveTab('list');
        alert('User deleted successfully');
      }
    } catch (err) {
      alert('Error deleting user');
    }
  };

  const handleDeleteAccess = async (accessId, isPrimary) => {
    if (isPrimary) {
      alert('❌ Cannot remove primary company access. Primary company is immutable and set at registration.');
      return;
    }

    if (!confirm('Remove this access for the user?')) return;

    try {
      const res = await fetch(`${API_BASE}/users/${selectedUser.id}/access/${accessId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('Access removed successfully');
        viewUserDetails(selectedUser.id);
      } else {
        const errorData = await res.json();
        alert(errorData.detail || 'Error removing access');
      }
    } catch (err) {
      alert('Error removing access');
    }
  };

  const handleAddNewAccess = () => {
    setEditingAccess({ isNew: true });
    setAccessForm({
      company_id: '',
      plant_ids: [],
      is_primary_plant: false
    });
    setSelectedPlants([]);
    setAvailablePlants([]);
  };

  const handleUpdatePrimaryPlant = async (newPrimaryPlantId) => {
    if (!confirm('Change primary plant? Primary plant can only be changed to plants within your primary company.')) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('new_primary_plant_id', newPrimaryPlantId);

    try {
      const res = await fetch(`${API_BASE}/users/${selectedUser.id}/update-primary-plant`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        alert('✅ ' + data.message + '\n\n📌 ' + data.note);
        viewUserDetails(selectedUser.id);
      } else {
        alert('❌ ' + (data.detail || 'Error updating primary plant'));
      }
    } catch (err) {
      alert('Error updating primary plant');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = async (companyId) => {
    setAccessForm({ ...accessForm, company_id: companyId, plant_ids: [] });
    setSelectedPlants([]);
    
    if (companyId && selectedUser) {
      await fetchAvailablePlants(selectedUser.id, companyId);
    }
  };

  const handlePlantToggle = (plantId) => {
    setSelectedPlants(prev => 
      prev.includes(plantId)
        ? prev.filter(id => id !== plantId)
        : [...prev, plantId]
    );
  };

  const handleSelectAllPlants = () => {
    if (selectedPlants.length === availablePlants.length) {
      setSelectedPlants([]);
    } else {
      setSelectedPlants(availablePlants.map(p => p.id));
    }
  };

  const handleBulkAddAccess = async () => {
    if (!accessForm.company_id || selectedPlants.length === 0) {
      alert('Please select at least one plant');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('company_id', accessForm.company_id);
    formData.append('plant_ids', JSON.stringify(selectedPlants));

    try {
      const res = await fetch(`${API_BASE}/users/${selectedUser.id}/bulk-add-access`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        alert(`✅ Successfully added ${data.added_count} plant access(es)!
        
${data.skipped_count > 0 ? `⚠️ ${data.skipped_count} already existed` : ''}

🔒 Using locked Role/Dept/Desg:
• Role: ${data.locked_values_used.role}
• Department: ${data.locked_values_used.department}
• Designation: ${data.locked_values_used.designation}`);
        
        setEditingAccess(null);
        viewUserDetails(selectedUser.id);
      } else {
        alert(data.detail || 'Error adding access');
      }
    } catch (err) {
      alert('Error adding access');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (percentage) => {
    if (percentage === 100) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const s1 = { width: "100%", padding: "4px 8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "11px", boxSizing: "border-box", color: "#333", backgroundColor: "#fff" };
  const s2 = { ...s1, cursor: "pointer" };
  const s3 = { display: "block", fontSize: "10px", fontWeight: "500", marginBottom: "3px", color: "#555" };

  return (
    <div style={embeddedMode ? { width: "100%", height: "100%", display: "flex", flexDirection: "column" } : { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "#f0f2f5" }}>
      <div style={embeddedMode ? { width: "100%", height: "100%", background: "white", display: "flex", flexDirection: "column", overflow: "hidden" } : { width: "95%", maxWidth: "1400px", height: "90%", maxHeight: "750px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {!embeddedMode && <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #4b5563, #60a5fa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>User Management - Smart Access Control 🎯</h2>
          </div>
        </div>}

        <div style={{ display: "flex", borderBottom: "1px solid #e0e0e0", background: "#f8f9fa", flexShrink: 0 }}>
          <button
            onClick={() => {
              setActiveTab('list');
              setSelectedUser(null);
              setEditingAccess(null);
            }}
            style={{ flex: 1, padding: "8px 12px", fontSize: "10px", fontWeight: "500", cursor: "pointer", border: "none", background: activeTab === 'list' ? 'white' : 'transparent', color: activeTab === 'list' ? '#000' : '#666', borderBottom: activeTab === 'list' ? '2px solid #60a5fa' : 'none' }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              <Users size={12} />
              All Users
            </div>
          </button>
          {activeTab === 'details' && selectedUser && (
            <button
              onClick={() => setActiveTab('details')}
              style={{ flex: 1, padding: "8px 12px", fontSize: "10px", fontWeight: "500", cursor: "pointer", border: "none", background: 'white', color: '#000', borderBottom: '2px solid #60a5fa' }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                <Eye size={12} />
                User Details & Access
              </div>
            </button>
          )}
          {activeTab === 'credentials' && credentials && (
            <button
              onClick={() => setActiveTab('credentials')}
              style={{ flex: 1, padding: "8px 12px", fontSize: "10px", fontWeight: "500", cursor: "pointer", border: "none", background: 'white', color: '#000', borderBottom: '2px solid #10b981' }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                <Key size={12} />
                New Credentials
              </div>
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>

          {activeTab === 'list' && (
            <div>
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#999" }} />
                  <input
                    type="text"
                    placeholder="Search by name, email, or user ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%", padding: "6px 6px 6px 32px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "11px" }}
                  />
                </div>
                <div style={{ fontSize: "10px", color: "#666", whiteSpace: "nowrap" }}>Total: {filteredUsers.length}</div>
              </div>

              {filteredUsers.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "11px", color: "#666" }}>
                  <div style={{ marginBottom: "10px", fontSize: "48px" }}>👥</div>
                  <div style={{ fontWeight: "500", marginBottom: "4px" }}>No users found</div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                    <thead>
                      <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                        <th style={{ padding: "8px", textAlign: "left", fontWeight: "600", color: "#000" }}>User Info</th>
                        <th style={{ padding: "8px", textAlign: "left", fontWeight: "600", color: "#000" }}>Contact</th>
                        <th style={{ padding: "8px", textAlign: "left", fontWeight: "600", color: "#000" }}>Access Summary</th>
                        <th style={{ padding: "8px", textAlign: "left", fontWeight: "600", color: "#000" }}>Status</th>
                        <th style={{ padding: "8px", textAlign: "right", fontWeight: "600", color: "#000" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} style={{ borderBottom: "1px solid #e9ecef" }}>
                          <td style={{ padding: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <div style={{ background: "linear-gradient(135deg, #4b5563, #60a5fa)", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "600" }}>
                                {user.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: "500", color: "#000" }}>{user.full_name}</div>
                                <div style={{ fontSize: "9px", color: "#666" }}>ID: {user.user_id}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                              <Mail size={10} style={{ color: "#60a5fa" }} />
                              <span style={{ color: "#000", fontSize: "10px" }}>{user.email}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Phone size={10} style={{ color: "#10b981" }} />
                              <span style={{ fontSize: "9px", color: "#666" }}>{user.phone}</span>
                            </div>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <Building size={10} style={{ color: "#60a5fa" }} />
                                <span style={{ color: "#000" }}>{user.total_companies} {user.total_companies === 1 ? 'Company' : 'Companies'}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <Factory size={10} style={{ color: "#10b981" }} />
                                <span style={{ color: "#000" }}>{user.total_plants} {user.total_plants === 1 ? 'Plant' : 'Plants'}</span>
                              </div>
                              {user.primary_company && (
                                <div style={{ fontSize: "9px", color: "#666", marginTop: "2px", display: "flex", alignItems: "center", gap: "2px" }}>
                                  <Lock size={8} style={{ color: "#ef4444" }} />
                                  Primary: {user.primary_company}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "8px" }}>
                            {user.is_active ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", padding: "2px 6px", borderRadius: "12px", fontSize: "9px", fontWeight: "500", background: "#d1fae5", color: "#065f46" }}>
                                <Check size={10} />
                                Active
                              </span>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", padding: "2px 6px", borderRadius: "12px", fontSize: "9px", fontWeight: "500", background: "#fee2e2", color: "#991b1b" }}>
                                <X size={10} />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                              <button
                                onClick={() => viewUserDetails(user.id)}
                                style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#60a5fa" }}
                                title="View & Manage Access"
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && selectedUser && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #e0e0e0", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ background: "linear-gradient(135deg, #4b5563, #60a5fa)", color: "white", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "600" }}>
                    {selectedUser.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "#000" }}>{selectedUser.full_name}</h2>
                    <p style={{ margin: 0, fontSize: "9px", color: "#666" }}>User ID: {selectedUser.user_id}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    onClick={() => handleResetPassword(selectedUser.id)}
                    style={{ padding: "4px 10px", border: "1px solid #f59e0b", background: "#fffbeb", cursor: "pointer", color: "#d97706", borderRadius: "4px", fontSize: "10px", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Key size={12} />
                    Reset Password
                  </button>
                  <button
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    style={{ padding: "4px 10px", border: "1px solid #ef4444", background: "#fef2f2", cursor: "pointer", color: "#dc2626", borderRadius: "4px", fontSize: "10px", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Trash2 size={12} />
                    Delete User
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setActiveTab('list');
                    }}
                    style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#666" }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* 🎯 ASSIGNMENT STATUS DASHBOARD */}
              {assignmentStatus && (
                <div style={{ marginBottom: "10px", background: "linear-gradient(135deg, #eff6ff, #dbeafe)", border: "2px solid #60a5fa", borderRadius: "6px", padding: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <BarChart3 size={14} style={{ color: "#2563eb" }} />
                    <h3 style={{ fontSize: "11px", fontWeight: "600", margin: 0, color: "#1e40af" }}>
                      📊 Assignment Status Dashboard
                    </h3>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "8px" }}>
                    <div style={{ background: "white", borderRadius: "6px", padding: "8px", textAlign: "center", border: "1px solid #bfdbfe" }}>
                      <div style={{ fontSize: "18px", fontWeight: "700", color: "#2563eb" }}>
                        {assignmentStatus.overall_stats.total_companies}
                      </div>
                      <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>Total Companies</div>
                    </div>
                    
                    <div style={{ background: "#d1fae5", borderRadius: "6px", padding: "8px", textAlign: "center", border: "1px solid #10b981" }}>
                      <div style={{ fontSize: "18px", fontWeight: "700", color: "#065f46" }}>
                        {assignmentStatus.overall_stats.fully_assigned_companies}
                      </div>
                      <div style={{ fontSize: "9px", color: "#047857", marginTop: "2px" }}>Fully Assigned</div>
                    </div>
                    
                    <div style={{ background: "#fef3c7", borderRadius: "6px", padding: "8px", textAlign: "center", border: "1px solid #f59e0b" }}>
                      <div style={{ fontSize: "18px", fontWeight: "700", color: "#92400e" }}>
                        {assignmentStatus.overall_stats.partially_assigned_companies}
                      </div>
                      <div style={{ fontSize: "9px", color: "#b45309", marginTop: "2px" }}>Partial</div>
                    </div>
                    
                    <div style={{ background: "#fee2e2", borderRadius: "6px", padding: "8px", textAlign: "center", border: "1px solid #ef4444" }}>
                      <div style={{ fontSize: "18px", fontWeight: "700", color: "#991b1b" }}>
                        {assignmentStatus.overall_stats.not_assigned_companies}
                      </div>
                      <div style={{ fontSize: "9px", color: "#dc2626", marginTop: "2px" }}>Not Assigned</div>
                    </div>
                  </div>

                  <div style={{ maxHeight: "120px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {assignmentStatus.company_assignments.map(company => (
                      <div 
                        key={company.company_id}
                        style={{ 
                          background: "white", 
                          borderRadius: "4px", 
                          padding: "6px", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "space-between",
                          border: company.is_fully_assigned ? "1px solid #10b981" : "1px solid #f59e0b"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1 }}>
                          <Building size={10} style={{ color: company.is_fully_assigned ? "#10b981" : "#f59e0b" }} />
                          <span style={{ fontSize: "9px", color: "#000", fontWeight: "500" }}>
                            {company.company_name}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ fontSize: "8px", color: "#666" }}>
                            {company.assigned_plants}/{company.total_plants} plants
                          </div>
                          <div 
                            style={{ 
                              fontSize: "10px", 
                              fontWeight: "700",
                              color: getStatusColor(company.assignment_percentage),
                              minWidth: "32px",
                              textAlign: "right"
                            }}
                          >
                            {company.assignment_percentage}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {userRoleInfo && (
                <div style={{ marginBottom: "10px", background: "#fef3c7", border: "2px solid #f59e0b", borderRadius: "6px", padding: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <Lock size={14} style={{ color: "#d97706" }} />
                    <h3 style={{ fontSize: "11px", fontWeight: "600", margin: 0, color: "#92400e" }}>
                      🔒 Role/Department/Designation (Immutable - Set at Registration)
                    </h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                        <Shield size={10} style={{ color: "#8b5cf6" }} />
                        <p style={{ fontSize: "9px", color: "#92400e", margin: 0, fontWeight: "600" }}>Role</p>
                      </div>
                      <p style={{ fontSize: "10px", color: "#000", fontWeight: "500", margin: 0 }}>{userRoleInfo.role.role_name}</p>
                      <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Code: {userRoleInfo.role.role_code}</p>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                        <Briefcase size={10} style={{ color: "#f59e0b" }} />
                        <p style={{ fontSize: "9px", color: "#92400e", margin: 0, fontWeight: "600" }}>Department</p>
                      </div>
                      <p style={{ fontSize: "10px", color: "#000", fontWeight: "500", margin: 0 }}>{userRoleInfo.department.department_name}</p>
                      <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Code: {userRoleInfo.department.department_code}</p>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                        <Award size={10} style={{ color: "#ec4899" }} />
                        <p style={{ fontSize: "9px", color: "#92400e", margin: 0, fontWeight: "600" }}>Designation</p>
                      </div>
                      <p style={{ fontSize: "10px", color: "#000", fontWeight: "500", margin: 0 }}>{userRoleInfo.designation.designation_name}</p>
                      <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Code: {userRoleInfo.designation.designation_code}</p>
                    </div>
                  </div>
                  <div style={{ fontSize: "9px", color: "#991b1b", background: "#fef2f2", padding: "4px 6px", borderRadius: "4px", marginTop: "6px" }}>
                    ⚠️ These values are locked and cannot be changed - Set at user registration time
                  </div>
                </div>
              )}

              {primaryCompanyInfo && (
                <div style={{ marginBottom: "10px", background: "#fef2f2", border: "2px solid #ef4444", borderRadius: "6px", padding: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <Lock size={14} style={{ color: "#dc2626" }} />
                    <h3 style={{ fontSize: "11px", fontWeight: "600", margin: 0, color: "#991b1b" }}>
                      🔒 Primary Company (Immutable)
                    </h3>
                  </div>
                  <div style={{ fontSize: "10px", color: "#7f1d1d", marginBottom: "6px" }}>
                    <strong>{primaryCompanyInfo.primary_company.company_name}</strong> ({primaryCompanyInfo.primary_company.company_code})
                  </div>
                  <div style={{ fontSize: "9px", color: "#991b1b", background: "#fee2e2", padding: "4px 6px", borderRadius: "4px" }}>
                    ⚠️ Primary company cannot be changed - Set at registration
                  </div>
                  
                  {primaryCompanyInfo.available_plants_for_primary.length > 0 && (
                    <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #fca5a5" }}>
                      <div style={{ fontSize: "10px", fontWeight: "500", color: "#7f1d1d", marginBottom: "4px" }}>
                        ✅ Change Primary Plant (within primary company):
                      </div>
                      <select
                        value={primaryCompanyInfo.current_primary_plant?.plant_id || ''}
                        onChange={(e) => handleUpdatePrimaryPlant(parseInt(e.target.value))}
                        style={{ width: "100%", padding: "4px 6px", fontSize: "10px", border: "1px solid #fca5a5", borderRadius: "4px", background: "white" }}
                        disabled={loading}
                      >
                        {primaryCompanyInfo.available_plants_for_primary.map(p => (
                          <option key={p.plant_id} value={p.plant_id}>
                            {p.plant_name} - {p.plant_code} {p.is_primary ? '(Current Primary)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: "10px", background: "#f8f9fa", padding: "10px", borderRadius: "6px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                      <Mail size={10} style={{ color: "#60a5fa" }} />
                      <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Email</p>
                    </div>
                    <p style={{ fontSize: "10px", color: "#000", fontWeight: "500", margin: 0 }}>{selectedUser.email}</p>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                      <Phone size={10} style={{ color: "#10b981" }} />
                      <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Phone</p>
                    </div>
                    <p style={{ fontSize: "10px", color: "#000", fontWeight: "500", margin: 0 }}>{selectedUser.phone}</p>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                      <Calendar size={10} style={{ color: "#8b5cf6" }} />
                      <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Created</p>
                    </div>
                    <p style={{ fontSize: "10px", color: "#000", fontWeight: "500", margin: 0 }}>
                      {new Date(selectedUser.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                      <UserCheck size={10} style={{ color: selectedUser.is_active ? "#10b981" : "#ef4444" }} />
                      <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Status</p>
                    </div>
                    <p style={{ fontSize: "10px", color: selectedUser.is_active ? "#10b981" : "#ef4444", fontWeight: "500", margin: 0 }}>
                      {selectedUser.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <h3 style={{ fontSize: "11px", fontWeight: "600", margin: 0, color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px", flex: 1 }}>
                    Company & Plant Access Details
                  </h3>
                  <button
                    onClick={handleAddNewAccess}
                    style={{ padding: "4px 10px", background: "#4b5563", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Plus size={12} />
                    Add New Access
                  </button>
                </div>

                {editingAccess && (
                  <div style={{ background: "#fffbeb", border: "2px solid #f59e0b", borderRadius: "6px", padding: "12px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <h4 style={{ fontSize: "11px", fontWeight: "600", margin: 0, color: "#92400e" }}>
                        🎯 Add New Access (Smart Bulk Assignment)
                      </h4>
                      <button
                        onClick={() => setEditingAccess(null)}
                        style={{ padding: "2px", border: "none", background: "transparent", cursor: "pointer", color: "#92400e" }}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: "4px", padding: "6px", marginBottom: "10px", fontSize: "9px", color: "#92400e" }}>
                      <TrendingUp size={10} style={{ display: "inline", marginRight: "4px" }} />
                      <strong>Smart Filter:</strong> Only showing companies with pending plant assignments. Select multiple plants at once!
                    </div>

                    {availableCompanies.length === 0 ? (
                      <div style={{ background: "#d1fae5", border: "1px solid #10b981", borderRadius: "4px", padding: "10px", textAlign: "center" }}>
                        <CheckCircle size={20} style={{ color: "#065f46", marginBottom: "6px" }} />
                        <p style={{ fontSize: "10px", color: "#065f46", fontWeight: "600", margin: 0 }}>
                          ✅ All database companies/plants assigned!
                        </p>
                        <p style={{ fontSize: "9px", color: "#047857", margin: "4px 0 0 0" }}>
                          User has complete access to all available resources in the database.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom: "10px" }}>
                          <label style={s3}>
                            Select Company <span style={{ color: "#c00" }}>*</span>
                            <span style={{ fontSize: "8px", color: "#059669", marginLeft: "4px" }}>
                              ({availableCompanies.length} with pending plants)
                            </span>
                          </label>
                          <select
                            value={accessForm.company_id}
                            onChange={(e) => handleCompanyChange(parseInt(e.target.value))}
                            style={s2}
                          >
                            <option value="">Choose a company...</option>
                            {availableCompanies.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.company_name} - {c.pending_plants} pending plant(s)
                              </option>
                            ))}
                          </select>
                        </div>

                        {accessForm.company_id && availablePlants.length > 0 && (
                          <div style={{ marginBottom: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                              <label style={s3}>
                                Select Plants (Multiple Selection)
                                <span style={{ fontSize: "8px", color: "#059669", marginLeft: "4px" }}>
                                  ({availablePlants.length} available)
                                </span>
                              </label>
                              <button
                                onClick={handleSelectAllPlants}
                                style={{ padding: "2px 6px", fontSize: "9px", background: "#dbeafe", border: "1px solid #60a5fa", borderRadius: "4px", cursor: "pointer", color: "#1e40af" }}
                              >
                                {selectedPlants.length === availablePlants.length ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>
                            
                            <div style={{ border: "1px solid #e5e7eb", borderRadius: "4px", maxHeight: "200px", overflowY: "auto", background: "white" }}>
                              {availablePlants.map(plant => (
                                <label
                                  key={plant.id}
                                  style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "6px", 
                                    padding: "6px 8px", 
                                    cursor: "pointer",
                                    borderBottom: "1px solid #f3f4f6",
                                    background: selectedPlants.includes(plant.id) ? "#eff6ff" : "transparent",
                                    transition: "background 0.2s"
                                  }}
                                  onMouseEnter={(e) => !selectedPlants.includes(plant.id) && (e.currentTarget.style.background = "#f9fafb")}
                                  onMouseLeave={(e) => !selectedPlants.includes(plant.id) && (e.currentTarget.style.background = "transparent")}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedPlants.includes(plant.id)}
                                    onChange={() => handlePlantToggle(plant.id)}
                                    style={{ cursor: "pointer" }}
                                  />
                                  <Factory size={12} style={{ color: "#10b981" }} />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "10px", fontWeight: "500", color: "#000" }}>
                                      {plant.plant_name}
                                    </div>
                                    <div style={{ fontSize: "9px", color: "#666" }}>
                                      {plant.plant_code} • {plant.plant_type?.type_name}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>

                            <div style={{ marginTop: "8px", padding: "6px 8px", background: "#eff6ff", borderRadius: "4px", fontSize: "9px", color: "#1e40af" }}>
                              📝 {selectedPlants.length} of {availablePlants.length} plants selected
                            </div>
                          </div>
                        )}

                        {accessForm.company_id && availablePlants.length === 0 && (
                          <div style={{ padding: "10px", textAlign: "center", background: "#d1fae5", borderRadius: "4px", border: "1px solid #10b981" }}>
                            <CheckCircle size={16} style={{ color: "#065f46", marginBottom: "4px" }} />
                            <p style={{ fontSize: "9px", color: "#065f46", margin: 0 }}>
                              ✅ All plants already assigned for this company!
                            </p>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                          <button
                            onClick={handleBulkAddAccess}
                            disabled={loading || selectedPlants.length === 0}
                            style={{ 
                              padding: "6px 14px", 
                              background: loading || selectedPlants.length === 0 ? "#d1d5db" : "#10b981", 
                              border: "none", 
                              borderRadius: "4px", 
                              fontSize: "10px", 
                              fontWeight: "500", 
                              cursor: loading || selectedPlants.length === 0 ? "not-allowed" : "pointer", 
                              color: "white", 
                              display: "flex", 
                              alignItems: "center", 
                              gap: "4px" 
                            }}
                          >
                            <Save size={12} />
                            {loading ? 'Adding...' : `Add ${selectedPlants.length} Access(es)`}
                          </button>
                          <button
                            onClick={() => setEditingAccess(null)}
                            style={{ padding: "6px 14px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "#4b5563" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selectedUser.accesses.map((access) => (
                    <div key={access.id} style={{ background: access.is_primary_company ? "#fef2f2" : "#f8f9fa", padding: "10px", borderRadius: "6px", border: access.is_primary_company ? "2px solid #ef4444" : "1px solid #e0e0e0" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr 1.5fr 1.5fr auto", gap: "10px", alignItems: "center" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                            <Building size={10} style={{ color: access.is_primary_company ? "#dc2626" : "#60a5fa" }} />
                            <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Company</p>
                            {access.is_primary_company && <Lock size={8} style={{ color: "#dc2626" }} />}
                          </div>
                          <p style={{ fontSize: "10px", fontWeight: "500", color: "#000", margin: 0 }}>{access.company.name}</p>
                          <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Code: {access.company.code}</p>
                          {access.is_primary_company && (
                            <span style={{ display: "inline-block", marginTop: "2px", padding: "1px 4px", background: "#fee2e2", color: "#991b1b", fontSize: "8px", borderRadius: "6px", fontWeight: "600" }}>
                              🔒 PRIMARY (LOCKED)
                            </span>
                          )}
                        </div>

                        {access.plant ? (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                              <Factory size={10} style={{ color: "#10b981" }} />
                              <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Plant</p>
                            </div>
                            <p style={{ fontSize: "10px", fontWeight: "500", color: "#000", margin: 0 }}>{access.plant.name}</p>
                            <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Code: {access.plant.code}</p>
                            {access.is_primary_plant && (
                              <span style={{ display: "inline-block", marginTop: "2px", padding: "1px 4px", background: "#d1fae5", color: "#065f46", fontSize: "8px", borderRadius: "6px", fontWeight: "500" }}>
                                PRIMARY
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                              <Factory size={10} style={{ color: "#9ca3af" }} />
                              <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Plant</p>
                            </div>
                            <p style={{ fontSize: "10px", color: "#9ca3af", fontStyle: "italic", margin: 0 }}>Company Level</p>
                          </div>
                        )}

                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                            <Shield size={10} style={{ color: "#8b5cf6" }} />
                            <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Role</p>
                          </div>
                          <p style={{ fontSize: "10px", fontWeight: "500", color: "#000", margin: 0 }}>{access.role.name}</p>
                          <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>{access.role.code}</p>
                          <span style={{ display: "inline-block", marginTop: "2px", padding: "1px 4px", background: "#fef3c7", color: "#92400e", fontSize: "7px", borderRadius: "4px", fontWeight: "600" }}>
                            🔒 LOCKED
                          </span>
                        </div>

                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                            <Briefcase size={10} style={{ color: "#f59e0b" }} />
                            <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Department</p>
                          </div>
                          <p style={{ fontSize: "10px", fontWeight: "500", color: "#000", margin: 0 }}>{access.department.name}</p>
                          <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>{access.department.code}</p>
                          <span style={{ display: "inline-block", marginTop: "2px", padding: "1px 4px", background: "#fef3c7", color: "#92400e", fontSize: "7px", borderRadius: "4px", fontWeight: "600" }}>
                            🔒 LOCKED
                          </span>
                        </div>

                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                            <Award size={10} style={{ color: "#ec4899" }} />
                            <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Designation</p>
                          </div>
                          <p style={{ fontSize: "10px", fontWeight: "500", color: "#000", margin: 0 }}>{access.designation.name}</p>
                          <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>{access.designation.code}</p>
                          <span style={{ display: "inline-block", marginTop: "2px", padding: "1px 4px", background: "#fef3c7", color: "#92400e", fontSize: "7px", borderRadius: "4px", fontWeight: "600" }}>
                            🔒 LOCKED
                          </span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {!access.is_primary_company && (
                            <button
                              onClick={() => handleDeleteAccess(access.id, access.is_primary_company)}
                              style={{ padding: "4px 8px", border: "1px solid #ef4444", background: "#fef2f2", cursor: "pointer", color: "#dc2626", borderRadius: "4px", fontSize: "9px", display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}
                            >
                              <Trash2 size={10} />
                              Remove
                            </button>
                          )}
                          {access.is_primary_company && (
                            <div style={{ padding: "4px 8px", background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "4px", fontSize: "9px", color: "#991b1b", textAlign: "center", display: "flex", alignItems: "center", gap: "4px" }}>
                              <Lock size={10} />
                              Locked
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'credentials' && credentials && (
            <div>
              <div style={{ background: "linear-gradient(135deg, #d1fae5, #a7f3d0)", padding: "16px", borderRadius: "8px", border: "2px solid #10b981", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ background: "#10b981", padding: "6px", borderRadius: "8px" }}>
                    <CheckCircle style={{ color: "white" }} size={16} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "#065f46" }}>Password Reset Successfully!</h2>
                    <p style={{ margin: 0, fontSize: "9px", color: "#059669", marginTop: "2px" }}>Share these credentials securely with the user</p>
                  </div>
                </div>

                <div style={{ background: "white", borderRadius: "8px", padding: "12px" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", fontSize: "9px", fontWeight: "500", color: "#666", marginBottom: "4px" }}>Full Name</label>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8f9fa", padding: "6px 8px", borderRadius: "4px" }}>
                      <span style={{ fontSize: "10px", color: "#000", fontWeight: "500" }}>{credentials.full_name}</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", fontSize: "9px", fontWeight: "500", color: "#666", marginBottom: "4px" }}>Email</label>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8f9fa", padding: "6px 8px", borderRadius: "4px" }}>
                      <span style={{ fontSize: "10px", color: "#000", fontWeight: "500" }}>{credentials.email}</span>
                      <button
                        onClick={() => copyToClipboard(credentials.email)}
                        style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#60a5fa" }}
                        title="Copy Email"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", fontSize: "9px", fontWeight: "500", color: "#666", marginBottom: "4px" }}>User Login ID</label>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8f9fa", padding: "6px 8px", borderRadius: "4px" }}>
                      <span style={{ fontSize: "10px", color: "#000", fontWeight: "500" }}>{credentials.user_login_id}</span>
                      <button
                        onClick={() => copyToClipboard(credentials.user_login_id)}
                        style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#60a5fa" }}
                        title="Copy User ID"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", fontSize: "9px", fontWeight: "500", color: "#666", marginBottom: "4px" }}>New Password</label>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fef3c7", padding: "6px 8px", borderRadius: "4px", border: "1px solid #fbbf24" }}>
                      <span style={{ fontSize: "10px", color: "#000", fontFamily: "monospace", fontWeight: "600" }}>
                        {showPassword ? credentials.auto_generated_password : '••••••••••••'}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#d97706" }}
                          title={showPassword ? "Hide Password" : "Show Password"}
                        >
                          {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(credentials.auto_generated_password)}
                          style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#d97706" }}
                          title="Copy Password"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "12px", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "8px", padding: "8px" }}>
                  <div style={{ display: "flex", alignItems: "start", gap: "6px" }}>
                    <AlertCircle style={{ color: "#d97706", flexShrink: 0, marginTop: "1px" }} size={14} />
                    <div style={{ fontSize: "9px", color: "#92400e" }}>
                      <p style={{ fontWeight: "600", marginBottom: "4px" }}>Important:</p>
                      <ul style={{ listStyle: "disc", listStylePosition: "inside", margin: 0, padding: 0 }}>
                        <li>Share these credentials securely</li>
                        <li>User should change password after login</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <button
                  onClick={() => {
                    setCredentials(null);
                    setActiveTab('details');
                  }}
                  style={{ padding: "4px 14px", background: "rgba(75, 85, 99, 0.9)", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "white" }}
                >
                  Back to User Details
                </button>
              </div>
            </div>
          )}
        </div>

        {!embeddedMode && <div style={{ padding: "0px 12px", height: "16px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #60a5fa, #4b5563)", flexShrink: 0 }}></div>}
      </div>
    </div>
  );
};

export default UserPlantCompanyAccess;