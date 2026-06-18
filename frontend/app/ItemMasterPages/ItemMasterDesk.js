/**
 * ItemMasterDesk.js  —  ItemMasterPages/
 * ─────────────────────────────────────────────────────────────────────────────
 * Item Master Desk — icon-based launcher for all Item Master sub-pages.
 *
 * Features:
 *  • Shows icon tiles for every available Item Master page
 *  • RBAC-aware: only shows tiles the user has access to (via /rbac/access-by-role)
 *  • Clicking a tile renders that page inline (one page at a time)
 *  • Back button returns to the desk
 *  • Active tile highlighted
 *  • Clean, professional ERP-style layout matching the reference image
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Package, Warehouse, TrendingUp, DollarSign,
  ShoppingCart, Building2, ClipboardList, Settings,
  BarChart2, Info, Music, ArrowLeft, Home,
  Box, Layers, Tag, LayoutGrid, Paperclip,
  Image, List, Hash, Cpu, BarChart,
} from 'lucide-react';

// ── Sub-page imports ──────────────────────────────────────────────────────────
import ItemInfoMaster                  from './ItemInfoMaster.js';
import ItemMasterInventory             from './ItemMasterInventory.js';
import ItemMasterSalesDetail           from './ItemMasterSalesDetail.js';
import ItemMasterFinanceDetails        from './ItemMasterFinanceDetails.js';
import ItemMasterWarehouseDetails      from './ItemMasterWarehouseDetails.js';
import ItemMasterPurchaseDetails       from './ItemMasterPurchaseDetails.js';
import RenderItemMasterSalesAndFinance from './RenderItemMasterSalesAndFinance.js';
import RenderItemMasterWarehouseAndPurchase from './RenderItemMasterWarehouseAndPurchase.js';
import InfoMaster                      from './InfoMaster.js';
import ItemTypeMaster                  from './ItemTypeMaster.js';

const API_BASE = 'http://localhost:8000/api';

const getSession = () => {
  try { const d = JSON.parse(sessionStorage.getItem('userData') || '{}'); return d?.user || null; }
  catch { return null; }
};

// ── Page registry — each entry is one icon tile ───────────────────────────────
// path must match what's in CompanyRolePageAccess (page_url) for RBAC
const ALL_PAGES = [
  {
    key:       'item-info',
    label:     'Item Info',
    sublabel:  'Key Info / UOM / Stock flags',
    icon:      FileText,
    color:     '#6366f1',
    bg:        '#eef2ff',
    component: ItemInfoMaster,
    path:      'add-item-info',
  },
  {
    key:       'item-master-inventory',
    label:     'Inventory',
    sublabel:  'Stock qty / Reorder / Lead time',
    icon:      Warehouse,
    color:     '#0ea5e9',
    bg:        '#f0f9ff',
    component: ItemMasterInventory,
    path:      'item-master-inventory',
  },
  {
    key:       'item-master-sales',
    label:     'Sales',
    sublabel:  'Item class / VED / Price control',
    icon:      TrendingUp,
    color:     '#22c55e',
    bg:        '#f0fdf4',
    component: ItemMasterSalesDetail,
    path:      'item-master-sales-detail',
  },
  {
    key:       'item-master-finance',
    label:     'Finance',
    sublabel:  'Tax group / Costing method',
    icon:      DollarSign,
    color:     '#f59e0b',
    bg:        '#fffbeb',
    component: ItemMasterFinanceDetails,
    path:      'item-master-finance-details',
  },
  {
    key:       'item-master-sales-finance',
    label:     'Sales & Finance',
    sublabel:  'Combined Sales + Finance view',
    icon:      BarChart2,
    color:     '#8b5cf6',
    bg:        '#f5f3ff',
    component: RenderItemMasterSalesAndFinance,
    path:      'render-item-master-sales-finance',
  },
  {
    key:       'item-master-warehouse',
    label:     'Warehouse',
    sublabel:  'Storage / Temperature / Handling',
    icon:      Box,
    color:     '#ef4444',
    bg:        '#fff1f2',
    component: ItemMasterWarehouseDetails,
    path:      'item-master-warehouse-details',
  },
  {
    key:       'item-master-purchase',
    label:     'Purchase',
    sublabel:  'Vendor analysis / Tolerances',
    icon:      ShoppingCart,
    color:     '#f97316',
    bg:        '#fff7ed',
    component: ItemMasterPurchaseDetails,
    path:      'item-master-purchase-details',
  },
  {
    key:       'item-master-warehouse-purchase',
    label:     'Warehouse & Purchase',
    sublabel:  'Combined Warehouse + Purchase view',
    icon:      Building2,
    color:     '#06b6d4',
    bg:        '#ecfeff',
    component: RenderItemMasterWarehouseAndPurchase,
    path:      'render-item-master-warehouse-purchase',
  },
  {
    key:       'info-master',
    label:     'Custom Fields',
    sublabel:  'Info master custom fields',
    icon:      Layers,
    color:     '#10b981',
    bg:        '#f0fdf4',
    component: InfoMaster,
    path:      'info-master',
  },
  {
    key:       'item-type-master',
    label:     'Item Type',
    sublabel:  'Raw Material / FG / types master',
    icon:      Tag,
    color:     '#64748b',
    bg:        '#f8fafc',
    component: ItemTypeMaster,
    path:      'item-type-master',
  },
];

// ── Spinner ───────────────────────────────────────────────────────────────────
const Spinner = ({ size = 18 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    border: '2px solid #e2e8f0', borderTopColor: '#6366f1',
    animation: 'imdSpin .7s linear infinite', display: 'inline-block',
  }} />
);

// ── Icon Tile ─────────────────────────────────────────────────────────────────
const Tile = ({ page, active, onClick }) => {
  const Icon = page.icon;
  const [hovered, setHovered] = useState(false);
  const isActive = active;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={page.sublabel}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 6,
        width: '100%', aspectRatio: '1 / 1', maxWidth: 96,
        padding: '10px 6px',
        background: isActive ? page.color : hovered ? page.bg : '#fff',
        border: `2px solid ${isActive ? page.color : hovered ? page.color + '66' : '#e2e8f0'}`,
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'all .15s',
        boxShadow: isActive
          ? `0 4px 14px ${page.color}44`
          : hovered ? `0 2px 8px ${page.color}22` : '0 1px 3px rgba(0,0,0,.06)',
        outline: 'none',
        flexShrink: 0,
      }}>
      {/* Icon circle */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: isActive ? 'rgba(255,255,255,.2)' : page.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        border: isActive ? '1.5px solid rgba(255,255,255,.35)' : `1.5px solid ${page.color}33`,
      }}>
        <Icon size={18} color={isActive ? '#fff' : page.color} />
      </div>
      {/* Label */}
      <span style={{
        fontSize: 9, fontWeight: 700, textAlign: 'center', lineHeight: 1.3,
        color: isActive ? '#fff' : '#374151',
        wordBreak: 'break-word',
      }}>
        {page.label}
      </span>
    </button>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const ItemMasterDesk = () => {
  const user = getSession();
  const userId = user?.id;

  const [accessChecked,  setAccessChecked]  = useState(false);
  const [allowedPaths,   setAllowedPaths]   = useState(null); // null = all allowed (no RBAC)
  const [activePage,     setActivePage]     = useState(null); // currently open page key
  const [loading,        setLoading]        = useState(true);

  // ── RBAC: fetch allowed pages for this user ──────────────────────────────
  const checkAccess = useCallback(async () => {
    if (!userId) { setLoading(false); setAccessChecked(true); return; }
    try {
      // Get user's primary company+role access
      const accRes = await fetch(`${API_BASE}/user-dept-access/user/${userId}/companies`);
      if (!accRes.ok) throw new Error('access fetch failed');
      const accData = await accRes.json();
      const primary = Array.isArray(accData)
        ? (accData.find(c => c.is_primary_company) || accData[0])
        : null;

      if (!primary?.company_id || !primary?.role_id) {
        // No access data → show all (fallback)
        setAllowedPaths(null);
        return;
      }

      // Query CompanyRolePageAccess for this user's company+role+dept+desg
      let url = `${API_BASE}/rbac/access-by-role?company_id=${primary.company_id}&role_id=${primary.role_id}&is_granted=true`;
      if (primary.department_id)  url += `&department_id=${primary.department_id}`;
      if (primary.designation_id) url += `&designation_id=${primary.designation_id}`;

      const rbacRes = await fetch(url);
      if (!rbacRes.ok) throw new Error('rbac fetch failed');
      const rbacData = await rbacRes.json();

      if (!Array.isArray(rbacData) || rbacData.length === 0) {
        // No RBAC rows → show all (safe fallback)
        setAllowedPaths(null);
        return;
      }

      // Extract allowed page paths/urls
      const paths = new Set(
        rbacData
          .map(r => r.page_url || r.page?.page_url || '')
          .filter(Boolean)
          .map(u => u.split('/').pop())   // last segment e.g. "item-master-inventory"
      );
      setAllowedPaths(paths);
    } catch {
      // On any error → show all (safe fallback)
      setAllowedPaths(null);
    } finally {
      setLoading(false);
      setAccessChecked(true);
    }
  }, [userId]);

  useEffect(() => { checkAccess(); }, [checkAccess]);

  // ── Filter pages by RBAC ─────────────────────────────────────────────────
  const visiblePages = ALL_PAGES.filter(p =>
    allowedPaths === null || allowedPaths.has(p.path) || allowedPaths.has(p.key)
  );

  const activePageDef = activePage ? ALL_PAGES.find(p => p.key === activePage) : null;
  const ActiveComponent = activePageDef?.component || null;

  // ── Styles ────────────────────────────────────────────────────────────────
  const S = {
    wrap: {
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: '#f8fafc',
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
    },
    topBar: {
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 14px', flexShrink: 0,
      background: 'linear-gradient(to right,#4f46e5,#6366f1)',
      borderBottom: '1px solid #4338ca',
      boxShadow: '0 2px 6px rgba(79,70,229,.3)',
    },
    backBtn: {
      display: 'flex', alignItems: 'center', gap: 4,
      background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)',
      color: '#fff', borderRadius: 6, padding: '3px 10px',
      cursor: 'pointer', fontSize: 10, fontWeight: 700,
    },
    title: { fontSize: 11, fontWeight: 800, color: '#fff' },
    subTitle: { fontSize: 9, color: 'rgba(255,255,255,.7)', marginLeft: 4 },
    // Desk grid
    deskWrap: {
      flex: 1, overflow: 'auto', padding: '16px',
    },
    sectionHead: {
      fontSize: 10, fontWeight: 800, color: '#64748b',
      textTransform: 'uppercase', letterSpacing: 1,
      marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
    },
    grid: {
      display: 'flex', flexWrap: 'wrap', gap: 10,
    },
    // Active page
    pageWrap: {
      flex: 1, overflow: 'auto', background: '#fff',
    },
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...S.wrap, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Spinner size={24} />
        <span style={{ fontSize: 11, color: '#94a3b8' }}>Loading Item Master Desk…</span>
        <style>{`@keyframes imdSpin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <style>{`
        @keyframes imdSpin { to { transform: rotate(360deg) } }
        @keyframes imdFade { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:none } }
      `}</style>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={S.topBar}>
        {activePage ? (
          <button
            style={S.backBtn}
            onClick={() => setActivePage(null)}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.15)'}>
            <ArrowLeft size={11} /> Desk
          </button>
        ) : (
          <div style={{
            width: 26, height: 26, borderRadius: 8,
            background: 'rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LayoutGrid size={14} color="#fff" />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={S.title}>
            {activePage ? activePageDef?.label : 'Item Master Desk'}
          </span>
          <span style={S.subTitle}>
            {activePage
              ? activePageDef?.sublabel
              : `${visiblePages.length} module${visiblePages.length !== 1 ? 's' : ''} available`}
          </span>
        </div>

        {/* Breadcrumb pills when page is active */}
        {activePage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,.5)' }}>Item Master Desk</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,.4)' }}>›</span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#fff',
              background: 'rgba(255,255,255,.15)', padding: '1px 8px', borderRadius: 20,
            }}>
              {activePageDef?.label}
            </span>
          </div>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {!activePage ? (

        /* ── DESK VIEW: icon grid ─────────────────────────────────────── */
        <div style={S.deskWrap}>

          {/* Section header */}
          <div style={S.sectionHead}>
            <span style={{ height: 1, width: 16, background: '#e2e8f0', flexShrink: 0 }} />
            Item Master Modules
            <span style={{ height: 1, flex: 1, background: '#e2e8f0' }} />
            <span style={{
              fontSize: 8, fontWeight: 700, color: '#94a3b8',
              background: '#f1f5f9', border: '1px solid #e2e8f0',
              borderRadius: 20, padding: '1px 8px',
            }}>
              {visiblePages.length} available
            </span>
          </div>

          {visiblePages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <LayoutGrid size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>No modules available</p>
              <p style={{ fontSize: 10, margin: 0 }}>Contact your administrator to grant access.</p>
            </div>
          ) : (
            <div style={S.grid}>
              {visiblePages.map((page, idx) => (
                <div key={page.key} style={{
                  animation: `imdFade .2s ease ${idx * 0.03}s both`,
                  width: 88,
                }}>
                  <Tile
                    page={page}
                    active={activePage === page.key}
                    onClick={() => setActivePage(page.key)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Quick info footer */}
          <div style={{
            marginTop: 20, padding: '10px 14px',
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Info size={13} color="#94a3b8" />
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              Click any module icon to open it. Use the <b>← Desk</b> button to return here.
              {allowedPaths !== null && (
                <span style={{ color: '#6366f1', marginLeft: 4 }}>
                  · RBAC active — showing {visiblePages.length} of {ALL_PAGES.length} modules.
                </span>
              )}
            </span>
          </div>
        </div>

      ) : (

        /* ── ACTIVE PAGE VIEW ────────────────────────────────────────── */
        <div style={S.pageWrap}>
          {/* Sub-page quick-switch bar */}
          <div style={{
            display: 'flex', gap: 4, padding: '5px 10px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc', overflowX: 'auto', flexShrink: 0,
          }}>
            {visiblePages.map(page => {
              const Icon = page.icon;
              const isActive = activePage === page.key;
              return (
                <button
                  key={page.key}
                  onClick={() => setActivePage(page.key)}
                  title={page.sublabel}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 9px', borderRadius: 6, border: 'none',
                    background: isActive ? page.color : 'transparent',
                    color: isActive ? '#fff' : '#64748b',
                    cursor: 'pointer', fontSize: 9, fontWeight: isActive ? 700 : 500,
                    whiteSpace: 'nowrap', flexShrink: 0,
                    boxShadow: isActive ? `0 2px 6px ${page.color}44` : 'none',
                    transition: 'all .12s',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = page.bg; e.currentTarget.style.color = page.color; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}>
                  <Icon size={10} />
                  {page.label}
                </button>
              );
            })}
          </div>

          {/* Render active component */}
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}
               key={activePage}>  {/* key forces remount on switch */}
            {ActiveComponent && <ActiveComponent />}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemMasterDesk;