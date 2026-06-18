import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
// ── PERMANENT: ItemInfoMaster hamesha show hoga, page-access se independent ──
import ItemInfoMasterComp from "../ItemMasterPages/ItemInfoMaster.js";
// ── RBAC-gated: Analysis Fields — RBAC check se control hoga ──
import ItemMasterAnalysisFields from "../ItemMasterPages/ItemMasterAnalysisFields.js";

const API_BASE = 'http://localhost:8000/api';

// ==================== DYNAMIC IMPORTS - ek fail ho toh baaki safe rahein ====================
const componentLoaders = {
  'Breez Custom Fields':           () => import("../ItemMasterPages/BreezCustomFields.js").catch(()          => ({ default: () => <div style={{padding:10,color:'#dc2626',fontSize:11}}>⚠️ BreezCustomFields load failed</div> })),
  'Sonata Custom Fields':          () => import("../ItemMasterPages/SonataCustomFields.js").catch(()         => ({ default: () => <div style={{padding:10,color:'#dc2626',fontSize:11}}>⚠️ SonataCustomFields load failed</div> })),
  'Sweet Nutrition Custom Fields': () => import("../ItemMasterPages/SweetNutritionCustomFields.js").catch(() => ({ default: () => <div style={{padding:10,color:'#dc2626',fontSize:11}}>⚠️ SweetNutritionCustomFields load failed</div> })),
};

const typeMap = {
  'Breez Custom Fields':           'breez',
  'Sonata Custom Fields':          'sonata',
  'Sweet Nutrition Custom Fields': 'sweet',
};

// ── Analysis Fields RBAC page name ───────────────────────────────────────────
const ANALYSIS_PAGE_NAME = 'Analysis Fields';

// ── Workflow flow localStorage helpers ───────────────────────────────────────
const STORAGE_KEY = 'itemMasterCustomFlows';

const DEFAULT_ENTITY_ORDER = [
  'item-info-master',
  'custom-fields',
  'analysis-fields',
  'gl-selection',
  'item-code-creation',
];

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
    if (plantName && f.plant.name?.toLowerCase() === plantName.toLowerCase())    return true;
    return false;
  };
  if (plantId || plantName) {
    const exact = flows.find(f => cMatch(f) && pMatch(f));
    if (exact) return exact;
  }
  return flows.find(f => cMatch(f)) || null;
}

// ── Inline placeholders for GL Selection & Item Code Creation Point ──────────
const GLSelectionPlaceholder = ({ mappingRecord: _mr }) => (
  <div style={{ marginBottom: 12, padding: '10px 14px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 8 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 }}>🏦 GL Selection</div>
    <div style={{ fontSize: 10, color: '#15803d' }}>GL Account · Item Code selection section</div>
  </div>
);

const ItemCodeCreationPlaceholder = ({ mappingRecord: _mr }) => (
  <div style={{ marginBottom: 12, padding: '10px 14px', background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 8 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>📦 Item Code Creation Point</div>
    <div style={{ fontSize: 10, color: '#1d4ed8' }}>Item Code · Creation section</div>
  </div>
);

// ==================== MAIN INFO MASTER COMPONENT WITH PAGE-ACCESS RBAC ====================
const InfoMaster = ({ mappingRecord }) => {
  const [loading, setLoading] = useState(true);
  const [accessibleOptions, setAccessibleOptions] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [loadedComponents, setLoadedComponents] = useState({});

  // ── Flow-aware entity order ───────────────────────────────────────────────
  const [entityOrder, setEntityOrder] = useState(DEFAULT_ENTITY_ORDER);
  // true = Workflow Builder ne explicitly set kiya hai → analysis-fields ko
  // RBAC check bypass karke directly render karo
  const [isFlowCustomized, setIsFlowCustomized] = useState(false);

  useEffect(() => {
    const flows       = loadSavedFlows();
    const companyId   = mappingRecord?.company?.id   || mappingRecord?.company_id;
    const plantId     = mappingRecord?.plant?.id     || mappingRecord?.plant_id;
    const companyName = mappingRecord?.company?.company_name || mappingRecord?.company?.name || '';
    const plantName   = mappingRecord?.plant?.plant_name     || mappingRecord?.plant?.name   || '';
    const matched     = findMatchingFlow(flows, companyId, plantId, companyName, plantName);
    if (matched?.groupEntityIds?.['basic-info']?.length > 0) {
      setEntityOrder(matched.groupEntityIds['basic-info']);
      setIsFlowCustomized(true);
    } else {
      setEntityOrder(DEFAULT_ENTITY_ORDER);
      setIsFlowCustomized(false);
    }
  }, [mappingRecord]);

  // ── Analysis Fields RBAC state ────────────────────────────────────────────
  // true  → RBAC ne access diya → render karo
  // false → access nahi → mat dikhao (silently skip)
  const [hasAnalysisAccess, setHasAnalysisAccess] = useState(false);

  // ── company-primary-page state ──────────────────────────────────────
  const [primaryPageName,        setPrimaryPageName]        = useState(null);
  const [primaryPageRbacBlocked, setPrimaryPageRbacBlocked] = useState(false);

  const fetchAccessiblePages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setPrimaryPageName(null);
      setPrimaryPageRbacBlocked(false);
      setHasAnalysisAccess(false);

      console.log('🔍 [INFO MASTER] Fetching user accessible pages from RBAC system...');

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
      console.log('📡 [INFO MASTER] Fetching user details for company access...');
      const userRes = await fetch(`${API_BASE}/users/${user.id}`);
      if (userRes.ok) {
        user = await userRes.json();
        parsed.user = user;
        sessionStorage.setItem('userData', JSON.stringify(parsed));
      }

      if (!user.accesses || user.accesses.length === 0) {
        setError('No company access found for this user.');
        setLoading(false);
        return;
      }

      const primaryAccess = user.accesses.find(a => a.is_primary_company) || user.accesses[0];
      const userPrimaryCompanyId = primaryAccess?.company?.id;

      if (!userPrimaryCompanyId) {
        setError('No company ID found for this user.');
        setLoading(false);
        return;
      }

      const rbacMenuUrl = `${API_BASE}/rbac/users/${user.id}/accessible-menu?company_id=${userPrimaryCompanyId}`;
      console.log('📡 [INFO MASTER] Fetching RBAC menu from:', rbacMenuUrl);

      const menuRes = await fetch(rbacMenuUrl);

      if (!menuRes.ok) {
        const errorData = await menuRes.json();
        console.error('❌ [INFO MASTER] API Error:', errorData);
        setError(`API Error: ${errorData.detail || 'Failed to load accessible pages'}`);
        setLoading(false);
        return;
      }

      const menuJson = await menuRes.json();
      console.log('✅ [INFO MASTER] RBAC menu response:', menuJson);

      const allPages = [];
      const flattenMenu = (pages) => {
        pages.forEach(page => {
          allPages.push(page);
          if (page.children && page.children.length > 0) flattenMenu(page.children);
        });
      };
      if (menuJson.menu && menuJson.menu.length > 0) flattenMenu(menuJson.menu);

      // ── Analysis Fields RBAC check ────────────────────────────────────────
      // page_name OR page_url se match karo — dono check karo
      const analysisGranted = allPages.some(p =>
        p.page_name === ANALYSIS_PAGE_NAME ||
        p.page_url?.includes('item-master-analysis-fields')
      );
      setHasAnalysisAccess(analysisGranted);
      console.log('📊 [INFO MASTER] Analysis Fields RBAC access:', analysisGranted);

      // ── STEP 1 — mappingRecord ki company ka primary page check karo ───
      const requestCompanyId = mappingRecord?.company?.id;

      if (requestCompanyId) {
        console.log('🏢 [INFO MASTER] Checking page-company-access for request company:', requestCompanyId);
        try {
          const pcaRes = await fetch(`${API_BASE}/page-access/company/${requestCompanyId}/pages`);
          if (pcaRes.ok) {
            const pcaRules = await pcaRes.json();
            const matchedRule = Array.isArray(pcaRules) && pcaRules.length > 0
              ? pcaRules.find(rule => rule.page?.page_name && typeMap[rule.page.page_name])
              : null;

            if (matchedRule) {
              const pageName = matchedRule.page.page_name;
              console.log('🎯 [INFO MASTER] Primary page found for company:', pageName);

              const rbacHasAccess = allPages.some(p => p.page_name === pageName);

              if (rbacHasAccess) {
                console.log('✅ [INFO MASTER] RBAC access confirmed for primary page:', pageName);
                const type = typeMap[pageName];

                let CompToLoad = null;
                try {
                  const mod = await componentLoaders[pageName]();
                  CompToLoad = mod.default;
                } catch (e) {
                  console.error(`❌ Failed to load component for ${pageName}:`, e);
                  CompToLoad = () => (
                    <div style={{ padding: 10, color: '#dc2626', fontSize: 11 }}>
                      ⚠️ {pageName} could not be loaded.
                    </div>
                  );
                }

                setLoadedComponents({ [type]: CompToLoad });
                setAccessibleOptions([{
                  value:      type,
                  label:      pageName,
                  page_route: matchedRule.page?.page_route || '',
                }]);
                setPrimaryPageName(pageName);
                setActiveTab(type);
                setLoading(false);
                return;
              } else {
                console.warn('🚫 [INFO MASTER] Primary page set but no RBAC access:', pageName);
                setPrimaryPageRbacBlocked(true);
                setPrimaryPageName(pageName);
                setLoading(false);
                return;
              }
            } else {
              console.log('ℹ️ [INFO MASTER] No matching primary page in page-company-access — falling back to RBAC');
            }
          }
        } catch (pcaErr) {
          console.warn('⚠️ [INFO MASTER] page-company-access check failed, falling back:', pcaErr.message);
        }
      }

      // ── FALLBACK: Normal RBAC flow ──────────────────────────────────────────
      const accessiblePages = allPages
        .filter(p => typeMap[p.page_name] && componentLoaders[p.page_name])
        .map(p => ({
          type:       typeMap[p.page_name],
          page_name:  p.page_name,
          page_route: p.page_url || p.page_route || '',
          loaderKey:  p.page_name,
        }));

      console.log('🎯 [INFO MASTER] Matched custom field pages (fallback):', accessiblePages);

      const componentsMap = {};
      await Promise.all(
        accessiblePages.map(async (page) => {
          try {
            const mod = await componentLoaders[page.loaderKey]();
            componentsMap[page.type] = mod.default;
          } catch (e) {
            console.error(`❌ Failed to load component for ${page.page_name}:`, e);
            componentsMap[page.type] = () => (
              <div style={{ padding: 10, color: '#dc2626', fontSize: 11 }}>
                ⚠️ {page.page_name} could not be loaded.
              </div>
            );
          }
        })
      );

      setLoadedComponents(componentsMap);

      const options = accessiblePages.map(page => ({
        value:      page.type,
        label:      page.page_name,
        page_route: page.page_route,
      }));

      setAccessibleOptions(options);

      const customFieldsOpts = options.filter(opt => opt.value !== 'item-info');
      if (customFieldsOpts.length > 0) {
        setActiveTab(customFieldsOpts[0].value);
      }

      setLoading(false);

    } catch (err) {
      console.error('❌ [INFO MASTER] Error:', err);
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  }, [mappingRecord]);

  useEffect(() => {
    fetchAccessiblePages();
  }, [fetchAccessiblePages]);

  const customFieldsOptions = accessibleOptions.filter(opt => opt.value !== 'item-info');
  const hasMultipleCustomFields = customFieldsOptions.length > 1;

  // ── Render one entity block by its ID ──────────────────────────────────────
  const renderEntity = (entityId) => {
    switch (entityId) {

      case 'item-info-master':
        return (
          <div key="item-info-master" style={{ marginBottom: 12 }}>
            <ItemInfoMasterComp mappingRecord={mappingRecord} />
          </div>
        );

      case 'analysis-fields':
        // Workflow Builder ne explicitly add kiya hai → seedha render karo
        // Default order mein hai → RBAC check karo (pehle jaisa behaviour)
        if (!isFlowCustomized && !hasAnalysisAccess) return null;
        return (
          <div key="analysis-fields" style={{ marginBottom: 12 }}>
            <ItemMasterAnalysisFields mappingRecord={mappingRecord} />
          </div>
        );

      case 'custom-fields':
        if (primaryPageRbacBlocked) {
          return (
            <div key="custom-fields" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', background: '#fff7ed',
              border: '1px solid #fb923c', borderRadius: 8, marginBottom: 12,
            }}>
              <AlertCircle size={18} style={{ color: '#ea580c', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7c2d12', marginBottom: 2 }}>
                  Access Not Granted — {primaryPageName}
                </div>
                <div style={{ fontSize: 10, color: '#9a3412', lineHeight: 1.5 }}>
                  This page's custom fields (<strong>{primaryPageName}</strong>) are linked to this company,
                  but you don't have RBAC access to it. Please contact your administrator.
                </div>
              </div>
            </div>
          );
        }
        if (error) {
          return (
            <div key="custom-fields-error" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, marginBottom: 12 }}>
              <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div style={{ fontSize: 10, color: '#7f1d1d' }}>{error}</div>
            </div>
          );
        }
        if (customFieldsOptions.length === 0) return null;
        return (
          <div key="custom-fields" style={{ marginBottom: 12 }}>
            {hasMultipleCustomFields ? (
              <div>
                <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 16 }}>
                  {customFieldsOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setActiveTab(option.value)}
                      style={{
                        padding: '8px 16px', fontSize: 11, fontWeight: 500,
                        background: activeTab === option.value ? '#60a5fa' : 'transparent',
                        color: activeTab === option.value ? '#fff' : '#6b7280',
                        border: 'none',
                        borderBottom: activeTab === option.value ? '2px solid #2563eb' : '2px solid transparent',
                        cursor: 'pointer', marginBottom: -2, transition: 'all 0.2s',
                      }}
                    >{option.label}</button>
                  ))}
                </div>
                {customFieldsOptions.map(option => {
                  if (activeTab !== option.value) return null;
                  const Comp = loadedComponents[option.value];
                  if (!Comp) return null;
                  return <div key={option.value}><Comp mappingRecord={mappingRecord} /></div>;
                })}
              </div>
            ) : (
              customFieldsOptions.map(option => {
                const Comp = loadedComponents[option.value];
                if (!Comp) return null;
                return <div key={option.value}><Comp mappingRecord={mappingRecord} /></div>;
              })
            )}
          </div>
        );

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
      {/* Header with Active/Inactive Button */}
      <div className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white" style={{ height: '24px', paddingRight: '8px' }}>
        <h2 className="m-0 text-xs font-semibold">Create Item Code 👇</h2>
        <button
          onClick={() => setIsActive(!isActive)}
          style={{
            padding: '2px 12px',
            background: isActive ? '#10b981' : '#ef4444',
            color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer',
            fontSize: 10, fontWeight: 500, height: '18px', lineHeight: '14px',
          }}
        >
          {isActive ? 'Active' : 'Inactive'}
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 p-2.5 overflow-auto">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 32 }}>⏳</div>
            <div style={{ fontSize: 11, color: '#666' }}>Loading accessible pages...</div>
          </div>
        ) : (
          <div>
            {/* ── Render entities in saved flow order (or default order) ── */}
            {entityOrder.map(entityId => renderEntity(entityId))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700" style={{ height: '8px' }} />
    </div>
  );
};

export default InfoMaster;