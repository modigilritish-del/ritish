import React, { useState, useEffect } from 'react';
import { Wand2, Plus, Package, Eye, Trash2, Check, X, RefreshCw, Edit2 } from 'lucide-react';

const IconPageCreator = () => {
  const [configFiles, setConfigFiles] = useState([]);
  const [existingIcons, setExistingIcons] = useState([]);
  const [selectedConfigs, setSelectedConfigs] = useState([]);
  const [iconName, setIconName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [iconPath, setIconPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [editingIcon, setEditingIcon] = useState(null);
  const [editDisplayName, setEditDisplayName] = useState('');

  const API_BASE = 'http://localhost:8000/api/icons';
  const CONFIGS_API = 'http://localhost:8000/api/configs';

  const CREATED_ICONS_KEY = 'iconPageCreatorIcons';

  useEffect(() => {
    loadConfigFiles();
    loadExistingIcons();
    if (!localStorage.getItem(CREATED_ICONS_KEY)) {
      localStorage.setItem(CREATED_ICONS_KEY, JSON.stringify([]));
    }
  }, []);

  const loadConfigFiles = async () => {
    try {
      const res = await fetch(`${CONFIGS_API}/list-configs`);
      const data = await res.json();
      if (data.success) {
        setConfigFiles(data.configs || []);
      }
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  };

  const loadExistingIcons = async () => {
    try {
      const res = await fetch(`${API_BASE}/list-icons`);
      const data = await res.json();
      if (data.success) {
        setExistingIcons(data.icons || []);
      }
    } catch (error) {
      console.error('Error loading icons:', error);
    }
  };

  const isCreatedByPage = (fileName) => {
    const createdIcons = JSON.parse(localStorage.getItem(CREATED_ICONS_KEY) || '[]');
    return createdIcons.includes(fileName);
  };

  const toggleConfigSelection = (configFile) => {
    if (selectedConfigs.includes(configFile)) {
      setSelectedConfigs(selectedConfigs.filter(c => c !== configFile));
    } else {
      setSelectedConfigs([...selectedConfigs, configFile]);
    }
  };

  const handlePreview = () => {
    if (selectedConfigs.length === 0) {
      setError('Please select at least one config file');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const totalLinks = selectedConfigs.reduce((sum, configFile) => {
      const config = configFiles.find(c => c.fileName === configFile);
      return sum + (config?.linkDetails?.length || 0);
    }, 0);

    setPreviewData({
      configFiles: selectedConfigs,
      totalLinks: totalLinks,
      iconName: iconName || 'MyIcon',
      displayName: displayName || 'My Icon'
    });

    setSuccess('✅ Preview generated successfully');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleCreateIcon = async () => {
    if (!iconName || !displayName || selectedConfigs.length === 0) {
      setError('Please fill icon name, display name and select at least one config file');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/create-icon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iconName: iconName,
          displayName: displayName,
          iconPath: iconPath || iconName.toLowerCase().replace(/\s+/g, '-'),
          configFiles: selectedConfigs
        })
      });

      const data = await res.json();
      
      if (data.success) {
        const createdIcons = JSON.parse(localStorage.getItem(CREATED_ICONS_KEY) || '[]');
        const newIconFileName = data.details.iconFile;
        if (!createdIcons.includes(newIconFileName)) {
          createdIcons.push(newIconFileName);
          localStorage.setItem(CREATED_ICONS_KEY, JSON.stringify(createdIcons));
        }
        
        setSuccess('✅ ' + data.message);
        setIconName('');
        setDisplayName('');
        setIconPath('');
        setSelectedConfigs([]);
        setPreviewData(null);
        setShowCreatePopup(false);
        await loadExistingIcons();
        await loadConfigFiles();
      } else {
        setError(data.detail || 'Creation failed');
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => { setSuccess(''); setError(''); }, 5000);
    }
  };

  const handleDeleteIcon = async (iconFileName) => {
    if (!window.confirm(`Delete icon '${iconFileName}'?\n\nThis will remove:\n- Icon file\n- Config file\n- All registrations`)) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/delete-icon/${iconFileName}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (data.success) {
        const createdIcons = JSON.parse(localStorage.getItem(CREATED_ICONS_KEY) || '[]');
        const updated = createdIcons.filter(name => name !== iconFileName);
        localStorage.setItem(CREATED_ICONS_KEY, JSON.stringify(updated));
        
        setSuccess('✅ ' + data.message);
        await loadExistingIcons();
      } else {
        setError(data.detail || 'Delete failed');
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => { setSuccess(''); setError(''); }, 3000);
    }
  };

  const handleEditIcon = (icon) => {
    setEditingIcon(icon.fileName);
    setEditDisplayName(icon.displayName);
  };

  const handleSaveEdit = async (iconFileName) => {
    if (!editDisplayName.trim()) {
      setError('Display name cannot be empty');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/edit-icon/${iconFileName}?new_display_name=${encodeURIComponent(editDisplayName)}`, {
        method: 'PUT'
      });

      const data = await res.json();
      if (data.success) {
        setSuccess('✅ ' + data.message);
        setEditingIcon(null);
        setEditDisplayName('');
        await loadExistingIcons();
      } else {
        setError(data.detail || 'Edit failed');
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => { setSuccess(''); setError(''); }, 3000);
    }
  };

  const handleCancelEdit = () => {
    setEditingIcon(null);
    setEditDisplayName('');
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wand2 size={18} />
          <h1 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>🎨 Icon Page Creator</h1>
        </div>
        <button
          onClick={() => setShowCreatePopup(true)}
          style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Plus size={14} />
          Create New Icon
        </button>
      </div>

      {/* Status Messages */}
      {success && (
        <div style={{ background: '#d1fae5', border: '1px solid #10b981', color: '#065f46', padding: '8px 16px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Check size={14} />
          {success}
        </div>
      )}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', padding: '8px 16px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <X size={14} />
          {error}
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* Existing Icons List - Always Visible */}
        <div>
          <div style={{ marginBottom: '12px', padding: '12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '6px' }}>
              📋 All Icon Pages
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: '1.5' }}>
              Icons created through this page have <strong>Edit</strong> and <strong>Delete</strong> buttons.
              <br />
              System icons (AdminMaster, AnalysisCreation, etc.) cannot be modified from here.
            </div>
          </div>

          {existingIcons.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: '#fff', border: '2px dashed #e5e7eb', borderRadius: '8px' }}>
              <Package size={48} style={{ margin: '0 auto 12px', opacity: 0.3, color: '#9ca3af' }} />
              <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>No icons created yet</div>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>Click "Create New Icon" to get started</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {existingIcons.map(icon => (
                <div
                  key={icon.fileName}
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '12px',
                    transition: 'all 0.2s',
                    borderLeft: isCreatedByPage(icon.fileName) ? '4px solid #10b981' : '4px solid #d1d5db'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        {editingIcon === icon.fileName ? (
                          <input
                            type="text"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            style={{
                              padding: '4px 8px',
                              border: '1px solid #60a5fa',
                              borderRadius: '3px',
                              fontSize: '12px',
                              fontWeight: '600',
                              outline: 'none',
                              flex: 1
                            }}
                            autoFocus
                          />
                        ) : (
                          <>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>{icon.displayName}</div>
                            {isCreatedByPage(icon.fileName) && (
                              <span style={{ fontSize: '9px', background: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: '3px', fontWeight: '600' }}>
                                Created
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>
                        📄 {icon.fileName}
                      </div>
                      <div style={{ fontSize: '9px', color: '#9ca3af' }}>
                        📦 {icon.configFiles.length} configs
                      </div>
                    </div>

                    {isCreatedByPage(icon.fileName) && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {editingIcon === icon.fileName ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(icon.fileName)}
                              disabled={loading}
                              style={{
                                padding: '4px 8px',
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '9px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Check size={10} />
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              style={{
                                padding: '4px 8px',
                                background: '#6b7280',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '9px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <X size={10} />
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleDeleteIcon(icon.fileName)}
                              disabled={loading}
                              style={{
                                padding: '4px 8px',
                                background: '#ef4444',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '9px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Trash2 size={10} />
                              Delete
                            </button>
                            <button
                              onClick={() => handleEditIcon(icon)}
                              style={{
                                padding: '4px 8px',
                                background: '#60a5fa',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '9px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Edit2 size={10} />
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ height: '8px', borderTop: '1px solid #d1d5db', background: 'linear-gradient(to right, #60a5fa, #374151)' }} />

      {/* Create Popup */}
      {showCreatePopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: '8px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '12px 16px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wand2 size={16} />
                Create New Icon Page
              </div>
              <button
                onClick={() => { setShowCreatePopup(false); setIconName(''); setDisplayName(''); setIconPath(''); setSelectedConfigs([]); setPreviewData(null); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>Icon Details</h3>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Icon Name (PascalCase) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={iconName}
                    onChange={(e) => setIconName(e.target.value)}
                    placeholder="e.g., SalesManagement"
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '2px' }}>
                    "Master" will be added automatically (e.g., SalesManagementMaster.js)
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Display Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g., Sales Management"
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Icon Path (Optional)
                  </label>
                  <input
                    type="text"
                    value={iconPath}
                    onChange={(e) => setIconPath(e.target.value)}
                    placeholder="Auto-generated if empty"
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Select Config Files <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', padding: '6px' }}>
                    {configFiles.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '10px' }}>No config files found</div>
                    ) : (
                      configFiles.map(config => (
                        <div
                          key={config.fileName}
                          onClick={() => toggleConfigSelection(config.fileName)}
                          style={{
                            padding: '6px 8px',
                            margin: '2px 0',
                            background: selectedConfigs.includes(config.fileName) ? '#e9d5ff' : '#f9fafb',
                            border: `1px solid ${selectedConfigs.includes(config.fileName) ? '#8b5cf6' : '#e0e0e0'}`,
                            borderRadius: '3px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: '500', color: '#333' }}>{config.fileName}</div>
                            <div style={{ fontSize: '9px', color: '#666' }}>Links: {config.linkDetails?.length || 0}</div>
                          </div>
                          {selectedConfigs.includes(config.fileName) && <Check size={12} color="#8b5cf6" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handlePreview}
                    disabled={loading}
                    style={{ flex: 1, padding: '8px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <Eye size={12} />
                    Preview
                  </button>
                  <button
                    onClick={handleCreateIcon}
                    disabled={loading}
                    style={{ flex: 1, padding: '8px', background: loading ? '#9ca3af' : '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    {loading ? <><RefreshCw size={12} />Creating...</> : <><Check size={12} />Create</>}
                  </button>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>Preview</h3>

                {previewData ? (
                  <div>
                    <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #10b981', borderRadius: '6px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#065f46', marginBottom: '8px' }}>✅ Ready to Create</div>
                      <div style={{ fontSize: '10px', color: '#047857', lineHeight: '1.6' }}>
                        <div><strong>Icon:</strong> {previewData.iconName}Master.js</div>
                        <div><strong>Display:</strong> {previewData.displayName}</div>
                        <div><strong>Configs:</strong> {previewData.configFiles.length}</div>
                        <div><strong>Total Links:</strong> {previewData.totalLinks}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '10px', fontWeight: '600', color: '#1f2937', marginBottom: '6px' }}>Selected Config Files:</div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {previewData.configFiles.map(configFile => {
                        const config = configFiles.find(c => c.fileName === configFile);
                        return (
                          <div key={configFile} style={{ padding: '8px', marginBottom: '4px', background: '#f9fafb', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '500', color: '#333' }}>{configFile}</div>
                            <div style={{ fontSize: '9px', color: '#666' }}>Links: {config?.linkDetails?.length || 0}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', background: '#f9fafb', border: '2px dashed #e5e7eb', borderRadius: '6px', color: '#9ca3af' }}>
                    <Eye size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                    <div style={{ fontSize: '11px' }}>No preview yet</div>
                    <div style={{ fontSize: '9px', marginTop: '4px' }}>Fill the form and click Preview</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IconPageCreator;
