import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import useMandatoryFields from './useMandatoryFields';
 
const API_BASE = 'http://localhost:8000/api';
 
// ─────────────────────────────────────────────────────────────────────────────
// PAGE_KEY used to fetch config from mandatory_field_config table.
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_KEY = 'item-info-master';
 
// ─────────────────────────────────────────────────────────────────────────────
// Field key → human label mapping (for the mandatory badge tooltip)
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_LABELS = {
  base_uom:           'Base UOM',
  max_loose:          'Max. Loose',
  stock:              'Stock',
  service:            'Service',
  batch:              'Batch Item',
  serial:             'Serial Item',
  gift_voucher:       'Gift Voucher',
  extended_warranty:  'Extended Warranty',
};
 
// ─────────────────────────────────────────────────────────────────────────────
// Mandatory highlight style helpers
// ─────────────────────────────────────────────────────────────────────────────
const mandatoryBorder  = (isMand) => isMand ? '#ef4444' : '#999';
const mandatoryBg      = (isMand) => isMand ? '#fef2f2' : 'transparent';
const mandatoryOutline = (isMand) => isMand ? '1.5px solid #ef4444' : 'none';
 
/** Inline red asterisk + label */
const MandLabel = ({ label, isMand }) => (
  <label style={{
    fontSize: 11,
    color:    isMand ? '#991b1b' : '#000',
    minWidth: 140,
    fontWeight: isMand ? 700 : 400,
  }}>
    {label}
    {isMand && <span style={{ color: '#dc2626' }}> *</span>}
  </label>
);
 
// ─────────────────────────────────────────────────────────────────────────────
// Mandatory field banner
// ─────────────────────────────────────────────────────────────────────────────
const MandatoryBanner = ({ mandatoryKeys, companyName, plantName, loading }) => {
  if (loading || mandatoryKeys.length === 0) return null;
  const scope = plantName ? `${companyName} → ${plantName}` : companyName;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 6,
      background: '#fef2f2', border: '1px solid #fca5a5',
      borderRadius: 6, padding: '6px 10px', marginBottom: 10,
      fontSize: 10, color: '#991b1b',
    }}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>🔴</span>
      <div>
        <span style={{ fontWeight: 700 }}>
          Mandatory fields for {scope}:&nbsp;
        </span>
        {mandatoryKeys.map(k => FIELD_LABELS[k] || k).join(' · ')}
      </div>
    </div>
  );
};
 
// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object}   props
 * @param {object|null} props.mappingRecord  - ICR record from MdmMyReq
 * @param {function}    props.onDataChange   - Called with current field values
 *   whenever any field changes. CreateItemMaster uses this to collect data
 *   before POSTing to /item-master-info/bulk-upsert/.
 *   Signature: onDataChange({ uom_code, uom_name, max_loose,
 *     is_stock, is_service, is_batch, is_serial,
 *     is_gift_voucher, has_extended_warranty })
 */
const ItemInfoMaster = ({ mappingRecord = null, onDataChange = null }) => {
 
  // ── Extract company/plant from mappingRecord ──────────────────────────────
  const companyId   = mappingRecord?.company_id  ?? null;
  const plantId     = mappingRecord?.plant_id    ?? null;
  const companyName = mappingRecord?.company?.company_name ?? '';
  const plantName   = mappingRecord?.plant?.plant_name    ?? '';
 
  // ── Fetch mandatory keys ──────────────────────────────────────────────────
  const { mandatoryKeys, loading: mfLoading } = useMandatoryFields({
    pageKey:   PAGE_KEY,
    companyId,
    plantId,
  });
 
  const isMand = (key) => mandatoryKeys.includes(key);
 
  // ── Field state ───────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    description: '',
    baseUOM: '',      // uom_code
    baseUOMName: '',  // uom_name (snapshot)
    maxLoose: '',
    isActive: true,
  });
 
  const [showBaseUOMModal, setShowBaseUOMModal] = useState(false);
  const [baseUOMSearch, setBaseUOMSearch]       = useState('');
  const [baseUOMPage, setBaseUOMPage]           = useState(1);
  const ITEMS_PER_PAGE = 5;
 
  const [baseUOMList, setBaseUOMList]       = useState([]);
  const [baseUOMLoading, setBaseUOMLoading] = useState(false);
  const [baseUOMError, setBaseUOMError]     = useState('');
 
  const [yesNoPairs, setYesNoPairs]           = useState([]);
  const [stockServiceSel, setStockServiceSel] = useState({ stock: 'NO', service: 'NO' });
  const [batchSerialSel, setBatchSerialSel]   = useState({ batch: 'NO', serial: 'NO' });
  const [giftVoucherSel, setGiftVoucherSel]   = useState('NO');
  const [extWarrantySel, setExtWarrantySel]   = useState('NO');

  // ── Notify parent whenever any field changes ──────────────────────────────
  // This is the primary data-passing mechanism used by CreateItemMaster
  // handleSaveAndNext → itemInfoDataRef to build the bulk-upsert payload.
  const notifyParent = useCallback((
    baseUOM, baseUOMName, maxLoose, stockSvc, batchSer, giftV, extW
  ) => {
    if (typeof onDataChange !== 'function') return;
    onDataChange({
      uom_code:              baseUOM  || null,
      uom_name:              baseUOMName || null,
      max_loose:             maxLoose !== '' && maxLoose !== null ? parseFloat(maxLoose) : null,
      is_stock:              stockSvc.stock   === 'YES' ? 'YES' : 'NO',
      is_service:            stockSvc.service === 'YES' ? 'YES' : 'NO',
      is_batch:              batchSer.batch   === 'YES' ? 'YES' : 'NO',
      is_serial:             batchSer.serial  === 'YES' ? 'YES' : 'NO',
      is_gift_voucher:       giftV === 'YES' ? 'YES' : 'NO',
      has_extended_warranty: extW  === 'YES' ? 'YES' : 'NO',
    });
  }, [onDataChange]);

  // Fire on every state change
  useEffect(() => {
    notifyParent(
      formData.baseUOM, formData.baseUOMName, formData.maxLoose,
      stockServiceSel, batchSerialSel, giftVoucherSel, extWarrantySel
    );
  }, [formData.baseUOM, formData.baseUOMName, formData.maxLoose,
      stockServiceSel, batchSerialSel, giftVoucherSel, extWarrantySel,
      notifyParent]);

  // ── Load existing saved data for this entity_id on mount ─────────────────
  useEffect(() => {
    const entityDbId = mappingRecord?.id || mappingRecord?.entity_id;
    if (!entityDbId) return;
    fetch(`${API_BASE}/item-master-info/summary/${entityDbId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        // Restore UOM
        if (data.uom?.uom_code) {
          setFormData(prev => ({
            ...prev,
            baseUOM:     data.uom.uom_code,
            baseUOMName: data.uom.uom_name || '',
          }));
        }
        // Restore Max Loose
        if (data.max_loose?.max_loose != null) {
          setFormData(prev => ({ ...prev, maxLoose: String(data.max_loose.max_loose) }));
        }
        // Restore Stock/Service
        if (data.stock || data.service) {
          setStockServiceSel({
            stock:   data.stock?.is_stock   || 'NO',
            service: data.service?.is_service || 'NO',
          });
        }
        // Restore Batch/Serial
        if (data.batch_item || data.serial_item) {
          setBatchSerialSel({
            batch:  data.batch_item?.is_batch   || 'NO',
            serial: data.serial_item?.is_serial || 'NO',
          });
        }
        // Restore Gift Voucher
        if (data.gift_voucher?.is_gift_voucher) {
          setGiftVoucherSel(data.gift_voucher.is_gift_voucher);
        }
        // Restore Extended Warranty
        if (data.extended_warranty?.has_extended_warranty) {
          setExtWarrantySel(data.extended_warranty.has_extended_warranty);
        }
      })
      .catch(() => {});
  }, [mappingRecord]);
 
  // ── Stock / Service mutual-exclusion ──────────────────────────────────────
  const handleStockServiceToggle = (which, val) => {
    setStockServiceSel(prev => {
      const other = which === 'stock' ? 'service' : 'stock';
      const n = { ...prev, [which]: val };
      if (val === 'YES') n[other] = 'NO';
      return n;
    });
  };
 
  // ── Batch / Serial mutual-exclusion ───────────────────────────────────────
  const handleBatchSerialToggle = (which, val) => {
    setBatchSerialSel(prev => {
      const other = which === 'batch' ? 'serial' : 'batch';
      const n = { ...prev, [which]: val };
      if (val === 'YES') n[other] = 'NO';
      return n;
    });
  };
 
  // ── Fetch YES/NO master labels ────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE.replace('/api', '')}/api/yes-no-master/lov`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setYesNoPairs(d); })
      .catch(() => {});
  }, []);
 
  // ── Fetch Base UOM list ───────────────────────────────────────────────────
  useEffect(() => {
    setBaseUOMLoading(true);
    setBaseUOMError('');
    fetch(`${API_BASE}/uom/units?is_base=true&limit=500`)
      .then(r => r.json())
      .then(d => {
        const items = d.items || [];
        setBaseUOMList(items.filter(u => u.is_base).map(u => ({ code: u.code, name: u.name })));
      })
      .catch(() => setBaseUOMError('Failed to load UOMs'))
      .finally(() => setBaseUOMLoading(false));
  }, []);
 
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
 
  const selectBaseUOM = (uom) => {
    setFormData(prev => ({ ...prev, baseUOM: uom.code, baseUOMName: uom.name || '' }));
    setShowBaseUOMModal(false);
    setBaseUOMSearch('');
    setBaseUOMPage(1);
  };
 
  const clearBaseUOM = () =>
    setFormData(prev => ({ ...prev, baseUOM: '', baseUOMName: '' }));
 
  const filteredBaseUOM = baseUOMList.filter(u =>
    u.code.toLowerCase().includes(baseUOMSearch.toLowerCase()) ||
    u.name.toLowerCase().includes(baseUOMSearch.toLowerCase())
  );
  const totalBaseUOMPages = Math.ceil(filteredBaseUOM.length / ITEMS_PER_PAGE);
  const paginatedBaseUOM  = filteredBaseUOM.slice(
    (baseUOMPage - 1) * ITEMS_PER_PAGE,
    baseUOMPage * ITEMS_PER_PAGE
  );
 
  // ── YES/NO button renderer ────────────────────────────────────────────────
  // Buttons carry data-field, data-value, data-selected so CreateItemMaster
  // DOM scan (collectItemInfoFields) can read them as fallback.
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
          data-field={fieldName}
          data-value="YES"
          data-selected={yesActive ? 'true' : 'false'}
          aria-pressed={yesActive}
          onClick={() => onToggle('YES')}
          style={{ ...btnBase, background: yesActive ? '#16a34a' : '#f0fdf4', color: yesActive ? '#fff' : '#15803d', border: 'none', borderRight: '1px solid #c8cdd3' }}>
          <span style={{ fontSize: 9, lineHeight: 1 }}>✔</span>{yesLabel}
        </button>
        <button
          type="button"
          data-field={fieldName}
          data-value="NO"
          data-selected={noActive ? 'true' : 'false'}
          aria-pressed={noActive}
          onClick={() => onToggle('NO')}
          style={{ ...btnBase, background: noActive ? '#dc2626' : '#fff5f5', color: noActive ? '#fff' : '#b91c1c', border: 'none' }}>
          <span style={{ fontSize: 9, lineHeight: 1 }}>✖</span>{noLabel}
        </button>
      </div>
    );
  };
 
  // ── Base UOM modal ────────────────────────────────────────────────────────
  const renderBaseUOMModal = () => (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: 500, maxWidth: '90%', height: 300, background: '#fff', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32 }}>
          <span>Base UOM</span>
          <button onClick={() => { setShowBaseUOMModal(false); setBaseUOMPage(1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#000' }}>Search</span>
          <input autoFocus placeholder="Enter Base UOM for Search" value={baseUOMSearch}
            onChange={e => { setBaseUOMSearch(e.target.value); setBaseUOMPage(1); }}
            style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#333' }} />
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {baseUOMLoading ? (
            <div style={{ padding: 30, textAlign: 'center', fontSize: 11, color: '#666' }}>Loading UOMs...</div>
          ) : baseUOMError ? (
            <div style={{ padding: 30, textAlign: 'center', fontSize: 11, color: '#ef4444' }}>{baseUOMError}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Code</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Name</th>
              </tr></thead>
              <tbody>
                {paginatedBaseUOM.length === 0 ? (
                  <tr><td colSpan={2} style={{ padding: 20, textAlign: 'center', fontSize: 10, color: '#999' }}>No UOMs found</td></tr>
                ) : paginatedBaseUOM.map((uom, i) => (
                  <tr key={uom.code} onClick={() => selectBaseUOM(uom)}
                    style={{ cursor: 'pointer', background: i % 2 ? '#f9fafb' : '#fff' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#f9fafb' : '#fff'}>
                    <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{uom.code}</td>
                    <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{uom.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
          <button onClick={() => setBaseUOMPage(p => Math.max(1, p - 1))} disabled={baseUOMPage === 1}
            style={{ padding: '4px 12px', fontSize: 10, background: baseUOMPage === 1 ? '#e5e7eb' : '#3b82f6', color: baseUOMPage === 1 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: baseUOMPage === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
          <span style={{ fontSize: 10, color: '#000' }}>Page {baseUOMPage} of {totalBaseUOMPages || 1}</span>
          <button onClick={() => setBaseUOMPage(p => Math.min(totalBaseUOMPages, p + 1))} disabled={baseUOMPage >= totalBaseUOMPages || totalBaseUOMPages === 0}
            style={{ padding: '4px 12px', fontSize: 10, background: (baseUOMPage >= totalBaseUOMPages || totalBaseUOMPages === 0) ? '#e5e7eb' : '#3b82f6', color: (baseUOMPage >= totalBaseUOMPages || totalBaseUOMPages === 0) ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: (baseUOMPage >= totalBaseUOMPages || totalBaseUOMPages === 0) ? 'not-allowed' : 'pointer' }}>Next</button>
        </div>
        <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8 }} />
      </div>
    </div>
  );
 
  // ──────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', padding: 0, margin: 0, background: '#fff' }}>
 
      {/* ── Title ─────────────────────────────────────────────────────────── */}
      <div style={{
        marginBottom: 8,
        background: 'linear-gradient(to right, #bfdbfe, #d1d5db)',
        borderRadius: 4,
        padding: '3px 10px',
        display: 'flex',
        alignItems: 'center',
      }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#1e3a5f' }}>Item Info</h3>
      </div>
 
      {/* ── Mandatory fields banner ───────────────────────────────────────── */}
      <MandatoryBanner
        mandatoryKeys={mandatoryKeys}
        companyName={companyName}
        plantName={plantName}
        loading={mfLoading}
      />
 
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
 
        {/* ── Base UOM ──────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: mandatoryBg(isMand('base_uom')),
          borderRadius: 4,
          padding: isMand('base_uom') ? '2px 4px' : '0',
          outline: mandatoryOutline(isMand('base_uom')),
        }}>
          <MandLabel label="Base UOM" isMand={isMand('base_uom')} />
          <div style={{ position: 'relative', flex: 1 }}>
            {/*
              data-field="uom_code"        → DOM scan by field name
              data-selected-code           → DOM scan reads the selected UOM code
              data-selected-name           → DOM scan reads the selected UOM name
            */}
            <input
              readOnly
              name="baseUOM"
              data-field="uom_code"
              data-selected-code={formData.baseUOM}
              data-selected-name={formData.baseUOMName}
              value={formData.baseUOM}
              placeholder="Enter Base UOM for Search"
              onClick={() => setShowBaseUOMModal(true)}
              style={{
                width: '100%', padding: '3px 45px 3px 6px',
                border: `1.5px solid ${mandatoryBorder(isMand('base_uom'))}`,
                background: isMand('base_uom') ? '#fef2f2' : '#fff',
                fontSize: 11, borderRadius: 2, cursor: 'pointer', color: '#333',
              }}
            />
            {formData.baseUOM && (
              <button onClick={clearBaseUOM}
                style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <X size={12} color="#ef4444" />
              </button>
            )}
            <button onClick={() => setShowBaseUOMModal(true)}
              style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Search size={14} color="#666" />
            </button>
          </div>
        </div>
 
        {/* ── Max Loose ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: mandatoryBg(isMand('max_loose')),
          borderRadius: 4,
          padding: isMand('max_loose') ? '2px 4px' : '0',
          outline: mandatoryOutline(isMand('max_loose')),
        }}>
          <MandLabel label="Max. Loose" isMand={isMand('max_loose')} />
          {/* data-field="max_loose" → DOM scan fallback */}
          <input
            type="number"
            name="maxLoose"
            data-field="max_loose"
            value={formData.maxLoose}
            onChange={handleInputChange}
            style={{
              flex: 1, padding: '3px 6px',
              border: `1.5px solid ${mandatoryBorder(isMand('max_loose'))}`,
              background: isMand('max_loose') ? '#fef2f2' : '#fff',
              fontSize: 11, borderRadius: 2, color: '#000',
            }}
          />
        </div>
 
        {/* ── Stock / Service ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <label style={{ fontSize: 11, color: '#000', minWidth: 140, paddingTop: 6 }}>Stock/Service</label>
          <div style={{
            background: (isMand('stock') || isMand('service')) ? '#fef2f2' : '#f0f4ff',
            border: `1px solid ${(isMand('stock') || isMand('service')) ? '#ef4444' : '#c7d4f0'}`,
            borderRadius: 4, padding: '5px 10px',
            display: 'flex', flexDirection: 'column', gap: 5,
            outline: (isMand('stock') || isMand('service')) ? '1.5px solid #ef4444' : 'none',
          }}>
            {/* Stock row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11,
                color: isMand('stock') ? '#991b1b' : '#374151',
                minWidth: 46, fontWeight: isMand('stock') ? 700 : 500,
              }}>
                Stock{isMand('stock') && <span style={{ color: '#dc2626' }}> *</span>}
              </span>
              {renderYesNoButtons('is_stock', stockServiceSel.stock, (val) => handleStockServiceToggle('stock', val))}
            </div>
            <div style={{ borderTop: '1px solid #d1daf5', margin: '0 -2px' }} />
            {/* Service row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11,
                color: isMand('service') ? '#991b1b' : '#374151',
                minWidth: 46, fontWeight: isMand('service') ? 700 : 500,
              }}>
                Service{isMand('service') && <span style={{ color: '#dc2626' }}> *</span>}
              </span>
              {renderYesNoButtons('is_service', stockServiceSel.service, (val) => handleStockServiceToggle('service', val))}
            </div>
          </div>
        </div>
 
        {/* ── Batch / Serial ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <label style={{ fontSize: 11, color: '#000', minWidth: 140, paddingTop: 6 }}>Batch Item/Serial Item</label>
          <div style={{
            background: (isMand('batch') || isMand('serial')) ? '#fef2f2' : '#f0faf4',
            border: `1px solid ${(isMand('batch') || isMand('serial')) ? '#ef4444' : '#b6dfc8'}`,
            borderRadius: 4, padding: '5px 10px',
            display: 'flex', flexDirection: 'column', gap: 5,
            outline: (isMand('batch') || isMand('serial')) ? '1.5px solid #ef4444' : 'none',
          }}>
            {/* Batch row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11,
                color: isMand('batch') ? '#991b1b' : '#374151',
                minWidth: 46, fontWeight: isMand('batch') ? 700 : 500,
              }}>
                Batch{isMand('batch') && <span style={{ color: '#dc2626' }}> *</span>}
              </span>
              {renderYesNoButtons('is_batch', batchSerialSel.batch, (val) => handleBatchSerialToggle('batch', val))}
            </div>
            <div style={{ borderTop: '1px solid #c3e6d2', margin: '0 -2px' }} />
            {/* Serial row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11,
                color: isMand('serial') ? '#991b1b' : '#374151',
                minWidth: 46, fontWeight: isMand('serial') ? 700 : 500,
              }}>
                Serial{isMand('serial') && <span style={{ color: '#dc2626' }}> *</span>}
              </span>
              {renderYesNoButtons('is_serial', batchSerialSel.serial, (val) => handleBatchSerialToggle('serial', val))}
            </div>
          </div>
        </div>
 
        {/* ── Gift Voucher ──────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: mandatoryBg(isMand('gift_voucher')),
          borderRadius: 4,
          padding: isMand('gift_voucher') ? '2px 4px' : '0',
          outline: mandatoryOutline(isMand('gift_voucher')),
        }}>
          <MandLabel label="Gift Voucher" isMand={isMand('gift_voucher')} />
          <div style={{
            background: isMand('gift_voucher') ? '#fef2f2' : '#fff7ed',
            border: `1px solid ${isMand('gift_voucher') ? '#ef4444' : '#f5cfa0'}`,
            borderRadius: 4, padding: '5px 10px', display: 'inline-flex', alignItems: 'center',
          }}>
            {renderYesNoButtons('is_gift_voucher', giftVoucherSel, (val) => setGiftVoucherSel(val))}
          </div>
        </div>
 
        {/* ── Extended Warranty ─────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: mandatoryBg(isMand('extended_warranty')),
          borderRadius: 4,
          padding: isMand('extended_warranty') ? '2px 4px' : '0',
          outline: mandatoryOutline(isMand('extended_warranty')),
        }}>
          <MandLabel label="Extended Warranty" isMand={isMand('extended_warranty')} />
          <div style={{
            background: isMand('extended_warranty') ? '#fef2f2' : '#fdf4ff',
            border: `1px solid ${isMand('extended_warranty') ? '#ef4444' : '#e2b8f5'}`,
            borderRadius: 4, padding: '5px 10px', display: 'inline-flex', alignItems: 'center',
          }}>
            {renderYesNoButtons('has_extended_warranty', extWarrantySel, (val) => setExtWarrantySel(val))}
          </div>
        </div>
 
      </div>
 
      {showBaseUOMModal && renderBaseUOMModal()}
    </div>
  );
};
 
export default ItemInfoMaster;