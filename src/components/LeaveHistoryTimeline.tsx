import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, User, MessageSquare } from "lucide-react";
import { Leave } from "@/services/leaveService";

interface LeaveHistoryTimelineProps {
  leave: Leave;
}

export function LeaveHistoryTimeline({ leave }: LeaveHistoryTimelineProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "Rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const timelineEvents = [];

  // Application submitted
  timelineEvents.push({
    title: "Leave Application Submitted",
    timestamp: leave.created_at,
    icon: <User className="h-5 w-5 text-blue-500" />,
    description: `Applied for ${leave.leave_type}`,
  });

  // Manager approval/rejection
  if (leave.manager_approved_at) {
    timelineEvents.push({
      title: leave.manager_status === "Approved" 
        ? "Manager Approved" 
        : "Manager Rejected",
      timestamp: leave.manager_approved_at,
      icon: getStatusIcon(leave.manager_status),
      description: leave.manager_comments || "No comments provided",
      approver: leave.manager_approved_by,
    });
  }

  // HR approval/rejection
  if (leave.hr_approved_at) {
    timelineEvents.push({
      title: leave.hr_status === "Approved" 
        ? "HR Approved" 
        : "HR Rejected",
      timestamp: leave.hr_approved_at,
      icon: getStatusIcon(leave.hr_status),
      description: leave.hr_comments || "No comments provided",
      approver: leave.hr_approved_by,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Approval Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-8 before:absolute before:left-4 before:top-2 before:h-[calc(100%-1rem)] before:w-0.5 before:bg-border">
          {timelineEvents.map((event, index) => (
            <div key={index} className="relative flex gap-4 pl-10">
              <div className="absolute left-0 mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-border">
                {event.icon}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">{event.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {formatDate(event.timestamp)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
            </div>
          ))}
          
          {/* Current status if still pending */}
          {leave.status === "Pending" && (
            <div className="relative flex gap-4 pl-10">
              <div className="absolute left-0 mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-border">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-semibold text-foreground">
                  {leave.manager_status === "Pending" 
                    ? "Awaiting Manager Approval" 
                    : "Awaiting HR Approval"}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Your request is being reviewed
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
