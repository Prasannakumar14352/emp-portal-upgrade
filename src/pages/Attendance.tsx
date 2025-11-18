import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Loader2, LogIn, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { attendanceService, type AttendanceRecord, type AttendanceStats } from "@/services/attendanceService";
import { toast } from "sonner";

export default function Attendance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    totalDays: 0,
    present: 0,
    absent: 0,
    late: 0,
    attendanceRate: 0
  });
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (user) {
      loadAttendanceData();
    }
  }, [user]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const [today, stats, records] = await Promise.all([
        attendanceService.getTodayAttendance(user!.id),
        attendanceService.getAttendanceStats(user!.id, currentMonth, currentYear),
        attendanceService.getUserAttendance(user!.id, currentMonth, currentYear),
      ]);

      setTodayRecord(today);
      setAttendanceStats(stats);
      setRecentAttendance(records.slice(0, 5));
    } catch (error) {
      console.error('Failed to load attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      await attendanceService.checkIn(user!.id);
      toast.success('Checked in successfully!');
      await loadAttendanceData();
    } catch (error: any) {
      console.error('Check-in failed:', error);
      toast.error(error.message || 'Failed to check in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      await attendanceService.checkOut(user!.id);
      toast.success('Checked out successfully!');
      await loadAttendanceData();
    } catch (error: any) {
      console.error('Check-out failed:', error);
      toast.error(error.message || 'Failed to check out');
    } finally {
      setActionLoading(false);
    }
  };

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
      "half-day": "outline",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"} className="gap-1">
        {getStatusIcon(status)}
        {status === "half-day" ? "Half Day" : status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canCheckIn = !todayRecord?.check_in_time;
  const canCheckOut = todayRecord?.check_in_time && !todayRecord?.check_out_time;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track your attendance and work hours</p>
        </div>
        <div className="flex gap-2">
          {canCheckIn && (
            <Button onClick={handleCheckIn} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              Check In
            </Button>
          )}
          {canCheckOut && (
            <Button onClick={handleCheckOut} disabled={actionLoading} variant="outline">
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              Check Out
            </Button>
          )}
          {todayRecord?.check_in_time && todayRecord?.check_out_time && (
            <Button disabled variant="secondary">
              <CheckCircle className="h-4 w-4 mr-2" />
              Completed Today
            </Button>
          )}
        </div>
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
                      In: {record.check_in_time ? formatTime(record.check_in_time) : '-'} | 
                      Out: {record.check_out_time ? formatTime(record.check_out_time) : '-'}
                      {record.work_hours && ` (${record.work_hours.toFixed(1)}h)`}
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
