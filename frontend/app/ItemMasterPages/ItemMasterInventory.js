import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import useMandatoryFields from './useMandatoryFields';

const API_BASE = 'http://localhost:8000/api';

const PAGE_KEY = 'item-master-inventory';

const FIELD_LABELS = {
  parent_item:            'Parent Item',
  packed_item:            'Packed Item',
  superceded:             'Superceded',
  dimension:              'Dimension',
  maximum_stock_qty:      'Maximum Stock (Qty)',
  reorder_quantity:       'Reorder Quantity',
  harmonised_code:        'Harmonised Code',
  lead_time:              'Lead Time(in Days)',
  minimum_stock_qty:      'Minimum Stock (Qty)',
  reorder_level:          'Reorder Level',
  safety_stock_factor:    'Safety Stock Factor',
  universal_product_code: 'Universal Product Code',
};

const mandBorder  = (m) => m ? '#ef4444' : '#ccc';
const mandBg      = (m) => m ? '#fef2f2' : '#fff';
const mandOutline = (m) => m ? '1.5px solid #ef4444' : 'none';

const MandatoryBanner = ({ mandatoryKeys, companyName, plantName, loading }) => {
  if (loading || mandatoryKeys.length === 0) return null;
  const scope = plantName ? companyName + ' → ' + plantName : companyName;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 6,
      background: '#fef2f2', border: '1px solid #fca5a5',
      borderRadius: 6, padding: '6px 10px', marginBottom: 8,
      fontSize: 10, color: '#991b1b',
    }}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>🔴</span>
      <div>
        <span style={{ fontWeight: 700 }}>{'Mandatory fields for ' + scope + ': '}</span>
        {mandatoryKeys.map(k => FIELD_LABELS[k] || k).join(' · ')}
      </div>
    </div>
  );
};

const ItemMasterInventory = ({ mappingRecord }) => {
  const companyId   = mappingRecord?.company_id ?? mappingRecord?.company?.id ?? null;
  const plantId     = mappingRecord?.plant_id   ?? mappingRecord?.plant?.id   ?? null;
  const companyName = mappingRecord?.company?.company_name ?? mappingRecord?.company?.name ?? '';
  const plantName   = mappingRecord?.plant?.plant_name    ?? mappingRecord?.plant?.name    ?? '';

  const { mandatoryKeys, loading: mfLoading } = useMandatoryFields({ pageKey: PAGE_KEY, companyId, plantId });
  const isMand = (key) => mandatoryKeys.includes(key);

  const [formData, setFormData] = useState({
    parentItem: '',
    maximumStockQty1: '0',
    maximumStockQty2: '0',
    reorderQuantity1: '0',
    reorderQuantity2: '0',
    harmonisedCode: '',
    leadTime: '0',
    minimumStockQty1: '0',
    minimumStockQty2: '0',
    reorderLevel1: '0',
    reorderLevel2: '0',
    safetyStockFactor: '0',
    universalProductCode: ''
  });

  const [showModal, setShowModal] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const [yesNoPairs, setYesNoPairs] = useState([]);
  const [packedItemSel, setPackedItemSel]   = useState('no');
  const [dimensionSel, setDimensionSel]     = useState('no');
  const [supercededSel, setSupercededSel]   = useState('no');

  useEffect(() => {
    fetch(`${API_BASE.replace('/api', '')}/api/yes-no-master/lov`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setYesNoPairs(d); })
      .catch(() => {});
  }, []);

  const lovData = {
    parentItem: [
      { code: 'ITEM001', description: 'Parent Item A' },
      { code: 'ITEM002', description: 'Parent Item B' },
      { code: 'ITEM003', description: 'Parent Item C' },
      { code: 'ITEM004', description: 'Parent Item D' },
      { code: 'ITEM005', description: 'Parent Item E' }
    ],
  };

  const modalTitles = {
    parentItem: 'PARENT ITEM',
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (fieldName) => {
    setShowModal(fieldName);
    setSearchValue('');
    setCurrentPage(1);
  };

  const handleCloseModal = () => {
    setShowModal(null);
    setSearchValue('');
    setCurrentPage(1);
  };

  const handleSelectValue = (item) => {
    setFormData(prev => ({ ...prev, [showModal]: `${item.code} - ${item.description}` }));
    handleCloseModal();
  };

  const clearField = (fieldName) => {
    setFormData(prev => ({ ...prev, [fieldName]: '' }));
  };

  const getFilteredData = () => {
    if (!showModal) return [];
    const data = lovData[showModal] || [];
    const term = searchValue.toLowerCase();
    if (!term) return data;
    return data.filter(item =>
      item.code.toLowerCase().includes(term) || item.description.toLowerCase().includes(term)
    );
  };

  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const renderYesNoButtons = (currentVal, onToggle, colors, fieldKey) => {
    const im       = isMand(fieldKey);
    const pair     = yesNoPairs.length ? yesNoPairs[0] : null;
    const yesLabel = pair ? pair.yes_label : 'YES';
    const noLabel  = pair ? pair.no_label  : 'NO';
    const btnBase  = {
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', fontSize: 11, fontWeight: 600,
      borderRadius: 2, cursor: 'pointer', transition: 'all .15s',
      letterSpacing: '0.02em', userSelect: 'none',
    };
    const yesActive = currentVal === 'yes';
    const noActive  = currentVal === 'no';
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center',
        border: '1px solid ' + (im ? '#ef4444' : '#c8cdd3'),
        borderRadius: 3, overflow: 'hidden', height: 22,
        background: im ? '#fef2f2' : 'transparent',
        outline: mandOutline(im),
      }}>
        <button onClick={() => onToggle('yes')}
          style={{ ...btnBase, background: yesActive ? colors.yesActiveBg : colors.yesInactiveBg, color: yesActive ? '#fff' : colors.yesInactiveColor, border: 'none', borderRight: '1px solid #c8cdd3' }}>
          <span style={{ fontSize: 9, lineHeight: 1 }}>✔</span>{yesLabel}
        </button>
        <button onClick={() => onToggle('no')}
          style={{ ...btnBase, background: noActive ? colors.noActiveBg : colors.noInactiveBg, color: noActive ? '#fff' : colors.noInactiveColor, border: 'none' }}>
          <span style={{ fontSize: 9, lineHeight: 1 }}>✖</span>{noLabel}
        </button>
      </div>
    );
  };

  const packedItemColors = {
    yesActiveBg: '#2563eb', yesInactiveBg: '#eff6ff', yesInactiveColor: '#1d4ed8',
    noActiveBg:  '#dc2626', noInactiveBg:  '#fff5f5', noInactiveColor:  '#b91c1c',
  };
  const dimensionColors = {
    yesActiveBg: '#0d9488', yesInactiveBg: '#f0fdfa', yesInactiveColor: '#0f766e',
    noActiveBg:  '#dc2626', noInactiveBg:  '#fff5f5', noInactiveColor:  '#b91c1c',
  };
  const supercededColors = {
    yesActiveBg: '#d97706', yesInactiveBg: '#fffbeb', yesInactiveColor: '#b45309',
    noActiveBg:  '#dc2626', noInactiveBg:  '#fff5f5', noInactiveColor:  '#b91c1c',
  };

  const renderYesNoField = (label, currentVal, onToggle, colors, boxBg, boxBorder, fieldKey) => {
    const im = isMand(fieldKey);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: mandBg(im), borderRadius: 4, padding: im ? '2px 4px' : '0', outline: mandOutline(im) }}>
        <label style={{ fontSize: 11, color: im ? '#991b1b' : '#000', minWidth: 130, textAlign: 'left', fontWeight: im ? 700 : 400 }}>
          {label}{im && <span style={{ color: '#dc2626' }}> *</span>}
        </label>
        <div style={{
          background: im ? '#fef2f2' : boxBg,
          border: `1px solid ${im ? '#ef4444' : boxBorder}`,
          borderRadius: 4, padding: '3px 10px',
          display: 'inline-flex', alignItems: 'center',
        }}>
          {renderYesNoButtons(currentVal, onToggle, colors, fieldKey)}
        </div>
      </div>
    );
  };

  const renderLOVField = (label, fieldName, fieldKey) => {
    const im = isMand(fieldKey);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: mandBg(im), borderRadius: 4, padding: im ? '2px 4px' : '0', outline: mandOutline(im) }}>
        <label style={{ fontSize: 11, color: im ? '#991b1b' : '#000', minWidth: 130, textAlign: 'left', fontWeight: im ? 700 : 400 }}>
          {label}{im && <span style={{ color: '#dc2626' }}> *</span>}
        </label>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            readOnly
            value={formData[fieldName]}
            placeholder={`Enter ${label} for Search`}
            onClick={() => handleOpenModal(fieldName)}
            style={{
              width: '100%',
              padding: '4px 28px 4px 6px',
              border: '1px solid ' + mandBorder(im),
              fontSize: 11,
              borderRadius: 2,
              cursor: 'pointer',
              color: '#000',
              backgroundColor: mandBg(im),
            }}
          />
          {formData[fieldName] && (
            <button onClick={() => clearField(fieldName)} style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X size={12} color="#ef4444" />
            </button>
          )}
          <button onClick={() => handleOpenModal(fieldName)} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <Search size={13} color="#999" />
          </button>
        </div>
      </div>
    );
  };

  const renderInputField = (label, fieldName, fieldKey) => {
    const im = isMand(fieldKey);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: mandBg(im), borderRadius: 4, padding: im ? '2px 4px' : '0', outline: mandOutline(im) }}>
        <label style={{ fontSize: 11, color: im ? '#991b1b' : '#000', minWidth: 130, textAlign: 'left', fontWeight: im ? 700 : 400 }}>
          {label}{im && <span style={{ color: '#dc2626' }}> *</span>}
        </label>
        <input
          name={fieldName}
          value={formData[fieldName]}
          onChange={handleInputChange}
          style={{
            flex: 1,
            padding: '4px 6px',
            border: '1px solid ' + mandBorder(im),
            fontSize: 11,
            borderRadius: 2,
            color: '#000',
            textAlign: 'right',
            background: mandBg(im),
          }}
        />
      </div>
    );
  };

  const renderDoubleInputField = (label, fieldName1, fieldName2, fieldKey) => {
    const im = isMand(fieldKey);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: mandBg(im), borderRadius: 4, padding: im ? '2px 4px' : '0', outline: mandOutline(im) }}>
        <label style={{ fontSize: 11, color: im ? '#991b1b' : '#000', minWidth: 130, textAlign: 'left', fontWeight: im ? 700 : 400 }}>
          {label}{im && <span style={{ color: '#dc2626' }}> *</span>}
        </label>
        <div style={{ flex: 1, display: 'flex', gap: 8 }}>
          <input
            name={fieldName1}
            value={formData[fieldName1]}
            onChange={handleInputChange}
            style={{ flex: 1, padding: '4px 6px', border: '1px solid ' + mandBorder(im), fontSize: 11, borderRadius: 2, color: '#000', textAlign: 'right', background: mandBg(im) }}
          />
          <input
            name={fieldName2}
            value={formData[fieldName2]}
            onChange={handleInputChange}
            style={{ flex: 1, padding: '4px 6px', border: '1px solid ' + mandBorder(im), fontSize: 11, borderRadius: 2, color: '#000', textAlign: 'right', background: mandBg(im) }}
          />
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ width: 500, maxWidth: '90%', height: 300, background: '#fff', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '32px' }}>
            <span>{modalTitles[showModal]}</span>
            <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={16} /></button>
          </div>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#000' }}>Search</span>
            <input autoFocus placeholder={`Enter ${modalTitles[showModal]} for Search`} value={searchValue} onChange={(e) => { setSearchValue(e.target.value); setCurrentPage(1); }} style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#333' }} />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Code</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Name</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, i) => (
                    <tr key={item.code} onClick={() => handleSelectValue(item)} style={{ cursor: 'pointer', background: i % 2 ? '#f9fafb' : '#fff' }} onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'} onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#f9fafb' : '#fff'}>
                      <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.code}</td>
                      <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.description}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="2" style={{ padding: '30px', textAlign: 'center', fontSize: 10, color: '#999' }}>No results found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '4px 12px', fontSize: 10, background: currentPage === 1 ? '#e5e7eb' : '#3b82f6', color: currentPage === 1 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
            <span style={{ fontSize: 10, color: '#000' }}>Page {currentPage} of {totalPages || 1}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))} disabled={currentPage === totalPages} style={{ padding: '4px 12px', fontSize: 10, background: currentPage === totalPages ? '#e5e7eb' : '#3b82f6', color: currentPage === totalPages ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
          </div>
          <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8 }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', padding: '16px', backgroundColor: '#fff', fontFamily: 'Arial, sans-serif' }}>

      {/* Section Header */}
      <div style={{ background: 'linear-gradient(to right, #bfdbfe, #d1d5db)', borderRadius: 4, marginBottom: 12, padding: '3px 10px', display: 'flex', alignItems: 'center' }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#1e3a5f' }}>Inventory Details</h3>
      </div>

      {/* Mandatory Banner */}
      <MandatoryBanner mandatoryKeys={mandatoryKeys} companyName={companyName} plantName={plantName} loading={mfLoading} />

      {/* Form Grid - 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>

        {/* Left Column */}
        <div>
          {renderLOVField('Parent Item', 'parentItem', 'parent_item')}
          {renderYesNoField('Packed Item', packedItemSel, (val) => setPackedItemSel(val), packedItemColors, '#eff6ff', '#bfdbfe', 'packed_item')}
          {renderYesNoField('Superceded', supercededSel, (val) => setSupercededSel(val), supercededColors, '#fffbeb', '#fcd34d', 'superceded')}
          {renderDoubleInputField('Maximum Stock (Qty)', 'maximumStockQty1', 'maximumStockQty2', 'maximum_stock_qty')}
          {renderDoubleInputField('Reorder Quantity', 'reorderQuantity1', 'reorderQuantity2', 'reorder_quantity')}
          {renderInputField('Harmonised Code', 'harmonisedCode', 'harmonised_code')}
        </div>

        {/* Right Column */}
        <div>
          {renderInputField('Lead Time(in Days)', 'leadTime', 'lead_time')}
          {renderYesNoField('Dimension', dimensionSel, (val) => setDimensionSel(val), dimensionColors, '#f0fdfa', '#99f6e4', 'dimension')}
          {renderDoubleInputField('Minimum Stock (Qty)', 'minimumStockQty1', 'minimumStockQty2', 'minimum_stock_qty')}
          {renderDoubleInputField('Reorder Level', 'reorderLevel1', 'reorderLevel2', 'reorder_level')}
          {renderInputField('Safety Stock Factor', 'safetyStockFactor', 'safety_stock_factor')}
          {renderInputField('Universal Product Code', 'universalProductCode', 'universal_product_code')}
        </div>
      </div>

      {renderModal()}
    </div>
  );
};

export default ItemMasterInventory;