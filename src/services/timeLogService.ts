import { supabase } from "@/integrations/supabase/client";

export interface TimeLog {
  id: string;
  user_id: string;
  project_id: string;
  date: string;
  hours: number;
  minutes: number;
  duration_minutes?: number;
  task?: string;
  description?: string;
  is_billable: boolean;
  status: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  project?: {
    name: string;
    client_name?: string;
  };
  profile?: {
    full_name: string;
    email: string;
  };
}

export interface TimeLogFilters {
  projectId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export const timeLogService = {
  async getTimeLogs(filters?: TimeLogFilters): Promise<TimeLog[]> {
    let query = supabase
      .from("time_logs")
      .select(`
        *,
        project:projects(name, client_name)
      `)
      .order("date", { ascending: false });

    if (filters?.projectId) {
      query = query.eq("project_id", filters.projectId);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.startDate) {
      query = query.gte("date", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte("date", filters.endDate);
    }
    if (filters?.userId) {
      query = query.eq("user_id", filters.userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as TimeLog[];
  },

  async getMyTimeLogs(userId: string, filters?: TimeLogFilters): Promise<TimeLog[]> {
    let query = supabase
      .from("time_logs")
      .select(`
        *,
        project:projects(name, client_name)
      `)
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (filters?.projectId) {
      query = query.eq("project_id", filters.projectId);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.startDate) {
      query = query.gte("date", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte("date", filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async hasTimeLogForDate(userId: string, date: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("time_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("date", date)
      .limit(1);

    if (error) throw error;
    return (data?.length || 0) > 0;
  },

  async createTimeLog(timeLog: Omit<TimeLog, "id" | "created_at" | "updated_at" | "duration_minutes" | "project" | "profile">): Promise<TimeLog> {
    const { data, error } = await supabase
      .from("time_logs")
      .insert(timeLog)
      .select(`
        *,
        project:projects(name, client_name)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateTimeLog(id: string, timeLog: Partial<TimeLog>): Promise<TimeLog> {
    const { data, error } = await supabase
      .from("time_logs")
      .update(timeLog)
      .eq("id", id)
      .select(`
        *,
        project:projects(name, client_name)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTimeLog(id: string): Promise<void> {
    const { error } = await supabase
      .from("time_logs")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async approveTimeLog(id: string, approverId: string): Promise<TimeLog> {
    const { data, error } = await supabase
      .from("time_logs")
      .update({
        status: "approved",
        approved_by: approverId,
        approved_at: new Date().toISOString()
      })
      .eq("id", id)
      .select(`
        *,
        project:projects(name, client_name)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async rejectTimeLog(id: string): Promise<TimeLog> {
    const { data, error } = await supabase
      .from("time_logs")
      .update({ status: "rejected" })
      .eq("id", id)
      .select(`
        *,
        project:projects(name, client_name)
      `)
      .single();

    if (error) throw error;
    return data;
  }
};
