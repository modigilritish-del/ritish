'use client';

/**
 * ExcelImportPopup.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * REUSABLE Excel Import Popup — works on ANY page without modification.
 *
 * USAGE:
 *   import ExcelImportPopup from './ExcelImportPopup';
 *
 *   <ExcelImportPopup
 *     isOpen={showImport}
 *     onClose={() => setShowImport(false)}
 *     onSuccess={(results) => console.log('Imported:', results)}
 *     fields={[
 *       { key: 'type_code',  label: 'Type Code',   required: true  },
 *       { key: 'type_name',  label: 'Type Name',   required: true  },
 *       { key: 'description',label: 'Description', required: false },
 *     ]}
 *     apiEndpoint="http://localhost:8000/api/gl-types"
 *     apiMethod="POST"                         // optional, default POST
 *     title="Import GL Types from Excel"       // optional
 *     accentColor="#8b5cf6"                    // optional (matches your page color)
 *   />
 *
 * PROPS:
 *   isOpen        {bool}     — show / hide the popup
 *   onClose       {fn}       — called when user closes popup
 *   onSuccess     {fn}       — called with array of server responses after import
 *   fields        {Array}    — [{ key, label, required }]  — destination DB fields
 *   apiEndpoint   {string}   — POST URL for one record at a time
 *   apiMethod     {string}   — HTTP method (default "POST")
 *   title         {string}   — popup heading
 *   accentColor   {string}   — header / button color (default "#8b5cf6")
 *   extraFormData {Object}   — extra key-value pairs appended to every FormData (e.g. user_id)
 *   templateDropdownFields {Array}  — [{ key, label, options: [{ label, value }] }] — fields rendered as Excel dropdowns in template
 *
 * DEPENDENCIES: xlsx (SheetJS) loaded via CDN script tag OR npm install xlsx
 *               lucide-react for icons
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { X, Upload, FileSpreadsheet, ArrowRight, CheckCircle, AlertCircle, Loader, RefreshCw, Download } from 'lucide-react';

// ── SheetJS loader (works whether installed via npm or CDN) ──────────────────
let XLSX_LIB = null;
const getXLSX = () => {
  if (XLSX_LIB) return Promise.resolve(XLSX_LIB);
  if (typeof window !== 'undefined' && window.XLSX) {
    XLSX_LIB = window.XLSX;
    return Promise.resolve(XLSX_LIB);
  }
  return import('xlsx')
    .then(mod => { XLSX_LIB = mod; return mod; })
    .catch(() => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.onload = () => { XLSX_LIB = window.XLSX; resolve(window.XLSX); };
        script.onerror = () => reject(new Error('Failed to load SheetJS'));
        document.head.appendChild(script);
      });
    });
};

// Safely stringify FastAPI detail — can be string, array of Pydantic errors, or object
const safeDetail = (detail, fallback = 'Unknown error') => {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
  if (typeof detail === 'object') return detail.msg || detail.message || JSON.stringify(detail);
  return String(detail);
};
const STEPS = ['upload', 'map', 'preview', 'import'];

const stepLabel = s => ({
  upload:  '1. Upload Excel',
  map:     '2. Map Columns',
  preview: '3. Preview Data',
  import:  '4. Import',
}[s]);

// ─────────────────────────────────────────────────────────────────────────────
export default function ExcelImportPopup({
  isOpen,
  onClose,
  onSuccess,
  fields = [],
  templateDropdownFields = [],   // [{ key, label, options: [{ label, value }] }]
  apiEndpoint = '',
  apiMethod = 'POST',
  title = 'Import from Excel',
  accentColor = '#8b5cf6',
  extraFormData = {},
  // lookupFields: [{ key, label, data: [{...}], matchKey, valueKey, caseSensitive? }]
  lookupFields = [],
  // importNote: optional string shown as info banner on upload step
  importNote = '',
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState('upload');

  // Upload step
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [excelColumns, setExcelColumns] = useState([]);   // column headers from Excel
  const [rawRows, setRawRows] = useState([]);              // all parsed rows
  const [parseError, setParseError] = useState('');
  const [parsing, setParsing] = useState(false);

  // Map step
  // mapping = { fieldKey: excelColumnName | '' }
  const [mapping, setMapping] = useState({});

  // Preview step
  const [previewRows, setPreviewRows] = useState([]);

  // Import step
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState([]);   // { row, status, error }
  const [importDone, setImportDone] = useState(false);

  const fileInputRef = useRef(null);

  // Stable refs so useCallback deps don't change on every render
  const fieldsRef       = useRef(fields);
  const lookupFieldsRef = useRef(lookupFields);
  useEffect(() => { fieldsRef.current       = fields;       }, [fields]);
  useEffect(() => { lookupFieldsRef.current = lookupFields; }, [lookupFields]);

  const resetAll = () => {
    setStep('upload');
    setDragOver(false);
    setFileName('');
    setSheets([]);
    setSelectedSheet('');
    setExcelColumns([]);
    setRawRows([]);
    setParseError('');
    setParsing(false);
    setMapping({});
    setPreviewRows([]);
    setImporting(false);
    setImportResults([]);
    setImportDone(false);
  };

  // Reset whenever popup opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(resetAll, 300);
    }
  }, [isOpen]);

  // ── Pre-compute unresolved lookup rows for preview step warning ──────────
  const unresolvedRows = useMemo(() => {
    if (step !== 'preview' || lookupFields.length === 0) return [];
    return previewRows.map((row, i) => {
      const unresolved = lookupFields.filter(lf => {
        const rawLabel = row[lf.key];
        if (!rawLabel || rawLabel === '') return false;
        return !lf.data.find(item =>
          String(item[lf.matchKey] ?? '').trim().toLowerCase() === String(rawLabel).trim().toLowerCase()
        );
      });
      return unresolved.length > 0 ? { rowNum: i + 1, unresolved } : null;
    }).filter(Boolean);
  }, [step, previewRows, lookupFields]);

  // ── Excel parsing ──────────────────────────────────────────────────────────
  const loadSheet = useCallback((wb, sheetName, XLSX_lib) => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX_lib.utils.sheet_to_json(ws, { defval: '', raw: false });
    if (rows.length === 0) {
      setParseError('Sheet is empty or has no data rows.');
      setExcelColumns([]);
      setRawRows([]);
      setParsing(false);
      return;
    }
    const cols = Object.keys(rows[0]);
    setExcelColumns(cols);
    setRawRows(rows);

    // Auto-map: if Excel column name matches field label or key (case-insensitive)
    const autoMap = {};
    fieldsRef.current.forEach(f => {
      const match = cols.find(c =>
        c.toLowerCase() === f.key.toLowerCase() ||
        c.toLowerCase() === f.label.toLowerCase()
      );
      autoMap[f.key] = match || '';
    });
    // Also auto-map lookup fields
    lookupFieldsRef.current.forEach(lf => {
      const match = cols.find(c =>
        c.toLowerCase() === lf.key.toLowerCase() ||
        c.toLowerCase() === lf.label.toLowerCase()
      );
      autoMap[lf.key] = match || '';
    });
    setMapping(autoMap);
    setParsing(false);
    setStep('map');
  }, []); // stable — reads fields/lookupFields via refs

  const parseFile = useCallback(async (file) => {
    if (!file) return;
    setParsing(true);
    setParseError('');
    setFileName(file.name);
    try {
      const XLSX = await getXLSX();
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

      const sheetNames = wb.SheetNames;
      setSheets(sheetNames);

      const firstSheet = sheetNames[0];
      setSelectedSheet(firstSheet);
      loadSheet(wb, firstSheet, XLSX);
    } catch (err) {
      setParseError('Failed to read Excel file: ' + err.message);
      setParsing(false);
    }
  }, [loadSheet]);

  // ── File drop / input ──────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) parseFile(file);
  };

  // ── Sheet change ───────────────────────────────────────────────────────────
  const handleSheetChange = async (sheetName) => {
    setSelectedSheet(sheetName);
    setParsing(true);
    try {
      const XLSX = await getXLSX();
      const fileInput = fileInputRef.current;
      // Re-read the file from the input if available
      const file = fileInput?.files[0];
      if (file) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
        loadSheet(wb, sheetName, XLSX);
      }
    } catch (err) {
      setParseError(err.message);
      setParsing(false);
    }
  };

  // ── Mapping step: go to preview ────────────────────────────────────────────
  const handleProceedToPreview = () => {
    // Validate required fields
    const missing = fields.filter(f => f.required && !mapping[f.key]);
    if (missing.length > 0) {
      alert(`Please map required fields: ${missing.map(f => f.label).join(', ')}`);
      return;
    }
    // Build preview rows — include both normal fields and lookup fields
    const mapped = rawRows.map(row => {
      const out = {};
      fields.forEach(f => {
        out[f.key] = mapping[f.key] ? row[mapping[f.key]] : '';
      });
      // Include lookup field raw labels in preview (shown as-is, resolved during import)
      lookupFields.forEach(lf => {
        out[lf.key] = mapping[lf.key] ? row[mapping[lf.key]] : '';
      });
      return out;
    });
    setPreviewRows(mapped);
    setStep('preview');
  };

  // ── Import step ────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!apiEndpoint) {
      alert('No API endpoint configured.');
      return;
    }
    setImporting(true);
    setStep('import');
    const results = [];

    // Get user_id from session if available
    let userId = null;
    try {
      const ud = JSON.parse(sessionStorage.getItem('userData') || '{}');
      userId = ud?.user?.id || null;
    } catch {}

    for (let i = 0; i < previewRows.length; i++) {
      const row = previewRows[i];
      try {
        const fd = new FormData();
        fields.forEach(f => {
          if (row[f.key] !== undefined && row[f.key] !== '') {
            fd.append(f.key, String(row[f.key]).trim());
          }
        });
        // Extra form data (e.g. gl_type_id passed via prop)
        Object.entries(extraFormData).forEach(([k, v]) => fd.append(k, v));
        if (userId && !extraFormData.user_id) fd.append('user_id', userId);

        // ── Resolve lookupFields: replace label text → ID value ──
        let lookupError = null;
        for (const lf of lookupFields) {
          const rawLabel = row[lf.key];
          if (rawLabel !== undefined && rawLabel !== '') {
            const needle = String(rawLabel).trim();
            const found = lf.data.find(item => {
              const hay = String(item[lf.matchKey] ?? '').trim();
              return lf.caseSensitive ? hay === needle : hay.toLowerCase() === needle.toLowerCase();
            });
            if (found) {
              fd.set(lf.key, String(found[lf.valueKey]));
            } else {
              // Not found — fail this row with a clear message
              lookupError = `"${needle}" not found in ${lf.label}. Valid values: ${lf.data.slice(0, 5).map(d => d[lf.matchKey]).join(', ')}${lf.data.length > 5 ? '…' : ''}`;
              break;
            }
          } else if (!fd.get(lf.key) && lf.required) {
            // Required lookup field missing entirely
            lookupError = `${lf.label} is required but not mapped or missing in this row`;
            break;
          }
        }
        if (lookupError) {
          results.push({ row: i + 1, status: 'error', error: lookupError });
          setImportResults([...results]);
          continue;
        }

        const res = await fetch(apiEndpoint, { method: apiMethod, body: fd });
        const data = await res.json();
        if (res.ok) {
          results.push({ row: i + 1, status: 'success', data });
        } else {
          results.push({ row: i + 1, status: 'error', error: safeDetail(data?.detail, JSON.stringify(data)) });
        }
      } catch (err) {
        results.push({ row: i + 1, status: 'error', error: err.message });
      }
      setImportResults([...results]);
    }

    setImporting(false);
    setImportDone(true);
    if (onSuccess) onSuccess(results);
  };

  // ── Download sample Excel (with real Excel dropdown validation via JSZip) ────
  const downloadSample = async () => {
    try {
      // Load JSZip from CDN to build .xlsx from XML parts
      const JSZip = await new Promise((resolve, reject) => {
        if (window.JSZip) { resolve(window.JSZip); return; }
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload = () => resolve(window.JSZip);
        s.onerror = () => reject(new Error('Could not load JSZip'));
        document.head.appendChild(s);
      });

      // All columns: regular fields first, then dropdown fields
      const allFields = [
        ...fields,
        ...templateDropdownFields.map(d => ({ key: d.key, label: d.label, required: true })),
      ];

      // Helper: col index (0-based) → Excel letter (A, B, … Z, AA …)
      const colLetter = (idx) => {
        let s = '', n = idx + 1;
        while (n > 0) { s = String.fromCharCode(64 + (n % 26 || 26)) + s; n = Math.floor((n - 1) / 26); }
        return s;
      };

      // Shared strings registry
      const strings = [];
      const si = (str) => {
        const esc = String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        let i = strings.indexOf(esc); if (i === -1) { i = strings.length; strings.push(esc); } return i;
      };
      allFields.forEach(f => si(f.label));
            templateDropdownFields.forEach(dd => dd.options.forEach(o => si(o.label)));

      // ── [Content_Types].xml
      const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  ${templateDropdownFields.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i+2}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n  ')}
</Types>`;

      // ── _rels/.rels
      const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

      // ── styles.xml (header row gets purple fill + bold)
      const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="10"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE9D5FF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;

      // ── Data validation: use direct sheet ref in formula1 — the proven OOXML approach.
      // Key rules Excel enforces:
      //   1. Sheet name must be in single quotes: 'SheetN'
      //   2. The ref must use absolute notation: $A$1:$A$N
      //   3. The formula1 value must be XML-escaped (& → &amp; etc.)
      //   4. No definedNames needed — they cause "Named range removed" repair errors
      const dvXml = templateDropdownFields.map((dd, ddIdx) => {
        const ci = allFields.findIndex(f => f.key === dd.key);
        const cl = colLetter(ci);
        const sheetName = `Sheet${ddIdx + 2}`;
        // Formula must be single-quoted sheet name + absolute range, XML-escaped
        const formula = `&apos;${sheetName}&apos;!$A$1:$A$${dd.options.length}`;
        return `<dataValidation type="list" allowBlank="1" showDropDown="0" showInputMessage="1" showErrorMessage="1" sqref="${cl}2:${cl}1048576">
      <formula1>${formula}</formula1>
    </dataValidation>`;
      }).join('\n    ');

      // ── sheet1.xml — no xmlns:r (unused namespace declaration triggers Excel repair)
      const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0" tabSelected="1"><selection activeCell="A2" sqref="A2"/></sheetView></sheetViews>
  <sheetData>
    <row r="1">${allFields.map((f, ci) => `<c r="${colLetter(ci)}1" t="s" s="1"><v>${si(f.label)}</v></c>`).join('')}</row>
  </sheetData>
  ${dvXml ? `<dataValidations count="${templateDropdownFields.length}">\n    ${dvXml}\n  </dataValidations>` : ''}
</worksheet>`;

      // ── workbook.xml — NO definedNames block (causes "Named range removed" repair error)
      const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <fileVersion appName="xl" lastEdited="5" lowestEdited="5" rupBuild="9303"/>
  <workbookPr defaultThemeVersion="124226"/>
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="16380" windowHeight="8730"/></bookViews>
  <sheets>
    <sheet name="Data" sheetId="1" r:id="rId1"/>
    ${templateDropdownFields.map((dd, i) => `<sheet name="Sheet${i+2}" sheetId="${i+2}" state="hidden" r:id="rId${i+2}"/>`).join('\n    ')}
  </sheets>
  <calcPr calcId="144525"/>
</workbook>`;

      // ── xl/_rels/workbook.xml.rels
      // rId1=sheet1, rId2..N=hidden option sheets, rIdN+1=styles, rIdN+2=sharedStrings
      const wbRelCount = 1 + templateDropdownFields.length;
      const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  ${templateDropdownFields.map((_, i) => `<Relationship Id="rId${i+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+2}.xml"/>`).join('\n  ')}
  <Relationship Id="rId${wbRelCount+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId${wbRelCount+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

      // ── sharedStrings.xml
      const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
  ${strings.map(s => `<si><t xml:space="preserve">${s}</t></si>`).join('\n  ')}
</sst>`;

      // ── Hidden option sheets (one per dropdown field, lists that field's allowed values)
      const optionSheetXmls = templateDropdownFields.map(dd => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${dd.options.map((o, ri) => `<row r="${ri+1}"><c r="A${ri+1}" t="s"><v>${si(o.label)}</v></c></row>`).join('\n    ')}
  </sheetData>
</worksheet>`);

      // ── Assemble ZIP
      const zip = new JSZip();
      zip.file('[Content_Types].xml', contentTypes);
      zip.file('_rels/.rels', rootRels);
      zip.file('xl/workbook.xml', workbookXml);
      zip.file('xl/_rels/workbook.xml.rels', wbRels);
      zip.file('xl/sharedStrings.xml', sharedStringsXml);
      zip.file('xl/styles.xml', stylesXml);
      zip.file('xl/worksheets/sheet1.xml', sheet1Xml);
      // sheet1Rels intentionally omitted — causes Excel corruption if included
      optionSheetXmls.forEach((xml, i) => zip.file(`xl/worksheets/sheet${i+2}.xml`, xml));

      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}_Template.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } catch (err) {
      alert('Could not generate sample file: ' + err.message);
    }
  };

  if (!isOpen) return null;

  // ── Styles (inline, no extra CSS needed) ──────────────────────────────────
  const accent = accentColor;
  const accentLight = accent + '18';

  const styles = {
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(2px)',
    },
    popup: {
      background: '#fff', borderRadius: 10, width: '90vw', maxWidth: 780,
      maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      overflow: 'hidden', animation: 'popIn 0.2s ease',
    },
    header: {
      background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
      color: '#fff', padding: '10px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
    },
    body: { flex: 1, overflow: 'auto', padding: 20 },
    footer: {
      padding: '10px 16px', borderTop: '1px solid #e5e7eb',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: '#f9fafb', flexShrink: 0,
    },
    stepBar: {
      display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb',
      background: '#f9fafb', flexShrink: 0,
    },
    stepBtn: (active) => ({
      flex: 1, padding: '7px 4px', fontSize: 10, fontWeight: 600,
      border: 'none', cursor: 'default',
      background: active ? '#fff' : 'transparent',
      color: active ? accent : '#9ca3af',
      borderBottom: active ? `2px solid ${accent}` : '2px solid transparent',
      transition: 'all 0.2s',
    }),
    btn: (primary) => ({
      padding: '7px 16px', borderRadius: 5, fontSize: 11, fontWeight: 600,
      cursor: 'pointer', border: 'none',
      background: primary ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : '#f3f4f6',
      color: primary ? '#fff' : '#374151',
      display: 'flex', alignItems: 'center', gap: 5,
    }),
    label: { fontSize: 10, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' },
    select: {
      width: '100%', padding: '6px 8px', border: '1px solid #d1d5db',
      borderRadius: 5, fontSize: 11, color: '#111', background: '#fff',
      outline: 'none', cursor: 'pointer',
    },
    tag: (type) => ({
      padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 700,
      background: type === 'required' ? '#fef2f2' : '#f0fdf4',
      color: type === 'required' ? '#dc2626' : '#16a34a',
      border: `1px solid ${type === 'required' ? '#fca5a5' : '#86efac'}`,
    }),
  };

  const successCount = importResults.filter(r => r.status === 'success').length;
  const errorCount   = importResults.filter(r => r.status === 'error').length;

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.popup}>

        {/* ── CSS keyframe ── */}
        <style>{`
          @keyframes popIn {
            from { opacity: 0; transform: scale(0.94) translateY(10px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .eip-shimmer {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.2s infinite;
            border-radius: 4px;
            height: 20px;
          }
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          .eip-drop-zone:hover { border-color: ${accent} !important; background: ${accentLight} !important; }
        `}</style>

        {/* HEADER */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet size={15} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>{title}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={downloadSample}
              title="Download sample Excel template"
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 4, padding: '3px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Download size={11} /> Sample
            </button>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* STEP BAR */}
        <div style={styles.stepBar}>
          {STEPS.map(s => (
            <button key={s} style={styles.stepBtn(step === s)}>{stepLabel(s)}</button>
          ))}
        </div>

        {/* BODY */}
        <div style={styles.body}>

          {/* ── STEP 1: UPLOAD ─────────────────────────────────────────────── */}
          {step === 'upload' && (
            <div>
              {/* importNote banner — shown when GL Type is pre-selected */}
              {importNote && (
                <div style={{ marginBottom: 12, padding: '8px 12px', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 7, fontSize: 10, color: '#6d28d9', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  🏷️ {importNote}
                </div>
              )}

              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
                Upload an <strong>.xlsx</strong> or <strong>.xls</strong> file. Your Excel columns will be mapped to the following fields:
              </p>

              {/* Fields reference */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: lookupFields.length > 0 ? 8 : 18 }}>
                {fields.map(f => (
                  <span key={f.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: accentLight, border: `1px solid ${accent}40`, borderRadius: 20, fontSize: 10, color: '#111' }}>
                    {f.label}
                    {f.required && <span style={styles.tag('required')}>Required</span>}
                  </span>
                ))}
                {lookupFields.map(lf => (
                  <span key={lf.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#faf5ff', border: '1px solid #c4b5fd', borderRadius: 20, fontSize: 10, color: '#7c3aed' }}>
                    🔗 {lf.label} <span style={{ fontSize: 8, background: '#ede9fe', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>Auto-detect</span>
                  </span>
                ))}
              </div>

              {/* Lookup info — only when no pre-selection */}
              {lookupFields.length > 0 && (
                <div style={{ marginBottom: 14, padding: '7px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, fontSize: 10, color: '#0369a1' }}>
                  <strong>Auto-detect:</strong> The <strong>GL Type</strong> column in your Excel will be matched against the database. Rows with unrecognized GL Type names will be flagged as errors during import.
                </div>
              )}

              {/* Drop zone */}
              <div
                className="eip-drop-zone"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? accent : '#d1d5db'}`,
                  borderRadius: 8, padding: '40px 20px', textAlign: 'center',
                  cursor: 'pointer', background: dragOver ? accentLight : '#fafafa',
                  transition: 'all 0.2s',
                }}
              >
                {parsing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <Loader size={28} style={{ color: accent, animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Reading file…</span>
                  </div>
                ) : (
                  <>
                    <Upload size={32} style={{ color: accent, margin: '0 auto 10px', display: 'block' }} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>
                      Drop your Excel file here
                    </p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                      or click to browse &nbsp;·&nbsp; .xlsx / .xls supported
                    </p>
                    {fileName && (
                      <p style={{ marginTop: 10, fontSize: 11, color: accent, fontWeight: 600 }}>
                        📄 {fileName}
                      </p>
                    )}
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={handleFileInput}
                />
              </div>

              {parseError && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 11, color: '#dc2626', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <AlertCircle size={13} /> {parseError}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: MAP COLUMNS ────────────────────────────────────────── */}
          {step === 'map' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#374151', fontWeight: 600, margin: 0 }}>📄 {fileName}</p>
                  <p style={{ fontSize: 10, color: '#6b7280', margin: '2px 0 0' }}>{rawRows.length.toLocaleString()} rows detected</p>
                </div>
                {/* Sheet selector */}
                {sheets.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: '#6b7280' }}>Sheet:</span>
                    <select value={selectedSheet} onChange={e => handleSheetChange(e.target.value)} style={{ ...styles.select, width: 'auto', padding: '4px 8px' }}>
                      {sheets.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 14 }}>
                Map each <strong>destination field</strong> to the corresponding <strong>Excel column</strong>. Auto-mapped fields are pre-selected.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {fields.map(f => (
                  <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', alignItems: 'center', gap: 10, padding: '10px 14px', background: mapping[f.key] ? accentLight : '#f9fafb', border: `1px solid ${mapping[f.key] ? accent + '40' : '#e5e7eb'}`, borderRadius: 7 }}>
                    {/* Field info */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>{f.label}</span>
                        <span style={styles.tag(f.required ? 'required' : 'optional')}>{f.required ? 'Required' : 'Optional'}</span>
                      </div>
                      <span style={{ fontSize: 9, color: '#9ca3af' }}>key: {f.key}</span>
                    </div>

                    {/* Arrow */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <ArrowRight size={14} color={mapping[f.key] ? accent : '#d1d5db'} />
                    </div>

                    {/* Excel column dropdown */}
                    <select
                      value={mapping[f.key] || ''}
                      onChange={e => setMapping(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{ ...styles.select, borderColor: mapping[f.key] ? accent : '#d1d5db' }}
                    >
                      <option value="">— Not mapped —</option>
                      {excelColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}

                {/* Lookup fields — optional, resolved label→ID during import */}
                {lookupFields.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginTop: 4, padding: '4px 0', borderTop: '1px dashed #e5e7eb' }}>
                      🔗 Lookup Fields (auto-resolved name → ID during import)
                    </div>
                    {lookupFields.map(lf => {
                      const isMapped = !!mapping[lf.key];
                      const isFallback = !isMapped && !!extraFormData[lf.key];
                      return (
                        <div key={lf.key} style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', alignItems: 'center', gap: 10, padding: '10px 14px', background: isMapped ? '#faf5ff' : isFallback ? '#f0fdf4' : '#f9fafb', border: `1px solid ${isMapped ? accent + '40' : isFallback ? '#86efac' : '#e5e7eb'}`, borderRadius: 7 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>{lf.label}</span>
                              <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd' }}>Lookup</span>
                              {isFallback && <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac' }}>Pre-selected ✓</span>}
                            </div>
                            <span style={{ fontSize: 9, color: '#9ca3af' }}>
                              {isFallback && !isMapped
                                ? `Using pre-selected value (ID: ${extraFormData[lf.key]})`
                                : `Map column → auto-resolves to ID`}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <ArrowRight size={14} color={isMapped ? accent : '#d1d5db'} />
                          </div>
                          <select
                            value={mapping[lf.key] || ''}
                            onChange={e => setMapping(prev => ({ ...prev, [lf.key]: e.target.value }))}
                            style={{ ...styles.select, borderColor: isMapped ? accent : '#d1d5db' }}
                          >
                            <option value="">{isFallback ? '— Use pre-selected —' : '— Not mapped —'}</option>
                            {excelColumns.map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Excel columns preview */}
              <div style={{ marginTop: 16, padding: '10px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', margin: '0 0 6px' }}>Excel Columns Found ({excelColumns.length}):</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {excelColumns.map(col => (
                    <span key={col} style={{ padding: '2px 8px', background: '#e5e7eb', borderRadius: 4, fontSize: 10, color: '#374151' }}>
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: PREVIEW ────────────────────────────────────────────── */}
          {step === 'preview' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: '#374151', fontWeight: 600, margin: 0 }}>
                  Previewing <span style={{ color: accent }}>{previewRows.length.toLocaleString()}</span> rows to import
                </p>
                <p style={{ fontSize: 10, color: '#6b7280' }}>First 10 shown below</p>
              </div>

              {/* Unresolved lookup warnings */}
              {unresolvedRows.length > 0 && (
                <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <AlertCircle size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626' }}>
                      {unresolvedRows.length} row{unresolvedRows.length > 1 ? 's' : ''} have unrecognized GL Type — these will FAIL during import
                    </span>
                  </div>
                  <div style={{ maxHeight: 80, overflowY: 'auto' }}>
                    {unresolvedRows.slice(0, 8).map(r => (
                      <div key={r.rowNum} style={{ fontSize: 9, color: '#b91c1c', marginBottom: 2 }}>
                        Row {r.rowNum}: {r.unresolved.map(lf => `"${previewRows[r.rowNum-1][lf.key]}" not found in ${lf.label}`).join(', ')}
                      </div>
                    ))}
                    {unresolvedRows.length > 8 && <div style={{ fontSize: 9, color: '#9ca3af' }}>… and {unresolvedRows.length - 8} more</div>}
                  </div>
                  <div style={{ fontSize: 9, color: '#b91c1c', marginTop: 6 }}>
                    ⚠️ Fix: Make sure GL Type names in your Excel exactly match the database (case-insensitive).{lookupFields[0] ? ` Valid names: ${lookupFields[0].data.slice(0,5).map(d => d[lookupFields[0].matchKey]).join(', ')}${lookupFields[0].data.length > 5 ? '…' : ''}` : ''}
                  </div>
                </div>
              )}

              {unresolvedRows.length === 0 && lookupFields.length > 0 && (
                <div style={{ marginBottom: 12, padding: '7px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, fontSize: 10, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={12} /> All GL Type values recognized — ready to import
                </div>
              )}

              <div style={{ overflowX: 'auto', borderRadius: 7, border: '1px solid #e5e7eb' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: accentLight }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: `1px solid ${accent}30` }}>#</th>
                      {fields.map(f => (
                        <th key={f.key} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: `1px solid ${accent}30`, whiteSpace: 'nowrap' }}>
                          {f.label}
                        </th>
                      ))}
                      {lookupFields.filter(lf => mapping[lf.key] || extraFormData[lf.key]).map(lf => (
                        <th key={lf.key} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#7c3aed', borderBottom: `1px solid ${accent}30`, whiteSpace: 'nowrap' }}>
                          🔗 {lf.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 10).map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        <td style={{ padding: '5px 10px', color: '#9ca3af', borderBottom: '1px solid #f3f4f6' }}>{i + 1}</td>
                        {fields.map(f => (
                          <td key={f.key} style={{ padding: '5px 10px', color: '#111', borderBottom: '1px solid #f3f4f6', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={String(row[f.key] ?? '')}>
                            {row[f.key] !== undefined && row[f.key] !== '' ? String(row[f.key]) : <span style={{ color: '#d1d5db', fontSize: 9 }}>empty</span>}
                          </td>
                        ))}
                        {lookupFields.filter(lf => mapping[lf.key] || extraFormData[lf.key]).map(lf => {
                          const rawLabel = row[lf.key];
                          let display;
                          if (rawLabel !== undefined && rawLabel !== '') {
                            const found = lf.data.find(item =>
                              String(item[lf.matchKey] ?? '').trim().toLowerCase() === String(rawLabel).trim().toLowerCase()
                            );
                            display = found
                              ? <span style={{ color: '#16a34a', fontWeight: 600 }}>{String(rawLabel)} → {found[lf.valueKey]}</span>
                              : <span style={{ color: '#dc2626' }}>{String(rawLabel)} ⚠ not found</span>;
                          } else if (extraFormData[lf.key]) {
                            const found = lf.data.find(item => String(item[lf.valueKey]) === String(extraFormData[lf.key]));
                            display = <span style={{ color: '#7c3aed', fontStyle: 'italic' }}>Pre-selected: {found ? found[lf.matchKey] : extraFormData[lf.key]}</span>;
                          } else {
                            display = <span style={{ color: '#d1d5db', fontSize: 9 }}>empty</span>;
                          }
                          return (
                            <td key={lf.key} style={{ padding: '5px 10px', borderBottom: '1px solid #f3f4f6', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 10 && (
                  <div style={{ padding: '6px 12px', background: '#f9fafb', fontSize: 10, color: '#6b7280', borderTop: '1px solid #e5e7eb' }}>
                    + {(previewRows.length - 10).toLocaleString()} more rows will be imported
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14, padding: '10px 14px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 7, fontSize: 10, color: '#854d0e' }}>
                ⚠️ Clicking <strong>Start Import</strong> will send all {previewRows.length.toLocaleString()} rows to the server. This action cannot be undone automatically.
              </div>
            </div>
          )}

          {/* ── STEP 4: IMPORT RESULTS ─────────────────────────────────────── */}
          {step === 'import' && (
            <div>
              {/* Progress bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
                  <span style={{ color: '#374151', fontWeight: 600 }}>
                    {importDone ? 'Import Complete!' : `Importing… ${importResults.length} / ${previewRows.length}`}
                  </span>
                  <span style={{ color: '#6b7280' }}>
                    ✅ {successCount} &nbsp; ❌ {errorCount}
                  </span>
                </div>
                <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, transition: 'width 0.3s',
                    width: `${previewRows.length ? (importResults.length / previewRows.length) * 100 : 0}%`,
                    background: errorCount > 0 ? 'linear-gradient(90deg, #22c55e, #f59e0b)' : `linear-gradient(90deg, ${accent}, ${accent}cc)`,
                  }} />
                </div>
              </div>

              {/* Summary card (when done) */}
              {importDone && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 7, textAlign: 'center' }}>
                    <CheckCircle size={18} style={{ color: '#16a34a', margin: '0 auto 4px', display: 'block' }} />
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{successCount}</div>
                    <div style={{ fontSize: 10, color: '#15803d' }}>Successful</div>
                  </div>
                  {errorCount > 0 && (
                    <div style={{ flex: 1, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, textAlign: 'center' }}>
                      <AlertCircle size={18} style={{ color: '#dc2626', margin: '0 auto 4px', display: 'block' }} />
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{errorCount}</div>
                      <div style={{ fontSize: 10, color: '#b91c1c' }}>Failed</div>
                    </div>
                  )}
                </div>
              )}

              {/* Row-level results */}
              <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 7 }}>
                {importResults.length === 0 && importing && (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <Loader size={22} style={{ color: accent, animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  </div>
                )}
                {importResults.map((r, i) => (
                  <div key={i} style={{
                    padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 10,
                    borderBottom: i < importResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                    background: r.status === 'success' ? '#f0fdf4' : '#fef2f2',
                  }}>
                    {r.status === 'success'
                      ? <CheckCircle size={12} style={{ color: '#16a34a', flexShrink: 0 }} />
                      : <AlertCircle size={12} style={{ color: '#dc2626', flexShrink: 0 }} />}
                    <span style={{ color: '#6b7280', flexShrink: 0 }}>Row {r.row}</span>
                    {r.status === 'success'
                      ? <span style={{ color: '#15803d' }}>Imported successfully</span>
                      : <span style={{ color: '#dc2626' }}>{r.error}</span>}
                  </div>
                ))}
                {/* Shimmer for pending */}
                {importing && [...Array(Math.max(0, Math.min(3, previewRows.length - importResults.length)))].map((_, i) => (
                  <div key={`sh-${i}`} style={{ padding: '8px 12px' }}>
                    <div className="eip-shimmer" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={styles.footer}>
          <button style={styles.btn(false)} onClick={() => {
            if (step === 'map') setStep('upload');
            else if (step === 'preview') setStep('map');
            else if (step === 'import' && importDone) { resetAll(); onClose(); }
            else onClose();
          }}>
            {step === 'import' && importDone ? '✓ Close' : step === 'upload' ? 'Cancel' : '← Back'}
          </button>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {step === 'upload' && (
              <button style={styles.btn(false)} onClick={downloadSample}>
                <Download size={12} /> Download Template
              </button>
            )}

            {step === 'map' && (
              <button style={styles.btn(true)} onClick={handleProceedToPreview}>
                Preview Data →
              </button>
            )}

            {step === 'preview' && (
              <button style={styles.btn(true)} onClick={handleImport}>
                <Upload size={12} /> Start Import ({previewRows.length.toLocaleString()} rows)
              </button>
            )}

            {step === 'import' && !importDone && (
              <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Please wait…
              </span>
            )}

            {step === 'import' && importDone && (
              <button style={styles.btn(true)} onClick={() => { resetAll(); }}>
                <RefreshCw size={12} /> Import More
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}