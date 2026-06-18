/**
 * CustomFieldsPagePopup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Popup that renders all three Custom Fields pages in tabs:
 *   • Breez Custom Fields
 *   • Sonata Custom Fields
 *   • Sweet Nutrition Custom Fields
 *
 * Used by WorkflowDashboard for the "Custom Fields" node.
 *
 * Props:
 *   onClose        — callback to close the popup
 *   mappingRecord  — passed through to all three components (can be null)
 *
 * Zero changes to any other file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import BreezCustomFields         from './BreezCustomFields';
import SonataCustomFields        from './SonataCustomFields';
import SweetNutritionCustomFields from './SweetNutritionCustomFields';
import { HDR, FTR } from './workflowConstants';

const TABS = [
  { key: 'breez',  label: '🏭 Breez',         Component: BreezCustomFields },
  { key: 'sonata', label: '🎵 Sonata',         Component: SonataCustomFields },
  { key: 'sweet',  label: '🍬 Sweet Nutrition', Component: SweetNutritionCustomFields },
];

export default function CustomFieldsPagePopup({ onClose, mappingRecord = null }) {
  const [activeTab, setActiveTab] = useState('breez');

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const activeComponent = TABS.find(t => t.key === activeTab)?.Component;

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
        zIndex: 999999,
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
            <span style={{ fontSize: 13 }}>🗂️</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Custom Fields</span>
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

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex',
          gap: 2,
          padding: '6px 14px 0',
          borderBottom: '2px solid #e5e7eb',
          background: '#f8fafc',
          flexShrink: 0,
        }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '5px 16px',
                fontSize: 11,
                fontWeight: activeTab === tab.key ? 700 : 500,
                cursor: 'pointer',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
                background: activeTab === tab.key ? '#fff' : 'transparent',
                color: activeTab === tab.key ? '#1e3a5f' : '#6b7280',
                borderRadius: '4px 4px 0 0',
                marginBottom: -2,
                transition: 'all .15s',
              }}
              onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.color = '#374151'; }}
              onMouseLeave={e => { if (activeTab !== tab.key) e.currentTarget.style.color = '#6b7280'; }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Active tab content ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px', position: 'relative' }}>
          {activeComponent && React.createElement(activeComponent, { mappingRecord })}
        </div>

        {/* ── Footer ── */}
        <div style={{ ...FTR, flexShrink: 0 }} />
      </div>
    </div>
  );
}