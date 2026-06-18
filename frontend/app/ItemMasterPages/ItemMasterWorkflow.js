/**
 * ItemMasterWorkflow.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the horizontal flow diagram for a single workflow template.
 * Extracted from WorkflowDashboard.js — zero visual changes.
 *
 * Props:
 *   tmpl                        — workflow template object
 *   expandedInventory           — { [tmplId]: bool }
 *   setExpandedInventory        — setter
 *   expandedItemMasterInv       — { [tmplId]: bool }
 *   setExpandedItemMasterInv    — setter
 *   expandedSalesFinance        — { [tmplId]: bool }
 *   setExpandedSalesFinance     — setter
 *   expandedWarehousePurchase   — { [tmplId]: bool }
 *   setExpandedWarehousePurchase — setter
 *   expandedItemMasterOuter     — { [tmplId]: bool }
 *   setExpandedItemMasterOuter  — setter
 *   — popup openers —
 *   setUserAccess
 *   setMfcFor
 *   setStep1For
 *   setStep2For
 *   setPageAccessFor
 *   setItemInfoMfc
 *   setItemInfoPage
 *   setAnalysisFieldsPage
 *   setCustomFieldsPage
 *   setInventoryPage
 *   setInventoryEntityPage
 *   setSalesFinancePage
 *   setSalesDetailEntityPage
 *   setFinanceDetailsEntityPage
 *   setWarehousePurchasePage
 *   setWarehouseDetailsEntityPage
 *   setPurchaseDetailsEntityPage
 *   setCreateItemMasterOpen
 *   setGLSelectionPage
 *   setWorkflowBuilderOpen
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { Settings, Users } from 'lucide-react';
import { approvalClr } from './workflowConstants';

// ─── Arrow connector ──────────────────────────────────────────────────────────
const FlowArrow = () => (
  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, padding: '0 4px' }}>
    <div style={{ width: 28, height: 2, background: 'linear-gradient(to right, #93c5fd, #3b82f6)' }} />
    <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '7px solid #3b82f6' }} />
  </div>
);

export default function WorkflowFlow({
  tmpl,
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
  expandedInvProperties        = {},
  setExpandedInvProperties     = () => {},
  setInvPropertiesPage         = () => {},
  setInvPropertiesEntityPage   = () => {},
}) {
  const sortedSteps = (tmpl.steps || []).sort((a, b) => a.step_order - b.step_order);

  const isExpanded    = !!expandedInventory[tmpl.id];
  const isIMOExpanded = !!expandedItemMasterOuter[tmpl.id];

  return (
    <div style={{ overflowX: 'auto', paddingTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 'max-content' }}>

        {/* ── User Dept Access node ── */}
        <div
          onClick={() => setUserAccess(true)}
          title="Click to manage company department access for users"
          style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '2px solid #3b82f6', borderRadius: 10, padding: '10px 14px', minWidth: 148, cursor: 'pointer', transition: 'all .18s', boxShadow: '0 2px 8px rgba(59,130,246,.15)', position: 'relative' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,.3), 0 4px 14px rgba(59,130,246,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,.15)'; e.currentTarget.style.transform = 'none'; }}
        >
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#2563eb', marginBottom: 4 }}>👤 Access</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#1e3a5f', lineHeight: 1.3, marginBottom: 3 }}>User Dept Access</div>
          <div style={{ fontSize: 8, color: '#3b82f6', fontFamily: 'monospace', marginBottom: 5 }}>company · department</div>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#2563eb', background: 'rgba(59,130,246,.12)', borderRadius: 4, padding: '2px 5px', display: 'inline-block' }}>⚙ Manage Access</div>
        </div>

        <FlowArrow />

        {/* ── Entity node (MFC) ── */}
        <div
          onClick={() => setMfcFor({ pageKey: 'item-code-creation-req', pageName: tmpl.name })}
          title="Click to configure mandatory fields"
          style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '2px solid #fb923c', borderRadius: 10, padding: '10px 14px', minWidth: 148, cursor: 'pointer', transition: 'all .18s', boxShadow: '0 2px 8px rgba(251,146,60,.15)', position: 'relative' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; }}
        >
          <div style={{ position: 'absolute', top: 6, right: 6, opacity: .65 }}><Settings size={10} color="#ea580c" /></div>
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 4 }}>📄 Entity</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3, marginBottom: 3 }}>{tmpl.name}</div>
          <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginBottom: 5 }}>{tmpl.code}</div>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', borderRadius: 4, padding: '2px 5px', display: 'inline-block' }}>⚙ Mandatory Fields</div>
        </div>

        {/* ── Steps ── */}
        {sortedSteps.map(step => {
          const clr     = approvalClr(step.approval_type);
          const isStep1 = step.step_order === 1;
          const isStep2 = step.step_order === 2;

          return (
            <React.Fragment key={step.id}>
              <FlowArrow />

              {/* Step card */}
              <div
                onClick={isStep1 ? () => setStep1For(tmpl) : isStep2 ? () => setStep2For(tmpl) : undefined}
                title={isStep1 ? 'Click to configure Step 1 approvers' : isStep2 ? 'Click to configure Step 2 approvers' : undefined}
                style={{
                  background: '#fff',
                  border: `1.5px solid ${isStep1 ? '#3b82f6' : isStep2 ? '#fb923c' : clr.border}`,
                  borderRadius: 10,
                  padding: '10px 12px',
                  minWidth: 158,
                  boxShadow: isStep1 ? '0 2px 8px rgba(59,130,246,.15)' : isStep2 ? '0 2px 8px rgba(251,146,60,.15)' : '0 2px 6px rgba(0,0,0,.05)',
                  transition: 'box-shadow .15s, transform .15s',
                  cursor: isStep1 || isStep2 ? 'pointer' : 'default',
                  position: 'relative',
                }}
                onMouseEnter={isStep1 ? e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,.25), 0 4px 14px rgba(59,130,246,.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; } : isStep2 ? e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.25), 0 4px 14px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; } : undefined}
                onMouseLeave={isStep1 ? e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,.15)'; e.currentTarget.style.transform = 'none'; } : isStep2 ? e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; } : undefined}
              >
                {(isStep1 || isStep2) && (
                  <div style={{ position: 'absolute', top: 5, right: 6, opacity: 0.55 }}>
                    <Settings size={10} color="#3b82f6" />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 5px rgba(37,99,235,.4)' }}>
                    {step.step_order}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{step.step_name}</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', background: clr.bg, color: clr.color, border: `1px solid ${clr.border}`, borderRadius: 5, padding: '2px 7px', fontSize: 9, fontWeight: 700, marginBottom: 7 }}>
                  {step.approval_type || 'ANY'}
                </div>
                {(step.approvers || []).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {step.approvers.map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', borderRadius: 4, padding: '2px 6px', fontSize: 9 }}>
                        <Users size={8} color="#64748b" />
                        <span style={{ color: '#334155', fontWeight: 600 }}>{a.role?.role_name || 'Any'}</span>
                        <span style={{ color: '#94a3b8' }}>/</span>
                        <span style={{ color: '#64748b' }}>{a.department?.department_name || 'Any Dept'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
                    {isStep1 || isStep2 ? '⚙ Click to add approvers' : 'No approvers set'}
                  </div>
                )}
              </div>

              {/* ── Page Company Access node — only after Step 1 ── */}
              {isStep1 && (
                <>
                  <FlowArrow />
                  <div
                    onClick={() => setPageAccessFor(tmpl)}
                    title="Click to link pages with primary company"
                    style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '2px solid #16a34a', borderRadius: 10, padding: '10px 14px', minWidth: 148, cursor: 'pointer', transition: 'all .18s', boxShadow: '0 2px 8px rgba(22,163,74,.15)', position: 'relative' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22,163,74,.3), 0 4px 14px rgba(22,163,74,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(22,163,74,.15)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#16a34a', marginBottom: 4 }}>🔗 Access</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#14532d', lineHeight: 1.3, marginBottom: 3 }}>Link Pages With Primary Company</div>
                    <div style={{ fontSize: 8, color: '#15803d', fontFamily: 'monospace', marginBottom: 5 }}>link pages · primary co.</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: '#16a34a', background: 'rgba(22,163,74,.12)', borderRadius: 4, padding: '2px 5px', display: 'inline-block' }}>⚙ 4 Clicks Automation Company Wise</div>
                  </div>

                  <FlowArrow />

                  {/* Item Master MFC node */}
                  <div
                    onClick={() => setItemInfoMfc(true)}
                    title="Click to configure mandatory fields for Item Master"
                    style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '2px solid #fb923c', borderRadius: 10, padding: '10px 14px', minWidth: 148, cursor: 'pointer', transition: 'all .18s', boxShadow: '0 2px 8px rgba(251,146,60,.15)', position: 'relative' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <div style={{ position: 'absolute', top: 6, right: 6, opacity: .65 }}><Settings size={10} color="#ea580c" /></div>
                    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 4 }}>📄 Entity</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3, marginBottom: 3 }}>Config Item Master Mandatory Field</div>
                    <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginBottom: 5 }}>item-info-master</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', borderRadius: 4, padding: '2px 5px', display: 'inline-block' }}>⚙ Mandatory Fields</div>
                  </div>
                </>
              )}

              {/* ── Item Master outer wrapper — after Step 2 ── */}
              {isStep2 && (() => {
                return (
                  <>
                    <FlowArrow />

                    {/* OUTER Item Master collapsible card */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div
                        onClick={() => setExpandedItemMasterOuter(prev => ({ ...prev, [tmpl.id]: !prev[tmpl.id] }))}
                        title={isIMOExpanded ? 'Click to collapse' : 'Click to expand Item Master'}
                        style={{
                          background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
                          border: `2px solid ${isIMOExpanded ? '#ea580c' : '#fb923c'}`,
                          borderRadius: isIMOExpanded ? '10px 10px 0 0' : 10,
                          padding: '10px 16px',
                          minWidth: 210,
                          cursor: 'pointer',
                          transition: 'all .18s',
                          boxShadow: isIMOExpanded
                            ? '0 0 0 3px rgba(251,146,60,.25), 0 4px 14px rgba(251,146,60,.2)'
                            : '0 2px 8px rgba(251,146,60,.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                        onMouseEnter={e => { if (!isIMOExpanded) { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                        onMouseLeave={e => { if (!isIMOExpanded) { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; } }}
                      >
                        <div>
                          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 2 }}>📋 Item Master</div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3 }}>Item Master</div>
                          <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginTop: 2 }}>info · inventory · sales · warehouse</div>
                          <button
                            onClick={e => { e.stopPropagation(); setCreateItemMasterOpen(true); }}
                            title="View Create Item Master page"
                            style={{ marginTop: 6, fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,.15)'; }}
                          >
                            📋 View Page
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setWorkflowBuilderOpen(true); }}
                            title="Configure Item Master workflow pages"
                            style={{ marginTop: 4, fontSize: 8, fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.35)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3, width: '100%', justifyContent: 'center' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,.22)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,.1)'; e.currentTarget.style.transform = 'none'; }}
                          >
                            🗂️ Workflow Setup
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#ea580c', background: 'rgba(251,146,60,.15)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .2s', transform: isIMOExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</div>
                          <div style={{ fontSize: 7, fontWeight: 700, color: '#9a3412', textAlign: 'center', lineHeight: 1.3, maxWidth: 46, opacity: .8 }}>Default Item Master View</div>
                        </div>
                      </div>

                      {/* Expanded inner section */}
                      {isIMOExpanded && (
                        <div style={{ border: '2px solid #ea580c', borderTop: 'none', borderRadius: '0 0 10px 10px', background: 'rgba(255,247,237,.4)', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 0, boxShadow: '0 4px 14px rgba(251,146,60,.12)', overflowX: 'auto' }}>

                          {/* ── Basic Item Master Info group ── */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div
                              onClick={() => setExpandedInventory(prev => ({ ...prev, [tmpl.id]: !prev[tmpl.id] }))}
                              title={isExpanded ? 'Click to collapse' : 'Click to expand inventory pages'}
                              style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: `2px solid ${isExpanded ? '#ea580c' : '#fb923c'}`, borderRadius: isExpanded ? '10px 10px 0 0' : 10, padding: '8px 14px', minWidth: 200, cursor: 'pointer', transition: 'all .18s', boxShadow: isExpanded ? '0 0 0 3px rgba(251,146,60,.25), 0 4px 14px rgba(251,146,60,.2)' : '0 2px 8px rgba(251,146,60,.15)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                              onMouseEnter={e => { if (!isExpanded) { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                              onMouseLeave={e => { if (!isExpanded) { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; } }}
                            >
                              <div>
                                <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 2 }}>📦 Item Master Before GL Info</div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3 }}>Basic Item Master Info</div>
                                <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginTop: 2 }}>info · analysis · custom</div>
                                <button
                                  onClick={e => { e.stopPropagation(); setBasicItemInfoPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                  title="View all Item Master pages together"
                                  style={{ marginTop: 6, fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,.3)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,.15)'; }}
                                >
                                  📋 View Page
                                </button>
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#ea580c', background: 'rgba(251,146,60,.15)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform .2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</div>
                            </div>

                            {isExpanded && (
                              <div style={{ border: '2px solid #ea580c', borderTop: 'none', borderRadius: '0 0 10px 10px', background: 'rgba(255,247,237,.5)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 0, boxShadow: '0 4px 14px rgba(251,146,60,.15)' }}>

                                {/* Item Info Master node */}
                                <div
                                  onClick={e => { e.stopPropagation(); setItemInfoPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                  title="Click to view Item Info Master page"
                                  style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '2px solid #fb923c', borderRadius: 10, padding: '10px 14px', minWidth: 130, cursor: 'pointer', transition: 'all .18s', boxShadow: '0 2px 8px rgba(251,146,60,.15)', position: 'relative' }}
                                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; }}
                                >
                                  <div style={{ position: 'absolute', top: 6, right: 6, opacity: .65 }}><Settings size={10} color="#ea580c" /></div>
                                  <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 4 }}>📄 Entity</div>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3, marginBottom: 3 }}>Item Info Master</div>
                                  <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginBottom: 5 }}>item-info-master</div>
                                  <div style={{ fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', borderRadius: 4, padding: '2px 5px', display: 'inline-block' }}>📋 View Page</div>
                                </div>

                                <FlowArrow />

                                {/* Analysis Fields node */}
                                <div
                                  onClick={e => { e.stopPropagation(); setAnalysisFieldsPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                  title="Click to view Analysis Fields page"
                                  style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '2px solid #fb923c', borderRadius: 10, padding: '10px 14px', minWidth: 130, cursor: 'pointer', transition: 'all .18s', boxShadow: '0 2px 8px rgba(251,146,60,.15)', position: 'relative' }}
                                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; }}
                                >
                                  <div style={{ position: 'absolute', top: 6, right: 6, opacity: .65 }}><Settings size={10} color="#ea580c" /></div>
                                  <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 4 }}>📄 Entity</div>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3, marginBottom: 3 }}>Analysis Fields</div>
                                  <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginBottom: 5 }}>item-master-analysis-fields</div>
                                  <div style={{ fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', borderRadius: 4, padding: '2px 5px', display: 'inline-block' }}>📋 View Page</div>
                                </div>

                                <FlowArrow />

                                {/* Custom Fields node */}
                                <div
                                  onClick={e => { e.stopPropagation(); setCustomFieldsPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                  title="Click to view Custom Fields page"
                                  style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '2px solid #fb923c', borderRadius: 10, padding: '10px 14px', minWidth: 130, cursor: 'pointer', transition: 'all .18s', boxShadow: '0 2px 8px rgba(251,146,60,.15)', position: 'relative' }}
                                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; }}
                                >
                                  <div style={{ position: 'absolute', top: 6, right: 6, opacity: .65 }}><Settings size={10} color="#ea580c" /></div>
                                  <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 4 }}>📄 Entity</div>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3, marginBottom: 3 }}>Custom Fields</div>
                                  <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginBottom: 5 }}>breez · sonata · sweet</div>
                                  <div style={{ fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', borderRadius: 4, padding: '2px 5px', display: 'inline-block' }}>📋 View Page</div>
                                </div>

                                <FlowArrow />

                                {/* ── GL Selection node ── */}
                                <div
                                  onClick={e => { e.stopPropagation(); setGLSelectionPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                  title="Click to select / create GL Account for item code"
                                  style={{
                                    background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                                    border: '2px solid #7c3aed',
                                    borderRadius: 10,
                                    padding: '10px 14px',
                                    minWidth: 130,
                                    cursor: 'pointer',
                                    transition: 'all .18s',
                                    boxShadow: '0 2px 8px rgba(124,58,237,.18)',
                                    position: 'relative',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,.3), 0 4px 14px rgba(124,58,237,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(124,58,237,.18)'; e.currentTarget.style.transform = 'none'; }}
                                >
                                  <div style={{ position: 'absolute', top: 6, right: 6, opacity: .65 }}><Settings size={10} color="#7c3aed" /></div>
                                  <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#7c3aed', marginBottom: 4 }}>🏦 Entity</div>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: '#3b0764', lineHeight: 1.3, marginBottom: 3 }}>GL Selection</div>
                                  <div style={{ fontSize: 8, color: '#6d28d9', fontFamily: 'monospace', marginBottom: 5 }}>gl-account · item-code</div>
                                  <button
                                    onClick={e => { e.stopPropagation(); setGLSelectionPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                    style={{ marginTop: 4, fontSize: 8, fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,.12)', border: '1px solid rgba(124,58,237,.35)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,.25)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,.12)'; }}
                                  >
                                    📋 View Page
                                  </button>
                                </div>

                                <FlowArrow />

                                {/* ── Item Code Creation Point node ── */}
                                <div
                                  onClick={e => { e.stopPropagation(); setItemCodeCreationPointPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                  title="Click to view Item Code Creation Point"
                                  style={{
                                    background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                                    border: '2px solid #2563eb',
                                    borderRadius: 10,
                                    padding: '10px 14px',
                                    minWidth: 130,
                                    cursor: 'pointer',
                                    transition: 'all .18s',
                                    boxShadow: '0 2px 8px rgba(37,99,235,.18)',
                                    position: 'relative',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,.3), 0 4px 14px rgba(37,99,235,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,.18)'; e.currentTarget.style.transform = 'none'; }}
                                >
                                  <div style={{ position: 'absolute', top: 6, right: 6, opacity: .65 }}><Settings size={10} color="#2563eb" /></div>
                                  <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#2563eb', marginBottom: 4 }}>📦 Entity</div>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: '#1e3a5f', lineHeight: 1.3, marginBottom: 3 }}>Item Code Creation Point</div>
                                  <div style={{ fontSize: 8, color: '#3b82f6', fontFamily: 'monospace', marginBottom: 5 }}>item-code · creation</div>
                                  <button
                                    onClick={e => { e.stopPropagation(); setItemCodeCreationPointPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                    style={{ marginTop: 4, fontSize: 8, fontWeight: 700, color: '#2563eb', background: 'rgba(37,99,235,.12)', border: '1px solid rgba(37,99,235,.35)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,.25)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,99,235,.12)'; }}
                                  >
                                    📋 View Page
                                  </button>
                                </div>

                              </div>
                            )}
                          </div>

                          <FlowArrow />

                          {/* ── Item Master Inventory group ── */}
                          {(() => {
                            const isInvExpanded = !!expandedItemMasterInv[tmpl.id];
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div
                                  onClick={() => setExpandedItemMasterInv(prev => ({ ...prev, [tmpl.id]: !prev[tmpl.id] }))}
                                  title={isInvExpanded ? 'Click to collapse' : 'Click to expand inventory page'}
                                  style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: `2px solid ${isInvExpanded ? '#ea580c' : '#fb923c'}`, borderRadius: isInvExpanded ? '10px 10px 0 0' : 10, padding: '8px 14px', minWidth: 200, cursor: 'pointer', transition: 'all .18s', boxShadow: isInvExpanded ? '0 0 0 3px rgba(251,146,60,.25), 0 4px 14px rgba(251,146,60,.2)' : '0 2px 8px rgba(251,146,60,.15)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                                  onMouseEnter={e => { if (!isInvExpanded) { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                                  onMouseLeave={e => { if (!isInvExpanded) { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; } }}
                                >
                                  <div>
                                    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 2 }}>📦 Inventory</div>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3 }}>Item Master Inventory</div>
                                    <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginTop: 2 }}>item-master-inventory</div>
                                    <button
                                      onClick={e => { e.stopPropagation(); setInventoryPage(true); }}
                                      title="View Item Master Inventory RBAC page"
                                      style={{ marginTop: 6, fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,.3)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,.15)'; }}
                                    >
                                      📋 View Page
                                    </button>
                                  </div>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: '#ea580c', background: 'rgba(251,146,60,.15)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform .2s', transform: isInvExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</div>
                                </div>

                                {isInvExpanded && (
                                  <div style={{ border: '2px solid #ea580c', borderTop: 'none', borderRadius: '0 0 10px 10px', background: 'rgba(255,247,237,.5)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 0, boxShadow: '0 4px 14px rgba(251,146,60,.15)' }}>
                                    <div
                                      onClick={e => { e.stopPropagation(); setInventoryEntityPage(true); }}
                                      title="Click to view Item Master Inventory page"
                                      style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '2px solid #fb923c', borderRadius: 10, padding: '10px 14px', minWidth: 130, cursor: 'pointer', transition: 'all .18s', boxShadow: '0 2px 8px rgba(251,146,60,.15)', position: 'relative' }}
                                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; }}
                                    >
                                      <div style={{ position: 'absolute', top: 6, right: 6, opacity: .65 }}><Settings size={10} color="#ea580c" /></div>
                                      <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 4 }}>📦 Entity</div>
                                      <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3, marginBottom: 3 }}>Item Master Inventory</div>
                                      <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginBottom: 5 }}>item-master-inventory</div>
                                      <button
                                        onClick={e => { e.stopPropagation(); setInventoryEntityPage(true); }}
                                        title="View Item Master Inventory page"
                                        style={{ marginTop: 4, fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,.3)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,.15)'; }}
                                      >
                                        📋 View Page
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <FlowArrow />

                          {/* ── Sales & Finance group ── */}
                          {(() => {
                            const isSFExpanded = !!expandedSalesFinance[tmpl.id];
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div
                                  onClick={() => setExpandedSalesFinance(prev => ({ ...prev, [tmpl.id]: !prev[tmpl.id] }))}
                                  title={isSFExpanded ? 'Click to collapse' : 'Click to expand Sales & Finance pages'}
                                  style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: `2px solid ${isSFExpanded ? '#ea580c' : '#fb923c'}`, borderRadius: isSFExpanded ? '10px 10px 0 0' : 10, padding: '8px 14px', minWidth: 200, cursor: 'pointer', transition: 'all .18s', boxShadow: isSFExpanded ? '0 0 0 3px rgba(251,146,60,.25), 0 4px 14px rgba(251,146,60,.2)' : '0 2px 8px rgba(251,146,60,.15)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                                  onMouseEnter={e => { if (!isSFExpanded) { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                                  onMouseLeave={e => { if (!isSFExpanded) { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; } }}
                                >
                                  <div>
                                    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 2 }}>📊 Sales & Finance</div>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3 }}>Item Master Sales & Finance</div>
                                    <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginTop: 2 }}>sales · finance</div>
                                    <button
                                      onClick={e => { e.stopPropagation(); setSalesFinancePage(true); }}
                                      title="View Item Master Sales & Finance page"
                                      style={{ marginTop: 6, fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,.3)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,.15)'; }}
                                    >
                                      📋 View Page
                                    </button>
                                  </div>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: '#ea580c', background: 'rgba(251,146,60,.15)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform .2s', transform: isSFExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</div>
                                </div>

                                {isSFExpanded && (
                                  <div style={{ border: '2px solid #ea580c', borderTop: 'none', borderRadius: '0 0 10px 10px', background: 'rgba(255,247,237,.5)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 0, boxShadow: '0 4px 14px rgba(251,146,60,.15)' }}>

                                    {/* Sales Detail entity node */}
                                    <div
                                      onClick={e => { e.stopPropagation(); setSalesDetailEntityPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                      title="Click to view Item Master Sales Detail page"
                                      style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '2px solid #fb923c', borderRadius: 10, padding: '10px 14px', minWidth: 130, cursor: 'pointer', transition: 'all .18s', boxShadow: '0 2px 8px rgba(251,146,60,.15)', position: 'relative' }}
                                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; }}
                                    >
                                      <div style={{ position: 'absolute', top: 6, right: 6, opacity: .65 }}><Settings size={10} color="#ea580c" /></div>
                                      <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 4 }}>💼 Entity</div>
                                      <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3, marginBottom: 3 }}>Sales Detail</div>
                                      <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginBottom: 5 }}>item-master-sales-detail</div>
                                      <button
                                        onClick={e => { e.stopPropagation(); setSalesDetailEntityPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                        style={{ marginTop: 4, fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,.3)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,.15)'; }}
                                      >
                                        📋 View Page
                                      </button>
                                    </div>

                                    <FlowArrow />

                                    {/* Finance Details entity node */}
                                    <div
                                      onClick={e => { e.stopPropagation(); setFinanceDetailsEntityPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                      title="Click to view Item Master Finance Details page"
                                      style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '2px solid #fb923c', borderRadius: 10, padding: '10px 14px', minWidth: 130, cursor: 'pointer', transition: 'all .18s', boxShadow: '0 2px 8px rgba(251,146,60,.15)', position: 'relative' }}
                                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; }}
                                    >
                                      <div style={{ position: 'absolute', top: 6, right: 6, opacity: .65 }}><Settings size={10} color="#ea580c" /></div>
                                      <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 4 }}>💰 Entity</div>
                                      <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3, marginBottom: 3 }}>Finance Details</div>
                                      <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginBottom: 5 }}>item-master-finance-details</div>
                                      <button
                                        onClick={e => { e.stopPropagation(); setFinanceDetailsEntityPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                        style={{ marginTop: 4, fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,.3)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,.15)'; }}
                                      >
                                        📋 View Page
                                      </button>
                                    </div>

                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <FlowArrow />

                          {/* ── Warehouse & Purchase group ── */}
                          {(() => {
                            const isWPExpanded = !!expandedWarehousePurchase[tmpl.id];
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div
                                  onClick={() => setExpandedWarehousePurchase(prev => ({ ...prev, [tmpl.id]: !prev[tmpl.id] }))}
                                  title={isWPExpanded ? 'Click to collapse' : 'Click to expand Warehouse & Purchase pages'}
                                  style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: `2px solid ${isWPExpanded ? '#ea580c' : '#fb923c'}`, borderRadius: isWPExpanded ? '10px 10px 0 0' : 10, padding: '8px 14px', minWidth: 200, cursor: 'pointer', transition: 'all .18s', boxShadow: isWPExpanded ? '0 0 0 3px rgba(251,146,60,.25), 0 4px 14px rgba(251,146,60,.2)' : '0 2px 8px rgba(251,146,60,.15)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                                  onMouseEnter={e => { if (!isWPExpanded) { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                                  onMouseLeave={e => { if (!isWPExpanded) { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; } }}
                                >
                                  <div>
                                    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 2 }}>🏭 Warehouse &amp; Purchase</div>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3 }}>Item Master Warehouse &amp; Purchase</div>
                                    <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginTop: 2 }}>warehouse · purchase</div>
                                    <button
                                      onClick={e => { e.stopPropagation(); setWarehousePurchasePage(true); }}
                                      title="View Item Master Warehouse & Purchase page"
                                      style={{ marginTop: 6, fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,.3)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,.15)'; }}
                                    >
                                      📋 View Page
                                    </button>
                                  </div>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: '#ea580c', background: 'rgba(251,146,60,.15)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform .2s', transform: isWPExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</div>
                                </div>

                                {isWPExpanded && (
                                  <div style={{ border: '2px solid #ea580c', borderTop: 'none', borderRadius: '0 0 10px 10px', background: 'rgba(255,247,237,.5)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 0, boxShadow: '0 4px 14px rgba(251,146,60,.15)' }}>

                                    {/* Warehouse Details entity node */}
                                    <div
                                      onClick={e => { e.stopPropagation(); setWarehouseDetailsEntityPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                      title="Click to view Item Master Warehouse Details page"
                                      style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '2px solid #fb923c', borderRadius: 10, padding: '10px 14px', minWidth: 130, cursor: 'pointer', transition: 'all .18s', boxShadow: '0 2px 8px rgba(251,146,60,.15)', position: 'relative' }}
                                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; }}
                                    >
                                      <div style={{ position: 'absolute', top: 6, right: 6, opacity: .65 }}><Settings size={10} color="#ea580c" /></div>
                                      <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 4 }}>🏭 Entity</div>
                                      <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3, marginBottom: 3 }}>Warehouse Details</div>
                                      <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginBottom: 5 }}>item-master-warehouse-details</div>
                                      <button
                                        onClick={e => { e.stopPropagation(); setWarehouseDetailsEntityPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                        style={{ marginTop: 4, fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,.3)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,.15)'; }}
                                      >
                                        📋 View Page
                                      </button>
                                    </div>

                                    <FlowArrow />

                                    {/* Purchase Details entity node */}
                                    <div
                                      onClick={e => { e.stopPropagation(); setPurchaseDetailsEntityPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                      title="Click to view Item Master Purchase Details page"
                                      style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '2px solid #fb923c', borderRadius: 10, padding: '10px 14px', minWidth: 130, cursor: 'pointer', transition: 'all .18s', boxShadow: '0 2px 8px rgba(251,146,60,.15)', position: 'relative' }}
                                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; }}
                                    >
                                      <div style={{ position: 'absolute', top: 6, right: 6, opacity: .65 }}><Settings size={10} color="#ea580c" /></div>
                                      <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 4 }}>🛒 Entity</div>
                                      <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3, marginBottom: 3 }}>Purchase Details</div>
                                      <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginBottom: 5 }}>item-master-purchase-details</div>
                                      <button
                                        onClick={e => { e.stopPropagation(); setPurchaseDetailsEntityPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                        style={{ marginTop: 4, fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,.3)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,.15)'; }}
                                      >
                                        📋 View Page
                                      </button>
                                    </div>

                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <FlowArrow />

                          {/* ── Inv Properties group ── */}
                          {(() => {
                            const isIPExpanded = !!expandedInvProperties[tmpl.id];
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div
                                  onClick={() => setExpandedInvProperties(prev => ({ ...prev, [tmpl.id]: !prev[tmpl.id] }))}
                                  title={isIPExpanded ? 'Click to collapse' : 'Click to expand Inv Properties page'}
                                  style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: `2px solid ${isIPExpanded ? '#ea580c' : '#fb923c'}`, borderRadius: isIPExpanded ? '10px 10px 0 0' : 10, padding: '8px 14px', minWidth: 200, cursor: 'pointer', transition: 'all .18s', boxShadow: isIPExpanded ? '0 0 0 3px rgba(251,146,60,.25), 0 4px 14px rgba(251,146,60,.2)' : '0 2px 8px rgba(251,146,60,.15)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                                  onMouseEnter={e => { if (!isIPExpanded) { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                                  onMouseLeave={e => { if (!isIPExpanded) { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; } }}
                                >
                                  <div>
                                    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 2 }}>📋 Inv Properties</div>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3 }}>Item Master Inv Properties</div>
                                    <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginTop: 2 }}>item-master-inv-properties</div>
                                    <button
                                      onClick={e => { e.stopPropagation(); setInvPropertiesPage(true); }}
                                      title="View Item Master Inv Properties page"
                                      style={{ marginTop: 6, fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,.3)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,.15)'; }}
                                    >
                                      📋 View Page
                                    </button>
                                  </div>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: '#ea580c', background: 'rgba(251,146,60,.15)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform .2s', transform: isIPExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</div>
                                </div>

                                {isIPExpanded && (
                                  <div style={{ border: '2px solid #ea580c', borderTop: 'none', borderRadius: '0 0 10px 10px', background: 'rgba(255,247,237,.5)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 0, boxShadow: '0 4px 14px rgba(251,146,60,.15)' }}>
                                    <div
                                      onClick={e => { e.stopPropagation(); setInvPropertiesEntityPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                      title="Click to view Item Master Inv Properties page"
                                      style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '2px solid #fb923c', borderRadius: 10, padding: '10px 14px', minWidth: 130, cursor: 'pointer', transition: 'all .18s', boxShadow: '0 2px 8px rgba(251,146,60,.15)', position: 'relative' }}
                                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,146,60,.3), 0 4px 14px rgba(251,146,60,.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(251,146,60,.15)'; e.currentTarget.style.transform = 'none'; }}
                                    >
                                      <div style={{ position: 'absolute', top: 6, right: 6, opacity: .65 }}><Settings size={10} color="#ea580c" /></div>
                                      <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: '#ea580c', marginBottom: 4 }}>📋 Entity</div>
                                      <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', lineHeight: 1.3, marginBottom: 3 }}>Item Master Inv Properties</div>
                                      <div style={{ fontSize: 8, color: '#9a3412', fontFamily: 'monospace', marginBottom: 5 }}>item-master-inv-properties</div>
                                      <button
                                        onClick={e => { e.stopPropagation(); setInvPropertiesEntityPage({ mappingRecord: tmpl.mappingRecord ?? null }); }}
                                        style={{ marginTop: 4, fontSize: 8, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,.3)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,.15)'; }}
                                      >
                                        📋 View Page
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

            </React.Fragment>
          );
        })}

        {sortedSteps.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 10, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>No steps configured</div>
        )}
      </div>
    </div>
  );
}