// app/utils/userAuth.js - FIXED VERSION
/**
 * 🔐 User Authentication Helper Functions
 * Purpose: Session storage se user data safely fetch karo
 */

export const getUserSession = () => {
  try {
    const userData = sessionStorage.getItem('userData');
    if (!userData) return null;
    
    return JSON.parse(userData);
  } catch (error) {
    console.error('❌ Error parsing user session:', error);
    return null;
  }
};

export const getCurrentUserId = () => {
  const session = getUserSession();
  return session?.user?.id || null;
};

export const getAccessToken = () => {
  const session = getUserSession();
  return session?.access_token || null;
};

export const isLoggedIn = () => {
  return sessionStorage.getItem('isLoggedIn') === 'true';
};

export const clearSession = () => {
  sessionStorage.clear();
};

export const getAuthHeaders = () => {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('Not logged in. Please login first.');
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// 🔥 MAIN FUNCTION: Authenticated API call with user verification
export const fetchUserData = async (endpoint) => {
  try {
    const userId = getCurrentUserId();
    const token = getAccessToken();
    
    if (!userId || !token) {
      throw new Error('Session expired. Please login again.');
    }
    
    console.log(`🔍 Fetching data for User ID: ${userId}`);
    console.log(`📍 Endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        window.location.href = '/';
        throw new Error('Session expired');
      }
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 🔥 Verify ki ye sahi user ka data hai
    if (data.user_id && data.user_id !== userId) {
      console.error('❌ DATA MISMATCH!');
      console.error(`Expected User ID: ${userId}, Got: ${data.user_id}`);
      throw new Error('Received wrong user data');
    }
    
    // For array responses (like company list)
    if (Array.isArray(data)) {
      console.log('✅ Array data received for User ID:', userId);
      return data;
    }
    
    console.log('✅ Data verified for User ID:', userId);
    return data;
    
  } catch (error) {
    console.error('❌ fetchUserData error:', error);
    throw error;
  }
};

// 🔥 NEW: POST request with authentication
export const postUserData = async (endpoint, formData) => {
  try {
    const userId = getCurrentUserId();
    const token = getAccessToken();
    
    if (!userId || !token) {
      throw new Error('Session expired. Please login again.');
    }
    
    console.log(`🔍 Posting data for User ID: ${userId}`);
    console.log(`📍 Endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for FormData - browser will set it automatically
      },
      body: formData
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        window.location.href = '/';
        throw new Error('Session expired');
      }
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Data posted successfully for User ID:', userId);
    return data;
    
  } catch (error) {
    console.error('❌ postUserData error:', error);
    throw error;
  }
};
