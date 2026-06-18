//app/components/LeftMenuPannelWithPageAccess.js
"use client";
import { useState, useEffect } from "react";
import { Shield, CheckCircle, XCircle, Loader, AlertCircle, User, Building, Briefcase, ChevronRight, ChevronDown, RefreshCw } from "lucide-react";

const API_BASE = 'http://localhost:8000/api';

export default function LeftMenuPannelWithPageAccess() {
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    loadMenuData();
  }, []);

  const loadMenuData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(null);

      console.log('🔍 [VIEWER] Starting menu load...');

      const storedUser = sessionStorage.getItem('userData');
      console.log('📦 [VIEWER] Session userData:', storedUser ? 'Found' : 'Not Found');

      if (!storedUser) {
        setError('No user data found in session. Please login again.');
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(storedUser);
      console.log('📋 [VIEWER] Parsed data structure:', {
        hasUser: !!parsed?.user,
        userId: parsed?.user?.id,
        hasAccesses: !!parsed?.user?.accesses,
        accessesLength: parsed?.user?.accesses?.length
      });

      let user = parsed?.user;

      if (!user || !user.id) {
        setError('Invalid user data structure. User ID missing.');
        setDebugInfo({
          storedData: parsed,
          issue: 'user.id is missing'
        });
        setLoading(false);
        return;
      }

      if (!user.accesses || user.accesses.length === 0) {
        console.log('⚠️ [VIEWER] Accesses array missing/empty. Fetching from backend...');
        
        try {
          const userDetailsUrl = `${API_BASE}/users/${user.id}`;
          console.log('📡 [VIEWER] Fetching user details from:', userDetailsUrl);
          
          const userDetailsRes = await fetch(userDetailsUrl);
          
          if (userDetailsRes.ok) {
            const completeUserData = await userDetailsRes.json();
            console.log('✅ [VIEWER] Complete user data fetched:', completeUserData);
            
            user = completeUserData;
            
            parsed.user = completeUserData;
            sessionStorage.setItem('userData', JSON.stringify(parsed));
            console.log('💾 [VIEWER] Updated sessionStorage with complete user data');
          } else {
            console.error('❌ [VIEWER] Failed to fetch user details from backend');
          }
        } catch (fetchErr) {
          console.error('❌ [VIEWER] Error fetching user details:', fetchErr);
        }
      }

      console.log('👤 [VIEWER] User ID:', user.id);
      console.log('👤 [VIEWER] User Name:', user.full_name);
      console.log('📊 [VIEWER] User accesses array:', user.accesses);

      if (!user.accesses || user.accesses.length === 0) {
        setError('No company access found for this user. User has no accesses array or it is empty.');
        setDebugInfo({
          userId: user.id,
          userName: user.full_name,
          email: user.email,
          accessesArray: user.accesses,
          issue: 'accesses array is empty or missing',
          solution: 'Please register this user again through Add User page with proper company/role/dept/desg assignment'
        });
        setLoading(false);
        return;
      }

      console.log('🔍 [VIEWER] Total accesses found:', user.accesses.length);
      user.accesses.forEach((acc, idx) => {
        console.log(`   Access ${idx + 1}:`, {
          company: acc.company?.name,
          role: acc.role?.name,
          isPrimary: acc.is_primary_company
        });
      });

      const primaryAccess = user.accesses.find(acc => acc.is_primary_company) || user.accesses[0];
      
      if (!primaryAccess) {
        setError('No valid company access found.');
        setDebugInfo({
          userId: user.id,
          accessesCount: user.accesses.length,
          issue: 'No primary company marked and no fallback access'
        });
        setLoading(false);
        return;
      }

      console.log('🎯 [VIEWER] Primary Access:', {
        company: primaryAccess.company?.name,
        companyId: primaryAccess.company?.id,
        role: primaryAccess.role?.name,
        department: primaryAccess.department?.name,
        designation: primaryAccess.designation?.name
      });

      const primaryCompanyId = primaryAccess.company?.id;

      if (!primaryCompanyId) {
        setError('Primary company ID is missing in access data.');
        setDebugInfo({
          primaryAccess: primaryAccess,
          issue: 'company.id is missing in access object'
        });
        setLoading(false);
        return;
      }
      
      setUserInfo({
        name: user.full_name,
        email: user.email,
        userId: user.id,
        company: primaryAccess.company.name,
        companyId: primaryCompanyId,
        role: primaryAccess.role?.name || 'N/A',
        roleId: primaryAccess.role?.id,
        department: primaryAccess.department?.name || 'N/A',
        departmentId: primaryAccess.department?.id,
        designation: primaryAccess.designation?.name || 'N/A',
        designationId: primaryAccess.designation?.id
      });

      // ✅ FIX: Check sessionStorage first to avoid double API call
      const cachedMenu = sessionStorage.getItem('userMenu');
      if (cachedMenu) {
        console.log('✅ [VIEWER] Menu found in sessionStorage, skipping API call');
        const menuJson = JSON.parse(cachedMenu);
        if (menuJson.menu && menuJson.menu.length > 0) {
          setMenuData(menuJson);
          const allIds = new Set();
          const collectIds = (pages) => {
            pages.forEach(page => {
              if (page.children && page.children.length > 0) {
                allIds.add(page.id);
                collectIds(page.children);
              }
            });
          };
          collectIds(menuJson.menu);
          setExpandedCategories(allIds);
          setLoading(false);
          console.log('✅ [VIEWER] Menu loaded from cache with', menuJson.total_pages, 'pages');
          return;
        }
      }

      const menuUrl = `${API_BASE}/rbac/users/${user.id}/accessible-menu?company_id=${primaryCompanyId}`;
      console.log('📡 [VIEWER] Fetching menu from:', menuUrl);

      const menuRes = await fetch(menuUrl);
      
      if (!menuRes.ok) {
        const errorData = await menuRes.json();
        console.error('❌ [VIEWER] API Error:', errorData);
        setError(`API Error: ${errorData.detail || 'Failed to load menu'}`);
        setDebugInfo({
          apiUrl: menuUrl,
          statusCode: menuRes.status,
          errorResponse: errorData
        });
        setLoading(false);
        return;
      }

      const menuJson = await menuRes.json();
      console.log('✅ [VIEWER] Menu loaded:', menuJson);

      if (!menuJson.menu || menuJson.menu.length === 0) {
        setError('No pages accessible. This user has no page access granted.');
        setDebugInfo({
          userId: user.id,
          companyId: primaryCompanyId,
          roleId: primaryAccess.role?.id,
          departmentId: primaryAccess.department?.id,
          designationId: primaryAccess.designation?.id,
          totalPages: menuJson.total_pages,
          issue: 'No pages granted to this role/dept/desg combination',
          solution: 'Go to "Role Access Control" page and grant access to pages for this role/dept/desg combination'
        });
        setLoading(false);
        return;
      }

      setMenuData(menuJson);
      const allIds = new Set();
      const collectIds = (pages) => {
        pages.forEach(page => {
          if (page.children && page.children.length > 0) {
            allIds.add(page.id);
            collectIds(page.children);
          }
        });
      };
      collectIds(menuJson.menu);
      setExpandedCategories(allIds);
      
      setLoading(false);
      console.log('✅ [VIEWER] Menu loaded successfully with', menuJson.total_pages, 'pages');

    } catch (err) {
      console.error('❌ [VIEWER] Error:', err);
      setError(`Error: ${err.message}`);
      setDebugInfo({
        errorType: err.name,
        errorMessage: err.message,
        errorStack: err.stack
      });
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderPageTree = (pages, level = 0) => {
    return pages.map(page => {
      const hasChildren = page.children && page.children.length > 0;
      const isExpanded = expandedCategories.has(page.id);
      
      return (
        <div key={page.id} style={{ marginLeft: `${level * 16}px`, marginBottom: '6px' }}>
          <div 
            onClick={() => hasChildren && toggleCategory(page.id)}
            className="menu-item"
            style={{
              padding: '6px 8px',
              background: hasChildren ? '#f8fafc' : '#ffffff',
              borderRadius: '4px',
              border: `1px solid ${hasChildren ? '#cbd5e1' : '#e2e8f0'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: hasChildren ? 'pointer' : 'default',
              transition: 'all 0.15s ease'
            }}
          >
            {hasChildren && (
              <div style={{ flexShrink: 0 }}>
                {isExpanded ? (
                  <ChevronDown size={12} style={{ color: '#475569' }} />
                ) : (
                  <ChevronRight size={12} style={{ color: '#475569' }} />
                )}
              </div>
            )}
            
            <div style={{
              minWidth: '20px',
              height: '20px',
              background: hasChildren ? '#3b82f6' : '#10b981',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '8px',
              fontWeight: '700',
              flexShrink: 0
            }}>
              {page.id}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {page.page_name}
                {hasChildren && (
                  <span style={{
                    fontSize: '7px',
                    background: '#dbeafe',
                    color: '#1e40af',
                    padding: '1px 4px',
                    borderRadius: '2px',
                    fontWeight: '600'
                  }}>
                    CATEGORY
                  </span>
                )}
              </div>
              <div style={{ 
                fontSize: '8px', 
                color: '#64748b',
                fontFamily: 'monospace'
              }}>
                {page.page_url}
              </div>
            </div>

            {!hasChildren && page.permissions && page.permissions.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '2px',
                flexWrap: 'wrap'
              }}>
                {page.permissions.map(perm => (
                  <span key={perm} style={{
                    fontSize: '7px',
                    background: '#dbeafe',
                    color: '#1e40af',
                    padding: '1px 4px',
                    borderRadius: '2px',
                    fontWeight: '600'
                  }}>
                    {perm}
                  </span>
                ))}
              </div>
            )}
          </div>

          {hasChildren && isExpanded && page.children && (
            <div style={{ marginTop: '4px', paddingLeft: '8px', borderLeft: '1px solid #e2e8f0' }}>
              {renderPageTree(page.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '95%',
        maxWidth: '1200px',
        height: '90%',
        maxHeight: '700px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Compact Header */}
        <div style={{
          padding: '0px 12px',
          height: '32px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #4b5563, #60a5fa)',
          color: 'white',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={14} />
            <h2 style={{ margin: 0, fontSize: '12px', fontWeight: '600' }}>
              RBAC Menu Access Viewer
            </h2>
          </div>
          <button
            onClick={loadMenuData}
            disabled={loading}
            style={{
              padding: '4px 14px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: loading ? 0.5 : 1
            }}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <Loader size={32} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Loading menu data...</div>
          </div>
        ) : error ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '20px',
            overflow: 'auto'
          }}>
            <AlertCircle size={40} style={{ color: '#ef4444' }} />
            <div style={{ fontSize: '13px', color: '#dc2626', fontWeight: '700' }}>
              Error Loading Menu
            </div>
            <div style={{ 
              fontSize: '10px', 
              color: '#7f1d1d', 
              textAlign: 'center',
              maxWidth: '600px',
              lineHeight: '1.5',
              background: '#fee2e2',
              padding: '10px 12px',
              borderRadius: '4px',
              border: '1px solid #fecaca'
            }}>
              {error}
            </div>
            
            {debugInfo && (
              <div style={{
                background: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '4px',
                padding: '10px 12px',
                maxWidth: '700px',
                width: '100%'
              }}>
                <div style={{ fontSize: '9px', fontWeight: '700', color: '#92400e', marginBottom: '6px' }}>
                  🔍 Debug Information:
                </div>
                <pre style={{
                  fontSize: '8px',
                  color: '#78350f',
                  background: 'white',
                  padding: '8px',
                  borderRadius: '3px',
                  overflow: 'auto',
                  maxHeight: '150px',
                  fontFamily: 'monospace',
                  margin: 0
                }}>
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
            
            <button
              onClick={loadMenuData}
              style={{
                padding: '6px 14px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <RefreshCw size={12} />
              Retry Loading Menu
            </button>
          </div>
        ) : (
          <>
            {/* Compact Info Bar */}
            <div style={{
              padding: '8px 12px',
              background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              fontSize: '9px',
              flexShrink: 0
            }}>
              {userInfo && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} style={{ color: '#3b82f6' }} />
                    <span style={{ color: '#64748b' }}>User:</span>
                    <strong style={{ color: '#1e293b' }}>{userInfo.name}</strong>
                  </div>
                  <div style={{ width: '1px', height: '12px', background: '#cbd5e1' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building size={12} style={{ color: '#10b981' }} />
                    <span style={{ color: '#64748b' }}>Company:</span>
                    <strong style={{ color: '#1e293b' }}>{userInfo.company}</strong>
                  </div>
                  <div style={{ width: '1px', height: '12px', background: '#cbd5e1' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Briefcase size={12} style={{ color: '#f59e0b' }} />
                    <span style={{ color: '#64748b' }}>Role:</span>
                    <strong style={{ color: '#1e293b' }}>{userInfo.role}</strong>
                  </div>
                  <div style={{ width: '1px', height: '12px', background: '#cbd5e1' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#64748b' }}>Department:</span>
                    <strong style={{ color: '#1e293b' }}>{userInfo.department}</strong>
                  </div>
                  <div style={{ width: '1px', height: '12px', background: '#cbd5e1' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#64748b' }}>Designation:</span>
                    <strong style={{ color: '#1e293b' }}>{userInfo.designation}</strong>
                  </div>
                </>
              )}
              
              {menuData && (
                <>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: '#3b82f6' 
                      }} />
                      <span style={{ color: '#64748b' }}>Total Pages:</span>
                      <strong style={{ color: '#1e40af' }}>{menuData.total_pages}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: '#10b981' 
                      }} />
                      <span style={{ color: '#64748b' }}>Categories:</span>
                      <strong style={{ color: '#166534' }}>{menuData.menu?.length || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={12} style={{ color: '#10b981' }} />
                      <strong style={{ color: '#166534' }}>Access Granted</strong>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Menu Tree */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '12px 16px'
            }}>
              {menuData && menuData.menu && menuData.menu.length > 0 ? (
                <div>
                  <h3 style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: '10px',
                    paddingBottom: '6px',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    Menu Hierarchy
                  </h3>
                  {renderPageTree(menuData.menu)}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '30px 15px',
                  color: '#64748b'
                }}>
                  <XCircle size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                    No pages accessible
                  </div>
                  <div style={{ fontSize: '10px' }}>
                    Contact administrator to grant access to pages
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Compact Footer */}
        <div style={{
          padding: '0px 12px',
          height: '16px',
          borderTop: '1px solid #e0e0e0',
          background: 'linear-gradient(to right, #60a5fa, #4b5563)',
          flexShrink: 0
        }}></div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .menu-item:hover {
          background: #f1f5f9 !important;
          border-color: #94a3b8 !important;
        }
      `}</style>
    </div>
  );
}