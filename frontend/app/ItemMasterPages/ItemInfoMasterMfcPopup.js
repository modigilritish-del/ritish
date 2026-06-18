// ItemInfoMasterMfcPopup.js
//
// Single popup — choose a page, MfcPopup is reused exactly.
//
// Structure:
//   📦 Item Master              (Page 1 — 5 sub-pages)
//       ├─ Item Info
//       ├─ Analysis Fields
//       ├─ Breez Custom Fields
//       ├─ Sonata Custom Fields
//       └─ Sweet Nutrition Custom Fields
//
//   🏭 Item Master Inventory    (Page 2 — 1 sub-page)
//       └─ Inventory Page
//
//   💰 Item Master Sales & Finance  (Page 3 — 2 sub-pages)
//       ├─ Sales Details
//       └─ Finance Details
//
//   🏗️ Item Master Warehouse & Purchase  (Page 4 — 2 sub-pages)
//       ├─ Warehouse Details
//       └─ Purchase Details
//
// Zero changes to MfcPopup, workflowConstants, or any other file.
// Props:  onClose — called when dismissed.

import { useState } from 'react';
import MfcPopup from './MfcPopup';
import { CLR, HDR, FTR } from './workflowConstants';

// ── Page 1: Item Master — 5 sub-pages ────────────────────────────────────────
const ITEM_MASTER_SUBPAGES = [
  { pageKey: 'item-info-master',             pageName: 'Item Info',                    icon: '📋', desc: 'Base UOM, Stock, Batch, Warranty…' },
  { pageKey: 'item-master-analysis-fields',  pageName: 'Analysis Fields',              icon: '📊', desc: 'Category, Product Type, Classification…' },
  { pageKey: 'breez-custom-fields',          pageName: 'Breez Custom Fields',          icon: '🟦', desc: 'Item Weight, SLS Category, Laminate…' },
  { pageKey: 'sonata-custom-fields',         pageName: 'Sonata Custom Fields',         icon: '🎵', desc: 'Auto Batch, CRM Item, WMS Item…' },
  { pageKey: 'sweet-nutrition-custom-fields',pageName: 'Sweet Nutrition Custom Fields',icon: '🍬', desc: 'Item Weight, Brand, Flavour, Category…' },
];

// ── Page 2: Item Master Inventory — 1 sub-page ───────────────────────────────
const ITEM_MASTER_INVENTORY_SUBPAGES = [
  { pageKey: 'item-master-inventory', pageName: 'Item Master Inventory Page', icon: '🏭', desc: 'Parent Item, Packed Item, Stock Qty, Reorder…' },
];

// ── Page 3: Sales & Finance — 2 sub-pages ────────────────────────────────────
const SALES_FINANCE_SUBPAGES = [
  { pageKey: 'item-master-sales-details',   pageName: 'Sales Details',   icon: '🛒', desc: 'Item Class, VED Class, Price Control Code…' },
  { pageKey: 'item-master-finance-details', pageName: 'Finance Details', icon: '💰', desc: 'Tax Group, Method of Costing, Standard Price…' },
];

// ── Page 4: Warehouse & Purchase — 2 sub-pages ───────────────────────────────
const WAREHOUSE_PURCHASE_SUBPAGES = [
  { pageKey: 'item-master-warehouse-details', pageName: 'Warehouse Details', icon: '🏗️', desc: 'Storage Temp, Potency Item, Forced Putaway…' },
  { pageKey: 'item-master-purchase-details',  pageName: 'Purchase Details',  icon: '🛍️', desc: 'Vendor Analysis, Tolerance %, Variance %…' },
];

// ── Colours per group ─────────────────────────────────────────────────────────
const IM_COLOR  = '#f97316'; const IM_BG  = '#fff7ed'; const IM_BORDER  = '#fb923c';
const INV_COLOR = '#0891b2'; const INV_BG = '#ecfeff'; const INV_BORDER = '#06b6d4';
const SF_COLOR  = '#7c3aed'; const SF_BG  = '#f5f3ff'; const SF_BORDER  = '#a78bfa';
const WP_COLOR  = '#059669'; const WP_BG  = '#ecfdf5'; const WP_BORDER  = '#34d399';

// ── Top-level entries ─────────────────────────────────────────────────────────
const TOP_LEVEL = [
  { id: 'item-master',             label: 'Item Master',                       icon: '📦', desc: '5 pages — Item Info · Analysis Fields · Breez · Sonata · Sweet Nutrition',       color: IM_COLOR,  bg: IM_BG,  border: IM_BORDER,  badge: '5 sub-pages' },
  { id: 'item-master-inventory',   label: 'Item Master Inventory',             icon: '🏭', desc: 'Page 2 — Inventory · Parent Item · Packed Item · Stock Qty · Reorder…',         color: INV_COLOR, bg: INV_BG, border: INV_BORDER, badge: '1 sub-page'  },
  { id: 'sales-finance',           label: 'Item Master Sales & Finance',       icon: '💰', desc: 'Page 3 — Sales Details · Finance Details · Tax Group · Costing…',               color: SF_COLOR,  bg: SF_BG,  border: SF_BORDER,  badge: '2 sub-pages' },
  { id: 'warehouse-purchase',      label: 'Item Master Warehouse & Purchase',  icon: '🏗️', desc: 'Page 4 — Warehouse Details · Purchase Details · Tolerance · Variance…',         color: WP_COLOR,  bg: WP_BG,  border: WP_BORDER,  badge: '2 sub-pages' },
];

// ── All sub-pages flat map (group id → subpages array) ────────────────────────
const GROUP_SUBPAGES = {
  'item-master':          { subpages: ITEM_MASTER_SUBPAGES,         color: IM_COLOR,  bg: IM_BG,  border: IM_BORDER,  headerIcon: '📦', headerLabel: 'Item Master — Sub Pages',                      breadcrumb: '/ Item Master 1st Page'               },
  'item-master-inventory':{ subpages: ITEM_MASTER_INVENTORY_SUBPAGES,color: INV_COLOR, bg: INV_BG, border: INV_BORDER, headerIcon: '🏭', headerLabel: 'Item Master Inventory — Sub Pages',            breadcrumb: '/ Item Master Inventory Page 2'       },
  'sales-finance':        { subpages: SALES_FINANCE_SUBPAGES,       color: SF_COLOR,  bg: SF_BG,  border: SF_BORDER,  headerIcon: '💰', headerLabel: 'Item Master Sales & Finance — Sub Pages',      breadcrumb: '/ Item Master Sales & Finance Page 3' },
  'warehouse-purchase':   { subpages: WAREHOUSE_PURCHASE_SUBPAGES,  color: WP_COLOR,  bg: WP_BG,  border: WP_BORDER,  headerIcon: '🏗️', headerLabel: 'Item Master Warehouse & Purchase — Sub Pages', breadcrumb: '/ Item Master Warehouse & Purchase Page 4' },
};

// ── Flat list of ALL sub-pages for lookup ─────────────────────────────────────
const ALL_SUBPAGES = [
  ...ITEM_MASTER_SUBPAGES,
  ...ITEM_MASTER_INVENTORY_SUBPAGES,
  ...SALES_FINANCE_SUBPAGES,
  ...WAREHOUSE_PURCHASE_SUBPAGES,
];

// ── Which group does a pageKey belong to? ─────────────────────────────────────
function getGroupId(pageKey) {
  for (const [groupId, { subpages }] of Object.entries(GROUP_SUBPAGES)) {
    if (subpages.some(p => p.pageKey === pageKey)) return groupId;
  }
  return null;
}

// ─── Shared card button ───────────────────────────────────────────────────────
function PageCard({ icon, label, desc, color, bg, border, onClick, rightEl }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all .15s',
        width: '100%',
        boxSizing: 'border-box',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 0 3px ${border}55`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: `${color}18`, border: `1.5px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 10, color: CLR.textSm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</div>
      </div>
      {rightEl ?? <div style={{ fontSize: 16, color, flexShrink: 0 }}>›</div>}
    </button>
  );
}

// ─── MfcPopup wrapper — floating Back button, Close fully closes ──────────────
function MfcPopupWithBack({ pageKey, pageName, onBack, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100001, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.95)', border: '1.5px solid #cbd5e1',
            borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 700,
            color: CLR.primary, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            boxShadow: '0 2px 8px rgba(0,0,0,.15)',
          }}
        >
          ← Back to Sub Pages
        </button>
      </div>
      <MfcPopup pageKey={pageKey} pageName={pageName} onClose={onClose} />
    </div>
  );
}

// ─── Sub-page selector screen (reused for all 4 groups) ──────────────────────
function SubPageSelector({ groupId, onSelect, onBack, onClose }) {
  const { subpages, color, bg, border, headerIcon, headerLabel, breadcrumb } = GROUP_SUBPAGES[groupId];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(3px)' }}>
      <div style={{ width: '92vw', maxWidth: 520, maxHeight: '70vh', background: CLR.surface, borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={HDR}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{headerIcon}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{headerLabel}</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 600 }}>
            ✕ Close
          </button>
        </div>

        <div style={{ padding: '7px 14px', background: '#f8fafc', borderBottom: `1px solid ${CLR.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: CLR.primary, fontSize: 11, fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Go Back
          </button>
          <span style={{ color: CLR.muted, fontSize: 10 }}>{breadcrumb}</span>
        </div>

        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {subpages.map(sub => (
            <PageCard
              key={sub.pageKey}
              icon={sub.icon}
              label={sub.pageName}
              desc={sub.desc}
              color={color}
              bg={bg}
              border={border}
              onClick={() => onSelect(sub.pageKey)}
            />
          ))}
        </div>

        <div style={FTR} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ItemInfoMasterMfcPopup({ onClose }) {

  // null                  → top-level selector
  // group id string       → sub-page selector for that group
  // pageKey string        → MfcPopupWithBack for that page
  const [view, setView] = useState(null);

  const activePage = ALL_SUBPAGES.find(p => p.pageKey === view);

  // ── MfcPopupWithBack view ─────────────────────────────────────────────────
  if (activePage) {
    const groupId = getGroupId(view);
    return (
      <MfcPopupWithBack
        pageKey={activePage.pageKey}
        pageName={activePage.pageName}
        onBack={() => setView(groupId)}
        onClose={onClose}
      />
    );
  }

  // ── Sub-page selector for any group ──────────────────────────────────────
  if (view && GROUP_SUBPAGES[view]) {
    return (
      <SubPageSelector
        groupId={view}
        onSelect={pageKey => setView(pageKey)}
        onBack={() => setView(null)}
        onClose={onClose}
      />
    );
  }

  // ── Top-level selector ────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(3px)' }}>
      <div style={{ width: '92vw', maxWidth: 560, maxHeight: '70vh', background: CLR.surface, borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={HDR}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>⚙️</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Mandatory Field Config — Select Page</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 600 }}>
            ✕ Close
          </button>
        </div>

        <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: `1px solid ${CLR.border}`, fontSize: 11, color: CLR.textSm }}>
          👇 Select a page below to configure its mandatory fields
        </div>

        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TOP_LEVEL.map(entry => (
            <PageCard
              key={entry.id}
              icon={entry.icon}
              label={entry.label}
              desc={entry.desc}
              color={entry.color}
              bg={entry.bg}
              border={entry.border}
              onClick={() => setView(entry.id)}
              rightEl={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, background: `${entry.color}18`, color: entry.color, border: `1px solid ${entry.border}`, borderRadius: 99, padding: '2px 8px' }}>
                    {entry.badge}
                  </span>
                  <span style={{ fontSize: 14, color: entry.color }}>›</span>
                </div>
              }
            />
          ))}
        </div>

        <div style={FTR} />
      </div>
    </div>
  );
}