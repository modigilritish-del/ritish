/**
 * InventoryPagePopup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Popup that renders the RenderItemMasterInventory page as-is.
 * Used by WorkflowDashboard for the "Item Master Inventory" node.
 *
 * Props:
 *   onClose  — callback to close the popup
 *
 * Zero changes to any other file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import RenderItemMasterInventory from './RenderItemMasterInventory';
import { HDR, FTR } from './workflowConstants';

export default function InventoryPagePopup({ onClose }) {

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    /* ── Overlay ── */
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        backdropFilter: 'blur(3px)',
      }}
    >
      {/* ── Modal box ── */}
      <div
        style={{
          width: '92vw',
          maxWidth: 900,
          height: '88vh',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{ ...HDR, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>📦</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Item Master Inventory</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: 3,
              fontSize: 10,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <X size={11} /> Close
          </button>
        </div>

        {/* ── RenderItemMasterInventory page — RBAC ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
          <RenderItemMasterInventory />
        </div>

        {/* ── Footer ── */}
        <div style={{ ...FTR, flexShrink: 0 }} />
      </div>
    </div>
  );
}