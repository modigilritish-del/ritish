import { useState, useEffect, useRef } from "react";

const API = "http://localhost:8000/api";

const C = {
  bg: "#0f1117", surface: "#1a1d27", card: "#21253a", border: "#2e3349",
  accent: "#4f8ef7", accentSoft: "#1e2d4a",
  green: "#34d399", greenSoft: "#0d2e22",
  red: "#f87171", redSoft: "#2e1515",
  yellow: "#fbbf24", yellowSoft: "#2d2007",
  muted: "#6b7280", text: "#e2e8f0", textDim: "#94a3b8",
};

const Badge = ({ children, color = C.accent, bg = C.accentSoft }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600,
    color, background: bg, border: `1px solid ${color}22`,
  }}>{children}</span>
);

const Tag = ({ children, onRemove }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
    color: C.green, background: C.greenSoft, border: `1px solid ${C.green}33`, margin: "2px",
  }}>
    {children}
    {onRemove && (
      <button onClick={onRemove} style={{
        background: "none", border: "none", cursor: "pointer",
        color: C.green, fontSize: 13, lineHeight: 1, padding: 0,
      }}>×</button>
    )}
  </span>
);

const Spinner = () => (
  <div style={{
    width: 18, height: 18, borderRadius: "50%",
    border: `2px solid ${C.border}`, borderTopColor: C.accent,
    animation: "spin 0.7s linear infinite", display: "inline-block",
  }} />
);

const Avatar = ({ name, size = 30 }) => {
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const hue = (name?.charCodeAt(0) || 0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `hsl(${hue}, 55%, 35%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>{initials}</div>
  );
};

const ErrBox = ({ msg }) => (
  <div style={{
    margin: "6px 8px", padding: "6px 10px", borderRadius: 6,
    background: C.redSoft, color: C.red,
    border: `1px solid ${C.red}44`, fontSize: 10,
  }}>⚠ {msg}</div>
);

const EmptyState = ({ icon, msg }) => (
  <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 11 }}>
    <div style={{ fontSize: 22, marginBottom: 5 }}>{icon}</div>
    {msg}
  </div>
);

async function safeFetch(url) {
  try {
    const r = await fetch(url);
    const json = await r.json();
    if (!r.ok) return { data: null, error: json?.detail || `HTTP ${r.status}` };
    return { data: json, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

export default function UserDeptAccessPage() {

  const [companies, setCompanies] = useState([]);
  const [companiesErr, setCompaniesErr] = useState(null);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [sessionReady, setSessionReady] = useState(false); // wait for session before fetching

  const [users, setUsers] = useState([]);
  const [usersErr, setUsersErr] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [userDetail, setUserDetail] = useState(null);
  const [userCompanies, setUserCompanies] = useState([]);
  const [userCompaniesErr, setUserCompaniesErr] = useState(null);
  const [loadingUserCompanies, setLoadingUserCompanies] = useState(false);

  const [activeCompany, setActiveCompany] = useState(null);
  const [depts, setDepts] = useState([]);
  const [deptsErr, setDeptsErr] = useState(null);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [grantedDeptIds, setGrantedDeptIds] = useState([]);

  const [userOwnDeptId, setUserOwnDeptId] = useState(null); // user's own dept — always locked
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('userData');
      if (storedData) {
        const userData = JSON.parse(storedData);
        if (userData?.user?.id) setCurrentUserId(userData.user.id);
      }
    } catch (e) { console.error('Session error:', e); }
    setSessionReady(true); // always mark ready, even if no userId
  }, []);

  useEffect(() => {
    if (!sessionReady) return; // wait until session is read
    setLoadingCompanies(true);
    const url = currentUserId
      ? `${API}/user-dept-access/companies?current_user_id=${currentUserId}`
      : `${API}/user-dept-access/companies`;
    safeFetch(url).then(({ data, error }) => {
      setCompaniesErr(error);
      setCompanies(Array.isArray(data) ? data : []);
      setLoadingCompanies(false);
    });
  }, [sessionReady, currentUserId]);

  useEffect(() => {
    if (!selectedCompany) { setUsers([]); return; }
    setLoadingUsers(true); setUsersErr(null);
    setSelectedUser(null); setUserDetail(null);
    setUserCompanies([]); setActiveCompany(null);
    setDepts([]); setGrantedDeptIds([]);
    safeFetch(`${API}/user-dept-access/companies/${selectedCompany.id}/users`).then(({ data, error }) => {
      setUsersErr(error);
      setUsers(Array.isArray(data) ? data : []);
      setLoadingUsers(false);
    });
  }, [selectedCompany]);

  const prevSelectedUserIdRef = useRef(null);
  useEffect(() => {
    if (!selectedUser) return;
    const isSameUser = prevSelectedUserIdRef.current === selectedUser.id;
    prevSelectedUserIdRef.current = selectedUser.id;
    setLoadingUserCompanies(true); setUserCompaniesErr(null);
    // Only reset activeCompany/depts when switching to a DIFFERENT user
    if (!isSameUser) { setActiveCompany(null); setDepts([]); setGrantedDeptIds([]); }
    Promise.all([
      safeFetch(`${API}/user-dept-access/user/${selectedUser.id}/detail`),
      safeFetch(`${API}/user-dept-access/user/${selectedUser.id}/companies${currentUserId ? `?current_user_id=${currentUserId}` : ''}`),
    ]).then(([{ data: detail, error: e1 }, { data: comps, error: e2 }]) => {
      if (detail) setUserDetail(detail);
      setUserCompaniesErr(e1 || e2 || null);
      setUserCompanies(Array.isArray(comps) ? comps : []);
      setLoadingUserCompanies(false);
    });
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser || !activeCompany) return;
    setLoadingDepts(true); setDeptsErr(null);
    safeFetch(`${API}/user-dept-access/user/${selectedUser.id}/company/${activeCompany.company_id}/departments`)
      .then(({ data, error }) => {
        if (error) { setDeptsErr(error); setDepts([]); setGrantedDeptIds([]); setUserOwnDeptId(null); }
        else {
          const allDepts = data?.departments || [];
          const alreadyGranted = data?.granted_dept_ids || [];

          // ── PRIMARY company only: user's own dept is ALWAYS auto-included & locked ──
          // For non-primary companies: only admin-granted depts are shown (no auto-add)
          const isPrimary = activeCompany.is_primary_company === true;
          const userOwnDeptName = isPrimary ? (activeCompany.department_name || "") : "";
          const userOwnDept = userOwnDeptName
            ? allDepts.find(d => d.department_name &&
                d.department_name.toLowerCase() === userOwnDeptName.toLowerCase())
            : null;

          // For primary company: ensure own dept is always in granted list
          const finalGranted = userOwnDept && !alreadyGranted.includes(userOwnDept.id)
            ? [...alreadyGranted, userOwnDept.id]
            : alreadyGranted;

          setDepts(allDepts);
          setGrantedDeptIds(finalGranted);
          // Lock user's own dept only for primary company
          setUserOwnDeptId(userOwnDept?.id || null);
        }
        setLoadingDepts(false);
      });
  }, [selectedUser, activeCompany]);

  const toggleDept = (id) => {
    // User's own department is permanent — cannot be removed
    if (id === userOwnDeptId) return;
    setGrantedDeptIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!selectedUser || !activeCompany) return;
    setSaving(true);
    try {
      // Primary company: always include own dept in saved list (safety net)
      const finalDeptIds = (activeCompany.is_primary_company && userOwnDeptId && !grantedDeptIds.includes(userOwnDeptId))
        ? [...grantedDeptIds, userOwnDeptId]
        : grantedDeptIds;
      const res = await fetch(`${API}/user-dept-access/bulk-set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUser.id, company_id: activeCompany.company_id, department_ids: finalDeptIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || "Save failed");
      showToast("Department access saved ✓");
      const { data: comps } = await safeFetch(`${API}/user-dept-access/user/${selectedUser.id}/companies${currentUserId ? `?current_user_id=${currentUserId}` : ''}`);
      if (comps) {
        setUserCompanies(comps);
        // Keep the same company selected — refresh activeCompany from new data
        if (activeCompany) {
          const refreshed = comps.find(c => c.company_id === activeCompany.company_id);
          if (refreshed) setActiveCompany(refreshed);
        }
      }
      const { data: updatedUsers } = await safeFetch(`${API}/user-dept-access/companies/${selectedCompany.id}/users`);
      if (updatedUsers) { setUsers(updatedUsers); const uu = updatedUsers.find(u => u.id === selectedUser.id); if (uu) setSelectedUser(uu); }
    } catch (e) { showToast(e.message, false); }
    finally { setSaving(false); }
  };

  const grantedDepts = depts.filter(d => grantedDeptIds.includes(d.id));

  return (
    // ── Outer: fill parent, no scroll — same pattern as RoleAccessForCompaniesPlant
    <div className="w-full h-full flex flex-col overflow-hidden rounded-lg shadow-md"
      style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", color: C.text, background: "#131929" }}>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(3px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 9999, padding: "12px 24px", borderRadius: 8,
          background: toast.ok ? C.greenSoft : C.redSoft,
          color: toast.ok ? C.green : C.red,
          border: `1px solid ${toast.ok ? C.green : C.red}44`,
          fontSize: 12, fontWeight: 600,
          boxShadow: "0 8px 32px #0009",
        }}>{toast.msg}</div>
      )}

      {/* ── Fixed Header — matches RoleAccessForCompaniesPlant exactly ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between border-b border-gray-600"
        style={{
          height: "24px",
          padding: "0 10px",
          background: "linear-gradient(to right, #374151, #60a5fa)",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>
          👥 User Department Data Access
        </span>
        <span style={{ fontSize: 9, color: "#e2e8f0aa" }}>
          Manage which departments' data each user can see
        </span>
      </div>

      {/* ── 3-column body — fills remaining height, no outer scroll ── */}
      <div style={{
        flex: 1, minHeight: 0,
        display: "grid",
        gridTemplateColumns: "210px 230px 1fr",
        overflow: "hidden",
      }}>

        {/* ══ COL 1: Companies ══════════════════════════════════════════ */}
        <div style={{ borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "7px 11px", borderBottom: `1px solid ${C.border}`, fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>
            Companies
          </div>
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {loadingCompanies ? <div style={{ padding: 16, textAlign: "center" }}><Spinner /></div>
              : companiesErr ? <ErrBox msg={companiesErr} />
              : companies.length === 0 ? <EmptyState icon="🏢" msg="No companies" />
              : companies.map(c => (
                <button key={c.id} onClick={() => setSelectedCompany(c)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "8px 11px",
                  border: "none", borderBottom: `1px solid ${C.border}22`,
                  cursor: "pointer", textAlign: "left",
                  color: selectedCompany?.id === c.id ? C.accent : C.text,
                  background: selectedCompany?.id === c.id ? C.accentSoft : "transparent",
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{c.company_name}</div>
                    {c.company_code && <div style={{ fontSize: 9, color: C.muted }}>{c.company_code}</div>}
                  </div>
                  <Badge>{c.user_count}</Badge>
                </button>
              ))}
          </div>
        </div>

        {/* ══ COL 2: Users ══════════════════════════════════════════════ */}
        <div style={{ borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "7px 11px", borderBottom: `1px solid ${C.border}`, fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedCompany ? `Users — ${selectedCompany.company_name}` : "Select a Company"}
          </div>
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {!selectedCompany ? <EmptyState icon="←" msg="Select a company first" />
              : loadingUsers ? <div style={{ padding: 16, textAlign: "center" }}><Spinner /></div>
              : usersErr ? <ErrBox msg={usersErr} />
              : users.length === 0 ? <EmptyState icon="👤" msg="No users found" />
              : users.map(u => (
                <button key={u.id} onClick={() => setSelectedUser(u)} style={{
                  display: "flex", alignItems: "flex-start", gap: 7,
                  width: "100%", padding: "8px 11px",
                  border: "none", borderBottom: `1px solid ${C.border}22`,
                  cursor: "pointer", textAlign: "left",
                  color: selectedUser?.id === u.id ? C.accent : C.text,
                  background: selectedUser?.id === u.id ? C.accentSoft : "transparent",
                }}>
                  <Avatar name={u.full_name} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {u.full_name}
                      {u.is_primary_company && <span style={{ marginLeft: 4, fontSize: 8, color: C.yellow, background: C.yellowSoft, padding: "1px 3px", borderRadius: 2, fontWeight: 700 }}>PRI</span>}
                    </div>
                    <div style={{ fontSize: 9, color: C.muted }}>{u.role_name || "—"} · {u.dept_name || "—"}</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {u.granted_dept_count > 0
                      ? <Badge color={C.green} bg={C.greenSoft}>{u.granted_dept_count}</Badge>
                      : <Badge color={C.red} bg={C.redSoft}>✕</Badge>}
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* ══ COL 3: Detail + Dept Access ═══════════════════════════════ */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!selectedUser
            ? <EmptyState icon="" msg="Select a company and user to manage department data access" />
            : loadingUserCompanies
            ? <div style={{ padding: 36, textAlign: "center" }}><Spinner /></div>
            : (
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0, animation: "fadeIn 0.2s ease" }}>

                {/* User info */}
                <div style={{ padding: "9px 13px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 9 }}>
                  <Avatar name={userDetail?.full_name} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{userDetail?.full_name || selectedUser.full_name}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>
                      {userDetail?.email || selectedUser.email}
                      {(userDetail?.phone || selectedUser.phone) && ` · ${userDetail?.phone || selectedUser.phone}`}
                    </div>
                  </div>
                  <Badge
                    color={(userDetail?.is_active ?? selectedUser.is_active) ? C.green : C.red}
                    bg={(userDetail?.is_active ?? selectedUser.is_active) ? C.greenSoft : C.redSoft}
                  >
                    {(userDetail?.is_active ?? selectedUser.is_active) ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Companies */}
                <div style={{ padding: "9px 13px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 7 }}>
                    Companies this user has access to
                    <span style={{ marginLeft: 5, color: C.textDim, fontWeight: 400, textTransform: "none", fontSize: 9 }}>— click to set dept access</span>
                  </div>
                  {userCompaniesErr ? <ErrBox msg={userCompaniesErr} />
                    : userCompanies.length === 0 ? <div style={{ fontSize: 10, color: C.muted }}>No companies found</div>
                    : userCompanies.map(uc => {
                      const isActive = activeCompany?.company_id === uc.company_id;
                      return (
                        <button key={uc.company_id} onClick={() => setActiveCompany(uc)} style={{
                          display: "flex", alignItems: "center", gap: 7,
                          width: "100%", padding: "7px 9px", marginBottom: 4,
                          borderRadius: 7, cursor: "pointer", textAlign: "left",
                          border: `1.5px solid ${isActive ? C.accent : C.border}`,
                          background: isActive ? C.accentSoft : C.card,
                          color: isActive ? C.accent : C.text,
                        }}>
                          <div style={{ width: 24, height: 24, borderRadius: 5, flexShrink: 0, background: isActive ? C.accent + "33" : C.border + "44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🏢</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 700 }}>{uc.company_name}</span>
                              {uc.is_primary_company && <span style={{ fontSize: 8, color: C.yellow, background: C.yellowSoft, padding: "1px 3px", borderRadius: 2, fontWeight: 700 }}>PRIMARY</span>}
                              {isActive && <span style={{ fontSize: 8, color: C.accent, background: C.accentSoft, padding: "1px 4px", borderRadius: 2, fontWeight: 700 }}>SELECTED</span>}
                            </div>
                            <div style={{ fontSize: 9, color: C.textDim }}>
                              Role: <b style={{ color: isActive ? C.accent : C.text }}>{uc.role_name || "—"}</b>
                              {" · "}Dept: <b style={{ color: isActive ? C.accent : C.text }}>{uc.department_name || "—"}</b>
                              {" · "}Desg: <b style={{ color: isActive ? C.accent : C.text }}>{uc.designation_name || "—"}</b>
                            </div>
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            {uc.granted_dept_count > 0
                              ? <Badge color={C.green} bg={C.greenSoft}>{uc.granted_dept_count} depts</Badge>
                              : <Badge color={C.red} bg={C.redSoft}>No access</Badge>}
                          </div>
                        </button>
                      );
                    })}
                </div>

                {/* Dept picker */}
                {!activeCompany
                  ? <div style={{ padding: "16px 13px", color: C.muted, fontSize: 11, textAlign: "center" }}>↑ Select a company above to manage department access</div>
                  : loadingDepts ? <div style={{ padding: 24, textAlign: "center" }}><Spinner /></div>
                  : deptsErr ? <ErrBox msg={deptsErr} />
                  : (
                    <div style={{ padding: "10px 13px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>
                        Department Data Access
                        <span style={{ marginLeft: 5, color: C.accent, fontWeight: 400, textTransform: "none", fontSize: 10 }}>for {activeCompany.company_name}</span>
                      </div>
                      <p style={{ fontSize: 10, color: C.muted, margin: "0 0 8px" }}>
                        Select departments' data this user can see in <b style={{ color: C.text }}>{activeCompany.company_name}</b>.
                        {activeCompany.is_primary_company && userOwnDeptId && (
                          <span style={{ color: C.yellow }}> 🔒 Own dept is always granted.</span>
                        )}
                      </p>

                      {/* Granted tags */}
                      <div style={{ minHeight: 32, padding: "5px 7px", marginBottom: 8, background: C.card, borderRadius: 7, border: `1px solid ${C.border}` }}>
                        {grantedDepts.length === 0
                          ? <span style={{ fontSize: 10, color: C.muted }}>No departments selected — user will see no data</span>
                          : grantedDepts.map(d => {
                              const isOwn = d.id === userOwnDeptId;
                              return isOwn ? (
                                // Own dept of primary company — locked, cannot remove
                                <span key={d.id} style={{
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                  padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  color: C.yellow, background: C.yellowSoft,
                                  border: `1px solid ${C.yellow}44`, margin: "2px",
                                }}>
                                  🔒 {d.department_name}
                                  <span style={{ fontSize: 9, fontWeight: 400, color: C.yellow, opacity: 0.7 }}>own</span>
                                </span>
                              ) : (
                                <Tag key={d.id} onRemove={() => toggleDept(d.id)}>{d.department_name}</Tag>
                              );
                            })}
                      </div>

                      {/* Toggle buttons */}
                      {depts.length === 0
                        ? <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>No departments registered for this company</div>
                        : (
                          <>
                            <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 }}>
                              Departments · click to grant / revoke
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                              {depts.map(d => {
                                const granted = grantedDeptIds.includes(d.id);
                                const isOwn   = d.id === userOwnDeptId;
                                return (
                                  <button key={d.id} onClick={() => toggleDept(d.id)}
                                    title={isOwn ? "This is the user's own department — always granted" : ""}
                                    style={{
                                      padding: "3px 10px", borderRadius: 5,
                                      fontSize: 10, fontWeight: 500,
                                      cursor: isOwn ? "not-allowed" : "pointer",
                                      border: `1px solid ${isOwn ? C.yellow : granted ? C.green : C.border}`,
                                      background: isOwn ? C.yellowSoft : granted ? C.greenSoft : C.card,
                                      color: isOwn ? C.yellow : granted ? C.green : C.textDim,
                                      opacity: isOwn ? 0.85 : 1,
                                    }}>
                                    {isOwn ? "🔒 " : granted ? "✓ " : ""}{d.department_name}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}

                      {/* Save */}
                      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                        <button onClick={handleSave} disabled={saving} style={{
                          padding: "6px 18px", borderRadius: 7,
                          background: C.accent, color: "#fff",
                          border: "none", cursor: saving ? "not-allowed" : "pointer",
                          fontSize: 11, fontWeight: 600, opacity: saving ? 0.7 : 1,
                          display: "flex", alignItems: "center", gap: 5,
                        }}>
                          {saving ? <><Spinner /> Saving…</> : "Save Access"}
                        </button>
                        <span style={{ fontSize: 10, color: C.muted }}>
                          {grantedDeptIds.length} dept{grantedDeptIds.length !== 1 ? "s" : ""} selected
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            )}
        </div>

      </div>

      {/* ── Bottom bar — matches RoleAccessForCompaniesPlant exactly ── */}
      <div className="px-2.5 border-t border-gray-600 flex-shrink-0 rounded-b-lg"
        style={{ height: '8px', background: 'linear-gradient(to right, #60a5fa, #374151)' }} />
    </div>
  );
}