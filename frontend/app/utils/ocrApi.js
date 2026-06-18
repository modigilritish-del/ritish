// app/utils/ocrApi.js - COMPLETE FIXED VERSION
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// ==================== OCR API ====================
export const ocrApi = {
  uploadDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/ocr/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },

  processDocument: async (documentId, options) => {
    const response = await fetch(`${API_BASE}/ocr/process/${documentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!response.ok) throw new Error('Processing failed');
    return response.json();
  },

  compareResults: async (documentId, languages = ['en']) => {
    const params = new URLSearchParams();
    languages.forEach(lang => params.append('languages', lang));
    const response = await fetch(`${API_BASE}/ocr/compare/${documentId}?${params}`);
    if (!response.ok) throw new Error('Comparison failed');
    return response.json();
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE}/ocr/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  deleteDocument: async (documentId) => {
    const response = await fetch(`${API_BASE}/ocr/cleanup/${documentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Delete failed');
    return response.json();
  }
};

// ==================== STORAGE UTILS ====================
export const storageUtils = {
  saveToHistory: (result) => {
    const history = storageUtils.getHistory();
    const newItem = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      fileName: result.fileName,
      text: result.text,
      confidence: result.confidence,
      engine: result.engine,
      mode: result.mode,
    };
    const updated = [newItem, ...history].slice(0, 50);
    localStorage.setItem('ocr_history', JSON.stringify(updated));
    return updated;
  },

  getHistory: () => {
    try {
      const history = localStorage.getItem('ocr_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      return [];
    }
  },

  clearHistory: () => {
    localStorage.removeItem('ocr_history');
    return [];
  },

  getSettings: () => {
    try {
      const settings = localStorage.getItem('ocr_settings');
      return settings ? JSON.parse(settings) : {
        mode: 'auto',
        languages: ['en'],
        preprocessing: true,
      };
    } catch (error) {
      return {
        mode: 'auto',
        languages: ['en'],
        preprocessing: true,
      };
    }
  },

  saveSettings: (settings) => {
    localStorage.setItem('ocr_settings', JSON.stringify(settings));
  },
};
