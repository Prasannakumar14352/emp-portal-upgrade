import { getAPIBaseURL, getAuthHeaders } from '@/config/api';
import { tokenManager } from '@/utils/tokenManager';
import { showAuthError } from '@/utils/authErrorHandler';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

class APIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = getAPIBaseURL();
  }

  private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    // Authentication handling
    let validToken: string | null = null;

    if (!skipAuth) {
      validToken = await tokenManager.getValidToken();
      if (!validToken) {
        const error = new Error('No authentication token found. Please log in.');
        showAuthError(error, 'Authentication');
        setTimeout(() => (window.location.href = '/auth'), 1500);
        throw error;
      }
    }

    const headers: HeadersInit = {
      ...(validToken ? { Authorization: `Bearer ${validToken}` } : {}),
      ...(fetchOptions.headers || {}) // DO NOT force Content-Type
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...fetchOptions,
      headers
    });
    

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw {
        status: response.status,
        message: errorBody?.message || response.statusText
      };
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  // post<T>(endpoint: string, data?: any, options?: FetchOptions): Promise<T> {
  //   return this.request<T>(endpoint, {
  //     ...options,
  //     method: 'POST',
  //     body: JSON.stringify(data)
  //   });
  // }

  post<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
    const isFormData = data instanceof FormData;

    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
      headers: {
        ...(options?.headers || {}),
        ...(isFormData ? {} : { 'Content-Type': 'application/json' })
      }
    });
  }

  patch<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: {
        ...(options?.headers || {}),
        'Content-Type': 'application/json'
      }
    });
  }

  delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  put<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        ...(options?.headers || {}),
        'Content-Type': 'application/json'
      }
    });
  }
}

export const apiClient = new APIClient();
