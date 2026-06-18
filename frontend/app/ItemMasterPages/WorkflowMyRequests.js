/**
 * WorkflowMyRequests.js  –  ItemMasterPages/
 * UI redesigned to exactly match MdmMyReq.jsx:
 *  • Bell notification + NotifPanel
 *  • SSE real-time auto-refresh
 *  • Left sidebar (status categories + per-company counts)
 *  • Stat pills (clickable status quick-filter)
 *  • Sort dropdown (newest/oldest/name/company/status)
 *  • Advanced filters panel (status/company/entity/active-inactive/date range)
 *  • Table with "Active" column (same as MdmMyReq)
 *  • Same dark theme, same Header/Footer components
 *
 * ALL EXISTING LOGIC 100% UNCHANGED:
 *  loadRequests, loadTimeline, handleAction, cancelRequest,
 *  confirmCancel, handleExport, ENTITY_API, TimelinePopup,
 *  ActionModal, Toast, StatusBadge — every function preserved as-is.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, Eye, AlertCircle, GitBranch,
  ThumbsUp, ThumbsDown, RotateCcw, X,
  MessageSquare, CheckCircle, XCircle,
  User, Building2, Layers, Calendar, Clock, Filter,
  ChevronRight, Activity, TrendingUp, FileText, Download,
  Bell, BellOff, Search, SlidersHorizontal
} from 'lucide-react';
import { WorkflowNotificationsPage } from './WorkflowStatusBadge';

const API_BASE = 'http://localhost:8000/api';

const getSession = () => {
  try { const d = JSON.parse(sessionStorage.getItem('userData') || '{}'); return d?.user || null; }
  catch { return null; }
};

const STATUS_META = {
  DRAFT:     { label: 'Draft',     bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', dot: '#94a3b8',  icon: '📝', glow: 'rgba(148,163,184,0.2)' },
  PENDING:   { label: 'Pending',   bg: '#fffbeb', color: '#92400e', border: '#fde68a', dot: '#f59e0b',  icon: '⏳', glow: 'rgba(245,158,11,0.15)' },
  IN_REVIEW: { label: 'In Review', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', dot: '#3b82f6',  icon: '🔍', glow: 'rgba(59,130,246,0.15)' },
  APPROVED:  { label: 'Approved',  bg: '#f0fdf4', color: '#14532d', border: '#bbf7d0', dot: '#22c55e',  icon: '✅', glow: 'rgba(34,197,94,0.15)'  },
  REJECTED:  { label: 'Rejected',  bg: '#fff1f2', color: '#881337', border: '#fecdd3', dot: '#ef4444',  icon: '❌', glow: 'rgba(239,68,68,0.15)'  },
  RETURNED:  { label: 'Returned',  bg: '#fff7ed', color: '#7c2d12', border: '#fed7aa', dot: '#f97316',  icon: '↩️', glow: 'rgba(249,115,22,0.15)'  },
  CANCELLED: { label: 'Cancelled', bg: '#f8fafc', color: '#475569', border: '#e2e8f0', dot: '#94a3b8',  icon: '🚫', glow: 'rgba(148,163,184,0.1)'  },
};
const ALL_STATUSES = Object.keys(STATUS_META);

// ─── Spinner ────────────────────────────────────────────────────────
const Spinner = ({ size = 14 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    border: '2px solid #2e3349', borderTopColor: '#60a5fa',
    animation: 'wfmrSpin .7s linear infinite', display: 'inline-block', flexShrink: 0,
  }} />
);

// ─── Toast ──────────────────────────────────────────────────────────
const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      padding: '11px 22px', borderRadius: 10, fontWeight: 700, fontSize: 12,
      background: toast.type === 'success' ? '#0d2e22' : '#2e1515',
      color:      toast.type === 'success' ? '#34d399'  : '#f87171',
      border:    `1px solid ${toast.type === 'success' ? '#34d39944' : '#f8717144'}`,
      boxShadow: '0 8px 32px rgba(0,0,0,.5)',
    }}>
      {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
    </div>
  );
};

// ─── Status Badge ────────────────────────────────────────────────────
const StatusBadge = ({ status, sm }) => {
  const m = STATUS_META[status] || STATUS_META.DRAFT;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      padding: sm ? '1px 7px' : '3px 10px', borderRadius: 20,
      fontSize: sm ? 9 : 10, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
};

// ─── Sidebar Item (same as MdmMyReq) ────────────────────────────────
const SidebarItem = ({ label, count, active, onClick, color, icon }) => (
  <button onClick={onClick}
    style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
      border: 'none', borderBottom: '1px solid #2e334922', background: active ? `${color}22` : 'transparent',
      cursor: 'pointer', textAlign: 'left', color: active ? color : '#94a3b8',
      borderLeft: `2px solid ${active ? color : 'transparent'}`, transition: 'all .12s',
    }}>
    <span style={{ fontSize: 11, flexShrink: 0 }}>{icon}</span>
    <span style={{ flex: 1, fontSize: 10, fontWeight: active ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {label}
    </span>
    <span style={{
      fontSize: 9, fontWeight: 700, color: active ? color : '#6b7280',
      background: active ? `${color}22` : '#21253a',
      border: `1px solid ${active ? color + '44' : '#2e3349'}`,
      borderRadius: 10, padding: '0 5px', flexShrink: 0,
    }}>{count}</span>
  </button>
);

// ─── Header (same as MdmMyReq) ───────────────────────────────────────
const Header = ({ onRefresh, loading, unreadCount, onBellClick }) => (
  <div>
    <div style={{
      background: 'linear-gradient(to right, #374151, #60a5fa)',
      padding: '0 10px', height: 24, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexShrink: 0,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>📋 My Requests — Track &amp; manage your workflow submissions</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* Bell notification button */}
        <button onClick={onBellClick}
          style={{
            background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)',
            color: '#fff', borderRadius: 5, padding: '2px 8px', cursor: 'pointer',
            fontSize: 10, fontWeight: 600, display: 'none', alignItems: 'center', gap: 4,
            position: 'relative',
          }}>
          <Bell size={9} />
          {unreadCount > 0 && (
            <span style={{
              background: '#ef4444', color: '#fff', borderRadius: 10,
              padding: '0 4px', fontSize: 8, fontWeight: 700,
            }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
        {/* Refresh */}
        <button onClick={onRefresh}
          style={{
            background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)',
            color: '#fff', borderRadius: 5, padding: '2px 10px', cursor: 'pointer',
            fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
          }}>
          <RefreshCw size={9} style={{ animation: loading ? 'wfmrSpin 1s linear infinite' : 'none' }} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
    </div>
    <div style={{ height: 3, background: 'linear-gradient(to right, #60a5fa, #374151)' }} />
  </div>
);

// ─── Footer (same as MdmMyReq) ───────────────────────────────────────
const Footer = () => (
  <div style={{ height: 8, background: 'linear-gradient(to right, #60a5fa, #374151)', flexShrink: 0 }} />
);

// ─── Action Modal ────────────────────────────────────────────────────
const ActionModal = ({ action, onConfirm, onClose, loading }) => {
  const [comments, setComments] = useState('');
  if (!action) return null;

  const cfg = {
    APPROVE: { label: 'Approve Request',     accent: '#22c55e', btnBg: '#16a34a', icon: <ThumbsUp size={15} />,  ph: 'Approval note (optional)…' },
    REJECT:  { label: 'Reject Request',      accent: '#ef4444', btnBg: '#dc2626', icon: <ThumbsDown size={15} />, ph: 'Reason for rejection…' },
    RETURN:  { label: 'Return to Submitter', accent: '#f97316', btnBg: '#ea580c', icon: <RotateCcw size={15} />,  ph: 'What needs to be corrected…' },
  }[action] || {};

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: 440, background: '#fff', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(15,23,42,.2)', animation: 'wfmrPop .2s ease',
      }}>
        <div style={{ height: 3, background: cfg.accent }} />
        <div style={{
          padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: cfg.btnBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: `0 4px 10px ${cfg.accent}44`,
          }}>{cfg.icon}</div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{cfg.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>Action will be permanently logged</p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 6 }}>
            Comments {action === 'REJECT' ? <span style={{ color: '#ef4444' }}>*required</span> : <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none' }}>(optional)</span>}
          </label>
          <textarea rows={3} value={comments} onChange={e => setComments(e.target.value)}
            placeholder={cfg.ph}
            style={{
              width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0',
              borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#0f172a',
              outline: 'none', resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = cfg.accent}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
        </div>
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{
              padding: '6px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b', fontSize: 11, cursor: 'pointer', fontWeight: 600,
            }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(action, comments)}
            disabled={loading || (action === 'REJECT' && !comments.trim())}
            style={{
              padding: '6px 18px', borderRadius: 8, border: 'none',
              background: (loading || (action === 'REJECT' && !comments.trim())) ? '#94a3b8' : cfg.btnBg,
              color: '#fff', fontSize: 11,
              cursor: (loading || (action === 'REJECT' && !comments.trim())) ? 'not-allowed' : 'pointer',
              fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {loading ? <><Spinner size={12} /> Processing…</> : cfg.label}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Entity API map — add more entity types here as needed ──────────
const ENTITY_API = {
  ITEM_CREATION: {
    endpoint: (id) => `http://localhost:8000/api/item-creation-req/${id}`,
    updateEndpoint: (id) => `http://localhost:8000/api/item-creation-req/${id}`,
    getFields: (data) => [
      // ── Editable fields (sirf yeh 5 edit ho sakte hain WorkflowMyRequests popup se) ──
      { key: 'item_name',        label: 'Item Name',          type: 'text',     required: true,  editable: true,  value: data.item_name || '' },
      { key: 'item_short_name',  label: 'Item Short Name',    type: 'text',     required: true,  editable: true,  value: data.item_short_name || '' },
      { key: 'item_type',        label: 'Item Type',          type: 'select',   required: true,  editable: true,  value: data.item_type || '',
        optionsApi: 'http://localhost:8000/api/item-type-master/lov', optionsKey: 'name' },
      { key: 'required_date',    label: 'Required Date',      type: 'date',     required: true,  editable: true,  value: data.required_date || '' },
      { key: 'item_description', label: 'Item Description',   type: 'textarea', required: true,  editable: true,  value: data.item_description || '' },
      // ── View-only fields (dikhenge lekin edit nahi honge) ──
      { key: 'department',       label: 'Department',         type: 'text',     required: true,  editable: false, value: data.department || '' },
      { key: 'business_reason',  label: 'Business Reason',    type: 'textarea', required: true,  editable: false, value: data.business_reason || '' },
      { key: 'ref_image_url',    label: 'Reference Image URL',    type: 'text', required: false, editable: false, value: data.optional_documents?.reference_image_url || '' },
      { key: 'sample_photo_url', label: 'Sample Photo URL',       type: 'text', required: false, editable: false, value: data.optional_documents?.sample_photo_url || '' },
      { key: 'vendor_quot_url',  label: 'Vendor Quotation URL',   type: 'text', required: false, editable: false, value: data.optional_documents?.vendor_quotation_url || '' },
      { key: 'product_link',     label: 'Product Link',           type: 'text', required: false, editable: false, value: data.optional_documents?.product_link || '' },
    ],
    buildUpdateBody: (fields) => ({
      item_name:        fields.item_name,
      item_short_name:  fields.item_short_name,
      item_type:        fields.item_type,
      required_date:    fields.required_date,
      item_description: fields.item_description,
      optional_documents: {
        reference_image_url:  fields.ref_image_url || null,
        sample_photo_url:     fields.sample_photo_url || null,
        vendor_quotation_url: fields.vendor_quot_url || null,
        product_link:         fields.product_link || null,
      },
    }),
  },
};

// ─── Timeline Popup ──────────────────────────────────────────────────
const TimelinePopup = ({ selected, entityDetails, timeline, timelineLoading, onClose, onAction, userId, loadRequests }) => {
  const [entityData,    setEntityData]    = useState(null);
  const [entityLoading, setEntityLoading] = useState(false);
  const [activeTab,     setActiveTab]     = useState('details');
  const [editing,        setEditing]        = useState(false);
  const [editFields,     setEditFields]     = useState({});
  const [savingEdit,     setSavingEdit]     = useState(false);
  const [selectOptions,  setSelectOptions]  = useState({});
  const [dropdownState, setDropdownState] = useState({});
  const dropdownRef = useRef({});
  const [rollbackOpen,       setRollbackOpen]       = useState(false);
  const [rollbackFields,     setRollbackFields]     = useState([]);
  const [rollbackDesc,       setRollbackDesc]       = useState('');
  const [rollbackSubmitting, setRollbackSubmitting] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      setDropdownState(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (next[k]?.open && dropdownRef.current[k] && !dropdownRef.current[k].contains(e.target)) {
            next[k] = { ...next[k], open: false };
          }
        });
        return next;
      });
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setEditing(false); setEditFields({});
    setEntityData(null); setActiveTab('details');
    const cfg = ENTITY_API[selected.entity_type];
    if (!cfg || !selected.entity_id) return;
    setEntityLoading(true);
    fetch(cfg.endpoint(selected.entity_id))
      .then(r => r.ok ? r.json() : null)
      .then(async d => {
        if (!d) { setEntityData(null); setEntityLoading(false); return; }
        const fields = cfg.getFields(d);
        setEntityData({ raw: d, fields });
        const init = {};
        fields.forEach(f => { init[f.key] = f.value; });
        setEditFields(init);
        // Load select options
        const optFields = fields.filter(f => f.type === 'select' && f.optionsApi);
        if (optFields.length > 0) {
          const optMap = {};
          await Promise.all(optFields.map(async f => {
            try {
              const r = await fetch(f.optionsApi);
              if (r.ok) {
                const data = await r.json();
                const list = Array.isArray(data) ? data : data.results || [];
                optMap[f.key] = list.map(item => typeof item === 'string' ? item : item[f.optionsKey] || item.name || String(item));
              }
            } catch {}
          }));
          setSelectOptions(optMap);
        }
        setEntityLoading(false);
      })
      .catch(() => { setEntityData(null); setEntityLoading(false); });
  }, [selected]);

  const openRollback = () => {
    if (!entityData?.fields) return;
    // Sab fields — required + optional dono include karo
    setRollbackFields(entityData.fields.map(f => ({
      key:      f.key,
      label:    f.label,
      required: f.required,
      selected: false,
    })));
    setRollbackDesc('');
    setRollbackOpen(true);
  };

  const submitRollback = async () => {
    if (!selected) return;
    setRollbackSubmitting(true);
    const selectedFieldLabels = rollbackFields.filter(f => f.selected).map(f => f.label);
    const commentParts = [];
    if (selectedFieldLabels.length > 0) commentParts.push(`Fields to correct: ${selectedFieldLabels.join(', ')}`);
    if (rollbackDesc.trim()) commentParts.push(rollbackDesc.trim());
    const comments = commentParts.join('\n') || 'Please review and correct the submission.';
    try {
      const res = await fetch(`${API_BASE}/workflow/action/${selected.instance_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: 'RETURN', performed_by: userId, comments }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Rollback failed'); }
      setRollbackOpen(false);
      onClose(); // popup auto-close after rollback (onClose = parent ka setSelected(null)+setTimeline(null))
      // immediate refresh + 38s delay for notification service to settle
      if (typeof loadRequests === 'function') {
        loadRequests();
        setTimeout(() => { loadRequests(); }, 38000);
      }
    } catch (e) {
      alert(e.message);
    } finally { setRollbackSubmitting(false); }
  };

  const handleSaveEdit = async () => {
    if (!selected || !entityData) return;
    const cfg = ENTITY_API[selected.entity_type];
    if (!cfg) return;

    // ── Mandatory change check ─────────────────────────────────────────────
    // Agar request RETURNED hai (rollback hua hai) to flagged fields mein
    // koi actual change hona chahiye — same value pe submit nahi hoga
    if (selected.status === 'RETURNED') {
      const originalFieldsMap = {};
      entityData.fields.forEach(f => { originalFieldsMap[f.key] = f.value; });
      const changedAny = entityData.fields
        .filter(f => f.editable !== false)
        .some(f => (editFields[f.key] ?? '') !== (originalFieldsMap[f.key] ?? ''));
      if (!changedAny) {
        alert('Please make at least one change before saving. Same values cannot be resubmitted.');
        return;
      }
    }

    setSavingEdit(true);
    try {
      const body = cfg.buildUpdateBody(editFields);
      const res = await fetch(cfg.updateEndpoint(selected.entity_id), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Save failed'); }
      const updated = await res.json();
      const newFields = cfg.getFields(updated);
      setEntityData({ raw: updated, fields: newFields });
      const init = {};
      newFields.forEach(f => { init[f.key] = f.value; });
      setEditFields(init);
      setEditing(false);
    } catch (e) { alert(e.message); }
    finally { setSavingEdit(false); }
  };

  if (!selected) return null;

  const det = entityDetails[`${selected.entity_type}-${selected.entity_id}`] || {};
  const sm  = STATUS_META[selected.status] || STATUS_META.DRAFT;
  // canAct: sirf IN_REVIEW pe Approve/Reject/Rollback dikhao
  // APPROVED/REJECTED/CANCELLED pe bilkul nahi
  // step1Approved=true (Step 1 done, Step 2 chal raha) pe bhi nahi — MDM page handle karega
  const _wfStep1Done = selected.status === 'IN_REVIEW' && (
    (selected._step_approvals || []).some(sa => sa.step_order === 1)
  );
  const canAct = selected._role === 'approver' && selected.status === 'IN_REVIEW' && !_wfStep1Done;

  const renderEditField = (f) => {
    const val = editFields[f.key] ?? '';
    const commonStyle = {
      width: '100%', boxSizing: 'border-box',
      background: '#0f1117', border: '1.5px solid #2e3349', borderRadius: 7,
      padding: '6px 10px', fontSize: 11, color: '#e2e8f0',
      fontFamily: 'inherit', outline: 'none',
    };
    // editable:false wale fields read-only dikhao (edit mode mein bhi)
    if (f.editable === false) {
      return (
        <div key={f.key} style={{ ...commonStyle, background: '#0a0d15', border: '1.5px solid #1e2233', color: '#6b7280', cursor: 'not-allowed', opacity: 0.7 }}>
          {val || <span style={{ color: '#374151', fontStyle: 'italic' }}>—</span>}
        </div>
      );
    }
    if (f.type === 'textarea') {
      return (
        <textarea key={f.key} value={val} onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))}
          rows={3} style={{ ...commonStyle, resize: 'vertical', lineHeight: 1.5 }} />
      );
    }
    if (f.type === 'select') {
      const options = selectOptions[f.key] || [];
      const ds = dropdownState[f.key] || {};
      const searchVal = ds.search || '';
      const filteredOpts = options.filter(o => o.toLowerCase().includes(searchVal.toLowerCase()));
      return (
        <div key={f.key} style={{ position: 'relative' }} ref={el => dropdownRef.current[f.key] = el}>
          <div onClick={() => setDropdownState(p => ({ ...p, [f.key]: { ...p[f.key], open: !ds.open, search: '' } }))}
            style={{ ...commonStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: val ? '#e2e8f0' : '#4b5563' }}>{val || 'Select…'}</span>
            <span style={{ fontSize: 10, color: '#4b5563' }}>▾</span>
          </div>
          {ds.open && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1d27', border: '1px solid #2e3349', borderRadius: 7, zIndex: 100, maxHeight: 180, display: 'flex', flexDirection: 'column', boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
              <input autoFocus value={searchVal}
                onChange={e => setDropdownState(p => ({ ...p, [f.key]: { ...p[f.key], search: e.target.value } }))}
                placeholder="Search…"
                style={{ padding: '6px 10px', fontSize: 11, background: '#0f1117', border: 'none', borderBottom: '1px solid #2e3349', color: '#e2e8f0', outline: 'none' }}
              />
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {filteredOpts.map(o => (
                  <div key={o} onClick={() => { setEditFields(p => ({ ...p, [f.key]: o })); setDropdownState(p => ({ ...p, [f.key]: { open: false, search: '' } })); }}
                    style={{ padding: '7px 10px', fontSize: 11, color: o === val ? '#60a5fa' : '#e2e8f0', cursor: 'pointer', background: o === val ? '#1e2d4a' : 'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#21253a'}
                    onMouseLeave={e => e.currentTarget.style.background = o === val ? '#1e2d4a' : 'transparent'}>
                    {o}
                  </div>
                ))}
                {filteredOpts.length === 0 && <div style={{ padding: '10px', fontSize: 10, color: '#4b5563', textAlign: 'center' }}>No options found</div>}
              </div>
            </div>
          )}
        </div>
      );
    }
    if (f.type === 'date') {
      return (
        <input key={f.key} type="date" value={val}
          onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))}
          onClick={e => e.target.showPicker?.()}
          style={{ ...commonStyle, cursor: 'pointer', colorScheme: 'dark' }} />
      );
    }
    return (
      <input key={f.key} type={f.type || 'text'} value={val}
        onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))}
        style={commonStyle} />
    );
  };

  const renderFieldValue = (f) => {
    if (!f.value) return <span style={{ color: '#4b5563', fontStyle: 'italic', fontSize: 10 }}>Not provided</span>;
    if (f.type === 'textarea') return <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{f.value}</span>;
    return <span>{f.value}</span>;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(15,23,42,.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: 520, maxHeight: '88vh', background: '#1a1d27', borderRadius: 16,
        border: '1px solid #2e3349', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,.5)', animation: 'wfmrPop .2s ease',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(to right, #374151, #60a5fa)',
          padding: '0 12px', height: 28, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
            {det.label || `Request #${selected.entity_id}`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusBadge status={selected.status} sm />
            <button onClick={onClose} style={{
              width: 20, height: 20, borderRadius: 5, background: 'rgba(255,255,255,.15)',
              border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.8)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><X size={10} /></button>
          </div>
        </div>

        {/* Meta */}
        <div style={{ background: '#21253a', padding: '7px 12px', borderBottom: '1px solid #2e3349', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: canAct ? 7 : 0 }}>
            {det.company_name && (
              <span style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3, background: '#0f1117', padding: '2px 8px', borderRadius: 20, border: '1px solid #2e3349' }}>
                <Building2 size={9} /> {det.company_name}
              </span>
            )}
            {det.dept_name && (
              <span style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3, background: '#0f1117', padding: '2px 8px', borderRadius: 20, border: '1px solid #2e3349' }}>
                <Layers size={9} /> {det.dept_name}
              </span>
            )}
            <span style={{ fontSize: 9, color: '#6b7280', background: '#0f1117', padding: '2px 8px', borderRadius: 20, border: '1px solid #2e3349', fontFamily: 'monospace' }}>
              {selected.entity_type}
            </span>
          </div>
          {canAct && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onAction('APPROVE')}
                style={{ flex: 1, background: '#16a34a', border: 'none', color: '#fff', borderRadius: 7, padding: '5px 0', cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <ThumbsUp size={10} /> Approve
              </button>
              <button onClick={() => onAction('REJECT')}
                style={{ flex: 1, background: '#dc2626', border: 'none', color: '#fff', borderRadius: 7, padding: '5px 0', cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <ThumbsDown size={10} /> Reject
              </button>
              <button onClick={openRollback}
                style={{ flex: 1, background: '#ea580c', border: 'none', color: '#fff', borderRadius: 7, padding: '5px 0', cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <RotateCcw size={10} /> Rollback
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2e3349', background: '#21253a', flexShrink: 0 }}>
          {[
            { id: 'details',  label: '📋 Request Details' },
            { id: 'timeline', label: '🔄 Approval Timeline' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '7px 0', fontSize: 10, fontWeight: 700,
                background: activeTab === tab.id ? '#0f1117' : 'transparent',
                color: activeTab === tab.id ? '#60a5fa' : '#6b7280',
                border: 'none', cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '2px solid #60a5fa' : '2px solid transparent',
                transition: 'all .15s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}>

          {/* ── DETAILS TAB ── */}
          {activeTab === 'details' && (
            <div>
              {entityLoading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32, color: '#94a3b8', fontSize: 12 }}>
                  <Spinner /> Loading details…
                </div>
              )}
              {!entityLoading && !entityData && (
                <div style={{ textAlign: 'center', padding: 28, color: '#6b7280', fontSize: 11 }}>
                  <AlertCircle size={24} color="#4b5563" style={{ marginBottom: 8 }} />
                  <p style={{ margin: 0 }}>Details not available</p>
                </div>
              )}
              {!entityLoading && entityData && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      📝 Required Fields
                    </span>
                    {['APPROVED', 'REJECTED', 'CANCELLED'].includes(selected.status) || !canAct ? (
                      <span style={{ fontSize: 9, color: '#6b7280', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 3 }}>
                        🔒 Locked
                      </span>
                    ) : (
                      editing ? (
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => setEditing(false)}
                            style={{ background: '#21253a', border: '1px solid #2e3349', color: '#94a3b8', borderRadius: 6, padding: '3px 10px', fontSize: 10, cursor: 'pointer' }}>
                            Cancel
                          </button>
                          <button onClick={handleSaveEdit} disabled={savingEdit}
                            style={{ background: '#16a34a', border: 'none', color: '#fff', borderRadius: 6, padding: '3px 12px', fontSize: 10, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {savingEdit ? <Spinner size={11} /> : null} Save
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setEditing(true)}
                          style={{ background: '#21253a', border: '1px solid #2e3349', color: '#94a3b8', borderRadius: 6, padding: '3px 10px', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                          ✏️ Edit
                        </button>
                      )
                    )}
                  </div>

                  {/* Required fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {entityData.fields.filter(f => f.required).map(f => (
                      <div key={f.key} style={{ background: '#21253a', border: '1px solid #2e3349', borderRadius: 8, padding: '8px 10px' }}>
                        <p style={{ fontSize: 8, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 5px', display: 'flex', alignItems: 'center', gap: 3 }}>
                          {f.label} <span style={{ color: '#ef4444' }}>*</span>
                        </p>
                        {editing && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(selected.status)
                          ? renderEditField(f)
                          : <div style={{ fontSize: 11, color: '#e2e8f0' }}>{renderFieldValue(f)}</div>
                        }
                      </div>
                    ))}
                  </div>

                  {/* Optional fields */}
                  {entityData.fields.some(f => !f.required) && (
                    <>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                        📎 Optional Documents
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {entityData.fields.filter(f => !f.required).map(f => (
                          <div key={f.key} style={{ background: '#21253a', border: '1px solid #2e3349', borderRadius: 8, padding: '8px 10px', opacity: f.value ? 1 : 0.6 }}>
                            <p style={{ fontSize: 8, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 5px' }}>
                              {f.label}
                            </p>
                            {editing && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(selected.status)
                              ? renderEditField(f)
                              : f.value
                                ? <a href={f.value} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: 10, color: '#60a5fa', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
                                    {f.value}
                                  </a>
                                : <span style={{ fontSize: 10, color: '#4b5563', fontStyle: 'italic' }}>Not provided</span>
                            }
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── TIMELINE TAB ── */}
          {activeTab === 'timeline' && (
            <div>
              {timelineLoading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32, color: '#94a3b8', fontSize: 12 }}>
                  <Spinner /> Loading timeline…
                </div>
              )}
              {!timelineLoading && !timeline && (
                <div style={{ textAlign: 'center', padding: 28, color: '#6b7280', fontSize: 11 }}>
                  <AlertCircle size={22} color="#4b5563" style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                  Timeline not available
                </div>
              )}
              {!timelineLoading && timeline && (
                <div style={{ position: 'relative', paddingLeft: 22 }}>
                  <div style={{ position: 'absolute', left: 8, top: 8, bottom: 8, width: 2, background: 'linear-gradient(to bottom, #374151, #60a5fa55)', borderRadius: 2 }} />
                  {(() => {
                    // Step 1 approve ho chuka hai? selected._step_approvals se check karo
                    const step1Done =
                      (selected._step_approvals || []).some(sa => sa.step_order === 1) ||
                      selected.status === 'APPROVED' ||
                      selected.status === 'REJECTED' ||
                      selected.status === 'CANCELLED';
                    // Step 1 pending — sirf Step 1 dikhao
                    // Step 1 done — poora timeline dikhao (Step 2 bhi)
                    const visibleSteps = step1Done
                      ? timeline.steps
                      : (timeline.steps || []).filter(s => s.step_order === 1);
                    return visibleSteps;
                  })()?.map((step, si) => {
                    const dotCol = step.status === 'APPROVED' ? '#34d399' : step.status === 'REJECTED' ? '#f87171' : step.status === 'RETURNED' ? '#fb923c' : step.is_skipped ? '#374151' : '#60a5fa';
                    const isPending = step.status === 'PENDING' && !step.is_skipped;
                    return (
                      <div key={step.step_order} style={{ position: 'relative', marginBottom: 8 }}>
                        <div style={{
                          position: 'absolute', left: -16, top: 6, width: 14, height: 14,
                          borderRadius: '50%', background: dotCol, border: `2px solid ${isPending ? '#60a5fa44' : '#1a1d27'}`,
                          boxShadow: `0 0 0 2px ${dotCol}30`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: 6, color: '#fff', fontWeight: 800 }}>{step.step_order}</span>
                        </div>
                        <div style={{
                          background: '#21253a', border: `1px solid ${isPending ? '#60a5fa33' : '#2e3349'}`,
                          borderLeft: `3px solid ${dotCol}`, borderRadius: '0 8px 8px 0', padding: '7px 10px',
                          opacity: step.is_skipped ? 0.5 : 1,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{step.step_name}</span>
                            <StatusBadge status={step.status} sm />
                          </div>
                          {step.is_skipped && <p style={{ fontSize: 9, color: '#6b7280', margin: '0 0 2px' }}>⚡ Skipped</p>}
                          {(step.assigned_role || step.assigned_dept) && (
                            <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 2 }}>
                              {[step.assigned_role, step.assigned_dept, step.assigned_desg].filter(Boolean).join(' · ')}
                            </div>
                          )}
                          {step.actions?.length > 0 && (
                            <div style={{ marginTop: 5, paddingTop: 5, borderTop: '1px solid #2e3349' }}>
                              {step.actions.map(a => (
                                <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 3, fontSize: 10 }}>
                                  <span style={{ background: '#0f1117', color: '#6b7280', padding: '1px 5px', borderRadius: 4, fontSize: 8, fontWeight: 600, whiteSpace: 'nowrap' }}>{a.action_type}</span>
                                  <div style={{ flex: 1 }}>
                                    <span style={{ fontWeight: 700, color: '#94a3b8' }}>
                                      {a.performer?.full_name || `User #${a.performed_by}`}
                                    </span>
                                    {a.comments && <p style={{ margin: '1px 0 0', color: '#6b7280', fontStyle: 'italic', fontSize: 9 }}>"{a.comments}"</p>}
                                  </div>
                                  <span style={{ fontSize: 9, color: '#374151', whiteSpace: 'nowrap' }}>
                                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ height: 4, background: 'linear-gradient(to right, #374151, #60a5fa)', flexShrink: 0 }} />

        {/* Rollback modal — position:fixed taaki overflow:hidden parent se clip na ho */}
        {rollbackOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9100, backdropFilter: 'blur(4px)' }}>
            <div style={{ background: '#1a1d27', border: '1px solid #2e3349', borderRadius: 12, width: 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.6)', animation: 'wfmrPop .2s ease' }}>

              {/* Header */}
              <div style={{ background: 'linear-gradient(to right,#7c2d12,#ea580c)', padding: '0 12px', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RotateCcw size={12} /> Rollback Request — Select fields to fix
                </span>
                <button onClick={() => setRollbackOpen(false)} style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', borderRadius: 5, width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={10} />
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 10px' }}>
                  ✅ Tick the fields that need correction — this will be sent to the submitter as guidance.
                </p>

                {/* Required Fields */}
                {rollbackFields.some(f => f.required) && (
                  <>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', flexShrink: 0, display: 'inline-block' }} />
                      Required Fields
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px', marginBottom: 10 }}>
                      {rollbackFields.filter(f => f.required).map(f => {
                        const gi = rollbackFields.findIndex(x => x.key === f.key);
                        return (
                          <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '5px 8px', borderRadius: 6, background: f.selected ? '#2d1a0a' : '#21253a', border: `1px solid ${f.selected ? '#fb923c55' : '#2e3349'}`, transition: 'all .15s' }}>
                            <input type="checkbox" checked={f.selected}
                              onChange={() => setRollbackFields(prev => prev.map((x, j) => j === gi ? { ...x, selected: !x.selected } : x))}
                              style={{ accentColor: '#fb923c', width: 12, height: 12, flexShrink: 0 }} />
                            <span style={{ fontSize: 10, color: f.selected ? '#fb923c' : '#94a3b8', fontWeight: f.selected ? 700 : 400 }}>{f.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Optional Documents */}
                {rollbackFields.some(f => !f.required) && (
                  <>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa', flexShrink: 0, display: 'inline-block' }} />
                      Optional Documents
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px', marginBottom: 12 }}>
                      {rollbackFields.filter(f => !f.required).map(f => {
                        const gi = rollbackFields.findIndex(x => x.key === f.key);
                        return (
                          <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '5px 8px', borderRadius: 6, background: f.selected ? '#1e2d4a' : '#21253a', border: `1px solid ${f.selected ? '#60a5fa55' : '#2e3349'}`, transition: 'all .15s' }}>
                            <input type="checkbox" checked={f.selected}
                              onChange={() => setRollbackFields(prev => prev.map((x, j) => j === gi ? { ...x, selected: !x.selected } : x))}
                              style={{ accentColor: '#60a5fa', width: 12, height: 12, flexShrink: 0 }} />
                            <span style={{ fontSize: 10, color: f.selected ? '#60a5fa' : '#94a3b8', fontWeight: f.selected ? 700 : 400 }}>{f.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Instructions textarea */}
                <div>
                  <label style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 5 }}>
                    <MessageSquare size={9} style={{ display: 'inline', marginRight: 4 }} />
                    Additional description / instructions for submitter
                  </label>
                  <textarea value={rollbackDesc} onChange={e => setRollbackDesc(e.target.value)}
                    rows={3} placeholder="Describe what needs to be corrected…"
                    style={{ width: '100%', boxSizing: 'border-box', background: '#0f1117', border: '1px solid #2e3349', borderRadius: 7, color: '#e2e8f0', fontSize: 11, padding: '8px 10px', outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
                    onFocus={e => e.target.style.borderColor = '#fb923c'}
                    onBlur={e => e.target.style.borderColor = '#2e3349'} />
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '8px 12px', borderTop: '1px solid #2e3349', display: 'flex', justifyContent: 'flex-end', gap: 6, flexShrink: 0 }}>
                <button onClick={() => setRollbackOpen(false)}
                  style={{ background: '#21253a', border: '1px solid #2e3349', color: '#94a3b8', borderRadius: 7, padding: '5px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={submitRollback}
                  disabled={!rollbackDesc.trim() && !rollbackFields.some(f => f.selected)}
                  style={{ background: (!rollbackDesc.trim() && !rollbackFields.some(f => f.selected)) ? '#374151' : '#ea580c', border: 'none', color: (!rollbackDesc.trim() && !rollbackFields.some(f => f.selected)) ? '#6b7280' : '#fff', borderRadius: 7, padding: '5px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <RotateCcw size={11} /> Send Rollback
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════
export default function WorkflowMyRequests() {
  const user   = getSession();
  const userId = user?.id;

  // ── data ───────────────────────────────────────────────────────────────────
  const [requests, setRequests]               = useState([]);
  const [templates, setTemplates]             = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [entityDetails, setEntityDetails]     = useState({});
  const [wfStatusMap,   setWfStatusMap]         = useState({}); // entity key → { step_approvals, overall_status }
  const [unreadCount, setUnreadCount]         = useState(0);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [toast, setToast]                     = useState(null);
  const [selected, setSelected]               = useState(null);
  const [timeline, setTimeline]               = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [actionModal, setActionModal]         = useState(null);
  const [actionLoading, setActionLoading]     = useState(false);
  const [cancelModal, setCancelModal]         = useState(null);
  const [cancelReason, setCancelReason]       = useState('');
  const [showNotif, setShowNotif]             = useState(false);
  const [showFilters, setShowFilters]         = useState(false);

  // ── Export state (unchanged) ───────────────────────────────────────────────
  const [exportModal, setExportModal]         = useState(false);
  const [exportFormat, setExportFormat]       = useState('xlsx');
  const [exportPreset, setExportPreset]       = useState('detailed');
  const [filenameModal, setFilenameModal]     = useState(false);
  const [filenameSuffix, setFilenameSuffix]   = useState('');

  // ── filters (matching MdmMyReq exactly) ───────────────────────────────────
  const [catStatus,     setCatStatus]     = useState('');     // sidebar category
  const [statusFilter,  setStatus]        = useState('');     // dropdown / pill
  const [entityFilter,  setEntityFilter]  = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [searchTerm,    setSearchTerm]    = useState('');
  const [filterActive,  setFilterActive]  = useState('');     // ''|'active'|'inactive'
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');
  const [sortBy,        setSortBy]        = useState('date_desc');

  const notifRef = useRef();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  // ── close notif on outside click ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Load requests (logic 100% unchanged) ──────────────────────────────────
  const loadRequests = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const tmplRes  = await fetch(`${API_BASE}/workflow/templates/?is_active=true`);
      const tmplData = await tmplRes.json();
      const tmplList = Array.isArray(tmplData) ? tmplData : [];
      setTemplates(tmplList);

      const PAGE_TO_ENTITY_TYPE = { 'item-code-creation-req': 'ITEM_CREATION' };
      const targets = entityFilter
        ? [entityFilter]
        : [...new Set(tmplList.map(t => PAGE_TO_ENTITY_TYPE[t.entity_page] || t.code).filter(Boolean))];

      // SOURCE 2: inbox — requests PENDING my approval (Step 1 only on this page)
      const inboxRows = [];
      try {
        let inboxUrl = `${API_BASE}/workflow/inbox/${userId}?max_step_order=1`;
        if (entityFilter) inboxUrl += `&entity_type=${entityFilter}`;
        const inboxRes  = await fetch(inboxUrl);
        const inboxData = await inboxRes.json();
        if (Array.isArray(inboxData)) {
          inboxData.forEach(item => {
            inboxRows.push({
              instance_id:  item.instance_id,
              entity_type:  item.entity_type,
              entity_id:    item.entity_id,
              status:       item.instance_status?.value || item.instance_status || 'PENDING',
              submitted_at: item.submitted_at,
              completed_at: null,
              _role:        'approver',
              _step_name:   item.step_name,
              _step_order:  item.step_order,
            });
          });
        }
      } catch { /* ignore */ }

      // SOURCE 3: my-actions — requests I already acted on (Step 1 approver context)
      const actedRows = [];
      try {
        let actUrl = `${API_BASE}/workflow/my-actions/${userId}?caller_user_id=${userId}&max_step_order=1`;
        if (entityFilter) actUrl += `&entity_type=${entityFilter}`;
        const actRes  = await fetch(actUrl);
        const actData = await actRes.json();
        if (Array.isArray(actData)) {
          actData.forEach(item => {
            actedRows.push({
              instance_id:  item.instance_id,
              entity_type:  item.entity_type,
              entity_id:    item.entity_id,
              status:       item.status,
              submitted_at: item.submitted_at,
              completed_at: item.completed_at,
              _role:        'approver',
            });
          });
        }
      } catch { /* ignore */ }

      // Merge + dedupe
      const seen = new Set();
      const allReqs = [];
      [...inboxRows, ...actedRows].forEach(r => {
        const key = r.instance_id ? String(r.instance_id) : `entity-${r.entity_id}`;
        if (!seen.has(key)) { seen.add(key); allReqs.push(r); }
      });

      const filtered = allReqs.filter(r => {
        if (!statusFilter) return true;
        return r.status === statusFilter;
      });
      filtered.sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
      setRequests(filtered);

      // Fetch entity details + workflow status (for Step 1 approved display)
      const itemRows = filtered.filter(r => r.entity_type === 'ITEM_CREATION' && r.entity_id);
      const detailMap = {};
      const wfStatusMap = {}; // entity_id → { step_approvals: [...] }
      if (itemRows.length > 0) {
        await Promise.all(itemRows.map(async r => {
          const key = `${r.entity_type}-${r.entity_id}`;
          if (detailMap[key]) return;
          try {
            const dr = await fetch(`${API_BASE}/item-creation-req/${r.entity_id}`);
            if (dr.ok) {
              const d = await dr.json();
              detailMap[key] = {
                label:         d.item_name || `#${r.entity_id}`,
                company_name:  d.company?.company_name || '',
                dept_name:     d.department || '',
                required_date: d.required_date || '',
                is_active:     d.is_active,
                request_id:    d.request_id || '',
              };
            }
          } catch { /* ignore */ }
          // Fetch workflow status for Step 1 approved info
          try {
            const sr = await fetch(`${API_BASE}/workflow/status/${r.entity_type}/${r.entity_id}`);
            if (sr.ok) {
              const sd = await sr.json();
              wfStatusMap[key] = {
                step_approvals: sd.step_approvals || [],
                overall_status: sd.status,
              };
            }
          } catch { /* ignore */ }
        }));
      }
      // Attach _step_approvals to each row so TimelinePopup canAct check works
      filtered.forEach(r => {
        const key = `${r.entity_type}-${r.entity_id}`;
        if (wfStatusMap[key]) {
          r._step_approvals = wfStatusMap[key].step_approvals || [];
        }
      });
      setEntityDetails(detailMap);
      setWfStatusMap(wfStatusMap);

      // Unread notification count
      try {
        const r = await fetch(`${API_BASE}/workflow/user-notifications/${userId}/unread`);
        if (r.ok) { const d = await r.json(); setUnreadCount(d.unread_count || 0); }
      } catch {}

    } catch { showToast('Failed to load requests', 'error'); }
    finally { setLoading(false); }
  }, [userId, statusFilter, entityFilter]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // ── SSE: auto-refresh on notification ─────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const es = new EventSource(`${API_BASE}/workflow/user-notifications/${userId}/stream`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type && data.type !== 'heartbeat' && data.type !== 'connected') {
          loadRequests();
          setUnreadCount(c => c + 1);
        }
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [userId, loadRequests]);

  // ── Load timeline (logic unchanged) ───────────────────────────────────────
  const loadTimeline = async (row) => {
    // _step_approvals attach karo taaki TimelinePopup ka canAct sahi kaam kare
    const wfKey = `${row.entity_type}-${row.entity_id}`;
    const enrichedRow = {
      ...row,
      _step_approvals: wfStatusMap[wfKey]?.step_approvals || row._step_approvals || [],
    };
    setSelected(enrichedRow); setTimeline(null); setTimelineLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workflow/timeline/${row.entity_type}/${row.entity_id}`);
      if (!res.ok) throw new Error('Not found');
      const tl = await res.json();

      const allActions = (tl.steps || []).flatMap(s => s.actions || []);
      const performerIds = [...new Set(allActions.map(a => a.performed_by).filter(Boolean))];
      const performerInfoMap = {};
      await Promise.all(performerIds.map(async uid => {
        try {
          const r = await fetch(`${API_BASE}/user-dept-access/user/${uid}/companies`);
          if (r.ok) {
            const comps = await r.json();
            if (Array.isArray(comps) && comps.length > 0) {
              const primary = comps.find(c => c.is_primary_company) || comps[0];
              performerInfoMap[uid] = {
                company_name:    primary.company_name || '',
                department_name: primary.department_name || '',
              };
            }
          }
        } catch { /* ignore */ }
      }));

      if (Object.keys(performerInfoMap).length > 0) {
        tl.steps = (tl.steps || []).map(step => ({
          ...step,
          actions: (step.actions || []).map(a => ({
            ...a,
            performer: a.performer ? {
              ...a.performer,
              company_name:    performerInfoMap[a.performed_by]?.company_name    || '',
              department_name: performerInfoMap[a.performed_by]?.department_name || '',
            } : a.performer,
          })),
        }));
      }
      setTimeline(tl);
    } catch { setTimeline(null); }
    finally { setTimelineLoading(false); }
  };

  // ── Cancel (logic unchanged) ───────────────────────────────────────────────
  const cancelRequest = (row) => { setCancelReason(''); setCancelModal(row); };

  const confirmCancel = async () => {
    const row = cancelModal;
    if (!row) return;
    setCancelModal(null);
    try {
      const res = await fetch(`${API_BASE}/workflow/action/${row.instance_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'CANCEL', performed_by: userId,
          comments: cancelReason.trim() || 'Cancelled by submitter',
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      showToast('Request cancelled');
      if (selected?.instance_id === row.instance_id) { setSelected(null); setTimeline(null); }
      loadRequests();
    } catch (e) { showToast(e.message, 'error'); }
  };

  // ── Action (logic unchanged) ───────────────────────────────────────────────
  const handleAction = async (actionType, comments) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workflow/action/${selected.instance_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: actionType, performed_by: userId, comments: comments || '' }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Action failed'); }
      const labels = { APPROVE: 'approved', REJECT: 'rejected', RETURN: 'returned to submitter' };
      showToast(`Request ${labels[actionType] || 'updated'} successfully`);
      setActionModal(null); setSelected(null); setTimeline(null);
      loadRequests(); // immediate refresh
      setTimeout(() => { loadRequests(); }, 38000); // 38s delay — notification service settle
    } catch (e) { showToast(e.message, 'error'); }
    finally { setActionLoading(false); }
  };

  // ── Export (logic unchanged) ───────────────────────────────────────────────
  const handleExport = async (customTitle) => {
    const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    const esc     = (v) => String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const searchLower = searchTerm.trim().toLowerCase();
    const rows = requests.filter(r => {
      const det = entityDetails[`${r.entity_type}-${r.entity_id}`] || {};
      if (searchLower) {
        const m = (det.label || '').toLowerCase().includes(searchLower) ||
          (det.company_name || '').toLowerCase().includes(searchLower) ||
          (r.status || '').toLowerCase().includes(searchLower);
        if (!m) return false;
      }
      if (companyFilter && det.company_name !== companyFilter) return false;
      if (entityFilter  && r.entity_type   !== entityFilter)   return false;
      if (statusFilter  && r.status        !== statusFilter)    return false;
      if (dateFrom) { const s = r.submitted_at?.slice(0, 10) || ''; if (!s || s < dateFrom) return false; }
      if (dateTo)   { const s = r.submitted_at?.slice(0, 10) || ''; if (!s || s > dateTo)   return false; }
      return true;
    });

    const itemCache = {};
    const tlCache   = {};
    await Promise.all(rows.map(async r => {
      if (r.entity_type === 'ITEM_CREATION' && !itemCache[r.entity_id]) {
        try { const res = await fetch(`${API_BASE}/item-creation-req/${r.entity_id}`); if (res.ok) itemCache[r.entity_id] = await res.json(); } catch {}
      }
      if (!tlCache[`${r.entity_type}-${r.entity_id}`]) {
        try { const res = await fetch(`${API_BASE}/workflow/timeline/${r.entity_type}/${r.entity_id}`); if (res.ok) tlCache[`${r.entity_type}-${r.entity_id}`] = await res.json(); } catch {}
      }
    }));

    const ALL_HEADERS = ['#','Instance ID','Page/Type','Entity ID','Item Name','Item Short Name','Item Type','Company','Plant','Department','Required Date','Item Description','Business Reason','Reference Image URL','Sample Photo URL','Vendor Quotation URL','Product Link','Created By','Created By (User ID)','Created At','Status','Submitted At','Completed At','Action History','Last Action By (Name)','Last Action By (User ID)','Last Action Type'];
    const SUMMARY_HEADERS  = ['#','Item Name','Item Short Name','Item Type','Company','Department','Required Date','Status','Created By','Created At','Submitted At','Completed At','Last Action By (Name)','Last Action Type'];
    const DETAILED_HEADERS = ['#','Instance ID','Page/Type','Item Name','Item Short Name','Item Type','Company','Plant','Department','Required Date','Item Description','Business Reason','Status','Created By','Created By (User ID)','Created At','Submitted At','Completed At','Last Action By (Name)','Last Action By (User ID)','Last Action Type'];
    const PRESET_HEADERS = { summary: SUMMARY_HEADERS, detailed: DETAILED_HEADERS, full: ALL_HEADERS };
    const headers = PRESET_HEADERS[exportPreset];

    const getVal = (r, i, h) => {
      const item = itemCache[r.entity_id] || {};
      const det  = entityDetails[`${r.entity_type}-${r.entity_id}`] || {};
      const tl   = tlCache[`${r.entity_type}-${r.entity_id}`];
      const allActs = tl?.steps ? tl.steps.flatMap(s => (s.actions || [])).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) : [];
      const lastAct = allActs.length > 0 ? allActs[allActs.length - 1] : null;
      const m = {
        '#': i + 1,
        'Instance ID': r.instance_id,
        'Page/Type': r.entity_type,
        'Entity ID': r.entity_id,
        'Item Name': item.item_name || det.label,
        'Item Short Name': item.item_short_name,
        'Item Type': item.item_type,
        'Company': item.company?.company_name || det.company_name,
        'Plant': item.plant?.plant_name,
        'Department': item.department || det.dept_name,
        'Required Date': item.required_date,
        'Item Description': item.item_description,
        'Business Reason': item.business_reason,
        'Reference Image URL': item.optional_documents?.reference_image_url,
        'Sample Photo URL': item.optional_documents?.sample_photo_url,
        'Vendor Quotation URL': item.optional_documents?.vendor_quotation_url,
        'Product Link': item.optional_documents?.product_link,
        'Created By': item.creator ? `${item.creator.full_name || item.creator.username || ''} (ID:${item.created_by || ''})` : String(item.created_by || ''),
        'Created By (User ID)': item.created_by,
        'Created At': fmtDate(item.created_at),
        'Status': STATUS_META[r.status]?.label || r.status,
        'Submitted At': fmtDate(r.submitted_at),
        'Completed At': fmtDate(r.completed_at),
        'Action History': allActs.map(a => `${a.action_type} by ${a.performer?.full_name || 'User#' + a.performed_by}${a.comments ? ': ' + a.comments : ''} (${fmtDate(a.created_at)})`).join(' | '),
        'Last Action By (Name)': lastAct?.performer?.full_name || (lastAct ? 'User#' + lastAct.performed_by : ''),
        'Last Action By (User ID)': lastAct?.performed_by,
        'Last Action Type': lastAct?.action_type,
      };
      return m[h] ?? '';
    };

    const title = customTitle || `MyWorkflowRequests_${exportPreset}_${new Date().toISOString().slice(0, 10)}`;
    const dataRows = rows.map((r, i) => headers.map(h => getVal(r, i, h)));

    if (exportFormat === 'csv') {
      const escCsv = (v) => { const s = String(v || ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
      const csv = [headers.map(escCsv).join(','), ...dataRows.map(row => row.map(escCsv).join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${title}.csv` });
      a.click(); URL.revokeObjectURL(a.href);
      setExportModal(false); showToast('CSV downloaded successfully');
    } else if (exportFormat === 'xlsx') {
      const ws_data = [headers, ...dataRows];
      const ws = ws_data.reduce((s, row, ri) => {
        row.forEach((cell, ci) => {
          const addr = String.fromCharCode(65 + ci) + (ri + 1);
          s[addr] = { v: cell, t: 's' };
        });
        return s;
      }, {});
      const range = { s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: ws_data.length - 1 } };
      ws['!ref'] = `A1:${String.fromCharCode(65 + headers.length - 1)}${ws_data.length}`;
      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      const wb = { SheetNames: ['My Workflow Requests'], Sheets: { 'My Workflow Requests': ws } };
      if (typeof XLSX !== 'undefined') {
        XLSX.writeFile(wb, `${title}.xlsx`);
        setExportModal(false); showToast('Excel file downloaded');
      } else {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
        window.XLSX.writeFile(wb, `${title}.xlsx`);
        setExportModal(false); showToast('Excel file downloaded');
      }
    } else if (exportFormat === 'pdf') {
      const thS = 'padding:4px 6px;background:#1e3a5f;color:#fff;font-size:9px;text-align:left;font-weight:700;border:1px solid #2e4a7f;white-space:nowrap;';
      const tdS = 'padding:3px 6px;font-size:9px;color:#374151;border:1px solid #e2e8f0;vertical-align:top;';
      const trEven = 'background:#f8fafc;';
      const bodyHtml = `<table style="width:100%;border-collapse:collapse;font-size:9px;">
        <thead><tr>${headers.map(h => `<th style="${thS}">${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${dataRows.map((row, i) => `<tr style="${i % 2 === 1 ? trEven : ''}">${row.map(v => `<td style="${tdS}">${esc(v) || '—'}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
        <style>body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}h1{color:#1e3a5f;font-size:16px;margin:0 0 4px}.meta{color:#6b7280;font-size:10px;margin:0 0 16px}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}@media print{body{padding:8px}@page{size:A4 landscape;margin:10mm}}</style>
        </head><body>
        <h1>My Workflow Requests — ${exportPreset.charAt(0).toUpperCase() + exportPreset.slice(1)} Report</h1>
        <p class="meta">Exported on ${new Date().toLocaleString('en-IN')} · ${rows.length} records</p>
        ${bodyHtml}
        <script>window.onload=()=>window.print();<\/script>
        </body></html>`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${title}.html` });
      a.click(); URL.revokeObjectURL(a.href);
      setExportModal(false); showToast('PDF file downloaded — open in browser & print as PDF');
    }
  };

  // ── Derived / filtered list (matching MdmMyReq logic) ─────────────────────
  const filtered = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return requests.filter(r => {
      const det = entityDetails[`${r.entity_type}-${r.entity_id}`] || {};
      if (q && !['label', 'company_name', 'dept_name', 'request_id'].some(k => (det[k] || '').toLowerCase().includes(q))
             && !(r.status || '').toLowerCase().includes(q)
             && !(r.entity_type || '').toLowerCase().includes(q)) return false;
      const statusF = catStatus || statusFilter;
      if (statusF && r.status !== statusF) return false;
      if (companyFilter && det.company_name !== companyFilter) return false;
      if (entityFilter  && r.entity_type   !== entityFilter)   return false;
      if (filterActive === 'active'   && det.is_active === false) return false;
      if (filterActive === 'inactive' && det.is_active !== false) return false;
      if (dateFrom) { const s = r.submitted_at?.slice(0, 10) || ''; if (!s || s < dateFrom) return false; }
      if (dateTo)   { const s = r.submitted_at?.slice(0, 10) || ''; if (!s || s > dateTo)   return false; }
      return true;
    }).sort((a, b) => {
      const da = entityDetails[`${a.entity_type}-${a.entity_id}`] || {};
      const db = entityDetails[`${b.entity_type}-${b.entity_id}`] || {};
      if (sortBy === 'date_asc')  return new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0);
      if (sortBy === 'date_desc') return new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0);
      if (sortBy === 'name')      return (da.label || '').localeCompare(db.label || '');
      if (sortBy === 'company')   return (da.company_name || '').localeCompare(db.company_name || '');
      if (sortBy === 'status')    return (a.status || '').localeCompare(b.status || '');
      return 0;
    });
  }, [requests, entityDetails, searchTerm, catStatus, statusFilter, companyFilter, entityFilter, filterActive, dateFrom, dateTo, sortBy]);

  // ── Sidebar counts (same as MdmMyReq) ─────────────────────────────────────
  const statusCounts = React.useMemo(() => {
    const c = {};
    requests.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [requests]);

  const companyCounts = React.useMemo(() => {
    const c = {};
    requests.forEach(r => {
      const det = entityDetails[`${r.entity_type}-${r.entity_id}`] || {};
      const co = det.company_name || '—';
      c[co] = (c[co] || 0) + 1;
    });
    return c;
  }, [requests, entityDetails]);

  const allCompanies = Object.keys(companyCounts).sort();
  const allEntities  = [...new Set(requests.map(r => r.entity_type).filter(Boolean))];

  const hasAnyFilter = !!(catStatus || statusFilter || companyFilter || entityFilter || filterActive || dateFrom || dateTo || searchTerm);

  const clearFilters = () => {
    setCatStatus(''); setStatus(''); setCompanyFilter(''); setEntityFilter('');
    setFilterActive(''); setDateFrom(''); setDateTo(''); setSearchTerm('');
  };

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-lg shadow-md"
      style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: '#0f1117', color: '#e2e8f0', fontSize: 12 }}>

      <style>{`
        @keyframes wfmrSpin    { to{transform:rotate(360deg)} }
        @keyframes wfmrFadeIn  { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        @keyframes wfmrPop     { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
        @keyframes wfmrRowIn   { from{opacity:0;transform:translateY(3px)} to{opacity:1;transform:none} }
        @keyframes wfmrShimmer { from{background-position:200% 0} to{background-position:-200% 0} }
        .wfmr-row:hover { background:#21253a!important; box-shadow:inset 3px 0 0 #4f8ef7; }
        .wfmr-row:hover .wfmr-name { color:#4f8ef7!important; }
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-track{background:#1a1d27} ::-webkit-scrollbar-thumb{background:#2e3349;border-radius:10px}
      `}</style>

      {/* Toast */}
      <Toast toast={toast} />

      {/* Modals */}
      <ActionModal action={actionModal} onConfirm={handleAction} onClose={() => setActionModal(null)} loading={actionLoading} />
      {selected && (
        <TimelinePopup
          selected={selected}
          entityDetails={entityDetails}
          timeline={timeline}
          timelineLoading={timelineLoading}
          onClose={() => { setSelected(null); setTimeline(null); }}
          onAction={(type) => setActionModal(type)}
          userId={userId}
          loadRequests={loadRequests}
        />
      )}

      {/* Header */}
      <Header onRefresh={loadRequests} loading={loading} unreadCount={unreadCount} onBellClick={() => setShowNotif(v => !v)} />

      {/* Notification overlay — WorkflowNotificationsPage from WorkflowStatusBadge */}
      {showNotif && (
        <div style={{ display: 'none' }}>
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9500,
            background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
          }}
            onClick={() => setShowNotif(false)}
          >
            <div
              style={{
                width: 420, height: '100%', maxHeight: '100vh',
                animation: 'wfmrFadeIn .18s ease',
                boxShadow: '-8px 0 32px rgba(0,0,0,.4)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <WorkflowNotificationsPage
                userId={userId}
                onUnreadChange={setUnreadCount}
                onClose={() => setShowNotif(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Search + Filter bar */}
      <div style={{ background: '#1a1d27', borderBottom: '1px solid #2e3349', padding: '6px 10px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#4b5563', pointerEvents: 'none' }} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search item name, company, dept, type, status…"
            style={{ width: '100%', boxSizing: 'border-box', background: '#0f1117', border: '1px solid #2e3349', borderRadius: 7, padding: '5px 28px 5px 28px', fontSize: 11, color: '#e2e8f0', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = '#4f8ef7'}
            onBlur={e => e.target.style.borderColor = '#2e3349'} />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
              <X size={11} />
            </button>
          )}
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ background: '#21253a', border: '1px solid #2e3349', color: '#e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 10, outline: 'none', cursor: 'pointer' }}>
          <option value="date_desc">↓ Newest</option>
          <option value="date_asc">↑ Oldest</option>
          <option value="name">A-Z Name</option>
          <option value="company">Company</option>
          <option value="status">Status</option>
        </select>

        {/* Export */}
        <button onClick={() => setExportModal(true)}
          style={{ background: '#21253a', border: '1px solid #2e3349', color: '#94a3b8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Download size={11} /> Export
        </button>

        {/* Filters toggle */}
        <button onClick={() => setShowFilters(f => !f)}
          style={{
            background: showFilters ? '#4f8ef722' : '#21253a',
            border: `1px solid ${showFilters ? '#4f8ef7' : '#2e3349'}`,
            color: showFilters ? '#4f8ef7' : '#94a3b8',
            borderRadius: 6, padding: '4px 10px', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}>
          <SlidersHorizontal size={11} /> Filters {hasAnyFilter && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 8, fontWeight: 700 }}>!</span>}
        </button>

        {hasAnyFilter && (
          <button onClick={clearFilters}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
            <X size={10} /> Clear
          </button>
        )}
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div style={{ background: '#131929', borderBottom: '1px solid #2e3349', padding: '8px 10px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0, animation: 'wfmrFadeIn .15s ease' }}>

          {/* Status */}
          <div>
            <div style={{ fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>Status</div>
            <select value={statusFilter} onChange={e => { setStatus(e.target.value); setCatStatus(''); }}
              style={{ background: '#21253a', border: '1px solid #2e3349', color: '#e2e8f0', borderRadius: 5, padding: '3px 8px', fontSize: 10, outline: 'none' }}>
              <option value="">All</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
            </select>
          </div>

          {/* Company */}
          {allCompanies.length > 1 && (
            <div>
              <div style={{ fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>Company</div>
              <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
                style={{ background: '#21253a', border: '1px solid #2e3349', color: '#e2e8f0', borderRadius: 5, padding: '3px 8px', fontSize: 10, outline: 'none' }}>
                <option value="">All</option>
                {allCompanies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Entity type */}
          {allEntities.length > 1 && (
            <div>
              <div style={{ fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>Type</div>
              <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}
                style={{ background: '#21253a', border: '1px solid #2e3349', color: '#e2e8f0', borderRadius: 5, padding: '3px 8px', fontSize: 10, outline: 'none' }}>
                <option value="">All</option>
                {allEntities.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          )}

          {/* Active/Inactive */}
          <div>
            <div style={{ fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>Record</div>
            <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
              style={{ background: '#21253a', border: '1px solid #2e3349', color: '#e2e8f0', borderRadius: 5, padding: '3px 8px', fontSize: 10, outline: 'none' }}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Date range */}
          <div>
            <div style={{ fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>From date</div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ background: '#21253a', border: '1px solid #2e3349', color: dateFrom ? '#e2e8f0' : '#4b5563', borderRadius: 5, padding: '3px 8px', fontSize: 10, outline: 'none', colorScheme: 'dark' }} />
          </div>
          <div>
            <div style={{ fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>To date</div>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ background: '#21253a', border: '1px solid #2e3349', color: dateTo ? '#e2e8f0' : '#4b5563', borderRadius: 5, padding: '3px 8px', fontSize: 10, outline: 'none', colorScheme: 'dark' }} />
          </div>
        </div>
      )}

      {/* Body: sidebar + table */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <div style={{ width: 160, borderRight: '1px solid #2e3349', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #2e3349', fontSize: 8, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: .7 }}>
            Categories
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* All */}
            <SidebarItem label="All" count={requests.length} active={!catStatus && !statusFilter}
              onClick={() => { setCatStatus(''); setStatus(''); }} color="#4f8ef7" icon="📋" />
            {/* Status categories */}
            {ALL_STATUSES.filter(s => statusCounts[s]).map(s => (
              <SidebarItem key={s} label={STATUS_META[s].label} count={statusCounts[s] || 0}
                active={catStatus === s}
                onClick={() => { setCatStatus(s === catStatus ? '' : s); setStatus(''); }}
                color={STATUS_META[s].dot} icon={STATUS_META[s].icon} />
            ))}
            {/* By Company */}
            {allCompanies.length > 0 && (
              <>
                <div style={{ padding: '8px 8px 2px', fontSize: 7, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: .5 }}>By Company</div>
                {allCompanies.map(co => (
                  <SidebarItem key={co} label={co} count={companyCounts[co] || 0}
                    active={companyFilter === co}
                    onClick={() => setCompanyFilter(companyFilter === co ? '' : co)}
                    color="#a78bfa" icon="🏢" />
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Table area ── */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', background: '#0f1117' }}>

          {/* Stat pills */}
          <div style={{ display: 'flex', gap: 6, padding: '7px 10px', borderBottom: '1px solid #2e3349', flexWrap: 'wrap', alignItems: 'center', background: '#1a1d27' }}>
            {ALL_STATUSES.filter(s => statusCounts[s]).map(s => {
              const m = STATUS_META[s];
              const active = (catStatus || statusFilter) === s;
              return (
                <button key={s} onClick={() => { setCatStatus(active ? '' : s); setStatus(''); }}
                  style={{ background: active ? `${m.dot}22` : '#21253a', border: `1px solid ${active ? m.dot + '88' : '#2e3349'}`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', textAlign: 'center', outline: 'none', transition: 'all .12s' }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: m.dot, margin: 0, lineHeight: 1.2 }}>{statusCounts[s]}</p>
                  <p style={{ fontSize: 8, color: active ? m.dot : '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: .5, fontWeight: 600 }}>{m.label}</p>
                </button>
              );
            })}
            <div style={{ marginLeft: 'auto', fontSize: 9, color: '#6b7280' }}>
              {filtered.length} of {requests.length} shown
            </div>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div style={{ padding: '12px 10px' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ height: 44, borderRadius: 8, marginBottom: 6, background: 'linear-gradient(90deg,#1a1d27 25%,#21253a 50%,#1a1d27 75%)', backgroundSize: '200% 100%', animation: 'wfmrShimmer 1.5s infinite' }} />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
              <p style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700, margin: '0 0 6px' }}>No requests found</p>
              <p style={{ color: '#6b7280', fontSize: 11, margin: '0 0 14px' }}>
                {hasAnyFilter ? 'No requests match current filters.' : 'No workflow requests assigned to you yet.'}
              </p>
              {hasAnyFilter && (
                <button onClick={clearFilters}
                  style={{ background: '#4f8ef722', border: '1px solid #4f8ef755', color: '#4f8ef7', borderRadius: 7, padding: '6px 16px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                  Clear All Filters
                </button>
              )}
            </div>
          )}

          {/* Table */}
          {!loading && filtered.length > 0 && (
            <div style={{ padding: '8px 10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#21253a', borderBottom: '1px solid #2e3349' }}>
                    {['#', 'Type', 'My Role', 'Item / Request', 'Company', 'Dept', 'Req. Date', 'Status', 'Submitted', 'Completed', 'Active', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: .6, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => {
                    const det       = entityDetails[`${r.entity_type}-${r.entity_id}`] || {};
                    const wfSt      = wfStatusMap[`${r.entity_type}-${r.entity_id}`] || {};
                    // Step 1 approved display: agar Step 1 approved hai aur request abhi IN_REVIEW hai
                    // (Step 2 chal raha hai), to WorkflowMyRequests pe "Step 1 Approved" dikhao
                    const step1Approved = (r.status === 'IN_REVIEW') &&
                      (wfSt.step_approvals || []).some(sa => sa.step_order === 1);
                    const displayStatus = step1Approved ? 'STEP1_APPROVED' : r.status;
                    const m      = STATUS_META[r.status] || STATUS_META.DRAFT;
                    // canAct: sirf tab true ho jab Step 1 abhi bhi pending ho (step1Approved=false)
                    // step1Approved=true matlab Step 1 done, ab Step 2 MDM page ka kaam hai
                    const canAct = r._role === 'approver' && ['PENDING', 'IN_REVIEW'].includes(r.status) && !step1Approved;
                    return (
                      <tr key={r.instance_id || idx} className="wfmr-row"
                        onClick={() => loadTimeline(r)}
                        style={{ borderBottom: '1px solid #2e334922', background: '#1a1d27', cursor: 'pointer', animation: `wfmrRowIn .18s ease ${idx * 0.02}s both` }}>

                        {/* # */}
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', background: '#21253a', border: '1px solid #2e3349', padding: '1px 6px', borderRadius: 5 }}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                        </td>

                        {/* Type */}
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ background: '#1e2d4a', color: '#4f8ef7', border: '1px solid #4f8ef733', padding: '2px 8px', borderRadius: 20, fontSize: 8, fontWeight: 700, fontFamily: 'monospace' }}>
                            {r.entity_type}
                          </span>
                        </td>

                        {/* My Role */}
                        <td style={{ padding: '9px 12px' }}>
                          {r._role === 'approver'
                            ? <span style={{ background: '#0d2e22', color: '#34d399', border: '1px solid #34d39933', padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                ✅ Approver{r._step_name ? ` · ${r._step_name}` : ''}
                              </span>
                            : <span style={{ background: '#1e2d4a', color: '#60a5fa', border: '1px solid #60a5fa33', padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                📤 Submitter
                              </span>
                          }
                        </td>

                        {/* Item / Request */}
                        <td style={{ padding: '9px 12px', maxWidth: 180 }}>
                          <div className="wfmr-name"
                            style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170, transition: 'color .12s' }}>
                            {det.label || `#${r.entity_id}`}
                          </div>
                          {det.request_id && (
                            <div style={{ fontSize: 8, color: '#4b5563', fontFamily: 'monospace', marginTop: 1 }}>
                              {det.request_id}
                            </div>
                          )}
                        </td>

                        {/* Company */}
                        <td style={{ padding: '9px 12px' }}>
                          {det.company_name
                            ? <span style={{ color: '#94a3b8', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                                <Building2 size={9} color="#6b7280" />{det.company_name}
                              </span>
                            : <span style={{ color: '#2e3349' }}>—</span>}
                        </td>

                        {/* Dept */}
                        <td style={{ padding: '9px 12px' }}>
                          {det.dept_name
                            ? <span style={{ color: '#94a3b8', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                                <Layers size={9} color="#6b7280" />{det.dept_name}
                              </span>
                            : <span style={{ color: '#2e3349' }}>—</span>}
                        </td>

                        {/* Req Date */}
                        <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                          {det.required_date
                            ? <span style={{ color: '#a78bfa', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                                <Calendar size={9} color="#a78bfa" />{det.required_date}
                              </span>
                            : <span style={{ color: '#2e3349' }}>—</span>}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '9px 12px' }}>
                          {step1Approved ? (
                            // Step 1 approved ho gaya — sirf "Approved" dikhao, Step 2 ka mention nahi
                            <StatusBadge status="APPROVED" sm />
                          ) : (
                            <StatusBadge status={r.status} sm />
                          )}
                        </td>

                        {/* Submitted */}
                        <td style={{ padding: '9px 12px', color: '#6b7280', fontSize: 10, whiteSpace: 'nowrap' }}>
                          {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}
                        </td>

                        {/* Completed */}
                        <td style={{ padding: '9px 12px', fontSize: 10, whiteSpace: 'nowrap' }}>
                          {r.completed_at
                            ? <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                                <CheckCircle size={9} color="#34d399" />{new Date(r.completed_at).toLocaleDateString()}
                              </span>
                            : <span style={{ color: '#2e3349' }}>—</span>}
                        </td>

                        {/* Active */}
                        <td style={{ padding: '9px 12px' }}>
                          {det.is_active === undefined
                            ? <span style={{ color: '#2e3349' }}>—</span>
                            : det.is_active
                              ? <span style={{ color: '#34d399', fontSize: 9, fontWeight: 700 }}>● Active</span>
                              : <span style={{ color: '#f87171', fontSize: 9, fontWeight: 700 }}>● Inactive</span>}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '9px 12px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                            <button onClick={() => loadTimeline(r)}
                              style={{ background: '#1e2d4a', border: '1px solid #4f8ef733', color: '#4f8ef7', borderRadius: 5, padding: '3px 9px', cursor: 'pointer', fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Eye size={9} /> View
                            </button>
                            {['PENDING', 'IN_REVIEW', 'DRAFT'].includes(r.status) && !step1Approved && (
                              <button onClick={() => cancelRequest(r)}
                                style={{ background: '#2e1515', border: '1px solid #f8717133', color: '#f87171', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: 9, fontWeight: 600 }}>
                                Cancel
                              </button>
                            )}
                            {canAct && (
                              <>
                                <button onClick={() => { setSelected(r); setActionModal('APPROVE'); }}
                                  style={{ background: '#0d2e22', border: '1px solid #34d39933', color: '#34d399', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: 9, fontWeight: 700 }}>
                                  ✓
                                </button>
                                <button onClick={() => { setSelected(r); setActionModal('REJECT'); }}
                                  style={{ background: '#2e1515', border: '1px solid #f8717133', color: '#f87171', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: 9, fontWeight: 700 }}>
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer */}
              <div style={{ marginTop: 8, padding: '6px 12px', background: '#21253a', borderRadius: 7, border: '1px solid #2e3349', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                <span style={{ color: '#6b7280' }}>
                  Showing <b style={{ color: '#94a3b8' }}>{filtered.length}</b> of <b style={{ color: '#94a3b8' }}>{requests.length}</b> requests
                </span>
                {hasAnyFilter && (
                  <button onClick={clearFilters}
                    style={{ background: 'none', border: 'none', color: '#4f8ef7', cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <X size={9} /> Clear filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* ── Cancel Modal ── */}
      {cancelModal && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#1a1d27', border: '1px solid #2e3349', borderRadius: 14, width: 400, boxShadow: '0 24px 60px rgba(0,0,0,.6)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(to right,#374151,#4b5563)', padding: '0 14px', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                🚫 Cancel Request
              </span>
              <button onClick={() => setCancelModal(null)} style={{ background: 'linear-gradient(135deg,#ff4444,#cc0000)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 5, color: '#fff', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={11} />
              </button>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ background: '#0f1117', border: '1px solid #2e3349', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: '#94a3b8' }}>
                <span style={{ color: '#6b7280' }}>Request: </span>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                  {(entityDetails[`${cancelModal.entity_type}-${cancelModal.entity_id}`]?.label) || `#${cancelModal.entity_id}`}
                </span>
              </div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <MessageSquare size={10} color="#6b7280" />
                Cancellation Reason <span style={{ color: '#4b5563', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Why are you cancelling this request?…"
                rows={3} autoFocus
                style={{ width: '100%', boxSizing: 'border-box', background: '#21253a', border: '1.5px solid #2e3349', borderRadius: 8, padding: '9px 11px', fontSize: 11, color: '#e2e8f0', fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = '#94a3b8'}
                onBlur={e => e.target.style.borderColor = '#2e3349'}
              />
            </div>
            <div style={{ padding: '0 18px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setCancelModal(null)}
                style={{ background: '#21253a', border: '1px solid #2e3349', color: '#94a3b8', borderRadius: 8, padding: '7px 18px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                Keep Request
              </button>
              <button onClick={confirmCancel}
                style={{ background: 'linear-gradient(to right,#374151,#4b5563)', border: 'none', color: '#fff', borderRadius: 8, padding: '7px 20px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                🚫 Confirm Cancel
              </button>
            </div>
            <div style={{ height: 4, background: 'linear-gradient(to right,#4b5563,#374151)' }} />
          </div>
        </div>
      )}

      {/* ── Export Modal ── */}
      {exportModal && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#1a1d27', border: '1px solid #2e3349', borderRadius: 14, width: 440, boxShadow: '0 24px 60px rgba(0,0,0,.6)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(to right,#374151,#60a5fa)', padding: '0 14px', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={13} /> Export Requests
              </span>
              <button onClick={() => setExportModal(false)} style={{ background: 'linear-gradient(135deg,#ff4444,#cc0000)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 5, color: '#fff', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={11} />
              </button>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.6px', margin: '0 0 8px' }}>Format</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['xlsx', '📊 Excel'], ['csv', '📄 CSV'], ['pdf', '🖨️ PDF']].map(([val, label]) => (
                    <button key={val} onClick={() => setExportFormat(val)}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1.5px solid ${exportFormat === val ? '#60a5fa' : '#2e3349'}`, background: exportFormat === val ? '#1e2d4a' : '#21253a', color: exportFormat === val ? '#60a5fa' : '#94a3b8', fontSize: 11, fontWeight: exportFormat === val ? 700 : 400, cursor: 'pointer', textAlign: 'center' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.6px', margin: '0 0 8px' }}>Data Preset</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['summary', 'Summary', 'Key fields only'], ['detailed', 'Detailed', 'All item fields'], ['full', 'Full', 'Everything + history']].map(([val, label, desc]) => (
                    <button key={val} onClick={() => setExportPreset(val)}
                      style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: `1.5px solid ${exportPreset === val ? '#60a5fa' : '#2e3349'}`, background: exportPreset === val ? '#1e2d4a' : '#21253a', color: exportPreset === val ? '#60a5fa' : '#94a3b8', fontSize: 10, fontWeight: exportPreset === val ? 700 : 400, cursor: 'pointer', textAlign: 'center' }}>
                      <div>{label}</div>
                      <div style={{ fontSize: 8, color: exportPreset === val ? '#4f8ef7' : '#4b5563', marginTop: 2 }}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ background: '#0f1117', border: '1px solid #2e3349', borderRadius: 7, padding: '8px 11px', fontSize: 10, color: '#94a3b8' }}>
                📊 <b style={{ color: '#60a5fa' }}>{filtered.length}</b> records will be exported {hasAnyFilter ? '(filtered)' : '(all)'}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setExportModal(false)}
                  style={{ background: '#21253a', border: '1px solid #2e3349', color: '#94a3b8', borderRadius: 7, padding: '7px 16px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={() => { setExportModal(false); setFilenameModal(true); }}
                  style={{ background: 'linear-gradient(to right,#1e40af,#3b82f6)', border: 'none', color: '#fff', borderRadius: 7, padding: '7px 20px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={12} /> Next: Set Filename
                </button>
              </div>
            </div>
            <div style={{ height: 4, background: 'linear-gradient(to right,#60a5fa,#374151)' }} />
          </div>
        </div>
      )}

      {/* ── Filename Modal ── */}
      {filenameModal && (() => {
        const userName = user?.full_name || user?.username || 'User';
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
        const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}`;
        const lockedPrefix = `UID${userId}_${userName.replace(/\s+/g, '_')}_${dateStr}_${timeStr}_${exportPreset}`;
        const ext = exportFormat === 'csv' ? 'csv' : exportFormat === 'xlsx' ? 'xlsx' : 'pdf';
        const finalName = filenameSuffix.trim() ? `${lockedPrefix}_${filenameSuffix.trim()}` : lockedPrefix;
        return (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6000, backdropFilter: 'blur(4px)' }}>
            <div style={{ background: '#1a1d27', border: '1px solid #2e3349', borderRadius: 14, width: 460, boxShadow: '0 24px 60px rgba(0,0,0,.6)', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(to right,#374151,#60a5fa)', padding: '0 14px', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={13} /> Set File Name
                </span>
                <button onClick={() => setFilenameModal(false)} style={{ background: 'linear-gradient(135deg,#ff4444,#cc0000)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 5, color: '#fff', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={11} />
                </button>
              </div>
              <div style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.6px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    🔒 Locked Prefix <span style={{ fontSize: 8, color: '#4b5563', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(cannot be changed)</span>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                      { label: 'User ID',   val: `UID${userId}` },
                      { label: 'Username',  val: userName },
                      { label: 'Date/Time', val: `${dateStr} ${timeStr.slice(0, 2)}:${timeStr.slice(2)}` },
                      { label: 'Preset',    val: exportPreset },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f1117', border: '1px solid #2e3349', borderRadius: 7, padding: '5px 10px' }}>
                        <span style={{ fontSize: 9, color: '#6b7280', fontWeight: 600, minWidth: 60 }}>{item.label}</span>
                        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', fontWeight: 700 }}>{item.val}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 8, color: '#374151', background: '#1a1d27', border: '1px solid #2e3349', borderRadius: 10, padding: '1px 6px' }}>🔒 locked</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.6px', margin: '0 0 6px' }}>
                    ✏️ Your Custom Suffix <span style={{ fontSize: 8, color: '#4b5563', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                  </p>
                  <input value={filenameSuffix}
                    onChange={e => setFilenameSuffix(e.target.value.replace(/[/\:*?"<>|]/g, ''))}
                    placeholder="e.g. Q1_review, final_check…"
                    style={{ width: '100%', boxSizing: 'border-box', background: '#21253a', border: '1.5px solid #2e3349', borderRadius: 8, padding: '8px 11px', fontSize: 11, color: '#e2e8f0', fontFamily: 'inherit', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#4f8ef7'}
                    onBlur={e => e.target.style.borderColor = '#2e3349'}
                  />
                </div>
                <div style={{ background: '#0f1117', border: '1px solid #2e3349', borderRadius: 7, padding: '8px 11px' }}>
                  <p style={{ fontSize: 8, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 4px' }}>📄 Final Filename Preview</p>
                  <p style={{ fontSize: 10, color: '#60a5fa', fontFamily: 'monospace', margin: 0, wordBreak: 'break-all' }}>{finalName}<span style={{ color: '#4b5563' }}>.{ext}</span></p>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setFilenameModal(false)}
                    style={{ background: '#21253a', border: '1px solid #2e3349', color: '#94a3b8', borderRadius: 7, padding: '7px 16px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={() => { setFilenameModal(false); handleExport(finalName); }}
                    style={{ background: 'linear-gradient(to right,#1e40af,#3b82f6)', border: 'none', color: '#fff', borderRadius: 7, padding: '7px 20px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Download size={12} /> Download
                  </button>
                </div>
              </div>
              <div style={{ height: 4, background: 'linear-gradient(to right,#60a5fa,#374151)' }} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}