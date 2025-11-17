import { apiClient } from './apiClient';

export interface DashboardStats {
  leave_balance: number;
  pending_approvals: number;
  payslips_count: number;
  attendance_rate: number;
}

export interface HRDashboardStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  approval_rate: number;
}

export interface MonthlyTrend {
  month: string;
  approved: number;
  rejected: number;
}

export interface LeaveTypeDistribution {
  name: string;
  value: number;
}

class DashboardService {
  async getEmployeeDashboardStats(userId: string): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>(`/dashboard/employee/${userId}`);
  }

  async getHRDashboardStats(): Promise<HRDashboardStats> {
    return apiClient.get<HRDashboardStats>('/dashboard/hr/stats');
  }

  async getMonthlyTrends(year?: number): Promise<MonthlyTrend[]> {
    const yearParam = year ? `?year=${year}` : '';
    return apiClient.get<MonthlyTrend[]>(`/dashboard/hr/trends${yearParam}`);
  }

  async getLeaveTypeDistribution(year?: number): Promise<LeaveTypeDistribution[]> {
    const yearParam = year ? `?year=${year}` : '';
    return apiClient.get<LeaveTypeDistribution[]>(`/dashboard/hr/leave-types${yearParam}`);
  }
}

export const dashboardService = new DashboardService();
