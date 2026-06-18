import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import useMandatoryFields from './useMandatoryFields';

const PAGE_KEY = 'item-master-purchase-details';

const FIELD_LABELS = {
  vendor_analysis:              'Vendor Analysis',
  analysis_property_class:      'Analysis Property Class',
  positive_tolerance_percent:   'Positive Tolerance %',
  negative_tolerance_percent:   'Negative Tolerance %',
  physical_stock_variance_percent: 'Physical Stock Variance %',
  receipt_variance_percent:     'Receipt Variance %',
};

const mandBorder  = (m) => m ? '#ef4444' : '#d1d5db';
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

const ItemMasterPurchaseDetails = ({ mappingRecord }) => {
  const companyId   = mappingRecord?.company_id ?? mappingRecord?.company?.id ?? null;
  const plantId     = mappingRecord?.plant_id   ?? mappingRecord?.plant?.id   ?? null;
  const companyName = mappingRecord?.company?.company_name ?? mappingRecord?.company?.name ?? '';
  const plantName   = mappingRecord?.plant?.plant_name    ?? mappingRecord?.plant?.name    ?? '';

  const { mandatoryKeys, loading: mfLoading } = useMandatoryFields({ pageKey: PAGE_KEY, companyId, plantId });
  const isMand = (key) => mandatoryKeys.includes(key);

  const [formData, setFormData] = useState({
    vendorAnalysis: '',
    analysisPropertyClass: '',
    positiveTolerancePercent: '0.0',
    negativeTolerancePercent: '0.0',
    physicalStockVariancePercent: '0.0',
    receiptVariancePercent: '0.0'
  });

  const [showModal, setShowModal] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const lovData = {
    vendorAnalysis: [
      { code: 'VA001', description: 'Vendor Analysis Type A' },
      { code: 'VA002', description: 'Vendor Analysis Type B' },
      { code: 'VA003', description: 'Vendor Analysis Type C' }
    ],
    analysisPropertyClass: [
      { code: 'APC001', description: 'Property Class A' },
      { code: 'APC002', description: 'Property Class B' },
      { code: 'APC003', description: 'Property Class C' }
    ]
  };

  const modalTitles = {
    vendorAnalysis: 'VENDOR ANALYSIS',
    analysisPropertyClass: 'ANALYSIS PROPERTY CLASS'
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (fieldName) => { setShowModal(fieldName); setSearchValue(''); setCurrentPage(1); };
  const handleCloseModal = () => { setShowModal(null); setSearchValue(''); setCurrentPage(1); };
  const handleSelectValue = (item) => {
    setFormData(prev => ({ ...prev, [showModal]: `${item.code} - ${item.description}` }));
    handleCloseModal();
  };
  const clearField = (fieldName) => setFormData(prev => ({ ...prev, [fieldName]: '' }));

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

  const renderLOVField = (label, fieldName, fieldKey) => {
    const im = isMand(fieldKey);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', background: mandBg(im), borderRadius: 4, padding: im ? '2px 4px' : '0', outline: mandOutline(im) }}>
        <label style={{ fontSize: '11px', fontWeight: im ? 700 : 500, color: im ? '#991b1b' : '#374151', marginBottom: '4px' }}>
          {label}{im && <span style={{ color: '#dc2626' }}> *</span>}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            readOnly
            value={formData[fieldName]}
            placeholder={`Enter ${label} for Search`}
            onClick={() => handleOpenModal(fieldName)}
            style={{ width: '100%', padding: '6px 45px 6px 8px', border: '1px solid ' + mandBorder(im), fontSize: 11, borderRadius: 4, cursor: 'pointer', color: '#374151', background: mandBg(im), outline: 'none' }}
          />
          {formData[fieldName] && (
            <button onClick={() => clearField(fieldName)} style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X size={12} color="#ef4444" />
            </button>
          )}
          <button onClick={() => handleOpenModal(fieldName)} style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Search size={14} color="#666" />
          </button>
        </div>
      </div>
    );
  };

  const renderInputField = (label, fieldName, fieldKey) => {
    const im = isMand(fieldKey);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', background: mandBg(im), borderRadius: 4, padding: im ? '2px 4px' : '0', outline: mandOutline(im) }}>
        <label style={{ fontSize: '11px', fontWeight: im ? 700 : 500, color: im ? '#991b1b' : '#374151', marginBottom: '4px' }}>
          {label}{im && <span style={{ color: '#dc2626' }}> *</span>}
        </label>
        <input
          type="text"
          name={fieldName}
          value={formData[fieldName]}
          onChange={handleInputChange}
          style={{ padding: '6px 8px', fontSize: '11px', border: '1px solid ' + mandBorder(im), borderRadius: '4px', backgroundColor: mandBg(im), color: '#374151', outline: 'none' }}
        />
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
              <thead><tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Code</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Name</th>
              </tr></thead>
              <tbody>
                {paginatedData.length > 0 ? paginatedData.map((item, i) => (
                  <tr key={item.code} onClick={() => handleSelectValue(item)} style={{ cursor: 'pointer', background: i % 2 ? '#f9fafb' : '#fff' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'} onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#f9fafb' : '#fff'}>
                    <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.code}</td>
                    <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.description}</td>
                  </tr>
                )) : (
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
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>

        {/* Section Header */}
        <div style={{ background: 'linear-gradient(to right, #bfdbfe, #d1d5db)', borderRadius: 4, marginBottom: 8, padding: '3px 10px', display: 'flex', alignItems: 'center' }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#1e3a5f' }}>Purchase Details</h3>
        </div>

        {/* Mandatory Banner */}
        <MandatoryBanner mandatoryKeys={mandatoryKeys} companyName={companyName} plantName={plantName} loading={mfLoading} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {renderLOVField('Vendor Analysis',          'vendorAnalysis',        'vendor_analysis')}
          {renderLOVField('Analysis Property Class',  'analysisPropertyClass', 'analysis_property_class')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {renderInputField('Positive Tolerance %',   'positiveTolerancePercent',  'positive_tolerance_percent')}
          {renderInputField('Negative Tolerance %',   'negativeTolerancePercent',  'negative_tolerance_percent')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {renderInputField('Physical Stock Variance %', 'physicalStockVariancePercent', 'physical_stock_variance_percent')}
          {renderInputField('Receipt Variance %',        'receiptVariancePercent',        'receipt_variance_percent')}
        </div>
      </div>

      {renderModal()}
    </div>
  );
};

export default ItemMasterPurchaseDetails;