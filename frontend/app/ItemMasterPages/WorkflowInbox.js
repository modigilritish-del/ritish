/**
 * WorkflowInbox.js  –  ItemMasterPages/
 * ─────────────────────────────────────────────────────────────────
 * Universal Approver Inbox.
 * Any user with approval rights sees their pending items here.
 * They can Approve / Reject / Return from this page.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, CornerUpLeft, MessageSquare,
  RefreshCw, Clock, AlertCircle, Eye, Filter
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const getSession = () => {
  try { const d = JSON.parse(sessionStorage.getItem('userData') || '{}'); return d?.user || null; }
  catch { return null; }
};

const STATUS_COLOR = {
  PENDING:   { bg: '#fef3c7', color: '#92400e' },
  IN_REVIEW: { bg: '#dbeafe', color: '#1d4ed8' },
  APPROVED:  { bg: '#dcfce7', color: '#14532d' },
  REJECTED:  { bg: '#fee2e2', color: '#991b1b' },
  RETURNED:  { bg: '#fde8d8', color: '#9a3412' },
  CANCELLED: { bg: '#f3f4f6', color: '#6b7280' },
};

const Toast = ({ toast }) => {
  if (!toast) return null;
  const bg = toast.type === 'success' ? '#16a34a' : '#dc2626';
  return (
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: bg, color: '#fff', padding: '10px 20px', borderRadius: 6, zIndex: 99999, fontSize: 12, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,.3)' }}>
      {toast.msg}
    </div>
  );
};

export default function WorkflowInbox() {
  const user = getSession();
  const userId = user?.id;

  const [inbox, setInbox]       = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [filter, setFilter]     = useState('');      // entity_type filter
  const [selected, setSelected] = useState(null);    // InboxItem for action
  const [detail, setDetail]     = useState(null);    // full timeline for selected
  const [actionForm, setActionForm] = useState({ action_type: '', comments: '' });
  const [toast, setToast]       = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const loadInbox = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Load templates for dynamic entity type filter
      const [inboxRes, tmplRes] = await Promise.all([
        fetch(`${API_BASE}/workflow/inbox/${userId}${filter ? `?entity_type=${filter}` : ''}`),
        fetch(`${API_BASE}/workflow/templates/?is_active=true`),
      ]);
      const [inboxData, tmplData] = await Promise.all([inboxRes.json(), tmplRes.json()]);
      setInbox(Array.isArray(inboxData) ? inboxData : []);
      setTemplates(Array.isArray(tmplData) ? tmplData : []);
    } catch { showToast('Failed to load inbox', 'error'); }
    finally { setLoading(false); }
  }, [userId, filter]);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  const loadDetail = async (item) => {
    setSelected(item);
    try {
      const res = await fetch(`${API_BASE}/workflow/timeline/${item.entity_type}/${item.entity_id}`);
      const data = await res.json();
      setDetail(data);
    } catch { setDetail(null); }
  };

  const submitAction = async () => {
    if (!actionForm.action_type) { showToast('Select an action', 'error'); return; }
    if (!actionForm.comments.trim() && actionForm.action_type !== 'APPROVE') {
      showToast('Please add a comment', 'error'); return;
    }
    try {
      const res = await fetch(`${API_BASE}/workflow/action/${selected.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: actionForm.action_type, performed_by: userId, comments: actionForm.comments }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      showToast(`Action ${actionForm.action_type} submitted successfully`);
      setSelected(null);
      setDetail(null);
      setActionForm({ action_type: '', comments: '' });
      loadInbox();
    } catch (e) { showToast(e.message, 'error'); }
  };

  // ─── Header ─────────────────────────────────────────────────────
  const renderHeader = () => (
    <div>
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>📥 Approval Inbox</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 10 }}>
            <option value="">All Types</option>
            {templates.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
          </select>
          <button onClick={loadInbox} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>
      <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 4 }} />
    </div>
  );

  // ─── Inbox list ──────────────────────────────────────────────────
  const renderInbox = () => (
    <div style={{ padding: 16 }}>
      {loading && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 30 }}>Loading inbox…</div>}
      {!loading && inbox.length === 0 && (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <CheckCircle size={36} color="#d1d5db" style={{ margin: '0 auto 8px', display: 'block' }} />
          <p style={{ color: '#9ca3af', fontSize: 12 }}>No pending approvals. You're all caught up!</p>
        </div>
      )}
      {inbox.map(item => (
        <div key={item.step_instance_id}
          style={{ border: `1px solid ${selected?.step_instance_id === item.step_instance_id ? '#3b82f6' : '#e5e7eb'}`, borderRadius: 8, marginBottom: 10, overflow: 'hidden', cursor: 'pointer', transition: 'border-color .15s' }}
          onClick={() => loadDetail(item)}>
          <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f' }}>
                  {item.entity_type} #{item.entity_id}
                </span>
                <span style={{ fontSize: 10, ...STATUS_COLOR[item.instance_status] || STATUS_COLOR.PENDING, padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>
                  {item.instance_status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#6b7280' }}>
                <span>📌 Step {item.step_order}: <b style={{ color: '#374151' }}>{item.step_name}</b></span>
                {item.submitted_by_name && <span>👤 By: <b style={{ color: '#374151' }}>{item.submitted_by_name}</b></span>}
                {item.submitted_at && <span>🕐 {new Date(item.submitted_at).toLocaleDateString()}</span>}
                {item.due_at && <span style={{ color: '#dc2626' }}>⏰ Due: {new Date(item.due_at).toLocaleDateString()}</span>}
              </div>
            </div>
            <button onClick={e => { e.stopPropagation(); loadDetail(item); }}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Eye size={11} /> Review
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Side panel: detail + action form ────────────────────────────
  const renderDetailPanel = () => {
    if (!selected) return null;
    return (
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, background: '#fff', boxShadow: '-4px 0 20px rgba(0,0,0,.15)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Panel header */}
        <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Review: {selected.entity_type} #{selected.entity_id}</span>
          <button onClick={() => { setSelected(null); setDetail(null); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
          {/* Current step */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: 10, marginBottom: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', marginBottom: 2 }}>CURRENT STEP</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f' }}>Step {selected.step_order}: {selected.step_name}</p>
          </div>

          {/* Timeline */}
          {detail && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase' }}>Workflow Timeline</p>
              {detail.steps?.map(step => (
                <div key={step.step_order} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: step.status === 'APPROVED' ? '#16a34a' : step.status === 'REJECTED' ? '#dc2626' : step.status === 'RETURNED' ? '#f97316' : '#d1d5db', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    {step.step_order}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#1e3a5f' }}>{step.step_name}</span>
                      <span style={{ fontSize: 9, ...STATUS_COLOR[step.status] || {}, padding: '1px 5px', borderRadius: 8 }}>{step.status}</span>
                    </div>
                    {step.actions?.length > 0 && step.actions.map(a => (
                      <p key={a.id} style={{ fontSize: 9, color: '#6b7280', margin: '2px 0' }}>
                        💬 {a.action_type} by {a.performer?.full_name || `User #${a.performed_by}`}{a.comments ? `: ${a.comments}` : ''}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action form */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Take Action</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[
                { type: 'APPROVE', label: '✅ Approve', bg: '#16a34a' },
                { type: 'REJECT',  label: '❌ Reject',  bg: '#dc2626' },
                { type: 'RETURN',  label: '↩ Return',   bg: '#f97316' },
              ].map(btn => (
                <button key={btn.type}
                  onClick={() => setActionForm(f => ({ ...f, action_type: btn.type }))}
                  style={{ flex: 1, padding: '6px 4px', background: actionForm.action_type === btn.type ? btn.bg : '#f3f4f6', color: actionForm.action_type === btn.type ? '#fff' : '#374151', border: `1px solid ${actionForm.action_type === btn.type ? btn.bg : '#d1d5db'}`, borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                  {btn.label}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Comments (required for Reject/Return)"
              value={actionForm.comments}
              onChange={e => setActionForm(f => ({ ...f, comments: e.target.value }))}
              rows={3}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: 6, fontSize: 11, resize: 'vertical', boxSizing: 'border-box' }}
            />
            <button onClick={submitAction}
              style={{ width: '100%', marginTop: 8, padding: '7px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Submit Action
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, background: '#f8fafc', minHeight: '100vh' }}>
      <Toast toast={toast} />
      {renderHeader()}
      {renderInbox()}
      {renderDetailPanel()}
    </div>
  );
}