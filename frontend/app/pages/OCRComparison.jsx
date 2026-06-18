// app/pages/OCRComparison.jsx
'use client';
import React, { useState, useRef } from 'react';
import { Upload, Zap, Loader2 } from 'lucide-react';

// Mock ocrApi since backend is not available
const ocrApi = {
  uploadDocument: async (file) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ id: Math.random().toString(36) });
      }, 1000);
    });
  },
  compareResults: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          best_engine: 'Tesseract',
          agreement_score: 92.5,
          tesseract_result: {
            extracted_text: 'Sample text from Tesseract OCR engine\nLine 2 of sample text',
            confidence_score: 94.2,
            processing_time: 0.52
          },
          easyocr_result: {
            extracted_text: 'Sample text from EasyOCR engine\nLine 2 of sample text',
            confidence_score: 91.8,
            processing_time: 0.78
          },
          paddleocr_result: {
            extracted_text: 'Sample text from PaddleOCR engine\nLine 2 of sample text',
            confidence_score: 93.5,
            processing_time: 0.65
          },
          hybrid_result: {
            extracted_text: 'Sample text from Hybrid (Voting) System\nLine 2 of sample text',
            confidence_score: 95.1,
            processing_time: 1.95
          }
        });
      }, 2000);
    });
  }
};

export default function OCRComparison() {
  const [file, setFile] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setComparison(null);
    }
  };

  const compareEngines = async () => {
    if (!file) return;

    try {
      setComparing(true);
      const uploadResult = await ocrApi.uploadDocument(file);
      const comparisonResult = await ocrApi.compareResults(uploadResult.id, ['en']);
      setComparison(comparisonResult);
    } catch (error) {
      alert('Comparison failed: ' + error.message);
    } finally {
      setComparing(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 95) return '#10b981';
    if (confidence >= 85) return '#3b82f6';
    if (confidence >= 70) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Engine Comparison</h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          Compare results from all 3 OCR engines side-by-side
        </p>

        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #d1d5db',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
        >
          <Upload size={48} style={{ margin: '0 auto 16px', color: '#9ca3af' }} />
          <p style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            {file ? file.name : 'Click to upload an image'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {file && !comparison && (
          <button
            onClick={compareEngines}
            disabled={comparing}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '12px 16px',
              background: comparing ? '#9ca3af' : '#2563eb',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              cursor: comparing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {comparing ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Comparing Engines...
              </>
            ) : (
              <>
                <Zap size={20} />
                Compare All Engines
              </>
            )}
          </button>
        )}
      </div>

      {comparison && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary */}
          <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Comparison Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Best Engine</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2563eb' }}>
                  {comparison.best_engine}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Agreement Score</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: getConfidenceColor(comparison.agreement_score) }}>
                  {comparison.agreement_score.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Engine Results */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {[
              { name: 'Tesseract', result: comparison.tesseract_result },
              { name: 'EasyOCR', result: comparison.easyocr_result },
              { name: 'PaddleOCR', result: comparison.paddleocr_result },
            ].map(({ name, result }) => (
              <div key={name} style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ fontWeight: '600' }}>{name}</h4>
                  <span 
                    style={{ 
                      fontSize: '14px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: `${getConfidenceColor(result.confidence_score)}20`,
                      color: getConfidenceColor(result.confidence_score)
                    }}
                  >
                    {result.confidence_score.toFixed(1)}%
                  </span>
                </div>
                <div style={{ background: '#f9fafb', borderRadius: '4px', padding: '12px', height: '192px', overflowY: 'auto' }}>
                  <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', margin: 0 }}>
                    {result.extracted_text}
                  </pre>
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                  Time: {result.processing_time.toFixed(2)}s
                </div>
              </div>
            ))}
          </div>

          {/* Hybrid Result */}
          {comparison.hybrid_result && (
            <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Hybrid Result (Voting System)</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span 
                  style={{ 
                    fontSize: '18px',
                    fontWeight: 'bold',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    backgroundColor: `${getConfidenceColor(comparison.hybrid_result.confidence_score)}20`,
                    color: getConfidenceColor(comparison.hybrid_result.confidence_score)
                  }}
                >
                  {comparison.hybrid_result.confidence_score.toFixed(1)}%
                </span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  Processing time: {comparison.hybrid_result.processing_time.toFixed(2)}s
                </span>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px', maxHeight: '256px', overflowY: 'auto' }}>
                <pre style={{ fontSize: '14px', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {comparison.hybrid_result.extracted_text}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}