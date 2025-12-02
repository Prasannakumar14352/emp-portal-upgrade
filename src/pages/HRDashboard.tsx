import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { StatCard } from "@/components/StatCard";
import { CheckCircle, XCircle, Clock, TrendingUp, Users, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { dashboardService } from "@/services/dashboardService";

interface MonthlyTrend {
  month: string;
  approved: number;
  rejected: number;
}

interface LeaveTypeDistribution {
  name: string;
  value: number;
}

export default function HRDashboard() {
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    approvalRate: 0,
  });
  const [employeeStats, setEmployeeStats] = useState({
    activeEmployees: 0,
    activeDepartments: 0,
  });
  const [insights, setInsights] = useState({
    avgProcessingTime: 0,
    mostCommonLeaveType: "",
    peakRequestMonth: "",
  });
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [leaveTypeData, setLeaveTypeData] = useState<LeaveTypeDistribution[]>([]);

  useEffect(() => {
    if (roleLoading) return;

    if (role !== "hr" && role !== "manager") {
      navigate("/");
      toast.error("You don't have permission to access this page");
      return;
    }

    loadDashboardData();
  }, [role, roleLoading, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      console.log("🚀 [HRDashboard] Starting data fetch...");
      
      const [hrStats, trends, leaveTypes, insights, empStats] = await Promise.all([
        dashboardService.getHRDashboardStats(),
        dashboardService.getMonthlyTrends(),
        dashboardService.getLeaveTypeDistribution(),
        dashboardService.getHRInsights(),
        dashboardService.getEmployeeStats(),
      ]);

      console.log("✅ [HRDashboard] Employee Stats Response:", empStats);
      console.log("✅ [HRDashboard] HR Stats Response:", hrStats);

      setStats({
        total: hrStats.total_requests || 0,
        pending: hrStats.pending_requests || 0,
        approved: hrStats.approved_requests || 0,
        rejected: hrStats.rejected_requests || 0,
        approvalRate: hrStats.approval_rate || 0,
      });
      
      setEmployeeStats({
        activeEmployees: empStats.active_employees || 0,
        activeDepartments: empStats.active_departments || 0,
      });
      
      console.log("✅ [HRDashboard] State updated with employee stats:", {
        activeEmployees: empStats.active_employees || 0,
        activeDepartments: empStats.active_departments || 0,
      });

      setMonthlyTrends(trends || []);
      setLeaveTypeData(leaveTypes || []);
      setInsights({
        avgProcessingTime: insights.avg_processing_time || 0,
        mostCommonLeaveType: insights.most_common_leave_type || "N/A",
        peakRequestMonth: insights.peak_month || "N/A",
      });
      
      console.log("✅ [HRDashboard] All data loaded successfully");
    } catch (error) {
      console.error("❌ [HRDashboard] Failed to load HR dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

  if (loading || roleLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>;
  }

  console.log("🎨 [HRDashboard] Rendering with employee stats:", employeeStats);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HR Analytics Dashboard</h1>
        <p className="text-muted-foreground">Overview of leave requests and approval statistics</p>
      </div>

      {/* Employee & Department Statistics Cards - Prominent at top */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Employees"
          value={employeeStats.activeEmployees}
          icon={Users}
          className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-300 dark:border-blue-700"
        />
        <StatCard
          title="Active Departments"
          value={employeeStats.activeDepartments}
          icon={Building2}
          className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-300 dark:border-green-700"
        />
        <StatCard
          title="Total Requests"
          value={stats.total}
          icon={TrendingUp}
          trend={{ value: "12% from last month", positive: true }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-300 dark:border-purple-700"
        />
        <StatCard
          title="Pending Requests"
          value={stats.pending}
          icon={Clock}
          className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-300 dark:border-yellow-700"
        />
      </div>

      {/* Additional Statistics Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Approved"
          value={stats.approved}
          icon={CheckCircle}
          trend={{ value: `${stats.approvalRate}% approval rate`, positive: true }}
          className="border-success/20"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={XCircle}
          className="border-destructive/20"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Leave Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="approved"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Approved"
                />
                <Line
                  type="monotone"
                  dataKey="rejected"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  name="Rejected"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval vs Rejection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Legend />
                <Bar dataKey="approved" fill="hsl(var(--primary))" name="Approved" />
                <Bar dataKey="rejected" fill="hsl(var(--destructive))" name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leaveTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name: string; percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {leaveTypeData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Average Processing Time</p>
                <p className="text-2xl font-bold">{insights.avgProcessingTime} days</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Most Common Leave Type</p>
                <p className="text-2xl font-bold">{insights.mostCommonLeaveType}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Peak Request Month</p>
                <p className="text-2xl font-bold">{insights.peakRequestMonth}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
