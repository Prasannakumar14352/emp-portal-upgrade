import { apiClient } from './apiClient';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
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
    const response = await apiClient.post<AuthResponse>('/auth/signup', {
      email,
      password,
      full_name: fullName,
    }, { skipAuth: true });
    
    if (response.session) {
      this.setSession(response.session);
    }
    
    return response;
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    }, { skipAuth: true });
    
    if (response.session) {
      this.setSession(response.session);
    }
    
    return response;
  }

  async signInWithOAuth(provider: string): Promise<{ url: string }> {
    return apiClient.post<{ url: string }>(`/auth/oauth/${provider}`, {
      redirect_to: window.location.origin,
    }, { skipAuth: true });
  }

  async signOut(): Promise<void> {
    await apiClient.post('/auth/logout');
    this.clearSession();
  }

  async getSession(): Promise<Session | null> {
    const token = localStorage.getItem('auth_token');
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
    localStorage.setItem('auth_token', session.access_token);
    localStorage.setItem('refresh_token', session.refresh_token);
    localStorage.setItem('user', JSON.stringify(session.user));
  }

  private clearSession() {
    localStorage.removeItem('auth_token');
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
      if (e.key === 'auth_token') {
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
