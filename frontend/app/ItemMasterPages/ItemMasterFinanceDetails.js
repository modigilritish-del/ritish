/**
 * ItemMasterFinanceDetails.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Finance tab — Yes/No fields (Batch Costing, Serial No. Costing)
 * fetch from yes_no_master LOV API.
 * Stores yes_no_id, yes_no_pair_id, label_type, label in DB.
 *
 * Fields:
 *   Text/LOV : Tax Group, Method of Costing, Costing Method No., Standard Price
 *   Yes/No   : Batch Costing, Serial No. Costing
 *
 * Props:
 *   entityId   — item_basic_info_item_master.id
 *   requestId  — ICR snapshot string
 *   createdBy  — logged-in user id
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import useMandatoryFields from './useMandatoryFields';


const API_BASE  = 'http://localhost:8000/api';
const SF_BASE   = `${API_BASE}/item-master-sf`;   // sales-finance router prefix
const YN_LOV    = `${API_BASE}/yes-no-master/lov`;

// ─── UUC Yes/No Toggle Button ─────────────────────────────────────────────────
// University Unique Color palette:
//   YES → #00843D (UUC Forest Green)  with white text
//   NO  → #C8102E (UUC Crimson Red)   with white text
//   UNSET → #e5e7eb (neutral grey)
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_KEY = 'item-master-finance-details';

const FIELD_LABELS = {
  tax_group:         'Tax Group',
  standard_price:    'Standard Price',
  method_of_costing: 'Method of Costing',
  costing_method_no: 'Costing Method No.',
  batch_costing:     'Batch Costing',
  serial_no_costing: 'Serial No. Costing',
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

const UUC_GREEN  = '#00843D';
const UUC_RED    = '#C8102E';
const UUC_NEUTRAL = '#e5e7eb';

const YesNoToggle = ({ label, value, onChange, yesNoOptions, loadingLov, isMandatory = false }) => {
  const selectedType = value?.label_type || null;
  const option = yesNoOptions?.[0] || null;

  const handleYes = () => {
    if (!option) return;
    if (selectedType === 'yes') { onChange(null); return; }
    onChange({ yes_no_id: option.yes_id, yes_no_pair_id: option.yes_no_pair_id, label_type: 'yes', label: option.yes_label });
  };

  const handleNo = () => {
    if (!option) return;
    if (selectedType === 'no') { onChange(null); return; }
    onChange({ yes_no_id: option.no_id, yes_no_pair_id: option.yes_no_pair_id, label_type: 'no', label: option.no_label });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: isMandatory ? '#fef2f2' : 'transparent', borderRadius: 4, padding: isMandatory ? '2px 4px' : '0', outline: isMandatory ? '1.5px solid #ef4444' : 'none' }}>
      <label style={{ fontSize: 11, fontWeight: isMandatory ? 700 : 600, color: isMandatory ? '#991b1b' : '#374151' }}>
        {label}{isMandatory && <span style={{ color: '#dc2626' }}> *</span>}
      </label>

      {loadingLov ? (
        <div style={{ fontSize: 10, color: '#9ca3af' }}>Loading…</div>
      ) : !option ? (
        <div style={{ fontSize: 10, color: '#ef4444' }}>No Yes/No pair found. Please add one in Yes/No Master.</div>
      ) : (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>

          {/* YES button */}
          <button
            onClick={handleYes}
            title={`Select: ${option.yes_label}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 14px',
              fontSize: 11, fontWeight: 700,
              border: 'none', borderRadius: 20,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              background: selectedType === 'yes' ? UUC_GREEN : UUC_NEUTRAL,
              color:      selectedType === 'yes' ? '#fff' : '#6b7280',
              boxShadow:  selectedType === 'yes'
                ? '0 2px 8px rgba(0,132,61,0.35)'
                : '0 1px 3px rgba(0,0,0,0.08)',
              transform:  selectedType === 'yes' ? 'scale(1.04)' : 'scale(1)',
              letterSpacing: 0.3,
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: selectedType === 'yes' ? '#7fedad' : '#d1d5db',
              display: 'inline-block', transition: 'background 0.18s', flexShrink: 0,
            }} />
            {option.yes_label}
          </button>

          <span style={{ color: '#d1d5db', fontSize: 13, fontWeight: 300 }}>/</span>

          {/* NO button */}
          <button
            onClick={handleNo}
            title={`Select: ${option.no_label}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 14px',
              fontSize: 11, fontWeight: 700,
              border: 'none', borderRadius: 20,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              background: selectedType === 'no' ? UUC_RED : UUC_NEUTRAL,
              color:      selectedType === 'no' ? '#fff' : '#6b7280',
              boxShadow:  selectedType === 'no'
                ? '0 2px 8px rgba(200,16,46,0.35)'
                : '0 1px 3px rgba(0,0,0,0.08)',
              transform:  selectedType === 'no' ? 'scale(1.04)' : 'scale(1)',
              letterSpacing: 0.3,
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: selectedType === 'no' ? '#f8a5b3' : '#d1d5db',
              display: 'inline-block', transition: 'background 0.18s', flexShrink: 0,
            }} />
            {option.no_label}
          </button>


        </div>
      )}
    </div>
  );
};


// ─── Main Component ───────────────────────────────────────────────────────────

const ItemMasterFinanceDetails = ({ entityId, requestId, createdBy, mappingRecord }) => {

  // ── Mandatory fields ──────────────────────────────────────────────────────
  const companyId   = mappingRecord?.company_id ?? mappingRecord?.company?.id ?? null;
  const plantId     = mappingRecord?.plant_id   ?? mappingRecord?.plant?.id   ?? null;
  const companyName = mappingRecord?.company?.company_name ?? mappingRecord?.company?.name ?? '';
  const plantName   = mappingRecord?.plant?.plant_name    ?? mappingRecord?.plant?.name    ?? '';
  const { mandatoryKeys, loading: mfLoading } = useMandatoryFields({ pageKey: PAGE_KEY, companyId, plantId });
  const isMand = (key) => mandatoryKeys.includes(key);

  // ── Text fields ───────────────────────────────────────────────────────────
  const [taxGroup,         setTaxGroup]         = useState('');
  const [methodOfCosting,  setMethodOfCosting]  = useState('WAC - WEIGHTED AVERAGE COST');
  const [standardPrice,    setStandardPrice]    = useState('');
  const [costingMethodNo,  setCostingMethodNo]  = useState('1');

  // ── Yes/No fields ─────────────────────────────────────────────────────────
  const [batchCosting,    setBatchCosting]    = useState(null);
  const [serialNoCosting, setSerialNoCosting] = useState(null);

  // ── Yes/No LOV ────────────────────────────────────────────────────────────
  const [yesNoOptions, setYesNoOptions] = useState([]);
  const [loadingLov,   setLoadingLov]   = useState(true);

  // ── DB record IDs (for PUT) ───────────────────────────────────────────────
  const [recordIds, setRecordIds] = useState({
    tax_group:         null,
    method_of_costing: null,
    standard_price:    null,
    costing_method_no: null,
    batch_costing:     null,
    serial_no_costing: null,
  });

  // ── Save state ────────────────────────────────────────────────────────────
  const [saving,    setSaving]    = useState(false);
  const [savedOk,   setSavedOk]   = useState(false);
  const [saveError, setSaveError] = useState(null);

  // ── 1. Fetch Yes/No LOV ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchLov = async () => {
      try {
        setLoadingLov(true);
        const res  = await fetch(YN_LOV);
        const data = await res.json();
        setYesNoOptions(Array.isArray(data) ? data : []);
      } catch {
        setYesNoOptions([]);
      } finally {
        setLoadingLov(false);
      }
    };
    fetchLov();
  }, []);

  // ── 2. Load existing DB data when entityId changes ────────────────────────
  const loadField = useCallback(async (field) => {
    if (!entityId) return null;
    try {
      const res = await fetch(`${SF_BASE}/${field}/${entityId}`);
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }, [entityId]);

  useEffect(() => {
    if (!entityId) return;
    const loadAll = async () => {
      const [tg, mc, sp, cm, bc, sn] = await Promise.all([
        loadField('tax-group'),
        loadField('method-of-costing'),
        loadField('standard-price'),
        loadField('costing-method-no'),
        loadField('batch-costing'),
        loadField('serial-no-costing'),
      ]);

      if (tg) { setTaxGroup(tg.tax_group ?? '');             setRecordIds(p => ({ ...p, tax_group:         tg.id })); }
      if (mc) { setMethodOfCosting(mc.method_of_costing ?? ''); setRecordIds(p => ({ ...p, method_of_costing: mc.id })); }
      if (sp) { setStandardPrice(sp.standard_price ?? '');   setRecordIds(p => ({ ...p, standard_price:    sp.id })); }
      if (cm) { setCostingMethodNo(cm.costing_method_no ?? '1'); setRecordIds(p => ({ ...p, costing_method_no: cm.id })); }

      // Yes/No fields
      const toYn = (row) => {
        if (!row) return null;
        return {
          yes_no_id:      row.yes_no_id,
          yes_no_pair_id: row.yes_no_pair_id,
          label_type:     row.label_type,
          label:          row.label,
        };
      };

      if (bc) { setBatchCosting(toYn(bc));    setRecordIds(p => ({ ...p, batch_costing:     bc.id })); }
      if (sn) { setSerialNoCosting(toYn(sn)); setRecordIds(p => ({ ...p, serial_no_costing: sn.id })); }
    };
    loadAll();
  }, [entityId, loadField]);

  // ── 3. Save helper ────────────────────────────────────────────────────────
  const saveField = async (field, body, recordId) => {
    if (recordId) {
      const res = await fetch(`${SF_BASE}/${field}/${recordId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...body, updated_by: createdBy }),
      });
      if (!res.ok) throw new Error(`${field} update failed`);
      return (await res.json()).id;
    } else {
      const res = await fetch(`${SF_BASE}/${field}/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ entity_id: entityId, request_id: requestId, created_by: createdBy, ...body }),
      });
      if (!res.ok) throw new Error(`${field} create failed`);
      return (await res.json()).id;
    }
  };

  // ── 4. Yes/No body builder ────────────────────────────────────────────────
  const ynBody = (val, boolField) => ({
    // Finance table stores boolean AND yes_no_id — both
    [boolField]:    val?.label_type === 'yes' ? true : false,
    yes_no_id:      val?.yes_no_id      ?? null,
    yes_no_pair_id: val?.yes_no_pair_id ?? null,
    label_type:     val?.label_type     ?? null,
    label:          val?.label          ?? null,
  });

  // ── 5. Handle Save ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!entityId) return;
    setSaving(true); setSavedOk(false); setSaveError(null);
    try {
      const newIds = { ...recordIds };

      newIds.tax_group         = await saveField('tax-group',         { tax_group:         taxGroup        }, recordIds.tax_group);
      newIds.method_of_costing = await saveField('method-of-costing', { method_of_costing: methodOfCosting }, recordIds.method_of_costing);
      newIds.standard_price    = await saveField('standard-price',    { standard_price:    standardPrice || null }, recordIds.standard_price);
      newIds.costing_method_no = await saveField('costing-method-no', { costing_method_no: costingMethodNo }, recordIds.costing_method_no);
      newIds.batch_costing     = await saveField('batch-costing',     ynBody(batchCosting,    'batch_costing'),     recordIds.batch_costing);
      newIds.serial_no_costing = await saveField('serial-no-costing', ynBody(serialNoCosting, 'serial_no_costing'), recordIds.serial_no_costing);

      setRecordIds(newIds);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } catch (e) {
      setSaveError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>

      {/* Section Header */}
      <div style={{ background: 'linear-gradient(to right, #bfdbfe, #d1d5db)', borderRadius: 4, margin: '0 0 8px 0', padding: '3px 10px', display: 'flex', alignItems: 'center' }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#1e3a5f' }}>💰 Finance Details</h3>
      </div>

      {/* Mandatory Banner */}
      <div style={{ padding: '0 12px' }}>
        <MandatoryBanner mandatoryKeys={mandatoryKeys} companyName={companyName} plantName={plantName} loading={mfLoading} />
      </div>

      {/* Form Body */}
      <div style={{ padding: '12px' }}>

        {/* Row 1 — Tax Group & Standard Price */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: mandBg(isMand('tax_group')), borderRadius: 4, padding: isMand('tax_group') ? '2px 4px' : '0', outline: mandOutline(isMand('tax_group')) }}>
            <label style={{ fontSize: 11, fontWeight: isMand('tax_group') ? 700 : 600, color: isMand('tax_group') ? '#991b1b' : '#374151' }}>
              Tax Group{isMand('tax_group') && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
            <input
              type="text"
              value={taxGroup}
              onChange={e => setTaxGroup(e.target.value)}
              placeholder="Enter Tax Group"
              style={{ padding: '6px 8px', fontSize: 11, border: '1px solid ' + mandBorder(isMand('tax_group')), borderRadius: 4, color: '#374151', background: mandBg(isMand('tax_group')), outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: mandBg(isMand('standard_price')), borderRadius: 4, padding: isMand('standard_price') ? '2px 4px' : '0', outline: mandOutline(isMand('standard_price')) }}>
            <label style={{ fontSize: 11, fontWeight: isMand('standard_price') ? 700 : 600, color: isMand('standard_price') ? '#991b1b' : '#374151' }}>
              Standard Price{isMand('standard_price') && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
            <input
              type="text"
              value={standardPrice}
              onChange={e => setStandardPrice(e.target.value)}
              style={{ padding: '6px 8px', fontSize: 11, border: '1px solid ' + mandBorder(isMand('standard_price')), borderRadius: 4, color: '#374151', background: mandBg(isMand('standard_price')), outline: 'none' }}
            />
          </div>
        </div>

        {/* Row 2 — Method of Costing & Costing Method No. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: mandBg(isMand('method_of_costing')), borderRadius: 4, padding: isMand('method_of_costing') ? '2px 4px' : '0', outline: mandOutline(isMand('method_of_costing')) }}>
            <label style={{ fontSize: 11, fontWeight: isMand('method_of_costing') ? 700 : 600, color: isMand('method_of_costing') ? '#991b1b' : '#374151' }}>
              Method of Costing{isMand('method_of_costing') && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
            <input
              type="text"
              value={methodOfCosting}
              onChange={e => setMethodOfCosting(e.target.value)}
              style={{ padding: '6px 8px', fontSize: 11, border: '1px solid ' + mandBorder(isMand('method_of_costing')), borderRadius: 4, color: '#374151', background: mandBg(isMand('method_of_costing')), outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: mandBg(isMand('costing_method_no')), borderRadius: 4, padding: isMand('costing_method_no') ? '2px 4px' : '0', outline: mandOutline(isMand('costing_method_no')) }}>
            <label style={{ fontSize: 11, fontWeight: isMand('costing_method_no') ? 700 : 600, color: isMand('costing_method_no') ? '#991b1b' : '#374151' }}>
              Costing Method No.{isMand('costing_method_no') && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
            <input
              type="text"
              value={costingMethodNo}
              onChange={e => setCostingMethodNo(e.target.value)}
              style={{ padding: '6px 8px', fontSize: 11, border: '1px solid ' + mandBorder(isMand('costing_method_no')), borderRadius: 4, color: '#374151', background: mandBg(isMand('costing_method_no')), outline: 'none' }}
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px dashed #e5e7eb', marginBottom: 14 }} />

        {/* Row 3 — Yes/No toggles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>

          <YesNoToggle
            label="Batch Costing"
            value={batchCosting}
            onChange={setBatchCosting}
            yesNoOptions={yesNoOptions}
            loadingLov={loadingLov}
            isMandatory={isMand('batch_costing')}
          />

          <YesNoToggle
            label="Serial No. Costing"
            value={serialNoCosting}
            onChange={setSerialNoCosting}
            yesNoOptions={yesNoOptions}
            loadingLov={loadingLov}
            isMandatory={isMand('serial_no_costing')}
          />

        </div>

      </div>
    </div>
  );
};

export default ItemMasterFinanceDetails;