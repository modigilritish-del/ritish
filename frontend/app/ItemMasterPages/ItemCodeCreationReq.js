/**
 * ItemCodeCreationReq.js
 * ─────────────────────────────────────────────────────────────────
 * Page: Item Code Creation Request  (itemmaster folder)
 * ─────────────────────────────────────────────────────────────────
 * Features
 *  • RBAC: loads companies & plants from user's access
 *  • Full CRUD (Create / Read / Update / Soft-delete / Hard-delete)
 *  • Photo upload  → stores URL only (no binary in DB)
 *  • LOV modals with search + pagination (same style as existing pages)
 *  • Matches existing UI style exactly (gradient headers, 11px font …)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, X, Upload, Plus, Edit2, Trash2, Eye,
  RefreshCw, FileSpreadsheet, Save, ChevronDown,
  AlertCircle, CheckCircle, ZoomIn
} from 'lucide-react';
import UniversalExport from '../pages/UniversalExport';

const API_BASE = 'http://localhost:8000/api';

// ─── helpers ──────────────────────────────────────────────────────────────
const getSession = () => {
  try {
    const d = JSON.parse(sessionStorage.getItem('userData') || '{}');
    return d?.user || null;
  } catch { return null; }
};

// Extract user's primary department name from session
const getUserDepartment = () => {
  try {
    const d = JSON.parse(sessionStorage.getItem('userData') || '{}');
    const user = d?.user;
    if (!user) return '';
    const primaryAccess = user.accesses?.find(a => a.is_primary_company) || user.accesses?.[0];
    return primaryAccess?.department?.name || primaryAccess?.department?.department_name || '';
  } catch { return ''; }
};

// Extract all unique departments from user's accesses
const getUserDepartments = () => {
  try {
    const d = JSON.parse(sessionStorage.getItem('userData') || '{}');
    const user = d?.user;
    if (!user) return [];
    const seen = new Set();
    return (user.accesses || [])
      .map(a => a.department)
      .filter(dep => dep && (dep.name || dep.department_name))
      .reduce((acc, dep) => {
        const name = dep.name || dep.department_name;
        if (!seen.has(name)) { seen.add(name); acc.push({ code: dep.code || dep.id || name, name }); }
        return acc;
      }, []);
  } catch { return []; }
};

// Get user's primary company access info from session
const getUserPrimaryAccess = () => {
  try {
    const d = JSON.parse(sessionStorage.getItem('userData') || '{}');
    const user = d?.user;
    if (!user) return null;
    const pa = user.accesses?.find(a => a.is_primary_company) || user.accesses?.[0];
    if (!pa) return null;
    return {
      company_id:   pa.company?.id   || pa.company_id   || null,
      company_name: pa.company?.name || pa.company?.company_name || '',
      dept_id:      pa.department?.id   || null,
      dept_name:    pa.department?.name || pa.department?.department_name || '',
    };
  } catch { return null; }
};

// ─── LOV Modal (reused pattern from existing pages) ───────────────────────
const LOVModal = ({ title, subtitle, items, onSelect, onClose, loading = false }) => {
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const PER_PAGE = 6;

  const filtered = items.filter(i =>
    (i.code + ' ' + i.name).toLowerCase().includes(search.toLowerCase())
  );
  const total   = Math.ceil(filtered.length / PER_PAGE);
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: 500, maxWidth: '92vw', height: subtitle ? 350 : 320, background: '#fff', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>{title}</span>
            {subtitle && (
              <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 4 }}>
                🏢 {subtitle}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={16} /></button>
        </div>
        {/* search */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#000' }}>Search</span>
          <input autoFocus value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#333' }} />
        </div>
        {/* table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', fontSize: 11, color: '#6b7280' }}>Loading…</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Code</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Name</th>
              </tr></thead>
              <tbody>
                {visible.length ? visible.map((item, i) => (
                  <tr key={item.code} onClick={() => onSelect(item)}
                    style={{ cursor: 'pointer', background: i % 2 ? '#f9fafb' : '#fff' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#f9fafb' : '#fff'}>
                    <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.code}</td>
                    <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.name}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={2} style={{ padding: 30, textAlign: 'center', fontSize: 10, color: '#999' }}>No results</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {/* pagination */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '4px 12px', fontSize: 10, background: page === 1 ? '#e5e7eb' : '#3b82f6', color: page === 1 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
          <span style={{ fontSize: 10, color: '#000' }}>Page {page} of {total || 1}</span>
          <button onClick={() => setPage(p => Math.min(total || 1, p + 1))} disabled={page >= total}
            style={{ padding: '4px 12px', fontSize: 10, background: page >= total ? '#e5e7eb' : '#3b82f6', color: page >= total ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: page >= total ? 'not-allowed' : 'pointer' }}>Next</button>
        </div>
        <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8 }} />
      </div>
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────
const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  const bg = type === 'success' ? '#10b981' : '#ef4444';
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: bg, color: '#fff', padding: '14px 24px', borderRadius: 8, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,.35)' }}>
      {type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
      {msg}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const ItemCodeCreationReq = () => {
  const user = getSession();

  // ── view state ────────────────────────────────────────────────────────────
  const [view, setView]         = useState('list');   // 'list' | 'form'
  const [editId, setEditId]     = useState(null);
  const [viewMode, setViewMode] = useState(false);    // true = read-only view (approved/rejected/cancelled)
  const [toast, setToast]       = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [cancelModal, setCancelModal] = useState(null);   // rec to cancel | null
  const [cancelReason, setCancelReason] = useState('');

  // ── workflow status map: { [item_id]: { status, instance_id, step_approvals, return_comment } }
  const [workflowStatusMap, setWorkflowStatusMap] = useState({});

  // ── mandatory fields from DB (company+plant scoped) ───────────────────────
  // e.g. ['item_name', 'item_type', 'business_reason']
  const [mandatoryKeys, setMandatoryKeys] = useState([]);

  const loadWorkflowStatuses = useCallback(async (items) => {
    if (!items || items.length === 0) return;
    const results = {};
    await Promise.all(items.map(async (rec) => {
      try {
        const res = await fetch(`${API_BASE}/workflow/status/ITEM_CREATION/${rec.id}`);
        if (res.ok) { const d = await res.json(); results[rec.id] = d; }
      } catch { /* silent */ }
    }));
    setWorkflowStatusMap(results);
  }, []);

  // ── list state ────────────────────────────────────────────────────────────
  const [records, setRecords]         = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchTerm, setSearchTerm]   = useState('');
  const [statusTab, setStatusTab]     = useState('ALL');   // ALL | PENDING | IN_REVIEW | APPROVED | REJECTED | RETURNED | CANCELLED
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');

  // ── form state ────────────────────────────────────────────────────────────
  const userDepartment  = getUserDepartment();

  const emptyForm = {
    item_name: '', item_description: '', item_short_name: '',
    item_type: '', department: '', required_date: '', business_reason: '',
    company_id: null, company_label: '',
    plant_id: null,   plant_label: '',
    ref_image_url: '', vendor_quot_url: '', sample_photo_url: '', product_link: ''
  };
  const [form, setForm]         = useState({ ...emptyForm });
  const [saving, setSaving]     = useState(false);
  const [editReturnInfo, setEditReturnInfo] = useState(null); // { desc, fields[] } when editing a RETURNED request

  // ── companies/plants from user access ────────────────────────────────────
  const [companyOptions, setCompanyOptions] = useState([]);   // [{id, company_name, company_code, plants:[…]}]
  const [plantOptions, setPlantOptions]     = useState([]);   // plants of selected company
  const [optionsLoading, setOptionsLoading] = useState(false);
  // dept-access map: { [company_id]: [{id, department_name, department_code}] }
  const [deptAccessMap, setDeptAccessMap]       = useState({});
  // Set of company IDs that are primary for this user (from backend is_primary flag)
  const [primaryCompanyIds, setPrimaryCompanyIds] = useState(new Set());



  // ── LOV modals ────────────────────────────────────────────────────────────
  const [modal, setModal] = useState(null);   // 'company' | 'plant' | 'itemType' | 'department'

  // ── image zoom modal ──────────────────────────────────────────────────────
  const [zoomModal, setZoomModal] = useState(null);   // { url, label } | null
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDraggingImg, setIsDraggingImg] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const openZoom = (url, label) => { setZoomModal({ url, label }); setImageZoom(1); setImagePosition({ x: 0, y: 0 }); };
  const closeZoom = () => { setZoomModal(null); setImageZoom(1); setImagePosition({ x: 0, y: 0 }); };
  const handleZoomDelta = (delta) => setImageZoom(prev => Math.max(1, Math.min(5, prev + delta)));
  const handleZoomMouseDown = (e) => { if (imageZoom > 1) { e.preventDefault(); setIsDraggingImg(true); setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y }); } };
  const handleZoomMouseMove = (e) => { if (isDraggingImg && imageZoom > 1) { e.preventDefault(); setImagePosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); } };
  const handleZoomMouseUp = () => setIsDraggingImg(false);

  // ── Item Types – loaded from API (/item-type-master/lov) ─────────────────
  const [itemTypeList, setItemTypeList] = useState([]);

  const deptList = [
    { code: 'PRD', name: 'Production' },
    { code: 'PUR', name: 'Purchase' },
    { code: 'SLS', name: 'Sales' },
    { code: 'FIN', name: 'Finance' },
    { code: 'STR', name: 'Stores / Warehouse' },
    { code: 'QC',  name: 'Quality Control' },
    { code: 'MNT', name: 'Maintenance' },
    { code: 'HR',  name: 'Human Resources' },
    { code: 'IT',  name: 'Information Technology' },
    { code: 'ADM', name: 'Administration' },
  ];

  // ── load list — sirf logged-in user ki apni requests ────────────────────────
  const loadRecords = useCallback(async () => {
    setListLoading(true);
    try {
      const url = user?.id
        ? `${API_BASE}/item-creation-req/?created_by=${user.id}`
        : `${API_BASE}/item-creation-req/`;
      const res  = await fetch(url);
      const data = await res.json();
      const recs = Array.isArray(data) ? data : [];
      setRecords(recs);
      loadWorkflowStatuses(recs);
    } catch { setRecords([]); }
    setListLoading(false);
  }, [loadWorkflowStatuses]);

  // ── load company+plant options + dept-access for the logged-in user ────────
  const loadCompanyOptions = useCallback(async () => {
    if (!user?.id) return;
    setOptionsLoading(true);
    try {
      const [cpRes, daRes] = await Promise.all([
        fetch(`${API_BASE}/item-creation-req/user/${user.id}/companies-plants`),
        fetch(`${API_BASE}/item-creation-req/user/${user.id}/dept-access`),
      ]);
      const cpData = await cpRes.json();
      const daData = await daRes.json();
      setCompanyOptions(Array.isArray(cpData) ? cpData : []);
      // Build map: { company_id: [{id, department_name}] }
      // Build deptAccessMap from backend response.
      // Backend already applies the correct rule:
      //   PRIMARY company   → own dept + admin grants
      //   NON-PRIMARY       → only admin grants
      // We also store is_primary flag per company for frontend logic.
      const map = {};
      const primarySet = new Set();
      if (Array.isArray(daData)) {
        daData.forEach(entry => {
          if (!entry.company_id) return;
          const normalised = Array.isArray(entry.departments)
            ? entry.departments.map(d => ({
                id:              Number(d.id),
                department_name: d.department_name || '',
                department_code: d.department_code || '',
              }))
            : [];
          // Store under both string and number keys (JS object key safety)
          map[String(entry.company_id)] = normalised;
          map[Number(entry.company_id)] = normalised;
          if (entry.is_primary) primarySet.add(Number(entry.company_id));
        });
      }
      setDeptAccessMap(map);
      setPrimaryCompanyIds(primarySet);
    } catch { setCompanyOptions([]); setDeptAccessMap({}); }
    setOptionsLoading(false);
  }, [user?.id]);

  // ── SSE: auto-refresh when a notification arrives ───────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const es = new EventSource(`${API_BASE}/workflow/user-notifications/${user.id}/stream`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type && data.type !== 'heartbeat' && data.type !== 'connected') {
          loadRecords();
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => { /* browser auto-reconnects */ };
    return () => es.close();
  }, [user?.id, loadRecords]);

  useEffect(() => {
    loadRecords();
    loadCompanyOptions();
    // Load item types from DB
    fetch(`${API_BASE}/item-type-master/lov`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setItemTypeList(data.map(t => ({ code: t.code, name: t.name })));
        }
      })
      .catch(() => {});
  }, [loadRecords, loadCompanyOptions]);

  // ── helper: check if a company is user's primary company ────────────────────
  // Uses backend-provided is_primary flag (most reliable source).
  // Falls back to session if primaryCompanyIds not yet loaded.
  const isPrimaryCompany = (company_id) => {
    const compId = Number(company_id);
    // If backend data loaded — use it (authoritative)
    if (primaryCompanyIds.size > 0) return primaryCompanyIds.has(compId);
    // Fallback: session (used on first render before API responds)
    try {
      const d = JSON.parse(sessionStorage.getItem('userData') || '{}');
      const accesses = d?.user?.accesses || [];
      return accesses.some(
        a => a.is_primary_company && Number(a.company?.id || a.company_id) === compId
      );
    } catch { return false; }
  };

  // ── helper: get dept list for a company ──────────────────────────────────────
  // PRIMARY company   → own dept (session) + admin-granted depts (deptAccessMap), merged
  // NON-PRIMARY       → ONLY admin-granted depts (deptAccessMap), session dept excluded
  // Returns: [{ id:Number, department_name:string, department_code:string }]
  const getMergedDeptsForCompany = (company_id) => {
    if (!company_id) return [];
    const compId = Number(company_id);

    // Admin-granted depts from API (always used for both primary + non-primary)
    const grantedDepts = (deptAccessMap[String(compId)] || deptAccessMap[compId] || []).map(d => ({
      id:              Number(d.id),
      department_name: d.department_name || '',
      department_code: d.department_code || '',
    }));

    // For non-primary companies → return only admin grants (no session dept)
    if (!isPrimaryCompany(compId)) {
      return grantedDepts;
    }

    // For PRIMARY company → own dept from session always included + merge admin grants
    let allUserAccesses = [];
    try {
      const d = JSON.parse(sessionStorage.getItem('userData') || '{}');
      allUserAccesses = d?.user?.accesses || [];
    } catch { /* ignore */ }

    const primaryAccess = allUserAccesses.find(
      a => a.is_primary_company && Number(a.company?.id || a.company_id) === compId
    );
    const ownDept = primaryAccess ? {
      id:              Number(primaryAccess.department?.id || primaryAccess.department_id),
      department_name: primaryAccess.department?.department_name || primaryAccess.department?.name || '',
      department_code: primaryAccess.department?.department_code || primaryAccess.department?.code || '',
    } : null;

    // Start with own dept, then add any admin grants not already present
    const merged = ownDept && ownDept.id && ownDept.department_name ? [ownDept] : [];
    grantedDepts.forEach(gd => {
      const alreadyIn = merged.some(d => d.id === gd.id || d.department_name === gd.department_name);
      if (!alreadyIn) merged.push(gd);
    });
    return merged;
  };

  // ── helper: user's own dept name for primary company only ────────────────────
  const getOwnDeptForCompany = (company_id) => {
    if (!company_id || !isPrimaryCompany(company_id)) return '';
    const compId = Number(company_id);
    try {
      const d = JSON.parse(sessionStorage.getItem('userData') || '{}');
      const accesses = d?.user?.accesses || [];
      const match = accesses.find(
        a => a.is_primary_company && Number(a.company?.id || a.company_id) === compId
      );
      return match?.department?.department_name || match?.department?.name || '';
    } catch { return ''; }
  };

  // ── dept list for currently selected company ─────────────────────────────────
  // Defined HERE (after helpers above) to avoid "before initialization" error.
  // Primary company  → own dept + admin grants merged
  // Non-primary      → only admin-granted depts
  const activeDepts    = getMergedDeptsForCompany(form.company_id);
  const userDepartments = activeDepts.map(d => ({
    code: d.department_code || String(d.id),
    name: d.department_name,
  }));
  const isSingleDept = userDepartments.length <= 1;

  // ── load mandatory fields from DB whenever company or plant changes ──────────
  useEffect(() => {
    if (!form.company_id) { setMandatoryKeys([]); return; }
    const params = new URLSearchParams({
      page_key:   'item-code-creation-req',
      company_id: form.company_id,
    });
    if (form.plant_id) params.set('plant_id', form.plant_id);
    fetch(`${API_BASE}/mandatory-fields/resolve/effective?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.mandatory_keys) setMandatoryKeys(d.mandatory_keys); else setMandatoryKeys([]); })
      .catch(() => setMandatoryKeys([]));
  }, [form.company_id, form.plant_id]);

  // ── when company changes → update plant options only ────────────────────────
  // NOTE: dept auto-set is handled DIRECTLY in:
  //   • company LOV onSelect  (user picks from list)
  //   • openCreate            (new form opened)
  //   • auto-load useEffect   (page first load)
  // This effect only keeps plantOptions in sync with selected company.
  useEffect(() => {
    if (!form.company_id) {
      setPlantOptions([]);
      return;
    }
    const co = companyOptions.find(c => Number(c.id) === Number(form.company_id));
    setPlantOptions(co ? (co.plants || []) : []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.company_id, companyOptions]);

  // ── auto-set primary company + own dept on page load ────────────────────────
  useEffect(() => {
    if (!companyOptions.length) return;
    const pa = getUserPrimaryAccess();
    const primaryCo = pa?.company_id
      ? companyOptions.find(c => Number(c.id) === Number(pa.company_id))
      : companyOptions.length === 1 ? companyOptions[0] : null;
    if (!primaryCo) return;
    setForm(f => {
      if (f.company_id) return f; // already set (e.g. edit mode loaded)
      const newCompId = Number(primaryCo.id);
      // Use same inline dept logic for consistency
      const mergedDepts = getMergedDeptsForCompany(newCompId);
      let autoDept = '';
      if (mergedDepts.length === 1) {
        autoDept = mergedDepts[0].department_name;
      } else if (mergedDepts.length > 1) {
        const ownDeptName = getOwnDeptForCompany(newCompId);
        if (ownDeptName) {
          const ownDept = mergedDepts.find(
            dep => dep.department_name?.toLowerCase() === ownDeptName?.toLowerCase()
          );
          if (ownDept) autoDept = ownDept.department_name;
        }
      }
      return {
        ...f,
        company_id:    newCompId,
        company_label: primaryCo.company_name,
        plant_id:      null,
        plant_label:   '',
        department:    autoDept,
      };
    });
  }, [companyOptions, deptAccessMap]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const openCreate = () => {
    const base = { ...emptyForm };
    const pa = getUserPrimaryAccess();
    const primaryCo = pa?.company_id
      ? companyOptions.find(c => Number(c.id) === Number(pa.company_id))
      : companyOptions.length === 1 ? companyOptions[0] : null;
    if (primaryCo) {
      const newCompId = Number(primaryCo.id);
      base.company_id    = newCompId;
      base.company_label = primaryCo.company_name;
      // Use same inline dept logic as company LOV onSelect
      const mergedDepts = getMergedDeptsForCompany(newCompId);
      if (mergedDepts.length === 1) {
        base.department = mergedDepts[0].department_name;
      } else if (mergedDepts.length > 1) {
        const ownDeptName = getOwnDeptForCompany(newCompId);
        if (ownDeptName) {
          const ownDept = mergedDepts.find(
            dep => dep.department_name?.toLowerCase() === ownDeptName?.toLowerCase()
          );
          if (ownDept) base.department = ownDept.department_name;
        }
      }
    }
    setForm(base);
    setEditId(null);
    setViewMode(false);
    setEditReturnInfo(null);
    setView('form');
  };

  const openEdit = (rec) => {
    const wf = workflowStatusMap[rec.id];
    const returnComment = wf?.return_comment || '';
    let returnDesc = '';
    let returnFields = [];
    if (returnComment) {
      returnComment.split('\n').forEach(line => {
        if (line.startsWith('Fields to correct:') || line.startsWith('Fields to fix:')) {
          const prefix = line.startsWith('Fields to correct:') ? 'Fields to correct:' : 'Fields to fix:';
          returnFields = line.replace(prefix, '').split(',').map(f => f.trim()).filter(Boolean);
        } else if (line.trim()) {
          returnDesc += (returnDesc ? '\n' : '') + line.trim();
        }
      });
    }
    setEditReturnInfo(wf?.status === 'RETURNED' && returnComment ? { desc: returnDesc, fields: returnFields } : null);
    setForm({
      item_name:         rec.item_name || '',
      item_description:  rec.item_description || '',
      item_short_name:   rec.item_short_name || '',
      item_type:         rec.item_type || '',
      department:        rec.department || '',
      required_date:     rec.required_date || '',
      business_reason:   rec.business_reason || '',
      company_id:        rec.company_id || null,
      company_label:     rec.company?.company_name || '',
      plant_id:          rec.plant_id || null,
      plant_label:       rec.plant?.plant_name || '',
      ref_image_url:     rec.optional_documents?.reference_image_url || '',
      vendor_quot_url:   rec.optional_documents?.vendor_quotation_url || '',
      sample_photo_url:  rec.optional_documents?.sample_photo_url || '',
      product_link:      rec.optional_documents?.product_link || '',
    });
    setEditId(rec.id);
    setViewMode(false);
    setView('form');
  };

  // Read-only view for APPROVED / REJECTED / CANCELLED requests
  const openView = (rec) => {
    setForm({
      item_name:         rec.item_name || '',
      item_description:  rec.item_description || '',
      item_short_name:   rec.item_short_name || '',
      item_type:         rec.item_type || '',
      department:        rec.department || '',
      required_date:     rec.required_date || '',
      business_reason:   rec.business_reason || '',
      company_id:        rec.company_id || null,
      company_label:     rec.company?.company_name || '',
      plant_id:          rec.plant_id || null,
      plant_label:       rec.plant?.plant_name || '',
      ref_image_url:     rec.optional_documents?.reference_image_url || '',
      vendor_quot_url:   rec.optional_documents?.vendor_quotation_url || '',
      sample_photo_url:  rec.optional_documents?.sample_photo_url || '',
      product_link:      rec.optional_documents?.product_link || '',
    });
    setEditId(rec.id);
    setViewMode(true);
    setEditReturnInfo(null);
    setView('form');
  };

  // ── Save as DRAFT — minimal validation, NO workflow submit ──────────────────
  const handleSaveDraft = async () => {
    if (!form.company_id)          { showToast('Company is required', 'error'); return; }
    if (!form.item_name.trim())    { showToast('Item Name is required to save draft', 'error'); return; }
    // Note: draft only needs company + item_name minimum

    setSaving(true);
    try {
      const body = {
        item_name:        form.item_name.trim(),
        item_description: form.item_description || null,
        item_short_name:  form.item_short_name  || null,
        item_type:        form.item_type        || null,
        department:       form.department       || null,
        required_date:    form.required_date    || null,
        business_reason:  form.business_reason  || null,
        company_id:       form.company_id       || null,
        plant_id:         form.plant_id         || null,
        created_by:       user?.id              || null,
        updated_by:       user?.id              || null,
        optional_documents: {
          reference_image_url:  form.ref_image_url    || null,
          vendor_quotation_url: form.vendor_quot_url  || null,
          sample_photo_url:     form.sample_photo_url || null,
          product_link:         form.product_link     || null,
        }
      };
      const url    = editId ? `${API_BASE}/item-creation-req/${editId}` : `${API_BASE}/item-creation-req/`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Save failed'); }
      showToast(editId ? '📝 Draft updated!' : '📝 Saved as Draft!');
      setView('list');
      loadRecords();
    } catch (e) { showToast(e.message, 'error'); }
    setSaving(false);
  };

  // ── save (create / update) ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.company_id)          { showToast('Company is required', 'error'); return; }
    if (!form.item_name.trim())    { showToast('Item Name is required', 'error'); return; }

    // ── DB-mandatory fields validation (company-scoped) ─────────────────────
    const DB_MAND_MAP = {
      item_name:            () => !form.item_name.trim(),
      item_description:     () => !form.item_description.trim(),
      item_short_name:      () => !form.item_short_name.trim(),
      item_type:            () => !form.item_type,
      department:           () => !form.department,
      required_date:        () => !form.required_date,
      business_reason:      () => !form.business_reason.trim(),
      plant_id:             () => !form.plant_id,
      reference_image_url:  () => !form.ref_image_url.trim(),
      vendor_quotation_url: () => !form.vendor_quot_url.trim(),
      sample_photo_url:     () => !form.sample_photo_url.trim(),
      product_link:         () => !form.product_link.trim(),
    };
    const DB_MAND_LABELS = {
      item_name: 'Item Name', item_description: 'Item Description',
      item_short_name: 'Item Short Name', item_type: 'Item Type',
      department: 'Department', required_date: 'Required Date',
      business_reason: 'Business Reason', plant_id: 'Plant',
      reference_image_url: 'Reference Image URL',
      vendor_quotation_url: 'Vendor Quotation URL',
      sample_photo_url: 'Sample Photo URL', product_link: 'Product Link',
    };
    for (const key of mandatoryKeys) {
      if (DB_MAND_MAP[key] && DB_MAND_MAP[key]()) {
        showToast(`${DB_MAND_LABELS[key] || key} is mandatory for this company`, 'error');
        return;
      }
    }

    // ── Mandatory change check (RETURNED request) ───────────────────────────
    // Agar rollback hua tha aur fields flagged hain, to kam se kam ek field
    // change honi chahiye — same values pe resubmit block karo
    if (editId && editReturnInfo && editReturnInfo.fields?.length > 0) {
      const FIELD_MAP = {
        'Item Name':        form.item_name.trim(),
        'Item Short Name':  form.item_short_name.trim(),
        'Item Type':        form.item_type,
        'Department':       form.department,
        'Required Date':    form.required_date,
        'Item Description': form.item_description.trim(),
        'Business Reason':  form.business_reason.trim(),
      };
      // Fetch current saved values to compare
      try {
        const chkRes = await fetch(`${API_BASE}/item-creation-req/${editId}`);
        if (chkRes.ok) {
          const chkData = await chkRes.json();
          const SAVED_MAP = {
            'Item Name':        chkData.item_name        || '',
            'Item Short Name':  chkData.item_short_name  || '',
            'Item Type':        chkData.item_type        || '',
            'Department':       chkData.department       || '',
            'Required Date':    chkData.required_date    || '',
            'Item Description': chkData.item_description || '',
            'Business Reason':  chkData.business_reason  || '',
          };
          const flaggedChanged = editReturnInfo.fields.some(fieldLabel => {
            const trimmedLabel = fieldLabel.trim();
            const savedVal = SAVED_MAP[trimmedLabel] || '';
            const newVal   = FIELD_MAP[trimmedLabel]  || '';
            return savedVal !== newVal;
          });
          if (!flaggedChanged) {
            showToast('Please change at least one flagged field before resubmitting.', 'error');
            setSaving(false);
            return;
          }
        }
      } catch { /* ignore — allow submit on fetch error */ }
    }

    // ── Capture before-state for diff (only when editing a RETURNED request) ──
    let beforeSnapshot = null;
    if (editId && editReturnInfo) {
      try {
        const bRes = await fetch(`${API_BASE}/item-creation-req/${editId}`);
        if (bRes.ok) {
          const bData = await bRes.json();
          beforeSnapshot = {
            item_name:        bData.item_name        || '',
            item_short_name:  bData.item_short_name  || '',
            item_type:        bData.item_type        || '',
            department:       bData.department       || '',
            required_date:    bData.required_date    || '',
            item_description: bData.item_description || '',
            business_reason:  bData.business_reason  || '',
          };
        }
      } catch { /* ignore, diff will just be empty */ }
    }

    setSaving(true);
    try {
      const body = {
        item_name:        form.item_name.trim(),
        item_description: form.item_description || null,
        item_short_name:  form.item_short_name  || null,
        item_type:        form.item_type        || null,
        department:       form.department       || null,
        required_date:    form.required_date    || null,
        business_reason:  form.business_reason  || null,
        company_id:       form.company_id       || null,
        plant_id:         form.plant_id         || null,
        created_by:       user?.id              || null,
        optional_documents: {
          reference_image_url:  form.ref_image_url    || null,
          vendor_quotation_url: form.vendor_quot_url  || null,
          sample_photo_url:     form.sample_photo_url || null,
          product_link:         form.product_link     || null,
        }
      };

      const url    = editId ? `${API_BASE}/item-creation-req/${editId}` : `${API_BASE}/item-creation-req/`;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Save failed');
      }

      const savedRec = await res.json();

      // ── Auto-grant user's own dept if not already in deptAccessMap ────────────
      // This ensures user can always see their own dept's data going forward
      if (user?.id && form.company_id && form.department) {
        const pa = getUserPrimaryAccess();
        if (pa && pa.dept_name === form.department && pa.company_id === form.company_id) {
          const grantedForCo = deptAccessMap[form.company_id] || [];
          const alreadyGranted = grantedForCo.some(d => d.department_name === form.department);
          if (!alreadyGranted && pa.dept_id) {
            try {
              await fetch(`${API_BASE}/user-dept-access/bulk-set`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id:        user.id,
                  company_id:     form.company_id,
                  department_ids: [pa.dept_id, ...grantedForCo.map(d => d.id).filter(Boolean)],
                  update_reason:  'Auto-granted: user submitted request from own department',
                  performed_by:   user.id,
                }),
              });
            } catch { /* silent — don't block save */ }
          }
        }
      }

      // ── Compute diff from before snapshot vs saved values ─────────────────
      let diffStr = '';
      if (beforeSnapshot) {
        const LABELS = {
          item_name:        'Item Name',
          item_short_name:  'Item Short Name',
          item_type:        'Item Type',
          department:       'Department',
          required_date:    'Required Date',
          item_description: 'Item Description',
          business_reason:  'Business Reason',
        };
        const afterSnap = {
          item_name:        form.item_name.trim(),
          item_short_name:  form.item_short_name.trim(),
          item_type:        form.item_type,
          department:       form.department,
          required_date:    form.required_date,
          item_description: form.item_description.trim(),
          business_reason:  form.business_reason.trim(),
        };
        const lines = [];
        Object.entries(LABELS).forEach(([key, label]) => {
          const b = beforeSnapshot[key] || '';
          const a = afterSnap[key]      || '';
          if (b !== a) lines.push(`${label}: "${b}" → "${a}"`);
        });
        diffStr = lines.join('\n');
      }

      // ── Resubmit workflow if this was a RETURNED request ───────────────────
      if (editId && editReturnInfo) {
        const wf = workflowStatusMap[editId];
        const instanceId = wf?.instance_id;
        const diffParam = diffStr ? `&diff=${encodeURIComponent(diffStr)}` : '';
        if (instanceId && user?.id) {
          try {
            const rsRes = await fetch(
              `${API_BASE}/workflow/resubmit/${instanceId}?submitted_by=${user.id}${diffParam}`,
              { method: 'POST', headers: { 'Content-Type': 'application/json' } }
            );
            if (rsRes.ok) {
              setEditReturnInfo(null);
              showToast('Request updated & resubmitted for approval!');
            } else {
              let errMsg = 'Unknown error';
              try { const rsErr = await rsRes.json(); errMsg = rsErr.detail || errMsg; } catch {}
              showToast(`Resubmit failed (${rsRes.status}): ${errMsg}`, 'error');
            }
          } catch (e) {
            showToast('Resubmit network error: ' + e.message, 'error');
          }
        } else {
          // instance_id missing — try to fetch fresh status then resubmit
          try {
            const stRes = await fetch(`${API_BASE}/workflow/status/ITEM_CREATION/${editId}`);
            if (stRes.ok) {
              const stData = await stRes.json();
              const freshInstanceId = stData?.instance_id;
              if (freshInstanceId) {
                const rsRes = await fetch(
                  `${API_BASE}/workflow/resubmit/${freshInstanceId}?submitted_by=${user.id}${diffParam}`,
                  { method: 'POST', headers: { 'Content-Type': 'application/json' } }
                );
                if (rsRes.ok) {
                  setEditReturnInfo(null);
                  showToast('Request updated & resubmitted for approval!');
                } else {
                  let errMsg = 'Unknown error';
                  try { const rsErr = await rsRes.json(); errMsg = rsErr.detail || errMsg; } catch {}
                  showToast(`Resubmit failed (${rsRes.status}): ${errMsg}`, 'error');
                }
              } else {
                showToast('Request updated! (workflow instance not found)', 'error');
              }
            } else {
              showToast('Request updated!');
            }
          } catch {
            showToast('Request updated!');
          }
        }
        setView('list');
        loadRecords();
        setSaving(false);
        return;
      }

      // ── Auto-submit workflow (only on CREATE, not edit) ─────────────────────
      if (!editId && savedRec?.id && form.company_id && user?.id) {
        try {
          // Find active template: company-specific first, then global (NULL company)
          const tmplRes = await fetch(`${API_BASE}/workflow/templates/?is_active=true`);
          const allTmpls = await tmplRes.json();
          const pageTmpls = Array.isArray(allTmpls)
            ? allTmpls.filter(t => t.entity_page === 'item-code-creation-req')
            : [];
          const tmpl =
            pageTmpls.find(t => t.company_id === form.company_id) ||
            pageTmpls.find(t => !t.company_id);

          if (tmpl) {
            const wfRes = await fetch(`${API_BASE}/workflow/submit/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                template_code: tmpl.code,
                entity_type:   'ITEM_CREATION',
                entity_id:     savedRec.id,
                submitted_by:  user.id,
              }),
            });
            if (wfRes.ok) {
              showToast('Request created & submitted for approval!');
            } else {
              const wfErr = await wfRes.json();
              showToast('Request saved. Workflow error: ' + (wfErr.detail || 'Unknown'), 'error');
            }
          } else {
            showToast('Request created! (No workflow template configured for this company yet)');
          }
        } catch {
          showToast('Request saved. Workflow auto-submit failed.', 'error');
        }
      } else {
        showToast(editId ? 'Request updated!' : 'Request created!');
      }

      setView('list');
      loadRecords();
    } catch (e) {
      showToast(e.message, 'error');
    }
    setSaving(false);
  };

  // ── Submit a saved DRAFT to workflow (called from list view) ────────────────
  const handleSubmitDraft = async (rec) => {
    // Only item_name is always required (minimum to identify the record)
    const missing = [];
    if (!rec.item_name?.trim()) missing.push('Item Name');
    // Check DB-mandatory fields for this company
    const DB_MAND_MAP = {
      item_name:            () => !rec.item_name?.trim(),
      item_description:     () => !rec.item_description?.trim(),
      item_short_name:      () => !rec.item_short_name?.trim(),
      item_type:            () => !rec.item_type,
      department:           () => !rec.department,
      required_date:        () => !rec.required_date,
      business_reason:      () => !rec.business_reason?.trim(),
      plant_id:             () => !rec.plant_id,
      reference_image_url:  () => !rec.optional_documents?.reference_image_url?.trim(),
      vendor_quotation_url: () => !rec.optional_documents?.vendor_quotation_url?.trim(),
      sample_photo_url:     () => !rec.optional_documents?.sample_photo_url?.trim(),
      product_link:         () => !rec.optional_documents?.product_link?.trim(),
    };
    const DB_MAND_LABELS = {
      item_name: 'Item Name', item_description: 'Item Description',
      item_short_name: 'Item Short Name', item_type: 'Item Type',
      department: 'Department', required_date: 'Required Date',
      business_reason: 'Business Reason', plant_id: 'Plant',
      reference_image_url: 'Reference Image URL',
      vendor_quotation_url: 'Vendor Quotation URL',
      sample_photo_url: 'Sample Photo URL', product_link: 'Product Link',
    };
    for (const key of mandatoryKeys) {
      if (DB_MAND_MAP[key] && DB_MAND_MAP[key]()) {
        const lbl = DB_MAND_LABELS[key] || key;
        if (!missing.includes(lbl)) missing.push(lbl);
      }
    }
    if (missing.length) {
      showToast(`Complete these fields first: ${missing.join(', ')}`, 'error');
      openEdit(rec);
      return;
    }
    try {
      // Fetch ALL active templates for this page — try company-specific first, then global (NULL company)
      const tmplRes = await fetch(`${API_BASE}/workflow/templates/?is_active=true`);
      const allTmpls = await tmplRes.json();
      const pageTmpls = Array.isArray(allTmpls)
        ? allTmpls.filter(t => t.entity_page === 'item-code-creation-req')
        : [];
      // Priority: 1) matching company_id  2) global (company_id = null)
      const tmpl =
        pageTmpls.find(t => t.company_id === rec.company_id) ||
        pageTmpls.find(t => !t.company_id);
      if (!tmpl) { showToast('No workflow template configured for this company', 'error'); return; }
      const wfRes = await fetch(`${API_BASE}/workflow/submit/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_code: tmpl.code, entity_type: 'ITEM_CREATION', entity_id: rec.id, submitted_by: user?.id }),
      });
      if (wfRes.ok) { showToast('✅ Draft submitted for approval!'); loadRecords(); }
      else { const e = await wfRes.json(); showToast('Submit failed: ' + (e.detail || 'Unknown'), 'error'); }
    } catch (e) { showToast('Submit error: ' + e.message, 'error'); }
  };

  // ── soft delete / cancel ────────────────────────────────────────────────────
  const handleDelete = (rec) => {
    setCancelReason('');
    setCancelModal(rec);
  };

  const confirmCancel = async () => {
    const rec = cancelModal;
    if (!rec) return;
    setCancelModal(null);
    try {
      const wf = workflowStatusMap[rec.id];
      // If workflow instance exists → cancel via workflow action (sends notification)
      if (wf?.instance_id) {
        const res = await fetch(`${API_BASE}/workflow/action/${wf.instance_id}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action_type: 'CANCEL',
            performed_by: user?.id,
            comments: cancelReason.trim() || 'Cancelled by submitter',
          }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Cancel failed'); }
        showToast('Request cancelled');
      } else {
        // Draft (no workflow yet) → just soft-delete
        await fetch(`${API_BASE}/item-creation-req/${rec.id}`, { method: 'DELETE' });
        showToast('Request deactivated');
      }
      loadRecords();
    } catch (e) { showToast(e.message, 'error'); }
  };

  // ── filtered list ─────────────────────────────────────────────────────────
  const filtered = records.filter(r => {
    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match = [r.item_name, r.item_type, r.department, r.company?.company_name, r.plant?.plant_name]
        .some(v => (v || '').toLowerCase().includes(q));
      if (!match) return false;
    }
    // Status tab filter
    if (statusTab !== 'ALL') {
      const wfStatus = workflowStatusMap[r.id]?.status || 'NOT_SUBMITTED';
      if (statusTab === 'NOT_SUBMITTED') {
        if (wfStatus !== 'NOT_SUBMITTED') return false;
      } else {
        if (wfStatus !== statusTab) return false;
      }
    }
    // Date range filter (on required_date)
    if (dateFrom && r.required_date && r.required_date < dateFrom) return false;
    if (dateTo   && r.required_date && r.required_date > dateTo)   return false;
    return true;
  });

  // ── status counts for tabs ────────────────────────────────────────────────
  const statusCounts = records.reduce((acc, r) => {
    const s = workflowStatusMap[r.id]?.status || 'NOT_SUBMITTED';
    acc[s] = (acc[s] || 0) + 1;
    acc.ALL = (acc.ALL || 0) + 1;
    return acc;
  }, {});

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER – LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  const renderList = () => (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header */}
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 24, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Item Code Creation Request 📋</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button title="Refresh" onClick={loadRecords} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}><RefreshCw size={13} /></button>
          <button onClick={() => setExportOpen(true)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', padding: '2px 8px', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600 }}><FileSpreadsheet size={12} /> Export</button>
          <button onClick={openCreate} style={{ padding: '2px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={12} /> New Request
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search item name, type, department, company…"
            style={{ width: '100%', padding: '5px 28px 5px 8px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 4, outline: 'none', color: '#374151' }} />
          {searchTerm
            ? <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={13} color="#9ca3af" /></button>
            : <Search size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          }
        </div>
      </div>

      {/* Status tabs + Date filter */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
        {/* Status tabs */}
        <div style={{ display: 'flex', overflowX: 'auto', padding: '0 8px', gap: 2 }}>
          {[
            { key: 'ALL',           label: 'All',          icon: '📋', color: '#374151', activeBg: '#374151' },
            { key: 'NOT_SUBMITTED', label: 'Draft',        icon: '📝', color: '#6b7280', activeBg: '#6b7280' },
            { key: 'PENDING',       label: 'Pending',      icon: '⏳', color: '#92400e', activeBg: '#d97706' },
            { key: 'IN_REVIEW',     label: 'In Review',    icon: '🔍', color: '#1e40af', activeBg: '#3b82f6' },
            { key: 'APPROVED',      label: 'Approved',     icon: '✅', color: '#065f46', activeBg: '#10b981' },
            { key: 'REJECTED',      label: 'Rejected',     icon: '❌', color: '#991b1b', activeBg: '#ef4444' },
            { key: 'RETURNED',      label: 'Returned',     icon: '↩️', color: '#7c2d12', activeBg: '#f97316' },
            { key: 'CANCELLED',     label: 'Cancelled',    icon: '🚫', color: '#4b5563', activeBg: '#9ca3af' },
          ].map(tab => {
            const cnt = statusCounts[tab.key] || 0;
            const active = statusTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setStatusTab(tab.key)}
                style={{
                  padding: '5px 10px', fontSize: 10, fontWeight: active ? 700 : 500,
                  background: active ? tab.activeBg : 'transparent',
                  color: active ? '#fff' : tab.color,
                  border: 'none', borderBottom: active ? '2px solid transparent' : '2px solid transparent',
                  borderRadius: '4px 4px 0 0', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                  marginTop: 4,
                  transition: 'all .12s',
                }}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {cnt > 0 && (
                  <span style={{
                    background: active ? 'rgba(255,255,255,0.3)' : '#e5e7eb',
                    color: active ? '#fff' : '#374151',
                    borderRadius: 99, padding: '0 5px', fontSize: 9, fontWeight: 700, minWidth: 16, textAlign: 'center',
                  }}>{cnt}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Date range filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px 7px', flexWrap: 'wrap', borderTop: '1px solid #e5e7eb', background: '#f3f4f6' }}>
          <span style={{ fontSize: 10, color: '#374151', fontWeight: 700, whiteSpace: 'nowrap' }}>📅 Req. Date:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ padding: '2px 6px', fontSize: 10, border: '1px solid #d1d5db', borderRadius: 3, color: '#374151', outline: 'none', cursor: 'pointer', colorScheme: 'light' }}
              onClick={e => e.target.showPicker?.()}
            />
            <span style={{ fontSize: 10, color: '#9ca3af' }}>to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ padding: '2px 6px', fontSize: 10, border: '1px solid #d1d5db', borderRadius: 3, color: '#374151', outline: 'none', cursor: 'pointer', colorScheme: 'light' }}
              onClick={e => e.target.showPicker?.()}
            />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 10, display: 'flex', alignItems: 'center', gap: 2 }}>
              <X size={11} /> Clear
            </button>
          )}
          {(statusTab !== 'ALL' || dateFrom || dateTo || searchTerm) && (
            <button onClick={() => { setStatusTab('ALL'); setDateFrom(''); setDateTo(''); setSearchTerm(''); }}
              style={{ marginLeft: 'auto', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 3, padding: '2px 8px', fontSize: 9, color: '#6b7280', cursor: 'pointer', fontWeight: 600 }}>
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {listLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 28 }}>⏳</div>
            <div style={{ fontSize: 11, color: '#666' }}>Loading requests…</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {['#', 'Request ID', 'Item Name', 'Short Name', 'Item Type', 'Department', 'Company', 'Plant', 'Req. Date', 'Ref. Image', 'Status', 'Active', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600, color: '#374151', borderRight: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={13} style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 11 }}>No records found.</td></tr>
              ) : filtered.map((rec, idx) => {
                const wfRow       = workflowStatusMap[rec.id];
                const isReturnedRow = wfRow?.status === 'RETURNED';
                const rowBg       = isReturnedRow ? '#fff7ed' : '';
                return (
                <tr key={rec.id} style={{ borderBottom: `1px solid ${isReturnedRow ? '#fed7aa' : '#f3f4f6'}`, background: rowBg }}
                  onMouseEnter={e => e.currentTarget.style.background = isReturnedRow ? '#ffedd5' : '#f0f9ff'}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', color: '#9ca3af' }}>{idx + 1}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', fontFamily: 'monospace', fontSize: 10, color: '#374151', whiteSpace: 'nowrap' }}>{rec.request_id || '—'}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', fontWeight: 500, color: '#111827' }}>{rec.item_name}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', color: '#374151' }}>{rec.item_short_name || '—'}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6' }}>{rec.item_type || '—'}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6' }}>{rec.department || '—'}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6' }}>{rec.company?.company_name || '—'}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6' }}>{rec.plant?.plant_name || '—'}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{rec.required_date || '—'}</td>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #f3f4f6' }}>
                    {rec.optional_documents?.reference_image_url ? (
                      <div style={{ position: 'relative', width: 36, height: 36 }}>
                        <img
                          src={rec.optional_documents.reference_image_url}
                          alt="Ref"
                          onError={e => { e.target.style.display = 'none'; }}
                          style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 3, border: '1px solid #d1d5db', display: 'block', cursor: 'pointer' }}
                          onClick={() => openZoom(rec.optional_documents.reference_image_url, rec.item_name)}
                        />
                        <button onClick={() => openZoom(rec.optional_documents.reference_image_url, rec.item_name)}
                          style={{ position: 'absolute', bottom: 1, right: 1, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '50%', width: 14, height: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                          <ZoomIn size={9} />
                        </button>
                      </div>
                    ) : <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6' }}>
                    {(() => {
                      const wf = workflowStatusMap[rec.id];
                      const wfStatus = wf?.status;
                      const stepApprovals = wf?.step_approvals || [];
                      const lastApproved  = stepApprovals.length > 0 ? stepApprovals[stepApprovals.length - 1] : null;
                      const returnComment = wf?.return_comment || '';
                      const STATUS_STYLE = {
                        PENDING:   { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending' },
                        IN_REVIEW: { bg: '#dbeafe', color: '#1e40af', label: '🔍 In Review' },
                        APPROVED:  { bg: '#d1fae5', color: '#065f46', label: '✅ Approved' },
                        REJECTED:  { bg: '#fee2e2', color: '#991b1b', label: '❌ Rejected' },
                        RETURNED:  { bg: '#ffedd5', color: '#7c2d12', label: '↩ Returned' },
                        CANCELLED: { bg: '#f3f4f6', color: '#6b7280', label: '🚫 Cancelled' },
                        DRAFT:     { bg: '#f3f4f6', color: '#6b7280', label: '📝 Draft' },
                      };
                      const s = STATUS_STYLE[wfStatus] || (rec.is_active
                        ? { bg: '#d1fae5', color: '#065f46', label: 'Active' }
                        : { bg: '#fee2e2', color: '#991b1b', label: 'Inactive' });

                      // Parse rollback fields from return_comment  e.g. "desc\nFields to correct: Item Name, Item Type"
                      let rollbackDesc = '';
                      let rollbackFields = [];
                      if (wfStatus === 'RETURNED' && returnComment) {
                        const lines = returnComment.split('\n');
                        lines.forEach(line => {
                          if (line.startsWith('Fields to correct:') || line.startsWith('Fields to fix:')) {
                            const pfx = line.startsWith('Fields to correct:') ? 'Fields to correct:' : 'Fields to fix:';
                            rollbackFields = line.replace(pfx, '').split(',').map(f => f.trim()).filter(Boolean);
                          } else if (line.trim()) {
                            rollbackDesc += (rollbackDesc ? '\n' : '') + line.trim();
                          }
                        });
                      }

                      return (
                        <div>
                          <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap', display: 'inline-block' }}>
                            {lastApproved && wfStatus !== 'NOT_SUBMITTED'
                              ? `Step ${lastApproved.step_order} ${wfStatus === 'APPROVED' ? 'Approved ✅' : 'Approved'}`
                              : s.label}
                          </span>
                          {lastApproved && (
                            <div style={{ marginTop: 2, fontSize: 9, color: '#6b7280', lineHeight: 1.4 }}>
                              <span style={{ fontWeight: 600, color: '#374151' }}>{lastApproved.approver_name || '—'}</span>
                              {lastApproved.approver_dept && <span style={{ color: '#9ca3af' }}> · {lastApproved.approver_dept}</span>}
                              {lastApproved.approved_at && (
                                <div style={{ color: '#9ca3af' }}>
                                  {new Date(lastApproved.approved_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          )}
                          {/* ── Rollback reason + fields ── */}
                          {wfStatus === 'RETURNED' && returnComment && (
                            <div style={{ marginTop: 4, background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 5, padding: '5px 7px', maxWidth: 200 }}>
                              {rollbackDesc && (
                                <p style={{ margin: '0 0 3px', fontSize: 9, color: '#92400e', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                  💬 {rollbackDesc}
                                </p>
                              )}
                              {rollbackFields.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: rollbackDesc ? 3 : 0 }}>
                                  {rollbackFields.map(f => (
                                    <span key={f} style={{ background: '#fed7aa', color: '#7c2d12', borderRadius: 4, padding: '1px 5px', fontSize: 8, fontWeight: 700, border: '1px solid #fb923c55' }}>
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  {/* is_active badge */}
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                    {rec.is_active
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b755' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                          Active
                        </span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a555' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                          Inactive
                        </span>
                    }
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {(() => {
                      const wfStatus = workflowStatusMap[rec.id]?.status;
                      const isLocked = ['APPROVED', 'REJECTED', 'CANCELLED'].includes(wfStatus);
                      const isReturned = wfStatus === 'RETURNED';
                      if (isLocked) {
                        // Only View button
                        return (
                          <button title="View" onClick={() => openView(rec)}
                            style={{ padding: '3px 8px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600 }}>
                            <Eye size={11} /> View
                          </button>
                        );
                      }
                      if (isReturned) {
                        // Resubmit button for returned
                        return (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button title="Edit & Resubmit" onClick={() => openEdit(rec)}
                              style={{ padding: '3px 8px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600 }}>
                              <Edit2 size={11} /> ↩ Resubmit
                            </button>
                          </div>
                        );
                      }
                      // Default: Draft (NOT_SUBMITTED) → Edit + Submit + Delete
                      const isDraft = !wfStatus || wfStatus === 'NOT_SUBMITTED';
                      return (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button title="Edit" onClick={() => openEdit(rec)}
                            style={{ padding: '3px 6px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Edit2 size={11} />
                          </button>
                          {isDraft && (
                            <button title="Submit for Approval" onClick={() => handleSubmitDraft(rec)}
                              style={{ padding: '3px 8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600 }}>
                              <Save size={10} /> Submit
                            </button>
                          )}
                          <button title="Cancel / Delete" onClick={() => handleDelete(rec)}
                            style={{ padding: '3px 6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              )})}
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

  // ── title-case formatter: single spaces, each word capitalised ──────────
  const toTitleInput = (val) => {
    // Replace multiple spaces with single space, then capitalise each word
    return val
      .replace(/ {2,}/g, ' ')
      .replace(/(^|\s)(\S)/g, (_, space, char) => space + char.toUpperCase());
  };

  // ── mandatory field highlight helper (from DB config) ────────────────────
  // field_key must match PAGE_FIELDS keys e.g. 'item_name', 'item_type'
  const isMandatoryField = (field_key) => mandatoryKeys.includes(field_key);

  // ── rollback highlight helper ─────────────────────────────────────────
  // Returns true if this field label was mentioned in the rollback fields list
  const isRollbackField = (label) => {
    if (!editReturnInfo?.fields?.length) return false;
    const clean = label.replace(/\s*\*$/, '').trim().toLowerCase();
    return editReturnInfo.fields.some(f => f.toLowerCase() === clean);
  };

  // ── small field helpers ────────────────────────────────────────────────
  const inp  = (label, key, opts = {}) => {
    const today   = new Date().toISOString().split('T')[0];
    const isDate  = opts.type === 'date';
    const flagged = isRollbackField(label);
    // field_key_map: label → field_key for mandatory lookup
    const LABEL_TO_KEY = {
      'Item Name': 'item_name', 'Item Short Name': 'item_short_name',
      'Item Description': 'item_description', 'Item Type': 'item_type',
      'Department': 'department', 'Required Date': 'required_date',
      'Business Reason': 'business_reason',
      'Reference Image URL': 'reference_image_url',
      'Vendor Quotation URL': 'vendor_quotation_url',
      'Sample Photo URL': 'sample_photo_url',
      'Product Link': 'product_link',
    };
    const cleanLabel = label.replace(/\s*\*$/, '').trim();
    const isMand = isMandatoryField(LABEL_TO_KEY[cleanLabel] || key);
    const borderColor = flagged ? '#f97316' : isMand ? '#ef4444' : '#ccc';
    const bgColor     = flagged ? '#fff7ed' : isMand ? '#fef2f2' : '#fff';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: flagged ? '#fff7ed' : isMand ? '#fef2f2' : 'transparent', borderRadius: 4, padding: (flagged || isMand) ? '2px 4px' : '0', outline: flagged ? '1.5px solid #f97316' : isMand ? '1.5px solid #ef4444' : 'none' }}>
        <label style={{ fontSize: 11, color: flagged ? '#7c2d12' : isMand ? '#991b1b' : '#000', minWidth: 130, fontWeight: (flagged || isMand) ? 700 : 400 }}>
          {flagged && <span style={{ marginRight: 3 }}>⚠️</span>}{label}{(opts.required || isMand) && <span style={{ color: '#dc2626' }}> *</span>}
        </label>
        <input
          type={opts.type || 'text'}
          value={form[key]}
          min={isDate ? today : undefined}
          onClick={isDate ? e => e.target.showPicker?.() : undefined}
          onChange={e => {
            const val = isDate ? e.target.value : toTitleInput(e.target.value);
            setForm(f => ({ ...f, [key]: val }));
          }}
          placeholder={opts.placeholder || ''}
          style={{ flex: 1, padding: '4px 6px', border: `1.5px solid ${borderColor}`, fontSize: 11, borderRadius: 2, color: '#000', cursor: isDate ? 'pointer' : 'text', background: bgColor }}
        />
      </div>
    );
  };

  const textarea = (label, key) => {
    const flagged = isRollbackField(label);
    const LABEL_TO_KEY = {
      'Item Description': 'item_description', 'Item Description *': 'item_description',
      'Business Reason': 'business_reason', 'Business Reason *': 'business_reason',
    };
    const cleanLabel = label.replace(/\s*\*$/, '').trim();
    const isMand = isMandatoryField(LABEL_TO_KEY[label] || LABEL_TO_KEY[cleanLabel] || key);
    const borderColor = flagged ? '#f97316' : isMand ? '#ef4444' : '#ccc';
    const bgColor     = flagged ? '#fff7ed' : isMand ? '#fef2f2' : '#fff';
    return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: flagged ? '#fff7ed' : isMand ? '#fef2f2' : 'transparent', borderRadius: 4, padding: (flagged || isMand) ? '2px 4px' : '0', outline: flagged ? '1.5px solid #f97316' : isMand ? '1.5px solid #ef4444' : 'none' }}>
      <label style={{ fontSize: 11, color: flagged ? '#7c2d12' : isMand ? '#991b1b' : '#000', minWidth: 130, paddingTop: 4, fontWeight: (flagged || isMand) ? 700 : 400 }}>
        {flagged && <span style={{ marginRight: 3 }}>⚠️</span>}{label}{isMand && !label.includes('*') && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      <textarea
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: toTitleInput(e.target.value) }))}
        rows={3}
        style={{ flex: 1, padding: '4px 6px', border: `1.5px solid ${borderColor}`, fontSize: 11, borderRadius: 2, color: '#000', resize: 'vertical', background: bgColor }}
      />
    </div>
    );
  };

  const lovField = (label, displayKey, modalKey, required = false) => {
    const isSingleCompany = modalKey === 'company' && companyOptions.length === 1;
    const handleLovClick = () => { if (!isSingleCompany) setModal(modalKey); };
    const flagged = isRollbackField(label);
    const LABEL_TO_KEY = {
      'Company': 'company_id', 'Plant': 'plant_id',
      'Item Type': 'item_type', 'Department': 'department',
    };
    const isMand = isMandatoryField(LABEL_TO_KEY[label] || displayKey);
    const borderColor = flagged ? '#f97316' : isMand ? '#ef4444' : '#ccc';
    const bgColor     = flagged ? '#fff7ed' : isMand ? '#fef2f2' : '#fff';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: flagged ? '#fff7ed' : isMand ? '#fef2f2' : 'transparent', borderRadius: 4, padding: (flagged || isMand) ? '2px 4px' : '0', outline: flagged ? '1.5px solid #f97316' : isMand ? '1.5px solid #ef4444' : 'none' }}>
        <label style={{ fontSize: 11, color: flagged ? '#7c2d12' : isMand ? '#991b1b' : '#000', minWidth: 130, fontWeight: (flagged || isMand) ? 700 : 400 }}>
          {flagged && <span style={{ marginRight: 3 }}>⚠️</span>}{label}{(required || isMand) && <span style={{ color: '#dc2626' }}> *</span>}
        </label>
        <div style={{ position: 'relative', flex: 1 }}>
          <input readOnly value={form[displayKey]} placeholder={`Select ${label}`}
            onClick={handleLovClick}
            style={{ width: '100%', padding: '4px 45px 4px 6px', border: `1.5px solid ${borderColor}`, fontSize: 11, borderRadius: 2, cursor: isSingleCompany ? 'default' : 'pointer', color: '#000', background: bgColor }} />
          {form[displayKey] && !isSingleCompany && (
            <button onClick={() => {
              const clearMap = {
                company_label: { company_id: null, company_label: '' },
                plant_label:   { plant_id: null,   plant_label: '' },
                item_type:     { item_type: '' },
                department:    { department: '' },
              };
              setForm(f => ({ ...f, ...(clearMap[displayKey] || { [displayKey]: '' }) }));
            }}
              style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X size={12} color="#ef4444" />
            </button>
          )}
          <button onClick={handleLovClick}
            style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: isSingleCompany ? 'default' : 'pointer' }}>
            <Search size={13} color="#999" />
          </button>
        </div>
      </div>
    );
  };

  // ── image upload helper ──────────────────────────────────────────────────
  const handleImageUpload = (fieldKey, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setForm(f => ({ ...f, [fieldKey]: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const imageUploadField = (label, urlKey) => {
    const flagged = isRollbackField(label);
    const LABEL_TO_KEY = {
      'Reference Image URL': 'reference_image_url',
      'Sample Photo URL': 'sample_photo_url',
    };
    const isMand = isMandatoryField(LABEL_TO_KEY[label] || urlKey);
    const borderColor = flagged ? '#f97316' : isMand ? '#ef4444' : '#d1d5db';
    const bgColor     = flagged ? '#fff7ed' : isMand ? '#fef2f2' : '#f9fafb';
    return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: flagged ? '#fff7ed' : isMand ? '#fef2f2' : 'transparent', borderRadius: 4, padding: (flagged || isMand) ? '4px 6px' : '0', outline: flagged ? '1.5px solid #f97316' : isMand ? '1.5px solid #ef4444' : 'none' }}>
      <label style={{ fontSize: 11, color: flagged ? '#7c2d12' : isMand ? '#991b1b' : '#000', fontWeight: (flagged || isMand) ? 700 : 500 }}>
        {flagged && <span style={{ marginRight: 3 }}>⚠️</span>}{label}{isMand && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* thumbnail — fixed space reserved always, shows image or empty box */}
        <div style={{ width: 44, height: 44, flexShrink: 0, border: `1px solid ${borderColor}`, borderRadius: 4, background: bgColor, overflow: 'hidden', position: 'relative', cursor: form[urlKey] ? 'pointer' : 'default' }}
          onClick={() => { if (form[urlKey]) openZoom(form[urlKey], label); }}>
          {form[urlKey] ? (
            <>
              <img src={form[urlKey]} alt={label}
                onError={e => { e.target.style.display = 'none'; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button onClick={e => { e.stopPropagation(); openZoom(form[urlKey], label); }}
                style={{ position: 'absolute', bottom: 1, right: 1, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                <ZoomIn size={9} />
              </button>
            </>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={16} color={flagged ? '#f97316' : isMand ? '#ef4444' : '#d1d5db'} />
            </div>
          )}
        </div>
        {/* url input */}
        <input
          value={form[urlKey]}
          onChange={e => setForm(f => ({ ...f, [urlKey]: e.target.value }))}
          placeholder="https://… or upload a file"
          style={{ flex: 1, padding: '4px 6px', border: `1.5px solid ${borderColor}`, fontSize: 11, borderRadius: 2, color: '#000', background: flagged ? '#fff7ed' : isMand ? '#fef2f2' : '#fff' }}
        />
        {/* upload button */}
        <label style={{ cursor: 'pointer', padding: '4px 8px', background: '#3b82f6', color: '#fff', borderRadius: 3, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', flexShrink: 0 }}
          onClick={e => e.stopPropagation()}>
          <Upload size={11} /> Upload
          <input type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { e.stopPropagation(); if (e.target.files[0]) handleImageUpload(urlKey, e.target.files[0]); }} />
        </label>
        {/* remove button — only when image present */}
        {form[urlKey] && (
          <button onClick={() => setForm(f => ({ ...f, [urlKey]: '' }))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, flexShrink: 0 }}>
            <X size={13} />
          </button>
        )}
      </div>
    </div>
    );
  };

  // ── zoom image modal ──────────────────────────────────────────────────────
  const renderZoomModal = () => {
    if (!zoomModal) return null;
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99998 }}
        onClick={closeZoom}>
        <div style={{ width: 700, maxWidth: '90vw', height: 550, maxHeight: '85vh', background: '#fff', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}>
          {/* header */}
          <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32, flexShrink: 0 }}>
            <span>{zoomModal.label} — Zoom: {imageZoom.toFixed(1)}x</span>
            <button onClick={closeZoom} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={16} /></button>
          </div>
          {/* controls */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#f9fafb', flexShrink: 0 }}>
            <button onClick={() => handleZoomDelta(-0.5)} disabled={imageZoom <= 1}
              style={{ padding: '4px 12px', fontSize: 10, background: imageZoom <= 1 ? '#e5e7eb' : '#3b82f6', color: imageZoom <= 1 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: imageZoom <= 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
              Zoom Out (-)
            </button>
            <button onClick={() => { setImageZoom(1); setImagePosition({ x: 0, y: 0 }); }}
              style={{ padding: '4px 12px', fontSize: 10, background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
              Reset (1x)
            </button>
            <button onClick={() => handleZoomDelta(0.5)} disabled={imageZoom >= 5}
              style={{ padding: '4px 12px', fontSize: 10, background: imageZoom >= 5 ? '#e5e7eb' : '#3b82f6', color: imageZoom >= 5 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: imageZoom >= 5 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
              Zoom In (+)
            </button>
            <span style={{ fontSize: 10, color: '#666', marginLeft: 8 }}>💡 Scroll to zoom, drag to pan</span>
          </div>
          {/* image area */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1f2937', position: 'relative', cursor: imageZoom > 1 ? (isDraggingImg ? 'grabbing' : 'grab') : 'default', touchAction: 'none' }}
            onMouseDown={handleZoomMouseDown}
            onMouseMove={handleZoomMouseMove}
            onMouseUp={handleZoomMouseUp}
            onMouseLeave={handleZoomMouseUp}
            onWheel={e => { e.preventDefault(); handleZoomDelta(e.deltaY > 0 ? -0.25 : 0.25); }}>
            <img src={zoomModal.url} alt={zoomModal.label}
              style={{ transform: `scale(${imageZoom}) translate(${imagePosition.x / imageZoom}px, ${imagePosition.y / imageZoom}px)`, transition: isDraggingImg ? 'none' : 'transform 0.15s ease-out', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none', willChange: 'transform' }}
              draggable={false} />
          </div>
          <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8, flexShrink: 0 }} />
        </div>
      </div>
    );
  };

  const renderForm = () => {
    // In view mode all fields are read-only plain text
    const ro = (label, value, opts = {}) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 11, color: '#6b7280', minWidth: 130 }}>{label}</label>
        <span style={{ flex: 1, padding: '4px 6px', fontSize: 11, color: '#111827', fontWeight: 500 }}>
          {value || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>}
        </span>
      </div>
    );
    const roTextarea = (label, value) => (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <label style={{ fontSize: 11, color: '#6b7280', minWidth: 130, paddingTop: 4 }}>{label}</label>
        <span style={{ flex: 1, padding: '4px 6px', fontSize: 11, color: '#111827', fontWeight: 500, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {value || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>}
        </span>
      </div>
    );

    return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header */}
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 24, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>
          {viewMode ? '👁️ View Item Code Creation Request' : editId ? '✏️ Edit Item Code Creation Request' : '➕ New Item Code Creation Request'}
        </h2>
        <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={15} /></button>
      </div>

      {/* View mode banner */}
      {viewMode && (
        <div style={{ background: '#f0f9ff', borderBottom: '2px solid #60a5fa', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Eye size={13} color="#2563eb" />
          <span style={{ fontSize: 11, color: '#1e40af', fontWeight: 600 }}>
            This request has been approved — editing is not allowed.
          </span>
        </div>
      )}

      {/* Rollback / RETURNED banner */}
      {!viewMode && editReturnInfo && (
        <div style={{ background: '#fff7ed', borderBottom: '2px solid #f97316', padding: '8px 12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: editReturnInfo.fields.length > 0 ? 6 : 0 }}>
            <span style={{ fontSize: 13 }}>↩️</span>
            <span style={{ fontSize: 11, color: '#7c2d12', fontWeight: 700 }}>This request was returned for correction</span>
          </div>
          {editReturnInfo.desc && (
            <p style={{ margin: '0 0 5px', fontSize: 10, color: '#92400e', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {editReturnInfo.desc}
            </p>
          )}
          {editReturnInfo.fields.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#7c2d12', textTransform: 'uppercase', letterSpacing: 0.5 }}>Fields to correct:</span>
              {editReturnInfo.fields.map(f => (
                <span key={f} style={{ background: '#fed7aa', color: '#7c2d12', borderRadius: 4, padding: '2px 7px', fontSize: 9, fontWeight: 700, border: '1px solid #fb923c' }}>
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>

        {/* ── Section 1: Company / Plant ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 10 }}>
            🏢 Company & Plant
          </div>
          {viewMode ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
              {ro('Company', form.company_label)}
              {ro('Plant', form.plant_label)}
            </div>
          ) : optionsLoading ? (
            <div style={{ fontSize: 11, color: '#6b7280', padding: 8 }}>Loading your company access…</div>
          ) : companyOptions.length === 0 ? (
            <div style={{ fontSize: 11, color: '#dc2626', padding: 8 }}>⚠️ No company access found. Contact administrator.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
              {lovField('Company', 'company_label', 'company')}
              {/* Plant — mandatory-aware */}
              {(() => {
                const isPlantMand = isMandatoryField('plant_id');
                const flagged     = isRollbackField('Plant');
                const borderColor = flagged ? '#f97316' : isPlantMand ? '#ef4444' : '#ccc';
                const bgColor     = !form.company_id ? '#f3f4f6' : flagged ? '#fff7ed' : isPlantMand ? '#fef2f2' : '#fff';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: flagged ? '#fff7ed' : isPlantMand ? '#fef2f2' : 'transparent', borderRadius: 4, padding: (flagged || isPlantMand) ? '2px 4px' : '0', outline: flagged ? '1.5px solid #f97316' : isPlantMand ? '1.5px solid #ef4444' : 'none' }}>
                    <label style={{ fontSize: 11, color: form.company_id ? (flagged ? '#7c2d12' : isPlantMand ? '#991b1b' : '#000') : '#9ca3af', minWidth: 130, fontWeight: (flagged || isPlantMand) ? 700 : 400 }}>
                      {flagged && <span style={{ marginRight: 3 }}>⚠️</span>}
                      Plant{isPlantMand
                        ? <span style={{ color: '#dc2626' }}> *</span>
                        : <span style={{ color: '#6b7280', fontSize: 10 }}> (Optional)</span>}
                    </label>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input readOnly value={form.plant_label}
                        placeholder={form.company_id ? 'Select Plant' : 'Select Company first'}
                        onClick={() => { if (form.company_id) setModal('plant'); }}
                        style={{ width: '100%', padding: '4px 45px 4px 6px', border: `1.5px solid ${borderColor}`, fontSize: 11, borderRadius: 2, cursor: form.company_id ? 'pointer' : 'not-allowed', color: form.company_id ? '#000' : '#9ca3af', background: bgColor }} />
                      {form.plant_label && form.company_id && (
                        <button onClick={() => setForm(f => ({ ...f, plant_id: null, plant_label: '' }))}
                          style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                          <X size={12} color='#ef4444' />
                        </button>
                      )}
                      <Search size={13} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: form.company_id ? '#999' : '#d1d5db' }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ── Section 2: Basic Info ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 10 }}>
            📝 Basic Item Information
          </div>
          {viewMode ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                {ro('Item Name', form.item_name)}
                {ro('Item Short Name', form.item_short_name)}
                {ro('Item Type', form.item_type)}
                {ro('Department', form.department)}
                {ro('Required Date', form.required_date)}
              </div>
              <div style={{ marginTop: 8 }}>{roTextarea('Item Description', form.item_description)}</div>
              <div style={{ marginTop: 8 }}>{roTextarea('Business Reason', form.business_reason)}</div>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                {inp('Item Name', 'item_name', {})}
                {inp('Item Short Name', 'item_short_name', {})}
                {lovField('Item Type', 'item_type', 'itemType')}
                {/* Department field ─────────────────────────────────────────────
                     Single dept  → auto-filled + locked (no popup, no search icon)
                     Multiple dept → clickable LOV (user picks)
                     No company   → greyed out placeholder
                ─────────────────────────────────────────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isRollbackField('Department') ? '#fff7ed' : isMandatoryField('department') ? '#fef2f2' : 'transparent', borderRadius: 4, padding: (isRollbackField('Department') || isMandatoryField('department')) ? '2px 4px' : '0', outline: isRollbackField('Department') ? '1.5px solid #f97316' : isMandatoryField('department') ? '1.5px solid #ef4444' : 'none' }}>
                  <label style={{ fontSize: 11, color: (form.company_id ? (isRollbackField('Department') ? '#7c2d12' : isMandatoryField('department') ? '#991b1b' : '#000') : '#9ca3af'), minWidth: 130, fontWeight: (isRollbackField('Department') || isMandatoryField('department')) ? 700 : 400 }}>
                    {isRollbackField('Department') && <span style={{ marginRight: 3 }}>⚠️</span>}Department{isMandatoryField('department') && <span style={{ color: '#dc2626' }}> *</span>}
                  </label>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      readOnly
                      value={form.department}
                      title={isSingleDept && form.department ? `Auto-set: ${form.department}` : ''}
                      placeholder={
                        !form.company_id
                          ? 'Select Company first'
                          : isSingleDept && form.department
                          ? form.department
                          : 'Select Department'
                      }
                      onClick={() => {
                        // Only open LOV when company selected AND multiple depts available
                        if (form.company_id && !isSingleDept) setModal('department');
                      }}
                      style={{
                        width: '100%',
                        padding: isSingleDept && form.department ? '4px 28px 4px 6px' : '4px 45px 4px 6px',
                        border: `1.5px solid ${isRollbackField('Department') ? '#f97316' : isMandatoryField('department') ? '#ef4444' : isSingleDept && form.department ? '#10b981' : '#ccc'}`,
                        fontSize: 11, borderRadius: 2,
                        color: form.company_id ? '#000' : '#9ca3af',
                        background: !form.company_id
                          ? '#f3f4f6'
                          : isRollbackField('Department')
                          ? '#fff7ed'
                          : isMandatoryField('department')
                          ? '#fef2f2'
                          : isSingleDept && form.department
                          ? '#f0fdf4'   // light green — auto-filled
                          : '#fff',
                        cursor: form.company_id && !isSingleDept ? 'pointer' : 'default',
                      }}
                    />
                    {/* Single dept: show lock icon (auto-set, no interaction) */}
                    {isSingleDept && form.department && (
                      <span title="Auto-set from your access" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#10b981', userSelect: 'none' }}>🔒</span>
                    )}
                    {/* Multiple dept + value: show clear button + search icon */}
                    {!isSingleDept && form.department && form.company_id && (
                      <button onClick={() => setForm(f => ({ ...f, department: '' }))}
                        style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                        <X size={12} color="#ef4444" />
                      </button>
                    )}
                    {/* Multiple dept: show search icon */}
                    {!isSingleDept && (
                      <Search size={13} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: form.company_id ? '#999' : '#d1d5db', pointerEvents: 'none' }} />
                    )}
                  </div>
                </div>
                {inp('Required Date', 'required_date', { type: 'date' })}
              </div>
              <div style={{ marginTop: 8 }}>{textarea('Item Description', 'item_description')}</div>
              <div style={{ marginTop: 8 }}>{textarea('Business Reason', 'business_reason')}</div>
            </>
          )}
        </div>

        {/* ── Section 3: Optional Documents / Images ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 10 }}>
            📎 Optional Documents & Images
          </div>
          {viewMode ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
              {/* Reference Image */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Reference Image</label>
                {form.ref_image_url
                  ? <div style={{ position: 'relative', width: 60, height: 60 }}>
                      <img src={form.ref_image_url} alt="Ref" onError={e => { e.target.style.display='none'; }}
                        style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #d1d5db', cursor: 'pointer' }}
                        onClick={() => openZoom(form.ref_image_url, 'Reference Image')} />
                    </div>
                  : <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>Not provided</span>}
              </div>
              {/* Sample Photo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Sample Photo</label>
                {form.sample_photo_url
                  ? <div style={{ position: 'relative', width: 60, height: 60 }}>
                      <img src={form.sample_photo_url} alt="Sample" onError={e => { e.target.style.display='none'; }}
                        style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #d1d5db', cursor: 'pointer' }}
                        onClick={() => openZoom(form.sample_photo_url, 'Sample Photo')} />
                    </div>
                  : <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>Not provided</span>}
              </div>
              {ro('Vendor Quotation URL', form.vendor_quot_url)}
              {ro('Product Link', form.product_link)}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                {imageUploadField('Reference Image URL', 'ref_image_url')}
                {imageUploadField('Sample Photo URL', 'sample_photo_url')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginTop: 8 }}>
                {inp('Vendor Quotation URL', 'vendor_quot_url', { placeholder: 'https://…' })}
                {inp('Product Link', 'product_link', { placeholder: 'https://…' })}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Actions */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#f9fafb' }}>
        {/* Left — Cancel */}
        <button onClick={() => setView('list')}
          style={{ padding: '5px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
          {viewMode ? 'Close' : 'Cancel'}
        </button>

        {/* Right — Draft + Submit */}
        {!viewMode && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Save as Draft: only for new/edit, not for RETURNED resubmit */}
            {!editReturnInfo && (
              <button onClick={handleSaveDraft} disabled={saving}
                style={{ padding: '5px 16px', background: '#fff', color: '#6b7280', border: '1.5px dashed #9ca3af', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, opacity: saving ? 0.6 : 1 }}>
                📝 {saving ? 'Saving…' : editId ? 'Update Draft' : 'Save as Draft'}
              </button>
            )}
            {/* Save & Submit: full validation + workflow */}
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '5px 20px', background: saving ? '#9ca3af' : '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={13} />
              {saving ? 'Saving…' : editReturnInfo ? 'Update & Resubmit' : editId ? 'Save & Submit' : 'Save & Submit'}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8, flexShrink: 0 }} />
    </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  MODALS
  // ══════════════════════════════════════════════════════════════════════════
  const renderModal = () => {
    if (!modal) return null;

    if (modal === 'company') {
      const items = companyOptions.map(c => ({ code: c.company_code || String(c.id), name: c.company_name }));
      return (
        <LOVModal title="SELECT COMPANY" items={items}
          onSelect={item => {
            const co = companyOptions.find(c => c.company_name === item.name || c.company_code === item.code);
            if (!co) { setModal(null); return; }
            const newCompId = Number(co.id);

            // ── Immediately compute dept for the newly selected company ──────
            // This runs synchronously so dept is set in the SAME state update.
            // We do NOT rely on the useEffect (which only fires on company_id change).
            const mergedDepts = getMergedDeptsForCompany(newCompId);
            let autoDept = '';
            if (mergedDepts.length === 1) {
              // Only one dept → always auto-set
              autoDept = mergedDepts[0].department_name;
            } else if (mergedDepts.length > 1) {
              // Multiple depts → try user's own dept for this company
              const ownDeptName = getOwnDeptForCompany(newCompId);
              if (ownDeptName) {
                const ownDept = mergedDepts.find(
                  dep => dep.department_name?.toLowerCase() === ownDeptName?.toLowerCase()
                );
                if (ownDept) autoDept = ownDept.department_name;
              }
            }

            setForm(f => ({
              ...f,
              company_id:    newCompId,
              company_label: co.company_name,
              plant_id:      null,
              plant_label:   '',
              department:    autoDept,   // set dept immediately — no popup
            }));
            // Update plant options for this company
            setPlantOptions(co.plants || []);
            setModal(null);
          }}
          onClose={() => setModal(null)} />
      );
    }

    if (modal === 'plant') {
      if (!form.company_id) {
        showToast('Please select a Company first', 'error');
        setModal(null);
        return null;
      }
      const items = plantOptions.map(p => ({ code: p.plant_code || String(p.id), name: p.plant_name }));
      return (
        <LOVModal title="SELECT PLANT" items={items}
          onSelect={item => {
            const pl = plantOptions.find(p => p.plant_name === item.name || p.plant_code === item.code);
            setForm(f => ({ ...f, plant_id: pl?.id || null, plant_label: item.name }));
            setModal(null);
          }}
          onClose={() => setModal(null)} />
      );
    }

    if (modal === 'itemType') {
      return (
        <LOVModal title="SELECT ITEM TYPE" items={itemTypeList}
          onSelect={item => { setForm(f => ({ ...f, item_type: item.name })); setModal(null); }}
          onClose={() => setModal(null)} />
      );
    }

    if (modal === 'department') {
      return (
        <LOVModal
          title="SELECT DEPARTMENT"
          subtitle={form.company_label || ''}
          items={userDepartments}
          onSelect={item => { setForm(f => ({ ...f, department: item.name })); setModal(null); }}
          onClose={() => setModal(null)}
        />
      );
    }

    return null;
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  EXPORT COLUMN DEFINITIONS
  // ══════════════════════════════════════════════════════════════════════════
  const EXPORT_COLUMNS = [
    { key: '#',                        label: '#',                      preset: ['summary','detailed','full'], width: 5 },
    { key: 'item_name',                label: 'Item Name',              preset: ['summary','detailed','full'], width: 22 },
    { key: 'item_short_name',          label: 'Item Short Name',        preset: ['summary','detailed','full'], width: 20 },
    { key: 'item_type',                label: 'Item Type',              preset: ['summary','detailed','full'], width: 16 },
    { key: 'company.company_name',     label: 'Company',                preset: ['summary','detailed','full'], width: 18 },
    { key: 'plant.plant_name',         label: 'Plant',                  preset: ['detailed','full'],           width: 14 },
    { key: 'department',               label: 'Department',             preset: ['summary','detailed','full'], width: 16 },
    { key: 'required_date',            label: 'Required Date',          preset: ['summary','detailed','full'], width: 18 },
    { key: 'item_description',         label: 'Item Description',       preset: ['detailed','full'],           width: 28 },
    { key: 'business_reason',          label: 'Business Reason',        preset: ['detailed','full'],           width: 28 },
    { key: 'optional_documents.reference_image_url', label: 'Reference Image URL', preset: ['full'], width: 30 },
    { key: 'optional_documents.sample_photo_url',    label: 'Sample Photo URL',    preset: ['full'], width: 30 },
    { key: 'optional_documents.vendor_quotation_url',label: 'Vendor Quotation URL',preset: ['full'], width: 30 },
    { key: 'optional_documents.product_link',        label: 'Product Link',        preset: ['full'], width: 24 },
    // Workflow status (from workflowStatusMap — enriched below)
    { key: '_wfStatus',                label: 'Status',                 preset: ['summary','detailed','full'], width: 14 },
    { key: '_wfInstanceId',            label: 'Instance ID',            preset: ['detailed','full'],           width: 14 },
    // Creator info
    { key: 'creator.full_name',        label: 'Created By',             preset: ['summary','detailed','full'], width: 18,
      format: (v, row) => v || row.creator?.username || (row.created_by ? 'User#'+row.created_by : '—') },
    { key: 'created_by',               label: 'Created By (ID)',        preset: ['detailed','full'],           width: 12 },
    { key: 'created_at',               label: 'Created At',             preset: ['detailed','full'],           width: 22,
      format: (v) => v ? new Date(v).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—' },
    // Updater info
    { key: 'updated_by',               label: 'Last Updated By (ID)',   preset: ['detailed','full'],           width: 14 },
    { key: 'updater.full_name',        label: 'Last Updated By',        preset: ['detailed','full'],           width: 18,
      format: (v, row) => v || row.updater?.username || (row.updated_by ? 'User#'+row.updated_by : '—') },
    { key: 'updated_at',               label: 'Last Updated At',        preset: ['detailed','full'],           width: 22,
      format: (v) => v ? new Date(v).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—' },
    // Workflow timestamps
    { key: '_wfSubmittedAt',           label: 'Submitted At',           preset: ['summary','detailed','full'], width: 22 },
    { key: '_wfCompletedAt',           label: 'Completed At',           preset: ['summary','detailed','full'], width: 22 },
    // Last action
    { key: '_lastActionName',          label: 'Last Action By',         preset: ['summary','detailed','full'], width: 18 },
    { key: '_lastActionUserId',        label: 'Last Action By (ID)',     preset: ['detailed','full'],           width: 14 },
    { key: '_lastActionType',          label: 'Last Action Type',       preset: ['summary','detailed','full'], width: 16 },
    // Full action history string
    { key: '_actionHistoryStr',        label: 'Action History',         preset: ['full'],                      width: 50 },
  ];

  // Enrich records with workflow data for export
  const exportData = records.map(rec => {
    const wf = workflowStatusMap[rec.id];
    const acts = wf?.step_approvals
      ? wf.step_approvals.flatMap(s => s.actions || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      : [];
    const lastAct = acts.length ? acts[acts.length - 1] : null;
    const fmtD = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
    const actHistStr = acts.map(a =>
      `${a.performer?.full_name || 'User#' + a.performed_by}(ID:${a.performed_by || '?'}) — ${a.action_type}${a.comments ? ' [' + a.comments + ']' : ''} @ ${fmtD(a.created_at)}`
    ).join(' | ');
    return {
      ...rec,
      _wfStatus:         wf?.status || 'NOT_SUBMITTED',
      _wfInstanceId:     wf?.instance_id || '',
      _wfSubmittedAt:    fmtD(wf?.submitted_at),
      _wfCompletedAt:    fmtD(wf?.completed_at),
      _lastActionName:   lastAct ? (lastAct.performer?.full_name || 'User#' + lastAct.performed_by) : '—',
      _lastActionUserId: lastAct ? String(lastAct.performed_by || '') : '—',
      _lastActionType:   lastAct?.action_type || '—',
      _actionHistoryStr: actHistStr || '—',
      _actions:          acts,   // used by PDF Direct card layout
    };
  });

  // Active filter summary for export
  const exportFilters = {
    ...(statusTab !== 'ALL'  ? { Status: statusTab } : {}),
    ...(dateFrom             ? { 'Date From': dateFrom } : {}),
    ...(dateTo               ? { 'Date To': dateTo } : {}),
    ...(searchTerm           ? { Search: searchTerm } : {}),
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  ROOT RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {view === 'list' ? renderList() : renderForm()}
      {renderModal()}
      {renderZoomModal()}
      {/* ── Cancel Reason Modal ── */}
      {cancelModal && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,.25)', overflow: 'hidden' }}>
            {/* Accent bar */}
            <div style={{ height: 3, background: 'linear-gradient(to right, #6b7280, #374151)' }} />
            {/* Header */}
            <div style={{ background: '#f9fafb', padding: '14px 16px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚫</div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#374151' }}>Cancel Request</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9ca3af' }}>This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setCancelModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <X size={14} />
              </button>
            </div>
            {/* Body */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '7px 10px', marginBottom: 12, fontSize: 11 }}>
                <span style={{ color: '#9ca3af' }}>Request: </span>
                <span style={{ color: '#111827', fontWeight: 600 }}>{cancelModal.item_name}</span>
              </div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 5 }}>
                Cancellation Reason <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Why are you cancelling this request?…"
                rows={3}
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#374151', fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                onFocus={e => { e.target.style.borderColor = '#6b7280'; }}
                onBlur={e => { e.target.style.borderColor = '#d1d5db'; }}
              />
            </div>
            {/* Footer */}
            <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setCancelModal(null)}
                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', borderRadius: 6, padding: '6px 16px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                Keep Request
              </button>
              <button onClick={confirmCancel}
                style={{ background: '#374151', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 18px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                🚫 Confirm Cancel
              </button>
            </div>
            <div style={{ height: 4, background: 'linear-gradient(to right, #374151, #60a5fa)' }} />
          </div>
        </div>
      )}

      <UniversalExport
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        data={exportData}
        columns={EXPORT_COLUMNS}
        reportTitle="Item Code Creation Requests"
        user={user}
        activeFilters={exportFilters}
        filterFn={row => {
          if (searchTerm) {
            const q = searchTerm.toLowerCase();
            const match = [row.item_name, row.item_type, row.department, row.company?.company_name, row.plant?.plant_name]
              .some(v => (v || '').toLowerCase().includes(q));
            if (!match) return false;
          }
          if (statusTab !== 'ALL') {
            const wfStatus = row._wfStatus || 'NOT_SUBMITTED';
            if (statusTab === 'NOT_SUBMITTED' ? wfStatus !== 'NOT_SUBMITTED' : wfStatus !== statusTab) return false;
          }
          if (dateFrom && row.required_date && row.required_date < dateFrom) return false;
          if (dateTo   && row.required_date && row.required_date > dateTo)   return false;
          return true;
        }}
        pageName="ItemCodeCreationReq"
      />
    </div>
  );
};

export default ItemCodeCreationReq;