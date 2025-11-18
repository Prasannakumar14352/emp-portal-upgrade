import { supabase } from '@/integrations/supabase/client';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  work_hours?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceStats {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

class AttendanceService {
  async getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (error) throw error;
    return data as AttendanceRecord | null;
  }

  async checkIn(userId: string, notes?: string): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Check if already checked in
    const existing = await this.getTodayAttendance(userId);
    if (existing?.check_in_time) {
      throw new Error('Already checked in for today');
    }

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('attendance_records')
        .update({
          check_in_time: now,
          notes,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as AttendanceRecord;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          user_id: userId,
          date: today,
          check_in_time: now,
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AttendanceRecord;
    }
  }

  async checkOut(userId: string): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const existing = await this.getTodayAttendance(userId);
    if (!existing) {
      throw new Error('No check-in record found for today');
    }

    if (existing.check_out_time) {
      throw new Error('Already checked out for today');
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .update({
        check_out_time: now,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as AttendanceRecord;
  }

  async getUserAttendance(userId: string, month?: number, year?: number): Promise<AttendanceRecord[]> {
    let query = supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (month && year) {
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as AttendanceRecord[];
  }

  async getAttendanceStats(userId: string, month?: number, year?: number): Promise<AttendanceStats> {
    const records = await this.getUserAttendance(userId, month, year);
    
    const totalDays = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    
    const attendanceRate = totalDays > 0 
      ? Math.round(((present + late) / totalDays) * 100) 
      : 0;

    return {
      totalDays,
      present,
      absent,
      late,
      attendanceRate,
    };
  }
}

export const attendanceService = new AttendanceService();
