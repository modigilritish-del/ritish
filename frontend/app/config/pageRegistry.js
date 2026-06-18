// app/config/pageRegistry.js
/**
 * ============================================
 * AUTO PAGE REGISTRY - FULLY AUTOMATIC
 * Automatically discovers ALL pages from iconLoader
 * NO MANUAL CONFIGURATION NEEDED!
 * ============================================
 */

import { getAllIconsWithStructure, getAllConfigLinks } from '../utils/iconLoader';
import { adminMasterLinks } from './adminMasterLinks';

// ============================================================
// 🔥 FIX: adminMasterLinks ka correct URL prefix
// iconLoader auto-discovery se path 'icon-admin-master' banta hai
// → prefix = 'admin-master'
// page_url = '/admin-master/add-company'  ← yahi backend mein hona chahiye
// ============================================================
const ADMIN_MASTER_PREFIX = 'admin-master';

/**
 * 🔥 AUTOMATIC PAGE COLLECTION
 * Gets all pages from ALL config files via iconLoader
 */
const collectAllPagesFromIcons = () => {
  const allPages = [];
  let pageCounter = 0;

  console.log('🔍 [REGISTRY] Starting automatic page collection from iconLoader...');

  try {
    // Get all icons with their complete structure
    const iconsWithStructure = getAllIconsWithStructure();

    console.log(`📦 [REGISTRY] Found ${iconsWithStructure.length} icons with configs`);

    // ─────────────────────────────────────────────────────────
    // STEP 1: Process all icons from iconLoader (auto-discovered)
    // ─────────────────────────────────────────────────────────
    iconsWithStructure.forEach(icon => {
      const category = icon.configDisplayName || icon.displayName;
      const pathPrefix = icon.path.replace(/^icon-/, '');

      console.log(`📁 [REGISTRY] Processing: ${icon.displayName} (${icon.linkCount} links)`);

      icon.links.forEach(link => {
        pageCounter++;
        const page = {
          page_name: link.name || `${category} Page ${pageCounter}`,
          page_url: link.path ? `/${pathPrefix}/${link.path}` : `/${pathPrefix}/page-${pageCounter}`,
          icon_name: extractIconName(link.icon),
          category: category,
          component: link.component?.name || link.path || `Page${pageCounter}`,
          description: link.description || `${category} - ${link.name}`,
          sourceConfig: icon.configName,
          sourceIcon: icon.name
        };
        allPages.push(page);
      });
    });

    // ─────────────────────────────────────────────────────────
    // STEP 2: 🔥 FIX — Explicitly verify/add adminMasterLinks
    // Ensure every link from adminMasterLinks has correct page_url
    // '/admin-master/{link.path}' — yahi RBAC filter mein match hoga
    // ─────────────────────────────────────────────────────────
    const adminAlreadySynced = allPages.some(p =>
      p.page_url.startsWith(`/${ADMIN_MASTER_PREFIX}/`)
    );

    if (!adminAlreadySynced && adminMasterLinks?.length > 0) {
      console.log(`🔧 [REGISTRY] adminMasterLinks not found via iconLoader — registering explicitly`);
      adminMasterLinks.forEach(link => {
        pageCounter++;
        allPages.push({
          page_name: link.name || `Admin Master Page ${pageCounter}`,
          page_url: link.path ? `/${ADMIN_MASTER_PREFIX}/${link.path}` : `/${ADMIN_MASTER_PREFIX}/page-${pageCounter}`,
          icon_name: extractIconName(link.icon),
          category: 'Admin Master',
          component: link.component?.name || link.path || `AdminPage${pageCounter}`,
          description: link.description || `Admin Master - ${link.name}`,
          sourceConfig: 'adminMasterLinks',
          sourceIcon: 'AdminMaster'
        });
      });
    } else if (adminAlreadySynced) {
      console.log(`✅ [REGISTRY] adminMasterLinks already registered via iconLoader (correct prefix confirmed)`);
      // Double-check: ensure all admin pages have correct prefix
      allPages.forEach(p => {
        if (p.sourceIcon === 'AdminMaster' && !p.page_url.startsWith(`/${ADMIN_MASTER_PREFIX}/`)) {
          console.warn(`⚠️ [REGISTRY] Fixing wrong prefix for: ${p.page_name} — was: ${p.page_url}`);
          // Extract last path segment and rebuild with correct prefix
          const segments = p.page_url.split('/').filter(Boolean);
          const lastSegment = segments[segments.length - 1];
          p.page_url = `/${ADMIN_MASTER_PREFIX}/${lastSegment}`;
        }
      });
    }

    console.log(`✅ [REGISTRY] Total pages collected: ${allPages.length}`);

    // Category breakdown
    const categoryCount = {};
    allPages.forEach(page => {
      categoryCount[page.category] = (categoryCount[page.category] || 0) + 1;
    });

    console.log('📊 [REGISTRY] Category Breakdown:');
    Object.entries(categoryCount).forEach(([cat, count]) => {
      console.log(`  • ${cat}: ${count} pages`);
    });

  } catch (error) {
    console.error('❌ [REGISTRY] Error collecting pages:', error);
  }

  return allPages;
};

/**
 * Extract icon name from component
 */
const extractIconName = (iconComponent) => {
  if (!iconComponent) return 'FileText';
  if (typeof iconComponent === 'string') return iconComponent;
  if (iconComponent.name) return iconComponent.name;
  if (iconComponent.displayName) return iconComponent.displayName;
  return 'FileText';
};

/**
 * 🔥 MAIN FUNCTION - Get all pages (cached)
 */
let cachedPages = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5000; // 5 seconds

const getAllPages = (forceRefresh = false) => {
  if (!forceRefresh && cachedPages && cacheTimestamp &&
    (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    console.log('📦 [REGISTRY] Using cached pages:', cachedPages.length);
    return cachedPages;
  }

  console.log('🔄 [REGISTRY] Refreshing page collection...');
  const pages = collectAllPagesFromIcons();

  cachedPages = pages;
  cacheTimestamp = Date.now();

  return pages;
};

// ==================== GROUP BY CATEGORY ====================
export const getPagesByCategory = () => {
  const pages = getAllPages();
  const grouped = {};

  pages.forEach(page => {
    const category = page.category || 'Uncategorized';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(page);
  });

  return grouped;
};

// ==================== SEARCH PAGES ====================
export const searchPages = (searchTerm) => {
  const pages = getAllPages();
  const term = (searchTerm || '').toLowerCase().trim();

  if (!term) return pages;

  return pages.filter(page =>
    page.page_name.toLowerCase().includes(term) ||
    page.page_url.toLowerCase().includes(term) ||
    page.category.toLowerCase().includes(term) ||
    (page.description && page.description.toLowerCase().includes(term))
  );
};

// ==================== GET PAGE STATISTICS ====================
export const getPageStatistics = () => {
  const pages = getAllPages();
  const categories = getPagesByCategory();

  const stats = {
    totalPages: pages.length,
    categories: Object.keys(categories),
    categoryCount: Object.keys(categories).length,
    pagesByCategory: Object.entries(categories).map(([category, items]) => ({
      category,
      count: items.length
    })),
    lastUpdated: new Date(cacheTimestamp || Date.now()).toISOString()
  };

  console.log('📊 [REGISTRY] Statistics:', stats);
  return stats;
};

// ==================== REFRESH PAGES ====================
export const refreshPages = () => {
  console.log('🔄 [REGISTRY] Force refreshing all pages...');
  cachedPages = null;
  cacheTimestamp = null;
  return getAllPages(true);
};

// ==================== GET BY SOURCE CONFIG ====================
export const getPagesByConfig = (configName) => {
  const pages = getAllPages();
  return pages.filter(page => page.sourceConfig === configName);
};

// ==================== GET BY SOURCE ICON ====================
export const getPagesByIcon = (iconName) => {
  const pages = getAllPages();
  return pages.filter(page => page.sourceIcon === iconName);
};

// ==================== MAIN EXPORT ====================
export const pageRegistry = {
  getAllPages: () => getAllPages(),
  getPagesByCategory,
  searchPages,
  getPageStatistics,
  refreshPages,
  getPagesByConfig,
  getPagesByIcon,

  get totalPages() {
    return getAllPages().length;
  },

  get categories() {
    return Object.keys(getPagesByCategory());
  },

  getFormattedForBackend() {
    return getAllPages().map(page => ({
      page_name: page.page_name,
      page_url: page.page_url,
      icon_name: page.icon_name,
      category: page.category,
      description: page.description
    }));
  },

  getCategoryPages(categoryName) {
    const grouped = getPagesByCategory();
    return grouped[categoryName] || [];
  }
};

// ==================== DEBUG INFO ====================
if (typeof window !== 'undefined') {
  window.pageRegistry = pageRegistry;

  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('📚 PAGE REGISTRY - AUTOMATIC SYSTEM');
  console.log('╠═══════════════════════════════════════════════════╣');

  const stats = pageRegistry.getPageStatistics();
  console.log(`Total Pages: ${stats.totalPages}`);
  console.log(`Categories: ${stats.categoryCount}`);
  console.log('');
  console.log('Category Distribution:');
  stats.pagesByCategory.forEach(({ category, count }) => {
    console.log(`  • ${category}: ${count} pages`);
  });
  console.log('');
  console.log('🔧 Debug Functions:');
  console.log('  - window.pageRegistry.getAllPages()');
  console.log('  - window.pageRegistry.getPagesByCategory()');
  console.log('  - window.pageRegistry.searchPages(term)');
  console.log('  - window.pageRegistry.refreshPages()');
  console.log('  - window.pageRegistry.getPagesByConfig(name)');
  console.log('  - window.pageRegistry.getPagesByIcon(name)');
  console.log('╚═══════════════════════════════════════════════════╝');
}

// ==================== AUTO-REFRESH ON ICON CHANGES ====================
if (typeof window !== 'undefined') {
  const originalRefresh = window.refreshIconPages;
  if (originalRefresh) {
    window.refreshIconPages = () => {
      const result = originalRefresh();
      console.log('🔄 [REGISTRY] Auto-refreshing pages after iconLoader refresh...');
      refreshPages();
      return result;
    };
  }
}

export default pageRegistry;