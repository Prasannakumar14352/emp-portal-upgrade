import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata: any;
}

export interface NotificationPreferences {
  id?: string;
  user_id: number;
  email_notifications: boolean;
  push_notifications: boolean;
  leave_update_notifications: boolean;
}

class NotificationService {
  // Get employee_id (integer) from Supabase UUID
  private async getEmployeeId(supabaseUserId: string): Promise<number | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('employee_id')
      .eq('id', supabaseUserId)
      .single();

    if (error) {
      console.error('Error fetching employee_id:', error);
      return null;
    }

    return data?.employee_id || null;
  }

  async getUserNotifications(supabaseUserId: string): Promise<Notification[]> {
    const employeeId = await this.getEmployeeId(supabaseUserId);
    if (!employeeId) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    return data || [];
  }

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(supabaseUserId: string): Promise<void> {
    const employeeId = await this.getEmployeeId(supabaseUserId);
    if (!employeeId) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', employeeId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  async getUnreadCount(supabaseUserId: string): Promise<number> {
    const employeeId = await this.getEmployeeId(supabaseUserId);
    if (!employeeId) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', employeeId)
      .eq('read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  }

  async getUserPreferences(supabaseUserId: string): Promise<NotificationPreferences | null> {
    const employeeId = await this.getEmployeeId(supabaseUserId);
    if (!employeeId) return null;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', employeeId)
      .single();

    if (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }

    return data;
  }

  async updateUserPreferences(
    supabaseUserId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    const employeeId = await this.getEmployeeId(supabaseUserId);
    if (!employeeId) return;

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: employeeId,
        ...preferences
      });

    if (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  // Subscribe to real-time notification updates
  subscribeToNotifications(supabaseUserId: string, callback: (notification: Notification) => void) {
    // Get employee_id and subscribe
    this.getEmployeeId(supabaseUserId).then(employeeId => {
      if (!employeeId) return;

      const channel = supabase
        .channel('notifications-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${employeeId}`
          },
          (payload) => {
            callback(payload.new as Notification);
          }
        )
        .subscribe();

      return channel;
    });

    // Return a dummy channel for now
    return supabase.channel('notifications-channel');
  }
}

export const notificationService = new NotificationService();
