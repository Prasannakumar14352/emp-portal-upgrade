import { apiClient } from './apiClient';

export type UserRole = 'employee' | 'hr' | 'manager';

export interface UserProfile {
  employee_id: string;
  email: string;
  full_name: string;
  phone?: string;
  department?: string;
  position?: string;
  avatar_url?: string;
  hire_date?: string;
  created_at?: string;
  updated_at?: string;
  gender?: string;
  role?: string;
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

  async uploadAvatar(userId: string, file: Blob): Promise<{ avatar_url: string }> {
    const formData = new FormData();
    // Create a File object from the Blob with proper filename and MIME type
    const imageFile = new File([file], 'avatar.jpg', { type: 'image/jpeg' });
    formData.append('avatar', imageFile);

    const token = localStorage.getItem('auth_token');
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    
    const response = await fetch(`${baseURL}/users/${userId}/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload avatar');
    }

    return response.json();
  }
}

export const userService = new UserService();
