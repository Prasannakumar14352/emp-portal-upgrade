import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Download, Filter, Loader2, Search, FileText, Pencil, Plus } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from "@/integrations/supabase/client";

interface AttendanceReport {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  date: string;
  check_in_time: string;
  check_out_time: string;
  work_hours: number;
  status: 'present' | 'absent' | 'late' | 'half-day';
  notes?: string;
}

export default function AttendanceReports() {
  const { role } = useUserRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<AttendanceReport[]>([]);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceReport | null>(null);
  const [editForm, setEditForm] = useState({
    checkInTime: '',
    checkOutTime: '',
    status: 'present',
    notes: ''
  });

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<Array<{ employee_id: number; full_name: string }>>([]);
  const [createForm, setCreateForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkInTime: '',
    checkOutTime: '',
    status: 'present',
    notes: ''
  });
  const [userEmployeeId, setUserEmployeeId] = useState<number | null>(null);

  // Role access check - show message instead of redirecting
  if (role && role !== 'hr' && role !== 'manager') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    loadDepartments();
    loadEmployees();
    loadUserEmployeeId();
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

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('employee_id, full_name')
        .order('full_name');
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const loadUserEmployeeId = async () => {
    try {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('employee_id')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setUserEmployeeId(data?.employee_id || null);
    } catch (error) {
      console.error('Failed to load user employee ID:', error);
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

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.text('Attendance Report', 14, 15);

      // Add date range
      doc.setFontSize(10);
      doc.text(`Period: ${startDate} to ${endDate}`, 14, 22);

      // Add stats
      const stats = calculateStats();
      doc.text(`Total Records: ${stats.total} | Present: ${stats.present} | Late: ${stats.late} | Absent: ${stats.absent}`, 14, 28);

      // Prepare table data
      const tableData = filteredReports.map(r => [
        r.employee_id,
        r.employee_name,
        r.department,
        new Date(r.date).toLocaleDateString(),
        r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '-',
        r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '-',
        r.work_hours?.toFixed(2) || '-',
        r.status
      ]);

      // Add table
      autoTable(doc, {
        head: [['ID', 'Name', 'Department', 'Date', 'Check In', 'Check Out', 'Hours', 'Status']],
        body: tableData,
        startY: 32,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      });

      // Save PDF
      doc.save(`attendance-report-${startDate}-to-${endDate}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export PDF');
    }
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

  const handleEditClick = (record: AttendanceReport) => {
    setEditingRecord(record);
    setEditForm({
      checkInTime: record.check_in_time ? new Date(record.check_in_time).toLocaleString('sv-SE').slice(0, 16).replace(' ', 'T') : '',
      checkOutTime: record.check_out_time ? new Date(record.check_out_time).toLocaleString('sv-SE').slice(0, 16).replace(' ', 'T') : '',
      status: record.status,
      notes: record.notes || ''
    });
    setEditDialogOpen(true);
  };

  function toDateTimeLocal(dateString?: string) {
    if (!dateString) return '';
    const d = new Date(dateString);
    const pad = (n: number) => String(n).padStart(2, "0");

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const handleUpdateAttendance = async () => {
    if (!editingRecord || !userEmployeeId) return;

    try {
      setLoading(true);
      const checkintime = editForm.checkInTime ? new Date(editForm.checkInTime).toISOString() : null;
      const checkouttime = editForm.checkOutTime ? new Date(editForm.checkOutTime).toISOString() : null;
      
      await apiClient.put(`/attendance/${editingRecord.id}`, {
        checkInTime: checkintime,
        checkOutTime: checkouttime,
        status: editForm.status,
        notes: editForm.notes,
        userId: userEmployeeId
      });

      toast.success('Attendance updated successfully');
      setEditDialogOpen(false);
      loadReports();
    } catch (error: any) {
      console.error('Failed to update attendance:', error);
      toast.error(error.message || 'Failed to update attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAttendance = async () => {
    if (!createForm.employeeId || !createForm.date) {
      toast.error('Please select an employee and date');
      return;
    }

    try {
      setLoading(true);
      const checkintime = createForm.checkInTime ? new Date(createForm.checkInTime).toISOString() : null;
      const checkouttime = createForm.checkOutTime ? new Date(createForm.checkOutTime).toISOString() : null;

      await apiClient.post('/attendance', {
        userId: parseInt(createForm.employeeId),
        date: createForm.date,
        checkInTime: checkintime,
        checkOutTime: checkouttime,
        status: createForm.status,
        notes: createForm.notes
      });

      toast.success('Attendance record created successfully');
      setCreateDialogOpen(false);
      setCreateForm({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        checkInTime: '',
        checkOutTime: '',
        status: 'present',
        notes: ''
      });
      loadReports();
    } catch (error: any) {
      console.error('Failed to create attendance:', error);
      toast.error(error.message || 'Failed to create attendance');
    } finally {
      setLoading(false);
    }
  };

  const stats = calculateStats();


  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Reports</h1>
          <p className="text-muted-foreground">View and analyze attendance data</p>
        </div>
        <div className="flex gap-2">
          {role === 'hr' && (
            <Button onClick={() => setCreateDialogOpen(true)} variant="default">
              <Plus className="h-4 w-4 mr-2" />
              Create Attendance
            </Button>
          )}
          <Button onClick={exportToPDF} variant="outline" disabled={filteredReports.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            Export to PDF
          </Button>
          <Button onClick={exportToExcel} disabled={filteredReports.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>
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
                    {role === 'hr' && <TableHead>Actions</TableHead>}
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
                          ? new Date(report.check_in_time).toLocaleTimeString('en-US', { hour12: true })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {report.check_out_time
                          ? new Date(report.check_out_time).toLocaleTimeString('en-US', { hour12: true })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {report.work_hours ? `${report.work_hours.toFixed(2)}h` : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      {role === 'hr' && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(report)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Input value={editingRecord?.employee_name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                value={editingRecord?.date ? new Date(editingRecord.date).toLocaleDateString() : ''}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Check In Time</Label>
              <Input
                type="datetime-local"
                value={editForm.checkInTime}
                onChange={(e) => setEditForm({ ...editForm, checkInTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Check Out Time</Label>
              <Input
                type="datetime-local"
                value={editForm.checkOutTime}
                onChange={(e) => setEditForm({ ...editForm, checkOutTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Add any notes about this attendance record..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAttendance} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Attendance Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={createForm.employeeId} onValueChange={(value) => setCreateForm({ ...createForm, employeeId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.employee_id} value={emp.employee_id.toString()}>
                      {emp.full_name} (ID: {emp.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={createForm.date}
                onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Check In Time</Label>
              <Input
                type="datetime-local"
                value={createForm.checkInTime}
                onChange={(e) => setCreateForm({ ...createForm, checkInTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Check Out Time</Label>
              <Input
                type="datetime-local"
                value={createForm.checkOutTime}
                onChange={(e) => setCreateForm({ ...createForm, checkOutTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={createForm.status} onValueChange={(value) => setCreateForm({ ...createForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Add any notes about this attendance record..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAttendance} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
