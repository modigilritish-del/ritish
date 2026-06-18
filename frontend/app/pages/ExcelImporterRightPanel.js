import React, { useState } from 'react';
import { Search, Calendar, FileSpreadsheet, Save } from 'lucide-react';
import ExcelImportToDB from './ExcelImportToDB';

const ExcelImporterRightPanel = () => {
  const [isActive, setIsActive] = useState(true);

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">

      {/* ── Header (same as ItemMasterRightPanel) ── */}
      <div
        className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white"
        style={{ height: '24px', paddingRight: '8px' }}
      >
        <h2 className="m-0 text-xs font-semibold">Excel Importer 📥</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>

            <button title="Today" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
              <Calendar size={14} />
            </button>

            <button title="Export to Excel" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
              <FileSpreadsheet size={14} />
            </button>

            <button title="Search" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
              <Search size={14} />
            </button>

            {/* Refresh */}
            <button title="Refresh" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </button>

            <button title="Save" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
              <Save size={14} />
            </button>

            {/* Help */}
            <button title="Help" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
          </div>

          {/* Active / Inactive toggle */}
          <button
            onClick={() => setIsActive(!isActive)}
            style={{
              padding: '2px 12px',
              background: isActive ? '#10b981' : '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 500,
              height: '18px',
              lineHeight: '14px',
            }}
          >
            {isActive ? 'Active' : 'Inactive'}
          </button>
        </div>
      </div>

      {/* ── Search bar (same as ItemMasterRightPanel) ── */}
      <div className="px-2.5 py-2 border-b border-gray-200">
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder="Search all columns"
            style={{
              width: '100%',
              padding: '6px 32px 6px 10px',
              fontSize: '11px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              outline: 'none',
            }}
          />
          <Search size={14} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        </div>
      </div>

      {/* ── ExcelImportToDB content ── */}
      <div className="flex-1 overflow-auto">
        <ExcelImportToDB />
      </div>

      {/* ── Footer (same as ItemMasterRightPanel) ── */}
      <div
        className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700"
        style={{ height: '8px' }}
      />
    </div>
  );
};

export default ExcelImporterRightPanel;
