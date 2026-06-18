import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import ItemMasterInvProperties from "./ItemMasterInvProperties.jsx";

const API_BASE = 'http://localhost:8000/api';
const STORAGE_KEY = 'itemMasterCustomFlows';

// ── localStorage helpers (same as RenderItemMasterInventory) ─────────────────
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

// ── Default entity order for inv-properties group ─────────────────────────────
const DEFAULT_ENTITY_ORDER = ['item-master-inv-properties'];

// ── Component map: entity-id → component ─────────────────────────────────────
const ENTITY_COMPONENTS = {
  'item-master-inv-properties': ItemMasterInvProperties,
};

// ==================== RENDER ITEM MASTER INV PROPERTIES COMPONENT WITH RBAC ====================
const RenderItemMasterInvProperties = ({ mappingRecord, skipRbac = false }) => {
  const [loading, setLoading] = useState(!skipRbac);
  const [hasAccess, setHasAccess] = useState(skipRbac);
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

    if (matched?.groupEntityIds?.['inv-properties']?.length > 0) {
      const valid = matched.groupEntityIds['inv-properties'].filter(id => ENTITY_COMPONENTS[id]);
      DEFAULT_ENTITY_ORDER.forEach(id => { if (!valid.includes(id)) valid.push(id); });
      setEntityOrder(valid);
    } else {
      setEntityOrder(DEFAULT_ENTITY_ORDER);
    }
  }, [mappingRecord]);

  // 🔥 FETCH USER'S ACCESS
  useEffect(() => {
    if (skipRbac) return; // Already authorized by parent component
    fetchAccess();
  }, []);

  // Re-fetch when RBAC access is revoked/granted
  useEffect(() => {
    if (skipRbac) return;
    const handler = () => { fetchAccess(); };
    window.addEventListener('rbac-access-changed', handler);
    return () => window.removeEventListener('rbac-access-changed', handler);
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

      // Always re-fetch user from API to get fresh accesses (fixes stale cache after RBAC revoke)
      try {
        const userDetailsRes = await fetch(`${API_BASE}/users/${user.id}`);
        if (userDetailsRes.ok) {
          const completeUserData = await userDetailsRes.json();
          user = completeUserData;
          parsed.user = completeUserData;
          sessionStorage.setItem('userData', JSON.stringify(parsed));
        }
      } catch (err) {
        console.error('❌ [INV-PROPERTIES] Failed to fetch user details:', err);
      }

      if (!user.accesses || user.accesses.length === 0) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Use the request's company ID for the RBAC check, not the user's primary company
      const requestCompanyId =
        mappingRecord?.company?.id ||
        mappingRecord?.company_id  ||
        null;

      const primaryAccess    = user.accesses.find(acc => acc.is_primary_company) || user.accesses[0];
      const primaryCompanyId = primaryAccess?.company?.id;
      const companyIdForMenu = requestCompanyId || primaryCompanyId;

      if (!companyIdForMenu) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const menuUrl = `${API_BASE}/rbac/users/${user.id}/accessible-menu?company_id=${companyIdForMenu}`;
      const menuRes = await fetch(menuUrl);

      if (!menuRes.ok) {
        const errorData = await menuRes.json();
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const menuJson = await menuRes.json();

      if (!menuJson.menu || menuJson.menu.length === 0) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const hasInvPropertiesAccess = checkInvPropertiesAccess(menuJson.menu);

      if (!hasInvPropertiesAccess) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setHasAccess(true);
      setLoading(false);

    } catch (err) {
      setHasAccess(false);
      setLoading(false);
    }
  };

  const checkInvPropertiesAccess = (menuPages) => {
    let hasAccess = false;
    const INV_PROPERTIES_NAMES = [
      'Item Master Inv Properties',
      'Inv Properties',
      'Inventory Properties',
      'Item Inv Properties',
      'Render Item Master Inv Properties',
      'Item Master Inventory Properties',
    ];
    const searchPages = (pages) => {
      pages.forEach(page => {
        if (
          INV_PROPERTIES_NAMES.includes(page.page_name) ||
          page.page_url?.includes('inv-properties') ||
          page.page_url?.includes('render-item-master-inv')
        ) {
          hasAccess = true;
        }
        if (page.children && page.children.length > 0) searchPages(page.children);
      });
    };
    searchPages(menuPages);
    return hasAccess;
  };

  // ── Render entity by ID ───────────────────────────────────────────────────
  const renderEntity = (entityId) => {
    const Comp = ENTITY_COMPONENTS[entityId];
    if (!Comp) return null;
    return <Comp key={entityId} mappingRecord={mappingRecord} />;
  };

  // If not loading and no access — render nothing at all (parent handles gating)
  if (!loading && (!hasAccess || error)) return null;

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white"
        style={{ height: '24px', paddingRight: '8px' }}
      >
        <h2 className="m-0 text-xs font-semibold">Item Master Inv Properties 📋</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '32px' }}>⏳</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Loading accessible pages...</div>
          </div>
        ) : (
          // ── Render entities in saved flow order ──
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
            {entityOrder.map(entityId => renderEntity(entityId))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700"
        style={{ height: '8px' }}
      />
    </div>
  );
};

export default RenderItemMasterInvProperties;