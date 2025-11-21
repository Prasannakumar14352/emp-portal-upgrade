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

export interface BulkRoleAssignmentResult {
  message: string;
  summary: {
    total: number;
    processed: number;
    assigned: number;
    skipped: number;
    errors: number;
  };
  details: {
    assigned: Array<{ userId: number; userName: string; role: string }>;
    skipped: Array<{ userId: number; userName: string; reason: string }>;
    errors: Array<{ userId: number; reason: string }>;
  };
}

class RoleManagementService {
  async getUsersWithRoles(): Promise<UserWithRoles[]> {
    return apiClient.get<UserWithRoles[]>('/users/with-roles');
  }

  async assignRole(userId: number, role: 'employee' | 'hr' | 'manager'): Promise<void> {
    await apiClient.post(`/users/${userId}/roles`, { role });
  }

  async bulkAssignRoles(userIds: number[], role: 'employee' | 'hr' | 'manager'): Promise<BulkRoleAssignmentResult> {
    return apiClient.post<BulkRoleAssignmentResult>('/users/bulk-assign-roles', { userIds, role });
  }

  async removeRole(roleId: number): Promise<void> {
    await apiClient.delete(`/users/roles/${roleId}`);
  }
}

export const roleManagementService = new RoleManagementService();
