import { apiClient } from './apiClient';

export interface Employee {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface EmployeeStats {
  attendance_rate: number;
  total_days: number;
  present_days: number;
  leave_days: number;
  absent_days: number;
}

export interface CreateEmployeeRequest {
  full_name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  status?: string;
  user_id?: string;
}

class EmployeeService {
  async getAllEmployees(): Promise<Employee[]> {
    return apiClient.get<Employee[]>('/employees');
  }

  async getEmployeeById(id: string): Promise<Employee> {
    return apiClient.get<Employee>(`/employees/${id}`);
  }

  async getEmployeeStats(userId: string): Promise<EmployeeStats> {
    return apiClient.get<EmployeeStats>(`/employees/${userId}/stats`);
  }

  async createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    return apiClient.post<Employee>('/employees', data);
  }

  async updateEmployee(id: string, data: Partial<CreateEmployeeRequest>): Promise<Employee> {
    return apiClient.patch<Employee>(`/employees/${id}`, data);
  }

  async deleteEmployee(id: string): Promise<void> {
    return apiClient.delete(`/employees/${id}`);
  }
}

export const employeeService = new EmployeeService();
