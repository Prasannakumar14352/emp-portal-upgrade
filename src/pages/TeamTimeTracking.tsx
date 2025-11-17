import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Clock, Users, TrendingUp } from "lucide-react";
import { sessionService, EmployeeSessionStats } from "@/services/sessionService";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export default function TeamTimeTracking() {
  const { role, loading: roleLoading } = useUserRole();
  const [employeeStats, setEmployeeStats] = useState<EmployeeSessionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!roleLoading && (role === "hr" || role === "manager")) {
      loadEmployeeStats();
    }
  }, [role, roleLoading, startDate, endDate]);

  const loadEmployeeStats = async () => {
    try {
      setLoading(true);
      const stats = await sessionService.getAllEmployeeSessions(
        startDate || undefined,
        endDate || undefined
      );
      setEmployeeStats(stats);
    } catch (error) {
      toast.error("Failed to load employee statistics");
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (role !== "hr" && role !== "manager") {
    return <Navigate to="/dashboard" replace />;
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string) => {
    if (dateString === "Never") return "Never";
    return new Date(dateString).toLocaleString();
  };

  const exportToExcel = () => {
    try {
      const data = employeeStats.map(emp => ({
        "Employee Name": emp.full_name,
        "Email": emp.email,
        "Department": emp.department,
        "Position": emp.position,
        "Total Sessions": emp.total_sessions,
        "Total Duration (hours)": (emp.total_duration / 60).toFixed(2),
        "Average Duration (hours)": (emp.average_duration / 60).toFixed(2),
        "Last Login": formatDate(emp.last_login),
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Team Time Tracking");
      
      XLSX.writeFile(wb, `team-time-tracking-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Excel report exported successfully");
    } catch (error) {
      toast.error("Failed to export Excel");
      console.error("Export error:", error);
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(20);
      doc.text("Team Time Tracking Report", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: "center" });
      
      if (startDate || endDate) {
        doc.text(
          `Period: ${startDate || 'All'} to ${endDate || 'Present'}`,
          pageWidth / 2,
          35,
          { align: "center" }
        );
      }

      let yPos = 45;
      const lineHeight = 8;

      employeeStats.forEach((emp, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${index + 1}. ${emp.full_name}`, 15, yPos);
        yPos += lineHeight;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Email: ${emp.email}`, 20, yPos);
        yPos += lineHeight;
        doc.text(`Department: ${emp.department} | Position: ${emp.position}`, 20, yPos);
        yPos += lineHeight;
        doc.text(`Total Sessions: ${emp.total_sessions}`, 20, yPos);
        yPos += lineHeight;
        doc.text(`Total Duration: ${formatDuration(emp.total_duration)}`, 20, yPos);
        yPos += lineHeight;
        doc.text(`Average Session: ${formatDuration(emp.average_duration)}`, 20, yPos);
        yPos += lineHeight;
        doc.text(`Last Login: ${formatDate(emp.last_login)}`, 20, yPos);
        yPos += lineHeight + 3;
      });

      doc.save(`team-time-tracking-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF report exported successfully");
    } catch (error) {
      toast.error("Failed to export PDF");
      console.error("Export error:", error);
    }
  };

  const totalSessions = employeeStats.reduce((sum, emp) => sum + emp.total_sessions, 0);
  const totalDuration = employeeStats.reduce((sum, emp) => sum + emp.total_duration, 0);
  const avgDuration = employeeStats.length > 0 ? totalDuration / employeeStats.length : 0;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading statistics...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team Time Tracking</h1>
          <p className="text-muted-foreground">Monitor employee login and logout statistics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={exportToPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground">All employee sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
            <p className="text-xs text-muted-foreground">Combined duration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Time</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(Math.round(avgDuration))}</div>
            <p className="text-xs text-muted-foreground">Per employee</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter by Date Range</CardTitle>
          <CardDescription>Select a date range to filter the statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => { setStartDate(""); setEndDate(""); }}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee Time Statistics</CardTitle>
          <CardDescription>Detailed breakdown of each employee's time tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Total Time</TableHead>
                <TableHead className="text-right">Avg Time</TableHead>
                <TableHead>Last Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                employeeStats.map((emp) => (
                  <TableRow key={emp.user_id}>
                    <TableCell className="font-medium">
                      <div>{emp.full_name}</div>
                      <div className="text-sm text-muted-foreground">{emp.email}</div>
                    </TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.position}</TableCell>
                    <TableCell className="text-right">{emp.total_sessions}</TableCell>
                    <TableCell className="text-right">{formatDuration(emp.total_duration)}</TableCell>
                    <TableCell className="text-right">{formatDuration(emp.average_duration)}</TableCell>
                    <TableCell>{formatDate(emp.last_login)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
