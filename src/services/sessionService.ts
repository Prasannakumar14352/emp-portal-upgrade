import { apiClient } from './apiClient';

export interface UserSession {
  id: number;
  user_id: number;
  login_time: string;
  logout_time?: string;
  session_duration?: number;
  created_at: string;
}

export interface SessionStatistics {
  total_sessions: number;
  total_duration: number;
  average_duration: number;
  today_duration: number;
  this_week_duration: number;
  this_month_duration: number;
}

export interface EmployeeSessionStats {
  user_id: number;
  full_name: string;
  email: string;
  department: string;
  position: string;
  total_sessions: number;
  total_duration: number;
  average_duration: number;
  last_login: string;
}

class SessionService {
  private currentSessionId: number | null = null;

  async createSession(userId: string | number): Promise<number | null> {
    try {
      const session = await apiClient.post<UserSession>('/sessions', {});
      this.currentSessionId = session.id;
      localStorage.setItem('current_session_id', session.id.toString());
      return session.id;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }

  async endSession(sessionId?: number): Promise<void> {
    try {
      const id = sessionId || this.currentSessionId || parseInt(localStorage.getItem('current_session_id') || '0');
      
      if (!id) return;

      await apiClient.patch(`/sessions/${id}/end`, {});

      this.currentSessionId = null;
      localStorage.removeItem('current_session_id');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  async getUserSessions(userId: string | number, startDate?: string, endDate?: string): Promise<UserSession[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const queryString = params.toString();
      const endpoint = `/sessions/user/${userId}${queryString ? `?${queryString}` : ''}`;
      
      return await apiClient.get<UserSession[]>(endpoint);
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }
  }

  async getUserStatistics(userId: string | number): Promise<SessionStatistics> {
    try {
      return await apiClient.get<SessionStatistics>(`/sessions/user/${userId}/stats`);
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      return {
        total_sessions: 0,
        total_duration: 0,
        average_duration: 0,
        today_duration: 0,
        this_week_duration: 0,
        this_month_duration: 0,
      };
    }
  }

  async getAllEmployeeSessions(startDate?: string, endDate?: string): Promise<EmployeeSessionStats[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const queryString = params.toString();
      const endpoint = `/sessions/all${queryString ? `?${queryString}` : ''}`;
      
      return await apiClient.get<EmployeeSessionStats[]>(endpoint);
    } catch (error) {
      console.error('Error fetching employee sessions:', error);
      return [];
    }
  }
}

export const sessionService = new SessionService();
