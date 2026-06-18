// app/utils/menuRefreshHelper.js
/**
 * ============================================
 * MENU REFRESH HELPER
 * Automatically refreshes menu when access changes
 * ============================================
 */

import { refreshAccessCache } from './rbacLinkFilter';

/**
 * Call this function after granting/revoking access
 * It will refresh the menu automatically
 */
export const triggerMenuRefresh = async (refreshCallback) => {
  try {
    console.log('🔄 [MENU REFRESH] Triggering menu refresh...');
    
    // Step 1: Clear and refresh access cache
    await refreshAccessCache();
    
    // Step 2: Trigger context refresh if callback provided
    if (refreshCallback && typeof refreshCallback === 'function') {
      refreshCallback();
    }
    
    console.log('✅ [MENU REFRESH] Menu refreshed successfully');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ [MENU REFRESH] Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Use this in RoleAccessForCompaniesPlant after saving access
 */
export const refreshMenuAfterAccessChange = (refreshCallback) => {
  console.log('🔄 [MENU REFRESH] Access changed, refreshing menu...');
  
  // Clear userMenu from sessionStorage to force re-fetch
  sessionStorage.removeItem('userMenu');
  
  // Trigger refresh
  return triggerMenuRefresh(refreshCallback);
};

/**
 * Listen for storage changes (for cross-tab sync)
 */
export const setupMenuRefreshListener = (refreshCallback) => {
  const handleStorageChange = (event) => {
    if (event.key === 'userMenu' && event.newValue) {
      console.log('🔄 [MENU REFRESH] Menu updated in another tab, refreshing...');
      if (refreshCallback && typeof refreshCallback === 'function') {
        refreshCallback();
      }
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};
