/**
 * ItemMasterGLSelectionPagePopup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Popup that shows ALL posting GL accounts (is_postable = true)
 * across ALL companies accessible to the logged-in user.
 *
 * User is read from sessionStorage → userData.user  (same as AddGLMaster.jsx)
 *
 * Props:
 *   onClose       — callback to close the popup
 *   mappingRecord — optional; not used for user resolution anymore
 *
 * API:
 *   GET /finance/gl-accounts/by-user/{userId}?is_postable=true[&search=...]
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, CheckCircle2, Building2, Layers } from 'lucide-react';
import { HDR, FTR, API_BASE } from './workflowConstants';

// ─── debounce ────────────────────────────────────────────────────────────────
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function ItemMasterGLSelectionPagePopup({ onClose, mappingRecord = null }) {

  // ── Resolve userId from sessionStorage (same pattern as AddGLMaster.jsx) ──
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    try {
      const ud = sessionStorage.getItem('userData');
      if (ud) {
        const parsed = JSON.parse(ud);
        setUserId(parsed?.user?.id ?? null);
      }
    } catch {
      setUserId(null);
    }
  }, []);

  const [searchInput, setSearchInput] = useState('');
  const [glList,      setGlList]      = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [selectedGL,  setSelectedGL]  = useState(null);
  const [error,       setError]       = useState('');

  const debouncedSearch = useDebounce(searchInput, 280);
  const inputRef        = useRef(null);

  // ── Escape to close ───────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // ── Fetch ALL posting GLs for this user (all companies) ───────────────────
  const fetchGLs = useCallback(async (search = '') => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      // is_postable=true  → only posting GLs
      // NO company_id filter → all companies user has access to
      const params = new URLSearchParams({ is_postable: 'true' });
      if (search.trim()) params.append('search', search.trim());

      const res  = await fetch(`${API_BASE}/gl-accounts/by-user/${userId}?${params}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setGlList(Array.isArray(data.gl_accounts) ? data.gl_accounts : []);
    } catch (err) {
      setError(err.message || 'Could not load GL accounts');
      setGlList([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch on mount (once userId is ready) + on search change
  useEffect(() => {
    if (userId) fetchGLs(debouncedSearch);
  }, [userId, debouncedSearch, fetchGLs]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelect    = (gl) => setSelectedGL(prev => prev?.id === gl.id ? null : gl);
  const handleClear     = () => { setSearchInput(''); setSelectedGL(null); inputRef.current?.focus(); };
  const handleConfirm   = () => onClose(selectedGL);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 999999, backdropFilter: 'blur(3px)',
      }}
    >
      <div style={{
        width: 600, maxHeight: '88vh', background: '#fff', borderRadius: 14,
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{ ...HDR, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 40, flexShrink: 0, padding: '0 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 15 }}>🏦</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>GL Selection</span>
            <span style={{ fontSize: 9, fontWeight: 600, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 4, padding: '1px 7px', color: '#fff', letterSpacing: 0.5 }}>
              Item Code Creation
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={11} /> Close
          </button>
        </div>

        {/* ── Subheader ── */}
        <div style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11 }}>💡</span>
          <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>
            All posting GL accounts across all your companies are shown below.
          </span>
        </div>

        {/* ── No user warning ── */}
        {!userId && (
          <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: '#ef4444' }}>
            ⚠️ User session not found. Please login again.
          </div>
        )}

        {/* ── Search bar ── */}
        {userId && (
          <div style={{ padding: '12px 16px 8px', flexShrink: 0, borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #d1d5db', borderRadius: 8, padding: '0 12px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <Search size={13} color="#9ca3af" style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); if (selectedGL) setSelectedGL(null); }}
                placeholder="Search by GL Code or GL Name…"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, padding: '9px 0', color: '#111827', background: 'transparent' }}
                autoComplete="off"
                autoFocus
              />
              {searchInput && (
                <button onClick={handleClear} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <X size={13} color="#9ca3af" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── GL List ── */}
        {userId && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px 12px', fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                ⏳ Loading posting GL accounts…
              </div>
            ) : error ? (
              <div style={{ padding: '40px 12px', fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
                ⚠️ {error}
              </div>
            ) : glList.length === 0 ? (
              <div style={{ padding: '40px 12px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                No posting GL accounts found
              </div>
            ) : (
              <>
                {/* Count row */}
                <div style={{ padding: '5px 16px', background: '#f8fafc', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>
                    {glList.length} posting GL account{glList.length !== 1 ? 's' : ''}
                    {searchInput && ` matching "${searchInput}"`}
                  </span>
                </div>

                {glList.map((gl) => {
                  const isSelected = selectedGL?.id === gl.id;
                  return (
                    <div
                      key={gl.id}
                      onClick={() => handleSelect(gl)}
                      style={{
                        padding: '10px 16px', cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : 'transparent',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        transition: 'background .1s',
                        borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                      }}
                      onMouseEnter={e  => { if (!isSelected) e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={e  => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* GL code pill */}
                      <span style={{ marginTop: 2, flexShrink: 0, fontSize: 9, fontWeight: 700, background: isSelected ? '#bfdbfe' : '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '2px 6px', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
                        {gl.gl_code}
                      </span>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {gl.gl_name}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                          {gl.company?.name && (
                            <span style={{ fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Building2 size={9} /> {gl.company.name}
                            </span>
                          )}
                          {gl.gl_type?.type_name && (
                            <span style={{ fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Layers size={9} /> {gl.gl_type.type_name}
                            </span>
                          )}
                          {gl.gl_category?.category_name && (
                            <span style={{ fontSize: 10, color: '#9ca3af' }}>{gl.gl_category.category_name}</span>
                          )}
                          {gl.scope && (
                            <span style={{ fontSize: 9, fontWeight: 600, borderRadius: 3, padding: '1px 5px', color: gl.scope === 'Company-wide' ? '#7c3aed' : '#d97706', background: gl.scope === 'Company-wide' ? '#ede9fe' : '#fef3c7' }}>
                              {gl.scope}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected && <CheckCircle2 size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ── Selected GL summary ── */}
        {selectedGL && (
          <div style={{ background: '#f0fdf4', borderTop: '1px solid #bbf7d0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <CheckCircle2 size={15} color="#16a34a" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#15803d', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 }}>
                Selected GL Account
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <InfoPill label="Code"     value={selectedGL.gl_code} />
                <InfoPill label="Name"     value={selectedGL.gl_name} />
                {selectedGL.gl_type?.type_name         && <InfoPill label="Type"     value={selectedGL.gl_type.type_name} />}
                {selectedGL.gl_category?.category_name && <InfoPill label="Category" value={selectedGL.gl_category.category_name} />}
                {selectedGL.company?.name              && <InfoPill label="Company"  value={selectedGL.company.name} />}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer actions ── */}
        <div style={{ ...FTR, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '8px 16px', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '6px 18px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedGL}
            style={{ padding: '6px 20px', fontSize: 11, fontWeight: 700, cursor: selectedGL ? 'pointer' : 'not-allowed', border: 'none', borderRadius: 6, background: selectedGL ? '#fff' : 'rgba(255,255,255,0.25)', color: selectedGL ? '#1e3a5f' : 'rgba(255,255,255,0.5)', transition: 'all .15s' }}
          >
            ✅ Confirm GL
          </button>
        </div>

      </div>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 8, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>{value}</span>
    </div>
  );
}