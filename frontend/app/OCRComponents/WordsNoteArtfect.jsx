import React, { useState } from 'react';
import { Hash, Copy, Trash2, Download, Plus, Search, CheckCircle } from 'lucide-react';

export default function WordsNoteArtifact() {
  const [sourceText, setSourceText] = useState('');
  const [wordNumbers, setWordNumbers] = useState('');
  const [extractedWords, setExtractedWords] = useState([]);
  const [notepad, setNotepad] = useState('');

  // Sample text ke liye
  const loadSampleText = () => {
    const sample = `BILL OF LADING
Shipper: ABC Corporation
Consignee: XYZ Industries
Origin: Mumbai Port
Destination: New York Harbor
Container: ABCD1234567
Weight: 15000 KG
Date: 2024-12-22`;
    setSourceText(sample);
  };

  // Extract words based on numbers
  const extractWords = () => {
    if (!sourceText.trim() || !wordNumbers.trim()) {
      alert('⚠️ Please enter both source text and word numbers!');
      return;
    }

    // Split text into words
    const words = sourceText.split(/\s+/).filter(w => w.trim());
    
    // Parse word numbers (support: 1, 2-5, 10,11,12)
    const numbers = wordNumbers.split(/[\s,]+/).filter(n => n.trim());
    const selectedWords = [];

    numbers.forEach(num => {
      if (num.includes('-')) {
        // Range: 2-5
        const [start, end] = num.split('-').map(n => parseInt(n.trim()));
        for (let i = start; i <= end; i++) {
          if (i > 0 && i <= words.length) {
            selectedWords.push(words[i - 1]);
          }
        }
      } else {
        // Single number
        const index = parseInt(num);
        if (index > 0 && index <= words.length) {
          selectedWords.push(words[index - 1]);
        }
      }
    });

    setExtractedWords(selectedWords);
  };

  // Add extracted words to notepad
  const addToNotepad = () => {
    if (extractedWords.length === 0) {
      alert('⚠️ No words extracted yet!');
      return;
    }

    const newText = extractedWords.join(' ');
    setNotepad(prev => prev ? `${prev}\n${newText}` : newText);
  };

  // Copy notepad content
  const copyNotepad = () => {
    if (!notepad.trim()) {
      alert('⚠️ Notepad is empty!');
      return;
    }
    navigator.clipboard.writeText(notepad);
    alert('✅ Copied to clipboard!');
  };

  // Download notepad
  const downloadNotepad = () => {
    if (!notepad.trim()) {
      alert('⚠️ Notepad is empty!');
      return;
    }
    const blob = new Blob([notepad], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-words.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear notepad
  const clearNotepad = () => {
    if (window.confirm('🗑️ Clear notepad?')) {
      setNotepad('');
    }
  };

  // Get numbered text for display
  const getNumberedText = () => {
    if (!sourceText.trim()) return '';
    
    const words = sourceText.split(/\s+/).filter(w => w.trim());
    return words.map((word, index) => ({
      number: index + 1,
      word: word
    }));
  };

  const numberedWords = getNumberedText();

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Back Button */}
      <button
        onClick={() => window.history.back()}
        style={{
          padding: '10px 20px',
          background: '#f3f4f6',
          border: '2px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#374151',
          marginBottom: '16px',
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#e5e7eb';
          e.currentTarget.style.borderColor = '#9ca3af';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = '#f3f4f6';
          e.currentTarget.style.borderColor = '#d1d5db';
        }}
      >
        ← Back
      </button>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        borderRadius: '12px',
        color: 'white',
        marginBottom: '20px',
        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Hash size={28} />
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
              Words Note Artifact
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
              Extract specific words by their numbers and collect them in notepad
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Left Panel - Source & Extraction */}
        <div>
          {/* Source Text */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                📄 Source Text
              </h3>
              <button
                onClick={loadSampleText}
                style={{
                  padding: '6px 12px',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: '#374151'
                }}
              >
                Load Sample
              </button>
            </div>
            
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste your text here..."
              style={{
                width: '100%',
                height: '150px',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                resize: 'vertical',
                outline: 'none'
              }}
            />
            
            {sourceText && (
              <div style={{
                marginTop: '8px',
                padding: '8px',
                background: '#f0f9ff',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#0369a1',
                fontWeight: '600'
              }}>
                📊 Total Words: {sourceText.split(/\s+/).filter(w => w.trim()).length}
              </div>
            )}
          </div>

          {/* Word Numbers Input */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
              🔢 Enter Word Numbers
            </h3>
            
            <input
              type="text"
              value={wordNumbers}
              onChange={(e) => setWordNumbers(e.target.value)}
              placeholder="e.g., 1, 3-5, 10, 15-20"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                outline: 'none',
                marginBottom: '12px'
              }}
            />
            
            <div style={{
              padding: '10px',
              background: '#fef3c7',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#92400e',
              marginBottom: '12px'
            }}>
              <strong>💡 Examples:</strong><br/>
              • Single: <code>1, 5, 10</code><br/>
              • Range: <code>1-5, 10-15</code><br/>
              • Mixed: <code>1, 3-5, 8, 10-12</code>
            </div>

            <button
              onClick={extractWords}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Search size={18} />
              Extract Words
            </button>
          </div>

          {/* Extracted Words Preview */}
          {extractedWords.length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                ✅ Extracted Words ({extractedWords.length})
              </h3>
              
              <div style={{
                padding: '12px',
                background: '#f9fafb',
                borderRadius: '6px',
                border: '2px dashed #d1d5db',
                fontSize: '14px',
                lineHeight: '1.6',
                maxHeight: '120px',
                overflow: 'auto',
                marginBottom: '12px'
              }}>
                {extractedWords.join(' ')}
              </div>

              <button
                onClick={addToNotepad}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Plus size={18} />
                Add to Notepad
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Notepad & Reference */}
        <div>
          {/* Notepad */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                📝 Notepad
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={copyNotepad}
                  style={{
                    padding: '6px 12px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#374151'
                  }}
                >
                  <Copy size={14} />
                  Copy
                </button>
                <button
                  onClick={downloadNotepad}
                  style={{
                    padding: '6px 12px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#374151'
                  }}
                >
                  <Download size={14} />
                  Save
                </button>
                <button
                  onClick={clearNotepad}
                  style={{
                    padding: '6px 12px',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#991b1b'
                  }}
                >
                  <Trash2 size={14} />
                  Clear
                </button>
              </div>
            </div>
            
            <textarea
              value={notepad}
              onChange={(e) => setNotepad(e.target.value)}
              placeholder="Extracted words will appear here... You can edit them."
              style={{
                width: '100%',
                height: '200px',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                lineHeight: '1.6',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'monospace'
              }}
            />
          </div>

          {/* Word Reference with Numbers */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
              🔍 Word Reference (with Numbers)
            </h3>
            
            <div style={{
              background: '#1e293b',
              padding: '16px',
              borderRadius: '6px',
              maxHeight: '300px',
              overflow: 'auto',
              fontSize: '13px',
              lineHeight: '2',
              color: '#e2e8f0',
              fontFamily: 'monospace'
            }}>
              {numberedWords.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {numberedWords.map(({ number, word }) => (
                    <div
                      key={number}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        background: '#334155',
                        borderRadius: '4px',
                        border: '1px solid #475569'
                      }}
                    >
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        color: '#60a5fa',
                        minWidth: '28px',
                        textAlign: 'center',
                        background: '#1e3a8a',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        userSelect: 'none',
                        pointerEvents: 'none'
                      }}>
                        {number}
                      </span>
                      <span style={{ color: '#f1f5f9' }}>
                        {word}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No text to display. Enter source text above.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        borderRadius: '8px',
        border: '2px solid #bae6fd'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#075985' }}>
          📖 How to Use:
        </h4>
        <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#0c4a6e', lineHeight: '1.8' }}>
          <li>Paste or type your text in the <strong>Source Text</strong> area</li>
          <li>Check the <strong>Word Reference</strong> to see word numbers</li>
          <li>Enter word numbers you want (e.g., <code>1, 3-5, 10</code>) in <strong>Word Numbers</strong></li>
          <li>Click <strong>Extract Words</strong> to fetch them</li>
          <li>Review extracted words and click <strong>Add to Notepad</strong></li>
          <li>Edit, copy, or download your collected words from <strong>Notepad</strong></li>
        </ol>
      </div>
    </div>
  );
}