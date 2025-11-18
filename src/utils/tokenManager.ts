import { jwtDecode } from 'jwt-decode';
import { getAPIBaseURL } from '@/config/api';
import { showAuthError } from './authErrorHandler';

interface JWTPayload {
  exp: number;
  iat: number;
  userId: string;
  role: string;
}

class TokenManager {
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  /**
   * Check if token is expired or will expire within next 5 minutes
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode<JWTPayload>(token);
      const currentTime = Date.now() / 1000;
      // Refresh if token expires within 5 minutes
      return decoded.exp < currentTime + 300;
    } catch (error) {
      // Don't show toast for decode errors - just return expired
      return true;
    }
  }

  /**
   * Get valid token, refreshing if necessary
   */
  async getValidToken(): Promise<string | null> {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return null;
    }

    // If token is still valid, return it
    if (!this.isTokenExpired(token)) {
      return token;
    }

    // If already refreshing, wait for that promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start refresh process
    this.isRefreshing = true;
    this.refreshPromise = this.refreshToken();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  private async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      this.clearSession();
      return null;
    }

    try {
      const baseURL = getAPIBaseURL();
      const response = await fetch(`${baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw { 
          status: response.status, 
          message: errorData.error || 'Failed to refresh token' 
        };
      }

      const data = await response.json();
      
      if (data.session) {
        localStorage.setItem('token', data.session.access_token);
        localStorage.setItem('refresh_token', data.session.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.session.user));
        return data.session.access_token;
      }

      return null;
    } catch (error) {
      // Show user-friendly error message
      showAuthError(error, 'Session Refresh');
      this.clearSession();
      return null;
    }
  }

  /**
   * Clear session data
   */
  private clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }
}

export const tokenManager = new TokenManager();
