import React, { useState, useEffect } from 'react';
import { Search, X, ChevronDown, AlertCircle, Calendar, FileSpreadsheet, Save } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const ItemMasterRightPanel = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchItemMasterData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredData(data);
    } else {
      const filtered = data.filter(item => 
        Object.values(item).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredData(filtered);
    }
  }, [searchTerm, data]);

  const fetchItemMasterData = async () => {
    try {
      setLoading(true);
      setError(null);
      setData([]);
      setFilteredData([]);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching item master data:', err);
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      <div className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white" style={{ height: '24px', paddingRight: '8px' }}>
        <h2 className="m-0 text-xs font-semibold">Item Master 📋</h2>
        
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
            <button title="Refresh" onClick={fetchItemMasterData} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </button>
            <button title="Save" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
              <Save size={14} />
            </button>
            <button title="Help" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
          </div>
          <button onClick={() => setIsActive(!isActive)} style={{ padding: '2px 12px', background: isActive ? '#10b981' : '#ef4444', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 500, height: '18px', lineHeight: '14px' }}>
            {isActive ? 'Active' : 'Inactive'}
          </button>
        </div>
      </div>

      <div className="px-2.5 py-2 border-b border-gray-200">
        <div style={{ position: 'relative', width: '100%' }}>
          <input type="text" placeholder="Search all columns" value={searchTerm} onChange={handleSearch} style={{ width: '100%', padding: '6px 32px 6px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '4px', outline: 'none' }} />
          {searchTerm && (
            <button onClick={clearSearch} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: '#6b7280' }}>
              <X size={14} />
            </button>
          )}
          {!searchTerm && <Search size={14} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "32px" }}>⏳</div>
            <div style={{ fontSize: "11px", color: "#666" }}>Loading data...</div>
          </div>
        ) : error ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "10px" }}>
            <AlertCircle size={40} style={{ color: "#ef4444" }} />
            <div style={{ fontSize: "12px", color: "#dc2626", fontWeight: "600" }}>Error</div>
            <div style={{ fontSize: "10px", color: "#7f1d1d", textAlign: "center", maxWidth: "400px", background: "#fee2e2", padding: "10px", borderRadius: "6px", border: "1px solid #fca5a5" }}>
              {error}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#374151', borderRight: '1px solid #e5e7eb' }}>
                  <input type="checkbox" style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#374151', borderRight: '1px solid #e5e7eb' }}>
                  Product
                  <ChevronDown size={12} style={{ display: 'inline', marginLeft: '4px', color: '#9ca3af' }} />
                </th>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#374151', borderRight: '1px solid #e5e7eb' }}>
                  Description
                  <ChevronDown size={12} style={{ display: 'inline', marginLeft: '4px', color: '#9ca3af' }} />
                </th>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#374151', borderRight: '1px solid #e5e7eb' }}>
                  UOM
                  <ChevronDown size={12} style={{ display: 'inline', marginLeft: '4px', color: '#9ca3af' }} />
                </th>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#374151', borderRight: '1px solid #e5e7eb' }}>
                  Type
                  <ChevronDown size={12} style={{ display: 'inline', marginLeft: '4px', color: '#9ca3af' }} />
                </th>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#374151', borderRight: '1px solid #e5e7eb' }}>
                  Status
                  <ChevronDown size={12} style={{ display: 'inline', marginLeft: '4px', color: '#9ca3af' }} />
                </th>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                  Category
                  <ChevronDown size={12} style={{ display: 'inline', marginLeft: '4px', color: '#9ca3af' }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '11px' }}>
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px', borderRight: '1px solid #f3f4f6' }}>
                      <input type="checkbox" style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '8px', borderRight: '1px solid #f3f4f6' }}>{item.product}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #f3f4f6' }}>{item.description}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #f3f4f6' }}>{item.uom}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #f3f4f6' }}>{item.type}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #f3f4f6' }}>{item.status}</td>
                    <td style={{ padding: '8px' }}>{item.category}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700" style={{ height: '8px' }} />
    </div>
  );
};

export default ItemMasterRightPanel;
