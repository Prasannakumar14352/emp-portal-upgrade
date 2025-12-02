import { apiClient } from './apiClient';

export interface Notification {
  id: string;
  employee_id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface NotificationPreferences {
  id?: string;
  employee_id: number;
  email_notifications: boolean;
  push_notifications: boolean;
  leave_update_notifications: boolean;
}

class NotificationService {
  async getUserNotifications(): Promise<Notification[]> {
    try {
      const data = await apiClient.get<Notification[]>('/notifications');
      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await apiClient.put(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.put('/notifications/mark-all-read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const data = await apiClient.get<{ count: number }>('/notifications/unread-count');
      return data.count;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  async getUserPreferences(): Promise<NotificationPreferences | null> {
    try {
      const data = await apiClient.get<NotificationPreferences>('/notifications/preferences');
      return data;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }
  }

  async updateUserPreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      await apiClient.put('/notifications/preferences', preferences);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
