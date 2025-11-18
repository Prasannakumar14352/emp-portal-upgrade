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

  private async request<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    // For authenticated requests, ensure token is valid and refresh if needed
    let validToken: string | null = null;
    if (!skipAuth) {
      validToken = await tokenManager.getValidToken();
      
      if (!validToken) {
        const error = new Error('No authentication token found. Please log in.');
        showAuthError(error, 'Authentication');
        // Redirect to login if no valid token
        setTimeout(() => {
          window.location.href = '/auth';
        }, 1500); // Give user time to see the error message
        throw error;
      }
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      // Prefer the freshly validated token to avoid stale localStorage reads
      ...(skipAuth || !validToken ? {} : { Authorization: `Bearer ${validToken}` }),
      // Allow explicit header overrides if provided
      ...(options.headers || {})
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...fetchOptions,
        headers
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const error = {
          status: response.status,
          statusCode: response.status,
          message: errorBody?.error || errorBody?.message || response.statusText,
          error: errorBody?.error || errorBody?.message || response.statusText
        };
        
        // Handle authentication errors
        if (response.status === 401) {
          // Try to refresh token one more time
          const refreshedToken = await tokenManager.getValidToken();
          if (refreshedToken) {
            // Retry the request with new token
            return this.request<T>(endpoint, options);
          }
          
          // Show error and redirect
          const authError = showAuthError(error, 'Authentication');
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          
          if (authError.shouldRedirect) {
            setTimeout(() => {
              window.location.href = '/auth';
            }, 1500);
          }
          
          throw error;
        }
        
        // Handle permission errors
        if (response.status === 403) {
          showAuthError(error, 'Permission');
          throw error;
        }
        
        // Handle other errors
        showAuthError(error);
        throw error;
      }

      return response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError) {
        showAuthError(error, 'Network');
      }
      throw error;
    }
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

  put<T>(endpoint: string, data?: any, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
}

export const apiClient = new APIClient();
