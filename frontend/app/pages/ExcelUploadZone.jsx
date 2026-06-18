/**
 * ExcelUploadZone.jsx
 * Handles drag-and-drop / click-to-browse file upload UI.
 * Props: dragging, loading, fileExt, onDrop, onDragOver, onDragLeave, onFileSelect, fileRef, SERVER_EXTS, COLORS, Icon, ICONS
 */

const ExcelUploadZone = ({ dragging, loading, fileExt, onDrop, onDragOver, onDragLeave, onFileSelect, fileRef, SERVER_EXTS, COLORS, Icon, ICONS }) => {
  return (
    <div
      className={`drop-zone animate-in ${dragging ? "dragging" : ""}`}
      style={{ padding: "60px 40px", textAlign: "center", animationDelay: "0.1s" }}
      onClick={() => fileRef.current.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv,.tsv"
        style={{ display: "none" }}
        onChange={e => onFileSelect(e.target.files[0])}
      />

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div className="spinner" style={{ width: 38, height: 38 }} />
          <span style={{ color: COLORS.textMuted, fontSize: 14 }}>
            {fileExt && SERVER_EXTS.includes(fileExt) ? "Uploading to server..." : "Parsing file..."}
          </span>
        </div>
      ) : (
        <>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: COLORS.accentSoft, border: `2px solid ${COLORS.accent}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            animation: dragging ? "pulseRing 1s ease-out infinite" : "none"
          }}>
            <Icon d={ICONS.upload} size={30} color={COLORS.accent} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>
            {dragging ? "Drop it here! 🎯" : "Drag & drop a file or click to browse"}
          </h2>
          <p style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 22 }}>
            Excel (.xlsx, .xls) and CSV / TSV files are supported
          </p>
          <button className="btn btn-primary" style={{ fontSize: 14, padding: "11px 28px" }}>
            <Icon d={ICONS.upload} size={16} color="#fff" /> Choose File
          </button>
          <p style={{ color: COLORS.textFaint, fontSize: 11, marginTop: 16 }}>
            XLSX/XLS → server processing &nbsp;·&nbsp; CSV/TSV → browser processing (encoding-safe)
          </p>
        </>
      )}
    </div>
  );
};

export default ExcelUploadZone;