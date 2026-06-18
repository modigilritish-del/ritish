import React, { useState, useEffect } from 'react';
import { 
  Search, X, ChevronDown, AlertCircle, FileSpreadsheet, Shield, Building, 
  Users, Award, FileText, Lock, ChevronRight, Maximize2, BarChart3, PieChart,
  TrendingUp, Activity, Home
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = 'http://localhost:8000/api';
const COLORS = ['#3a7ca5', '#6a9aba', '#81b29a', '#f4a261', '#e76f51'];

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
        color: 'white'
      }}>
        <h3 style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: 'white' }}>{title}</h3>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '3px',
          cursor: 'pointer',
          padding: '3px 6px',
          display: 'flex',
          alignItems: 'center',
          color: 'white'
        }}>
          <X size={12} />
        </button>
      </div>
      <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
        {children}
      </div>
      <div style={{ height: '8px', borderTop: '2px solid #d1d5db', background: 'linear-gradient(to right, #60a5fa, #4b5563)' }} />
    </div>
  </div>
);

const RoleAccessForCompaniesPlantRightPanel = () => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [expandedChart, setExpandedChart] = useState(null);
  
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalRoles: 0,
    totalDepartments: 0,
    totalDesignations: 0,
    totalPages: 0,
    totalAccessGrants: 0
  });
  
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [pages, setPages] = useState([]);
  const [allAccesses, setAllAccesses] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [companiesRes, rolesRes, departmentsRes, designationsRes, pagesRes, accessesRes] = await Promise.all([
        fetch(`${API_BASE}/companies-for-plant`),
        fetch(`${API_BASE}/roles`),
        fetch(`${API_BASE}/departments`),
        fetch(`${API_BASE}/designations`),
        fetch(`${API_BASE}/rbac/pages`),
        fetch(`${API_BASE}/rbac/all-granted-access`)
      ]);

      if (!companiesRes.ok || !rolesRes.ok || !departmentsRes.ok || !designationsRes.ok || !pagesRes.ok) {
        throw new Error('Failed to fetch data from server');
      }

      const companiesData = await companiesRes.json();
      const rolesData = await rolesRes.json();
      const departmentsData = await departmentsRes.json();
      const designationsData = await designationsRes.json();
      const pagesData = await pagesRes.json();
      
      let accessesData = [];
      if (accessesRes.ok) {
        accessesData = await accessesRes.json();
      }

      setCompanies(companiesData);
      setRoles(rolesData);
      setDepartments(departmentsData);
      setDesignations(designationsData);
      setPages(pagesData);
      setAllAccesses(accessesData);

      setStats({
        totalCompanies: companiesData.length,
        totalRoles: rolesData.length,
        totalDepartments: departmentsData.length,
        totalDesignations: designationsData.length,
        totalPages: pagesData.length,
        totalAccessGrants: accessesData.filter(a => a.is_granted).length
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getCompanyAccessCount = (companyId) => {
    return allAccesses.filter(a => a.company_id === companyId && a.is_granted).length;
  };

  const getRoleAccessCount = (roleId) => {
    return allAccesses.filter(a => a.role_id === roleId && a.is_granted).length;
  };

  const getPageAccessCount = (pageId) => {
    return allAccesses.filter(a => a.page_id === pageId && a.is_granted).length;
  };

  const getCompanyDistributionData = () => {
    return companies.slice(0, 10).map(company => ({
      name: company.company_name.length > 25 ? company.company_name.substring(0, 25) + '...' : company.company_name,
      grants: getCompanyAccessCount(company.id),
      fullName: company.company_name
    })).sort((a, b) => b.grants - a.grants);
  };

  const getRoleDistributionData = () => {
    return roles.map(role => {
      const roleAccesses = allAccesses.filter(a => a.role_id === role.id && a.is_granted);
      return {
        name: role.role_name,
        grants: roleAccesses.length,
        companies: new Set(roleAccesses.map(a => a.company_id)).size,
        pages: new Set(roleAccesses.map(a => a.page_id)).size
      };
    }).sort((a, b) => b.grants - a.grants).slice(0, 8);
  };

  const getPagePopularityData = () => {
    return pages.map(page => ({
      name: page.page_name.length > 20 ? page.page_name.substring(0, 20) + '...' : page.page_name,
      accesses: getPageAccessCount(page.id),
      fullName: page.page_name
    })).sort((a, b) => b.accesses - a.accesses).slice(0, 12);
  };

  const getAccessByCategoryData = () => {
    const categoryCounts = {
      'Admin Master': 0,
      'Item Master': 0,
      'Analysis': 0,
      'Reports': 0,
      'User Management': 0,
      'Finance': 0,
      'OCR': 0,
      'Other': 0
    };

    pages.forEach(page => {
      const pageName = page.page_name.toLowerCase();
      const count = getPageAccessCount(page.id);
      
      if (pageName.includes('admin')) categoryCounts['Admin Master'] += count;
      else if (pageName.includes('item')) categoryCounts['Item Master'] += count;
      else if (pageName.includes('analysis')) categoryCounts['Analysis'] += count;
      else if (pageName.includes('report')) categoryCounts['Reports'] += count;
      else if (pageName.includes('user')) categoryCounts['User Management'] += count;
      else if (pageName.includes('finance') || pageName.includes('accounting')) categoryCounts['Finance'] += count;
      else if (pageName.includes('ocr')) categoryCounts['OCR'] += count;
      else categoryCounts['Other'] += count;
    });

    return Object.entries(categoryCounts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  };

  const getDepartmentDistribution = () => {
    return departments.map(dept => {
      const deptAccesses = allAccesses.filter(a => a.department_id === dept.id && a.is_granted);
      return {
        name: dept.department_name,
        grants: deptAccesses.length,
        roles: new Set(deptAccesses.map(a => a.role_id)).size
      };
    }).filter(d => d.grants > 0).sort((a, b) => b.grants - a.grants);
  };

  const getDesignationDistribution = () => {
    return designations.map(desg => {
      const desgAccesses = allAccesses.filter(a => a.designation_id === desg.id && a.is_granted);
      return {
        name: desg.designation_name,
        grants: desgAccesses.length
      };
    }).sort((a, b) => b.grants - a.grants);
  };

  const filteredCompanies = companies.filter(c => 
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRoles = roles.filter(r => 
    r.role_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPages = pages.filter(p => 
    p.page_name.toLowerCase().includes(searchTerm.toLowerCase())
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
        {/* Company Distribution Chart */}
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
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#1e3a8a' }}>Company Access</h4>
            </div>
            <button 
              onClick={() => setExpandedChart('company-dist')} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '2px',
                display: 'flex',
                color: '#2563eb'
              }}
            >
              <Maximize2 size={11} />
            </button>
          </div>
          <div style={{ padding: '6px', height: '130px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getCompanyDistributionData().slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 8, fill: '#374151' }} 
                  angle={-15}
                  textAnchor="end"
                  height={40}
                />
                <YAxis tick={{ fontSize: 8, fill: '#374151' }} />
                <Tooltip 
                  contentStyle={{ fontSize: 9, borderRadius: '4px', border: '1px solid #e5e7eb' }}
                  labelFormatter={(value, payload) => payload[0]?.payload?.fullName || value}
                />
                <Bar dataKey="grants" fill="#3a7ca5" radius={[4, 4, 0, 0]} name="Access Grants" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Role Distribution Chart */}
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
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={12} style={{ color: '#059669' }} />
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#065f46' }}>Role Access</h4>
            </div>
            <button 
              onClick={() => setExpandedChart('role-dist')} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '2px',
                display: 'flex',
                color: '#059669'
              }}
            >
              <Maximize2 size={11} />
            </button>
          </div>
          <div style={{ padding: '6px', height: '130px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getRoleDistributionData().slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 8, fill: '#374151' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={70} 
                  tick={{ fontSize: 8, fill: '#374151' }}
                />
                <Tooltip contentStyle={{ fontSize: 9, borderRadius: '4px', border: '1px solid #e5e7eb' }} />
                <Legend wrapperStyle={{ fontSize: 8 }} />
                <Bar dataKey="grants" fill="#81b29a" name="Grants" radius={[0, 4, 4, 0]} />
                <Bar dataKey="companies" fill="#f4a261" name="Companies" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Page Popularity Chart */}
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
            background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={12} style={{ color: '#7c3aed' }} />
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#5b21b6' }}>Top Pages</h4>
            </div>
            <button 
              onClick={() => setExpandedChart('page-pop')} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '2px',
                display: 'flex',
                color: '#7c3aed'
              }}
            >
              <Maximize2 size={11} />
            </button>
          </div>
          <div style={{ padding: '6px', height: '130px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getPagePopularityData().slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 7, fill: '#374151' }} 
                  angle={-25}
                  textAnchor="end"
                  height={45}
                />
                <YAxis tick={{ fontSize: 8, fill: '#374151' }} />
                <Tooltip 
                  contentStyle={{ fontSize: 9, borderRadius: '4px', border: '1px solid #e5e7eb' }}
                  labelFormatter={(value, payload) => payload[0]?.payload?.fullName || value}
                />
                <Line 
                  type="monotone" 
                  dataKey="accesses" 
                  stroke="#6a9aba" 
                  strokeWidth={2} 
                  name="Accesses" 
                  dot={{ r: 4, fill: "#3a7ca5" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Chart */}
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
              <PieChart size={12} style={{ color: '#d97706' }} />
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#92400e' }}>By Category</h4>
            </div>
            <button 
              onClick={() => setExpandedChart('category-dist')} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '2px',
                display: 'flex',
                color: '#d97706'
              }}
            >
              <Maximize2 size={11} />
            </button>
          </div>
          <div style={{ padding: '6px', height: '130px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie 
                  data={getAccessByCategoryData()} 
                  cx="50%" 
                  cy="50%" 
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius="60%" 
                  dataKey="value"
                  style={{ fontSize: 8, fill: '#1f2937' }}
                >
                  {getAccessByCategoryData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 9, borderRadius: '4px', border: '1px solid #e5e7eb' }} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution */}
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
            background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={12} style={{ color: '#0891b2' }} />
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#155e75' }}>Departments</h4>
            </div>
            <button 
              onClick={() => setExpandedChart('dept-dist')} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '2px',
                display: 'flex',
                color: '#0891b2'
              }}
            >
              <Maximize2 size={11} />
            </button>
          </div>
          <div style={{ padding: '6px', height: '130px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getDepartmentDistribution().slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 7, fill: '#374151' }} 
                  angle={-20}
                  textAnchor="end"
                  height={40}
                />
                <YAxis tick={{ fontSize: 8, fill: '#374151' }} />
                <Tooltip contentStyle={{ fontSize: 9, borderRadius: '4px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="grants" fill="#0891b2" radius={[4, 4, 0, 0]} name="Access Grants" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Designation Distribution */}
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
              <Award size={12} style={{ color: '#dc2626' }} />
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#991b1b' }}>Designations</h4>
            </div>
            <button 
              onClick={() => setExpandedChart('desg-dist')} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '2px',
                display: 'flex',
                color: '#dc2626'
              }}
            >
              <Maximize2 size={11} />
            </button>
          </div>
          <div style={{ padding: '6px', height: '130px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getDesignationDistribution()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 8, fill: '#374151' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={75} 
                  tick={{ fontSize: 7, fill: '#374151' }}
                />
                <Tooltip contentStyle={{ fontSize: 9, borderRadius: '4px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="grants" fill="#e76f51" name="Grants" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const CompaniesView = () => (
    <div style={{ padding: '8px', height: '100%' }}>
      <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Building size={12} style={{ color: '#3a7ca5' }} />
        Companies ({filteredCompanies.length})
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filteredCompanies.map(company => {
          const accessCount = getCompanyAccessCount(company.id);
          const companyRoles = roles.filter(r => 
            allAccesses.some(a => a.company_id === company.id && a.role_id === r.id)
          );
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
                  background: isExpanded ? '#f0f9ff' : 'white',
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
                    <Building size={12} style={{ color: 'white' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#111827', marginBottom: '1px' }}>{company.company_name}</div>
                    <div style={{ fontSize: '7px', color: '#6b7280' }}>{accessCount} access grants • {companyRoles.length} roles</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    padding: '2px 6px',
                    background: '#dbeafe',
                    borderRadius: '3px',
                    fontSize: '7px',
                    fontWeight: '700',
                    color: '#1e40af'
                  }}>
                    {accessCount}
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
                  <div style={{ fontSize: '8px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Roles with Access:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {companyRoles.length > 0 ? (
                      companyRoles.map(role => {
                        const roleAccesses = allAccesses.filter(a => 
                          a.company_id === company.id && a.role_id === role.id && a.is_granted
                        );
                        return (
                          <div key={role.id} style={{
                            padding: '4px 6px',
                            background: 'white',
                            borderRadius: '3px',
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Shield size={10} style={{ color: '#81b29a', flexShrink: 0 }} />
                              <span style={{ fontSize: '8px', color: '#374151' }}>{role.role_name}</span>
                            </div>
                            <span style={{
                              fontSize: '7px',
                              color: '#059669',
                              fontWeight: '700',
                              background: '#d1fae5',
                              padding: '2px 4px',
                              borderRadius: '2px'
                            }}>
                              {roleAccesses.length} pages
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: '8px', color: '#9ca3af', textAlign: 'center', padding: '6px' }}>
                        No roles found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
          <FileSpreadsheet size={28} style={{ margin: '0 auto 6px' }} />
          <div style={{ fontSize: '9px', fontWeight: '600' }}>No companies found</div>
        </div>
      )}
    </div>
  );

  const RolesView = () => (
    <div style={{ padding: '8px', height: '100%' }}>
      <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Shield size={12} style={{ color: '#81b29a' }} />
        Roles ({filteredRoles.length})
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filteredRoles.map(role => {
          const accessCount = getRoleAccessCount(role.id);
          const roleCompanies = companies.filter(c => 
            allAccesses.some(a => a.role_id === role.id && a.company_id === c.id)
          );
          const rolePages = pages.filter(p => 
            allAccesses.some(a => a.role_id === role.id && a.page_id === p.id && a.is_granted)
          );
          const isExpanded = expandedItems[`role-${role.id}`];
          const dept = departments.find(d => d.id === role.department_id);
          const desg = designations.find(d => d.id === role.designation_id);

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
                  background: isExpanded ? '#f0fdf4' : 'white',
                  borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '5px',
                    background: 'linear-gradient(135deg, #81b29a 0%, #a8c9b8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Shield size={12} style={{ color: 'white' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#111827', marginBottom: '1px' }}>{role.role_name}</div>
                    <div style={{ fontSize: '7px', color: '#6b7280' }}>
                      {dept?.department_name || 'N/A'} • {desg?.designation_name || 'N/A'}
                    </div>
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
                    {accessCount}
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
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '8px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Companies ({roleCompanies.length}):</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                      {roleCompanies.slice(0, 5).map(company => (
                        <span key={company.id} style={{
                          fontSize: '7px',
                          background: '#dbeafe',
                          color: '#1e40af',
                          padding: '2px 4px',
                          borderRadius: '2px',
                          fontWeight: '600'
                        }}>
                          {company.company_name}
                        </span>
                      ))}
                      {roleCompanies.length > 5 && (
                        <span style={{
                          fontSize: '7px',
                          background: '#f3f4f6',
                          color: '#6b7280',
                          padding: '2px 4px',
                          borderRadius: '2px',
                          fontWeight: '600'
                        }}>
                          +{roleCompanies.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '8px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Accessible Pages ({rolePages.length}):</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '120px', overflowY: 'auto' }}>
                      {rolePages.map(page => (
                        <div key={page.id} style={{
                          padding: '3px 4px',
                          background: 'white',
                          borderRadius: '2px',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <FileText size={9} style={{ color: '#7c3aed', flexShrink: 0 }} />
                          <span style={{ fontSize: '7px', color: '#374151', flex: 1 }}>{page.page_name}</span>
                          {page.category && (
                            <span style={{
                              fontSize: '6px',
                              background: '#f3f4f6',
                              color: '#6b7280',
                              padding: '1px 3px',
                              borderRadius: '2px'
                            }}>
                              {page.category}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredRoles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
          <Shield size={28} style={{ margin: '0 auto 6px' }} />
          <div style={{ fontSize: '9px', fontWeight: '600' }}>No roles found</div>
        </div>
      )}
    </div>
  );

  const PagesView = () => (
    <div style={{ padding: '8px', height: '100%' }}>
      <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <FileText size={12} style={{ color: '#7c3aed' }} />
        Pages ({filteredPages.length})
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filteredPages.map(page => {
          const accessCount = getPageAccessCount(page.id);
          const pageRoles = roles.filter(r => 
            allAccesses.some(a => a.page_id === page.id && a.role_id === r.id && a.is_granted)
          );
          const isExpanded = expandedItems[`page-${page.id}`];

          return (
            <div key={page.id} style={{ background: 'white', borderRadius: '5px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div 
                onClick={() => toggleExpand(`page-${page.id}`)}
                style={{
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: isExpanded ? '#faf5ff' : 'white',
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
                    <FileText size={12} style={{ color: 'white' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#111827', marginBottom: '1px' }}>{page.page_name}</div>
                    <div style={{ fontSize: '7px', color: '#6b7280' }}>
                      {page.category || 'Uncategorized'} • {page.route || 'No route'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    padding: '2px 6px',
                    background: '#f3e8ff',
                    borderRadius: '3px',
                    fontSize: '7px',
                    fontWeight: '700',
                    color: '#6b21a8'
                  }}>
                    {accessCount}
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
                  <div style={{ fontSize: '8px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Roles with Access ({pageRoles.length}):</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '120px', overflowY: 'auto' }}>
                    {pageRoles.length > 0 ? (
                      pageRoles.map(role => {
                        const dept = departments.find(d => d.id === role.department_id);
                        return (
                          <div key={role.id} style={{
                            padding: '4px 6px',
                            background: 'white',
                            borderRadius: '3px',
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
                              <Shield size={9} style={{ color: '#81b29a', flexShrink: 0 }} />
                              <span style={{ fontSize: '8px', color: '#374151' }}>{role.role_name}</span>
                            </div>
                            {dept && (
                              <span style={{
                                fontSize: '6px',
                                background: '#f3f4f6',
                                color: '#6b7280',
                                padding: '1px 3px',
                                borderRadius: '2px',
                                whiteSpace: 'nowrap'
                              }}>
                                {dept.department_name}
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: '8px', color: '#9ca3af', textAlign: 'center', padding: '6px' }}>
                        No roles have access
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredPages.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
          <FileText size={28} style={{ margin: '0 auto 6px' }} />
          <div style={{ fontSize: '9px', fontWeight: '600' }}>No pages found</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-blue-400 to-gray-700 text-white" style={{ height: '24px', paddingRight: '8px' }}>
        <h2 className="m-0 text-xs font-semibold">Role Access Management 🏢</h2>
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
          <Home size={11} />
          Home
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ padding: '6px 8px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
        <CompactStatCard 
          icon={Building} 
          title="Companies" 
          value={stats.totalCompanies} 
          color="#3a7ca5"
          onClick={() => setActiveView('companies')}
          isActive={activeView === 'companies'}
        />
        <CompactStatCard 
          icon={Shield} 
          title="Roles" 
          value={stats.totalRoles} 
          color="#81b29a"
          onClick={() => setActiveView('roles')}
          isActive={activeView === 'roles'}
        />
        <CompactStatCard 
          icon={Users} 
          title="Departments" 
          value={stats.totalDepartments} 
          color="#f4a261"
          onClick={() => setActiveView('overview')}
          isActive={activeView === 'overview'}
        />
        <CompactStatCard 
          icon={Award} 
          title="Designations" 
          value={stats.totalDesignations} 
          color="#dc2626"
          onClick={() => setActiveView('overview')}
          isActive={activeView === 'overview'}
        />
        <CompactStatCard 
          icon={FileText} 
          title="Pages" 
          value={stats.totalPages} 
          color="#7c3aed"
          onClick={() => setActiveView('pages')}
          isActive={activeView === 'pages'}
        />
        <CompactStatCard 
          icon={Lock} 
          title="Grants" 
          value={stats.totalAccessGrants} 
          color="#0891b2"
          onClick={() => setActiveView('overview')}
          isActive={activeView === 'overview'}
        />
      </div>

      {/* Search */}
      <div className="px-2.5 py-2 border-b border-gray-200">
        <div style={{ position: 'relative', width: '100%' }}>
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ 
              width: '100%', 
              padding: '6px 32px 6px 10px', 
              fontSize: '11px', 
              border: '1px solid #d1d5db', 
              borderRadius: '4px', 
              outline: 'none' 
            }} 
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
                alignItems: 'center', 
                color: '#6b7280' 
              }}
            >
              <X size={14} />
            </button>
          )}
          {!searchTerm && (
            <Search size={14} style={{ 
              position: 'absolute', 
              right: '8px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: '#9ca3af' 
            }} />
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
            {activeView === 'companies' && <CompaniesView />}
            {activeView === 'roles' && <RolesView />}
            {activeView === 'pages' && <PagesView />}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-gray-700 to-blue-400" style={{ height: '8px' }} />

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <ExpandedModal title={
          expandedChart === 'company-dist' ? 'Company Access Distribution' :
          expandedChart === 'role-dist' ? 'Role Access Distribution' :
          expandedChart === 'page-pop' ? 'Page Popularity Trend' :
          expandedChart === 'category-dist' ? 'Access by Category' :
          expandedChart === 'dept-dist' ? 'Department Distribution' :
          'Designation Distribution'
        } onClose={() => setExpandedChart(null)}>
          <ResponsiveContainer width="100%" height="100%">
            {expandedChart === 'company-dist' && (
              <BarChart data={getCompanyDistributionData()} margin={{ top: 10, right: 20, left: 20, bottom: 60 }}>
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
                  contentStyle={{ fontSize: 11 }}
                  labelFormatter={(value, payload) => payload[0]?.payload?.fullName || value}
                />
                <Bar dataKey="grants" fill="#3a7ca5" name="Access Grants" />
              </BarChart>
            )}
            {expandedChart === 'role-dist' && (
              <BarChart data={getRoleDistributionData()} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#374151' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 10, fill: '#374151' }}
                />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="grants" fill="#81b29a" name="Grants" />
                <Bar dataKey="companies" fill="#f4a261" name="Companies" />
                <Bar dataKey="pages" fill="#6a9aba" name="Pages" />
              </BarChart>
            )}
            {expandedChart === 'page-pop' && (
              <LineChart data={getPagePopularityData()} margin={{ top: 10, right: 20, left: 20, bottom: 60 }}>
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
                  contentStyle={{ fontSize: 11 }}
                  labelFormatter={(value, payload) => payload[0]?.payload?.fullName || value}
                />
                <Line 
                  type="monotone" 
                  dataKey="accesses" 
                  stroke="#6a9aba" 
                  strokeWidth={3} 
                  name="Accesses" 
                  dot={{ r: 4, fill: "#3a7ca5" }}
                />
              </LineChart>
            )}
            {expandedChart === 'category-dist' && (
              <RechartsPie>
                <Pie 
                  data={getAccessByCategoryData()} 
                  cx="50%" 
                  cy="50%" 
                  labelLine
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius="60%" 
                  dataKey="value"
                >
                  {getAccessByCategoryData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </RechartsPie>
            )}
            {expandedChart === 'dept-dist' && (
              <BarChart data={getDepartmentDistribution()} margin={{ top: 10, right: 20, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 10, fill: '#374151' }}
                />
                <YAxis tick={{ fontSize: 10, fill: '#374151' }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="grants" fill="#0891b2" name="Access Grants" />
                <Bar dataKey="roles" fill="#f59e0b" name="Unique Roles" />
              </BarChart>
            )}
            {expandedChart === 'desg-dist' && (
              <BarChart data={getDesignationDistribution()} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#374151' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 10, fill: '#374151' }}
                />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="grants" fill="#e76f51" name="Grants" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </ExpandedModal>
      )}
    </div>
  );
};

export default RoleAccessForCompaniesPlantRightPanel;
