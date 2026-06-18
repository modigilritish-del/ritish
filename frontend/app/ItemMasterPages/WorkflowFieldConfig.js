/**
 * WorkflowFieldConfig.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Popup: Mandatory Field Configuration
 *
 * WHAT IT DOES
 *  • Shows all pages from adminworkflowlinks as clickable icon-cards
 *  • Clicking a card opens a popup with the actual page preview + field config
 *  • Admin can select Company (+ optional Plant) and toggle mandatory fields
 *  • Mandatory fields show in light-red colour
 *  • Full audit log per config
 *  • Multi-company, multi-plant support
 *  • All data stored in DB via new /api/mandatory-fields/* endpoints
 *
 * USAGE inside WorkflowDashboard.js  (add BEFORE the final return):
 *
 *   import WorkflowFieldConfig from './WorkflowFieldConfig';
 *   // inside JSX, right before closing </div>:
 *   <WorkflowFieldConfig />
 *
 * ZERO changes to WorkflowAdmin, WorkflowDashboard, or any existing file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { adminworkflowlinks } from '../config/adminworkflowlinks.js';
import { X, Settings, ChevronDown, RefreshCw, Clock, Eye, EyeOff } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const CLR = {
  primary:     '#3b82f6',
  primarySoft: '#eff6ff',
  mandatory:   '#fca5a5',   // light red bg for mandatory fields
  mandatoryBorder: '#ef4444',
  mandatoryText:   '#991b1b',
  surface:     '#ffffff',
  border:      '#e5e7eb',
  muted:       '#9ca3af',
  text:        '#111827',
  textSm:      '#6b7280',
  header1:     '#374151',
  header2:     '#60a5fa',
  green:       '#16a34a',
  greenSoft:   '#dcfce7',
  red:         '#dc2626',
  redSoft:     '#fee2e2',
  yellow:      '#92400e',
  yellowSoft:  '#fef3c7',
};

// ─── Field definitions for "Item Code Creation Request" page ─────────────────
// Extend this map when you add more pages to adminworkflowlinks
const PAGE_FIELDS = {
  'item-code-creation-req': [
    { field_key: 'item_name',         label: 'Item Name' },
    { field_key: 'item_description',  label: 'Item Description' },
    { field_key: 'item_short_name',   label: 'Item Short Name' },
    { field_key: 'item_type',         label: 'Item Type' },
    { field_key: 'department',        label: 'Department' },
    { field_key: 'required_date',     label: 'Required Date' },
    { field_key: 'business_reason',   label: 'Business Reason' },
    { field_key: 'company_id',        label: 'Company' },
    { field_key: 'plant_id',          label: 'Plant' },
    { field_key: 'reference_image_url',   label: 'Reference Image URL' },
    { field_key: 'vendor_quotation_url',  label: 'Vendor Quotation URL' },
    { field_key: 'sample_photo_url',      label: 'Sample Photo URL' },
    { field_key: 'product_link',          label: 'Product Link' },
  ],

  // ── Item Master — Inventory ───────────────────────────────────────────────
  'item-master-inventory': [
    { field_key: 'parent_item',             label: 'Parent Item' },
    { field_key: 'packed_item',             label: 'Packed Item' },
    { field_key: 'superceded',              label: 'Superceded' },
    { field_key: 'dimension',              label: 'Dimension' },
    { field_key: 'maximum_stock_qty',       label: 'Maximum Stock (Qty)' },
    { field_key: 'reorder_quantity',        label: 'Reorder Quantity' },
    { field_key: 'harmonised_code',         label: 'Harmonised Code' },
    { field_key: 'lead_time',              label: 'Lead Time (in Days)' },
    { field_key: 'minimum_stock_qty',       label: 'Minimum Stock (Qty)' },
    { field_key: 'reorder_level',           label: 'Reorder Level' },
    { field_key: 'safety_stock_factor',     label: 'Safety Stock Factor' },
    { field_key: 'universal_product_code',  label: 'Universal Product Code' },
  ],

  // ── Item Master — Sales Detail ────────────────────────────────────────────
  'item-master-sales-details': [
    { field_key: 'item_class',          label: 'Item Class' },
    { field_key: 'ved_class',           label: 'VED Class' },
    { field_key: 'price_control_code',  label: 'Price Control Code' },
  ],

  // ── Item Master — Finance Details ─────────────────────────────────────────
  'item-master-finance-details': [
    { field_key: 'tax_group',           label: 'Tax Group' },
    { field_key: 'standard_price',      label: 'Standard Price' },
    { field_key: 'method_of_costing',   label: 'Method of Costing' },
    { field_key: 'costing_method_no',   label: 'Costing Method No.' },
    { field_key: 'batch_costing',       label: 'Batch Costing' },
    { field_key: 'serial_no_costing',   label: 'Serial No. Costing' },
  ],

  // ── Item Master — Warehouse Details ──────────────────────────────────────
  'item-master-warehouse-details': [
    { field_key: 'storage_temperature',  label: 'Storage Temperature' },
    { field_key: 'temperature_tolerance', label: 'Temperature Tolerance' },
    { field_key: 'potency_item',         label: 'Potency Item' },
    { field_key: 'dependency_item',      label: 'Dependency Item' },
    { field_key: 'forced_putaway',       label: 'Forced Putaway' },
    { field_key: 'multi_batch_pallet',   label: 'Multi-Batch Pallet' },
    { field_key: 'item_consider',        label: 'Item Consider' },
  ],

  // ── Item Master — Purchase Details ───────────────────────────────────────
  'item-master-purchase-details': [
    { field_key: 'vendor_analysis',                  label: 'Vendor Analysis' },
    { field_key: 'analysis_property_class',          label: 'Analysis Property Class' },
    { field_key: 'positive_tolerance_percent',       label: 'Positive Tolerance %' },
    { field_key: 'negative_tolerance_percent',       label: 'Negative Tolerance %' },
    { field_key: 'physical_stock_variance_percent',  label: 'Physical Stock Variance %' },
    { field_key: 'receipt_variance_percent',         label: 'Receipt Variance %' },
  ],
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const getSession = () => {
  try { return JSON.parse(sessionStorage.getItem('userData') || '{}')?.user || null; }
  catch { return null; }
};

const apiFetch = async (url, opts = {}) => {
  const r = await fetch(url, opts);
  const j = await r.json();
  if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
  return j;
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      background: type === 'success' ? CLR.green : CLR.red,
      color: '#fff', padding: '8px 20px', borderRadius: 8, zIndex: 100000,
      fontSize: 12, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,.25)',
    }}>
      {msg}
    </div>
  );
}

// ─── Page Icon Card ────────────────────────────────────────────────────────────
function PageIconCard({ page, configCount, onClick }) {
  const Icon = page.icon;
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => onClick(page)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        cursor: 'pointer',
        background: hov ? CLR.primarySoft : CLR.surface,
        border: `2px solid ${hov ? CLR.primary : CLR.border}`,
        borderRadius: 12,
        padding: '16px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        minWidth: 130,
        maxWidth: 155,
        transition: 'all .18s',
        boxShadow: hov ? '0 4px 12px rgba(59,130,246,.15)' : '0 1px 4px rgba(0,0,0,.06)',
        position: 'relative',
      }}
    >
      {/* Icon circle */}
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: hov ? CLR.primary : '#f3f4f6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .18s',
      }}>
        {Icon ? <Icon size={22} color={hov ? '#fff' : CLR.primary} /> : <span style={{ fontSize: 22 }}>📄</span>}
      </div>

      {/* Name */}
      <span style={{
        fontSize: 11, fontWeight: 700, color: hov ? CLR.primary : CLR.text,
        textAlign: 'center', lineHeight: 1.3,
      }}>
        {page.name}
      </span>

      {/* Config count badge */}
      {configCount > 0 && (
        <span style={{
          position: 'absolute', top: 8, right: 8,
          background: CLR.green, color: '#fff',
          fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
        }}>
          {configCount}
        </span>
      )}

      {/* Description tooltip */}
      {page.description && (
        <span style={{
          fontSize: 9, color: CLR.muted, textAlign: 'center',
          lineHeight: 1.4, maxWidth: 120,
        }}>
          {page.description}
        </span>
      )}

      {/* Settings gear on hover */}
      {hov && (
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          opacity: .6,
        }}>
          <Settings size={12} color={CLR.primary} />
        </div>
      )}
    </div>
  );
}

// ─── Mandatory Field Toggle Row ────────────────────────────────────────────────
function FieldRow({ field, isMandatory, onToggle }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        background: isMandatory ? CLR.mandatory + '44' : '#f9fafb',
        border: `1px solid ${isMandatory ? CLR.mandatoryBorder + '55' : CLR.border}`,
        borderRadius: 6,
        marginBottom: 6,
        transition: 'all .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Coloured dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isMandatory ? CLR.mandatoryBorder : CLR.muted,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 11, fontWeight: isMandatory ? 700 : 400,
          color: isMandatory ? CLR.mandatoryText : CLR.text,
        }}>
          {field.label}
        </span>
        {isMandatory && (
          <span style={{
            fontSize: 9, fontWeight: 700,
            background: CLR.mandatory, color: CLR.mandatoryText,
            padding: '1px 6px', borderRadius: 99, border: `1px solid ${CLR.mandatoryBorder}44`,
          }}>
            MANDATORY
          </span>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={() => onToggle(field.field_key)}
        style={{
          background: isMandatory ? CLR.mandatoryBorder : '#e5e7eb',
          border: 'none', borderRadius: 12,
          width: 36, height: 20, cursor: 'pointer',
          position: 'relative', flexShrink: 0,
          transition: 'background .15s',
        }}
      >
        <div style={{
          position: 'absolute', top: 2,
          left: isMandatory ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
          transition: 'left .15s',
        }} />
      </button>
    </div>
  );
}

// ─── Audit Log Panel ──────────────────────────────────────────────────────────
function AuditLogPanel({ logs, loading }) {
  if (loading) return <div style={{ padding: 20, textAlign: 'center', color: CLR.muted, fontSize: 11 }}>Loading logs…</div>;
  if (!logs.length) return <div style={{ padding: 20, textAlign: 'center', color: CLR.muted, fontSize: 11 }}>No logs yet.</div>;

  return (
    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
      {logs.map(log => (
        <div key={log.id} style={{
          borderBottom: `1px solid ${CLR.border}`,
          padding: '10px 12px',
          fontSize: 11,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
              background: log.change_type === 'CREATE' ? CLR.greenSoft : CLR.yellowSoft,
              color: log.change_type === 'CREATE' ? CLR.green : CLR.yellow,
            }}>
              {log.change_type}
            </span>
            <span style={{ color: CLR.text, fontWeight: 600 }}>
              {log.performer?.full_name || log.performer?.username || `User #${log.performed_by}` || 'System'}
            </span>
            <span style={{ color: CLR.muted, fontSize: 10, marginLeft: 'auto' }}>
              {log.performed_at ? new Date(log.performed_at).toLocaleString('en-IN') : '—'}
            </span>
          </div>

          {/* Changed fields */}
          {log.changed_fields && Object.keys(log.changed_fields).length > 0 && (
            <div style={{ marginTop: 4 }}>
              {Object.entries(log.changed_fields).map(([k, v]) => (
                <div key={k} style={{ fontSize: 10, color: CLR.textSm, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, color: CLR.text }}>{k}</span>
                  {': '}
                  <span style={{ color: v.old ? CLR.mandatoryBorder : CLR.muted, textDecoration: 'line-through' }}>
                    {v.old ? 'Mandatory' : 'Optional'}
                  </span>
                  {' → '}
                  <span style={{ color: v.new ? CLR.mandatoryBorder : CLR.green, fontWeight: 600 }}>
                    {v.new ? 'Mandatory' : 'Optional'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {log.note && (
            <div style={{ fontSize: 10, color: CLR.textSm, fontStyle: 'italic', marginTop: 3 }}>
              Note: {log.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function WorkflowFieldConfig() {
  const user = getSession();
  const userId = user?.id || null;

  // ── outer trigger bar state ────────────────────────────────────────────────
  const [panelOpen,   setPanelOpen]   = useState(false);
  const [toast,       setToast]       = useState(null);
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // ── data ───────────────────────────────────────────────────────────────────
  const [companies,   setCompanies]   = useState([]);
  const [allConfigs,  setAllConfigs]  = useState([]);

  // ── popup state ────────────────────────────────────────────────────────────
  const [selPage,     setSelPage]     = useState(null);   // page object from adminworkflowlinks
  const [selCompany,  setSelCompany]  = useState('');
  const [selPlant,    setSelPlant]    = useState('');
  const [plants,      setPlants]      = useState([]);
  const [fieldState,  setFieldState]  = useState({});     // { field_key: bool }
  const [activeConfig, setActiveConfig] = useState(null); // loaded config from DB
  const [saving,      setSaving]      = useState(false);
  const [note,        setNote]        = useState('');

  // ── log tab ────────────────────────────────────────────────────────────────
  const [tab,         setTab]         = useState('fields');  // 'fields' | 'log'
  const [logs,        setLogs]        = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // ── load companies + all configs ──────────────────────────────────────────
  const loadBase = useCallback(async () => {
    try {
      // /item-creation-req/user/{id}/companies-plants returns CompanyWithPlantsOption[]
      // with nested plants[] — exactly what the Company + Plant selectors need.
      // If userId is not yet available, companies will load empty and user can refresh.
      let comps = [];
      if (userId) {
        try {
          comps = await apiFetch(`${API_BASE}/item-creation-req/user/${userId}/companies-plants`);
        } catch {
          comps = [];
        }
      }
      const cfgs = await apiFetch(`${API_BASE}/mandatory-fields/`);
      setCompanies(Array.isArray(comps) ? comps : []);
      setAllConfigs(Array.isArray(cfgs) ? cfgs : []);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }, [userId]);

  useEffect(() => { if (panelOpen) loadBase(); }, [panelOpen, loadBase]);

  // ── when company changes → load plants ──────────────────────────────────
  useEffect(() => {
    if (!selCompany) { setPlants([]); setSelPlant(''); return; }
    const comp = companies.find(c => String(c.id) === String(selCompany));
    setPlants(comp?.plants || []);
    setSelPlant('');
  }, [selCompany, companies]);

  // ── when page/company/plant changes → load matching config from DB ────────
  useEffect(() => {
    if (!selPage || !selCompany) {
      setFieldState({});
      setActiveConfig(null);
      return;
    }

    const pageFields = PAGE_FIELDS[selPage.path] || [];
    const cfg = allConfigs.find(c =>
      c.page_key === selPage.path &&
      String(c.company_id) === String(selCompany) &&
      (selPlant ? String(c.plant_id) === String(selPlant) : !c.plant_id)
    );

    if (cfg) {
      // Build field state from DB
      const state = {};
      pageFields.forEach(f => { state[f.field_key] = false; });
      (cfg.fields_config || []).forEach(fc => { state[fc.field_key] = !!fc.is_mandatory; });
      setFieldState(state);
      setActiveConfig(cfg);
    } else {
      // New config — all optional by default
      const state = {};
      pageFields.forEach(f => { state[f.field_key] = false; });
      setFieldState(state);
      setActiveConfig(null);
    }
  }, [selPage, selCompany, selPlant, allConfigs]);

  // ── load logs for active config ────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'log' || !activeConfig) { setLogs([]); return; }
    setLogsLoading(true);
    apiFetch(`${API_BASE}/mandatory-fields/${activeConfig.id}/logs`)
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLogsLoading(false));
  }, [tab, activeConfig]);

  // ── toggle a field ─────────────────────────────────────────────────────────
  const toggleField = (key) => {
    setFieldState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── save config ────────────────────────────────────────────────────────────
  const saveConfig = async () => {
    if (!selPage || !selCompany) {
      showToast('Please select a page, company, and configure fields.', 'error');
      return;
    }
    setSaving(true);
    try {
      const pageFields = PAGE_FIELDS[selPage.path] || [];
      const fields_config = pageFields.map(f => ({
        field_key:    f.field_key,
        label:        f.label,
        is_mandatory: !!fieldState[f.field_key],
      }));

      const compObj = companies.find(c => String(c.id) === String(selCompany));
      const compName = compObj?.company_name || compObj?.name || '';

      if (activeConfig) {
        // UPDATE existing
        await apiFetch(`${API_BASE}/mandatory-fields/${activeConfig.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields_config,
            updated_by: userId,
            note: note || null,
          }),
        });
        showToast('✅ Config updated successfully');
      } else {
        // CREATE new
        await apiFetch(`${API_BASE}/mandatory-fields/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page_key:   selPage.path,
            page_label: selPage.name,
            company_id: Number(selCompany),
            plant_id:   selPlant ? Number(selPlant) : null,
            fields_config,
            created_by: userId,
            note: note || null,
          }),
        });
        showToast('✅ Config created successfully');
      }

      setNote('');
      await loadBase();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── open page popup ────────────────────────────────────────────────────────
  const openPage = (page) => {
    setSelPage(page);
    setSelCompany('');
    setSelPlant('');
    setFieldState({});
    setActiveConfig(null);
    setNote('');
    setTab('fields');
  };

  const closePage = () => {
    setSelPage(null);
  };

  // ── config count per page ──────────────────────────────────────────────────
  const configCountForPage = (pagePath) =>
    allConfigs.filter(c => c.page_key === pagePath).length;

  // ── mandatory count in current state ──────────────────────────────────────
  const mandatoryCount = Object.values(fieldState).filter(Boolean).length;
  const totalFields    = Object.keys(fieldState).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* ── Trigger bar (sits at top of WorkflowDashboard, just add below header) ── */}
      <div style={{
        background: '#fff',
        borderBottom: `2px solid ${CLR.border}`,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 38,
      }}>
        <button
          onClick={() => setPanelOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: panelOpen ? CLR.primary : CLR.primarySoft,
            color: panelOpen ? '#fff' : CLR.primary,
            border: `1px solid ${CLR.primary}44`,
            borderRadius: 6, padding: '4px 12px',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <Settings size={13} />
          Mandatory Field Config
        </button>
        <span style={{ fontSize: 10, color: CLR.muted }}>
          Configure which fields are mandatory per company / plant for each workflow page
        </span>
      </div>

      {/* ── Panel: Page Icon Grid ─────────────────────────────────────────── */}
      {panelOpen && (
        <div style={{
          background: '#f8fafc',
          borderBottom: `2px solid ${CLR.border}`,
          padding: '14px 16px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CLR.header1, marginBottom: 10 }}>
            🗂 Select a Page to Configure Mandatory Fields
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {(adminworkflowlinks || []).map(page => (
              <PageIconCard
                key={page.path}
                page={page}
                configCount={configCountForPage(page.path)}
                onClick={openPage}
              />
            ))}
            {(!adminworkflowlinks || adminworkflowlinks.length === 0) && (
              <div style={{ fontSize: 11, color: CLR.muted, padding: 20 }}>
                No pages configured in adminworkflowlinks.js
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           PAGE CONFIG POPUP
         ═══════════════════════════════════════════════════════════════════ */}
      {selPage && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            width: '92vw', maxWidth: 720,
            maxHeight: '70vh',
            background: CLR.surface,
            borderRadius: 14,
            boxShadow: '0 20px 60px rgba(0,0,0,.3)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div style={{
              background: `linear-gradient(to right, ${CLR.header1}, ${CLR.header2})`,
              color: '#fff', padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {selPage.icon && <selPage.icon size={18} color="#fff" />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {selPage.name}
                </div>
                <div style={{ fontSize: 10, opacity: .8 }}>
                  Mandatory Field Configuration
                </div>
              </div>
              <button onClick={closePage}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ height: 3, background: `linear-gradient(to right, ${CLR.header2}, ${CLR.header1})` }} />

            {/* ── Scope selector (Company + Plant) ────────────────────────── */}
            <div style={{
              padding: '12px 16px',
              background: '#f8fafc',
              borderBottom: `1px solid ${CLR.border}`,
              display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
            }}>
              {/* Company */}
              <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: CLR.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Company <span style={{ color: CLR.mandatoryBorder }}>*</span>
                </label>
                <select
                  value={selCompany}
                  onChange={e => setSelCompany(e.target.value)}
                  style={{
                    width: '100%', padding: '5px 8px', fontSize: 11,
                    border: `1px solid ${CLR.border}`, borderRadius: 6,
                    background: '#fff', color: CLR.text, outline: 'none',
                  }}
                >
                  <option value="">— Select Company —</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.company_name || c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Plant (optional) */}
              <div style={{ flex: '1 1 180px', minWidth: 160 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: CLR.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Plant <span style={{ fontSize: 9, color: CLR.muted, fontWeight: 400, textTransform: 'none' }}>(optional — blank = all plants)</span>
                </label>
                <select
                  value={selPlant}
                  onChange={e => setSelPlant(e.target.value)}
                  disabled={!selCompany || plants.length === 0}
                  style={{
                    width: '100%', padding: '5px 8px', fontSize: 11,
                    border: `1px solid ${CLR.border}`, borderRadius: 6,
                    background: (!selCompany || plants.length === 0) ? '#f3f4f6' : '#fff',
                    color: CLR.text, outline: 'none',
                  }}
                >
                  <option value="">— All Plants (Company-level) —</option>
                  {plants.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.plant_name || p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status badge */}
              {selCompany && (
                <div style={{
                  padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                  background: activeConfig ? CLR.greenSoft : CLR.yellowSoft,
                  color: activeConfig ? CLR.green : CLR.yellow,
                  border: `1px solid ${activeConfig ? CLR.green : '#fde68a'}44`,
                  alignSelf: 'flex-end',
                }}>
                  {activeConfig ? `✅ Config exists (ID: ${activeConfig.id})` : '🆕 New config'}
                </div>
              )}
            </div>

            {/* ── Tabs ─────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', borderBottom: `2px solid ${CLR.border}`, background: '#fff' }}>
              {[['fields', '⚙️ Fields'], ['log', '📋 Audit Log']].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  style={{
                    padding: '7px 16px', fontSize: 11, fontWeight: 600,
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: tab === key ? CLR.primary : CLR.muted,
                    borderBottom: tab === key ? `2px solid ${CLR.primary}` : '2px solid transparent',
                    marginBottom: -2,
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── Tab content ──────────────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

              {tab === 'fields' && (
                <>
                  {!selCompany ? (
                    <div style={{ textAlign: 'center', padding: 30, color: CLR.muted, fontSize: 11 }}>
                      👆 Select a company above to configure mandatory fields.
                    </div>
                  ) : (
                    <>
                      {/* Summary bar */}
                      <div style={{
                        marginBottom: 12, padding: '7px 12px',
                        background: mandatoryCount > 0 ? CLR.mandatory + '33' : '#f9fafb',
                        border: `1px solid ${mandatoryCount > 0 ? CLR.mandatoryBorder + '44' : CLR.border}`,
                        borderRadius: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <span style={{ fontWeight: 700, color: mandatoryCount > 0 ? CLR.mandatoryText : CLR.textSm }}>
                          {mandatoryCount} of {totalFields} fields marked mandatory
                        </span>
                        {mandatoryCount > 0 && (
                          <span style={{ fontSize: 9, color: CLR.mandatoryText }}>
                            — highlighted in light red
                          </span>
                        )}
                      </div>

                      {/* Fields */}
                      {(PAGE_FIELDS[selPage.path] || []).map(field => (
                        <FieldRow
                          key={field.field_key}
                          field={field}
                          isMandatory={!!fieldState[field.field_key]}
                          onToggle={toggleField}
                        />
                      ))}

                      {(PAGE_FIELDS[selPage.path] || []).length === 0 && (
                        <div style={{ textAlign: 'center', padding: 20, color: CLR.muted, fontSize: 11 }}>
                          No field definitions found for this page in PAGE_FIELDS.
                          Add them to WorkflowFieldConfig.js → PAGE_FIELDS.
                        </div>
                      )}

                      {/* Note */}
                      <div style={{ marginTop: 14 }}>
                        <label style={{ fontSize: 9, fontWeight: 700, color: CLR.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                          Change Note (optional)
                        </label>
                        <input
                          value={note}
                          onChange={e => setNote(e.target.value)}
                          placeholder="Reason for this change…"
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '6px 10px', fontSize: 11,
                            border: `1px solid ${CLR.border}`, borderRadius: 6,
                            outline: 'none', color: CLR.text,
                          }}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {tab === 'log' && (
                <>
                  {!activeConfig ? (
                    <div style={{ textAlign: 'center', padding: 30, color: CLR.muted, fontSize: 11 }}>
                      No config saved yet — logs will appear after first save.
                    </div>
                  ) : (
                    <AuditLogPanel logs={logs} loading={logsLoading} />
                  )}
                </>
              )}
            </div>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <div style={{
              padding: '10px 16px',
              borderTop: `1px solid ${CLR.border}`,
              background: '#f9fafb',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 10, color: CLR.muted }}>
                {activeConfig
                  ? `Last updated: ${activeConfig.updated_at ? new Date(activeConfig.updated_at).toLocaleString('en-IN') : '—'}`
                  : 'No config saved yet for this scope.'
                }
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={closePage}
                  style={{
                    background: '#f3f4f6', border: `1px solid ${CLR.border}`,
                    color: CLR.text, borderRadius: 6, padding: '5px 14px',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>
                  Close
                </button>
                {tab === 'fields' && selCompany && (PAGE_FIELDS[selPage.path] || []).length > 0 && (
                  <button
                    onClick={saveConfig}
                    disabled={saving}
                    style={{
                      background: saving ? CLR.muted : CLR.primary,
                      border: 'none', color: '#fff',
                      borderRadius: 6, padding: '5px 18px',
                      fontSize: 11, fontWeight: 700,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {saving ? '⏳ Saving…' : (activeConfig ? '💾 Update Config' : '💾 Save Config')}
                  </button>
                )}
              </div>
            </div>

            {/* Bottom accent */}
            <div style={{ height: 3, background: `linear-gradient(to right, ${CLR.header1}, ${CLR.header2})` }} />
          </div>
        </div>
      )}
    </>
  );
}