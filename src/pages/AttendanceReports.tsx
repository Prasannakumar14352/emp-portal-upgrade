import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Filter, Loader2, Search } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface AttendanceReport {
  employee_id: string;
  employee_name: string;
  department: string;
  date: string;
  check_in_time: string;
  check_out_time: string;
  work_hours: number;
  status: 'present' | 'absent' | 'late' | 'half-day';
}

export default function AttendanceReports() {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<AttendanceReport[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    loadDepartments();
    // Set default date range (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadReports();
    }
  }, [startDate, endDate]);

  useEffect(() => {
    applyFilters();
  }, [reports, department, status, searchTerm]);

  const loadDepartments = async () => {
    try {
      const response = await apiClient.get<{ departments: string[] }>('/employees/departments');
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<AttendanceReport[]>(
        `/attendance/reports?startDate=${startDate}&endDate=${endDate}`
      );
      setReports(response);
    } catch (error: any) {
      console.error('Failed to load reports:', error);
      toast.error('Failed to load attendance reports');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    // Filter by department
    if (department !== 'all') {
      filtered = filtered.filter(r => r.department === department);
    }

    // Filter by status
    if (status !== 'all') {
      filtered = filtered.filter(r => r.status === status);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.employee_id.includes(searchTerm)
      );
    }

    setFilteredReports(filtered);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      present: "default",
      late: "secondary",
      absent: "destructive",
      "half-day": "outline",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {status === "half-day" ? "Half Day" : status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const exportToExcel = () => {
    const data = filteredReports.map(report => ({
      'Employee ID': report.employee_id,
      'Employee Name': report.employee_name,
      'Department': report.department,
      'Date': new Date(report.date).toLocaleDateString(),
      'Check In': report.check_in_time ? new Date(report.check_in_time).toLocaleTimeString() : '-',
      'Check Out': report.check_out_time ? new Date(report.check_out_time).toLocaleTimeString() : '-',
      'Work Hours': report.work_hours?.toFixed(2) || '-',
      'Status': report.status,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
    XLSX.writeFile(wb, `attendance-report-${startDate}-to-${endDate}.xlsx`);
    toast.success('Report exported successfully');
  };

  const calculateStats = () => {
    const total = filteredReports.length;
    const present = filteredReports.filter(r => r.status === 'present').length;
    const late = filteredReports.filter(r => r.status === 'late').length;
    const absent = filteredReports.filter(r => r.status === 'absent').length;
    const halfDay = filteredReports.filter(r => r.status === 'half-day').length;
    
    return { total, present, late, absent, halfDay };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Reports</h1>
          <p className="text-muted-foreground">View and analyze attendance data</p>
        </div>
        <Button onClick={exportToExcel} disabled={filteredReports.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.late}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.absent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Half Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.halfDay}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Search Employee</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name or ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attendance records found for the selected filters</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Work Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{report.employee_id}</TableCell>
                      <TableCell>{report.employee_name}</TableCell>
                      <TableCell>{report.department}</TableCell>
                      <TableCell>{new Date(report.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {report.check_in_time 
                          ? new Date(report.check_in_time).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {report.check_out_time 
                          ? new Date(report.check_out_time).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {report.work_hours ? `${report.work_hours.toFixed(2)}h` : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
