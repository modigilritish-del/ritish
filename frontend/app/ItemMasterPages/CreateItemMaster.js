/**
 * CreateItemMaster.js  (WORKFLOW-AWARE — FULL ENTITY LEVEL)
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads the active saved flow from localStorage ('itemMasterCustomFlows') that
 * matches mappingRecord.company / plant.
 *
 * Flow structure in localStorage:
 *   flow.groupOrder          = ['basic-info', 'inventory', ...]  — tab order
 *   flow.groupEntityIds      = {
 *     'basic-info':          ['item-info-master', 'analysis-fields', ...],
 *     'inventory':           ['item-master-inventory', 'item-master-inv-properties'],
 *     'sales-finance':       ['sales-detail', 'finance-details'],
 *     'warehouse-purchase':  ['warehouse-details', 'purchase-details'],
 *   }
 *
 * Each TAB renders EXACTLY the entities listed in groupEntityIds[groupId],
 * in the saved order. Cross-group moved entities appear in the destination tab.
 *
 * Falls back to default hard-coded order if no matching flow found.
 * Zero changes to any other file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle }                from 'lucide-react';
import { FileText, ArrowRight, Package, Warehouse } from 'lucide-react';

// ── Page-level components ─────────────────────────────────────────────────────
import ItemInfoMasterComp            from './ItemInfoMaster';
import ItemMasterAnalysisFields      from './ItemMasterAnalysisFields';
import ItemMasterInventory           from '../ItemMasterPages/RenderItemMasterInventory';
import ItemMasterInvProperties       from '../ItemMasterPages/RenderItemMasterInvProperties';
import ItemMasterSalesDetail         from '../ItemMasterPages/ItemMasterSalesDetail';
import ItemMasterFinanceDetails      from '../ItemMasterPages/ItemMasterFinanceDetails';
import ItemMasterWarehouseDetails    from '../ItemMasterPages/ItemMasterWarehouseDetails';
import ItemMasterPurchaseDetails     from '../ItemMasterPages/ItemMasterPurchaseDetails';
import ItemMasterGLSelectionPagePopup from './ItemMasterGLSelectionPagePopup';

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'itemMasterCustomFlows';
const API_BASE    = 'http://localhost:8000/api';

// ── Dynamic loaders for custom-fields ────────────────────────────────────────
const customFieldLoaders = {
  'Breez Custom Fields':           () => import('../ItemMasterPages/BreezCustomFields').catch(() => ({ default: () => <div style={{ padding: 10, color: '#dc2626', fontSize: 11 }}>⚠️ BreezCustomFields load failed</div> })),
  'Sonata Custom Fields':          () => import('../ItemMasterPages/SonataCustomFields').catch(() => ({ default: () => <div style={{ padding: 10, color: '#dc2626', fontSize: 11 }}>⚠️ SonataCustomFields load failed</div> })),
  'Sweet Nutrition Custom Fields': () => import('../ItemMasterPages/SweetNutritionCustomFields').catch(() => ({ default: () => <div style={{ padding: 10, color: '#dc2626', fontSize: 11 }}>⚠️ SweetNutritionCustomFields load failed</div> })),
};
const customFieldTypeMap = {
  'Breez Custom Fields':           'breez',
  'Sonata Custom Fields':          'sonata',
  'Sweet Nutrition Custom Fields': 'sweet',
};

// ── Default group order + entity lists ───────────────────────────────────────
const DEFAULT_GROUP_ORDER = ['basic-info', 'inventory', 'sales-finance', 'warehouse-purchase', 'inv-properties'];

const DEFAULT_GROUP_ENTITY_IDS = {
  'basic-info':         ['item-info-master', 'custom-fields', 'analysis-fields', 'gl-selection', 'item-code-creation'],
  'inventory':          ['item-master-inventory'],
  'sales-finance':      ['sales-detail', 'finance-details'],
  'warehouse-purchase': ['warehouse-details', 'purchase-details'],
  'inv-properties':     ['item-master-inv-properties'],
};

// ── Tab label / icon metadata ─────────────────────────────────────────────────
const GROUP_META = {
  'basic-info':         { label: 'Item Info',             icon: <FileText size={10} /> },
  'inventory':          { label: 'Inventory',             icon: <Package size={10} /> },
  'sales-finance':      { label: 'Sales & Finance',       icon: null },
  'warehouse-purchase': { label: 'Warehouse & Purchase',  icon: <Warehouse size={10} /> },
  'inv-properties':     { label: 'Inv Properties',        icon: <Package size={10} /> },
};

// ── GL / Item Code Creation inline placeholders ───────────────────────────────
const GLSelectionInline = ({ mappingRecord }) => {
  const [showPopup,   setShowPopup]   = React.useState(false);
  const [selectedGL,  setSelectedGL]  = React.useState(null);
  return (
    <div style={{ marginBottom: 12, border: '1.5px solid #86efac', borderRadius: 8, overflow: 'hidden' }}>
      {/* Header bar */}
      <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 13 }}>🏦</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>GL Selection</span>
          <span style={{ fontSize: 9, color: '#15803d' }}>GL Account · Item Code selection section</span>
        </div>
        <button
          onClick={() => setShowPopup(true)}
          style={{
            padding: '4px 12px', fontSize: 10, fontWeight: 700,
            background: 'linear-gradient(135deg,#16a34a,#15803d)',
            color: '#fff', border: 'none', borderRadius: 5,
            cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
        >
          🔍 Select GL Account
        </button>
      </div>
      {/* Selected GL display */}
      {selectedGL ? (
        <div style={{ padding: '8px 14px', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 700, background: '#bbf7d0', color: '#166534', borderRadius: 4, padding: '2px 7px' }}>{selectedGL.gl_code}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>{selectedGL.gl_name}</span>
          {selectedGL.company?.name && <span style={{ fontSize: 10, color: '#6b7280' }}>— {selectedGL.company.name}</span>}
          <button onClick={() => setSelectedGL(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#ef4444' }}>Remove</button>
        </div>
      ) : (
        <div style={{ padding: '6px 14px', background: '#f9fafb' }}>
          <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>No GL account selected yet — click “Select GL Account” to choose one.</span>
        </div>
      )}
      {/* Popup */}
      {showPopup && (
        <ItemMasterGLSelectionPagePopup
          mappingRecord={mappingRecord}
          onClose={(gl) => {
            if (gl && gl.id) setSelectedGL(gl);
            setShowPopup(false);
          }}
        />
      )}
    </div>
  );
};
const ItemCodeCreationPlaceholder = () => (
  <div style={{ marginBottom: 12, padding: '10px 14px', background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 8 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>📦 Item Code Creation Point</div>
    <div style={{ fontSize: 10, color: '#1d4ed8' }}>Item Code · Creation section</div>
  </div>
);

// ── localStorage helpers ──────────────────────────────────────────────────────
function loadSavedFlows() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

function findMatchingFlow(flows, companyId, plantId, companyName, plantName) {
  if (!flows?.length) return null;
  if (!companyId && !companyName) return null;
  const cMatch = (f) => {
    if (!f.company) return false;
    if (companyId && (f.company.id === companyId || f.company.id === Number(companyId))) return true;
    if (companyName && f.company.name?.toLowerCase() === companyName.toLowerCase()) return true;
    return false;
  };
  const pMatch = (f) => {
    if (!f.plant) return true;
    if (plantId   && (f.plant.id === plantId   || f.plant.id   === Number(plantId)))   return true;
    if (plantName && f.plant.name?.toLowerCase() === plantName.toLowerCase())           return true;
    return false;
  };
  if (plantId || plantName) { const exact = flows.find(f => cMatch(f) && pMatch(f)); if (exact) return exact; }
  return flows.find(f => cMatch(f)) || null;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const CreateItemMaster = ({ mappingRecord }) => {

  // ── Resolved from saved flow ──────────────────────────────────────────────
  const [groupOrder,      setGroupOrder]      = useState(DEFAULT_GROUP_ORDER);
  const [groupEntityIds,  setGroupEntityIds]  = useState(DEFAULT_GROUP_ENTITY_IDS);
  const [activeGroupId,   setActiveGroupId]   = useState(DEFAULT_GROUP_ORDER[0]);

  // ── Sequential tab locking ─────────────────────────────────────────────────
  // completedTabs: Set of groupIds that have been marked complete
  // First tab is always accessible; subsequent tabs unlock only after previous is completed.
  const [completedTabs,   setCompletedTabs]   = useState(new Set());
  const [showLockWarning, setShowLockWarning] = useState(false); // toast when locked tab clicked

  // ── Intra-tab entity sequential locking (for basic-info group) ────────────
  // unlockedEntities: Set of entity IDs that are currently visible/accessible.
  // First entity in basic-info is always visible. Next entities unlock one-by-one
  // when user clicks "Complete & Continue" on the current entity.
  // Key: `${groupId}::${entityId}` so each group has its own unlock chain.
  const [unlockedEntities, setUnlockedEntities] = useState(() => {
    // Pre-unlock the first entity of every group (always visible)
    const initial = new Set();
    DEFAULT_GROUP_ORDER.forEach(gid => {
      const first = DEFAULT_GROUP_ENTITY_IDS[gid]?.[0];
      if (first) initial.add(`${gid}::${first}`);
    });
    return initial;
  });

  // ── RBAC / custom-fields state (for basic-info group) ────────────────────
  const [cfLoading,               setCfLoading]               = useState(true);
  const [cfError,                 setCfError]                 = useState(null);
  const [hasAnalysisAccess,       setHasAnalysisAccess]       = useState(false);
  // true = Workflow Builder ne explicitly set kiya → analysis-fields RBAC bypass
  const [isFlowCustomized,        setIsFlowCustomized]        = useState(false);
  const [loadedCustomFields,      setLoadedCustomFields]      = useState({});  // { type: Component }
  const [customFieldOptions,      setCustomFieldOptions]      = useState([]);  // [{value, label}]
  const [activeCustomTab,         setActiveCustomTab]         = useState(null);
  const [primaryPageName,         setPrimaryPageName]         = useState(null);
  const [primaryPageRbacBlocked,  setPrimaryPageRbacBlocked]  = useState(false);

  // ── RBAC-accessible entity IDs (null = not fetched yet, [] = none, [...] = allowed) ──
  const [rbacAccessible, setRbacAccessible] = useState(null);

  // Map: entity-id → RBAC page names to match against menu
  const ENTITY_RBAC_NAMES = {
    'item-master-inventory':      ['Item Master Inventory', 'Inventory', 'Item Inventory', 'Render Item Master Inventory', 'Item Master Inv'],
    'item-master-inv-properties': ['Item Master Inv Properties', 'Inv Properties', 'Inventory Properties', 'Item Inv Properties', 'Render Item Master Inv Properties', 'Item Master Inventory Properties'],
    'sales-detail':               ['Item Master Sales Detail', 'Item Master Sales Details', 'Sales Details', 'Sales Detail'],
    'finance-details':            ['Item Master Finance Details', 'Finance Details'],
    'warehouse-details':          ['Item Master Warehouse Details', 'Warehouse Details', 'Warehouse'],
    'purchase-details':           ['Item Master Purchase Details', 'Purchase Details'],
  };

  // ── 1. Resolve flow from localStorage ────────────────────────────────────
  useEffect(() => {
    const flows       = loadSavedFlows();
    const companyId   = mappingRecord?.company?.id          || mappingRecord?.company_id;
    const plantId     = mappingRecord?.plant?.id            || mappingRecord?.plant_id;
    const companyName = mappingRecord?.company?.company_name || mappingRecord?.company?.name || '';
    const plantName   = mappingRecord?.plant?.plant_name    || mappingRecord?.plant?.name   || '';
    const matched     = findMatchingFlow(flows, companyId, plantId, companyName, plantName);

    if (matched) {
      setIsFlowCustomized(true);
      // ── Group order ──
      let gOrder = DEFAULT_GROUP_ORDER;
      if (matched.groupOrder?.length > 0) {
        const valid = matched.groupOrder.filter(id => GROUP_META[id]);
        DEFAULT_GROUP_ORDER.forEach(id => { if (!valid.includes(id)) valid.push(id); });
        gOrder = valid;
      }
      setGroupOrder(gOrder);

      // ── Entity IDs per group ──
      let merged = { ...DEFAULT_GROUP_ENTITY_IDS };
      if (matched.groupEntityIds) {
        // Merge: start from defaults, overlay with saved values
        Object.keys(matched.groupEntityIds).forEach(gid => {
          if (matched.groupEntityIds[gid]?.length > 0) {
            merged[gid] = matched.groupEntityIds[gid];
          }
        });
        setGroupEntityIds(merged);
      }

      // Active tab = first group in saved order
      setActiveGroupId(prev => gOrder.includes(prev) ? prev : gOrder[0]);

      // Reset intra-tab unlock state to only first entity of each group
      setUnlockedEntities(() => {
        const initial = new Set();
        gOrder.forEach(gid => {
          const entityList = merged[gid] || DEFAULT_GROUP_ENTITY_IDS[gid] || [];
          if (entityList[0]) initial.add(`${gid}::${entityList[0]}`);
        });
        return initial;
      });
    } else {
      setIsFlowCustomized(false);
      setGroupOrder(DEFAULT_GROUP_ORDER);
      setGroupEntityIds(DEFAULT_GROUP_ENTITY_IDS);
      setActiveGroupId(DEFAULT_GROUP_ORDER[0]);

      // Reset unlock state
      setUnlockedEntities(() => {
        const initial = new Set();
        DEFAULT_GROUP_ORDER.forEach(gid => {
          const first = DEFAULT_GROUP_ENTITY_IDS[gid]?.[0];
          if (first) initial.add(`${gid}::${first}`);
        });
        return initial;
      });
    }
  }, [mappingRecord]);

  // ── 2. RBAC fetch for custom-fields / analysis-fields ─────────────────────
  const fetchCfAccess = useCallback(async () => {
    try {
      setCfLoading(true);
      setCfError(null);
      setPrimaryPageName(null);
      setPrimaryPageRbacBlocked(false);
      setHasAnalysisAccess(false);

      const storedUser = sessionStorage.getItem('userData');
      if (!storedUser) { setCfLoading(false); setRbacAccessible([]); return; }

      const parsed = JSON.parse(storedUser);
      let user = parsed?.user;
      if (!user?.id) { setCfLoading(false); setRbacAccessible([]); return; }

      if (!user.accesses?.length) {
        const r = await fetch(`${API_BASE}/users/${user.id}`);
        if (r.ok) { user = await r.json(); parsed.user = user; sessionStorage.setItem('userData', JSON.stringify(parsed)); }
      }
      if (!user.accesses?.length) { setCfLoading(false); setRbacAccessible([]); return; }

      const primaryAccess    = user.accesses.find(a => a.is_primary_company) || user.accesses[0];
      const primaryCompanyId = primaryAccess?.company?.id;
      if (!primaryCompanyId) { setCfLoading(false); setRbacAccessible([]); return; }

      const menuRes = await fetch(`${API_BASE}/rbac/users/${user.id}/accessible-menu?company_id=${primaryCompanyId}`);
      if (!menuRes.ok) { setCfLoading(false); setRbacAccessible([]); return; }

      const menuJson = await menuRes.json();
      const allPages = [];
      const flatten  = (pages) => pages.forEach(p => { allPages.push(p); if (p.children?.length) flatten(p.children); });
      if (menuJson.menu?.length) flatten(menuJson.menu);

      // Analysis Fields RBAC
      setHasAnalysisAccess(allPages.some(p => p.page_name === 'Analysis Fields' || p.page_url?.includes('item-master-analysis-fields')));

      // ── RBAC-accessible entity IDs ──
      const accessible = [];
      Object.entries(ENTITY_RBAC_NAMES).forEach(([entityId, names]) => {
        const hasIt = allPages.some(p =>
          names.includes(p.page_name) ||
          (entityId === 'item-master-inventory'      && (p.page_url?.includes('item-master-inventory')       || p.page_url?.includes('render-item-master-inventory'))) ||
          (entityId === 'item-master-inv-properties' && (p.page_url?.includes('inv-properties')              || p.page_url?.includes('render-item-master-inv')))
        );
        if (hasIt) accessible.push(entityId);
      });
      setRbacAccessible(accessible);

      // Company primary page check
      const requestCompanyId = mappingRecord?.company?.id || mappingRecord?.company_id;
      if (requestCompanyId) {
        try {
          const pcaRes = await fetch(`${API_BASE}/page-access/company/${requestCompanyId}/pages`);
          if (pcaRes.ok) {
            const pcaRules = await pcaRes.json();
            const matchedRule = Array.isArray(pcaRules) && pcaRules.length > 0
              ? pcaRules.find(rule => rule.page?.page_name && customFieldTypeMap[rule.page.page_name])
              : null;
            if (matchedRule) {
              const pageName = matchedRule.page.page_name;
              const rbacHas  = allPages.some(p => p.page_name === pageName);
              if (rbacHas) {
                const type = customFieldTypeMap[pageName];
                let Comp = null;
                try { const mod = await customFieldLoaders[pageName](); Comp = mod.default; } catch { Comp = () => <div style={{ padding: 10, color: '#dc2626', fontSize: 11 }}>⚠️ {pageName} could not be loaded.</div>; }
                setLoadedCustomFields({ [type]: Comp });
                setCustomFieldOptions([{ value: type, label: pageName }]);
                setActiveCustomTab(type);
              } else {
                setPrimaryPageRbacBlocked(true);
                setPrimaryPageName(pageName);
              }
              setCfLoading(false);
              return;
            }
          }
        } catch {}
      }

      // Fallback: normal RBAC
      const accessiblePages = allPages
        .filter(p => customFieldTypeMap[p.page_name] && customFieldLoaders[p.page_name])
        .map(p => ({ type: customFieldTypeMap[p.page_name], page_name: p.page_name }));
      const componentsMap = {};
      await Promise.all(accessiblePages.map(async ({ type, page_name }) => {
        try { const mod = await customFieldLoaders[page_name](); componentsMap[type] = mod.default; }
        catch { componentsMap[type] = () => <div style={{ padding: 10, color: '#dc2626', fontSize: 11 }}>⚠️ {page_name} could not be loaded.</div>; }
      }));
      setLoadedCustomFields(componentsMap);
      const opts = accessiblePages.map(p => ({ value: p.type, label: p.page_name }));
      setCustomFieldOptions(opts);
      if (opts.length > 0) setActiveCustomTab(opts[0].value);
      setCfLoading(false);

    } catch {
      setCfLoading(false);
      setRbacAccessible([]);
    }
  }, [mappingRecord]);

  useEffect(() => { fetchCfAccess(); }, [fetchCfAccess]);

  // ── 3. Render a single entity by its ID ───────────────────────────────────
  // Returns null if RBAC hasn't loaded yet OR user has no access to this entity
  const hasRbacAccess = (entityId) => {
    if (rbacAccessible === null) return false; // still loading
    return rbacAccessible.includes(entityId);
  };

  const renderEntity = (entityId) => {
    switch (entityId) {

      // ── basic-info entities ──
      case 'item-info-master':
        return (
          <div key="item-info-master" style={{ marginBottom: 12 }}>
            <ItemInfoMasterComp mappingRecord={mappingRecord} onDataChange={handleItemInfoDataChange} />
          </div>
        );

      case 'analysis-fields':
        if (!isFlowCustomized && !hasAnalysisAccess) return null;
        return (
          <div key="analysis-fields" style={{ marginBottom: 12 }}>
            <ItemMasterAnalysisFields mappingRecord={mappingRecord} onDataChange={handleAnalysisDataChange} />
          </div>
        );

      case 'custom-fields':
        return (
          <div key="custom-fields" style={{ marginBottom: 12 }}>
            {renderCustomFields()}
          </div>
        );

      case 'gl-selection':
        return <GLSelectionInline key="gl-selection" mappingRecord={mappingRecord} />;

      case 'item-code-creation':
        return <ItemCodeCreationPlaceholder key="item-code-creation" />;

      // ── inventory entities ──
      case 'item-master-inventory':
        if (!hasRbacAccess('item-master-inventory')) return null;
        return (
          <div key="item-master-inventory" style={{ marginBottom: 12 }}>
            <ItemMasterInventory mappingRecord={mappingRecord} skipRbac={true} />
          </div>
        );

      case 'item-master-inv-properties':
        if (!hasRbacAccess('item-master-inv-properties')) return null;
        return (
          <div key="item-master-inv-properties" style={{ marginBottom: 12 }}>
            <ItemMasterInvProperties mappingRecord={mappingRecord} skipRbac={true} />
          </div>
        );

      // ── sales-finance entities ──
      case 'sales-detail':
        if (!hasRbacAccess('sales-detail')) return null;
        return (
          <div key="sales-detail" style={{ marginBottom: 12 }}>
            <ItemMasterSalesDetail mappingRecord={mappingRecord} />
          </div>
        );

      case 'finance-details':
        if (!hasRbacAccess('finance-details')) return null;
        return (
          <div key="finance-details" style={{ marginBottom: 12 }}>
            <ItemMasterFinanceDetails mappingRecord={mappingRecord} />
          </div>
        );

      // ── warehouse-purchase entities ──
      case 'warehouse-details':
        if (!hasRbacAccess('warehouse-details')) return null;
        return (
          <div key="warehouse-details" style={{ marginBottom: 12 }}>
            <ItemMasterWarehouseDetails mappingRecord={mappingRecord} />
          </div>
        );

      case 'purchase-details':
        if (!hasRbacAccess('purchase-details')) return null;
        return (
          <div key="purchase-details" style={{ marginBottom: 12 }}>
            <ItemMasterPurchaseDetails mappingRecord={mappingRecord} />
          </div>
        );

      default:
        return null;
    }
  };

  // ── Custom fields block renderer ──────────────────────────────────────────
  const renderCustomFields = () => {
    if (cfLoading) return null;
    if (primaryPageRbacBlocked) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fff7ed', border: '1px solid #fb923c', borderRadius: 8 }}>
          <AlertCircle size={18} style={{ color: '#ea580c', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c2d12', marginBottom: 2 }}>Access Not Granted — {primaryPageName}</div>
            <div style={{ fontSize: 10, color: '#9a3412', lineHeight: 1.5 }}>
              Custom fields (<strong>{primaryPageName}</strong>) are linked to this company but RBAC access is missing. Contact your administrator.
            </div>
          </div>
        </div>
      );
    }
    if (cfError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6 }}>
          <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div style={{ fontSize: 10, color: '#7f1d1d' }}>{cfError}</div>
        </div>
      );
    }
    if (customFieldOptions.length === 0) return null;
    const hasMultiple = customFieldOptions.length > 1;
    return (
      <div>
        {hasMultiple && (
          <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 16 }}>
            {customFieldOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setActiveCustomTab(opt.value)}
                style={{
                  padding: '8px 16px', fontSize: 11, fontWeight: 500,
                  background: activeCustomTab === opt.value ? '#60a5fa' : 'transparent',
                  color: activeCustomTab === opt.value ? '#fff' : '#6b7280',
                  border: 'none',
                  borderBottom: activeCustomTab === opt.value ? '2px solid #2563eb' : '2px solid transparent',
                  cursor: 'pointer', marginBottom: -2, transition: 'all .2s',
                }}
              >{opt.label}</button>
            ))}
          </div>
        )}
        {customFieldOptions.map(opt => {
          if (hasMultiple && activeCustomTab !== opt.value) return null;
          const Comp = loadedCustomFields[opt.value];
          if (!Comp) return null;
          return <div key={opt.value}><Comp mappingRecord={mappingRecord} /></div>;
        })}
      </div>
    );
  };

  // ── Entity label for lock messages ───────────────────────────────────────
  const ENTITY_LABELS = {
    'item-info-master':            'Item Info',
    'analysis-fields':             'Analysis Fields',
    'custom-fields':               'Custom Fields',
    'gl-selection':                'GL Selection',
    'item-code-creation':          'Item Code Creation',
    'item-master-inventory':       'Inventory',
    'item-master-inv-properties':  'Inv Properties',
    'sales-detail':                'Sales Detail',
    'finance-details':             'Finance Details',
    'warehouse-details':           'Warehouse Details',
    'purchase-details':            'Purchase Details',
  };

  // ── Unlock next entity in the current group ───────────────────────────────
  const unlockNextEntity = (groupId, currentEntityId) => {
    const entityList = groupEntityIds[groupId] || [];
    const currentIdx = entityList.indexOf(currentEntityId);
    if (currentIdx >= 0 && currentIdx < entityList.length - 1) {
      const nextId = entityList[currentIdx + 1];
      setUnlockedEntities(prev => new Set([...prev, `${groupId}::${nextId}`]));
    }
  };

  // ── Check if entity is unlocked ───────────────────────────────────────────
  const isEntityUnlocked = (groupId, entityId) => {
    return unlockedEntities.has(`${groupId}::${entityId}`);
  };

  // ── Check if entity is the last in its group ──────────────────────────────
  const isLastEntityInGroup = (groupId, entityId) => {
    const entityList = groupEntityIds[groupId] || [];
    return entityList[entityList.length - 1] === entityId;
  };

  // Tracks forward status per entity: null | 'loading' | 'success' | 'error' | 'no_routing'
  const [entityForwardStatus, setEntityForwardStatus] = useState({});
  // Tracks save status per entity: null | 'loading' | 'success' | 'error'
  const [entitySaveStatus, setEntitySaveStatus] = useState({});

  // ── Live data ref from ItemInfoMasterComp ────────────────────────────────
  // ItemInfoMasterComp calls onDataChange(data) whenever its fields change.
  // We store the latest snapshot here so Save & Next can read it without DOM scanning.
  const itemInfoDataRef = useRef({});
  const handleItemInfoDataChange = useCallback((data) => {
    itemInfoDataRef.current = data || {};
  }, []);

  // ── Live data ref from ItemMasterAnalysisFields ───────────────────────────
  // ItemMasterAnalysisFields calls onDataChange(data) whenever its fields change.
  // Same pattern as itemInfoDataRef — stores latest snapshot for Save & Next.
  const analysisDataRef = useRef({});
  const handleAnalysisDataChange = useCallback((data) => {
    analysisDataRef.current = data || {};
  }, []);

  // ── Get active flow from localStorage ────────────────────────────────────
  const getActiveFlow = () => {
    try {
      const flows = loadSavedFlows();
      const companyId   = mappingRecord?.company?.id          || mappingRecord?.company_id;
      const plantId     = mappingRecord?.plant?.id            || mappingRecord?.plant_id;
      const companyName = mappingRecord?.company?.company_name || mappingRecord?.company?.name || '';
      const plantName   = mappingRecord?.plant?.plant_name    || mappingRecord?.plant?.name   || '';
      return findMatchingFlow(flows, companyId, plantId, companyName, plantName) || null;
    } catch { return null; }
  };

  // ── Get current user from sessionStorage ────────────────────────────────
  const getCurrentUser = () => {
    try {
      const raw = sessionStorage.getItem('userData');
      if (!raw) return null;
      return JSON.parse(raw)?.user || null;
    } catch { return null; }
  };

  // ── Forward button handler: lookup routing → send forward ────────────────
  const handleForwardEntity = async (entityId) => {
    setEntityForwardStatus(prev => ({ ...prev, [entityId]: 'loading' }));
    try {
      const flow = getActiveFlow();
      if (!flow || !flow.id) {
        setEntityForwardStatus(prev => ({ ...prev, [entityId]: 'no_routing' }));
        return;
      }

      // Extract numeric flow_id from 'flow_1234567890' string
      // The workflow entity routing API uses a DB-level integer flow_id.
      // We call the GET lookup which uses entity_key directly.
      // entity_key matches the entityId used in the builder (e.g. 'item-info-master')
      const user = getCurrentUser();

      // Step 1: Lookup routing for this entity in the flow
      // Use GET endpoint: /item-master/entity-routing/lookup/{flow_id}/{entity_key}
      // Note: flow.id is localStorage key like "flow_1234567890". The DB flow_id
      // is stored as flow.dbId if synced, otherwise we attempt with flow.id.
      const dbFlowId = flow.dbId || flow.db_id || null;

      let routingResult = null;

      if (dbFlowId) {
        const lookupRes = await fetch(
          `${API_BASE}/item-master/entity-routing/lookup/${dbFlowId}/${encodeURIComponent(entityId)}`
        );
        if (lookupRes.ok) {
          routingResult = await lookupRes.json();
        }
      }

      // If no DB flow id or lookup failed, try item-info-forward routing
      // (older per-company routing via /mdm/item-info-forward/routing)
      if (!routingResult || !routingResult.routing_found) {
        // Fallback: check company-level routing (ItemInfoForwardPopup saves to /mdm/item-info-forward/routing)
        const companyId = flow.company?.id;
        if (companyId) {
          const fallbackRes = await fetch(`${API_BASE}/mdm/item-info-forward/routing/${companyId}`);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            // fallbackData: [{ source_dept_id, target_company_id, target_dept_id, ... }]
            // Use first row as default routing target
            if (Array.isArray(fallbackData) && fallbackData.length > 0) {
              const row = fallbackData[0];
              routingResult = {
                routing_found:       true,
                routing_type:        row.target_type || 'dept',
                target_company_id:   row.target_company_id,
                target_company_name: row.target_company_name || '',
                target_dept_id:      row.target_dept_id,
                target_dept_name:    row.target_dept_name || '',
                target_user_id:      row.target_user_id || null,
                target_user_name:    row.target_user_name || null,
              };
            }
          }
        }
      }

      if (!routingResult || !routingResult.routing_found) {
        setEntityForwardStatus(prev => ({ ...prev, [entityId]: 'no_routing' }));
        return;
      }

      // Step 2: Send forward notification
      const forwardPayload = {
        entity_id:            mappingRecord?.id || mappingRecord?.entity_id || 0,
        request_id:           mappingRecord?.request_id || null,
        item_name:            mappingRecord?.item_name  || mappingRecord?.item_basic_info?.item_name || null,
        target_company_id:    routingResult.target_company_id,
        target_department_id: routingResult.target_dept_id,
        forwarded_by:         user?.id || null,
        forward_notes:        `Auto-forwarded from entity: ${ENTITY_LABELS[entityId] || entityId}`,
      };

      const sendRes = await fetch(`${API_BASE}/mdm/item-info-forward/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forwardPayload),
      });

      if (!sendRes.ok) {
        const errData = await sendRes.json().catch(() => ({}));
        console.error('❌ Forward failed:', errData);
        setEntityForwardStatus(prev => ({ ...prev, [entityId]: 'error' }));
        return;
      }

      const sendResult = await sendRes.json();
      console.log('✅ Forward sent:', sendResult);
      setEntityForwardStatus(prev => ({ ...prev, [entityId]: 'success' }));

      // Also unlock next entity after successful forward
      unlockNextEntity(groupEntityIds[activeGroupId] ? activeGroupId : 'basic-info', entityId);

    } catch (err) {
      console.error('❌ Forward error:', err);
      setEntityForwardStatus(prev => ({ ...prev, [entityId]: 'error' }));
    }
  };

  // ── Save & Next handler: validate → unlock next entity ───────────────────
  // ── Collect Item Info field values from the DOM ──────────────────────────────
  // ItemInfoMasterComp renders fields with data-field="fieldName" attributes.
  // We read those values here to build the bulk-upsert payload.
  const collectItemInfoFields = (containerEl) => {
    if (!containerEl) return {};

    const get = (fieldName) => {
      // 1. Try data-field input/select/textarea
      const el = containerEl.querySelector(`[data-field="${fieldName}"]`);
      if (el) {
        if (el.tagName === 'SELECT') return el.value || null;
        if (el.type === 'checkbox') return el.checked ? 'YES' : 'NO';
        return el.value?.trim() || null;
      }

      // 2. Try data-field button groups (YES/NO toggle buttons)
      // Pattern: <button data-field="fieldName" data-value="YES" class="active">
      const activeBtn = containerEl.querySelector(`[data-field="${fieldName}"][data-active="true"]`);
      if (activeBtn) return activeBtn.getAttribute('data-value') || null;

      // 3. Try aria-pressed buttons
      const pressedBtn = containerEl.querySelector(`[data-field="${fieldName}"][aria-pressed="true"]`);
      if (pressedBtn) return pressedBtn.getAttribute('data-value') || null;

      return null;
    };

    // UOM — search input text (the selected UOM code)
    const uomInput = containerEl.querySelector('[data-field="uom_code"], [data-field="base_uom"], input[placeholder*="UOM"], input[placeholder*="uom"]');
    const uomCode  = uomInput ? (uomInput.getAttribute('data-selected-code') || uomInput.getAttribute('data-value') || uomInput.value?.trim() || null) : null;
    const uomName  = uomInput ? (uomInput.getAttribute('data-selected-name') || null) : null;

    // Max Loose — numeric input
    const maxLooseInput = containerEl.querySelector('[data-field="max_loose"], input[placeholder*="Max Loose"], input[placeholder*="max_loose"]');
    const maxLoose = maxLooseInput ? (parseFloat(maxLooseInput.value) || null) : null;

    // YES/NO button groups — look for the active/selected button in each group
    const readYesNo = (groupAttr) => {
      // Try: button with data-group="groupAttr" and data-selected="true" / class containing "active" / background change
      let btn = containerEl.querySelector(`[data-group="${groupAttr}"][data-selected="true"]`);
      if (btn) return btn.getAttribute('data-value') || btn.textContent?.trim().toUpperCase() || null;

      // Try data-field directly
      btn = containerEl.querySelector(`[data-field="${groupAttr}"][data-active="true"]`);
      if (btn) return btn.getAttribute('data-value') || null;

      // Fallback: scan buttons with matching data-field and check aria-pressed
      const btns = containerEl.querySelectorAll(`[data-field="${groupAttr}"]`);
      for (const b of btns) {
        if (b.getAttribute('aria-pressed') === 'true' || b.getAttribute('data-selected') === 'true') {
          return b.getAttribute('data-value') || b.textContent?.trim().toUpperCase() || null;
        }
      }
      return null;
    };

    return {
      uom_code:              uomCode,
      uom_name:              uomName,
      max_loose:             maxLoose,
      is_stock:              readYesNo('is_stock')   || get('is_stock'),
      is_service:            readYesNo('is_service') || get('is_service'),
      is_batch:              readYesNo('is_batch')   || get('is_batch'),
      is_serial:             readYesNo('is_serial')  || get('is_serial'),
      is_gift_voucher:       readYesNo('is_gift_voucher')       || get('is_gift_voucher'),
      has_extended_warranty: readYesNo('has_extended_warranty') || get('has_extended_warranty'),
    };
  };

  // ── Save & Next: validate → collect fields → POST bulk-upsert → unlock ──────
  const handleSaveAndNext = async (groupId, entityId, containerEl, goToNextTab = false) => {
    // 1. Mandatory field validation
    const unfilled = collectUnfilledMandatory(containerEl);
    if (unfilled.length > 0) {
      unfilled.forEach(inp => {
        inp.style.boxShadow = '0 0 0 2px #ef4444';
        setTimeout(() => { inp.style.boxShadow = ''; }, 2500);
      });
      unfilled[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      setEntitySaveStatus(prev => ({ ...prev, [entityId]: 'error' }));
      setTimeout(() => setEntitySaveStatus(prev => ({ ...prev, [entityId]: null })), 2500);
      return;
    }

    // 2. Only call the API for item-info-master entity (the one with the 8 DB tables)
    if (entityId === 'item-info-master') {
      setEntitySaveStatus(prev => ({ ...prev, [entityId]: 'loading' }));
      try {
        // Get current user
        const storedUser = sessionStorage.getItem('userData');
        const parsed     = storedUser ? JSON.parse(storedUser) : null;
        const userId     = parsed?.user?.id || null;

        // Resolve entity_id and request_id from mappingRecord
        const entityDbId  = mappingRecord?.id || mappingRecord?.entity_id || null;
        const requestId   = mappingRecord?.request_id || null;

        if (!entityDbId) {
          console.error('❌ [Save & Next] No entity_id found in mappingRecord');
          setEntitySaveStatus(prev => ({ ...prev, [entityId]: 'error' }));
          setTimeout(() => setEntitySaveStatus(prev => ({ ...prev, [entityId]: null })), 2500);
          return;
        }

        // Collect all field values — prefer ref data (live React state),
        // fall back to DOM scan if ref is empty (first render edge case)
        const refData = itemInfoDataRef.current || {};
        const domData = collectItemInfoFields(containerEl);
        // Merge: ref wins over DOM for each field
        const fields  = {
          uom_code:              refData.uom_code              ?? domData.uom_code,
          uom_name:              refData.uom_name              ?? domData.uom_name,
          max_loose:             refData.max_loose             ?? domData.max_loose,
          is_stock:              refData.is_stock              ?? domData.is_stock,
          is_service:            refData.is_service            ?? domData.is_service,
          is_batch:              refData.is_batch              ?? domData.is_batch,
          is_serial:             refData.is_serial             ?? domData.is_serial,
          is_gift_voucher:       refData.is_gift_voucher       ?? domData.is_gift_voucher,
          has_extended_warranty: refData.has_extended_warranty ?? domData.has_extended_warranty,
        };
        console.log('📦 [Save & Next] Collected fields (ref+dom):', fields);

        // Build bulk-upsert payload — only include non-null fields
        const payload = {
          entity_id:    entityDbId,
          request_id:   requestId,
          performed_by: userId,
          change_reason: 'Saved via Create Item Master — Save & Next',
        };

        if (fields.uom_code)              payload.uom_code              = fields.uom_code.toUpperCase();
        if (fields.uom_name)              payload.uom_name              = fields.uom_name;
        if (fields.max_loose !== null && fields.max_loose !== undefined)
                                          payload.max_loose             = fields.max_loose;
        if (fields.is_stock)              payload.is_stock              = fields.is_stock;
        if (fields.is_service)            payload.is_service            = fields.is_service;
        if (fields.is_batch)              payload.is_batch              = fields.is_batch;
        if (fields.is_serial)             payload.is_serial             = fields.is_serial;
        if (fields.is_gift_voucher)       payload.is_gift_voucher       = fields.is_gift_voucher;
        if (fields.has_extended_warranty) payload.has_extended_warranty = fields.has_extended_warranty;

        console.log('📡 [Save & Next] POSTing to bulk-upsert:', payload);

        const res = await fetch(`${API_BASE}/item-master-info/bulk-upsert/`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('❌ [Save & Next] API error:', errData);
          setEntitySaveStatus(prev => ({ ...prev, [entityId]: 'error' }));
          setTimeout(() => setEntitySaveStatus(prev => ({ ...prev, [entityId]: null })), 2500);
          return;
        }

        const result = await res.json();
        console.log('✅ [Save & Next] Saved successfully:', result);

        setEntitySaveStatus(prev => ({ ...prev, [entityId]: 'success' }));
        setTimeout(() => setEntitySaveStatus(prev => ({ ...prev, [entityId]: null })), 1800);
        unlockNextEntity(groupId, entityId);
        if (goToNextTab) {
          setCompletedTabs(prev => new Set([...prev, groupId]));
          const currentGroupIdx = groupOrder.indexOf(groupId);
          if (currentGroupIdx >= 0 && currentGroupIdx < groupOrder.length - 1) {
            setTimeout(() => setActiveGroupId(groupOrder[currentGroupIdx + 1]), 400);
          }
        }

      } catch (err) {
        console.error('❌ [Save & Next] Unexpected error:', err);
        setEntitySaveStatus(prev => ({ ...prev, [entityId]: 'error' }));
        setTimeout(() => setEntitySaveStatus(prev => ({ ...prev, [entityId]: null })), 2500);
      }
      return;
    }

    // 3. For all other entity IDs — just unlock (they have their own save mechanisms)

    // ── analysis-fields: POST (first time) or PUT (update) to analysis-fields API ──
    if (entityId === 'analysis-fields') {
      setEntitySaveStatus(prev => ({ ...prev, [entityId]: 'loading' }));
      try {
        const storedUser  = sessionStorage.getItem('userData');
        const parsed      = storedUser ? JSON.parse(storedUser) : null;
        const userId      = parsed?.user?.id || null;

        const entityDbId  = mappingRecord?.id || mappingRecord?.entity_id || null;
        const requestId   = mappingRecord?.request_id || null;

        if (!entityDbId) {
          console.error('❌ [Analysis Save & Next] No entity_id found in mappingRecord');
          setEntitySaveStatus(prev => ({ ...prev, [entityId]: 'error' }));
          setTimeout(() => setEntitySaveStatus(prev => ({ ...prev, [entityId]: null })), 2500);
          return;
        }

        const af = analysisDataRef.current || {};
        console.log('📦 [Analysis Save & Next] Collected fields (ref):', af);

        // Determine if record already exists (record_id set by onDataChange from load)
        const existingRecordId = af.record_id || null;

        let res;
        if (existingRecordId) {
          // Already exists — PUT update
          const updateBody = {
            category_id:       af.category_id       || null,
            sub_category_id:   af.sub_category_id   || null,
            product_id:        af.product_id        || null,
            classification_id: af.classification_id || null,
            updated_by:        userId,
            change_reason:     'Saved via Create Item Master — Save & Next',
          };
          console.log('📡 [Analysis Save & Next] PUTting to analysis-fields:', existingRecordId, updateBody);
          res = await fetch(`${API_BASE}/item-master-info/analysis-fields/${existingRecordId}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(updateBody),
          });
        } else {
          // First time — POST create
          const createBody = {
            entity_id:         entityDbId,
            request_id:        requestId,
            category_id:       af.category_id       || null,
            sub_category_id:   af.sub_category_id   || null,
            product_id:        af.product_id        || null,
            classification_id: af.classification_id || null,
            changed_by:        userId,
            change_reason:     'Saved via Create Item Master — Save & Next',
          };
          console.log('📡 [Analysis Save & Next] POSTing to analysis-fields:', createBody);
          res = await fetch(`${API_BASE}/item-master-info/analysis-fields/`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(createBody),
          });
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('❌ [Analysis Save & Next] API error:', errData);
          setEntitySaveStatus(prev => ({ ...prev, [entityId]: 'error' }));
          setTimeout(() => setEntitySaveStatus(prev => ({ ...prev, [entityId]: null })), 2500);
          return;
        }

        const result = await res.json();
        console.log('✅ [Analysis Save & Next] Saved successfully:', result);
        // Store returned record_id so next Save & Next click does PUT instead of POST
        analysisDataRef.current = { ...af, record_id: result.id };

        setEntitySaveStatus(prev => ({ ...prev, [entityId]: 'success' }));
        setTimeout(() => setEntitySaveStatus(prev => ({ ...prev, [entityId]: null })), 1800);
        unlockNextEntity(groupId, entityId);
        if (goToNextTab) {
          setCompletedTabs(prev => new Set([...prev, groupId]));
          const currentGroupIdx = groupOrder.indexOf(groupId);
          if (currentGroupIdx >= 0 && currentGroupIdx < groupOrder.length - 1) {
            setTimeout(() => setActiveGroupId(groupOrder[currentGroupIdx + 1]), 400);
          }
        }

      } catch (err) {
        console.error('❌ [Analysis Save & Next] Unexpected error:', err);
        setEntitySaveStatus(prev => ({ ...prev, [entityId]: 'error' }));
        setTimeout(() => setEntitySaveStatus(prev => ({ ...prev, [entityId]: null })), 2500);
      }
      return;
    }

    setEntitySaveStatus(prev => ({ ...prev, [entityId]: 'success' }));
    setTimeout(() => setEntitySaveStatus(prev => ({ ...prev, [entityId]: null })), 1500);
    unlockNextEntity(groupId, entityId);
    if (goToNextTab) {
      setCompletedTabs(prev => new Set([...prev, groupId]));
      const currentGroupIdx = groupOrder.indexOf(groupId);
      if (currentGroupIdx >= 0 && currentGroupIdx < groupOrder.length - 1) {
        setTimeout(() => setActiveGroupId(groupOrder[currentGroupIdx + 1]), 400);
      }
    }
  };

  // ── Render the professional action bar with two side-by-side buttons ────────
  const renderEntityCompleteBtn = (groupId, entityId) => {
    const entityList = groupEntityIds[groupId] || [];
    const idx = entityList.indexOf(entityId);
    if (idx < 0) return null;

    // ── Last entity in group → show "Complete Tab & Go to Next Tab" button ──
    if (idx >= entityList.length - 1) {
      const currentGroupIdx = groupOrder.indexOf(groupId);
      const isVeryLastTab = currentGroupIdx >= groupOrder.length - 1;
      const nextGroupMeta = isVeryLastTab ? null : GROUP_META[groupOrder[currentGroupIdx + 1]];
      const nextTabLabel  = isVeryLastTab ? 'Complete' : (nextGroupMeta?.label || groupOrder[currentGroupIdx + 1]);
      const saveStatus    = entitySaveStatus[entityId] || null;
      const saveDisabled  = saveStatus === 'loading' || saveStatus === 'success';
      const saveBg =
        saveStatus === 'success' ? 'linear-gradient(135deg,#10b981,#059669)' :
        saveStatus === 'error'   ? 'linear-gradient(135deg,#ef4444,#dc2626)' :
                                   'linear-gradient(135deg,#0ea5e9,#0284c7)';
      const saveLabel =
        saveStatus === 'loading' ? 'Saving…' :
        saveStatus === 'success' ? 'Saved!'  :
        saveStatus === 'error'   ? 'Fill Required Fields' :
                                   isVeryLastTab ? '\u2705 All Done' : `Save & Next: ${nextTabLabel}`;
      const saveIcon =
        saveStatus === 'loading' ? '⏳' :
        saveStatus === 'success' ? '✅' :
        saveStatus === 'error'   ? '⚠' : null;
      const btnBase = (bg, disabled) => ({
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '0 13px', height: 26, fontSize: 10, fontWeight: 700,
        letterSpacing: 0.2, background: bg, color: '#fff', border: 'none',
        borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.75 : 1,
        boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.13)',
        transition: 'all .18s ease', whiteSpace: 'nowrap', userSelect: 'none',
      });
      return (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, marginTop: 6, marginBottom: 10, padding: '7px 10px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid #e2e8f0', borderRadius: 8,
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, lineHeight: 1.4, flexShrink: 0 }}>
            {isVeryLastTab ? (
              <span style={{ color: '#059669', fontWeight: 700 }}>\ud83c\udf89 All tabs completed!</span>
            ) : (
              <><span style={{ color: '#94a3b8', marginRight: 3 }}>Next Tab:</span><span style={{ color: '#334155', fontWeight: 700 }}>{nextTabLabel}</span></>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={(e) => {
                const wrapper = e.currentTarget.closest('[data-entity-id]');
                handleSaveAndNext(groupId, entityId, wrapper, true);
              }}
              disabled={saveDisabled}
              style={btnBase(saveBg, saveDisabled)}
              onMouseEnter={e => { if (!saveDisabled) e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = saveDisabled ? 'none' : '0 3px 10px rgba(14,165,233,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = saveDisabled ? 'none' : '0 2px 8px rgba(0,0,0,0.13)'; }}
              title={`Save and move to next tab: ${nextTabLabel}`}
            >
              {saveIcon ? (
                <span style={{ fontSize: 10 }}>{saveIcon}</span>
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
              )}
              {saveLabel}
              {!saveStatus && (
                <>
                  <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.3)', margin: '0 1px' }} />
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      );
    }

    const nextId = entityList[idx + 1];
    const nextAlreadyUnlocked = isEntityUnlocked(groupId, nextId);
    if (nextAlreadyUnlocked) return null;

    const nextLabel     = ENTITY_LABELS[nextId] || nextId;
    const forwardStatus = entityForwardStatus[entityId] || null;
    const saveStatus    = entitySaveStatus[entityId]    || null;

    // ── Forward button visual state ──────────────────────────────────────────
    const fwdDisabled = forwardStatus === 'loading' || forwardStatus === 'success';
    const fwdBg =
      forwardStatus === 'success'    ? 'linear-gradient(135deg,#10b981,#059669)' :
      forwardStatus === 'error'      ? 'linear-gradient(135deg,#ef4444,#dc2626)' :
      forwardStatus === 'no_routing' ? 'linear-gradient(135deg,#6b7280,#4b5563)' :
      forwardStatus === 'loading'    ? 'linear-gradient(135deg,#818cf8,#6366f1)' :
                                       'linear-gradient(135deg,#6366f1,#4f46e5)';
    const fwdLabel =
      forwardStatus === 'loading'    ? 'Forwarding…' :
      forwardStatus === 'success'    ? 'Forwarded!' :
      forwardStatus === 'error'      ? 'Retry Forward' :
      forwardStatus === 'no_routing' ? 'No Routing Set' :
                                       'Forward';
    const fwdIcon =
      forwardStatus === 'loading'    ? '⏳' :
      forwardStatus === 'success'    ? '✅' :
      forwardStatus === 'error'      ? '↺' :
      forwardStatus === 'no_routing' ? '⚠' :
                                       null;

    // ── Save & Next button visual state ─────────────────────────────────────
    const saveDisabled = saveStatus === 'loading' || saveStatus === 'success';
    const saveBg =
      saveStatus === 'success' ? 'linear-gradient(135deg,#10b981,#059669)' :
      saveStatus === 'error'   ? 'linear-gradient(135deg,#ef4444,#dc2626)' :
                                 'linear-gradient(135deg,#0ea5e9,#0284c7)';
    const saveLabel =
      saveStatus === 'loading' ? 'Saving…'          :
      saveStatus === 'success' ? 'Saved!'            :
      saveStatus === 'error'   ? 'Fill Required Fields' :
                                 `Save & Next: ${nextLabel}`;
    const saveIcon =
      saveStatus === 'loading' ? '⏳' :
      saveStatus === 'success' ? '✅' :
      saveStatus === 'error'   ? '⚠' :
                                  null;

    // ── Shared button base style ─────────────────────────────────────────────
    const btnBase = (bg, disabled) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      padding: '0 13px',
      height: 26,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.2,
      background: bg,
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.75 : 1,
      boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.13)',
      transition: 'all .18s ease',
      whiteSpace: 'nowrap',
      userSelect: 'none',
    });

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 6,
          marginBottom: 10,
          padding: '7px 10px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Left label */}
        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, lineHeight: 1.4, flexShrink: 0 }}>
          <span style={{ color: '#94a3b8', marginRight: 3 }}>Next:</span>
          <span style={{ color: '#334155', fontWeight: 700 }}>{nextLabel}</span>
        </div>

        {/* Right: two buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

          {/* ── Forward button ── */}
          <button
            onClick={() => handleForwardEntity(entityId)}
            disabled={fwdDisabled}
            style={btnBase(fwdBg, fwdDisabled)}
            onMouseEnter={e => { if (!fwdDisabled) e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = fwdDisabled ? 'none' : '0 3px 10px rgba(99,102,241,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = fwdDisabled ? 'none' : '0 2px 8px rgba(0,0,0,0.13)'; }}
            title="Forward to the routing target configured in Workflow Builder"
          >
            {fwdIcon ? (
              <span style={{ fontSize: 10 }}>{fwdIcon}</span>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            )}
            {fwdLabel}
            {!forwardStatus && (
              <>
                <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.3)', margin: '0 1px' }} />
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </>
            )}
          </button>

          {/* ── Save & Next button ── */}
          <button
            onClick={(e) => {
              const wrapper = e.currentTarget.closest('[data-entity-id]');
              handleSaveAndNext(groupId, entityId, wrapper);
            }}
            disabled={saveDisabled}
            style={btnBase(saveBg, saveDisabled)}
            onMouseEnter={e => { if (!saveDisabled) e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = saveDisabled ? 'none' : '0 3px 10px rgba(14,165,233,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = saveDisabled ? 'none' : '0 2px 8px rgba(0,0,0,0.13)'; }}
            title={`Save current data and unlock ${nextLabel}`}
          >
            {saveIcon ? (
              <span style={{ fontSize: 10 }}>{saveIcon}</span>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
            )}
            {saveLabel}
            {!saveStatus && (
              <>
                <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.3)', margin: '0 1px' }} />
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </>
            )}
          </button>

        </div>
      </div>
    );
  };

  // ── Render a locked placeholder when an entity is not yet unlocked ─────────
  const renderLockedEntity = (groupId, entityId, blockerEntityId) => {
    const entityLabel  = ENTITY_LABELS[entityId]  || entityId;
    const blockerLabel = ENTITY_LABELS[blockerEntityId] || blockerEntityId;
    return (
      <div key={`locked-${entityId}`} style={{
        marginBottom: 12,
        background: '#f8fafc',
        border: '1.5px dashed #cbd5e1',
        borderRadius: 8,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
        opacity: 0.7,
      }}>
        <span style={{ fontSize: 22 }}>🔒</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>{entityLabel}</div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
            Complete <span style={{ fontWeight: 700, color: '#64748b' }}>{blockerLabel}</span> above to unlock this section
          </div>
        </div>
      </div>
    );
  };

  // ── 4. Render active tab content ──────────────────────────────────────────
  const renderTabContent = () => {
    const entityIds = groupEntityIds[activeGroupId] || [];

    // All groups use sequential unlocking
    return (
      <div>
        {entityIds.map((entityId, idx) => {
          const unlocked = isEntityUnlocked(activeGroupId, entityId);
          if (!unlocked) {
            const blockerEntityId = entityIds[idx - 1] || entityIds[0];
            return renderLockedEntity(activeGroupId, entityId, blockerEntityId);
          }
          // Render the entity + a "Done → next" button below it (if not last)
          return (
            <div key={entityId} data-entity-id={entityId}>
              {renderEntity(entityId)}
              {renderEntityCompleteBtn(activeGroupId, entityId)}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Tab accessibility helper ───────────────────────────────────────────────
  // A tab at index `idx` is accessible if:
  //   idx === 0  (first tab always accessible)
  //   OR all previous tabs have been completed
  const isTabAccessible = (groupId) => {
    const idx = groupOrder.indexOf(groupId);
    if (idx <= 0) return true;
    // every tab before this one must be in completedTabs
    for (let i = 0; i < idx; i++) {
      if (!completedTabs.has(groupOrder[i])) return false;
    }
    return true;
  };

  // ── Ref for tab content area — used to scan mandatory fields ───────────────
  const tabContentRef = useRef(null);

  // ── Collect unfilled mandatory inputs in a container ────────────────────────
  // Strategy: check computed border-color for rgb(239,68,68) = #ef4444
  // AND check inline borderColor/outline as fallback (React sets these directly).
  // This correctly detects both <input> fields and LOV wrapper divs.
  const collectUnfilledMandatory = (container) => {
    const unfilled = [];
    if (!container) return unfilled;

    container.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.readOnly && el.tagName === 'INPUT') {
        // LOV read-only inputs — check their wrapper div for red outline
        return;
      }
      const cs = window.getComputedStyle(el);
      const bc = cs.borderColor || '';
      const isComputedRed = bc === 'rgb(239, 68, 68)' || bc.includes('239, 68, 68');
      // Also check inline style (React sets inline borderColor as hex)
      const inlineRed = (el.style.borderColor || '').includes('#ef4444')
        || (el.style.border || '').includes('#ef4444');
      if ((isComputedRed || inlineRed) && !el.value?.trim()) {
        unfilled.push(el);
      }
    });

    // LOV fields: read-only inputs inside a wrapper div that has red outline/border
    container.querySelectorAll('div').forEach(div => {
      const cs = window.getComputedStyle(div);
      const outline = div.style.outline || cs.outline || '';
      const border  = div.style.border  || '';
      const isRedWrapper = outline.includes('239, 68, 68') || outline.includes('#ef4444')
        || border.includes('#ef4444');
      if (isRedWrapper) {
        const inp = div.querySelector('input[readonly], input[readOnly]');
        if (inp && !inp.value?.trim() && !unfilled.includes(inp)) {
          unfilled.push(inp);
        }
      }
    });

    return unfilled;
  };

  // ── Next tab handler ──────────────────────────────────────────────────────
  const handleNext = (btnEl) => {
    const currentIdx = groupOrder.indexOf(activeGroupId);
    if (currentIdx >= groupOrder.length - 1) return;

    // Validate mandatory fields in current tab
    const unfilled = collectUnfilledMandatory(tabContentRef.current);
    if (unfilled.length > 0) {
      unfilled.forEach(inp => {
        inp.style.boxShadow = '0 0 0 2px #ef4444';
        setTimeout(() => { inp.style.boxShadow = ''; }, 2500);
      });
      unfilled[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (btnEl) {
        const origBg   = btnEl.style.background;
        const origHTML = btnEl.innerHTML;
        btnEl.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        btnEl.textContent = '⚠️ Fill mandatory fields first';
        setTimeout(() => {
          btnEl.style.background = origBg;
          btnEl.innerHTML = origHTML;
        }, 2500);
      }
      return;
    }

    setCompletedTabs(prev => new Set([...prev, activeGroupId]));
    setActiveGroupId(groupOrder[currentIdx + 1]);
  };

  // ── Handle tab click with lock check ─────────────────────────────────────
  const handleTabClick = (groupId) => {
    if (isTabAccessible(groupId)) {
      setActiveGroupId(groupId);
      setShowLockWarning(false);
    } else {
      // Find which earlier tab is incomplete
      const idx = groupOrder.indexOf(groupId);
      const firstIncompleteIdx = groupOrder.findIndex((g, i) => i < idx && !completedTabs.has(g));
      const blockerMeta = firstIncompleteIdx >= 0 ? GROUP_META[groupOrder[firstIncompleteIdx]] : null;
      setShowLockWarning(blockerMeta?.label || 'previous page');
      setTimeout(() => setShowLockWarning(false), 2500);
    }
  };

  const isLast = activeGroupId === groupOrder[groupOrder.length - 1];
  const currentTabCompleted = completedTabs.has(activeGroupId);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, margin: 0, background: '#fff' }}>

      {/* ── Lock warning toast ── */}
      {showLockWarning && (
        <div style={{
          position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: '#1e1b4b', color: '#c7d2fe',
          border: '1px solid #6366f155', borderRadius: 8,
          padding: '8px 18px', fontSize: 11, fontWeight: 700,
          boxShadow: '0 6px 24px rgba(0,0,0,.35)',
          display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
          animation: 'cfSlideIn .2s ease',
        }}>
          🔒 Please complete &quot;<span style={{ color: '#a5b4fc' }}>{showLockWarning}</span>&quot; first
        </div>
      )}

      {/* ── Content ── */}
      <div ref={tabContentRef} style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0, padding: '8px 10px' }}>
        {renderTabContent()}

        {isLast && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 10, color: '#6b7280', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
              🎉 You have reached the last section
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs (bottom) ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        height: '15px', backgroundColor: 'transparent', flexShrink: 0,
        paddingLeft: '8px', paddingRight: '8px',
      }}>
        {/* Dynamic tabs in flow order */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {groupOrder.map((groupId, idx) => {
            const meta      = GROUP_META[groupId];
            if (!meta) return null;
            const isActive  = activeGroupId === groupId;
            const isDone    = completedTabs.has(groupId);
            const accessible = isTabAccessible(groupId);
            return (
              <button
                key={groupId}
                onClick={() => handleTabClick(groupId)}
                title={!accessible ? `Complete "${GROUP_META[groupOrder[idx - 1]]?.label}" first` : ''}
                style={{
                  padding: '0 10px', height: '15px', fontSize: '9px', fontWeight: '500',
                  background: isActive
                    ? 'linear-gradient(to right, #9ca3af, #93c5fd)'
                    : isDone
                      ? 'linear-gradient(to right, #bbf7d0, #86efac)'
                      : accessible
                        ? '#e5e7eb'
                        : '#f1f5f9',
                  color: isActive ? '#fff' : isDone ? '#166534' : accessible ? '#6b7280' : '#94a3b8',
                  border: 'none', cursor: accessible ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '3px',
                  borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px',
                  transition: 'all 0.2s', lineHeight: '15px',
                  opacity: accessible ? 1 : 0.6,
                }}
              >
                {!accessible ? '🔒' : isDone ? '✅' : meta.icon}
                {`${idx + 1}. ${meta.label}`}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default CreateItemMaster;