import { getAPIBaseURL, getAuthHeaders } from '@/config/api';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

class APIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = getAPIBaseURL();
  }

  private async request<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    // Check if token exists for authenticated requests
    if (!skipAuth) {
      const token = localStorage.getItem('token');
      if (!token) {
        // Redirect to login if no token found
        window.location.href = '/auth';
        throw new Error('No authentication token found. Please log in.');
      }
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(skipAuth ? {} : getAuthHeaders()),
      ...(options.headers || {})
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...fetchOptions,
      headers
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      
      // Handle authentication errors
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        throw new Error('Session expired. Please log in again.');
      }
      
      throw new Error(errorBody?.error || errorBody?.message || response.statusText);
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: any, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  patch<T>(endpoint: string, data?: any, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new APIClient();
