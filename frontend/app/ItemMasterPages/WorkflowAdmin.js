/**
 * WorkflowAdmin.js  –  ItemMasterPages/
 * ─────────────────────────────────────────────────────────────────
 * NEW ARCHITECTURE — Fully dynamic, unlimited routing rules
 *
 * KEY CHANGE: "Dept scope" label field removed from template level.
 * Instead, every approver row inside a Step now has TWO sections:
 *
 *   📥 FROM  — which Company + Department triggers this rule
 *              (blank = wildcard = any company / any dept)
 *
 *   ✅ TO    — which Company + Role + Dept + Desg sees/approves
 *              (blank = wildcard)
 *
 * This lets you define ANY combination:
 *   ✓ Elevent Global + Finance → Finance Executive approver
 *   ✓ Elevent Global + IT     → IT HOD approver
 *   ✓ Breeze Industries + Any → Specific role approver
 *   ✓ Any company + Any dept  → One global approver
 *   ✓ Multiple rows = multiple parallel approvers per step
 *
 * HOW RUNTIME MATCHING WORKS (backend _user_can_approve_step):
 *   The TO fields (company_id, role_id, department_id, designation_id)
 *   are saved as WorkflowStepApprover rows.
 *   At runtime, _user_can_approve_step matches these against the user's
 *   UserCompanyAccess. NULL = wildcard.
 *   The FROM fields are UI-only helpers that auto-fill the TO dept/company
 *   and are not saved separately — the TO dept IS the routing key.
 *
 * No backend changes needed.
 * All original logic preserved: save/update/delete/RBAC/page filter.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { adminworkflowlinks } from "../config/adminworkflowlinks.js";
import { getAccessiblePages } from "../utils/rbacCache";
import WorkflowMyRequests from "./WorkflowMyRequests";

const API = "http://localhost:8000/api";

// ── Dark palette (unchanged) ──────────────────────────────────────────────────
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
const STEP_COLORS = [C.accent, C.green, C.purple, C.orange, C.yellow, "#f472b6", "#22d3ee"];

// ── Micro-components (unchanged) ──────────────────────────────────────────────
const Badge = ({ children, color = C.accent, bg = C.accentSoft }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:600, color, background:bg, border:`1px solid ${color}22` }}>{children}</span>
);
const Spinner = () => (
  <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${C.border}`, borderTopColor:C.accent, animation:"spin 0.7s linear infinite", display:"inline-block" }} />
);
const EmptyState = ({ icon, msg }) => (
  <div style={{ padding:28, textAlign:"center", color:C.muted, fontSize:11 }}>
    <div style={{ fontSize:26, marginBottom:6 }}>{icon}</div>{msg}
  </div>
);
const SectionTitle = ({ children }) => (
  <div style={{ padding:"7px 12px", borderBottom:`1px solid ${C.border}`, fontSize:9, fontWeight:700, color:C.muted, letterSpacing:0.9, textTransform:"uppercase", flexShrink:0 }}>{children}</div>
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

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═════════════════════════════════════════════════════════════════════════════
export default function WorkflowAdmin() {

  const [userId, setUserId]      = useState(null);
  const [sessionReady, setReady] = useState(false);
  useEffect(() => {
    try { const d = JSON.parse(sessionStorage.getItem("userData")||"{}"); if (d?.user?.id) setUserId(d.user.id); } catch {}
    setReady(true);
  }, []);

  const [companies,  setCompanies] = useState([]);
  const [rbac,       setRbac]      = useState({});
  const [templates,  setTemplates] = useState([]);
  const [allUsers,   setAllUsers]  = useState([]);
  const [pages,      setPages]     = useState(null);
  const [toast,      setToast]     = useState(null);
  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3200); };

  const [selPage,  setSelPage]  = useState(null);
  const [selEntry, setSelEntry] = useState(null);
  const [builder,  setBuilder]  = useState(null);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    getAccessiblePages()
      .then(ps => {
        const paths = new Set(ps.map(p => p.page_url?.split("/").pop()).filter(Boolean));
        setPages(paths.size === 0 ? adminworkflowlinks : adminworkflowlinks.filter(pg => paths.has(pg.path)));
      })
      .catch(() => setPages(adminworkflowlinks));
  }, []);

  const reload = useCallback(async () => {
    if (!sessionReady) return;
    const compUrl = userId ? `${API}/user-dept-access/companies?current_user_id=${userId}` : `${API}/user-dept-access/companies`;
    try {
      const [comps, tmpls, usersResp] = await Promise.all([
        apiFetch(compUrl),
        apiFetch(`${API}/workflow/templates/`),
        apiFetch(`${API}/users-with-accesses`).catch(() => []),
      ]);
      const cl = Array.isArray(comps) ? comps : [];
      setCompanies(cl);
      setTemplates(Array.isArray(tmpls) ? tmpls : []);
      setAllUsers(Array.isArray(usersResp) ? usersResp : []);
      const r = {};
      await Promise.all(cl.map(async c => {
        try { const d = await apiFetch(`${API}/companies/${c.id}/rbac-options`); r[c.id] = { roles: d.roles||[], departments: d.departments||[], designations: d.designations||[] }; }
        catch { r[c.id] = { roles:[], departments:[], designations:[] }; }
      }));
      setRbac(r);
    } catch(e) { showToast(e.message, false); }
  }, [sessionReady, userId]);
  useEffect(() => { reload(); }, [reload]);

  const pageTmpls = useMemo(() => {
    if (!selPage) return [];
    const slug = selPage.path.toUpperCase().replace(/-/g, "_");
    return templates.filter(t => t.entity_page === selPage.path || t.code.includes(slug) || t.name.toLowerCase().includes(selPage.name.toLowerCase()));
  }, [selPage, templates]);

  const allRbac = useMemo(() => {
    const rs={}, ds={}, gs={};
    Object.values(rbac).forEach(v => {
      v.roles.forEach(x => { rs[x.id]=x; });
      v.departments.forEach(x => { ds[x.id]=x; });
      v.designations.forEach(x => { gs[x.id]=x; });
    });
    return { roles:Object.values(rs), departments:Object.values(ds), designations:Object.values(gs) };
  }, [rbac]);

  useEffect(() => { setSelEntry(null); setBuilder(null); }, [selPage]);

  // ── Builder helpers ──────────────────────────────────────────────────────────
  const uid = () => Math.random().toString(36).slice(2,6).toUpperCase();

  // NEW approver row shape:
  //   srcCompId / srcDeptId  → FROM: which request triggers this (UI helper, auto-fills TO)
  //   compId / roleId / deptId / desgId → TO: saved as WorkflowStepApprover
  const newAprRow = (defComp = "") => ({
    _id: Date.now()+Math.random(), aprId: null,
    srcCompId: defComp, srcDeptId: "",
    compId: defComp, roleId: "", deptId: "", desgId: "", userId: "",
    isActive: true,
  });

  const newStepRow = (order) => ({
    _id: Date.now()+Math.random(), stepId: null, stepOrder: order, stepName: "", stepDescription: "",
    approvalType: "ANY", slaHours: 0,
    condField: "", condOp: "eq", condValue: "",
    approvers: [],
  });

  const openNew = (company) => {
    const s  = selPage?.path.toUpperCase().replace(/-/g,"_").slice(0,12) || "WF";
    const cs = company ? company.company_name.replace(/\s/g,"").toUpperCase().slice(0,6) : "GLOBAL";
    setSelEntry({ kind:"new", company });
    setBuilder({
      templateId: null, companyId: company?.id||null,
      name: `${selPage?.name||"Workflow"} — ${company?.company_name||"Global"}`,
      code: `WF-${s}-${cs}-${uid()}`,
      description: `${selPage?.name||""} approval flow${company ? " for "+company.company_name : ""}`,
      isActive: true, steps: [newStepRow(1)],
    });
  };

  const openExisting = (tmpl) => {
    setSelEntry({ kind:"existing", tmpl });
    setBuilder({
      templateId: tmpl.id, companyId: tmpl.company_id||null,
      name: tmpl.name, code: tmpl.code, description: tmpl.description||"", isActive: tmpl.is_active,
      steps: (tmpl.steps||[]).sort((a,b)=>a.step_order-b.step_order).map(s => ({
        _id: s.id, stepId: s.id, stepOrder: s.step_order, stepName: s.step_name, stepDescription: s.step_description||"",
        approvalType: s.approval_type, slaHours: s.sla_hours||0,
        condField: s.condition_field||"", condOp: s.condition_op||"eq", condValue: s.condition_value||"",
        approvers: (s.approvers||[]).map(a => ({
          _id: a.id, aprId: a.id,
          srcCompId: String(a.from_company_id    || ""),
          srcDeptId: String(a.from_department_id || ""),
          compId:    String(a.company_id    || ""),
          roleId:    String(a.role_id       || ""),
          deptId:    String(a.department_id || ""),
          desgId:    String(a.designation_id|| ""),
          userId:    String(a.user_id       || ""),
          isActive:  a.is_active !== false,
        })),
      })),
    });
  };

  const upd     = (field, val) => setBuilder(b => ({ ...b, [field]: val }));
  const addStep = () => setBuilder(b => ({ ...b, steps: [...b.steps, newStepRow(b.steps.length+1)] }));
  const rmStep  = (id) => setBuilder(b => ({ ...b, steps: b.steps.filter(s=>s._id!==id).map((s,i)=>({...s,stepOrder:i+1})) }));
  const updStep = (id, f, v) => setBuilder(b => ({ ...b, steps: b.steps.map(s=>s._id===id?{...s,[f]:v}:s) }));

  const addApr = (stepId) => {
    setBuilder(b => ({ ...b, steps: b.steps.map(s => s._id===stepId
      ? { ...s, approvers: [...s.approvers, newAprRow(String(b.companyId||""))] }
      : s
    )}));
  };
  const updApr = (stepId, aId, f, v) => setBuilder(b => ({ ...b, steps: b.steps.map(s => s._id===stepId
    ? { ...s, approvers: s.approvers.map(a => a._id===aId ? {...a,[f]:v} : a) }
    : s
  )}));
  const rmApr = (stepId, aId) => setBuilder(b => ({ ...b, steps: b.steps.map(s => s._id===stepId
    ? { ...s, approvers: s.approvers.filter(a => a._id!==aId) }
    : s
  )}));

  const delTemplate = async (id) => {
    if (!window.confirm("Deactivate this template?")) return;
    try { await apiFetch(`${API}/workflow/templates/${id}`, {method:"DELETE"}); showToast("Template deactivated ✓"); setBuilder(null); setSelEntry(null); await reload(); }
    catch(e) { showToast(e.message, false); }
  };
  const delStep = async (localId, stepId) => {
    if (!stepId) { rmStep(localId); return; }
    if (!window.confirm("Delete this step?")) return;
    try { await apiFetch(`${API}/workflow/steps/${stepId}`, {method:"DELETE"}); showToast("Step deleted ✓"); rmStep(localId); await reload(); }
    catch(e) { showToast(e.message, false); }
  };
  const delApr = async (stepLocalId, aprLocalId, aprId) => {
    if (!aprId) { rmApr(stepLocalId, aprLocalId); return; }
    try { await apiFetch(`${API}/workflow/approvers/${aprId}`, {method:"DELETE"}); rmApr(stepLocalId, aprLocalId); showToast("Approver removed ✓"); }
    catch(e) { showToast(e.message, false); }
  };

  const addAprFromFlows = (stepId, rows) => {
    // Step 1 ka FROM → Step 2 FROM, Step 1 ka TO → Step 2 TO (both pre-filled)
    setBuilder(b => ({ ...b, steps: b.steps.map(s => s._id===stepId
      ? { ...s, approvers: [
          ...s.approvers,
          ...rows.map(r => ({
            _id: Date.now()+Math.random(), aprId: null,
            srcCompId: r.srcCompId||"",
            srcDeptId: r.srcDeptId||"",
            compId:    r.compId||"",
            roleId:    r.roleId||"",
            deptId:    r.deptId||"",
            desgId:    r.desgId||"",
            userId:    r.userId||"",
            isActive: true,
          }))
        ]}
      : s
    )}));
  };

  // Save: TO fields + FROM fields (srcCompId/srcDeptId) go to backend
  const buildAprPayload = (a) => ({
    role_id:             a.roleId    ? parseInt(a.roleId)    : null,
    department_id:       a.deptId    ? parseInt(a.deptId)    : null,
    designation_id:      a.desgId    ? parseInt(a.desgId)    : null,
    company_id:          a.compId    ? parseInt(a.compId)    : null,
    user_id:             a.userId    ? parseInt(a.userId)    : null,
    from_company_id:     a.srcCompId ? parseInt(a.srcCompId) : null,
    from_department_id:  a.srcDeptId ? parseInt(a.srcDeptId) : null,
    is_active:           a.isActive !== false,
  });

  const handleSave = async () => {
    if (!builder) return;
    if (!builder.name.trim()) { showToast("Template name required", false); return; }
    if (builder.steps.some(s => !s.stepName.trim())) { showToast("All steps need a name", false); return; }
    setSaving(true);
    try {
      const isEdit = !!builder.templateId;
      if (!isEdit) {
        await apiFetch(`${API}/workflow/templates/`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            code: builder.code.trim().toUpperCase(), name: builder.name.trim(),
            description: builder.description.trim(), company_id: builder.companyId||null,
            entity_page: selPage?.path||null, created_by: userId||null,
            steps: builder.steps.map(s => ({
              step_order: s.stepOrder, step_name: s.stepName.trim(),
              step_description: s.stepDescription?.trim()||null,
              approval_type: s.approvalType, sla_hours: parseInt(s.slaHours)||0,
              condition_field: s.condField||null, condition_op: s.condOp||"eq", condition_value: s.condValue||null,
              approvers: s.approvers.map(buildAprPayload),
            })),
          }),
        });
        showToast("Workflow created ✓");
      } else {
        await apiFetch(`${API}/workflow/templates/${builder.templateId}`, {
          method:"PUT", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ name: builder.name.trim(), description: builder.description.trim(), is_active: builder.isActive, entity_page: selPage?.path||null, updated_by: userId||null }),
        });
        for (const s of builder.steps) {
          if (s.stepId) {
            await apiFetch(`${API}/workflow/steps/${s.stepId}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ step_order:s.stepOrder, step_name:s.stepName.trim(), step_description:s.stepDescription?.trim()||null, approval_type:s.approvalType, sla_hours:parseInt(s.slaHours)||0, condition_field:s.condField||null, condition_op:s.condOp||"eq", condition_value:s.condValue||null }) });
            for (const a of s.approvers.filter(a=>!a.aprId)) {
              await apiFetch(`${API}/workflow/steps/${s.stepId}/approvers/`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(buildAprPayload(a)) });
            }
            for (const a of s.approvers.filter(a=>a.aprId)) {
              await apiFetch(`${API}/workflow/approvers/${a.aprId}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(buildAprPayload(a)) });
            }
          } else {
            const ns = await apiFetch(`${API}/workflow/templates/${builder.templateId}/steps/`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ step_order:s.stepOrder, step_name:s.stepName.trim(), step_description:s.stepDescription?.trim()||null, approval_type:s.approvalType, sla_hours:parseInt(s.slaHours)||0, condition_field:s.condField||null, condition_op:s.condOp||"eq", condition_value:s.condValue||null, approvers:s.approvers.map(buildAprPayload) }) });
            updStep(s._id, "stepId", ns.id);
          }
        }
        showToast("Workflow updated ✓");
      }
      await reload(); setBuilder(null); setSelEntry(null);
    } catch(e) { showToast(e.message, false); }
    finally { setSaving(false); }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-lg shadow-md"
      style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", color:C.text, background:"#131929" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:${C.surface}; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:10px; }
        select option { background:${C.card}; color:${C.text}; }
      `}</style>

      {toast && (
        <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:9999, padding:"12px 24px", borderRadius:8, background:toast.ok?C.greenSoft:C.redSoft, color:toast.ok?C.green:C.red, border:`1px solid ${toast.ok?C.green:C.red}44`, fontSize:12, fontWeight:600, boxShadow:"0 8px 32px #0009" }}>
          {toast.msg}
        </div>
      )}

      <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-600"
        style={{ height:24, padding:"0 10px", background:"linear-gradient(to right, #374151, #60a5fa)" }}>
        <span style={{ fontSize:11, fontWeight:600, color:"#fff" }}>⚙️ Workflow Setup — Templates · Steps · Approvers</span>
        <span style={{ fontSize:9, color:"#e2e8f0aa" }}>Company-wise · Department-wise approval flows</span>
      </div>

      <div style={{ flex:1, minHeight:0, display:"grid", gridTemplateColumns:"190px 1fr", overflow:"hidden" }}>
        <Col1Pages pages={pages} selPage={selPage} templates={templates} onSelect={p=>{ setSelPage(p); setSelEntry(null); setBuilder(null); }} onOpenExisting={openExisting} onOpenNew={openNew} onDelete={delTemplate} selEntry={selEntry} />
        <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {!builder
            ? <EmptyState icon="⚙️" msg={selPage ? "Click + on any template below or create a new flow" : "Select a page first ←"} />
            : <FlowBuilder builder={builder} upd={upd} companies={companies} rbac={rbac} allRbac={allRbac} allUsers={allUsers} selPage={selPage} saving={saving} onSave={handleSave} onAddStep={addStep} onUpdStep={updStep} onDelStep={delStep} onAddApr={addApr} onUpdApr={updApr} onDelApr={delApr} onAddAprFromFlows={addAprFromFlows} />
          }
        </div>
      </div>

      <div className="px-2.5 border-t border-gray-600 flex-shrink-0 rounded-b-lg"
        style={{ height:8, background:"linear-gradient(to right, #60a5fa, #374151)" }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COL 1 (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function Col1Pages({ pages, selPage, templates, onSelect, onOpenExisting, onOpenNew, onDelete, selEntry }) {
  const pageTmpls = selPage
    ? templates.filter(t => t.entity_page===selPage.path || t.code.includes(selPage.path.toUpperCase().replace(/-/g,"_")) || t.name.toLowerCase().includes(selPage.name.toLowerCase()))
    : [];

  return (
    <div style={{ borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <SectionTitle>📄 Pages</SectionTitle>
      <div style={{ flex:1, overflowY:"auto", minHeight:0 }}>
        {pages === null ? <div style={{ padding:20, textAlign:"center" }}><Spinner /></div>
          : pages.length === 0 ? <EmptyState icon="🔒" msg="No accessible pages" />
          : pages.map(pg => {
              const pgTmpls = templates.filter(t => t.entity_page===pg.path || t.code.includes(pg.path.toUpperCase().replace(/-/g,"_")) || t.name.toLowerCase().includes(pg.name.toLowerCase()));
              const hasFlow = pgTmpls.length > 0;
              const active  = selPage?.path === pg.path;
              return (
                <div key={pg.path}>
                  <button onClick={() => onSelect(pg)} style={{ display:"flex", alignItems:"flex-start", gap:8, width:"100%", padding:"9px 11px", border:"none", borderBottom:`1px solid ${C.border}22`, cursor:"pointer", textAlign:"left", background:active?C.accentSoft:"transparent", color:active?C.accent:C.text, animation:"fadeIn 0.15s ease" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{pg.name}</div>
                      {pg.description && <div style={{ fontSize:9, color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{pg.description}</div>}
                    </div>
                    {hasFlow ? <Badge color={C.green} bg={C.greenSoft}>✓</Badge> : <Badge color={C.muted} bg={C.surface}>—</Badge>}
                  </button>
                  {active && (
                    <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}33` }}>
                      {pageTmpls.map(tmpl => {
                        const isActive = selEntry?.kind==="existing" && selEntry?.tmpl?.id===tmpl.id;
                        const steps = tmpl.steps?.length || 0;
                        return (
                          <div key={tmpl.id} style={{ borderBottom:`1px solid ${C.border}22`, background:isActive?C.accentSoft:"transparent" }}>
                            <button onClick={()=>onOpenExisting(tmpl)} style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"6px 11px 4px 18px", border:"none", background:"transparent", cursor:"pointer", textAlign:"left", color:isActive?C.accent:C.textDim }}>
                              <span style={{ fontSize:10 }}>📋</span>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:10, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{tmpl.name}</div>
                                <div style={{ fontSize:8, color:C.muted, fontFamily:"monospace" }}>{tmpl.code} · {steps} step{steps!==1?"s":""}</div>
                              </div>
                              {tmpl.is_active?<Badge color={C.green} bg={C.greenSoft}>On</Badge>:<Badge color={C.red} bg={C.redSoft}>Off</Badge>}
                            </button>
                            <div style={{ display:"flex", gap:3, padding:"0 11px 5px 18px", justifyContent:"flex-end" }}>
                              <Btn onClick={()=>onOpenExisting(tmpl)} color={C.accent} sm>✏ Edit</Btn>
                              <Btn onClick={()=>onDelete(tmpl.id)} color={C.red} sm>🗑</Btn>
                            </div>
                          </div>
                        );
                      })}
                      <button onClick={()=>onOpenNew(null)} style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"6px 11px 6px 18px", border:"none", background:"transparent", cursor:"pointer", color:C.accent }}>
                        <span style={{ fontSize:13 }}>＋</span>
                        <span style={{ fontSize:10, fontWeight:600 }}>New Flow</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
//  COL 2 (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function Col2Companies({ selPage, pageTmpls, companies, selEntry, onOpenExisting, onOpenNew, onDelete }) {
  if (!selPage) return (
    <div style={{ borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <SectionTitle>🏢 Select a Page →</SectionTitle><EmptyState icon="←" msg="Select a page first" />
    </div>
  );
  const globalTmpl = pageTmpls.find(t => !t.company_id);
  return (
    <div style={{ borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <SectionTitle>🏢 Companies — {selPage.name}</SectionTitle>
      <div style={{ flex:1, overflowY:"auto", minHeight:0 }}>
        <div style={{ padding:"4px 10px 2px", fontSize:8, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.7 }}>Global (all companies)</div>
        {globalTmpl ? <TmplRow tmpl={globalTmpl} selEntry={selEntry} onOpen={() => onOpenExisting(globalTmpl)} onDelete={() => onDelete(globalTmpl.id)} /> : <NewRow label="Create global flow" onClick={() => onOpenNew(null)} />}
        <div style={{ padding:"8px 10px 2px", fontSize:8, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.7, marginTop:4 }}>Company-specific flows</div>
        {companies.length === 0 && <div style={{ padding:"8px 11px", fontSize:10, color:C.muted }}>No companies found</div>}
        {companies.map(c => {
          const tmpl = pageTmpls.find(t => t.company_id === c.id);
          return tmpl
            ? <TmplRow key={c.id} tmpl={tmpl} company={c} selEntry={selEntry} onOpen={() => onOpenExisting(tmpl)} onDelete={() => onDelete(tmpl.id)} />
            : <NewRow key={c.id} label={c.company_name} sublabel="No flow yet — create one" onClick={() => onOpenNew(c)} />;
        })}
      </div>
    </div>
  );
}
function TmplRow({ tmpl, company, selEntry, onOpen, onDelete }) {
  const active = selEntry?.kind==="existing" && selEntry?.tmpl?.id===tmpl.id;
  const steps  = tmpl.steps?.length || 0;
  const depts  = [...new Set((tmpl.steps||[]).flatMap(s=>(s.approvers||[]).map(a=>a.department?.department_name).filter(Boolean)))];
  return (
    <div style={{ borderBottom:`1px solid ${C.border}22`, background:active?C.accentSoft:"transparent", animation:"fadeIn 0.15s ease" }}>
      <button onClick={onOpen} style={{ display:"flex", alignItems:"flex-start", gap:7, width:"100%", padding:"8px 11px", border:"none", background:"transparent", cursor:"pointer", textAlign:"left", color:active?C.accent:C.text }}>
        <div style={{ width:24, height:24, borderRadius:5, background:active?C.accent+"33":C.border+"44", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>🏢</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:11, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{tmpl.company?.company_name || company?.company_name || "Global"}</div>
          <div style={{ fontSize:9, color:C.textDim, marginTop:1 }}>{steps} step{steps!==1?"s":""}{depts.length>0&&` · ${depts.slice(0,2).join(", ")}${depts.length>2?"…":""}`}</div>
          <div style={{ fontSize:9, color:C.muted, fontFamily:"monospace" }}>{tmpl.code}</div>
        </div>
        <div>{tmpl.is_active?<Badge color={C.green} bg={C.greenSoft}>On</Badge>:<Badge color={C.red} bg={C.redSoft}>Off</Badge>}</div>
      </button>
      <div style={{ display:"flex", gap:4, padding:"0 11px 7px", justifyContent:"flex-end" }}>
        <Btn onClick={onOpen} color={C.accent} sm>✏ Edit</Btn>
        <Btn onClick={onDelete} color={C.red} sm>🗑</Btn>
      </div>
    </div>
  );
}
function NewRow({ label, sublabel, onClick }) {
  return (
    <button onClick={onClick} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 11px", border:"none", borderBottom:`1px solid ${C.border}22`, background:"transparent", cursor:"pointer", color:C.muted, textAlign:"left" }}>
      <div style={{ width:24, height:24, borderRadius:5, background:C.border+"33", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0, color:C.accent }}>＋</div>
      <div><div style={{ fontSize:11, fontWeight:600, color:C.textDim }}>{label}</div>{sublabel&&<div style={{ fontSize:9, color:C.muted }}>{sublabel}</div>}</div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COL 3 – Flow Builder
// ─────────────────────────────────────────────────────────────────────────────
function FlowBuilder({ builder, upd, companies, rbac, allRbac, allUsers, selPage, saving, onSave, onAddStep, onUpdStep, onDelStep, onAddApr, onUpdApr, onDelApr, onAddAprFromFlows }) {
  const isEdit = !!builder.templateId;
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", animation:"fadeIn 0.2s ease" }}>
      <div style={{ padding:"8px 13px", borderBottom:`1px solid ${C.border}`, flexShrink:0, background:C.surface }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:C.text }}>
              {isEdit?"✏ Edit Flow":"＋ Create New Flow"}
              <span style={{ marginLeft:7, fontSize:9, color:C.muted, fontFamily:"monospace" }}>{builder.code}</span>
            </div>
            {selPage && <div style={{ fontSize:9, color:C.textDim, marginTop:1 }}>📄 {selPage.name}</div>}
          </div>
          <Btn onClick={onSave} color={C.green} disabled={saving}>{saving?<><Spinner/>Saving…</>:isEdit?"💾 Update":"🚀 Save Flow"}</Btn>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", minHeight:0, padding:"12px 13px" }}>

        {/* Meta */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:12, marginBottom:10 }}>
          <div style={{ fontSize:8, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:9 }}>Flow Details</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            <Lbl text="Name *"><Inp value={builder.name} onChange={e=>upd("name",e.target.value)} placeholder="e.g. Item Creation Approval" /></Lbl>
            <Lbl text="Code (auto)"><Inp value={builder.code} readOnly mono /></Lbl>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            <Lbl text="Company (grouping only)">
              <Sel value={builder.companyId||""} onChange={e=>upd("companyId",e.target.value||null)}>
                <option value="">— Global —</option>
                {companies.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
              </Sel>
            </Lbl>
            {isEdit && (
              <Lbl text="Status">
                <Sel value={String(builder.isActive)} onChange={e=>upd("isActive",e.target.value==="true")}>
                  <option value="true">Active</option><option value="false">Inactive</option>
                </Sel>
              </Lbl>
            )}
          </div>
          <Lbl text="Description"><Inp value={builder.description} onChange={e=>upd("description",e.target.value)} placeholder="Short description" /></Lbl>
        </div>

        {/* Info box */}
        <div style={{ background:C.tealSoft, border:`1px solid ${C.teal}44`, borderRadius:6, padding:"5px 9px", marginBottom:8, fontSize:8, color:C.teal, lineHeight:1.6 }}>
          <b>💡 How routing works:</b> Each rule has two parts. &nbsp;
          <b style={{color:C.yellow}}>📥 FROM</b> = which company+dept triggers this rule (blank = any) →
          <b style={{color:C.accent}}> ✅ TO</b> = who approves (company+role+dept+desg or a specific user). Add multiple rules for multi-dept routing.
        </div>

        {/* ── Sticky Step Map ── always visible while scrolling */}
        <div style={{ position:"sticky", top:0, zIndex:10, background:"#131929", borderBottom:`1px solid ${C.border}`, marginBottom:10, paddingBottom:8, paddingTop:4 }}>
          <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>
            🗺 Approval Flow — {builder.steps.length} Step{builder.steps.length!==1?"s":""}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:0, overflowX:"auto", paddingBottom:2 }}>
            {builder.steps.map((s,i) => {
              const col = STEP_COLORS[i%STEP_COLORS.length];
              return (
                <div key={s._id} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:90 }}>
                    <div style={{ width:22, height:22, borderRadius:"50%", background:col, color:"#fff", fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:3, boxShadow:`0 0 0 3px ${col}33` }}>{s.stepOrder}</div>
                    <div style={{ background:C.card, border:`1.5px solid ${col}55`, borderRadius:6, padding:"3px 7px", width:"100%", textAlign:"center" }}>
                      <div style={{ fontSize:8, fontWeight:700, color:col, textTransform:"uppercase", letterSpacing:0.4 }}>Step {s.stepOrder}</div>
                      <div style={{ fontSize:9, fontWeight:700, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:80 }}>{s.stepName || <span style={{color:C.muted,fontStyle:"italic"}}>Unnamed</span>}</div>
                      {s.approvers?.length>0 && <div style={{ fontSize:7, color:C.green, marginTop:1 }}>👥 {s.approvers.length} rule{s.approvers.length!==1?"s":""}</div>}
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"0 4px", marginTop:-16 }}>
                    <div style={{ width:22, height:2, background:`linear-gradient(to right,${col}88,${STEP_COLORS[(i+1)%STEP_COLORS.length]}88)` }} />
                    <span style={{ fontSize:10, color:C.muted }}>→</span>
                  </div>
                </div>
              );
            })}
            {/* ＋ Add Next Step — right after last step in the strip */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0, marginTop:-16, paddingLeft:2 }}>
              <div style={{ width:16, height:2, background:`${STEP_COLORS[(builder.steps.length-1)%STEP_COLORS.length]}44` }} />
              <button onClick={onAddStep}
                style={{ marginTop:4, background:C.greenSoft, border:`1.5px solid ${C.green}66`, color:C.green, borderRadius:7, padding:"5px 12px", fontSize:9, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:3, whiteSpace:"nowrap", boxShadow:`0 0 8px ${C.green}22` }}>
                ＋ Add Step
              </button>
            </div>
          </div>
        </div>

        {/* Step cards */}
        {builder.steps.map((step,idx) => (
          <StepCard key={step._id} step={step} idx={idx} total={builder.steps.length}
            color={STEP_COLORS[idx%STEP_COLORS.length]}
            companies={companies} rbac={rbac} allRbac={allRbac} allUsers={allUsers}
            builderCompanyId={builder.companyId}
            allSteps={builder.steps}
            onUpd={(f,v)=>onUpdStep(step._id,f,v)}
            onDel={()=>onDelStep(step._id,step.stepId)}
            onAddApr={()=>onAddApr(step._id)}
            onAddAprFromFlows={(rows)=>onAddAprFromFlows(step._id,rows)}
            onUpdApr={(aId,f,v)=>onUpdApr(step._id,aId,f,v)}
            onDelApr={(aId,aprId)=>onDelApr(step._id,aId,aprId)}
            selPage={selPage}
          />
        ))}

        <div style={{ display:"flex", justifyContent:"flex-end", paddingTop:8, paddingBottom:20 }}>
          <Btn onClick={onSave} color={C.green} disabled={saving}>{saving?<><Spinner/>Saving…</>:isEdit?"💾 Update Workflow":"🚀 Save Workflow"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Step Card — REDESIGNED: FROM + TO approver rows
// ─────────────────────────────────────────────────────────────────────────────
function StepCard({ step, idx, total, color, companies, rbac, allRbac, allUsers, builderCompanyId, allSteps, onUpd, onDel, onAddApr, onAddAprFromFlows, onUpdApr, onDelApr, selPage }) {
  const [open, setOpen]         = useState(true);
  const [showCond, setShowCond] = useState(!!step.condField);
  const [showFlowPicker, setShowFlowPicker] = useState(false);
  const [pickedFlows, setPickedFlows]       = useState([]);

  // ── Page access check: aprId → { loading, hasAccess, grantedPages } ────────
  const [pageAccessMap, setPageAccessMap] = useState({});

  const checkPageAccess = async (apr) => {
    // Need company + role + dept + desg all filled
    if (!apr.compId || !apr.roleId || !apr.deptId || !apr.desgId) return;
    const key = `${apr._id}`;
    setPageAccessMap(prev => ({ ...prev, [key]: { loading: true } }));
    // Step 1 → "My Requests" (workflow-my-requests)
    // Step 2+ → "MDM My Requests" (mdm-my-req)
    const isStep1 = idx === 0;
    const targetPagePath = isStep1 ? "workflow-my-requests" : "mdm-my-req";
    const targetPageName = isStep1 ? "My Requests" : "MDM My Requests";
    try {
      const data = await apiFetch(
        `${API}/rbac/access-by-role?company_id=${apr.compId}&role_id=${apr.roleId}&department_id=${apr.deptId}&designation_id=${apr.desgId}`
      );
      const pages = Array.isArray(data) ? data : [];
      const match = pages.find(p =>
        (p.page_url && (p.page_url === targetPagePath || p.page_url.endsWith(targetPagePath))) ||
        (p.page_name && p.page_name.toLowerCase() === targetPageName.toLowerCase())
      );
      setPageAccessMap(prev => ({ ...prev, [key]: { loading: false, hasAccess: !!match, pageName: targetPageName, matchedPage: match } }));
    } catch {
      setPageAccessMap(prev => ({ ...prev, [key]: { loading: false, hasAccess: null } }));
    }
  };

  // Previous steps' approver rows (for step 2+)
  const prevSteps = allSteps.slice(0, idx);
  const prevApprovers = prevSteps.flatMap(s =>
    (s.approvers || []).map(a => ({ ...a, _stepName: s.stepName || `Step ${s.stepOrder}` }))
  );

  const handleAddRuleClick = () => {
    if (idx > 0 && prevApprovers.length > 0) {
      setPickedFlows([]);
      setShowFlowPicker(true);
    } else {
      onAddApr();
    }
  };

  const togglePick = (flowId) => {
    setPickedFlows(prev =>
      prev.includes(flowId) ? prev.filter(x => x !== flowId) : [...prev, flowId]
    );
  };

  const confirmPick = () => {
    if (pickedFlows.length === 0) { onAddApr(); setShowFlowPicker(false); return; }
    const selected = prevApprovers.filter(a => pickedFlows.includes(a._id));
    onAddAprFromFlows(selected);
    setShowFlowPicker(false);
    setPickedFlows([]);
  };

  const getRbac = (compId) => {
    if (compId) { const v = rbac[compId] || rbac[parseInt(compId)]; if (v) return v; }
    if (builderCompanyId) { const v = rbac[builderCompanyId] || rbac[parseInt(builderCompanyId)]; if (v) return v; }
    return allRbac;
  };

  // Helper to get full FROM + TO info for modal display
  const getFlowInfo = (a) => {
    const srcR = getRbac(a.srcCompId);
    const toR  = getRbac(a.compId);
    const fromComp = a.srcCompId ? (companies.find(c => String(c.id)===String(a.srcCompId))?.company_name || `Co#${a.srcCompId}`) : "Any";
    const fromDept = a.srcDeptId ? (srcR.departments.find(d => String(d.id)===String(a.srcDeptId))?.department_name || `Dept#${a.srcDeptId}`) : "Any";
    const toComp   = a.compId    ? (companies.find(c => String(c.id)===String(a.compId))?.company_name    || `Co#${a.compId}`)    : "Any";
    const toRole   = a.roleId    ? (toR.roles.find(r => String(r.id)===String(a.roleId))?.role_name        || `Role#${a.roleId}`)  : "Any";
    const toDept   = a.deptId    ? (toR.departments.find(d => String(d.id)===String(a.deptId))?.department_name || `Dept#${a.deptId}`) : "Any";
    const toDesg   = a.desgId    ? (toR.designations.find(d => String(d.id)===String(a.desgId))?.designation_name || `Desg#${a.desgId}`) : "Any";
    const toUser   = a.userId    ? ((allUsers||[]).find(u => String(u.id)===String(a.userId))?.full_name || `User#${a.userId}`) : null;
    return { fromComp, fromDept, toComp, toRole, toDept, toDesg, toUser };
  };

  return (
    <div style={{ border:`1.5px solid ${color}33`, borderRadius:10, marginBottom:10, overflow:"hidden", background:C.card, animation:"fadeIn 0.2s ease" }}>

      {/* Step header */}
      <div style={{ background:`linear-gradient(to right,${color}22,${color}11)`, borderBottom:`1px solid ${color}33`, padding:"5px 10px", display:"flex", flexDirection:"column", gap:4 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:19, height:19, borderRadius:"50%", background:color, color:"#fff", fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{step.stepOrder}</div>
          {/* Locked prefix */}
          <span style={{ fontSize:11, fontWeight:800, color:color, flexShrink:0, userSelect:"none" }}>Step {step.stepOrder} —</span>
          {/* Name input: title-case + single-space */}
          <input
            value={step.stepName}
            onChange={e => {
              let v = e.target.value;
              // Prevent double spaces
              v = v.replace(/  +/g, " ");
              // Auto-capitalize first letter of each word
              v = v.replace(/(^|\s)([a-z])/g, (m, space, char) => space + char.toUpperCase());
              onUpd("stepName", v);
            }}
            placeholder="Enter step name…"
            style={{ flex:1, background:"transparent", border:"none", color:C.text, fontSize:11, fontWeight:700, outline:"none" }}
          />
          <div style={{ display:"flex", borderRadius:5, overflow:"hidden", border:`1px solid ${C.border}`, flexShrink:0 }}>
            {["ANY","ALL"].map(t=>(
              <button key={t} onClick={()=>onUpd("approvalType",t)} style={{ padding:"3px 8px", fontSize:9, fontWeight:700, border:"none", background:step.approvalType===t?color:"transparent", color:step.approvalType===t?"#fff":C.muted, cursor:"pointer" }}>{t}</button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
            <span style={{ fontSize:8, color:C.muted }}>SLA</span>
            <input type="number" min={0} value={step.slaHours} onChange={e=>onUpd("slaHours",e.target.value)} style={{ width:42, background:C.surface, border:`1px solid ${C.border}`, color:C.text, borderRadius:4, padding:"2px 4px", fontSize:9, textAlign:"center" }} />
            <span style={{ fontSize:8, color:C.muted }}>hrs</span>
          </div>
          <button onClick={()=>setOpen(o=>!o)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:12, padding:0 }}>{open?"▲":"▼"}</button>
          {total>1 && <button onClick={onDel} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:14, padding:0 }}>✕</button>}
        </div>
        {/* Description row */}
        <div style={{ display:"flex", alignItems:"center", gap:5, paddingLeft:25 }}>
          <span style={{ fontSize:8, color:C.muted, flexShrink:0, textTransform:"uppercase", letterSpacing:0.4 }}>Desc:</span>
          <input
            value={step.stepDescription||""}
            onChange={e => {
              let v = e.target.value;
              v = v.replace(/  +/g, " ");
              v = v.replace(/(^|\s)([a-z])/g, (m, space, char) => space + char.toUpperCase());
              onUpd("stepDescription", v);
            }}
            placeholder="Optional step description…"
            style={{ flex:1, background:"transparent", border:"none", borderBottom:`1px dashed ${C.border}`, color:C.textDim, fontSize:9, outline:"none", paddingBottom:1 }}
          />
        </div>
      </div>

      {open && (
        <div style={{ padding:"7px 10px" }}>

          {/* Approvers */}
          <div style={{ marginBottom:7 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <div>
                <span style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.7 }}>👥 Routing Rules</span>
                <span style={{ marginLeft:7, fontSize:9, color:color }}>{step.approvalType==="ANY"?"Any one approves — will proceed":"Everyone must approve"}</span>
              </div>
              <Btn onClick={handleAddRuleClick} color={C.purple} sm>＋ Add Rule</Btn>
            </div>

            {/* Flow Picker Modal — only for step 2+ when prev steps have rules */}
            {showFlowPicker && (
              <div style={{ position:"fixed", inset:0, zIndex:9990, background:"#000a", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ background:C.card, border:`1.5px solid ${C.purple}55`, borderRadius:12, padding:18, minWidth:340, maxWidth:480, boxShadow:"0 12px 40px #0009", animation:"fadeIn 0.15s ease" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.purple, marginBottom:6 }}>📋 View previous step rules — which rule should the new step follow?</div>
                  <div style={{ fontSize:9, color:C.muted, marginBottom:12, lineHeight:1.7 }}>
                    Rules from Step {idx} are shown below. <b style={{color:C.text}}>Tick the FROM ➜ TO pair that matches your new step.</b><br/>
                    <span style={{ color:C.yellow }}>⚠ TO (Role/Dept/Desg) must be filled manually — it will not be pre-filled.</span>
                  </div>
                  <div style={{ maxHeight:260, overflowY:"auto", marginBottom:12 }}>
                    {prevApprovers.map(a => {
                      const picked  = pickedFlows.includes(a._id);
                      const info    = getFlowInfo(a);
                      const active  = a.isActive !== false;
                      return (
                        <div key={a._id} onClick={() => togglePick(a._id)}
                          style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"8px 10px", marginBottom:5, borderRadius:7, cursor:"pointer", background: picked ? C.purpleSoft : C.surface, border:`1px solid ${picked ? C.purple+"88" : C.border}`, transition:"all 0.12s", opacity: active ? 1 : 0.55 }}>
                          {/* Checkbox */}
                          <div style={{ width:14, height:14, marginTop:2, borderRadius:3, border:`2px solid ${picked ? C.purple : C.muted}`, background: picked ? C.purple : "transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            {picked && <span style={{ fontSize:9, color:"#fff", lineHeight:1 }}>✓</span>}
                          </div>
                          {/* Row content */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                              {/* FROM */}
                              <div style={{ display:"flex", alignItems:"center", gap:3, background:C.yellowSoft, border:`1px solid ${C.yellow}33`, borderRadius:4, padding:"2px 6px" }}>
                                <span style={{ fontSize:7, fontWeight:700, color:C.yellow, textTransform:"uppercase", letterSpacing:0.4 }}>FROM</span>
                                <span style={{ fontSize:9, color:C.text }}>{info.fromComp}</span>
                                <span style={{ fontSize:8, color:C.muted }}>/</span>
                                <span style={{ fontSize:9, color:C.text }}>{info.fromDept}</span>
                              </div>
                              <span style={{ fontSize:11, color:C.muted }}>→</span>
                              {/* TO */}
                              <div style={{ display:"flex", alignItems:"center", gap:3, background:C.accentSoft, border:`1px solid ${C.accent}33`, borderRadius:4, padding:"2px 6px", flexWrap:"wrap" }}>
                                <span style={{ fontSize:7, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:0.4 }}>TO</span>
                                <span style={{ fontSize:9, color:C.text }}>{info.toComp}</span>
                                <span style={{ fontSize:8, color:C.muted }}>·</span>
                                <span style={{ fontSize:9, color:C.text }}>{info.toRole}</span>
                                <span style={{ fontSize:8, color:C.muted }}>·</span>
                                <span style={{ fontSize:9, color:C.text }}>{info.toDept}</span>
                                <span style={{ fontSize:8, color:C.muted }}>·</span>
                                <span style={{ fontSize:9, color:C.text }}>{info.toDesg}</span>
                                {info.toUser && <><span style={{ fontSize:8, color:C.muted }}>·</span><span style={{ fontSize:9, color:C.green, fontWeight:600 }}>👤 {info.toUser}</span></>}
                              </div>
                            </div>
                            <div style={{ marginTop:3, display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ fontSize:8, color:C.muted }}>from {a._stepName}</span>
                              {!active && <span style={{ fontSize:7, fontWeight:700, color:C.red, background:C.redSoft, borderRadius:3, padding:"1px 5px" }}>OFF</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                    <Btn onClick={() => { setShowFlowPicker(false); setPickedFlows([]); }} color={C.muted} sm>Cancel</Btn>
                    <Btn onClick={() => { onAddApr(); setShowFlowPicker(false); setPickedFlows([]); }} color={C.textDim} sm>+ Blank Rule</Btn>
                    <Btn onClick={confirmPick} color={C.purple} disabled={pickedFlows.length===0} sm>✓ Add {pickedFlows.length > 0 ? `(${pickedFlows.length}) Selected` : "Selected"}</Btn>
                  </div>
                </div>
              </div>
            )}

            {step.approvers.length === 0 ? (
              <div style={{ padding:"10px 12px", background:C.surface, borderRadius:7, fontSize:10, color:C.muted, textAlign:"center", border:`1px dashed ${C.border}` }}>
                No rules yet — click "Add Rule"
              </div>
            ) : (
              <>
                {step.approvers.map((apr, aprIdx) => {
                  const srcR   = getRbac(apr.srcCompId);
                  const toR    = getRbac(apr.compId);
                  const active = apr.isActive !== false;

                  // Mutual exclusion logic:
                  // If user is selected → comp/role/dept/desg are disabled
                  // If any of comp/role/dept/desg is selected → user dropdown is hidden
                  const userSelected      = !!apr.userId;
                  const rbacFieldSelected = !!(apr.compId || apr.roleId || apr.deptId || apr.desgId);

                  return (
                    <div key={apr._id} style={{ marginBottom:7, opacity: active ? 1 : 0.45 }}>

                      {/* Rule header row */}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <div style={{ width:15, height:15, borderRadius:"50%", background:color+"33", border:`1px solid ${color}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:800, color:color }}>{aprIdx+1}</div>
                          <span style={{ fontSize:8, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.4 }}>Rule {aprIdx+1}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <button onClick={()=>onUpdApr(apr._id,"isActive",!active)}
                            title={active?"Deactivate this rule":"Activate this rule"}
                            style={{ padding:"1px 7px", borderRadius:20, fontSize:8, fontWeight:700, cursor:"pointer", border:"none", whiteSpace:"nowrap",
                              background: active ? C.greenSoft : C.redSoft,
                              color:       active ? C.green     : C.red }}>
                            {active ? "● On" : "○ Off"}
                          </button>
                          <button onClick={()=>onDelApr(apr._id,apr.aprId)} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:12, padding:0, lineHeight:1 }} title="Remove rule">✕</button>
                        </div>
                      </div>

                      {/* Sub-step 1: FROM */}
                      <div style={{ background:C.yellowSoft+"88", border:`1px solid ${C.yellow}33`, borderRadius:6, padding:"5px 8px", marginBottom:3 }}>
                        <div style={{ fontSize:9, fontWeight:800, color:C.yellow, marginBottom:4, display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                          <span style={{ background:C.yellowSoft, border:`1px solid ${C.yellow}44`, borderRadius:4, padding:"2px 8px", fontSize:8, fontWeight:800, textTransform:"uppercase", letterSpacing:0.5 }}>📥 FROM</span>
                          <span style={{ fontSize:9, color:C.muted, fontWeight:400 }}>From which company / dept did the request come? <b style={{color:C.yellow}}>(blank = applies to all)</b></span>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
                          <Lbl text="Company">
                            <Sel value={apr.srcCompId} onChange={e=>onUpdApr(apr._id,"srcCompId",e.target.value)} small>
                              <option value="">Any company</option>
                              {companies.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
                            </Sel>
                          </Lbl>
                          <Lbl text="Department">
                            <Sel value={apr.srcDeptId} onChange={e=>onUpdApr(apr._id,"srcDeptId",e.target.value)} small>
                              <option value="">Any department</option>
                              {srcR.departments.map(d=><option key={d.id} value={d.id}>{d.department_name}</option>)}
                            </Sel>
                          </Lbl>
                        </div>
                      </div>

                      {/* Arrow connector */}
                      <div style={{ textAlign:"center", fontSize:10, color:C.muted, margin:"1px 0", lineHeight:1 }}>↓</div>

                      {/* Sub-step 2: TO (Approver) */}
                      <div style={{ background:C.accentSoft+"88", border:`1px solid ${C.accent}33`, borderRadius:6, padding:"5px 8px" }}>
                        <div style={{ fontSize:9, fontWeight:800, color:C.accent, marginBottom:4, display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                          <span style={{ background:C.accentSoft, border:`1px solid ${C.accent}44`, borderRadius:4, padding:"2px 8px", fontSize:8, fontWeight:800, textTransform:"uppercase", letterSpacing:0.5 }}>✅ TO (Approver)</span>
                          <span style={{ fontSize:9, color:C.muted, fontWeight:400 }}>Who will approve? Select Role/Dept/Desg <b style={{color:C.yellow}}>or</b> a specific user</span>
                        </div>

                        {/* Mode toggle */}
                        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:6 }}>
                          <span style={{ fontSize:7, color:C.muted, fontWeight:600 }}>Approver type:</span>
                          <div style={{ display:"flex", borderRadius:4, overflow:"hidden", border:`1px solid ${C.border}` }}>
                            <button
                              onClick={()=>{ if(userSelected){ onUpdApr(apr._id,"userId",""); } }}
                              style={{ padding:"2px 9px", fontSize:8, fontWeight:700, border:"none", cursor:"pointer",
                                background: !userSelected ? C.accent : "transparent",
                                color:      !userSelected ? "#fff"   : C.muted }}>
                              Role / Dept / Desg
                            </button>
                            <button
                              onClick={()=>{
                                if(!userSelected){
                                  onUpdApr(apr._id,"compId","");
                                  onUpdApr(apr._id,"roleId","");
                                  onUpdApr(apr._id,"deptId","");
                                  onUpdApr(apr._id,"desgId","");
                                }
                              }}
                              style={{ padding:"2px 9px", fontSize:8, fontWeight:700, border:"none", cursor:"pointer",
                                background: userSelected ? C.green  : "transparent",
                                color:      userSelected ? "#fff"   : C.muted }}>
                              Specific User
                            </button>
                          </div>
                          <span style={{ fontSize:7, color:C.muted }}>{userSelected ? "— user selected; role fields hidden" : rbacFieldSelected ? "— role/dept filled; user option hidden" : "— select role-based or a specific user"}</span>
                        </div>

                        {/* Role/Dept/Desg fields */}
                        {!userSelected && (
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:4, marginBottom: rbacFieldSelected ? 0 : 4 }}>
                            <Lbl text="Company">
                              <Sel value={apr.compId} onChange={e=>onUpdApr(apr._id,"compId",e.target.value)} small>
                                <option value="">Any company</option>
                                {companies.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
                              </Sel>
                            </Lbl>
                            <Lbl text="Role">
                              <Sel value={apr.roleId} onChange={e=>onUpdApr(apr._id,"roleId",e.target.value)} small>
                                <option value="">Any role</option>
                                {toR.roles.map(r=><option key={r.id} value={r.id}>{r.role_name}</option>)}
                              </Sel>
                            </Lbl>
                            <Lbl text="Department">
                              <Sel value={apr.deptId} onChange={e=>onUpdApr(apr._id,"deptId",e.target.value)} small>
                                <option value="">Any dept</option>
                                {toR.departments.map(d=><option key={d.id} value={d.id}>{d.department_name}</option>)}
                              </Sel>
                            </Lbl>
                            <Lbl text="Designation">
                              <Sel value={apr.desgId} onChange={e=>onUpdApr(apr._id,"desgId",e.target.value)} small>
                                <option value="">Any desg</option>
                                {toR.designations.map(d=><option key={d.id} value={d.id}>{d.designation_name}</option>)}
                              </Sel>
                            </Lbl>
                          </div>
                        )}

                        {/* ── Page Access Badge — shown on all steps when all 4 TO fields filled ── */}
                        {!userSelected && apr.compId && apr.roleId && apr.deptId && apr.desgId && (() => {
                          const key = String(apr._id);
                          const info = pageAccessMap[key];
                          // Auto-trigger check if not yet done
                          if (!info) { checkPageAccess(apr); return null; }
                          if (info.loading) {
                            return (
                              <div style={{ marginTop:6, padding:"4px 8px", borderRadius:5, background:C.surface, border:`1px solid ${C.border}`, fontSize:8, color:C.muted, display:"flex", alignItems:"center", gap:5 }}>
                                <span style={{ fontSize:10 }}>⏳</span> Checking access for <b style={{color:C.text}}>"{selPage.name}"</b>…
                              </div>
                            );
                          }
                          if (info.hasAccess) {
                            return (
                              <div style={{ marginTop:6, padding:"5px 9px", borderRadius:5, background:C.greenSoft, border:`1px solid ${C.green}55`, fontSize:9, color:C.green, display:"flex", alignItems:"center", gap:6 }}>
                                <span style={{ fontSize:12 }}>✅</span>
                                <div>
                                  <b>Access granted</b> — this approver has access to the <b>"{info.pageName}"</b> page
                                  {info.matchedPage?.page_url && <span style={{ marginLeft:5, fontSize:8, color:C.teal, fontFamily:"monospace" }}>{info.matchedPage.page_url}</span>}
                                </div>
                                <button onClick={()=>checkPageAccess(apr)} style={{ marginLeft:"auto", background:"none", border:`1px solid ${C.green}44`, color:C.green, borderRadius:3, padding:"1px 6px", fontSize:7, cursor:"pointer" }}>↻</button>
                              </div>
                            );
                          }
                          return (
                            <div style={{ marginTop:6, padding:"5px 9px", borderRadius:5, background:C.redSoft, border:`1px solid ${C.red}55`, fontSize:9, color:C.red, display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ fontSize:12 }}>🚫</span>
                              <div>
                                <b>No access</b> — this approver does not have access to the <b>"{info.pageName}"</b> page yet
                                <div style={{ fontSize:8, color:C.textDim, marginTop:1 }}>Go to Role Access page and grant access first</div>
                              </div>
                              <button onClick={()=>checkPageAccess(apr)} style={{ marginLeft:"auto", background:"none", border:`1px solid ${C.red}44`, color:C.red, borderRadius:3, padding:"1px 6px", fontSize:7, cursor:"pointer" }}>↻</button>
                            </div>
                          );
                        })()}

                        {/* Specific User — only shown when no rbac field is filled */}
                        {!rbacFieldSelected && (
                          <div style={{ marginTop: !userSelected ? 6 : 0 }}>
                            {!userSelected && (
                              <div style={{ fontSize:8, color:C.muted, marginBottom:4, borderTop:`1px dashed ${C.border}`, paddingTop:6 }}>
                                — OR select a specific user instead —
                              </div>
                            )}
                            <Lbl text="Specific User (optional)">
                              <Sel value={apr.userId||""} onChange={e=>onUpdApr(apr._id,"userId",e.target.value)} small>
                                <option value="">— No specific user —</option>
                                {(allUsers||[]).map(u => {
                                  // Deduplicate accesses by company+dept+role combo
                                  const seen = new Set();
                                  const uniqAccesses = (u.accesses||[]).filter(a => {
                                    const co = a.company?.name || a.company?.company_name || "";
                                    const dept = a.department?.name || a.department?.department_name || "";
                                    const role = a.role?.name || a.role?.role_name || "";
                                    const key = `${co}|${dept}|${role}`;
                                    if (seen.has(key)) return false;
                                    seen.add(key); return true;
                                  });
                                  const accessLine = uniqAccesses.map(a => {
                                    const co = a.company?.name || a.company?.company_name || "";
                                    const dept = a.department?.name || a.department?.department_name || "";
                                    const role = a.role?.name || a.role?.role_name || "";
                                    return [co, dept, role].filter(Boolean).join(" · ");
                                  }).filter(Boolean).join(" | ");
                                  const label = `${u.full_name||u.email||`User#${u.id}`}${accessLine ? ` — ${accessLine}` : ""}`;
                                  return <option key={u.id} value={u.id}>{label}</option>;
                                })}
                              </Sel>
                            </Lbl>
                            {/* Show selected user's info pill */}
                            {apr.userId && (() => {
                              const selUser = (allUsers||[]).find(u => String(u.id) === String(apr.userId));
                              if (!selUser) return null;
                              const accesses = selUser.accesses || [];
                              return (
                                <div style={{ marginTop:4, display:"flex", flexWrap:"wrap", gap:3 }}>
                                  <span style={{ fontSize:8, color:C.green, fontWeight:600 }}>👤 {selUser.full_name}</span>
                                  {selUser.email && <span style={{ fontSize:8, color:C.muted }}>· {selUser.email}</span>}
                                  {accesses.slice(0,3).map((a,i) => {
                                    const co   = a.company?.name || a.company?.company_name || "";
                                    const dept = a.department?.name || a.department?.department_name || "";
                                    const role = a.role?.name || a.role?.role_name || "";
                                    const desg = a.designation?.name || a.designation?.designation_name || "";
                                    return (
                                      <span key={i} style={{ fontSize:7, background:C.accentSoft, border:`1px solid ${C.accent}33`, borderRadius:3, padding:"1px 5px", color:C.textDim }}>
                                        {[co,dept,role,desg].filter(Boolean).join(" · ")}
                                      </span>
                                    );
                                  })}
                                  {accesses.length > 3 && <span style={{ fontSize:7, color:C.muted }}>+{accesses.length-3} more</span>}
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
          </div>

          {/* What happens */}
          <div style={{ background:C.surface, borderRadius:5, padding:"4px 8px", marginBottom:5, fontSize:8, color:C.textDim, display:"flex", gap:10, flexWrap:"wrap" }}>
            <span>✅ <b style={{color:C.green}}>Approve</b> → {idx<total-1?`Move to Step ${step.stepOrder+1}`:"APPROVED"}</span>
            <span>❌ <b style={{color:C.red}}>Reject</b> → REJECTED</span>
            <span>↩ <b style={{color:C.yellow}}>Return</b> → Back to submitter</span>
          </div>

          {/* Conditional skip */}
          <button onClick={()=>setShowCond(x=>!x)} style={{ background:"none", border:`1px dashed ${showCond?C.yellow+"66":C.border}`, color:showCond?C.yellow:C.muted, borderRadius:4, padding:"2px 8px", fontSize:8, cursor:"pointer" }}>
            ⚡ {showCond?"Remove Condition":"Add Conditional Skip"} (optional)
          </button>
          {showCond && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 56px 1fr", gap:5, marginTop:5, padding:"6px 8px", background:C.surface, borderRadius:5, border:`1px solid ${C.yellow}33` }}>
              <Lbl text="Field name"><Inp value={step.condField} onChange={e=>onUpd("condField",e.target.value)} placeholder="e.g. item_type" small /></Lbl>
              <Lbl text="Op"><Sel value={step.condOp} onChange={e=>onUpd("condOp",e.target.value)} small><option value="eq">=</option><option value="neq">≠</option><option value="gt">&gt;</option><option value="lt">&lt;</option></Sel></Lbl>
              <Lbl text="Value"><Inp value={step.condValue} onChange={e=>onUpd("condValue",e.target.value)} placeholder="e.g. Capital" small /></Lbl>
            </div>
          )}

          {/* ── Embedded MDM My Requests preview — Step 2 only, Item Code Creation flow only ── */}
          {idx === 1 && selPage?.path === "item-code-creation-req" && (
            <EmbeddedMyRequestsPanel />
          )}
        </div>
      )}

      {idx < total-1 && (
        <div style={{ textAlign:"center", padding:"4px 0", background:C.surface, borderTop:`1px solid ${C.border}22`, fontSize:11, color:C.muted }}>
          ↓ On approval will move to Step {step.stepOrder+1}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  EMBEDDED MY REQUESTS PANEL
//  Shown inside Step 2 card for "item-code-creation-req" flow only.
//  Renders WorkflowMyRequests inline — no link, no navigation.
//  Toggle open/close to keep Step card compact by default.
// ─────────────────────────────────────────────────────────────────────────────
function EmbeddedMyRequestsPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 10, borderRadius: 8, border: `1px solid ${C.teal}44`, overflow: "hidden" }}>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 10px", background: C.tealSoft, border: "none", cursor: "pointer",
          color: C.teal, fontSize: 10, fontWeight: 700,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12 }}>📋</span>
          MDM My Requests — Preview (approver's view for this flow)
        </span>
        <span style={{ fontSize: 13, fontWeight: 800 }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Embedded page — full WorkflowMyRequests component, no link */}
      {open && (
        <div style={{ height: 520, overflow: "hidden", background: C.bg, borderTop: `1px solid ${C.teal}33` }}>
          <WorkflowMyRequests />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP VISUALIZER — Exported standalone component
//  Usage: <StepVisualizer steps={builder.steps} onAddStep={addStep} />
//  Props:
//    steps      — array of step objects from builder state
//    onAddStep  — function called when "Add Next Step" is clicked (optional)
//    readOnly   — if true, hides the Add Next Step button (default false)
// ─────────────────────────────────────────────────────────────────────────────
export function StepVisualizer({ steps = [], onAddStep, readOnly = false }) {
  if (!steps || steps.length === 0) {
    return (
      <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", padding:"14px 16px", background:C.surface, borderRadius:8, border:`1px dashed ${C.border}`, color:C.muted, fontSize:10, textAlign:"center" }}>
        No steps defined yet.
        {!readOnly && onAddStep && (
          <button onClick={onAddStep} style={{ marginLeft:8, background:C.greenSoft, border:`1px solid ${C.green}44`, color:C.green, borderRadius:5, padding:"2px 10px", fontSize:9, fontWeight:700, cursor:"pointer" }}>
            ＋ Add First Step
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", display:"flex", alignItems:"flex-start", flexWrap:"nowrap", overflowX:"auto", gap:0, padding:"4px 0 8px" }}>
      {steps.map((step, idx) => {
        const col = STEP_COLORS[idx % STEP_COLORS.length];
        const isLast = idx === steps.length - 1;
        return (
          <div key={step._id||step.id||idx} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
            {/* Step pill */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:110, maxWidth:150 }}>
              {/* Circle + number */}
              <div style={{ width:28, height:28, borderRadius:"50%", background:col, color:"#fff", fontSize:12, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:4, boxShadow:`0 0 0 3px ${col}33` }}>
                {step.stepOrder}
              </div>
              {/* Step card */}
              <div style={{ background:C.card, border:`1.5px solid ${col}55`, borderRadius:7, padding:"5px 8px", width:"100%", textAlign:"center" }}>
                <div style={{ fontSize:8, fontWeight:700, color:col, textTransform:"uppercase", letterSpacing:0.5, marginBottom:1 }}>
                  Step {step.stepOrder}
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {step.stepName || <span style={{ color:C.muted, fontStyle:"italic" }}>Unnamed</span>}
                </div>
                {step.stepDescription && (
                  <div style={{ fontSize:8, color:C.textDim, marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {step.stepDescription}
                  </div>
                )}
                <div style={{ marginTop:4, display:"flex", justifyContent:"center", gap:4, flexWrap:"wrap" }}>
                  {step.approvalType && (
                    <span style={{ fontSize:7, background:col+"22", border:`1px solid ${col}44`, borderRadius:3, padding:"1px 5px", color:col, fontWeight:700 }}>
                      {step.approvalType}
                    </span>
                  )}
                  {(step.slaHours > 0) && (
                    <span style={{ fontSize:7, background:C.surface, border:`1px solid ${C.border}`, borderRadius:3, padding:"1px 5px", color:C.muted }}>
                      ⏱ {step.slaHours}h
                    </span>
                  )}
                  {(step.approvers?.length > 0) && (
                    <span style={{ fontSize:7, background:C.greenSoft, border:`1px solid ${C.green}44`, borderRadius:3, padding:"1px 5px", color:C.green }}>
                      👥 {step.approvers.length} rule{step.approvers.length!==1?"s":""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Arrow between steps */}
            {!isLast && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"0 6px", marginTop:-14 }}>
                <div style={{ width:28, height:2, background:`linear-gradient(to right,${col}88,${STEP_COLORS[(idx+1)%STEP_COLORS.length]}88)` }} />
                <span style={{ fontSize:10, color:C.muted, marginTop:2 }}>→</span>
              </div>
            )}

            {/* Add Next Step button after last step */}
            {isLast && !readOnly && onAddStep && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"0 6px", marginTop:-14 }}>
                <div style={{ width:20, height:2, background:`${col}44` }} />
                <button onClick={onAddStep}
                  style={{ marginTop:4, background:C.greenSoft, border:`1px solid ${C.green}55`, color:C.green, borderRadius:6, padding:"4px 10px", fontSize:9, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:3, whiteSpace:"nowrap" }}>
                  ＋ Add Next Step
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}