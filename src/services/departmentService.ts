import { apiClient } from './apiClient';

export interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: number;
  manager_name?: string;
  employee_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
  manager_id?: number;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
  manager_id?: number;
}

class DepartmentService {
  async getAllDepartments(): Promise<Department[]> {
    return apiClient.get<Department[]>('/departments');
  }

  async getDepartmentById(id: string): Promise<Department> {
    return apiClient.get<Department>(`/departments/${id}`);
  }

  async createDepartment(data: CreateDepartmentRequest): Promise<Department> {
    return apiClient.post<Department>('/departments', data);
  }

  async updateDepartment(id: string, data: UpdateDepartmentRequest): Promise<Department> {
    return apiClient.patch<Department>(`/departments/${id}`, data);
  }

  async deleteDepartment(id: string): Promise<void> {
    return apiClient.delete(`/departments/${id}`);
  }
}

export const departmentService = new DepartmentService();
