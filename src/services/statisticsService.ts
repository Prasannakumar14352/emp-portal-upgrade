import { apiClient } from './apiClient';

export interface EmployeeStatistics {
  leave_stats: {
    total_leaves: number;
    pending_leaves: number;
    approved_leaves: number;
    rejected_leaves: number;
    total_days_taken: number;
  };
  balance_stats: {
    total_allocated: number;
    total_used: number;
    total_remaining: number;
    total_carry_forward: number;
  };
  leave_type_breakdown: Array<{
    leave_type: string;
    count: number;
    total_days: number;
  }>;
  monthly_trends: Array<{
    month: number;
    month_name: string;
    leave_count: number;
    days_taken: number;
  }>;
}

export interface AttendanceStatistics {
  total_working_days: number;
  present_days: number;
  leave_days: number;
  leave_count: number;
  attendance_rate: number;
  period: {
    start_date: string;
    end_date: string;
  };
}

export interface TeamStatistics {
  overview: {
    total_employees: number;
    active_employees: number;
    total_leave_requests: number;
    pending_requests: number;
    avg_leave_days: number;
  };
  department_breakdown: Array<{
    department: string;
    employee_count: number;
    leave_count: number;
    total_leave_days: number;
  }>;
  top_leave_takers: Array<{
    full_name: string;
    department: string;
    position: string;
    leave_count: number;
    total_days: number;
  }>;
}

export interface UtilizationStatistics {
  utilization_by_type: Array<{
    leave_type: string;
    allocated: number;
    utilized: number;
    remaining: number;
    utilization_rate: number;
  }>;
  monthly_utilization: Array<{
    month: number;
    month_name: string;
    employees_on_leave: number;
    total_days_used: number;
  }>;
}

class StatisticsService {
  async getEmployeeStatistics(userId: string): Promise<EmployeeStatistics> {
    return apiClient.get<EmployeeStatistics>(`/statistics/employee/${userId}`);
  }

  async getAttendanceStatistics(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceStatistics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    return apiClient.get<AttendanceStatistics>(
      `/statistics/attendance/${userId}${queryString ? `?${queryString}` : ''}`
    );
  }

  async getTeamStatistics(department?: string): Promise<TeamStatistics> {
    const params = department ? `?department=${encodeURIComponent(department)}` : '';
    return apiClient.get<TeamStatistics>(`/statistics/team${params}`);
  }

  async getUtilizationStatistics(): Promise<UtilizationStatistics> {
    return apiClient.get<UtilizationStatistics>('/statistics/utilization');
  }
}

export const statisticsService = new StatisticsService();
