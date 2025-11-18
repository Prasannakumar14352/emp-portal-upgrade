import { apiClient } from './apiClient';

export interface UserPreferences {
  id: string;
  user_id: string;
  dark_mode: boolean;
  compact_view: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  leave_update_notifications: boolean;
  created_at: string;
  updated_at: string;
}

class SettingsService {
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
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

  async createOrUpdatePreferences(userId: string, preferences: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserPreferences> {
    try {
      const response = await apiClient.put<UserPreferences>(`/users/${userId}/preferences`, preferences);
      return response;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }
}

export const settingsService = new SettingsService();
