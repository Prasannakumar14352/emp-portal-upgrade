import { apiClient } from './apiClient';

export interface Leave {
  id: string;
  user_id: string;
  manager_id?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  manager_status: 'Pending' | 'Approved' | 'Rejected';
  hr_status: 'Pending' | 'Approved' | 'Rejected';
  manager_approved_by?: string;
  hr_approved_by?: string;
  manager_approved_at?: string;
  hr_approved_at?: string;
  manager_comments?: string;
  hr_comments?: string;
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
  manager_id?: number;
  cc_emails?: string[];
}

export interface LeaveConflict {
  id: string;
  user_id: string;
  full_name: string;
  department: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
}

export interface UpdateLeaveRequest {
  status: 'Approved' | 'Rejected';
  comments?: string;
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

  // Edit leave request (dates, reason)
  async updateLeave(leaveId: string, data: CreateLeaveRequest): Promise<Leave> {
    return apiClient.put<Leave>(`/leaves/${leaveId}`, data);
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

  // Cancel leave request
  async cancelLeave(leaveId: string): Promise<void> {
    return apiClient.delete(`/leaves/${leaveId}`);
  }

  // Check for leave conflicts
  async checkConflicts(startDate: string, endDate: string, userId?: string): Promise<LeaveConflict[]> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    if (userId) {
      params.append('user_id', userId);
    }
    return apiClient.get<LeaveConflict[]>(`/leaves/conflicts?${params.toString()}`);
  }
}

export const leaveService = new LeaveService();
