// workflowConstants.js — shared constants, helpers, and style tokens

export const API_BASE = 'http://localhost:8000/api';

// ─── Session helper ───────────────────────────────────────────────────────────
export const getSession = () => {
  try { return JSON.parse(sessionStorage.getItem('userData') || '{}')?.user || null; }
  catch { return null; }
};

export const apiFetch = async (url, opts = {}) => {
  const r = await fetch(url, opts);
  const j = await r.json();
  if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
  return j;
};

// ─── Colour tokens ────────────────────────────────────────────────────────────
export const CLR = {
  primary:         '#3b82f6',
  primarySoft:     '#eff6ff',
  mandatory:       '#fca5a5',
  mandatoryBorder: '#ef4444',
  mandatoryText:   '#991b1b',
  surface:         '#ffffff',
  border:          '#e5e7eb',
  muted:           '#9ca3af',
  text:            '#111827',
  textSm:          '#6b7280',
  header1:         '#374151',
  header2:         '#60a5fa',
  green:           '#16a34a',
  greenSoft:       '#dcfce7',
  red:             '#dc2626',
  redSoft:         '#fee2e2',
  yellow:          '#92400e',
  yellowSoft:      '#fef3c7',
};

// ─── Shared header / footer styles ───────────────────────────────────────────
export const HDR = {
  background: 'linear-gradient(to right, #374151, #60a5fa)',
  color: '#fff',
  padding: '0 10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: 28,
  flexShrink: 0,
};

export const FTR = {
  background: 'linear-gradient(to right, #60a5fa, #374151)',
  height: 6,
  flexShrink: 0,
};

// ─── Approval type colours ────────────────────────────────────────────────────
export const APPROVAL_CLR = {
  ANY:        { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  ALL:        { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' },
  MAJORITY:   { bg: '#faf5ff', color: '#7c3aed', border: '#c4b5fd' },
  SEQUENTIAL: { bg: '#fff7ed', color: '#c2410c', border: '#fdba74' },
};
export const approvalClr = (t) => APPROVAL_CLR[t] || APPROVAL_CLR.ANY;

// ─── Field definitions for MFC popup ─────────────────────────────────────────
export const PAGE_FIELDS = {

  // ── Item Code Creation Request ─────────────────────────────────────────────
  'item-code-creation-req': [
    { field_key: 'item_name',            label: 'Item Name' },
    { field_key: 'item_description',     label: 'Item Description' },
    { field_key: 'item_short_name',      label: 'Item Short Name' },
    { field_key: 'item_type',            label: 'Item Type' },
    { field_key: 'department',           label: 'Department' },
    { field_key: 'required_date',        label: 'Required Date' },
    { field_key: 'business_reason',      label: 'Business Reason' },
    { field_key: 'company_id',           label: 'Company' },
    { field_key: 'plant_id',             label: 'Plant' },
    { field_key: 'reference_image_url',  label: 'Reference Image URL' },
    { field_key: 'vendor_quotation_url', label: 'Vendor Quotation URL' },
    { field_key: 'sample_photo_url',     label: 'Sample Photo URL' },
    { field_key: 'product_link',         label: 'Product Link' },
  ],

  // ── Item Master — Item Info (1st Page) ────────────────────────────────────
  'item-info-master': [
    { field_key: 'base_uom',          label: 'Base UOM' },
    { field_key: 'max_loose',         label: 'Max. Loose' },
    { field_key: 'stock',             label: 'Stock' },
    { field_key: 'service',           label: 'Service' },
    { field_key: 'batch_item',        label: 'Batch Item' },
    { field_key: 'serial_item',       label: 'Serial Item' },
    { field_key: 'gift_voucher',      label: 'Gift Voucher' },
    { field_key: 'extended_warranty', label: 'Extended Warranty' },
  ],

  // ── Item Master — Analysis Fields ─────────────────────────────────────────
  'item-master-analysis-fields': [
    { field_key: 'category',               label: 'Category' },
    { field_key: 'sub_category',           label: 'Sub Category' },
    { field_key: 'product',                label: 'Product' },
    { field_key: 'product_classification', label: 'Product Classification' },
  ],

  // ── Item Master — Breez Custom Fields ─────────────────────────────────────
  'breez-custom-fields': [
    { field_key: 'item_weight',        label: 'Item Weight' },
    { field_key: 'sls_category',       label: 'SLS Category' },
    { field_key: 'product_grammage',   label: 'Product & Grammage' },
    { field_key: 'supply_in',          label: 'Supply In' },
    { field_key: 'repeat_length',      label: 'Repeat Length' },
    { field_key: 'item_category',      label: 'Item Category' },
    { field_key: 'name_of_customer',   label: 'Name of the Customer' },
    { field_key: 'laminate_structure', label: 'Laminate Structure' },
    { field_key: 'open_width',         label: 'Open Width' },
    { field_key: 'unwind_direction',   label: 'Unwind Direction of the Roll' },
  ],

  // ── Item Master — Sonata Custom Fields ────────────────────────────────────
  'sonata-custom-fields': [
    { field_key: 'auto_batch_required', label: 'Auto Batch Required' },
    { field_key: 'item_capacity',       label: 'Item Capacity' },
    { field_key: 'crm_item',            label: 'CRM Item Y/N' },
    { field_key: 'wms_item',            label: 'WMS Item Y/N' },
    { field_key: 'item_grade',          label: 'Item Grade' },
  ],

  // ── Item Master — Sweet Nutrition Custom Fields ───────────────────────────
  'sweet-nutrition-custom-fields': [
    { field_key: 'item_weight',  label: 'Item Weight' },
    { field_key: 'sub_category', label: 'Sub Category' },
    { field_key: 'flavour',      label: 'Flavour' },
    { field_key: 'category_1',   label: 'Category 1' },
    { field_key: 'brand',        label: 'Brand' },
  ],

  // ── Item Master — Inventory Page (Page 2) ─────────────────────────────────
  'item-master-inventory': [
    { field_key: 'parent_item',            label: 'Parent Item' },
    { field_key: 'packed_item',            label: 'Packed Item' },
    { field_key: 'superceded',             label: 'Superceded' },
    { field_key: 'maximum_stock_qty',      label: 'Maximum Stock (Qty)' },
    { field_key: 'reorder_quantity',       label: 'Reorder Quantity' },
    { field_key: 'harmonised_code',        label: 'Harmonised Code' },
    { field_key: 'lead_time',              label: 'Lead Time (in Days)' },
    { field_key: 'dimension',              label: 'Dimension' },
    { field_key: 'minimum_stock_qty',      label: 'Minimum Stock (Qty)' },
    { field_key: 'reorder_level',          label: 'Reorder Level' },
    { field_key: 'safety_stock_factor',    label: 'Safety Stock Factor' },
    { field_key: 'universal_product_code', label: 'Universal Product Code' },
  ],

  // ── Item Master — Sales Details (Page 3) ─────────────────────────────────
  'item-master-sales-details': [
    { field_key: 'item_class',         label: 'Item Class' },
    { field_key: 'ved_class',          label: 'VED Class' },
    { field_key: 'price_control_code', label: 'Price Control Code' },
  ],

  // ── Item Master — Finance Details (Page 3) ────────────────────────────────
  'item-master-finance-details': [
    { field_key: 'tax_group',         label: 'Tax Group' },
    { field_key: 'standard_price',    label: 'Standard Price' },
    { field_key: 'method_of_costing', label: 'Method of Costing' },
    { field_key: 'costing_method_no', label: 'Costing Method No.' },
    { field_key: 'batch_costing',     label: 'Batch Costing' },
    { field_key: 'serial_no_costing', label: 'Serial No. Costing' },
  ],

  // ── Item Master — Warehouse Details (Page 4) ──────────────────────────────
  'item-master-warehouse-details': [
    { field_key: 'storage_temperature',    label: 'Storage Temperature' },
    { field_key: 'temperature_tolerance',  label: 'Temperature Tolerance' },
    { field_key: 'potency_item',           label: 'Potency Item' },
    { field_key: 'dependency_item',        label: 'Dependency Item' },
    { field_key: 'forced_putaway',         label: 'Forced Putaway' },
    { field_key: 'multi_batch_pallet',     label: 'Multi-Batch Pallet' },
    { field_key: 'item_consider',          label: 'Item Consider' },
  ],

  // ── Item Master — Purchase Details (Page 4) ───────────────────────────────
  'item-master-purchase-details': [
    { field_key: 'vendor_analysis',               label: 'Vendor Analysis' },
    { field_key: 'analysis_property_class',       label: 'Analysis Property Class' },
    { field_key: 'positive_tolerance_percent',    label: 'Positive Tolerance %' },
    { field_key: 'negative_tolerance_percent',    label: 'Negative Tolerance %' },
    { field_key: 'physical_stock_variance_percent', label: 'Physical Stock Variance %' },
    { field_key: 'receipt_variance_percent',      label: 'Receipt Variance %' },
  ],

};