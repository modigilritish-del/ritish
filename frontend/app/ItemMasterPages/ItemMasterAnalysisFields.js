/**
 * ItemMasterPages/ItemMasterAnalysisFields.js
 * ─────────────────────────────────────────────────────────────────
 * ✅ UPDATED: Save / Load analysis fields from DB (same table pattern
 *    as UOM, Batch, Serial etc. — uses /item-master-info/analysis-fields/)
 *
 *    LOV endpoints (company-scoped):
 *      GET /item-master-info/analysis-fields/lov/categories
 *      GET /item-master-info/analysis-fields/lov/sub-categories?category_id=
 *      GET /item-master-info/analysis-fields/lov/products?sub_category_id=&company_id=
 *      GET /item-master-info/analysis-fields/lov/classifications?product_id=
 *
 *    CRUD endpoints:
 *      GET  /item-master-info/analysis-fields/{entity_id}   → load existing
 *      POST /item-master-info/analysis-fields/              → first save
 *      PUT  /item-master-info/analysis-fields/{record_id}   → update
 *
 *    Log: item_master_info_change_log (shared, ANALYSIS_FIELDS table_name)
 *
 *    Props (unchanged — same as before):
 *      mappingRecord  — InfoMaster already passes this
 *      changedBy      — logged-in user id (optional, for audit log)
 *      changeReason   — optional reason string
 *
 *    Zero changes to any other file.
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Save, Check } from 'lucide-react';
import useMandatoryFields from './useMandatoryFields';

const API_BASE    = 'http://localhost:8000/api';
const PAGE_KEY    = 'item-master-analysis-fields';
const AF_BASE     = `${API_BASE}/item-master-info/analysis-fields`;
const LOV_BASE    = `${AF_BASE}/lov`;

const FIELD_LABELS = {
  category:               'Category',
  sub_category:           'Sub Category',
  product:                'Product',
  product_classification: 'Product Classification',
};

// ── Mandatory highlight helpers (unchanged) ──────────────────────────────────
const mandBorder  = (m) => m ? '#ef4444' : '#d1d5db';
const mandBg      = (m) => m ? '#fef2f2' : '#fff';
const mandOutline = (m) => m ? '1.5px solid #ef4444' : 'none';

// ── Mandatory banner (unchanged) ─────────────────────────────────────────────
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

// ── LOV Modal — styled exactly like the UOM popup in ItemInfoMaster ──────────
const ITEMS_PER_PAGE = 5;

const LovModal = ({ title, items, loading, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);

  const filtered = items.filter(i =>
    (i.name + ' ' + (i.code || '')).toLowerCase().includes(search.toLowerCase())
  );
  const totalPages    = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated     = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: 500, maxWidth: '90%', height: 300, background: '#fff', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Header — dark-to-blue gradient, exactly like UOM modal ── */}
        <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32, flexShrink: 0 }}>
          <span>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={16} /></button>
        </div>

        {/* ── Search bar — label + input, exactly like UOM modal ── */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#000' }}>Search</span>
          <input
            autoFocus
            placeholder={`Enter ${title} for Search`}
            value={search}
            onChange={handleSearch}
            style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#333', outline: 'none' }}
          />
        </div>

        {/* ── Table body — Code / Name columns, alternating rows, hover highlight ── */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', fontSize: 11, color: '#666' }}>Loading…</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Code</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Name</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={2} style={{ padding: 20, textAlign: 'center', fontSize: 10, color: '#999' }}>No results found</td></tr>
                ) : paginated.map((item, i) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelect(item)}
                    style={{ cursor: 'pointer', background: i % 2 ? '#f9fafb' : '#fff' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#f9fafb' : '#fff'}
                  >
                    <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.code || '—'}</td>
                    <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination footer — exactly like UOM modal ── */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', flexShrink: 0 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '4px 12px', fontSize: 10, background: page === 1 ? '#e5e7eb' : '#3b82f6', color: page === 1 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >Previous</button>
          <span style={{ fontSize: 10, color: '#000' }}>Page {page} of {totalPages || 1}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || totalPages === 0}
            style={{ padding: '4px 12px', fontSize: 10, background: (page >= totalPages || totalPages === 0) ? '#e5e7eb' : '#3b82f6', color: (page >= totalPages || totalPages === 0) ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: (page >= totalPages || totalPages === 0) ? 'not-allowed' : 'pointer' }}
          >Next</button>
        </div>

        {/* ── Bottom accent bar — reversed gradient, exactly like UOM modal ── */}
        <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8, flexShrink: 0 }} />
      </div>
    </div>
  );
};

// ── Search Input — mandatory-aware (unchanged from original) ─────────────────
const SearchField = ({ label, value, onOpen, onClear, placeholder, isMand }) => {
  const im = !!isMand;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, background: mandBg(im), borderRadius: 4, padding: im ? '2px 4px' : '0', outline: mandOutline(im) }}>
      <label style={{ fontSize: 11, color: im ? '#991b1b' : '#374151', minWidth: 140, textAlign: 'right', flexShrink: 0, fontWeight: im ? 700 : 400 }}>
        {label}{im && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
        <input readOnly value={value} onClick={onOpen}
          placeholder={placeholder || ('Enter ' + label + ' for Search')}
          style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid ' + mandBorder(im), borderRadius: 4, padding: '3px 26px 3px 8px', fontSize: 11, color: '#374151', background: mandBg(im), cursor: 'pointer', outline: 'none' }}
          onFocus={e => e.target.style.borderColor = im ? '#ef4444' : '#93c5fd'}
          onBlur={e => e.target.style.borderColor = mandBorder(im)} />
        {value
          ? <X size={11} onClick={e => { e.stopPropagation(); onClear(); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', cursor: 'pointer' }} />
          : <Search size={11} onClick={onOpen} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', cursor: 'pointer' }} />
        }
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const ItemMasterAnalysisFields = ({
  mappingRecord,
  changedBy    = null,   // logged-in user id for audit log
  changeReason = null,   // optional reason
  onDataChange = null,   // called with current field values whenever any field changes (used by CreateItemMaster for Save & Next)
}) => {

  const entityId    = mappingRecord?.id           || null;
  const requestId   = mappingRecord?.request_id   || null;
  const companyId   = mappingRecord?.company_id   || null;
  const plantId     = mappingRecord?.plant_id     || null;
  const companyName = mappingRecord?.company?.company_name || '';
  const plantName   = mappingRecord?.plant?.plant_name    || '';

  // ── Mandatory fields hook (unchanged) ─────────────────────────────────────
  const mfResult      = useMandatoryFields({ pageKey: PAGE_KEY, companyId, plantId });
  const mandatoryKeys = mfResult.mandatoryKeys;
  const mfLoading     = mfResult.loading;
  const isMand        = (key) => mandatoryKeys.includes(key);

  // ── Field states ──────────────────────────────────────────────────────────
  const [categoryId,              setCategoryId]              = useState(null);
  const [category,                setCategory]                = useState('');
  const [subCategoryId,           setSubCategoryId]           = useState(null);
  const [subCategory,             setSubCategory]             = useState('');
  const [productId,               setProductId]               = useState(null);
  const [product,                 setProduct]                 = useState('');
  const [productClassificationId, setProductClassificationId] = useState(null);
  const [productClassification,   setProductClassification]   = useState('');

  // ── LOV data ──────────────────────────────────────────────────────────────
  const [openLov,           setOpenLov]           = useState(null);
  const [lovItems,          setLovItems]           = useState([]);
  const [lovLoading,        setLovLoading]         = useState(false);

  // ── Persist state ─────────────────────────────────────────────────────────
  const [recordId,          setRecordId]           = useState(null);   // existing DB id
  const [saving,            setSaving]             = useState(false);
  const [savedOk,           setSavedOk]            = useState(false);
  const [saveError,         setSaveError]          = useState(null);

  // ── Notify parent whenever any field changes (used by CreateItemMaster Save & Next) ──
  const notifyParent = useCallback((catId, catName, subCatId, subCatName, prodId, prodName, clsId, clsName, recId) => {
    if (typeof onDataChange !== 'function') return;
    onDataChange({
      category_id:       catId    || null,
      category_name:     catName  || null,
      sub_category_id:   subCatId || null,
      sub_category_name: subCatName || null,
      product_id:        prodId   || null,
      product_name:      prodName || null,
      classification_id: clsId    || null,
      classification_name: clsName || null,
      record_id:         recId    || null,
    });
  }, [onDataChange]);

  useEffect(() => {
    notifyParent(categoryId, category, subCategoryId, subCategory, productId, product, productClassificationId, productClassification, recordId);
  }, [categoryId, category, subCategoryId, subCategory, productId, product, productClassificationId, productClassification, recordId, notifyParent]);

  // ── Load existing record on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!entityId) return;
    fetch(`${AF_BASE}/${entityId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setRecordId(data.id);
        setCategoryId(data.category_id);
        setCategory(data.category_name || '');
        setSubCategoryId(data.sub_category_id);
        setSubCategory(data.sub_category_name || '');
        setProductId(data.product_id);
        setProduct(data.product_name || '');
        setProductClassificationId(data.classification_id);
        setProductClassification(data.classification_name || '');
      })
      .catch(() => {/* no existing record — that's fine */});
  }, [entityId]);

  // ── LOV opener — fetches data from backend ────────────────────────────────
  const openLovFor = useCallback((lovKey) => {
    setLovItems([]);
    setLovLoading(true);
    setOpenLov(lovKey);

    let url = '';
    if (lovKey === 'category') {
      url = `${LOV_BASE}/categories`;
    } else if (lovKey === 'subCategory') {
      url = `${LOV_BASE}/sub-categories${categoryId ? `?category_id=${categoryId}` : ''}`;
    } else if (lovKey === 'product') {
      const params = new URLSearchParams();
      if (subCategoryId) params.append('sub_category_id', subCategoryId);
      if (companyId)     params.append('company_id',      companyId);
      url = `${LOV_BASE}/products${params.toString() ? '?' + params.toString() : ''}`;
    } else if (lovKey === 'productClassification') {
      url = `${LOV_BASE}/classifications${productId ? `?product_id=${productId}` : ''}`;
    }

    fetch(url)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setLovItems(Array.isArray(data) ? data : []); setLovLoading(false); })
      .catch(() => setLovLoading(false));
  }, [categoryId, subCategoryId, productId, companyId]);

  // ── LOV select handlers ───────────────────────────────────────────────────
  const lovSelectHandlers = {
    category: (item) => {
      setCategoryId(item.id);    setCategory(item.name || item.code || '');
      // Reset downstream
      setSubCategoryId(null);  setSubCategory('');
      setProductId(null);      setProduct('');
      setProductClassificationId(null); setProductClassification('');
      setOpenLov(null);
    },
    subCategory: (item) => {
      setSubCategoryId(item.id); setSubCategory(item.name || item.code || '');
      setProductId(null);      setProduct('');
      setProductClassificationId(null); setProductClassification('');
      setOpenLov(null);
    },
    product: (item) => {
      setProductId(item.id);   setProduct(item.name || item.code || '');
      setProductClassificationId(null); setProductClassification('');
      setOpenLov(null);
    },
    productClassification: (item) => {
      setProductClassificationId(item.id); setProductClassification(item.name || item.code || '');
      setOpenLov(null);
    },
  };

  // ── Clear handlers (cascade downstream) ──────────────────────────────────
  const clearCategory = () => {
    setCategoryId(null); setCategory('');
    setSubCategoryId(null); setSubCategory('');
    setProductId(null); setProduct('');
    setProductClassificationId(null); setProductClassification('');
  };
  const clearSubCategory = () => {
    setSubCategoryId(null); setSubCategory('');
    setProductId(null); setProduct('');
    setProductClassificationId(null); setProductClassification('');
  };
  const clearProduct = () => {
    setProductId(null); setProduct('');
    setProductClassificationId(null); setProductClassification('');
  };
  const clearClassification = () => {
    setProductClassificationId(null); setProductClassification('');
  };

  // ── Save — POST (first time) or PUT (update) ──────────────────────────────
  const handleSave = async () => {
    if (!entityId) return;
    setSaving(true); setSavedOk(false); setSaveError(null);

    const body = {
      request_id:        requestId,
      entity_id:         entityId,
      category_id:       categoryId,
      sub_category_id:   subCategoryId,
      product_id:        productId,
      classification_id: productClassificationId,
      changed_by:        changedBy,
      change_reason:     changeReason,
    };

    try {
      let res;
      if (recordId) {
        // Already exists — update
        res = await fetch(`${AF_BASE}/${recordId}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            category_id:       categoryId,
            sub_category_id:   subCategoryId,
            product_id:        productId,
            classification_id: productClassificationId,
            updated_by:        changedBy,
            change_reason:     changeReason,
          }),
        });
      } else {
        // First time — create
        res = await fetch(`${AF_BASE}/`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `HTTP ${res.status}`);
      }

      const saved = await res.json();
      setRecordId(saved.id);
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
    <div style={{ width: '100%', background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb', fontFamily: "'Inter','Segoe UI',sans-serif" }}>

      {/* Section Header */}
      <div style={{ background: 'linear-gradient(to right, #bfdbfe, #d1d5db)', borderRadius: 4, marginBottom: 8, padding: '3px 10px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1e3a5f' }}>Analysis Fields</span>
      </div>

      <div style={{ padding: '0 12px 8px' }}>

        <MandatoryBanner
          mandatoryKeys={mandatoryKeys}
          companyName={companyName}
          plantName={plantName}
          loading={mfLoading}
        />

        {/* Save error banner */}
        {saveError && (
          <div style={{ fontSize: 10, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 4, padding: '4px 8px', marginBottom: 6 }}>
            ⚠ {saveError}
          </div>
        )}

        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <SearchField
            label="Category"
            value={category}
            isMand={isMand('category')}
            onOpen={() => openLovFor('category')}
            onClear={clearCategory}
          />
          <SearchField
            label="Sub Category"
            value={subCategory}
            isMand={isMand('sub_category')}
            onOpen={() => openLovFor('subCategory')}
            onClear={clearSubCategory}
          />
        </div>

        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <SearchField
            label="Product"
            value={product}
            isMand={isMand('product')}
            onOpen={() => openLovFor('product')}
            onClear={clearProduct}
          />
          <SearchField
            label="Product Classification"
            value={productClassification}
            isMand={isMand('product_classification')}
            onOpen={() => openLovFor('productClassification')}
            onClear={clearClassification}
          />
        </div>

      </div>

      {/* LOV Modal */}
      {openLov && (
        <LovModal
          title={
            openLov === 'category'              ? 'Select Category' :
            openLov === 'subCategory'           ? 'Select Sub Category' :
            openLov === 'product'               ? 'Select Product' :
            'Select Product Classification'
          }
          items={lovItems}
          loading={lovLoading}
          onSelect={lovSelectHandlers[openLov]}
          onClose={() => setOpenLov(null)}
        />
      )}
    </div>
  );
};

export default ItemMasterAnalysisFields;