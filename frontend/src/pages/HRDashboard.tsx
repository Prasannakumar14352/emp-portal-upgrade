import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { StatCard } from "@/components/StatCard";
import { CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

interface LeaveRequest {
  id: number;
  status: "pending" | "approved" | "rejected";
  appliedDate: string;
  type: string;
}

export default function HRDashboard() {
  const { role } = useUserRole();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    approvalRate: 0,
  });

  useEffect(() => {
    if (role !== "hr" && role !== "manager") {
      navigate("/");
      toast.error("You don't have permission to access this page");
      return;
    }

    const storedRequests = localStorage.getItem("mockLeaveRequests");
    if (storedRequests) {
      const parsedRequests: LeaveRequest[] = JSON.parse(storedRequests);
      setRequests(parsedRequests);

      const total = parsedRequests.length;
      const pending = parsedRequests.filter((r) => r.status === "pending").length;
      const approved = parsedRequests.filter((r) => r.status === "approved").length;
      const rejected = parsedRequests.filter((r) => r.status === "rejected").length;
      const approvalRate = total > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0;

      setStats({ total, pending, approved, rejected, approvalRate });
    }
  }, [role, navigate]);

  // Monthly trends data
  const monthlyTrends = [
    { month: "Jan", approved: 12, rejected: 2 },
    { month: "Feb", approved: 15, rejected: 3 },
    { month: "Mar", approved: 18, rejected: 1 },
    { month: "Apr", approved: 14, rejected: 4 },
    { month: "May", approved: 20, rejected: 2 },
    { month: "Jun", approved: 16, rejected: 3 },
  ];

  // Leave type distribution
  const leaveTypeData = [
    { name: "Annual Leave", value: 45 },
    { name: "Sick Leave", value: 25 },
    { name: "Work From Home", value: 20 },
    { name: "Other", value: 10 },
  ];

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HR Analytics Dashboard</h1>
        <p className="text-muted-foreground">Overview of leave requests and approval statistics</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={stats.total}
          icon={TrendingUp}
          trend={{ value: "12% from last month", positive: true }}
        />
        <StatCard
          title="Pending Requests"
          value={stats.pending}
          icon={Clock}
          className="border-warning/20"
        />
        <StatCard
          title="Approved"
          value={stats.approved}
          icon={CheckCircle}
          trend={{ value: `${stats.approvalRate}% approval rate`, positive: true }}
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={XCircle}
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
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {leaveTypeData.map((entry, index) => (
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
                <p className="text-2xl font-bold">2.3 days</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Most Common Leave Type</p>
                <p className="text-2xl font-bold">Annual</p>
              </div>
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Peak Request Month</p>
                <p className="text-2xl font-bold">May</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
