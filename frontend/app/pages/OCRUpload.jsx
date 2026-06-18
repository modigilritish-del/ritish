// ==================== FILE 4: app/pages/OCRUpload.jsx ====================
'use client';
import React, { useState, useRef } from 'react';
import { Upload, FileImage, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { ocrApi, storageUtils } from '../utils/ocrApi';

export default function OCRUpload() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processAll = async () => {
    setProcessing(true);
    const settings = storageUtils.getSettings();

    for (let i = 0; i < files.length; i++) {
      try {
        setUploadProgress(prev => ({ ...prev, [i]: 'uploading' }));
        const uploadResult = await ocrApi.uploadDocument(files[i]);
        
        setUploadProgress(prev => ({ ...prev, [i]: 'processing' }));
        const processResult = await ocrApi.processDocument(uploadResult.id, {
          mode: settings.mode,
          language: settings.languages,
          preprocessing: settings.preprocessing,
        });

        storageUtils.saveToHistory({
          fileName: files[i].name,
          text: processResult.best_result.extracted_text,
          confidence: processResult.best_result.confidence_score,
          engine: processResult.best_result.engine_name,
          mode: settings.mode,
        });

        setUploadProgress(prev => ({ ...prev, [i]: 'completed' }));
      } catch (error) {
        setUploadProgress(prev => ({ ...prev, [i]: 'failed' }));
      }
    }

    setProcessing(false);
    setTimeout(() => {
      alert('Batch processing completed!');
      setFiles([]);
      setUploadProgress({});
    }, 1000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Upload Documents</h2>
        
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 transition"
        >
          <Upload size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-semibold text-gray-700 mb-2">
            Click to upload files
          </p>
          <p className="text-sm text-gray-500">
            PNG, JPG, PDF • Max 10MB per file
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {files.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Files ({files.length})</h3>
              <button
                onClick={processAll}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Process All'}
              </button>
            </div>

            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <FileImage size={20} className="text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    {uploadProgress[index] && (
                      <div className="flex items-center gap-2">
                        {uploadProgress[index] === 'uploading' && (
                          <span className="text-sm text-blue-600">Uploading...</span>
                        )}
                        {uploadProgress[index] === 'processing' && (
                          <>
                            <Loader2 size={16} className="animate-spin text-blue-600" />
                            <span className="text-sm text-blue-600">Processing...</span>
                          </>
                        )}
                        {uploadProgress[index] === 'completed' && (
                          <>
                            <CheckCircle size={16} className="text-green-600" />
                            <span className="text-sm text-green-600">Completed</span>
                          </>
                        )}
                        {uploadProgress[index] === 'failed' && (
                          <span className="text-sm text-red-600">Failed</span>
                        )}
                      </div>
                    )}
                  </div>
                  {!processing && (
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}