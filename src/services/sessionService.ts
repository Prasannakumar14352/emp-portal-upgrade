import { supabase } from '@/integrations/supabase/client';

export interface UserSession {
  id: string;
  user_id: string;
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
  user_id: string;
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
  private currentSessionId: string | null = null;

  async createSession(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          login_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      
      this.currentSessionId = data.id;
      localStorage.setItem('current_session_id', data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }

  async endSession(sessionId?: string): Promise<void> {
    try {
      const id = sessionId || this.currentSessionId || localStorage.getItem('current_session_id');
      
      if (!id) return;

      const { error } = await supabase
        .from('user_sessions')
        .update({
          logout_time: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      this.currentSessionId = null;
      localStorage.removeItem('current_session_id');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  async getUserSessions(userId: string, startDate?: string, endDate?: string): Promise<UserSession[]> {
    try {
      let query = supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('login_time', { ascending: false });

      if (startDate) {
        query = query.gte('login_time', startDate);
      }
      if (endDate) {
        query = query.lte('login_time', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }
  }

  async getUserStatistics(userId: string): Promise<SessionStatistics> {
    try {
      const sessions = await this.getUserSessions(userId);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

      const totalDuration = sessions.reduce((sum, s) => sum + (s.session_duration || 0), 0);
      const todayDuration = sessions
        .filter(s => new Date(s.login_time) >= today)
        .reduce((sum, s) => sum + (s.session_duration || 0), 0);
      const weekDuration = sessions
        .filter(s => new Date(s.login_time) >= weekAgo)
        .reduce((sum, s) => sum + (s.session_duration || 0), 0);
      const monthDuration = sessions
        .filter(s => new Date(s.login_time) >= monthAgo)
        .reduce((sum, s) => sum + (s.session_duration || 0), 0);

      return {
        total_sessions: sessions.length,
        total_duration: Math.round(totalDuration),
        average_duration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
        today_duration: Math.round(todayDuration),
        this_week_duration: Math.round(weekDuration),
        this_month_duration: Math.round(monthDuration),
      };
    } catch (error) {
      console.error('Error calculating statistics:', error);
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
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, department, position');

      if (profilesError) throw profilesError;

      const stats: EmployeeSessionStats[] = [];

      for (const profile of profiles || []) {
        const sessions = await this.getUserSessions(profile.id, startDate, endDate);
        const totalDuration = sessions.reduce((sum, s) => sum + (s.session_duration || 0), 0);
        const lastSession = sessions[0];

        stats.push({
          user_id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          department: profile.department || 'N/A',
          position: profile.position || 'N/A',
          total_sessions: sessions.length,
          total_duration: Math.round(totalDuration),
          average_duration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
          last_login: lastSession?.login_time || 'Never',
        });
      }

      return stats.sort((a, b) => b.total_duration - a.total_duration);
    } catch (error) {
      console.error('Error fetching employee sessions:', error);
      return [];
    }
  }
}

export const sessionService = new SessionService();
