import React, { useState, useEffect, useCallback } from 'react';
import {
  Building, Factory, DollarSign, Search, Eye, CheckCircle, XCircle,
  AlertCircle, Loader, Grid, List, Plus, Save, Info, Globe, Upload,
  ChevronRight,
} from 'lucide-react';
import ExcelImportPopup from '../pages/ExcelImportPopup';

const API_BASE = 'http://localhost:8000/api';

// ─── Design tokens ──────────────────────────────────────────────────────────
const COLOR      = '#8b5cf6';
const COLOR_MED  = '#a78bfa';
const COLOR_SOFT = '#ede9fe';

// ─── Styles ─────────────────────────────────────────────────────────────────
const S = {
  input:  { width: '100%', padding: '6px 8px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '10px', boxSizing: 'border-box', color: '#000', outline: 'none' },
  select: { width: '100%', padding: '6px 8px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '10px', boxSizing: 'border-box', color: '#000', cursor: 'pointer', outline: 'none', background: 'white' },
  label:  { display: 'block', fontSize: '9px', fontWeight: '700', marginBottom: '4px', color: '#374151' },
};

// ─── Pill button ─────────────────────────────────────────────────────────────
const pillBtn = (selected, accentColor) => {
  const c = accentColor || COLOR;
  return {
    padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
    border: selected ? `2px solid ${c}` : '1px solid #d1d5db',
    background: selected ? c : 'white',
    color: selected ? 'white' : '#374151',
    fontSize: '10px', fontWeight: '600',
    display: 'inline-flex', alignItems: 'center', gap: '4px',
  };
};

// ─── Step header ─────────────────────────────────────────────────────────────
function StepHeader({ num, title, subtitle, done, locked }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <div style={{
        width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? '#16a34a' : locked ? '#e5e7eb' : COLOR,
        color: 'white', fontSize: '10px', fontWeight: '800',
      }}>
        {done ? <CheckCircle size={12} /> : num}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: locked ? '#9ca3af' : '#111' }}>{title}</p>
        {subtitle && <p style={{ margin: 0, fontSize: '8px', color: '#9ca3af' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Step box wrapper ────────────────────────────────────────────────────────
function StepBox({ locked, children }) {
  return (
    <div style={{
      border: `1px solid ${locked ? '#e5e7eb' : COLOR_SOFT}`,
      borderRadius: '8px', padding: '12px', marginBottom: '10px',
      background: locked ? '#fafafa' : 'white',
      opacity: locked ? 0.45 : 1,
      pointerEvents: locked ? 'none' : 'auto',
      transition: 'opacity 0.2s',
    }}>
      {children}
    </div>
  );
}

// ─── Hierarchy Badge ─────────────────────────────────────────────────────────
function HierarchyBadge({ parts }) {
  const visible = parts.filter(p => p.label);
  if (!visible.length) return null;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px', fontSize: '8px', fontWeight: '700', fontFamily: 'monospace' }}>
      {visible.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={9} style={{ color: '#9ca3af' }} />}
          <span style={{ padding: '2px 7px', background: p.bg || COLOR_SOFT, color: p.color || COLOR, borderRadius: '10px' }}>{p.label}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Auto-generate GL code preview ─────────────────────────────────────────
function buildGLCodePreview(companyCode, glName) {
  if (!companyCode || !glName) return '';
  const alpha = glName.toUpperCase().replace(/[^A-Z]/g, '');
  const base  = (alpha.substring(0, 4)).padEnd(4, 'X');
  return `${companyCode.toUpperCase()}-GL${base}-####`;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function AddGLMaster() {
  const [loading,      setLoading]      = useState(false);
  const [message,      setMessage]      = useState(null);
  const [currentUser,  setCurrentUser]  = useState(null);
  const [backendError, setBackendError] = useState(false);

  // ── Master data ────────────────────────────────────────────────────────────
  const [companiesWithPlants, setCompaniesWithPlants] = useState([]);
  const [glTypes,             setGLTypes]             = useState([]);
  const [glSubTypes,          setGLSubTypes]          = useState([]);
  const [glCategories,        setGLCategories]        = useState([]);
  const [glSubCategories,     setGLSubCategories]     = useState([]);
  const [glHeads,             setGLHeads]             = useState([]);
  const [existingGLAccounts,  setExistingGLAccounts]  = useState([]);

  // ── CREATE FORM — step states ──────────────────────────────────────────────
  const [selCompanyId,   setSelCompanyId]   = useState('');
  const [isCompanyWide,  setIsCompanyWide]  = useState(true);
  const [selPlant,       setSelPlant]       = useState('');
  const [selTypeId,      setSelTypeId]      = useState('');
  const [selSubTypeId,   setSelSubTypeId]   = useState('');    // '' or '__none__' or id
  const [selCategoryId,  setSelCategoryId]  = useState('');   // '' or '__none__' or id
  const [selSubCatId,    setSelSubCatId]    = useState('');
  const [selHeadId,      setSelHeadId]      = useState('');
  const [glName,         setGLName]         = useState('');
  const [glCodeOverride, setGLCodeOverride] = useState('');
  const [currencyCode,   setCurrencyCode]   = useState('');
  const [remarks,        setRemarks]        = useState('');

  // ── VIEW state ─────────────────────────────────────────────────────────────
  const [viewMode,        setViewMode]        = useState('grid');
  const [searchTerm,      setSearchTerm]      = useState('');
  const [activeTab,       setActiveTab]       = useState('create');
  const [filterCompanyId, setFilterCompanyId] = useState('');

  // ── IMPORT state ────────────────────────────────────────────────────────────
  const [importMode,         setImportMode]         = useState(null);  // null | 'stepwise' | 'full'
  const [showImportSelector, setShowImportSelector] = useState(false);
  const [showImportPopup,    setShowImportPopup]    = useState(false);
  const [impCompanyId,    setImpCompanyId]    = useState('');
  const [impCompanyWide,  setImpCompanyWide]  = useState(true);
  const [impPlantId,      setImpPlantId]      = useState('');
  const [impTypeId,       setImpTypeId]       = useState('');
  const [impSubTypeId,    setImpSubTypeId]    = useState('');
  const [impCategoryId,   setImpCategoryId]   = useState('');
  const [impSubCatId,     setImpSubCatId]     = useState('');
  const [impHeadId,       setImpHeadId]       = useState('');

  // ── Derived: create form ────────────────────────────────────────────────────
  const selCompany  = companiesWithPlants.find(c => c.company_id === parseInt(selCompanyId)) || null;
  const availPlants = selCompany?.plants || [];

  const filtSubTypes    = selTypeId     ? glSubTypes.filter(s => String(s.gl_type_id) === String(selTypeId)) : [];
  const filtCategories  = selTypeId
    ? glCategories.filter(c => {
        if (String(c.gl_type_id) !== String(selTypeId)) return false;
        if (selSubTypeId && selSubTypeId !== '__none__' && c.gl_sub_type_id && String(c.gl_sub_type_id) !== String(selSubTypeId)) return false;
        return true;
      })
    : [];
  const filtSubCats     = (selCategoryId && selCategoryId !== '__none__')
    ? glSubCategories.filter(sc => String(sc.gl_category_id) === String(selCategoryId))
    : [];
  const filtHeads       = (selSubCatId && selSubCatId !== '__none__')
    ? glHeads.filter(h => String(h.gl_sub_category_id) === String(selSubCatId))
    : (selCategoryId && selCategoryId !== '__none__')
    ? glHeads.filter(h => String(h.gl_category_id) === String(selCategoryId))
    : selTypeId
    ? glHeads.filter(h => String(h.gl_type_id) === String(selTypeId))
    : [];

  const glCodePreview = buildGLCodePreview(selCompany?.company_code, glName);

  // ── Derived: import ─────────────────────────────────────────────────────────
  const impCompany       = companiesWithPlants.find(c => c.company_id === parseInt(impCompanyId)) || null;
  const impAvailPlants   = impCompany?.plants || [];
  const impFiltCats      = impTypeId ? glCategories.filter(c => {
    if (String(c.gl_type_id) !== String(impTypeId)) return false;
    if (impSubTypeId && c.gl_sub_type_id && String(c.gl_sub_type_id) !== String(impSubTypeId)) return false;
    return true;
  }) : [];
  const impFiltSubCats   = impCategoryId ? glSubCategories.filter(sc => String(sc.gl_category_id) === String(impCategoryId)) : [];
  const impFiltHeads     = impSubCatId
    ? glHeads.filter(h => String(h.gl_sub_category_id) === String(impSubCatId))
    : impCategoryId ? glHeads.filter(h => String(h.gl_category_id) === String(impCategoryId))
    : impTypeId ? glHeads.filter(h => String(h.gl_type_id) === String(impTypeId)) : [];

  const filteredGLAccounts = existingGLAccounts.filter(gl =>
    gl.gl_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gl.gl_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Data fetching ───────────────────────────────────────────────────────────
  const safeFetch = async (url) => {
    try {
      const r = await fetch(url);
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    } catch { return []; }
  };

  const fetchGLAccounts = useCallback(async (retry = 0) => {
    if (!currentUser?.id) return;
    setBackendError(false);
    try {
      let url = `${API_BASE}/gl-accounts/by-user/${currentUser.id}`;
      if (filterCompanyId) url += `?company_id=${filterCompanyId}`;
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(tid);
      if (!res.ok) { setExistingGLAccounts([]); return; }
      const data = await res.json();
      setExistingGLAccounts(Array.isArray(data.gl_accounts) ? data.gl_accounts : []);
    } catch (err) {
      const isConn = err.name === 'AbortError' || err.message?.includes('Failed to fetch');
      if (isConn && retry === 0) {
        setMessage({ type: 'error', text: '⏳ Server waking up... Retrying in 5s.' });
        setTimeout(() => fetchGLAccounts(1), 5000);
      } else {
        setBackendError(true);
        setMessage({ type: 'error', text: 'Cannot connect to backend.' });
      }
    }
  }, [currentUser, filterCompanyId]);

  const fetchCompanies = async (userId, retry = 0) => {
    setBackendError(false);
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${API_BASE}/user/${userId}/companies-with-plants`, { signal: controller.signal });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCompaniesWithPlants(Array.isArray(data.companies) ? data.companies : []);
    } catch (err) {
      const isConn = err.name === 'AbortError' || err.message?.includes('Failed to fetch');
      if (isConn && retry === 0) {
        setMessage({ type: 'error', text: '⏳ Connecting... Retrying in 5s.' });
        setTimeout(() => fetchCompanies(userId, 1), 5000);
      } else {
        setBackendError(true);
        setMessage({ type: 'error', text: 'Cannot connect to backend.' });
      }
    }
  };

  useEffect(() => {
    const ud = sessionStorage.getItem('userData');
    if (ud) { try { setCurrentUser(JSON.parse(ud).user); } catch { setMessage({ type: 'error', text: 'Failed to load user data' }); } }
    else setMessage({ type: 'error', text: 'No user data. Please login again.' });
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      fetchCompanies(currentUser.id);
      safeFetch(`${API_BASE}/gl-types?is_active=true`).then(setGLTypes);
      safeFetch(`${API_BASE}/gl-sub-types`).then(setGLSubTypes);
      safeFetch(`${API_BASE}/gl-categories?is_active=true`).then(setGLCategories);
      safeFetch(`${API_BASE}/gl-sub-categories`).then(setGLSubCategories);
      safeFetch(`${API_BASE}/gl-heads?is_active=true`).then(setGLHeads);
    }
  }, [currentUser]);

  useEffect(() => { if (currentUser?.id) fetchGLAccounts(); }, [filterCompanyId, currentUser]);

  // Cascade resets
  useEffect(() => { setSelSubTypeId(''); setSelCategoryId(''); setSelSubCatId(''); setSelHeadId(''); }, [selTypeId]);
  useEffect(() => { setSelCategoryId(''); setSelSubCatId(''); setSelHeadId(''); }, [selSubTypeId]);
  useEffect(() => { setSelSubCatId(''); setSelHeadId(''); }, [selCategoryId]);
  useEffect(() => { setSelHeadId(''); }, [selSubCatId]);
  useEffect(() => { setImpSubTypeId(''); setImpCategoryId(''); setImpSubCatId(''); setImpHeadId(''); }, [impTypeId]);
  useEffect(() => { setImpCategoryId(''); setImpSubCatId(''); setImpHeadId(''); }, [impSubTypeId]);
  useEffect(() => { setImpSubCatId(''); setImpHeadId(''); }, [impCategoryId]);
  useEffect(() => { setImpHeadId(''); }, [impSubCatId]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setSelCompanyId(''); setIsCompanyWide(true); setSelPlant('');
    setSelTypeId(''); setSelSubTypeId(''); setSelCategoryId(''); setSelSubCatId(''); setSelHeadId('');
    setGLName(''); setGLCodeOverride(''); setCurrencyCode(''); setRemarks('');
  };

  const resetImport = () => {
    setImpCompanyId(''); setImpCompanyWide(true); setImpPlantId('');
    setImpTypeId(''); setImpSubTypeId(''); setImpCategoryId(''); setImpSubCatId(''); setImpHeadId('');
    setImportMode(null);
  };

  const handleCreate = async () => {
    if (!selCompanyId)                        { setMessage({ type: 'error', text: 'Step 1: Select a Company' }); return; }
    if (!isCompanyWide && !selPlant)          { setMessage({ type: 'error', text: 'Step 1: Select a Plant or choose Company-wide' }); return; }
    if (!selTypeId)                           { setMessage({ type: 'error', text: 'Step 2: Select GL Type' }); return; }
    if (!glName.trim())                       { setMessage({ type: 'error', text: 'Step 7: Enter GL Name' }); return; }

    setLoading(true);
    const fd = new FormData();
    fd.append('gl_name',    glName.trim());
    fd.append('company_id', selCompanyId);
    fd.append('gl_type_id', selTypeId);
    // gl_code only if user typed override, else backend auto-generates
    if (glCodeOverride.trim()) fd.append('gl_code', glCodeOverride.trim().toUpperCase());
    if (!isCompanyWide && selPlant) fd.append('plant_id', selPlant);
    if (selSubTypeId && selSubTypeId !== '__none__')  fd.append('gl_sub_type_id',     selSubTypeId);
    if (selCategoryId && selCategoryId !== '__none__') fd.append('gl_category_id',    selCategoryId);
    if (selSubCatId && selSubCatId !== '__none__')    fd.append('gl_sub_category_id', selSubCatId);
    if (selHeadId && selHeadId !== '__none__')        fd.append('gl_head_id',         selHeadId);
    fd.append('is_postable', true);
    if (currencyCode.trim()) fd.append('currency_code', currencyCode.trim().toUpperCase());
    if (remarks.trim())      fd.append('remarks', remarks.trim());
    fd.append('user_id', currentUser.id);

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${API_BASE}/gl-accounts`, { method: 'POST', body: fd, signal: controller.signal });
      clearTimeout(tid);
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `✅ GL Account "${data.gl_code}" created — ${data.scope}` });
        resetForm();
        fetchGLAccounts();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to create GL account' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.name === 'AbortError' ? 'Request timeout.' : `Error: ${err.message}` });
    } finally { setLoading(false); }
  };

  // ── Loading/error states ────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={48} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '14px', color: '#666' }}>Loading user data...</p>
        </div>
      </div>
    );
  }
  if (backendError && companiesWithPlants.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertCircle size={64} style={{ margin: '0 auto 16px', color: '#dc2626' }} />
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Backend Connection Error</h2>
          <button onClick={() => { setBackendError(false); if (currentUser?.id) fetchCompanies(currentUser.id); }}
            style={{ padding: '10px 20px', background: `linear-gradient(to right, ${COLOR}, ${COLOR_MED})`, border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: 'white' }}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '95%', maxWidth: '1200px', height: '90%', maxHeight: '700px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '0 12px', height: '32px', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `linear-gradient(to right, ${COLOR}, ${COLOR_MED})`, color: 'white', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={14} />
            <h2 style={{ margin: 0, fontSize: '12px', fontWeight: '600' }}>💰 GL Master Management</h2>
          </div>
          <button
            onClick={() => { resetImport(); setShowImportSelector(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', color: 'white', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>
            <Upload size={11} /> Import Excel
          </button>
        </div>

        {/* Message */}
        {message && (
          <div style={{ margin: '8px 12px 0', padding: '6px 8px', background: message.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`, borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {message.type === 'success' ? <CheckCircle size={12} style={{ color: '#16a34a' }} /> : <AlertCircle size={12} style={{ color: '#dc2626' }} />}
            <span style={{ fontSize: '10px', color: '#000', fontWeight: '500', flex: 1 }}>{message.text}</span>
            <button onClick={() => setMessage(null)} style={{ padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <XCircle size={12} color={message.type === 'success' ? '#16a34a' : '#dc2626'} />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', background: '#f9fafb', flexShrink: 0 }}>
          {[
            { key: 'create', label: 'Create GL Account', icon: <Plus size={12} /> },
            { key: 'view',   label: `View GL Accounts (${filteredGLAccounts.length})`, icon: <Eye size={12} /> },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              flex: 1, padding: '6px 12px', fontSize: '10px', fontWeight: '600', cursor: 'pointer',
              border: 'none', background: activeTab === t.key ? 'white' : 'transparent',
              color: activeTab === t.key ? COLOR : '#000',
              borderBottom: activeTab === t.key ? `2px solid ${COLOR}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>{t.icon}{t.label}</div>
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>

          {/* ══════════ CREATE TAB ══════════ */}
          {activeTab === 'create' && (
            <div>
              {/* Info */}
              <div style={{ background: COLOR_SOFT, border: `1px solid ${COLOR_MED}`, borderRadius: '6px', padding: '8px 10px', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Info size={13} style={{ color: COLOR, flexShrink: 0, marginTop: '1px' }} />
                <p style={{ margin: 0, fontSize: '9px', color: '#374151', lineHeight: '1.6' }}>
                  <strong style={{ color: COLOR }}>Flow:</strong> Company → GL Type → Sub-Type (opt) → Category (opt) → Sub-Category (opt) → GL Head (opt) → GL Details. &nbsp;
                  <strong>GL Code</strong> is auto-generated as <code style={{ background: 'white', padding: '1px 4px', borderRadius: '3px' }}>COMPANY_CODE-GLXXXX-0001</code>.
                  &nbsp; <strong>is_postable</strong> is always ON.
                </p>
              </div>

              {/* STEP 1: Company + Scope */}
              <StepBox locked={false}>
                <StepHeader num="1" title="Select Company & Scope" subtitle="Which company (and optionally which plant) this GL account belongs to" done={!!selCompanyId && (isCompanyWide || !!selPlant)} />
                <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '6px', marginBottom: '8px' }}>
                  {companiesWithPlants.length === 0
                    ? <p style={{ fontSize: '10px', color: '#9ca3af', padding: '10px', textAlign: 'center' }}>No companies available</p>
                    : companiesWithPlants.map(c => (
                      <label key={c.company_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 7px', cursor: 'pointer', borderRadius: '3px', marginBottom: '3px', background: selCompanyId === String(c.company_id) ? COLOR_SOFT : 'transparent', border: selCompanyId === String(c.company_id) ? `1px solid ${COLOR}` : '1px solid transparent' }}>
                        <input type="radio" checked={selCompanyId === String(c.company_id)} onChange={() => { setSelCompanyId(String(c.company_id)); setSelPlant(''); }} />
                        <span style={{ fontSize: '10px', fontWeight: '600' }}>{c.company_name}</span>
                        <span style={{ fontSize: '8px', fontWeight: '700', fontFamily: 'monospace', background: COLOR_SOFT, color: COLOR, padding: '1px 6px', borderRadius: '10px' }}>{c.company_code}</span>
                      </label>
                    ))
                  }
                </div>
                {selCompanyId && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    {[{ val: true, icon: <Globe size={9} />, label: 'Company-wide' }, { val: false, icon: <Factory size={9} />, label: 'Plant-specific' }].map(opt => (
                      <label key={String(opt.val)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', border: isCompanyWide === opt.val ? `2px solid ${COLOR}` : '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer', background: isCompanyWide === opt.val ? COLOR_SOFT : 'white' }}>
                        <input type="radio" checked={isCompanyWide === opt.val} onChange={() => { setIsCompanyWide(opt.val); setSelPlant(''); }} />
                        <span style={{ fontSize: '9px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>{opt.icon}{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}
                {selCompanyId && !isCompanyWide && (
                  <select value={selPlant} onChange={e => setSelPlant(e.target.value)} style={S.select}>
                    <option value="">Select Plant...</option>
                    {availPlants.map(p => <option key={p.plant_id} value={p.plant_id}>{p.plant_name} ({p.plant_code})</option>)}
                  </select>
                )}
              </StepBox>

              {/* STEP 2: GL Type */}
              <StepBox locked={!selCompanyId}>
                <StepHeader num="2" title="GL Type" subtitle="Required — defines the nature of the GL account" done={!!selTypeId} locked={!selCompanyId} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {glTypes.map(t => (
                    <button key={t.id} style={pillBtn(selTypeId === String(t.id))} onClick={() => setSelTypeId(selTypeId === String(t.id) ? '' : String(t.id))}>
                      {t.type_name} <span style={{ fontSize: '8px', opacity: 0.75 }}>({t.type_code})</span>
                    </button>
                  ))}
                </div>
              </StepBox>

              {/* STEP 3: GL Sub-Type */}
              <StepBox locked={!selTypeId}>
                <StepHeader num="3" title="GL Sub-Type" subtitle="Optional — click None/Skip to proceed without" done={!!selSubTypeId} locked={!selTypeId} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button style={pillBtn(selSubTypeId === '__none__')} onClick={() => setSelSubTypeId(selSubTypeId === '__none__' ? '' : '__none__')}>
                    None / Skip
                  </button>
                  {filtSubTypes.map(st => (
                    <button key={st.id} style={pillBtn(selSubTypeId === String(st.id))} onClick={() => setSelSubTypeId(selSubTypeId === String(st.id) ? '' : String(st.id))}>
                      {st.sub_type_name}
                    </button>
                  ))}
                  {filtSubTypes.length === 0 && selTypeId && <span style={{ fontSize: '9px', color: '#9ca3af', alignSelf: 'center' }}>No sub-types for this GL Type — click None/Skip</span>}
                </div>
              </StepBox>

              {/* STEP 4: GL Category */}
              <StepBox locked={!selTypeId}>
                <StepHeader num="4" title="GL Category" subtitle="Optional — further classifies the account" done={!!selCategoryId} locked={!selTypeId} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button style={pillBtn(selCategoryId === '__none__')} onClick={() => setSelCategoryId(selCategoryId === '__none__' ? '' : '__none__')}>
                    None / Skip
                  </button>
                  {filtCategories.map(cat => (
                    <button key={cat.id} style={pillBtn(selCategoryId === String(cat.id))} onClick={() => setSelCategoryId(selCategoryId === String(cat.id) ? '' : String(cat.id))}>
                      {cat.category_name} <span style={{ fontSize: '8px', opacity: 0.75 }}>({cat.category_code})</span>
                    </button>
                  ))}
                  {filtCategories.length === 0 && selTypeId && <span style={{ fontSize: '9px', color: '#9ca3af', alignSelf: 'center' }}>No categories — click None/Skip or add from GL Category page</span>}
                </div>
              </StepBox>

              {/* STEP 5: GL Sub-Category */}
              <StepBox locked={!selCategoryId || selCategoryId === '__none__'}>
                <StepHeader num="5" title="GL Sub-Category" subtitle="Optional" done={!!selSubCatId} locked={!selCategoryId || selCategoryId === '__none__'} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button style={pillBtn(selSubCatId === '__none__')} onClick={() => setSelSubCatId(selSubCatId === '__none__' ? '' : '__none__')}>
                    None / Skip
                  </button>
                  {filtSubCats.map(sc => (
                    <button key={sc.id} style={pillBtn(selSubCatId === String(sc.id))} onClick={() => setSelSubCatId(selSubCatId === String(sc.id) ? '' : String(sc.id))}>
                      {sc.sub_category_name} <span style={{ fontSize: '8px', opacity: 0.75 }}>({sc.sub_category_code})</span>
                    </button>
                  ))}
                  {filtSubCats.length === 0 && selCategoryId && selCategoryId !== '__none__' && <span style={{ fontSize: '9px', color: '#9ca3af', alignSelf: 'center' }}>No sub-categories — click None/Skip</span>}
                </div>
              </StepBox>

              {/* STEP 6: GL Head */}
              <StepBox locked={!selTypeId}>
                <StepHeader num="6" title="GL Head — Posting Reference" subtitle="Optional — Level 5 in hierarchy" done={!!selHeadId} locked={!selTypeId} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button style={pillBtn(selHeadId === '__none__')} onClick={() => setSelHeadId(selHeadId === '__none__' ? '' : '__none__')}>
                    None / Skip
                  </button>
                  {filtHeads.map(h => (
                    <button key={h.id} style={pillBtn(selHeadId === String(h.id))} onClick={() => setSelHeadId(selHeadId === String(h.id) ? '' : String(h.id))}>
                      {h.gl_head_name} <span style={{ fontSize: '8px', opacity: 0.75 }}>({h.gl_head_code})</span>
                    </button>
                  ))}
                  {filtHeads.length === 0 && selTypeId && <span style={{ fontSize: '9px', color: '#9ca3af', alignSelf: 'center' }}>No GL Heads — click None/Skip or add from GL Head page</span>}
                </div>
              </StepBox>

              {/* STEP 7: GL Details */}
              <StepBox locked={!selTypeId || !selCompanyId}>
                <StepHeader num="7" title="GL Account Details" subtitle="GL Name required; GL Code auto-generated (override optional)" done={!!glName.trim()} locked={!selTypeId || !selCompanyId} />

                {/* Hierarchy summary */}
                {selCompanyId && selTypeId && (
                  <div style={{ marginBottom: '10px' }}>
                    <HierarchyBadge parts={[
                      { label: selCompany?.company_code, bg: '#dbeafe', color: '#1d4ed8' },
                      { label: glTypes.find(t => String(t.id) === selTypeId)?.type_code, bg: COLOR_SOFT, color: COLOR },
                      { label: selSubTypeId && selSubTypeId !== '__none__' ? glSubTypes.find(t => String(t.id) === selSubTypeId)?.sub_type_code : null },
                      { label: selCategoryId && selCategoryId !== '__none__' ? glCategories.find(c => String(c.id) === selCategoryId)?.category_code : null, bg: '#fef3c7', color: '#b45309' },
                      { label: selSubCatId && selSubCatId !== '__none__' ? glSubCategories.find(sc => String(sc.id) === selSubCatId)?.sub_category_code : null, bg: '#fce7f3', color: '#be185d' },
                      { label: selHeadId && selHeadId !== '__none__' ? glHeads.find(h => String(h.id) === selHeadId)?.gl_head_code : null, bg: '#ccfbf1', color: '#0f766e' },
                    ]} />
                  </div>
                )}

                {/* GL Name + GL Code */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={S.label}>GL Name <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={glName} onChange={e => setGLName(e.target.value)} placeholder="e.g., Cash in Hand, Bank Account" style={S.input} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <label style={{ ...S.label, margin: 0 }}>GL Code</label>
                      <span style={{ fontSize: '8px', background: COLOR_SOFT, color: COLOR, padding: '1px 6px', borderRadius: '8px', fontWeight: '700' }}>AUTO</span>
                    </div>
                    <div style={{ padding: '5px 8px', border: `1px dashed ${COLOR_MED}`, borderRadius: '4px', fontSize: '10px', color: COLOR, fontFamily: 'monospace', fontWeight: '700', background: COLOR_SOFT, marginBottom: '4px' }}>
                      {glCodePreview || <span style={{ color: '#9ca3af', fontWeight: '400', fontFamily: 'inherit', fontSize: '9px' }}>— enter GL name to preview —</span>}
                    </div>
                    <input type="text" value={glCodeOverride} onChange={e => setGLCodeOverride(e.target.value.toUpperCase())} placeholder="Override (leave blank = auto)" style={{ ...S.input, fontSize: '9px' }} />
                    <p style={{ margin: '2px 0 0', fontSize: '8px', color: '#9ca3af' }}>Leave blank → auto-generated</p>
                  </div>
                </div>

                {/* Currency */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={S.label}>Currency Code <span style={{ fontSize: '8px', color: '#9ca3af', fontWeight: '400' }}>(Optional)</span></label>
                  <input type="text" value={currencyCode} onChange={e => setCurrencyCode(e.target.value.toUpperCase())} placeholder="e.g., INR, USD, EUR" maxLength={10} style={{ ...S.input, maxWidth: '180px' }} />
                </div>

                {/* Remarks */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={S.label}>Remarks (Optional)</label>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Brief remarks..." style={{ ...S.input, minHeight: '50px', resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                  <button onClick={resetForm} style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', color: '#000' }}>Reset</button>
                  <button onClick={handleCreate} disabled={loading} style={{ padding: '6px 16px', background: loading ? '#d1d5db' : `linear-gradient(to right, ${COLOR}, ${COLOR_MED})`, border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {loading ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : <><Save size={12} /> Create GL Account</>}
                  </button>
                </div>
              </StepBox>
            </div>
          )}

          {/* ══════════ VIEW TAB ══════════ */}
          {activeTab === 'view' && (
            <div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
                  <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input type="text" placeholder="Search GL accounts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...S.input, paddingLeft: '28px' }} />
                </div>
                <select value={filterCompanyId} onChange={e => setFilterCompanyId(e.target.value)} style={{ ...S.select, maxWidth: '200px' }}>
                  <option value="">All Companies</option>
                  {companiesWithPlants.map(c => <option key={c.company_id} value={c.company_id}>{c.company_name} ({c.company_code})</option>)}
                </select>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {[{ m: 'grid', I: Grid }, { m: 'list', I: List }].map(({ m, I }) => (
                    <button key={m} onClick={() => setViewMode(m)} style={{ padding: '5px 9px', background: viewMode === m ? COLOR : 'white', border: '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer', color: viewMode === m ? 'white' : '#000' }}>
                      <I size={12} />
                    </button>
                  ))}
                </div>
              </div>

              {filteredGLAccounts.length === 0
                ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <DollarSign size={48} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
                    <h3 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>No GL Accounts Found</h3>
                    <p style={{ fontSize: '10px', color: '#666' }}>{searchTerm ? 'Try adjusting your search' : 'Create your first GL account above'}</p>
                  </div>
                )
                : (
                  <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: '10px' }}>
                    {filteredGLAccounts.map(gl => (
                      <div key={gl.id} style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '10px', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 12px rgba(139,92,246,0.15)`; e.currentTarget.style.borderColor = COLOR; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e0e0e0'; }}>
                        <h4 style={{ fontSize: '11px', fontWeight: '700', margin: '0 0 2px' }}>{gl.gl_name}</h4>
                        <p style={{ fontSize: '9px', color: '#666', fontFamily: 'monospace', margin: '0 0 6px' }}>{gl.gl_code}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '8px' }}>
                          <span style={{ padding: '2px 6px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '3px', fontWeight: '600' }}>🏢 {gl.company.name} ({gl.company.code})</span>
                          {gl.plant
                            ? <span style={{ padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: '3px', fontWeight: '600' }}>🏭 {gl.plant.name}</span>
                            : <span style={{ padding: '2px 6px', background: '#dcfce7', color: '#166534', borderRadius: '3px', fontWeight: '600' }}>🌍 All Plants</span>}
                          <span style={{ padding: '2px 6px', background: COLOR_SOFT, color: COLOR, borderRadius: '3px', fontWeight: '600' }}>📊 {gl.gl_type.type_name}</span>
                          {gl.gl_category && <span style={{ padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: '3px', fontWeight: '600' }}>🏷️ {gl.gl_category.category_name}</span>}
                          {gl.gl_head    && <span style={{ padding: '2px 6px', background: '#ccfbf1', color: '#0f766e', borderRadius: '3px', fontWeight: '600' }}>🔖 {gl.gl_head.gl_head_name}</span>}
                          <span style={{ padding: '2px 6px', background: '#dcfce7', color: '#166534', borderRadius: '3px', fontWeight: '600' }}>✅ Postable</span>
                          {gl.currency_code && <span style={{ padding: '2px 6px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '3px', fontWeight: '600' }}>💱 {gl.currency_code}</span>}
                        </div>
                        {gl.child_count > 0 && <div style={{ marginTop: '6px', padding: '4px 6px', background: '#f9fafb', borderRadius: '3px', fontSize: '8px' }}>📚 {gl.child_count} child GL accounts</div>}
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ height: '8px', background: `linear-gradient(to right, ${COLOR_MED}, ${COLOR})`, flexShrink: 0 }} />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          IMPORT SELECTOR MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {showImportSelector && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', width: '700px', maxWidth: '96vw', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 14px', background: `linear-gradient(to right, ${COLOR}, ${COLOR_MED})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: '700' }}>📥 Import GL Accounts — {!importMode ? 'Choose Method' : importMode === 'stepwise' ? 'Method A — Step-by-Step' : 'Method B — Full Excel'}</span>
              <button onClick={() => { setShowImportSelector(false); resetImport(); }} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><XCircle size={16} /></button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>

              {/* ── Choose method ── */}
              {!importMode && (
                <>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', marginBottom: '12px' }}>Choose how to import GL Accounts:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div onClick={() => setImportMode('stepwise')} style={{ border: `2px solid ${COLOR_SOFT}`, borderRadius: '8px', padding: '14px', cursor: 'pointer', background: COLOR_SOFT, transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = COLOR; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = COLOR_SOFT; }}>
                      <div style={{ fontSize: '24px', marginBottom: '6px' }}>📋</div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: COLOR, marginBottom: '6px' }}>Method A — Step-by-Step</div>
                      <div style={{ fontSize: '9px', color: '#374151', lineHeight: '1.6' }}>
                        Select <strong>Company → Type → SubType → Category → SubCat → Head</strong> here first.
                        Then upload Excel with only: <strong>GL Name</strong>, Currency, Remarks.
                        <br />GL Code auto-generated. All hierarchy applied from your selection.
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '9px', fontWeight: '600', color: '#059669' }}>✓ Best when all rows share the same hierarchy</div>
                    </div>
                    <div onClick={() => setImportMode('full')} style={{ border: '2px solid #dcfce7', borderRadius: '8px', padding: '14px', cursor: 'pointer', background: '#f0fdf4', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#16a34a'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#dcfce7'; }}>
                      <div style={{ fontSize: '24px', marginBottom: '6px' }}>📊</div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', marginBottom: '6px' }}>Method B — Full Excel</div>
                      <div style={{ fontSize: '9px', color: '#374151', lineHeight: '1.6' }}>
                        Select <strong>Company</strong> here. Your Excel includes: <strong>GL Name</strong>, <strong>gl_type_code</strong>, gl_category_code (opt), Currency, Remarks.
                        <br />GL Code auto-generated per row. Each row can have different GL Type/Category.
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '9px', fontWeight: '600', color: '#059669' }}>✓ Best when rows have different GL Types or Categories</div>
                    </div>
                  </div>
                </>
              )}

              {/* ── Method A: Stepwise hierarchy ── */}
              {importMode === 'stepwise' && (
                <>
                  <button onClick={() => setImportMode(null)} style={{ fontSize: '9px', background: 'none', border: 'none', color: COLOR, cursor: 'pointer', padding: '0 0 10px', fontWeight: '700' }}>← Back</button>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', marginBottom: '10px' }}>Set hierarchy (all rows will use these values):</p>

                  {/* Company */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ ...S.label, color: COLOR }}>Step 1 — Company <span style={{ color: '#dc2626' }}>*</span></label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {companiesWithPlants.map(c => (
                        <button key={c.company_id} style={pillBtn(impCompanyId === String(c.company_id))} onClick={() => { setImpCompanyId(impCompanyId === String(c.company_id) ? '' : String(c.company_id)); setImpPlantId(''); }}>
                          {c.company_name} <span style={{ fontSize: '8px', opacity: 0.8 }}>({c.company_code})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scope */}
                  {impCompanyId && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={S.label}>Scope</label>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                        {[{ val: true, label: 'Company-wide' }, { val: false, label: 'Plant-specific' }].map(opt => (
                          <label key={String(opt.val)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', border: impCompanyWide === opt.val ? `2px solid ${COLOR}` : '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer', background: impCompanyWide === opt.val ? COLOR_SOFT : 'white', fontSize: '9px', fontWeight: '600' }}>
                            <input type="radio" checked={impCompanyWide === opt.val} onChange={() => { setImpCompanyWide(opt.val); setImpPlantId(''); }} />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                      {!impCompanyWide && (
                        <select value={impPlantId} onChange={e => setImpPlantId(e.target.value)} style={S.select}>
                          <option value="">Select Plant...</option>
                          {impAvailPlants.map(p => <option key={p.plant_id} value={p.plant_id}>{p.plant_name} ({p.plant_code})</option>)}
                        </select>
                      )}
                    </div>
                  )}

                  {/* GL Type */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ ...S.label, color: COLOR }}>Step 2 — GL Type <span style={{ color: '#dc2626' }}>*</span></label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {glTypes.map(t => (
                        <button key={t.id} style={pillBtn(impTypeId === String(t.id))} onClick={() => setImpTypeId(impTypeId === String(t.id) ? '' : String(t.id))}>
                          {t.type_name} <span style={{ fontSize: '8px', opacity: 0.75 }}>({t.type_code})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* GL Sub-Type */}
                  {impTypeId && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={S.label}>GL Sub-Type (Optional)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <button style={pillBtn(!impSubTypeId)} onClick={() => setImpSubTypeId('')}>None</button>
                        {glSubTypes.filter(st => String(st.gl_type_id) === impTypeId).map(st => (
                          <button key={st.id} style={pillBtn(impSubTypeId === String(st.id))} onClick={() => setImpSubTypeId(impSubTypeId === String(st.id) ? '' : String(st.id))}>
                            {st.sub_type_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GL Category */}
                  {impTypeId && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={S.label}>GL Category (Optional)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <button style={pillBtn(!impCategoryId)} onClick={() => setImpCategoryId('')}>None</button>
                        {impFiltCats.map(cat => (
                          <button key={cat.id} style={pillBtn(impCategoryId === String(cat.id))} onClick={() => setImpCategoryId(impCategoryId === String(cat.id) ? '' : String(cat.id))}>
                            {cat.category_name} <span style={{ fontSize: '8px', opacity: 0.75 }}>({cat.category_code})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GL Sub-Category */}
                  {impCategoryId && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={S.label}>GL Sub-Category (Optional)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <button style={pillBtn(!impSubCatId)} onClick={() => setImpSubCatId('')}>None</button>
                        {impFiltSubCats.map(sc => (
                          <button key={sc.id} style={pillBtn(impSubCatId === String(sc.id))} onClick={() => setImpSubCatId(impSubCatId === String(sc.id) ? '' : String(sc.id))}>
                            {sc.sub_category_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GL Head */}
                  {impTypeId && (
                    <div style={{ marginBottom: '12px' }}>
                      <label style={S.label}>GL Head (Optional)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <button style={pillBtn(!impHeadId)} onClick={() => setImpHeadId('')}>None</button>
                        {impFiltHeads.map(h => (
                          <button key={h.id} style={pillBtn(impHeadId === String(h.id))} onClick={() => setImpHeadId(impHeadId === String(h.id) ? '' : String(h.id))}>
                            {h.gl_head_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {impCompanyId && impTypeId && (
                    <div style={{ padding: '8px 10px', background: COLOR_SOFT, borderRadius: '6px', marginBottom: '12px', fontSize: '9px' }}>
                      <strong style={{ color: COLOR }}>All imported rows will use:</strong>
                      <div style={{ marginTop: '5px' }}>
                        <HierarchyBadge parts={[
                          { label: impCompany?.company_code, bg: '#dbeafe', color: '#1d4ed8' },
                          { label: glTypes.find(t => String(t.id) === impTypeId)?.type_code, bg: COLOR_SOFT, color: COLOR },
                          { label: impSubTypeId ? glSubTypes.find(t => String(t.id) === impSubTypeId)?.sub_type_code : null },
                          { label: impCategoryId ? glCategories.find(c => String(c.id) === impCategoryId)?.category_code : null, bg: '#fef3c7', color: '#b45309' },
                          { label: impSubCatId ? glSubCategories.find(sc => String(sc.id) === impSubCatId)?.sub_category_code : null, bg: '#fce7f3', color: '#be185d' },
                          { label: impHeadId ? glHeads.find(h => String(h.id) === impHeadId)?.gl_head_code : null, bg: '#ccfbf1', color: '#0f766e' },
                        ]} />
                      </div>
                      <div style={{ marginTop: '4px', color: '#6b7280' }}>
                        Scope: {impCompanyWide ? 'Company-wide' : (impPlantId ? impAvailPlants.find(p => String(p.plant_id) === impPlantId)?.plant_name : '⚠️ Select plant')}
                        &nbsp;·&nbsp; <span style={{ color: COLOR }}>GL Code auto-generated · is_postable = true</span>
                      </div>
                      <div style={{ marginTop: '4px', fontWeight: '600', color: COLOR }}>
                        Excel needs: <code style={{ background: 'white', padding: '1px 4px', borderRadius: '3px' }}>gl_name</code> (required), <code style={{ background: 'white', padding: '1px 4px', borderRadius: '3px' }}>currency_code</code> (opt), <code style={{ background: 'white', padding: '1px 4px', borderRadius: '3px' }}>remarks</code> (opt)
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => { setShowImportSelector(false); resetImport(); }} style={{ padding: '6px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', color: '#000' }}>Cancel</button>
                    <button
                      disabled={!impTypeId || !impCompanyId || (!impCompanyWide && !impPlantId)}
                      onClick={() => { setShowImportSelector(false); setShowImportPopup(true); }}
                      style={{ padding: '6px 16px', background: (impTypeId && impCompanyId && (impCompanyWide || impPlantId)) ? `linear-gradient(to right, ${COLOR}, ${COLOR_MED})` : '#d1d5db', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: (impTypeId && impCompanyId && (impCompanyWide || impPlantId)) ? 'pointer' : 'not-allowed', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Upload size={11} /> Continue to Upload →
                    </button>
                  </div>
                </>
              )}

              {/* ── Method B: Full Excel ── */}
              {importMode === 'full' && (
                <>
                  <button onClick={() => setImportMode(null)} style={{ fontSize: '9px', background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', padding: '0 0 10px', fontWeight: '700' }}>← Back</button>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', marginBottom: '10px' }}>Select Company (GL Type column will be in your Excel):</p>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ ...S.label, color: '#16a34a' }}>Company <span style={{ color: '#dc2626' }}>*</span></label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {companiesWithPlants.map(c => (
                        <button key={c.company_id} style={pillBtn(impCompanyId === String(c.company_id), '#16a34a')} onClick={() => setImpCompanyId(impCompanyId === String(c.company_id) ? '' : String(c.company_id))}>
                          {c.company_name} <span style={{ fontSize: '8px', opacity: 0.8 }}>({c.company_code})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: '10px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', marginBottom: '14px', fontSize: '9px', color: '#374151', lineHeight: '1.7' }}>
                    <strong style={{ color: '#16a34a' }}>Required Excel columns:</strong>
                    <br />• <code>gl_name</code> — GL Account Name (required)
                    <br />• <code>gl_type_code</code> — e.g. ASSE-0001, LIAB-0001 (required — resolved to ID automatically)
                    <br />• <code>gl_category_code</code> — optional, e.g. ASSE-0001-INVE-0001
                    <br />• <code>currency_code</code> — optional, e.g. INR, USD
                    <br />• <code>remarks</code> — optional
                    <br /><strong style={{ color: '#16a34a' }}>GL Code auto-generated · is_postable always true</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => { setShowImportSelector(false); resetImport(); }} style={{ padding: '6px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', color: '#000' }}>Cancel</button>
                    <button
                      disabled={!impCompanyId}
                      onClick={() => { setShowImportSelector(false); setShowImportPopup(true); }}
                      style={{ padding: '6px 16px', background: impCompanyId ? 'linear-gradient(to right, #16a34a, #22c55e)' : '#d1d5db', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: impCompanyId ? 'pointer' : 'not-allowed', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Upload size={11} /> Continue to Upload →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          EXCEL IMPORT POPUP
      ════════════════════════════════════════════════════════════════════ */}
      <ExcelImportPopup
        isOpen={showImportPopup}
        onClose={() => setShowImportPopup(false)}
        onSuccess={(results) => {
          const successCount = results.filter(r => r.status === 'success').length;
          if (successCount > 0) {
            setMessage({ type: 'success', text: `✅ ${successCount} GL Account(s) imported successfully!` });
            fetchGLAccounts();
          }
        }}
        fields={importMode === 'stepwise' ? [
          { key: 'gl_name',       label: 'GL Name',       required: true  },
          { key: 'currency_code', label: 'Currency Code', required: false },
          { key: 'remarks',       label: 'Remarks',       required: false },
        ] : [
          { key: 'gl_name',       label: 'GL Name',       required: true  },
          { key: 'currency_code', label: 'Currency Code', required: false },
          { key: 'remarks',       label: 'Remarks',       required: false },
        ]}
        extraFormData={importMode === 'stepwise' ? {
          company_id:  impCompanyId,
          gl_type_id:  impTypeId,
          is_postable: true,
          ...(impSubTypeId  ? { gl_sub_type_id:     impSubTypeId }  : {}),
          ...(impCategoryId ? { gl_category_id:     impCategoryId } : {}),
          ...(impSubCatId   ? { gl_sub_category_id: impSubCatId }   : {}),
          ...(impHeadId     ? { gl_head_id:         impHeadId }     : {}),
          ...(!impCompanyWide && impPlantId ? { plant_id: impPlantId } : {}),
        } : {
          company_id:  impCompanyId,
          is_postable: true,
        }}
        lookupFields={importMode === 'full' ? [
          { key: 'gl_type_id',     label: 'GL Type Code',     data: glTypes,       matchKey: 'type_code',      valueKey: 'id', caseSensitive: false },
          { key: 'gl_category_id', label: 'GL Category Code', data: glCategories,  matchKey: 'category_code',  valueKey: 'id', caseSensitive: false },
        ] : []}
        importNote={importMode === 'stepwise'
          ? `All rows → ${impCompany?.company_name || ''} (${impCompany?.company_code || ''}) · ${glTypes.find(t => String(t.id) === impTypeId)?.type_name || 'type'} · GL Code auto-generated · is_postable = ✅`
          : `Company: ${impCompany?.company_name || ''} (${impCompany?.company_code || ''}) · GL Code auto-generated per row · is_postable = ✅ · Use gl_type_code column`}
        apiEndpoint={`${API_BASE}/gl-accounts`}
        apiMethod="POST"
        title={importMode === 'stepwise' ? '📋 Import GL Accounts — Method A (Step-by-Step)' : '📊 Import GL Accounts — Method B (Full Excel)'}
        accentColor={importMode === 'stepwise' ? COLOR : '#16a34a'}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
