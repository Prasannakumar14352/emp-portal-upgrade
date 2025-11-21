import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/StatCard";
import { ApprovalWorkflowWidget } from "@/components/ApprovalWorkflowWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  FileText, 
  Clock, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { leaveService, type Leave } from "@/services/leaveService";
import { holidayService, type Holiday } from "@/services/holidayService";
import { dashboardService } from "@/services/dashboardService";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole();
  const [stats, setStats] = useState({
    leaveBalance: 0,
    pendingApprovals: 0,
    payslipsCount: 0,
    attendanceRate: 0,
  });
  const [recentLeaves, setRecentLeaves] = useState<Leave[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardStats, leaves, holidays] = await Promise.all([
        dashboardService.getEmployeeDashboardStats(user!.id),
        leaveService.getUserLeaves(user!.id),
        holidayService.getUpcomingHolidays(3),
      ]);

      setStats({
        leaveBalance: dashboardStats.leave_balance,
        pendingApprovals: dashboardStats.pending_approvals,
        payslipsCount: dashboardStats.payslips_count,
        attendanceRate: dashboardStats.attendance_rate,
      });
      setRecentLeaves(leaves.slice(0, 3));
      setUpcomingHolidays(holidays);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    {
      title: "Leave Balance",
      value: `${stats.leaveBalance} days`,
      icon: Calendar,
      trend: { value: "Annual quota", positive: true }
    },
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals.toString(),
      icon: Clock,
      trend: { value: "Awaiting response", positive: false }
    },
    {
      title: "Payslips",
      value: stats.payslipsCount.toString(),
      icon: FileText,
    },
    {
      title: "Attendance Rate",
      value: `${stats.attendanceRate}%`,
      icon: TrendingUp,
      trend: { value: "This year", positive: true }
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: "default",
      pending: "secondary",
      rejected: "destructive",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"} className="gap-1">
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  if (loading) {
    return <div className="space-y-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your employee portal activities</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Approval Workflow Widget - Only visible to HR and Managers */}
      {(role === 'hr' || role === 'manager') && (
        <ApprovalWorkflowWidget />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Leave Requests</CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate("/leaves")}>View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLeaves.length > 0 ? (
                recentLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <p className="font-medium">{leave.leave_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateRange(leave.start_date, leave.end_date)} • {leave.days} day{leave.days > 1 ? 's' : ''}
                      </p>
                    </div>
                    {getStatusBadge(leave.status.toLowerCase())}
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No recent leave requests</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Holidays</CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate("/holidays")}>View Calendar</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingHolidays.length > 0 ? (
                upcomingHolidays.map((holiday) => (
                  <div key={holiday.id} className="flex items-center gap-4 rounded-lg border p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                      <Calendar className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium">{holiday.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(holiday.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No upcoming holidays</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/leaves")}>
              <Calendar className="h-5 w-5" />
              Apply for Leave
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/payslips")}>
              <FileText className="h-5 w-5" />
              View Payslips
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/attendance")}>
              <Clock className="h-5 w-5" />
              Check Attendance
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/performance-review")}>
              <TrendingUp className="h-5 w-5" />
              Performance Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
