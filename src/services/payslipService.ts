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

  async getAllPayslips(): Promise<any[]> {
    return apiClient.get<any[]>('/payslips');
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

  async downloadPayslip(employeeId: string, year: number, month: string): Promise<Blob> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/payslips/download/${employeeId}/${year}/${month}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to download payslip');
    }
    
    return response.blob();
  }
}

export const payslipService = new PayslipService();
