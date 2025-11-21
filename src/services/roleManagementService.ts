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

export interface RoleAuditLogEntry {
  id: string;
  employee_id: number;
  employee_name: string;
  employee_email: string;
  role: string;
  action: 'assigned' | 'removed' | 'bulk_assigned';
  changed_by: number;
  changed_by_name: string;
  changed_by_email: string;
  changed_at: string;
  notes?: string;
}

export interface RoleAuditLogResponse {
  data: RoleAuditLogEntry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
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

  async getRoleAuditLog(params?: { limit?: number; offset?: number; employeeId?: number }): Promise<RoleAuditLogResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.employeeId) queryParams.append('employeeId', params.employeeId.toString());
    
    return apiClient.get<RoleAuditLogResponse>(`/users/role-audit-log?${queryParams.toString()}`);
  }
}

export const roleManagementService = new RoleManagementService();
