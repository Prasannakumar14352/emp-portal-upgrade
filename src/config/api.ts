
// API Configuration
// Using SQL Server backend exclusively

export const API_CONFIG = {
  // SQL Server backend endpoint
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api",
};

// Helper to get current API base URL
export const getAPIBaseURL = () => {
  return API_CONFIG.baseURL;
};

// Helper to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
