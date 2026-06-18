import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const VendorMasterPage = () => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { fetchAccess(); }, []);

  const fetchAccess = async () => {
    try {
      setLoading(true); setError(null);
      console.log('🔍 [VENDOR MASTER] Fetching user accessible pages...');
      const storedUser = sessionStorage.getItem('userData');
      if (!storedUser) { setError('No user data found in session. Please login again.'); setLoading(false); return; }
      const parsed = JSON.parse(storedUser);
      let user = parsed?.user;
      if (!user || !user.id) { setError('Invalid user data structure. User ID missing.'); setLoading(false); return; }
      if (!user.accesses || user.accesses.length === 0) {
        console.log('⚡️ [VENDOR MASTER] Fetching user details from backend...');
        try {
          const userDetailsRes = await fetch(`${API_BASE}/users/${user.id}`);
          if (userDetailsRes.ok) { const completeUserData = await userDetailsRes.json(); user = completeUserData; parsed.user = completeUserData; sessionStorage.setItem('userData', JSON.stringify(parsed)); }
        } catch (err) { console.error('❌ [VENDOR MASTER] Failed to fetch user details:', err); }
      }
      if (!user.accesses || user.accesses.length === 0) { setError('No company access found for this user.'); setLoading(false); return; }
      const primaryAccess = user.accesses.find(acc => acc.is_primary_company) || user.accesses[0];
      const primaryCompanyId = primaryAccess.company?.id;
      if (!primaryCompanyId) { setError('Primary company ID is missing in access data.'); setLoading(false); return; }
      const menuUrl = `${API_BASE}/rbac/users/${user.id}/accessible-menu?company_id=${primaryCompanyId}`;
      console.log('📡 [VENDOR MASTER] Fetching menu from:', menuUrl);
      const menuRes = await fetch(menuUrl);
      if (!menuRes.ok) { const errorData = await menuRes.json(); console.error('❌ [VENDOR MASTER] API Error:', errorData); setError(`API Error: ${errorData.detail || 'Failed to load menu'}`); setLoading(false); return; }
      const menuJson = await menuRes.json();
      console.log('✅ [VENDOR MASTER] Menu loaded:', menuJson);
      if (!menuJson.menu || menuJson.menu.length === 0) { setError('No pages accessible. This user has no page access granted.'); setLoading(false); return; }
      const hasVendorAccess = checkVendorAccess(menuJson.menu);
      console.log('🎯 [VENDOR MASTER] Has access:', hasVendorAccess);
      if (!hasVendorAccess) { setError('No access to Vendor Master page. Contact administrator to grant access.'); setLoading(false); return; }
      setHasAccess(true); setLoading(false);
    } catch (err) { console.error('❌ [VENDOR MASTER] Error:', err); setError(`Error: ${err.message}`); setLoading(false); }
  };

  const checkVendorAccess = (menuPages) => {
    let hasAccess = false;
    const searchPages = (pages) => {
      pages.forEach(page => {
        if (page.page_name === 'Vendor Master' || page.page_name === 'Vendor') { hasAccess = true; }
        if (page.children && page.children.length > 0) { searchPages(page.children); }
      });
    };
    searchPages(menuPages);
    return hasAccess;
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      <div className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white" style={{ height: '24px', paddingRight: '8px' }}>
        <h2 className="m-0 text-xs font-semibold">Vendor Master 🏢</h2>
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "32px" }}>⏳</div>
            <div style={{ fontSize: "11px", color: "#666" }}>Loading accessible pages...</div>
          </div>
        ) : error ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "10px" }}>
            <AlertCircle size={40} style={{ color: "#ef4444" }} />
            <div style={{ fontSize: "12px", color: "#dc2626", fontWeight: "600" }}>Access Error</div>
            <div style={{ fontSize: "10px", color: "#7f1d1d", textAlign: "center", maxWidth: "400px", background: "#fee2e2", padding: "10px", borderRadius: "6px", border: "1px solid #fca5a5" }}>{error}</div>
          </div>
        ) : !hasAccess ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "48px" }}>🔒</div>
            <div style={{ fontSize: "12px", color: "#dc2626", fontWeight: "600" }}>No Access</div>
            <div style={{ fontSize: "10px", color: "#7f1d1d", textAlign: "center", maxWidth: "400px" }}>You don't have access to Vendor Master page. Please contact your administrator.</div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "48px" }}>🏢</div>
            <div style={{ fontSize: "14px", color: "#333", fontWeight: "600" }}>Vendor Master</div>
            <div style={{ fontSize: "11px", color: "#666" }}>Page content goes here</div>
          </div>
        )}
      </div>
      <div className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700" style={{ height: '8px' }} />
    </div>
  );
};

export default VendorMasterPage;