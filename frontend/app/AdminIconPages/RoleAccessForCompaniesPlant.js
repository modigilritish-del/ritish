import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Building, Users, Briefcase, Award, FileText, Plus, Save, Trash2, Eye,
  Check, X, Search, ChevronDown, ChevronRight, AlertCircle, CheckCircle, RefreshCw,
  Database, XCircle, GitBranch, ArrowRight, Layers, GripVertical, Link2, Link2Off,
  Info, Terminal, FolderOpen, Folder, ChevronLeft
} from 'lucide-react';
import { getAllPagesForSync } from '../config/PageLinksConfig';

const API_BASE = 'http://localhost:8000/api';

// ══════════════════════════════════════════════════════════════════════════════
// VS CODE DESIGN TOKENS
// ══════════════════════════════════════════════════════════════════════════════
const VS = {
  bg:          '#1e1e1e',
  sidebar:     '#252526',
  panel:       '#1e1e1e',
  input:       '#3c3c3c',
  border:      '#3e3e42',
  borderLight: '#454545',
  accent:      '#0078d4',
  accentHov:   '#1184db',
  accentLight: '#004578',
  green:       '#4ec9b0',
  greenDim:    '#1d4a42',
  red:         '#f44747',
  redDim:      '#4a1d1d',
  yellow:      '#dcdcaa',
  yellowDim:   '#3a3210',
  purple:      '#c586c0',
  purpleDim:   '#3a1f3a',
  blue:        '#569cd6',
  blueDim:     '#1a3050',
  orange:      '#ce9178',
  text:        '#d4d4d4',
  textDim:     '#858585',
  textMuted:   '#6a6a6a',
  textBright:  '#e8e8e8',
  tabBg:       '#2d2d2d',
  tabActive:   '#1e1e1e',
  lineH:       '#2a2a2a',
  lineHBorder: '#0078d4',
  badge:       '#0078d4',
  checkOn:     '#4ec9b0',
};

// ══════════════════════════════════════════════════════════════════════════════
// ICON RENDERER
// ══════════════════════════════════════════════════════════════════════════════
const renderPageIcon = (iconName, size = 12, color = VS.blue) => {
  const iconMap = {
    Shield, Building, Users, Briefcase, Award, FileText, Database,
    Layers, GitBranch, Eye, Search, Plus, Save, Check, RefreshCw,
    shield: Shield, building: Building, building2: Building, users: Users,
    user: Users, briefcase: Briefcase, award: Award, 'file-text': FileText,
    filetext: FileText, database: Database, layers: Layers,
    'git-branch': GitBranch, eye: Eye, search: Search, plus: Plus,
    save: Save, check: Check, 'refresh-cw': RefreshCw, link2: Link2,
    info: Info, 'x-circle': XCircle, 'alert-circle': AlertCircle,
    'check-circle': CheckCircle, 'arrow-right': ArrowRight,
    'chevron-down': ChevronDown, 'chevron-right': ChevronRight,
    'grip-vertical': GripVertical, x: X,
  };
  const key = (iconName || '').toLowerCase().replace(/\s/g, '-');
  const IconComp = iconMap[key] || iconMap[iconName] || FileText;
  return <IconComp size={size} style={{ color, flexShrink: 0 }} />;
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const RoleAccessForCompaniesPlant = ({ embeddedMode = false }) => {
  const [activeTab, setActiveTab] = useState('grant-access');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [revoking, setRevoking] = useState(null);

  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [pages, setPages] = useState([]);

  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [selectedPages, setSelectedPages] = useState({});

  const [grantedAccess, setGrantedAccess] = useState([]);
  const [expandedModules, setExpandedModules] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [viewSearchTerm, setViewSearchTerm] = useState('');

  // Hierarchy state
  const MULTI_HIER_KEY = 'rbac_multi_hierarchies';
  const MULTI_HIER_META_KEY = 'rbac_multi_hierarchies_meta';
  const DEFAULT_HIER_NAME = 'Default';

  const [allHierarchies, setAllHierarchies] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MULTI_HIER_KEY) || 'null');
      if (saved) return saved;
      const old = JSON.parse(localStorage.getItem('rbac_page_hierarchy') || '{}');
      return { [DEFAULT_HIER_NAME]: old };
    } catch { return { [DEFAULT_HIER_NAME]: {} }; }
  });
  const [activeHierName, setActiveHierName] = useState(DEFAULT_HIER_NAME);

  const [hierCompany, setHierCompany] = useState('');
  const [hierRole, setHierRole] = useState('');
  const [dbHierarchies, setDbHierarchies] = useState([]);
  const [dbSaving, setDbSaving] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(null);
  const [restoreLogs, setRestoreLogs] = useState([]);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [dbMsg, setDbMsg] = useState(null);
  const [activeDbHierarchyId, setActiveDbHierarchyId] = useState(null);
  const [grantAccessDbHierarchy, setGrantAccessDbHierarchy] = useState(null);
  const [showNewHierInput, setShowNewHierInput] = useState(false);
  const [newHierName, setNewHierName] = useState('');

  const [allHierarchiesMeta, setAllHierarchiesMeta] = useState(() => {
    try { return JSON.parse(localStorage.getItem(MULTI_HIER_META_KEY) || '{}'); } catch { return {}; }
  });

  const saveHierarchyMeta = (name, iconLabel) => {
    setAllHierarchiesMeta(prev => {
      const updated = { ...prev, [name]: { iconLabel } };
      try { localStorage.setItem(MULTI_HIER_META_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const [hierSearchTerm, setHierSearchTerm] = useState('');
  const [hierExpandedNodes, setHierExpandedNodes] = useState({});
  const [hierDragSource, setHierDragSource] = useState(null);
  const [hierDragOver, setHierDragOver] = useState(null);
  const [hierMsg, setHierMsg] = useState(null);
  const [hierSelectParent, setHierSelectParent] = useState(null);
  const [availSearchTerm, setAvailSearchTerm] = useState('');
  const [hierIconFilter, setHierIconFilter] = useState(null);

  const [showAddPage, setShowAddPage] = useState(false);
  const [newPage, setNewPage] = useState({ page_name: '', page_url: '', icon_name: '', description: '' });

  const DEP_KEY = 'rbac_page_dependencies';
  const [pageDependencies, setPageDependencies] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DEP_KEY) || '{}'); } catch { return {}; }
  });
  const [showDepModal, setShowDepModal] = useState(null);
  const [depSearchTerm, setDepSearchTerm] = useState('');
  const [showChildPagesModal, setShowChildPagesModal] = useState(null); // { rootPageId, rootPageName, children: [{page, depth}] }
  const [excludedChildPages, setExcludedChildPages] = useState({}); // { [rootPageId]: Set<childPageId> }

  const hierarchy = allHierarchies[activeHierName] || {};

  const setHierarchy = (updaterOrValue) => {
    setAllHierarchies(prev => {
      const current = prev[activeHierName] || {};
      const newHier = typeof updaterOrValue === 'function' ? updaterOrValue(current) : updaterOrValue;
      const updated = { ...prev, [activeHierName]: newHier };
      try { localStorage.setItem(MULTI_HIER_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const clearHierarchyFromStorage = () => {
    try {
      localStorage.removeItem(MULTI_HIER_KEY);
      localStorage.removeItem('rbac_page_hierarchy');
      localStorage.removeItem(MULTI_HIER_META_KEY);
    } catch {}
    setAllHierarchies({ [DEFAULT_HIER_NAME]: {} });
    setAllHierarchiesMeta({});
    setActiveHierName(DEFAULT_HIER_NAME);
    setHierMsg({ type: 'success', text: 'Hierarchy deleted from localStorage!' });
  };

  const savePageDeps = (newDeps) => {
    setPageDependencies(newDeps);
    try { localStorage.setItem(DEP_KEY, JSON.stringify(newDeps)); } catch {}
  };
  const addDependency = (pageId, depPageId) => {
    const pid = parseInt(pageId), did = parseInt(depPageId);
    if (pid === did) return;
    const current = pageDependencies[pid] || [];
    if (current.includes(did)) return;
    savePageDeps({ ...pageDependencies, [pid]: [...current, did] });
  };
  const removeDependency = (pageId, depPageId) => {
    const pid = parseInt(pageId), did = parseInt(depPageId);
    const current = pageDependencies[pid] || [];
    savePageDeps({ ...pageDependencies, [pid]: current.filter(id => id !== did) });
  };

  const getModuleNameFromUrl = (pageUrl) => {
    if (!pageUrl) return 'Other';
    const parts = pageUrl.replace(/^\//, '').split('/');
    if (parts.length === 0) return 'Other';
    return parts[0].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // ── INITIAL LOAD ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCompanies(); fetchRoles(); fetchDepartments(); fetchDesignations(); fetchPages();
  }, []);

  useEffect(() => {
    if (selectedCompany && selectedRole && selectedDepartment && selectedDesignation) fetchGrantedAccess();
  }, [selectedCompany, selectedRole, selectedDepartment, selectedDesignation]);

  useEffect(() => {
    const loadGrantAccessHierarchy = async () => {
      if (!selectedCompany || !selectedRole) { setGrantAccessDbHierarchy(null); return; }
      setGrantAccessDbHierarchy(null);
      try {
        const res = await fetch(`${API_BASE}/rbac/hierarchy/list?company_id=${selectedCompany}&role_id=${selectedRole}`);
        if (!res.ok) { setGrantAccessDbHierarchy(null); return; }
        const list = await res.json();
        if (!list || list.length === 0) { setGrantAccessDbHierarchy(null); return; }
        const rawBlob = list[0].blob;
        if (!rawBlob || Object.keys(rawBlob).length === 0) { setGrantAccessDbHierarchy(null); return; }
        const normalised = {};
        Object.entries(rawBlob).forEach(([k, v]) => {
          normalised[String(k)] = { parentId: v.parentId !== undefined ? v.parentId : null, children: (v.children || []).map(c => parseInt(c)) };
        });
        setGrantAccessDbHierarchy(normalised);
      } catch { setGrantAccessDbHierarchy(null); }
    };
    loadGrantAccessHierarchy();
  }, [selectedCompany, selectedRole]);

  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(null), 4000); return () => clearTimeout(t); }
  }, [message]);

  // ── FETCH FUNCTIONS ───────────────────────────────────────────────────────
  const autoSyncPages = async () => {
    setSyncing(true); setMessage(null);
    try {
      const allPages = getAllPagesForSync();
      if (allPages.length === 0) { setMessage({ type: 'error', text: 'No pages in PageLinksConfig.js' }); return; }
      const res = await fetch(`${API_BASE}/rbac/sync-pages`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(allPages) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      setMessage({ type: 'success', text: `Sync done! Created: ${result.created}, Updated: ${result.updated}` });
      setTimeout(() => fetchPages(), 1000);
    } catch (err) {
      setMessage({ type: 'error', text: `Sync failed: ${err.message}` });
    } finally { setSyncing(false); }
  };

  const fetchCompanies = async () => {
    try { const res = await fetch(`${API_BASE}/companies-for-plant`); setCompanies(await res.json()); } catch {}
  };
  const fetchRoles = async () => {
    try { const res = await fetch(`${API_BASE}/roles`); setRoles(await res.json()); } catch {}
  };
  const fetchDepartments = async () => {
    try { const res = await fetch(`${API_BASE}/departments`); setDepartments(await res.json()); } catch {}
  };
  const fetchDesignations = async () => {
    try { const res = await fetch(`${API_BASE}/designations`); setDesignations(await res.json()); } catch {}
  };
  const fetchPages = async () => {
    try {
      const res = await fetch(`${API_BASE}/rbac/pages`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const pagesWithPermissions = await Promise.all(data.map(async (page) => {
        try {
          const permRes = await fetch(`${API_BASE}/rbac/pages/${page.id}/permissions`);
          return { ...page, permissions: await permRes.json() };
        } catch { return { ...page, permissions: [] }; }
      }));
      setPages(pagesWithPermissions);
    } catch { setPages([]); }
  };
  const fetchGrantedAccess = async () => {
    try {
      const res = await fetch(`${API_BASE}/rbac/access-by-role?company_id=${selectedCompany}&role_id=${selectedRole}&department_id=${selectedDepartment}&designation_id=${selectedDesignation}`);
      const data = await res.json();
      const grouped = {};
      data.forEach((item) => {
        if (!grouped[item.page_id]) grouped[item.page_id] = { page_id: item.page_id, page_name: item.page_name, page_url: item.page_url, permissions: [] };
        grouped[item.page_id].permissions.push({ permission_id: item.permission_id, permission_type: item.permission_type, access_id: item.access_id });
      });
      setGrantedAccess(Object.values(grouped));
      const preSelected = {};
      Object.values(grouped).forEach((item) => { preSelected[item.page_id] = item.permissions.map(p => p.permission_id); });
      setSelectedPages(preSelected);
    } catch { setGrantedAccess([]); }
  };

  // ── HIERARCHY HELPERS ─────────────────────────────────────────────────────
  const collectAllDescendants = useCallback((rootPageId, hier) => {
    const h = hier || grantAccessDbHierarchy || hierarchy;
    const result = [];
    const visit = (pid) => {
      const node = h[pid] || h[String(pid)];
      const excluded = excludedChildPages[rootPageId] || new Set();
      const children = node?.children || [];
      children.forEach(cid => {
        const cidInt = parseInt(cid);
        if (excluded.has(cidInt)) return;
        result.push(cidInt); visit(cidInt);
      });
    };
    visit(parseInt(rootPageId));
    return result;
  }, [hierarchy, grantAccessDbHierarchy, excludedChildPages]);

  const getPermissionIdByType = (targetPage, permType) => {
    if (!targetPage?.permissions) return null;
    const match = targetPage.permissions.find(p => p.permission_type === permType);
    return match ? match.id : null;
  };

  const handlePagePermissionToggle = (pageId, permissionId) => {
    setSelectedPages((prev) => {
      const current = prev[pageId] || [];
      const updated = current.includes(permissionId) ? current.filter(id => id !== permissionId) : [...current, permissionId];
      const newState = { ...prev, [pageId]: updated };
      const activeHier = grantAccessDbHierarchy || hierarchy;
      const node = activeHier[pageId] || activeHier[String(pageId)];
      if (node && !node.parentId) {
        const descendants = collectAllDescendants(pageId);
        const rootPage = pages.find(p => p.id === parseInt(pageId));
        const toggledPerm = rootPage?.permissions?.find(p => p.id === permissionId);
        if (toggledPerm) {
          const isAdding = updated.includes(permissionId);
          descendants.forEach(childId => {
            const childPage = pages.find(p => p.id === childId);
            const childPermId = getPermissionIdByType(childPage, toggledPerm.permission_type);
            if (childPermId) {
              const childCurrent = newState[childId] || [];
              if (isAdding && !childCurrent.includes(childPermId)) newState[childId] = [...childCurrent, childPermId];
              else if (!isAdding) newState[childId] = childCurrent.filter(id => id !== childPermId);
            }
          });
        }
      }
      return newState;
    });
  };

  const handleSelectAllPermissions = (pageId, permissions) => {
    const allIds = permissions.map(p => p.id);
    setSelectedPages(prev => {
      const newState = { ...prev, [pageId]: allIds };
      const activeHier = grantAccessDbHierarchy || hierarchy;
      const node = activeHier[pageId] || activeHier[String(pageId)];
      if (node && !node.parentId) {
        const descendants = collectAllDescendants(pageId);
        descendants.forEach(childId => {
          const childPage = pages.find(p => p.id === childId);
          if (childPage?.permissions) newState[childId] = childPage.permissions.map(p => p.id);
        });
      }
      return newState;
    });
  };

  const handleDeselectAllPermissions = (pageId) => {
    setSelectedPages(prev => {
      const newState = { ...prev, [pageId]: [] };
      const activeHier = grantAccessDbHierarchy || hierarchy;
      const node = activeHier[pageId] || activeHier[String(pageId)];
      if (node && !node.parentId) { const descendants = collectAllDescendants(pageId); descendants.forEach(childId => { newState[childId] = []; }); }
      return newState;
    });
  };

  const handleGrantAccess = async () => {
    if (!selectedCompany || !selectedRole || !selectedDepartment || !selectedDesignation) {
      setMessage({ type: 'error', text: 'Select Company, Role, Department, and Designation' }); return;
    }
    const pagePermissions = Object.entries(selectedPages).filter(([_, p]) => p.length > 0).map(([pageId, permissionIds]) => ({ page_id: parseInt(pageId), permission_ids: permissionIds }));
    if (pagePermissions.length === 0) { setMessage({ type: 'error', text: 'Select at least one permission' }); return; }
    setLoading(true);
    const formData = new FormData();
    formData.append('company_id', selectedCompany); formData.append('role_id', selectedRole);
    formData.append('department_id', selectedDepartment); formData.append('designation_id', selectedDesignation);
    formData.append('page_permissions_json', JSON.stringify(pagePermissions));
    try {
      const res = await fetch(`${API_BASE}/rbac/grant-access`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) { setMessage({ type: 'success', text: `Access granted! Created: ${data.created}, Updated: ${data.updated}` }); fetchGrantedAccess(); }
      else setMessage({ type: 'error', text: data.detail || 'Error granting access' });
    } catch { setMessage({ type: 'error', text: 'Error granting access' }); }
    finally { setLoading(false); }
  };

  const handleAutoGrantNewPages = async () => {
    if (!selectedCompany || !selectedRole || !selectedDepartment || !selectedDesignation) {
      setMessage({ type: 'error', text: 'Please select Company, Role, Department, and Designation first' });
      return;
    }
    const compName = companies.find(c => c.id === parseInt(selectedCompany))?.company_name || 'selected company';
    const roleName = roles.find(r => r.id === parseInt(selectedRole))?.role_name || 'selected role';
    if (!window.confirm(`Automatically grant all new synced pages for "${compName} › ${roleName}"?\n\nThis will only grant pages that have not been assigned to this role yet.`)) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('company_id', selectedCompany);
    formData.append('role_id', selectedRole);
    formData.append('department_id', selectedDepartment);
    formData.append('designation_id', selectedDesignation);
    try {
      const res = await fetch(`${API_BASE}/rbac/auto-grant-synced-pages`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        if (data.new_pages_granted === 0) {
          setMessage({ type: 'success', text: `No new pages found — all pages are already granted.` });
        } else {
          setMessage({ type: 'success', text: `✅ Auto-grant done! ${data.new_pages_granted} new pages, ${data.auto_granted_count} permissions granted. Pages: ${(data.pages || []).slice(0, 5).join(', ')}${data.pages.length > 5 ? ` +${data.pages.length - 5} more` : ''}` });
        }
        fetchGrantedAccess();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Auto-grant failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Auto-grant network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (accessId, pageName, permissionType) => {
    if (!window.confirm(`Revoke "${permissionType}" for "${pageName}"?`)) return;
    setRevoking(accessId);
    try {
      const res = await fetch(`${API_BASE}/rbac/revoke-access/${accessId}`, { method: 'DELETE' });
      if (res.ok) { setMessage({ type: 'success', text: `Revoked "${permissionType}" for "${pageName}"` }); fetchGrantedAccess(); window.dispatchEvent(new CustomEvent('rbac-access-changed')); }
      else { const data = await res.json(); setMessage({ type: 'error', text: data.detail || 'Error revoking' }); }
    } catch { setMessage({ type: 'error', text: 'Error revoking access' }); }
    finally { setRevoking(null); }
  };

  const handleRevokeAllPermissionsForPage = async (pageId, pageName, permissions) => {
    const activeHier = grantAccessDbHierarchy || hierarchy;
    const node = activeHier[pageId] || activeHier[String(pageId)];
    const isRoot = node && !node.parentId;
    const childIds = isRoot ? collectAllDescendants(pageId) : [];
    const confirmMsg = childIds.length > 0 ? `Revoke ALL permissions for "${pageName}" and its ${childIds.length} child page(s)?` : `Revoke ALL ${permissions.length} permissions for "${pageName}"?`;
    if (!window.confirm(confirmMsg)) return;
    setRevoking(`page_${pageId}`);
    const allPageIds = [pageId, ...childIds];
    const allPermsToRevoke = [];
    allPageIds.forEach(pid => { const entry = grantedAccess.find(g => g.page_id === pid); if (entry) entry.permissions.forEach(p => allPermsToRevoke.push(p.access_id)); });
    try {
      let successCount = 0, failCount = 0;
      for (const aid of allPermsToRevoke) { try { const r = await fetch(`${API_BASE}/rbac/revoke-access/${aid}`, { method: 'DELETE' }); if (r.ok) successCount++; else failCount++; } catch { failCount++; } }
      if (successCount > 0) { setMessage({ type: 'success', text: `Revoked ${successCount} permission(s)${childIds.length > 0 ? ` + ${childIds.length} child pages` : ''}` }); fetchGrantedAccess(); window.dispatchEvent(new CustomEvent('rbac-access-changed')); }
      else setMessage({ type: 'error', text: `Failed to revoke` });
    } catch { setMessage({ type: 'error', text: 'Error revoking permissions' }); }
    finally { setRevoking(null); }
  };

  const handleAddNewPage = async () => {
    if (!newPage.page_name || !newPage.page_url) { alert('Page name and URL required'); return; }
    const formData = new FormData();
    formData.append('page_name', newPage.page_name); formData.append('page_url', newPage.page_url);
    formData.append('icon_name', newPage.icon_name); formData.append('description', newPage.description);
    formData.append('display_order', 0);
    try {
      const res = await fetch(`${API_BASE}/rbac/pages`, { method: 'POST', body: formData });
      if (res.ok) {
        const createdPage = await res.json();
        for (const permType of ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT']) {
          const pfd = new FormData(); pfd.append('permission_type', permType);
          await fetch(`${API_BASE}/rbac/pages/${createdPage.id}/permissions`, { method: 'POST', body: pfd });
        }
        setShowAddPage(false); setNewPage({ page_name: '', page_url: '', icon_name: '', description: '' }); fetchPages();
      } else { const data = await res.json(); alert(data.detail || 'Error adding page'); }
    } catch { alert('Error adding page'); }
  };

  // ── GROUPED PAGES ─────────────────────────────────────────────────────────
  const groupPagesByModule = (pagesList, dbHier) => {
    const grouped = {};
    const pageById = {};
    pagesList.forEach(p => { pageById[p.id] = p; });
    const pageToHierTabs = {}; // tracks which pages are claimed by a hierarchy

    const collectChildren = (rootPageId, pageId, hierData, depth) => {
      const d = depth || 1;
      const result = [];
      const node = hierData[pageId] || hierData[String(pageId)];
      if (!node) return result;
      const excluded = excludedChildPages[rootPageId] || new Set();
      (node.children || []).forEach(cid => {
        const cidInt = parseInt(cid);
        if (excluded.has(cidInt)) return;
        const child = pageById[cidInt];
        if (child) {
          result.push({ page: child, depth: d });
          collectChildren(rootPageId, cidInt, hierData, d + 1).forEach(gc => result.push(gc));
        }
      });
      return result;
    };

    // ── STEP 1: Always render ALL local hierarchies as named folder groups ──
    // Each hierarchy in allHierarchies gets its own group using iconLabel as the name.
    // This ensures every hierarchy created in Page Hierarchy tab always appears here.
    Object.entries(allHierarchies).forEach(([hierName, hierData]) => {
      if (!hierData || Object.keys(hierData).length === 0) return;
      const iconLabel = allHierarchiesMeta[hierName]?.iconLabel || hierName;

      // Mark every page in this hierarchy (roots + all descendants) as claimed
      Object.keys(hierData).forEach(idStr => {
        const pid = parseInt(idStr);
        pageToHierTabs[pid] = true;
        const markDesc = (id) => {
          const n = hierData[id] || hierData[String(id)];
          if (!n) return;
          (n.children || []).forEach(cid => { pageToHierTabs[parseInt(cid)] = true; markDesc(parseInt(cid)); });
        };
        markDesc(pid);
      });

      // Add root pages as parent groups with their children
      Object.entries(hierData).forEach(([id]) => {
        const pageId = parseInt(id);
        const node = hierData[pageId] || hierData[id];
        if (!node || node.parentId) return; // only roots
        const page = pageById[pageId];
        if (!page) return;
        if (!grouped[iconLabel]) grouped[iconLabel] = [];
        if (!grouped[iconLabel].find(e => e._isParentGroup && e._rootPage.id === pageId)) {
          grouped[iconLabel].push({ _isParentGroup: true, _rootPage: page, _children: collectChildren(pageId, pageId, hierData) });
        }
      });
    });

    // ── STEP 2: Also apply DB hierarchy (for company+role specific ordering) ──
    // DB hierarchy pages get grouped by their root page's URL module name.
    // Pages already claimed by a local hierarchy are skipped to avoid duplicates.
    if (dbHier && dbHier !== 'FLAT' && typeof dbHier === 'object' && Object.keys(dbHier).length > 0) {
      Object.keys(dbHier).forEach(idStr => {
        const pageId = parseInt(idStr);
        const node = dbHier[idStr] || dbHier[pageId];
        if (!node) return;
        pageToHierTabs[pageId] = true;
        const par = node.parentId;
        if (par !== null && par !== undefined && par !== 0) return; // only roots
        if (pageToHierTabs[pageId] && grouped[Object.keys(grouped).find(g => grouped[g].some(e => e._isParentGroup && e._rootPage?.id === pageId))]) return; // already placed by local hier
        const page = pageById[pageId];
        if (!page) return;
        const moduleName = getModuleNameFromUrl(page.page_url);
        if (!grouped[moduleName]) grouped[moduleName] = [];
        if (!grouped[moduleName].find(e => e._isParentGroup && e._rootPage.id === pageId)) {
          grouped[moduleName].push({ _isParentGroup: true, _rootPage: page, _children: collectChildren(pageId, pageId, dbHier) });
        }
      });
      // Mark DB hierarchy children as claimed too
      Object.keys(dbHier).forEach(idStr => {
        const node = dbHier[idStr]; if (!node) return;
        (node.children || []).forEach(cid => { pageToHierTabs[parseInt(cid)] = true; });
      });
    }

    // ── STEP 3: Remaining pages not in any hierarchy → group by URL module name ──
    pagesList.forEach(page => {
      if (pageToHierTabs[page.id]) return;
      const moduleName = getModuleNameFromUrl(page.page_url);
      if (!grouped[moduleName]) grouped[moduleName] = [];
      grouped[moduleName].push(page);
    });

    return grouped;
  };

  const filteredPages = pages.filter(p => p.page_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.page_url.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredGrantedAccess = Array.isArray(grantedAccess) ? grantedAccess.filter(item => (item.page_name || '').toLowerCase().includes(viewSearchTerm.toLowerCase()) || (item.page_url || '').toLowerCase().includes(viewSearchTerm.toLowerCase())) : [];
  const groupedPages = groupPagesByModule(filteredPages, grantAccessDbHierarchy);

  // ── GROUP GRANTED ACCESS (VIEW TAB) ──
  // Reuses groupPagesByModule (same groups/labels/hierarchy as Grant Access),
  // then filters each entry to only show pages that are actually granted.
  const groupedGrantedAccess = (() => {
    // Build lookup: page_id → granted access item
    const grantedById = {};
    filteredGrantedAccess.forEach(item => { grantedById[item.page_id] = item; });

    // Use IDENTICAL grouping as Grant Access — same hierarchy, same labels, same structure
    const allPagesGrouped = groupPagesByModule(pages, grantAccessDbHierarchy);

    const result = {};

    Object.entries(allPagesGrouped).forEach(([moduleName, entries]) => {
      const viewEntries = [];

      entries.forEach(entry => {
        if (entry._isParentGroup) {
          // Parent group card: root page + hierarchy children
          const { _rootPage, _children } = entry;
          const rootGranted = grantedById[_rootPage.id];

          // Collect only granted children, preserve depth info
          const grantedChildren = (_children || [])
            .map(({ page, depth }) => {
              const g = grantedById[page.id];
              return g ? { item: g, depth } : null;
            })
            .filter(Boolean);

          if (rootGranted) {
            // Root is granted → show as collapsible parent group with granted children below
            viewEntries.push({ _isParentGroup: true, _rootItem: rootGranted, _children: grantedChildren });
          } else if (grantedChildren.length > 0) {
            // Root not granted but some children are → show children as flat cards under same group label
            grantedChildren.forEach(({ item }) => {
              viewEntries.push({ _isParentGroup: false, _item: item });
            });
          }
          // Nothing granted under this root → skip entirely (no "Other" leakage)
        } else {
          // Flat page (not in any hierarchy) — entry is a plain page object
          const g = grantedById[entry.id];
          if (g) viewEntries.push({ _isParentGroup: false, _item: g });
        }
      });

      if (viewEntries.length > 0) result[moduleName] = viewEntries;
    });

    return result;
  })();

  const getCompanyName = (id) => companies.find(c => c.id === parseInt(id))?.company_name || 'Unknown';
  const getRoleName = (id) => roles.find(r => r.id === parseInt(id))?.role_name || 'Unknown';
  const getDepartmentName = (id) => departments.find(d => d.id === parseInt(id))?.department_name || 'Unknown';
  const getDesignationName = (id) => designations.find(d => d.id === parseInt(id))?.designation_name || 'Unknown';

  const stepsDone = [!!selectedCompany, !!selectedCompany && !!selectedRole, !!selectedCompany && !!selectedRole && !!selectedDepartment, !!selectedCompany && !!selectedRole && !!selectedDepartment && !!selectedDesignation];
  const allSelected = stepsDone[3];

  // ── HIERARCHY OPERATIONS ──────────────────────────────────────────────────
  const isDescendant = useCallback((ancestorId, candidateId, hier) => {
    const h = hier || hierarchy;
    const visited = new Set();
    const check = (id) => {
      if (visited.has(id)) return false;
      visited.add(id);
      const children = h[id]?.children || [];
      if (children.includes(parseInt(candidateId))) return true;
      return children.some(cid => check(cid));
    };
    return check(parseInt(ancestorId));
  }, [hierarchy]);

  const setParentFn = useCallback((pageId, parentId) => {
    const pid = parseInt(pageId), par = parentId ? parseInt(parentId) : null;
    if (pid === par) return;
    if (par && isDescendant(pid, par)) { setHierMsg({ type: 'error', text: 'Cannot create circular hierarchy!' }); setTimeout(() => setHierMsg(null), 3000); return; }
    setHierarchy(prev => {
      const newH = JSON.parse(JSON.stringify(prev));
      const oldParentId = newH[pid]?.parentId;
      if (oldParentId && newH[oldParentId]) newH[oldParentId].children = (newH[oldParentId].children || []).filter(id => id !== pid);
      if (!newH[pid]) newH[pid] = { parentId: null, children: [] };
      newH[pid].parentId = par;
      if (par) { if (!newH[par]) newH[par] = { parentId: null, children: [] }; if (!newH[par].children.includes(pid)) newH[par].children.push(pid); }
      return newH;
    });
    setHierMsg({ type: 'success', text: 'Hierarchy updated' });
    setTimeout(() => setHierMsg(null), 2000);
  }, [isDescendant, activeHierName]);

  const unlinkPageFn = useCallback((pageId) => {
    const pid = parseInt(pageId);
    setHierarchy(prev => {
      const newH = JSON.parse(JSON.stringify(prev));
      const parentId = newH[pid]?.parentId;
      if (parentId && newH[parentId]) newH[parentId].children = (newH[parentId].children || []).filter(id => id !== pid);
      (newH[pid]?.children || []).forEach(childId => { if (newH[childId]) newH[childId].parentId = null; });
      delete newH[pid];
      return newH;
    });
    setHierMsg({ type: 'success', text: 'Page removed from hierarchy' });
    setTimeout(() => setHierMsg(null), 2000);
  }, [activeHierName]);

  const addRootFn = useCallback((pageId) => {
    const pid = parseInt(pageId);
    setHierarchy(prev => {
      if (prev[pid]) return prev;
      const newH = JSON.parse(JSON.stringify(prev));
      newH[pid] = { parentId: null, children: [] };
      return newH;
    });
    setHierMsg({ type: 'success', text: 'Page added as root' });
    setTimeout(() => setHierMsg(null), 2000);
    setHierExpandedNodes(prev => ({ ...prev, [pid]: true }));
  }, [activeHierName]);

  const clearAllHierarchy = () => {
    if (!window.confirm('Delete all hierarchies?')) return;
    try { localStorage.removeItem(MULTI_HIER_KEY); localStorage.removeItem('rbac_page_hierarchy'); localStorage.removeItem(MULTI_HIER_META_KEY); } catch {}
    setAllHierarchies({}); setAllHierarchiesMeta({}); setActiveHierName('');
    setHierMsg({ type: 'success', text: 'All hierarchies deleted' });
    setTimeout(() => setHierMsg(null), 2000);
  };

  const toggleHierNode = (pageId) => { setHierExpandedNodes(prev => ({ ...prev, [pageId]: prev[pageId] === false ? true : false })); };

  const exportHierarchyAsCode = () => {
    const map = {};
    Object.entries(hierarchy).forEach(([id, val]) => {
      if (!val.parentId) {
        const page = pages.find(p => p.id === parseInt(id));
        if (!page) return;
        const children = (val.children || []).map(cid => { const cp = pages.find(p => p.id === parseInt(cid)); return cp ? cp.page_name : null; }).filter(Boolean);
        if (children.length > 0) map[page.page_name] = children;
      }
    });
    return JSON.stringify(map, null, 2);
  };

  const hierRoots = Object.entries(hierarchy).filter(([_, v]) => !v.parentId).map(([id]) => parseInt(id));
  const unlinkedPages = pages.filter(p => !hierarchy[p.id]);

  // ── DB HIERARCHY ──────────────────────────────────────────────────────────
  const loadDbHierarchies = async (companyId, roleId) => {
    if (!companyId || !roleId) { setDbHierarchies([]); return; }
    try { const res = await fetch(`${API_BASE}/rbac/hierarchy/list?company_id=${companyId}&role_id=${roleId}`); if (!res.ok) throw new Error(); setDbHierarchies(await res.json()); }
    catch { setDbMsg({ type: 'error', text: 'Could not load hierarchies from DB' }); setTimeout(() => setDbMsg(null), 3000); }
  };

  useEffect(() => { loadDbHierarchies(hierCompany, hierRole); setActiveDbHierarchyId(null); }, [hierCompany, hierRole]);

  const openDbHierarchy = (dbHier) => {
    const { id, name, blob, icon_label } = dbHier;
    setAllHierarchies(prev => { const updated = { ...prev, [name]: blob }; try { localStorage.setItem(MULTI_HIER_KEY, JSON.stringify(updated)); } catch {} return updated; });
    saveHierarchyMeta(name, icon_label || name);
    setActiveHierName(name); setActiveDbHierarchyId(id);
    setDbMsg({ type: 'success', text: `Loaded "${name}" from DB` });
    setTimeout(() => setDbMsg(null), 2500);
  };

  const saveHierarchyToDB = async () => {
    if (!hierCompany || !hierRole) { setDbMsg({ type: 'error', text: 'Select Company & Role first' }); setTimeout(() => setDbMsg(null), 3000); return; }
    if (!activeHierName) { setDbMsg({ type: 'error', text: 'No active hierarchy selected' }); setTimeout(() => setDbMsg(null), 3000); return; }
    setDbSaving(true);
    const blobJson = JSON.stringify(hierarchy);
    try {
      if (activeDbHierarchyId) {
        const fd = new FormData(); fd.append('blob_json', blobJson); fd.append('note', 'Manual save from UI');
        const res = await fetch(`${API_BASE}/rbac/hierarchy/${activeDbHierarchyId}/save`, { method: 'PUT', body: fd });
        if (!res.ok) throw new Error('Save failed');
        setDbMsg({ type: 'success', text: `Saved "${activeHierName}" to DB` });
      } else {
        const fd = new FormData();
        fd.append('company_id', hierCompany); fd.append('role_id', hierRole);
        fd.append('name', activeHierName); fd.append('blob_json', blobJson);
        fd.append('icon_label', allHierarchiesMeta[activeHierName]?.iconLabel || activeHierName);
        const res = await fetch(`${API_BASE}/rbac/hierarchy`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Save failed');
        const saved = await res.json();
        setActiveDbHierarchyId(saved.id);
        setDbMsg({ type: 'success', text: `Created "${activeHierName}" in DB` });
      }
      setTimeout(() => setDbMsg(null), 2500);
      loadDbHierarchies(hierCompany, hierRole);
    } catch (err) { setDbMsg({ type: 'error', text: `Save failed: ${err.message}` }); setTimeout(() => setDbMsg(null), 3000); }
    finally { setDbSaving(false); }
  };

  const deleteDbHierarchy = async (dbHier) => {
    if (!window.confirm(`Delete "${dbHier.name}" from DB?`)) return;
    try {
      const res = await fetch(`${API_BASE}/rbac/hierarchy/${dbHier.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setDbMsg({ type: 'success', text: `"${dbHier.name}" deleted` });
      setTimeout(() => setDbMsg(null), 2500);
      if (activeDbHierarchyId === dbHier.id) setActiveDbHierarchyId(null);
      loadDbHierarchies(hierCompany, hierRole);
    } catch (err) { setDbMsg({ type: 'error', text: `Delete failed` }); setTimeout(() => setDbMsg(null), 3000); }
  };

  const openRestoreModal = async (dbHier) => {
    setShowRestoreModal(dbHier); setRestoreLoading(true); setRestoreLogs([]);
    try { const res = await fetch(`${API_BASE}/rbac/hierarchy/${dbHier.id}/logs?limit=30`); setRestoreLogs(await res.json()); }
    catch { setRestoreLogs([]); }
    finally { setRestoreLoading(false); }
  };

  const restoreFromLog = async (logItem) => {
    if (!showRestoreModal) return;
    if (!window.confirm(`Restore to snapshot from ${new Date(logItem.created_at).toLocaleString()}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/rbac/hierarchy/${showRestoreModal.id}/restore/${logItem.log_id}`, { method: 'POST' });
      if (!res.ok) throw new Error('Restore failed');
      const data = await res.json();
      setAllHierarchies(prev => { const updated = { ...prev, [showRestoreModal.name]: data.blob }; try { localStorage.setItem(MULTI_HIER_KEY, JSON.stringify(updated)); } catch {} return updated; });
      setActiveHierName(showRestoreModal.name); setActiveDbHierarchyId(showRestoreModal.id); setShowRestoreModal(null);
      setDbMsg({ type: 'success', text: `Restored "${showRestoreModal.name}"` });
      setTimeout(() => setDbMsg(null), 2500);
      loadDbHierarchies(hierCompany, hierRole);
    } catch (err) { setDbMsg({ type: 'error', text: `Restore failed: ${err.message}` }); setTimeout(() => setDbMsg(null), 3000); }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // VS CODE TREE NODE RENDERER
  // ══════════════════════════════════════════════════════════════════════════
  const renderHierNode = (pageId, depth = 0) => {
    const page = pages.find(p => p.id === parseInt(pageId));
    if (!page) return null;
    const nodeData = hierarchy[pageId] || { parentId: null, children: [] };
    const children = (nodeData.children || []).filter(cid => pages.find(p => p.id === parseInt(cid)));
    const isExpanded = hierExpandedNodes[pageId] !== false;
    const isDragOver = hierDragOver === pageId;
    const isPickingParent = hierSelectParent !== null;
    const pageName = page.page_name;
    const filteredOut = hierSearchTerm && !pageName.toLowerCase().includes(hierSearchTerm.toLowerCase());
    if (filteredOut && children.length === 0) return null;
    const isSelected = hierSelectParent === pageId;

    return (
      <div key={pageId} style={{ userSelect: 'none' }}>
        <div
          draggable
          onDragStart={() => setHierDragSource(pageId)}
          onDragOver={(e) => { e.preventDefault(); setHierDragOver(pageId); }}
          onDrop={(e) => {
            e.preventDefault(); e.stopPropagation();
            if (hierDragSource && hierDragSource !== pageId) setParentFn(hierDragSource, pageId);
            setHierDragSource(null); setHierDragOver(null);
          }}
          onDragEnd={() => { setHierDragSource(null); setHierDragOver(null); }}
          onClick={() => { if (isPickingParent && hierSelectParent !== pageId) { setParentFn(hierSelectParent, pageId); setHierSelectParent(null); } }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            height: '22px',
            paddingLeft: `${depth * 16 + 4}px`,
            paddingRight: '4px',
            cursor: isPickingParent ? 'crosshair' : 'default',
            background: isDragOver ? VS.accentLight : isSelected ? VS.accentLight : 'transparent',
            borderLeft: isDragOver ? `2px solid ${VS.accent}` : '2px solid transparent',
            opacity: hierDragSource === pageId ? 0.4 : 1,
            transition: 'background 0.1s',
            position: 'relative',
          }}
          onMouseEnter={e => { if (!isDragOver && !isSelected) e.currentTarget.style.background = '#2a2d2e'; }}
          onMouseLeave={e => { if (!isDragOver && !isSelected) e.currentTarget.style.background = 'transparent'; }}
        >
          {/* Expand/Collapse */}
          <span
            onClick={(e) => { e.stopPropagation(); if (children.length > 0) toggleHierNode(pageId); }}
            style={{ width: '16px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: children.length > 0 ? 'pointer' : 'default' }}
          >
            {children.length > 0 ? (
              isExpanded ? <ChevronDown size={12} style={{ color: VS.textDim }} /> : <ChevronRight size={12} style={{ color: VS.textDim }} />
            ) : null}
          </span>

          {/* Folder / File Icon */}
          <span style={{ width: '16px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: '4px' }}>
            {children.length > 0
              ? (isExpanded ? <FolderOpen size={14} style={{ color: '#e8ab53' }} /> : <Folder size={14} style={{ color: '#e8ab53' }} />)
              : <FileText size={13} style={{ color: VS.blue }} />
            }
          </span>

          {/* Page name */}
          <span style={{ flex: 1, fontSize: '12px', color: VS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '22px' }}>
            {pageName}
          </span>

          {/* Level badge */}
          <span style={{ fontSize: '9px', color: VS.textMuted, padding: '0 4px', flexShrink: 0 }}>L{depth}</span>

          {/* Action buttons - shown on hover via group */}
          <div className="hier-node-actions" style={{ display: 'flex', gap: '2px', flexShrink: 0, opacity: 0, transition: 'opacity 0.1s' }}>
            <button
              onClick={e => { e.stopPropagation(); setHierSelectParent(hierSelectParent === pageId ? null : pageId); }}
              title="Set Parent"
              style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? VS.accent : 'transparent', border: 'none', borderRadius: '3px', cursor: 'pointer', color: VS.textDim }}
            >
              <ArrowRight size={10} />
            </button>
            {nodeData.parentId && (
              <button onClick={e => { e.stopPropagation(); setParentFn(pageId, null); }} title="Move to Root"
                style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: '3px', cursor: 'pointer', color: VS.textDim }}>
                <ChevronLeft size={10} />
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); unlinkPageFn(pageId); }} title="Remove from hierarchy"
              style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: '3px', cursor: 'pointer', color: VS.red }}>
              <X size={10} />
            </button>
          </div>
        </div>

        {/* Children */}
        {isExpanded && children.length > 0 && (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: `${depth * 16 + 12}px`, top: 0, bottom: 0, width: '1px', background: VS.border }} />
            {children.map(cid => renderHierNode(cid, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // VS CODE SELECT COMPONENT
  // ══════════════════════════════════════════════════════════════════════════
  const VsSelect = ({ value, onChange, options, placeholder, optKey, disabled, accentColor = VS.accent }) => (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={{
        background: VS.input,
        border: `1px solid ${value ? accentColor : VS.border}`,
        borderRadius: '4px',
        color: value ? VS.textBright : VS.textDim,
        fontSize: '11px',
        padding: '4px 24px 4px 8px',
        outline: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23858585' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        opacity: disabled ? 0.5 : 1,
        width: '100%',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.id} value={o.id}>{o[optKey]}</option>)}
    </select>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // GRANT ACCESS TAB — PAGE CARD
  // ══════════════════════════════════════════════════════════════════════════
  const renderPageCard = (entry) => {
    if (entry._isParentGroup) {
      const { _rootPage: rootPage, _children: children } = entry;
      const rootSelected = selectedPages[rootPage.id] || [];
      const childNames = children.map(c => c.page.page_name);
      const rootDeps = pageDependencies[rootPage.id] || [];
      return (
        <div key={`pg-${rootPage.id}`} style={{ marginBottom: '2px', border: `1px solid ${VS.border}`, borderRadius: '4px', overflow: 'hidden', background: VS.sidebar }}>
          {/* Root row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: `${VS.accentLight}66`, borderBottom: children.length > 0 ? `1px solid ${VS.border}` : 'none' }}>
            {renderPageIcon(rootPage.icon_name, 13, '#e8ab53')}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: VS.textBright, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rootPage.page_name}</div>
              <div style={{ fontSize: '9px', color: VS.textMuted }}>{rootPage.page_url}</div>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
              <button onClick={() => { setShowDepModal(rootPage.id); setDepSearchTerm(''); }}
                style={{ padding: '2px 6px', background: rootDeps.length > 0 ? VS.yellowDim : 'transparent', border: `1px solid ${VS.borderLight}`, borderRadius: '3px', fontSize: '9px', cursor: 'pointer', color: VS.yellow, display: 'flex', alignItems: 'center', gap: '2px' }}>
                <Link2 size={8} /> {rootDeps.length > 0 ? rootDeps.length : 'Deps'}
              </button>
              <button onClick={() => handleSelectAllPermissions(rootPage.id, rootPage.permissions)}
                style={{ padding: '2px 6px', background: VS.greenDim, border: `1px solid ${VS.green}44`, borderRadius: '3px', fontSize: '9px', cursor: 'pointer', color: VS.green }}>All</button>
              <button onClick={() => handleDeselectAllPermissions(rootPage.id)}
                style={{ padding: '2px 6px', background: VS.redDim, border: `1px solid ${VS.red}44`, borderRadius: '3px', fontSize: '9px', cursor: 'pointer', color: VS.red }}>Clear</button>
            </div>
          </div>
          {/* Permissions row */}
          <div style={{ padding: '6px 10px 6px 30px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
            {rootPage.permissions?.length > 0 ? rootPage.permissions.map(perm => {
              const isSel = rootSelected.includes(perm.id);
              return (
                <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer', background: isSel ? VS.accentLight : 'transparent', border: `1px solid ${isSel ? VS.accent : VS.border}`, fontSize: '10px', color: isSel ? VS.textBright : VS.textDim, transition: 'all 0.1s' }}>
                  <input type="checkbox" checked={isSel} onChange={() => handlePagePermissionToggle(rootPage.id, perm.id)} style={{ margin: 0, width: '11px', height: '11px', accentColor: VS.accent, cursor: 'pointer' }} />
                  {perm.permission_type}
                </label>
              );
            }) : <span style={{ fontSize: '9px', color: VS.textMuted, fontStyle: 'italic' }}>No permissions</span>}
            {children.length > 0 && (
              <div
                onClick={() => setShowChildPagesModal({ rootPageId: rootPage.id, rootPageName: rootPage.page_name, children })}
                style={{ width: '100%', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 6px', background: rootSelected.length > 0 ? VS.greenDim : VS.bg, borderRadius: '3px', border: `1px solid ${rootSelected.length > 0 ? VS.green + '44' : VS.border}`, cursor: 'pointer' }}
                title="Click to view all child pages"
              >
                <GitBranch size={9} style={{ color: rootSelected.length > 0 ? VS.green : VS.textMuted, flexShrink: 0 }} />
                <span style={{ fontSize: '9px', color: rootSelected.length > 0 ? VS.green : VS.textDim, flex: 1 }}>
                  {rootSelected.length > 0 ? `Auto-granting ${children.length} child page(s)` : `${children.length} child page(s) will inherit access`}
                  {childNames.length > 0 && <> · <span style={{ color: VS.textMuted }}>{childNames.slice(0, 3).join(', ')}{childNames.length > 3 ? ` +${childNames.length - 3}` : ''}</span></>}
                </span>
                <span style={{ fontSize: '9px', color: rootSelected.length > 0 ? VS.green : VS.textMuted, flexShrink: 0, textDecoration: 'underline', opacity: 0.8 }}>View all</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    // flat page
    const page = entry;
    const flatDeps = pageDependencies[page.id] || [];
    const pageSel = selectedPages[page.id] || [];
    return (
      <div key={page.id} style={{ marginBottom: '2px', border: `1px solid ${VS.border}`, borderRadius: '4px', overflow: 'hidden', background: VS.sidebar }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px' }}>
          {renderPageIcon(page.icon_name, 12, VS.blue)}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '11px', color: VS.textBright, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.page_name}</div>
            <div style={{ fontSize: '9px', color: VS.textMuted }}>{page.page_url}</div>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
            <button onClick={() => { setShowDepModal(page.id); setDepSearchTerm(''); }}
              style={{ padding: '2px 6px', background: flatDeps.length > 0 ? VS.yellowDim : 'transparent', border: `1px solid ${VS.borderLight}`, borderRadius: '3px', fontSize: '9px', cursor: 'pointer', color: VS.yellow, display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Link2 size={8} /> {flatDeps.length > 0 ? flatDeps.length : 'Deps'}
            </button>
            <button onClick={() => handleSelectAllPermissions(page.id, page.permissions)}
              style={{ padding: '2px 6px', background: VS.greenDim, border: `1px solid ${VS.green}44`, borderRadius: '3px', fontSize: '9px', cursor: 'pointer', color: VS.green }}>All</button>
            <button onClick={() => handleDeselectAllPermissions(page.id)}
              style={{ padding: '2px 6px', background: VS.redDim, border: `1px solid ${VS.red}44`, borderRadius: '3px', fontSize: '9px', cursor: 'pointer', color: VS.red }}>Clear</button>
          </div>
        </div>
        {flatDeps.length > 0 && (
          <div style={{ padding: '0 10px 4px 30px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            {flatDeps.map(did => {
              const dp = pages.find(p => p.id === did); if (!dp) return null;
              const hasDep = !!(selectedPages[did] && selectedPages[did].length > 0);
              return <span key={did} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '8px', background: hasDep ? VS.greenDim : VS.bg, color: hasDep ? VS.green : VS.textDim, border: `1px solid ${hasDep ? VS.green + '44' : VS.border}`, display: 'flex', alignItems: 'center', gap: '3px' }}>{hasDep ? <Check size={8} /> : <Eye size={8} />}{dp.page_name}</span>;
            })}
          </div>
        )}
        <div style={{ padding: '0 10px 6px 30px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {page.permissions?.length > 0 ? page.permissions.map(perm => {
            const isSel = pageSel.includes(perm.id);
            return (
              <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer', background: isSel ? VS.accentLight : 'transparent', border: `1px solid ${isSel ? VS.accent : VS.border}`, fontSize: '10px', color: isSel ? VS.textBright : VS.textDim, transition: 'all 0.1s' }}>
                <input type="checkbox" checked={isSel} onChange={() => handlePagePermissionToggle(page.id, perm.id)} style={{ margin: 0, width: '11px', height: '11px', accentColor: VS.accent, cursor: 'pointer' }} />
                {perm.permission_type}
              </label>
            );
          }) : <span style={{ fontSize: '9px', color: VS.textMuted, fontStyle: 'italic' }}>No permissions</span>}
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // STEP SELECTOR CONFIG
  // ══════════════════════════════════════════════════════════════════════════
  const STEP_CONFIG = [
    { key: 'company', label: 'Company', icon: Building, value: selectedCompany, setter: setSelectedCompany, options: companies, optKey: 'company_name', placeholder: 'Select Company', color: VS.blue },
    { key: 'role', label: 'Role', icon: Shield, value: selectedRole, setter: setSelectedRole, options: roles, optKey: 'role_name', placeholder: 'Select Role', color: VS.purple },
    { key: 'department', label: 'Department', icon: Briefcase, value: selectedDepartment, setter: setSelectedDepartment, options: departments, optKey: 'department_name', placeholder: 'Select Department', color: VS.green },
    { key: 'designation', label: 'Designation', icon: Award, value: selectedDesignation, setter: setSelectedDesignation, options: designations, optKey: 'designation_name', placeholder: 'Select Designation', color: VS.yellow },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ width: '100%', height: '100%', background: VS.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace" }}>

      {/* ── HEADER BAR ── */}
      {!embeddedMode && (
        <div style={{ height: '28px', background: '#323233', borderBottom: `1px solid ${VS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={13} style={{ color: VS.accent }} />
            <span style={{ fontSize: '11px', color: VS.textBright, fontWeight: '600', letterSpacing: '0.3px' }}>Role Access Management</span>
          </div>
          <button onClick={autoSyncPages} disabled={syncing}
            style={{ height: '20px', padding: '0 10px', background: syncing ? VS.input : VS.accentLight, border: `1px solid ${VS.accent}`, borderRadius: '3px', cursor: syncing ? 'not-allowed' : 'pointer', fontSize: '10px', color: VS.textBright, display: 'flex', alignItems: 'center', gap: '4px' }}>
            {syncing ? <><RefreshCw size={9} style={{ animation: 'spin 1s linear infinite' }} /> Syncing…</> : <><Database size={9} /> Sync Pages</>}
          </button>
        </div>
      )}

      {/* ── EMBEDDED: Sync bar ── */}
      {embeddedMode && (
        <div style={{ height: '28px', background: '#252526', borderBottom: `1px solid ${VS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Terminal size={11} style={{ color: VS.accent }} />
            <span style={{ fontSize: '10px', color: VS.textDim }}>rbac.access-control</span>
          </div>
          <button onClick={autoSyncPages} disabled={syncing}
            style={{ height: '20px', padding: '0 10px', background: syncing ? VS.input : VS.accentLight, border: `1px solid ${VS.accent}`, borderRadius: '3px', cursor: syncing ? 'not-allowed' : 'pointer', fontSize: '10px', color: VS.textBright, display: 'flex', alignItems: 'center', gap: '4px' }}>
            {syncing ? <><RefreshCw size={9} style={{ animation: 'spin 1s linear infinite' }} /> Syncing…</> : <><Database size={9} /> Sync Pages</>}
          </button>
        </div>
      )}

      {/* ── MESSAGE TOAST ── */}
      {message && (
        <div style={{ padding: '5px 12px', background: message.type === 'success' ? VS.greenDim : VS.redDim, borderBottom: `1px solid ${message.type === 'success' ? VS.green + '44' : VS.red + '44'}`, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: message.type === 'success' ? VS.green : VS.red, flexShrink: 0 }}>
          {message.type === 'success' ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
          {message.text}
        </div>
      )}

      {/* ── STEP SELECTORS ── */}
      <div style={{ padding: '8px 10px', background: VS.sidebar, borderBottom: `1px solid ${VS.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          {STEP_CONFIG.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === 0 ? true : stepsDone[idx - 1];
            const isDone = stepsDone[idx];
            return (
              <div key={step.key} style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                  <Icon size={9} style={{ color: isDone ? step.color : VS.textMuted }} />
                  <span style={{ fontSize: '9px', color: isDone ? step.color : VS.textMuted, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: '600' }}>{step.label}</span>
                  {isDone && <CheckCircle size={9} style={{ color: step.color, marginLeft: 'auto' }} />}
                </div>
                <VsSelect
                  value={step.value}
                  onChange={(e) => {
                    step.setter(e.target.value);
                    if (step.key === 'company') { setSelectedRole(''); setSelectedDepartment(''); setSelectedDesignation(''); setGrantAccessDbHierarchy(null); }
                    if (step.key === 'role') { setSelectedDepartment(''); setSelectedDesignation(''); setGrantAccessDbHierarchy(null); }
                    if (step.key === 'department') setSelectedDesignation('');
                  }}
                  options={step.options}
                  optKey={step.optKey}
                  placeholder={step.placeholder}
                  disabled={!isActive}
                  accentColor={step.color}
                />
              </div>
            );
          })}
        </div>
        {allSelected && (
          <div style={{ marginTop: '6px', padding: '4px 8px', background: VS.greenDim, borderRadius: '3px', border: `1px solid ${VS.green}33`, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: VS.green }}>
            <CheckCircle size={10} />
            {getCompanyName(selectedCompany)} <span style={{ color: VS.textMuted }}>›</span> {getRoleName(selectedRole)} <span style={{ color: VS.textMuted }}>›</span> {getDepartmentName(selectedDepartment)} <span style={{ color: VS.textMuted }}>›</span> {getDesignationName(selectedDesignation)}
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', background: VS.tabBg, borderBottom: `1px solid ${VS.border}`, flexShrink: 0 }}>
        {[
          { id: 'grant-access', label: 'Grant Access', icon: Shield, color: VS.blue },
          { id: 'view-access', label: 'View Access', icon: Eye, color: VS.purple },
          { id: 'page-hierarchy', label: 'Page Hierarchy', icon: GitBranch, color: VS.green },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              height: '32px', padding: '0 14px', fontSize: '11px', fontWeight: isActive ? '600' : '400',
              background: isActive ? VS.tabActive : 'transparent',
              color: isActive ? VS.textBright : VS.textDim,
              border: 'none', borderRight: `1px solid ${VS.border}`,
              borderTop: isActive ? `1px solid ${tab.color}` : '1px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
              transition: 'all 0.1s',
            }}>
              <Icon size={11} style={{ color: isActive ? tab.color : VS.textDim }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          GRANT ACCESS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'grant-access' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!allSelected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <Shield size={36} style={{ color: VS.textMuted }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: VS.textBright, marginBottom: '4px' }}>Select all 4 fields to continue</div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  {STEP_CONFIG.map((s, i) => (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: stepsDone[i] ? s.color : VS.textMuted }}>
                      {stepsDone[i] ? <Check size={10} /> : <div style={{ width: 10, height: 10, borderRadius: '50%', border: `1px solid ${VS.border}` }} />}
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Search + Grant bar */}
              <div style={{ padding: '6px 10px', background: VS.sidebar, borderBottom: `1px solid ${VS.border}`, display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={11} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: VS.textMuted }} />
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search pages..."
                    style={{ width: '100%', background: VS.input, border: `1px solid ${VS.border}`, borderRadius: '4px', padding: '5px 8px 5px 26px', fontSize: '11px', color: VS.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <button onClick={handleGrantAccess} disabled={loading || Object.keys(selectedPages).filter(k => selectedPages[k]?.length > 0).length === 0}
                  style={{ height: '28px', padding: '0 14px', background: VS.accent, border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '5px', opacity: loading ? 0.7 : 1, flexShrink: 0 }}>
                  <Save size={11} />{loading ? 'Granting…' : 'Grant Access'}
                </button>
                <button
                  onClick={handleAutoGrantNewPages}
                  disabled={loading}
                  title="Automatically grant new synced pages — with the same permissions as already granted pages for this role"
                  style={{ height: '28px', padding: '0 12px', background: VS.greenDim, border: `1px solid ${VS.green}66`, borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', color: VS.green, display: 'flex', alignItems: 'center', gap: '5px', opacity: loading ? 0.7 : 1, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <RefreshCw size={11} />{loading ? 'Working…' : 'Auto-Grant New'}
                </button>
              </div>

              {/* Pages list */}
              <div style={{ flex: 1, overflow: 'auto', padding: '8px 10px' }}>
                {Object.entries(groupedPages).length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: VS.textMuted }}>
                    <Search size={28} style={{ margin: '0 auto 8px', color: VS.textMuted, opacity: 0.5 }} />
                    <div style={{ fontSize: '12px', color: VS.textDim }}>No pages found</div>
                    <div style={{ fontSize: '10px', color: VS.textMuted, marginTop: '4px' }}>Click Sync Pages to load from config</div>
                  </div>
                ) : Object.entries(groupedPages).map(([moduleName, modulePages]) => {
                  const isExpand = expandedModules[moduleName] !== false;
                  return (
                    <div key={moduleName} style={{ marginBottom: '8px' }}>
                      {/* Module header */}
                      <button onClick={() => setExpandedModules(prev => ({ ...prev, [moduleName]: !isExpand }))}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '3px', marginBottom: '3px' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#2a2d2e'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {isExpand ? <ChevronDown size={12} style={{ color: VS.textDim }} /> : <ChevronRight size={12} style={{ color: VS.textDim }} />}
                        <Folder size={13} style={{ color: '#e8ab53' }} />
                        <span style={{ fontSize: '11px', color: VS.yellow, fontWeight: '600', flex: 1, textAlign: 'left' }}>{moduleName}</span>
                        <span style={{ fontSize: '9px', color: VS.textMuted, background: VS.input, padding: '1px 5px', borderRadius: '8px' }}>{modulePages.length}</span>
                      </button>
                      {isExpand && (
                        <div style={{ paddingLeft: '20px' }}>
                          {modulePages.map(entry => renderPageCard(entry))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW ACCESS TAB  — mirrors Grant Access card style + grouping exactly
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'view-access' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!allSelected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <Eye size={36} style={{ color: VS.textMuted }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: VS.textBright, marginBottom: '4px' }}>Select all 4 fields to view access</div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  {STEP_CONFIG.map((s, i) => (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: stepsDone[i] ? s.color : VS.textMuted }}>
                      {stepsDone[i] ? <Check size={10} /> : <div style={{ width: 10, height: 10, borderRadius: '50%', border: `1px solid ${VS.border}` }} />}
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Search bar */}
              <div style={{ padding: '6px 10px', background: VS.sidebar, borderBottom: `1px solid ${VS.border}`, display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={11} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: VS.textMuted }} />
                  <input value={viewSearchTerm} onChange={e => setViewSearchTerm(e.target.value)} placeholder="Search granted pages..."
                    style={{ width: '100%', background: VS.input, border: `1px solid ${VS.border}`, borderRadius: '4px', padding: '5px 8px 5px 26px', fontSize: '11px', color: VS.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
              </div>

              {/* Pages list */}
              <div style={{ flex: 1, overflow: 'auto', padding: '8px 10px' }}>
                {Object.keys(groupedGrantedAccess).length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: VS.textMuted }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>{viewSearchTerm ? '🔍' : '🔒'}</div>
                    <div style={{ fontSize: '12px', color: VS.textDim }}>{viewSearchTerm ? 'No matching pages' : 'No access granted'}</div>
                    <div style={{ fontSize: '10px', color: VS.textMuted, marginTop: '4px' }}>{viewSearchTerm ? 'Try different search' : 'Use Grant Access tab to assign permissions'}</div>
                  </div>
                ) : Object.entries(groupedGrantedAccess).map(([moduleName, entries]) => {
                  const isExpand = expandedModules[`view_${moduleName}`] !== false;
                  const totalCount = entries.reduce((sum, e) => sum + (e._isParentGroup ? 1 + e._children.length : 1), 0);
                  return (
                    <div key={moduleName} style={{ marginBottom: '8px' }}>
                      {/* Module header — identical to Grant Access */}
                      <button onClick={() => setExpandedModules(prev => ({ ...prev, [`view_${moduleName}`]: !isExpand }))}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '3px', marginBottom: '3px' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#2a2d2e'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {isExpand ? <ChevronDown size={12} style={{ color: VS.textDim }} /> : <ChevronRight size={12} style={{ color: VS.textDim }} />}
                        <Folder size={13} style={{ color: '#e8ab53' }} />
                        <span style={{ fontSize: '11px', color: VS.yellow, fontWeight: '600', flex: 1, textAlign: 'left' }}>{moduleName}</span>
                        <span style={{ fontSize: '9px', color: VS.textMuted, background: VS.input, padding: '1px 5px', borderRadius: '8px' }}>{totalCount}</span>
                      </button>

                      {isExpand && (
                        <div style={{ paddingLeft: '20px' }}>
                          {entries.map((entry, idx) => {

                            /* ── PARENT GROUP CARD ── */
                            if (entry._isParentGroup) {
                              const { _rootItem, _children } = entry;
                              const isGroupRevoking = revoking === `page_${_rootItem.page_id}`;
                              const totalPerms = _rootItem.permissions.length + _children.reduce((sum, { item: c }) => sum + c.permissions.length, 0);
                              const childNames = _children.map(({ item: c }) => c.page_name);
                              return (
                                <div key={`pg-${_rootItem.page_id}`} style={{ marginBottom: '2px', border: `1px solid ${VS.border}`, borderRadius: '4px', overflow: 'hidden', background: VS.sidebar }}>
                                  {/* Header — teal tint same as Grant Access parent */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: `${VS.accentLight}66`, borderBottom: `1px solid ${VS.border}` }}>
                                    {renderPageIcon(_rootItem.icon_name, 13, '#e8ab53')}
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                      <div style={{ fontSize: '11px', fontWeight: '600', color: VS.textBright, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{_rootItem.page_name}</div>
                                      <div style={{ fontSize: '9px', color: VS.textMuted }}>{_rootItem.page_url}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                                      {_children.length > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 7px', background: VS.greenDim, border: `1px solid ${VS.green}33`, borderRadius: '3px' }}>
                                          <GitBranch size={9} style={{ color: VS.green }} />
                                          <span style={{ fontSize: '9px', color: VS.green }}>{_children.length} child page{_children.length !== 1 ? 's' : ''}</span>
                                        </div>
                                      )}
                                      <button
                                        onClick={() => handleRevokeAllPermissionsForPage(_rootItem.page_id, _rootItem.page_name, _rootItem.permissions)}
                                        disabled={isGroupRevoking}
                                        style={{ padding: '2px 8px', background: VS.redDim, border: `1px solid ${VS.red}44`, borderRadius: '3px', fontSize: '9px', cursor: isGroupRevoking ? 'not-allowed' : 'pointer', color: VS.red, display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
                                        <XCircle size={9} />{isGroupRevoking ? 'Revoking…' : `Revoke All (${totalPerms})`}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Root permissions — same blue pill style as Grant Access checked state */}
                                  <div style={{ padding: '6px 10px 6px 30px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', borderBottom: _children.length > 0 ? `1px solid ${VS.border}` : 'none' }}>
                                    {_rootItem.permissions.length > 0 ? _rootItem.permissions.map(perm => (
                                      <div key={perm.permission_id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '3px', background: VS.accentLight, border: `1px solid ${VS.accent}`, fontSize: '10px', color: VS.textBright }}>
                                        <Check size={9} style={{ color: VS.checkOn }} />
                                        {perm.permission_type}
                                        <button onClick={() => handleRevokeAccess(perm.access_id, _rootItem.page_name, perm.permission_type, _rootItem.page_id)} disabled={revoking === perm.access_id}
                                          style={{ width: '14px', height: '14px', background: revoking === perm.access_id ? VS.textMuted : VS.red, border: 'none', borderRadius: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '2px' }}>
                                          {revoking === perm.access_id ? <RefreshCw size={8} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} /> : <X size={8} style={{ color: '#fff' }} />}
                                        </button>
                                      </div>
                                    )) : <span style={{ fontSize: '9px', color: VS.textMuted, fontStyle: 'italic' }}>No permissions</span>}

                                    {/* Child banner — same as Grant Access auto-grant banner */}
                                    {_children.length > 0 && (
                                      <div style={{ width: '100%', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 6px', background: VS.greenDim, borderRadius: '3px', border: `1px solid ${VS.green}44` }}>
                                        <GitBranch size={9} style={{ color: VS.green, flexShrink: 0 }} />
                                        <span style={{ fontSize: '9px', color: VS.green, flex: 1 }}>
                                          {_children.length} child page{_children.length !== 1 ? 's' : ''}
                                          {childNames.length > 0 && <> · <span style={{ color: VS.textMuted }}>{childNames.slice(0, 3).join(', ')}{childNames.length > 3 ? ` +${childNames.length - 3}` : ''}</span></>}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Child page cards */}
                                  {_children.length > 0 && (
                                    <div style={{ padding: '4px 10px 6px 10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      {_children.map(({ item: childItem, depth }) => {
                                        const isChildRevoking = revoking === `page_${childItem.page_id}`;
                                        return (
                                          <div key={childItem.page_id} style={{ marginLeft: `${depth * 14}px`, border: `1px solid ${VS.borderLight}`, borderRadius: '4px', overflow: 'hidden', background: VS.bg }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', background: VS.sidebar, borderBottom: `1px solid ${VS.border}` }}>
                                              {renderPageIcon(childItem.icon_name, 11, VS.textMuted)}
                                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ fontSize: '10px', fontWeight: '500', color: VS.textBright, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{childItem.page_name}</div>
                                                <div style={{ fontSize: '9px', color: VS.textMuted }}>{childItem.page_url}</div>
                                              </div>
                                              <button onClick={() => handleRevokeAllPermissionsForPage(childItem.page_id, childItem.page_name, childItem.permissions)} disabled={isChildRevoking}
                                                style={{ padding: '2px 7px', background: VS.redDim, border: `1px solid ${VS.red}44`, borderRadius: '3px', fontSize: '9px', cursor: isChildRevoking ? 'not-allowed' : 'pointer', color: VS.red, display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                                <XCircle size={9} />{isChildRevoking ? 'Revoking…' : `Revoke All (${childItem.permissions.length})`}
                                              </button>
                                            </div>
                                            <div style={{ padding: '5px 10px 5px 28px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                              {childItem.permissions.map(perm => (
                                                <div key={perm.permission_id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '3px', background: VS.accentLight, border: `1px solid ${VS.accent}`, fontSize: '10px', color: VS.textBright }}>
                                                  <Check size={9} style={{ color: VS.checkOn }} />
                                                  {perm.permission_type}
                                                  <button onClick={() => handleRevokeAccess(perm.access_id, childItem.page_name, perm.permission_type, childItem.page_id)} disabled={revoking === perm.access_id}
                                                    style={{ width: '14px', height: '14px', background: revoking === perm.access_id ? VS.textMuted : VS.red, border: 'none', borderRadius: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '2px' }}>
                                                    {revoking === perm.access_id ? <RefreshCw size={8} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} /> : <X size={8} style={{ color: '#fff' }} />}
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            /* ── FLAT PAGE CARD ── */
                            const item = entry._item;
                            const isFlatRevoking = revoking === `page_${item.page_id}`;
                            return (
                              <div key={`flat-${item.page_id}-${idx}`} style={{ marginBottom: '2px', border: `1px solid ${VS.border}`, borderRadius: '4px', overflow: 'hidden', background: VS.sidebar }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px' }}>
                                  {renderPageIcon(item.icon_name, 12, VS.blue)}
                                  <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '11px', color: VS.textBright, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.page_name}</div>
                                    <div style={{ fontSize: '9px', color: VS.textMuted }}>{item.page_url}</div>
                                  </div>
                                  <button onClick={() => handleRevokeAllPermissionsForPage(item.page_id, item.page_name, item.permissions)} disabled={isFlatRevoking}
                                    style={{ padding: '2px 6px', background: VS.redDim, border: `1px solid ${VS.red}44`, borderRadius: '3px', fontSize: '9px', cursor: isFlatRevoking ? 'not-allowed' : 'pointer', color: VS.red, display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                    <XCircle size={8} />{isFlatRevoking ? 'Revoking…' : `Revoke All (${item.permissions.length})`}
                                  </button>
                                </div>
                                <div style={{ padding: '6px 10px 6px 30px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                  {item.permissions.length > 0 ? item.permissions.map(perm => (
                                    <div key={perm.permission_id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '3px', background: VS.accentLight, border: `1px solid ${VS.accent}`, fontSize: '10px', color: VS.textBright }}>
                                      <Check size={9} style={{ color: VS.checkOn }} />
                                      {perm.permission_type}
                                      <button onClick={() => handleRevokeAccess(perm.access_id, item.page_name, perm.permission_type, item.page_id)} disabled={revoking === perm.access_id}
                                        style={{ width: '14px', height: '14px', background: revoking === perm.access_id ? VS.textMuted : VS.red, border: 'none', borderRadius: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '2px' }}>
                                        {revoking === perm.access_id ? <RefreshCw size={8} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} /> : <X size={8} style={{ color: '#fff' }} />}
                                      </button>
                                    </div>
                                  )) : <span style={{ fontSize: '9px', color: VS.textMuted, fontStyle: 'italic' }}>No permissions</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PAGE HIERARCHY TAB — VS CODE EXPLORER STYLE
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'page-hierarchy' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Hierarchy toolbar */}
          <div style={{ padding: '4px 10px', background: VS.sidebar, borderBottom: `1px solid ${VS.border}`, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
            <GitBranch size={11} style={{ color: VS.green }} />
            <span style={{ fontSize: '10px', color: VS.green, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Page Hierarchy Builder</span>
            {/* Hierarchy tabs */}
            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', alignItems: 'center' }}>
              {Object.keys(allHierarchies).map(name => (
                <div key={name} style={{ position: 'relative', display: 'inline-flex' }}>
                  <button onClick={() => setActiveHierName(name)}
                    style={{ padding: '2px 20px 2px 8px', fontSize: '10px', background: activeHierName === name ? VS.tabActive : VS.tabBg, color: activeHierName === name ? VS.textBright : VS.textDim, border: `1px solid ${activeHierName === name ? VS.accent : VS.border}`, borderRadius: '3px 3px 0 0', cursor: 'pointer', borderBottom: activeHierName === name ? 'none' : `1px solid ${VS.border}`, marginBottom: activeHierName === name ? '-1px' : '0', fontWeight: activeHierName === name ? '600' : '400' }}>
                    {name}
                  </button>
                  <span onClick={e => {
                    e.stopPropagation();
                    if (!window.confirm(`Delete "${name}"?`)) return;
                    setAllHierarchies(prev => { const n = { ...prev }; delete n[name]; try { localStorage.setItem(MULTI_HIER_KEY, JSON.stringify(n)); } catch {} return n; });
                    setAllHierarchiesMeta(prev => { const m = { ...prev }; delete m[name]; try { localStorage.setItem(MULTI_HIER_META_KEY, JSON.stringify(m)); } catch {} return m; });
                    if (activeHierName === name) setActiveHierName('');
                  }}
                    style={{ position: 'absolute', top: '2px', right: '4px', width: '12px', height: '12px', borderRadius: '50%', background: 'transparent', color: VS.textMuted, fontSize: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, userSelect: 'none' }}>
                    ×
                  </span>
                </div>
              ))}
              <button onClick={() => setShowNewHierInput(true)}
                style={{ padding: '2px 8px', fontSize: '9px', background: 'transparent', color: VS.textDim, border: `1px dashed ${VS.border}`, borderRadius: '3px', cursor: 'pointer', fontWeight: '600' }}>
                + New
              </button>
            </div>
            <span style={{ fontSize: '9px', color: VS.textMuted, background: VS.input, padding: '1px 6px', borderRadius: '8px' }}>{Object.keys(hierarchy).length} pages · {hierRoots.length} roots</span>
            <div style={{ flex: 1 }} />
            {hierMsg && (
              <span style={{ fontSize: '9px', padding: '1px 7px', borderRadius: '3px', background: hierMsg.type === 'success' ? VS.greenDim : VS.redDim, color: hierMsg.type === 'success' ? VS.green : VS.red, border: `1px solid ${hierMsg.type === 'success' ? VS.green + '44' : VS.red + '44'}` }}>
                {hierMsg.text}
              </span>
            )}
            <button onClick={() => { const code = exportHierarchyAsCode(); navigator.clipboard?.writeText(code).catch(() => {}); setHierMsg({ type: 'success', text: 'Copied!' }); setTimeout(() => setHierMsg(null), 2000); }}
              style={{ padding: '2px 8px', background: VS.accentLight, border: `1px solid ${VS.accent}44`, borderRadius: '3px', fontSize: '9px', cursor: 'pointer', color: VS.blue, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Database size={9} /> Export
            </button>
            <button onClick={clearAllHierarchy}
              style={{ padding: '2px 8px', background: VS.redDim, border: `1px solid ${VS.red}44`, borderRadius: '3px', fontSize: '9px', cursor: 'pointer', color: VS.red }}>
              Clear
            </button>
          </div>

          {/* DB Hierarchy panel */}
          <div style={{ padding: '5px 10px', background: '#252526', borderBottom: `1px solid ${VS.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Database size={10} style={{ color: VS.purple }} />
              <span style={{ fontSize: '9px', color: VS.purple, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>DB Hierarchy</span>
              <select value={hierCompany} onChange={e => setHierCompany(e.target.value)}
                style={{ padding: '2px 6px', fontSize: '9px', border: `1px solid ${VS.border}`, borderRadius: '3px', background: VS.input, color: VS.text, outline: 'none', maxWidth: '140px', fontFamily: 'inherit' }}>
                <option value="">— Company —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
              <select value={hierRole} onChange={e => setHierRole(e.target.value)} disabled={!hierCompany}
                style={{ padding: '2px 6px', fontSize: '9px', border: `1px solid ${VS.border}`, borderRadius: '3px', background: hierCompany ? VS.input : VS.bg, color: VS.text, outline: 'none', maxWidth: '140px', opacity: hierCompany ? 1 : 0.5, fontFamily: 'inherit' }}>
                <option value="">— Role —</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
              </select>
              {hierCompany && hierRole && dbHierarchies.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {dbHierarchies.map(dbH => (
                    <div key={dbH.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: activeDbHierarchyId === dbH.id ? VS.accentLight : VS.input, border: `1px solid ${activeDbHierarchyId === dbH.id ? VS.accent : VS.border}`, borderRadius: '3px', padding: '1px 4px' }}>
                      <button onClick={() => openDbHierarchy(dbH)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '9px', color: activeDbHierarchyId === dbH.id ? VS.blue : VS.textDim, padding: '0 2px', fontFamily: 'inherit' }}>
                        {activeDbHierarchyId === dbH.id ? '✓ ' : ''}{dbH.name}
                      </button>
                      <button onClick={() => openRestoreModal(dbH)} title="History" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', color: VS.textMuted }}>
                        <RefreshCw size={8} />
                      </button>
                      <button onClick={() => deleteDbHierarchy(dbH)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', color: VS.red }}>
                        <X size={8} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ flex: 1 }} />
              <button onClick={saveHierarchyToDB} disabled={dbSaving || !hierCompany || !hierRole}
                style={{ padding: '2px 8px', fontSize: '9px', background: (dbSaving || !hierCompany || !hierRole) ? VS.input : VS.accent, border: 'none', borderRadius: '3px', cursor: (dbSaving || !hierCompany || !hierRole) ? 'not-allowed' : 'pointer', color: '#fff', opacity: (dbSaving || !hierCompany || !hierRole) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {dbSaving ? <RefreshCw size={9} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={9} />}
                {dbSaving ? 'Saving…' : activeDbHierarchyId ? 'Update DB' : 'Save to DB'}
              </button>
              {dbMsg && <span style={{ fontSize: '9px', padding: '1px 7px', borderRadius: '3px', background: dbMsg.type === 'success' ? VS.greenDim : VS.redDim, color: dbMsg.type === 'success' ? VS.green : VS.red }}>{dbMsg.text}</span>}
            </div>
          </div>

          {/* Module filter strip */}
          {(() => {
            const iconGroups = {};
            pages.forEach(p => {
              const module = getModuleNameFromUrl(p.page_url);
              if (!iconGroups[module]) iconGroups[module] = { module, pages: [] };
              iconGroups[module].pages.push(p);
            });
            const groupKeys = Object.keys(iconGroups);
            if (groupKeys.length === 0) return null;
            return (
              <div style={{ padding: '5px 10px', background: VS.bg, borderBottom: `1px solid ${VS.border}`, display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', flexShrink: 0 }}>
                <span style={{ fontSize: '9px', color: VS.textMuted, flexShrink: 0 }}>Filter:</span>
                <button onClick={() => setHierIconFilter(null)}
                  style={{ padding: '1px 8px', fontSize: '9px', background: hierIconFilter === null ? VS.accentLight : 'transparent', border: `1px solid ${hierIconFilter === null ? VS.accent : VS.border}`, borderRadius: '3px', cursor: 'pointer', color: hierIconFilter === null ? VS.blue : VS.textDim }}>
                  All
                </button>
                {groupKeys.map(key => {
                  const isActive = hierIconFilter === key;
                  return (
                    <button key={key} onClick={() => setHierIconFilter(isActive ? null : key)}
                      style={{ padding: '1px 8px', fontSize: '9px', background: isActive ? VS.accentLight : 'transparent', border: `1px solid ${isActive ? VS.accent : VS.border}`, borderRadius: '3px', cursor: 'pointer', color: isActive ? VS.blue : VS.textDim }}>
                      {key}
                      <span style={{ marginLeft: '4px', color: VS.textMuted }}>({iconGroups[key].pages.length})</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* Parent-picking banner */}
          {hierSelectParent !== null && (
            <div style={{ padding: '5px 10px', background: VS.yellowDim, borderBottom: `1px solid ${VS.yellow}44`, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: VS.yellow, flexShrink: 0 }}>
              <ArrowRight size={12} style={{ color: VS.yellow }} />
              <span>Click a node in the tree to make it the parent of <strong>{pages.find(p => p.id === hierSelectParent)?.page_name}</strong></span>
              <button onClick={() => setHierSelectParent(null)} style={{ marginLeft: 'auto', padding: '1px 8px', background: 'transparent', border: `1px solid ${VS.yellow}44`, borderRadius: '3px', fontSize: '9px', cursor: 'pointer', color: VS.yellow }}>✕ Cancel</button>
            </div>
          )}

          {/* Split panel: Tree (left) + Available Pages (right) */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

            {/* LEFT: VS Code Explorer Tree */}
            <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${VS.border}`, overflow: 'hidden', background: VS.sidebar }}>
              {/* Explorer title bar */}
              <div style={{ height: '22px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '8px', background: '#2c2c2c', borderBottom: `1px solid ${VS.border}`, flexShrink: 0 }}>
                <span style={{ fontSize: '10px', color: VS.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', flex: 1 }}>Explorer — Hierarchy Tree</span>
                <div style={{ position: 'relative' }}>
                  <Search size={10} style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', color: VS.textMuted }} />
                  <input value={hierSearchTerm} onChange={e => setHierSearchTerm(e.target.value)} placeholder="Search..."
                    style={{ padding: '2px 6px 2px 20px', fontSize: '10px', border: `1px solid ${VS.border}`, borderRadius: '3px', width: '110px', outline: 'none', background: VS.input, color: VS.text, fontFamily: 'inherit' }} />
                </div>
              </div>

              {/* Tree content */}
              <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
                {hierRoots.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: VS.textMuted }}>
                    <GitBranch size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                    <div style={{ fontSize: '11px', color: VS.textDim, marginBottom: '4px' }}>No hierarchy yet</div>
                    <div style={{ fontSize: '9px', color: VS.textMuted }}>Add pages from the right panel →</div>
                  </div>
                ) : hierRoots.map(rootId => renderHierNode(rootId, 0))}
              </div>


            </div>

            {/* RIGHT: Available Pages */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: VS.bg }}>
              {/* Header */}
              <div style={{ height: '22px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '8px', background: '#2c2c2c', borderBottom: `1px solid ${VS.border}`, flexShrink: 0 }}>
                <span style={{ fontSize: '10px', color: VS.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', flex: 1 }}>
                  Available Pages
                  <span style={{ marginLeft: '6px', fontSize: '9px', color: VS.textMuted, background: VS.input, padding: '0 5px', borderRadius: '8px', fontWeight: '400' }}>{unlinkedPages.length}</span>
                </span>
                {unlinkedPages.length > 0 && (
                  <button onClick={() => { const pagesToAdd = unlinkedPages.filter(p => !hierIconFilter || getModuleNameFromUrl(p.page_url) === hierIconFilter); pagesToAdd.forEach(p => addRootFn(p.id)); }}
                    style={{ padding: '1px 8px', background: VS.accentLight, border: `1px solid ${VS.accent}44`, borderRadius: '3px', fontSize: '9px', cursor: 'pointer', color: VS.blue, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Plus size={9} /> Add All
                  </button>
                )}
              </div>

              {/* Search */}
              <div style={{ padding: '5px 10px', borderBottom: `1px solid ${VS.border}`, flexShrink: 0 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={10} style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: VS.textMuted }} />
                  <input value={availSearchTerm} onChange={e => setAvailSearchTerm(e.target.value)} placeholder="Search available pages..."
                    style={{ width: '100%', padding: '4px 8px 4px 22px', fontSize: '10px', border: `1px solid ${VS.border}`, borderRadius: '3px', outline: 'none', background: VS.input, color: VS.text, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
              </div>

              {/* List */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                {unlinkedPages.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: VS.textMuted }}>
                    <CheckCircle size={24} style={{ margin: '0 auto 6px', color: VS.green }} />
                    <div style={{ fontSize: '10px', color: VS.green }}>All pages configured!</div>
                  </div>
                ) : unlinkedPages.filter(p => {
                  if (hierIconFilter !== null && getModuleNameFromUrl(p.page_url) !== hierIconFilter) return false;
                  if (availSearchTerm) return p.page_name.toLowerCase().includes(availSearchTerm.toLowerCase()) || p.page_url.toLowerCase().includes(availSearchTerm.toLowerCase());
                  return true;
                }).map(page => (
                  <div key={page.id}
                    draggable onDragStart={() => setHierDragSource(page.id)} onDragEnd={() => { setHierDragSource(null); setHierDragOver(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', cursor: 'grab', opacity: hierDragSource === page.id ? 0.4 : 1, transition: 'background 0.1s', borderBottom: `1px solid ${VS.border}33` }}
                    onMouseEnter={e => e.currentTarget.style.background = '#2a2d2e'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <GripVertical size={10} style={{ color: VS.textMuted, flexShrink: 0 }} />
                    <FileText size={12} style={{ color: VS.blue, flexShrink: 0 }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '11px', color: VS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.page_name}</div>
                      <div style={{ fontSize: '9px', color: VS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.page_url}</div>
                    </div>
                    <button onClick={() => addRootFn(page.id)}
                      style={{ padding: '2px 8px', background: VS.accentLight, border: `1px solid ${VS.accent}44`, borderRadius: '3px', fontSize: '9px', cursor: 'pointer', color: VS.blue, flexShrink: 0, fontWeight: '600' }}>
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Add Page Modal */}
      {showAddPage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: VS.sidebar, borderRadius: '6px', padding: '20px', width: '90%', maxWidth: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: `1px solid ${VS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: VS.textBright, display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={13} style={{ color: VS.accent }} /> Add New Page</span>
              <button onClick={() => setShowAddPage(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: VS.textMuted }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[{ label: 'Page Name *', key: 'page_name', ph: 'e.g., Add Company' }, { label: 'Page URL *', key: 'page_url', ph: 'e.g., /admin-master/add-company' }, { label: 'Icon Name', key: 'icon_name', ph: 'e.g., Building2' }].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '9px', color: VS.textMuted, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.label}</label>
                  <input value={newPage[f.key]} onChange={e => setNewPage({ ...newPage, [f.key]: e.target.value })} placeholder={f.ph}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '11px', border: `1px solid ${VS.border}`, borderRadius: '4px', background: VS.input, color: VS.text, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '9px', color: VS.textMuted, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                <textarea value={newPage.description} onChange={e => setNewPage({ ...newPage, description: e.target.value })} placeholder="Brief description"
                  style={{ width: '100%', padding: '6px 8px', fontSize: '11px', border: `1px solid ${VS.border}`, borderRadius: '4px', background: VS.input, color: VS.text, minHeight: '56px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddPage(false)} style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${VS.border}`, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: VS.textDim }}>Cancel</button>
              <button onClick={handleAddNewPage} style={{ padding: '6px 14px', background: VS.accent, border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}><Plus size={11} /> Add Page</button>
            </div>
          </div>
        </div>
      )}

      {/* Dependency Modal */}
      {showDepModal && (() => {
        const pg = pages.find(p => p.id === showDepModal);
        const currentDeps = pageDependencies[showDepModal] || [];
        const availableForDep = pages.filter(p => p.id !== showDepModal && !currentDeps.includes(p.id));
        const filteredDep = availableForDep.filter(p => p.page_name.toLowerCase().includes(depSearchTerm.toLowerCase()) || p.page_url.toLowerCase().includes(depSearchTerm.toLowerCase()));
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div style={{ background: VS.sidebar, borderRadius: '6px', padding: '20px', width: '90%', maxWidth: '500px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: `1px solid ${VS.border}`, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: VS.textBright }}>Page Dependencies</div>
                  <div style={{ fontSize: '9px', color: VS.textMuted, marginTop: '2px' }}>{pg?.page_name}</div>
                </div>
                <button onClick={() => setShowDepModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: VS.textMuted }}><X size={16} /></button>
              </div>
              {currentDeps.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '9px', color: VS.textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Dependencies</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {currentDeps.map(did => {
                      const dp = pages.find(p => p.id === did);
                      return dp ? (
                        <span key={did} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '3px', background: VS.yellowDim, color: VS.yellow, border: `1px solid ${VS.yellow}44`, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {dp.page_name}
                          <button onClick={() => removeDependency(showDepModal, did)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: VS.red, padding: 0, display: 'flex' }}><X size={9} /></button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              <div style={{ position: 'relative', marginBottom: '8px', flexShrink: 0 }}>
                <Search size={11} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: VS.textMuted }} />
                <input type="text" placeholder="Search pages..." value={depSearchTerm} onChange={e => setDepSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px 6px 26px', fontSize: '11px', border: `1px solid ${VS.border}`, borderRadius: '4px', background: VS.input, color: VS.text, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {filteredDep.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', borderRadius: '3px', border: `1px solid ${VS.border}`, background: VS.bg }}>
                    <div>
                      <div style={{ fontSize: '11px', color: VS.textBright }}>{p.page_name}</div>
                      <div style={{ fontSize: '9px', color: VS.textMuted }}>{p.page_url}</div>
                    </div>
                    <button onClick={() => addDependency(showDepModal, p.id)}
                      style={{ padding: '3px 10px', background: VS.yellowDim, border: `1px solid ${VS.yellow}44`, borderRadius: '3px', fontSize: '9px', cursor: 'pointer', color: VS.yellow, fontWeight: '600' }}>
                      + Add
                    </button>
                  </div>
                ))}
                {filteredDep.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: VS.textMuted, fontSize: '10px' }}>No pages found</div>}
              </div>
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowDepModal(null)} style={{ padding: '6px 16px', background: VS.accent, border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', color: '#fff' }}>Done</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Child Pages Modal */}
      {showChildPagesModal && (() => {
        const { rootPageId, rootPageName } = showChildPagesModal;
        // Get ALL children (before exclusion filter) from hierarchy directly
        const activeHier = grantAccessDbHierarchy || hierarchy;
        const collectAllChildren = (pid, depth) => {
          const result = [];
          const node = activeHier[pid] || activeHier[String(pid)];
          if (!node) return result;
          (node.children || []).forEach(cid => {
            const cidInt = parseInt(cid);
            const child = pages.find(p => p.id === cidInt);
            if (child) { result.push({ page: child, depth }); collectAllChildren(cidInt, depth + 1).forEach(gc => result.push(gc)); }
          });
          return result;
        };
        const allChildren = collectAllChildren(rootPageId, 1);
        const excluded = excludedChildPages[rootPageId] || new Set();

        const toggleExclude = (childId) => {
          setExcludedChildPages(prev => {
            const prevSet = new Set(prev[rootPageId] || []);
            if (prevSet.has(childId)) prevSet.delete(childId);
            else prevSet.add(childId);
            return { ...prev, [rootPageId]: prevSet };
          });
        };

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3500 }}>
            <div style={{ background: VS.sidebar, borderRadius: '6px', padding: '20px', width: '90%', maxWidth: '480px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: `1px solid ${VS.border}`, maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: VS.textBright, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <GitBranch size={13} style={{ color: VS.green }} /> Child Pages
                  </div>
                  <div style={{ fontSize: '9px', color: VS.textMuted, marginTop: '2px' }}>{rootPageName} · {allChildren.length} total · {excluded.size > 0 ? <span style={{ color: VS.red }}>{excluded.size} excluded</span> : 'all included'}</div>
                </div>
                <button onClick={() => setShowChildPagesModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: VS.textMuted }}><X size={16} /></button>
              </div>
              {excluded.size > 0 && (
                <div style={{ fontSize: '9px', color: VS.yellow, background: VS.yellowDim, border: `1px solid ${VS.yellow}33`, borderRadius: '3px', padding: '4px 8px', marginBottom: '8px' }}>
                  ⚠ Excluded pages will NOT receive auto-granted access. Click Restore to re-include.
                </div>
              )}
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {allChildren.map(({ page: cp, depth }) => {
                  const isExcluded = excluded.has(cp.id);
                  return (
                    <div key={cp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', paddingLeft: `${8 + (depth - 1) * 16}px`, borderRadius: '3px', border: `1px solid ${isExcluded ? VS.red + '55' : VS.border}`, background: isExcluded ? VS.redDim : VS.bg, opacity: isExcluded ? 0.7 : 1 }}>
                      {renderPageIcon(cp.icon_name, 11, isExcluded ? VS.red : VS.blue)}
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '11px', color: isExcluded ? VS.textMuted : VS.textBright, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isExcluded ? 'line-through' : 'none' }}>{cp.page_name}</div>
                        <div style={{ fontSize: '9px', color: VS.textMuted }}>{cp.page_url}</div>
                      </div>
                      <span style={{ fontSize: '8px', color: VS.textMuted, background: VS.input, padding: '1px 5px', borderRadius: '8px', flexShrink: 0 }}>L{depth}</span>
                      <button
                        onClick={() => toggleExclude(cp.id)}
                        title={isExcluded ? 'Restore (include in auto-grant)' : 'Remove (exclude from auto-grant)'}
                        style={{ padding: '2px 8px', background: isExcluded ? VS.greenDim : VS.redDim, border: `1px solid ${isExcluded ? VS.green + '44' : VS.red + '44'}`, borderRadius: '3px', fontSize: '9px', cursor: 'pointer', color: isExcluded ? VS.green : VS.red, fontWeight: '600', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {isExcluded ? <><Check size={9} /> Restore</> : <><X size={9} /> Remove</>}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowChildPagesModal(null)} style={{ padding: '6px 16px', background: VS.accent, border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', color: '#fff' }}>Done</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Restore Modal */}
      {showRestoreModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2500 }}>
          <div style={{ background: VS.sidebar, borderRadius: '6px', padding: '20px', width: '90%', maxWidth: '520px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: `1px solid ${VS.border}`, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: VS.textBright }}>Restore Hierarchy</div>
                <div style={{ fontSize: '9px', color: VS.purple, marginTop: '2px' }}>{showRestoreModal.name}</div>
              </div>
              <button onClick={() => setShowRestoreModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: VS.textMuted }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {restoreLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: VS.purple, fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading snapshots…
                </div>
              ) : restoreLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: VS.textMuted, fontSize: '10px' }}>No snapshots found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {restoreLogs.map(log => (
                    <div key={log.log_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '3px', border: `1px solid ${VS.border}`, background: VS.bg }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: VS.textBright, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '8px', padding: '1px 7px', borderRadius: '3px',
                            background: log.action === 'CREATE' ? VS.greenDim : log.action === 'RESTORE' ? VS.purpleDim : log.action === 'DELETE' ? VS.redDim : VS.blueDim,
                            color: log.action === 'CREATE' ? VS.green : log.action === 'RESTORE' ? VS.purple : log.action === 'DELETE' ? VS.red : VS.blue,
                            fontWeight: '700' }}>{log.action}</span>
                          {log.note && <span style={{ fontSize: '9px', color: VS.textDim }}>{log.note}</span>}
                        </div>
                        <div style={{ fontSize: '8px', color: VS.textMuted, marginTop: '2px' }}>{new Date(log.created_at).toLocaleString()}</div>
                      </div>
                      {log.action !== 'DELETE' && (
                        <button onClick={() => restoreFromLog(log)}
                          style={{ padding: '3px 10px', background: VS.accentLight, border: `1px solid ${VS.accent}44`, borderRadius: '3px', fontSize: '9px', fontWeight: '700', cursor: 'pointer', color: VS.blue, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <RefreshCw size={9} /> Restore
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowRestoreModal(null)} style={{ padding: '6px 16px', background: 'transparent', border: `1px solid ${VS.border}`, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: VS.textDim }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New Hierarchy Name Modal */}
      {showNewHierInput && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: VS.sidebar, borderRadius: '6px', padding: '20px', width: '90%', maxWidth: '340px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: `1px solid ${VS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <GitBranch size={16} style={{ color: VS.green }} />
              <span style={{ fontSize: '12px', fontWeight: '700', color: VS.textBright }}>New Hierarchy</span>
              <button onClick={() => { setShowNewHierInput(false); setNewHierName(''); setHierIconFilter(null); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: VS.textMuted }}><X size={16} /></button>
            </div>
            <label style={{ display: 'block', fontSize: '9px', color: VS.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hierarchy Name</label>
            <input autoFocus value={newHierName} onChange={e => setNewHierName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newHierName.trim()) {
                  const n = newHierName.trim();
                  setAllHierarchies(prev => { const upd = { ...prev, [n]: {} }; try { localStorage.setItem(MULTI_HIER_KEY, JSON.stringify(upd)); } catch {} return upd; });
                  saveHierarchyMeta(n, hierIconFilter || n);
                  setActiveHierName(n); setNewHierName(''); setShowNewHierInput(false);
                }
                if (e.key === 'Escape') { setShowNewHierInput(false); setNewHierName(''); setHierIconFilter(null); }
              }}
              placeholder="e.g., Admin Hierarchy"
              style={{ width: '100%', padding: '7px 10px', fontSize: '11px', border: `1px solid ${VS.border}`, borderRadius: '4px', background: VS.input, color: VS.text, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
            <div style={{ marginTop: '14px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowNewHierInput(false); setNewHierName(''); setHierIconFilter(null); }}
                style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${VS.border}`, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: VS.textDim }}>Cancel</button>
              <button disabled={!newHierName.trim()}
                onClick={() => {
                  const n = newHierName.trim(); if (!n) return;
                  setAllHierarchies(prev => { const upd = { ...prev, [n]: {} }; try { localStorage.setItem(MULTI_HIER_KEY, JSON.stringify(upd)); } catch {} return upd; });
                  saveHierarchyMeta(n, hierIconFilter || n);
                  setActiveHierName(n); setNewHierName(''); setShowNewHierInput(false);
                }}
                style={{ padding: '6px 14px', background: newHierName.trim() ? VS.accent : VS.input, border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: newHierName.trim() ? 'pointer' : 'not-allowed', color: '#fff', display: 'flex', alignItems: 'center', gap: '5px', opacity: newHierName.trim() ? 1 : 0.5 }}>
                <GitBranch size={11} /> Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HOVER STYLES FOR TREE NODES ── */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .hier-node-row:hover .hier-node-actions { opacity: 1 !important; }
        div[draggable]:hover .hier-node-actions { opacity: 1 !important; }
      `}</style>
    </div>
  );
};

export default RoleAccessForCompaniesPlant;