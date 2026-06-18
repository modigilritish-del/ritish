/**
 * RenderWorkflowCreateItemMaster.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the "Basic Item Master Info" group content in the order defined by
 * the saved custom flow for the given company/plant.
 *
 * - Reads localStorage key 'itemMasterCustomFlows'
 * - Finds the active flow matching mappingRecord.company.id (and optionally plant)
 * - Renders 'basic-info' entities in that flow's saved order
 * - Falls back to default order (ItemInfo → Analysis → CustomFields) if no
 *   matching flow is found
 * - GL Selection and Item Code Creation Point are rendered only if included
 *   in the flow's entity list
 *
 * Props:
 *   mappingRecord  — same record passed throughout InfoMaster chain (can be null)
 *
 * Zero changes to any other file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import ItemInfoMasterComp from './ItemInfoMaster';
import ItemMasterAnalysisFields from './ItemMasterAnalysisFields';

const API_BASE = 'http://localhost:8000/api';
const STORAGE_KEY = 'itemMasterCustomFlows';

// ── Dynamic component loaders for custom-fields ───────────────────────────────
const componentLoaders = {
  'Breez Custom Fields':           () => import('./BreezCustomFields').catch(() => ({ default: () => <div style={{ padding: 10, color: '#dc2626', fontSize: 11 }}>⚠️ BreezCustomFields load failed</div> })),
  'Sonata Custom Fields':          () => import('./SonataCustomFields').catch(() => ({ default: () => <div style={{ padding: 10, color: '#dc2626', fontSize: 11 }}>⚠️ SonataCustomFields load failed</div> })),
  'Sweet Nutrition Custom Fields': () => import('./SweetNutritionCustomFields').catch(() => ({ default: () => <div style={{ padding: 10, color: '#dc2626', fontSize: 11 }}>⚠️ SweetNutritionCustomFields load failed</div> })),
};

const typeMap = {
  'Breez Custom Fields':           'breez',
  'Sonata Custom Fields':          'sonata',
  'Sweet Nutrition Custom Fields': 'sweet',
};

// ── Default order of basic-info entity IDs ────────────────────────────────────
const DEFAULT_ENTITY_ORDER = [
  'item-info-master',
  'analysis-fields',
  'custom-fields',
  'gl-selection',
  'item-code-creation',
];

// ── Read saved flows from localStorage ───────────────────────────────────────
function loadSavedFlows() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Find the best matching flow for a given company ───────────────────────────
// Primary: match by company.id (real DB integer from API)
// Fallback: match by company.name (case-insensitive) for safety
function findMatchingFlow(flows, companyId, plantId, companyName, plantName) {
  if (!flows || flows.length === 0) return null;
  if (!companyId && !companyName) return null;

  const cMatch = (f) => {
    if (!f.company) return false;
    // Direct ID match (both are real DB integers now)
    if (companyId && f.company.id === companyId) return true;
    if (companyId && f.company.id === Number(companyId)) return true;
    // Name fallback
    if (companyName && f.company.name?.toLowerCase() === companyName.toLowerCase()) return true;
    return false;
  };

  const pMatch = (f) => {
    if (!f.plant) return true; // no plant restriction on flow = matches all
    if (plantId   && (f.plant.id === plantId || f.plant.id === Number(plantId))) return true;
    if (plantName && f.plant.name?.toLowerCase() === plantName.toLowerCase())    return true;
    return false;
  };

  // 1. Company + plant exact
  if (plantId || plantName) {
    const exact = flows.find(f => cMatch(f) && pMatch(f));
    if (exact) return exact;
  }
  // 2. Company only
  return flows.find(f => cMatch(f)) || null;
}

// ── GL Selection placeholder (rendered inline when in flow) ───────────────────
const GLSelectionPlaceholder = ({ mappingRecord }) => (
  <div style={{ marginBottom: 12, padding: '10px 14px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 8 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 }}>🏦 GL Selection</div>
    <div style={{ fontSize: 10, color: '#15803d' }}>GL Account · Item Code selection section</div>
  </div>
);

// ── Item Code Creation Point placeholder ──────────────────────────────────────
const ItemCodeCreationPlaceholder = ({ mappingRecord }) => (
  <div style={{ marginBottom: 12, padding: '10px 14px', background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 8 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>📦 Item Code Creation Point</div>
    <div style={{ fontSize: 10, color: '#1d4ed8' }}>Item Code · Creation section</div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const RenderWorkflowCreateItemMaster = ({ mappingRecord }) => {
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState(null);
  const [isActive, setIsActive]                 = useState(true);
  const [hasAnalysisAccess, setHasAnalysisAccess] = useState(false);
  const [accessibleOptions, setAccessibleOptions] = useState([]);
  const [loadedComponents, setLoadedComponents]   = useState({});
  const [activeTab, setActiveTab]               = useState(null);
  const [primaryPageName, setPrimaryPageName]   = useState(null);
  const [primaryPageRbacBlocked, setPrimaryPageRbacBlocked] = useState(false);

  // ── Resolve entity order from saved flow ─────────────────────────────────
  const [entityOrder, setEntityOrder] = useState(DEFAULT_ENTITY_ORDER);

  useEffect(() => {
    const flows     = loadSavedFlows();
    const companyId   = mappingRecord?.company?.id   || mappingRecord?.company_id;
    const plantId     = mappingRecord?.plant?.id     || mappingRecord?.plant_id;
    const companyName = mappingRecord?.company?.company_name || mappingRecord?.company?.name || '';
    const plantName   = mappingRecord?.plant?.plant_name     || mappingRecord?.plant?.name   || '';
    const matched   = findMatchingFlow(flows, companyId, plantId, companyName, plantName);
    if (matched && matched.groupEntityIds && matched.groupEntityIds['basic-info']) {
      setEntityOrder(matched.groupEntityIds['basic-info']);
    } else {
      setEntityOrder(DEFAULT_ENTITY_ORDER);
    }
  }, [mappingRecord]);

  // ── RBAC + custom fields fetch (same logic as InfoMaster.js) ─────────────
  const fetchAccessiblePages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setPrimaryPageName(null);
      setPrimaryPageRbacBlocked(false);
      setHasAnalysisAccess(false);

      const storedUser = sessionStorage.getItem('userData');
      if (!storedUser) { setError('No user data found in session. Please login again.'); setLoading(false); return; }

      const parsed = JSON.parse(storedUser);
      let user = parsed?.user;
      if (!user || !user.id) { setError('Invalid user data structure. User ID missing.'); setLoading(false); return; }

      if (!user.accesses || user.accesses.length === 0) {
        const userRes = await fetch(`${API_BASE}/users/${user.id}`);
        if (userRes.ok) {
          user = await userRes.json();
          parsed.user = user;
          sessionStorage.setItem('userData', JSON.stringify(parsed));
        }
      }

      if (!user.accesses || user.accesses.length === 0) { setError('No company access found for this user.'); setLoading(false); return; }

      const primaryAccess    = user.accesses.find(a => a.is_primary_company) || user.accesses[0];
      const userPrimaryCompanyId = primaryAccess?.company?.id;
      if (!userPrimaryCompanyId) { setError('No company ID found for this user.'); setLoading(false); return; }

      const menuRes  = await fetch(`${API_BASE}/rbac/users/${user.id}/accessible-menu?company_id=${userPrimaryCompanyId}`);
      if (!menuRes.ok) { const err = await menuRes.json(); setError(`API Error: ${err.detail || 'Failed to load accessible pages'}`); setLoading(false); return; }

      const menuJson = await menuRes.json();
      const allPages = [];
      const flattenMenu = (pages) => { pages.forEach(p => { allPages.push(p); if (p.children?.length) flattenMenu(p.children); }); };
      if (menuJson.menu?.length) flattenMenu(menuJson.menu);

      // Analysis Fields RBAC
      const analysisGranted = allPages.some(p => p.page_name === 'Analysis Fields' || p.page_url?.includes('item-master-analysis-fields'));
      setHasAnalysisAccess(analysisGranted);

      // Company primary page check
      const requestCompanyId = mappingRecord?.company?.id || mappingRecord?.company_id;
      if (requestCompanyId) {
        try {
          const pcaRes = await fetch(`${API_BASE}/page-access/company/${requestCompanyId}/pages`);
          if (pcaRes.ok) {
            const pcaRules = await pcaRes.json();
            const matchedRule = Array.isArray(pcaRules) && pcaRules.length > 0
              ? pcaRules.find(rule => rule.page?.page_name && typeMap[rule.page.page_name])
              : null;
            if (matchedRule) {
              const pageName = matchedRule.page.page_name;
              const rbacHasAccess = allPages.some(p => p.page_name === pageName);
              if (rbacHasAccess) {
                const type = typeMap[pageName];
                let CompToLoad = null;
                try { const mod = await componentLoaders[pageName](); CompToLoad = mod.default; } catch { CompToLoad = () => <div style={{ padding: 10, color: '#dc2626', fontSize: 11 }}>⚠️ {pageName} could not be loaded.</div>; }
                setLoadedComponents({ [type]: CompToLoad });
                setAccessibleOptions([{ value: type, label: pageName, page_route: matchedRule.page?.page_route || '' }]);
                setPrimaryPageName(pageName);
                setActiveTab(type);
                setLoading(false);
                return;
              } else {
                setPrimaryPageRbacBlocked(true);
                setPrimaryPageName(pageName);
                setLoading(false);
                return;
              }
            }
          }
        } catch {}
      }

      // Fallback: normal RBAC flow
      const accessiblePages = allPages
        .filter(p => typeMap[p.page_name] && componentLoaders[p.page_name])
        .map(p => ({ type: typeMap[p.page_name], page_name: p.page_name, page_route: p.page_url || p.page_route || '', loaderKey: p.page_name }));

      const componentsMap = {};
      await Promise.all(accessiblePages.map(async (page) => {
        try { const mod = await componentLoaders[page.loaderKey](); componentsMap[page.type] = mod.default; }
        catch { componentsMap[page.type] = () => <div style={{ padding: 10, color: '#dc2626', fontSize: 11 }}>⚠️ {page.page_name} could not be loaded.</div>; }
      }));

      setLoadedComponents(componentsMap);
      const options = accessiblePages.map(p => ({ value: p.type, label: p.page_name, page_route: p.page_route }));
      setAccessibleOptions(options);
      const cfOpts = options.filter(o => o.value !== 'item-info');
      if (cfOpts.length > 0) setActiveTab(cfOpts[0].value);
      setLoading(false);

    } catch (err) {
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  }, [mappingRecord]);

  useEffect(() => { fetchAccessiblePages(); }, [fetchAccessiblePages]);

  const customFieldsOptions = accessibleOptions.filter(o => o.value !== 'item-info');
  const hasMultipleCustomFields = customFieldsOptions.length > 1;

  // ── Render a custom-fields block ─────────────────────────────────────────
  const renderCustomFields = () => {
    if (primaryPageRbacBlocked) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fff7ed', border: '1px solid #fb923c', borderRadius: 8, marginBottom: 12 }}>
          <AlertCircle size={18} style={{ color: '#ea580c', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c2d12', marginBottom: 2 }}>Access Not Granted — {primaryPageName}</div>
            <div style={{ fontSize: 10, color: '#9a3412', lineHeight: 1.5 }}>
              This page's custom fields (<strong>{primaryPageName}</strong>) are linked to this company, but you don't have RBAC access to it. Please contact your administrator.
            </div>
          </div>
        </div>
      );
    }
    if (error) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, marginBottom: 12 }}>
          <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div style={{ fontSize: 10, color: '#7f1d1d' }}>{error}</div>
        </div>
      );
    }
    if (customFieldsOptions.length === 0) return null;
    return (
      <div style={{ marginBottom: 12 }}>
        {hasMultipleCustomFields ? (
          <div>
            <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 16 }}>
              {customFieldsOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setActiveTab(opt.value)}
                  style={{
                    padding: '8px 16px', fontSize: 11, fontWeight: 500,
                    background: activeTab === opt.value ? '#60a5fa' : 'transparent',
                    color: activeTab === opt.value ? '#fff' : '#6b7280',
                    border: 'none',
                    borderBottom: activeTab === opt.value ? '2px solid #2563eb' : '2px solid transparent',
                    cursor: 'pointer', marginBottom: -2, transition: 'all .2s',
                  }}
                >{opt.label}</button>
              ))}
            </div>
            {customFieldsOptions.map(opt => {
              if (activeTab !== opt.value) return null;
              const Comp = loadedComponents[opt.value];
              if (!Comp) return null;
              return <div key={opt.value}><Comp mappingRecord={mappingRecord} /></div>;
            })}
          </div>
        ) : (
          customFieldsOptions.map(opt => {
            const Comp = loadedComponents[opt.value];
            if (!Comp) return null;
            return <div key={opt.value}><Comp mappingRecord={mappingRecord} /></div>;
          })
        )}
      </div>
    );
  };

  // ── Map entity ID → render function ──────────────────────────────────────
  const renderEntity = (entityId) => {
    switch (entityId) {
      case 'item-info-master':
        return (
          <div key="item-info-master" style={{ marginBottom: 12 }}>
            <ItemInfoMasterComp mappingRecord={mappingRecord} />
          </div>
        );
      case 'analysis-fields':
        if (!hasAnalysisAccess) return null;
        return (
          <div key="analysis-fields" style={{ marginBottom: 12 }}>
            <ItemMasterAnalysisFields mappingRecord={mappingRecord} />
          </div>
        );
      case 'custom-fields':
        return <div key="custom-fields">{renderCustomFields()}</div>;
      case 'gl-selection':
        return <GLSelectionPlaceholder key="gl-selection" mappingRecord={mappingRecord} />;
      case 'item-code-creation':
        return <ItemCodeCreationPlaceholder key="item-code-creation" mappingRecord={mappingRecord} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white" style={{ height: '24px', paddingRight: '8px' }}>
        <h2 className="m-0 text-xs font-semibold">Create Item Code 👇</h2>
        <button
          onClick={() => setIsActive(!isActive)}
          style={{
            padding: '2px 12px', background: isActive ? '#10b981' : '#ef4444',
            color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer',
            fontSize: 10, fontWeight: 500, height: '18px', lineHeight: '14px',
          }}
        >{isActive ? 'Active' : 'Inactive'}</button>
      </div>

      {/* Content */}
      <div className="flex-1 p-2.5 overflow-auto">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 32 }}>⏳</div>
            <div style={{ fontSize: 11, color: '#666' }}>Loading accessible pages...</div>
          </div>
        ) : (
          <div>
            {/* Render entities in saved flow order (or default order) */}
            {entityOrder.map(entityId => renderEntity(entityId))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700" style={{ height: '8px' }} />
    </div>
  );
};

export default RenderWorkflowCreateItemMaster;