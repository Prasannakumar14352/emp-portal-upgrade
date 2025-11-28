import { apiClient } from './apiClient';
import { sessionService } from './sessionService';
import { showAuthError } from '@/utils/authErrorHandler';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  employee_id?: number;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface AuthResponse {
  session: Session | null;
  user: User | null;
  error?: string;
}

class AuthService {
  async signUp(email: string, password: string, fullName?: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/signup', {
        email,
        password,
        full_name: fullName,
      }, { skipAuth: true });

      if (response.session) {
        this.setSession(response.session);
      }

      return response;
    } catch (error) {
      showAuthError(error, 'Sign Up');
      throw error;
    }
  }


  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email,
        password,
      }, { skipAuth: true });

      if (response.session) {
        this.setSession(response.session);
        // Create session for time tracking
        if (response.user?.id) {
          await sessionService.createSession(response.user.id);
        }
      }

      return response;
    } catch (error) {
      showAuthError(error, 'Login');
      throw error;
    }
  }

  // async signInWithOAuth(provider: string): Promise<{ url: string }> {
  //   return apiClient.post<{ url: string }>(`/auth/oauth/${provider}`, {
  //     redirect_to: window.location.origin,
  //   }, { skipAuth: true });
  // }

  async signInWithOAuth(provider: string): Promise<{ url: string }> {
    return apiClient.post<{ url: string }>(`/auth/oauth/${provider}`, {
      redirect_to: `${window.location.origin}/auth/callback`,
    }, { skipAuth: true });
  }


  async signOut(): Promise<void> {
    try {
      // End the current session before signing out
      await sessionService.endSession();
      await apiClient.post('/auth/logout');
      this.clearSession();
    } catch (error) {
      // Even if logout fails on server, clear local session
      this.clearSession();
      showAuthError(error, 'Logout');
    }
  }

  async getSession(): Promise<Session | null> {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const response = await apiClient.get<{ session: Session }>('/auth/session');
      return response.session;
    } catch (error) {
      this.clearSession();
      return null;
    }
  }

  async refreshSession(): Promise<Session | null> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;

    try {
      const response = await apiClient.post<{ session: Session }>('/auth/refresh', {
        refresh_token: refreshToken,
      }, { skipAuth: true });

      if (response.session) {
        this.setSession(response.session);
        return response.session;
      }

      return null;
    } catch (error) {
      this.clearSession();
      return null;
    }
  }

  private setSession(session: Session) {
    localStorage.setItem('token', session.access_token);
    localStorage.setItem('refresh_token', session.refresh_token);
    localStorage.setItem('user', JSON.stringify(session.user));
  }

  private clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    // Initial check
    this.getSession().then(session => {
      callback('SIGNED_IN', session);
    });

    // Set up a listener for storage events (for multi-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (e.newValue) {
          this.getSession().then(session => callback('SIGNED_IN', session));
        } else {
          callback('SIGNED_OUT', null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return {
      unsubscribe: () => {
        window.removeEventListener('storage', handleStorageChange);
      },
    };
  }
}

export const authService = new AuthService();
