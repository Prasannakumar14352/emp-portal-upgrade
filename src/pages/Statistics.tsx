import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { statisticsService, type EmployeeStatistics, type AttendanceStatistics } from "@/services/statisticsService";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Calendar, TrendingUp, Award, Clock } from "lucide-react";
import { StatCard } from "@/components/StatCard";

export default function Statistics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStatistics | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStatistics | null>(null);

  useEffect(() => {
    if (user) {
      loadStatistics();
    }
  }, [user]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const [empStats, attStats] = await Promise.all([
        statisticsService.getEmployeeStatistics(user!.id),
        statisticsService.getAttendanceStatistics(user!.id),
      ]);
      setEmployeeStats(empStats);
      setAttendanceStats(attStats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="space-y-6">Loading statistics...</div>;
  }

  if (!employeeStats || !attendanceStats) {
    return <div className="space-y-6">No statistics available</div>;
  }

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

  const leaveStatusData = [
    { name: "Approved", value: employeeStats.leave_stats.approved_leaves },
    { name: "Pending", value: employeeStats.leave_stats.pending_leaves },
    { name: "Rejected", value: employeeStats.leave_stats.rejected_leaves },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Statistics</h1>
        <p className="text-muted-foreground">Comprehensive overview of your leave and attendance data</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leaves"
          value={employeeStats.leave_stats.total_leaves}
          icon={Calendar}
          trend={{ value: `${employeeStats.leave_stats.total_days_taken} days taken`, positive: false }}
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceStats.attendance_rate}%`}
          icon={TrendingUp}
          trend={{ value: `${attendanceStats.present_days}/${attendanceStats.total_working_days} days`, positive: true }}
        />
        <StatCard
          title="Available Balance"
          value={`${employeeStats.balance_stats.total_remaining} days`}
          icon={Award}
        />
        <StatCard
          title="Pending Requests"
          value={employeeStats.leave_stats.pending_leaves}
          icon={Clock}
        />
      </div>

      <Tabs defaultValue="leaves" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leaves">Leave Statistics</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="leaves" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Leave Status Distribution</CardTitle>
                <CardDescription>Breakdown of your leave requests</CardDescription>
              </CardHeader>
              <CardContent>
                {leaveStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={leaveStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {leaveStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No leave data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leave Type Breakdown</CardTitle>
                <CardDescription>Days taken by leave type</CardDescription>
              </CardHeader>
              <CardContent>
                {employeeStats.leave_type_breakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={employeeStats.leave_type_breakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="leave_type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="total_days" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No leave type data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Leave Trends</CardTitle>
              <CardDescription>Your leave pattern throughout the year</CardDescription>
            </CardHeader>
            <CardContent>
              {employeeStats.monthly_trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={employeeStats.monthly_trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month_name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="days_taken" fill="hsl(var(--primary))" name="Days Taken" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No monthly trend data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leave Balance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Allocated</p>
                  <p className="text-2xl font-bold">{employeeStats.balance_stats.total_allocated} days</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Used</p>
                  <p className="text-2xl font-bold text-destructive">{employeeStats.balance_stats.total_used} days</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold text-success">{employeeStats.balance_stats.total_remaining} days</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Carry Forward</p>
                  <p className="text-2xl font-bold">{employeeStats.balance_stats.total_carry_forward} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Overview</CardTitle>
              <CardDescription>
                Period: {new Date(attendanceStats.period.start_date).toLocaleDateString()} - {new Date(attendanceStats.period.end_date).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Working Days</p>
                      <p className="text-3xl font-bold">{attendanceStats.total_working_days}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-success/10">
                    <div>
                      <p className="text-sm text-muted-foreground">Present Days</p>
                      <p className="text-3xl font-bold text-success">{attendanceStats.present_days}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-success" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-warning/10">
                    <div>
                      <p className="text-sm text-muted-foreground">Leave Days</p>
                      <p className="text-3xl font-bold text-warning">{attendanceStats.leave_days}</p>
                    </div>
                    <Clock className="h-8 w-8 text-warning" />
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="relative inline-flex items-center justify-center w-48 h-48">
                      <svg className="w-48 h-48 transform -rotate-90">
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          className="text-muted"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 80}`}
                          strokeDashoffset={`${2 * Math.PI * 80 * (1 - attendanceStats.attendance_rate / 100)}`}
                          className="text-success"
                        />
                      </svg>
                      <div className="absolute">
                        <p className="text-5xl font-bold">{attendanceStats.attendance_rate}%</p>
                        <p className="text-sm text-muted-foreground">Attendance</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Excellent attendance record!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
