import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import useMandatoryFields from './useMandatoryFields';

const PAGE_KEY = 'sweet-nutrition-custom-fields';

const FIELD_LABELS = {
  item_weight:  'Item Weight',
  sub_category: 'Sub Category',
  flavour:      'Flavour',
  category_1:   'Category 1',
  brand:        'Brand',
};

const mandBorder  = (m) => m ? '#ef4444' : '#999';
const mandBg      = (m) => m ? '#fef2f2' : '#fff';
const mandOutline = (m) => m ? '1.5px solid #ef4444' : 'none';

const MandatoryBanner = ({ mandatoryKeys, companyName, plantName, loading }) => {
  if (loading || mandatoryKeys.length === 0) return null;
  const scope = plantName ? companyName + ' \u2192 ' + plantName : companyName;
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
        {mandatoryKeys.map(k => FIELD_LABELS[k] || k).join(' \u00b7 ')}
      </div>
    </div>
  );
};

const SweetNutritionCustomFields = ({ mappingRecord }) => {
  const companyId   = mappingRecord?.company_id ?? null;
  const plantId     = mappingRecord?.plant_id   ?? null;
  const companyName = mappingRecord?.company?.company_name ?? '';
  const plantName   = mappingRecord?.plant?.plant_name    ?? '';

  const { mandatoryKeys, loading: mfLoading } = useMandatoryFields({ pageKey: PAGE_KEY, companyId, plantId });
  const isMand = (key) => mandatoryKeys.includes(key);

  const [formData, setFormData] = useState({
    itemWeight: '',
    subCategory: '',
    flavour: '',
    category1: '',
    brand: ''
  });

  const [showModal, setShowModal] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const lovData = {
    subCategory: [
      { code: 'SC001', description: 'Chocolates' },
      { code: 'SC002', description: 'Candies' },
      { code: 'SC003', description: 'Biscuits' },
      { code: 'SC004', description: 'Snacks' },
      { code: 'SC005', description: 'Beverages' }
    ],
    flavour: [
      { code: 'FLV001', description: 'Vanilla' },
      { code: 'FLV002', description: 'Chocolate' },
      { code: 'FLV003', description: 'Strawberry' },
      { code: 'FLV004', description: 'Mango' },
      { code: 'FLV005', description: 'Orange' },
      { code: 'FLV006', description: 'Mixed Fruit' }
    ],
    category1: [
      { code: 'CAT001', description: 'Sweet Products' },
      { code: 'CAT002', description: 'Nutritional Foods' },
      { code: 'CAT003', description: 'Health Supplements' },
      { code: 'CAT004', description: 'Organic Products' }
    ],
    brand: [
      { code: 'BRD001', description: 'Sweet Delight' },
      { code: 'BRD002', description: 'NutriLife' },
      { code: 'BRD003', description: 'HealthyBite' },
      { code: 'BRD004', description: 'Premium Choice' },
      { code: 'BRD005', description: "Nature's Best" }
    ]
  };

  const modalTitles = {
    subCategory: 'SUB CATEGORY',
    flavour: 'FLAVOUR',
    category1: 'CATEGORY 1',
    brand: 'BRAND'
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

  const renderInputField = (label, fieldName, fieldKey) => {
    const im = isMand(fieldKey || fieldName);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: mandBg(im), borderRadius: 4, padding: im ? '2px 4px' : '0', outline: mandOutline(im) }}>
        <label style={{ fontSize: 11, color: im ? '#991b1b' : '#000', minWidth: 140, fontWeight: im ? 700 : 400 }}>
          {label}{im && <span style={{ color: '#dc2626' }}> *</span>}
        </label>
        <input
          name={fieldName}
          value={formData[fieldName]}
          onChange={handleInputChange}
          style={{ flex: 1, padding: '3px 6px', border: '1.5px solid ' + mandBorder(im), fontSize: 11, borderRadius: 2, color: '#000', background: mandBg(im) }}
        />
      </div>
    );
  };

  const renderLOVField = (label, fieldName, fieldKey) => {
    const im = isMand(fieldKey || fieldName);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: mandBg(im), borderRadius: 4, padding: im ? '2px 4px' : '0', outline: mandOutline(im) }}>
        <label style={{ fontSize: 11, color: im ? '#991b1b' : '#000', minWidth: 140, fontWeight: im ? 700 : 400 }}>
          {label}{im && <span style={{ color: '#dc2626' }}> *</span>}
        </label>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            readOnly
            value={formData[fieldName]}
            placeholder={`Enter ${label} for Search`}
            onClick={() => handleOpenModal(fieldName)}
            style={{ width: '100%', padding: '3px 45px 3px 6px', border: '1.5px solid ' + mandBorder(im), fontSize: 11, borderRadius: 2, cursor: 'pointer', color: '#333', background: mandBg(im) }}
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

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ width: 500, maxWidth: '90%', height: 300, background: '#fff', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Header */}
          <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '32px' }}>
            <span>{modalTitles[showModal]}</span>
            <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
              <X size={16} />
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#000' }}>Search</span>
            <input
              autoFocus
              placeholder={`Enter ${modalTitles[showModal]} for Search`}
              value={searchValue}
              onChange={(e) => { setSearchValue(e.target.value); setCurrentPage(1); }}
              style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#333' }}
            />
          </div>

          {/* Table */}
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
                    <tr
                      key={item.code}
                      onClick={() => handleSelectValue(item)}
                      style={{ cursor: 'pointer', background: i % 2 ? '#f9fafb' : '#fff' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#f9fafb' : '#fff'}
                    >
                      <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.code}</td>
                      <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.description}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" style={{ padding: '30px', textAlign: 'center', fontSize: 10, color: '#999' }}>No results found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '4px 12px', fontSize: 10, background: currentPage === 1 ? '#e5e7eb' : '#3b82f6', color: currentPage === 1 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
            <span style={{ fontSize: 10, color: '#000' }}>Page {currentPage} of {totalPages || 1}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))} disabled={currentPage === totalPages} style={{ padding: '4px 12px', fontSize: 10, background: currentPage === totalPages ? '#e5e7eb' : '#3b82f6', color: currentPage === totalPages ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
          </div>

          {/* Footer */}
          <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8 }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', padding: 0, margin: 0 }}>
      <div style={{ background: 'linear-gradient(to right, #bfdbfe, #d1d5db)', borderRadius: 4, marginBottom: 8, padding: '3px 10px', display: 'flex', alignItems: 'center' }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#1e3a5f' }}>Custom Fields</h3>
      </div>

      <MandatoryBanner mandatoryKeys={mandatoryKeys} companyName={companyName} plantName={plantName} loading={mfLoading} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
        {renderInputField('ITEM WEIGHT',  'itemWeight',  'item_weight')}
        {renderLOVField(  'Category 1',   'category1',   'category_1')}
        {renderLOVField(  'Sub Category', 'subCategory', 'sub_category')}
        {renderLOVField(  'Brand',        'brand',       'brand')}
        {renderLOVField(  'Flavour',      'flavour',     'flavour')}
      </div>

      {renderModal()}
    </div>
  );
};

export default SweetNutritionCustomFields;