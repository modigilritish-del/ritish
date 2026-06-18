// ==================== FILE 7: app/pages/OCRSettings.jsx ====================
'use client';
import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { storageUtils } from '../utils/ocrApi';
import { ocrModes } from '../config/ocrLinks';

export default function OCRSettings() {
  const [settings, setSettings] = useState({
    mode: 'auto',
    languages: ['en'],
    preprocessing: true,
  });

  useEffect(() => {
    const saved = storageUtils.getSettings();
    setSettings(saved);
  }, []);

  const saveSettings = () => {
    storageUtils.saveSettings(settings);
    alert('Settings saved successfully!');
  };

  const resetSettings = () => {
    const defaultSettings = {
      mode: 'auto',
      languages: ['en'],
      preprocessing: true,
    };
    setSettings(defaultSettings);
    storageUtils.saveSettings(defaultSettings);
    alert('Settings reset to default!');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings size={24} className="text-blue-600" />
          <h2 className="text-2xl font-bold">OCR Settings</h2>
        </div>

        <div className="space-y-6">
          {/* Processing Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Processing Mode
            </label>
            <select
              value={settings.mode}
              onChange={(e) => setSettings({...settings, mode: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(ocrModes).map(([key, mode]) => (
                <option key={key} value={key}>
                  {mode.icon} {mode.name} - {mode.description}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500">
              Selected: {ocrModes[settings.mode]?.description}
            </p>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Language
            </label>
            <select
              value={settings.languages[0]}
              onChange={(e) => setSettings({...settings, languages: [e.target.value]})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">🇬🇧 English</option>
              <option value="hi">🇮🇳 Hindi</option>
              <option value="es">🇪🇸 Spanish</option>
              <option value="fr">🇫🇷 French</option>
              <option value="de">🇩🇪 German</option>
            </select>
          </div>

          {/* Preprocessing */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.preprocessing}
                onChange={(e) => setSettings({...settings, preprocessing: e.target.checked})}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-medium">Enable Image Preprocessing</div>
                <div className="text-sm text-gray-500">
                  Applies noise removal, deskewing, and enhancement (recommended)
                </div>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={saveSettings}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Save Settings
            </button>
            <button
              onClick={resetSettings}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              Reset to Default
            </button>
          </div>
        </div>
      </div>

      {/* Mode Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(ocrModes).map(([key, mode]) => (
          <div 
            key={key}
            className={`bg-white rounded-lg shadow p-4 border-2 ${
              settings.mode === key ? 'border-blue-500' : 'border-transparent'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{mode.icon}</span>
              <h3 className="font-semibold">{mode.name}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">{mode.description}</p>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                Speed: {mode.speed}
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                Accuracy: {mode.accuracy}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}