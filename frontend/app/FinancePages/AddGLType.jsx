import React, { useState, useEffect } from 'react';
import {
  Layers, Search, CheckCircle, XCircle, AlertCircle, Loader,
  Grid, List, Plus, Save, Trash2, Upload, RefreshCw,
  ArrowRight, Tag, BookOpen
} from 'lucide-react';
import ExcelImportPopup from '../pages/ExcelImportPopup';

const API_BASE = 'http://localhost:8000/api';

// ── IFRS Standard GL Types with Indian Companies Act mapping ──
// ── IFRS Sub-Types with Indian Schedule III labels ──
const IFRS_SUB_TYPES_BY_TYPE = {
  Asset: [
    { sub_type_name: 'Non-Current Assets', display_order: 1, description: 'Assets held for more than 12 months. Includes PPE, intangibles, long-term investments.' },
    { sub_type_name: 'Current Assets', display_order: 2, description: 'Assets expected to be realised within 12 months: cash, receivables, inventory, prepaid.' },
  ],
  Liability: [
    { sub_type_name: 'Non-Current Liabilities', display_order: 3, description: 'Obligations not due within 12 months: term loans, lease liabilities, deferred tax.' },
    { sub_type_name: 'Current Liabilities', display_order: 4, description: 'Obligations due within 12 months: payables, short-term borrowings, statutory dues.' },
  ],
  Equity: [
    { sub_type_name: 'Share Capital', display_order: 5, description: 'Equity share capital and preference share capital of the company.' },
    { sub_type_name: 'Reserves And Surplus', display_order: 6, description: 'Securities premium, retained earnings, general reserve, OCI reserve.' },
  ],
  Income: [
    { sub_type_name: 'Operating Revenue', display_order: 7, description: 'Primary revenue: sale of goods, sale of services, contract revenue.' },
    { sub_type_name: 'Other Income', display_order: 8, description: 'Interest income, rental income, forex gain, miscellaneous income.' },
  ],
  Expense: [
    { sub_type_name: 'Cost Of Material Consumed', display_order: 9, description: 'Raw material consumed, opening/closing stock, direct expenses, purchases.' },
    { sub_type_name: 'Employee Benefits Expense', display_order: 10, description: 'Salary, wages, PF, gratuity, ESIC and other employee costs.' },
    { sub_type_name: 'Finance Costs', display_order: 11, description: 'Interest on loans, lease interest (IFRS 16), bank charges, processing fees.' },
    { sub_type_name: 'Depreciation And Amortisation', display_order: 12, description: 'Depreciation on PPE and ROU assets; amortisation of intangibles.' },
    { sub_type_name: 'Other Expenses', display_order: 13, description: 'Rent, electricity, repairs, insurance, admin, selling & distribution expenses.' },
    { sub_type_name: 'Tax Expense', display_order: 14, description: 'Current tax and deferred tax expense for the period.' },
  ],
};

const COLOR = '#7c3aed';
const COLOR_LIGHT = '#ede9fe';
const COLOR_MED = '#a78bfa';

const pill = (txt, color = COLOR) => ({
  display: 'inline-flex', alignItems: 'center',
  padding: '2px 8px', borderRadius: '99px',
  fontSize: '9px', fontWeight: '700', letterSpacing: '0.04em',
  background: COLOR_LIGHT, color,
});

const S = {
  input: {
    width: '100%', padding: '5px 8px', border: '1px solid #e0e0e0',
    borderRadius: '4px', fontSize: '10px', boxSizing: 'border-box', color: '#111',
    outline: 'none',
  },
  label: { display: 'block', fontSize: '9px', fontWeight: '700', marginBottom: '3px', color: '#374151' },
  btn: (active = true, small = false) => ({
    padding: small ? '4px 10px' : '5px 14px',
    background: active ? `linear-gradient(135deg,${COLOR},${COLOR_MED})` : '#f3f4f6',
    border: active ? 'none' : '1px solid #d1d5db',
    borderRadius: '4px', fontSize: '10px', fontWeight: '700',
    cursor: active ? 'pointer' : 'not-allowed', color: active ? 'white' : '#374151',
    display: 'flex', alignItems: 'center', gap: '4px',
  }),
};

// ────────────────────────────────────────────────────────────
// Small reusable: dynamic rows builder
// ────────────────────────────────────────────────────────────
function DynamicRows({ rows, setRows, glTypes, section }) {
  const addRow = () => setRows(r => [...r, emptyRow(section)]);
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));
  const update = (i, key, val) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [key]: val } : row));

  return (
    <div>
      {rows.map((row, i) => (
        <RowEntry
          key={i}
          row={row}
          idx={i}
          section={section}
          glTypes={glTypes}
          onUpdate={(k, v) => update(i, k, v)}
          onRemove={() => removeRow(i)}
        />
      ))}
      <button
        onClick={addRow}
        style={{ ...S.btn(true, true), marginTop: '6px', fontSize: '9px' }}
      >
        <Plus size={10} /> Add {section === 'type' ? 'GL Type' : 'Sub-Type'}
      </button>
    </div>
  );
}

function emptyRow(section) {
  return section === 'type'
    ? { type_name: '', description: '', _previewCode: '' }
    : { sub_type_name: '', description: '', gl_type_id: '', display_order: '', _previewCode: '' };
}

// ── Standard code generator — no API call needed ──────────────
const STANDARD_CODES = {
  'asset': 'ASST', 'assets': 'ASST',
  'liability': 'LIAB', 'liabilities': 'LIAB',
  'equity': 'EQTY',
  'income': 'INCM', 'revenue': 'INCM',
  'expense': 'EXPS', 'expenses': 'EXPS', 'expenditure': 'EXPS',
  'non-current assets': 'NCAS', 'noncurrent assets': 'NCAS',
  'current assets': 'CRAS',
  'non-current liabilities': 'NCLI', 'noncurrent liabilities': 'NCLI',
  'current liabilities': 'CRLI',
  'share capital': 'SHCP',
  'reserves and surplus': 'RSVS', 'reserves & surplus': 'RSVS', 'other equity': 'OTEQ',
  'operating revenue': 'OPRE', 'revenue from operations': 'RVOP',
  'other income': 'OTHI',
  'cost of material consumed': 'COMC', 'cost of materials': 'COMC',
  'employee benefits expense': 'EMBE', 'employee benefits': 'EMBE',
  'finance costs': 'FINC', 'finance cost': 'FINC',
  'depreciation and amortisation': 'DEPA', 'depreciation': 'DEPA',
  'other expenses': 'OTHE', 'other expense': 'OTHE',
  'tax expense': 'TAXE', 'income tax': 'TAXE',
};

const generateTypeCode = (name) => {
  if (!name || !name.trim()) return '';
  const lower = name.trim().toLowerCase();
  if (STANDARD_CODES[lower]) return STANDARD_CODES[lower];
  for (const [key, code] of Object.entries(STANDARD_CODES)) {
    if (lower.includes(key) || key.includes(lower)) return code;
  }
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return words.map(w => w[0].toUpperCase()).join('').substring(0, 4).padEnd(4, 'X');
  return name.replace(/[aeiou\s]/gi, '').toUpperCase().substring(0, 4).padEnd(4, 'X');
};

// ── Sub-Type code generator: prefixes with type abbreviation ──
const generateSubTypeCode = (subTypeName, glTypeCode) => {
  const baseCode = generateTypeCode(subTypeName);
  if (!glTypeCode) return baseCode;
  // e.g. ASST-CRAS for Current Assets under Asset
  return `${glTypeCode.substring(0,2)}-${baseCode}`;
};

function RowEntry({ row, idx, section, glTypes, onUpdate, onRemove }) {
  const isType = section === 'type';
  const nameFld = isType ? 'type_name' : 'sub_type_name';

  // Find selected GL Type for template sub-type suggestions
  const selectedGLType = !isType && glTypes.find(t => String(t.id) === String(row.gl_type_id));
  const templateSubs = !isType && selectedGLType
    ? (IFRS_SUB_TYPES_BY_TYPE[selectedGLType.type_name] || [])
    : [];

  const handleBlur = () => {
    const name = row[nameFld];
    if (!name.trim()) return;
    if (isType) {
      onUpdate('_previewCode', generateTypeCode(name));
    } else {
      const glType = glTypes.find(t => String(t.id) === String(row.gl_type_id));
      onUpdate('_previewCode', generateSubTypeCode(name, glType?.type_code));
    }
  };

  const handleNameChange = (val) => {
    onUpdate(nameFld, val);
    if (isType) {
      onUpdate('_previewCode', generateTypeCode(val));
    } else {
      const glType = glTypes.find(t => String(t.id) === String(row.gl_type_id));
      onUpdate('_previewCode', generateSubTypeCode(val, glType?.type_code));
    }
  };

  const handleGLTypeChange = (val) => {
    onUpdate('gl_type_id', val);
    const t = glTypes.find(t => String(t.id) === String(val));
    // Regenerate code with new type prefix
    if (row[nameFld]) {
      onUpdate('_previewCode', generateSubTypeCode(row[nameFld], t?.type_code));
    }
  };

  // Quick-fill from template sub-type
  const applyTemplateSub = (tmpl) => {
    onUpdate('sub_type_name', tmpl.sub_type_name);
    onUpdate('description', tmpl.description || '');
    onUpdate('display_order', tmpl.display_order || '');
    onUpdate('_previewCode', generateSubTypeCode(tmpl.sub_type_name, selectedGLType?.type_code));
  };

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px',
      marginBottom: '8px', background: '#fafafa', position: 'relative'
    }}>
      {/* Remove button */}
      {idx > 0 && (
        <button onClick={onRemove} style={{
          position: 'absolute', top: '6px', right: '6px', background: 'none',
          border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px'
        }}>
          <Trash2 size={12} />
        </button>
      )}

      {/* ── GL Type pill buttons (sub-type only) — select FIRST ── */}
      {!isType && (
        <div style={{ marginBottom: '8px' }}>
          <label style={{ ...S.label, marginBottom: '5px' }}>① Select GL Type *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {glTypes.map(t => {
              const active = String(row.gl_type_id) === String(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => handleGLTypeChange(String(t.id))}
                  style={{
                    padding: '3px 10px',
                    fontSize: '9px',
                    fontWeight: '700',
                    borderRadius: '99px',
                    border: active ? `2px solid ${COLOR}` : '1px solid #d1d5db',
                    background: active ? COLOR_LIGHT : 'white',
                    color: active ? COLOR : '#374151',
                    cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    transition: 'all 0.15s',
                    letterSpacing: '0.02em',
                  }}
                >
                  {/* type_code badge */}
                  <span style={{
                    background: active ? COLOR : '#e5e7eb',
                    color: active ? 'white' : '#6b7280',
                    borderRadius: '4px',
                    padding: '1px 5px',
                    fontSize: '8px',
                    fontFamily: 'monospace',
                    fontWeight: '800',
                  }}>
                    {t.type_code}
                  </span>
                  {t.type_name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isType ? '1fr 1fr' : '1fr 1fr', gap: '8px' }}>
        {/* Name field */}
        <div>
          <label style={S.label}>{isType ? 'Type Name *' : '② Sub-Type Name *'}</label>
          <input
            style={S.input}
            value={row[nameFld]}
            onChange={e => handleNameChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={isType ? 'e.g. Asset' : 'e.g. Current Assets'}
            disabled={!isType && !row.gl_type_id}
          />
          {/* Code preview: TYPE_CODE - SUBTYPE_CODE */}
          {!isType && row.gl_type_id && (
            <div style={{ marginTop: '5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '9px', color: '#6b7280' }}>Code:</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0',
                borderRadius: '99px', overflow: 'hidden',
                border: `1px solid ${COLOR_MED}`, fontFamily: 'monospace',
                fontSize: '10px', fontWeight: '800',
              }}>
                {/* type_code part */}
                <span style={{ background: COLOR, color: 'white', padding: '2px 7px' }}>
                  {selectedGLType?.type_code || '??'}
                </span>
                {/* separator */}
                <span style={{ background: COLOR_MED, color: 'white', padding: '2px 3px', fontSize: '9px' }}>—</span>
                {/* sub-type code part */}
                <span style={{ background: COLOR_LIGHT, color: COLOR, padding: '2px 7px' }}>
                  {row._previewCode
                    ? row._previewCode.includes('-')
                      ? row._previewCode.split('-').slice(1).join('-')
                      : row._previewCode
                    : '???'}
                </span>
              </span>
            </div>
          )}
          {/* GL Type not selected hint */}
          {!isType && !row.gl_type_id && (
            <p style={{ margin: '4px 0 0', fontSize: '8px', color: '#f59e0b' }}>
              ⬆ GL Type pehle select karo
            </p>
          )}
          {/* Type row code preview (unchanged) */}
          {isType && row._previewCode && (
            <div style={{ marginTop: '5px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '9px', color: '#6b7280' }}>Code:</span>
              <span style={{
                display: 'inline-block', padding: '2px 10px',
                background: COLOR_LIGHT, color: COLOR, borderRadius: '99px',
                fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em',
                border: `1px solid ${COLOR_MED}`, fontFamily: 'monospace',
              }}>
                {row._previewCode}
              </span>
            </div>
          )}
        </div>

        {/* Description — right column */}
        <div>
          <label style={S.label}>{isType ? 'Description' : '③ Description'}</label>
          <textarea
            style={{ ...S.input, height: '44px', resize: 'none' }}
            value={row.description}
            onChange={e => onUpdate('description', e.target.value)}
            placeholder={isType ? 'IFRS based description' : 'e.g. Assets expected to be realised within 12 months'}
          />
        </div>
      </div>

      {/* ── Template quick-pick (shown after GL Type selected) ── */}
      {!isType && templateSubs.length > 0 && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e5e7eb' }}>
          <p style={{ margin: '0 0 5px', fontSize: '8px', fontWeight: '700', color: '#d97706' }}>
            📋 Quick-pick from {selectedGLType.type_name} templates:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {templateSubs.map((tmpl, ti) => (
              <button
                key={ti}
                onClick={() => applyTemplateSub(tmpl)}
                style={{
                  padding: '2px 8px', fontSize: '8px', fontWeight: '600',
                  background: row.sub_type_name === tmpl.sub_type_name ? '#fef3c7' : '#fff7ed',
                  border: row.sub_type_name === tmpl.sub_type_name ? '1px solid #d97706' : '1px solid #fed7aa',
                  borderRadius: '99px', cursor: 'pointer', color: '#b45309', whiteSpace: 'nowrap',
                }}
              >
                {tmpl.sub_type_name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Existing records card (Type or Sub-Type)
// ────────────────────────────────────────────────────────────
function TypeCard({ item, isType, onClick, selected }) {
  return (
    <div
      onClick={() => onClick && onClick(item)}
      style={{
        border: selected ? `2px solid ${COLOR}` : '1px solid #e5e7eb',
        borderRadius: '6px', padding: '10px', background: selected ? COLOR_LIGHT : 'white',
        cursor: onClick ? 'pointer' : 'default', transition: 'all 0.15s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: '700', fontSize: '10px', color: '#111' }}>
            {isType ? item.type_name : item.sub_type_name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '8px', color: '#6b7280' }}>
            Code: {isType ? item.type_code : item.sub_type_code}
          </p>
          {!isType && item.gl_type_name && (
            <p style={{ margin: '2px 0 0', fontSize: '8px', color: COLOR }}>
              Type: {item.gl_type_name}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end' }}>
          <span style={{
            ...pill(),
            background: item.is_active ? '#dcfce7' : '#fee2e2',
            color: item.is_active ? '#16a34a' : '#dc2626'
          }}>
            {item.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      {item.description && (
        <p style={{ margin: '6px 0 0', fontSize: '9px', color: '#374151', lineHeight: '1.4' }}>
          {item.description}
        </p>
      )}

    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────
export default function AddGLType() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Master data
  const [glTypes, setGlTypes] = useState([]);
  const [glSubTypes, setGlSubTypes] = useState([]);

  // Tab
  const [activeTab, setActiveTab] = useState('create');   // 'create' | 'view_types' | 'view_subtypes' | 'map'

  // Create form state
  const [typeRows, setTypeRows] = useState([emptyRow('type')]);
  const [subTypeRows, setSubTypeRows] = useState([emptyRow('subtype')]);
  const [viewMode, setViewMode] = useState('grid');

  // Search / filter for view tabs
  const [searchTypes, setSearchTypes] = useState('');
  const [searchSubs, setSearchSubs] = useState('');
  const [filterTypeId, setFilterTypeId] = useState('');

  // Map tab: select existing type, then map sub-types
  const [mapSearchType, setMapSearchType] = useState('');
  const [mapSelectedType, setMapSelectedType] = useState(null);
  const [mapSearchSub, setMapSearchSub] = useState('');
  const [mapSelectedSubIds, setMapSelectedSubIds] = useState(new Set());

  // Excel popup
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [importTarget, setImportTarget] = useState('type');

  // ─── Init ───
  const fetchGLTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/gl-types`);
      const data = await res.json();
      setGlTypes(data || []);
    } catch { }
  };

  const fetchGLSubTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/gl-sub-types`);
      const data = await res.json();
      setGlSubTypes(data || []);
    } catch { }
  };

  const fetchAll = async () => {
    await Promise.all([fetchGLTypes(), fetchGLSubTypes()]);
  };

  useEffect(() => {
    const raw = sessionStorage.getItem('userData');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setCurrentUser(parsed.user);
      } catch { }
    }
    fetchGLTypes();
    fetchGLSubTypes();
  }, []);

  // ─── Bulk Submit ───
  const handleBulkSubmit = async () => {
    if (!currentUser?.id) {
      setMessage({ type: 'error', text: 'User not found in session' });
      return;
    }

    const validTypes = typeRows.filter(r => r.type_name.trim());
    const validSubs = subTypeRows.filter(r => r.sub_type_name.trim() && r.gl_type_id);

    if (validTypes.length === 0 && validSubs.length === 0) {
      setMessage({ type: 'error', text: 'Please fill at least one GL Type or Sub-Type.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        user_id: currentUser.id,
        gl_types: validTypes.map(r => ({
          type_name: r.type_name.trim(),
          description: r.description?.trim() || null,
        })),
        gl_sub_types: validSubs.map(r => ({
          sub_type_name: r.sub_type_name.trim(),
          gl_type_id: parseInt(r.gl_type_id),
          description: r.description?.trim() || null,
          display_order: r.display_order ? parseInt(r.display_order) : null,
        })),
      };

      const res = await fetch(`${API_BASE}/gl-bulk-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        const parts = [];
        if (data.total_types_created > 0) parts.push(`${data.total_types_created} GL Type(s)`);
        if (data.total_sub_types_created > 0) parts.push(`${data.total_sub_types_created} Sub-Type(s)`);
        const errMsg = data.total_errors > 0 ? ` (${data.total_errors} skipped as duplicates)` : '';
        setMessage({ type: 'success', text: `✅ Created: ${parts.join(' + ')}${errMsg}` });
        setTypeRows([emptyRow('type')]);
        setSubTypeRows([emptyRow('subtype')]);
        fetchAll();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Bulk create failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error during bulk create' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Map: update sub-type's gl_type_id ───
  const handleMapSave = async () => {
    if (!mapSelectedType || mapSelectedSubIds.size === 0) return;
    setLoading(true);
    let ok = 0, fail = 0;
    for (const subId of mapSelectedSubIds) {
      try {
        const fd = new FormData();
        fd.append('gl_type_id', mapSelectedType.id);
        fd.append('user_id', currentUser.id);
        const res = await fetch(`${API_BASE}/gl-sub-types/${subId}`, { method: 'PUT', body: fd });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    setMessage({ type: ok > 0 ? 'success' : 'error', text: `Mapped ${ok} sub-type(s) to "${mapSelectedType.type_name}"${fail > 0 ? `, ${fail} failed` : ''}.` });
    setMapSelectedSubIds(new Set());
    fetchAll();
    setLoading(false);
  };

  // ─── Filtered lists ───
  const filteredTypes = glTypes.filter(t =>
    !searchTypes || t.type_name.toLowerCase().includes(searchTypes.toLowerCase()) || t.type_code.toLowerCase().includes(searchTypes.toLowerCase())
  );

  const filteredSubs = glSubTypes.filter(s => {
    const matchSearch = !searchSubs || s.sub_type_name.toLowerCase().includes(searchSubs.toLowerCase()) || s.sub_type_code?.toLowerCase().includes(searchSubs.toLowerCase());
    const matchType = !filterTypeId || String(s.gl_type_id) === String(filterTypeId);
    return matchSearch && matchType;
  });

  const mapFilteredTypes = glTypes.filter(t =>
    !mapSearchType || t.type_name.toLowerCase().includes(mapSearchType.toLowerCase())
  );

  const mapFilteredSubs = glSubTypes.filter(s =>
    !mapSearchSub || s.sub_type_name.toLowerCase().includes(mapSearchSub.toLowerCase())
  );

  // ─── Tab config ───
  const tabs = [
    { key: 'create', label: '➕ Create', icon: <Plus size={11} /> },
    { key: 'view_types', label: `📋 GL Types (${glTypes.length})`, icon: <Layers size={11} /> },
    { key: 'view_subtypes', label: `📂 Sub-Types (${glSubTypes.length})`, icon: <BookOpen size={11} /> },
    { key: 'map', label: '🔗 Map Sub-Types', icon: <ArrowRight size={11} /> },
  ];

  // ─── Render ───
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '1280px', height: '100%', maxHeight: '760px', background: 'white', borderRadius: '10px', boxShadow: '0 6px 32px rgba(124,58,237,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div style={{ padding: '0 16px', height: '36px', background: `linear-gradient(135deg,${COLOR},${COLOR_MED})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={14} />
            <span style={{ fontWeight: '700', fontSize: '12px' }}>GL Type & Sub-Type Management (Financial Statement Element & Classification - "Liquidity / Nature / Function")</span>
            <span style={{ fontSize: '9px', opacity: 0.75 }}>IFRS + Indian Companies Act</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={fetchAll}
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', color: 'white', padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px' }}
            >
              <RefreshCw size={10} /> Refresh
            </button>
            <button
              onClick={() => { setImportTarget('type'); setShowImportPopup(true); }}
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', color: 'white', padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px' }}
            >
              <Upload size={10} /> Import GL Types
            </button>
            <button
              onClick={() => { setImportTarget('subtype'); setShowImportPopup(true); }}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', color: 'white', padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px' }}
            >
              <Upload size={10} /> Import Sub-Types
            </button>
          </div>
        </div>

        {/* ── Message bar ── */}
        {message && (
          <div style={{
            margin: '6px 12px 0', padding: '5px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px',
            background: message.type === 'success' ? '#dcfce7' : message.type === 'info' ? '#ede9fe' : '#fee2e2',
            border: `1px solid ${message.type === 'success' ? '#86efac' : message.type === 'info' ? COLOR_MED : '#fca5a5'}`,
            flexShrink: 0
          }}>
            {message.type === 'success' ? <CheckCircle size={12} color="#16a34a" /> : <AlertCircle size={12} color={message.type === 'info' ? COLOR : '#dc2626'} />}
            <span style={{ fontSize: '10px', flex: 1, color: '#111', fontWeight: '500' }}>{message.text}</span>
            <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={12} color="#9ca3af" /></button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              flex: 1, padding: '7px 6px', fontSize: '10px', fontWeight: '600', cursor: 'pointer',
              border: 'none', borderBottom: activeTab === t.key ? `2px solid ${COLOR}` : '2px solid transparent',
              background: activeTab === t.key ? 'white' : 'transparent',
              color: activeTab === t.key ? COLOR : '#374151',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
            }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>

          {/* ───── CREATE TAB ───── */}
          {activeTab === 'create' && (
            <div>
              {/* IFRS Quick-load button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#6b7280' }}>
                  Enter GL Types and Sub-Types below. Codes are auto-generated on blur. Submit all at once.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* GL TYPES column */}
                <div style={{ background: '#f8f7ff', borderRadius: '8px', padding: '12px', border: `1px solid ${COLOR_LIGHT}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Tag size={12} color={COLOR} />
                    <span style={{ fontWeight: '700', fontSize: '11px', color: COLOR }}>GL Types</span>
                    <span style={{ fontSize: '8px', color: '#6b7280' }}>(ASSET, LIABILITY…)</span>
                  </div>
                  <DynamicRows rows={typeRows} setRows={setTypeRows} glTypes={glTypes} section="type" />
                </div>

                {/* SUB-TYPES column */}
                <div style={{ background: '#fff7ed', borderRadius: '8px', padding: '12px', border: '1px solid #fed7aa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <BookOpen size={12} color="#d97706" />
                    <span style={{ fontWeight: '700', fontSize: '11px', color: '#d97706' }}>GL Sub-Types</span>
                    <span style={{ fontSize: '8px', color: '#6b7280' }}>(Current Assets, Non-Current…)</span>
                  </div>
                  <DynamicRows rows={subTypeRows} setRows={setSubTypeRows} glTypes={glTypes} section="subtype" />
                </div>
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => { setTypeRows([emptyRow('type')]); setSubTypeRows([emptyRow('subtype')]); }}
                  style={S.btn(false)}
                >
                  Reset All
                </button>
                <button onClick={handleBulkSubmit} disabled={loading} style={S.btn(!loading)}>
                  {loading ? <><Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={11} /> Submit All</>}
                </button>
              </div>
            </div>
          )}

          {/* ───── VIEW GL TYPES TAB ───── */}
          {activeTab === 'view_types' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
                  <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input style={{ ...S.input, paddingLeft: '28px' }} placeholder="Search types…" value={searchTypes} onChange={e => setSearchTypes(e.target.value)} />
                </div>
                <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} style={S.btn(true, true)}>
                  {viewMode === 'grid' ? <List size={11} /> : <Grid size={11} />} {viewMode === 'grid' ? 'List' : 'Grid'}
                </button>
              </div>

              {filteredTypes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  <Layers size={36} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  <p style={{ fontSize: '11px' }}>No GL Types found</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill,minmax(260px,1fr))' : '1fr', gap: '8px' }}>
                  {filteredTypes.map(t => <TypeCard key={t.id} item={t} isType={true} />)}
                </div>
              )}
            </div>
          )}

          {/* ───── VIEW SUB-TYPES TAB ───── */}
          {activeTab === 'view_subtypes' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '240px' }}>
                  <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input style={{ ...S.input, paddingLeft: '28px' }} placeholder="Search sub-types…" value={searchSubs} onChange={e => setSearchSubs(e.target.value)} />
                </div>
                <select style={{ ...S.input, width: '180px' }} value={filterTypeId} onChange={e => setFilterTypeId(e.target.value)}>
                  <option value="">All GL Types</option>
                  {glTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
                </select>
                <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} style={S.btn(true, true)}>
                  {viewMode === 'grid' ? <List size={11} /> : <Grid size={11} />}
                </button>
              </div>

              {filteredSubs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  <BookOpen size={36} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  <p style={{ fontSize: '11px' }}>No Sub-Types found</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill,minmax(260px,1fr))' : '1fr', gap: '8px' }}>
                  {filteredSubs.map(s => <TypeCard key={s.id} item={s} isType={false} />)}
                </div>
              )}
            </div>
          )}

          {/* ───── MAP TAB ───── */}
          {activeTab === 'map' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%' }}>

              {/* Left: Pick GL Type */}
              <div style={{ background: '#f8f7ff', borderRadius: '8px', padding: '12px', border: `1px solid ${COLOR_LIGHT}`, display: 'flex', flexDirection: 'column' }}>
                <p style={{ margin: '0 0 8px', fontWeight: '700', fontSize: '11px', color: COLOR }}>
                  1️⃣ Select Existing GL Type to map to
                </p>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <Search size={11} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input style={{ ...S.input, paddingLeft: '26px' }} placeholder="Search types…" value={mapSearchType} onChange={e => setMapSearchType(e.target.value)} />
                </div>
                <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {mapFilteredTypes.map(t => (
                    <TypeCard key={t.id} item={t} isType={true}
                      onClick={() => { setMapSelectedType(t); setMapSelectedSubIds(new Set()); }}
                      selected={mapSelectedType?.id === t.id}
                    />
                  ))}
                </div>
              </div>

              {/* Right: Pick Sub-Types */}
              <div style={{ background: '#fff7ed', borderRadius: '8px', padding: '12px', border: '1px solid #fed7aa', display: 'flex', flexDirection: 'column' }}>
                <p style={{ margin: '0 0 8px', fontWeight: '700', fontSize: '11px', color: '#d97706' }}>
                  2️⃣ Select Sub-Types to map{mapSelectedType ? ` → "${mapSelectedType.type_name}"` : ''}
                </p>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <Search size={11} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input style={{ ...S.input, paddingLeft: '26px' }} placeholder="Search sub-types…" value={mapSearchSub} onChange={e => setMapSearchSub(e.target.value)} />
                </div>
                <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {mapFilteredSubs.map(s => {
                    const checked = mapSelectedSubIds.has(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (!mapSelectedType) {
                            setMessage({ type: 'error', text: 'Please select a GL Type first.' });
                            return;
                          }
                          setMapSelectedSubIds(prev => {
                            const n = new Set(prev);
                            if (checked) { n.delete(s.id); } else { n.add(s.id); }
                            return n;
                          });
                        }}
                        style={{
                          border: checked ? '2px solid #d97706' : '1px solid #e5e7eb',
                          borderRadius: '6px', padding: '8px', cursor: 'pointer',
                          background: checked ? '#fff7ed' : 'white', transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                          <input type="checkbox" checked={checked} readOnly style={{ marginTop: '2px' }} />
                          <div>
                            <p style={{ margin: 0, fontWeight: '700', fontSize: '10px', color: '#111' }}>{s.sub_type_name}</p>
                            <p style={{ margin: 0, fontSize: '8px', color: '#6b7280' }}>
                              Code: {s.sub_type_code} | Current type: {s.gl_type_name || '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {mapFilteredSubs.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '10px', marginTop: '20px' }}>No sub-types found</p>
                  )}
                </div>

                {mapSelectedSubIds.size > 0 && mapSelectedType && (
                  <div style={{ paddingTop: '10px', borderTop: '1px solid #fed7aa', marginTop: '8px' }}>
                    <button onClick={handleMapSave} disabled={loading} style={{ ...S.btn(!loading), width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg,#d97706,#fbbf24)' }}>
                      {loading ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={11} />}
                      Map {mapSelectedSubIds.size} Sub-Type(s) → {mapSelectedType.type_name}
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div style={{ height: '14px', background: `linear-gradient(135deg,${COLOR_MED},${COLOR})`, flexShrink: 0 }} />
      </div>

      {/* ── Excel Import Popup ── */}
      {/* GL Type import */}
      {importTarget === 'type' && (
        <ExcelImportPopup
          isOpen={showImportPopup}
          onClose={() => setShowImportPopup(false)}
          onSuccess={(results) => {
            const cnt = results.filter(r => r.status === 'success').length;
            if (cnt > 0) { setMessage({ type: 'success', text: `✅ ${cnt} GL Type(s) imported!` }); fetchAll(); }
          }}
          title="Import GL Types from Excel"
          accentColor={COLOR}
          apiEndpoint={`${API_BASE}/gl-types`}
          apiMethod="POST"
          fields={[
            { key: 'type_name',   label: 'Type Name',   required: true  },
            { key: 'description', label: 'Description', required: false },
          ]}
          importNote="Type Code is always auto-generated from Type Name — no need to include it in your Excel."
        />
      )}

      {/* GL Sub-Type import — GL Type column has dropdown */}
      {importTarget === 'subtype' && (
        <ExcelImportPopup
          isOpen={showImportPopup}
          onClose={() => setShowImportPopup(false)}
          onSuccess={(results) => {
            const cnt = results.filter(r => r.status === 'success').length;
            if (cnt > 0) { setMessage({ type: 'success', text: `✅ ${cnt} GL Sub-Type(s) imported!` }); fetchAll(); }
          }}
          title="Import GL Sub-Types from Excel"
          accentColor={COLOR}
          apiEndpoint={`${API_BASE}/gl-sub-types`}
          apiMethod="POST"
          fields={[
            { key: 'sub_type_name', label: 'Sub Type Name', required: true  },
            { key: 'description',   label: 'Description',   required: false },
            // sub_type_code and display_order excluded — always auto-generated by backend
          ]}
          lookupFields={[
            { key: 'gl_type_id', label: 'GL Type', data: glTypes, matchKey: 'type_name', valueKey: 'id', caseSensitive: false },
          ]}
          templateDropdownFields={[
            { key: 'gl_type_id', label: 'GL Type', options: glTypes.map(t => ({ label: t.type_name, value: t.id })) },
          ]}
          importNote="GL Type dropdown in template auto-resolves to ID on import. Sub Type Code is always auto-generated as PARENTCODE-XXXX-0001."
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { color: #111; }
      `}</style>
    </div>
  );
}