import { apiClient } from './apiClient';

interface LeaveEmailData {
  to: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "approved" | "rejected";
  reason?: string;
  comments?: string;
}

class EmailService {
  async sendLeaveNotification(data: LeaveEmailData): Promise<void> {
    try {
      await apiClient.post('/notifications/leave', data);
    } catch (error) {
      console.error('Failed to send email notification:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();

// Export the function for backward compatibility
export async function sendLeaveNotification(data: LeaveEmailData) {
  return emailService.sendLeaveNotification(data);
}
