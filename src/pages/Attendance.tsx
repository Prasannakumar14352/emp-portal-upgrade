import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Attendance() {
  // Mock data - replace with actual API calls
  const attendanceStats = {
    totalDays: 22,
    present: 20,
    absent: 1,
    late: 1,
    attendanceRate: 91
  };

  const recentAttendance = [
    { date: "2024-01-15", status: "present", checkIn: "09:00 AM", checkOut: "06:00 PM" },
    { date: "2024-01-14", status: "present", checkIn: "09:05 AM", checkOut: "06:10 PM" },
    { date: "2024-01-13", status: "late", checkIn: "09:30 AM", checkOut: "06:30 PM" },
    { date: "2024-01-12", status: "present", checkIn: "08:55 AM", checkOut: "06:00 PM" },
    { date: "2024-01-11", status: "absent", checkIn: "-", checkOut: "-" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "late":
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case "absent":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      present: "default",
      late: "secondary",
      absent: "destructive",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track your attendance and work hours</p>
        </div>
        <Button>
          <Clock className="h-4 w-4 mr-2" />
          Check In/Out
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.totalDays}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{attendanceStats.present}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{attendanceStats.absent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Late</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{attendanceStats.late}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.attendanceRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
          <CardDescription>Your attendance records for this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAttendance.map((record, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <Calendar className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {new Date(record.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      In: {record.checkIn} | Out: {record.checkOut}
                    </p>
                  </div>
                </div>
                {getStatusBadge(record.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
