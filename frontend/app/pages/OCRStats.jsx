'use client';
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, Zap, RefreshCw } from 'lucide-react';
import { ocrApi } from '../utils/ocrApi';

export default function OCRStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await ocrApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin text-blue-600">
          <RefreshCw size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Statistics</h2>
        <button
          onClick={loadStats}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 size={24} />
              </div>
              <div className="text-3xl font-bold mb-1">{stats.total_documents}</div>
              <div className="text-sm text-blue-100">Total Documents</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-700 text-white rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp size={24} />
              </div>
              <div className="text-3xl font-bold mb-1">{stats.completed}</div>
              <div className="text-sm text-green-100">Completed</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 text-white rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Clock size={24} />
              </div>
              <div className="text-3xl font-bold mb-1">{stats.processing}</div>
              <div className="text-sm text-yellow-100">Processing</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Zap size={24} />
              </div>
              <div className="text-3xl font-bold mb-1">{stats.cache_entries}</div>
              <div className="text-sm text-purple-100">Cached Results</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* ✅ FIX 1: Success Rate Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4 text-lg">Success Rate</h3>
              <div className="flex items-end justify-center" style={{ height: 200 }}>
                <div className="w-full max-w-xs">
                  <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-green-600 h-full transition-all duration-500"
                      style={{ 
                        width: `${stats.total_documents > 0 ? (stats.completed / stats.total_documents * 100) : 0}%` 
                      }}
                    />
                  </div>
                  <div className="text-center mt-2 text-2xl font-bold text-green-600">
                    {stats.total_documents > 0 
                      ? ((stats.completed / stats.total_documents * 100).toFixed(1))
                      : 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ FIX 2: Cache Performance Section */}
            <div className="bg-white rounded-lg shadow p-6" style={{ minHeight: 250 }}>
              <h3 className="font-semibold mb-4 text-lg">Cache Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cache Entries</span>
                  <span className="font-bold text-purple-600">{stats.cache_entries}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Docs</span>
                  <span className="font-bold">{stats.total_documents}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cache Hit Rate</span>
                  <span className="font-bold text-green-600">
                    {stats.total_documents > 0 
                      ? ((stats.cache_entries / stats.total_documents * 100).toFixed(1))
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}