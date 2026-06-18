import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import useMandatoryFields from './useMandatoryFields';

const API_BASE = 'http://localhost:8000/api';

const PAGE_KEY = 'sonata-custom-fields';

const FIELD_LABELS = {
  auto_batch_required: 'Auto Batch Required',
  item_capacity:       'Item Capacity',
  crm_item:            'CRM Item Y/N',
  wms_item:            'WMS Item Y/N',
  item_grade:          'Item Grade',
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

// Get USER_ID from session
const getSessionUserId = () => {
  try {
    const stored = sessionStorage.getItem('userData');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.user?.id || null;
  } catch {
    return null;
  }
};

// ─── Custom Field Value Modal (popup list from API only) ─────────────────────
const CustomFieldValueModal = ({ fieldKey, title, onSelect, onClose }) => {
  const [data, setData]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userId = getSessionUserId();
        const params = new URLSearchParams({ user_id: userId, field_key: fieldKey, is_active: 'true' });
        const res  = await fetch(`${API_BASE}/sonata-custom-fields/values?${params}`);
        const json = await res.json();
        setData(json.data || []);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fieldKey]);

  const filtered = data.filter(item =>
    (item.code || '').toLowerCase().includes(searchValue.toLowerCase()) ||
    (item.description || '').toLowerCase().includes(searchValue.toLowerCase())
  );
  const totalPages    = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: 500, maxWidth: '90%', height: 300, background: '#fff', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '32px' }}>
          <span>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
            <X size={16} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#000' }}>Search</span>
          <input
            autoFocus
            placeholder={`Enter ${title} for Search`}
            value={searchValue}
            onChange={e => { setSearchValue(e.target.value); setCurrentPage(1); }}
            style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#333' }}
          />
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', fontSize: 10, color: '#6b7280' }}>Loading…</div>
          ) : (
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
                      onClick={() => { onSelect(item); onClose(); }}
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
          )}
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const SonataCustomFields = ({ mappingRecord }) => {
  const companyId   = mappingRecord?.company_id ?? null;
  const plantId     = mappingRecord?.plant_id   ?? null;
  const companyName = mappingRecord?.company?.company_name ?? '';
  const plantName   = mappingRecord?.plant?.plant_name    ?? '';

  const { mandatoryKeys, loading: mfLoading } = useMandatoryFields({ pageKey: PAGE_KEY, companyId, plantId });
  const isMand = (key) => mandatoryKeys.includes(key);

  // ── LOV state — auto_batch_required, item_capacity, item_grade (unchanged) ───
  const [formData, setFormData] = useState({
    autoBatchRequired: '',
    itemCapacity:      '',
    itemGrade:         '',
  });

  // ── YES/NO state — wms_item & crm_item only ───────────────────────────────────
  const [wmsItem, setWmsItem] = useState('NO');
  const [crmItem, setCrmItem] = useState('NO');

  // ── YES/NO master pairs ───────────────────────────────────────────────────────
  const [yesNoPairs, setYesNoPairs] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/yes-no-master/lov`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setYesNoPairs(d); })
      .catch(() => {});
  }, []);

  // ── LOV modal ─────────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(null);

  const modalTitles = {
    autoBatchRequired: 'AUTO BATCH REQUIRED',
    itemCapacity:      'ITEM CAPACITY',
    itemGrade:         'ITEM GRADE',
  };

  const handleOpenModal  = (fieldName) => setShowModal(fieldName);
  const handleCloseModal = () => setShowModal(null);

  const handleSelectValue = (item) => {
    setFormData(prev => ({ ...prev, [showModal]: `${item.code} - ${item.description}` }));
    handleCloseModal();
  };

  const clearField = (fieldName) =>
    setFormData(prev => ({ ...prev, [fieldName]: '' }));

  // ── YES/NO button renderer ────────────────────────────────────────────────────
  const renderYesNoButtons = (fieldName, currentVal, onToggle) => {
    const pair     = yesNoPairs.length ? yesNoPairs[0] : null;
    const yesLabel = pair ? pair.yes_label : 'YES';
    const noLabel  = pair ? pair.no_label  : 'NO';
    const btnBase  = {
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', fontSize: 11, fontWeight: 600,
      borderRadius: 2, cursor: 'pointer', transition: 'all .15s',
      letterSpacing: '0.02em', userSelect: 'none',
    };
    const yesActive = currentVal === 'YES';
    const noActive  = currentVal === 'NO';
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #c8cdd3', borderRadius: 3, overflow: 'hidden', height: 22 }}>
        <button
          type="button"
          data-field={fieldName} data-value="YES" data-selected={yesActive ? 'true' : 'false'}
          aria-pressed={yesActive}
          onClick={() => onToggle('YES')}
          style={{ ...btnBase, background: yesActive ? '#16a34a' : '#f0fdf4', color: yesActive ? '#fff' : '#15803d', border: 'none', borderRight: '1px solid #c8cdd3' }}>
          <span style={{ fontSize: 9, lineHeight: 1 }}>✔</span>{yesLabel}
        </button>
        <button
          type="button"
          data-field={fieldName} data-value="NO" data-selected={noActive ? 'true' : 'false'}
          aria-pressed={noActive}
          onClick={() => onToggle('NO')}
          style={{ ...btnBase, background: noActive ? '#dc2626' : '#fff5f5', color: noActive ? '#fff' : '#b91c1c', border: 'none' }}>
          <span style={{ fontSize: 9, lineHeight: 1 }}>✖</span>{noLabel}
        </button>
      </div>
    );
  };

  // ── LOV field renderer (100% original) ───────────────────────────────────────
  const renderLOVField = (label, fieldName, fieldKey, required = false) => {
    const im = isMand(fieldKey || fieldName);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: mandBg(im), borderRadius: 4, padding: im ? '2px 4px' : '0', outline: mandOutline(im) }}>
        <label style={{ fontSize: 11, color: im ? '#991b1b' : '#000', minWidth: 140, fontWeight: im ? 700 : 400 }}>
          {label}{(im || required) && <span style={{ color: '#dc2626' }}> *</span>}
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

  // ── YES/NO field renderer ─────────────────────────────────────────────────────
  const renderYesNoField = (label, fieldKey, currentVal, onToggle, required = false) => {
    const im = isMand(fieldKey);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: mandBg(im), borderRadius: 4, padding: im ? '2px 4px' : '0', outline: mandOutline(im) }}>
        <label style={{ fontSize: 11, color: im ? '#991b1b' : '#000', minWidth: 140, fontWeight: im ? 700 : 400 }}>
          {label}{(im || required) && <span style={{ color: '#dc2626' }}> *</span>}
        </label>
        <div style={{
          background:   im ? '#fef2f2' : '#f0f4ff',
          border:       `1px solid ${im ? '#ef4444' : '#c7d4f0'}`,
          borderRadius: 4, padding: '5px 10px',
          display: 'inline-flex', alignItems: 'center',
        }}>
          {renderYesNoButtons(fieldKey, currentVal, onToggle)}
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;
    return (
      <CustomFieldValueModal
        fieldKey={showModal}
        title={modalTitles[showModal]}
        onSelect={handleSelectValue}
        onClose={handleCloseModal}
      />
    );
  };

  return (
    <div style={{ width: '100%', padding: 0, margin: 0 }}>
      <div style={{ background: 'linear-gradient(to right, #bfdbfe, #d1d5db)', borderRadius: 4, marginBottom: 8, padding: '3px 10px', display: 'flex', alignItems: 'center' }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#1e3a5f' }}>Custom Fields</h3>
      </div>

      <MandatoryBanner mandatoryKeys={mandatoryKeys} companyName={companyName} plantName={plantName} loading={mfLoading} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>

        {/* LOV — unchanged */}
        {renderLOVField('AUTO BATCH REQUIRED', 'autoBatchRequired', 'auto_batch_required')}

        {/* YES/NO buttons — WMS Item Y/N */}
        {renderYesNoField('WMS Item Y/N', 'wms_item', wmsItem, setWmsItem, true)}

        {/* LOV — unchanged */}
        {renderLOVField('Item Capacity', 'itemCapacity', 'item_capacity', true)}

        {/* LOV — unchanged */}
        {renderLOVField('Item Grade', 'itemGrade', 'item_grade', true)}

        {/* YES/NO buttons — CRM Item Y/N */}
        {renderYesNoField('CRM Item Y/N', 'crm_item', crmItem, setCrmItem, true)}

      </div>

      {renderModal()}
    </div>
  );
};

export default SonataCustomFields;