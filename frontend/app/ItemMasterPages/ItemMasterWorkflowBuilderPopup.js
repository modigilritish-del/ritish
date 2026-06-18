/**
 * ItemMasterWorkflowBuilderPopup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Popup that renders the EXACT same visual structure as WorkflowDashboard:
 *
 *   ┌─ Item Master (main node) ─────────────────┐
 *   │  View Page | Workflow Setup               │
 *   └───────────────────────────────────────────┘
 *         ↓ expand
 *   ┌─ Basic Item Master Info ─┐  →→  ┌─ Inventory ─┐  →→  ┌─ Sales & Finance ─┐  →→  ┌─ Warehouse & Purchase ─┐
 *   │  View Page               │      │  View Page  │      │  View Page        │      │  View Page             │
 *   └──────────────────────────┘      └─────────────┘      └───────────────────┘      └────────────────────────┘
 *         ↓ expand                          ↓                      ↓                            ↓
 *   [Item Info] → [Analysis] → [Custom] → [GL]   [Inventory]    [Sales] → [Finance]    [Warehouse] → [Purchase]
 *
 * Each ENTITY node is draggable within its group lane.
 * Each group's entity list is independently configurable.
 *
 * ENHANCED:
 *  - Advanced smooth drag & drop with animated ghost, live drop-zone highlight,
 *    spring-style insert indicator, and drag-over auto-scroll
 *  - Click anywhere on group/entity card to expand/open
 *  - Compact smaller cards
 *  - All original props and logic preserved
 *
 * Props:
 *   onClose, mappingRecord
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Settings, Eye, Layers, GripVertical, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { HDR, FTR } from './workflowConstants';
import ItemInfoMasterPagePopup from './ItemInfoMasterPagePopup';
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
import CreateItemMasterPagePopup from './CreateItemMasterPagePopup';
import ItemMasterGLSelectionPagePopup from './ItemMasterGLSelectionPagePopup';
import ItemCodeCreationPointPopup from './ItemCodeCreationPointPopup';
import ItemMasterInvPropertiesPagePopup from './ItemMasterInvPropertiesPagePopup';
import RenderItemMasterInvPropertiesPagePopup from './RenderItemMasterInvPropertiesPagePopup';
import ItemInfoForwardPopup from '../MasterDataPages/ItemInfoForwardPopup';

// ─── DEFAULT FLOW SNAPSHOT (for reset) ────────────────────────────────────────
const DEFAULT_GROUP_ENTITY_IDS = (() => {
  const init = {};
  // Will be populated after GROUPS is defined — see below
  return init;
})();
const DEFAULT_GROUP_ORDER = null; // Will be set after GROUPS

// ─── SAVED FLOWS STORAGE KEY ──────────────────────────────────────────────────
const STORAGE_KEY = 'itemMasterCustomFlows';

function loadSavedFlows() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistFlows(flows) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(flows)); } catch {}
}

// ─── ADD FLOW WIZARD ──────────────────────────────────────────────────────────
// Step 1: Company + Plant (from real DB API), Step 2: Name
const API_BASE = 'http://localhost:8000/api';

function AddFlowWizard({ existingNames, onCancel, onDone }) {
  const [step, setStep] = useState(1); // 1=company+plant, 2=name
  const [name, setName] = useState('');
  const [company, setCompany] = useState(null);
  const [plant, setPlant] = useState(null);
  const [nameError, setNameError] = useState('');

  // ── Fetch companies from DB ───────────────────────────────────────────────
  const [companies, setCompanies] = useState([]);
  const [plants, setPlants]       = useState([]);
  const [loadingC, setLoadingC]   = useState(true);
  const [loadingP, setLoadingP]   = useState(false);

  useEffect(() => {
    setLoadingC(true);
    fetch(`${API_BASE}/companies`)
      .then(r => r.json())
      .then(data => {
        // Normalize: { id, name } shape
        setCompanies((data || []).map(c => ({ id: c.id, name: c.company_name || c.name })));
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoadingC(false));
  }, []);

  // Fetch plants when company changes
  useEffect(() => {
    if (!company) { setPlants([]); return; }
    setLoadingP(true);
    fetch(`${API_BASE}/plants?company_id=${company.id}`)
      .then(r => r.json())
      .then(data => {
        setPlants((data || []).map(p => ({ id: p.id, name: p.plant_name || p.name })));
      })
      .catch(() => setPlants([]))
      .finally(() => setLoadingP(false));
  }, [company]);

  const handleCompanyPlantNext = () => {
    if (!company) return;
    setStep(2);
  };

  const handleDone = () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError('Flow name is required.'); return; }
    if (existingNames.includes(trimmed.toLowerCase())) {
      setNameError('This flow name already exists. Please choose a different name.');
      return;
    }
    setNameError('');
    onDone({ name: trimmed, company, plant });
  };

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100001,
  };
  const boxStyle = {
    background: '#fff', borderRadius: 12, width: 360,
    boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
  };
  const hdrStyle = {
    background: 'linear-gradient(to right, #92400e, #c2410c)',
    padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  };
  const bodyStyle = { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 };
  const inputStyle = {
    width: '100%', padding: '7px 10px', fontSize: 11, borderRadius: 6,
    border: '1.5px solid #d1d5db', outline: 'none', boxSizing: 'border-box',
  };
  const btnPrimary = {
    padding: '7px 20px', fontSize: 11, fontWeight: 700, borderRadius: 6,
    border: 'none', cursor: 'pointer', background: '#c2410c', color: '#fff',
  };
  const btnSecondary = {
    padding: '7px 16px', fontSize: 11, fontWeight: 600, borderRadius: 6,
    border: '1.5px solid #d1d5db', cursor: 'pointer', background: '#fff', color: '#374151',
  };

  const stepLabel = ['', 'Step 1 of 2 — Company & Plant', 'Step 2 of 2 — Flow Name'];

  return (
    <div style={overlayStyle}>
      <div style={boxStyle}>
        <div style={hdrStyle}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>➕ Add New Flow</div>
            <div style={{ fontSize: 8, color: '#fed7aa', marginTop: 1 }}>{stepLabel[step]}</div>
          </div>
          <button onClick={onCancel} style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', cursor: 'pointer', padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>Cancel</button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', padding: '8px 20px 0', gap: 4 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: s <= step ? '#c2410c' : '#e5e7eb',
              transition: 'background .2s',
            }} />
          ))}
        </div>

        <div style={bodyStyle}>
          {step === 1 && (
            <>
              {/* Company — mandatory */}
              <div>
                <div style={labelStyle}>Select Company <span style={{ color: '#ef4444' }}>*</span></div>
                {loadingC ? (
                  <div style={{ fontSize: 10, color: '#6b7280', padding: '8px 0' }}>⏳ Loading companies...</div>
                ) : companies.length === 0 ? (
                  <div style={{ fontSize: 10, color: '#ef4444', padding: '8px 0' }}>No companies found</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                    {companies.map(c => (
                      <div
                        key={c.id}
                        onClick={() => { setCompany(c); setPlant(null); }}
                        style={{
                          padding: '8px 12px', borderRadius: 7, cursor: 'pointer',
                          border: `2px solid ${company?.id === c.id ? '#c2410c' : '#e5e7eb'}`,
                          background: company?.id === c.id ? '#fff7ed' : '#f9fafb',
                          fontSize: 11, fontWeight: company?.id === c.id ? 700 : 500,
                          color: company?.id === c.id ? '#92400e' : '#374151',
                          transition: 'all .15s',
                        }}
                      >
                        🏢 {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Plant — optional, shown only when company selected */}
              {company && (
                <div>
                  <div style={labelStyle}>
                    Select Plant
                    <span style={{ fontSize: 9, fontWeight: 500, color: '#9ca3af', marginLeft: 6 }}>(optional)</span>
                  </div>
                  {loadingP ? (
                    <div style={{ fontSize: 10, color: '#6b7280', padding: '6px 0' }}>⏳ Loading plants...</div>
                  ) : plants.length === 0 ? (
                    <div style={{ fontSize: 10, color: '#9ca3af', padding: '6px 0' }}>No plants for this company</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                      {plants.map(p => (
                        <div
                          key={p.id}
                          onClick={() => setPlant(prev => prev?.id === p.id ? null : p)}
                          style={{
                            padding: '8px 12px', borderRadius: 7, cursor: 'pointer',
                            border: `2px solid ${plant?.id === p.id ? '#c2410c' : '#e5e7eb'}`,
                            background: plant?.id === p.id ? '#fff7ed' : '#f9fafb',
                            fontSize: 11, fontWeight: plant?.id === p.id ? 700 : 500,
                            color: plant?.id === p.id ? '#92400e' : '#374151',
                            transition: 'all .15s',
                          }}
                        >
                          🏭 {p.name} {plant?.id === p.id && <span style={{ fontSize: 9, marginLeft: 4 }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button style={btnSecondary} onClick={onCancel}>Cancel</button>
                <button
                  style={{ ...btnPrimary, opacity: company ? 1 : 0.5 }}
                  onClick={handleCompanyPlantNext}
                  disabled={!company}
                >
                  Next →
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Summary of selected company/plant */}
              <div style={{ background: '#fff7ed', border: '1px solid rgba(251,146,60,.3)', borderRadius: 7, padding: '8px 12px', fontSize: 10, color: '#92400e' }}>
                🏢 <strong>{company?.name}</strong>
                {plant && <span> · 🏭 {plant.name}</span>}
              </div>

              <div>
                <div style={labelStyle}>Flow Name <span style={{ color: '#ef4444' }}>*</span></div>
                <input
                  style={{ ...inputStyle, borderColor: nameError ? '#ef4444' : '#d1d5db' }}
                  placeholder="e.g. Breez Custom Flow"
                  value={name}
                  onChange={e => { setName(e.target.value); setNameError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleDone()}
                  autoFocus
                />
                {nameError && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>{nameError}</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button style={btnSecondary} onClick={() => { setName(''); setNameError(''); setStep(1); }}>← Back</button>
                <button style={btnPrimary} onClick={handleDone}>✅ Create Flow</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── GROUP DEFINITIONS ────────────────────────────────────────────────────────
const GROUPS = [
  {
    id: 'basic-info',
    badge: '⚙ Item Master Before GL Info',
    title: 'Basic Item Master Info',
    subtitle: 'info · analysis · custom',
    viewKey: 'itemInfo',
    entities: [
      { id: 'item-info-master',   label: 'Item Info Master',   icon: '📄', mono: 'item-info-master',           openKey: 'itemInfo'    },
      { id: 'analysis-fields',    label: 'Analysis Fields',    icon: '📊', mono: 'item-master-analysis-fields', openKey: 'analysis'    },
      { id: 'custom-fields',      label: 'Custom Fields',      icon: '🗂️', mono: 'breez · sonata · sweet',      openKey: 'custom'      },
      { id: 'gl-selection',       label: 'GL Selection',             icon: '🏦', mono: 'gl-account · item-code',      openKey: 'gl'               },
      { id: 'item-code-creation', label: 'Item Code Creation Point', icon: '📦', mono: 'item-code · creation',         openKey: 'itemCodeCreation' },
    ],
  },
  {
    id: 'inventory',
    badge: '⚙ Inventory',
    title: 'Item Master Inventory',
    subtitle: 'item-master-inventory',
    viewKey: 'inventory',
    entities: [
      { id: 'item-master-inventory', label: 'Item Master Inventory', icon: '📦', mono: 'item-master-inventory', openKey: 'inventoryEntity' },
    ],
  },
  {
    id: 'sales-finance',
    badge: '📊 Sales & Finance',
    title: 'Item Master Sales & Finance',
    subtitle: 'sales · finance',
    viewKey: 'salesFinance',
    entities: [
      { id: 'sales-detail',    label: 'Sales Detail',    icon: '💼', mono: 'item-master-sales-detail',    openKey: 'salesDetail'    },
      { id: 'finance-details', label: 'Finance Details', icon: '💰', mono: 'item-master-finance-details', openKey: 'financeDetails' },
    ],
  },
  {
    id: 'warehouse-purchase',
    badge: '🏭 Warehouse & Purchase',
    title: 'Item Master Warehouse & Purchase',
    subtitle: 'warehouse · purchase',
    viewKey: 'warehousePurchase',
    entities: [
      { id: 'warehouse-details', label: 'Warehouse Details', icon: '🏭', mono: 'item-master-warehouse-details', openKey: 'warehouse' },
      { id: 'purchase-details',  label: 'Purchase Details',  icon: '🛒', mono: 'item-master-purchase-details',  openKey: 'purchase'  },
    ],
  },
  {
    id: 'inv-properties',
    badge: '📋 Inv Properties',
    title: 'Item Master Inv Properties',
    subtitle: 'item-master-inv-properties',
    viewKey: 'invProperties',
    entities: [
      { id: 'item-master-inv-properties', label: 'Item Master Inv Properties', icon: '📋', mono: 'item-master-inv-properties', openKey: 'invPropertiesEntity' },
    ],
  },
];

// ─── MERGE SAVED FLOW WITH CURRENT GROUPS ─────────────────────────────────────
// Ensures any new groups/entities added to GROUPS are present in old saved flows.
function mergeWithGroups(savedGroupEntityIds) {
  const merged = { ...savedGroupEntityIds };
  GROUPS.forEach(g => {
    if (!merged[g.id]) {
      // New group not in saved flow — add it with all its entities
      merged[g.id] = g.entities.map(e => e.id);
    } else {
      // Existing group — append any new entities that are missing
      g.entities.forEach(e => {
        if (!merged[g.id].includes(e.id)) {
          merged[g.id] = [...merged[g.id], e.id];
        }
      });
    }
  });
  return merged;
}

// ─── FLOW ARROW ───────────────────────────────────────────────────────────────
const FlowArrow = () => (
  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, padding: '0 3px' }}>
    <div style={{ width: 20, height: 2, background: 'linear-gradient(to right, #93c5fd, #3b82f6)' }} />
    <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid #3b82f6' }} />
  </div>
);

// ─── DRAG CONTEXT — shared state across all lanes ─────────────────────────────
const DragContext = React.createContext(null);

// ─── GROUP DRAG ROW — group cards ko drag-drop se reorder karna ──────────────
function GroupDragRow({ groupOrder, onGroupReorder, children }) {
  const rowRef = useRef(null);
  const [draggingGrp, setDraggingGrp] = useState(null);   // index
  const [dropGrp, setDropGrp]         = useState(null);   // { index, side }

  const getGrpDropInfo = useCallback((e) => {
    const cards = rowRef.current?.querySelectorAll('[data-grp-index]');
    if (!cards || cards.length === 0) return { index: 0, side: 'left' };
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (e.clientX < rect.left + rect.width * 0.5) return { index: i, side: 'left' };
    }
    return { index: cards.length - 1, side: 'right' };
  }, []);

  const handleGrpDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropGrp(getGrpDropInfo(e));
  }, [getGrpDropInfo]);

  const handleGrpDrop = useCallback((e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/grp');
    if (!raw) return;
    const fromIdx = parseInt(raw, 10);
    const info = getGrpDropInfo(e);
    if (fromIdx !== info.index) {
      onGroupReorder(fromIdx, info.index, info.side);
    }
    setDraggingGrp(null);
    setDropGrp(null);
  }, [getGrpDropInfo, onGroupReorder]);

  // Clone children with drag props injected
  const enhanced = React.Children.map(children, (child, i) => {
    if (!React.isValidElement(child)) return child;
    const isDraggingThis = draggingGrp === i;
    const isTarget = dropGrp?.index === i;
    const side = isTarget ? dropGrp?.side : null;
    return (
      <div
        key={i}
        data-grp-index={i}
        draggable
        onDragStart={e => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/grp', String(i));
          setDraggingGrp(i);
        }}
        onDragEnd={() => { setDraggingGrp(null); setDropGrp(null); }}
        style={{
          display: 'flex', alignItems: 'center', flexShrink: 0, position: 'relative',
          opacity: isDraggingThis ? 0.3 : 1,
          transition: 'opacity .15s',
        }}
      >
        {/* Left insert bar */}
        {isTarget && side === 'left' && (
          <div style={{ position: 'absolute', left: -3, top: '10%', bottom: '10%', width: 3, background: '#3b82f6', borderRadius: 2, zIndex: 20, boxShadow: '0 0 8px #3b82f6', animation: 'pulseBar .6s ease-in-out infinite alternate' }} />
        )}
        {child}
        {/* Right insert bar */}
        {isTarget && side === 'right' && (
          <div style={{ position: 'absolute', right: -3, top: '10%', bottom: '10%', width: 3, background: '#3b82f6', borderRadius: 2, zIndex: 20, boxShadow: '0 0 8px #3b82f6', animation: 'pulseBar .6s ease-in-out infinite alternate' }} />
        )}
      </div>
    );
  });

  return (
    <div
      ref={rowRef}
      onDragOver={handleGrpDragOver}
      onDragLeave={e => { if (!rowRef.current?.contains(e.relatedTarget)) setDropGrp(null); }}
      onDrop={handleGrpDrop}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 0, paddingLeft: 16 }}
    >
      {enhanced}
    </div>
  );
}

// ─── ENTITY NODE ─────────────────────────────────────────────────────────────
function EntityNode({ entity, index, groupId, onPreview, onRemove, onForward }) {
  const ctx = React.useContext(DragContext);
  const nodeRef = useRef(null);

  const isDragging = ctx.dragging?.groupId === groupId && ctx.dragging?.index === index;
  const isDropTarget = ctx.dropTarget?.groupId === groupId && ctx.dropTarget?.index === index;
  const dropSide = isDropTarget ? ctx.dropTarget?.side : null;

  const handleDragStart = useCallback((e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ groupId, index }));

    // Create a custom ghost element
    const ghost = nodeRef.current.cloneNode(true);
    ghost.style.cssText = `
      position: fixed; top: -1000px; left: -1000px;
      width: ${nodeRef.current.offsetWidth}px;
      opacity: 0.92;
      transform: rotate(2deg) scale(1.04);
      box-shadow: 0 16px 40px rgba(251,146,60,.45), 0 4px 12px rgba(0,0,0,.2);
      border-radius: 8px;
      pointer-events: none;
      z-index: 99999;
    `;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
    setTimeout(() => document.body.removeChild(ghost), 0);

    ctx.setDragging({ groupId, index });
  }, [groupId, index, ctx]);

  const handleDragEnd = useCallback(() => {
    ctx.setDragging(null);
    ctx.setDropTarget(null);
  }, [ctx]);

  return (
    <div
      ref={nodeRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      data-card-index={index}
      data-group-id={groupId}
      style={{
        display: 'flex', alignItems: 'center', position: 'relative',
        flexShrink: 0, marginLeft: 0,
      }}
    >
      {/* Left drop indicator */}
      {isDropTarget && dropSide === 'left' && (
        <div style={{
          position: 'absolute', left: -3, top: '10%', bottom: '10%',
          width: 3, background: '#3b82f6', borderRadius: 2, zIndex: 10,
          boxShadow: '0 0 8px #3b82f6',
          animation: 'pulseBar .6s ease-in-out infinite alternate',
        }} />
      )}

      {/* Card */}
      <div
        style={{
          background: isDragging
            ? 'rgba(255,247,237,0.4)'
            : 'linear-gradient(135deg, #fff7ed, #ffedd5)',
          border: `2px solid ${isDragging ? 'rgba(251,146,60,.25)' : '#fb923c'}`,
          borderRadius: 8,
          padding: '6px 10px',
          minWidth: 118,
          maxWidth: 140,
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: 'all .15s cubic-bezier(.34,1.56,.64,1)',
          boxShadow: isDragging
            ? 'none'
            : '0 2px 6px rgba(251,146,60,.12)',
          position: 'relative',
          userSelect: 'none',
          opacity: isDragging ? 0.25 : 1,
          transform: isDragging ? 'scale(0.95)' : 'scale(1)',
        }}
        onMouseEnter={e => {
          if (!isDragging) {
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(251,146,60,.4), 0 4px 12px rgba(251,146,60,.2)';
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
          }
        }}
        onMouseLeave={e => {
          if (!isDragging) {
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(251,146,60,.12)';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        {/* Top-right icons */}
        <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 3, alignItems: 'center' }}>
          {/* Drag handle */}
          <GripVertical size={8} color="#fb923c" style={{ opacity: .5, cursor: 'grab' }} />
          <button onClick={e => { e.stopPropagation(); onPreview(); }} title="View page"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#ea580c', opacity: .6 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '.6'}>
            <Eye size={9} />
          </button>
          <button onClick={e => { e.stopPropagation(); onRemove(); }} title="Remove"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#ef4444', opacity: .55 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '.55'}>
            <X size={9} />
          </button>
        </div>

        {/* ENTITY badge */}
        <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: .7, textTransform: 'uppercase', color: '#ea580c', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 8 }}>{entity.icon}</span> Entity
        </div>

        {/* Page name */}
        <div style={{ fontSize: 10, fontWeight: 800, color: '#1e3a5f', lineHeight: 1.25, marginBottom: 2, paddingRight: 36 }}>
          {entity.label}
        </div>

        {/* Mono sub-label */}
        <div style={{ fontSize: 7, color: '#9a3412', fontFamily: 'monospace', marginBottom: 5, opacity: .8 }}>
          {entity.mono}
        </div>

        {/* View Page button */}
        <button
          onClick={e => { e.stopPropagation(); onPreview(); }}
          style={{ fontSize: 7, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,146,60,.3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,146,60,.15)'}
        >
          📋 View Page
        </button>

        {/* Forward button — opens ItemInfoForwardPopup for this entity */}
        <button
          onClick={e => { e.stopPropagation(); onForward(); }}
          style={{ fontSize: 7, fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.35)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, marginTop: 3 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,58,237,.1)'}
        >
          ➡ Forward
        </button>
      </div>

      {/* Right drop indicator */}
      {isDropTarget && dropSide === 'right' && (
        <div style={{
          position: 'absolute', right: -3, top: '10%', bottom: '10%',
          width: 3, background: '#3b82f6', borderRadius: 2, zIndex: 10,
          boxShadow: '0 0 8px #3b82f6',
          animation: 'pulseBar .6s ease-in-out infinite alternate',
        }} />
      )}
    </div>
  );
}

// ─── GROUP SECTION ────────────────────────────────────────────────────────────
function GroupSection({ group, entityIds, expanded, onToggle, onViewPage,
  onEntityPreview, onEntityRemove, onEntityReorder, onEntityCrossGroupMove,
  onGroupMerge, isLast, onEntityForward }) {

  const ctx = React.useContext(DragContext);
  const laneRef = useRef(null);
  const headerRef = useRef(null);
  const autoExpandTimer = useRef(null);
  const [grpDragging, setGrpDragging] = useState(false);
  const [grpDropTarget, setGrpDropTarget] = useState(false);

  const entities = entityIds.map(id => {
    // Pehle apne group mein dhundo, phir baaki sabhi groups mein
    return group.entities.find(e => e.id === id)
      || GROUPS.flatMap(g => g.entities).find(e => e.id === id);
  }).filter(Boolean);

  const isLaneActive = ctx.dragging !== null;

  const getDropInfo = useCallback((e) => {
    const cards = laneRef.current?.querySelectorAll('[data-card-index]');
    if (!cards || cards.length === 0) return { index: 0, side: 'left' };
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (e.clientX < rect.left + rect.width * 0.5) return { index: i, side: 'left' };
    }
    return { index: cards.length - 1, side: 'right' };
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const info = getDropInfo(e);
    ctx.setDropTarget({ groupId: group.id, ...info });
  }, [group.id, ctx, getDropInfo]);

  const handleDragLeave = useCallback((e) => {
    if (!laneRef.current?.contains(e.relatedTarget)) {
      ctx.setDropTarget(null);
    }
  }, [ctx]);

  // ── Header drag-over: entity drop pe auto-expand, group drop pe highlight ──
  const handleHeaderDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Group drag
    if (e.dataTransfer.types.includes('text/grp-entities')) {
      setGrpDropTarget(true);
      return;
    }
    // Entity drag
    ctx.setDropTarget({ groupId: group.id, index: 0, side: 'left' });
    if (!expanded && !autoExpandTimer.current) {
      autoExpandTimer.current = setTimeout(() => {
        onToggle();
        autoExpandTimer.current = null;
      }, 400);
    }
  }, [expanded, onToggle, group.id, ctx]);

  const handleHeaderDragLeave = useCallback((e) => {
    if (!headerRef.current?.contains(e.relatedTarget)) {
      setGrpDropTarget(false);
      if (autoExpandTimer.current) {
        clearTimeout(autoExpandTimer.current);
        autoExpandTimer.current = null;
      }
      ctx.setDropTarget(null);
    }
  }, [ctx]);

  // Drop on header
  const handleHeaderDrop = useCallback((e) => {
    e.preventDefault();
    setGrpDropTarget(false);
    if (autoExpandTimer.current) {
      clearTimeout(autoExpandTimer.current);
      autoExpandTimer.current = null;
    }

    // Group-level drop — saari entities merge karo
    const grpRaw = e.dataTransfer.getData('text/grp-entities');
    if (grpRaw) {
      try {
        const { fromGroupId, entityIds: fromEntityIds } = JSON.parse(grpRaw);
        if (fromGroupId !== group.id) {
          onGroupMerge(fromGroupId, fromEntityIds, group.id);
          if (!expanded) onToggle();
        }
      } catch {}
      ctx.setDropTarget(null);
      ctx.setDragging(null);
      return;
    }

    // Entity-level drop (existing behaviour)
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    try {
      const { groupId: fromGroupId, index: fromIdx } = JSON.parse(raw);
      if (!expanded) onToggle();
      if (fromGroupId === group.id) {
        onEntityReorder(fromIdx, 0, 'left');
      } else {
        onEntityCrossGroupMove(fromGroupId, fromIdx, group.id, 0, 'left');
      }
    } catch {}
    ctx.setDropTarget(null);
    ctx.setDragging(null);
  }, [expanded, onToggle, group.id, ctx, onEntityReorder, onEntityCrossGroupMove, onGroupMerge]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoExpandTimer.current) clearTimeout(autoExpandTimer.current);
    };
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    // Group drop on lane — same logic
    const grpRaw = e.dataTransfer.getData('text/grp-entities');
    if (grpRaw) {
      try {
        const { fromGroupId, entityIds: fromEntityIds } = JSON.parse(grpRaw);
        if (fromGroupId !== group.id) {
          onGroupMerge(fromGroupId, fromEntityIds, group.id);
          if (!expanded) onToggle();
        }
      } catch {}
      ctx.setDropTarget(null);
      ctx.setDragging(null);
      return;
    }
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    try {
      const { groupId: fromGroupId, index: fromIdx } = JSON.parse(raw);
      const info = getDropInfo(e);
      if (fromGroupId === group.id) {
        onEntityReorder(fromIdx, info.index, info.side);
      } else {
        onEntityCrossGroupMove(fromGroupId, fromIdx, group.id, info.index, info.side);
      }
    } catch {}
    ctx.setDropTarget(null);
    ctx.setDragging(null);
  }, [group.id, ctx, getDropInfo, onEntityReorder, onEntityCrossGroupMove, onGroupMerge, expanded, onToggle]);

  const laneIsTarget = ctx.dropTarget?.groupId === group.id;

  // ── Group header drag handlers ──
  const handleGrpDragStart = useCallback((e) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/grp-entities', JSON.stringify({
      fromGroupId: group.id,
      entityIds,
    }));
    setGrpDragging(true);
  }, [group.id, entityIds]);

  const handleGrpDragEnd = useCallback(() => {
    setGrpDragging(false);
    setGrpDropTarget(false);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flexShrink: 0 }}>

      {/* ── Group header card — draggable ── */}
      <div
        ref={headerRef}
        draggable
        onDragStart={handleGrpDragStart}
        onDragEnd={handleGrpDragEnd}
        onClick={onToggle}
        title={expanded ? 'Click to collapse · Drag to move all entities' : 'Click to expand · Drag to move all entities'}
        onDragOver={handleHeaderDragOver}
        onDragLeave={handleHeaderDragLeave}
        onDrop={handleHeaderDrop}
        style={{
          background: grpDropTarget
            ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
            : grpDragging
              ? 'rgba(255,247,237,0.5)'
              : laneIsTarget && !expanded
                ? 'linear-gradient(135deg, #fff0e0, #ffe4c0)'
                : 'linear-gradient(135deg, #fff7ed, #ffedd5)',
          border: `2px solid ${
            grpDropTarget ? '#3b82f6'
            : grpDragging ? 'rgba(251,146,60,.3)'
            : expanded ? '#ea580c'
            : laneIsTarget ? '#f97316'
            : '#fb923c'
          }`,
          borderRadius: expanded ? '8px 8px 0 0' : 8,
          padding: '7px 12px',
          minWidth: 170,
          maxWidth: 190,
          cursor: grpDragging ? 'grabbing' : 'grab',
          transition: 'all .18s',
          opacity: grpDragging ? 0.35 : 1,
          boxShadow: grpDropTarget
            ? '0 0 0 3px rgba(59,130,246,.4), 0 4px 16px rgba(59,130,246,.25)'
            : laneIsTarget && !expanded
              ? '0 0 0 3px rgba(59,130,246,.35), 0 4px 16px rgba(59,130,246,.2)'
              : expanded
                ? '0 0 0 3px rgba(251,146,60,.22), 0 4px 12px rgba(251,146,60,.18)'
                : '0 2px 6px rgba(251,146,60,.13)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          position: 'relative',
          userSelect: 'none',
        }}
        onMouseEnter={e => { if (!expanded && !isLaneActive && !grpDragging) { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(251,146,60,.35), 0 4px 12px rgba(251,146,60,.18)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
        onMouseLeave={e => { if (!expanded) { e.currentTarget.style.boxShadow = '0 2px 6px rgba(251,146,60,.13)'; e.currentTarget.style.transform = 'none'; }}}
      >
        <div style={{ minWidth: 0 }}>
          {/* Grip icon top-right */}
          <div style={{ position: 'absolute', top: 5, right: 5, opacity: .4 }}>
            <GripVertical size={9} color="#ea580c" />
          </div>
          <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: .7, textTransform: 'uppercase', color: '#ea580c', marginBottom: 2 }}>
            {group.badge}
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#7c2d12', lineHeight: 1.25 }}>{group.title}</div>
          <div style={{ fontSize: 7, color: '#9a3412', fontFamily: 'monospace', marginTop: 2, opacity: .8 }}>{group.subtitle}</div>
          <button
            onClick={e => { e.stopPropagation(); onViewPage(); }}
            style={{ marginTop: 4, fontSize: 7, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,146,60,.3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,146,60,.15)'}
          >
            📋 View Page
          </button>
        </div>
        <div style={{
          fontSize: 9, fontWeight: 800, color: '#ea580c',
          background: expanded ? 'rgba(251,146,60,.22)' : 'rgba(251,146,60,.12)',
          borderRadius: '50%', width: 18, height: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'transform .22s cubic-bezier(.34,1.56,.64,1)',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          border: '1px solid rgba(251,146,60,.3)',
        }}>▶</div>

        {/* Drop hints */}
        {grpDropTarget && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
            background: 'rgba(59,130,246,.1)',
            fontSize: 8, fontWeight: 800, color: '#1d4ed8', letterSpacing: .4,
          }}>
            ⬇ Drop to merge pages here
          </div>
        )}
        {laneIsTarget && !expanded && !grpDropTarget && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
            background: 'rgba(59,130,246,.08)',
            fontSize: 8, fontWeight: 800, color: '#2563eb', letterSpacing: .5,
          }}>
            ⬇ Drop to add · auto-opening…
          </div>
        )}
      </div>

      {/* ── Entity lane ── */}
      {expanded && (
        <div
          style={{
            border: '2px solid #ea580c', borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            background: laneIsTarget
              ? 'rgba(251,146,60,.07)'
              : 'rgba(255,247,237,.5)',
            padding: '8px 10px',
            boxShadow: '0 4px 12px rgba(251,146,60,.12)',
            transition: 'background .12s',
          }}
        >
          <div
            ref={laneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              display: 'flex', alignItems: 'flex-start', flexWrap: 'nowrap',
              gap: 0, minHeight: 54,
              borderRadius: 5, padding: '2px 0',
              transition: 'background .12s',
              position: 'relative',
            }}
          >
            {/* Empty drop zone hint */}
            {entities.length === 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', height: 50, borderRadius: 6,
                border: '2px dashed rgba(251,146,60,.4)',
                fontSize: 9, color: '#fb923c', opacity: .7,
                background: laneIsTarget ? 'rgba(251,146,60,.08)' : 'transparent',
                transition: 'all .15s',
              }}>
                {laneIsTarget ? '⬇ Drop here' : 'No pages in this group'}
              </div>
            )}

            {entities.map((entity, i) => (
              <React.Fragment key={entity.id}>
                <EntityNode
                  entity={entity}
                  index={i}
                  groupId={group.id}
                  onPreview={() => onEntityPreview(entity)}
                  onRemove={() => onEntityRemove(group.id, entity.id)}
                  onForward={() => onEntityForward && onEntityForward(entity)}
                />
                {i < entities.length - 1 && <FlowArrow />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ItemMasterWorkflowBuilderPopup({
  onClose,
  mappingRecord = null,
}) {
  // ── Internal popup states (isolated from WorkflowDashboard) ─────────────────
  const [itemInfoPage,              setItemInfoPage]              = useState(null);
  const [analysisFieldsPage,        setAnalysisFieldsPage]        = useState(null);
  const [customFieldsPage,          setCustomFieldsPage]          = useState(null);
  const [inventoryPage,             setInventoryPage]             = useState(false);
  const [inventoryEntityPage,       setInventoryEntityPage]       = useState(false);
  const [invPropertiesPage,         setInvPropertiesPage]         = useState(false);
  const [invPropertiesEntityPage,   setInvPropertiesEntityPage]   = useState(false);
  const [salesFinancePage,          setSalesFinancePage]          = useState(false);
  const [salesDetailEntityPage,     setSalesDetailEntityPage]     = useState(null);
  const [financeDetailsEntityPage,  setFinanceDetailsEntityPage]  = useState(null);
  const [warehousePurchasePage,     setWarehousePurchasePage]     = useState(false);
  const [warehouseDetailsEntityPage, setWarehouseDetailsEntityPage] = useState(null);
  const [purchaseDetailsEntityPage, setPurchaseDetailsEntityPage] = useState(null);
  const [createItemMasterOpen,      setCreateItemMasterOpen]      = useState(false);
  const [glSelectionPage,           setGLSelectionPage]           = useState(null);
  const [itemCodeCreationPointPage, setItemCodeCreationPointPage] = useState(null);
  // ── Item Info Forward Popup state ─────────────────────────────────────────
  const [forwardPopup, setForwardPopup] = useState(null); // null | { entity, mappingRecord }
  const [expanded, setExpanded] = useState({ 'basic-info': true, 'inventory': true, 'sales-finance': true, 'warehouse-purchase': true, 'inv-properties': true });
  const [groupEntityIds, setGroupEntityIds] = useState(() => {
    const flows = loadSavedFlows();
    if (flows.length > 0) return mergeWithGroups(flows[0].groupEntityIds);
    const init = {};
    GROUPS.forEach(g => { init[g.id] = g.entities.map(e => e.id); });
    return init;
  });
  const [outerExpanded, setOuterExpanded] = useState(() => loadSavedFlows().length > 0);
  // Group cards ka order — drag drop se reorder ho sakta hai
  const [groupOrder, setGroupOrder] = useState(() => {
    const flows = loadSavedFlows();
    if (flows.length > 0) {
      const saved = flows[0].groupOrder || [];
      // append any new group IDs from GROUPS that aren't in the saved order
      const allGroupIds = GROUPS.map(g => g.id);
      const merged = [...saved];
      allGroupIds.forEach(id => { if (!merged.includes(id)) merged.push(id); });
      return merged;
    }
    return GROUPS.map(g => g.id);
  });

  // ── Custom flows state ──────────────────────────────────────────────────────
  // 'default' = built-in flow (never saved, always fresh)
  // custom flows = { id, name, company, plant, groupOrder, groupEntityIds }
  const [savedFlows, setSavedFlows] = useState(() => loadSavedFlows());
  const [activeFlowId, setActiveFlowId] = useState(() => {
    const flows = loadSavedFlows();
    return flows.length > 0 ? flows[0].id : 'default';
  });
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [saveNotification, setSaveNotification] = useState(false);

  // ── Company/Plant gate — shown when builder first opens if no flows exist ──
  // Once a company+plant is chosen (or flows already exist), this is cleared
  const [gateScreen, setGateScreen] = useState(() => loadSavedFlows().length === 0);
  const [gateCompany, setGateCompany] = useState(null);
  const [gatePlant, setGatePlant] = useState(null);

  // ── API-fetched companies & plants for gate screen ────────────────────────
  const [gateCompanies, setGateCompanies] = useState([]);
  const [gatePlants,    setGatePlants]    = useState([]);
  const [loadingGateC,  setLoadingGateC]  = useState(false);
  const [loadingGateP,  setLoadingGateP]  = useState(false);

  useEffect(() => {
    if (!gateScreen) return;
    setLoadingGateC(true);
    fetch(`${API_BASE}/companies`)
      .then(r => r.json())
      .then(data => setGateCompanies((data || []).map(c => ({ id: c.id, name: c.company_name || c.name }))))
      .catch(() => setGateCompanies([]))
      .finally(() => setLoadingGateC(false));
  }, [gateScreen]);

  useEffect(() => {
    if (!gateCompany) { setGatePlants([]); return; }
    setLoadingGateP(true);
    fetch(`${API_BASE}/plants?company_id=${gateCompany.id}`)
      .then(r => r.json())
      .then(data => setGatePlants((data || []).map(p => ({ id: p.id, name: p.plant_name || p.name }))))
      .catch(() => setGatePlants([]))
      .finally(() => setLoadingGateP(false));
  }, [gateCompany]);

  // ── Filter bar state ──────────────────────────────────────────────────────
  const [filterCompany, setFilterCompany] = useState(null);
  const [filterPlant,   setFilterPlant]   = useState(null);

  // Switch to a flow — load its groupOrder + groupEntityIds
  const switchToFlow = useCallback((flowId) => {
    if (flowId === 'default') {
      const init = {};
      GROUPS.forEach(g => { init[g.id] = g.entities.map(e => e.id); });
      setGroupEntityIds(init);
      setGroupOrder(GROUPS.map(g => g.id));
      setExpanded({ 'basic-info': true, 'inventory': true, 'sales-finance': true, 'warehouse-purchase': true, 'inv-properties': true });
      setOuterExpanded(false);
    } else {
      const flow = savedFlows.find(f => f.id === flowId);
      if (!flow) return;
      setGroupEntityIds(mergeWithGroups(flow.groupEntityIds));
      // merge groupOrder — append any new group IDs missing from saved order
      const savedOrder = flow.groupOrder || [];
      const allGroupIds = GROUPS.map(g => g.id);
      const mergedOrder = [...savedOrder];
      allGroupIds.forEach(id => { if (!mergedOrder.includes(id)) mergedOrder.push(id); });
      setGroupOrder(mergedOrder);
      setExpanded({ 'basic-info': true, 'inventory': true, 'sales-finance': true, 'warehouse-purchase': true, 'inv-properties': true });
      setOuterExpanded(true);
    }
    setActiveFlowId(flowId);
  }, [savedFlows]);

  // Save current drag state into active custom flow
  const saveCurrentFlow = useCallback(() => {
    if (activeFlowId === 'default') return; // default kabhi save nahi hoti
    setSavedFlows(prev => {
      const updated = prev.map(f =>
        f.id === activeFlowId
          ? { ...f, groupOrder: [...groupOrder], groupEntityIds: { ...groupEntityIds } }
          : f
      );
      persistFlows(updated);
      return updated;
    });
    setSaveNotification(true);
    setTimeout(() => setSaveNotification(false), 3000);
  }, [activeFlowId, groupOrder, groupEntityIds]);

  // Reset active custom flow to default layout
  const resetFlowToDefault = useCallback(() => {
    if (activeFlowId === 'default') return;
    const init = {};
    GROUPS.forEach(g => { init[g.id] = g.entities.map(e => e.id); });
    setGroupEntityIds(init);
    setGroupOrder(GROUPS.map(g => g.id));
    // Also persist this reset
    setSavedFlows(prev => {
      const updated = prev.map(f =>
        f.id === activeFlowId
          ? { ...f, groupOrder: GROUPS.map(g => g.id), groupEntityIds: init }
          : f
      );
      persistFlows(updated);
      return updated;
    });
  }, [activeFlowId]);

  // Delete a custom flow
  const deleteFlow = useCallback((flowId) => {
    setSavedFlows(prev => {
      const updated = prev.filter(f => f.id !== flowId);
      persistFlows(updated);
      return updated;
    });
    if (activeFlowId === flowId) switchToFlow('default');
  }, [activeFlowId, switchToFlow]);

  // Wizard done — create new flow
  const handleWizardDone = useCallback(({ name, company, plant }) => {
    const init = {};
    GROUPS.forEach(g => { init[g.id] = g.entities.map(e => e.id); });
    const newFlow = {
      id: `flow_${Date.now()}`,
      name,
      company,
      plant,
      isActive: false,
      groupOrder: GROUPS.map(g => g.id),
      groupEntityIds: init,
    };
    setSavedFlows(prev => {
      const updated = [...prev, newFlow];
      persistFlows(updated);
      return updated;
    });
    setShowAddWizard(false);
    // Switch to new flow immediately
    setGroupEntityIds(init);
    setGroupOrder(GROUPS.map(g => g.id));
    setExpanded({ 'basic-info': true, 'inventory': true, 'sales-finance': true, 'warehouse-purchase': true, 'inv-properties': true });
    setOuterExpanded(true);
    setActiveFlowId(newFlow.id);
  }, []);

  // Gate screen proceed — create first flow from selected company/plant
  const handleGateProceed = useCallback(() => {
    if (!gateCompany) return;
    const init = {};
    GROUPS.forEach(g => { init[g.id] = g.entities.map(e => e.id); });
    const newFlow = {
      id: `flow_${Date.now()}`,
      name: `${gateCompany.name}${gatePlant ? ` · ${gatePlant.name}` : ''} Flow`,
      company: gateCompany,
      plant: gatePlant,
      isActive: false,
      groupOrder: GROUPS.map(g => g.id),
      groupEntityIds: init,
    };
    setSavedFlows(prev => {
      const updated = [...prev, newFlow];
      persistFlows(updated);
      return updated;
    });
    setGroupEntityIds(init);
    setGroupOrder(GROUPS.map(g => g.id));
    setExpanded({ 'basic-info': true, 'inventory': true, 'sales-finance': true, 'warehouse-purchase': true, 'inv-properties': true });
    setOuterExpanded(true);
    setActiveFlowId(newFlow.id);
    setGateScreen(false);
  }, [gateCompany, gatePlant]);

  // Toggle active — only one flow can be active at a time
  const toggleFlowActive = useCallback((flowId) => {
    setSavedFlows(prev => {
      const updated = prev.map(f => ({
        ...f,
        isActive: f.id === flowId ? !f.isActive : false,
      }));
      persistFlows(updated);
      return updated;
    });
  }, []);

  // ── Advanced DnD shared state ──
  const [dragging, setDragging] = useState(null);   // { groupId, index }
  const [dropTarget, setDropTarget] = useState(null); // { groupId, index, side }

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Active flow ki company/plant se mappingRecord banao — taaki View Page
  // hamesha sahi company ke custom fields dikhaaye
  const activeFlow = savedFlows.find(f => f.id === activeFlowId) ?? null;
  const mr = activeFlow
    ? {
        ...(mappingRecord ?? {}),
        company_id: activeFlow.company?.id ?? mappingRecord?.company_id ?? null,
        plant_id:   activeFlow.plant?.id   ?? mappingRecord?.plant_id   ?? null,
        company: activeFlow.company
          ? {
              id:           activeFlow.company.id,
              company_name: activeFlow.company.name,
              ...(mappingRecord?.company ?? {}),
            }
          : (mappingRecord?.company ?? null),
        plant: activeFlow.plant
          ? {
              id:         activeFlow.plant.id,
              plant_name: activeFlow.plant.name,
              ...(mappingRecord?.plant ?? {}),
            }
          : (mappingRecord?.plant ?? null),
      }
    : (mappingRecord ?? null);

  const previewHandlers = {
    itemInfo:          () => setItemInfoPage({ mappingRecord: mr }),
    analysis:          () => setAnalysisFieldsPage({ mappingRecord: mr }),
    custom:            () => setCustomFieldsPage({ mappingRecord: mr }),
    gl:                () => setGLSelectionPage({ mappingRecord: mr }),
    itemCodeCreation:  () => setItemCodeCreationPointPage({ mappingRecord: mr }),
    inventory:           () => setInventoryPage(true),
    inventoryEntity:     () => setInventoryEntityPage(true),
    invProperties:       () => setInvPropertiesPage(true),
    invPropertiesEntity: () => setInvPropertiesEntityPage({ mappingRecord: mr }),
    salesFinance:      () => setSalesFinancePage(true),
    salesDetail:       () => setSalesDetailEntityPage({ mappingRecord: mr }),
    financeDetails:    () => setFinanceDetailsEntityPage({ mappingRecord: mr }),
    warehousePurchase: () => setWarehousePurchasePage(true),
    warehouse:         () => setWarehouseDetailsEntityPage({ mappingRecord: mr }),
    purchase:          () => setPurchaseDetailsEntityPage({ mappingRecord: mr }),
  };

  const handleToggle = (groupId) => {
    setExpanded(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // ── Auto-persist helper: called after any drag/remove change ──────────────
  // Saves updated groupEntityIds + groupOrder into the active custom flow
  const autoPersist = useCallback((newGroupEntityIds, newGroupOrder) => {
    if (activeFlowId === 'default') return;
    setSavedFlows(prev => {
      const updated = prev.map(f =>
        f.id === activeFlowId
          ? { ...f, groupEntityIds: newGroupEntityIds, groupOrder: newGroupOrder }
          : f
      );
      persistFlows(updated);
      return updated;
    });
  }, [activeFlowId]);

  const handleEntityRemove = (groupId, entityId) => {
    setGroupEntityIds(prev => {
      const next = { ...prev, [groupId]: prev[groupId].filter(id => id !== entityId) };
      autoPersist(next, groupOrder);
      return next;
    });
  };

  // Enhanced reorder with side awareness
  const handleEntityReorder = (groupId, fromIdx, toIdx, side) => {
    setGroupEntityIds(prev => {
      const arr = [...prev[groupId]];
      if (fromIdx === toIdx) return prev;
      const [item] = arr.splice(fromIdx, 1);
      let insertAt = toIdx;
      if (side === 'right') insertAt = toIdx + 1;
      if (fromIdx < toIdx) insertAt = Math.max(0, insertAt - 1);
      arr.splice(Math.max(0, Math.min(insertAt, arr.length)), 0, item);
      const next = { ...prev, [groupId]: arr };
      autoPersist(next, groupOrder);
      return next;
    });
  };

  // Group card drag — saari entities ek group se doosre mein move karna
  const handleGroupMerge = (fromGroupId, fromEntityIds, toGroupId) => {
    setGroupEntityIds(prev => {
      const fromArr = prev[fromGroupId].filter(id => !fromEntityIds.includes(id));
      const toArr   = [...prev[toGroupId]];
      fromEntityIds.forEach(id => {
        if (!toArr.includes(id)) toArr.push(id);
      });
      const next = { ...prev, [fromGroupId]: fromArr, [toGroupId]: toArr };
      autoPersist(next, groupOrder);
      return next;
    });
  };

  // Group cards reorder
  const handleGroupReorder = (fromIdx, toIdx, side) => {
    setGroupOrder(prev => {
      const arr = [...prev];
      if (fromIdx === toIdx) return prev;
      const [item] = arr.splice(fromIdx, 1);
      let insertAt = toIdx;
      if (side === 'right') insertAt = toIdx + 1;
      if (fromIdx < toIdx) insertAt = Math.max(0, insertAt - 1);
      arr.splice(Math.max(0, Math.min(insertAt, arr.length)), 0, item);
      autoPersist(groupEntityIds, arr);
      return arr;
    });
  };

  // Cross-group move: entity ek group se nikal ke doosre mein daalna
  const handleEntityCrossGroupMove = (fromGroupId, fromIdx, toGroupId, toIdx, side) => {
    setGroupEntityIds(prev => {
      const fromArr = [...prev[fromGroupId]];
      const toArr   = [...prev[toGroupId]];
      const [entityId] = fromArr.splice(fromIdx, 1);
      // Check: kya entity target group mein already exist karti hai?
      // (agar nahi toh hi move karo)
      if (!toArr.includes(entityId)) {
        let insertAt = toIdx;
        if (side === 'right') insertAt = toIdx + 1;
        toArr.splice(Math.max(0, Math.min(insertAt, toArr.length)), 0, entityId);
      }
      const next = { ...prev, [fromGroupId]: fromArr, [toGroupId]: toArr };
      autoPersist(next, groupOrder);
      return next;
    });
  };

  const dragCtx = { dragging, setDragging, dropTarget, setDropTarget };

  return (
    <DragContext.Provider value={dragCtx}>
      {/* ── Internal popup renders (isolated from WorkflowDashboard) ── */}
      {createItemMasterOpen && (
        <CreateItemMasterPagePopup
          onClose={() => setCreateItemMasterOpen(false)}
          mappingRecord={mr}
        />
      )}
      {itemInfoPage && (
        <BasicItemInfoPagePopup
          mappingRecord={itemInfoPage.mappingRecord}
          onClose={() => setItemInfoPage(null)}
        />
      )}
      {analysisFieldsPage && (
        <AnalysisFieldsPagePopup
          mappingRecord={analysisFieldsPage.mappingRecord}
          onClose={() => setAnalysisFieldsPage(null)}
        />
      )}
      {customFieldsPage && (
        <CustomFieldsPagePopup
          mappingRecord={customFieldsPage.mappingRecord}
          onClose={() => setCustomFieldsPage(null)}
        />
      )}
      {glSelectionPage && (
        <ItemMasterGLSelectionPagePopup
          mappingRecord={glSelectionPage.mappingRecord}
          onClose={() => setGLSelectionPage(null)}
        />
      )}
      {itemCodeCreationPointPage && (
        <ItemCodeCreationPointPopup
          mappingRecord={itemCodeCreationPointPage.mappingRecord}
          onClose={() => setItemCodeCreationPointPage(null)}
        />
      )}
      {inventoryPage && (
        <InventoryPagePopup onClose={() => setInventoryPage(false)} />
      )}
      {inventoryEntityPage && (
        <ItemMasterInventoryPagePopup onClose={() => setInventoryEntityPage(false)} />
      )}
      {invPropertiesPage && (
        <RenderItemMasterInvPropertiesPagePopup
          mappingRecord={mr}
          onClose={() => setInvPropertiesPage(false)}
        />
      )}
      {invPropertiesEntityPage && (
        <ItemMasterInvPropertiesPagePopup
          mappingRecord={invPropertiesEntityPage.mappingRecord}
          onClose={() => setInvPropertiesEntityPage(null)}
        />
      )}
      {salesFinancePage && (
        <SalesAndFinancePagePopup onClose={() => setSalesFinancePage(false)} />
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
      {warehousePurchasePage && (
        <WarehouseAndPurchasePagePopup onClose={() => setWarehousePurchasePage(false)} />
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
      {/* ── Item Info Forward Popup — opens on entity Forward button click ── */}
      {/* workflowMode=true → routing configurator; active flow ki company ke depts dikhata hai */}
      {forwardPopup && (
        <ItemInfoForwardPopup
          open={true}
          onClose={() => setForwardPopup(null)}
          onSaveInfo={() => {
            // Open the entity's View Page (same as clicking View Page)
            if (forwardPopup.entity) previewHandlers[forwardPopup.entity.openKey]?.();
            setForwardPopup(null);
          }}
          onForward={(result) => {
            // After successful forward, just close
            setForwardPopup(null);
          }}
          mappingRecord={forwardPopup.mappingRecord}
          userId={(() => {
            try {
              const stored = sessionStorage.getItem('userData');
              if (!stored) return null;
              return JSON.parse(stored)?.user?.id ?? null;
            } catch { return null; }
          })()}
          workflowMode={true}
          workflowCompanyId={
            forwardPopup.mappingRecord?.company_id ?? null
          }
          workflowCompanyName={
            forwardPopup.mappingRecord?.company?.company_name
            ?? forwardPopup.mappingRecord?.company_name
            ?? null
          }
        />
      )}
      {/* ── Add Flow Wizard ── */}
      {showAddWizard && (
        <AddFlowWizard
          existingNames={savedFlows.map(f => f.name.toLowerCase())}
          onCancel={() => setShowAddWizard(false)}
          onDone={handleWizardDone}
        />
      )}
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.72)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          paddingLeft: '10%',
          zIndex: 99999,
          animation: 'fadeIn .2s ease',
        }}
      >
        <style>{`
          @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
          @keyframes slideUp { from { transform:translateY(20px); opacity:0 } to { transform:translateY(0); opacity:1 } }
          @keyframes pulseBar {
            from { opacity: .7; box-shadow: 0 0 4px #3b82f6; }
            to   { opacity: 1;  box-shadow: 0 0 12px #3b82f6, 0 0 20px rgba(59,130,246,.4); }
          }
          @keyframes laneGlow {
            from { box-shadow: 0 4px 12px rgba(251,146,60,.12); }
            to   { box-shadow: 0 4px 18px rgba(59,130,246,.25), 0 0 0 2px rgba(59,130,246,.15); }
          }
          @keyframes toastIn {
            from { transform: translateY(12px) scale(.95); opacity: 0; }
            to   { transform: translateY(0)    scale(1);   opacity: 1; }
          }
        `}</style>

        {/* ── Save Notification Toast ── */}
        {saveNotification && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#14532d',
            color: '#dcfce7',
            fontSize: 13, fontWeight: 700,
            padding: '12px 24px',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'toastIn .25s cubic-bezier(.34,1.56,.64,1)',
            zIndex: 10,
            border: '1.5px solid #16a34a',
            pointerEvents: 'none',
          }}>
            ✅ Flow saved successfully!
          </div>
        )}

        <div style={{
          width: '70vw', maxWidth: 980,
          height: '70vh',
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.38)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'slideUp .25s cubic-bezier(.16,1,.3,1)',
        }}>

          {/* ── Header ── */}
          <div style={{
            ...HDR,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: 46, flexShrink: 0, padding: '0 16px',
            background: 'linear-gradient(to right, #92400e, #c2410c, #9a3412)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,.25)' }}>
                <Layers size={13} color="#fed7aa" />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: .3 }}>Item Master Workflow Builder</div>
                <div style={{ fontSize: 8, color: '#fed7aa', letterSpacing: .8, textTransform: 'uppercase' }}>Configure pages per company &amp; plant · drag to reorder</div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', cursor: 'pointer', padding: '4px 12px', borderRadius: 5, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.28)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.15)'}
            >
              <X size={11} /> Close
            </button>
          </div>

          {/* ── Body ── */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: 'linear-gradient(135deg, #fef9f0, #fff7ed 50%, #fdf4ff)' }}>

            {/* ── GATE SCREEN: company/plant selector shown first if no flows ── */}
            {gateScreen ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60%', gap: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#7c2d12', textAlign: 'center' }}>Select Company &amp; Plant to Build Flow</div>
                <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Company */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Select Company <span style={{ color: '#ef4444' }}>*</span></div>
                    {loadingGateC ? (
                      <div style={{ fontSize: 10, color: '#6b7280', padding: '8px 0' }}>⏳ Loading companies...</div>
                    ) : gateCompanies.length === 0 ? (
                      <div style={{ fontSize: 10, color: '#ef4444', padding: '8px 0' }}>No companies found</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                        {gateCompanies.map(c => (
                          <div
                            key={c.id}
                            onClick={() => { setGateCompany(c); setGatePlant(null); }}
                            style={{
                              padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
                              border: `2px solid ${gateCompany?.id === c.id ? '#c2410c' : '#e5e7eb'}`,
                              background: gateCompany?.id === c.id ? '#fff7ed' : '#f9fafb',
                              fontSize: 12, fontWeight: gateCompany?.id === c.id ? 700 : 500,
                              color: gateCompany?.id === c.id ? '#92400e' : '#374151',
                              transition: 'all .15s',
                            }}
                          >🏢 {c.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Plant */}
                  {gateCompany && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                        Select Plant <span style={{ fontSize: 9, fontWeight: 500, color: '#9ca3af', marginLeft: 6 }}>(optional)</span>
                      </div>
                      {loadingGateP ? (
                        <div style={{ fontSize: 10, color: '#6b7280', padding: '6px 0' }}>⏳ Loading plants...</div>
                      ) : gatePlants.length === 0 ? (
                        <div style={{ fontSize: 10, color: '#9ca3af', padding: '6px 0' }}>No plants for this company</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
                          {gatePlants.map(p => (
                            <div
                              key={p.id}
                              onClick={() => setGatePlant(prev => prev?.id === p.id ? null : p)}
                              style={{
                                padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
                                border: `2px solid ${gatePlant?.id === p.id ? '#c2410c' : '#e5e7eb'}`,
                                background: gatePlant?.id === p.id ? '#fff7ed' : '#f9fafb',
                                fontSize: 12, fontWeight: gatePlant?.id === p.id ? 700 : 500,
                                color: gatePlant?.id === p.id ? '#92400e' : '#374151',
                                transition: 'all .15s',
                              }}
                            >🏭 {p.name} {gatePlant?.id === p.id && <span style={{ fontSize: 9, marginLeft: 4 }}>✓</span>}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleGateProceed}
                    disabled={!gateCompany}
                    style={{
                      padding: '9px 0', borderRadius: 8, border: 'none', cursor: gateCompany ? 'pointer' : 'not-allowed',
                      background: gateCompany ? '#c2410c' : '#e5e7eb', color: gateCompany ? '#fff' : '#9ca3af',
                      fontSize: 12, fontWeight: 700, transition: 'all .15s',
                    }}
                    onMouseEnter={e => { if (gateCompany) e.currentTarget.style.background = '#9a3412'; }}
                    onMouseLeave={e => { if (gateCompany) e.currentTarget.style.background = '#c2410c'; }}
                  >Proceed →</button>
                </div>
              </div>
            ) : (
            <>

            {/* ── COMPANY / PLANT FILTER BAR ── */}
            {(() => {
              // Unique companies from saved flows
              const companies = [];
              savedFlows.forEach(f => {
                if (f.company && !companies.find(c => c.id === f.company.id)) companies.push(f.company);
              });
              // Plants for selected company
              const plants = filterCompany
                ? savedFlows.filter(f => f.company?.id === filterCompany.id && f.plant).map(f => f.plant).filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
                : [];
              if (companies.length === 0) return null;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap', padding: '6px 10px', background: 'rgba(251,146,60,.07)', borderRadius: 8, border: '1px solid rgba(251,146,60,.18)' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#92400e', marginRight: 2 }}>🏢 Company:</span>
                  {companies.map(c => (
                    <div
                      key={c.id}
                      onClick={() => { setFilterCompany(prev => prev?.id === c.id ? null : c); setFilterPlant(null); }}
                      style={{
                        padding: '2px 10px', borderRadius: 12, cursor: 'pointer', fontSize: 9, fontWeight: 700,
                        background: filterCompany?.id === c.id ? '#c2410c' : 'rgba(194,65,12,.1)',
                        color: filterCompany?.id === c.id ? '#fff' : '#92400e',
                        border: `1.5px solid ${filterCompany?.id === c.id ? '#c2410c' : 'rgba(194,65,12,.3)'}`,
                        transition: 'all .15s', userSelect: 'none',
                      }}
                    >{c.name}</div>
                  ))}
                  {plants.length > 0 && (
                    <>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#92400e', marginLeft: 6, marginRight: 2 }}>🏭 Plant:</span>
                      {plants.map(p => (
                        <div
                          key={p.id}
                          onClick={() => setFilterPlant(prev => prev?.id === p.id ? null : p)}
                          style={{
                            padding: '2px 10px', borderRadius: 12, cursor: 'pointer', fontSize: 9, fontWeight: 700,
                            background: filterPlant?.id === p.id ? '#7c3aed' : 'rgba(124,58,237,.1)',
                            color: filterPlant?.id === p.id ? '#fff' : '#7c3aed',
                            border: `1.5px solid ${filterPlant?.id === p.id ? '#7c3aed' : 'rgba(124,58,237,.3)'}`,
                            transition: 'all .15s', userSelect: 'none',
                          }}
                        >{p.name}</div>
                      ))}
                    </>
                  )}
                  {(filterCompany || filterPlant) && (
                    <div
                      onClick={() => { setFilterCompany(null); setFilterPlant(null); }}
                      style={{ padding: '2px 8px', borderRadius: 12, cursor: 'pointer', fontSize: 9, fontWeight: 700, background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fca5a5', marginLeft: 4 }}
                    >✕ Clear</div>
                  )}
                </div>
              );
            })()}

            {/* ── FLOW TABS BAR ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: 14, flexWrap: 'wrap',
            }}>
              {/* Custom flow tabs — filtered */}
              {savedFlows.filter(flow => {
                if (filterCompany && flow.company?.id !== filterCompany.id) return false;
                if (filterPlant && flow.plant?.id !== filterPlant.id) return false;
                return true;
              }).map(flow => (
                <div
                  key={flow.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                    fontSize: 10, fontWeight: activeFlowId === flow.id ? 800 : 600,
                    background: activeFlowId === flow.id ? '#c2410c' : 'rgba(194,65,12,.1)',
                    color: activeFlowId === flow.id ? '#fff' : '#92400e',
                    border: `1.5px solid ${activeFlowId === flow.id ? '#c2410c' : 'rgba(194,65,12,.3)'}`,
                    transition: 'all .15s', userSelect: 'none',
                    position: 'relative',
                  }}
                  onClick={() => switchToFlow(flow.id)}
                >
                  {/* Active indicator dot */}
                  <span
                    title={flow.isActive ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                    onClick={e => { e.stopPropagation(); toggleFlowActive(flow.id); }}
                    style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: flow.isActive ? '#22c55e' : 'rgba(156,163,175,.5)',
                      border: `1.5px solid ${flow.isActive ? '#16a34a' : '#9ca3af'}`,
                      display: 'inline-block', cursor: 'pointer',
                      boxShadow: flow.isActive ? '0 0 5px #22c55e' : 'none',
                      transition: 'all .2s',
                    }}
                  />
                  <span>🏢 {flow.name}</span>
                  <span style={{ fontSize: 8, opacity: .7 }}>({flow.company?.name}{flow.plant ? ` · ${flow.plant.name}` : ''})</span>
                  {/* Delete button for custom flows */}
                  <button
                    onClick={e => { e.stopPropagation(); if (window.confirm(`Delete flow "${flow.name}"?`)) deleteFlow(flow.id); }}
                    title="Delete this flow"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px',
                      color: activeFlowId === flow.id ? 'rgba(255,255,255,.8)' : '#92400e',
                      display: 'flex', alignItems: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = activeFlowId === flow.id ? 'rgba(255,255,255,.8)' : '#92400e'}
                  >
                    <X size={9} />
                  </button>
                </div>
              ))}

              {/* Right-side action buttons pushed to the end */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* + Add New Flow */}
                <button
                  onClick={() => setShowAddWizard(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
                    fontSize: 10, fontWeight: 700,
                    background: 'rgba(37,99,235,.1)',
                    color: '#1d4ed8',
                    border: '1.5px dashed #93c5fd',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,.18)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,99,235,.1)'; }}
                >
                  <Plus size={10} /> Add New Flow
                </button>

                {/* Reset to default button — only for custom flows */}
                {activeFlowId !== 'default' && (
                  <button
                    onClick={() => { if (window.confirm('Reset this flow to default page order?')) resetFlowToDefault(); }}
                    title="Reset this flow to default layout"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
                      fontSize: 10, fontWeight: 700,
                      background: 'rgba(234,88,12,.1)',
                      color: '#ea580c',
                      border: '1.5px solid rgba(234,88,12,.35)',
                      transition: 'all .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(234,88,12,.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(234,88,12,.1)'; }}
                  >
                    <RotateCcw size={10} /> Reset to Default
                  </button>
                )}
              </div>
            </div>

            {/* Zone label */}
            <div style={{ fontSize: 9, fontWeight: 700, color: '#92400e', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 3, height: 12, background: '#c2410c', borderRadius: 2 }} />
              Workflow Page Order — drag entity nodes to reorder within each group
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 'max-content' }}>

              {/* ── TOP: Item Master main node ── */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: 8 }}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
                    border: `2px solid ${outerExpanded ? '#ea580c' : '#fb923c'}`,
                    borderRadius: outerExpanded ? '8px 8px 8px 8px' : 8,
                    padding: '8px 12px',
                    minWidth: 170,
                    cursor: 'pointer',
                    boxShadow: outerExpanded ? '0 0 0 3px rgba(251,146,60,.22)' : '0 2px 6px rgba(251,146,60,.13)',
                    transition: 'all .18s',
                    position: 'relative',
                  }}
                  onClick={() => setOuterExpanded(p => !p)}
                  onMouseEnter={e => { if (!outerExpanded) e.currentTarget.style.boxShadow = '0 0 0 2px rgba(251,146,60,.35), 0 4px 12px rgba(251,146,60,.18)'; }}
                  onMouseLeave={e => { if (!outerExpanded) e.currentTarget.style.boxShadow = '0 2px 6px rgba(251,146,60,.13)'; }}
                >
                  <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: .7, textTransform: 'uppercase', color: '#ea580c', marginBottom: 3 }}>🗂️ Item Master</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', marginBottom: 2 }}>Item Master</div>
                  <div style={{ fontSize: 7, color: '#9a3412', fontFamily: 'monospace', marginBottom: 5, opacity: .8 }}>info · inventory · sales · warehouse</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setCreateItemMasterOpen(true); }}
                      style={{ fontSize: 7, fontWeight: 700, color: '#ea580c', background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, width: 'fit-content' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,146,60,.3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,146,60,.15)'}
                    >📋 View Page</button>
                  </div>
                  <div style={{ position: 'absolute', right: 8, top: '50%', transform: `translateY(-50%) rotate(${outerExpanded ? 90 : 0}deg)`, transition: 'transform .22s cubic-bezier(.34,1.56,.64,1)', fontSize: 10, color: '#ea580c' }}>▶</div>
                </div>
              </div>

              {/* ── SECOND ROW: 4 group header cards — draggable ── */}
              {outerExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <GroupDragRow
                    groupOrder={groupOrder}
                    onGroupReorder={handleGroupReorder}
                  >
                    {groupOrder.map((groupId, gi) => {
                      const group = GROUPS.find(g => g.id === groupId);
                      if (!group) return null;
                      return (
                        <React.Fragment key={group.id}>
                          <GroupSection
                            group={group}
                            entityIds={groupEntityIds[group.id]}
                            expanded={expanded[group.id]}
                            onToggle={() => handleToggle(group.id)}
                            onViewPage={() => previewHandlers[group.viewKey]?.()}
                            onEntityPreview={entity => previewHandlers[entity.openKey]?.()}
                            onEntityRemove={handleEntityRemove}
                            onEntityReorder={(from, to, side) => handleEntityReorder(group.id, from, to, side)}
                            onEntityCrossGroupMove={handleEntityCrossGroupMove}
                            onGroupMerge={handleGroupMerge}
                            isLast={gi === groupOrder.length - 1}
                            onEntityForward={entity => setForwardPopup({ entity, mappingRecord: mr })}
                          />
                          {gi < groupOrder.length - 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', paddingTop: 24, flexShrink: 0 }}>
                              <FlowArrow />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </GroupDragRow>
                </div>
              )}

            </div>
            </>
            )} {/* end gate screen ternary */}
          </div>

          {/* ── Footer ── */}
          <div style={{
            ...FTR,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 16px', flexShrink: 0, height: 38,
            background: 'linear-gradient(to right, #9a3412, #c2410c)',
          }}>
            <div style={{ display: 'flex', gap: 16, fontSize: 8, color: '#fde8cc' }}>
              <span>💡 Click group card to expand/collapse</span>
              <span>↔️ Drag entity nodes to reorder</span>
              <span>👁 Click View Page to preview</span>
              <span>✕ Remove entity from group</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setCreateItemMasterOpen(true)}
                style={{ padding: '4px 14px', fontSize: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,.35)', borderRadius: 5, background: 'rgba(255,255,255,.15)', color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.28)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.15)'}
              >
                📋 View Item Master Page
              </button>
              <button
                onClick={() => { if (activeFlowId !== 'default') saveCurrentFlow(); }}
                style={{ padding: '4px 18px', fontSize: 10, fontWeight: 800, cursor: 'pointer', border: 'none', borderRadius: 5, background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}
                onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
                onMouseLeave={e => e.currentTarget.style.background = '#16a34a'}
              >
                💾 Save Flow
              </button>
            </div>
          </div>

        </div>
      </div>
    </DragContext.Provider>
  );
}