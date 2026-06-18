//app/OCRComponents/OCRArtifact.jsx
'use client';
import React, { useState } from 'react';
import { FileText, CheckCircle2, Zap, FileImage, AlertCircle, Copy, Download, Hash } from 'lucide-react';

export default function OCRArtifact({ results, activeTab, setActiveTab, copyToClipboard, downloadText }) {
  const [showNumbers, setShowNumbers] = useState(true);

  const tabs = [
    { id: 'formatted', label: 'Formatted BOL', icon: FileText },
    { id: 'structured', label: 'Structured Data', icon: CheckCircle2 },
    { id: 'cleaned', label: 'Cleaned Text', icon: Zap },
    { id: 'raw', label: 'Raw Output', icon: FileImage }
  ];

  // Function to add word numbers to text
  const addWordNumbers = (text) => {
    if (!text || !showNumbers) return text;
    
    const lines = text.split('\n');
    let wordCounter = 1;
    
    const numberedLines = lines.map(line => {
      if (!line.trim()) return line; // Keep empty lines as is
      
      const words = line.split(/(\s+)/); // Split by spaces but keep spaces
      const numberedWords = words.map(segment => {
        if (segment.trim()) {
          const numbered = `[${wordCounter}]${segment}`;
          wordCounter++;
          return numbered;
        }
        return segment; // Keep spaces as is
      });
      
      return numberedWords.join('');
    });
    
    return numberedLines.join('\n');
  };

  // Get the current content based on active tab
  const getCurrentContent = () => {
    if (activeTab === 'formatted') return results.bol_formatted || '';
    if (activeTab === 'structured') return JSON.stringify(results.bol_data, null, 2);
    if (activeTab === 'cleaned') return results.best_result.extracted_text;
    return results.best_result.extracted_text;
  };

  const currentContent = getCurrentContent();
  const displayContent = (activeTab === 'formatted' || activeTab === 'cleaned' || activeTab === 'raw') 
    ? addWordNumbers(currentContent) 
    : currentContent;

  return (
    <div style={{ marginBottom: "12px" }}>
      <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px", color: "#333", borderBottom: "2px solid #10b981", paddingBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
        <CheckCircle2 size={14} style={{ color: "#10b981" }} />
        Extraction Results
      </h3>
      
      <div style={{ background: "#f0fdf4", padding: "8px 10px", borderRadius: "4px", marginBottom: "10px", border: "1px solid #86efac", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "9px", color: "#166534", fontWeight: "500" }}>
          Engine: {results.best_result.engine_name.toUpperCase()} • 
          Time: {results.total_processing_time.toFixed(2)}s
          {results.cached && ' • 🚀 Cached'}
        </div>
        
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ textAlign: "center", background: "white", borderRadius: "4px", padding: "4px 10px", border: "1px solid #86efac" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#166534" }}>
              {results.best_result.confidence_score.toFixed(1)}%
            </div>
            <div style={{ fontSize: "8px", fontWeight: "600", color: "#166534" }}>OCR Score</div>
          </div>
          
          {results.bol_data && (
            <div style={{ textAlign: "center", background: "white", borderRadius: "4px", padding: "4px 10px", border: "1px solid #86efac" }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#166534" }}>
                {results.bol_data.extraction_confidence.toFixed(1)}%
              </div>
              <div style={{ fontSize: "8px", fontWeight: "600", color: "#166534" }}>BOL Score</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "10px" }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "6px 12px",
                background: activeTab === tab.id ? "white" : "transparent",
                border: "1px solid",
                borderColor: activeTab === tab.id ? "#60a5fa" : "#e0e0e0",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: "600",
                color: activeTab === tab.id ? "#60a5fa" : "#64748b",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.2s ease"
              }}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        {/* Toggle Numbers Button */}
        {(activeTab === 'formatted' || activeTab === 'cleaned' || activeTab === 'raw') && (
          <button
            onClick={() => setShowNumbers(!showNumbers)}
            style={{
              padding: "6px 14px",
              background: showNumbers ? "#dbeafe" : "white",
              border: "1px solid #60a5fa",
              borderRadius: "4px",
              color: "#60a5fa",
              fontSize: "10px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <Hash size={12} />
            {showNumbers ? 'Hide Numbers' : 'Show Numbers'}
          </button>
        )}
        
        <button
          onClick={() => {
            let text = '';
            if (activeTab === 'formatted') text = results.bol_formatted || '';
            else if (activeTab === 'structured') text = JSON.stringify(results.bol_data, null, 2);
            else if (activeTab === 'cleaned') text = results.best_result.extracted_text;
            else text = results.best_result.extracted_text;
            
            // Copy original text without numbers
            copyToClipboard(text);
          }}
          style={{
            padding: "6px 14px",
            background: "white",
            border: "1px solid #60a5fa",
            borderRadius: "4px",
            color: "#60a5fa",
            fontSize: "10px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          <Copy size={12} />
          Copy (No Numbers)
        </button>
        
        <button
          onClick={() => {
            let text = '';
            let filename = '';
            if (activeTab === 'formatted') {
              text = results.bol_formatted || '';
              filename = 'bol_formatted.txt';
            } else if (activeTab === 'structured') {
              text = JSON.stringify(results.bol_data, null, 2);
              filename = 'bol_structured.json';
            } else if (activeTab === 'cleaned') {
              text = results.best_result.extracted_text;
              filename = 'bol_cleaned.txt';
            } else {
              text = results.best_result.extracted_text;
              filename = 'bol_raw.txt';
            }
            downloadText(text, filename);
          }}
          style={{
            padding: "6px 14px",
            background: "linear-gradient(to right, #60a5fa, #3b82f6)",
            border: "none",
            borderRadius: "4px",
            color: "white",
            fontSize: "10px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          <Download size={12} />
          Download
        </button>
      </div>

      {/* Content Display */}
      <div style={{ background: "#1e293b", borderRadius: "4px", padding: "12px", minHeight: "200px", maxHeight: "300px", overflow: "auto" }}>
        {activeTab === 'formatted' && results.bol_formatted && (
          <pre style={{ color: "#e2e8f0", fontSize: "10px", lineHeight: "1.8", margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
            {displayContent}
          </pre>
        )}
        
        {activeTab === 'structured' && results.bol_data && (
          <pre style={{ color: "#e2e8f0", fontSize: "9px", lineHeight: "1.5", margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
            {displayContent}
          </pre>
        )}
        
        {activeTab === 'cleaned' && (
          <pre style={{ color: "#e2e8f0", fontSize: "10px", lineHeight: "1.8", margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
            {displayContent}
          </pre>
        )}
        
        {activeTab === 'raw' && (
          <pre style={{ color: "#e2e8f0", fontSize: "10px", lineHeight: "1.8", margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
            {displayContent}
          </pre>
        )}
        
        {!results.bol_formatted && !results.bol_data && (
          <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
            <AlertCircle size={32} style={{ margin: "0 auto 10px" }} />
            <p style={{ fontSize: "10px", fontWeight: "600" }}>No data available for this view</p>
          </div>
        )}
      </div>

      {/* Word Count Info */}
      {showNumbers && (activeTab === 'formatted' || activeTab === 'cleaned' || activeTab === 'raw') && currentContent && (
        <div style={{ marginTop: "8px", padding: "6px 10px", background: "#f0f9ff", borderRadius: "4px", border: "1px solid #bfdbfe" }}>
          <p style={{ fontSize: "9px", color: "#1e40af", margin: 0, fontWeight: "600" }}>
            📊 Total Words: {currentContent.split(/\s+/).filter(w => w.trim()).length}
          </p>
        </div>
      )}
    </div>
  );
}