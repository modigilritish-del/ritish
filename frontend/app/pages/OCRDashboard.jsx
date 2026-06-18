import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertCircle, FileImage, X, Hash, Copy, Download, Save, Search, Trash2, Plus } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/ocr';

// Words Note Component
function WordsNote({ sourceText, onClose }) {
  const [wordNumbers, setWordNumbers] = useState('');
  const [extractedWords, setExtractedWords] = useState([]);
  const [notepad, setNotepad] = useState('');

  const extractWords = () => {
    if (!sourceText.trim() || !wordNumbers.trim()) return alert('⚠️ Please enter word numbers!');
    const words = sourceText.split(/\s+/).filter(w => w.trim());
    const numbers = wordNumbers.split(/[\s,]+/).filter(n => n.trim());
    const selectedWords = [];

    numbers.forEach(num => {
      if (num.includes('-')) {
        const [start, end] = num.split('-').map(n => parseInt(n.trim()));
        for (let i = start; i <= end; i++) {
          if (i > 0 && i <= words.length) selectedWords.push(words[i - 1]);
        }
      } else {
        const index = parseInt(num);
        if (index > 0 && index <= words.length) selectedWords.push(words[index - 1]);
      }
    });
    setExtractedWords(selectedWords);
  };

  const addToNotepad = () => {
    if (extractedWords.length === 0) return alert('⚠️ No words extracted yet!');
    const newText = extractedWords.join(' ');
    setNotepad(prev => prev ? `${prev}\n${newText}` : newText);
  };

  const copyNotepad = () => {
    if (!notepad.trim()) return alert('⚠️ Notepad is empty!');
    navigator.clipboard.writeText(notepad);
    alert('✅ Copied to clipboard!');
  };

  const downloadNotepad = () => {
    if (!notepad.trim()) return alert('⚠️ Notepad is empty!');
    const blob = new Blob([notepad], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-words.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearNotepad = () => {
    if (window.confirm('🗑️ Clear notepad?')) setNotepad('');
  };

  const numberedWords = sourceText.trim() ? sourceText.split(/\s+/).filter(w => w.trim()).map((word, i) => ({ number: i + 1, word })) : [];

  const inputStyle = {
    width: "100%",
    padding: "5px 8px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "11px",
    boxSizing: "border-box",
    color: "#333",
    backgroundColor: "#fff",
  };

  const labelStyle = {
    display: "block",
    fontSize: "10px",
    fontWeight: "500",
    marginBottom: "3px",
    color: "#555",
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backgroundColor: "#f5f5f5" }}>
      <div style={{ width: "95%", maxWidth: "1100px", height: "85%", maxHeight: "600px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #667eea, #764ba2)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Hash size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>Words Note Extractor</h2>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <div style={{ marginBottom: "12px" }}>
                <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px", color: "#333", borderBottom: "2px solid #667eea", paddingBottom: "4px" }}>Extract Words</h3>
                <div>
                  <label style={labelStyle}>Enter Word Numbers</label>
                  <input type="text" value={wordNumbers} onChange={(e) => setWordNumbers(e.target.value)} placeholder="e.g., 1, 3-5, 10, 15-20" style={{...inputStyle, fontFamily: 'monospace', marginBottom: '8px'}} />
                  <div style={{ padding: '6px 8px', background: '#fef3c7', borderRadius: '4px', fontSize: '9px', color: '#92400e', marginBottom: '8px' }}>
                    <strong>💡 Examples:</strong> Single: <code>1, 5, 10</code> • Range: <code>1-5, 10-15</code> • Mixed: <code>1, 3-5, 8</code>
                  </div>
                  <button onClick={extractWords} style={{ width: '100%', padding: '5px', background: 'linear-gradient(to right, #10b981, #059669)', border: 'none', borderRadius: '4px', color: 'white', fontSize: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Search size={12} />Extract Words
                  </button>
                </div>
              </div>

              {extractedWords.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px", color: "#333", borderBottom: "2px solid #10b981", paddingBottom: "4px" }}>Extracted Words ({extractedWords.length})</h3>
                  <div style={{ padding: '8px', background: '#f9fafb', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '10px', lineHeight: '1.6', maxHeight: '100px', overflow: 'auto', marginBottom: '8px' }}>
                    {extractedWords.join(' ')}
                  </div>
                  <button onClick={addToNotepad} style={{ width: '100%', padding: '5px', background: 'linear-gradient(to right, #3b82f6, #2563eb)', border: 'none', borderRadius: '4px', color: 'white', fontSize: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Plus size={12} />Add to Notepad
                  </button>
                </div>
              )}
            </div>

            <div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: "11px", fontWeight: "600", margin: 0, color: "#333", borderBottom: "2px solid #60a5fa", paddingBottom: "4px" }}>Notepad</h3>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={copyNotepad} style={{ padding: '3px 6px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '3px', fontSize: '9px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', color: '#374151' }}>
                      <Copy size={10} />Copy
                    </button>
                    <button onClick={downloadNotepad} style={{ padding: '3px 6px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '3px', fontSize: '9px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', color: '#374151' }}>
                      <Download size={10} />Save
                    </button>
                    <button onClick={clearNotepad} style={{ padding: '3px 6px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '3px', fontSize: '9px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', color: '#991b1b' }}>
                      <Trash2 size={10} />Clear
                    </button>
                  </div>
                </div>
                <textarea value={notepad} onChange={(e) => setNotepad(e.target.value)} placeholder="Extracted words will appear here..." style={{ width: '100%', height: '120px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '10px', lineHeight: '1.6', resize: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px", color: "#333", borderBottom: "2px solid #60a5fa", paddingBottom: "4px" }}>Word Reference</h3>
                <div style={{ background: '#1e293b', padding: '10px', borderRadius: '4px', maxHeight: '200px', overflow: 'auto', fontSize: '10px', lineHeight: '2', color: '#e2e8f0', fontFamily: 'monospace' }}>
                  {numberedWords.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {numberedWords.map(({ number, word }) => (
                        <div key={number} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '2px 5px', background: '#334155', borderRadius: '3px', border: '1px solid #475569' }}>
                          <span style={{ fontSize: '8px', fontWeight: '700', color: '#60a5fa', minWidth: '18px', textAlign: 'center', background: '#1e3a8a', padding: '1px 3px', borderRadius: '2px' }}>{number}</span>
                          <span style={{ color: '#f1f5f9', fontSize: '9px' }}>{word}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No source text available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "0px 12px", height: "32px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #667eea, #764ba2)", flexShrink: 0, alignItems: "center" }}>
          <button onClick={onClose} style={{ padding: "4px 14px", background: "rgba(255, 255, 255, 0.2)", border: "1px solid rgba(255, 255, 255, 0.3)", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}>
            <X size={12} />Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function BOLOCRDashboard() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('formatted');
  const [error, setError] = useState(null);
  const [autoProcess, setAutoProcess] = useState(true);
  const [showNumbers, setShowNumbers] = useState(true);
  const [showWordsNote, setShowWordsNote] = useState(false);
  const [wordsNoteText, setWordsNoteText] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setResults(null);
    setError(null);
    
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type === 'application/pdf' || ext === 'pdf') setPreview('pdf');
    else if (['xlsx', 'xls', 'xlsm'].includes(ext)) setPreview('excel');
    else if (ext === 'csv') setPreview('csv');
    else setPreview('unknown');
    
    if (autoProcess) setTimeout(() => processFile(selectedFile), 500);
  };

  const processFile = async (fileToProcess) => {
    const targetFile = fileToProcess || file;
    if (!targetFile) return;
    
    setProcessing(true);
    setResults(null);
    setError(null);
    setProgress('Uploading document...');
    
    try {
      const formData = new FormData();
      formData.append('file', targetFile);
      
      const uploadResponse = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
      if (!uploadResponse.ok) throw new Error((await uploadResponse.json()).detail || 'Upload failed');
      
      const uploadData = await uploadResponse.json();
      setProgress('Running OCR engines...');
      
      const processResponse = await fetch(`${API_BASE}/process/${uploadData.id}?extract_bol=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'accurate', language: ['en'], preprocessing: true, spell_check: false })
      });
      
      if (!processResponse.ok) throw new Error((await processResponse.json()).detail || 'Processing failed');
      
      const processData = await processResponse.json();
      setProgress('Complete!');
      setResults(processData);
    } catch (error) {
      setError(`Processing failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const addWordNumbers = (text) => {
    if (!text || !showNumbers) return text;
    const lines = text.split('\n');
    let wordCounter = 1;
    const numberedLines = lines.map(line => {
      if (!line.trim()) return line;
      const words = line.split(/(\s+)/);
      const numberedWords = words.map(segment => {
        if (segment.trim()) {
          const numbered = `[${wordCounter}]${segment}`;
          wordCounter++;
          return numbered;
        }
        return segment;
      });
      return numberedWords.join('');
    });
    return numberedLines.join('\n');
  };

  const getCurrentContent = () => {
    if (activeTab === 'formatted') return results.bol_formatted || '';
    if (activeTab === 'structured') return JSON.stringify(results.bol_data, null, 2);
    if (activeTab === 'cleaned') return results.best_result.extracted_text;
    return results.best_result.extracted_text;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('✅ Copied to clipboard!');
  };

  const downloadText = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResults(null);
    setError(null);
    setProgress('');
    setProcessing(false);
  };

  if (showWordsNote) return <WordsNote sourceText={wordsNoteText} onClose={() => setShowWordsNote(false)} />;

  const tabs = [
    { id: 'formatted', label: 'Formatted BOL', icon: FileText },
    { id: 'structured', label: 'Structured Data', icon: FileText },
    { id: 'cleaned', label: 'Cleaned Text', icon: FileText },
    { id: 'raw', label: 'Raw Output', icon: FileImage }
  ];

  const currentContent = results ? getCurrentContent() : '';
  const displayContent = (activeTab === 'formatted' || activeTab === 'cleaned' || activeTab === 'raw') ? addWordNumbers(currentContent) : currentContent;

  const inputStyle = {
    width: "100%",
    padding: "5px 8px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "11px",
    boxSizing: "border-box",
    color: "#333",
    backgroundColor: "#fff",
  };

  const labelStyle = {
    display: "block",
    fontSize: "10px",
    fontWeight: "500",
    marginBottom: "3px",
    color: "#555",
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backgroundColor: "#f5f5f5" }}>
      <div style={{ width: "95%", maxWidth: "1100px", height: "85%", maxHeight: "600px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #4b5563, #60a5fa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>OCR AI Extractor</h2>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: '500' }}>
            <input type="checkbox" checked={autoProcess} onChange={(e) => setAutoProcess(e.target.checked)} style={{ width: '14px', height: '14px' }} />
            Auto-Process
          </label>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {error && (
            <div style={{ padding: "10px 12px", background: "#fee", color: "#c00", borderRadius: "4px", marginBottom: "10px", fontSize: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>⚠️</span>
              <div><div style={{ fontWeight: "600", marginBottom: "2px" }}>Error</div><div>{error}</div></div>
            </div>
          )}

          <div style={{ marginBottom: "12px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px", color: "#333", borderBottom: "2px solid #60a5fa", paddingBottom: "4px" }}>Upload Document</h3>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "10px" }}>
              <div>
                <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }} onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files[0]); }} onClick={() => fileInputRef.current?.click()} style={{ borderWidth: isDragging ? '2px' : '1px', borderStyle: 'dashed', borderColor: isDragging ? '#60a5fa' : '#ddd', borderRadius: '4px', padding: '12px', textAlign: 'center', cursor: 'pointer', background: isDragging ? '#f0f9ff' : 'white', height: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={24} style={{ marginBottom: '6px', color: isDragging ? '#60a5fa' : '#94a3b8' }} />
                  <p style={{ fontSize: '10px', fontWeight: '600', color: '#333', margin: 0 }}>{isDragging ? 'Drop File' : 'Upload File'}</p>
                  <p style={{ fontSize: '8px', color: '#64748b', margin: '3px 0' }}>Image, PDF, Excel, CSV</p>
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf,.xlsx,.xls,.csv" onChange={(e) => handleFileSelect(e.target.files[0])} style={{ display: 'none' }} />
                </div>

                {file && (
                  <div style={{ background: 'white', borderRadius: '4px', padding: '6px', border: '1px solid #e0e0e0', marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <FileImage size={12} style={{ color: '#60a5fa' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '9px', fontWeight: '600', color: '#333', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                        <p style={{ fontSize: '8px', color: '#64748b', margin: '2px 0 0 0' }}>{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    {!autoProcess && !processing && !results && (
                      <button onClick={() => processFile()} style={{ width: '100%', padding: '4px', background: 'linear-gradient(to right, #10b981, #059669)', border: 'none', borderRadius: '4px', color: 'white', fontSize: '9px', fontWeight: '600', cursor: 'pointer' }}>
                        Process Now
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div style={{ height: '110px', background: 'white', borderRadius: '4px', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {preview === 'pdf' && <div style={{ textAlign: 'center', color: '#64748b' }}><FileText size={32} style={{ margin: '0 auto 6px', opacity: 0.5 }} /><p style={{ fontSize: '9px', fontWeight: '600', margin: 0 }}>PDF Document</p></div>}
                {preview === 'excel' && <div style={{ textAlign: 'center', color: '#64748b' }}><FileImage size={32} style={{ margin: '0 auto 6px', opacity: 0.5 }} /><p style={{ fontSize: '9px', fontWeight: '600', margin: 0 }}>Excel File</p></div>}
                {preview === 'csv' && <div style={{ textAlign: 'center', color: '#64748b' }}><FileImage size={32} style={{ margin: '0 auto 6px', opacity: 0.5 }} /><p style={{ fontSize: '9px', fontWeight: '600', margin: 0 }}>CSV File</p></div>}
                {preview && !['pdf', 'excel', 'csv', 'unknown'].includes(preview) && <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
                {!preview && <div style={{ textAlign: 'center', color: '#94a3b8' }}><FileImage size={32} style={{ margin: '0 auto 6px', opacity: 0.3 }} /><p style={{ fontSize: '9px', margin: 0 }}>No Preview</p></div>}
              </div>
            </div>
          </div>

          {processing && (
            <div style={{ background: '#f0f9ff', padding: '10px', textAlign: 'center', borderRadius: '4px', marginBottom: '12px', border: '1px solid #bfdbfe' }}>
              <Loader2 size={24} style={{ margin: '0 auto 6px', color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '10px', fontWeight: '600', color: '#333', margin: '0 0 3px 0' }}>Processing...</p>
              <p style={{ fontSize: '9px', color: '#64748b', margin: 0 }}>{progress}</p>
            </div>
          )}

          {results && !processing && (
            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px", color: "#333", borderBottom: "2px solid #10b981", paddingBottom: "4px" }}>Results</h3>
              
              <div style={{ background: '#f0fdf4', padding: '6px 8px', borderRadius: '4px', marginBottom: '8px', border: '1px solid #86efac', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '9px', color: '#166534', fontWeight: '500' }}>
                  {results.best_result.engine_name.toUpperCase()} • {results.total_processing_time.toFixed(2)}s{results.cached && ' • 🚀 Cached'}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ textAlign: 'center', background: 'white', borderRadius: '3px', padding: '3px 8px', border: '1px solid #86efac' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>{results.best_result.confidence_score.toFixed(1)}%</div>
                    <div style={{ fontSize: '7px', fontWeight: '600', color: '#166534' }}>OCR</div>
                  </div>
                  {results.bol_data && (
                    <div style={{ textAlign: 'center', background: 'white', borderRadius: '3px', padding: '3px 8px', border: '1px solid #86efac' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>{results.bol_data.extraction_confidence.toFixed(1)}%</div>
                      <div style={{ fontSize: '7px', fontWeight: '600', color: '#166534' }}>BOL</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '4px 10px', background: activeTab === tab.id ? 'white' : 'transparent', border: '1px solid', borderColor: activeTab === tab.id ? '#60a5fa' : '#e0e0e0', borderRadius: '4px', cursor: 'pointer', fontSize: '9px', fontWeight: '600', color: activeTab === tab.id ? '#60a5fa' : '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Icon size={11} />{tab.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {(activeTab === 'formatted' || activeTab === 'cleaned' || activeTab === 'raw') && (
                  <>
                    <button onClick={() => setShowNumbers(!showNumbers)} style={{ padding: '4px 10px', background: showNumbers ? '#dbeafe' : 'white', border: '1px solid #60a5fa', borderRadius: '4px', color: '#60a5fa', fontSize: '9px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Hash size={11} />{showNumbers ? 'Hide Numbers' : 'Show Numbers'}
                    </button>
                    <button onClick={() => { setWordsNoteText(currentContent); setShowWordsNote(true); }} style={{ padding: '4px 10px', background: 'linear-gradient(to right, #667eea, #764ba2)', border: 'none', borderRadius: '4px', color: 'white', fontSize: '9px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Hash size={11} />Words Note
                    </button>
                  </>
                )}
                <button onClick={() => copyToClipboard(currentContent)} style={{ padding: '4px 10px', background: 'white', border: '1px solid #60a5fa', borderRadius: '4px', color: '#60a5fa', fontSize: '9px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Copy size={11} />Copy
                </button>
                <button onClick={() => { let filename = activeTab === 'formatted' ? 'bol_formatted.txt' : activeTab === 'structured' ? 'bol_structured.json' : activeTab === 'cleaned' ? 'bol_cleaned.txt' : 'bol_raw.txt'; downloadText(currentContent, filename); }} style={{ padding: '4px 10px', background: 'linear-gradient(to right, #60a5fa, #3b82f6)', border: 'none', borderRadius: '4px', color: 'white', fontSize: '9px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Download size={11} />Download
                </button>
              </div>

              <div style={{ background: '#1e293b', borderRadius: '4px', padding: '10px', minHeight: '150px', maxHeight: '220px', overflow: 'auto' }}>
                <pre style={{ color: '#e2e8f0', fontSize: '10px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{displayContent}</pre>
              </div>

              {showNumbers && (activeTab === 'formatted' || activeTab === 'cleaned' || activeTab === 'raw') && currentContent && (
                <div style={{ marginTop: '6px', padding: '4px 8px', background: '#f0f9ff', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                  <p style={{ fontSize: '9px', color: '#1e40af', margin: 0, fontWeight: '600' }}>📊 Total Words: {currentContent.split(/\s+/).filter(w => w.trim()).length}</p>
                </div>
              )}
            </div>
          )}

          {!file && !processing && !results && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', textAlign: 'center', color: '#94a3b8', minHeight: '200px' }}>
              <FileText size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#333', margin: '0 0 4px 0' }}>Ready to Process</h3>
              <p style={{ fontSize: '9px', margin: '0 0 12px 0', maxWidth: '300px', color: '#64748b' }}>Upload a document to extract structured shipping information with high accuracy.</p>
              <div style={{ display: 'flex', gap: '8px', fontSize: '8px', fontWeight: '500' }}>
                <span>✅ Multi-Engine OCR</span>
                <span>✅ BOL Structure</span>
                <span>✅ Error Correction</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "0px 12px", height: "32px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #60a5fa, #4b5563)", flexShrink: 0, alignItems: "center" }}>
          <button onClick={handleReset} disabled={processing} style={{ padding: "4px 14px", background: processing ? "#ccc" : "rgba(255, 255, 255, 0.2)", border: "1px solid rgba(255, 255, 255, 0.3)", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: processing ? "not-allowed" : "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}>
            <X size={12} />Reset
          </button>
        </div>
        
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}