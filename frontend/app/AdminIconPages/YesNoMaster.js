/**
 * YesNoMaster.js
 * Each YES/NO pair = 2 rows in DB, each with own PK.
 * API uses yes_no_pair_id for all CRUD operations.
 * Exact same header/footer style as ItemCodeCreationReq.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Plus, Edit2, Trash2, Eye, RefreshCw, Save, AlertCircle, CheckCircle } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const getSession = () => {
  try { const d = JSON.parse(sessionStorage.getItem('userData') || '{}'); return d?.user || null; }
  catch { return null; }
};

// ─── Toast (exact Item Master style) ─────────────────────────────────────────
const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      zIndex: 99999, background: type === 'success' ? '#10b981' : '#ef4444',
      color: '#fff', padding: '14px 24px', borderRadius: 8, fontSize: 13, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,.35)'
    }}>
      {type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
      {msg}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
const YesNoMaster = () => {
  const user = getSession();

  const [view, setView]               = useState('list');
  const [records, setRecords]         = useState([]);   // paired records
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState(null);
  const [editRecord, setEditRecord]   = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);
  const [searchTerm, setSearchTerm]   = useState('');
  const [filterActive, setFilterActive] = useState('all');

  const EMPTY = { yes_label: '', no_label: '' };
  const [form, setForm]           = useState(EMPTY);
  const [formErrors, setFormErrors] = useState({});

  // ── fetch pairs ───────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 500 });
      if (filterActive === 'active')   params.set('is_active', 'true');
      if (filterActive === 'inactive') params.set('is_active', 'false');
      if (searchTerm) params.set('search', searchTerm);
      const res  = await fetch(`${API_BASE}/yes-no-master/?${params}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch { showToast('Failed to load records', 'error'); }
    setLoading(false);
  }, [filterActive, searchTerm]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const showToast  = (msg, type = 'success') => setToast({ msg, type });
  const openCreate = () => { setEditRecord(null); setForm(EMPTY); setFormErrors({}); setView('form'); };
  const openEdit   = (rec) => { setEditRecord(rec); setForm({ yes_label: rec.yes_label, no_label: rec.no_label }); setFormErrors({}); setView('form'); };
  const openDetail = (rec) => { setDetailRecord(rec); setView('detail'); };
  const backToList = () => { setView('list'); setDetailRecord(null); setEditRecord(null); };

  const validate = () => {
    const errs = {};
    if (!form.yes_label.trim()) errs.yes_label = 'Yes label is required';
    if (!form.no_label.trim())  errs.no_label  = 'No label is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editRecord) {
        // PUT — update pair by yes_no_pair_id
        const res = await fetch(`${API_BASE}/yes-no-master/${editRecord.yes_no_pair_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            yes_label:  form.yes_label.trim(),
            no_label:   form.no_label.trim(),
            updated_by: user?.id || null,
          }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Update failed'); }
        showToast('Record updated successfully');
      } else {
        // POST — create pair via FormData
        const fd = new FormData();
        fd.append('yes_label', form.yes_label.trim());
        fd.append('no_label',  form.no_label.trim());
        if (user?.id) fd.append('created_by', user.id);
        const res = await fetch(`${API_BASE}/yes-no-master/`, { method: 'POST', body: fd });
        if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Create failed'); }
        showToast('Record created successfully');
      }
      backToList();
      fetchRecords();
    } catch (e) { showToast(e.message || 'Save failed', 'error'); }
    setSaving(false);
  };

  const handleToggle = async (rec) => {
    try {
      const res = await fetch(`${API_BASE}/yes-no-master/${rec.yes_no_pair_id}/toggle?updated_by=${user?.id || ''}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Toggle failed');
      showToast(`Pair ${rec.is_active ? 'deactivated' : 'activated'}`);
      fetchRecords();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleSoftDelete = async (rec) => {
    if (!window.confirm(`Deactivate "${rec.yes_label} / ${rec.no_label}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/yes-no-master/${rec.yes_no_pair_id}?updated_by=${user?.id || ''}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Record deactivated');
      fetchRecords();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleHardDelete = async (rec) => {
    if (!window.confirm(`PERMANENTLY delete "${rec.yes_label} / ${rec.no_label}"? Cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/yes-no-master/${rec.yes_no_pair_id}/hard`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Record permanently deleted');
      fetchRecords();
      if (view === 'detail') backToList();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtFull = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  // ── shared header style ───────────────────────────────────────────────────
  const HDR = {
    background: 'linear-gradient(to right, #374151, #60a5fa)',
    color: '#fff', padding: '0 8px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: 24, flexShrink: 0,
  };
  const FTR = { background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8, flexShrink: 0 };

  // ══════════════════════════════════════════════════════════════════════════
  //  LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  const renderList = () => (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">

      <div style={HDR}>
        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Yes / No Master ✅</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button title="Refresh" onClick={fetchRecords}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={openCreate}
            style={{ padding: '2px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={12} /> New
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search yes / no labels…"
              style={{ width: '100%', padding: '5px 28px 5px 8px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 4, outline: 'none', color: '#374151', boxSizing: 'border-box' }} />
            {searchTerm
              ? <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={13} color="#9ca3af" /></button>
              : <Search size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            }
          </div>
          {['all', 'active', 'inactive'].map(f => (
            <button key={f} onClick={() => setFilterActive(f)}
              style={{ padding: '3px 10px', fontSize: 10, borderRadius: 3, cursor: 'pointer', fontWeight: 600, border: 'none', background: filterActive === f ? '#374151' : '#e5e7eb', color: filterActive === f ? '#fff' : '#6b7280', textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
          <span style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap' }}>{records.length} pair{records.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 28 }}>⏳</div>
            <div style={{ fontSize: 11, color: '#666' }}>Loading…</div>
          </div>
        ) : records.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 32 }}>✅</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>No records found.</div>
            <button onClick={openCreate} style={{ padding: '4px 14px', background: '#374151', color: '#fff', border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>+ Create First Record</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', position: 'sticky', top: 0 }}>
                {['#', 'Yes ID', 'Yes Label', 'No ID', 'No Label', 'Pair ID', 'Status', 'Created By', 'Created At', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((rec, idx) => (
                <tr key={rec.yes_no_pair_id}
                  style={{ background: idx % 2 ? '#f9fafb' : '#fff', borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 ? '#f9fafb' : '#fff'}>
                  <td style={{ padding: '5px 8px', color: '#9ca3af', fontSize: 10 }}>{idx + 1}</td>
                  {/* Yes ID */}
                  <td style={{ padding: '5px 8px' }}>
                    <span style={{ background: '#d1fae5', color: '#065f46', padding: '1px 7px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>#{rec.yes_id}</span>
                  </td>
                  {/* Yes Label */}
                  <td style={{ padding: '5px 8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                      ✅ {rec.yes_label}
                    </span>
                  </td>
                  {/* No ID */}
                  <td style={{ padding: '5px 8px' }}>
                    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '1px 7px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>#{rec.no_id}</span>
                  </td>
                  {/* No Label */}
                  <td style={{ padding: '5px 8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                      ❌ {rec.no_label}
                    </span>
                  </td>
                  {/* Pair ID */}
                  <td style={{ padding: '5px 8px', color: '#6b7280', fontSize: 10, fontWeight: 600 }}>P-{rec.yes_no_pair_id}</td>
                  {/* Status */}
                  <td style={{ padding: '5px 8px' }}>
                    <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: rec.is_active ? '#d1fae5' : '#fee2e2', color: rec.is_active ? '#065f46' : '#991b1b' }}>
                      {rec.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '5px 8px', color: '#6b7280', fontSize: 10 }}>
                    {rec.creator?.full_name || rec.creator?.username || (rec.created_by ? `User #${rec.created_by}` : '—')}
                  </td>
                  <td style={{ padding: '5px 8px', color: '#6b7280', fontSize: 10, whiteSpace: 'nowrap' }}>{fmtDate(rec.created_at)}</td>
                  <td style={{ padding: '5px 8px' }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                      <button onClick={() => openDetail(rec)} title="View"
                        style={{ background: '#e0f2fe', border: 'none', color: '#0369a1', borderRadius: 3, padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Eye size={11} /></button>
                      <button onClick={() => openEdit(rec)} title="Edit"
                        style={{ background: '#fef3c7', border: 'none', color: '#92400e', borderRadius: 3, padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Edit2 size={11} /></button>
                      <button onClick={() => handleToggle(rec)} title={rec.is_active ? 'Deactivate' : 'Activate'}
                        style={{ background: rec.is_active ? '#fce7f3' : '#d1fae5', border: 'none', color: rec.is_active ? '#9d174d' : '#065f46', borderRadius: 3, padding: '3px 6px', cursor: 'pointer', fontSize: 10 }}>
                        {rec.is_active ? '🔴' : '🟢'}
                      </button>
                      <button onClick={() => handleSoftDelete(rec)} title="Deactivate"
                        style={{ background: '#fee2e2', border: 'none', color: '#991b1b', borderRadius: 3, padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={FTR} />
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  FORM VIEW
  // ══════════════════════════════════════════════════════════════════════════
  const renderForm = () => (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      <div style={HDR}>
        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>
          {editRecord ? '✏️ Edit Yes / No Record' : '➕ New Yes / No Record'}
        </h2>
        <button onClick={backToList}
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <X size={11} /> Cancel
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 12px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

          <div style={{ marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Yes / No Labels</span>
            <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 8 }}>Each label gets its own unique ID in the database</span>
          </div>

          {/* YES */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Yes Label <span style={{ color: '#ef4444' }}>*</span>
              {editRecord && <span style={{ marginLeft: 6, fontSize: 9, color: '#6b7280', fontWeight: 400 }}>ID: #{editRecord.yes_id}</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 13 }}>✅</span>
              <input type="text" value={form.yes_label}
                onChange={e => setForm(f => ({ ...f, yes_label: e.target.value.toUpperCase() }))}
                placeholder="E.G. YES, APPLICABLE, ACTIVE…"
                style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, fontSize: 11, border: `1px solid ${formErrors.yes_label ? '#ef4444' : '#d1d5db'}`, borderRadius: 4, color: '#374151', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#60a5fa'}
                onBlur={e => e.target.style.borderColor = formErrors.yes_label ? '#ef4444' : '#d1d5db'}
              />
            </div>
            {formErrors.yes_label && <p style={{ margin: '2px 0 0', fontSize: 10, color: '#ef4444' }}>{formErrors.yes_label}</p>}
          </div>

          {/* NO */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              No Label <span style={{ color: '#ef4444' }}>*</span>
              {editRecord && <span style={{ marginLeft: 6, fontSize: 9, color: '#6b7280', fontWeight: 400 }}>ID: #{editRecord.no_id}</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 13 }}>❌</span>
              <input type="text" value={form.no_label}
                onChange={e => setForm(f => ({ ...f, no_label: e.target.value.toUpperCase() }))}
                placeholder="E.G. NO, NOT APPLICABLE, INACTIVE…"
                style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, fontSize: 11, border: `1px solid ${formErrors.no_label ? '#ef4444' : '#d1d5db'}`, borderRadius: 4, color: '#374151', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#60a5fa'}
                onBlur={e => e.target.style.borderColor = formErrors.no_label ? '#ef4444' : '#d1d5db'}
              />
            </div>
            {formErrors.no_label && <p style={{ margin: '2px 0 0', fontSize: 10, color: '#ef4444' }}>{formErrors.no_label}</p>}
          </div>

          {/* Preview */}
          {(form.yes_label || form.no_label) && (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 12px', marginBottom: 16 }}>
              <p style={{ margin: '0 0 6px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px' }}>Preview</p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {form.yes_label && <span style={{ background: '#d1fae5', color: '#065f46', padding: '3px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>✅ {form.yes_label}</span>}
                {form.no_label  && <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>❌ {form.no_label}</span>}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={backToList}
              style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', borderRadius: 4, padding: '5px 16px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ background: saving ? '#9ca3af' : '#10b981', border: 'none', color: '#fff', borderRadius: 4, padding: '5px 18px', fontSize: 11, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Save size={11} /> {saving ? 'Saving…' : editRecord ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>

      <div style={FTR} />
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════════════
  const renderDetail = () => {
    const rec = detailRecord;
    if (!rec) return null;
    return (
      <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
        <div style={HDR}>
          <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>🔍 Yes / No Record — Detail</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => openEdit(rec)}
              style={{ background: '#f59e0b', border: 'none', color: '#fff', borderRadius: 3, padding: '2px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Edit2 size={10} /> Edit
            </button>
            <button onClick={() => handleHardDelete(rec)}
              style={{ background: '#ef4444', border: 'none', color: '#fff', borderRadius: 3, padding: '2px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Trash2 size={10} /> Delete
            </button>
            <button onClick={backToList}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 3, padding: '2px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              <X size={10} /> Close
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px 12px' }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>Pair ID: <b style={{ color: '#374151' }}>P-{rec.yes_no_pair_id}</b></span>
              <span style={{ background: rec.is_active ? '#d1fae5' : '#fee2e2', color: rec.is_active ? '#065f46' : '#991b1b', padding: '2px 10px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                {rec.is_active ? '● Active' : '● Inactive'}
              </span>
            </div>

            {/* Big pills with IDs */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px' }}>Yes Option</p>
                <p style={{ margin: '0 0 6px', fontSize: 9, color: '#6b7280' }}>ID: <b>#{rec.yes_id}</b></p>
                <span style={{ display: 'inline-block', background: '#d1fae5', color: '#065f46', padding: '8px 24px', borderRadius: 24, fontSize: 14, fontWeight: 800, border: '2px solid #6ee7b7' }}>
                  ✅ {rec.yes_label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: '#d1d5db', fontSize: 20 }}>/</div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px' }}>No Option</p>
                <p style={{ margin: '0 0 6px', fontSize: 9, color: '#6b7280' }}>ID: <b>#{rec.no_id}</b></p>
                <span style={{ display: 'inline-block', background: '#fee2e2', color: '#991b1b', padding: '8px 24px', borderRadius: 24, fontSize: 14, fontWeight: 800, border: '2px solid #fca5a5' }}>
                  ❌ {rec.no_label}
                </span>
              </div>
            </div>

            {/* Audit */}
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                {[
                  ['Created By', rec.creator?.full_name || rec.creator?.username || (rec.created_by ? `User #${rec.created_by}` : '—')],
                  ['Updated By', rec.updater?.full_name || rec.updater?.username || (rec.updated_by ? `User #${rec.updated_by}` : '—')],
                  ['Created At', fmtFull(rec.created_at)],
                  ['Updated At', fmtFull(rec.updated_at)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#374151' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={FTR} />
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {view === 'list'   && renderList()}
      {view === 'form'   && renderForm()}
      {view === 'detail' && renderDetail()}
    </div>
  );
};

export default YesNoMaster;