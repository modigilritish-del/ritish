// app/OCRComponents/OCRPreview.jsx
'use client';
import React, { useState, useEffect } from 'react';
import { Eye, FileText, FileSpreadsheet, Table, Loader2, Sparkles, CheckCircle, Zap } from 'lucide-react';

export default function OCRPreview({ preview, file, processing }) {
  const [scanProgress, setScanProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const processingSteps = [
    { icon: Loader2, text: 'Loading document...', color: '#3b82f6' },
    { icon: Sparkles, text: 'Preprocessing image...', color: '#8b5cf6' },
    { icon: Zap, text: 'Running OCR engines...', color: '#f59e0b' },
    { icon: FileText, text: 'Extracting text...', color: '#10b981' },
    { icon: CheckCircle, text: 'Finalizing...', color: '#059669' }
  ];

  useEffect(() => {
    console.log('OCRPreview props:', { preview, file: file?.name, processing });
  }, [preview, file, processing]);

  // Live processing animation
  useEffect(() => {
    if (processing) {
      console.log('🎬 Starting live animation');
      setScanProgress(0);
      setCurrentStep(0);

      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          const newProgress = prev >= 100 ? 0 : prev + 2;
          return newProgress;
        });
      }, 100);

      const stepInterval = setInterval(() => {
        setCurrentStep(prev => {
          const newStep = (prev + 1) % processingSteps.length;
          console.log('📍 Step:', processingSteps[newStep].text);
          return newStep;
        });
      }, 2000);

      return () => {
        console.log('🛑 Stopping animation');
        clearInterval(progressInterval);
        clearInterval(stepInterval);
      };
    }
  }, [processing]);

  const getFileExtension = () => {
    if (!file?.name) return '';
    return file.name.split('.').pop().toLowerCase();
  };

  const fileExt = getFileExtension();
  const fileName = file?.name || '';

  // 🔥 LIVE PROCESSING VIEW
  if (processing && (preview || file)) {
    console.log('🎥 Rendering LIVE PROCESSING view');
    const StepIcon = processingSteps[currentStep].icon;
    
    return (
      <div>
        <h4 style={{ fontSize: "10px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Preview
        </h4>
        <div style={{
          border: "1px solid #e0e0e0",
          borderRadius: "4px",
          height: "140px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative"
        }}>
          {/* Background Image with Scan Effect */}
          {preview && preview !== 'pdf' && preview !== 'excel' && preview !== 'csv' && preview !== 'unknown' && (
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.3,
              filter: "blur(2px)"
            }}>
              <img 
                src={preview} 
                alt="Processing" 
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "cover"
                }} 
              />
            </div>
          )}

          {/* Scanning Line Effect */}
          <div style={{
            position: "absolute",
            top: `${scanProgress}%`,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, transparent, #fff, transparent)",
            boxShadow: "0 0 10px #fff",
            transition: "top 0.1s linear"
          }} />

          {/* Processing Status */}
          <div style={{
            position: "relative",
            zIndex: 10,
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.95)",
            padding: "16px 24px",
            borderRadius: "8px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
          }}>
            <StepIcon 
              size={32} 
              style={{ 
                margin: "0 auto 8px", 
                color: processingSteps[currentStep].color,
                animation: currentStep === 0 ? 'spin 1s linear infinite' : 'pulse 0.5s ease-in-out infinite'
              }} 
            />
            <p style={{ 
              fontSize: "11px", 
              fontWeight: "700", 
              margin: "4px 0", 
              color: "#333" 
            }}>
              {processingSteps[currentStep].text}
            </p>
            <div style={{
              width: "150px",
              height: "4px",
              background: "#e5e7eb",
              borderRadius: "2px",
              overflow: "hidden",
              margin: "8px auto 0"
            }}>
              <div style={{
                height: "100%",
                width: `${scanProgress}%`,
                background: `linear-gradient(90deg, ${processingSteps[currentStep].color}, #10b981)`,
                transition: "width 0.1s linear",
                borderRadius: "2px"
              }} />
            </div>
            <p style={{ 
              fontSize: "8px", 
              color: "#64748b", 
              margin: "4px 0 0 0",
              fontWeight: "500"
            }}>
              {Math.round(scanProgress)}% complete
            </p>
          </div>

          {/* Particle Effect */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)",
            animation: "pulse-bg 2s ease-in-out infinite"
          }} />
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.1); }
          }
          @keyframes pulse-bg {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // 🔥 NORMAL PREVIEW (when NOT processing)
  console.log('📋 Rendering normal preview');
  
  return (
    <div>
      <h4 style={{ fontSize: "10px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
        Preview
      </h4>
      <div style={{
        border: "1px solid #e0e0e0",
        borderRadius: "4px",
        height: "140px",
        background: "#f8f9fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexDirection: "column",
        padding: "10px"
      }}>
        {/* NO FILE UPLOADED */}
        {!preview && !file && (
          <div style={{ textAlign: "center", color: "#94a3b8" }}>
            <Eye size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
            <p style={{ fontSize: "10px", fontWeight: "500", margin: 0 }}>
              No document uploaded
            </p>
          </div>
        )}

        {/* PDF FILE */}
        {(preview === 'pdf' || fileExt === 'pdf') && (
          <div style={{ textAlign: "center", color: "#64748b" }}>
            <FileText size={48} style={{ margin: "0 auto 8px", color: "#ef4444" }} />
            <p style={{ fontSize: "11px", fontWeight: "700", margin: "4px 0", color: "#333" }}>
              PDF Document
            </p>
            <p style={{ 
              fontSize: "9px", 
              margin: "4px 0 0 0", 
              maxWidth: "200px", 
              overflow: "hidden", 
              textOverflow: "ellipsis", 
              whiteSpace: "nowrap" 
            }}>
              {fileName}
            </p>
            <div style={{
              fontSize: "8px",
              color: "#059669",
              marginTop: "8px",
              padding: "3px 8px",
              background: "#d1fae5",
              borderRadius: "3px",
              display: "inline-block"
            }}>
              Ready for OCR Processing
            </div>
          </div>
        )}

        {/* EXCEL FILE */}
        {(preview === 'excel' || ['xlsx', 'xls', 'xlsm'].includes(fileExt)) && (
          <div style={{ textAlign: "center", color: "#64748b" }}>
            <FileSpreadsheet size={48} style={{ margin: "0 auto 8px", color: "#10b981" }} />
            <p style={{ fontSize: "11px", fontWeight: "700", margin: "4px 0", color: "#333" }}>
              Excel Spreadsheet
            </p>
            <p style={{ 
              fontSize: "9px", 
              margin: "4px 0 0 0", 
              maxWidth: "200px", 
              overflow: "hidden", 
              textOverflow: "ellipsis", 
              whiteSpace: "nowrap" 
            }}>
              {fileName}
            </p>
            <div style={{
              fontSize: "8px",
              color: "#059669",
              marginTop: "8px",
              padding: "3px 8px",
              background: "#d1fae5",
              borderRadius: "3px",
              display: "inline-block"
            }}>
              Direct Data Extraction
            </div>
          </div>
        )}

        {/* CSV FILE */}
        {(preview === 'csv' || fileExt === 'csv') && (
          <div style={{ textAlign: "center", color: "#64748b" }}>
            <Table size={48} style={{ margin: "0 auto 8px", color: "#3b82f6" }} />
            <p style={{ fontSize: "11px", fontWeight: "700", margin: "4px 0", color: "#333" }}>
              CSV File
            </p>
            <p style={{ 
              fontSize: "9px", 
              margin: "4px 0 0 0", 
              maxWidth: "200px", 
              overflow: "hidden", 
              textOverflow: "ellipsis", 
              whiteSpace: "nowrap" 
            }}>
              {fileName}
            </p>
            <div style={{
              fontSize: "8px",
              color: "#059669",
              marginTop: "8px",
              padding: "3px 8px",
              background: "#d1fae5",
              borderRadius: "3px",
              display: "inline-block"
            }}>
              Direct Data Extraction
            </div>
          </div>
        )}

        {/* IMAGE FILE (with actual preview) */}
        {preview && preview !== 'pdf' && preview !== 'excel' && preview !== 'csv' && preview !== 'unknown' && (
          <img 
            src={preview} 
            alt="Preview" 
            style={{ 
              maxWidth: "100%", 
              maxHeight: "100%", 
              objectFit: "contain",
              borderRadius: "4px"
            }} 
          />
        )}

        {/* FALLBACK for unknown file types */}
        {(preview === 'unknown' || (file && !preview)) && (
          <div style={{ textAlign: "center", color: "#94a3b8" }}>
            <FileText size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
            <p style={{ fontSize: "10px", fontWeight: "600", margin: "4px 0", color: "#333" }}>
              {fileName || 'Unknown File Type'}
            </p>
            <p style={{ fontSize: "9px", margin: "4px 0 0 0", color: "#64748b" }}>
              Ready to process
            </p>
          </div>
        )}
      </div>
    </div>
  );
}