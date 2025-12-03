
import { apiClient } from "./apiClient";

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
    return apiClient.get<Department[]>("/departments");
  }

  async getDepartmentById(id: string): Promise<Department> {
    return apiClient.get<Department>(`/departments/${id}`);
  }

  async createDepartment(data: CreateDepartmentRequest): Promise<Department> {
    return apiClient.post<Department>("/departments", data);
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
    await apiClient.post(`/departments/${departmentId}/employees`, { 
      employee_id: parseInt(employeeId, 10),
      department_name: departmentName,
      employee_name: employeeName,
      employee_email: employeeEmail,
      assigned_by: assignedBy,
    });
  }

  async removeEmployeeFromDepartment(
    departmentId: string, 
    employeeId: string,
    departmentName: string,
    employeeName: string,
    employeeEmail: string,
    removedBy: string
  ): Promise<void> {
    // Use query params for delete since body isn't supported by apiClient.delete
    const params = new URLSearchParams({
      department_name: departmentName,
      employee_name: employeeName,
      employee_email: employeeEmail,
      removed_by: removedBy,
    });
    await apiClient.delete(`/departments/${departmentId}/employees/${employeeId}?${params.toString()}`);
  }
}

export const departmentService = new DepartmentService();
