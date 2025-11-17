import { supabase } from "@/integrations/supabase/client";

export interface LeaveType {
  id: string;
  name: string;
  default_days: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLeaveTypeRequest {
  name: string;
  default_days: number;
  description?: string;
}

export interface UpdateLeaveTypeRequest {
  name?: string;
  default_days?: number;
  description?: string;
  is_active?: boolean;
}

class LeaveTypeService {
  async getAllLeaveTypes(): Promise<LeaveType[]> {
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  async getActiveLeaveTypes(): Promise<LeaveType[]> {
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  async createLeaveType(leaveType: CreateLeaveTypeRequest): Promise<LeaveType> {
    const { data, error } = await supabase
      .from('leave_types')
      .insert(leaveType)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateLeaveType(id: string, updates: UpdateLeaveTypeRequest): Promise<LeaveType> {
    const { data, error } = await supabase
      .from('leave_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteLeaveType(id: string): Promise<void> {
    const { error } = await supabase
      .from('leave_types')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export const leaveTypeService = new LeaveTypeService();
