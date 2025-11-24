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
    return apiClient.get('/payslips/notifications');
  }

  async getNotificationsByStatus(status: 'sent' | 'failed' | 'pending'): Promise<PayslipNotificationWithEmployee[]> {
    return apiClient.get(`/payslips/notifications?status=${status}`);
  }

  async retryNotification(notificationId: string): Promise<void> {
    return apiClient.post(`/payslips/retry-notification/${notificationId}`, {});
  }

  async getStatistics() {
    return apiClient.get('/payslips/notifications/statistics');
  }
}

export const payslipNotificationService = new PayslipNotificationService();
