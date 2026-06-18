// app/utils/rbacCache.js
/**
 * ============================================================
 * GLOBAL RBAC CACHE - Single fetch, shared across all components
 * ============================================================
 * Problems solved:
 *  - LeftPanel, FixBottom, rbacLinkFilter each made separate API calls
 *  - Now only ONE fetch happens; all components share the result
 *  - Server warm-up ping on startup (fixes Render free-tier cold start)
 * ============================================================
 */

const API_BASE = 'http://localhost:8000/api';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// ============================================================
// GLOBAL STATE - Module level (shared across all imports)
// ============================================================
let _cachedPages = null;
let _cacheTimestamp = null;
let _fetchPromise = null;
let _serverWarmedUp = false;

// ============================================================
// SERVER WARM-UP (Render free tier cold start fix)
// ============================================================
export const warmUpServer = () => {
  if (_serverWarmedUp) return;

  const serverBase = API_BASE.replace('/api', '');
  let attempts = 0;
  const maxAttempts = 10;

  const ping = () => {
    attempts++;
    console.log(`🔥 [RBAC CACHE] Server warm-up attempt ${attempts}...`);

    fetch(`${serverBase}/health`, { method: 'GET', cache: 'no-store' })
      .then(res => {
        if (res.ok) {
          _serverWarmedUp = true;
          console.log('✅ [RBAC CACHE] Server is warm!');
        } else if (attempts < maxAttempts) {
          setTimeout(ping, 3000);
        }
      })
      .catch(() => {
        if (attempts < maxAttempts) {
          setTimeout(ping, 3000);
        }
      });
  };

  ping();
};

// ============================================================
// CORE: FETCH ACCESSIBLE PAGES (with deduplication)
// ============================================================
export const getAccessiblePages = async (forceRefresh = false) => {
  if (!forceRefresh && _cachedPages && _cacheTimestamp &&
    (Date.now() - _cacheTimestamp < CACHE_DURATION)) {
    console.log('⚡ [RBAC CACHE] Cache hit — pages:', _cachedPages.length);
    return _cachedPages;
  }

  if (_fetchPromise) {
    console.log('⏳ [RBAC CACHE] Already fetching — waiting...');
    return _fetchPromise;
  }

  _fetchPromise = _doFetch();
  const result = await _fetchPromise;
  _fetchPromise = null;
  return result;
};

// ============================================================
// INTERNAL FETCH LOGIC
// ============================================================
const _doFetch = async () => {
  try {
    console.log('🌐 [RBAC CACHE] Fetching from backend...');

    const storedUser = sessionStorage.getItem('userData');
    if (!storedUser) {
      console.error('❌ [RBAC CACHE] No userData in session');
      return [];
    }

    const parsed = JSON.parse(storedUser);
    let user = parsed?.user;

    if (!user?.id) {
      console.error('❌ [RBAC CACHE] Invalid user data');
      return [];
    }

    if (!user.accesses || user.accesses.length === 0) {
      console.log('📡 [RBAC CACHE] Fetching user details...');
      const res = await fetch(`${API_BASE}/users/${user.id}`);
      if (res.ok) {
        user = await res.json();
        parsed.user = user;
        sessionStorage.setItem('userData', JSON.stringify(parsed));
      }
    }

    if (!user.accesses || user.accesses.length === 0) {
      console.error('❌ [RBAC CACHE] No company access');
      return [];
    }

    const primaryAccess = user.accesses.find(a => a.is_primary_company) || user.accesses[0];
    const companyId = primaryAccess?.company?.id;

    if (!companyId) {
      console.error('❌ [RBAC CACHE] No company ID');
      return [];
    }

    console.log(`📡 [RBAC CACHE] Fetching menu for user=${user.id}, company=${companyId}`);
    const menuRes = await fetch(
      `${API_BASE}/rbac/users/${user.id}/accessible-menu?company_id=${companyId}`
    );

    if (!menuRes.ok) {
      console.error('❌ [RBAC CACHE] Menu fetch failed:', menuRes.status);
      return [];
    }

    const menuJson = await menuRes.json();

    const allPages = [];
    const flatten = (pages) => {
      pages.forEach(page => {
        allPages.push(page);
        if (page.children?.length > 0) flatten(page.children);
      });
    };
    if (menuJson.menu?.length > 0) flatten(menuJson.menu);

    _cachedPages = allPages;
    _cacheTimestamp = Date.now();

    console.log(`✅ [RBAC CACHE] Fetched & cached ${allPages.length} pages`);
    return allPages;

  } catch (err) {
    console.error('❌ [RBAC CACHE] Fetch error:', err);
    _fetchPromise = null;
    return [];
  }
};

// ============================================================
// 🔥 FIX: SMART MATCH FUNCTION
// ============================================================
/**
 * Check if a link matches an accessible page.
 *
 * Problems with old strict last-segment logic:
 *   page_url = "/admin-master/add-company"
 *   link.path = "add-company"
 *   → lastSegment = "add-company" ✅ match hoga — CORRECT
 *
 *   BUT problem tab tha jab page_url backend mein wrong store tha.
 *   e.g., page_url = "/icon-admin-master/add-company"  ← WRONG
 *         link.path = "add-company"
 *         → lastSegment = "add-company" ✅ still matches (by accident)
 *         BUT page_name match fail karta tha.
 *
 * New logic:
 *   1. Last segment strict match (path-based)
 *   2. Full URL match
 *   3. /{prefix}/{path} match (for pages registered with prefix)
 *   4. Exact name match (case-insensitive)
 *   5. 🔥 FIX: admin-master prefix ke saath bhi check karo
 */
const _matchLinkToPage = (link, page) => {
  const pageUrl = (page.page_url || '').toLowerCase();
  const linkPath = (link.path || '').toLowerCase();
  const linkName = (link.name || '').toLowerCase();
  const pageName = (page.page_name || '').toLowerCase();

  // 1. Exact full URL match
  if (pageUrl === `/${linkPath}` || pageUrl === linkPath) return true;

  // 2. Last URL segment exact match
  const segments = pageUrl.replace(/\/$/, '').split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || '';
  if (lastSegment === linkPath) return true;

  // 3. 🔥 FIX: admin-master specific match
  //    page_url = "/admin-master/add-company"
  //    link.path = "add-company"  → lastSegment match already covers this
  //    BUT also check: page_url contains /admin-master/ AND last segment matches
  if (pageUrl.includes('/admin-master/') && lastSegment === linkPath) return true;

  // 4. Exact page name match (case-insensitive)
  if (pageName === linkName) return true;

  // 5. Page name contains link name (for cases where names differ slightly)
  //    Only when link name is substantial (> 3 chars) to avoid false positives
  if (linkName.length > 3 && pageName === linkName) return true;

  return false;
};

// ============================================================
// FILTER HELPERS (used by LeftPanel, FixBottom, etc.)
// ============================================================

/**
 * Filter a flat link array against cached accessible pages
 */
export const filterLinks = async (linksArray, forceRefresh = false) => {
  if (!linksArray?.length) return [];

  const accessiblePages = await getAccessiblePages(forceRefresh);
  if (!accessiblePages.length) return [];

  const filtered = linksArray.filter(link =>
    accessiblePages.some(page => _matchLinkToPage(link, page))
  );

  console.log(`🔍 [RBAC CACHE] filterLinks: ${linksArray.length} → ${filtered.length} (accessible)`);
  return filtered;
};

/**
 * Filter icon pages (each has nested links array)
 */
export const filterIconPagesFromCache = async (iconPages, forceRefresh = false) => {
  if (!iconPages?.length) return [];

  const accessiblePages = await getAccessiblePages(forceRefresh);
  if (!accessiblePages.length) return [];

  const result = [];
  for (const iconPage of iconPages) {
    const filteredLinks = (iconPage.links || []).filter(link =>
      accessiblePages.some(page => _matchLinkToPage(link, page))
    );
    if (filteredLinks.length > 0) {
      result.push({ ...iconPage, links: filteredLinks });
    }
  }

  console.log(`🔍 [RBAC CACHE] filterIconPagesFromCache: ${iconPages.length} icons → ${result.length} with access`);
  return result;
};

/**
 * Get accessible paths as a Set (for FixBottom tab validation)
 */
export const getAccessiblePathsSet = async (forceRefresh = false) => {
  const pages = await getAccessiblePages(forceRefresh);
  const paths = new Set();
  pages.forEach(page => { if (page.page_url) paths.add(page.page_url); });
  return paths;
};

/**
 * Check if a specific path is accessible
 */
export const hasAccess = async (linkPath) => {
  const pages = await getAccessiblePages();
  return pages.some(page => {
    const pageUrl = (page.page_url || '').toLowerCase();
    const path = linkPath.toLowerCase();
    const segments = pageUrl.replace(/\/$/, '').split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';
    return lastSegment === path || pageUrl === `/${path}` || pageUrl === path;
  });
};

// ============================================================
// CACHE MANAGEMENT
// ============================================================

export const clearRbacCache = () => {
  _cachedPages = null;
  _cacheTimestamp = null;
  _fetchPromise = null;
  console.log('🗑️ [RBAC CACHE] Cache cleared');
};

export const refreshRbacCache = () => getAccessiblePages(true);

export const getCacheInfo = () => ({
  hasCachedData: !!_cachedPages,
  pageCount: _cachedPages?.length ?? 0,
  ageMs: _cacheTimestamp ? Date.now() - _cacheTimestamp : null,
  ageSeconds: _cacheTimestamp ? Math.round((Date.now() - _cacheTimestamp) / 1000) : null,
  expiresInSeconds: _cacheTimestamp
    ? Math.max(0, Math.round((CACHE_DURATION - (Date.now() - _cacheTimestamp)) / 1000))
    : 0,
  isFetching: !!_fetchPromise,
});

if (typeof window !== 'undefined') {
  window._rbacCache = {
    getInfo: getCacheInfo,
    clear: clearRbacCache,
    refresh: refreshRbacCache,
    getPages: getAccessiblePages,
  };
  console.log('🔧 [RBAC CACHE] Debug: window._rbacCache available');
}