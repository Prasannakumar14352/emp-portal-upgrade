import { apiClient } from './apiClient';

export interface UserRole {
  role: 'employee' | 'hr' | 'manager';
  role_id: number;
  role_assigned_at: string;
}

export interface UserWithRoles {
  id: number;
  email: string;
  full_name: string;
  department: string | null;
  position: string | null;
  roles: UserRole[];
}

export interface AssignRoleRequest {
  role: 'employee' | 'hr' | 'manager';
}

class RoleManagementService {
  async getUsersWithRoles(): Promise<UserWithRoles[]> {
    return apiClient.get<UserWithRoles[]>('/users/with-roles');
  }

  async assignRole(userId: number, role: 'employee' | 'hr' | 'manager'): Promise<void> {
    await apiClient.post(`/users/${userId}/roles`, { role });
  }

  async removeRole(roleId: number): Promise<void> {
    await apiClient.delete(`/users/roles/${roleId}`);
  }
}

export const roleManagementService = new RoleManagementService();
