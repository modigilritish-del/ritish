/**
 * ItemCodeCreationPointPopup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Popup for "Item Code Creation Point" — shown after GL Selection in the
 * Basic Item Master Info workflow flow, and also available in the
 * ItemMasterWorkflowBuilderPopup as a draggable entity node.
 *
 * Style mirrors ItemMasterGLSelectionPagePopup exactly.
 *
 * Props:
 *   onClose       — callback to close the popup
 *   mappingRecord — optional; passed through (can be null)
 *
 * Zero changes to any other file needed beyond:
 *   WorkflowDashboard.js  — add state + render
 *   ItemMasterWorkflow.js — add node after GL Selection
 *   ItemMasterWorkflowBuilderPopup.js — add entity to basic-info group
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Tag, Package, Building2, CheckCircle2 } from 'lucide-react';
import { HDR, FTR, API_BASE } from './workflowConstants';

// ─── debounce ─────────────────────────────────────────────────────────────────
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ItemCodeCreationPointPopup({ onClose, mappingRecord = null }) {

  const [searchInput,   setSearchInput]   = useState('');
  const [items,         setItems]         = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [selectedItem,  setSelectedItem]  = useState(null);
  const [error,         setError]         = useState('');

  const debouncedSearch = useDebounce(searchInput, 280);
  const inputRef        = useRef(null);

  // ── Escape to close ───────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // ── Fetch item codes ───────────────────────────────────────────────────────
  const fetchItems = useCallback(async (search = '') => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      const res  = await fetch(`${API_BASE}/item-master/item-codes/?${params}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data.results ?? data) ? (data.results ?? data) : []);
    } catch (err) {
      setError(err.message || 'Could not load item codes');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(debouncedSearch); }, [debouncedSearch, fetchItems]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelect  = (item) => setSelectedItem(prev => prev?.id === item.id ? null : item);
  const handleClear   = () => { setSearchInput(''); setSelectedItem(null); inputRef.current?.focus(); };
  const handleConfirm = () => onClose();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 999999,
      }}
    >
      <div style={{
        width: 620, maxHeight: '88vh', background: '#fff', borderRadius: 14,
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          ...HDR,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 40, flexShrink: 0, padding: '0 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 15 }}>📦</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Item Code Creation Point</span>
            <span style={{
              fontSize: 9, fontWeight: 600,
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 4, padding: '1px 7px',
              color: '#fff', letterSpacing: 0.5,
            }}>
              Item Code · Creation
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', cursor: 'pointer', padding: '3px 10px',
              borderRadius: 4, fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <X size={11} /> Close
          </button>
        </div>

        {/* ── Subheader ── */}
        <div style={{
          background: '#eff6ff', borderBottom: '1px solid #bfdbfe',
          padding: '7px 16px', display: 'flex', alignItems: 'center',
          gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 11 }}>💡</span>
          <span style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600 }}>
            This is the point where item codes are created in the workflow. Select or search for an item code below.
          </span>
        </div>

        {/* ── Search bar ── */}
        <div style={{ padding: '12px 16px 8px', flexShrink: 0, borderBottom: '1px solid #f3f4f6' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid #d1d5db', borderRadius: 8, padding: '0 12px',
            background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <Search size={13} color="#9ca3af" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); if (selectedItem) setSelectedItem(null); }}
              placeholder="Search by Item Code or Item Name…"
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: 12, padding: '9px 0',
                color: '#111827', background: 'transparent',
              }}
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

        {/* ── Item List ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px 12px', fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
              ⏳ Loading item codes…
            </div>
          ) : error ? (
            <div style={{ padding: '40px 12px', fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
              ⚠️ {error}
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: '40px 12px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
              No item codes found
            </div>
          ) : (
            <>
              {/* Count row */}
              <div style={{ padding: '5px 16px', background: '#f8fafc', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>
                  {items.length} item code{items.length !== 1 ? 's' : ''}
                  {searchInput && ` matching "${searchInput}"`}
                </span>
              </div>

              {items.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
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
                    {/* Item code pill */}
                    <span style={{
                      marginTop: 2, flexShrink: 0, fontSize: 9, fontWeight: 700,
                      background: isSelected ? '#bfdbfe' : '#dbeafe',
                      color: '#1d4ed8', borderRadius: 4, padding: '2px 6px',
                      letterSpacing: 0.3, whiteSpace: 'nowrap',
                    }}>
                      {item.item_code ?? item.code ?? '—'}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600, color: '#111827',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {item.item_name ?? item.name ?? '—'}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                        {item.company?.company_name && (
                          <span style={{ fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Building2 size={9} /> {item.company.company_name}
                          </span>
                        )}
                        {item.item_type && (
                          <span style={{ fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Package size={9} /> {item.item_type}
                          </span>
                        )}
                        {item.item_category && (
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>{item.item_category}</span>
                        )}
                        {item.status && (
                          <span style={{
                            fontSize: 9, fontWeight: 600, borderRadius: 3, padding: '1px 5px',
                            color: item.status === 'Active' ? '#15803d' : '#d97706',
                            background: item.status === 'Active' ? '#dcfce7' : '#fef3c7',
                          }}>
                            {item.status}
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

        {/* ── Selected item summary ── */}
        {selectedItem && (
          <div style={{
            background: '#eff6ff', borderTop: '1px solid #bfdbfe',
            padding: '10px 16px', display: 'flex', alignItems: 'center',
            gap: 10, flexShrink: 0,
          }}>
            <CheckCircle2 size={15} color="#2563eb" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 }}>
                Selected Item Code
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <InfoPill label="Code"     value={selectedItem.item_code ?? selectedItem.code ?? '—'} />
                <InfoPill label="Name"     value={selectedItem.item_name ?? selectedItem.name ?? '—'} />
                {selectedItem.item_type     && <InfoPill label="Type"     value={selectedItem.item_type} />}
                {selectedItem.item_category && <InfoPill label="Category" value={selectedItem.item_category} />}
                {selectedItem.company?.company_name && <InfoPill label="Company" value={selectedItem.company.company_name} />}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer actions ── */}
        <div style={{
          ...FTR,
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          gap: 8, padding: '8px 16px', flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 18px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6,
              background: 'rgba(255,255,255,0.15)', color: '#fff',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedItem}
            style={{
              padding: '6px 20px', fontSize: 11, fontWeight: 700,
              cursor: selectedItem ? 'pointer' : 'not-allowed', border: 'none',
              borderRadius: 6,
              background: selectedItem ? '#fff' : 'rgba(255,255,255,0.25)',
              color: selectedItem ? '#1e3a5f' : 'rgba(255,255,255,0.5)',
              transition: 'all .15s',
            }}
          >
            ✅ Confirm Item Code
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── InfoPill ────────────────────────────────────────────────────────────────
function InfoPill({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 8, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>{value}</span>
    </div>
  );
}