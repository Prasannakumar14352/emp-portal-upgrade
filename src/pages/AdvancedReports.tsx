import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Calendar as CalendarIcon, TrendingUp, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { useUserRole } from "@/hooks/useUserRole";

// Mock data for demonstration
const monthlyData = [
  { month: "Jan", leaves: 45, approved: 38, rejected: 7 },
  { month: "Feb", leaves: 52, approved: 45, rejected: 7 },
  { month: "Mar", leaves: 48, approved: 41, rejected: 7 },
  { month: "Apr", leaves: 55, approved: 48, rejected: 7 },
  { month: "May", leaves: 60, approved: 52, rejected: 8 },
  { month: "Jun", leaves: 58, approved: 50, rejected: 8 },
  { month: "Jul", leaves: 65, approved: 57, rejected: 8 },
  { month: "Aug", leaves: 62, approved: 54, rejected: 8 },
  { month: "Sep", leaves: 57, approved: 49, rejected: 8 },
  { month: "Oct", leaves: 60, approved: 52, rejected: 8 },
  { month: "Nov", leaves: 55, approved: 48, rejected: 7 },
  { month: "Dec", leaves: 70, approved: 62, rejected: 8 },
];

const quarterlyData = [
  { quarter: "Q1 2024", leaves: 145, approved: 124, rejected: 21 },
  { quarter: "Q2 2024", leaves: 173, approved: 150, rejected: 23 },
  { quarter: "Q3 2024", leaves: 184, approved: 160, rejected: 24 },
  { quarter: "Q4 2024", leaves: 185, approved: 162, rejected: 23 },
];

const leaveTypeData = [
  { name: "Annual Leave", value: 320, color: "#3b82f6" },
  { name: "Sick Leave", value: 180, color: "#ef4444" },
  { name: "Personal Leave", value: 95, color: "#f59e0b" },
  { name: "Unpaid Leave", value: 45, color: "#8b5cf6" },
];

const departmentData = [
  { department: "Engineering", leaves: 145, avgDays: 12.5 },
  { department: "Sales", leaves: 98, avgDays: 10.2 },
  { department: "Marketing", leaves: 67, avgDays: 11.8 },
  { department: "HR", leaves: 45, avgDays: 9.5 },
  { department: "Finance", leaves: 52, avgDays: 8.7 },
];

export default function AdvancedReports() {
  const { role } = useUserRole();
  const [reportType, setReportType] = useState<"monthly" | "quarterly">("monthly");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  if (role !== "hr" && role !== "manager") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Advanced Leave Reports", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 20, 35);
    if (startDate) doc.text(`From: ${format(startDate, "PPP")}`, 20, 45);
    if (endDate) doc.text(`To: ${format(endDate, "PPP")}`, 20, 55);
    
    doc.text("Summary Statistics:", 20, 70);
    doc.text(`Total Leave Requests: ${monthlyData.reduce((sum, m) => sum + m.leaves, 0)}`, 20, 80);
    doc.text(`Total Approved: ${monthlyData.reduce((sum, m) => sum + m.approved, 0)}`, 20, 90);
    doc.text(`Total Rejected: ${monthlyData.reduce((sum, m) => sum + m.rejected, 0)}`, 20, 100);
    
    doc.text("Top Leave Types:", 20, 115);
    leaveTypeData.forEach((type, index) => {
      doc.text(`${type.name}: ${type.value} requests`, 30, 125 + (index * 10));
    });
    
    doc.save(`leave-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Report exported to PDF");
  };

  const handleExportCSV = () => {
    const data = reportType === "monthly" ? monthlyData : quarterlyData;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    
    toast.success("Report exported to CSV");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Reports</h1>
          <p className="text-muted-foreground">Comprehensive leave analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyData.reduce((sum, m) => sum + m.leaves, 0)}</div>
            <p className="text-xs text-muted-foreground">+12% from last period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">+2% from last period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Processing Time</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3 days</div>
            <p className="text-xs text-muted-foreground">-0.5 days from last period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Peak Leave Month</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">December</div>
            <p className="text-xs text-muted-foreground">70 requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Request Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={reportType === "monthly" ? monthlyData : quarterlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={reportType === "monthly" ? "month" : "quarter"} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="leaves" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Leave Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Types Distribution</CardTitle>
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
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leaveTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Department Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="leaves" fill="#3b82f6" />
                <Bar dataKey="avgDays" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Period Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Period</th>
                  <th className="text-right p-3">Total Requests</th>
                  <th className="text-right p-3">Approved</th>
                  <th className="text-right p-3">Rejected</th>
                  <th className="text-right p-3">Approval Rate</th>
                  <th className="text-right p-3">Change</th>
                </tr>
              </thead>
              <tbody>
                {(reportType === "monthly" ? monthlyData : quarterlyData).map((row, index) => {
                  const period = reportType === "monthly" ? row.month : (row as any).quarter;
                  const leaves = row.leaves;
                  const approved = row.approved;
                  const rejected = row.rejected;
                  const rate = ((approved / leaves) * 100).toFixed(1);
                  const prevLeaves = index > 0 
                    ? (reportType === "monthly" ? monthlyData[index - 1].leaves : quarterlyData[index - 1].leaves)
                    : leaves;
                  const change = ((leaves - prevLeaves) / prevLeaves * 100).toFixed(1);
                  
                  return (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{period}</td>
                      <td className="text-right p-3">{leaves}</td>
                      <td className="text-right p-3 text-green-600">{approved}</td>
                      <td className="text-right p-3 text-red-600">{rejected}</td>
                      <td className="text-right p-3">{rate}%</td>
                      <td className={`text-right p-3 ${Number(change) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Number(change) > 0 ? '+' : ''}{change}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
