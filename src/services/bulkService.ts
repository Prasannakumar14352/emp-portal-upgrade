import { apiClient } from './apiClient';

export interface BulkUserData {
  email: string;
  full_name: string;
  department?: string;
  position?: string;
  phone?: string;
  role?: 'employee' | 'hr' | 'manager';
  password?: string;
}

export interface BulkHolidayData {
  name: string;
  date: string;
  type: string;
  description?: string;
}

export interface BulkPayslipData {
  employee_id: number;
  month: string;
  year: number;
  basic_salary: number;
  allowances?: number;
  deductions?: number;
  net_salary: number;
  file_url?: string;
}

export interface BulkResponse<T> {
  success: boolean;
  created: number;
  failed: number;
  createdUsers?: T[];
  createdHolidays?: T[];
  createdPayslips?: T[];
  failedUsers?: Array<{ email: string; reason: string }>;
  failedHolidays?: Array<{ name: string; date: string; reason: string }>;
  failedPayslips?: Array<{ employee_id: number; month: string; year: number; reason: string }>;
}

class BulkService {
  async createBulkUsers(users: BulkUserData[]): Promise<BulkResponse<BulkUserData>> {
    return apiClient.post<BulkResponse<BulkUserData>>('/bulk/users', { users });
  }

  async createBulkHolidays(holidays: BulkHolidayData[]): Promise<BulkResponse<BulkHolidayData>> {
    return apiClient.post<BulkResponse<BulkHolidayData>>('/bulk/holidays', { holidays });
  }

  async createBulkPayslips(payslips: BulkPayslipData[]): Promise<BulkResponse<BulkPayslipData>> {
    return apiClient.post<BulkResponse<BulkPayslipData>>('/bulk/payslips', { payslips });
  }
}

export const bulkService = new BulkService();
