/**
 * ItemTypeMaster.js
 * ─────────────────────────────────────────────────────────────────
 * Page: Item Type Master  (ItemMasterPages folder)
 * ─────────────────────────────────────────────────────────────────
 * Features
 *  • Full CRUD  – Create / Read / Update / Soft-delete / Hard-delete
 *  • Toggle active / inactive per record
 *  • Name-change audit log  – full history panel per record
 *  • Description field with rich display
 *  • Created by / Updated by shown with user names
 *  • Design matches ItemCodeCreationReq exactly
 *  • All popups centered inside the page container
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, X, Plus, Edit2, Trash2, RefreshCw,
  FileSpreadsheet, Save, AlertCircle, CheckCircle,
  History, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Clock, User, Upload
} from 'lucide-react';
import ExcelImportPopup from '../pages/ExcelImportPopup';

const API_BASE = 'http://localhost:8000/api';

// ─── session helper ───────────────────────────────────────────────────────
const getSession = () => {
  try {
    const d = JSON.parse(sessionStorage.getItem('userData') || '{}');
    return d?.user || null;
  } catch { return null; }
};

// ─── Toast ────────────────────────────────────────────────────────────────
const Toast = ({ msg, type, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  const bg = type === 'success' ? '#10b981' : '#ef4444';
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999, background: bg, color: '#fff',
      padding: '14px 24px', borderRadius: 8, fontSize: 13,
      fontWeight: 500, display: 'flex', alignItems: 'center',
      gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,.35)',
    }}>
      {type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
      {msg}
    </div>
  );
};

// ─── Confirm Modal ────────────────────────────────────────────────────────
const ConfirmModal = ({ title, message, confirmLabel, confirmColor, onConfirm, onClose }) => (
  <div style={{
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  }}>
    <div style={{
      width: 380, background: '#fff', borderRadius: 8,
      boxShadow: '0 10px 30px rgba(0,0,0,.2)', overflow: 'hidden',
    }}>
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '0 12px', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{title}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={14} /></button>
      </div>
      <div style={{ padding: '18px 16px' }}>
        <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.6 }}>{message}</p>
      </div>
      <div style={{ padding: '0 16px 14px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose}
          style={{ padding: '5px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
          Cancel
        </button>
        <button onClick={onConfirm}
          style={{ padding: '5px 16px', background: confirmColor || '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
          {confirmLabel || 'Confirm'}
        </button>
      </div>
      <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8 }} />
    </div>
  </div>
);

// ─── History Panel ────────────────────────────────────────────────────────
const HistoryPanel = ({ history, onClose, onRestore }) => (
  <div style={{
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  }}>
    <div style={{
      width: 600, maxWidth: '92%', maxHeight: '80%',
      background: '#fff', borderRadius: 8,
      boxShadow: '0 10px 30px rgba(0,0,0,.2)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* header */}
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '0 12px', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>📜 Name Change History</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={14} /></button>
      </div>

      {onRestore && (
        <div style={{ padding: '6px 12px', background: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: 10, color: '#92400e' }}>
          💡 Kisi bhi purane naam ko restore karne ke liye <strong>Restore</strong> button dabao — woh naam form mein aa jayega aur save karne par history mein log hoga.
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {history.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#6b7280', fontSize: 11 }}>
            No name changes recorded yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f9fafb' }}>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {['#', 'Previous Name', 'New Name', 'Changed By', 'Changed At', ...(onRestore ? ['Restore'] : [])].map(h => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '6px 10px', color: '#9ca3af' }}>{i + 1}</td>
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{ padding: '1px 7px', background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontSize: 10 }}>{h.old_name}</span>
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{ padding: '1px 7px', background: '#d1fae5', color: '#065f46', borderRadius: 4, fontSize: 10 }}>{h.new_name}</span>
                  </td>
                  <td style={{ padding: '6px 10px', color: '#374151' }}>
                    {h.changer?.full_name || h.changer?.username || (h.changed_by ? `User #${h.changed_by}` : '—')}
                  </td>
                  <td style={{ padding: '6px 10px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {h.changed_at ? new Date(h.changed_at).toLocaleString() : '—'}
                  </td>
                  {onRestore && (
                    <td style={{ padding: '6px 10px' }}>
                      <button
                        onClick={() => { onRestore(h.old_name); onClose(); }}
                        title={`Restore name to "${h.old_name}"`}
                        style={{ padding: '2px 8px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                        ↩ Restore
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8, flexShrink: 0 }} />
    </div>
  </div>
);


// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const ItemTypeMaster = () => {
  const user = getSession();

  // ── view state ────────────────────────────────────────────────────────────
  const [view,   setView]   = useState('list');  // 'list' | 'form'
  const [editId, setEditId] = useState(null);
  const [toast,  setToast]  = useState(null);

  // ── list state ────────────────────────────────────────────────────────────
  const [records,     setRecords]     = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive'

  // ── form state ────────────────────────────────────────────────────────────
  const emptyForm = { code: '', name: '', description: '' };
  const [form,   setForm]   = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // ── modals ────────────────────────────────────────────────────────────────
  const [confirmModal,  setConfirmModal]  = useState(null);  // { title, message, onConfirm, confirmLabel, confirmColor }
  const [historyRecord, setHistoryRecord] = useState(null);  // record whose history panel is open
  const [showImportPopup, setShowImportPopup] = useState(false);

  // ── helpers ───────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // ── load list ─────────────────────────────────────────────────────────────
  const loadRecords = useCallback(async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams({ limit: 200 });
      if (filterStatus === 'active')   params.set('is_active', 'true');
      if (filterStatus === 'inactive') params.set('is_active', 'false');
      const res  = await fetch(`${API_BASE}/item-type-master/?${params}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
      showToast('Failed to load records', 'error');
    }
    setListLoading(false);
  }, [filterStatus]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  // ── open form ─────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm({ ...emptyForm });
    setEditId(null);
    setView('form');
  };

  const openEdit = (rec) => {
    setForm({ code: rec.code || '', name: rec.name || '', description: rec.description || '' });
    setEditId(rec.id);
    setView('form');
  };

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Name is required', 'error'); return; }

    setSaving(true);
    try {
      const isEdit = !!editId;
      const url    = isEdit ? `${API_BASE}/item-type-master/${editId}` : `${API_BASE}/item-type-master/`;
      const method = isEdit ? 'PUT' : 'POST';

      let res;
      if (!isEdit) {
        // POST — FormData (same as ExcelImportPopup & GL routes)
        const fd = new FormData();
        fd.append('name', form.name.trim());
        if (form.description.trim()) fd.append('description', form.description.trim());
        if (user?.id) fd.append('created_by', user.id);
        res = await fetch(url, { method, body: fd });
      } else {
        // PUT — JSON (edit endpoint uses Pydantic schema)
        res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: form.code.trim(),
            name: form.name.trim(),
            description: form.description.trim() || null,
            updated_by: user?.id || null,
          }),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Save failed');
      }

      showToast(isEdit ? 'Item Type updated!' : 'Item Type created!');
      setView('list');
      loadRecords();
    } catch (e) {
      showToast(e.message, 'error');
    }
    setSaving(false);
  };

  // ── soft delete ───────────────────────────────────────────────────────────
  const handleSoftDelete = (rec) => {
    setConfirmModal({
      title:        'Deactivate Item Type',
      message:      `Are you sure you want to deactivate "${rec.name}"? It will be hidden from dropdowns but data is preserved.`,
      confirmLabel: 'Deactivate',
      confirmColor: '#f59e0b',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`${API_BASE}/item-type-master/${rec.id}?updated_by=${user?.id || ''}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed');
          showToast(`"${rec.name}" deactivated`);
          loadRecords();
        } catch { showToast('Deactivate failed', 'error'); }
      },
    });
  };

  // ── hard delete ───────────────────────────────────────────────────────────
  const handleHardDelete = (rec) => {
    setConfirmModal({
      title:        '⚠️ Permanently Delete',
      message:      `This will PERMANENTLY delete "${rec.name}" and all its name-change history. This action cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      confirmColor: '#ef4444',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`${API_BASE}/item-type-master/${rec.id}/hard`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed');
          showToast(`"${rec.name}" permanently deleted`);
          loadRecords();
        } catch { showToast('Delete failed', 'error'); }
      },
    });
  };

  // ── toggle active ─────────────────────────────────────────────────────────
  const handleToggle = async (rec) => {
    try {
      const res = await fetch(
        `${API_BASE}/item-type-master/${rec.id}/toggle?updated_by=${user?.id || ''}`,
        { method: 'PATCH' }
      );
      if (!res.ok) throw new Error('Toggle failed');
      showToast(rec.is_active ? `"${rec.name}" deactivated` : `"${rec.name}" activated`);
      loadRecords();
    } catch { showToast('Toggle failed', 'error'); }
  };

  // ── filtered list ─────────────────────────────────────────────────────────
  const filtered = records.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return [r.code, r.name, r.description].some(v => (v || '').toLowerCase().includes(term));
  });

  // ── title-case input ──────────────────────────────────────────────────────
  const toTitleInput = (val) =>
    val.replace(/ {2,}/g, ' ').replace(/(^|\s)(\S)/g, (_, s, c) => s + c.toUpperCase());

  // ── client-side code preview (mirrors backend generate_item_type_code) ─────
  // Backend: first 4 alpha chars of name, padded with X, e.g. "Raw Material" → RAWM-####
  const generateItemTypeCode = (name) => {
    if (!name || !name.trim()) return '';
    const words = name.trim().split(/\s+/).filter(w => /[a-zA-Z]/.test(w));
    const alpha = (w) => w.toUpperCase().replace(/[^A-Z]/g, '');
    let base;
    if (words.length === 0) {
      base = 'XXXX';
    } else if (words.length === 1) {
      base = alpha(words[0]).substring(0, 4).padEnd(4, 'X');
    } else if (words.length === 2) {
      base = (alpha(words[0]).substring(0, 2) + alpha(words[1]).substring(0, 2)).padEnd(4, 'X');
    } else if (words.length === 3) {
      base = (alpha(words[0]).substring(0, 2) + alpha(words[1]).substring(0, 1) + alpha(words[2]).substring(0, 1)).padEnd(4, 'X');
    } else {
      base = words.map(w => alpha(w)[0] || '').join('').substring(0, 4).padEnd(4, 'X');
    }
    return `${base}-####`;  // #### = sequence assigned by backend
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER – LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  const renderList = () => (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">

      {/* Header */}
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 24, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>🏷️ Item Type Master</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button title="Refresh" onClick={loadRecords}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
            <RefreshCw size={13} />
          </button>
          <button title="Export CSV" onClick={() => exportCSV()}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
            <FileSpreadsheet size={13} />
          </button>
          <button onClick={() => setShowImportPopup(true)}
            style={{ padding: '2px 10px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Upload size={12} /> Import Excel
          </button>
          <button onClick={openCreate}
            style={{ padding: '2px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={12} /> New Type
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search code, name, description…"
            style={{ width: '100%', padding: '5px 28px 5px 8px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 4, outline: 'none', color: '#374151' }} />
          {searchTerm
            ? <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={13} color="#9ca3af" /></button>
            : <Search size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />}
        </div>
        {/* Status filter */}
        {['all', 'active', 'inactive'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{
              padding: '4px 10px', fontSize: 10, fontWeight: 600, borderRadius: 4, border: 'none', cursor: 'pointer',
              background: filterStatus === s ? '#3b82f6' : '#f3f4f6',
              color:      filterStatus === s ? '#fff'    : '#374151',
            }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        {/* Count badge */}
        <span style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'nowrap' }}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
        {listLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 28 }}>⏳</div>
            <div style={{ fontSize: 11, color: '#666' }}>Loading…</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10, boxShadow: '0 1px 0 #e5e7eb' }}>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                {['#', 'Code', 'Name', 'Description', 'Status', 'Created By', 'Updated By', 'Created At', 'Updated At', 'History', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600, color: '#374151', borderRight: '1px solid #e5e7eb', whiteSpace: 'nowrap', background: '#f9fafb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: 32, textAlign: 'center', color: '#6b7280', fontSize: 11 }}>
                    {searchTerm ? 'No records match your search.' : 'No item types found. Click "+ New Type" to add one.'}
                  </td>
                </tr>
              ) : filtered.map((rec, idx) => (
                <tr key={rec.id}
                  style={{ borderBottom: '1px solid #f3f4f6', opacity: rec.is_active ? 1 : 0.6 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>

                  {/* # */}
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', color: '#9ca3af' }}>{idx + 1}</td>

                  {/* Code */}
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6' }}>
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}>
                      {rec.code}
                    </span>
                  </td>

                  {/* Name */}
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', fontWeight: 600, color: '#111827' }}>{rec.name}</td>

                  {/* Description */}
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', color: '#6b7280', maxWidth: 220 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rec.description || <span style={{ color: '#d1d5db' }}>—</span>}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 500, background: rec.is_active ? '#d1fae5' : '#fee2e2', color: rec.is_active ? '#065f46' : '#991b1b' }}>
                      {rec.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Created By */}
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', color: '#374151' }}>
                    {rec.creator?.full_name || rec.creator?.username || (rec.created_by ? `#${rec.created_by}` : '—')}
                  </td>

                  {/* Updated By */}
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', color: '#374151' }}>
                    {rec.updater?.full_name || rec.updater?.username || (rec.updated_by ? `#${rec.updated_by}` : '—')}
                  </td>

                  {/* Created At */}
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', color: '#6b7280', whiteSpace: 'nowrap', fontSize: 10 }}>
                    {rec.created_at ? new Date(rec.created_at).toLocaleString() : '—'}
                  </td>

                  {/* Updated At */}
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', color: '#6b7280', whiteSpace: 'nowrap', fontSize: 10 }}>
                    {rec.updated_at ? new Date(rec.updated_at).toLocaleString() : '—'}
                  </td>

                  {/* History */}
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <button title="Name Change History" onClick={() => setHistoryRecord(rec)}
                      style={{ padding: '3px 6px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
                      <History size={11} />
                      <span style={{ minWidth: 12, textAlign: 'center' }}>{rec.name_history?.length || 0}</span>
                    </button>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '6px 8px' }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {/* Edit */}
                      <button title="Edit" onClick={() => openEdit(rec)}
                        style={{ padding: '3px 6px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Edit2 size={11} />
                      </button>
                      {/* Toggle */}
                      <button title={rec.is_active ? 'Deactivate' : 'Activate'} onClick={() => handleToggle(rec)}
                        style={{ padding: '3px 6px', background: rec.is_active ? '#f59e0b' : '#10b981', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        {rec.is_active ? <ToggleRight size={11} /> : <ToggleLeft size={11} />}
                      </button>
                      {/* Soft delete */}
                      <button title="Deactivate" onClick={() => handleSoftDelete(rec)}
                        style={{ padding: '3px 6px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={11} />
                      </button>
                      {/* Hard delete */}
                      <button title="Permanently Delete" onClick={() => handleHardDelete(rec)}
                        style={{ padding: '3px 6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: 9 }}>
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8, flexShrink: 0 }} />
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER – FORM VIEW
  // ══════════════════════════════════════════════════════════════════════════
  const renderForm = () => (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">

      {/* Header */}
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 24, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>
          🏷️ {editId ? 'Edit Item Type' : 'New Item Type'}
        </h2>
        <button onClick={() => setView('list')}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <X size={14} />
        </button>
      </div>

      {/* Form body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>

        {/* Code — Auto-generated preview (GL-style, read-only on create) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#000', minWidth: 130 }}>
            Code
          </label>
          <div style={{ flex: 1 }}>
            {editId ? (
              /* Edit mode — show current code as editable (same as GL) */
              <>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                  maxLength={30}
                  style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', fontSize: 11, borderRadius: 2, color: '#000', fontFamily: 'monospace', letterSpacing: 1 }}
                />
                <p style={{ margin: '3px 0 0', fontSize: 9, color: '#6b7280' }}>Code can be updated manually.</p>
              </>
            ) : (
              /* Create mode — live preview, auto-generated by backend */
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {form.name.trim() ? (
                  <span style={{
                    display: 'inline-block', padding: '3px 14px',
                    background: '#ede9fe', color: '#7c3aed',
                    border: '1px solid #a78bfa',
                    borderRadius: '99px',
                    fontSize: 12, fontWeight: 800, letterSpacing: '0.08em',
                    fontFamily: 'monospace',
                  }}>
                    {generateItemTypeCode(form.name)}
                  </span>
                ) : (
                  <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>
                    Type a Name above to preview the auto-generated code
                  </span>
                )}
                <span style={{ fontSize: 9, color: '#6b7280' }}>
                  Auto-generated from Name — no input needed
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#000', minWidth: 130 }}>
            Name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div style={{ flex: 1 }}>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: toTitleInput(e.target.value) }))}
              placeholder="e.g. Raw Material"
              maxLength={150}
              style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', fontSize: 11, borderRadius: 2, color: '#000' }}
            />
            {editId && (
              <p style={{ margin: '3px 0 0', fontSize: 9, color: '#f59e0b' }}>
                ⚠️ Changing the name will be logged in the name-change history.
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#000', minWidth: 130, paddingTop: 4 }}>Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Optional — describe when to use this item type…"
            rows={4}
            style={{ flex: 1, padding: '4px 6px', border: '1px solid #ccc', fontSize: 11, borderRadius: 2, color: '#000', resize: 'vertical' }}
          />
        </div>

        {/* Info box */}
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '8px 12px', fontSize: 10, color: '#0369a1' }}>
          <strong>💡 Note:</strong> Item Types created here will appear in the Item Code Creation Request dropdown. 
          Every name change is permanently logged with timestamp and user info.
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0, background: '#f9fafb' }}>
        <button onClick={() => setView('list')}
          style={{ padding: '5px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '5px 20px', background: saving ? '#9ca3af' : '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Save size={13} />
          {saving ? 'Saving…' : editId ? 'Update Type' : 'Save Type'}
        </button>
      </div>

      {/* Footer */}
      <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8, flexShrink: 0 }} />
    </div>
  );

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [['#', 'Code', 'Name', 'Description', 'Status', 'Created By', 'Updated By', 'Created At', 'Updated At']];
    filtered.forEach((r, i) => rows.push([
      i + 1, r.code, r.name,
      r.description || '',
      r.is_active ? 'Active' : 'Inactive',
      r.creator?.full_name || r.creator?.username || r.created_by || '',
      r.updater?.full_name || r.updater?.username || r.updated_by || '',
      r.created_at ? new Date(r.created_at).toLocaleString() : '',
      r.updated_at ? new Date(r.updated_at).toLocaleString() : '',
    ]));
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `item_type_master_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  ROOT RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {view === 'list' ? renderList() : renderForm()}

      {/* Confirm modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          confirmColor={confirmModal.confirmColor}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}

      {/* History panel */}
      {historyRecord && (
        <HistoryPanel
          history={historyRecord.name_history || []}
          onClose={() => setHistoryRecord(null)}
          onRestore={(restoredName) => {
            openEdit(historyRecord);
            setForm(f => ({ ...f, name: restoredName }));
            setHistoryRecord(null);
          }}
        />
      )}

      {/* ══ EXCEL IMPORT POPUP ══ */}
      <ExcelImportPopup
        isOpen={showImportPopup}
        onClose={() => setShowImportPopup(false)}
        onSuccess={(results) => {
          const cnt = results.filter(r => r.status === 'success').length;
          if (cnt > 0) {
            showToast(`✅ ${cnt} Item Type(s) imported from Excel!`);
            loadRecords();
          }
        }}
        title="Import Item Types from Excel"
        accentColor="#8b5cf6"
        apiEndpoint={`${API_BASE}/item-type-master/`}
        apiMethod="POST"
        fields={[
          { key: 'name',        label: 'Name',        required: true  },
          { key: 'description', label: 'Description', required: false },
        ]}
        extraFormData={user?.id ? { user_id: user.id } : {}}
        importNote="Item Type Code is always auto-generated from Name — no need to include it in your Excel."
      />
    </div>
  );
};

export default ItemTypeMaster;