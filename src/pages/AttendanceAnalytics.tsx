import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Calendar, TrendingUp, Users, Building2, Download, Clock, AlertCircle } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  avgAttendanceRate: number;
}

interface DepartmentStats {
  department: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  attendanceRate: number;
}

interface TrendData {
  date: string;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

interface LatePatterns {
  topLateEmployees: {
    full_name: string;
    department: string;
    late_count: number;
    avg_late_minutes: number;
  }[];
  hourlyPattern: {
    hour: number;
    count: number;
  }[];
  weekdayPattern: {
    day_name: string;
    day_number: number;
    late_count: number;
    unique_employees: number;
  }[];
  departmentLate: {
    department: string;
    late_count: number;
    employees_with_late: number;
    avg_delay_minutes: number;
  }[];
}

interface DepartmentComparison {
  department: string;
  total_employees: number;
  avg_present: number;
  total_late: number;
  total_absent: number;
  attendance_rate: number;
  avg_work_hours: number;
}

export default function AttendanceAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AttendanceStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    avgAttendanceRate: 0,
  });
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [latePatterns, setLatePatterns] = useState<LatePatterns>({
    topLateEmployees: [],
    hourlyPattern: [],
    weekdayPattern: [],
    departmentLate: [],
  });
  const [departmentComparison, setDepartmentComparison] = useState<DepartmentComparison[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("30");

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [statsData, deptData, trendsData, lateData, comparisonData] = await Promise.all([
        apiClient.get<AttendanceStats>(`/attendance/analytics/stats`),
        apiClient.get<DepartmentStats[]>(`/attendance/analytics/departments`),
        apiClient.get<TrendData[]>(`/attendance/analytics/trends?days=${selectedPeriod}`),
        apiClient.get<LatePatterns>(`/attendance/analytics/late-patterns?days=${selectedPeriod}`),
        apiClient.get<DepartmentComparison[]>(`/attendance/analytics/department-comparison?days=${selectedPeriod}`),
      ]);

      setStats(statsData);
      setDepartmentStats(deptData);
      setTrendData(trendsData);
      setLatePatterns(lateData);
      setDepartmentComparison(comparisonData);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast.error("Failed to load attendance analytics");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Overall Stats
    const statsWs = XLSX.utils.json_to_sheet([stats]);
    XLSX.utils.book_append_sheet(wb, statsWs, "Overall Stats");
    
    // Department Stats
    const deptWs = XLSX.utils.json_to_sheet(departmentStats);
    XLSX.utils.book_append_sheet(wb, deptWs, "Department Stats");
    
    // Trend Data
    const trendWs = XLSX.utils.json_to_sheet(trendData);
    XLSX.utils.book_append_sheet(wb, trendWs, "Trends");
    
    // Late Patterns
    const lateWs = XLSX.utils.json_to_sheet(latePatterns.topLateEmployees);
    XLSX.utils.book_append_sheet(wb, lateWs, "Late Employees");
    
    // Department Comparison
    const compWs = XLSX.utils.json_to_sheet(departmentComparison);
    XLSX.utils.book_append_sheet(wb, compWs, "Department Comparison");
    
    XLSX.writeFile(wb, `attendance-analytics-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Analytics exported successfully");
  };

  const pieData = [
    { name: "Present", value: stats.presentToday, color: "#10b981" },
    { name: "Absent", value: stats.absentToday, color: "#ef4444" },
    { name: "Late", value: stats.lateToday, color: "#f59e0b" },
  ];

  const COLORS = ["#10b981", "#ef4444", "#f59e0b"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Attendance Analytics</h1>
          <p className="text-muted-foreground">Comprehensive attendance insights and trends</p>
        </div>
        <Button onClick={exportToExcel} className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Active workforce</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.presentToday}</div>
            <p className="text-xs text-muted-foreground">Currently in office</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Late Today</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.lateToday}</div>
            <p className="text-xs text-muted-foreground">Late arrivals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Attendance</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgAttendanceRate}%</div>
            <p className="text-xs text-muted-foreground">Overall rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="trends" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="late-patterns">Late Patterns</TabsTrigger>
            <TabsTrigger value="departments">Department Comparison</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="present" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Present"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="late" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Late"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="absent" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Absent"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Rate Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="attendanceRate" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    name="Attendance Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Late Patterns Tab */}
        <TabsContent value="late-patterns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  Top Late Employees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Late Count</TableHead>
                      <TableHead className="text-right">Avg Delay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latePatterns.topLateEmployees.map((emp, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{emp.full_name}</TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">{emp.late_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {emp.avg_late_minutes} min
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Late Arrivals by Hour</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={latePatterns.hourlyPattern}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      label={{ value: "Hour of Day", position: "insideBottom", offset: -5 }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Bar dataKey="count" fill="#f59e0b" name="Late Arrivals" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Late Arrivals by Weekday</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={latePatterns.weekdayPattern}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="day_name" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="late_count" fill="#f59e0b" name="Total Late" />
                    <Bar dataKey="unique_employees" fill="#3b82f6" name="Unique Employees" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Late Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Total Late</TableHead>
                      <TableHead className="text-right">Employees</TableHead>
                      <TableHead className="text-right">Avg Delay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latePatterns.departmentLate.map((dept, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{dept.department}</TableCell>
                        <TableCell className="text-right">{dept.late_count}</TableCell>
                        <TableCell className="text-right">{dept.employees_with_late}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {dept.avg_delay_minutes} min
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Department Comparison Tab */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Attendance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={departmentComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="department" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="attendance_rate" fill="#10b981" name="Attendance Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Employees</TableHead>
                    <TableHead className="text-right">Attendance Rate</TableHead>
                    <TableHead className="text-right">Late Count</TableHead>
                    <TableHead className="text-right">Avg Work Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentComparison.map((dept, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{dept.department}</TableCell>
                      <TableCell className="text-right">{dept.total_employees}</TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={dept.attendance_rate >= 90 ? "default" : dept.attendance_rate >= 75 ? "secondary" : "destructive"}
                        >
                          {dept.attendance_rate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{dept.total_late}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {dept.avg_work_hours} hrs
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Radar Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={departmentComparison.slice(0, 6)}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="department" 
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Radar 
                    name="Attendance Rate" 
                    dataKey="attendance_rate" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.6} 
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Today's Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department-wise Today</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="department" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="present" stackId="a" fill="#10b981" name="Present" />
                    <Bar dataKey="late" stackId="a" fill="#f59e0b" name="Late" />
                    <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
