import { apiClient } from './apiClient';

export interface Leave {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  year: number;
  leave_type: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
  carry_forward_days?: number;
}

export interface CreateLeaveRequest {
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
}

export interface UpdateLeaveRequest {
  status: 'Approved' | 'Rejected';
  approved_by: string;
}

class LeaveService {
  // Get user's leave requests
  async getUserLeaves(userId: string): Promise<Leave[]> {
    return apiClient.get<Leave[]>(`/leaves/user/${userId}`);
  }

  // Get all leave requests (for HR/managers)
  async getAllLeaves(): Promise<Leave[]> {
    return apiClient.get<Leave[]>('/leaves');
  }

  // Get pending leave requests
  async getPendingLeaves(): Promise<Leave[]> {
    return apiClient.get<Leave[]>('/leaves?status=Pending');
  }

  // Create a new leave request
  async createLeave(data: CreateLeaveRequest): Promise<Leave> {
    return apiClient.post<Leave>('/leaves', data);
  }

  // Update leave status (approve/reject)
  async updateLeaveStatus(leaveId: string, data: UpdateLeaveRequest): Promise<Leave> {
    return apiClient.patch<Leave>(`/leaves/${leaveId}`, data);
  }

  // Get user's leave balances
  async getUserLeaveBalances(userId: string, year?: number): Promise<LeaveBalance[]> {
    const yearParam = year ? `?year=${year}` : '';
    return apiClient.get<LeaveBalance[]>(`/leaves/balances/${userId}${yearParam}`);
  }

  // Add comment to leave request
  async addLeaveComment(leaveId: string, comment: string): Promise<void> {
    return apiClient.post(`/leaves/${leaveId}/comments`, { comment });
  }

  // Get leave comments
  async getLeaveComments(leaveId: string): Promise<any[]> {
    return apiClient.get(`/leaves/${leaveId}/comments`);
  }
}

export const leaveService = new LeaveService();
