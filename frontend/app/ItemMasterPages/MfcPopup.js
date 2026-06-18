// MfcPopup.js — Mandatory Field Config popup + sub-components

import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { CLR, HDR, FTR, PAGE_FIELDS, API_BASE, getSession, apiFetch } from './workflowConstants';

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999,
      background: type === 'success' ? '#10b981' : '#ef4444',
      color: '#fff', padding: '10px 22px', borderRadius: 8, fontSize: 12, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,.3)',
    }}>
      {type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
      {msg}
    </div>
  );
}

// ─── Field toggle row ─────────────────────────────────────────────────────────
function FieldRow({ field, isMandatory, onToggle }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 12px',
      background: isMandatory ? '#fca5a544' : '#f9fafb',
      border: `1px solid ${isMandatory ? '#ef444455' : CLR.border}`,
      borderRadius: 6, marginBottom: 5, transition: 'all .15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: isMandatory ? CLR.mandatoryBorder : CLR.muted, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: isMandatory ? 700 : 400, color: isMandatory ? CLR.mandatoryText : CLR.text }}>
          {field.label}
        </span>
        {isMandatory && (
          <span style={{ fontSize: 9, fontWeight: 700, background: CLR.mandatory, color: CLR.mandatoryText, padding: '1px 6px', borderRadius: 99, border: `1px solid ${CLR.mandatoryBorder}44` }}>
            MANDATORY
          </span>
        )}
      </div>
      <button onClick={() => onToggle(field.field_key)}
        style={{ background: isMandatory ? CLR.mandatoryBorder : '#e5e7eb', border: 'none', borderRadius: 12, width: 36, height: 20, cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
        <div style={{ position: 'absolute', top: 2, left: isMandatory ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .15s' }} />
      </button>
    </div>
  );
}

// ─── Audit Log Panel ──────────────────────────────────────────────────────────
function AuditLogPanel({ logs, loading }) {
  if (loading) return <div style={{ padding: 20, textAlign: 'center', color: CLR.muted, fontSize: 11 }}>Loading logs…</div>;
  if (!logs.length) return <div style={{ padding: 20, textAlign: 'center', color: CLR.muted, fontSize: 11 }}>No logs yet.</div>;
  return (
    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
      {logs.map(log => (
        <div key={log.id} style={{ borderBottom: `1px solid ${CLR.border}`, padding: '9px 12px', fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: log.change_type === 'CREATE' ? CLR.greenSoft : CLR.yellowSoft, color: log.change_type === 'CREATE' ? CLR.green : CLR.yellow }}>
              {log.change_type}
            </span>
            <span style={{ color: CLR.text, fontWeight: 600 }}>
              {log.performer?.full_name || log.performer?.username || `User #${log.performed_by}` || 'System'}
            </span>
            <span style={{ color: CLR.muted, fontSize: 10, marginLeft: 'auto' }}>
              {log.performed_at ? new Date(log.performed_at).toLocaleString('en-IN') : '—'}
            </span>
          </div>
          {log.changed_fields && Object.keys(log.changed_fields).length > 0 && (
            <div style={{ marginTop: 3 }}>
              {Object.entries(log.changed_fields).map(([k, v]) => (
                <div key={k} style={{ fontSize: 10, color: CLR.textSm, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, color: CLR.text }}>{k}</span>{': '}
                  <span style={{ color: v.old ? CLR.mandatoryBorder : CLR.muted, textDecoration: 'line-through' }}>{v.old ? 'Mandatory' : 'Optional'}</span>
                  {' → '}
                  <span style={{ color: v.new ? CLR.mandatoryBorder : CLR.green, fontWeight: 600 }}>{v.new ? 'Mandatory' : 'Optional'}</span>
                </div>
              ))}
            </div>
          )}
          {log.note && <div style={{ fontSize: 10, color: CLR.textSm, fontStyle: 'italic', marginTop: 3 }}>Note: {log.note}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── MFC Popup ────────────────────────────────────────────────────────────────
export default function MfcPopup({ pageKey, pageName, onClose }) {
  const user   = getSession();
  const userId = user?.id || null;

  const [companies,    setCompanies]    = useState([]);
  const [allConfigs,   setAllConfigs]   = useState([]);
  const [selCompany,   setSelCompany]   = useState('');
  const [selPlant,     setSelPlant]     = useState('');
  const [plants,       setPlants]       = useState([]);
  const [fieldState,   setFieldState]   = useState({});
  const [activeConfig, setActiveConfig] = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [note,         setNote]         = useState('');
  const [tab,          setTab]          = useState('fields');
  const [logs,         setLogs]         = useState([]);
  const [logsLoading,  setLogsLoading]  = useState(false);
  const [toast,        setToast]        = useState(null);
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const loadBase = useCallback(async () => {
    try {
      let comps = [];
      if (userId) {
        try { comps = await apiFetch(`${API_BASE}/item-creation-req/user/${userId}/companies-plants`); }
        catch { comps = []; }
      }
      const cfgs = await apiFetch(`${API_BASE}/mandatory-fields/`);
      setCompanies(Array.isArray(comps) ? comps : []);
      setAllConfigs(Array.isArray(cfgs) ? cfgs : []);
    } catch (e) { showToast(e.message, 'error'); }
  }, [userId]);

  useEffect(() => { loadBase(); }, [loadBase]);

  useEffect(() => {
    if (!selCompany) { setPlants([]); setSelPlant(''); return; }
    const comp = companies.find(c => String(c.id) === String(selCompany));
    setPlants(comp?.plants || []);
    setSelPlant('');
  }, [selCompany, companies]);

  useEffect(() => {
    const pageFields = PAGE_FIELDS[pageKey] || [];
    if (!selCompany) { setFieldState({}); setActiveConfig(null); return; }
    const cfg = allConfigs.find(c =>
      c.page_key === pageKey &&
      String(c.company_id) === String(selCompany) &&
      (selPlant ? String(c.plant_id) === String(selPlant) : !c.plant_id)
    );
    if (cfg) {
      const state = {};
      pageFields.forEach(f => { state[f.field_key] = false; });
      (cfg.fields_config || []).forEach(fc => { state[fc.field_key] = !!fc.is_mandatory; });
      setFieldState(state);
      setActiveConfig(cfg);
    } else {
      const state = {};
      pageFields.forEach(f => { state[f.field_key] = false; });
      setFieldState(state);
      setActiveConfig(null);
    }
  }, [selCompany, selPlant, allConfigs, pageKey]);

  useEffect(() => {
    if (tab !== 'log' || !activeConfig) return;
    setLogsLoading(true);
    apiFetch(`${API_BASE}/mandatory-fields/${activeConfig.id}/logs`)
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));
  }, [tab, activeConfig]);

  const toggleField = (key) => setFieldState(s => ({ ...s, [key]: !s[key] }));

  const saveConfig = async () => {
    if (!selCompany) return;
    setSaving(true);
    try {
      const pageFields = PAGE_FIELDS[pageKey] || [];
      const fields_config = pageFields.map(f => ({ field_key: f.field_key, label: f.label, is_mandatory: !!fieldState[f.field_key] }));
      if (activeConfig) {
        await apiFetch(`${API_BASE}/mandatory-fields/${activeConfig.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields_config, updated_by: userId, note: note || null }),
        });
        showToast('Config updated successfully');
      } else {
        await apiFetch(`${API_BASE}/mandatory-fields/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page_key: pageKey, page_label: pageName, company_id: Number(selCompany), plant_id: selPlant ? Number(selPlant) : null, fields_config, created_by: userId, note: note || null }),
        });
        showToast('Config created successfully');
      }
      setNote('');
      await loadBase();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const mandatoryCount = Object.values(fieldState).filter(Boolean).length;
  const totalFields    = Object.keys(fieldState).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(3px)' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div style={{ width: '92vw', maxWidth: 700, maxHeight: '70vh', background: CLR.surface, borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={HDR}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={13} color="#fff" />
            <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>⚙️ Mandatory Field Config — {pageName}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={11} /> Close
          </button>
        </div>

        {/* Scope selector */}
        <div style={{ padding: '10px 12px', background: '#f8fafc', borderBottom: `1px solid ${CLR.border}`, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px', minWidth: 170 }}>
            <label style={{ fontSize: 9, fontWeight: 700, color: CLR.muted, textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
              Company <span style={{ color: CLR.mandatoryBorder }}>*</span>
            </label>
            <select value={selCompany} onChange={e => setSelCompany(e.target.value)}
              style={{ width: '100%', padding: '5px 8px', fontSize: 11, border: `1px solid ${CLR.border}`, borderRadius: 5, background: '#fff', color: CLR.text, outline: 'none' }}>
              <option value="">— Select Company —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 180px', minWidth: 150 }}>
            <label style={{ fontSize: 9, fontWeight: 700, color: CLR.muted, textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
              Plant <span style={{ fontSize: 9, color: CLR.muted, fontWeight: 400, textTransform: 'none' }}>(optional)</span>
            </label>
            <select value={selPlant} onChange={e => setSelPlant(e.target.value)} disabled={!selCompany || plants.length === 0}
              style={{ width: '100%', padding: '5px 8px', fontSize: 11, border: `1px solid ${CLR.border}`, borderRadius: 5, background: (!selCompany || plants.length === 0) ? '#f3f4f6' : '#fff', color: CLR.text, outline: 'none' }}>
              <option value="">— All Plants —</option>
              {plants.map(p => <option key={p.id} value={p.id}>{p.plant_name || p.name}</option>)}
            </select>
          </div>
          {selCompany && (
            <div style={{ padding: '5px 10px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: activeConfig ? CLR.greenSoft : CLR.yellowSoft, color: activeConfig ? CLR.green : CLR.yellow, border: `1px solid ${activeConfig ? CLR.green : '#fde68a'}44`, alignSelf: 'flex-end' }}>
              {activeConfig ? `✅ Config ID: ${activeConfig.id}` : '🆕 New config'}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${CLR.border}`, background: '#fff', flexShrink: 0 }}>
          {[['fields', '⚙️ Fields'], ['log', '📋 Audit Log']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', color: tab === key ? CLR.primary : CLR.muted, borderBottom: tab === key ? `2px solid ${CLR.primary}` : '2px solid transparent', marginBottom: -1 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {tab === 'fields' && (
            !selCompany ? (
              <div style={{ textAlign: 'center', padding: 30, color: CLR.muted, fontSize: 11 }}>👆 Select a company above to configure mandatory fields.</div>
            ) : (
              <>
                <div style={{ marginBottom: 10, padding: '6px 12px', background: mandatoryCount > 0 ? '#fca5a533' : '#f9fafb', border: `1px solid ${mandatoryCount > 0 ? '#ef444444' : CLR.border}`, borderRadius: 5, fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, color: mandatoryCount > 0 ? CLR.mandatoryText : CLR.textSm }}>{mandatoryCount} of {totalFields} fields marked mandatory</span>
                  {mandatoryCount > 0 && <span style={{ fontSize: 9, color: CLR.mandatoryText }}>— highlighted in light red</span>}
                </div>
                {(PAGE_FIELDS[pageKey] || []).map(field => (
                  <FieldRow key={field.field_key} field={field} isMandatory={!!fieldState[field.field_key]} onToggle={toggleField} />
                ))}
                {(PAGE_FIELDS[pageKey] || []).length === 0 && (
                  <div style={{ textAlign: 'center', padding: 20, color: CLR.muted, fontSize: 11 }}>No field definitions found for this page.</div>
                )}
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 9, fontWeight: 700, color: CLR.muted, textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Change Note (optional)</label>
                  <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for this change…"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', fontSize: 11, border: `1px solid ${CLR.border}`, borderRadius: 5, outline: 'none', color: CLR.text }} />
                </div>
              </>
            )
          )}
          {tab === 'log' && (
            !activeConfig
              ? <div style={{ textAlign: 'center', padding: 30, color: CLR.muted, fontSize: 11 }}>No config saved yet — logs appear after first save.</div>
              : <AuditLogPanel logs={logs} loading={logsLoading} />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 14px', borderTop: `1px solid ${CLR.border}`, background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: CLR.muted }}>
            {activeConfig ? `Last updated: ${activeConfig.updated_at ? new Date(activeConfig.updated_at).toLocaleString('en-IN') : '—'}` : 'No config saved yet for this scope.'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', borderRadius: 4, padding: '4px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            {tab === 'fields' && selCompany && (PAGE_FIELDS[pageKey] || []).length > 0 && (
              <button onClick={saveConfig} disabled={saving}
                style={{ background: saving ? CLR.muted : '#10b981', border: 'none', color: '#fff', borderRadius: 4, padding: '4px 16px', fontSize: 11, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Save size={11} /> {saving ? 'Saving…' : activeConfig ? 'Update Config' : 'Save Config'}
              </button>
            )}
          </div>
        </div>

        <div style={FTR} />
      </div>
    </div>
  );
}