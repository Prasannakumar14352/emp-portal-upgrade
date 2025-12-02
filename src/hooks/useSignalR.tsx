
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { signalrService } from '@/services/signalrService';
import { toast } from 'sonner';

interface AttendanceUpdateData {
  message: string;
  timestamp: string;
}

interface PerformanceReviewData {
  message: string;
}

interface LeaveStatusUpdateData {
  status: 'Approved' | 'Rejected' | string;
  message: string;
  comments?: string;
}

interface LeaveRequestSubmittedData {
  title?: string;
  message?: string;
}


export const useSignalR = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Connect to SignalR
    signalrService.connect(user.id);

    // Listen for attendance updates
    const handleAttendanceUpdate = (data: AttendanceUpdateData) => {
      toast.info(data.message, {
        description: new Date(data.timestamp).toLocaleString(),
      });
    };

    // Listen for performance review notifications
    const handlePerformanceReview = (data: PerformanceReviewData) => {
      toast.success(data.message, {
        description: 'View your performance reviews',
        action: {
          label: 'View',
          onClick: () => window.location.href = '/performance-review',
        },
      });
    };

    // Listen for leave status updates
    const handleLeaveStatusUpdate = (data: LeaveStatusUpdateData) => {
      const isApproved = data.status === 'Approved';
      const isRejected = data.status === 'Rejected';
      
      if (isApproved) {
        toast.success(data.message, {
          description: data.comments || 'Your leave request has been approved',
          action: {
            label: 'View',
            onClick: () => window.location.href = '/leaves',
          },
        });
      } else if (isRejected) {
        toast.error(data.message, {
          description: data.comments || 'Your leave request has been rejected',
          action: {
            label: 'View',
            onClick: () => window.location.href = '/leaves',
          },
        });
      } else {
        toast.info(data.message, {
          description: data.comments || 'Your leave request status has been updated',
        });
      }

      // Dispatch custom event to trigger data reload in Leaves page
      window.dispatchEvent(new CustomEvent<LeaveStatusUpdateData>('leaveStatusUpdated', { detail: data }));
    };

    // Listen for new leave request submissions
    const handleLeaveRequestSubmitted = (data: LeaveRequestSubmittedData) => {
      toast.info(data.title || 'New Leave Request', {
        description: data.message || 'A new leave request has been submitted',
        action: {
          label: 'Review',
          onClick: () => window.location.href = '/approve-leaves',
        },
      });

      // Dispatch custom event to trigger data reload in ApproveLeaves page
      window.dispatchEvent(new CustomEvent<LeaveRequestSubmittedData>('leaveRequestSubmitted', { detail: data }));
    };

    signalrService.on('attendanceUpdate', handleAttendanceUpdate);
    signalrService.on('performanceReview', handlePerformanceReview);
    signalrService.on('leaveStatusUpdate', handleLeaveStatusUpdate);
    signalrService.on('leaveRequestSubmitted', handleLeaveRequestSubmitted);

    return () => {
      signalrService.off('attendanceUpdate', handleAttendanceUpdate);
      signalrService.off('performanceReview', handlePerformanceReview);
      signalrService.off('leaveStatusUpdate', handleLeaveStatusUpdate);
      signalrService.off('leaveRequestSubmitted', handleLeaveRequestSubmitted);
      signalrService.disconnect();
    };
  }, [user]);
};
