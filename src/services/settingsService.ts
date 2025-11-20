import { apiClient } from './apiClient';

export interface UserPreferences {
  id: number;
  employee_id: number;
  dark_mode: boolean;
  compact_view: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  leave_update_notifications: boolean;
  notification_sound?: string;
  notification_volume?: number;
  created_at: string;
  updated_at: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

class SettingsService {
  async getUserPreferences(userId: number): Promise<UserPreferences | null> {
    try {
      const response = await apiClient.get<UserPreferences>(`/users/${userId}/preferences`);
      return response;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      console.error('Error fetching user preferences:', error);
      throw error;
    }
  }

  async createOrUpdatePreferences(userId: number, preferences: Partial<Omit<UserPreferences, 'id' | 'employee_id' | 'created_at' | 'updated_at'>>): Promise<UserPreferences> {
    try {
      const response = await apiClient.put<UserPreferences>(`/users/${userId}/preferences`, preferences);
      return response;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  async changePassword(userId: number, passwordData: ChangePasswordRequest): Promise<void> {
    try {
      await apiClient.post(`/users/${userId}/change-password`, passwordData);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
}

export const settingsService = new SettingsService();
