/**
 * WorkflowStatusBadge.js  –  ItemMasterPages/
 * ─────────────────────────────────────────────────────────────────
 * Lightweight embeddable component.
 * Drop this inside any page (e.g. ItemCodeCreationReq.js list table)
 * to show live workflow status + submit button for drafts.
 *
 * Usage:
 *   <WorkflowStatusBadge entityType="ITEM_CREATION" entityId={rec.id}
 *     userId={user.id} onSubmitted={() => reload()} />
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, CornerUpLeft, Send, Bell, RefreshCw, X, Filter } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const STATUS_META = {
  NOT_SUBMITTED: { label: 'Not Submitted', bg: '#f3f4f6', color: '#6b7280', icon: '📝' },
  DRAFT:         { label: 'Draft',          bg: '#f3f4f6', color: '#6b7280', icon: '📝' },
  PENDING:       { label: 'Pending',        bg: '#fef3c7', color: '#92400e', icon: '⏳' },
  IN_REVIEW:     { label: 'In Review',      bg: '#dbeafe', color: '#1d4ed8', icon: '🔍' },
  APPROVED:      { label: 'Approved',       bg: '#dcfce7', color: '#14532d', icon: '✅' },
  REJECTED:      { label: 'Rejected',       bg: '#fee2e2', color: '#991b1b', icon: '❌' },
  RETURNED:      { label: 'Returned',       bg: '#fde8d8', color: '#9a3412', icon: '↩️' },
  CANCELLED:     { label: 'Cancelled',      bg: '#f3f4f6', color: '#6b7280', icon: '🚫' },
};

export function WorkflowStatusBadge({ entityType = 'ITEM_CREATION', entityId, userId, onSubmitted }) {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]     = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

  const loadStatus = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workflow/status/${entityType}/${entityId}`);
      const data = await res.json();
      setStatus(data);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { loadStatus(); }, [entityId]);

  const submitToWorkflow = async () => {
    if (!entityId || !userId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/workflow/submit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_code: entityType,
          entity_type:   entityType,
          entity_id:     entityId,
          submitted_by:  userId,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Error'); }
      showToast('Request submitted for approval!');
      loadStatus();
      if (onSubmitted) onSubmitted();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  if (!entityId) return null;
  if (loading) return <span style={{ fontSize: 10, color: '#9ca3af' }}>…</span>;

  const s = status?.status || 'NOT_SUBMITTED';
  const m = STATUS_META[s] || STATUS_META.NOT_SUBMITTED;
  const canSubmit = s === 'NOT_SUBMITTED' || s === 'DRAFT' || s === 'RETURNED';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {toast && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: toast.type === 'success' ? '#16a34a' : '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: 6, zIndex: 99999, fontSize: 11, fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}
      <span style={{ background: m.bg, color: m.color, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {m.icon} {m.label}
      </span>
      {canSubmit && (
        <button onClick={submitToWorkflow} disabled={submitting}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 10, cursor: submitting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 3, opacity: submitting ? 0.7 : 1 }}>
          <Send size={9} /> {submitting ? 'Submitting…' : 'Submit'}
        </button>
      )}
    </div>
  );
}


/**
 * WorkflowSubmitButton.js
 * Full-size submit button — use in ItemCodeCreationReq form
 * after a record is saved, to submit it to the approval workflow.
 */
export function WorkflowSubmitButton({ entityType = 'ITEM_CREATION', entityId, userId, onDone }) {
  const [status, setStatus]     = useState(null);
  const [submitting, setSub]    = useState(false);
  const [toast, setToast]       = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    if (!entityId) return;
    fetch(`${API_BASE}/workflow/status/${entityType}/${entityId}`)
      .then(r => r.json()).then(setStatus).catch(() => {});
  }, [entityId]);

  const submit = async () => {
    setSub(true);
    try {
      const res = await fetch(`${API_BASE}/workflow/submit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_code: entityType, entity_type: entityType, entity_id: entityId, submitted_by: userId }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Submission failed'); }
      showToast('✅ Submitted for approval!');
      setStatus({ status: 'PENDING' });
      if (onDone) onDone();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSub(false); }
  };

  if (!entityId) return null;

  const s = status?.status;
  const submitted = s && !['NOT_SUBMITTED', 'DRAFT', 'RETURNED', null, undefined].includes(s);
  const m = STATUS_META[s] || STATUS_META.NOT_SUBMITTED;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {toast && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: toast.type === 'success' ? '#16a34a' : '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: 6, zIndex: 99999, fontSize: 11, fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}
      {submitted ? (
        <span style={{ background: m.bg, color: m.color, padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
          {m.icon} Workflow: {m.label}
        </span>
      ) : (
        <button onClick={submit} disabled={submitting}
          style={{ background: 'linear-gradient(to right, #16a34a, #15803d)', color: '#fff', border: 'none', borderRadius: 5, padding: '6px 16px', fontSize: 11, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: submitting ? 0.7 : 1 }}>
          <Send size={12} /> {submitting ? 'Submitting…' : '🚀 Submit for Approval'}
        </button>
      )}
    </div>
  );
}

/**
 * WorkflowNotificationsPage
 * ─────────────────────────────────────────────────────────────────
 * Full-page notifications center for a user.
 * Shows all workflow notifications (Approve / Reject / Return / Submit)
 * with mark-read, mark-all-read, and event-type filter.
 *
 * Usage:
 *   <WorkflowNotificationsPage userId={user.id} />
 */
export function WorkflowNotificationsPage({ userId, onUnreadChange, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [filter,        setFilter]        = useState('ALL');

  // Sync unreadCount to parent AFTER render — never during render
  useEffect(() => {
    if (onUnreadChange) onUnreadChange(unreadCount);
  }, [unreadCount]); // ALL | APPROVE | REJECT | RETURN | SUBMIT

  const EVENT_META = {
    APPROVE: { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7', icon: '✅', label: 'Approved'  },
    REJECT:  { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', icon: '❌', label: 'Rejected'  },
    RETURN:  { bg: '#fff7ed', color: '#92400e', border: '#fdba74', icon: '↩️', label: 'Returned'  },
    SUBMIT:  { bg: '#eff6ff', color: '#1e40af', border: '#93c5fd', icon: '📤', label: 'Submitted' },
  };

  const loadNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [nRes, uRes] = await Promise.all([
        fetch(`${API_BASE}/workflow/user-notifications/${userId}?limit=100`),
        fetch(`${API_BASE}/workflow/user-notifications/${userId}/unread`),
      ]);
      if (nRes.ok) setNotifications(await nRes.json());
      if (uRes.ok) {
        const d = await uRes.json();
        setUnreadCount(d.unread_count || 0);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  // SSE real-time connection — instant push when new notifications arrive
  useEffect(() => {
    if (!userId) return;

    // Initial load
    loadNotifications();

    // Open SSE stream
    const es = new EventSource(
      `${API_BASE}/workflow/user-notifications/${userId}/stream`
    );

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'notification') {
          // New notification arrived — reload full list + unread count
          loadNotifications();
        }
        // 'heartbeat' and 'connected' are silently ignored
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      // SSE disconnected — fallback to 30s polling until reconnect
      es.close();
      const fallback = setInterval(loadNotifications, 30000);
      return () => clearInterval(fallback);
    };

    return () => {
      es.close();
    };
  }, [userId]);

  const markRead = async (id) => {
    try {
      await fetch(`${API_BASE}/workflow/user-notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    if (!userId) return;
    try {
      await fetch(`${API_BASE}/workflow/user-notifications/${userId}/read-all`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const filtered = filter === 'ALL'
    ? notifications
    : notifications.filter(n => n.event === filter);

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 36, flexShrink: 0 }}>
        {/* Left: Bell + Title + unread badge */}
        <span style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bell size={13} />
          Notifications
          {unreadCount > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', borderRadius: 99, padding: '0 6px', fontSize: 9, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>

        {/* Right: Mark all read + X — spaced apart, never overlapping */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 4, padding: '3px 8px', fontSize: 9, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Mark all read
            </button>
          )}
          {onClose && (
            <button onClick={onClose}
              style={{
                background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(255,0,0,0.4)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #ff5555 0%, #dd0000 100%)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 }}>
        {['ALL', 'APPROVE', 'REJECT', 'RETURN', 'SUBMIT'].map(f => {
          const m  = EVENT_META[f];
          const cnt = f === 'ALL' ? notifications.length : notifications.filter(n => n.event === f).length;
          const unrd = f === 'ALL' ? unreadCount : notifications.filter(n => n.event === f && !n.is_read).length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                flex: 1, padding: '5px 4px', fontSize: 9, fontWeight: filter === f ? 700 : 500,
                background: filter === f ? '#fff' : 'transparent',
                color: filter === f ? (m?.color || '#111827') : '#6b7280',
                border: 'none', borderBottom: filter === f ? '2px solid #60a5fa' : '2px solid transparent',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                transition: 'all .12s',
              }}>
              <span>{m?.icon || '🔔'}</span>
              <span>{f === 'ALL' ? 'All' : m?.label}</span>
              {cnt > 0 && (
                <span style={{
                  background: unrd > 0 ? '#ef4444' : '#e5e7eb',
                  color: unrd > 0 ? '#fff' : '#6b7280',
                  borderRadius: 99, padding: '0 4px', fontSize: 8, fontWeight: 700, minWidth: 14, textAlign: 'center',
                }}>
                  {cnt}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Notifications list ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading && notifications.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>
            <RefreshCw size={20} color="#d1d5db" style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite' }} />
            Loading notifications…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>
            <Bell size={28} color="#e5e7eb" style={{ margin: '0 auto 10px', display: 'block' }} />
            {filter === 'ALL' ? 'No notifications yet' : `No ${EVENT_META[filter]?.label || filter} notifications`}
          </div>
        ) : (
          <div>
            {filtered.map(n => {
              const m = EVENT_META[n.event] || EVENT_META.SUBMIT;
              return (
                <div key={n.id}
                  onClick={() => { if (!n.is_read) markRead(n.id); }}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #f3f4f6',
                    background: n.is_read ? '#fff' : '#f0f9ff',
                    cursor: n.is_read ? 'default' : 'pointer',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => { if (!n.is_read) e.currentTarget.style.background = '#e0f2fe'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? '#fff' : '#f0f9ff'; }}>

                  {/* Event icon */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: m.bg, border: `1px solid ${m.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 15,
                  }}>
                    {m.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Unread dot + title */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: n.is_read ? 500 : 700, color: m.color, lineHeight: 1.35, flex: 1 }}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: 3 }} />
                      )}
                    </div>

                    {/* Body */}
                    {n.body && (
                      <p style={{ margin: '3px 0 0', fontSize: 10, color: '#6b7280', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                        {n.body}
                      </p>
                    )}

                    {/* Meta */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 5, fontSize: 9, color: '#9ca3af', alignItems: 'center', flexWrap: 'wrap' }}>
                      {n.trigger_user?.full_name && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          👤 {n.trigger_user.full_name}
                        </span>
                      )}
                      <span>🕐 {new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {n.is_read && <span style={{ color: '#bbf7d0' }}>✓ Read</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Summary footer ── */}
      <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '5px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: '#9ca3af' }}>
          Showing <strong style={{ color: '#374151' }}>{filtered.length}</strong> of <strong style={{ color: '#374151' }}>{notifications.length}</strong> notifications
        </span>
        {unreadCount > 0 && (
          <span style={{ fontSize: 9, color: '#3b82f6', fontWeight: 600 }}>
            {unreadCount} unread
          </span>
        )}
      </div>

      {/* Footer strip */}
      <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 6, flexShrink: 0 }} />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default WorkflowStatusBadge;