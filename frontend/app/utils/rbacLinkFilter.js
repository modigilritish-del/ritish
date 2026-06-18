// app/utils/rbacLinkFilter.js
/**
 * 🔥 RBAC Link Filter - Smart Filtering System
 * Filters config links based on backend RBAC permissions
 * Works with existing icon system without breaking it
 */

const API_BASE = 'http://localhost:8000/api';

/**
 * Main function: Filter any link array based on user's accessible pages
 */
export async function filterLinksByAccess(linksArray) {
  try {
    console.log('🔍 [FILTER] Starting link filtering...');
    console.log('📦 [FILTER] Input links:', linksArray.length);

    // Get user's accessible pages from backend
    const accessiblePages = await getUserAccessiblePages();
    
    if (!accessiblePages || accessiblePages.length === 0) {
      console.warn('⚠️ [FILTER] No accessible pages found');
      return []; // Return empty if no access
    }

    console.log('✅ [FILTER] Accessible pages:', accessiblePages.length);

    // Filter links that match accessible pages
    const filteredLinks = linksArray.filter(link => {
      // Check if link's path matches any accessible page URL
      const isAccessible = accessiblePages.some(page => {
        // Match by path
        if (page.page_url.includes(link.path)) return true;
        
        // Match by name (case-insensitive)
        if (page.page_name.toLowerCase().includes(link.name.toLowerCase())) return true;
        
        return false;
      });

      if (isAccessible) {
        console.log('✅ [FILTER] Access granted:', link.name);
      } else {
        console.log('❌ [FILTER] Access denied:', link.name);
      }

      return isAccessible;
    });

    console.log('🎯 [FILTER] Filtered links:', filteredLinks.length);
    return filteredLinks;

  } catch (error) {
    console.error('❌ [FILTER] Error:', error);
    // On error, return empty array (safe fallback)
    return [];
  }
}

/**
 * Get all accessible page URLs for current user
 */
async function getUserAccessiblePages() {
  try {
    const storedUser = sessionStorage.getItem('userData');
    if (!storedUser) {
      console.error('❌ [FILTER] No user data in session');
      return [];
    }

    const parsed = JSON.parse(storedUser);
    let user = parsed?.user;

    if (!user || !user.id) {
      console.error('❌ [FILTER] Invalid user data');
      return [];
    }

    // If accesses missing, fetch from backend
    if (!user.accesses || user.accesses.length === 0) {
      console.log('⚠️ [FILTER] Fetching user details...');
      const userDetailsRes = await fetch(`${API_BASE}/users/${user.id}`);
      if (userDetailsRes.ok) {
        user = await userDetailsRes.json();
        parsed.user = user;
        sessionStorage.setItem('userData', JSON.stringify(parsed));
      }
    }

    if (!user.accesses || user.accesses.length === 0) {
      console.error('❌ [FILTER] No company access found');
      return [];
    }

    const primaryAccess = user.accesses.find(acc => acc.is_primary_company) || user.accesses[0];
    const primaryCompanyId = primaryAccess.company?.id;

    if (!primaryCompanyId) {
      console.error('❌ [FILTER] No company ID');
      return [];
    }

    // Fetch accessible menu
    const menuUrl = `${API_BASE}/rbac/users/${user.id}/accessible-menu?company_id=${primaryCompanyId}`;
    const menuRes = await fetch(menuUrl);

    if (!menuRes.ok) {
      console.error('❌ [FILTER] Failed to fetch menu');
      return [];
    }

    const menuJson = await menuRes.json();

    // Flatten all pages from hierarchical menu
    const allPages = [];
    const flattenPages = (pages) => {
      pages.forEach(page => {
        allPages.push(page);
        if (page.children && page.children.length > 0) {
          flattenPages(page.children);
        }
      });
    };

    if (menuJson.menu && menuJson.menu.length > 0) {
      flattenPages(menuJson.menu);
    }

    console.log('✅ [FILTER] Total accessible pages:', allPages.length);
    return allPages;

  } catch (error) {
    console.error('❌ [FILTER] Error fetching accessible pages:', error);
    return [];
  }
}

/**
 * Filter icon pages (maintains structure with nested links)
 */
export async function filterIconPages(iconPages) {
  try {
    console.log('🔍 [FILTER] Filtering icon pages...');
    
    const accessiblePages = await getUserAccessiblePages();
    
    if (!accessiblePages || accessiblePages.length === 0) {
      return [];
    }

    // Filter each icon page's links
    const filtered = await Promise.all(
      iconPages.map(async (iconPage) => {
        // Filter the links inside this icon page
        const filteredLinks = await filterLinksByAccess(iconPage.links || []);
        
        // Only include icon page if it has accessible links
        if (filteredLinks.length > 0) {
          return {
            ...iconPage,
            links: filteredLinks
          };
        }
        return null;
      })
    );

    // Remove null entries (icon pages with no accessible links)
    const result = filtered.filter(page => page !== null);
    
    console.log('✅ [FILTER] Filtered icon pages:', result.length);
    return result;

  } catch (error) {
    console.error('❌ [FILTER] Error filtering icon pages:', error);
    return [];
  }
}

/**
 * Check if specific link is accessible
 */
export async function hasAccessToLink(linkPath) {
  try {
    const accessiblePages = await getUserAccessiblePages();
    return accessiblePages.some(page => page.page_url.includes(linkPath));
  } catch (error) {
    console.error('❌ [FILTER] Error checking access:', error);
    return false;
  }
}

/**
 * Get filtered links with caching (for performance)
 */
const linkCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getFilteredLinksWithCache(linksArray, cacheKey) {
  const cached = linkCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('✅ [FILTER] Using cached links');
    return cached.links;
  }

  const filtered = await filterLinksByAccess(linksArray);
  
  linkCache.set(cacheKey, {
    links: filtered,
    timestamp: Date.now()
  });

  return filtered;
}

/**
 * Clear cache (call after role/access changes)
 */
export function clearLinkCache() {
  linkCache.clear();
  console.log('🗑️ [FILTER] Cache cleared');
}
