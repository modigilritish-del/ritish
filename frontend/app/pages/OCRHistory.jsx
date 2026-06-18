// ==================== FILE 5: app/pages/OCRHistory.jsx ====================
'use client';
import React, { useState, useEffect } from 'react';
import { Clock, Copy, Trash2, FileText } from 'lucide-react';
import { storageUtils } from '../utils/ocrApi';

export default function OCRHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(storageUtils.getHistory());
  }, []);

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    alert('Text copied!');
  };

  const deleteItem = (id) => {
    const updated = history.filter(item => item.id !== id);
    localStorage.setItem('ocr_history', JSON.stringify(updated));
    setHistory(updated);
  };

  const clearAll = () => {
    if (confirm('Clear all history?')) {
      storageUtils.clearHistory();
      setHistory([]);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 95) return 'text-green-600';
    if (confidence >= 85) return 'text-blue-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Processing History</h2>
          {history.length > 0 && (
            <button
              onClick={clearAll}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Clear All
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock size={48} className="mx-auto mb-4 opacity-50" />
            <p>No processing history yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText size={18} className="text-blue-600" />
                      <span className="font-medium">{item.fileName}</span>
                      <span className={`text-sm font-semibold ${getConfidenceColor(item.confidence)}`}>
                        {item.confidence.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.text}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                      <span>Engine: {item.engine}</span>
                      <span>Mode: {item.mode}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => copyText(item.text)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                      title="Copy text"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}