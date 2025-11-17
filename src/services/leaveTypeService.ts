import { apiClient } from './apiClient';

export interface LeaveType {
  id: number;
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
    return apiClient.get<LeaveType[]>('/leave-types');
  }

  async getActiveLeaveTypes(): Promise<LeaveType[]> {
    return apiClient.get<LeaveType[]>('/leave-types/active');
  }

  async createLeaveType(leaveType: CreateLeaveTypeRequest): Promise<LeaveType> {
    return apiClient.post<LeaveType>('/leave-types', leaveType);
  }

  async updateLeaveType(id: string | number, updates: UpdateLeaveTypeRequest): Promise<LeaveType> {
    return apiClient.patch<LeaveType>(`/leave-types/${id}`, updates);
  }

  async deleteLeaveType(id: string | number): Promise<void> {
    return apiClient.delete(`/leave-types/${id}`);
  }
}

export const leaveTypeService = new LeaveTypeService();
