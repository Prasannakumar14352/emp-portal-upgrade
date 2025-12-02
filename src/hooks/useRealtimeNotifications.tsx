
import { useState } from 'react';

interface RealtimeNotification {
  id: string;
  type: 'leave_approved' | 'leave_rejected' | 'leave_pending' | 'leave_updated';
  title: string;
  message: string;
  timestamp: string;
  data?: unknown;
}

export const useRealtimeNotifications = () => {
  const [notifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount] = useState(0);

  // Real-time notifications are handled via SignalR (see useSignalR hook)
  // This hook provides a placeholder interface for compatibility

  const markAsRead = () => {
    // No-op: handled by SignalR implementation
  };

  const clearNotifications = () => {
    // No-op: handled by SignalR implementation
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearNotifications,
  };
};
