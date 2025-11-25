import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Clock, BarChart3, Loader2, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface DailyAttendance {
  date: string;
  status: string;
  work_hours: number;
  check_in_time?: string;
  check_out_time?: string;
}

interface StatusBreakdown {
  status: string;
  count: number;
}

interface AttendanceSummary {
  user: {
    full_name: string;
    email: string;
    department: string;
    position: string;
  };
  month: number;
  year: number;
  dailyAttendance: DailyAttendance[];
  statusBreakdown: StatusBreakdown[];
  averageWorkHours: number;
  totalWorkHours: number;
}

const COLORS = {
  present: 'hsl(var(--success))',
  late: 'hsl(var(--warning))',
  absent: 'hsl(var(--destructive))',
  'half-day': 'hsl(var(--accent))'
};

export default function AttendanceSummary() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (user) {
      loadSummary();
    }
  }, [user, selectedMonth, selectedYear]);

  const loadSummary = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await apiClient.get<AttendanceSummary>(
        `/attendance/summary/${user.id}?month=${selectedMonth}&year=${selectedYear}`
      );
      setSummary(data);
    } catch (error) {
      console.error('Failed to load attendance summary:', error);
      toast.error('Failed to load attendance summary');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!summary) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Monthly Attendance Summary', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Employee: ${summary.user.full_name}`, 14, 30);
    doc.text(`Department: ${summary.user.department}`, 14, 37);
    doc.text(`Period: ${getMonthName(summary.month)} ${summary.year}`, 14, 44);
    
    doc.setFontSize(14);
    doc.text('Summary Statistics', 14, 56);
    
    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Value']],
      body: [
        ['Total Work Hours', `${summary.totalWorkHours.toFixed(1)} hours`],
        ['Average Work Hours/Day', `${summary.averageWorkHours.toFixed(1)} hours`],
        ['Present Days', summary.statusBreakdown.find(s => s.status === 'present')?.count || 0],
        ['Late Days', summary.statusBreakdown.find(s => s.status === 'late')?.count || 0],
        ['Absent Days', summary.statusBreakdown.find(s => s.status === 'absent')?.count || 0],
      ],
    });

    doc.save(`attendance-summary-${selectedMonth}-${selectedYear}.pdf`);
    toast.success('Report exported successfully');
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  };

  const prepareChartData = () => {
    if (!summary) return [];
    
    return summary.dailyAttendance.map(day => ({
      date: new Date(day.date).getDate(),
      hours: day.work_hours || 0,
      status: day.status
    }));
  };

  const prepareStatusData = () => {
    if (!summary) return [];
    
    return summary.statusBreakdown.map(item => ({
      name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
      value: item.count,
      color: COLORS[item.status as keyof typeof COLORS]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const chartData = prepareChartData();
  const statusData = prepareStatusData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Summary</h1>
          <p className="text-muted-foreground">Monthly attendance trends and analytics</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <SelectItem key={month} value={month.toString()}>
                  {getMonthName(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportToPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div className="text-2xl font-bold">{summary.totalWorkHours.toFixed(1)}h</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Hours/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <div className="text-2xl font-bold">{summary.averageWorkHours.toFixed(1)}h</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Present Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {summary.statusBreakdown.find(s => s.status === 'present')?.count || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Late Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {summary.statusBreakdown.find(s => s.status === 'late')?.count || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Work Hours</CardTitle>
            <CardDescription>Hours worked per day this month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))'
                  }}
                />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Status</CardTitle>
            <CardDescription>Breakdown by attendance status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work Hours Trend</CardTitle>
          <CardDescription>Daily work hours throughout the month</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="hours" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
