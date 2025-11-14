import { StatCard } from "@/components/StatCard";
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

export default function Dashboard() {
  const stats = [
    {
      title: "Leave Balance",
      value: "12 days",
      icon: Calendar,
      trend: { value: "2 more than last year", positive: true }
    },
    {
      title: "Pending Approvals",
      value: "3",
      icon: Clock,
      trend: { value: "2 new requests", positive: false }
    },
    {
      title: "Payslips",
      value: "24",
      icon: FileText,
    },
    {
      title: "Attendance Rate",
      value: "96%",
      icon: TrendingUp,
      trend: { value: "3% increase", positive: true }
    },
  ];

  const recentLeaves = [
    { id: 1, type: "Sick Leave", dates: "Dec 15-16, 2025", status: "approved", days: 2 },
    { id: 2, type: "Annual Leave", dates: "Nov 20-24, 2025", status: "approved", days: 5 },
    { id: 3, type: "Work From Home", dates: "Dec 10, 2025", status: "pending", days: 1 },
  ];

  const upcomingHolidays = [
    { name: "Christmas Day", date: "Dec 25, 2025" },
    { name: "New Year's Day", date: "Jan 1, 2026" },
    { name: "Republic Day", date: "Jan 26, 2026" },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your employee portal activities</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Leave Requests</CardTitle>
            <Button size="sm" variant="outline">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLeaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">{leave.type}</p>
                    <p className="text-sm text-muted-foreground">{leave.dates} • {leave.days} day{leave.days > 1 ? 's' : ''}</p>
                  </div>
                  {getStatusBadge(leave.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Holidays</CardTitle>
            <Button size="sm" variant="outline">View Calendar</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingHolidays.map((holiday, index) => (
                <div key={index} className="flex items-center gap-4 rounded-lg border p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                    <Calendar className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">{holiday.name}</p>
                    <p className="text-sm text-muted-foreground">{holiday.date}</p>
                  </div>
                </div>
              ))}
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
            <Button className="h-auto flex-col gap-2 py-4">
              <Calendar className="h-5 w-5" />
              Apply for Leave
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <FileText className="h-5 w-5" />
              View Payslips
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <Clock className="h-5 w-5" />
              Check Attendance
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <TrendingUp className="h-5 w-5" />
              Performance Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
