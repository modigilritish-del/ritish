import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import ItemMasterWarehouseDetails from "../ItemMasterPages/ItemMasterWarehouseDetails.js";
import ItemMasterPurchaseDetails from "../ItemMasterPages/ItemMasterPurchaseDetails.js";

const API_BASE = 'http://localhost:8000/api';
const STORAGE_KEY = 'itemMasterCustomFlows';

// ── localStorage helpers (same as InfoMaster) ────────────────────────────────
function loadSavedFlows() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function findMatchingFlow(flows, companyId, plantId, companyName, plantName) {
  if (!flows || flows.length === 0) return null;
  if (!companyId && !companyName) return null;
  const cMatch = (f) => {
    if (!f.company) return false;
    if (companyId && (f.company.id === companyId || f.company.id === Number(companyId))) return true;
    if (companyName && f.company.name?.toLowerCase() === companyName.toLowerCase()) return true;
    return false;
  };
  const pMatch = (f) => {
    if (!f.plant) return true;
    if (plantId   && (f.plant.id === plantId || f.plant.id === Number(plantId))) return true;
    if (plantName && f.plant.name?.toLowerCase() === plantName.toLowerCase()) return true;
    return false;
  };
  if (plantId || plantName) {
    const exact = flows.find(f => cMatch(f) && pMatch(f));
    if (exact) return exact;
  }
  return flows.find(f => cMatch(f)) || null;
}

// ── Default entity order for warehouse-purchase group ────────────────────────
const DEFAULT_ENTITY_ORDER = ['warehouse-details', 'purchase-details'];

// ── RBAC page names for each entity ──────────────────────────────────────────
const RBAC_NAMES = {
  'warehouse-details': ['Item Master Warehouse Details', 'Warehouse Details', 'Warehouse'],
  'purchase-details':  ['Item Master Purchase Details', 'Purchase Details'],
};

// ── Component map: entity-id → component ─────────────────────────────────────
const ENTITY_COMPONENTS = {
  'warehouse-details': ItemMasterWarehouseDetails,
  'purchase-details':  ItemMasterPurchaseDetails,
};

// ==================== RENDER ITEM MASTER WAREHOUSE AND PURCHASE COMPONENT WITH RBAC ====================
const RenderItemMasterWarehouseAndPurchase = ({ mappingRecord }) => {
  const [loading, setLoading] = useState(true);
  const [accessibleComponents, setAccessibleComponents] = useState([]);
  const [error, setError] = useState(null);

  // ── Flow-aware entity order ───────────────────────────────────────────────
  const [entityOrder, setEntityOrder] = useState(DEFAULT_ENTITY_ORDER);

  useEffect(() => {
    const flows       = loadSavedFlows();
    const companyId   = mappingRecord?.company?.id   || mappingRecord?.company_id;
    const plantId     = mappingRecord?.plant?.id     || mappingRecord?.plant_id;
    const companyName = mappingRecord?.company?.company_name || mappingRecord?.company?.name || '';
    const plantName   = mappingRecord?.plant?.plant_name     || mappingRecord?.plant?.name   || '';
    const matched     = findMatchingFlow(flows, companyId, plantId, companyName, plantName);

    if (matched?.groupEntityIds?.['warehouse-purchase']?.length > 0) {
      const valid = matched.groupEntityIds['warehouse-purchase'].filter(id => ENTITY_COMPONENTS[id]);
      DEFAULT_ENTITY_ORDER.forEach(id => { if (!valid.includes(id)) valid.push(id); });
      setEntityOrder(valid);
    } else {
      setEntityOrder(DEFAULT_ENTITY_ORDER);
    }
  }, [mappingRecord]);

  // 🔥 FETCH USER'S ACCESS
  useEffect(() => {
    fetchAccess();
  }, []);

  const fetchAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      const storedUser = sessionStorage.getItem('userData');
      if (!storedUser) {
        setError('No user data found in session. Please login again.');
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(storedUser);
      let user = parsed?.user;

      if (!user || !user.id) {
        setError('Invalid user data structure. User ID missing.');
        setLoading(false);
        return;
      }

      if (!user.accesses || user.accesses.length === 0) {
        try {
          const userDetailsRes = await fetch(`${API_BASE}/users/${user.id}`);
          if (userDetailsRes.ok) {
            const completeUserData = await userDetailsRes.json();
            user = completeUserData;
            parsed.user = completeUserData;
            sessionStorage.setItem('userData', JSON.stringify(parsed));
          }
        } catch (err) {
          console.error('❌ [WAREHOUSE & PURCHASE] Failed to fetch user details:', err);
        }
      }

      if (!user.accesses || user.accesses.length === 0) {
        setError('No company access found for this user.');
        setLoading(false);
        return;
      }

      const primaryAccess = user.accesses.find(acc => acc.is_primary_company) || user.accesses[0];
      const primaryCompanyId = primaryAccess.company?.id;

      if (!primaryCompanyId) {
        setError('Primary company ID is missing in access data.');
        setLoading(false);
        return;
      }

      const menuUrl = `${API_BASE}/rbac/users/${user.id}/accessible-menu?company_id=${primaryCompanyId}`;
      const menuRes = await fetch(menuUrl);
      
      if (!menuRes.ok) {
        const errorData = await menuRes.json();
        setError(`API Error: ${errorData.detail || 'Failed to load menu'}`);
        setLoading(false);
        return;
      }

      const menuJson = await menuRes.json();

      if (!menuJson.menu || menuJson.menu.length === 0) {
        setError('No pages accessible. This user has no page access granted.');
        setLoading(false);
        return;
      }

      const components = checkComponentAccess(menuJson.menu);

      if (components.length === 0) {
        setError('No access to Warehouse or Purchase Details pages. Contact administrator to grant access.');
        setLoading(false);
        return;
      }

      setAccessibleComponents(components);
      setLoading(false);

    } catch (err) {
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  // 🔍 CHECK WHICH COMPONENTS USER HAS ACCESS TO
  const checkComponentAccess = (menuPages) => {
    const accessibleComps = [];
    const searchPages = (pages) => {
      pages.forEach(page => {
        if (RBAC_NAMES['warehouse-details'].includes(page.page_name)) {
          if (!accessibleComps.includes('warehouse-details')) accessibleComps.push('warehouse-details');
        }
        if (RBAC_NAMES['purchase-details'].includes(page.page_name)) {
          if (!accessibleComps.includes('purchase-details')) accessibleComps.push('purchase-details');
        }
        if (page.children && page.children.length > 0) searchPages(page.children);
      });
    };
    searchPages(menuPages);
    return accessibleComps;
  };

  // ── Render entity by ID (only if RBAC accessible) ─────────────────────────
  const renderEntity = (entityId) => {
    if (!accessibleComponents.includes(entityId)) return null;
    const Comp = ENTITY_COMPONENTS[entityId];
    if (!Comp) return null;
    return <Comp key={entityId} mappingRecord={mappingRecord} />;
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white" style={{ height: '24px', paddingRight: '8px' }}>
        <h2 className="m-0 text-xs font-semibold">Item Master Warehouse & Purchase 🏭</h2>
      </div>

      {/* Content */}
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
            <div style={{ fontSize: "10px", color: "#7f1d1d", textAlign: "center", maxWidth: "400px", background: "#fee2e2", padding: "10px", borderRadius: "6px", border: "1px solid #fca5a5" }}>
              {error}
            </div>
          </div>
        ) : accessibleComponents.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "48px" }}>🔒</div>
            <div style={{ fontSize: "12px", color: "#dc2626", fontWeight: "600" }}>No Access</div>
            <div style={{ fontSize: "10px", color: "#7f1d1d", textAlign: "center", maxWidth: "400px" }}>
              You don't have access to Warehouse or Purchase Details pages. Please contact your administrator.
            </div>
          </div>
        ) : (
          // ── Render entities in saved flow order (RBAC filtered) ──
          <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
            {entityOrder.map(entityId => renderEntity(entityId))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700" style={{ height: '8px' }} />
    </div>
  );
};

export default RenderItemMasterWarehouseAndPurchase;