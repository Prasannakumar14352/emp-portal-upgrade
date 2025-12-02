import { apiClient } from './apiClient';
import { supabase } from '@/integrations/supabase/client';

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

export interface DepartmentEmployee {
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string;
  position?: string;
  department: string;
  avatar_url?: string;
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

  async getDepartmentEmployees(id: string): Promise<DepartmentEmployee[]> {
    return apiClient.get<DepartmentEmployee[]>(`/departments/${id}/employees`);
  }

  async addEmployeeToDepartment(
    departmentId: string, 
    employeeId: string, 
    departmentName: string,
    employeeName: string,
    employeeEmail: string,
    assignedBy: string
  ): Promise<void> {
    await apiClient.post(`/departments/${departmentId}/employees`, { employee_id: parseInt(employeeId, 10) });
    
    // Send notification via edge function
    try {
      await supabase.functions.invoke('send-department-notification', {
        body: {
          employeeId: parseInt(employeeId, 10),
          employeeEmail,
          employeeName,
          departmentName,
          action: 'assigned',
          assignedBy,
        },
      });
    } catch (error) {
      console.error('Failed to send department notification:', error);
    }
  }

  async removeEmployeeFromDepartment(
    departmentId: string, 
    employeeId: string,
    departmentName: string,
    employeeName: string,
    employeeEmail: string,
    removedBy: string
  ): Promise<void> {
    await apiClient.delete(`/departments/${departmentId}/employees/${employeeId}`);
    
    // Send notification via edge function
    try {
      await supabase.functions.invoke('send-department-notification', {
        body: {
          employeeId: parseInt(employeeId, 10),
          employeeEmail,
          employeeName,
          departmentName,
          action: 'removed',
          assignedBy: removedBy,
        },
      });
    } catch (error) {
      console.error('Failed to send department notification:', error);
    }
  }
}

export const departmentService = new DepartmentService();
