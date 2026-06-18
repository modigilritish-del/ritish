/**
 * ItemInfoForwardPopup.jsx  —  MDM/
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable popup: MDM approver forwards an Item Info mapping task.
 *
 * Props:
 *   open          {boolean}  — show/hide
 *   onClose       {fn}       — called when popup closes
 *   onSaveInfo    {fn}       — called when "Save Info" clicked (open ItemInfoMaster directly)
 *   onForward     {fn(result)} — called after successful forward (result = API response)
 *   mappingRecord {object}   — full ICR record { id, request_id, item_name, company_id, … }
 *   userId        {number}   — current MDM approver's user_id
 *
 *   ── Workflow Routing Mode (builder se aata hai) ──────────────────────────
 *   workflowMode       {boolean}  — jab true ho tab routing configurator mode on
 *   workflowCompanyId  {number}   — workflow ki active company ka ID
 *   workflowCompanyName {string}  — workflow ki active company ka naam (display ke liye)
 *
 * What it does:
 *   NORMAL MODE (workflowMode falsy):
 *     1. Fetches approver's companies + depts + page-access status
 *     2. Shows company list → dept list with green/red access badge
 *     3. "Forward" button: POST /mdm/item-info-forward/send
 *     4. "Save Info" button: open ItemInfoMaster directly (no forward)
 *     5. Shows result: who was notified, what the status was
 *
 *   WORKFLOW ROUTING MODE (workflowMode=true):
 *     1. Fetches all departments of the workflow's company
 *     2. For each source dept, user can set: target company → target dept
 *     3. "Save Routing" button: POST /mdm/item-info-forward/routing
 *     4. Loads existing routing if already saved
 *
 * This component has ZERO side-effects on MdmMyReq.jsx's main flow.
 * It only uses: API calls + its own state.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, XCircle, ArrowRight, Send, Info, Building2, Users, Loader, GitBranch, Save, ChevronRight } from 'lucide-react';

const API = 'http://localhost:8000/api';

// ── Small spinner ─────────────────────────────────────────────────────────────
const Spin = ({ size = 14 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    border: '2px solid #2e3349', borderTopColor: '#6366f1',
    animation: 'iifpSpin .7s linear infinite', display: 'inline-block', flexShrink: 0,
  }} />
);

// ── Access badge ──────────────────────────────────────────────────────────────
const AccessBadge = ({ has, loading }) => {
  if (loading) return <Spin size={11} />;
  if (has === null || has === undefined) return null;
  return has ? (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3,
      background:'#0d2e22', color:'#34d399', border:'1px solid #34d39944',
      borderRadius:20, padding:'1px 7px', fontSize:8, fontWeight:700 }}>
      <CheckCircle size={8}/> Access
    </span>
  ) : (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3,
      background:'#2e1515', color:'#f87171', border:'1px solid #f8717144',
      borderRadius:20, padding:'1px 7px', fontSize:8, fontWeight:700 }}>
      <XCircle size={8}/> No Access
    </span>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  TargetPanel — expanded panel for each source dept row
//  (extracted to avoid IIFE-in-JSX syntax issues)
// ══════════════════════════════════════════════════════════════════════════════
const TargetPanel = ({
  dept, routed, activeTab, setRoutingTab,
  targetCompanies, loadingTgt,
  targetDepts, loadingDepts, fetchTargetDepts,
  targetUsers, loadingUsers, fetchTargetUsers,
  routing, setRouting, setDeptRouting, setUserRouting, S,
}) => {
  return (
    <div style={S.targetPanel}>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid #2e3349', marginBottom:8 }}>
        <button style={S.tab(activeTab === 'dept')}
          onClick={() => setRoutingTab(prev => ({ ...prev, [dept.department_id]: 'dept' }))}>
          🏢 Company / Dept
        </button>
        <button style={S.tab(activeTab === 'user')}
          onClick={() => setRoutingTab(prev => ({ ...prev, [dept.department_id]: 'user' }))}>
          👤 Specific User
        </button>
      </div>

      {/* TAB 1: Company -> Dept */}
      {activeTab === 'dept' && (
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <p style={{ ...S.sectionTitle, marginBottom:4 }}>
            <Building2 size={9} style={{ display:'inline', marginRight:3 }}/>
            Select Target Company
          </p>
          {loadingTgt ? (
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'#6b7280' }}>
              <Spin size={10}/> Loading…
            </div>
          ) : targetCompanies.length === 0 ? (
            <p style={{ fontSize:10, color:'#6b7280', margin:0 }}>No target companies found.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {targetCompanies.map(co => {
                const isCoSelected = routed?.type !== 'user' && routed?.company_id === co.company_id;
                return (
                  <div key={co.company_id}>
                    <div
                      style={S.coRow(isCoSelected)}
                      onClick={() => {
                        fetchTargetDepts(co.company_id);
                        if (!isCoSelected) {
                          setRouting(prev => ({
                            ...prev,
                            [dept.department_id]: { type:'dept', company_id: co.company_id, company_name: co.company_name, dept_id: null, dept_name: null },
                          }));
                        }
                      }}
                    >
                      <div style={{ width:26, height:26, borderRadius:7, flexShrink:0,
                        background: isCoSelected ? '#4f46e5' : '#21253a',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Building2 size={12} color={isCoSelected ? '#fff' : '#6b7280'}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, fontSize:10, fontWeight:700, color:'#e2e8f0',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {co.company_name}
                        </p>
                        <p style={{ margin:0, fontSize:8, color:'#6b7280' }}>
                          {co.role_name}
                          {co.is_primary && (
                            <span style={{ marginLeft:5, background:'#1e3a5f', color:'#60a5fa',
                              border:'1px solid #3b82f644', borderRadius:20, padding:'0 5px', fontSize:7, fontWeight:700 }}>
                              PRIMARY
                            </span>
                          )}
                        </p>
                      </div>
                      {isCoSelected && <ArrowRight size={11} color="#6366f1" style={{ flexShrink:0 }}/>}
                    </div>

                    {isCoSelected && (
                      <div style={{ marginTop:5, marginLeft:10, paddingLeft:10, borderLeft:'2px solid #4f46e540' }}>
                        <p style={{ fontSize:8, fontWeight:700, color:'#818cf8',
                          textTransform:'uppercase', letterSpacing:.8, marginBottom:5 }}>
                          <Users size={8} style={{ display:'inline', marginRight:3 }}/>
                          Select Target Department
                        </p>
                        {loadingDepts[co.company_id] ? (
                          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, color:'#6b7280' }}>
                            <Spin size={10}/> Loading depts…
                          </div>
                        ) : !(targetDepts[co.company_id]?.length) ? (
                          <p style={{ fontSize:9, color:'#6b7280', margin:0 }}>No departments found.</p>
                        ) : (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                            {targetDepts[co.company_id].map(tDept => {
                              const isSel = routed?.dept_id === tDept.department_id;
                              return (
                                <button
                                  key={tDept.department_id}
                                  style={S.deptChip(isSel)}
                                  onClick={() => setDeptRouting(
                                    dept.department_id,
                                    co.company_id, co.company_name,
                                    tDept.department_id, tDept.department_name,
                                  )}
                                >
                                  {tDept.has_page_access !== false && (
                                    <CheckCircle size={7} color={isSel ? '#a7f3d0' : '#34d399'}/>
                                  )}
                                  {tDept.department_name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Specific User */}
      {activeTab === 'user' && (
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <p style={{ ...S.sectionTitle, marginBottom:4 }}>
            <Building2 size={9} style={{ display:'inline', marginRight:3 }}/>
            Select Company to Browse Users
          </p>
          {loadingTgt ? (
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'#6b7280' }}>
              <Spin size={10}/> Loading…
            </div>
          ) : targetCompanies.length === 0 ? (
            <p style={{ fontSize:10, color:'#6b7280', margin:0 }}>No companies found.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {targetCompanies.map(co => {
                const browseKey = 'ubco_' + dept.department_id;
                const isBrowsing = routing[browseKey] === co.company_id;
                return (
                  <div key={co.company_id}>
                    <div
                      style={S.coRow(isBrowsing)}
                      onClick={() => {
                        fetchTargetUsers(co.company_id);
                        setRouting(prev => ({ ...prev, [browseKey]: isBrowsing ? null : co.company_id }));
                      }}
                    >
                      <div style={{ width:26, height:26, borderRadius:7, flexShrink:0,
                        background: isBrowsing ? '#6366f1' : '#21253a',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Building2 size={12} color={isBrowsing ? '#fff' : '#6b7280'}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, fontSize:10, fontWeight:700, color:'#e2e8f0',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {co.company_name}
                        </p>
                        <p style={{ margin:0, fontSize:8, color:'#6b7280' }}>
                          {co.role_name}
                          {co.is_primary && (
                            <span style={{ marginLeft:5, background:'#1e3a5f', color:'#60a5fa',
                              border:'1px solid #3b82f644', borderRadius:20, padding:'0 5px', fontSize:7, fontWeight:700 }}>
                              PRIMARY
                            </span>
                          )}
                        </p>
                      </div>
                      {isBrowsing && <ArrowRight size={11} color="#6366f1" style={{ flexShrink:0 }}/>}
                    </div>

                    {isBrowsing && (
                      <div style={{ marginTop:5, marginLeft:10, paddingLeft:10, borderLeft:'2px solid #6366f140' }}>
                        <p style={{ fontSize:8, fontWeight:700, color:'#818cf8',
                          textTransform:'uppercase', letterSpacing:.8, marginBottom:5 }}>
                          <Users size={8} style={{ display:'inline', marginRight:3 }}/>
                          Select Specific User
                        </p>
                        {loadingUsers[co.company_id] ? (
                          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, color:'#6b7280' }}>
                            <Spin size={10}/> Loading users…
                          </div>
                        ) : !(targetUsers[co.company_id]?.filter(u =>
                            u.primary_company &&
                            u.primary_company.trim().toLowerCase() === co.company_name.trim().toLowerCase()
                          ).length) ? (
                          <p style={{ fontSize:9, color:'#6b7280', margin:0 }}>No users with this as primary company.</p>
                        ) : (
                          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                            {targetUsers[co.company_id]
                              .filter(usr =>
                                usr.primary_company &&
                                usr.primary_company.trim().toLowerCase() === co.company_name.trim().toLowerCase()
                              )
                              .map(usr => {
                              const isUserSel = routed?.type === 'user' && routed?.user_id === usr.id;
                              return (
                                <div
                                  key={usr.id}
                                  style={S.userRow(isUserSel)}
                                  onClick={() => setUserRouting(dept.department_id, usr)}
                                >
                                  <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0,
                                    background: isUserSel ? '#6366f1' : '#2e3349',
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    fontSize:10, fontWeight:800, color: isUserSel ? '#fff' : '#818cf8' }}>
                                    {usr.full_name?.[0]?.toUpperCase() || '?'}
                                  </div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <p style={{ margin:0, fontSize:10, fontWeight:700, color:'#e2e8f0',
                                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                      {usr.full_name}
                                    </p>
                                    <p style={{ margin:0, fontSize:8, color:'#6b7280' }}>
                                      {usr.primary_company || co.company_name}
                                      {usr.primary_dept && (
                                        <span style={{ color:'#4b5563' }}> / {usr.primary_dept}</span>
                                      )}
                                    </p>
                                    {usr.email && (
                                      <p style={{ margin:0, fontSize:8, color:'#4b5563',
                                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                        {usr.email}
                                      </p>
                                    )}
                                  </div>
                                  {isUserSel && <CheckCircle size={12} color="#34d399" style={{ flexShrink:0 }}/>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  WORKFLOW ROUTING MODE — sub-component
//  Har source dept ke liye target company + dept set karo
// ══════════════════════════════════════════════════════════════════════════════
const WorkflowRoutingView = ({
  workflowCompanyId,
  workflowCompanyName,
  userId,
  onClose,
}) => {
  // Source departments (workflow ki company ke)
  const [sourceDepts, setSourceDepts]   = useState([]);
  const [loadingSrc,  setLoadingSrc]    = useState(false);

  // Target companies (approver ke access wali)
  const [targetCompanies, setTargetCompanies] = useState([]);
  const [loadingTgt,      setLoadingTgt]      = useState(false);

  // Routing map: { [source_dept_id]: { company_id, company_name, dept_id, dept_name } | null }
  const [routing,      setRouting]      = useState({});
  const [expandedDept, setExpandedDept] = useState(null); // source dept_id jis ka panel open hai

  // Target dept state: { [target_company_id]: dept[] }
  const [targetDepts,     setTargetDepts]    = useState({});
  const [loadingDepts,    setLoadingDepts]   = useState({}); // { [company_id]: bool }

  // User-specific routing state
  // targetUsers: { [company_id]: [{ id, full_name, primary_company, primary_dept }] }
  const [targetUsers,     setTargetUsers]    = useState({});
  const [loadingUsers,    setLoadingUsers]   = useState({}); // { [company_id]: bool }
  // routingTab: { [source_dept_id]: 'dept' | 'user' } — which tab is active in expanded panel
  const [routingTab,      setRoutingTab]     = useState({});

  const [saving,       setSaving]       = useState(false);
  const [saveResult,   setSaveResult]   = useState(null); // 'ok' | 'error'
  const [error,        setError]        = useState(null);

  // ── 1. Fetch source departments of workflow company ─────────────────────
  // Uses GET /companies/{id}/rbac-options — same endpoint jo AddUser mein
  // use hota hai — ye user_company_access se distinct departments return karta hai
  useEffect(() => {
    if (!workflowCompanyId) return;
    setLoadingSrc(true);
    fetch(`${API}/companies/${workflowCompanyId}/rbac-options`)
      .then(r => { if (!r.ok) throw new Error('Failed to load departments'); return r.json(); })
      .then(data => {
        // rbac-options returns: { company_id, roles, departments, designations }
        const list = Array.isArray(data?.departments) ? data.departments : [];
        // Normalize to { department_id, department_name }
        const normalized = list.map(d => ({
          department_id:   d.id,
          department_name: d.department_name,
        }));
        setSourceDepts(normalized);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingSrc(false));
  }, [workflowCompanyId]);

  // ── 2. Fetch target companies (approver ke accessible) ──────────────────
  useEffect(() => {
    if (!userId) return;
    setLoadingTgt(true);
    fetch(`${API}/mdm/item-info-forward/companies/${userId}`)
      .then(r => { if (!r.ok) throw new Error('Failed to load target companies'); return r.json(); })
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setTargetCompanies(list);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingTgt(false));
  }, [userId]);

  // ── 3. Load existing routing (if saved) ─────────────────────────────────
  useEffect(() => {
    if (!workflowCompanyId) return;
    fetch(`${API}/mdm/item-info-forward/routing/${workflowCompanyId}`)
      .then(r => { if (!r.ok) return null; return r.json(); })
      .then(data => {
        if (!data) return;
        // data: [{ source_dept_id, target_company_id, target_company_name, target_dept_id, target_dept_name }]
        const map = {};
        (data || []).forEach(row => {
          map[row.source_dept_id] = {
            company_id:   row.target_company_id,
            company_name: row.target_company_name,
            dept_id:      row.target_dept_id,
            dept_name:    row.target_dept_name,
          };
        });
        setRouting(map);
      })
      .catch(() => {}); // silently ignore — routing may not exist yet
  }, [workflowCompanyId]);

  // ── Fetch target depts for a given target company ────────────────────────
  // Same endpoint as AddUser: /companies/{id}/rbac-options → departments[]
  const fetchTargetDepts = useCallback((companyId) => {
    if (targetDepts[companyId] || loadingDepts[companyId]) return;
    setLoadingDepts(prev => ({ ...prev, [companyId]: true }));
    fetch(`${API}/companies/${companyId}/rbac-options`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        // rbac-options returns { departments: [{ id, department_name, ... }] }
        // Normalize to { department_id, department_name } — same shape as rest of component
        const list = Array.isArray(data?.departments) ? data.departments : [];
        const normalized = list.map(d => ({
          department_id:   d.id,
          department_name: d.department_name,
        }));
        setTargetDepts(prev => ({ ...prev, [companyId]: normalized }));
      })
      .catch(() => setTargetDepts(prev => ({ ...prev, [companyId]: [] })))
      .finally(() => setLoadingDepts(prev => ({ ...prev, [companyId]: false })));
  }, [targetDepts, loadingDepts]);

  // ── Fetch users of a target company ─────────────────────────────────────
  // GET /users/by-company/{id} → normalize to { id, full_name, primary_company, primary_dept }
  const fetchTargetUsers = useCallback((companyId) => {
    if (targetUsers[companyId] || loadingUsers[companyId]) return;
    setLoadingUsers(prev => ({ ...prev, [companyId]: true }));
    fetch(`${API}/users/by-company/${companyId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        // Normalize: backend returns { user_id, full_name, primary_company, primary_dept }
        const normalized = list.map(u => ({
          id:              u.user_id ?? u.id,
          full_name:       u.full_name,
          primary_company: u.primary_company || '',
          primary_dept:    u.primary_dept    || '',
        }));
        setTargetUsers(prev => ({ ...prev, [companyId]: normalized }));
      })
      .catch(() => setTargetUsers(prev => ({ ...prev, [companyId]: [] })))
      .finally(() => setLoadingUsers(prev => ({ ...prev, [companyId]: false })));
  }, [targetUsers, loadingUsers]);

  // ── Set routing for a source dept ────────────────────────────────────────
  const setDeptRouting = (sourceDeptId, companyId, companyName, deptId, deptName) => {
    setRouting(prev => ({
      ...prev,
      [sourceDeptId]: { type: 'dept', company_id: companyId, company_name: companyName, dept_id: deptId, dept_name: deptName },
    }));
    setExpandedDept(null); // collapse after selection
  };

  const setUserRouting = (sourceDeptId, user) => {
    // user: { id, full_name, primary_company, primary_dept }
    setRouting(prev => ({
      ...prev,
      [sourceDeptId]: {
        type: 'user',
        user_id:      user.id,
        user_name:    user.full_name,
        user_company: user.primary_company || '',
        user_dept:    user.primary_dept    || '',
      },
    }));
    setExpandedDept(null); // collapse after selection
  };

  const clearDeptRouting = (sourceDeptId) => {
    setRouting(prev => { const n = { ...prev }; delete n[sourceDeptId]; return n; });
  };

  // ── Save routing ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveResult(null);
    try {
      const rows = Object.entries(routing).map(([src_dept_id, tgt]) => ({
        source_company_id:  workflowCompanyId,
        source_dept_id:     Number(src_dept_id),
        target_type:        tgt.type || 'dept',
        target_company_id:  tgt.type === 'user' ? null : tgt.company_id,
        target_dept_id:     tgt.type === 'user' ? null : tgt.dept_id,
        target_user_id:     tgt.type === 'user' ? tgt.user_id : null,
      }));
      const res = await fetch(`${API}/mdm/item-info-forward/routing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: workflowCompanyId,
          routing: rows,
          updated_by: userId,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Save failed'); }
      setSaveResult('ok');
    } catch (e) {
      setError(e.message);
      setSaveResult('error');
    } finally {
      setSaving(false);
    }
  };

  const S = {
    sectionTitle: { fontSize:9, fontWeight:800, color:'#6366f1', textTransform:'uppercase', letterSpacing:1, marginBottom:6 },
    sourceDeptRow: (expanded) => ({
      border: `1px solid ${expanded ? '#4f46e5' : '#2e3349'}`,
      borderRadius: expanded ? '8px 8px 0 0' : 8,
      background: expanded ? '#1a1e35' : '#0f1117',
      cursor: 'pointer', transition: 'all .12s',
      overflow: 'hidden',
    }),
    sourceDeptHeader: {
      display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
    },
    targetPanel: {
      border: '1px solid #4f46e5', borderTop: 'none',
      borderRadius: '0 0 8px 8px',
      background: '#141722', padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 8,
    },
    coRow: (active) => ({
      display:'flex', alignItems:'center', gap:8, padding:'7px 10px',
      background: active ? '#23273a' : 'transparent',
      border: `1px solid ${active ? '#4f46e5' : '#2e3349'}`,
      borderRadius:7, cursor:'pointer', transition:'all .12s',
    }),
    deptChip: (active) => ({
      display:'inline-flex', alignItems:'center', gap:4,
      padding:'3px 9px',
      background: active ? '#4f46e5' : '#1e2235',
      border: `1px solid ${active ? '#4f46e5' : '#2e3349'}`,
      borderRadius:20, cursor:'pointer', fontSize:9, fontWeight:600,
      color: active ? '#fff' : '#94a3b8', transition:'all .12s',
    }),
    routingTag: {
      display:'inline-flex', alignItems:'center', gap:4,
      background:'#0d2e22', border:'1px solid #34d39944',
      borderRadius:20, padding:'2px 8px', fontSize:8, fontWeight:700, color:'#34d399',
    },
    btnPrimary: (disabled) => ({
      display:'flex', alignItems:'center', gap:5, justifyContent:'center',
      background: disabled ? '#374151' : 'linear-gradient(135deg,#4f46e5,#6366f1)',
      border:'none', color: disabled ? '#6b7280' : '#fff',
      borderRadius:8, padding:'8px 18px', cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize:11, fontWeight:700,
      boxShadow: disabled ? 'none' : '0 3px 10px #6366f140',
    }),
    btnSecondary: {
      display:'flex', alignItems:'center', gap:5, justifyContent:'center',
      background:'#1e2235', border:'1px solid #4f46e5', color:'#818cf8',
      borderRadius:8, padding:'8px 14px', cursor:'pointer',
      fontSize:11, fontWeight:600,
    },
    tab: (active) => ({
      flex:1, padding:'4px 0', fontSize:9, fontWeight:700, cursor:'pointer', border:'none',
      borderBottom: `2px solid ${active ? '#6366f1' : 'transparent'}`,
      background:'transparent', color: active ? '#818cf8' : '#4b5563',
      textTransform:'uppercase', letterSpacing:.7, transition:'all .12s',
    }),
    userRow: (active) => ({
      display:'flex', alignItems:'flex-start', gap:8, padding:'7px 10px',
      background: active ? '#23273a' : 'transparent',
      border: `1px solid ${active ? '#6366f1' : '#2e3349'}`,
      borderRadius:7, cursor:'pointer', transition:'all .12s',
    }),
  };

  const routedCount = Object.keys(routing).length;

  if (saveResult === 'ok') {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:12, alignItems:'center', padding:'20px 0' }}>
        <CheckCircle size={38} color="#34d399"/>
        <p style={{ margin:0, fontSize:14, fontWeight:800, color:'#e2e8f0', textAlign:'center' }}>
          Routing Saved!
        </p>
        <p style={{ margin:0, fontSize:10, color:'#94a3b8', textAlign:'center' }}>
          {routedCount} department{routedCount !== 1 ? 's' : ''} configured for {workflowCompanyName || 'this company'}.
        </p>
        <button style={S.btnPrimary(false)} onClick={onClose}>
          Done
        </button>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Info banner */}
      <div style={{ display:'flex', gap:8, padding:'8px 10px',
        background:'#1e2235', border:'1px solid #2e3349', borderRadius:8 }}>
        <GitBranch size={13} color="#818cf8" style={{ flexShrink:0, marginTop:1 }}/>
        <p style={{ margin:0, fontSize:10, color:'#94a3b8', lineHeight:1.5 }}>
          Configure <b style={{ color:'#e2e8f0' }}>forward routing</b> for each department of{' '}
          <b style={{ color:'#c4b5fd' }}>{workflowCompanyName || 'this company'}</b>.
          When a request comes from a department, it will automatically forward to the mapped target.
        </p>
      </div>

      {/* Source company label */}
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <p style={S.sectionTitle}>
          <Building2 size={9} style={{ display:'inline', marginRight:4 }}/>
          Departments of {workflowCompanyName || 'Workflow Company'}
        </p>
      </div>

      {/* Source departments list */}
      {loadingSrc ? (
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 0', color:'#6b7280', fontSize:10 }}>
          <Spin/> Loading departments…
        </div>
      ) : sourceDepts.length === 0 ? (
        <p style={{ fontSize:10, color:'#6b7280', margin:0 }}>No departments found for this company.</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {sourceDepts.map(dept => {
            const isExpanded  = expandedDept === dept.department_id;
            const routed      = routing[dept.department_id] ?? null;

            return (
              <div key={dept.department_id} style={S.sourceDeptRow(isExpanded)}>
                {/* Header row */}
                <div
                  style={S.sourceDeptHeader}
                  onClick={() => {
                    if (isExpanded) { setExpandedDept(null); return; }
                    setExpandedDept(dept.department_id);
                  }}
                >
                  <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0,
                    background: routed ? '#34d399' : '#6b7280' }}/>
                  <span style={{ flex:1, fontSize:11, fontWeight:700, color:'#e2e8f0' }}>
                    {dept.department_name}
                  </span>
                  {routed ? (
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <span style={S.routingTag}>
                        {routed.type === 'user'
                          ? `→ ${routed.user_name} (${routed.user_company}${routed.user_dept ? ' / ' + routed.user_dept : ''})`
                          : `→ ${routed.company_name} / ${routed.dept_name}`
                        }
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); clearDeptRouting(dept.department_id); }}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#f87171', padding:2, display:'flex' }}>
                        <XCircle size={12}/>
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize:9, color:'#4b5563', fontStyle:'italic' }}>not mapped</span>
                  )}
                  <ChevronRight size={12} color="#6b7280" style={{ flexShrink:0, transition:'transform .15s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}/>
                </div>

                {/* Expanded target selector */}
                {isExpanded && (
                  <TargetPanel
                    dept={dept}
                    routed={routed}
                    activeTab={routingTab[dept.department_id] || 'dept'}
                    setRoutingTab={setRoutingTab}
                    targetCompanies={targetCompanies}
                    loadingTgt={loadingTgt}
                    targetDepts={targetDepts}
                    loadingDepts={loadingDepts}
                    fetchTargetDepts={fetchTargetDepts}
                    targetUsers={targetUsers}
                    loadingUsers={loadingUsers}
                    fetchTargetUsers={fetchTargetUsers}
                    routing={routing}
                    setRouting={setRouting}
                    setDeptRouting={setDeptRouting}
                    setUserRouting={setUserRouting}
                    S={S}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding:'8px 10px', background:'#2e1515',
          border:'1px solid #f8717133', borderRadius:7,
          fontSize:10, color:'#f87171' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', paddingTop:4, borderTop:'1px solid #2e3349', marginTop:4 }}>
        <div style={{ flex:1, display:'flex', alignItems:'center' }}>
          {routedCount > 0 && (
            <span style={{ fontSize:9, color:'#94a3b8' }}>
              {routedCount} of {sourceDepts.length} dept{sourceDepts.length !== 1 ? 's' : ''} mapped
            </span>
          )}
        </div>
        <button style={S.btnSecondary} onClick={onClose}>
          Cancel
        </button>
        <button
          style={S.btnPrimary(saving || sourceDepts.length === 0)}
          onClick={handleSave}
          disabled={saving || sourceDepts.length === 0}>
          {saving
            ? <><Spin size={12}/> Saving…</>
            : <><Save size={11}/> Save Routing</>}
        </button>
      </div>

    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const ItemInfoForwardPopup = ({
  open,
  onClose,
  onSaveInfo,
  onForward,
  mappingRecord,
  userId,
  // ── Workflow routing mode props ──
  workflowMode       = false,
  workflowCompanyId  = null,
  workflowCompanyName = null,
}) => {
  // ── state (normal forward mode) ────────────────────────────────────────────
  const [companies,     setCompanies]     = useState([]);
  const [loadingCos,    setLoadingCos]    = useState(false);
  const [selectedCoIdx, setSelectedCoIdx] = useState(null);
  const [selectedDept,  setSelectedDept]  = useState(null); // DeptAccessStatus obj
  const [forwardNotes,  setForwardNotes]  = useState('');
  const [sending,       setSending]       = useState(false);
  const [result,        setResult]        = useState(null);  // forward API response
  const [error,         setError]         = useState(null);

  // ── fetch companies when popup opens (normal mode only) ───────────────────
  const fetchCompanies = useCallback(async () => {
    if (!userId || workflowMode) return;
    setLoadingCos(true);
    setError(null);
    try {
      const res = await fetch(`${API}/mdm/item-info-forward/companies/${userId}`);
      if (!res.ok) throw new Error('Failed to load companies');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setCompanies(list);
      // Agar mappingRecord mein flow ki company_id hai to use auto-select karo
      const flowCompanyId = mappingRecord?.company_id ?? null;
      if (flowCompanyId) {
        const idx = list.findIndex(c => String(c.company_id) === String(flowCompanyId));
        if (idx !== -1) setSelectedCoIdx(idx);
        else if (list.length === 1) setSelectedCoIdx(0);
      } else if (list.length === 1) {
        setSelectedCoIdx(0);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingCos(false);
    }
  }, [userId, mappingRecord?.company_id, workflowMode]);

  useEffect(() => {
    if (open && !workflowMode) {
      setResult(null);
      setError(null);
      setSelectedCoIdx(null);
      setSelectedDept(null);
      setForwardNotes('');
      fetchCompanies();
    }
  }, [open, fetchCompanies, workflowMode]);

  if (!open) return null;

  const selectedCo = selectedCoIdx !== null ? companies[selectedCoIdx] : null;

  // ── handle forward (normal mode) ───────────────────────────────────────────
  const handleForward = async () => {
    if (!selectedCo || !selectedDept) return;
    if (!selectedDept.has_page_access) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API}/mdm/item-info-forward/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id:            mappingRecord?.id,
          request_id:           mappingRecord?.request_id || null,
          item_name:            mappingRecord?.item_name  || null,
          target_company_id:    selectedCo.company_id,
          target_department_id: selectedDept.department_id,
          forwarded_by:         userId,
          forward_notes:        forwardNotes.trim() || null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Forward failed'); }
      const data = await res.json();
      setResult(data);
      if (onForward) onForward(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  // ── styles (shared) ────────────────────────────────────────────────────────
  const S = {
    overlay: {
      position:'fixed', inset:0, zIndex:100001,
      background:'rgba(0,0,0,.55)',
      display:'flex', alignItems:'center', justifyContent:'center',
    },
    modal: {
      width: workflowMode ? 600 : 540,
      maxWidth:'95vw', maxHeight:'88vh',
      background:'#141722', border:'1px solid #2e3349', borderRadius:14,
      display:'flex', flexDirection:'column', overflow:'hidden',
      boxShadow:'0 24px 60px rgba(0,0,0,.6)', animation:'iifpPop .2s ease',
    },
    header: {
      display:'flex', alignItems:'center', gap:10,
      padding:'12px 16px', borderBottom:'1px solid #2e3349',
      background:'linear-gradient(135deg,#1e2235,#23273a)', flexShrink:0,
    },
    body: { flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 },
    sectionTitle: { fontSize:9, fontWeight:800, color:'#6366f1', textTransform:'uppercase', letterSpacing:1, marginBottom:6 },
    coRow: (active) => ({
      display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
      background: active ? '#23273a' : 'transparent',
      border: `1px solid ${active ? '#4f46e5' : '#2e3349'}`,
      borderRadius:8, cursor:'pointer', transition:'all .12s',
    }),
    deptRow: (active, hasAccess) => ({
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'7px 10px',
      background: active ? (hasAccess ? '#0d2e22' : '#2e1515') : 'transparent',
      border: `1px solid ${active ? (hasAccess ? '#34d399' : '#f87171') : '#2e3349'}`,
      borderRadius:7, cursor: hasAccess ? 'pointer' : 'default', transition:'all .12s',
      opacity: hasAccess ? 1 : 0.6,
    }),
    inp: {
      width:'100%', boxSizing:'border-box', background:'#0f1117',
      border:'1.5px solid #2e3349', borderRadius:8, padding:'7px 10px',
      fontSize:11, color:'#e2e8f0', resize:'vertical', fontFamily:'inherit', outline:'none',
    },
    btnPrimary: (disabled) => ({
      display:'flex', alignItems:'center', gap:5, justifyContent:'center',
      background: disabled ? '#374151' : 'linear-gradient(135deg,#4f46e5,#6366f1)',
      border:'none', color: disabled ? '#6b7280' : '#fff',
      borderRadius:8, padding:'8px 18px', cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize:11, fontWeight:700,
      boxShadow: disabled ? 'none' : '0 3px 10px #6366f140',
    }),
    btnSecondary: {
      display:'flex', alignItems:'center', gap:5, justifyContent:'center',
      background:'#1e2235', border:'1px solid #4f46e5', color:'#818cf8',
      borderRadius:8, padding:'8px 14px', cursor:'pointer',
      fontSize:11, fontWeight:600,
    },
  };

  const canForward = selectedCo && selectedDept?.has_page_access && !sending;

  // ── Resolve companyId and companyName for workflow mode ────────────────────
  const resolvedWorkflowCompanyId   = workflowCompanyId   ?? mappingRecord?.company_id   ?? null;
  const resolvedWorkflowCompanyName = workflowCompanyName ?? mappingRecord?.company?.company_name ?? null;

  return (
    <>
      <style>{`
        @keyframes iifpSpin { to { transform: rotate(360deg) } }
        @keyframes iifpPop  { from { opacity:0; transform: scale(.95) } to { opacity:1; transform: scale(1) } }
      `}</style>
      <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget && !sending) onClose(); }}>
        <div style={S.modal}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={S.header}>
            <div style={{ width:34, height:34, borderRadius:10,
              background: workflowMode
                ? 'linear-gradient(135deg,#7c3aed,#a78bfa)'
                : 'linear-gradient(135deg,#4f46e5,#6366f1)',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {workflowMode
                ? <GitBranch size={15} color="#fff"/>
                : <Send size={15} color="#fff"/>}
            </div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:800, color:'#e2e8f0' }}>
                {workflowMode ? 'Configure Forward Routing' : 'Forward Item Info Task'}
              </p>
              <p style={{ margin:'2px 0 0', fontSize:9, color:'#6b7280' }}>
                {workflowMode
                  ? <>
                      <span style={{ color:'#a78bfa', marginRight:4 }}>Workflow Setup</span>
                      {resolvedWorkflowCompanyName && (
                        <span>· {resolvedWorkflowCompanyName}</span>
                      )}
                    </>
                  : <>
                      {mappingRecord?.request_id && <span style={{ color:'#818cf8', marginRight:6 }}>{mappingRecord.request_id}</span>}
                      {mappingRecord?.item_name || 'Select target company & department'}
                    </>
                }
              </p>
            </div>
            {!sending && (
              <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280', display:'flex' }}>
                <X size={16}/>
              </button>
            )}
          </div>

          {/* ── Body ────────────────────────────────────────────────────── */}
          <div style={S.body}>

            {/* ── WORKFLOW ROUTING MODE ─────────────────────────────── */}
            {workflowMode ? (
              <WorkflowRoutingView
                workflowCompanyId={resolvedWorkflowCompanyId}
                workflowCompanyName={resolvedWorkflowCompanyName}
                userId={userId}
                onClose={onClose}
              />
            ) : (
              /* ── NORMAL FORWARD MODE ─────────────────────────────── */
              <>
                {/* Result view */}
                {result ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:10, alignItems:'center', padding:'12px 0' }}>
                    {result.status === 'sent' ? (
                      <CheckCircle size={38} color="#34d399"/>
                    ) : (
                      <XCircle size={38} color="#f87171"/>
                    )}
                    <p style={{ margin:0, fontSize:14, fontWeight:800, color:'#e2e8f0', textAlign:'center' }}>
                      {result.status === 'sent' ? 'Forwarded Successfully!' : 'No Eligible Users Found'}
                    </p>
                    <p style={{ margin:0, fontSize:10, color:'#94a3b8', textAlign:'center' }}>
                      {result.target_company} · {result.target_dept}
                    </p>
                    {result.notified_count > 0 && (
                      <div style={{ background:'#0d2e22', border:'1px solid #34d39933', borderRadius:8, padding:'8px 14px', width:'100%' }}>
                        <p style={{ margin:'0 0 4px', fontSize:9, fontWeight:700, color:'#34d399', textTransform:'uppercase', letterSpacing:0.8 }}>
                          Notified {result.notified_count} user{result.notified_count > 1 ? 's' : ''}:
                        </p>
                        {result.notified_users.map((name, i) => (
                          <p key={i} style={{ margin:'2px 0', fontSize:11, color:'#a7f3d0', fontWeight:600 }}>
                            • {name}
                          </p>
                        ))}
                      </div>
                    )}
                    {result.status !== 'sent' && (
                      <p style={{ margin:0, fontSize:10, color:'#f87171', textAlign:'center' }}>
                        No active users in {result.target_dept} have access to Item Info Master page.
                      </p>
                    )}
                    <div style={{ display:'flex', gap:8, marginTop:6 }}>
                      <button style={S.btnSecondary} onClick={() => { setResult(null); setSelectedDept(null); }}>
                        Forward to another dept
                      </button>
                      <button style={S.btnPrimary(false)} onClick={onClose}>
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Info banner */}
                    <div style={{ display:'flex', gap:8, padding:'8px 10px',
                      background:'#1e2235', border:'1px solid #2e3349', borderRadius:8 }}>
                      <Info size={13} color="#818cf8" style={{ flexShrink:0, marginTop:1 }}/>
                      <p style={{ margin:0, fontSize:10, color:'#94a3b8', lineHeight:1.5 }}>
                        Select a <b style={{ color:'#e2e8f0' }}>company</b> and <b style={{ color:'#e2e8f0' }}>department</b> to forward this
                        Item Info mapping task. Only departments with{' '}
                        <span style={{ color:'#34d399', fontWeight:700 }}>✓ Access</span> can receive it.
                        Alternatively, click <b style={{ color:'#e2e8f0' }}>Save Info</b> to fill it yourself.
                      </p>
                    </div>

                    {/* Companies */}
                    <div>
                      <p style={S.sectionTitle}>
                        <Building2 size={9} style={{ display:'inline', marginRight:4 }}/>Companies
                        {selectedCo && mappingRecord?.company_id && (
                          <span style={{ marginLeft:6, fontSize:8, fontWeight:600, color:'#34d399',
                            background:'#0d2e22', border:'1px solid #34d39933',
                            borderRadius:12, padding:'1px 6px', textTransform:'none', letterSpacing:0 }}>
                            ✓ Flow company auto-selected
                          </span>
                        )}
                      </p>
                      {loadingCos ? (
                        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 0', color:'#6b7280', fontSize:10 }}>
                          <Spin/> Loading companies…
                        </div>
                      ) : companies.length === 0 ? (
                        <p style={{ fontSize:10, color:'#6b7280', margin:0 }}>No companies found.</p>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                          {companies.map((co, idx) => (
                            <div key={co.company_id}
                              style={S.coRow(selectedCoIdx === idx)}
                              onClick={() => { setSelectedCoIdx(idx); setSelectedDept(null); }}>
                              <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                                background: selectedCoIdx === idx ? '#4f46e5' : '#21253a',
                                display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <Building2 size={13} color={selectedCoIdx === idx ? '#fff' : '#6b7280'}/>
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <p style={{ margin:0, fontSize:11, fontWeight:700, color:'#e2e8f0',
                                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                  {co.company_name}
                                </p>
                                <p style={{ margin:0, fontSize:9, color:'#6b7280' }}>
                                  {co.role_name} · {co.granted_dept_ids.length} dept{co.granted_dept_ids.length !== 1 ? 's' : ''}
                                  {co.is_primary && <span style={{ marginLeft:6, background:'#1e3a5f', color:'#60a5fa', border:'1px solid #3b82f644', borderRadius:20, padding:'0 5px', fontSize:7, fontWeight:700 }}>PRIMARY</span>}
                                </p>
                              </div>
                              {selectedCoIdx === idx && (
                                <ArrowRight size={12} color="#6366f1" style={{ flexShrink:0 }}/>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Departments (only show when company selected) */}
                    {selectedCo && (
                      <div>
                        <p style={S.sectionTitle}>
                          <Users size={9} style={{ display:'inline', marginRight:4 }}/>
                          Departments in {selectedCo.company_name}
                        </p>
                        {selectedCo.depts_with_access.length === 0 ? (
                          <div style={{ padding:'10px', background:'#1e2235', border:'1px solid #2e3349',
                            borderRadius:8, fontSize:10, color:'#6b7280', textAlign:'center' }}>
                            No departments with data access found.
                            <br/>
                            <span style={{ fontSize:9 }}>
                              Grant dept access via User Department Data Access page first.
                            </span>
                          </div>
                        ) : (
                          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                            {selectedCo.depts_with_access.map(dept => {
                              const isSelected = selectedDept?.department_id === dept.department_id;
                              return (
                                <div key={dept.department_id}
                                  style={S.deptRow(isSelected, dept.has_page_access)}
                                  onClick={() => dept.has_page_access && setSelectedDept(isSelected ? null : dept)}>
                                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                    <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0,
                                      background: dept.has_page_access ? '#34d399' : '#f87171' }}/>
                                    <span style={{ fontSize:11, fontWeight: isSelected ? 700 : 500,
                                      color: isSelected ? (dept.has_page_access ? '#a7f3d0' : '#fca5a5') : '#e2e8f0' }}>
                                      {dept.department_name}
                                    </span>
                                  </div>
                                  <AccessBadge has={dept.has_page_access} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {selectedCo.depts_with_access.every(d => !d.has_page_access) && selectedCo.depts_with_access.length > 0 && (
                          <p style={{ margin:'6px 0 0', fontSize:9, color:'#f87171' }}>
                            ⚠️ No department has 'Item Info' page access. Grant access via Role Access settings.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {selectedDept?.has_page_access && (
                      <div>
                        <p style={S.sectionTitle}>Message to Recipient (optional)</p>
                        <textarea
                          value={forwardNotes}
                          onChange={e => setForwardNotes(e.target.value)}
                          rows={2}
                          placeholder="Add instructions or notes for the Item Info team…"
                          style={S.inp}
                        />
                      </div>
                    )}

                    {/* Error */}
                    {error && (
                      <div style={{ padding:'8px 10px', background:'#2e1515',
                        border:'1px solid #f8717133', borderRadius:7,
                        fontSize:10, color:'#f87171' }}>
                        ⚠️ {error}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display:'flex', gap:8, justifyContent:'flex-end', paddingTop:4 }}>
                      <button style={S.btnSecondary} onClick={onSaveInfo}>
                        📝 Save Info (Fill Myself)
                      </button>
                      <button
                        style={S.btnPrimary(!canForward)}
                        onClick={handleForward}
                        disabled={!canForward}>
                        {sending
                          ? <><Spin size={12}/> Sending…</>
                          : <><Send size={11}/> Forward</>}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ItemInfoForwardPopup;