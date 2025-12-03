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

export interface HRInsights {
  avg_processing_time: number;
  most_common_leave_type: string;
  peak_month: string;
  average_leave_duration?: number;
  most_frequent_leave_type?: string;
  department_most_leaves?: string;
  peak_leave_month?: string;
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

export interface EmployeeStats {
  active_employees: number;
  active_departments: number;
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

  async getHRInsights(year?: number): Promise<HRInsights> {
    const yearParam = year ? `?year=${year}` : '';
    return apiClient.get<HRInsights>(`/dashboard/hr/insights${yearParam}`);
  }

  async getLeaveTypeDistribution(year?: number): Promise<LeaveTypeDistribution[]> {
    const yearParam = year ? `?year=${year}` : '';
    return apiClient.get<LeaveTypeDistribution[]>(`/dashboard/hr/leave-types${yearParam}`);
  }

  async getEmployeeStats(): Promise<EmployeeStats> {
    return apiClient.get<EmployeeStats>('/dashboard/hr/employee-stats');
  }
}

export const dashboardService = new DashboardService();
