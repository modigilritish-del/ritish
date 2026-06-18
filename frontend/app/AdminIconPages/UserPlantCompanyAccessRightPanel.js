import React, { useState, useEffect } from 'react';
import { 
  Search, X, ChevronDown, AlertCircle, FileSpreadsheet, Users, Building, 
  Factory, Award, Shield, FileText, ChevronRight, Maximize2, BarChart3, PieChart,
  TrendingUp, Activity, Home, User, Layers, Target, GitBranch, Globe
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = 'http://localhost:8000/api';
const COLORS = ['#3a7ca5', '#6a9aba', '#81b29a', '#f4a261', '#e76f51', '#dc2626', '#7c3aed', '#0891b2'];

// ==================== REUSABLE COMPONENTS ====================
const CompactStatCard = ({ icon: Icon, title, value, color, onClick, isActive }) => (
  <div 
    onClick={onClick}
    style={{
      background: isActive ? 'white' : '#f9fafb',
      padding: '6px 8px',
      borderRadius: '6px',
      border: `1.5px solid ${isActive ? color : '#e5e7eb'}`,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
      cursor: 'pointer',
      transition: 'all 0.2s',
      transform: isActive ? 'scale(1.02)' : 'scale(1)'
    }}
  >
    <div style={{
      width: '28px',
      height: '28px',
      borderRadius: '6px',
      background: `${color}${isActive ? '25' : '15'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}>
      <Icon size={16} style={{ color }} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600', marginBottom: '1px' }}>{title}</div>
      <div style={{ fontSize: '16px', fontWeight: '800', color: '#111827', lineHeight: '1' }}>{value}</div>
    </div>
  </div>
);

const ExpandedModal = ({ title, children, onClose }) => (
  <div 
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 999999,
      backgroundColor: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      pointerEvents: 'none'
    }}
  >
    <div style={{
      width: '40%',
      height: '50%',
      backgroundColor: 'white',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '8px',
      overflow: 'hidden',
      pointerEvents: 'auto'
    }}>
      <div style={{
        padding: '0 10px',
        height: '24px',
        borderBottom: '2px solid #d1d5db',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(to right, #4b5563, #60a5fa)',
        color: '#000000'
      }}>
        <h3 style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: '#000000' }}>{title}</h3>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '3px',
          cursor: 'pointer',
          padding: '3px 6px',
          display: 'flex',
          alignItems: 'center',
          color: '#000000'
        }}>
          <X size={12} />
        </button>
      </div>
      <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
        <div style={{ width: '100%', height: '100%' }}>
          {children}
        </div>
      </div>
      <div style={{ height: '8px', borderTop: '2px solid #d1d5db', background: 'linear-gradient(to right, #60a5fa, #4b5563)' }} />
    </div>
  </div>
);

const UserPlantCompanyAccessRightPanel = () => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [expandedChart, setExpandedChart] = useState(null);
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    totalPlants: 0,
    totalRoles: 0,
    totalDepartments: 0,
    totalDesignations: 0,
    totalUserAccesses: 0
  });
  
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [plants, setPlants] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [allAccesses, setAllAccesses] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching data from:', `${API_BASE}/users-with-accesses`);
      
      const [usersRes, companiesRes, plantsRes, rolesRes, depsRes, desgsRes] = await Promise.all([
        fetch(`${API_BASE}/users-with-accesses`),
        fetch(`${API_BASE}/companies-for-plant`),
        fetch(`${API_BASE}/plants`),
        fetch(`${API_BASE}/roles`),
        fetch(`${API_BASE}/departments`),
        fetch(`${API_BASE}/designations`)
      ]);

      if (!usersRes.ok || !companiesRes.ok || !plantsRes.ok || !rolesRes.ok || !depsRes.ok || !desgsRes.ok) {
        throw new Error('Failed to fetch data from server');
      }

      const usersData = await usersRes.json();
      const companiesData = await companiesRes.json();
      const plantsData = await plantsRes.json();
      const rolesData = await rolesRes.json();
      const depsData = await depsRes.json();
      const desgsData = await desgsRes.json();

      console.log('✅ RAW USERS DATA:', usersData);
      console.log('👤 First User:', usersData[0]);
      console.log('🔐 First User Accesses:', usersData[0]?.accesses);
      console.log('🏢 Total Users:', usersData.length);
      console.log('🏭 Total Companies:', companiesData.length);
      console.log('🏗️ Total Plants:', plantsData.length);

      setUsers(usersData);
      setCompanies(companiesData);
      setPlants(plantsData);
      setRoles(rolesData);
      setDepartments(depsData);
      setDesignations(desgsData);

      // Extract all user accesses
      const allUserAccesses = [];
      usersData.forEach(user => {
        console.log(`Processing user: ${user.full_name}, Accesses:`, user.accesses);
        if (user.accesses && Array.isArray(user.accesses)) {
          user.accesses.forEach(access => {
            console.log('  Access detail:', {
              company: access.company?.name || access.company?.company_name,
              role: access.role?.name || access.role?.role_name,
              department: access.department?.name || access.department?.department_name
            });
            allUserAccesses.push({
              ...access,
              user_id: user.id,
              user_name: user.full_name,
              user_email: user.email  // ✅ ADD EMAIL TO ACCESS DATA
            });
          });
        } else {
          console.warn(`⚠️ User ${user.full_name} has NO accesses or wrong format`);
        }
      });
      
      console.log('📊 All Accesses Count:', allUserAccesses.length);
      console.log('📊 All Accesses Array:', allUserAccesses);
      
      setAllAccesses(allUserAccesses);

      setStats({
        totalUsers: usersData.length,
        totalCompanies: companiesData.length,
        totalPlants: plantsData.length,
        totalRoles: rolesData.length,
        totalDepartments: depsData.length,
        totalDesignations: desgsData.length,
        totalUserAccesses: allUserAccesses.length
      });
      
      console.log('✅ Stats Updated:', {
        totalUsers: usersData.length,
        totalAccesses: allUserAccesses.length
      });

    } catch (error) {
      console.error('❌ ERROR fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getUserAccessCount = (userId) => {
    return allAccesses.filter(a => a.user_id === userId).length;
  };

  const getCompanyUserCount = (companyId) => {
    const userIds = new Set(allAccesses.filter(a => a.company?.id === companyId).map(a => a.user_id));
    return userIds.size;
  };

  const getPlantUserCount = (plantId) => {
    const userIds = new Set(allAccesses.filter(a => a.plant?.id === plantId).map(a => a.user_id));
    return userIds.size;
  };

  const getUserDistributionData = () => {
    const data = users.slice(0, 10).map(user => ({
      name: user.full_name.length > 15 ? user.full_name.substring(0, 15) + '...' : user.full_name,
      accesses: getUserAccessCount(user.id),
      companies: user.total_companies || 0,
      plants: user.total_plants || 0,
      fullName: user.full_name,
      email: user.email || 'N/A'
    })).sort((a, b) => b.accesses - a.accesses);
    
    console.log('📊 User Distribution Data:', data);
    console.log('👥 Total Users:', users.length);
    console.log('🔢 All Accesses Count:', allAccesses.length);
    
    return data;
  };

  const getCompanyDistributionData = () => {
    return companies.slice(0, 10).map(company => ({
      name: company.company_name.length > 15 ? company.company_name.substring(0, 15) + '...' : company.company_name,
      users: getCompanyUserCount(company.id),
      fullName: company.company_name,
      companyCode: company.company_code || 'N/A'
    })).sort((a, b) => b.users - a.users);
  };

  const getPlantDistributionData = () => {
    return plants.slice(0, 10).map(plant => ({
      name: plant.plant_name.length > 15 ? plant.plant_name.substring(0, 15) + '...' : plant.plant_name,
      users: getPlantUserCount(plant.id),
      fullName: plant.plant_name,
      company: companies.find(c => c.id === plant.company_id)?.company_name || 'Unknown',
      plantCode: plant.plant_code || 'N/A'
    })).sort((a, b) => b.users - a.users);
  };

  const getRoleDistributionData = () => {
    return roles.map(role => {
      const roleAccesses = allAccesses.filter(a => a.role?.id === role.id);
      return {
        name: role.role_name,
        users: new Set(roleAccesses.map(a => a.user_id)).size,
        companies: new Set(roleAccesses.map(a => a.company?.id)).size,
        plants: new Set(roleAccesses.map(a => a.plant?.id).filter(id => id)).size
      };
    }).sort((a, b) => b.users - a.users).slice(0, 8);
  };

  const getDepartmentDistributionData = () => {
    return departments.map(dept => {
      const deptAccesses = allAccesses.filter(a => a.department?.id === dept.id);
      return {
        name: dept.department_name,
        users: new Set(deptAccesses.map(a => a.user_id)).size,
        accesses: deptAccesses.length
      };
    }).filter(d => d.users > 0).sort((a, b) => b.users - a.users);
  };

  const getDesignationDistributionData = () => {
    return designations.map(desg => {
      const desgAccesses = allAccesses.filter(a => a.designation?.id === desg.id);
      return {
        name: desg.designation_name,
        users: new Set(desgAccesses.map(a => a.user_id)).size
      };
    }).filter(d => d.users > 0).sort((a, b) => b.users - a.users);
  };

  const getUserCompanyBreakdownData = () => {
    const breakdown = {};
    users.forEach(user => {
      const companyCount = user.total_companies || 0;
      const key = companyCount === 0 ? 'No Access' : 
                  companyCount === 1 ? '1 Company' :
                  companyCount <= 3 ? '2-3 Companies' :
                  companyCount <= 5 ? '4-5 Companies' : '6+ Companies';
      breakdown[key] = (breakdown[key] || 0) + 1;
    });
    return Object.entries(breakdown).map(([name, value]) => ({ name, value }));
  };

  // 🔥 NEW GRAPH 1: Company-wise Role-Dept-Desg Distribution
  const getCompanyRoleDeptDesgData = () => {
    const companyData = {};
    
    allAccesses.forEach(access => {
      const companyId = access.company?.id;
      const companyName = access.company?.name || 'Unknown';
      const roleDesgKey = `${access.role?.name || 'N/A'}/${access.department?.name || 'N/A'}/${access.designation?.name || 'N/A'}`;
      
      if (!companyData[companyId]) {
        companyData[companyId] = {
          companyName: companyName,
          combinations: {}
        };
      }
      
      if (!companyData[companyId].combinations[roleDesgKey]) {
        companyData[companyId].combinations[roleDesgKey] = new Set();
      }
      
      companyData[companyId].combinations[roleDesgKey].add(access.user_id);
    });

    // Convert to array format for chart
    const result = [];
    Object.values(companyData).forEach(company => {
      Object.entries(company.combinations).forEach(([combo, userSet]) => {
        result.push({
          company: company.companyName.length > 12 ? company.companyName.substring(0, 12) + '...' : company.companyName,
          combination: combo.length > 20 ? combo.substring(0, 20) + '...' : combo,
          users: userSet.size,
          fullCompany: company.companyName,
          fullCombo: combo
        });
      });
    });

    return result.sort((a, b) => b.users - a.users).slice(0, 10);
  };

  // 🔥 NEW GRAPH 2: Plant-wise User Distribution with Company
  const getPlantWiseUserData = () => {
    const plantData = plants.map(plant => {
      const plantAccesses = allAccesses.filter(a => a.plant?.id === plant.id);
      const uniqueUsers = new Set(plantAccesses.map(a => a.user_id)).size;
      const company = companies.find(c => c.id === plant.company_id);
      
      return {
        name: plant.plant_name.length > 15 ? plant.plant_name.substring(0, 15) + '...' : plant.plant_name,
        users: uniqueUsers,
        company: company?.company_name || 'Unknown',
        fullName: plant.plant_name,
        plantCode: plant.plant_code || 'N/A'
      };
    }).filter(p => p.users > 0).sort((a, b) => b.users - a.users).slice(0, 10);

    return plantData;
  };

  // 🔥 FIXED: Multi-Plant Users Across Companies - Ab data aayega!
  const getMultiPlantUsersData = () => {
    const userPlantMap = {};
    
    // ✅ FIX: Filter condition change - ab sirf plants > 1 check karenge
    allAccesses.forEach(access => {
      if (access.plant && access.plant.id) {
        if (!userPlantMap[access.user_id]) {
          userPlantMap[access.user_id] = {
            userName: access.user_name,
            userEmail: access.user_email,
            plants: new Set(),
            companies: new Set()
          };
        }
        userPlantMap[access.user_id].plants.add(access.plant.id);
        if (access.company?.id) {
          userPlantMap[access.user_id].companies.add(access.company.id);
        }
      }
    });

    // ✅ FIX: Ab sirf multiple plants wale users show karenge (companies constraint hataya)
    const multiPlantUsers = Object.entries(userPlantMap)
      .filter(([userId, data]) => data.plants.size > 1) // ✅ Removed companies.size > 1 constraint
      .map(([userId, data]) => ({
        name: data.userName.length > 15 ? data.userName.substring(0, 15) + '...' : data.userName,
        plants: data.plants.size,
        companies: data.companies.size,
        fullName: data.userName,
        email: data.userEmail || 'N/A'
      }))
      .sort((a, b) => b.plants - a.plants)
      .slice(0, 10);

    console.log('🔥 Multi-Plant Users Data:', multiPlantUsers); // Debug log
    return multiPlantUsers;
  };

  // 🔥 NEW GRAPH 4: Department + Role Distribution by Company
  const getDeptRoleByCompanyData = () => {
    const companyDeptRole = {};

    allAccesses.forEach(access => {
      const companyId = access.company?.id;
      const companyName = access.company?.name || 'Unknown';
      const dept = access.department?.name || 'N/A';
      const role = access.role?.name || 'N/A';

      if (!companyDeptRole[companyId]) {
        companyDeptRole[companyId] = {
          companyName: companyName,
          departments: new Set(),
          roles: new Set()
        };
      }

      companyDeptRole[companyId].departments.add(dept);
      companyDeptRole[companyId].roles.add(role);
    });

    return Object.values(companyDeptRole).map(c => ({
      name: c.companyName.length > 15 ? c.companyName.substring(0, 15) + '...' : c.companyName,
      departments: c.departments.size,
      roles: c.roles.size,
      fullName: c.companyName
    })).sort((a, b) => (b.departments + b.roles) - (a.departments + a.roles));
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompanies = companies.filter(c => 
    c.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPlants = plants.filter(p => 
    p.plant_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ==================== VIEW COMPONENTS ====================
  const OverviewView = () => (
    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
      {/* Chart Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '8px'
      }}>
        {/* Existing Chart 1: User Access Distribution */}
        <div style={{ 
          background: 'white', 
          borderRadius: '6px', 
          border: '1.5px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            padding: '6px 8px', 
            borderBottom: '1.5px solid #e5e7eb',
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <BarChart3 size={12} style={{ color: '#2563eb' }} />
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#1e3a8a' }}>User Access Distribution</h4>
            </div>
            <button 
              onClick={() => setExpandedChart('user-dist')} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Maximize2 size={10} style={{ color: '#2563eb' }} />
            </button>
          </div>
          <div style={{ height: '180px', padding: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getUserDistributionData()} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                  tick={{ fontSize: 8, fill: '#374151' }}
                />
                <YAxis tick={{ fontSize: 8, fill: '#374151' }} />
                <Tooltip 
                  contentStyle={{ fontSize: 9, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }}
                  labelFormatter={(value, payload) => {
                    const data = payload[0]?.payload;
                    return data?.email ? `${data.fullName || value} (${data.email})` : (data?.fullName || value);
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 8 }} />
                <Bar dataKey="accesses" fill="#3a7ca5" name="Accesses" />
                <Bar dataKey="companies" fill="#81b29a" name="Companies" />
                <Bar dataKey="plants" fill="#f4a261" name="Plants" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Existing Chart 2: Company User Count */}
        <div style={{ 
          background: 'white', 
          borderRadius: '6px', 
          border: '1.5px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            padding: '6px 8px', 
            borderBottom: '1.5px solid #e5e7eb',
            background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Building size={12} style={{ color: '#15803d' }} />
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#14532d' }}>Company User Count</h4>
            </div>
            <button 
              onClick={() => setExpandedChart('company-users')} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Maximize2 size={10} style={{ color: '#15803d' }} />
            </button>
          </div>
          <div style={{ height: '180px', padding: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getCompanyDistributionData()} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 8, fill: '#374151' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={80} 
                  tick={{ fontSize: 8, fill: '#374151' }}
                />
                <Tooltip 
                  contentStyle={{ fontSize: 9, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }}
                  labelFormatter={(value, payload) => {
                    const data = payload[0]?.payload;
                    return data?.companyCode ? `${data.fullName || value} (${data.companyCode})` : (data?.fullName || value);
                  }}
                />
                <Bar dataKey="users" fill="#81b29a" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Existing Chart 3: Role Distribution */}
        <div style={{ 
          background: 'white', 
          borderRadius: '6px', 
          border: '1.5px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            padding: '6px 8px', 
            borderBottom: '1.5px solid #e5e7eb',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={12} style={{ color: '#92400e' }} />
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#78350f' }}>Role Distribution</h4>
            </div>
            <button 
              onClick={() => setExpandedChart('role-dist')} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Maximize2 size={10} style={{ color: '#92400e' }} />
            </button>
          </div>
          <div style={{ height: '180px', padding: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getRoleDistributionData()} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 8, fill: '#374151' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={60} 
                  tick={{ fontSize: 8, fill: '#374151' }}
                />
                <Tooltip contentStyle={{ fontSize: 9, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }} />
                <Legend wrapperStyle={{ fontSize: 8 }} />
                <Bar dataKey="users" fill="#f4a261" name="Users" />
                <Bar dataKey="companies" fill="#81b29a" name="Companies" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Existing Chart 4: User-Company Breakdown */}
        <div style={{ 
          background: 'white', 
          borderRadius: '6px', 
          border: '1.5px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            padding: '6px 8px', 
            borderBottom: '1.5px solid #e5e7eb',
            background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <PieChart size={12} style={{ color: '#9f1239' }} />
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#831843' }}>User-Company Breakdown</h4>
            </div>
            <button 
              onClick={() => setExpandedChart('user-company-breakdown')} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Maximize2 size={10} style={{ color: '#9f1239' }} />
            </button>
          </div>
          <div style={{ height: '180px', padding: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie 
                  data={getUserCompanyBreakdownData()} 
                  cx="50%" 
                  cy="50%" 
                  labelLine
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius="50%" 
                  dataKey="value"
                  style={{ fontSize: '7px' }}
                >
                  {getUserCompanyBreakdownData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 9, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }} />
                <Legend wrapperStyle={{ fontSize: 8 }} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 🔥 NEW CHART 1: Company Role-Dept-Desg Combinations */}
        <div style={{ 
          background: 'white', 
          borderRadius: '6px', 
          border: '1.5px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            padding: '6px 8px', 
            borderBottom: '1.5px solid #e5e7eb',
            background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <GitBranch size={12} style={{ color: '#991b1b' }} />
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#7f1d1d' }}>Company Role-Dept-Desg</h4>
            </div>
            <button 
              onClick={() => setExpandedChart('company-role-dept')} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Maximize2 size={10} style={{ color: '#991b1b' }} />
            </button>
          </div>
          <div style={{ height: '180px', padding: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getCompanyRoleDeptDesgData()} margin={{ top: 5, right: 10, left: 10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="combination" 
                  angle={-45} 
                  textAnchor="end" 
                  height={70}
                  tick={{ fontSize: 7, fill: '#374151' }}
                />
                <YAxis tick={{ fontSize: 8, fill: '#374151' }} />
                <Tooltip 
                  contentStyle={{ fontSize: 9, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }}
                  labelFormatter={(value, payload) => {
                    const entry = payload[0]?.payload;
                    return entry ? `${entry.fullCompany}\n${entry.fullCombo}` : value;
                  }}
                />
                <Bar dataKey="users" fill="#dc2626" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 🔥 NEW CHART 2: Plant-wise User Distribution */}
        <div style={{ 
          background: 'white', 
          borderRadius: '6px', 
          border: '1.5px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            padding: '6px 8px', 
            borderBottom: '1.5px solid #e5e7eb',
            background: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Factory size={12} style={{ color: '#854d0e' }} />
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#713f12' }}>Plant-wise Users</h4>
            </div>
            <button 
              onClick={() => setExpandedChart('plant-users')} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Maximize2 size={10} style={{ color: '#854d0e' }} />
            </button>
          </div>
          <div style={{ height: '180px', padding: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getPlantWiseUserData()} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 8, fill: '#374151' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 8, fill: '#374151' }}
                />
                <Tooltip 
                  contentStyle={{ fontSize: 9, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }}
                  labelFormatter={(value, payload) => {
                    const entry = payload[0]?.payload;
                    return entry ? `${entry.fullName} (${entry.plantCode})\n${entry.company}` : value;
                  }}
                />
                <Bar dataKey="users" fill="#eab308" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 🔥 NEW CHART 3: Multi-Plant Users - FIXED VERSION */}
        <div style={{ 
          background: 'white', 
          borderRadius: '6px', 
          border: '1.5px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            padding: '6px 8px', 
            borderBottom: '1.5px solid #e5e7eb',
            background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Layers size={12} style={{ color: '#3730a3' }} />
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#312e81' }}>Multi-Plant Users</h4>
            </div>
            <button 
              onClick={() => setExpandedChart('multi-plant')} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Maximize2 size={10} style={{ color: '#3730a3' }} />
            </button>
          </div>
          <div style={{ height: '180px', padding: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getMultiPlantUsersData()} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                  tick={{ fontSize: 8, fill: '#374151' }}
                />
                <YAxis tick={{ fontSize: 8, fill: '#374151' }} />
                <Tooltip 
                  contentStyle={{ fontSize: 9, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }}
                  labelFormatter={(value, payload) => {
                    const data = payload[0]?.payload;
                    return data?.email ? `${data.fullName || value} (${data.email})` : (data?.fullName || value);
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 8 }} />
                <Bar dataKey="plants" fill="#6366f1" name="Plants" />
                <Bar dataKey="companies" fill="#818cf8" name="Companies" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 🔥 NEW CHART 4: Department + Role by Company */}
        <div style={{ 
          background: 'white', 
          borderRadius: '6px', 
          border: '1.5px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            padding: '6px 8px', 
            borderBottom: '1.5px solid #e5e7eb',
            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Target size={12} style={{ color: '#065f46' }} />
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#064e3b' }}>Dept + Role by Company</h4>
            </div>
            <button 
              onClick={() => setExpandedChart('dept-role-company')} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Maximize2 size={10} style={{ color: '#065f46' }} />
            </button>
          </div>
          <div style={{ height: '180px', padding: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getDeptRoleByCompanyData()} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                  tick={{ fontSize: 8, fill: '#374151' }}
                />
                <YAxis tick={{ fontSize: 8, fill: '#374151' }} />
                <Tooltip 
                  contentStyle={{ fontSize: 9, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }}
                  labelFormatter={(value, payload) => {
                    const data = payload[0]?.payload;
                    return data?.email ? `${data.fullName || value} (${data.email})` : (data?.fullName || value);
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 8 }} />
                <Bar dataKey="departments" fill="#10b981" name="Departments" />
                <Bar dataKey="roles" fill="#34d399" name="Roles" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const UsersView = () => (
    <div style={{ padding: '8px', height: '100%' }}>
      <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Users size={12} style={{ color: '#3a7ca5' }} />
        Users ({filteredUsers.length})
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filteredUsers.map(user => {
          const accessCount = getUserAccessCount(user.id);
          const userAccesses = allAccesses.filter(a => a.user_id === user.id);
          const isExpanded = expandedItems[`user-${user.id}`];

          return (
            <div key={user.id} style={{ background: 'white', borderRadius: '5px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div 
                onClick={() => toggleExpand(`user-${user.id}`)}
                style={{
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: isExpanded ? '#dbeafe' : 'white',
                  borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '5px',
                    background: 'linear-gradient(135deg, #3a7ca5 0%, #6a9aba 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <User size={12} style={{ color: 'white' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#111827', marginBottom: '1px' }}>{user.full_name}</div>
                    <div style={{ fontSize: '7px', color: '#6b7280' }}>{user.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    padding: '2px 6px',
                    background: '#dbeafe',
                    borderRadius: '3px',
                    fontSize: '7px',
                    fontWeight: '700',
                    color: '#1e3a8a'
                  }}>
                    {accessCount} accesses
                  </div>
                  <ChevronDown size={12} style={{ 
                    color: '#6b7280',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }} />
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '8px', background: '#fafafa' }}>
                  <div style={{ fontSize: '8px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Access Details ({accessCount}):</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {userAccesses.slice(0, 5).map((access, idx) => (
                      <div key={idx} style={{
                        fontSize: '7px',
                        background: 'white',
                        padding: '4px 6px',
                        borderRadius: '3px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ color: '#374151' }}>
                          <strong>Company:</strong> {access.company?.name || 'N/A'}
                          {access.plant && <> | <strong>Plant:</strong> {access.plant?.name}</>}
                        </div>
                        <div style={{ color: '#6b7280', marginTop: '2px' }}>
                          {access.role?.name} / {access.department?.name} / {access.designation?.name}
                        </div>
                      </div>
                    ))}
                    {userAccesses.length > 5 && (
                      <div style={{ fontSize: '7px', color: '#6b7280', fontStyle: 'italic' }}>
                        +{userAccesses.length - 5} more accesses
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
            <Users size={28} style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '9px', fontWeight: '600' }}>No users found</div>
          </div>
        )}
      </div>
    </div>
  );

  const CompaniesView = () => (
    <div style={{ padding: '8px', height: '100%' }}>
      <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Building size={12} style={{ color: '#81b29a' }} />
        Companies ({filteredCompanies.length})
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filteredCompanies.map(company => {
          const userCount = getCompanyUserCount(company.id);
          const companyUsers = [...new Set(allAccesses.filter(a => a.company?.id === company.id).map(a => a.user_id))];
          const isExpanded = expandedItems[`company-${company.id}`];

          return (
            <div key={company.id} style={{ background: 'white', borderRadius: '5px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div 
                onClick={() => toggleExpand(`company-${company.id}`)}
                style={{
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: isExpanded ? '#d1fae5' : 'white',
                  borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '5px',
                    background: 'linear-gradient(135deg, #81b29a 0%, #a5c9b5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Building size={12} style={{ color: 'white' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#111827', marginBottom: '1px' }}>{company.company_name}</div>
                    <div style={{ fontSize: '7px', color: '#6b7280' }}>{company.company_code}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    padding: '2px 6px',
                    background: '#d1fae5',
                    borderRadius: '3px',
                    fontSize: '7px',
                    fontWeight: '700',
                    color: '#065f46'
                  }}>
                    {userCount} users
                  </div>
                  <ChevronDown size={12} style={{ 
                    color: '#6b7280',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }} />
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '8px', background: '#fafafa' }}>
                  <div style={{ fontSize: '8px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Users with Access ({userCount}):</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {companyUsers.slice(0, 10).map(userId => {
                      const user = users.find(u => u.id === userId);
                      return user ? (
                        <span key={userId} style={{
                          fontSize: '7px',
                          background: '#d1fae5',
                          color: '#065f46',
                          padding: '2px 4px',
                          borderRadius: '2px',
                          fontWeight: '600'
                        }}>
                          {user.full_name}
                        </span>
                      ) : null;
                    })}
                    {companyUsers.length > 10 && (
                      <span style={{
                        fontSize: '7px',
                        background: '#f3f4f6',
                        color: '#6b7280',
                        padding: '2px 4px',
                        borderRadius: '2px',
                        fontWeight: '600'
                      }}>
                        +{companyUsers.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredCompanies.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
            <Building size={28} style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '9px', fontWeight: '600' }}>No companies found</div>
          </div>
        )}
      </div>
    </div>
  );

  // ✅ FIXED PlantsView - User name AND email visible
  const PlantsView = () => (
    <div style={{ padding: '8px', height: '100%' }}>
      <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Factory size={12} style={{ color: '#f4a261' }} />
        Plants ({filteredPlants.length})
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filteredPlants.map(plant => {
          const userCount = getPlantUserCount(plant.id);
          const plantUsers = [...new Set(allAccesses.filter(a => a.plant?.id === plant.id).map(a => a.user_id))];
          const isExpanded = expandedItems[`plant-${plant.id}`];
          
          // ✅ Company info fetch
          const plantCompany = companies.find(c => c.id === plant.company_id);

          return (
            <div key={plant.id} style={{ background: 'white', borderRadius: '5px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div 
                onClick={() => toggleExpand(`plant-${plant.id}`)}
                style={{
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: isExpanded ? '#fef3c7' : 'white',
                  borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '5px',
                    background: 'linear-gradient(135deg, #f4a261 0%, #f8b988 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Factory size={12} style={{ color: 'white' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#111827', marginBottom: '1px' }}>{plant.plant_name}</div>
                    <div style={{ fontSize: '7px', color: '#6b7280' }}>{plant.plant_code}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    padding: '2px 6px',
                    background: '#fef3c7',
                    borderRadius: '3px',
                    fontSize: '7px',
                    fontWeight: '700',
                    color: '#854d0e'
                  }}>
                    {userCount} users
                  </div>
                  <ChevronDown size={12} style={{ 
                    color: '#6b7280',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }} />
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '8px', background: '#fafafa' }}>
                  {/* ✅ Plant ka company info */}
                  {plantCompany && (
                    <div style={{ 
                      fontSize: '7px', 
                      fontWeight: '700', 
                      color: '#374151', 
                      marginBottom: '6px',
                      padding: '3px 6px',
                      background: '#e0e7ff',
                      borderRadius: '3px',
                      border: '1px solid #c7d2fe'
                    }}>
                      <Building size={9} style={{ display: 'inline', marginRight: '3px', color: '#4338ca' }} />
                      Company: {plantCompany.company_name} ({plantCompany.company_code})
                    </div>
                  )}
                  
                  <div style={{ fontSize: '8px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Users with Access ({userCount}):</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {plantUsers.slice(0, 10).map(userId => {
                      const user = users.find(u => u.id === userId);
                      const userAccess = allAccesses.find(a => a.user_id === userId && a.plant?.id === plant.id);
                      const userCompany = userAccess?.company;
                      
                      return user ? (
                        <div key={userId} style={{
                          fontSize: '7px',
                          background: '#fef3c7',
                          color: '#854d0e',
                          padding: '3px 5px',
                          borderRadius: '3px',
                          fontWeight: '600',
                          border: '1px solid #fde68a',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1px'
                        }}>
                          {/* ✅ User name - VISIBLE */}
                          <span style={{ fontWeight: '700' }}>{user.full_name}</span>
                          {/* ✅ User email - NOW VISIBLE */}
                          <span style={{ 
                            fontSize: '6px', 
                            color: '#92400e',
                            fontWeight: '500'
                          }}>
                            {user.email}
                          </span>
                          {/* Company info */}
                          {userCompany && (
                            <span style={{ 
                              fontSize: '6px', 
                              color: '#92400e',
                              fontWeight: '500',
                              fontStyle: 'italic'
                            }}>
                              {userCompany.name}
                            </span>
                          )}
                        </div>
                      ) : null;
                    })}
                    {plantUsers.length > 10 && (
                      <span style={{
                        fontSize: '7px',
                        background: '#f3f4f6',
                        color: '#6b7280',
                        padding: '2px 4px',
                        borderRadius: '2px',
                        fontWeight: '600'
                      }}>
                        +{plantUsers.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredPlants.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
            <Factory size={28} style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '9px', fontWeight: '600' }}>No plants found</div>
          </div>
        )}
      </div>
    </div>
  );

  // ==================== ROLES VIEW ====================
  const RolesView = () => (
    <div style={{ padding: '8px', height: '100%' }}>
      <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Shield size={12} style={{ color: '#e76f51' }} />
        Roles ({roles.length})
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {roles.map(role => {
          const roleAccesses = allAccesses.filter(a => a.role?.id === role.id);
          const roleUsers = [...new Set(roleAccesses.map(a => a.user_id))];
          const isExpanded = expandedItems[`role-${role.id}`];
          
          return (
            <div key={role.id} style={{ background: 'white', borderRadius: '5px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div 
                onClick={() => toggleExpand(`role-${role.id}`)}
                style={{
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: isExpanded ? '#fee2e2' : 'white',
                  borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '5px',
                    background: 'linear-gradient(135deg, #e76f51 0%, #f4a261 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Shield size={12} style={{ color: 'white' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#111827' }}>{role.role_name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    padding: '2px 6px',
                    background: '#fee2e2',
                    borderRadius: '3px',
                    fontSize: '7px',
                    fontWeight: '700',
                    color: '#991b1b'
                  }}>
                    {roleUsers.length} users
                  </div>
                  <ChevronDown size={12} style={{ 
                    color: '#6b7280',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }} />
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '8px', background: '#fafafa' }}>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '4px',
                    fontSize: '7px',
                    color: '#374151'
                  }}>
                    {roleUsers.slice(0, 20).map(userId => {
                      const user = users.find(u => u.id === userId);
                      const userAccess = roleAccesses.find(a => a.user_id === userId);
                      const userCompany = companies.find(c => c.id === userAccess?.company?.id);
                      
                      return user ? (
                        <div key={userId} style={{
                          background: 'white',
                          padding: '4px 6px',
                          borderRadius: '3px',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1px'
                        }}>
                          <span style={{ fontWeight: '700' }}>{user.full_name}</span>
                          <span style={{ fontSize: '6px', color: '#991b1b', fontWeight: '500' }}>{user.email}</span>
                          {userCompany && (
                            <span style={{ fontSize: '6px', color: '#991b1b', fontWeight: '500', fontStyle: 'italic' }}>
                              {userCompany.company_name} ({userCompany.company_code})
                            </span>
                          )}
                        </div>
                      ) : null;
                    })}
                    {roleUsers.length > 20 && (
                      <span style={{
                        fontSize: '7px',
                        background: '#f3f4f6',
                        color: '#6b7280',
                        padding: '2px 4px',
                        borderRadius: '2px',
                        fontWeight: '600'
                      }}>
                        +{roleUsers.length - 20} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {roles.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
            <Shield size={28} style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '9px', fontWeight: '600' }}>No roles found</div>
          </div>
        )}
      </div>
    </div>
  );

  // ==================== DEPARTMENTS VIEW ====================
  const DepartmentsView = () => (
    <div style={{ padding: '8px', height: '100%' }}>
      <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Layers size={12} style={{ color: '#dc2626' }} />
        Departments ({departments.length})
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {departments.map(dept => {
          const deptAccesses = allAccesses.filter(a => a.department?.id === dept.id);
          const deptUsers = [...new Set(deptAccesses.map(a => a.user_id))];
          const isExpanded = expandedItems[`dept-${dept.id}`];
          
          return (
            <div key={dept.id} style={{ background: 'white', borderRadius: '5px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div 
                onClick={() => toggleExpand(`dept-${dept.id}`)}
                style={{
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: isExpanded ? '#fef2f2' : 'white',
                  borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '5px',
                    background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Layers size={12} style={{ color: 'white' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#111827' }}>{dept.department_name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    padding: '2px 6px',
                    background: '#fef2f2',
                    borderRadius: '3px',
                    fontSize: '7px',
                    fontWeight: '700',
                    color: '#991b1b'
                  }}>
                    {deptUsers.length} users
                  </div>
                  <ChevronDown size={12} style={{ 
                    color: '#6b7280',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }} />
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '8px', background: '#fafafa' }}>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '4px',
                    fontSize: '7px',
                    color: '#374151'
                  }}>
                    {deptUsers.slice(0, 20).map(userId => {
                      const user = users.find(u => u.id === userId);
                      const userAccess = deptAccesses.find(a => a.user_id === userId);
                      const userCompany = companies.find(c => c.id === userAccess?.company?.id);
                      const userRole = roles.find(r => r.id === userAccess?.role?.id);
                      
                      return user ? (
                        <div key={userId} style={{
                          background: 'white',
                          padding: '4px 6px',
                          borderRadius: '3px',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1px'
                        }}>
                          <span style={{ fontWeight: '700' }}>{user.full_name}</span>
                          <span style={{ fontSize: '6px', color: '#991b1b', fontWeight: '500' }}>{user.email}</span>
                          {userCompany && (
                            <span style={{ fontSize: '6px', color: '#991b1b', fontWeight: '500' }}>
                              {userCompany.company_name} ({userCompany.company_code})
                            </span>
                          )}
                          {userRole && (
                            <span style={{ fontSize: '6px', color: '#059669', fontWeight: '500', fontStyle: 'italic' }}>
                              Role: {userRole.role_name}
                            </span>
                          )}
                        </div>
                      ) : null;
                    })}
                    {deptUsers.length > 20 && (
                      <span style={{
                        fontSize: '7px',
                        background: '#f3f4f6',
                        color: '#6b7280',
                        padding: '2px 4px',
                        borderRadius: '2px',
                        fontWeight: '600'
                      }}>
                        +{deptUsers.length - 20} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {departments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
            <Layers size={28} style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '9px', fontWeight: '600' }}>No departments found</div>
          </div>
        )}
      </div>
    </div>
  );

  // ==================== DESIGNATIONS VIEW ====================
  const DesignationsView = () => (
    <div style={{ padding: '8px', height: '100%' }}>
      <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Award size={12} style={{ color: '#7c3aed' }} />
        Designations ({designations.length})
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {designations.map(desg => {
          const desgAccesses = allAccesses.filter(a => a.designation?.id === desg.id);
          const desgUsers = [...new Set(desgAccesses.map(a => a.user_id))];
          const isExpanded = expandedItems[`desg-${desg.id}`];
          
          return (
            <div key={desg.id} style={{ background: 'white', borderRadius: '5px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div 
                onClick={() => toggleExpand(`desg-${desg.id}`)}
                style={{
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: isExpanded ? '#f5f3ff' : 'white',
                  borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '5px',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Award size={12} style={{ color: 'white' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#111827' }}>{desg.designation_name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    padding: '2px 6px',
                    background: '#f5f3ff',
                    borderRadius: '3px',
                    fontSize: '7px',
                    fontWeight: '700',
                    color: '#5b21b6'
                  }}>
                    {desgUsers.length} users
                  </div>
                  <ChevronDown size={12} style={{ 
                    color: '#6b7280',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }} />
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '8px', background: '#fafafa' }}>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '4px',
                    fontSize: '7px',
                    color: '#374151'
                  }}>
                    {desgUsers.slice(0, 20).map(userId => {
                      const user = users.find(u => u.id === userId);
                      const userAccess = desgAccesses.find(a => a.user_id === userId);
                      const userCompany = companies.find(c => c.id === userAccess?.company?.id);
                      const userRole = roles.find(r => r.id === userAccess?.role?.id);
                      const userDept = departments.find(d => d.id === userAccess?.department?.id);
                      
                      return user ? (
                        <div key={userId} style={{
                          background: 'white',
                          padding: '4px 6px',
                          borderRadius: '3px',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1px'
                        }}>
                          <span style={{ fontWeight: '700' }}>{user.full_name}</span>
                          <span style={{ fontSize: '6px', color: '#5b21b6', fontWeight: '500' }}>{user.email}</span>
                          {userCompany && (
                            <span style={{ fontSize: '6px', color: '#5b21b6', fontWeight: '500' }}>
                              {userCompany.company_name} ({userCompany.company_code})
                            </span>
                          )}
                          {userRole && (
                            <span style={{ fontSize: '6px', color: '#059669', fontWeight: '500' }}>
                              Role: {userRole.role_name}
                            </span>
                          )}
                          {userDept && (
                            <span style={{ fontSize: '6px', color: '#dc2626', fontWeight: '500', fontStyle: 'italic' }}>
                              Dept: {userDept.department_name}
                            </span>
                          )}
                        </div>
                      ) : null;
                    })}
                    {desgUsers.length > 20 && (
                      <span style={{
                        fontSize: '7px',
                        background: '#f3f4f6',
                        color: '#6b7280',
                        padding: '2px 4px',
                        borderRadius: '2px',
                        fontWeight: '600'
                      }}>
                        +{desgUsers.length - 20} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {designations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
            <Award size={28} style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '9px', fontWeight: '600' }}>No designations found</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-blue-400 to-gray-700 text-white" style={{ height: '24px', paddingRight: '8px' }}>
        <h2 className="m-0 text-xs font-semibold">User Plant Company Access 👥</h2>
        <button 
          onClick={() => setActiveView('overview')}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '3px',
            cursor: 'pointer',
            padding: '3px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            color: 'white',
            fontSize: '8px',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          <Home size={10} />
          Overview
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        padding: '6px 8px', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: '5px',
        background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <CompactStatCard icon={Users} title="Users" value={stats.totalUsers} color="#3a7ca5" onClick={() => setActiveView('users')} isActive={activeView === 'users'} />
        <CompactStatCard icon={Building} title="Companies" value={stats.totalCompanies} color="#81b29a" onClick={() => setActiveView('companies')} isActive={activeView === 'companies'} />
        <CompactStatCard icon={Factory} title="Plants" value={stats.totalPlants} color="#f4a261" onClick={() => setActiveView('plants')} isActive={activeView === 'plants'} />
        <CompactStatCard icon={Shield} title="Roles" value={stats.totalRoles} color="#e76f51" onClick={() => setActiveView('roles')} isActive={activeView === 'roles'} />
        <CompactStatCard icon={Layers} title="Departments" value={stats.totalDepartments} color="#dc2626" onClick={() => setActiveView('departments')} isActive={activeView === 'departments'} />
        <CompactStatCard icon={Award} title="Designations" value={stats.totalDesignations} color="#7c3aed" onClick={() => setActiveView('designations')} isActive={activeView === 'designations'} />
        <CompactStatCard icon={FileText} title="Accesses" value={stats.totalUserAccesses} color="#0891b2" />
      </div>

      {/* Search Bar */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search users, companies, plants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '5px 8px 5px 28px',
              fontSize: '9px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={10} style={{ color: '#9ca3af' }} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "32px" }}>⏳</div>
            <div style={{ fontSize: "11px", color: "#666" }}>Loading data...</div>
          </div>
        ) : error ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "10px" }}>
            <AlertCircle size={40} style={{ color: "#ef4444" }} />
            <div style={{ fontSize: "12px", color: "#dc2626", fontWeight: "600" }}>Error</div>
            <div style={{ fontSize: "10px", color: "#7f1d1d", textAlign: "center", maxWidth: "400px", background: "#fee2e2", padding: "10px", borderRadius: "6px", border: "1px solid #fca5a5" }}>
              {error}
            </div>
          </div>
        ) : (
          <>
            {activeView === 'overview' && <OverviewView />}
            {activeView === 'users' && <UsersView />}
            {activeView === 'companies' && <CompaniesView />}
            {activeView === 'plants' && <PlantsView />}
            {activeView === 'roles' && <RolesView />}
            {activeView === 'departments' && <DepartmentsView />}
            {activeView === 'designations' && <DesignationsView />}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-gray-700 to-blue-400" style={{ height: '8px' }} />

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <ExpandedModal title={
          expandedChart === 'user-dist' ? 'User Access Distribution' :
          expandedChart === 'company-users' ? 'Company User Count' :
          expandedChart === 'role-dist' ? 'Role Distribution' :
          expandedChart === 'user-company-breakdown' ? 'User-Company Breakdown' :
          expandedChart === 'company-role-dept' ? 'Company Role-Dept-Desg Combinations' :
          expandedChart === 'plant-users' ? 'Plant-wise User Distribution' :
          expandedChart === 'multi-plant' ? 'Multi-Plant Users Across Companies' :
          expandedChart === 'dept-role-company' ? 'Department + Role Distribution by Company' :
          'Chart'
        } onClose={() => setExpandedChart(null)}>
          <ResponsiveContainer width="100%" height="100%">
            {expandedChart === 'user-dist' && (
              <BarChart data={getUserDistributionData()} margin={{ top: 10, right: 20, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 10, fill: '#374151' }}
                />
                <YAxis tick={{ fontSize: 10, fill: '#374151' }} />
                <Tooltip 
                  contentStyle={{ fontSize: 9, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }}
                  labelFormatter={(value, payload) => {
                    const data = payload[0]?.payload;
                    return data?.email ? `${data.fullName || value} (${data.email})` : (data?.fullName || value);
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="accesses" fill="#3a7ca5" name="Accesses" />
                <Bar dataKey="companies" fill="#81b29a" name="Companies" />
                <Bar dataKey="plants" fill="#f4a261" name="Plants" />
              </BarChart>
            )}
            {expandedChart === 'company-users' && (
              <BarChart data={getCompanyDistributionData()} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#374151' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 10, fill: '#374151' }}
                />
                <Tooltip 
                  contentStyle={{ fontSize: 9, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }}
                  labelFormatter={(value, payload) => {
                    const data = payload[0]?.payload;
                    return data?.companyCode ? `${data.fullName || value} (${data.companyCode})` : (data?.fullName || value);
                  }}
                />
                <Bar dataKey="users" fill="#81b29a" name="Users" />
              </BarChart>
            )}
            {expandedChart === 'role-dist' && (
              <BarChart data={getRoleDistributionData()} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#374151' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={80} 
                  tick={{ fontSize: 10, fill: '#374151' }}
                />
                <Tooltip contentStyle={{ fontSize: 11, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="users" fill="#f4a261" name="Users" />
                <Bar dataKey="companies" fill="#81b29a" name="Companies" />
              </BarChart>
            )}
            {expandedChart === 'user-company-breakdown' && (
              <RechartsPie>
                <Pie 
                  data={getUserCompanyBreakdownData()} 
                  cx="50%" 
                  cy="50%" 
                  labelLine
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius="60%" 
                  dataKey="value"
                >
                  {getUserCompanyBreakdownData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </RechartsPie>
            )}
            {expandedChart === 'company-role-dept' && (
              <BarChart data={getCompanyRoleDeptDesgData()} margin={{ top: 10, right: 20, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="combination" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  tick={{ fontSize: 9, fill: '#374151' }}
                />
                <YAxis tick={{ fontSize: 10, fill: '#374151' }} />
                <Tooltip contentStyle={{ fontSize: 11, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }} />
                <Bar dataKey="users" fill="#dc2626" name="Users" />
              </BarChart>
            )}
            {expandedChart === 'plant-users' && (
              <BarChart data={getPlantWiseUserData()} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#374151' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120} 
                  tick={{ fontSize: 10, fill: '#374151' }}
                />
                <Tooltip 
                  contentStyle={{ fontSize: 11, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }}
                  labelFormatter={(value, payload) => {
                    const entry = payload[0]?.payload;
                    return entry ? `${entry.fullName} (${entry.plantCode})\n${entry.company}` : value;
                  }}
                />
                <Bar dataKey="users" fill="#eab308" name="Users" />
              </BarChart>
            )}
            {expandedChart === 'multi-plant' && (
              <BarChart data={getMultiPlantUsersData()} margin={{ top: 10, right: 20, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 10, fill: '#374151' }}
                />
                <YAxis tick={{ fontSize: 10, fill: '#374151' }} />
                <Tooltip 
                  contentStyle={{ fontSize: 11, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }}
                  labelFormatter={(value, payload) => {
                    const data = payload[0]?.payload;
                    return data?.email ? `${data.fullName || value} (${data.email})` : (data?.fullName || value);
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="plants" fill="#6366f1" name="Plants" />
                <Bar dataKey="companies" fill="#818cf8" name="Companies" />
              </BarChart>
            )}
            {expandedChart === 'dept-role-company' && (
              <BarChart data={getDeptRoleByCompanyData()} margin={{ top: 10, right: 20, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 10, fill: '#374151' }}
                />
                <YAxis tick={{ fontSize: 10, fill: '#374151' }} />
                <Tooltip contentStyle={{ fontSize: 11, backgroundColor: "white", border: "1px solid #ccc", color: "#000000" }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="departments" fill="#10b981" name="Departments" />
                <Bar dataKey="roles" fill="#34d399" name="Roles" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </ExpandedModal>
      )}
    </div>
  );
};

export default UserPlantCompanyAccessRightPanel;
