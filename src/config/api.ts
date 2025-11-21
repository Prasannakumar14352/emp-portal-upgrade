// API Configuration
// Toggle between local backend and Lovable Cloud

export const API_CONFIG = {
  // Set to 'local' or 'cloud'
  mode: 'local' as 'local' | 'cloud',
  
  // Local backend endpoint
  local: {
    baseURL: 'http://localhost:3000/api',
  },
  
  // Cloud backend endpoint (Lovable Cloud/Supabase)
  cloud: {
    baseURL: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
};

// Helper to get current API base URL
export const getAPIBaseURL = () => {
  return API_CONFIG.mode === 'local' 
    ? API_CONFIG.local.baseURL 
    : API_CONFIG.cloud.baseURL;
};

// Helper to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};
