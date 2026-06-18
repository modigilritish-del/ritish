import React, { useState } from 'react';
import { FileText, Plus, FolderPlus, Download, X, Check, ChevronDown, Copy, Save } from 'lucide-react';

const EmptyPageCreator = () => {
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [pageName, setPageName] = useState('');
  const [selectedConfig, setSelectedConfig] = useState('');
  const [createdPages, setCreatedPages] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // API URL - adjust according to your backend
  const API_URL = 'http://localhost:8000/api/pages';

  // Available config files
  const configFiles = [
    { value: 'adminMasterLinks', label: 'Admin Master Links', icon: '🔧' },
    { value: 'analysisLinks', label: 'Analysis Links', icon: '📊' },
    { value: 'financeLinks', label: 'Finance Links', icon: '💰' },
    { value: 'itemMasterLinks', label: 'Item Master Links', icon: '📦' },
    { value: 'ocrLinks', label: 'OCR Links', icon: '🔍' },
    { value: 'reportsLinks', label: 'Reports Links', icon: '📄' },
    { value: 'userManagementLinks', label: 'User Management Links', icon: '👥' },
    { value: 'uomLinks', label: 'UOM Links', icon: '📏' }
  ];

  // Convert page name to component name (PascalCase)
  const toComponentName = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  };

  // Convert page name to path (kebab-case)
  const toPath = (name) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  };

  // Generate component file content
  const generateComponentContent = (componentName, pageName) => {
    return `import React from 'react';
import { FileText } from 'lucide-react';

const ${componentName} = () => {
  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white" style={{ height: '24px', paddingRight: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={14} />
          <h2 className="m-0 text-xs font-semibold">${pageName}</h2>
        </div>
      </div>

      {/* Main Content Area - Empty */}
      <div className="flex-1 p-2.5 overflow-auto">
        {/* Empty content - ready for your components */}
      </div>

      {/* Footer */}
      <div className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700" style={{ height: '8px' }} />
    </div>
  );
};

export default ${componentName};
`;
  };

  // Generate config update instructions
  const generateConfigInstructions = (componentName, fileName, pathName, pageName, configName) => {
    return `
============================================
📝 CONFIG UPDATE INSTRUCTIONS
============================================
File: app/config/${configName}.js

STEP 1: Add this import at the top (after other imports):
---------------------------------------------------------
import ${componentName} from "../PageCreationFolder/${fileName.replace('.js', '')}";


STEP 2: Add this entry to the array:
---------------------------------------------------------
{ 
  name: "${pageName}", 
  icon: FileText, 
  path: "${pathName}",
  component: ${componentName},
},

============================================
✅ That's it! Your page is ready to use.
============================================
`;
  };

  // Download file
  const downloadFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('✅ Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  // 🚀 NEW: Save page to PageCreationFolder via API
  const savePageToFolder = async (fileName, content) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/save-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: fileName,
          content: content
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to save page');
      }

      setSuccess('✅ Page saved to PageCreationFolder successfully!');
      setTimeout(() => setSuccess(''), 3000);
      return true;
    } catch (error) {
      setError(`❌ Error saving page: ${error.message}`);
      setTimeout(() => setError(''), 3000);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // 🆕 NEW: Create link automatically when page is saved
  const createPageLink = async (pageData) => {
    try {
      const response = await fetch('http://localhost:8000/api/links/create-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageName: pageData.name,
          componentName: pageData.componentName,
          pathName: pageData.pathName,
          fileName: pageData.fileName,
          icon: 'FileText',
          description: `Auto-generated page: ${pageData.name}`
        })
      });

      if (!response.ok) {
        const data = await response.json();
        // Don't throw error if link already exists, just log it
        if (data.detail && data.detail.includes('already exists')) {
          console.log('Link already exists, skipping...');
          return true;
        }
        throw new Error(data.detail || 'Failed to create link');
      }

      return true;
    } catch (error) {
      console.error('Error creating link:', error);
      // Don't fail the whole operation if link creation fails
      return false;
    }
  };

  // 🆕 NEW: Save page AND create link
  const savePageAndCreateLink = async (page) => {
    setSaving(true);
    try {
      // Step 1: Save page to folder
      const saved = await savePageToFolder(page.fileName, page.componentContent);
      if (!saved) return;

      // Step 2: Create link entry
      await createPageLink(page);

      setSuccess('✅ Page saved & link created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(`❌ Error: ${error.message}`);
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Create page (frontend only)
  const handleCreatePage = () => {
    if (!pageName.trim()) {
      setError('Please enter a page name');
      return;
    }

    const componentName = toComponentName(pageName);
    const pathName = toPath(pageName);
    const fileName = `${componentName}.js`;

    // Generate files
    const componentContent = generateComponentContent(componentName, pageName);

    const newPage = {
      id: Date.now(),
      name: pageName,
      componentName,
      pathName,
      fileName,
      componentContent,
      createdAt: new Date().toLocaleString()
    };

    setCreatedPages([...createdPages, newPage]);
    setSuccess(`✅ Page "${componentName}" generated successfully!`);
    
    setTimeout(() => {
      setSuccess('');
      setShowCreatePopup(false);
      setPageName('');
      setSelectedConfig('');
    }, 1500);
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white" style={{ height: '24px', paddingRight: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FolderPlus size={14} />
          <h2 className="m-0 text-xs font-semibold">Empty Page Creator 🚀</h2>
        </div>
        <button
          onClick={() => setShowCreatePopup(true)}
          style={{
            padding: '2px 12px',
            background: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 500,
            height: '18px',
            lineHeight: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Plus size={12} />
          Create Page
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-2.5 overflow-auto">
        {success && (
          <div style={{
            padding: '10px 12px',
            background: '#d1fae5',
            color: '#065f46',
            borderRadius: '6px',
            marginBottom: '12px',
            fontSize: '11px',
            fontWeight: '500',
            border: '1px solid #6ee7b7'
          }}>
            {success}
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 12px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '6px',
            marginBottom: '12px',
            fontSize: '11px',
            fontWeight: '500',
            border: '1px solid #fca5a5'
          }}>
            {error}
          </div>
        )}

        {createdPages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#9ca3af'
          }}>
            <FolderPlus size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>No pages created yet</p>
            <p style={{ fontSize: '11px' }}>Click "Create Page" to get started</p>
          </div>
        ) : (
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px',
              padding: '6px 8px',
              background: '#f3f4f6',
              borderRadius: '4px'
            }}>
              📦 Generated Pages ({createdPages.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {createdPages.map((page) => (
                <div
                  key={page.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '12px',
                    background: '#fafafa'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                        {page.componentName}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>
                        {page.createdAt}
                      </div>
                    </div>
                  </div>

                  {/* 🚀 BUTTONS WITH SAVE */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {/* SAVE BUTTON - Saves page AND creates link */}
                    <button
                      onClick={() => savePageAndCreateLink(page)}
                      disabled={saving}
                      style={{
                        padding: '6px 10px',
                        background: saving ? '#9ca3af' : '#8b5cf6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '500',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: saving ? 0.6 : 1
                      }}
                    >
                      <Save size={12} />
                      {saving ? 'Saving...' : 'Save & Create Link'}
                    </button>

                    {/* Download Component Button */}
                    <button
                      onClick={() => downloadFile(page.fileName, page.componentContent)}
                      style={{
                        padding: '6px 10px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Download size={12} />
                      Download Component
                    </button>

                    {/* Copy Component Button */}
                    <button
                      onClick={() => copyToClipboard(page.componentContent)}
                      style={{
                        padding: '6px 10px',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Copy size={12} />
                      Copy Code
                    </button>
                  </div>

                  {/* Info */}
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: '#f0f9ff',
                    borderRadius: '4px',
                    fontSize: '10px',
                    color: '#0c4a6e'
                  }}>
                    <div style={{ marginBottom: '3px' }}>
                      <strong>Path:</strong> <code>{page.pathName}</code>
                    </div>
                    <div>
                      <strong>File:</strong> <code>{page.fileName}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700" style={{ height: '8px' }} />

      {/* Create Page Popup */}
      {showCreatePopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            {/* Popup Header */}
            <div style={{
              background: 'linear-gradient(to right, #374151, #60a5fa)',
              color: 'white',
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} />
                Create New Empty Page
              </div>
              <button
                onClick={() => {
                  setShowCreatePopup(false);
                  setPageName('');
                  setSelectedConfig('');
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Popup Content */}
            <div style={{ padding: '20px' }}>
              {/* Page Name Input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Page Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                  placeholder="e.g., My New Page"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {pageName && (
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '6px', padding: '6px', background: '#f3f4f6', borderRadius: '3px' }}>
                    <div style={{ marginBottom: '2px' }}>
                      📦 Component: <span style={{ color: '#2563eb', fontWeight: '500' }}>{toComponentName(pageName)}</span>
                    </div>
                    <div style={{ marginBottom: '2px' }}>
                      🔗 Path: <span style={{ color: '#059669', fontWeight: '500' }}>{toPath(pageName)}</span>
                    </div>
                    <div>
                      📄 File: <span style={{ color: '#dc2626', fontWeight: '500' }}>{toComponentName(pageName)}.js</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div style={{
                padding: '12px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                fontSize: '10px',
                color: '#0c4a6e',
                marginBottom: '16px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>💡 How it works:</div>
                <div>1. Fill in the page name</div>
                <div>2. Click "Generate Files"</div>
                <div>3. Click "Save to Folder" button</div>
                <div>4. Your page is ready! 🎉</div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowCreatePopup(false);
                    setPageName('');
                    setSelectedConfig('');
                    setError('');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePage}
                  style={{
                    padding: '8px 16px',
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={14} />
                  Generate Files
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmptyPageCreator;
