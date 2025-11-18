import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, TrendingUp, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { statisticsService } from "@/services/statisticsService";
import { toast } from "sonner";

export default function Attendance() {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [attendanceStats, setAttendanceStats] = useState({
    totalWorkingDays: 0,
    presentDays: 0,
    leaveDays: 0,
    attendanceRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAttendanceData();
    }
  }, [user]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const stats = await statisticsService.getAttendanceStatistics(user!.id);
      setAttendanceStats({
        totalWorkingDays: stats.total_working_days,
        presentDays: stats.present_days,
        leaveDays: stats.leave_days,
        attendanceRate: stats.attendance_rate,
      });
    } catch (error) {
      console.error("Failed to load attendance data:", error);
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    {
      title: "Total Working Days",
      value: attendanceStats.totalWorkingDays,
      icon: CalendarIcon,
      color: "text-blue-600",
    },
    {
      title: "Present Days",
      value: attendanceStats.presentDays,
      icon: User,
      color: "text-green-600",
    },
    {
      title: "Leave Days",
      value: attendanceStats.leaveDays,
      icon: Clock,
      color: "text-orange-600",
    },
    {
      title: "Attendance Rate",
      value: `${attendanceStats.attendanceRate}%`,
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">Track your attendance and working days</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Working Days</p>
                <p className="text-sm text-muted-foreground">Total working days this year</p>
              </div>
              <Badge variant="outline" className="text-base">
                {attendanceStats.totalWorkingDays}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Present</p>
                <p className="text-sm text-muted-foreground">Days you were present</p>
              </div>
              <Badge className="text-base bg-green-600">
                {attendanceStats.presentDays}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">On Leave</p>
                <p className="text-sm text-muted-foreground">Days you were on leave</p>
              </div>
              <Badge variant="secondary" className="text-base">
                {attendanceStats.leaveDays}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4 bg-accent/10">
              <div>
                <p className="font-medium">Attendance Rate</p>
                <p className="text-sm text-muted-foreground">Your overall attendance</p>
              </div>
              <Badge className="text-base">
                {attendanceStats.attendanceRate}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
