/**
 * UniversalExport.js
 * ─────────────────────────────────────────────────────────────────────────────
 * A fully reusable, plug-and-play export panel component.
 * Works with ANY data — just pass rows + column definitions.
 *
 * ── HOW TO USE ────────────────────────────────────────────────────────────────
 *
 *  import UniversalExport from './UniversalExport';
 *
 *  <UniversalExport
 *    open={showExport}
 *    onClose={() => setShowExport(false)}
 *    data={myRecords}              // array of objects (your raw data)
 *    columns={myColumns}           // see Column Definition below
 *    reportTitle="Item Code Requests"
 *    user={sessionUser}            // { id, full_name, username }
 *    activeFilters={{ status: 'APPROVED', dateFrom: '2026-01-01' }}  // optional
 *  />
 *
 * ── COLUMN DEFINITION ─────────────────────────────────────────────────────────
 *  Each column is an object:
 *  {
 *    key:       'item_name',            // dot-notation supported: 'company.company_name'
 *    label:     'Item Name',            // header label shown in export
 *    preset:    ['summary','detailed','full'],  // which presets include this col
 *                                               // omit = always included
 *    format:    (val, row) => string,   // optional custom formatter
 *    width:     20,                     // optional min width hint for PDF (mm)
 *  }
 *
 * ── EXAMPLE COLUMNS ───────────────────────────────────────────────────────────
 *  const ITEM_COLUMNS = [
 *    { key: '#',               label: '#',                 preset: ['summary','detailed','full'], width: 5 },
 *    { key: 'item_name',       label: 'Item Name',         preset: ['summary','detailed','full'], width: 22 },
 *    { key: 'item_short_name', label: 'Item Short Name',   preset: ['summary','detailed','full'], width: 20 },
 *    { key: 'item_type',       label: 'Item Type',         preset: ['summary','detailed','full'], width: 16 },
 *    { key: 'company.company_name', label: 'Company',      preset: ['summary','detailed','full'], width: 18 },
 *    { key: 'plant.plant_name',     label: 'Plant',        preset: ['detailed','full'],           width: 14 },
 *    { key: 'department',           label: 'Department',   preset: ['summary','detailed','full'], width: 16 },
 *    { key: 'required_date',        label: 'Required Date',preset: ['summary','detailed','full'], width: 18 },
 *    { key: 'item_description',     label: 'Item Description', preset: ['detailed','full'],       width: 28 },
 *    { key: 'business_reason',      label: 'Business Reason',  preset: ['detailed','full'],       width: 28 },
 *    { key: 'status',               label: 'Status',       preset: ['summary','detailed','full'], width: 14 },
 *    { key: 'creator.full_name',    label: 'Created By',   preset: ['summary','detailed','full'], width: 16 },
 *    { key: 'created_by',           label: 'Created By (ID)', preset: ['detailed','full'],        width: 12 },
 *    { key: 'created_at',           label: 'Created At',   preset: ['detailed','full'],           width: 22,
 *      format: (v) => v ? new Date(v).toLocaleString('en-IN') : '—' },
 *    { key: 'submitted_at',         label: 'Submitted At', preset: ['summary','detailed','full'], width: 22,
 *      format: (v) => v ? new Date(v).toLocaleString('en-IN') : '—' },
 *    { key: 'completed_at',         label: 'Completed At', preset: ['summary','detailed','full'], width: 22,
 *      format: (v) => v ? new Date(v).toLocaleString('en-IN') : '—' },
 *    // "full" only — action history (pass via row._actionHistory)
 *    { key: '_actionHistory',       label: 'Action History', preset: ['full'],                    width: 40 },
 *    { key: '_lastActionName',      label: 'Last Action By (Name)', preset: ['detailed','full'],   width: 20 },
 *    { key: '_lastActionType',      label: 'Last Action Type',      preset: ['summary','detailed','full'], width: 16 },
 *  ];
 *
 * ── ENRICHING DATA WITH ACTION HISTORY ───────────────────────────────────────
 *  Before passing data, enrich each row with _actionHistory / _lastActionName etc.
 *  OR pass a fetchRowDetail prop for lazy loading (see prop docs below).
 *
 * ── PROPS ─────────────────────────────────────────────────────────────────────
 *  open            boolean         Show/hide the export panel
 *  onClose         () => void      Called when panel is closed
 *  data            object[]        Array of row objects (already filtered or raw)
 *  columns         ColDef[]        Column definitions (see above)
 *  reportTitle     string          e.g. "Item Code Creation Requests"
 *  user            object          { id, full_name?, username? }
 *  activeFilters   object          e.g. { status:'APPROVED', dateFrom:'2026-01-01' }
 *                                  Used for display in export info row + PDF meta
 *  filterFn        (row) => bool   Optional: additional client-side filter applied
 *                                  before export (use if data is unfiltered)
 *  pageName        string          Short slug for filename e.g. "ItemCodeReq"
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { Download, X } from 'lucide-react';

// ─── deep-get: resolve dot-notation key from object ────────────────────────
const deepGet = (obj, key) => {
  if (key === '#') return null; // handled separately
  return key.split('.').reduce((o, k) => (o == null ? '' : o[k]), obj) ?? '';
};

// ─── format date ───────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—';

// ─── escape HTML ───────────────────────────────────────────────────────────
const esc = (v) =>
  String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ═══════════════════════════════════════════════════════════════════════════
//  UniversalExport Component
// ═══════════════════════════════════════════════════════════════════════════
const UniversalExport = ({
  open,
  onClose,
  data = [],
  columns = [],
  reportTitle = 'Report',
  user = null,
  activeFilters = {},
  filterFn = null,
  pageName = 'Export',
}) => {
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [exportPreset, setExportPreset] = useState('detailed');
  const [filenameModal, setFilenameModal] = useState(false);
  const [filenameSuffix, setFilenameSuffix] = useState('');
  const [exporting, setExporting] = useState(false);

  if (!open) return null;

  // ── resolve rows (apply optional filterFn) ─────────────────────────────
  const rows = filterFn ? data.filter(filterFn) : data;

  // ── resolve columns for current preset ─────────────────────────────────
  const activeColumns = columns.filter(col =>
    !col.preset || col.preset.includes(exportPreset)
  );
  const headers = activeColumns.map(c => c.label);

  // ── get cell value for a row+column ────────────────────────────────────
  const getCellValue = (row, col, rowIndex) => {
    if (col.key === '#') return rowIndex + 1;
    const raw = deepGet(row, col.key);
    if (col.format) return col.format(raw, row);
    if (raw instanceof Date) return fmtDate(raw);
    if (typeof raw === 'object' && raw !== null) return JSON.stringify(raw);
    return raw === null || raw === undefined ? '' : String(raw);
  };

  const dataRows = rows.map((row, i) =>
    activeColumns.map(col => String(getCellValue(row, col, i) ?? ''))
  );

  // ── active filter summary string ───────────────────────────────────────
  const filterSummary = Object.entries(activeFilters)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ') || 'None';

  // ── main export dispatcher ─────────────────────────────────────────────
  const handleExport = async (customTitle) => {
    setExporting(true);
    const title = customTitle || `${pageName}_${exportPreset}_${new Date().toISOString().slice(0, 10)}`;

    try {
      if (exportFormat === 'csv') {
        await exportCSV(title);
      } else if (exportFormat === 'xlsx') {
        await exportXLSX(title);
      } else if (exportFormat === 'pdf') {
        await exportPDFPrint(title);
      } else if (exportFormat === 'pdf_direct') {
        await exportPDFDirect(title);
      }
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
    setExporting(false);
    onClose();
  };

  // ══════════════════════════════════════════════════════════════════════
  //  4a. CSV
  // ══════════════════════════════════════════════════════════════════════
  const exportCSV = async (title) => {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      headers.map(q).join(','),
      ...dataRows.map(row => row.map(q).join(',')),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    trigger(blob, `${title}.csv`);
  };

  // ══════════════════════════════════════════════════════════════════════
  //  4b. XLSX via SheetJS
  // ══════════════════════════════════════════════════════════════════════
  const exportXLSX = async (title) => {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', () => window.XLSX);
    const XLSX = window.XLSX;
    const wsData = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths (auto-fit)
    ws['!cols'] = headers.map((h, ci) => ({
      wch: Math.min(60, Math.max(
        h.length + 2,
        ...dataRows.slice(0, 100).map(r => String(r[ci] || '').length)
      )),
    }));

    // Header row styles
    headers.forEach((h, ci) => {
      const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (ws[ref]) {
        ws[ref].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1E3A5F' } },
          alignment: { wrapText: true },
        };
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportTitle.slice(0, 31));

    // Summary sheet
    const sumData = [
      ['Report Title', reportTitle],
      ['Preset', exportPreset],
      ['Exported On', new Date().toLocaleString('en-IN')],
      ['Total Records', rows.length],
      ['Filters Applied', filterSummary],
      ['Exported By', user ? `${user.full_name || user.username || ''} (ID: ${user.id})` : '—'],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(sumData);
    wsSummary['!cols'] = [{ wch: 20 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Export Info');

    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  // ══════════════════════════════════════════════════════════════════════
  //  4c. PDF Print (HTML blob → browser print)
  // ══════════════════════════════════════════════════════════════════════
  const exportPDFPrint = async (title) => {
    const thS = 'background:#1e3a5f;color:#fff;padding:6px 8px;font-size:9px;text-align:left;border:1px solid #2e3349;white-space:nowrap;';
    const tdS = 'padding:5px 8px;font-size:9px;border:1px solid #e5e7eb;color:#374151;vertical-align:top;word-break:break-word;max-width:180px;';
    const trEven = 'background:#f0f4ff;';

    let bodyHtml = '';

    if (exportPreset === 'full') {
      // Card layout — one card per row
      bodyHtml = rows.map((row, i) => {
        const titleVal = activeColumns.find(c => c.key === 'item_name' || c.isPrimary)
          ? String(deepGet(row, activeColumns.find(c => c.key === 'item_name' || c.isPrimary)?.key || '') || `Record #${i + 1}`)
          : `Record #${i + 1}`;
        const statusCol = activeColumns.find(c => c.key === 'status');
        const statusVal = statusCol ? String(getCellValue(row, statusCol, i)) : '';

        const fieldRows = activeColumns
          .filter(c => c.key !== '#')
          .map(col => {
            const val = String(getCellValue(row, col, i));
            if (!val || val === '—') return '';
            return `<tr>
              <td style="padding:3px 8px;font-size:9px;color:#6b7280;font-weight:600;white-space:nowrap;width:150px">${esc(col.label)}</td>
              <td style="padding:3px 8px;font-size:9px;color:#1e293b;word-break:break-word">${esc(val)}</td>
            </tr>`;
          }).join('');

        return `
          <div style="page-break-inside:avoid;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;overflow:hidden;">
            <div style="background:#1e3a5f;color:#fff;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:11px;font-weight:700;">#${i + 1} &nbsp; ${esc(titleVal)}</span>
              ${statusVal ? `<span style="background:#22c55e33;color:#22c55e;border:1px solid #22c55e88;border-radius:12px;padding:2px 8px;font-size:9px;font-weight:700;">${esc(statusVal)}</span>` : ''}
            </div>
            <table style="width:100%;border-collapse:collapse;">${fieldRows}</table>
          </div>`;
      }).join('');
    } else {
      bodyHtml = `<table style="width:100%;border-collapse:collapse;font-size:9px;">
        <thead><tr>${headers.map(h => `<th style="${thS}">${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${dataRows.map((row, i) => `<tr style="${i % 2 === 1 ? trEven : ''}">${row.map(v => `<td style="${tdS}">${esc(v) || '—'}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        h1{color:#1e3a5f;font-size:16px;margin:0 0 4px}
        .meta{color:#6b7280;font-size:10px;margin:0 0 16px}
        *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
        @media print{body{padding:8px}@page{size:A4 landscape;margin:10mm}}
      </style></head><body>
      <h1>${esc(reportTitle)} — ${exportPreset.charAt(0).toUpperCase() + exportPreset.slice(1)} Report</h1>
      <p class="meta">Exported on ${new Date().toLocaleString('en-IN')} &nbsp;·&nbsp; ${rows.length} records &nbsp;·&nbsp; Filters: ${filterSummary}${user ? ` &nbsp;·&nbsp; By: ${esc(user.full_name || user.username || '')} (ID:${user.id})` : ''}</p>
      ${bodyHtml}
      <script>window.onload=()=>window.print();<\/script>
      </body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    trigger(blob, `${title}.html`);
  };

  // ══════════════════════════════════════════════════════════════════════
  //  4d. PDF Direct via jsPDF + autoTable
  // ══════════════════════════════════════════════════════════════════════
  const exportPDFDirect = async (title) => {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => window.jspdf);
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js', () => window.jspdf?.jsPDF?.prototype?.autoTable);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Title & meta
    doc.setFontSize(13); doc.setTextColor(30, 58, 95);
    doc.text(`${reportTitle} — ${exportPreset.charAt(0).toUpperCase() + exportPreset.slice(1)} Report`, 14, 15);
    doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
    doc.text(
      `Exported: ${new Date().toLocaleString('en-IN')}   |   Records: ${rows.length}   |   Filters: ${filterSummary}${user ? `   |   By: ${user.full_name || user.username || ''} (ID:${user.id})` : ''}`,
      14, 22
    );

    if (exportPreset === 'full') {
      // Card layout
      let y = 28;
      rows.forEach((row, i) => {
        if (y > 175) { doc.addPage(); y = 14; }

        // Card header
        const titleVal = String(deepGet(row, 'item_name') || deepGet(row, 'name') || `Record #${i + 1}`);
        const statusVal = String(deepGet(row, 'status') || '');
        doc.setFillColor(30, 58, 95);
        doc.rect(14, y, doc.internal.pageSize.width - 28, 7, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont(undefined, 'bold');
        doc.text(`#${i + 1}  ${titleVal}${statusVal ? '  —  ' + statusVal : ''}`, 16, y + 5);
        y += 9;

        // Fields via autoTable
        const fieldTableData = activeColumns
          .filter(c => c.key !== '#')
          .map(col => {
            const val = String(getCellValue(row, col, i) ?? '');
            return val && val !== '—' ? [col.label, val] : null;
          })
          .filter(Boolean);

        doc.autoTable({
          body: fieldTableData,
          startY: y,
          styles: { fontSize: 8, cellPadding: { top: 2, right: 4, bottom: 2, left: 4 }, overflow: 'linebreak', lineColor: [226, 232, 240], lineWidth: 0.2 },
          columnStyles: {
            0: { cellWidth: 44, fontStyle: 'bold', textColor: [100, 116, 139], halign: 'left' },
            1: { cellWidth: 'auto', textColor: [30, 41, 59], halign: 'left' },
          },
          margin: { left: 14, right: 14 },
          tableWidth: doc.internal.pageSize.width - 28,
          theme: 'plain',
          didParseCell: (data) => {
            if (data.row.index % 2 === 1) data.cell.styles.fillColor = [248, 250, 252];
          },
        });
        y = doc.lastAutoTable.finalY + 4;

        // Action history (if _actions present on row)
        const acts = row._actions || [];
        if (acts.length > 0) {
          if (y > 185) { doc.addPage(); y = 14; }
          doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240);
          doc.rect(14, y, doc.internal.pageSize.width - 28, 6, 'FD');
          doc.setTextColor(55, 65, 81); doc.setFont(undefined, 'bold'); doc.setFontSize(7.5);
          doc.text('ACTION HISTORY', 16, y + 4);
          y += 7;

          const actRows = acts.flatMap(a => {
            const r = [[
              a.action_type || '',
              `${a.performer?.full_name || 'User#' + a.performed_by} (ID: ${a.performed_by || '?'})`,
              fmtDate(a.created_at),
            ]];
            if (a.comments) r.push(['', `"${a.comments}"`, '']);
            return r;
          });

          doc.autoTable({
            body: actRows,
            startY: y,
            styles: { fontSize: 7.5, cellPadding: { top: 1.5, right: 4, bottom: 1.5, left: 4 }, overflow: 'linebreak', lineColor: [226, 232, 240], lineWidth: 0.2, valign: 'top' },
            columnStyles: {
              0: { cellWidth: 22, fontStyle: 'bold', textColor: [30, 64, 175], halign: 'left' },
              1: { cellWidth: 'auto', textColor: [30, 41, 59], halign: 'left', fontStyle: 'normal' },
              2: { cellWidth: 38, textColor: [156, 163, 175], halign: 'right', fontStyle: 'normal' },
            },
            margin: { left: 14, right: 14 },
            tableWidth: doc.internal.pageSize.width - 28,
            theme: 'plain',
          });
          y = doc.lastAutoTable.finalY + 4;
        }

        // Separator
        doc.setDrawColor(203, 213, 225);
        doc.line(14, y, doc.internal.pageSize.width - 14, y);
        y += 6;
      });

    } else {
      // Summary / Detailed — smart-fit table
      const MARGIN = 10;
      const pageW = doc.internal.pageSize.width - MARGIN * 2;
      const totalMinW = activeColumns.reduce((s, c) => s + (c.width || 16), 0);
      const scale = pageW / totalMinW;
      const colStyles = {};
      activeColumns.forEach((col, i) => {
        colStyles[i] = { cellWidth: (col.width || 16) * scale, overflow: 'linebreak', halign: 'left' };
      });
      const fontSize = Math.max(5, Math.min(7, 7 - Math.max(0, activeColumns.length - 14) * 0.2));

      doc.autoTable({
        head: [headers],
        body: dataRows,
        startY: 26,
        styles: { fontSize, cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 }, overflow: 'linebreak', lineColor: [226, 232, 240], lineWidth: 0.2, valign: 'top' },
        headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold', fontSize: Math.max(5.5, fontSize), halign: 'left', cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 }, minCellHeight: 7 },
        alternateRowStyles: { fillColor: [240, 244, 255] },
        columnStyles: colStyles,
        margin: { top: 26, left: MARGIN, right: MARGIN },
        tableWidth: pageW,
        didDrawPage: () => {
          doc.setFontSize(7); doc.setTextColor(150);
          doc.text(`Page ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 8);
        },
      });
    }

    // Page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let pg = 1; pg <= pageCount; pg++) {
      doc.setPage(pg);
      doc.setFontSize(7); doc.setTextColor(150);
      doc.text(`Page ${pg} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 5);
    }

    doc.save(`${title}.pdf`);
  };

  // ── helpers ────────────────────────────────────────────────────────────
  const trigger = (blob, filename) => {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: filename,
    });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const loadScript = (src, check) => new Promise((resolve, reject) => {
    try { if (check && check()) { resolve(); return; } } catch {}
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });

  // ══════════════════════════════════════════════════════════════════════
  //  RENDER — Export Modal
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, backdropFilter: 'blur(4px)' }}>

      {/* ── Filename modal (shown on top of export modal) ── */}
      {filenameModal && (() => {
        const userName = user?.full_name || user?.username || 'User';
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
        const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}`;
        const lockedPrefix = `UID${user?.id || 'X'}_${userName.replace(/\s+/g, '_')}_${dateStr}_${timeStr}_${exportPreset}`;
        const ext = exportFormat === 'csv' ? 'csv' : exportFormat === 'xlsx' ? 'xlsx' : 'pdf';
        const finalName = filenameSuffix.trim() ? `${lockedPrefix}_${filenameSuffix.trim()}` : lockedPrefix;

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9500, backdropFilter: 'blur(2px)' }}>
            <div style={{ background: '#1a1d27', border: '1px solid #2e3349', borderRadius: 14, width: 460, boxShadow: '0 24px 60px rgba(0,0,0,.6)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', padding: '0 14px', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={13} /> Set File Name
                </span>
                <button onClick={() => setFilenameModal(false)} style={{ background: 'linear-gradient(135deg,#ff4444,#cc0000)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 5, color: '#fff', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                  <X size={11} />
                </button>
              </div>

              <div style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Locked prefix */}
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.6px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    🔒 Locked Prefix <span style={{ fontSize: 8, color: '#4b5563', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(cannot be changed)</span>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                      { label: 'User ID',   val: `UID${user?.id || 'X'}` },
                      { label: 'Username',  val: userName },
                      { label: 'Date/Time', val: `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6)} ${timeStr.slice(0,2)}:${timeStr.slice(2)}` },
                      { label: 'Preset',    val: exportPreset },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f1117', border: '1px solid #2e3349', borderRadius: 7, padding: '5px 10px' }}>
                        <span style={{ fontSize: 9, color: '#6b7280', fontWeight: 600, minWidth: 60 }}>{item.label}</span>
                        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', fontWeight: 700 }}>{item.val}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 8, color: '#374151', background: '#1a1d27', border: '1px solid #2e3349', borderRadius: 10, padding: '1px 6px' }}>🔒 locked</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Editable suffix */}
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.6px', margin: '0 0 6px' }}>
                    ✏️ Your Custom Suffix <span style={{ fontSize: 8, color: '#4b5563', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                  </p>
                  <input
                    value={filenameSuffix}
                    onChange={e => setFilenameSuffix(e.target.value.replace(/[/\\:*?"<>|]/g, ''))}
                    placeholder="e.g. Q1_review, march_batch…"
                    style={{ width: '100%', boxSizing: 'border-box', background: '#21253a', border: '1.5px solid #2e3349', borderRadius: 8, padding: '8px 11px', fontSize: 11, color: '#e2e8f0', fontFamily: 'inherit', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = '#4f8ef7'; }}
                    onBlur={e => { e.target.style.borderColor = '#2e3349'; }}
                  />
                </div>

                {/* Preview */}
                <div style={{ background: '#0f1117', border: '1px solid #2e3349', borderRadius: 7, padding: '8px 11px' }}>
                  <p style={{ fontSize: 8, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 4px' }}>📄 Final Filename Preview</p>
                  <p style={{ fontSize: 10, color: '#60a5fa', fontFamily: 'monospace', margin: 0, wordBreak: 'break-all' }}>
                    {finalName}<span style={{ color: '#4b5563' }}>.{ext}</span>
                  </p>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setFilenameModal(false)}
                    style={{ background: '#21253a', border: '1px solid #2e3349', color: '#94a3b8', borderRadius: 7, padding: '7px 16px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button
                    onClick={() => { setFilenameModal(false); handleExport(finalName); }}
                    disabled={exporting}
                    style={{ background: 'linear-gradient(to right, #1e40af, #3b82f6)', border: 'none', color: '#fff', borderRadius: 7, padding: '7px 20px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Download size={12} /> {exporting ? 'Exporting…' : 'Download'}
                  </button>
                </div>
              </div>
              <div style={{ height: 4, background: 'linear-gradient(to right, #60a5fa, #374151)' }} />
            </div>
          </div>
        );
      })()}

      {/* ── Main Export Modal ── */}
      <div style={{ background: '#1a1d27', border: '1px solid #2e3349', borderRadius: 14, width: 440, boxShadow: '0 24px 60px rgba(0,0,0,.5)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', padding: '0 14px', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={13} /> Export — {reportTitle}
          </span>
          <button onClick={onClose} style={{ background: 'linear-gradient(135deg,#ff4444,#cc0000)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 5, color: '#fff', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            <X size={11} />
          </button>
        </div>

        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Format */}
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.6px', margin: '0 0 8px' }}>Format</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'xlsx',       label: '📊 Excel (.xlsx)',  desc: 'Spreadsheet with formatting' },
                { key: 'csv',        label: '📄 CSV (.csv)',      desc: 'Plain text, any tool' },
                { key: 'pdf_direct', label: '📕 PDF (Direct)',    desc: 'Saves .pdf directly' },
                { key: 'pdf',        label: '🖨️ PDF (Print)',     desc: 'Open & print/save as PDF' },
              ].map(f => (
                <button key={f.key} onClick={() => setExportFormat(f.key)}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${exportFormat === f.key ? '#4f8ef7' : '#2e3349'}`, background: exportFormat === f.key ? '#1e2d4a' : '#21253a', cursor: 'pointer', textAlign: 'center', transition: 'all .12s' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: exportFormat === f.key ? '#60a5fa' : '#94a3b8' }}>{f.label}</div>
                  <div style={{ fontSize: 7.5, color: '#4b5563', marginTop: 2 }}>{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Preset */}
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.6px', margin: '0 0 8px' }}>Report Preset</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { key: 'summary',  label: '📋 Summary',  desc: 'Key fields only — quick overview' },
                { key: 'detailed', label: '📑 Detailed', desc: 'All main fields + IDs + history' },
                { key: 'full',     label: '📂 Full',     desc: 'Every field, images, full audit trail' },
              ].map(p => {
                const colCount = columns.filter(c => !c.preset || c.preset.includes(p.key)).length;
                return (
                  <button key={p.key} onClick={() => setExportPreset(p.key)}
                    style={{ padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${exportPreset === p.key ? '#4f8ef7' : '#2e3349'}`, background: exportPreset === p.key ? '#1e2d4a' : '#21253a', cursor: 'pointer', textAlign: 'left', transition: 'all .12s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: exportPreset === p.key ? '#60a5fa' : '#e2e8f0' }}>{p.label}</span>
                      <span style={{ fontSize: 8, color: exportPreset === p.key ? '#4f8ef7' : '#4b5563', fontFamily: 'monospace' }}>{colCount} cols</span>
                    </div>
                    <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info row */}
          <div style={{ background: '#0f1117', border: '1px solid #2e3349', borderRadius: 7, padding: '7px 10px', fontSize: 9, color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
            <span>Records to export: <strong style={{ color: '#e2e8f0' }}>{rows.length}</strong></span>
            <span>Filters: <strong style={{ color: filterSummary !== 'None' ? '#f59e0b' : '#4b5563' }}>{filterSummary !== 'None' ? 'Active' : 'None'}</strong></span>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose}
              style={{ background: '#21253a', border: '1px solid #2e3349', color: '#94a3b8', borderRadius: 7, padding: '7px 16px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={() => { setFilenameSuffix(''); setFilenameModal(true); }}
              style={{ background: 'linear-gradient(to right, #1e40af, #3b82f6)', border: 'none', color: '#fff', borderRadius: 7, padding: '7px 20px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={12} /> Export Now
            </button>
          </div>
        </div>

        <div style={{ height: 4, background: 'linear-gradient(to right, #60a5fa, #374151)' }} />
      </div>
    </div>
  );
};

export default UniversalExport;