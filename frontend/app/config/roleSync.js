// config/roleSync.js
/**
 * ============================================
 * OPTIONAL BACKUP - NOT NEEDED
 * Auto sync already built into RoleAccessForCompaniesPlant component
 * ============================================
 */

import { pageRegistry } from './pageRegistry';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

// Main auto sync function
export const autoSyncPages = async () => {
  try {
    const allPages = pageRegistry.getAllPages();
    console.log('🔄 Auto-syncing pages...', allPages.length);
    
    const response = await fetch(`${API_BASE_URL}/rbac/sync-pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allPages)
    });
    
    if (!response.ok) throw new Error('Sync failed');
    
    const result = await response.json();
    console.log('✅ Sync completed:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Sync error:', error);
    return { success: false, error: error.message };
  }
};
