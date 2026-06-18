import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, X, Search, Upload, Download, Save, 
  Trash2, Edit2, Eye, Copy, ChevronDown, ArrowRight,
  Package, DollarSign, Users, BarChart, Settings, Shield, 
  Building, Layers, Box, Award, Link2, RefreshCw, CheckCircle, 
  XCircle, AlertCircle, Loader, ExternalLink, FolderOpen,
  Move, ArrowRightLeft, ZoomIn
} from 'lucide-react';

const ConfigLinksCreator = () => {
  // State management
  const [showCreateConfigPopup, setShowCreateConfigPopup] = useState(false);
  const [showSelectConfigPopup, setShowSelectConfigPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showTransferPopup, setShowTransferPopup] = useState(false);
  const [showViewConfigPopup, setShowViewConfigPopup] = useState(false);
  
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [createdConfigs, setCreatedConfigs] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Pages state
  const [availablePages, setAvailablePages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [selectedPages, setSelectedPages] = useState([]);
  const [selectedConfigForAdd, setSelectedConfigForAdd] = useState(null);
  const [activeTab, setActiveTab] = useState('mapping');
  const [viewingConfig, setViewingConfig] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConfigPage, setSelectedConfigPage] = useState(1);
  const [selectedConfigSearch, setSelectedConfigSearch] = useState('');
  
  // Mapping state
  const [pageToConfigMap, setPageToConfigMap] = useState({});
  const [configToPageMap, setConfigToPageMap] = useState({});
  
  // Transfer state
  const [transferLink, setTransferLink] = useState(null);
  const [targetConfig, setTargetConfig] = useState('');
  
  // Edit state
  const [editingConfig, setEditingConfig] = useState(null);
  const [editContent, setEditContent] = useState('');
  
  // Live update state
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  // Pagination
  const ITEMS_PER_PAGE = 8;

  // API URLs
  const API_URL_PAGES = 'http://localhost:8000/api/pages';
  const API_URL_CONFIGS = 'http://localhost:8000/api/configs';
  const WS_URL = 'ws://localhost:8000/api/configs/ws';

  // Available icons
  const availableIcons = [
    { value: 'FileText', component: FileText, label: 'File Text' },
    { value: 'Plus', component: Plus, label: 'Plus' },
    { value: 'Package', component: Package, label: 'Package' },
    { value: 'DollarSign', component: DollarSign, label: 'Dollar Sign' },
    { value: 'Users', component: Users, label: 'Users' },
    { value: 'BarChart', component: BarChart, label: 'Bar Chart' },
    { value: 'Settings', component: Settings, label: 'Settings' },
    { value: 'Shield', component: Shield, label: 'Shield' },
    { value: 'Building', component: Building, label: 'Building' },
    { value: 'Layers', component: Layers, label: 'Layers' },
    { value: 'Box', component: Box, label: 'Box' },
    { value: 'Award', component: Award, label: 'Award' },
  ];

  // ==================== WebSocket Connection ====================
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectWebSocket = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };
      
      ws.onerror = () => {
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        setIsConnected(false);
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`🔄 Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            connectWebSocket();
          }, delay);
        }
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      setIsConnected(false);
    }
  };

  const handleWebSocketMessage = (message) => {
    setLastUpdate(new Date().toLocaleTimeString());
    console.log('📨 WebSocket message received:', message);
    
    switch (message.type) {
      case 'initial':
      case 'configs_updated':
        setCreatedConfigs(message.data);
        break;
        
      case 'config_created':
        setSuccess(`✅ Config "${message.data.displayName}" created!`);
        loadConfigs();
        loadMapping();
        break;
        
      case 'link_added':
        setSuccess(`✅ Link added to "${message.data.configFile}"!`);
        loadConfigs();
        loadMapping();
        break;
        
      case 'link_updated':
        setSuccess(`✅ Link updated in "${message.data.configFile}"!`);
        loadConfigs();
        loadMapping();
        break;
        
      case 'link_removed':
        setSuccess(`✅ Link removed from "${message.data.configFile}"!`);
        loadConfigs();
        loadMapping();
        break;
        
      case 'config_edited':
        setSuccess(`✅ Config "${message.data.fileName}" edited!`);
        loadConfigs();
        loadMapping();
        break;
        
      case 'config_deleted':
        setSuccess(`✅ Config "${message.data.fileName}" deleted!`);
        loadConfigs();
        loadMapping();
        break;
    }
    
    setTimeout(() => setSuccess(''), 3000);
  };

  // ==================== Load Data ====================
  useEffect(() => {
    loadPages();
    loadConfigs();
    loadMapping();
  }, []);

  const loadPages = async () => {
    try {
      setLoadingPages(true);
      const response = await fetch(`${API_URL_PAGES}/list-pages`);
      const data = await response.json();
      
      if (data.success && data.pages) {
        const formattedPages = data.pages.map(page => {
          const componentName = page.fileName.replace('.js', '').replace('.jsx', '');
          const pathName = componentName.toLowerCase();
          
          return {
            fileName: page.fileName,
            componentName: componentName,
            pageName: componentName,
            pathName: pathName,
            createdAt: page.createdAt,
            icon: 'FileText'
          };
        });
        
        setAvailablePages(formattedPages);
      }
    } catch (error) {
      console.error('Error loading pages:', error);
      setError('Failed to load pages');
    } finally {
      setLoadingPages(false);
    }
  };

  const loadConfigs = async () => {
    try {
      const response = await fetch(`${API_URL_CONFIGS}/list-configs`);
      const data = await response.json();
      
      if (data.success && data.configs) {
        setCreatedConfigs(data.configs);
      }
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  };

  const loadMapping = async () => {
    try {
      const response = await fetch(`${API_URL_CONFIGS}/list-configs`);
      const data = await response.json();
      
      if (data.success && data.configs) {
        const pageMap = {};
        const configMap = {};
        
        data.configs.forEach(config => {
          configMap[config.fileName] = config.linkDetails || [];
          
          (config.linkDetails || []).forEach(link => {
            pageMap[link.component] = {
              configFile: config.fileName,
              configName: config.displayName,
              linkDetails: link
            };
          });
        });
        
        setPageToConfigMap(pageMap);
        setConfigToPageMap(configMap);
      }
    } catch (error) {
      console.error('Error loading mapping:', error);
    }
  };

  // ==================== Handlers ====================
  const handleCreateConfig = async () => {
    if (!configName.trim()) {
      setError('Please enter a config name');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const response = await fetch(`${API_URL_CONFIGS}/create-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configName: configName,
          description: configDescription
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create config');
      }

      setSuccess(`✅ Config "${configName}" created successfully!`);
      setShowCreateConfigPopup(false);
      setConfigName('');
      setConfigDescription('');
      loadConfigs();
      loadMapping();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAddPagesToConfig = async () => {
    if (!selectedConfigForAdd || selectedPages.length === 0) {
      setError('Please select pages and a config file');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      for (const page of selectedPages) {
        const response = await fetch(`${API_URL_CONFIGS}/add-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            configFileName: selectedConfigForAdd,
            pageName: page.pageName,
            componentName: page.componentName,
            pathName: page.pathName,
            fileName: page.fileName,
            icon: page.icon,
            description: `Page: ${page.pageName}`
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || 'Failed to add link');
        }
      }

      setSuccess(`✅ ${selectedPages.length} page(s) added to config!`);
      setShowSelectConfigPopup(false);
      setSelectedPages([]);
      setSelectedConfigForAdd(null);
      loadConfigs();
      loadMapping();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleTransferLink = async () => {
    if (!transferLink || !targetConfig) {
      setError('Please select a target config');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      // Step 1: Add to new config
      const addResponse = await fetch(`${API_URL_CONFIGS}/add-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configFileName: targetConfig,
          pageName: transferLink.linkDetails.name,
          componentName: transferLink.linkDetails.component,
          pathName: transferLink.linkDetails.path,
          fileName: `${transferLink.linkDetails.component}.js`,
          icon: transferLink.linkDetails.icon,
          description: transferLink.linkDetails.description
        })
      });

      if (!addResponse.ok) {
        const data = await addResponse.json();
        throw new Error(data.detail || 'Failed to add link to new config');
      }

      // Step 2: Remove from old config
      const removeResponse = await fetch(
        `${API_URL_CONFIGS}/remove-link/${transferLink.configFile}/${encodeURIComponent(transferLink.linkDetails.name)}`,
        { method: 'DELETE' }
      );

      if (!removeResponse.ok) {
        const data = await removeResponse.json();
        throw new Error(data.detail || 'Failed to remove link from old config');
      }

      setSuccess(`✅ Link transferred successfully!`);
      setShowTransferPopup(false);
      setTransferLink(null);
      setTargetConfig('');
      loadConfigs();
      loadMapping();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRemoveLink = async (configFile, linkName) => {
    if (!window.confirm(`Remove "${linkName}" from config?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL_CONFIGS}/remove-link/${configFile}/${encodeURIComponent(linkName)}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to remove link');
      }

      setSuccess(`✅ Link removed successfully!`);
      loadConfigs();
      loadMapping();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleViewConfig = async (config) => {
    try {
      const response = await fetch(`${API_URL_CONFIGS}/view-config/${config.fileName}`);
      const data = await response.json();

      if (data.success) {
        setViewingConfig({
          fileName: config.fileName,
          content: data.content,
          linkCount: config.linkDetails?.length || 0
        });
        setShowViewConfigPopup(true);
      }
    } catch (error) {
      setError('Failed to load config content');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleEditConfig = async (config) => {
    try {
      const response = await fetch(`${API_URL_CONFIGS}/view-config/${config.fileName}`);
      const data = await response.json();

      if (data.success) {
        setEditingConfig(config);
        setEditContent(data.content);
        setShowEditPopup(true);
      }
    } catch (error) {
      setError('Failed to load config content');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingConfig) return;

    try {
      const response = await fetch(`${API_URL_CONFIGS}/edit-config/${editingConfig.fileName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to save changes');
      }

      setSuccess(`✅ Config saved successfully!`);
      setShowEditPopup(false);
      setEditingConfig(null);
      setEditContent('');
      loadConfigs();
      loadMapping();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const togglePageSelection = (page) => {
    setSelectedPages(prev => {
      const isSelected = prev.some(p => p.fileName === page.fileName);
      if (isSelected) {
        return prev.filter(p => p.fileName !== page.fileName);
      } else {
        return [...prev, page];
      }
    });
  };

  // ==================== MODIFIED: Filter configs to only show those with links ====================
  // Filter to only show configs that have at least one link
  const configsWithLinks = createdConfigs.filter(config => {
    const links = configToPageMap[config.fileName] || [];
    return links.length > 0;
  });

  // Filtered and paginated data
  const filteredPages = availablePages.filter(page => 
    page.pageName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredConfigs = configsWithLinks.filter(config =>
    config.displayName.toLowerCase().includes(selectedConfigSearch.toLowerCase())
  );

  const paginatedConfigs = filteredConfigs.slice(
    (selectedConfigPage - 1) * ITEMS_PER_PAGE,
    selectedConfigPage * ITEMS_PER_PAGE
  );

  const totalConfigPages = Math.ceil(filteredConfigs.length / ITEMS_PER_PAGE);

  // Get page's config info
  const getPageConfig = (componentName) => {
    return pageToConfigMap[componentName];
  };

  // ==================== Render ====================
  return (
    <div style={{ width: '100%', height: '100%', background: 'white', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #d1d5db', background: 'linear-gradient(to right, #374151, #60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link2 size={14} color="white" />
          <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'white' }}>Config Links Manager</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isConnected && (
            <div style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              background: '#036a16ff',
              boxShadow: '0 0 8px rgba(3, 103, 12, 0.6)'
            }} />
          )}
          <button
            onClick={() => setShowCreateConfigPopup(true)}
            style={{
              padding: '6px 12px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={14} />
            New Config File
          </button>
        </div>
      </div>

      {/* Tabs - REMOVED: Config Files tab */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <button
          style={{
            padding: '6px 12px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 500,
            cursor: 'default'
          }}
        >
          Page Mapping
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div style={{ margin: '8px 16px', padding: '8px 12px', background: '#d1fae5', border: '1px solid #10b981', borderRadius: 4, fontSize: 11, color: '#047857' }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ margin: '8px 16px', padding: '8px 12px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: 4, fontSize: 11, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Content Area - Only Page Mapping */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div>
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => {
                  if (selectedPages.length === 0) {
                    setError('Please select at least one page');
                    setTimeout(() => setError(''), 3000);
                    return;
                  }
                  setShowSelectConfigPopup(true);
                }}
                disabled={selectedPages.length === 0}
                style={{
                  padding: '6px 12px',
                  background: selectedPages.length > 0 ? '#3b82f6' : '#e5e7eb',
                  color: selectedPages.length > 0 ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: selectedPages.length > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Link2 size={14} />
                Add to Config ({selectedPages.length})
              </button>
              <button
                onClick={() => {
                  loadPages();
                  loadConfigs();
                  loadMapping();
                }}
                style={{
                  padding: '6px 12px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="Search pages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 6px 6px 32px',
                    border: '1px solid #d1d5db',
                    borderRadius: 4,
                    fontSize: 11,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Pages Table */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e5e7eb', width: 40 }}>
                      <input
                        type="checkbox"
                        checked={selectedPages.length === filteredPages.length && filteredPages.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPages(filteredPages);
                          } else {
                            setSelectedPages([]);
                          }
                        }}
                        style={{ width: 13, height: 13 }}
                      />
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e5e7eb', color: '#000000' }}>Page Name</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e5e7eb', color: '#000000' }}>Component</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e5e7eb', color: '#000000' }}>Config File</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid #e5e7eb', color: '#000000' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPages ? (
                    <tr>
                      <td colSpan="5" style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                        <Loader className="animate-spin" size={24} style={{ margin: '0 auto' }} />
                        <div style={{ marginTop: 8 }}>Loading pages...</div>
                      </td>
                    </tr>
                  ) : filteredPages.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                        No pages found
                      </td>
                    </tr>
                  ) : (
                    filteredPages.map((page, index) => {
                      const pageConfig = getPageConfig(page.componentName);
                      return (
                        <tr key={page.fileName} style={{ borderBottom: index < filteredPages.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              type="checkbox"
                              checked={selectedPages.some(p => p.fileName === page.fileName)}
                              onChange={() => togglePageSelection(page)}
                              style={{ width: 13, height: 13 }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 500 }}>{page.pageName}</td>
                          <td style={{ padding: '8px 12px', color: '#6b7280' }}>{page.componentName}</td>
                          <td style={{ padding: '8px 12px' }}>
                            {pageConfig ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ 
                                  padding: '2px 8px', 
                                  background: '#dbeafe', 
                                  color: '#1e40af', 
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 500
                                }}>
                                  {pageConfig.configName}
                                </span>
                                <button
                                  onClick={() => {
                                    setTransferLink(pageConfig);
                                    setShowTransferPopup(true);
                                  }}
                                  style={{
                                    padding: '2px 6px',
                                    background: '#fef3c7',
                                    color: '#92400e',
                                    border: 'none',
                                    borderRadius: 3,
                                    fontSize: 9,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3
                                  }}
                                  title="Transfer to another config"
                                >
                                  <ArrowRightLeft size={10} />
                                  Move
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: 10 }}>Not linked</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {pageConfig && (
                              <button
                                onClick={() => handleRemoveLink(pageConfig.configFile, pageConfig.linkDetails.name)}
                                style={{
                                  padding: '4px 8px',
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: 3,
                                  fontSize: 10,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <Trash2 size={10} />
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {/* Footer */}
      <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8 }} />

      {/* Create Config Popup */}
      {showCreateConfigPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: 8, width: '90%', maxWidth: 500, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: 'white', padding: '12px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={16} />
                Create New Config File
              </div>
              <button
                onClick={() => {
                  setShowCreateConfigPopup(false);
                  setConfigName('');
                  setConfigDescription('');
                }}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Config Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  placeholder="e.g., Admin "
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, outline: 'none', boxSizing: 'border-box', color: '#000000' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Description (Optional)
                </label>
                <textarea
                  value={configDescription}
                  onChange={(e) => setConfigDescription(e.target.value)}
                  placeholder="Brief description of the config file..."
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: '#000000' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    setShowCreateConfigPopup(false);
                    setConfigName('');
                    setConfigDescription('');
                  }}
                  style={{ flex: 1, padding: '8px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer', color: '#374151' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateConfig}
                  disabled={!configName.trim()}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    background: configName.trim() ? '#10b981' : '#e5e7eb',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: configName.trim() ? 'pointer' : 'not-allowed',
                    color: configName.trim() ? 'white' : '#9ca3af'
                  }}
                >
                  Create Config
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Select Config Popup */}
      {showSelectConfigPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: 8, width: '90%', maxWidth: 500, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: 'white', padding: '12px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link2 size={16} />
                Add {selectedPages.length} Page(s) to Config
              </div>
              <button
                onClick={() => {
                  setShowSelectConfigPopup(false);
                  setSelectedConfigForAdd(null);
                }}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Select Config File <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={selectedConfigForAdd || ''}
                  onChange={(e) => setSelectedConfigForAdd(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="">-- Select a config file --</option>
                  {createdConfigs.map((config) => (
                    <option key={config.fileName} value={config.fileName}>
                      {config.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ padding: 12, background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 6, marginBottom: 16, fontSize: 10, color: '#0c4a6e' }}>
                <strong>Selected Pages:</strong>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: 20 }}>
                  {selectedPages.map(page => (
                    <li key={page.fileName}>{page.pageName}</li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    setShowSelectConfigPopup(false);
                    setSelectedConfigForAdd(null);
                  }}
                  style={{ flex: 1, padding: '8px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer', color: '#374151' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPagesToConfig}
                  disabled={!selectedConfigForAdd}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    background: selectedConfigForAdd ? '#3b82f6' : '#e5e7eb',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: selectedConfigForAdd ? 'pointer' : 'not-allowed',
                    color: selectedConfigForAdd ? 'white' : '#9ca3af'
                  }}
                >
                  Add to Config
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Link Popup */}
      {showTransferPopup && transferLink && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: 8, width: '90%', maxWidth: 500, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: 'white', padding: '12px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowRightLeft size={16} />
                Transfer Link
              </div>
              <button
                onClick={() => {
                  setShowTransferPopup(false);
                  setTransferLink(null);
                  setTargetConfig('');
                }}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16, padding: 12, background: '#fef3c7', border: '1px solid #fde047', borderRadius: 6 }}>
                <p style={{ fontSize: 11, fontWeight: 600, margin: '0 0 4px 0', color: '#78350f' }}>Current Location:</p>
                <p style={{ fontSize: 11, margin: 0, color: '#92400e' }}>
                  {transferLink.configName} → {transferLink.linkDetails.name}
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Move to Config File <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={targetConfig}
                  onChange={(e) => setTargetConfig(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="">-- Select target config --</option>
                  {createdConfigs
                    .filter(config => config.fileName !== transferLink.configFile)
                    .map((config) => (
                      <option key={config.fileName} value={config.fileName}>
                        {config.displayName}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ padding: 12, background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 6, marginBottom: 16, fontSize: 10, color: '#0c4a6e' }}>
                <strong>Note:</strong> This will remove the link from {transferLink.configName} and add it to the selected config file.
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    setShowTransferPopup(false);
                    setTransferLink(null);
                    setTargetConfig('');
                  }}
                  style={{ flex: 1, padding: '8px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer', color: '#374151' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferLink}
                  disabled={!targetConfig}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    background: targetConfig ? '#f59e0b' : '#e5e7eb',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: targetConfig ? 'pointer' : 'not-allowed',
                    color: targetConfig ? 'white' : '#9ca3af'
                  }}
                >
                  Transfer Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Config Popup */}
      {showEditPopup && editingConfig && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: 8, width: '90%', maxWidth: 800, maxHeight: '80vh', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: 'white', padding: '12px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div>Edit Config</div>
                <div style={{ fontSize: 10, opacity: 0.9, marginTop: 2 }}>{editingConfig.fileName}</div>
              </div>
              <button
                onClick={() => {
                  setShowEditPopup(false);
                  setEditingConfig(null);
                  setEditContent('');
                }}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: 400,
                  padding: 12,
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'none'
                }}
                spellCheck="false"
              />
            </div>

            <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  setShowEditPopup(false);
                  setEditingConfig(null);
                  setEditContent('');
                }}
                style={{ flex: 1, padding: '8px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer', color: '#374151' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                style={{ flex: 1, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Config Popup */}
      {showViewConfigPopup && viewingConfig && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: 8, width: '90%', maxWidth: 800, maxHeight: '80vh', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: 'white', padding: '12px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div>{viewingConfig.fileName}</div>
                <div style={{ fontSize: 10, opacity: 0.9, marginTop: 2 }}>{viewingConfig.linkCount} link(s)</div>
              </div>
              <button
                onClick={() => setShowViewConfigPopup(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              <pre style={{ background: '#f9fafb', padding: 12, borderRadius: 4, fontSize: 10, overflow: 'auto', margin: 0 }}>
                <code>{viewingConfig.content}</code>
              </pre>
            </div>

            <div style={{ padding: 16, borderTop: '1px solid #e5e7eb' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(viewingConfig.content);
                  setSuccess('✅ Content copied to clipboard!');
                  setTimeout(() => setSuccess(''), 2000);
                }}
                style={{ width: '100%', padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Copy size={14} />
                Copy Content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigLinksCreator;
