/**
 * MDM/MdmMyReq.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * MDM My Requests — Approver-side dashboard
 *
 * FEATURES (zero backend changes needed):
 *  • RBAC gate  — checks menu access before rendering
 *  • Inbox      — requests PENDING this user's approval   (/workflow/inbox/{uid})
 *  • My Actions — requests this user already acted on      (/workflow/my-actions/{uid})
 *  • Entity details — item name, company, dept, required_date (/item-creation-req/{id})
 *  • SSE real-time  — auto-refresh on new notification     (/workflow/user-notifications/{uid}/stream)
 *  • Notifications  — bell icon, mark-read                 (/workflow/user-notifications/{uid})
 *  • Action modal   — Approve / Reject / Return with comments (/workflow/action/{inst_id})
 *  • Timeline popup — full step-by-step history             (/workflow/timeline/...)
 *
 *  FILTERS (all client-side, instant):
 *  • Search    — item name / company / dept / status / entity_type
 *  • Status    — stat-pill quick-filter + dropdown
 *  • Company   — pill quick-filter
 *  • Entity type — pill quick-filter
 *  • Date range— submitted_at from/to
 *  • Active / Inactive (is_active on the item record)
 *  • Sort      — by date, item name, company, status (asc/desc)
 *
 *  CATEGORIES (left sidebar):
 *  • All | Pending | In Review | Approved | Rejected | Returned | Cancelled
 *  • Per-company counts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Existing MdmMyReq.jsx RBAC check logic is preserved 1:1.
 * No backend file is modified.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, Bell, BellOff, RefreshCw, X, Eye, ChevronDown, ChevronUp,
         ThumbsUp, ThumbsDown, RotateCcw, CheckCircle, XCircle, Clock,
         Building2, Layers, Calendar, Search, SlidersHorizontal, Filter, ArrowLeft } from 'lucide-react';
import CreateItemMaster from '../ItemMasterPages/CreateItemMaster.js';


const API = 'http://localhost:8000/api';

// ─── session helper ──────────────────────────────────────────────────────────
const getSession = () => {
  try { const d = JSON.parse(sessionStorage.getItem('userData') || '{}'); return d?.user || null; }
  catch { return null; }
};

// ─── status config ───────────────────────────────────────────────────────────
const STATUS = {
  PENDING:   { label:'Pending',   dot:'#f59e0b', bg:'#fffbeb', color:'#92400e', border:'#fde68a', icon:'⏳' },
  IN_REVIEW: { label:'In Review', dot:'#3b82f6', bg:'#eff6ff', color:'#1e40af', border:'#bfdbfe', icon:'🔍' },
  APPROVED:  { label:'Approved',  dot:'#22c55e', bg:'#f0fdf4', color:'#14532d', border:'#bbf7d0', icon:'✅' },
  REJECTED:  { label:'Rejected',  dot:'#ef4444', bg:'#fff1f2', color:'#881337', border:'#fecdd3', icon:'❌' },
  RETURNED:  { label:'Returned',  dot:'#f97316', bg:'#fff7ed', color:'#7c2d12', border:'#fed7aa', icon:'↩️' },
  CANCELLED: { label:'Cancelled', dot:'#94a3b8', bg:'#f8fafc', color:'#475569', border:'#e2e8f0', icon:'🚫' },
  DRAFT:     { label:'Draft',     dot:'#94a3b8', bg:'#f8fafc', color:'#64748b', border:'#e2e8f0', icon:'📝' },
};
const ALL_STATUSES = Object.keys(STATUS);

// ─── tiny components ─────────────────────────────────────────────────────────
const StatusBadge = ({ status, sm }) => {
  const m = STATUS[status] || STATUS.DRAFT;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4,
      background:m.bg, color:m.color, border:`1px solid ${m.border}`,
      padding: sm ? '1px 7px' : '3px 10px', borderRadius:20,
      fontSize: sm ? 9 : 10, fontWeight:700, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:m.dot, flexShrink:0 }} />
      {m.label}
    </span>
  );
};

const Spinner = ({ size=14 }) => (
  <div style={{ width:size, height:size, borderRadius:'50%',
    border:`2px solid #e2e8f0`, borderTopColor:'#3b82f6',
    animation:'mdmSpin .7s linear infinite', display:'inline-block', flexShrink:0 }} />
);

// ─────────────────────────────────────────────────────────────────────────────
//  ACTION MODAL  (Approve / Reject / Return)
// ─────────────────────────────────────────────────────────────────────────────
const ActionModal = ({ action, onConfirm, onClose, loading }) => {
  const [comments, setComments] = useState('');
  if (!action) return null;
  const cfg = {
    APPROVE:       { label:'Approve Request',      accent:'#22c55e', btnBg:'#16a34a', icon:<ThumbsUp size={15}/>,  ph:'Approval note (optional)…' },
    START_MAPPING: { label:'Start Mapping',        accent:'#7c3aed', btnBg:'#6d28d9', icon:<CheckCircle size={15}/>, ph:'Mapping notes (optional)…' },
    REJECT:  { label:'Reject Request',       accent:'#ef4444', btnBg:'#dc2626', icon:<ThumbsDown size={15}/>, ph:'Reason for rejection…' },
    RETURN:  { label:'Return to Submitter',  accent:'#f97316', btnBg:'#ea580c', icon:<RotateCcw size={15}/>,  ph:'What needs to be corrected…' },
  }[action] || {};

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,23,42,.55)',
      display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
      <div style={{ width:440, background:'#fff', borderRadius:16, overflow:'hidden',
        boxShadow:'0 24px 64px rgba(15,23,42,.2)', animation:'mdmPop .2s ease' }}>
        <div style={{ height:3, background:cfg.accent }} />
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #f1f5f9',
          display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:cfg.btnBg,
            display:'flex', alignItems:'center', justifyContent:'center', color:'#fff',
            boxShadow:`0 4px 10px ${cfg.accent}44` }}>{cfg.icon}</div>
          <div>
            <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#0f172a' }}>{cfg.label}</p>
            <p style={{ margin:'2px 0 0', fontSize:10, color:'#64748b' }}>Action will be permanently logged</p>
          </div>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none',
            cursor:'pointer', color:'#94a3b8', display:'flex' }}><X size={16}/></button>
        </div>
        <div style={{ padding:'16px 20px' }}>
          <label style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase',
            letterSpacing:.5, display:'block', marginBottom:6 }}>Comments</label>
          <textarea rows={3} value={comments} onChange={e=>setComments(e.target.value)}
            placeholder={cfg.ph}
            style={{ width:'100%', boxSizing:'border-box', border:'1px solid #e2e8f0',
              borderRadius:8, padding:'8px 10px', fontSize:11, color:'#0f172a',
              outline:'none', resize:'vertical', lineHeight:1.5, fontFamily:'inherit' }}
            onFocus={e=>e.target.style.borderColor=cfg.accent}
            onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
        </div>
        <div style={{ padding:'0 20px 16px', display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose}
            style={{ padding:'6px 16px', borderRadius:8, border:'1px solid #e2e8f0',
              background:'#f8fafc', color:'#64748b', fontSize:11, cursor:'pointer', fontWeight:600 }}>
            Cancel
          </button>
          <button onClick={()=>onConfirm(comments)} disabled={loading}
            style={{ padding:'6px 18px', borderRadius:8, border:'none',
              background: loading ? '#94a3b8' : cfg.btnBg, color:'#fff',
              fontSize:11, cursor: loading ? 'not-allowed' : 'pointer', fontWeight:700,
              display:'flex', alignItems:'center', gap:6 }}>
            {loading ? <><Spinner size={12}/> Processing…</> : cfg.label}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  TIMELINE POPUP
// ─────────────────────────────────────────────────────────────────────────────
const TimelinePopup = ({ row, entityData, onClose, onAction, userId }) => {
  const [tl, setTl]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!row) return;
    setLoading(true);
    fetch(`${API}/workflow/timeline/${row.entity_type}/${row.entity_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setTl(d); setLoading(false); })
      .catch(()  => setLoading(false));
  }, [row]);

  if (!row) return null;
  const det = entityData[`${row.entity_type}-${row.entity_id}`] || {};
  const sm  = STATUS[row.status] || STATUS.DRAFT;
  // Step 2+ approvers ko bhi Approve/Reject/Return buttons dikhne chahiye.
  // _role === 'approver' aur status PENDING/IN_REVIEW hone par hi canAct true hoga.
  const canAct = row._role === 'approver'
    && ['PENDING','IN_REVIEW'].includes(row.status);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(15,23,42,.5)',
      display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
      <div style={{ width:540, maxHeight:'88vh', background:'#1a1d27', borderRadius:16,
        border:'1px solid #2e3349', overflow:'hidden', display:'flex', flexDirection:'column',
        boxShadow:'0 24px 64px rgba(0,0,0,.5)', animation:'mdmPop .2s ease' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(to right,#374151,#60a5fa)',
          padding:'0 12px', height:28, display:'flex', alignItems:'center',
          justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'#fff', overflow:'hidden',
            textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:300 }}>
            {det.label || `Request #${row.entity_id}`}
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <StatusBadge status={row.status} sm />
            <button onClick={onClose} style={{ width:20, height:20, borderRadius:5,
              background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.2)',
              color:'rgba(255,255,255,.8)', cursor:'pointer', display:'flex',
              alignItems:'center', justifyContent:'center' }}>
              <X size={10}/>
            </button>
          </div>
        </div>

        {/* Meta */}
        <div style={{ background:'#21253a', padding:'7px 12px', borderBottom:'1px solid #2e3349',
          flexShrink:0 }}>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom: canAct ? 7 : 0 }}>
            {det.company_name && (
              <span style={{ fontSize:10, color:'#94a3b8', display:'flex', alignItems:'center',
                gap:3, background:'#0f1117', padding:'2px 8px', borderRadius:20, border:'1px solid #2e3349' }}>
                <Building2 size={9}/> {det.company_name}
              </span>
            )}
            {det.dept_name && (
              <span style={{ fontSize:10, color:'#94a3b8', display:'flex', alignItems:'center',
                gap:3, background:'#0f1117', padding:'2px 8px', borderRadius:20, border:'1px solid #2e3349' }}>
                <Layers size={9}/> {det.dept_name}
              </span>
            )}
            <span style={{ fontSize:9, color:'#6b7280', background:'#0f1117',
              padding:'2px 8px', borderRadius:20, border:'1px solid #2e3349', fontFamily:'monospace' }}>
              {row.entity_type}
            </span>
          </div>

          {canAct && (
            <div style={{ display:'flex', gap:6 }}>
              {/* Start Mapping button — approve ki jagah yeh use karo */}
              <button onClick={() => onAction(row, 'START_MAPPING')}
                style={{ flex:1, background:'linear-gradient(135deg,#7c3aed,#4f46e5)', border:'none', color:'#fff',
                  borderRadius:7, padding:'5px 0', cursor:'pointer', fontSize:10,
                  fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                <CheckCircle size={10}/> Start Mapping
              </button>
              {['REJECT','RETURN'].map(a => {
                const cfg = { REJECT:{bg:'#dc2626',label:'Reject'}, RETURN:{bg:'#ea580c',label:'Return'} }[a];
                return (
                  <button key={a} onClick={() => onAction(row, a)}
                    style={{ flex:1, background:cfg.bg, border:'none', color:'#fff',
                      borderRadius:7, padding:'5px 0', cursor:'pointer', fontSize:10,
                      fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                    {a==='REJECT'?<ThumbsDown size={10}/>:<RotateCcw size={10}/>}
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflow:'auto', padding:'12px 14px' }}>
          {loading && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
              gap:8, padding:32, color:'#94a3b8', fontSize:12 }}>
              <Spinner /> Loading timeline…
            </div>
          )}

          {!loading && !tl && (
            <div style={{ textAlign:'center', padding:28, color:'#6b7280', fontSize:11 }}>
              <AlertCircle size={22} color="#4b5563" style={{ marginBottom:8, display:'block', margin:'0 auto 8px' }}/>
              Timeline not available
            </div>
          )}

          {!loading && tl && (
            <div style={{ position:'relative', paddingLeft:22 }}>
              <div style={{ position:'absolute', left:8, top:8, bottom:8, width:2,
                background:'linear-gradient(to bottom,#374151,#60a5fa55)', borderRadius:2 }} />
              {tl.steps?.map((step, si) => {
                const dotCol = step.status==='APPROVED'?'#34d399':step.status==='REJECTED'?'#f87171':step.status==='RETURNED'?'#fb923c':step.is_skipped?'#374151':'#60a5fa';
                const isPending = step.status==='PENDING' && !step.is_skipped;
                return (
                  <div key={step.step_order} style={{ position:'relative', marginBottom:8 }}>
                    <div style={{ position:'absolute', left:-16, top:6, width:14, height:14,
                      borderRadius:'50%', background:dotCol, border:`2px solid ${isPending?'#60a5fa44':'#1a1d27'}`,
                      boxShadow:`0 0 0 2px ${dotCol}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontSize:6, color:'#fff', fontWeight:800 }}>{step.step_order}</span>
                    </div>
                    <div style={{ background:'#21253a', border:`1px solid ${isPending?'#60a5fa33':'#2e3349'}`,
                      borderLeft:`3px solid ${dotCol}`, borderRadius:'0 8px 8px 0', padding:'7px 10px',
                      opacity: step.is_skipped ? 0.5 : 1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6, marginBottom:2 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'#e2e8f0' }}>{step.step_name}</span>
                        <StatusBadge status={step.status} sm />
                      </div>
                      {step.is_skipped && <p style={{ fontSize:9, color:'#6b7280', margin:'0 0 2px' }}>⚡ Skipped</p>}
                      {(step.assigned_role||step.assigned_dept) && (
                        <div style={{ fontSize:9, color:'#6b7280', marginBottom:2 }}>
                          {[step.assigned_role, step.assigned_dept, step.assigned_desg].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      {step.actions?.length>0 && (
                        <div style={{ marginTop:5, paddingTop:5, borderTop:'1px solid #2e3349' }}>
                          {step.actions.map(a => (
                            <div key={a.id} style={{ display:'flex', alignItems:'flex-start', gap:5, marginBottom:3, fontSize:10 }}>
                              <span style={{ background:'#0f1117', color:'#6b7280', padding:'1px 5px',
                                borderRadius:4, fontSize:8, fontWeight:600, whiteSpace:'nowrap' }}>{a.action_type}</span>
                              <div style={{ flex:1 }}>
                                <span style={{ fontWeight:700, color:'#94a3b8' }}>
                                  {a.performer?.full_name || `User #${a.performed_by}`}
                                </span>
                                {a.comments && <p style={{ margin:'1px 0 0', color:'#6b7280', fontStyle:'italic', fontSize:9 }}>"{a.comments}"</p>}
                              </div>
                              <span style={{ fontSize:9, color:'#374151', whiteSpace:'nowrap' }}>
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

        <div style={{ height:4, background:'linear-gradient(to right,#374151,#60a5fa)', flexShrink:0 }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  NOTIFICATION PANEL
// ─────────────────────────────────────────────────────────────────────────────
const NotifPanel = ({ userId, onClose }) => {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/workflow/user-notifications/${userId}?limit=50`);
      if (r.ok) setNotifs(await r.json());
    } catch {}
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    await fetch(`${API}/workflow/user-notifications/${id}/read`, { method:'PATCH' }).catch(()=>{});
    setNotifs(prev => prev.map(n => n.id===id ? {...n, is_read:true} : n));
  };

  const markAll = async () => {
    await fetch(`${API}/workflow/user-notifications/${userId}/read-all`, { method:'PATCH' }).catch(()=>{});
    setNotifs(prev => prev.map(n => ({...n, is_read:true})));
  };

  const unread = notifs.filter(n=>!n.is_read).length;

  return (
    <div style={{ position:'absolute', top:30, right:0, width:340, maxHeight:420,
      background:'#1a1d27', border:'1px solid #2e3349', borderRadius:12,
      boxShadow:'0 12px 40px rgba(0,0,0,.5)', zIndex:9000, overflow:'hidden',
      display:'flex', flexDirection:'column', animation:'mdmFadeIn .15s ease' }}>
      <div style={{ padding:'8px 12px', borderBottom:'1px solid #2e3349', display:'flex',
        alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'#e2e8f0' }}>
          🔔 Notifications {unread>0 && <span style={{ background:'#ef4444', color:'#fff', borderRadius:10, padding:'0 5px', fontSize:9 }}>{unread}</span>}
        </span>
        <div style={{ display:'flex', gap:6 }}>
          {unread>0 && (
            <button onClick={markAll} style={{ fontSize:9, color:'#60a5fa', background:'none',
              border:'none', cursor:'pointer', fontWeight:600 }}>Mark all read</button>
          )}
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer' }}>
            <X size={12}/>
          </button>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {loading && <div style={{ padding:20, textAlign:'center', color:'#6b7280', fontSize:11 }}><Spinner /></div>}
        {!loading && notifs.length===0 && (
          <div style={{ padding:24, textAlign:'center', color:'#6b7280', fontSize:11 }}>
            <BellOff size={20} color="#4b5563" style={{ display:'block', margin:'0 auto 8px' }}/>
            No notifications
          </div>
        )}
        {!loading && notifs.map(n => (
          <div key={n.id} onClick={()=>!n.is_read&&markRead(n.id)}
            style={{ padding:'9px 12px', borderBottom:'1px solid #2e3349',
              background: n.is_read ? 'transparent' : '#1e2d4a',
              cursor: n.is_read ? 'default' : 'pointer',
              borderLeft: n.is_read ? '3px solid transparent' : '3px solid #60a5fa' }}>
            <div style={{ fontSize:10, fontWeight: n.is_read ? 400 : 700, color:'#e2e8f0',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {n.title || 'Notification'}
            </div>
            {n.body && (
              <div style={{ fontSize:9, color:'#6b7280', marginTop:2,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {n.body}
              </div>
            )}
            <div style={{ fontSize:8, color:'#374151', marginTop:2 }}>
              {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
              {!n.is_read && <span style={{ marginLeft:6, color:'#60a5fa', fontWeight:700 }}>● NEW</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const MdmMyReq = () => {

  // ── auth / access ──────────────────────────────────────────────────────────
  const [accessLoading, setAccessLoading] = useState(true);
  const [hasAccess, setHasAccess]         = useState(false);
  const [accessError, setAccessError]     = useState(null);
  const [showMapping, setShowMapping]     = useState(false); // CreateItemMaster inline render
  const [mappingRecord, setMappingRecord] = useState(null); // full ICR record for mapping panel
  const [mrEditing, setMrEditing]         = useState(false); // editing mode for mapping panel
  const [mrEditData, setMrEditData]       = useState({});    // edit form state
  const [mrSaving,   setMrSaving]         = useState(false); // saving state
  const [mrItemTypes, setMrItemTypes]     = useState([]);    // item type LOV for dropdown
  const [mrTypeOpen,  setMrTypeOpen]      = useState(false); // dropdown open state
  const [mrTypeSearch,setMrTypeSearch]    = useState('');    // dropdown search
  const [panelWidth,  setPanelWidth]      = useState(340);   // draggable panel width
  const [panelHidden, setPanelHidden]     = useState(false); // hide/show left panel
  // 🔥 Mapping page RBAC: Item Master page ka access check
  const [mappingAccessChecked, setMappingAccessChecked] = useState(false);
  const [hasMappingAccess,     setHasMappingAccess]     = useState(false);
  const dragRef = useRef(null);

  // ── data ───────────────────────────────────────────────────────────────────
  const [requests,     setRequests]     = useState([]);
  const [entityData,   setEntityData]   = useState({});
  const [dataLoading,  setDataLoading]  = useState(false);
  const [unreadCount,  setUnreadCount]  = useState(0);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [toast,        setToast]        = useState(null);
  const [selected,     setSelected]     = useState(null);   // timeline popup row
  const [actionRow,    setActionRow]    = useState(null);   // action modal row
  const [actionType,   setActionType]   = useState(null);
  const [actionLoading,setActionLoading]= useState(false);
  const [showNotif,    setShowNotif]    = useState(false);
  const [showFilters,  setShowFilters]  = useState(false);

  // ── filters ────────────────────────────────────────────────────────────────
  const [catStatus,    setCatStatus]    = useState('');          // sidebar category
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCompany,setFilterCompany]= useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterActive, setFilterActive] = useState('');          // ''|'active'|'inactive'
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [sortBy,       setSortBy]       = useState('date_desc'); // date_desc|date_asc|name|company|status

  const user   = getSession();
  const userId = user?.id;
  const notifRef = useRef();

  // ── toast ─────────────────────────────────────────────────────────────────
  const showToast = (msg, ok=true) => {
    setToast({msg,ok}); setTimeout(()=>setToast(null), 3000);
  };

  // ── close notif panel on outside click ────────────────────────────────────
  useEffect(()=>{
    const handler = (e)=>{ if(notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener('mousedown', handler);
    return ()=>document.removeEventListener('mousedown', handler);
  },[]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  1.  RBAC ACCESS CHECK  (original logic from MdmMyReq.jsx preserved 1:1)
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchAccess = useCallback(async () => {
    try {
      setAccessLoading(true); setAccessError(null);
      const storedUser = sessionStorage.getItem('userData');
      if (!storedUser) { setAccessError('No user data found. Please login again.'); setAccessLoading(false); return; }

      const parsed = JSON.parse(storedUser);
      let u = parsed?.user;
      if (!u?.id) { setAccessError('Invalid user data. User ID missing.'); setAccessLoading(false); return; }

      if (!u.accesses || u.accesses.length===0) {
        try {
          const res = await fetch(`${API}/users/${u.id}`);
          if (res.ok) { const full = await res.json(); u = full; parsed.user = full; sessionStorage.setItem('userData', JSON.stringify(parsed)); }
        } catch {}
      }

      if (!u.accesses || u.accesses.length===0) { setAccessError('No company access found for this user.'); setAccessLoading(false); return; }

      const primary = u.accesses.find(a=>a.is_primary_company) || u.accesses[0];
      if (!primary?.company?.id) { setAccessError('Primary company ID missing in access data.'); setAccessLoading(false); return; }

      const menuRes = await fetch(`${API}/rbac/users/${u.id}/accessible-menu?company_id=${primary.company.id}`);
      if (!menuRes.ok) { const e=await menuRes.json(); setAccessError(`API Error: ${e.detail||'Failed to load menu'}`); setAccessLoading(false); return; }

      const menuJson = await menuRes.json();
      if (!menuJson.menu?.length) { setAccessError('No pages accessible for this user.'); setAccessLoading(false); return; }

      // ── original checkMdmAccess logic ──────────────────────────────────────
      let found = false;
      const searchPages = (pages) => {
        pages.forEach(page => {
          if (['MDM My Requests','Mdm My Req'].includes(page.page_name)) found = true;
          if (page.children?.length) searchPages(page.children);
        });
      };
      searchPages(menuJson.menu);
      // ──────────────────────────────────────────────────────────────────────

      if (!found) { setAccessError('No access to MDM My Requests. Contact administrator.'); setAccessLoading(false); return; }

      // ── Additional backend gate: user must be a Step 2+ approver ──────────
      try {
        const mdmRes = await fetch(`${API}/mdm/access-check/${u.id}`);
        if (mdmRes.ok) {
          const mdmData = await mdmRes.json();
          if (!mdmData.has_access) {
            setAccessError('No access \u2014 this approver does not have access to the \u201cMy Requests\u201d page yet\nGo to Role Access page and grant access first');
            setAccessLoading(false);
            return;
          }
        }
      } catch {}
      // ─────────────────────────────────────────────────────────────────────

      setHasAccess(true);
      setAccessLoading(false);
    } catch (err) {
      setAccessError(`Error: ${err.message}`);
      setAccessLoading(false);
    }
  }, []);

  useEffect(()=>{ fetchAccess(); },[fetchAccess]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  1b. MAPPING ACCESS CHECK — Item Master page ka RBAC check
  //      Sirf ek baar check karo jab hasAccess true ho.
  //      Accessible menu mein 'Item Master' page hai to hi CreateItemMaster dikhega.
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!hasAccess) return; // main access nahi mila to skip
    const checkMappingAccess = async () => {
      try {
        const storedUser = sessionStorage.getItem('userData');
        if (!storedUser) { setHasMappingAccess(false); setMappingAccessChecked(true); return; }
        const parsed = JSON.parse(storedUser);
        const u = parsed?.user;
        if (!u?.id) { setHasMappingAccess(false); setMappingAccessChecked(true); return; }

        const primary = u.accesses?.find(a => a.is_primary_company) || u.accesses?.[0];
        if (!primary?.company?.id) { setHasMappingAccess(false); setMappingAccessChecked(true); return; }

        const res = await fetch(`${API}/rbac/users/${u.id}/accessible-menu?company_id=${primary.company.id}`);
        if (!res.ok) { setHasMappingAccess(false); setMappingAccessChecked(true); return; }

        const menuJson = await res.json();
        // Item Master page dhundho — naam match karo
        let found = false;
        const search = (pages) => {
          pages.forEach(pg => {
            if (
              pg.page_name === 'Item Master' ||
              pg.page_name === 'Create Item Master' ||
              (pg.page_url && pg.page_url.includes('create-item-master'))
            ) found = true;
            if (pg.children?.length) search(pg.children);
          });
        };
        if (menuJson.menu?.length) search(menuJson.menu);

        setHasMappingAccess(found);
        setMappingAccessChecked(true);
      } catch {
        setHasMappingAccess(false);
        setMappingAccessChecked(true);
      }
    };
    checkMappingAccess();
  }, [hasAccess]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  2.  LOAD DATA  (inbox + my-actions + entity details)
  // ═══════════════════════════════════════════════════════════════════════════
  const loadData = useCallback(async () => {
    if (!userId || !hasAccess) return;
    setDataLoading(true);
    try {
      // Inbox — pending my approval
      const inboxRows = [];
      try {
        const r = await fetch(`${API}/mdm/inbox/${userId}`);
        if (r.ok) {
          const d = await r.json();
          (Array.isArray(d)?d:[]).forEach(item=>{
            inboxRows.push({
              instance_id:  item.instance_id,
              entity_type:  item.entity_type,
              entity_id:    item.entity_id,
              status:       item.instance_status?.value || item.instance_status || 'PENDING',
              submitted_at: item.submitted_at,
              completed_at: null,
              _role:        'approver',
              _step_name:   item.step_name,
              _step_order:  item.step_order || 2,
            });
          });
        }
      } catch {}

      // My actions — already acted on
      const actedRows = [];
      try {
        const r = await fetch(`${API}/mdm/my-actions/${userId}`);
        if (r.ok) {
          const d = await r.json();
          (Array.isArray(d)?d:[]).forEach(item=>{
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
      } catch {}

      // Merge + dedupe
      const seen = new Set();
      const all  = [];
      [...inboxRows, ...actedRows].forEach(r=>{
        const key = r.instance_id ? String(r.instance_id) : `e-${r.entity_id}`;
        if (!seen.has(key)) { seen.add(key); all.push(r); }
      });
      all.sort((a,b)=>new Date(b.submitted_at||0)-new Date(a.submitted_at||0));
      setRequests(all);

      // Entity details
      const dmap = {};
      const itemRows = all.filter(r=>r.entity_type==='ITEM_CREATION'&&r.entity_id);
      await Promise.all(itemRows.map(async r=>{
        const key=`${r.entity_type}-${r.entity_id}`;
        if (dmap[key]) return;
        try {
          const res = await fetch(`${API}/item-creation-req/${r.entity_id}`);
          if (res.ok) {
            const d = await res.json();
            dmap[key] = {
              label:         d.item_name||`#${r.entity_id}`,
              company_name:  d.company?.company_name||'',
              dept_name:     d.department||'',
              required_date: d.required_date||'',
              item_type:     d.item_type||'',
              is_active:     d.is_active,
              request_id:    d.request_id||'',
            };
          }
        } catch {}
      }));
      setEntityData(dmap);

      // Unread count
      try {
        const r = await fetch(`${API}/workflow/user-notifications/${userId}/unread`);
        if (r.ok) { const d=await r.json(); setUnreadCount(d.unread_count||0); }
      } catch {}

    } catch { showToast('Failed to load requests','error'); }
    finally { setDataLoading(false); }
  }, [userId, hasAccess]);

  useEffect(()=>{ loadData(); },[loadData]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  3.  SSE — real-time auto-refresh
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(()=>{
    if (!userId||!hasAccess) return;
    const es = new EventSource(`${API}/workflow/user-notifications/${userId}/stream`);
    es.onmessage = (e)=>{
      try {
        const d = JSON.parse(e.data);
        if (d.type && d.type!=='heartbeat' && d.type!=='connected') {
          loadData();
          setUnreadCount(c=>c+1);
        }
      } catch {}
    };
    return ()=>es.close();
  },[userId, hasAccess, loadData]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  4.  ACTION  (approve / reject / return)
  // ═══════════════════════════════════════════════════════════════════════════
  const openAction = (row, type) => { setActionRow(row); setActionType(type); };

  const confirmAction = async (comments) => {
    if (!actionRow) return;
    setActionLoading(true);
    try {
      // START_MAPPING: backend ko kuch nahi bhejo — sirf mapping panel kholo
      if (actionType === 'START_MAPPING') {
        // sirf record fetch karo aur panel dikhao — approve nahi karo
        try {
          const recRes = await fetch(`${API}/item-creation-req/${actionRow.entity_id}`);
          if (recRes.ok) {
            const recData = await recRes.json();
            setMappingRecord(recData);
            setMrEditData({
              item_name:        recData.item_name        || '',
              item_short_name:  recData.item_short_name  || '',
              item_type:        recData.item_type        || '',
              department:       recData.department       || '',
              required_date:    recData.required_date    || '',
              item_description: recData.item_description || '',
              business_reason:  recData.business_reason  || '',
              ref_image_url:    recData.optional_documents?.reference_image_url  || '',
              vendor_quot_url:  recData.optional_documents?.vendor_quotation_url || '',
              sample_photo_url: recData.optional_documents?.sample_photo_url     || '',
              product_link:     recData.optional_documents?.product_link         || '',
            });
          }
        } catch {}
        setMrEditing(false);
        setActionRow(null); setActionType(null); setSelected(null);
        setShowMapping(true);
        return; // baaki code skip karo
      }

      const r = await fetch(`${API}/workflow/action/${actionRow.instance_id}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action_type:actionType, performed_by:userId, comments:comments||'' }),
      });
      if (!r.ok) { const e=await r.json(); throw new Error(e.detail||'Action failed'); }
      const labels = {APPROVE:'approved', REJECT:'rejected', RETURN:'returned to submitter'};
      showToast(`Request ${labels[actionType]||'updated'} ✓`);
      setActionRow(null); setActionType(null); setSelected(null);
      loadData();

      // START_MAPPING is handled above with early return
    } catch (e) { showToast(e.message, false); }
    finally { setActionLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  5.  DERIVED / FILTERED list
  // ═══════════════════════════════════════════════════════════════════════════
  const filtered = React.useMemo(()=>{
    const q = search.trim().toLowerCase();
    return requests.filter(r=>{
      const det = entityData[`${r.entity_type}-${r.entity_id}`]||{};

      // search
      if (q && !['label','company_name','dept_name','item_type','request_id'].some(k=>(det[k]||'').toLowerCase().includes(q))
             && !(r.status||'').toLowerCase().includes(q)
             && !(r.entity_type||'').toLowerCase().includes(q)) return false;

      // status filters (sidebar category takes priority, then dropdown)
      const statusF = catStatus || filterStatus;
      if (statusF && r.status!==statusF) return false;

      // company
      if (filterCompany && det.company_name!==filterCompany) return false;

      // entity type
      if (filterEntity && r.entity_type!==filterEntity) return false;

      // active/inactive (on item record)
      if (filterActive==='active'   && det.is_active===false) return false;
      if (filterActive==='inactive' && det.is_active!==false) return false;

      // date range
      if (dateFrom) { const s=r.submitted_at?.slice(0,10)||''; if(!s||s<dateFrom) return false; }
      if (dateTo)   { const s=r.submitted_at?.slice(0,10)||''; if(!s||s>dateTo)   return false; }

      return true;
    }).sort((a,b)=>{
      const da=entityData[`${a.entity_type}-${a.entity_id}`]||{};
      const db_=entityData[`${b.entity_type}-${b.entity_id}`]||{};
      if (sortBy==='date_asc')  return new Date(a.submitted_at||0)-new Date(b.submitted_at||0);
      if (sortBy==='date_desc') return new Date(b.submitted_at||0)-new Date(a.submitted_at||0);
      if (sortBy==='name')      return (da.label||'').localeCompare(db_.label||'');
      if (sortBy==='company')   return (da.company_name||'').localeCompare(db_.company_name||'');
      if (sortBy==='status')    return (a.status||'').localeCompare(b.status||'');
      return 0;
    });
  },[requests,entityData,search,catStatus,filterStatus,filterCompany,filterEntity,filterActive,dateFrom,dateTo,sortBy]);

  // ── sidebar counts ────────────────────────────────────────────────────────
  const statusCounts = React.useMemo(()=>{
    const c={};
    requests.forEach(r=>{ c[r.status]=(c[r.status]||0)+1; });
    return c;
  },[requests]);

  const companyCounts = React.useMemo(()=>{
    const c={};
    requests.forEach(r=>{
      const det=entityData[`${r.entity_type}-${r.entity_id}`]||{};
      const co=det.company_name||'—';
      c[co]=(c[co]||0)+1;
    });
    return c;
  },[requests,entityData]);

  const allCompanies = Object.keys(companyCounts).sort();
  const allEntities  = [...new Set(requests.map(r=>r.entity_type).filter(Boolean))];

  const hasAnyFilter = !!(catStatus||filterStatus||filterCompany||filterEntity||filterActive||dateFrom||dateTo||search);

  const clearFilters = ()=>{
    setCatStatus(''); setFilterStatus(''); setFilterCompany(''); setFilterEntity('');
    setFilterActive(''); setDateFrom(''); setDateTo(''); setSearch('');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  5b.  MAPPING PANEL HOOKS  (must be before any early return — Rules of Hooks)
  // ═══════════════════════════════════════════════════════════════════════════

  // mrFetchTypes — item type LOV for dropdown
  const mrFetchTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/item-type-master/lov`);
      if (res.ok) { const d = await res.json(); setMrItemTypes(Array.isArray(d) ? d : []); }
    } catch {}
  }, []);

  useEffect(() => {
    if (showMapping && mrItemTypes.length === 0) mrFetchTypes();
  }, [showMapping]); // eslint-disable-line

  // ═══════════════════════════════════════════════════════════════════════════
  //  6.  RENDER  gates
  // ═══════════════════════════════════════════════════════════════════════════
  if (accessLoading) return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white rounded-lg shadow-md">
      <Header userId={userId} unreadCount={0} showNotif={false} setShowNotif={()=>{}} onRefresh={()=>{}} loading={true} notifRef={notifRef} />
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10 }}>
        <Spinner size={28}/> <span style={{ fontSize:11, color:'#6b7280' }}>Checking access…</span>
      </div>
      <Footer/>
    </div>
  );

  if (accessError || !hasAccess) return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white rounded-lg shadow-md">
      <Header userId={userId} unreadCount={0} showNotif={false} setShowNotif={()=>{}} onRefresh={()=>{}} loading={false} notifRef={notifRef} />
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10 }}>
        <AlertCircle size={36} color="#ef4444"/>
        <div style={{ fontSize:12, color:'#dc2626', fontWeight:700 }}>Access Denied</div>
        <div style={{ fontSize:10, color:'#7f1d1d', textAlign:'center', maxWidth:360,
          background:'#fee2e2', padding:'10px', borderRadius:8, border:'1px solid #fca5a5' }}>
          {accessError||'You don\'t have access to MDM My Requests.'}
        </div>
      </div>
      <Footer/>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  7.  MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  // ── mrSaveEdit: save edited mapping record fields ─────────────────────────
  const mrSaveEdit = async () => {
    if (!mappingRecord?.id) return;
    setMrSaving(true);
    try {
      const res = await fetch(`${API}/item-creation-req/${mappingRecord.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name:        mrEditData.item_name,
          item_short_name:  mrEditData.item_short_name,
          item_type:        mrEditData.item_type,
          department:       mrEditData.department,
          required_date:    mrEditData.required_date,
          item_description: mrEditData.item_description,
          business_reason:  mrEditData.business_reason,
          optional_documents: {
            reference_image_url:  mrEditData.ref_image_url    || null,
            vendor_quotation_url: mrEditData.vendor_quot_url  || null,
            sample_photo_url:     mrEditData.sample_photo_url || null,
            product_link:         mrEditData.product_link      || null,
          },
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Save failed'); }
      const updated = await res.json();
      setMappingRecord(updated);
      setMrEditing(false);
      showToast('Request updated ✓');
    } catch (e) { showToast(e.message, false); }
    finally { setMrSaving(false); }
  };

  // ── showMapping: Professional Light Theme Split Panel ─────────────────────
  if (showMapping) {
    // 🔥 RBAC gate: access check abhi chal raha hai to loading dikhao
    if (!mappingAccessChecked) return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-white rounded-lg shadow-md">
        <Header userId={userId} unreadCount={0} showNotif={false} setShowNotif={()=>{}} onRefresh={()=>{}} loading={true} notifRef={notifRef} />
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10 }}>
          <Spinner size={28}/> <span style={{ fontSize:11, color:'#6b7280' }}>Checking mapping access…</span>
        </div>
        <Footer/>
      </div>
    );

    // 🔥 RBAC gate: access nahi hai to deny dikhao
    if (!hasMappingAccess) return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-white rounded-lg shadow-md">
        <Header userId={userId} unreadCount={0} showNotif={false} setShowNotif={()=>{}} onRefresh={()=>{}} loading={false} notifRef={notifRef} />
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
          <AlertCircle size={36} color="#ef4444"/>
          <div style={{ fontSize:12, color:'#dc2626', fontWeight:700 }}>No Access to Item Master</div>
          <div style={{ fontSize:10, color:'#7f1d1d', textAlign:'center', maxWidth:360,
            background:'#fee2e2', padding:'10px 14px', borderRadius:8, border:'1px solid #fca5a5', lineHeight:1.6 }}>
            You don't have access to the <b>Item Master</b> page.<br/>
            Contact your administrator to grant access.
          </div>
          <button
            onClick={() => { setShowMapping(false); setMrEditing(false); setMrTypeOpen(false); }}
            style={{ marginTop:4, padding:'6px 18px', background:'#1e40af', color:'#fff',
              border:'none', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center', gap:5 }}>
            <ArrowLeft size={12}/> Back to My Requests
          </button>
        </div>
        <Footer/>
      </div>
    );
    const mr = mappingRecord || {};
    const docs = mr.optional_documents || {};
    const filteredTypes = mrItemTypes.filter(t =>
      t.name.toLowerCase().includes(mrTypeSearch.toLowerCase())
    );

    // ── Dark (light-black) theme styles ─────────────────────────────────────
    const S = {
      wrap:    { width:'100%', height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative', background:'#181c27', fontFamily:"'DM Sans','Segoe UI',sans-serif" },
      topBar:  { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 16px',
                 background:'linear-gradient(135deg,#23273a,#1a1e2e)', flexShrink:0, borderBottom:'1px solid #2a2f45', boxShadow:'0 2px 8px rgba(0,0,0,.3)' },
      backBtn: { display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,.07)',
                 border:'1px solid rgba(255,255,255,.13)', color:'#b0b8d1', borderRadius:7,
                 padding:'4px 12px', cursor:'pointer', fontSize:10, fontWeight:700 },
      tag:     (bg,col) => ({ display:'inline-flex', alignItems:'center', gap:4, background:bg,
                 color:col, borderRadius:20, padding:'2px 10px', fontSize:9, fontWeight:700, border:`1px solid ${col}33` }),
      panel:   { background:'#1e2235', borderRight:'1px solid #272d42', display:'flex', flexDirection:'column',
                 width:340, flexShrink:0, overflow:'hidden', boxShadow:'2px 0 12px rgba(0,0,0,.25)' },
      pHead:   { padding:'12px 16px 10px', borderBottom:'1px solid #272d42', background:'#232740', flexShrink:0 },
      field:   { display:'flex', flexDirection:'column', gap:4 },
      label:   { fontSize:8, fontWeight:800, color:'#7c85b3', textTransform:'uppercase', letterSpacing:1 },
      val:     { fontSize:11, color:'#d4daf0', fontWeight:600, lineHeight:1.5 },
      inp:     { background:'#161929', border:'1.5px solid #2e3555', borderRadius:7, padding:'6px 10px',
                 fontSize:11, color:'#d4daf0', width:'100%', boxSizing:'border-box', outline:'none',
                 fontFamily:'inherit', transition:'border-color .15s' },
      editBtn: { display:'flex', alignItems:'center', gap:4, background:'#2d3152',
                 border:'1px solid #4a52a0', color:'#a0a8e0', borderRadius:7, padding:'4px 12px',
                 cursor:'pointer', fontSize:9, fontWeight:700 },
      cancelBtn:{ background:'#232740', border:'1px solid #2e3555', color:'#7c85b3',
                  borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:9, fontWeight:600 },
      saveBtn: (saving) => ({ background: saving ? '#2d4a3e' : 'linear-gradient(135deg,#1e8a4a,#16663a)',
                 border:'none', color:'#7de8b0', borderRadius:7, padding:'4px 12px',
                 cursor: saving?'not-allowed':'pointer', fontSize:9, fontWeight:700,
                 display:'flex', alignItems:'center', gap:3 }),
      secHead: { fontSize:8, fontWeight:800, color:'#4a5278', textTransform:'uppercase',
                 letterSpacing:1, display:'flex', alignItems:'center', gap:6, margin:'8px 0 4px' },
      rHead:   { padding:'8px 16px', borderBottom:'1px solid #272d42',
                 background:'#1a1e2e', flexShrink:0,
                 display:'flex', alignItems:'center', gap:8, justifyContent:'space-between' },
    };

    return (
      <div style={S.wrap}>

        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <div style={S.topBar}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button style={S.backBtn}
              onClick={() => { setShowMapping(false); setMrEditing(false); setMrTypeOpen(false); }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.25)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}>
              <ArrowLeft size={11}/> MDM My Requests
            </button>
            <div style={{ width:1, height:16, background:'rgba(255,255,255,.3)' }}/>
            <span style={{ fontSize:11, fontWeight:700, color:'#c8d0ec' }}>📦 Item Master Mapping</span>
            {mr.request_id && <span style={{ background:'rgba(255,255,255,.07)', color:'#a0a8e0', borderRadius:20, padding:'1px 10px', fontSize:9, fontWeight:700 }}>{mr.request_id}</span>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {mr.company?.company_name && <span style={S.tag('rgba(255,255,255,.15)','#fff')}>🏢 {mr.company.company_name}</span>}
            {mr.department && <span style={S.tag('rgba(255,255,255,.15)','#fff')}>🏷 {mr.department}</span>}
          </div>
        </div>

        {/* ── Main split ────────────────────────────────────────────────────── */}
        <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>

          {/* ── LEFT: Request Summary Panel ───────────────────────────────── */}
          <div style={{ ...S.panel, width: panelHidden ? 0 : panelWidth, minWidth: panelHidden ? 0 : 220, maxWidth:520, transition: panelHidden ? 'width .25s ease' : 'none', overflow: panelHidden ? 'hidden' : 'hidden' }}>

            {/* Panel header */}
            <div style={S.pHead}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:11, fontWeight:800, color:'#c8d0ec' }}>📋 Request Details</span>
                {!mrEditing ? (
                  <button style={S.editBtn} onClick={() => setMrEditing(true)}>✏️ Edit Fields</button>
                ) : (
                  <div style={{ display:'flex', gap:5 }}>
                    <button style={S.cancelBtn} onClick={() => { setMrEditing(false); setMrTypeOpen(false); }}>Cancel</button>
                    <button style={S.saveBtn(mrSaving)} onClick={mrSaveEdit} disabled={mrSaving}>
                      {mrSaving ? '⏳' : '💾'} {mrSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
              {mrEditing && <p style={{ fontSize:9, color:'#7c85b3', margin:0, fontWeight:600 }}>✏️ Edit mode — all fields are now editable</p>}
            </div>

            {/* Scrollable fields */}
            <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10, background:'#1e2235' }}
              onClick={() => mrTypeOpen && setMrTypeOpen(false)}>

              {/* Item Name */}
              <div style={S.field}>
                <span style={S.label}>Item Name <span style={{color:'#ef4444'}}>*</span></span>
                {mrEditing
                  ? <input style={S.inp} value={mrEditData.item_name}
                      onChange={e=>setMrEditData(p=>({...p,item_name:e.target.value}))}
                      onFocus={e=>e.target.style.borderColor='#6366f1'}
                      onBlur={e=>e.target.style.borderColor='#2e3555'}/>
                  : <span style={S.val}>{mr.item_name||<span style={{color:'#94a3b8'}}>—</span>}</span>}
              </div>

              {/* Item Short Name */}
              <div style={S.field}>
                <span style={S.label}>Item Short Name <span style={{color:'#ef4444'}}>*</span></span>
                {mrEditing
                  ? <input style={S.inp} value={mrEditData.item_short_name}
                      onChange={e=>setMrEditData(p=>({...p,item_short_name:e.target.value}))}
                      onFocus={e=>e.target.style.borderColor='#6366f1'}
                      onBlur={e=>e.target.style.borderColor='#2e3555'}/>
                  : <span style={S.val}>{mr.item_short_name||<span style={{color:'#94a3b8'}}>—</span>}</span>}
              </div>

              {/* Item Type — dropdown */}
              <div style={S.field}>
                <span style={S.label}>Item Type <span style={{color:'#ef4444'}}>*</span></span>
                {mrEditing ? (
                  <div style={{ position:'relative' }} onClick={e=>e.stopPropagation()}>
                    <div onClick={() => { setMrTypeOpen(v=>!v); setMrTypeSearch(''); }}
                      style={{ ...S.inp, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', userSelect:'none' }}>
                      <span style={{ color: mrEditData.item_type ? '#1e293b' : '#94a3b8' }}>
                        {mrEditData.item_type || 'Select item type…'}
                      </span>
                      <span style={{ fontSize:10, color:'#6366f1', transition:'transform .2s', transform: mrTypeOpen?'rotate(180deg)':'none' }}>▾</span>
                    </div>
                    {mrTypeOpen && (
                      <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:200,
                        background:'#1e2235', border:'1.5px solid #2e3555', borderRadius:8,
                        boxShadow:'0 8px 24px rgba(0,0,0,.4)', maxHeight:180, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                        <input autoFocus value={mrTypeSearch} placeholder="Search type…"
                          onChange={e=>setMrTypeSearch(e.target.value)}
                          style={{ padding:'7px 10px', fontSize:11, border:'none', borderBottom:'1px solid #272d42',
                            outline:'none', color:'#d4daf0', background:'#161929' }}/>
                        <div style={{ overflowY:'auto', flex:1 }}>
                          {filteredTypes.length === 0
                            ? <div style={{ padding:10, fontSize:10, color:'#4a5278', textAlign:'center' }}>No types found</div>
                            : filteredTypes.map(t => (
                              <div key={t.id} onClick={() => { setMrEditData(p=>({...p,item_type:t.name})); setMrTypeOpen(false); setMrTypeSearch(''); }}
                                style={{ padding:'7px 12px', fontSize:11, cursor:'pointer',
                                  color: mrEditData.item_type===t.name ? '#6366f1' : '#1e293b',
                                  background: mrEditData.item_type===t.name ? '#eef2ff' : 'transparent',
                                  fontWeight: mrEditData.item_type===t.name ? 700 : 400 }}
                                onMouseEnter={e=>{ if(mrEditData.item_type!==t.name) e.currentTarget.style.background='#232740'; }}
                                onMouseLeave={e=>{ if(mrEditData.item_type!==t.name) e.currentTarget.style.background='transparent'; }}>
                                {t.name}
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ ...S.val }}>
                    {mr.item_type
                      ? <span style={{ background:'#2d3152', color:'#a0a8e0', border:'1px solid #3a4280', borderRadius:20, padding:'2px 10px', fontSize:10, fontWeight:700 }}>{mr.item_type}</span>
                      : <span style={{color:'#94a3b8'}}>—</span>}
                  </span>
                )}
              </div>

              {/* Department + Required Date — grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div style={S.field}>
                  <span style={S.label}>Department</span>
                  {mrEditing
                    ? <input style={S.inp} value={mrEditData.department}
                        onChange={e=>setMrEditData(p=>({...p,department:e.target.value}))}
                        onFocus={e=>e.target.style.borderColor='#6366f1'}
                        onBlur={e=>e.target.style.borderColor='#2e3555'}/>
                    : <span style={{ ...S.val, color:'#38bdf8' }}>{mr.department||<span style={{color:'#94a3b8'}}>—</span>}</span>}
                </div>
                <div style={S.field}>
                  <span style={S.label}>Required Date</span>
                  {mrEditing
                    ? <input type="date" style={S.inp} value={mrEditData.required_date}
                        onChange={e=>setMrEditData(p=>({...p,required_date:e.target.value}))}
                        onFocus={e=>e.target.style.borderColor='#6366f1'}
                        onBlur={e=>e.target.style.borderColor='#2e3555'}/>
                    : <span style={{ ...S.val, color:'#fbbf24' }}>📅 {mr.required_date||<span style={{color:'#94a3b8'}}>—</span>}</span>}
                </div>
              </div>

              {/* Item Description */}
              <div style={S.field}>
                <span style={S.label}>Item Description <span style={{color:'#ef4444'}}>*</span></span>
                {mrEditing
                  ? <textarea rows={3} style={{...S.inp, resize:'vertical', lineHeight:1.6}} value={mrEditData.item_description}
                      onChange={e=>setMrEditData(p=>({...p,item_description:e.target.value}))}
                      onFocus={e=>e.target.style.borderColor='#6366f1'}
                      onBlur={e=>e.target.style.borderColor='#2e3555'}/>
                  : <span style={{ ...S.val, lineHeight:1.6, color:'#b0b8d1' }}>{mr.item_description||<span style={{color:'#94a3b8'}}>—</span>}</span>}
              </div>

              {/* Business Reason */}
              <div style={S.field}>
                <span style={S.label}>Business Reason <span style={{color:'#ef4444'}}>*</span></span>
                {mrEditing
                  ? <textarea rows={3} style={{...S.inp, resize:'vertical', lineHeight:1.6}} value={mrEditData.business_reason}
                      onChange={e=>setMrEditData(p=>({...p,business_reason:e.target.value}))}
                      onFocus={e=>e.target.style.borderColor='#6366f1'}
                      onBlur={e=>e.target.style.borderColor='#2e3555'}/>
                  : <span style={{ ...S.val, lineHeight:1.6, color:'#b0b8d1' }}>{mr.business_reason||<span style={{color:'#94a3b8'}}>—</span>}</span>}
              </div>

              {/* Plant */}
              {mr.plant?.plant_name && (
                <div style={S.field}>
                  <span style={S.label}>Plant</span>
                  <span style={S.val}>{mr.plant.plant_name}{mr.plant.plant_code?` (${mr.plant.plant_code})`:''}</span>
                </div>
              )}

              {/* ── Optional Documents ─────────────────────────────────────── */}
              <div style={S.secHead}>
                <span style={{ height:1, flex:1, background:'#272d42' }}/>
                📎 Optional Documents
                <span style={{ height:1, flex:1, background:'#272d42' }}/>
              </div>

              {[
                { key:'ref_image_url',    label:'Reference Image',    apiKey:'reference_image_url',  accept:'image/*',     icon:'🖼️' },
                { key:'sample_photo_url', label:'Sample Photo',       apiKey:'sample_photo_url',     accept:'image/*',     icon:'📷' },
                { key:'vendor_quot_url',  label:'Vendor Quotation',   apiKey:'vendor_quotation_url', accept:'.pdf,.doc,.docx,.xls,.xlsx', icon:'📄' },
                { key:'product_link',     label:'Product Link (URL)', apiKey:'product_link',         accept:null,          icon:'🔗' },
              ].map(f => {
                const savedVal = docs[f.apiKey] || '';
                const editVal  = mrEditData[f.key] || '';
                return (
                  <div key={f.key} style={S.field}>
                    <span style={S.label}>{f.icon} {f.label}</span>
                    {mrEditing ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        {/* URL input */}
                        <input style={{...S.inp, fontSize:10}} value={editVal} placeholder="https://… or paste URL"
                          onChange={e=>setMrEditData(p=>({...p,[f.key]:e.target.value}))}
                          onFocus={e=>e.target.style.borderColor='#6366f1'}
                          onBlur={e=>e.target.style.borderColor='#2e3555'}/>
                        {/* File upload button (only for image/doc fields, not product_link) */}
                        {f.accept && (
                          <label style={{ display:'inline-flex', alignItems:'center', gap:5, cursor:'pointer',
                            background:'#232740', border:'1.5px dashed #2e3555', borderRadius:7,
                            padding:'5px 10px', fontSize:9, fontWeight:700, color:'#7c85b3',
                            transition:'all .15s' }}
                            onMouseEnter={e=>e.currentTarget.style.background='#2d3152'}
                            onMouseLeave={e=>e.currentTarget.style.background='#232740'}>
                            <input type="file" accept={f.accept} style={{ display:'none' }}
                              onChange={async e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                // Show filename as placeholder — actual upload to be handled by backend
                                // For now store object URL for preview
                                const objectUrl = URL.createObjectURL(file);
                                setMrEditData(p=>({...p,[f.key]: objectUrl}));
                              }}/>
                            📁 Upload File
                          </label>
                        )}
                        {/* Preview if image and value exists */}
                        {editVal && f.accept?.includes('image') && (
                          <img src={editVal} alt="preview" style={{ maxHeight:60, borderRadius:6, border:'1px solid #272d42', objectFit:'cover' }}
                            onError={e=>e.currentTarget.style.display='none'}/>
                        )}
                      </div>
                    ) : savedVal ? (
                      savedVal.startsWith('http') || savedVal.startsWith('blob') ? (
                        f.accept?.includes('image')
                          ? <img src={savedVal} alt={f.label} style={{ maxHeight:60, borderRadius:6, border:'1px solid #272d42', objectFit:'cover' }}
                              onError={e=>e.currentTarget.style.display='none'}/>
                          : <a href={savedVal} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize:10, color:'#818cf8', wordBreak:'break-all', textDecoration:'none', fontWeight:600 }}>
                              {f.icon} {savedVal.length > 40 ? savedVal.slice(0,40)+'…' : savedVal}
                            </a>
                      ) : <span style={{ fontSize:10, color:'#6366f1', fontWeight:600 }}>{savedVal}</span>
                    ) : (
                      <span style={{ fontSize:9, color:'#3a4060', fontStyle:'italic' }}>Not provided</span>
                    )}
                  </div>
                );
              })}

              {/* Meta info */}
              <div style={{ marginTop:6, padding:'10px 0', borderTop:'1px solid #272d42',
                display:'flex', flexDirection:'column', gap:5 }}>
                {mr.creator?.full_name && (
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#94a3b8' }}>
                    <span>Submitted by</span>
                    <span style={{ color:'#475569', fontWeight:700 }}>{mr.creator.full_name}</span>
                  </div>
                )}
                {mr.created_at && (
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#94a3b8' }}>
                    <span>Created</span>
                    <span style={{ color:'#475569' }}>{new Date(mr.created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Drag handle + toggle button ──────────────────────────────── */}
          <div style={{ width:6, flexShrink:0, position:'relative', cursor:'col-resize',
            background:'#272d42', transition:'background .15s', zIndex:10,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
            onMouseEnter={e=>e.currentTarget.style.background='#4a52a0'}
            onMouseLeave={e=>{ if(!dragRef.current) e.currentTarget.style.background='#272d42'; }}
            onMouseDown={e => {
              e.preventDefault();
              dragRef.current = true;
              const startX = e.clientX;
              const startW = panelHidden ? 0 : panelWidth;
              const onMove = mv => {
                const newW = Math.max(180, Math.min(560, startW + mv.clientX - startX));
                setPanelWidth(newW);
                if (panelHidden && newW > 180) setPanelHidden(false);
              };
              const onUp = () => {
                dragRef.current = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}>
            {/* Toggle hide/show button */}
            <button
              title={panelHidden ? 'Show Request Details' : 'Hide Request Details'}
              onClick={() => setPanelHidden(v => !v)}
              style={{ position:'absolute', top:'50%', transform:'translateY(-50%)',
                width:18, height:36, background:'#6366f1', border:'none', borderRadius:'0 6px 6px 0',
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff', fontSize:10, boxShadow:'2px 0 6px #6366f140', zIndex:20 }}>
              {panelHidden ? '▶' : '◀'}
            </button>
          </div>

          {/* ── RIGHT: CreateItemMaster ─────────────────────────────────── */}
          <div style={{ flex:1, overflow:'hidden', minHeight:0, display:'flex', flexDirection:'column', background:'#181c27' }}>
            <div style={S.rHead}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:10, fontWeight:800, color:'#34d399', textTransform:'uppercase', letterSpacing:0.8 }}>📦 Create Item Master</span>
                <span style={{ fontSize:9, color:'#4a5278' }}>Fill all tabs to complete the mapping</span>
              </div>
            </div>
            <div style={{ flex:1, overflow:'hidden', minHeight:0 }}>
              <CreateItemMaster mappingRecord={mappingRecord} />
            </div>
          </div>

        </div>



      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-lg shadow-md"
      style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:'#0f1117', color:'#e2e8f0', fontSize:12 }}>

      <style>{`
        @keyframes mdmSpin { to{transform:rotate(360deg)} }
        @keyframes mdmFadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        @keyframes mdmPop { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
        @keyframes mdmRowIn { from{opacity:0;transform:translateY(3px)} to{opacity:1;transform:none} }
        .mdm-row:hover { background:#21253a!important; box-shadow:inset 3px 0 0 #4f8ef7; }
        .mdm-row:hover .mdm-name { color:#4f8ef7!important; }
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-track{background:#1a1d27} ::-webkit-scrollbar-thumb{background:#2e3349;border-radius:10px}
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          zIndex:99999, padding:'11px 22px', borderRadius:10, fontWeight:700, fontSize:12,
          background: toast.ok?'#0d2e22':'#2e1515', color: toast.ok?'#34d399':'#f87171',
          border:`1px solid ${toast.ok?'#34d399':'#f87171'}44`,
          boxShadow:'0 8px 32px rgba(0,0,0,.5)' }}>
          {toast.ok?'✅':'❌'} {toast.msg}
        </div>
      )}

      {/* ── Modals ── */}
      <ActionModal action={actionType} onConfirm={confirmAction} onClose={()=>{setActionRow(null);setActionType(null);}} loading={actionLoading} />
      <TimelinePopup row={selected} entityData={entityData} onClose={()=>setSelected(null)} onAction={openAction} userId={userId} />

      {/* ── Header ── */}
      <Header userId={userId} unreadCount={unreadCount} showNotif={showNotif}
        setShowNotif={setShowNotif} onRefresh={loadData} loading={dataLoading} notifRef={notifRef} />

      {/* ── Search + Filter bar ── */}
      <div style={{ background:'#1a1d27', borderBottom:'1px solid #2e3349', padding:'6px 10px',
        display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
        {/* Search */}
        <div style={{ position:'relative', flex:1 }}>
          <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#4b5563', pointerEvents:'none' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search item name, company, dept, type, status…"
            style={{ width:'100%', boxSizing:'border-box', background:'#0f1117', border:'1px solid #2e3349',
              borderRadius:7, padding:'5px 28px 5px 28px', fontSize:11, color:'#e2e8f0', outline:'none' }}
            onFocus={e=>e.target.style.borderColor='#4f8ef7'}
            onBlur={e=>e.target.style.borderColor='#2e3349'}/>
          {search && <button onClick={()=>setSearch('')} style={{ position:'absolute', right:7, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#6b7280', cursor:'pointer' }}><X size={11}/></button>}
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{ background:'#21253a', border:'1px solid #2e3349', color:'#e2e8f0', borderRadius:6,
            padding:'4px 8px', fontSize:10, outline:'none', cursor:'pointer' }}>
          <option value="date_desc">↓ Newest</option>
          <option value="date_asc">↑ Oldest</option>
          <option value="name">A-Z Name</option>
          <option value="company">Company</option>
          <option value="status">Status</option>
        </select>

        {/* Filters toggle */}
        <button onClick={()=>setShowFilters(f=>!f)}
          style={{ background: showFilters?'#4f8ef722':'#21253a',
            border:`1px solid ${showFilters?'#4f8ef7':'#2e3349'}`,
            color: showFilters?'#4f8ef7':'#94a3b8', borderRadius:6,
            padding:'4px 10px', fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
          <SlidersHorizontal size={11}/> Filters {hasAnyFilter&&<span style={{ background:'#ef4444', color:'#fff', borderRadius:10, padding:'0 5px', fontSize:8, fontWeight:700 }}>!</span>}
        </button>

        {hasAnyFilter && (
          <button onClick={clearFilters}
            style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:10, fontWeight:600, display:'flex', alignItems:'center', gap:3 }}>
            <X size={10}/> Clear
          </button>
        )}
      </div>

      {/* ── Advanced filters panel ── */}
      {showFilters && (
        <div style={{ background:'#131929', borderBottom:'1px solid #2e3349', padding:'8px 10px',
          display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', flexShrink:0, animation:'mdmFadeIn .15s ease' }}>

          {/* Status dropdown */}
          <div>
            <div style={{ fontSize:8, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, marginBottom:2 }}>Status</div>
            <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setCatStatus('');}}
              style={{ background:'#21253a', border:'1px solid #2e3349', color:'#e2e8f0', borderRadius:5, padding:'3px 8px', fontSize:10, outline:'none' }}>
              <option value="">All</option>
              {ALL_STATUSES.map(s=><option key={s} value={s}>{STATUS[s].label}</option>)}
            </select>
          </div>

          {/* Company */}
          {allCompanies.length>1 && (
            <div>
              <div style={{ fontSize:8, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, marginBottom:2 }}>Company</div>
              <select value={filterCompany} onChange={e=>setFilterCompany(e.target.value)}
                style={{ background:'#21253a', border:'1px solid #2e3349', color:'#e2e8f0', borderRadius:5, padding:'3px 8px', fontSize:10, outline:'none' }}>
                <option value="">All</option>
                {allCompanies.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Entity type */}
          {allEntities.length>1 && (
            <div>
              <div style={{ fontSize:8, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, marginBottom:2 }}>Type</div>
              <select value={filterEntity} onChange={e=>setFilterEntity(e.target.value)}
                style={{ background:'#21253a', border:'1px solid #2e3349', color:'#e2e8f0', borderRadius:5, padding:'3px 8px', fontSize:10, outline:'none' }}>
                <option value="">All</option>
                {allEntities.map(e=><option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          )}

          {/* Active/Inactive */}
          <div>
            <div style={{ fontSize:8, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, marginBottom:2 }}>Record</div>
            <select value={filterActive} onChange={e=>setFilterActive(e.target.value)}
              style={{ background:'#21253a', border:'1px solid #2e3349', color:'#e2e8f0', borderRadius:5, padding:'3px 8px', fontSize:10, outline:'none' }}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Date range */}
          <div>
            <div style={{ fontSize:8, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, marginBottom:2 }}>From date</div>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
              style={{ background:'#21253a', border:'1px solid #2e3349', color: dateFrom?'#e2e8f0':'#4b5563', borderRadius:5, padding:'3px 8px', fontSize:10, outline:'none', colorScheme:'dark' }}/>
          </div>
          <div>
            <div style={{ fontSize:8, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, marginBottom:2 }}>To date</div>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
              style={{ background:'#21253a', border:'1px solid #2e3349', color: dateTo?'#e2e8f0':'#4b5563', borderRadius:5, padding:'3px 8px', fontSize:10, outline:'none', colorScheme:'dark' }}/>
          </div>
        </div>
      )}

      {/* ── Body: sidebar + table ── */}
      <div style={{ flex:1, minHeight:0, display:'flex', overflow:'hidden' }}>

        {/* ── Sidebar ── */}
        <div style={{ width:160, borderRight:'1px solid #2e3349', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
          <div style={{ padding:'6px 8px', borderBottom:'1px solid #2e3349', fontSize:8, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:.7 }}>
            Categories
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>

            {/* All */}
            <SidebarItem label="All" count={requests.length} active={!catStatus&&!filterStatus}
              onClick={()=>{setCatStatus('');setFilterStatus('');}} color="#4f8ef7" icon="📋" />

            {/* Status categories */}
            {ALL_STATUSES.filter(s=>statusCounts[s]).map(s=>(
              <SidebarItem key={s} label={STATUS[s].label} count={statusCounts[s]||0}
                active={catStatus===s} onClick={()=>{setCatStatus(s===catStatus?'':s);setFilterStatus('');}}
                color={STATUS[s].dot} icon={STATUS[s].icon} />
            ))}

            {/* Divider */}
            {allCompanies.length>0 && (
              <>
                <div style={{ padding:'8px 8px 2px', fontSize:7, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:.5 }}>By Company</div>
                {allCompanies.map(co=>(
                  <SidebarItem key={co} label={co} count={companyCounts[co]||0}
                    active={filterCompany===co} onClick={()=>setFilterCompany(filterCompany===co?'':co)}
                    color="#a78bfa" icon="🏢" />
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Table area ── */}
        <div style={{ flex:1, minWidth:0, overflow:'auto', background:'#0f1117' }}>

          {/* Stat pills */}
          <div style={{ display:'flex', gap:6, padding:'7px 10px', borderBottom:'1px solid #2e3349',
            flexWrap:'wrap', alignItems:'center', background:'#1a1d27' }}>
            {ALL_STATUSES.filter(s=>statusCounts[s]).map(s=>{
              const m=STATUS[s]; const active=(catStatus||filterStatus)===s;
              return (
                <button key={s} onClick={()=>{setCatStatus(active?'':s);setFilterStatus('');}}
                  style={{ background:active?`${m.dot}22`:'#21253a',
                    border:`1px solid ${active?m.dot+'88':'#2e3349'}`,
                    borderRadius:6, padding:'3px 10px', cursor:'pointer', textAlign:'center',
                    outline:'none', transition:'all .12s' }}>
                  <p style={{ fontSize:13, fontWeight:800, color:m.dot, margin:0, lineHeight:1.2 }}>{statusCounts[s]}</p>
                  <p style={{ fontSize:8, color:active?m.dot:'#6b7280', margin:0, textTransform:'uppercase', letterSpacing:.5, fontWeight:600 }}>{m.label}</p>
                </button>
              );
            })}
            <div style={{ marginLeft:'auto', fontSize:9, color:'#6b7280' }}>
              {filtered.length} of {requests.length} shown
            </div>
          </div>

          {/* Loading skeleton */}
          {dataLoading && (
            <div style={{ padding:'12px 10px' }}>
              {[...Array(4)].map((_,i)=>(
                <div key={i} style={{ height:44, borderRadius:8, marginBottom:6,
                  background:'linear-gradient(90deg,#1a1d27 25%,#21253a 50%,#1a1d27 75%)',
                  backgroundSize:'200% 100%', animation:'mdmSpin 0s' }} />
              ))}
            </div>
          )}

          {/* Empty */}
          {!dataLoading && filtered.length===0 && (
            <div style={{ padding:'48px 32px', textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:10 }}>📭</div>
              <p style={{ color:'#e2e8f0', fontSize:13, fontWeight:700, margin:'0 0 6px' }}>No requests found</p>
              <p style={{ color:'#6b7280', fontSize:11, margin:'0 0 14px' }}>
                {hasAnyFilter ? 'No requests match current filters.' : 'No workflow requests assigned to you yet.'}
              </p>
              {hasAnyFilter && (
                <button onClick={clearFilters}
                  style={{ background:'#4f8ef722', border:'1px solid #4f8ef755', color:'#4f8ef7',
                    borderRadius:7, padding:'6px 16px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                  Clear All Filters
                </button>
              )}
            </div>
          )}

          {/* Table */}
          {!dataLoading && filtered.length>0 && (
            <div style={{ padding:'8px 10px' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#21253a', borderBottom:'1px solid #2e3349' }}>
                    {['#','Type','My Role','Item / Request','Company','Dept','Req. Date','Status','Submitted','Active','Actions'].map(h=>(
                      <th key={h} style={{ padding:'7px 12px', textAlign:'left', fontSize:9,
                        fontWeight:700, color:'#6b7280', textTransform:'uppercase',
                        letterSpacing:.6, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => {
                    const det = entityData[`${r.entity_type}-${r.entity_id}`]||{};
                    const m   = STATUS[r.status]||STATUS.DRAFT;
                    const canAct = r._role==='approver'&&['PENDING','IN_REVIEW'].includes(r.status);
                    return (
                      <tr key={r.instance_id||idx} className="mdm-row"
                        onClick={()=>setSelected(r)}
                        style={{ borderBottom:'1px solid #2e334922', background:'#1a1d27',
                          cursor:'pointer', animation:`mdmRowIn .18s ease ${idx*0.02}s both` }}>

                        {/* # */}
                        <td style={{ padding:'9px 12px' }}>
                          <span style={{ fontSize:9, fontWeight:700, color:'#6b7280',
                            background:'#21253a', border:'1px solid #2e3349',
                            padding:'1px 6px', borderRadius:5 }}>
                            {String(idx+1).padStart(2,'0')}
                          </span>
                        </td>

                        {/* Type */}
                        <td style={{ padding:'9px 12px' }}>
                          <span style={{ background:'#1e2d4a', color:'#4f8ef7', border:'1px solid #4f8ef733',
                            padding:'2px 8px', borderRadius:20, fontSize:8, fontWeight:700, fontFamily:'monospace' }}>
                            {r.entity_type}
                          </span>
                        </td>

                        {/* My Role */}
                        <td style={{ padding:'9px 12px' }}>
                          <span style={{ background:'#0d2e22', color:'#34d399', border:'1px solid #34d39933',
                            padding:'2px 8px', borderRadius:20, fontSize:9, fontWeight:700, whiteSpace:'nowrap' }}>
                            ✅ Approver{r._step_name?` · ${r._step_name}`:''}
                          </span>
                        </td>

                        {/* Item / Request */}
                        <td style={{ padding:'9px 12px', maxWidth:180 }}>
                          <div className="mdm-name"
                            style={{ fontWeight:600, color:'#e2e8f0', fontSize:11,
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                              transition:'color .12s', maxWidth:170 }}>
                            {det.label||`#${r.entity_id}`}
                          </div>
                          {det.request_id && (
                            <div style={{ fontSize:8, color:'#4b5563', fontFamily:'monospace', marginTop:1 }}>
                              {det.request_id}
                            </div>
                          )}
                        </td>

                        {/* Company */}
                        <td style={{ padding:'9px 12px' }}>
                          {det.company_name
                            ? <span style={{ color:'#94a3b8', fontSize:10, display:'flex', alignItems:'center', gap:3, whiteSpace:'nowrap' }}>
                                <Building2 size={9} color="#6b7280"/>{det.company_name}
                              </span>
                            : <span style={{ color:'#2e3349' }}>—</span>}
                        </td>

                        {/* Dept */}
                        <td style={{ padding:'9px 12px' }}>
                          {det.dept_name
                            ? <span style={{ color:'#94a3b8', fontSize:10, display:'flex', alignItems:'center', gap:3, whiteSpace:'nowrap' }}>
                                <Layers size={9} color="#6b7280"/>{det.dept_name}
                              </span>
                            : <span style={{ color:'#2e3349' }}>—</span>}
                        </td>

                        {/* Req Date */}
                        <td style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>
                          {det.required_date
                            ? <span style={{ color:'#a78bfa', fontSize:10, display:'flex', alignItems:'center', gap:3, fontWeight:600 }}>
                                <Calendar size={9} color="#a78bfa"/>{det.required_date}
                              </span>
                            : <span style={{ color:'#2e3349' }}>—</span>}
                        </td>

                        {/* Status */}
                        <td style={{ padding:'9px 12px' }}><StatusBadge status={r.status} sm/></td>

                        {/* Submitted */}
                        <td style={{ padding:'9px 12px', color:'#6b7280', fontSize:10, whiteSpace:'nowrap' }}>
                          {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}
                        </td>

                        {/* Active */}
                        <td style={{ padding:'9px 12px' }}>
                          {det.is_active===undefined ? <span style={{ color:'#2e3349' }}>—</span>
                            : det.is_active
                              ? <span style={{ color:'#34d399', fontSize:9, fontWeight:700 }}>● Active</span>
                              : <span style={{ color:'#f87171', fontSize:9, fontWeight:700 }}>● Inactive</span>}
                        </td>

                        {/* Actions */}
                        <td style={{ padding:'9px 12px' }} onClick={e=>e.stopPropagation()}>
                          <div style={{ display:'flex', gap:4, flexWrap:'nowrap' }}>
                            <button onClick={()=>setSelected(r)}
                              style={{ background:'#1e2d4a', border:'1px solid #4f8ef733', color:'#4f8ef7',
                                borderRadius:5, padding:'3px 9px', cursor:'pointer', fontSize:9,
                                fontWeight:600, display:'flex', alignItems:'center', gap:3 }}>
                              <Eye size={9}/> View
                            </button>
                            {canAct && (
                              <>
                                {/* Start Mapping button — approve point*/}
                                <button onClick={()=>openAction(r,'START_MAPPING')}
                                  style={{ background:'linear-gradient(135deg,#4c1d95,#3730a3)', border:'1px solid #7c3aed55', color:'#c4b5fd',
                                    borderRadius:5, padding:'3px 8px', cursor:'pointer', fontSize:9, fontWeight:700,
                                    display:'flex', alignItems:'center', gap:2 }}>
                                  <CheckCircle size={9}/> Map
                                </button>
                                <button onClick={()=>openAction(r,'REJECT')}
                                  style={{ background:'#2e1515', border:'1px solid #f8717133', color:'#f87171',
                                    borderRadius:5, padding:'3px 8px', cursor:'pointer', fontSize:9, fontWeight:700 }}>
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
              <div style={{ marginTop:8, padding:'6px 12px', background:'#21253a',
                borderRadius:7, border:'1px solid #2e3349', display:'flex',
                justifyContent:'space-between', alignItems:'center', fontSize:10 }}>
                <span style={{ color:'#6b7280' }}>
                  Showing <b style={{ color:'#94a3b8' }}>{filtered.length}</b> of <b style={{ color:'#94a3b8' }}>{requests.length}</b> requests
                </span>
                {hasAnyFilter && (
                  <button onClick={clearFilters}
                    style={{ background:'none', border:'none', color:'#4f8ef7', cursor:'pointer',
                      fontSize:10, fontWeight:700, display:'flex', alignItems:'center', gap:3 }}>
                    <X size={9}/> Clear filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer/>
    </div>
  );
};

// ─── sub-components ───────────────────────────────────────────────────────────
const SidebarItem = ({ label, count, active, onClick, color, icon }) => (
  <button onClick={onClick}
    style={{ width:'100%', display:'flex', alignItems:'center', gap:6, padding:'7px 10px',
      border:'none', borderBottom:'1px solid #2e334922', background:active?`${color}22`:'transparent',
      cursor:'pointer', textAlign:'left', color:active?color:'#94a3b8',
      borderLeft:`2px solid ${active?color:'transparent'}`, transition:'all .12s' }}>
    <span style={{ fontSize:11, flexShrink:0 }}>{icon}</span>
    <span style={{ flex:1, fontSize:10, fontWeight:active?700:400,
      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
    <span style={{ fontSize:9, fontWeight:700, color:active?color:'#6b7280',
      background:active?`${color}22`:'#21253a', border:`1px solid ${active?color+'44':'#2e3349'}`,
      borderRadius:10, padding:'0 5px', flexShrink:0 }}>{count}</span>
  </button>
);

const Header = ({ userId, unreadCount, showNotif, setShowNotif, onRefresh, loading, notifRef }) => (
  <div>
    <div style={{ background:'linear-gradient(to right,#374151,#60a5fa)',
      padding:'0 10px', height:24, display:'flex', alignItems:'center',
      justifyContent:'space-between', flexShrink:0 }}>
      <span style={{ fontSize:11, fontWeight:600, color:'#fff' }}>📋 MDM My Requests</span>
      <div style={{ display:'flex', gap:6, alignItems:'center', position:'relative' }} ref={notifRef}>
        {/* Bell */}
        <button onClick={()=>setShowNotif(p=>!p)}
          style={{ position:'relative', background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.25)',
            color:'#fff', borderRadius:5, padding:'2px 8px', cursor:'pointer', display:'none', alignItems:'center', gap:3, fontSize:10 }}>
          <Bell size={11}/>
          {unreadCount>0 && (
            <span style={{ position:'absolute', top:-4, right:-4, background:'#ef4444', color:'#fff',
              borderRadius:10, padding:'0 4px', fontSize:8, fontWeight:700, lineHeight:'14px' }}>
              {unreadCount>9?'9+':unreadCount}
            </span>
          )}
        </button>
        {showNotif && userId && <div style={{ display:'none' }}><NotifPanel userId={userId} onClose={()=>setShowNotif(false)}/></div>}
        {/* Refresh */}
        <button onClick={onRefresh}
          style={{ background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.25)',
            color:'#fff', borderRadius:5, padding:'2px 10px', cursor:'pointer',
            fontSize:10, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
          <RefreshCw size={9} style={{ animation:loading?'mdmSpin 1s linear infinite':'none' }}/>
          {loading?'Loading…':'Refresh'}
        </button>
      </div>
    </div>
    <div style={{ height:3, background:'linear-gradient(to right,#60a5fa,#374151)' }}/>
  </div>
);

const Footer = () => (
  <div style={{ height:8, background:'linear-gradient(to right,#60a5fa,#374151)', flexShrink:0 }}/>
);

export default MdmMyReq;