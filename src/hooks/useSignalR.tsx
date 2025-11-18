import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { signalrService } from '@/services/signalrService';
import { toast } from 'sonner';

export const useSignalR = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Connect to SignalR
    signalrService.connect(user.id);

    // Listen for attendance updates
    const handleAttendanceUpdate = (data: any) => {
      toast.info(data.message, {
        description: new Date(data.timestamp).toLocaleString(),
      });
    };

    // Listen for performance review notifications
    const handlePerformanceReview = (data: any) => {
      toast.success(data.message, {
        description: 'View your performance reviews',
        action: {
          label: 'View',
          onClick: () => window.location.href = '/performance-review',
        },
      });
    };

    signalrService.on('attendanceUpdate', handleAttendanceUpdate);
    signalrService.on('performanceReview', handlePerformanceReview);

    return () => {
      signalrService.off('attendanceUpdate', handleAttendanceUpdate);
      signalrService.off('performanceReview', handlePerformanceReview);
      signalrService.disconnect();
    };
  }, [user]);
};
