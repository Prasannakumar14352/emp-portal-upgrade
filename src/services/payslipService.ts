import { apiClient } from './apiClient';

export interface Payslip {
  id: string;
  employee_id: string;
  month: string;
  year: number;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  file_url?: string;
  created_at: string;
}

export interface CreatePayslipRequest {
  employee_id: string;
  month: string;
  year: number;
  basic_salary: number;
  allowances?: number;
  deductions?: number;
  net_salary: number;
  file_url?: string;
}

class PayslipService {
  async getUserPayslips(userId: string): Promise<Payslip[]> {
    return apiClient.get<Payslip[]>(`/payslips/user/${userId}`);
  }

  async getAllPayslips(): Promise<Payslip[]> {
    return apiClient.get<Payslip[]>('/payslips');
  }

  async getPayslipById(id: string): Promise<Payslip> {
    return apiClient.get<Payslip>(`/payslips/${id}`);
  }

  async createPayslip(data: CreatePayslipRequest): Promise<Payslip> {
    return apiClient.post<Payslip>('/payslips', data);
  }

  async updatePayslip(id: string, data: Partial<CreatePayslipRequest>): Promise<Payslip> {
    return apiClient.patch<Payslip>(`/payslips/${id}`, data);
  }

  async deletePayslip(id: string): Promise<void> {
    return apiClient.delete(`/payslips/${id}`);
  }
}

export const payslipService = new PayslipService();
