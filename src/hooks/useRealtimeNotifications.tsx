import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface RealtimeNotification {
  id: string;
  type: 'leave_approved' | 'leave_rejected' | 'leave_pending' | 'leave_updated';
  title: string;
  message: string;
  timestamp: string;
  data?: any;
}

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up realtime notifications for user:', user.id);

    // Subscribe to leave updates for the current user
    const channel = supabase
      .channel('leave-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leaves',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Leave update received:', payload);
          
          const leave = payload.new;
          const oldLeave = payload.old;
          
          // Only notify if status changed
          if (leave.status !== oldLeave.status) {
            let notificationType: RealtimeNotification['type'];
            let title: string;
            let message: string;

            switch (leave.status) {
              case 'Approved':
                notificationType = 'leave_approved';
                title = '✅ Leave Approved';
                message = `Your ${leave.leave_type} request for ${leave.days} day(s) has been approved!`;
                toast.success(title, { description: message });
                break;
              case 'Rejected':
                notificationType = 'leave_rejected';
                title = '❌ Leave Rejected';
                message = `Your ${leave.leave_type} request has been rejected.`;
                toast.error(title, { description: message });
                break;
              default:
                notificationType = 'leave_updated';
                title = '🔔 Leave Updated';
                message = `Your ${leave.leave_type} request has been updated.`;
                toast.info(title, { description: message });
            }

            const notification: RealtimeNotification = {
              id: leave.id,
              type: notificationType,
              title,
              message,
              timestamp: new Date().toISOString(),
              data: leave,
            };

            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leaves',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New leave created:', payload);
          
          const leave = payload.new;
          const notification: RealtimeNotification = {
            id: leave.id,
            type: 'leave_pending',
            title: '📝 Leave Request Submitted',
            message: `Your ${leave.leave_type} request has been submitted and is pending approval.`,
            timestamp: new Date().toISOString(),
            data: leave,
          };

          toast.info(notification.title, { description: notification.message });
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leaves',
        },
        async (payload) => {
          console.log('New leave created (all):', payload);
          
          // Check if current user is manager or HR to notify them
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);

          const isManagerOrHR = userRoles?.some(r => r.role === 'hr' || r.role === 'manager');
          
          if (isManagerOrHR && payload.new.user_id !== user.id) {
            // Get employee name
            const { data: employee } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', payload.new.user_id)
              .single();

            const leave = payload.new;
            const notification: RealtimeNotification = {
              id: leave.id,
              type: 'leave_pending',
              title: '🔔 New Leave Request',
              message: `${employee?.full_name || 'An employee'} has submitted a ${leave.leave_type} request for ${leave.days} day(s)`,
              timestamp: new Date().toISOString(),
              data: leave,
            };

            toast.info(notification.title, { description: notification.message });
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime notifications');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = () => {
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearNotifications,
  };
};
