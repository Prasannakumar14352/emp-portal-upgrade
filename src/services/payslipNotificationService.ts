import { supabase } from '@/integrations/supabase/client';
import { apiClient } from './apiClient';

export interface PayslipNotification {
  id: string;
  employee_id: string;
  payslip_id?: string;
  month: string;
  year: number;
  email: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PayslipNotificationWithEmployee extends PayslipNotification {
  employee_name?: string;
}

class PayslipNotificationService {
  async getNotifications(): Promise<PayslipNotificationWithEmployee[]> {
    const { data, error } = await supabase
      .from('payslip_notifications')
      .select(`
        *,
        profiles!inner(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((notification: any) => ({
      ...notification,
      employee_name: notification.profiles?.full_name
    }));
  }

  async getNotificationsByStatus(status: 'sent' | 'failed' | 'pending'): Promise<PayslipNotificationWithEmployee[]> {
    const { data, error } = await supabase
      .from('payslip_notifications')
      .select(`
        *,
        profiles!inner(full_name)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((notification: any) => ({
      ...notification,
      employee_name: notification.profiles?.full_name
    }));
  }

  async retryNotification(notificationId: string): Promise<void> {
    return apiClient.post(`/payslips/retry-notification/${notificationId}`, {});
  }

  async createNotification(notification: Omit<PayslipNotification, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    const { error } = await supabase
      .from('payslip_notifications')
      .insert(notification);

    if (error) throw error;
  }

  async getStatistics() {
    const { data: all, error: allError } = await supabase
      .from('payslip_notifications')
      .select('status', { count: 'exact' });

    if (allError) throw allError;

    const stats = {
      total: all?.length || 0,
      sent: all?.filter(n => n.status === 'sent').length || 0,
      failed: all?.filter(n => n.status === 'failed').length || 0,
      pending: all?.filter(n => n.status === 'pending').length || 0,
    };

    return stats;
  }
}

export const payslipNotificationService = new PayslipNotificationService();
