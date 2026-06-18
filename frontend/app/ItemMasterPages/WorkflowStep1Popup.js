/**
 * WorkflowStep1Popup.js
 *
 * Standalone popup that opens the WorkflowAdmin builder for a specific template,
 * but shows ONLY Step 1.
 *
 * Props:
 *   tmpl     — full template object (from WorkflowDashboard templates list)
 *   onClose  — called when the popup is closed / saved
 *
 * Features preserved from WorkflowAdmin (zero other changes):
 *   ✅ FROM + TO approver rows (full layout)
 *   ✅ Add Rule button (Step 1 only — no flow-picker since there are no prev steps)
 *   ✅ Item Code Creation auto-fill (stepName auto-set to template name, entity_page pre-wired)
 *   ✅ Save / Update via same API calls as WorkflowAdmin
 *   ✅ Dark palette identical to WorkflowAdmin
 */

import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:8000/api";

// ── Dark palette (identical to WorkflowAdmin) ─────────────────────────────────
const C = {
  bg: "#0f1117", surface: "#1a1d27", card: "#21253a", border: "#2e3349",
  accent: "#4f8ef7", accentSoft: "#1e2d4a",
  green: "#34d399", greenSoft: "#0d2e22",
  red: "#f87171",   redSoft:   "#2e1515",
  yellow: "#fbbf24", yellowSoft: "#2d2007",
  purple: "#a78bfa", purpleSoft: "#1e1a2e",
  orange: "#fb923c", orangeSoft: "#2d1a0a",
  teal: "#2dd4bf",   tealSoft:   "#0d2e2a",
  muted: "#6b7280",  text: "#e2e8f0",  textDim: "#94a3b8",
};
const STEP_COLOR = "#4f8ef7"; // Step 1 always blue

// ── Micro-components ──────────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{ width:14, height:14, borderRadius:"50%", border:`2px solid ${C.border}`, borderTopColor:C.accent, animation:"spin 0.7s linear infinite", display:"inline-block" }} />
);
const Sel = ({ value, onChange, children, small = false }) => (
  <select value={value} onChange={onChange} style={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, borderRadius:5, padding:small ? "3px 5px" : "4px 7px", fontSize:small ? 10 : 11, width:"100%", outline:"none" }}>
    {children}
  </select>
);
const Inp = ({ value, onChange, placeholder, readOnly = false, mono = false, small = false }) => (
  <input value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
    style={{ background:readOnly ? C.surface : C.card, border:`1px solid ${C.border}`, color:readOnly ? C.textDim : C.text, borderRadius:5, padding:small ? "3px 6px" : "4px 8px", fontSize:small ? 10 : 11, width:"100%", outline:"none", boxSizing:"border-box", fontFamily:mono ? "monospace" : "inherit" }} />
);
const Btn = ({ onClick, children, color=C.accent, disabled=false, sm=false }) => (
  <button onClick={onClick} disabled={disabled} style={{ background:disabled ? C.border : color+"22", border:`1px solid ${disabled ? C.border : color+"55"}`, color:disabled ? C.muted : color, borderRadius:6, padding:sm ? "2px 8px" : "5px 12px", fontSize:sm ? 9 : 10, fontWeight:600, cursor:disabled ? "not-allowed" : "pointer", display:"inline-flex", alignItems:"center", gap:4 }}>
    {children}
  </button>
);
const Lbl = ({ text, children }) => (
  <div>
    <div style={{ fontSize:8, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>{text}</div>
    {children}
  </div>
);

async function apiFetch(url, opts = {}) {
  const r = await fetch(url, opts);
  const j = await r.json();
  if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
  return j;
}

// ── Shape helpers ─────────────────────────────────────────────────────────────
const newAprRow = (defComp = "") => ({
  _id: Date.now()+Math.random(), aprId: null,
  srcCompId: defComp, srcDeptId: "",
  compId: defComp, roleId: "", deptId: "", desgId: "", userId: "",
  isActive: true,
});

const buildAprPayload = (a) => ({
  role_id:            a.roleId    ? parseInt(a.roleId)    : null,
  department_id:      a.deptId    ? parseInt(a.deptId)    : null,
  designation_id:     a.desgId    ? parseInt(a.desgId)    : null,
  company_id:         a.compId    ? parseInt(a.compId)    : null,
  user_id:            a.userId    ? parseInt(a.userId)    : null,
  from_company_id:    a.srcCompId ? parseInt(a.srcCompId) : null,
  from_department_id: a.srcDeptId ? parseInt(a.srcDeptId) : null,
  is_active:          a.isActive !== false,
});

// ═════════════════════════════════════════════════════════════════════════════
export default function WorkflowStep1Popup({ tmpl, onClose }) {

  const [companies, setCompanies] = useState([]);
  const [rbac,      setRbac]      = useState({});
  const [allUsers,  setAllUsers]  = useState([]);
  const [step1,     setStep1]     = useState(null);   // single step object
  const [templateMeta, setTemplateMeta] = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);
  const [pageAccessMap, setPageAccessMap] = useState({});

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  // ── Load supporting data + build step1 state from tmpl ────────────────────
  const load = useCallback(async () => {
    try {
      const [comps, usersResp] = await Promise.all([
        apiFetch(`${API}/user-dept-access/companies`),
        apiFetch(`${API}/users-with-accesses`).catch(() => []),
      ]);
      const cl = Array.isArray(comps) ? comps : [];
      setCompanies(cl);
      setAllUsers(Array.isArray(usersResp) ? usersResp : []);

      const r = {};
      await Promise.all(cl.map(async c => {
        try {
          const d = await apiFetch(`${API}/companies/${c.id}/rbac-options`);
          r[c.id] = { roles: d.roles||[], departments: d.departments||[], designations: d.designations||[] };
        } catch { r[c.id] = { roles:[], departments:[], designations:[] }; }
      }));
      setRbac(r);
    } catch(e) { showToast(e.message, false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build step1 state whenever tmpl changes
  useEffect(() => {
    if (!tmpl) return;
    const sortedSteps = (tmpl.steps || []).sort((a,b) => a.step_order - b.step_order);
    const s = sortedSteps[0]; // Step 1 only

    setTemplateMeta({
      templateId: tmpl.id,
      companyId:  tmpl.company_id || null,
      name:       tmpl.name,
      code:       tmpl.code,
      entityPage: tmpl.entity_page || "item-code-creation-req",
      isActive:   tmpl.is_active,
    });

    if (s) {
      // Existing step 1
      setStep1({
        _id:             s.id,
        stepId:          s.id,
        stepOrder:       1,
        stepName:        s.step_name,
        stepDescription: s.step_description || "",
        approvalType:    s.approval_type || "ANY",
        slaHours:        s.sla_hours || 0,
        condField:       s.condition_field || "",
        condOp:          s.condition_op || "eq",
        condValue:       s.condition_value || "",
        approvers: (s.approvers || []).map(a => ({
          _id:       a.id, aprId: a.id,
          srcCompId: String(a.from_company_id    || ""),
          srcDeptId: String(a.from_department_id || ""),
          compId:    String(a.company_id    || ""),
          roleId:    String(a.role_id       || ""),
          deptId:    String(a.department_id || ""),
          desgId:    String(a.designation_id|| ""),
          userId:    String(a.user_id       || ""),
          isActive:  a.is_active !== false,
        })),
      });
    } else {
      // No steps yet — create a blank Step 1 pre-filled for item code creation
      setStep1({
        _id:             "new-step1",
        stepId:          null,
        stepOrder:       1,
        stepName:        `${tmpl.name} — Review`,  // Auto-filled
        stepDescription: "Item Code Creation Request — Step 1 Review",
        approvalType:    "ANY",
        slaHours:        0,
        condField:       "",
        condOp:          "eq",
        condValue:       "",
        approvers:       [],
      });
    }
  }, [tmpl]);

  // ── Step 1 state helpers ──────────────────────────────────────────────────
  const updStep = (f, v) => setStep1(s => ({ ...s, [f]: v }));
  const addApr  = () => setStep1(s => ({ ...s, approvers: [...s.approvers, newAprRow(String(templateMeta?.companyId||""))] }));
  const updApr  = (aId, f, v) => setStep1(s => ({ ...s, approvers: s.approvers.map(a => a._id===aId ? {...a,[f]:v} : a) }));
  const rmApr   = (aId, aprId) => {
    if (aprId) {
      apiFetch(`${API}/workflow/approvers/${aprId}`, { method:"DELETE" })
        .then(() => { setStep1(s => ({ ...s, approvers: s.approvers.filter(a => a._id!==aId) })); showToast("Rule removed ✓"); })
        .catch(e => showToast(e.message, false));
    } else {
      setStep1(s => ({ ...s, approvers: s.approvers.filter(a => a._id!==aId) }));
    }
  };

  // ── RBAC helpers ──────────────────────────────────────────────────────────
  const allRbac = (() => {
    const rs={}, ds={}, gs={};
    Object.values(rbac).forEach(v => {
      v.roles.forEach(x => { rs[x.id]=x; });
      v.departments.forEach(x => { ds[x.id]=x; });
      v.designations.forEach(x => { gs[x.id]=x; });
    });
    return { roles:Object.values(rs), departments:Object.values(ds), designations:Object.values(gs) };
  })();

  const getRbac = (compId) => {
    if (compId) { const v = rbac[compId] || rbac[parseInt(compId)]; if (v) return v; }
    if (templateMeta?.companyId) { const v = rbac[templateMeta.companyId] || rbac[parseInt(templateMeta.companyId)]; if (v) return v; }
    return allRbac;
  };

  // ── Page access checker (Step 1 → "My Requests") ─────────────────────────
  const checkPageAccess = async (apr) => {
    if (!apr.compId || !apr.roleId || !apr.deptId || !apr.desgId) return;
    const key = `${apr._id}`;
    setPageAccessMap(prev => ({ ...prev, [key]: { loading: true } }));
    try {
      const data = await apiFetch(
        `${API}/rbac/access-by-role?company_id=${apr.compId}&role_id=${apr.roleId}&department_id=${apr.deptId}&designation_id=${apr.desgId}`
      );
      const pages = Array.isArray(data) ? data : [];
      const match = pages.find(p =>
        (p.page_url && (p.page_url === "workflow-my-requests" || p.page_url.endsWith("workflow-my-requests"))) ||
        (p.page_name && p.page_name.toLowerCase() === "my requests")
      );
      setPageAccessMap(prev => ({ ...prev, [key]: { loading: false, hasAccess: !!match, pageName: "My Requests", matchedPage: match } }));
    } catch {
      setPageAccessMap(prev => ({ ...prev, [key]: { loading: false, hasAccess: null } }));
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!step1 || !templateMeta) return;
    if (!step1.stepName.trim()) { showToast("Step name required", false); return; }
    setSaving(true);
    try {
      let userId = null;
      try { userId = JSON.parse(sessionStorage.getItem("userData")||"{}")?.user?.id || null; } catch {}

      if (step1.stepId) {
        // Update existing step
        await apiFetch(`${API}/workflow/steps/${step1.stepId}`, {
          method:"PUT", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            step_order:       1,
            step_name:        step1.stepName.trim(),
            step_description: step1.stepDescription?.trim() || null,
            approval_type:    step1.approvalType,
            sla_hours:        parseInt(step1.slaHours) || 0,
            condition_field:  step1.condField || null,
            condition_op:     step1.condOp || "eq",
            condition_value:  step1.condValue || null,
          }),
        });
        // New approvers
        for (const a of step1.approvers.filter(a => !a.aprId)) {
          await apiFetch(`${API}/workflow/steps/${step1.stepId}/approvers/`, {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify(buildAprPayload(a)),
          });
        }
        // Updated approvers
        for (const a of step1.approvers.filter(a => a.aprId)) {
          await apiFetch(`${API}/workflow/approvers/${a.aprId}`, {
            method:"PUT", headers:{"Content-Type":"application/json"},
            body: JSON.stringify(buildAprPayload(a)),
          });
        }
      } else {
        // Create new step 1 on the template
        await apiFetch(`${API}/workflow/templates/${templateMeta.templateId}/steps/`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            step_order:       1,
            step_name:        step1.stepName.trim(),
            step_description: step1.stepDescription?.trim() || null,
            approval_type:    step1.approvalType,
            sla_hours:        parseInt(step1.slaHours) || 0,
            condition_field:  step1.condField || null,
            condition_op:     step1.condOp || "eq",
            condition_value:  step1.condValue || null,
            approvers:        step1.approvers.map(buildAprPayload),
          }),
        });
      }

      showToast("Step 1 saved ✓");
      setTimeout(() => onClose(true), 900); // true = refresh dashboard
    } catch(e) { showToast(e.message, false); }
    finally { setSaving(false); }
  };

  if (!tmpl || !step1) return null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9100, background:"rgba(0,0,0,0.72)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:${C.surface}; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:10px; }
        select option { background:${C.card}; color:${C.text}; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:9999, padding:"12px 24px", borderRadius:8, background:toast.ok?C.greenSoft:C.redSoft, color:toast.ok?C.green:C.red, border:`1px solid ${toast.ok?C.green:C.red}44`, fontSize:12, fontWeight:600, boxShadow:"0 8px 32px #0009", pointerEvents:"none" }}>
          {toast.msg}
        </div>
      )}

      {/* Modal box */}
      <div style={{ background:"#131929", border:`1.5px solid ${C.accent}33`, borderRadius:14, width:"100%", maxWidth:780, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden", animation:"fadeInUp 0.2s ease", boxShadow:"0 24px 80px rgba(0,0,0,0.7)", fontFamily:"'DM Sans','Segoe UI',sans-serif", color:C.text }}>

        {/* Header */}
        <div style={{ height:32, padding:"0 14px", background:"linear-gradient(to right, #374151, #60a5fa)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:14 }}>⚙️</span>
            <span style={{ fontSize:12, fontWeight:700, color:"#fff" }}>Step 1 — {tmpl.name}</span>
            <span style={{ fontSize:9, color:"#e2e8f0aa", fontFamily:"monospace" }}>{tmpl.code}</span>
          </div>
          <button onClick={() => onClose(false)} style={{ background:"none", border:"none", color:"#fff", cursor:"pointer", fontSize:16, lineHeight:1, padding:0 }}>✕</button>
        </div>

        {/* Info banner */}
        <div style={{ background:C.tealSoft, borderBottom:`1px solid ${C.teal}33`, padding:"5px 14px", fontSize:8, color:C.teal, lineHeight:1.6, flexShrink:0 }}>
          <b>💡 How routing works:</b>&nbsp;
          <b style={{color:C.yellow}}>📥 FROM</b> = which company+dept triggers this rule (blank = any) →
          <b style={{color:C.accent}}> ✅ TO</b> = who approves. This popup manages <b>Step 1 only</b>.
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 20px" }}>

          {/* Step 1 header card */}
          <div style={{ border:`1.5px solid ${STEP_COLOR}33`, borderRadius:10, overflow:"hidden", background:C.card, marginBottom:12 }}>

            {/* Step header row */}
            <div style={{ background:`linear-gradient(to right,${STEP_COLOR}22,${STEP_COLOR}11)`, borderBottom:`1px solid ${STEP_COLOR}33`, padding:"7px 10px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:20, height:20, borderRadius:"50%", background:STEP_COLOR, color:"#fff", fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>1</div>
                <span style={{ fontSize:11, fontWeight:800, color:STEP_COLOR, flexShrink:0 }}>Step 1 —</span>
                <input
                  value={step1.stepName}
                  onChange={e => {
                    let v = e.target.value.replace(/  +/g," ");
                    v = v.replace(/(^|\s)([a-z])/g,(m,sp,ch)=>sp+ch.toUpperCase());
                    updStep("stepName", v);
                  }}
                  placeholder="Enter step name…"
                  style={{ flex:1, background:"transparent", border:"none", color:C.text, fontSize:11, fontWeight:700, outline:"none" }}
                />
                {/* ANY / ALL toggle */}
                <div style={{ display:"flex", borderRadius:5, overflow:"hidden", border:`1px solid ${C.border}`, flexShrink:0 }}>
                  {["ANY","ALL"].map(t => (
                    <button key={t} onClick={()=>updStep("approvalType",t)} style={{ padding:"3px 8px", fontSize:9, fontWeight:700, border:"none", background:step1.approvalType===t?STEP_COLOR:"transparent", color:step1.approvalType===t?"#fff":C.muted, cursor:"pointer" }}>{t}</button>
                  ))}
                </div>
                {/* SLA */}
                <div style={{ display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
                  <span style={{ fontSize:8, color:C.muted }}>SLA</span>
                  <input type="number" min={0} value={step1.slaHours} onChange={e=>updStep("slaHours",e.target.value)} style={{ width:42, background:C.surface, border:`1px solid ${C.border}`, color:C.text, borderRadius:4, padding:"2px 4px", fontSize:9, textAlign:"center" }} />
                  <span style={{ fontSize:8, color:C.muted }}>hrs</span>
                </div>
              </div>
              {/* Description */}
              <div style={{ display:"flex", alignItems:"center", gap:5, paddingLeft:27, marginTop:4 }}>
                <span style={{ fontSize:8, color:C.muted, flexShrink:0, textTransform:"uppercase", letterSpacing:0.4 }}>Desc:</span>
                <input value={step1.stepDescription||""} onChange={e=>{let v=e.target.value.replace(/  +/g," ");v=v.replace(/(^|\s)([a-z])/g,(m,sp,ch)=>sp+ch.toUpperCase());updStep("stepDescription",v);}} placeholder="Optional step description…" style={{ flex:1, background:"transparent", border:"none", borderBottom:`1px dashed ${C.border}`, color:C.textDim, fontSize:9, outline:"none", paddingBottom:1 }} />
              </div>
            </div>

            {/* Approver rules section */}
            <div style={{ padding:"8px 10px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <div>
                  <span style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.7 }}>👥 Routing Rules</span>
                  <span style={{ marginLeft:7, fontSize:9, color:STEP_COLOR }}>{step1.approvalType==="ANY"?"Any one approves — will proceed":"Everyone must approve"}</span>
                </div>
                {/* Add Rule — direct (no flow picker for Step 1) */}
                <Btn onClick={addApr} color={C.purple} sm>＋ Add Rule</Btn>
              </div>

              {step1.approvers.length === 0 ? (
                <div style={{ padding:"12px", background:C.surface, borderRadius:7, fontSize:10, color:C.muted, textAlign:"center", border:`1px dashed ${C.border}` }}>
                  No rules yet — click "Add Rule" to add an approver routing rule
                </div>
              ) : (
                <>
                  {step1.approvers.map((apr, aprIdx) => {
                    const srcR = getRbac(apr.srcCompId);
                    const toR  = getRbac(apr.compId);
                    const active = apr.isActive !== false;
                    const userSelected      = !!apr.userId;
                    const rbacFieldSelected = !!(apr.compId || apr.roleId || apr.deptId || apr.desgId);
                    const accessInfo = pageAccessMap[`${apr._id}`];

                    return (
                      <div key={apr._id} style={{ marginBottom:8, opacity: active ? 1 : 0.45 }}>
                        {/* Rule header */}
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <div style={{ width:15, height:15, borderRadius:"50%", background:STEP_COLOR+"33", border:`1px solid ${STEP_COLOR}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:800, color:STEP_COLOR }}>{aprIdx+1}</div>
                            <span style={{ fontSize:8, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.4 }}>Rule {aprIdx+1}</span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <button onClick={()=>updApr(apr._id,"isActive",!active)} style={{ padding:"1px 7px", borderRadius:20, fontSize:8, fontWeight:700, cursor:"pointer", border:"none", background:active?C.greenSoft:C.redSoft, color:active?C.green:C.red }}>
                              {active ? "● On" : "○ Off"}
                            </button>
                            <button onClick={()=>rmApr(apr._id, apr.aprId)} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:12, padding:0 }} title="Remove rule">✕</button>
                          </div>
                        </div>

                        {/* FROM section */}
                        <div style={{ background:C.yellowSoft+"88", border:`1px solid ${C.yellow}33`, borderRadius:6, padding:"5px 8px", marginBottom:3 }}>
                          <div style={{ fontSize:9, fontWeight:800, color:C.yellow, marginBottom:4, display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                            <span style={{ background:C.yellowSoft, border:`1px solid ${C.yellow}44`, borderRadius:4, padding:"2px 8px", fontSize:8, fontWeight:800, textTransform:"uppercase", letterSpacing:0.5 }}>📥 FROM</span>
                            <span style={{ fontSize:9, color:C.muted, fontWeight:400 }}>From which company / dept did the request come? <b style={{color:C.yellow}}>(blank = applies to all)</b></span>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
                            <Lbl text="Company">
                              <Sel value={apr.srcCompId} onChange={e=>updApr(apr._id,"srcCompId",e.target.value)} small>
                                <option value="">Any company</option>
                                {companies.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
                              </Sel>
                            </Lbl>
                            <Lbl text="Department">
                              <Sel value={apr.srcDeptId} onChange={e=>updApr(apr._id,"srcDeptId",e.target.value)} small>
                                <option value="">Any department</option>
                                {srcR.departments.map(d=><option key={d.id} value={d.id}>{d.department_name}</option>)}
                              </Sel>
                            </Lbl>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div style={{ textAlign:"center", fontSize:12, color:C.muted, margin:"2px 0" }}>↓</div>

                        {/* TO section */}
                        <div style={{ background:C.accentSoft+"88", border:`1px solid ${C.accent}33`, borderRadius:6, padding:"5px 8px" }}>
                          <div style={{ fontSize:9, fontWeight:800, color:C.accent, marginBottom:4, display:"flex", alignItems:"center", gap:5 }}>
                            <span style={{ background:C.accentSoft, border:`1px solid ${C.accent}44`, borderRadius:4, padding:"2px 8px", fontSize:8, fontWeight:800, textTransform:"uppercase", letterSpacing:0.5 }}>✅ TO</span>
                            <span style={{ fontSize:9, color:C.muted, fontWeight:400 }}>Who should approve? <b style={{color:C.accent}}>(blank = wildcard)</b></span>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:4 }}>
                            <Lbl text="Company">
                              <Sel value={apr.compId} onChange={e=>{ updApr(apr._id,"compId",e.target.value); setPageAccessMap(p=>({...p,[`${apr._id}`]:undefined})); }} small disabled={userSelected}>
                                <option value="">Any company</option>
                                {companies.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
                              </Sel>
                            </Lbl>
                            <Lbl text="Role">
                              <Sel value={apr.roleId} onChange={e=>{ updApr(apr._id,"roleId",e.target.value); setPageAccessMap(p=>({...p,[`${apr._id}`]:undefined})); }} small disabled={userSelected}>
                                <option value="">Any role</option>
                                {getRbac(apr.compId).roles.map(r=><option key={r.id} value={r.id}>{r.role_name}</option>)}
                              </Sel>
                            </Lbl>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
                            <Lbl text="Department">
                              <Sel value={apr.deptId} onChange={e=>{ updApr(apr._id,"deptId",e.target.value); setPageAccessMap(p=>({...p,[`${apr._id}`]:undefined})); }} small disabled={userSelected}>
                                <option value="">Any department</option>
                                {getRbac(apr.compId).departments.map(d=><option key={d.id} value={d.id}>{d.department_name}</option>)}
                              </Sel>
                            </Lbl>
                            <Lbl text="Designation">
                              <Sel value={apr.desgId} onChange={e=>{ updApr(apr._id,"desgId",e.target.value); setPageAccessMap(p=>({...p,[`${apr._id}`]:undefined})); }} small disabled={userSelected}>
                                <option value="">Any designation</option>
                                {getRbac(apr.compId).designations.map(d=><option key={d.id} value={d.id}>{d.designation_name}</option>)}
                              </Sel>
                            </Lbl>
                          </div>

                          {/* Page access check button */}
                          {apr.compId && apr.roleId && apr.deptId && apr.desgId && (
                            <div style={{ marginTop:5 }}>
                              {!accessInfo ? (
                                <button onClick={()=>checkPageAccess(apr)} style={{ background:C.tealSoft, border:`1px solid ${C.teal}44`, color:C.teal, borderRadius:4, padding:"2px 8px", fontSize:8, cursor:"pointer", fontWeight:600 }}>
                                  🔍 Check "My Requests" page access
                                </button>
                              ) : accessInfo.loading ? (
                                <div style={{ fontSize:8, color:C.muted, display:"flex", alignItems:"center", gap:5 }}><Spinner /> Checking access…</div>
                              ) : accessInfo.hasAccess ? (
                                <div style={{ padding:"4px 8px", borderRadius:5, background:C.greenSoft, border:`1px solid ${C.green}44`, fontSize:9, color:C.green, display:"flex", alignItems:"center", gap:5 }}>
                                  <span>✅</span>
                                  <div><b>Access granted</b> — approver has access to <b>"My Requests"</b></div>
                                  <button onClick={()=>checkPageAccess(apr)} style={{ marginLeft:"auto", background:"none", border:`1px solid ${C.green}44`, color:C.green, borderRadius:3, padding:"1px 6px", fontSize:7, cursor:"pointer" }}>↻</button>
                                </div>
                              ) : (
                                <div style={{ padding:"4px 8px", borderRadius:5, background:C.redSoft, border:`1px solid ${C.red}44`, fontSize:9, color:C.red, display:"flex", alignItems:"center", gap:5 }}>
                                  <span>🚫</span>
                                  <div><b>No access</b> — go to Role Access page to grant "My Requests" first</div>
                                  <button onClick={()=>checkPageAccess(apr)} style={{ marginLeft:"auto", background:"none", border:`1px solid ${C.red}44`, color:C.red, borderRadius:3, padding:"1px 6px", fontSize:7, cursor:"pointer" }}>↻</button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Specific user (only when no RBAC field filled) */}
                          {!rbacFieldSelected && (
                            <div style={{ marginTop:6 }}>
                              {!userSelected && <div style={{ fontSize:8, color:C.muted, marginBottom:4, borderTop:`1px dashed ${C.border}`, paddingTop:6 }}>— OR select a specific user instead —</div>}
                              <Lbl text="Specific User (optional)">
                                <Sel value={apr.userId||""} onChange={e=>updApr(apr._id,"userId",e.target.value)} small>
                                  <option value="">— No specific user —</option>
                                  {(allUsers||[]).map(u => {
                                    const seen = new Set();
                                    const uniq = (u.accesses||[]).filter(a => {
                                      const k = `${a.company?.company_name||""}|${a.department?.department_name||""}|${a.role?.role_name||""}`;
                                      if (seen.has(k)) return false; seen.add(k); return true;
                                    });
                                    const line = uniq.map(a=>[a.company?.company_name, a.department?.department_name, a.role?.role_name].filter(Boolean).join(" · ")).filter(Boolean).join(" | ");
                                    return <option key={u.id} value={u.id}>{`${u.full_name||u.email||`User#${u.id}`}${line?` — ${line}`:""}`}</option>;
                                  })}
                                </Sel>
                              </Lbl>
                              {apr.userId && (() => {
                                const selUser = (allUsers||[]).find(u => String(u.id)===String(apr.userId));
                                if (!selUser) return null;
                                return (
                                  <div style={{ marginTop:4, display:"flex", flexWrap:"wrap", gap:3 }}>
                                    <span style={{ fontSize:8, color:C.green, fontWeight:600 }}>👤 {selUser.full_name}</span>
                                    {selUser.email && <span style={{ fontSize:8, color:C.muted }}>· {selUser.email}</span>}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ fontSize:8, color:C.muted, marginTop:3 }}>
                    💡 Blank = wildcard (matches any) &nbsp;|&nbsp; Add more rules for multi-dept / multi-company routing
                  </div>
                </>
              )}

              {/* What happens */}
              <div style={{ background:C.surface, borderRadius:5, padding:"4px 8px", marginTop:8, fontSize:8, color:C.textDim, display:"flex", gap:10, flexWrap:"wrap" }}>
                <span>✅ <b style={{color:C.green}}>Approve</b> → Move to Step 2</span>
                <span>❌ <b style={{color:C.red}}>Reject</b> → REJECTED</span>
                <span>↩ <b style={{color:C.yellow}}>Return</b> → Back to submitter</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding:"8px 14px", borderTop:`1px solid ${C.border}`, background:C.surface, display:"flex", justifyContent:"flex-end", gap:8, flexShrink:0 }}>
          <Btn onClick={() => onClose(false)} color={C.muted}>Cancel</Btn>
          <Btn onClick={handleSave} color={C.green} disabled={saving}>
            {saving ? <><Spinner/>Saving…</> : step1.stepId ? "💾 Update Step 1" : "🚀 Save Step 1"}
          </Btn>
        </div>

        {/* Footer strip */}
        <div style={{ height:6, background:"linear-gradient(to right, #60a5fa, #374151)", flexShrink:0 }} />
      </div>
    </div>
  );
}