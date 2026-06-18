import React, { useState, useEffect } from 'react';
import { Search, X, Plus, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';
const USER_ID  = 1; // replace with your auth context user id

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999, background: type === 'success' ? '#16a34a' : '#dc2626', color: '#fff', padding: '10px 16px', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,.25)' }}>
      {type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
      {msg}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={12} /></button>
    </div>
  );
};

// ─── LOV Modal (same style as SonataCustomFields) ─────────────────────────────
const LOVModal = ({ title, data, multiSelect = false, selected = [], onSelect, onClose }) => {
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [localSel, setLocalSel]       = useState(selected.map(s => s.id));
  const PER_PAGE = 5;

  const filtered = data.filter(d =>
    d.code.toLowerCase().includes(search.toLowerCase()) ||
    d.name.toLowerCase().includes(search.toLowerCase())
  );
  const total = Math.ceil(filtered.length / PER_PAGE);
  const paged  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggle = (item) => {
    if (!multiSelect) { onSelect([item]); return; }
    setLocalSel(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: 500, maxWidth: '90%', height: multiSelect ? 360 : 300, background: '#fff', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(to right,#374151,#60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32 }}>
          <span>{title}{multiSelect && ' (Multiple)'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#000' }}>Search</span>
          <input autoFocus value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={`Enter ${title} for Search`}
            style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#333' }} />
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                {multiSelect && <th style={{ width: 28, padding: '6px 10px' }}></th>}
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Code</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Name</th>
              </tr>
            </thead>
            <tbody>
              {paged.length > 0 ? paged.map((item, i) => {
                const checked = localSel.includes(item.id);
                return (
                  <tr key={item.id} onClick={() => toggle(item)}
                    style={{ cursor: 'pointer', background: checked ? '#dbeafe' : (i % 2 ? '#f9fafb' : '#fff') }}
                    onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#dbeafe'; }}
                    onMouseLeave={e => { if (!checked) e.currentTarget.style.background = i % 2 ? '#f9fafb' : '#fff'; }}>
                    {multiSelect && <td style={{ padding: '6px 10px', textAlign: 'center' }}><input type="checkbox" checked={checked} readOnly /></td>}
                    <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.code}</td>
                    <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.name}</td>
                  </tr>
                );
              }) : <tr><td colSpan={multiSelect ? 3 : 2} style={{ padding: 30, textAlign: 'center', fontSize: 10, color: '#999' }}>No results found</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '4px 12px', fontSize: 10, background: page === 1 ? '#e5e7eb' : '#3b82f6', color: page === 1 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
          <span style={{ fontSize: 10, color: '#000' }}>Page {page} of {total || 1}</span>
          {multiSelect
            ? <button onClick={() => onSelect(data.filter(d => localSel.includes(d.id)))}
                style={{ padding: '4px 12px', fontSize: 10, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Confirm ({localSel.length})</button>
            : <button onClick={() => setPage(p => Math.min(total || 1, p + 1))} disabled={page >= total}
                style={{ padding: '4px 12px', fontSize: 10, background: page >= total ? '#e5e7eb' : '#3b82f6', color: page >= total ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: page >= total ? 'not-allowed' : 'pointer' }}>Next</button>}
        </div>
        <div style={{ background: 'linear-gradient(to right,#60a5fa,#374151)', height: 8 }} />
      </div>
    </div>
  );
};

// ─── Chips ────────────────────────────────────────────────────────────────────
const Chips = ({ items, onRemove }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
    {items.map(item => (
      <span key={item.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#dbeafe', color: '#1d4ed8', fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 10 }}>
        {item.code} — {item.name}
        <button onClick={() => onRemove(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={9} color="#1d4ed8" /></button>
      </span>
    ))}
  </div>
);

// ─── LOV Input Field ──────────────────────────────────────────────────────────
const LOVField = ({ label, required, value, onOpen, onClear, chips, onRemoveChip }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
    <label style={{ fontSize: 11, color: '#000', minWidth: 140, paddingTop: 3 }}>
      {label} {required && <span style={{ color: '#d00' }}>*</span>}
    </label>
    <div style={{ flex: 1 }}>
      <div style={{ position: 'relative' }}>
        <input readOnly value={value} placeholder={`Enter ${label} for Search`} onClick={onOpen}
          style={{ width: '100%', padding: '3px 45px 3px 6px', border: '1px solid #999', fontSize: 11, borderRadius: 2, cursor: 'pointer', color: '#333', boxSizing: 'border-box' }} />
        {value && <button onClick={onClear} style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X size={12} color="#ef4444" /></button>}
        <button onClick={onOpen} style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}><Search size={14} color="#666" /></button>
      </div>
      {chips && chips.length > 0 && <Chips items={chips} onRemove={onRemoveChip} />}
    </div>
  </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const SonataItemGradePage = () => {
  const [companies, setCompanies]           = useState([]);
  const [allPlants, setAllPlants]           = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [selectedPlants, setSelectedPlants] = useState([]);
  const [records, setRecords]               = useState([]);
  const [name, setName]                     = useState('');
  const [description, setDescription]       = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const [loading, setLoading]               = useState(false);
  const [modal, setModal]                   = useState(null); // 'company' | 'plant'
  const [toast, setToast]                   = useState(null);

  const plants = selectedCompanies.length ? allPlants : [];
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // Load companies
  useEffect(() => {
    fetch(`${API_BASE}/companies`)
      .then(r => r.json())
      .then(j => setCompanies((j || []).map(c => ({ id: c.id, code: c.company_code, name: c.company_name }))))
      .catch(() => setCompanies([]));
  }, []);

  // Load plants when companies change
  useEffect(() => {
    if (!selectedCompanies.length) { setAllPlants([]); return; }
    const companyId = selectedCompanies[0].id;
    fetch(`${API_BASE}/plants?company_id=${companyId}`)
      .then(r => r.json())
      .then(j => setAllPlants((j || []).map(p => ({ id: p.id, code: p.plant_code, name: p.plant_name }))))
      .catch(() => setAllPlants([]));
  }, [selectedCompanies]);

  // Load records
  const loadRecords = () => {
    setLoading(true);
    fetch(`${API_BASE}/sonata-item-grade/by-user/${USER_ID}`)
      .then(r => r.json()).then(j => setRecords(j.data || [])).catch(() => setRecords([])).finally(() => setLoading(false));
  };
  useEffect(() => { loadRecords(); }, []);

  const handleSubmit = async () => {
    if (!selectedCompanies.length) { showToast('Please select at least one Company', 'error'); return; }
    if (!name.trim()) { showToast('Please enter Name', 'error'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('description', description.trim());
      fd.append('company_ids', selectedCompanies.map(c => c.id).join(','));
      fd.append('plant_ids', selectedPlants.map(p => p.id).join(','));
      fd.append('user_id', USER_ID);
      const res  = await fetch(`${API_BASE}/sonata-item-grade`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      showToast(`Item Grade '${data.code}' created successfully!`);
      setName(''); setDescription(''); setSelectedCompanies([]); setSelectedPlants([]);
      loadRecords();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (record) => {
    const fd = new FormData();
    fd.append('is_active', !record.is_active);
    fd.append('user_id', USER_ID);
    await fetch(`${API_BASE}/sonata-item-grade/${record.id}`, { method: 'PUT', body: fd });
    setRecords(prev => prev.map(r => r.id === record.id ? { ...r, is_active: !r.is_active } : r));
    showToast(`Status updated`);
  };

  return (
    <div style={{ width: '100%', padding: 0, margin: 0, position: 'relative' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#000' }}>Item Grade</h3>
      </div>

      {/* ADD FORM */}
      <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 4, padding: '12px 14px', marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#374151', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add New Item Grade</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>

          {/* Company LOV */}
          <LOVField label="Company" required
            value=""
            onOpen={() => setModal('company')}
            onClear={() => { setSelectedCompanies([]); setSelectedPlants([]); }}
            chips={selectedCompanies}
            onRemoveChip={id => { setSelectedCompanies(p => p.filter(c => c.id !== id)); setSelectedPlants([]); }}
          />

          {/* Plant LOV */}
          <LOVField label="Plant (optional)"
            value=""
            onOpen={() => { if (selectedCompanies.length) setModal('plant'); }}
            onClear={() => setSelectedPlants([])}
            chips={selectedPlants}
            onRemoveChip={id => setSelectedPlants(p => p.filter(pl => pl.id !== id))}
          />

          {/* Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>Name <span style={{ color: '#d00' }}>*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Grade A - Premium"
              style={{ flex: 1, padding: '3px 6px', border: '1px solid #999', fontSize: 11, borderRadius: 2, color: '#333' }} />
          </div>

          {/* Description */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#000', minWidth: 140, paddingTop: 3 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Enter description (optional)"
              style={{ flex: 1, padding: '4px 6px', border: '1px solid #999', fontSize: 11, borderRadius: 2, resize: 'vertical', color: '#333' }} />
          </div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSubmit} disabled={submitting}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 16px', background: submitting ? '#93c5fd' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />}
            {submitting ? 'Adding…' : 'Add Item Grade'}
          </button>
        </div>
      </div>

      {/* RECORDS TABLE */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, fontSize: 11, color: '#9ca3af' }}>Loading…</div>
      ) : records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, fontSize: 11, color: '#9ca3af', border: '1px dashed #e5e7eb', borderRadius: 4 }}>No records found.</div>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(to right,#f8fafc,#f1f5f9)' }}>
                {['#', 'Code', 'Name', 'Description', 'Companies', 'Plants', 'Status', 'Created By', 'Created At', 'Action'].map(h => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={{ padding: '6px 10px', fontSize: 10, color: '#9ca3af' }}>{i + 1}</td>
                  <td style={{ padding: '6px 10px', fontSize: 10, color: '#1d4ed8', fontFamily: 'monospace', fontWeight: 600 }}>{r.code}</td>
                  <td style={{ padding: '6px 10px', fontSize: 10, color: '#333', fontWeight: 500 }}>{r.name}</td>
                  <td style={{ padding: '6px 10px', fontSize: 10, color: '#6b7280', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description || <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>—</span>}</td>
                  <td style={{ padding: '6px 10px', fontSize: 10 }}>
                    {r.companies.map(c => <span key={c.id} style={{ display: 'inline-block', background: '#eff6ff', color: '#1d4ed8', fontSize: 9, padding: '1px 5px', borderRadius: 8, marginRight: 2 }}>{c.code}</span>)}
                  </td>
                  <td style={{ padding: '6px 10px', fontSize: 10 }}>
                    {r.plants.length ? r.plants.map(p => <span key={p.id} style={{ display: 'inline-block', background: '#f0fdf4', color: '#16a34a', fontSize: 9, padding: '1px 5px', borderRadius: 8, marginRight: 2 }}>{p.code}</span>) : <span style={{ color: '#d1d5db', fontStyle: 'italic', fontSize: 9 }}>—</span>}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: r.is_active ? '#dcfce7' : '#fee2e2', color: r.is_active ? '#16a34a' : '#dc2626' }}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px', fontSize: 10, color: '#6b7280' }}>{r.created_by_name || '-'}</td>
                  <td style={{ padding: '6px 10px', fontSize: 10, color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <button onClick={() => handleToggle(r)}
                      style={{ fontSize: 9, padding: '2px 8px', border: 'none', borderRadius: 3, cursor: 'pointer', background: r.is_active ? '#fef3c7' : '#dcfce7', color: r.is_active ? '#d97706' : '#16a34a', fontWeight: 600 }}>
                      {r.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODALS */}
      {modal === 'company' && (
        <LOVModal title="COMPANY" data={companies} multiSelect selected={selectedCompanies}
          onSelect={items => { setSelectedCompanies(items); setModal(null); }}
          onClose={() => setModal(null)} />
      )}
      {modal === 'plant' && (
        <LOVModal title="PLANT" data={plants} multiSelect selected={selectedPlants}
          onSelect={items => { setSelectedPlants(items); setModal(null); }}
          onClose={() => setModal(null)} />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
};

export default SonataItemGradePage;
