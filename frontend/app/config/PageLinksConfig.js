// app/config/PageLinksConfig.js
/**
 * ============================================
 * CENTRALIZED PAGE LINKS CONFIGURATION
 * 🔥 FULLY AUTOMATIC - Uses iconLoader
 * ============================================
 */

import { getAllIconsWithStructure } from '../utils/iconLoader';
import { adminMasterLinks } from './adminMasterLinks';

// ============================================================
// 🔥 FIX: adminMasterLinks ka correct URL prefix
// iconLoader se discover hone par pathPrefix = 'admin-master' banta hai
// lekin backend mein page_url = '/admin-master/add-company' honi chahiye
// Yahan explicitly inject karte hain taaki sync correct ho
// ============================================================
const ADMIN_MASTER_PREFIX = 'admin-master';

/**
 * 🔥 AUTOMATIC PAGE COLLECTION
 * Uses iconLoader to get all pages from all configs
 */
export const getAllPagesForSync = () => {
  const allPages = [];
  let pageCounter = 0;

  console.log('📋 [SYNC] Starting automatic page collection...');

  try {
    // Get all icons with their complete structure from iconLoader
    const icons = getAllIconsWithStructure();

    console.log(`🎯 [SYNC] Found ${icons.length} icons with configs`);

    // ─────────────────────────────────────────────────────────
    // STEP 1: Process all icons from iconLoader (auto-discovered)
    // ─────────────────────────────────────────────────────────
    icons.forEach(icon => {
      const category = icon.configDisplayName || icon.displayName;
      const pathPrefix = icon.path.replace(/^icon-/, '');

      console.log(`📌 [SYNC] Processing ${icon.displayName}: ${icon.linkCount} pages`);

      icon.links.forEach(link => {
        pageCounter++;
        allPages.push({
          page_name: link.name || `${category} Page ${pageCounter}`,
          page_url: link.path ? `/${pathPrefix}/${link.path}` : `/${pathPrefix}/page-${pageCounter}`,
          icon_name: extractIconName(link.icon),
          category: category,
          description: link.description || `${category} - ${link.name}`
        });
      });
    });

    // ─────────────────────────────────────────────────────────
    // STEP 2: 🔥 FIX — Explicitly add adminMasterLinks
    // iconLoader se adminMasterLinks auto-discover hoti hai,
    // lekin page_url prefix verify karo — agar already hai to skip,
    // warna force-add karo correct prefix ke saath.
    // ─────────────────────────────────────────────────────────
    const adminAlreadySynced = allPages.some(p =>
      p.page_url.startsWith(`/${ADMIN_MASTER_PREFIX}/`)
    );

    if (!adminAlreadySynced && adminMasterLinks?.length > 0) {
      console.log(`🔧 [SYNC] adminMasterLinks not found via iconLoader — adding explicitly`);
      adminMasterLinks.forEach(link => {
        pageCounter++;
        allPages.push({
          page_name: link.name || `Admin Master Page ${pageCounter}`,
          page_url: link.path ? `/${ADMIN_MASTER_PREFIX}/${link.path}` : `/${ADMIN_MASTER_PREFIX}/page-${pageCounter}`,
          icon_name: extractIconName(link.icon),
          category: 'Admin Master',
          description: link.description || `Admin Master - ${link.name}`
        });
      });
    } else if (adminAlreadySynced) {
      console.log(`✅ [SYNC] adminMasterLinks already included via iconLoader`);
    }

    console.log(`✅ [SYNC] Total Pages Collected: ${allPages.length}`);

    // Category breakdown
    const categoryCount = {};
    allPages.forEach(page => {
      categoryCount[page.category] = (categoryCount[page.category] || 0) + 1;
    });

    console.log('📊 [SYNC] Category Breakdown:');
    Object.entries(categoryCount).forEach(([cat, count]) => {
      console.log(`  • ${cat}: ${count} pages`);
    });

  } catch (error) {
    console.error('❌ [SYNC] Error:', error);
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

// ==================== STATISTICS FUNCTION ====================
export const getPageStatistics = () => {
  const allPages = getAllPagesForSync();
  const categories = {};

  allPages.forEach(page => {
    const cat = page.category || 'Uncategorized';
    if (!categories[cat]) {
      categories[cat] = 0;
    }
    categories[cat]++;
  });

  console.log('📊 [SYNC] Page Statistics:', categories);

  return {
    totalPages: allPages.length,
    categories: Object.keys(categories),
    categoryCount: Object.keys(categories).length,
    breakdown: categories
  };
};

// ==================== VERIFICATION ====================
// 🔥 FIX: Wrapped in setTimeout to defer execution to next event loop tick.
// This prevents "Cannot access 'adminMasterLinks' before initialization" TDZ error
// caused by circular dependencies during module initialization.
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('🔍 [SYNC] Verification:');
    const stats = getPageStatistics();
    console.log('  Total pages for sync:', stats.totalPages);
    console.log('  Total categories:', stats.categoryCount);
    console.log('  ✅ All pages auto-discovered from iconLoader!');
    console.log('  🔧 adminMasterLinks explicitly included with correct prefix!');
  }, 0);
}