import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import useMandatoryFields from './useMandatoryFields';

const API_BASE = 'http://localhost:8000/api';

const PAGE_KEY = 'item-master-inv-properties';

const FIELD_LABELS = {
  // Page 1 fields
  stock_check_level_at_item:      'Stock Check Level At Item',
  reservation_allowed:            'Reservation Allowed',
  over_reservation_allowed:       'Over-Reservation Allowed',
  auto_release:                   'Auto Release',
  auto_release_hours:             'Auto Release Hours',
  hold:                           'Hold',
  grade_1_required:               'Grade 1 Required',
  grade_2_required:               'Grade 2 Required',
  default_value_for_grade_1:      'Default Value For Grade 1',
  default_value_for_grade_2:      'Default Value For Grade 2',
  // Page 2 fields
  batch_category_batch_items:     'Batch Category-Batch Items',
  zero_rated_sales_item:          'Zero Rated Sales Item',
  barcode_type:                   'Barcode Type',
  inhouse_manufacturer_barcode:   'Inhouse / Manufacturer Barcode',
  barcode_generation:             'Barcode Generation',
  barcode_pricelist_updation:     'Barcode Pricelist Updation',
  markup_perc_for_barcode_price:  'Markup Perc For Barcode Price',
  serial_number_category:         'Serial Number Category',
  temperature_check_required:     'Temperature Check Required',
  weight_check_required:          'Weight Check Required',
  // Page 3 fields
  volume_check_required:          'Volume Check Required',
  dimension_check_required:       'Dimension Check Required',
  all_dimensions_required:        'All Dimensions Required',
  group_by_batch_srno_pack:       'Group By Batch/Srno/Pack',
  so_positive_tolerance_pct:      'SO Positive Tolerance %',
  so_negative_tolerance_pct:      'SO Negative Tolerance %',
  so_tolerance_required:          'SO Tolerance Required Yes/No',
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

const ItemMasterInvProperties = ({ mappingRecord }) => {
  const companyId   = mappingRecord?.company_id ?? mappingRecord?.company?.id ?? null;
  const plantId     = mappingRecord?.plant_id   ?? mappingRecord?.plant?.id   ?? null;
  const companyName = mappingRecord?.company?.company_name ?? mappingRecord?.company?.name ?? '';
  const plantName   = mappingRecord?.plant?.plant_name    ?? mappingRecord?.plant?.name    ?? '';

  const { mandatoryKeys, loading: mfLoading } = useMandatoryFields({ pageKey: PAGE_KEY, companyId, plantId });
  const isMand = (key) => mandatoryKeys.includes(key);

  const [yesNoPairs, setYesNoPairs] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/yes-no-master/lov`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setYesNoPairs(d); })
      .catch(() => {});
  }, []);

  const [formData, setFormData] = useState({
    // Page 1
    stockCheckLevelAtItem:      '',
    reservationAllowed:         'no',
    overReservationAllowed:     'no',
    autoRelease:                'no',
    autoReleaseHours:           '',
    hold:                       'no',
    grade1Required:             'no',
    grade2Required:             'no',
    defaultValueForGrade1:      '',
    defaultValueForGrade2:      '',
    // Page 2
    batchCategoryBatchItems:    '',
    zeroRatedSalesItem:         'no',
    barcodeType:                '',
    inhouseManufacturerBarcode: '',
    barcodeGeneration:          '',
    barcodePricelistUpdation:   '',
    markupPercForBarcodePrice:  '',
    serialNumberCategory:       '',
    temperatureCheckRequired:   'no',
    weightCheckRequired:        'no',
    // Page 3
    volumeCheckRequired:        'no',
    dimensionCheckRequired:     'no',
    allDimensionsRequired:      'no',
    groupByBatchSrnoPack:       'no',
    soPositiveTolerancePct:     '',
    soNegativeTolerancePct:     '',
    soToleranceRequired:        'no',
  });

  const [showModal, setShowModal]     = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const lovData = {
    // Page 1
    stockCheckLevelAtItem: [
      { code: '1', description: 'No Check' },
      { code: '2', description: 'Warning Only' },
      { code: '3', description: 'Negative Not Allowed' },
      { code: '4', description: 'Strict Check' },
    ],
    reservationAllowed:         [{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }],
    overReservationAllowed:     [{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }],
    autoRelease:                [{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }],
    hold:                       [{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }],
    grade1Required:             [{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }],
    grade2Required:             [{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }],
    defaultValueForGrade1: [
      { code: 'NA', description: 'Not Applicable' },
      { code: 'A',  description: 'Grade A' },
      { code: 'B',  description: 'Grade B' },
      { code: 'C',  description: 'Grade C' },
    ],
    defaultValueForGrade2: [
      { code: 'NA', description: 'Not Applicable' },
      { code: 'A',  description: 'Grade A' },
      { code: 'B',  description: 'Grade B' },
      { code: 'C',  description: 'Grade C' },
    ],
    // Page 2
    batchCategoryBatchItems: [
      { code: 'BC001', description: 'Batch Category 1' },
      { code: 'BC002', description: 'Batch Category 2' },
      { code: 'BC003', description: 'Batch Category 3' },
    ],
    zeroRatedSalesItem:         [{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }],
    barcodeType: [
      { code: 'EAN13',   description: 'EAN-13' },
      { code: 'EAN8',    description: 'EAN-8' },
      { code: 'UPC',     description: 'UPC' },
      { code: 'QR',      description: 'QR Code' },
      { code: 'CODE128', description: 'Code 128' },
    ],
    inhouseManufacturerBarcode: [
      { code: 'INHOUSE', description: 'Inhouse Barcode' },
      { code: 'MFR',     description: 'Manufacturer Barcode' },
    ],
    barcodeGeneration:          [{ code: 'A', description: 'Automatic' }, { code: 'M', description: 'Manual' }],
    barcodePricelistUpdation:   [{ code: 'A', description: 'Automatic' }, { code: 'M', description: 'Manual' }],
    serialNumberCategory: [
      { code: 'SNC001', description: 'Category 1' },
      { code: 'SNC002', description: 'Category 2' },
      { code: 'SNC003', description: 'Category 3' },
    ],
    temperatureCheckRequired:   [{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }],
    weightCheckRequired:        [{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }],
    // Page 3
    volumeCheckRequired:        [{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }],
    dimensionCheckRequired:     [{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }],
    allDimensionsRequired:      [{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }],
    groupByBatchSrnoPack:       [{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }],
    soToleranceRequired:        [{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }],
  };

  const modalTitles = {
    // Page 1
    stockCheckLevelAtItem:      'STOCK CHECK LEVEL AT ITEM',
    reservationAllowed:         'RESERVATION ALLOWED',
    overReservationAllowed:     'OVER-RESERVATION ALLOWED',
    autoRelease:                'AUTO RELEASE',
    hold:                       'HOLD',
    grade1Required:             'GRADE 1 REQUIRED',
    grade2Required:             'GRADE 2 REQUIRED',
    defaultValueForGrade1:      'DEFAULT VALUE FOR GRADE 1',
    defaultValueForGrade2:      'DEFAULT VALUE FOR GRADE 2',
    // Page 2
    batchCategoryBatchItems:    'BATCH CATEGORY-BATCH ITEMS',
    zeroRatedSalesItem:         'ZERO RATED SALES ITEM',
    barcodeType:                'BARCODE TYPE',
    inhouseManufacturerBarcode: 'INHOUSE / MANUFACTURER BARCODE',
    barcodeGeneration:          'BARCODE GENERATION',
    barcodePricelistUpdation:   'BARCODE PRICELIST UPDATION',
    serialNumberCategory:       'SERIAL NUMBER CATEGORY',
    temperatureCheckRequired:   'TEMPERATURE CHECK REQUIRED',
    weightCheckRequired:        'WEIGHT CHECK REQUIRED',
    // Page 3
    volumeCheckRequired:        'VOLUME CHECK REQUIRED',
    dimensionCheckRequired:     'DIMENSION CHECK REQUIRED',
    allDimensionsRequired:      'ALL DIMENSIONS REQUIRED',
    groupByBatchSrnoPack:       'GROUP BY BATCH/SRNO/PACK',
    soToleranceRequired:        'SO TOLERANCE REQUIRED YES/NO',
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal  = (fieldName) => { setShowModal(fieldName); setSearchValue(''); setCurrentPage(1); };
  const handleCloseModal = () => { setShowModal(null); setSearchValue(''); setCurrentPage(1); };

  const handleSelectValue = (item) => {
    setFormData(prev => ({ ...prev, [showModal]: `${item.code} - ${item.description}` }));
    handleCloseModal();
  };

  const clearField = (fieldName) => setFormData(prev => ({ ...prev, [fieldName]: '' }));

  const getFilteredData = () => {
    if (!showModal || !lovData[showModal]) return [];
    const term = searchValue.toLowerCase();
    if (!term) return lovData[showModal];
    return lovData[showModal].filter(item =>
      item.code.toLowerCase().includes(term) || item.description.toLowerCase().includes(term)
    );
  };

  const filteredData  = getFilteredData();
  const totalPages    = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── YES/NO button renderer (same pattern as ItemInfoMaster) ─────────────
  const renderYesNoButtons = (currentVal, onToggle) => {
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
      <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #c8cdd3', borderRadius: 3, overflow: 'hidden', height: 22 }}>
        <button onClick={() => onToggle('yes')}
          style={{ ...btnBase, background: yesActive ? '#16a34a' : '#f0fdf4', color: yesActive ? '#fff' : '#15803d', border: 'none', borderRight: '1px solid #c8cdd3' }}>
          <span style={{ fontSize: 9, lineHeight: 1 }}>✔</span>{yesLabel}
        </button>
        <button onClick={() => onToggle('no')}
          style={{ ...btnBase, background: noActive ? '#dc2626' : '#fff5f5', color: noActive ? '#fff' : '#b91c1c', border: 'none' }}>
          <span style={{ fontSize: 9, lineHeight: 1 }}>✖</span>{noLabel}
        </button>
      </div>
    );
  };

  // ── YES/NO field renderer (label + YES/NO buttons, same layout as LOV field) ─
  const renderYesNoField = (label, fieldName, fieldKey) => {
    const im = isMand(fieldKey);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', background: mandBg(im), borderRadius: 4, padding: im ? '2px 4px' : '0', outline: mandOutline(im) }}>
        <label style={{ fontSize: '11px', fontWeight: im ? 700 : 500, color: im ? '#991b1b' : '#374151', marginBottom: '4px' }}>
          {label}{im && <span style={{ color: '#dc2626' }}> *</span>}
        </label>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {renderYesNoButtons(formData[fieldName], (val) =>
            setFormData(prev => ({ ...prev, [fieldName]: val }))
          )}
        </div>
      </div>
    );
  };

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
            style={{ width: '100%', padding: '6px 45px 6px 8px', border: '1px solid ' + mandBorder(im), fontSize: 11, borderRadius: 4, cursor: 'pointer', color: '#374151', background: mandBg(im), outline: 'none', boxSizing: 'border-box' }}
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

  const renderInputField = (label, fieldName, fieldKey, type = 'text') => {
    const im = isMand(fieldKey);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', background: mandBg(im), borderRadius: 4, padding: im ? '2px 4px' : '0', outline: mandOutline(im) }}>
        <label style={{ fontSize: '11px', fontWeight: im ? 700 : 500, color: im ? '#991b1b' : '#374151', marginBottom: '4px' }}>
          {label}{im && <span style={{ color: '#dc2626' }}> *</span>}
        </label>
        <input
          type={type}
          name={fieldName}
          value={formData[fieldName]}
          onChange={handleInputChange}
          style={{ padding: '6px 8px', fontSize: '11px', border: '1px solid ' + mandBorder(im), borderRadius: '4px', backgroundColor: mandBg(im), color: '#374151', outline: 'none' }}
        />
      </div>
    );
  };

  const renderSectionDivider = (title) => (
    <div style={{ background: 'linear-gradient(to right, #e0f2fe, #e5e7eb)', borderRadius: 4, marginBottom: 10, marginTop: 4, padding: '3px 10px', display: 'flex', alignItems: 'center' }}>
      <h4 style={{ fontSize: 11, fontWeight: 600, margin: 0, color: '#1e3a5f' }}>{title}</h4>
    </div>
  );

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
            <input
              autoFocus
              placeholder={`Enter ${modalTitles[showModal]} for Search`}
              value={searchValue}
              onChange={(e) => { setSearchValue(e.target.value); setCurrentPage(1); }}
              style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#333' }}
            />
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
                {paginatedData.length > 0 ? paginatedData.map((item, i) => (
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
                )) : (
                  <tr><td colSpan="2" style={{ padding: '30px', textAlign: 'center', fontSize: 10, color: '#999' }}>No results found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              style={{ padding: '4px 12px', fontSize: 10, background: currentPage === 1 ? '#e5e7eb' : '#3b82f6', color: currentPage === 1 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
              Previous
            </button>
            <span style={{ fontSize: 10, color: '#000' }}>Page {currentPage} of {totalPages || 1}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))} disabled={currentPage >= totalPages}
              style={{ padding: '4px 12px', fontSize: 10, background: currentPage >= totalPages ? '#e5e7eb' : '#3b82f6', color: currentPage >= totalPages ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}>
              Next
            </button>
          </div>
          <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8 }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', position: 'relative' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>

        {/* Section Header */}
        <div style={{ background: 'linear-gradient(to right, #bfdbfe, #d1d5db)', borderRadius: 4, marginBottom: 8, padding: '3px 10px', display: 'flex', alignItems: 'center' }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#1e3a5f' }}>Inventory Properties</h3>
        </div>

        {/* Mandatory Banner */}
        <MandatoryBanner mandatoryKeys={mandatoryKeys} companyName={companyName} plantName={plantName} loading={mfLoading} />

        {/* ── PAGE 1 — Stock / Grade Fields ── */}

        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {renderLOVField('Stock Check Level At Item', 'stockCheckLevelAtItem', 'stock_check_level_at_item')}
          {renderYesNoField('Reservation Allowed', 'reservationAllowed', 'reservation_allowed')}
        </div>

        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {renderYesNoField('Over-Reservation Allowed', 'overReservationAllowed', 'over_reservation_allowed')}
          {renderYesNoField('Auto Release', 'autoRelease', 'auto_release')}
        </div>

        {/* Row 3 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {renderInputField('Auto Release Hours', 'autoReleaseHours', 'auto_release_hours', 'number')}
          {renderYesNoField('Hold', 'hold', 'hold')}
        </div>

        {/* Row 4 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {renderYesNoField('Grade 1 Required', 'grade1Required', 'grade_1_required')}
          {renderYesNoField('Grade 2 Required', 'grade2Required', 'grade_2_required')}
        </div>

        {/* Row 5 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {renderLOVField('Default Value For Grade 1', 'defaultValueForGrade1', 'default_value_for_grade_1')}
          {renderLOVField('Default Value For Grade 2', 'defaultValueForGrade2', 'default_value_for_grade_2')}
        </div>

        {/* ── PAGE 2 — Batch & Barcode Fields ── */}
        {renderSectionDivider('Batch & Barcode Properties')}

        {/* Row 6 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {renderLOVField('Batch Category-Batch Items', 'batchCategoryBatchItems', 'batch_category_batch_items')}
          {renderYesNoField('Zero Rated Sales Item', 'zeroRatedSalesItem', 'zero_rated_sales_item')}
        </div>

        {/* Row 7 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {renderLOVField('Barcode Type', 'barcodeType', 'barcode_type')}
          {renderLOVField('Inhouse / Manufacturer Barcode', 'inhouseManufacturerBarcode', 'inhouse_manufacturer_barcode')}
        </div>

        {/* Row 8 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {renderLOVField('Barcode Generation', 'barcodeGeneration', 'barcode_generation')}
          {renderLOVField('Barcode Pricelist Updation', 'barcodePricelistUpdation', 'barcode_pricelist_updation')}
        </div>

        {/* Row 9 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {renderInputField('Markup Perc For Barcode Price', 'markupPercForBarcodePrice', 'markup_perc_for_barcode_price', 'number')}
          {renderLOVField('Serial Number Category', 'serialNumberCategory', 'serial_number_category')}
        </div>

        {/* Row 10 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {renderYesNoField('Temperature Check Required', 'temperatureCheckRequired', 'temperature_check_required')}
          {renderYesNoField('Weight Check Required', 'weightCheckRequired', 'weight_check_required')}
        </div>

        {/* ── PAGE 3 — Dimension / Tolerance Fields ── */}
        {renderSectionDivider('Dimension & Tolerance Properties')}

        {/* Row 11 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {renderYesNoField('Volume Check Required', 'volumeCheckRequired', 'volume_check_required')}
          {renderYesNoField('Dimension Check Required', 'dimensionCheckRequired', 'dimension_check_required')}
        </div>

        {/* Row 12 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {renderYesNoField('All Dimensions Required', 'allDimensionsRequired', 'all_dimensions_required')}
          {renderYesNoField('Group By Batch/Srno/Pack', 'groupByBatchSrnoPack', 'group_by_batch_srno_pack')}
        </div>

        {/* Row 13 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {renderInputField('SO Positive Tolerance %', 'soPositiveTolerancePct', 'so_positive_tolerance_pct', 'number')}
          {renderInputField('SO Negative Tolerance %', 'soNegativeTolerancePct', 'so_negative_tolerance_pct', 'number')}
        </div>

        {/* Row 14 — single field, half width */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {renderYesNoField('SO Tolerance Required Yes/No', 'soToleranceRequired', 'so_tolerance_required')}
          <div /> {/* empty cell to keep grid alignment */}
        </div>

      </div>

      {renderModal()}
    </div>
  );
};

export default ItemMasterInvProperties;