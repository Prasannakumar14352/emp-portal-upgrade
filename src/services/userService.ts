import { apiClient } from './apiClient';

export type UserRole = 'employee' | 'hr' | 'manager';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  department?: string;
  position?: string;
  avatar_url?: string;
  hire_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserRoleResponse {
  role: UserRole;
}

class UserService {
  async getUserRole(userId: string): Promise<UserRole> {
    const response = await apiClient.get<UserRoleResponse>(`/users/${userId}/role`);
    return response.role;
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    return apiClient.get<UserProfile>(`/users/${userId}/profile`);
  }

  async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    return apiClient.patch<UserProfile>(`/users/${userId}/profile`, profile);
  }

  async getAllUsers(): Promise<UserProfile[]> {
    return apiClient.get<UserProfile[]>('/users');
  }
}

export const userService = new UserService();
