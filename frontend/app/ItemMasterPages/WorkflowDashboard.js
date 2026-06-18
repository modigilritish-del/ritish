/**
 * WorkflowDashboard.js  –  ItemMasterPages/
 *
 * ✅ Entity node click → MFC popup (unchanged)
 * ✅ Step card click   → WorkflowStep1Popup
 * ✅ MFC button in actions column (unchanged)
 * ✅ Page Company Access node — between Step 1 and Step 2
 * ✅ Item Master Sales & Finance step — after Item Master Inventory
 * ✅ Item Master Warehouse & Purchase step — after Sales & Finance
 * ✅ Flow diagram extracted to WorkflowFlow.js — zero visual changes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Settings, Users, GitBranch, Layers, X } from 'lucide-react';
import { API_BASE, HDR, FTR, approvalClr } from './workflowConstants';
import MfcPopup, { Toast } from './MfcPopup';
import WorkflowStep1Popup from './WorkflowStep1Popup';
import ItemCodeWorkflowStepTwo from './ItemCodeWorkflowStepTwo';
import UserDeptAccessPopup from './UserDeptAccessPopup';
import ItemCodePageCompAccessPopup from './ItemCodePageCompAccessPopup';
import ItemInfoMasterMfcPopup from './ItemInfoMasterMfcPopup';
import ItemInfoMasterPagePopup from './ItemInfoMasterPagePopup';
import InfoMasterPagePopup from './InfoMasterPagePopup';
import BasicItemInfoPagePopup from './BasicItemInfoPagePopup';
import AnalysisFieldsPagePopup from './AnalysisFieldsPagePopup';
import CustomFieldsPagePopup from './CustomFieldsPagePopup';
import InventoryPagePopup from './InventoryPagePopup';
import ItemMasterInventoryPagePopup from './ItemMasterInventoryPagePopup';
import SalesAndFinancePagePopup from './SalesAndFinancePagePopup';
import ItemMasterSalesDetailPagePopup from './ItemMasterSalesDetailPagePopup';
import ItemMasterFinanceDetailsPagePopup from './ItemMasterFinanceDetailsPagePopup';
import WarehouseAndPurchasePagePopup from './WarehouseAndPurchasePagePopup';
import ItemMasterWarehouseDetailsPagePopup from './ItemMasterWarehouseDetailsPagePopup';
import ItemMasterPurchaseDetailsPagePopup from './ItemMasterPurchaseDetailsPagePopup';
import RenderItemMasterInvPropertiesPagePopup from './RenderItemMasterInvPropertiesPagePopup';
import ItemMasterInvPropertiesPagePopup from './ItemMasterInvPropertiesPagePopup';
import CreateItemMasterPagePopup from './CreateItemMasterPagePopup';
import ItemMasterGLSelectionPagePopup from './ItemMasterGLSelectionPagePopup';
import ItemCodeCreationPointPopup from './ItemCodeCreationPointPopup';
import WorkflowFlow from './ItemMasterWorkflow';
import ItemMasterWorkflowBuilderPopup from './ItemMasterWorkflowBuilderPopup';

// ═════════════════════════════════════════════════════════════════════════════
export default function WorkflowDashboard() {
  const [templates,     setTemplates]     = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [toast,         setToast]         = useState(null);
  const [mfcFor,        setMfcFor]        = useState(null);
  const [step1For,      setStep1For]      = useState(null);
  const [step2For,      setStep2For]      = useState(null);
  const [userAccess,    setUserAccess]    = useState(false);
  const [pageAccessFor, setPageAccessFor] = useState(null);
  const [itemInfoMfc,        setItemInfoMfc]        = useState(false);
  const [itemInfoPage,       setItemInfoPage]       = useState(null);
  const [basicItemInfoPage,  setBasicItemInfoPage]  = useState(null);
  const [analysisFieldsPage, setAnalysisFieldsPage] = useState(null);
  const [customFieldsPage,   setCustomFieldsPage]   = useState(null);
  const [inventoryPage,      setInventoryPage]      = useState(false);
  const [inventoryEntityPage, setInventoryEntityPage] = useState(false);
  const [expandedInventory,  setExpandedInventory]  = useState({});
  const [expandedItemMasterInv, setExpandedItemMasterInv] = useState({});

  // ── Sales & Finance state ─────────────────────────────────────────────────
  const [salesFinancePage,        setSalesFinancePage]        = useState(false);
  const [salesDetailEntityPage,   setSalesDetailEntityPage]   = useState(null);
  const [financeDetailsEntityPage, setFinanceDetailsEntityPage] = useState(null);
  const [expandedSalesFinance,    setExpandedSalesFinance]    = useState({});

  // ── Warehouse & Purchase state ────────────────────────────────────────────
  const [warehousePurchasePage,        setWarehousePurchasePage]        = useState(false);
  const [warehouseDetailsEntityPage,   setWarehouseDetailsEntityPage]   = useState(null);
  const [purchaseDetailsEntityPage,    setPurchaseDetailsEntityPage]    = useState(null);
  const [expandedWarehousePurchase,    setExpandedWarehousePurchase]    = useState({});
  const [expandedItemMasterOuter,      setExpandedItemMasterOuter]      = useState({});

  // ── Inv Properties state ──────────────────────────────────────────────────
  const [invPropertiesPage,          setInvPropertiesPage]          = useState(false);
  const [invPropertiesEntityPage,    setInvPropertiesEntityPage]    = useState(null);
  const [expandedInvProperties,      setExpandedInvProperties]      = useState({});
  const [createItemMasterOpen,         setCreateItemMasterOpen]         = useState(null); // null | { mappingRecord }
  const [glSelectionPage,              setGLSelectionPage]              = useState(null);
  const [itemCodeCreationPointPage,    setItemCodeCreationPointPage]    = useState(null);
  const [workflowBuilderOpen,          setWorkflowBuilderOpen]          = useState(false);

  const [searchTerm,    setSearchTerm]    = useState('');
  const [filterStatus,  setFilterStatus]  = useState('all');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/workflow/templates/`);
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch { showToast('Failed to load templates', 'error'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = templates.filter(t => {
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? t.is_active : !t.is_active);
    const q = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || t.name?.toLowerCase().includes(q) || t.code?.toLowerCase().includes(q) || t.company?.company_name?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // ── All popup setters passed to WorkflowFlow ──────────────────────────────
  const flowProps = {
    expandedInventory,        setExpandedInventory,
    expandedItemMasterInv,    setExpandedItemMasterInv,
    expandedSalesFinance,     setExpandedSalesFinance,
    expandedWarehousePurchase, setExpandedWarehousePurchase,
    expandedItemMasterOuter,  setExpandedItemMasterOuter,
    setUserAccess,
    setMfcFor,
    setStep1For,
    setStep2For,
    setPageAccessFor,
    setItemInfoMfc,
    setItemInfoPage,
    setBasicItemInfoPage,
    setAnalysisFieldsPage,
    setCustomFieldsPage,
    setInventoryPage,
    setInventoryEntityPage,
    setSalesFinancePage,
    setSalesDetailEntityPage,
    setFinanceDetailsEntityPage,
    setWarehousePurchasePage,
    setWarehouseDetailsEntityPage,
    setPurchaseDetailsEntityPage,
    setCreateItemMasterOpen,
    setGLSelectionPage,
    setItemCodeCreationPointPage,
    setWorkflowBuilderOpen,
    expandedInvProperties,      setExpandedInvProperties,
    setInvPropertiesPage,
    setInvPropertiesEntityPage,
  };

  // ── Single template row ────────────────────────────────────────────────────
  const renderFlowCard = (tmpl, idx) => {
    const sortedSteps    = (tmpl.steps || []).sort((a, b) => a.step_order - b.step_order);
    const totalApprovers = sortedSteps.reduce((sum, s) => sum + (s.approvers?.length || 0), 0);

    return (
      <React.Fragment key={tmpl.id}>
        {/* Meta row */}
        <tr
          style={{ background: idx % 2 ? '#f9fafb' : '#fff', borderBottom: '1px solid #f3f4f6' }}
          onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
          onMouseLeave={e => e.currentTarget.style.background = idx % 2 ? '#f9fafb' : '#fff'}
        >
          <td style={{ padding: '6px 8px', color: '#9ca3af', fontSize: 10 }}>{idx + 1}</td>
          <td style={{ padding: '6px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Layers size={13} color="#93c5fd" />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{tmpl.name}</div>
                <div style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>{tmpl.code}</div>
              </div>
            </div>
          </td>
          <td style={{ padding: '6px 8px', fontSize: 10, color: '#374151' }}>{tmpl.company?.company_name || '—'}</td>
          <td style={{ padding: '6px 8px' }}>
            <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
              {sortedSteps.length} step{sortedSteps.length !== 1 ? 's' : ''}
            </span>
          </td>
          <td style={{ padding: '6px 8px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
              <Users size={9} /> {totalApprovers}
            </span>
          </td>
          <td style={{ padding: '6px 8px' }}>
            <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: tmpl.is_active ? '#d1fae5' : '#fee2e2', color: tmpl.is_active ? '#065f46' : '#991b1b' }}>
              {tmpl.is_active ? '● Active' : '○ Inactive'}
            </span>
          </td>
          <td style={{ padding: '6px 8px' }}>
            <button
              onClick={() => setMfcFor({ pageKey: 'item-code-creation-req', pageName: tmpl.name })}
              title="Configure Mandatory Fields"
              style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fbbf24'; e.currentTarget.style.color = '#451a03'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fef3c7'; e.currentTarget.style.color = '#92400e'; }}
            >
              <Settings size={10} /> MFC
            </button>
          </td>
        </tr>

        {/* Flow diagram sub-row — uses WorkflowFlow component */}
        <tr style={{ background: '#f8fafc' }}>
          <td colSpan={7} style={{ padding: '0 12px 14px 44px', borderBottom: '2px solid #e2e8f0' }}>
            <WorkflowFlow tmpl={tmpl} {...flowProps} />
          </td>
        </tr>
      </React.Fragment>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 11, background: '#f1f5f9', position: 'relative' }}>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* MFC popup */}
      {mfcFor && <MfcPopup pageKey={mfcFor.pageKey} pageName={mfcFor.pageName} onClose={() => setMfcFor(null)} />}

      {/* User Dept Access popup */}
      {userAccess && <UserDeptAccessPopup onClose={() => setUserAccess(false)} />}

      {/* Page Company Access popup */}
      {pageAccessFor && (
        <ItemCodePageCompAccessPopup
          tmpl={pageAccessFor}
          onClose={() => setPageAccessFor(null)}
        />
      )}

      {/* Create Item Master popup */}
      {createItemMasterOpen && (
        <CreateItemMasterPagePopup
          onClose={() => setCreateItemMasterOpen(null)}
          mappingRecord={createItemMasterOpen?.mappingRecord ?? null}
        />
      )}

      {/* Item Master MFC popup */}
      {itemInfoMfc && <ItemInfoMasterMfcPopup onClose={() => setItemInfoMfc(false)} />}

      {/* Item Info Master page popup */}
      {itemInfoPage && (
        <ItemInfoMasterPagePopup
          mappingRecord={itemInfoPage.mappingRecord}
          onClose={() => setItemInfoPage(null)}
        />
      )}

      {/* Basic Item Master Info page popup — full InfoMaster (dedicated popup) */}
      {basicItemInfoPage && (
        <BasicItemInfoPagePopup
          mappingRecord={basicItemInfoPage.mappingRecord}
          onClose={() => setBasicItemInfoPage(null)}
        />
      )}

      {/* Analysis Fields page popup */}
      {analysisFieldsPage && (
        <AnalysisFieldsPagePopup
          mappingRecord={analysisFieldsPage.mappingRecord}
          onClose={() => setAnalysisFieldsPage(null)}
        />
      )}

      {/* Custom Fields page popup */}
      {customFieldsPage && (
        <CustomFieldsPagePopup
          mappingRecord={customFieldsPage.mappingRecord}
          onClose={() => setCustomFieldsPage(null)}
        />
      )}

      {/* GL Selection page popup */}
      {glSelectionPage && (
        <ItemMasterGLSelectionPagePopup
          mappingRecord={glSelectionPage.mappingRecord}
          onClose={() => setGLSelectionPage(null)}
        />
      )}

      {/* Item Code Creation Point popup */}
      {itemCodeCreationPointPage && (
        <ItemCodeCreationPointPopup
          mappingRecord={itemCodeCreationPointPage.mappingRecord}
          onClose={() => setItemCodeCreationPointPage(null)}
        />
      )}

      {/* Item Master Workflow Builder popup */}
      {workflowBuilderOpen && (
        <ItemMasterWorkflowBuilderPopup
          onClose={() => setWorkflowBuilderOpen(false)}
          mappingRecord={null}
        />
      )}

      {/* Item Master Inventory page popup — RBAC (main card View Page) */}
      {inventoryPage && (
        <InventoryPagePopup
          onClose={() => setInventoryPage(false)}
        />
      )}

      {/* Item Master Inventory entity popup — direct form (entity node View Page) */}
      {inventoryEntityPage && (
        <ItemMasterInventoryPagePopup
          onClose={() => setInventoryEntityPage(false)}
        />
      )}

      {/* Sales & Finance popups */}
      {salesFinancePage && (
        <SalesAndFinancePagePopup
          onClose={() => setSalesFinancePage(false)}
        />
      )}
      {salesDetailEntityPage && (
        <ItemMasterSalesDetailPagePopup
          mappingRecord={salesDetailEntityPage.mappingRecord}
          onClose={() => setSalesDetailEntityPage(null)}
        />
      )}
      {financeDetailsEntityPage && (
        <ItemMasterFinanceDetailsPagePopup
          mappingRecord={financeDetailsEntityPage.mappingRecord}
          onClose={() => setFinanceDetailsEntityPage(null)}
        />
      )}

      {/* Warehouse & Purchase popups */}
      {warehousePurchasePage && (
        <WarehouseAndPurchasePagePopup
          onClose={() => setWarehousePurchasePage(false)}
        />
      )}
      {warehouseDetailsEntityPage && (
        <ItemMasterWarehouseDetailsPagePopup
          mappingRecord={warehouseDetailsEntityPage.mappingRecord}
          onClose={() => setWarehouseDetailsEntityPage(null)}
        />
      )}
      {purchaseDetailsEntityPage && (
        <ItemMasterPurchaseDetailsPagePopup
          mappingRecord={purchaseDetailsEntityPage.mappingRecord}
          onClose={() => setPurchaseDetailsEntityPage(null)}
        />
      )}

      {/* Inv Properties popups */}
      {invPropertiesPage && (
        <RenderItemMasterInvPropertiesPagePopup
          onClose={() => setInvPropertiesPage(false)}
        />
      )}
      {invPropertiesEntityPage && (
        <ItemMasterInvPropertiesPagePopup
          mappingRecord={invPropertiesEntityPage.mappingRecord}
          onClose={() => setInvPropertiesEntityPage(null)}
        />
      )}

      {/* Step 1 Admin popup */}
      {step1For && (
        <WorkflowStep1Popup
          tmpl={step1For}
          onClose={(refresh) => {
            setStep1For(null);
            if (refresh) loadData();
          }}
        />
      )}

      {/* Step 2 Admin popup */}
      {step2For && (
        <ItemCodeWorkflowStepTwo
          tmpl={step2For}
          onClose={(refresh) => {
            setStep2For(null);
            if (refresh) loadData();
          }}
        />
      )}

      {/* Header */}
      <div style={HDR}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <GitBranch size={13} color="#fff" />
          <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Workflow Templates 🔀</h2>
        </div>
        <button onClick={loadData} title="Refresh"
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Search + filter */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name, code, company…"
              style={{ width: '100%', padding: '5px 28px 5px 8px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 4, outline: 'none', color: '#374151', boxSizing: 'border-box' }} />
            {searchTerm
              ? <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={13} color="#9ca3af" /></button>
              : <GitBranch size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            }
          </div>
          {['all', 'active', 'inactive'].map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              style={{ padding: '3px 10px', fontSize: 10, borderRadius: 3, cursor: 'pointer', fontWeight: 600, border: 'none', background: filterStatus === f ? '#374151' : '#e5e7eb', color: filterStatus === f ? '#fff' : '#6b7280', textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
          <span style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap' }}>{filtered.length} template{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 28 }}>⏳</div>
            <div style={{ fontSize: 11, color: '#666' }}>Loading…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 32 }}>🔀</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>No workflow templates found.</div>
            <div style={{ fontSize: 10, color: '#cbd5e1' }}>Go to Workflow Setup to create one.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', position: 'sticky', top: 0, zIndex: 1 }}>
                {['#', 'Template', 'Company', 'Steps', 'Approvers', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((tmpl, idx) => renderFlowCard(tmpl, idx))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={FTR} />
    </div>
  );
}