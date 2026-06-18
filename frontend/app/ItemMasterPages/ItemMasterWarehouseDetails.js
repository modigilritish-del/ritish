/**
 * ItemMasterWarehouseDetails.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Warehouse tab — Yes/No fields fetch from yes_no_master LOV API.
 * Stores yes_no_id (specific row PK), yes_no_pair_id, label_type, label in DB.
 *
 * Fields:
 *   Numeric  : Storage Temperature, Temperature Tolerance
 *   Yes/No   : Potency Item, Dependency Item, Forced Putaway,
 *              Multi-Batch Pallet, Item Consider
 *
 * Props:
 *   entityId   — item_basic_info_item_master.id
 *   requestId  — ICR snapshot string
 *   createdBy  — logged-in user id
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import useMandatoryFields from './useMandatoryFields';


const API_BASE = 'http://localhost:8000/api';
const WH_BASE  = `${API_BASE}/item-master-wh`;
const YN_LOV   = `${API_BASE}/yes-no-master/lov`;

// ─── UUC Yes/No Toggle Button ─────────────────────────────────────────────────
// University Unique Color palette:
//   YES → #00843D (UUC Forest Green)  with white text
//   NO  → #C8102E (UUC Crimson Red)   with white text
//   UNSET → #6b7280 (neutral)
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_KEY = 'item-master-warehouse-details';

const FIELD_LABELS = {
  storage_temperature:    'Storage Temperature',
  temperature_tolerance:  'Temperature Tolerance',
  potency_item:           'Potency Item',
  dependency_item:        'Dependency Item',
  forced_putaway:         'Forced Putaway',
  multi_batch_pallet:     'Multi-Batch Pallet',
  item_consider:          'Item Consider',
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
  // value = { yes_no_id, yes_no_pair_id, label_type, label } | null

  const selectedType = value?.label_type || null;  // 'yes' | 'no' | null

  const handleClick = (option) => {
    // option = { yes_id, no_id, yes_label, no_label, yes_no_pair_id }
    if (!option) return;

    if (selectedType === 'yes') {
      // clicking YES again → deselect (set null)
      onChange(null);
      return;
    }
    if (selectedType === 'no') {
      // currently NO — toggle to YES
      onChange({
        yes_no_id:     option.yes_id,
        yes_no_pair_id: option.yes_no_pair_id,
        label_type:    'yes',
        label:         option.yes_label,
      });
      return;
    }
    // unset → select YES by default
    onChange({
      yes_no_id:     option.yes_id,
      yes_no_pair_id: option.yes_no_pair_id,
      label_type:    'yes',
      label:         option.yes_label,
    });
  };

  const handleNoClick = (option) => {
    if (!option) return;
    if (selectedType === 'no') {
      onChange(null);
      return;
    }
    onChange({
      yes_no_id:     option.no_id,
      yes_no_pair_id: option.yes_no_pair_id,
      label_type:    'no',
      label:         option.no_label,
    });
  };

  // Use first pair from LOV (if exists)
  const option = yesNoOptions?.[0] || null;

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
            onClick={() => handleClick(option)}
            title={`Select: ${option.yes_label}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 14px',
              fontSize: 11,
              fontWeight: 700,
              border: 'none',
              borderRadius: 20,
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
            {/* Indicator dot */}
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: selectedType === 'yes' ? '#7fedad' : '#d1d5db',
              display: 'inline-block',
              transition: 'background 0.18s',
              flexShrink: 0,
            }} />
            {option.yes_label}
          </button>

          {/* divider */}
          <span style={{ color: '#d1d5db', fontSize: 13, fontWeight: 300 }}>/</span>

          {/* NO button */}
          <button
            onClick={() => handleNoClick(option)}
            title={`Select: ${option.no_label}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 14px',
              fontSize: 11,
              fontWeight: 700,
              border: 'none',
              borderRadius: 20,
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
              display: 'inline-block',
              transition: 'background 0.18s',
              flexShrink: 0,
            }} />
            {option.no_label}
          </button>


        </div>
      )}
    </div>
  );
};


// ─── Main Component ───────────────────────────────────────────────────────────

const ItemMasterWarehouseDetails = ({ entityId, requestId, createdBy, mappingRecord }) => {

  // ── Mandatory fields ──────────────────────────────────────────────────────
  const companyId   = mappingRecord?.company_id ?? mappingRecord?.company?.id ?? null;
  const plantId     = mappingRecord?.plant_id   ?? mappingRecord?.plant?.id   ?? null;
  const companyName = mappingRecord?.company?.company_name ?? mappingRecord?.company?.name ?? '';
  const plantName   = mappingRecord?.plant?.plant_name    ?? mappingRecord?.plant?.name    ?? '';
  const { mandatoryKeys, loading: mfLoading } = useMandatoryFields({ pageKey: PAGE_KEY, companyId, plantId });
  const isMand = (key) => mandatoryKeys.includes(key);

  // ── Numeric fields ────────────────────────────────────────────────────────
  const [storageTemp,   setStorageTemp]   = useState('0.0');
  const [tempTolerance, setTempTolerance] = useState('0.0');

  // ── Yes/No fields — each stores { yes_no_id, yes_no_pair_id, label_type, label } | null
  const [potencyItem,      setPotencyItem]      = useState(null);
  const [dependencyItem,   setDependencyItem]   = useState(null);
  const [forcedPutaway,    setForcedPutaway]    = useState(null);
  const [multiBatchPallet, setMultiBatchPallet] = useState(null);
  const [itemConsider,     setItemConsider]     = useState(null);

  // ── Yes/No LOV ────────────────────────────────────────────────────────────
  const [yesNoOptions, setYesNoOptions] = useState([]);
  const [loadingLov,   setLoadingLov]   = useState(true);

  // ── DB record IDs (for PUT) ───────────────────────────────────────────────
  const [recordIds, setRecordIds] = useState({
    storage_temperature:    null,
    temperature_tolerance:  null,
    potency_item:           null,
    dependency_item:        null,
    forced_putaway:         null,
    multi_batch_pallet:     null,
    item_consider:          null,
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
      const res = await fetch(`${WH_BASE}/${field}/${entityId}`);
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }, [entityId]);

  useEffect(() => {
    if (!entityId) return;
    const loadAll = async () => {
      const [st, tt, pi, di, fp, mb, ic] = await Promise.all([
        loadField('storage-temperature'),
        loadField('temperature-tolerance'),
        loadField('potency-item'),
        loadField('dependency-item'),
        loadField('forced-putaway'),
        loadField('multi-batch-pallet'),
        loadField('item-consider'),
      ]);

      if (st) { setStorageTemp(st.storage_temperature ?? '0.0'); setRecordIds(p => ({ ...p, storage_temperature: st.id })); }
      if (tt) { setTempTolerance(tt.temperature_tolerance ?? '0.0'); setRecordIds(p => ({ ...p, temperature_tolerance: tt.id })); }

      // Yes/No fields — reconstruct toggle state from DB
      const toYnState = (row, yesField, noField, labelField) => {
        if (!row) return null;
        return {
          yes_no_id:      row[yesField] ?? row.yes_no_id,
          yes_no_pair_id: row.yes_no_pair_id,
          label_type:     row.label_type,
          label:          row[labelField] ?? row.label,
        };
      };

      if (pi) { setPotencyItem(toYnState(pi, 'yes_no_id', 'no_id', 'label')); setRecordIds(p => ({ ...p, potency_item: pi.id })); }
      if (di) { setDependencyItem(toYnState(di, 'yes_no_id', 'no_id', 'label')); setRecordIds(p => ({ ...p, dependency_item: di.id })); }
      if (fp) { setForcedPutaway(toYnState(fp, 'yes_no_id', 'no_id', 'label')); setRecordIds(p => ({ ...p, forced_putaway: fp.id })); }
      if (mb) { setMultiBatchPallet(toYnState(mb, 'yes_no_id', 'no_id', 'label')); setRecordIds(p => ({ ...p, multi_batch_pallet: mb.id })); }
      if (ic) { setItemConsider(toYnState(ic, 'yes_no_id', 'no_id', 'label')); setRecordIds(p => ({ ...p, item_consider: ic.id })); }
    };
    loadAll();
  }, [entityId, loadField]);

  // ── 3. Save helper — POST or PUT per field ────────────────────────────────
  const saveField = async (field, body, recordId) => {
    if (recordId) {
      const res = await fetch(`${WH_BASE}/${field}/${recordId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...body, updated_by: createdBy }),
      });
      if (!res.ok) throw new Error(`${field} update failed`);
      return (await res.json()).id;
    } else {
      const res = await fetch(`${WH_BASE}/${field}/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ entity_id: entityId, request_id: requestId, created_by: createdBy, ...body }),
      });
      if (!res.ok) throw new Error(`${field} create failed`);
      return (await res.json()).id;
    }
  };

  // ── 4. Build Yes/No body for DB ───────────────────────────────────────────
  const ynBody = (val) => ({
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

      newIds.storage_temperature   = await saveField('storage-temperature',   { storage_temperature:   parseFloat(storageTemp)   || 0 }, recordIds.storage_temperature);
      newIds.temperature_tolerance = await saveField('temperature-tolerance',  { temperature_tolerance: parseFloat(tempTolerance) || 0 }, recordIds.temperature_tolerance);
      newIds.potency_item          = await saveField('potency-item',           ynBody(potencyItem),      recordIds.potency_item);
      newIds.dependency_item       = await saveField('dependency-item',        ynBody(dependencyItem),   recordIds.dependency_item);
      newIds.forced_putaway        = await saveField('forced-putaway',         ynBody(forcedPutaway),    recordIds.forced_putaway);
      newIds.multi_batch_pallet    = await saveField('multi-batch-pallet',     ynBody(multiBatchPallet), recordIds.multi_batch_pallet);
      newIds.item_consider         = await saveField('item-consider',          ynBody(itemConsider),     recordIds.item_consider);

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
        <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#1e3a5f' }}>🏭 Warehouse Details</h3>
      </div>

      {/* Mandatory Banner */}
      <div style={{ padding: '0 12px' }}>
        <MandatoryBanner mandatoryKeys={mandatoryKeys} companyName={companyName} plantName={plantName} loading={mfLoading} />
      </div>

      {/* Form Body */}
      <div style={{ padding: '12px' }}>

        {/* Row 1 — Numeric fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>

          {/* Storage Temperature */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: mandBg(isMand('storage_temperature')), borderRadius: 4, padding: isMand('storage_temperature') ? '2px 4px' : '0', outline: mandOutline(isMand('storage_temperature')) }}>
            <label style={{ fontSize: 11, fontWeight: isMand('storage_temperature') ? 700 : 600, color: isMand('storage_temperature') ? '#991b1b' : '#374151' }}>
              Storage Temperature{isMand('storage_temperature') && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
            <input
              type="text"
              value={storageTemp}
              onChange={e => setStorageTemp(e.target.value)}
              style={{ padding: '6px 8px', fontSize: 11, border: '1px solid ' + mandBorder(isMand('storage_temperature')), borderRadius: 4, color: '#374151', background: mandBg(isMand('storage_temperature')), outline: 'none' }}
            />
          </div>

          {/* Temperature Tolerance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: mandBg(isMand('temperature_tolerance')), borderRadius: 4, padding: isMand('temperature_tolerance') ? '2px 4px' : '0', outline: mandOutline(isMand('temperature_tolerance')) }}>
            <label style={{ fontSize: 11, fontWeight: isMand('temperature_tolerance') ? 700 : 600, color: isMand('temperature_tolerance') ? '#991b1b' : '#374151' }}>
              Temperature Tolerance{isMand('temperature_tolerance') && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
            <input
              type="text"
              value={tempTolerance}
              onChange={e => setTempTolerance(e.target.value)}
              style={{ padding: '6px 8px', fontSize: 11, border: '1px solid ' + mandBorder(isMand('temperature_tolerance')), borderRadius: 4, color: '#374151', background: mandBg(isMand('temperature_tolerance')), outline: 'none' }}
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px dashed #e5e7eb', marginBottom: 14 }} />

        {/* Yes/No fields — 2 per row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>

          <YesNoToggle
            label="Potency Item"
            value={potencyItem}
            onChange={setPotencyItem}
            yesNoOptions={yesNoOptions}
            loadingLov={loadingLov}
            isMandatory={isMand('potency_item')}
          />

          <YesNoToggle
            label="Dependency Item"
            value={dependencyItem}
            onChange={setDependencyItem}
            yesNoOptions={yesNoOptions}
            loadingLov={loadingLov}
            isMandatory={isMand('dependency_item')}
          />

          <YesNoToggle
            label="Forced Putaway"
            value={forcedPutaway}
            onChange={setForcedPutaway}
            yesNoOptions={yesNoOptions}
            loadingLov={loadingLov}
            isMandatory={isMand('forced_putaway')}
          />

          <YesNoToggle
            label="Multi-Batch Pallet"
            value={multiBatchPallet}
            onChange={setMultiBatchPallet}
            yesNoOptions={yesNoOptions}
            loadingLov={loadingLov}
            isMandatory={isMand('multi_batch_pallet')}
          />

          <YesNoToggle
            label="Item Consider"
            value={itemConsider}
            onChange={setItemConsider}
            yesNoOptions={yesNoOptions}
            loadingLov={loadingLov}
            isMandatory={isMand('item_consider')}
          />

          {/* Empty cell for alignment */}
          <div />
        </div>

      </div>
    </div>
  );
};

export default ItemMasterWarehouseDetails;