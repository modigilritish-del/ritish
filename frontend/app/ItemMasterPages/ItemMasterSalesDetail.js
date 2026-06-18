import React, { useState } from 'react';
import useMandatoryFields from './useMandatoryFields';

const PAGE_KEY = 'item-master-sales-details';

const FIELD_LABELS = {
  item_class:         'Item Class',
  ved_class:          'VED Class',
  price_control_code: 'Price Control Code',
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

const ItemMasterSalesDetail = ({ mappingRecord }) => {
  const companyId   = mappingRecord?.company_id ?? mappingRecord?.company?.id ?? null;
  const plantId     = mappingRecord?.plant_id   ?? mappingRecord?.plant?.id   ?? null;
  const companyName = mappingRecord?.company?.company_name ?? mappingRecord?.company?.name ?? '';
  const plantName   = mappingRecord?.plant?.plant_name    ?? mappingRecord?.plant?.name    ?? '';

  const { mandatoryKeys, loading: mfLoading } = useMandatoryFields({ pageKey: PAGE_KEY, companyId, plantId });
  const isMand = (key) => mandatoryKeys.includes(key);

  const [formData, setFormData] = useState({
    itemClass: 'Always',
    vedClass: 'Vital',
    priceControlCode: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>

        {/* Section Header */}
        <div style={{ background: 'linear-gradient(to right, #bfdbfe, #d1d5db)', borderRadius: 4, marginBottom: 8, padding: '3px 10px', display: 'flex', alignItems: 'center' }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#1e3a5f' }}>Sales Details</h3>
        </div>

        {/* Mandatory Banner */}
        <MandatoryBanner mandatoryKeys={mandatoryKeys} companyName={companyName} plantName={plantName} loading={mfLoading} />

        {/* First Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>

          {/* Item Class */}
          <div style={{ display: 'flex', flexDirection: 'column', background: mandBg(isMand('item_class')), borderRadius: 4, padding: isMand('item_class') ? '2px 4px' : '0', outline: mandOutline(isMand('item_class')) }}>
            <label style={{ fontSize: '11px', fontWeight: isMand('item_class') ? 700 : 500, color: isMand('item_class') ? '#991b1b' : '#374151', marginBottom: '4px' }}>
              Item Class{isMand('item_class') && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
            <select
              name="itemClass"
              value={formData.itemClass}
              onChange={handleInputChange}
              style={{ padding: '6px 8px', fontSize: '11px', border: '1px solid ' + mandBorder(isMand('item_class')), borderRadius: '4px', backgroundColor: mandBg(isMand('item_class')), color: '#374151', cursor: 'pointer', outline: 'none' }}
            >
              <option value="Always">Always</option>
              <option value="Sometimes">Sometimes</option>
              <option value="Never">Never</option>
            </select>
          </div>

          {/* VED Class */}
          <div style={{ display: 'flex', flexDirection: 'column', background: mandBg(isMand('ved_class')), borderRadius: 4, padding: isMand('ved_class') ? '2px 4px' : '0', outline: mandOutline(isMand('ved_class')) }}>
            <label style={{ fontSize: '11px', fontWeight: isMand('ved_class') ? 700 : 500, color: isMand('ved_class') ? '#991b1b' : '#374151', marginBottom: '4px' }}>
              VED Class{isMand('ved_class') && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
            <select
              name="vedClass"
              value={formData.vedClass}
              onChange={handleInputChange}
              style={{ padding: '6px 8px', fontSize: '11px', border: '1px solid ' + mandBorder(isMand('ved_class')), borderRadius: '4px', backgroundColor: mandBg(isMand('ved_class')), color: '#374151', cursor: 'pointer', outline: 'none' }}
            >
              <option value="Vital">Vital</option>
              <option value="Essential">Essential</option>
              <option value="Desirable">Desirable</option>
            </select>
          </div>
        </div>

        {/* Second Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

          {/* Price Control Code */}
          <div style={{ display: 'flex', flexDirection: 'column', background: mandBg(isMand('price_control_code')), borderRadius: 4, padding: isMand('price_control_code') ? '2px 4px' : '0', outline: mandOutline(isMand('price_control_code')) }}>
            <label style={{ fontSize: '11px', fontWeight: isMand('price_control_code') ? 700 : 500, color: isMand('price_control_code') ? '#991b1b' : '#374151', marginBottom: '4px' }}>
              Price Control Code{isMand('price_control_code') && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
            <input
              type="text"
              name="priceControlCode"
              value={formData.priceControlCode}
              onChange={handleInputChange}
              placeholder="Enter Price Control Code for Search"
              style={{ padding: '6px 8px', fontSize: '11px', border: '1px solid ' + mandBorder(isMand('price_control_code')), borderRadius: '4px', backgroundColor: mandBg(isMand('price_control_code')), color: '#374151', outline: 'none' }}
            />
          </div>

          <div></div>
        </div>
      </div>
    </div>
  );
};

export default ItemMasterSalesDetail;