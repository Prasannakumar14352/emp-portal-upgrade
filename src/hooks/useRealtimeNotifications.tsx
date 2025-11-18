import { useState } from 'react';

interface RealtimeNotification {
  id: string;
  type: 'leave_approved' | 'leave_rejected' | 'leave_pending' | 'leave_updated';
  title: string;
  message: string;
  timestamp: string;
  data?: any;
}

export const useRealtimeNotifications = () => {
  const [notifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount] = useState(0);

  // Realtime notifications disabled - SQL Server backend doesn't support Supabase realtime
  // Use SignalR for real-time updates instead (already implemented in useSignalR hook)

  const markAsRead = () => {
    // No-op: realtime notifications disabled
  };

  const clearNotifications = () => {
    // No-op: realtime notifications disabled
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearNotifications,
  };
};
