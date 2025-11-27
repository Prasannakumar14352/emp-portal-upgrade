import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, ChevronLeft, ChevronRight, Loader2, Edit, FileText, CalendarDays } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";

interface EmployeeAttendance {
  employee_id: string;
  full_name: string;
  department: string;
  attendance: {
    [date: string]: {
      status: 'present' | 'absent' | 'late' | 'half-day';
      check_in_time?: string;
      check_out_time?: string;
      work_hours?: number;
      id?: string;
    };
  };
}

interface EditDialogData {
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  status: string;
  notes: string;
  recordId?: string;
  originalCheckInTime?: string;
  originalCheckOutTime?: string;
}

export default function HRAttendanceDashboard() {
  const { role } = useUserRole();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [department, setDepartment] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [attendanceData, setAttendanceData] = useState<EmployeeAttendance[]>([]);
  const [editDialog, setEditDialog] = useState(false);
  const [editData, setEditData] = useState<EditDialogData | null>(null);
  const [saving, setSaving] = useState(false);

  // Role access check - show message instead of redirecting
  if (role && role !== 'hr' && role !== 'manager') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadAttendanceData();
  }, [currentDate, department]);

  const loadDepartments = async () => {
    try {
      const response = await apiClient.get<{ departments: string[] }>('/employees/departments');
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const response = await apiClient.get<EmployeeAttendance[]>(
        `/attendance/calendar?year=${year}&month=${month}${department !== 'all' ? `&department=${department}` : ''}`
      );
      setAttendanceData(response);
    } catch (error: any) {
      console.error('Failed to load attendance:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const getDateString = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, day).toISOString().split('T')[0];
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleEditClick = (employee: EmployeeAttendance, date: number) => {
    const dateStr = getDateString(date);
    const attendanceRecord = employee.attendance[dateStr];

    setEditData({
      employeeId: employee.employee_id,
      employeeName: employee.full_name,
      date: dateStr,
      checkInTime: attendanceRecord?.check_in_time ? new Date(attendanceRecord.check_in_time).toTimeString().slice(0, 5) : '',
      checkOutTime: attendanceRecord?.check_out_time ? new Date(attendanceRecord.check_out_time).toTimeString().slice(0, 5) : '',
      status: attendanceRecord?.status || 'absent',
      notes: '',
      recordId: attendanceRecord?.id,
      originalCheckInTime: attendanceRecord?.check_in_time || '',
      originalCheckOutTime: attendanceRecord?.check_out_time || ''
    });
    setEditDialog(true);
  };

  const handleSaveAttendance = async () => {
    if (!editData) return;

    try {
      setSaving(true);

      // Extract original time components
      const originalCheckInTimeStr = editData.originalCheckInTime
        ? new Date(editData.originalCheckInTime).toTimeString().slice(0, 5)
        : '';
      const originalCheckOutTimeStr = editData.originalCheckOutTime
        ? new Date(editData.originalCheckOutTime).toTimeString().slice(0, 5)
        : '';

      // Get the final check-in and check-out times (either edited or original)
      const finalCheckInTime = editData.checkInTime || originalCheckInTimeStr;
      const finalCheckOutTime = editData.checkOutTime || originalCheckOutTimeStr;

      // Validate 9-hour work requirement for present status
      if (editData.status === 'present' && finalCheckInTime && finalCheckOutTime) {
        const [checkInHours, checkInMinutes] = finalCheckInTime.split(':').map(Number);
        const [checkOutHours, checkOutMinutes] = finalCheckOutTime.split(':').map(Number);

        const checkInDate = new Date();
        checkInDate.setHours(checkInHours, checkInMinutes, 0, 0);

        const checkOutDate = new Date();
        checkOutDate.setHours(checkOutHours, checkOutMinutes, 0, 0);

        const diffInMs = checkOutDate.getTime() - checkInDate.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        if (diffInHours < 9) {
          toast.error(`Work hours must be at least 9 hours for present status. Current: ${diffInHours.toFixed(2)} hours`);
          setSaving(false);
          return;
        }
      }

      // Only format times that were actually changed
      const checkInTime = editData.checkInTime && editData.checkInTime !== originalCheckInTimeStr
        ? `${editData.date}T${editData.checkInTime}:00`
        : editData.originalCheckInTime || null;

      const checkOutTime = editData.checkOutTime && editData.checkOutTime !== originalCheckOutTimeStr
        ? `${editData.date}T${editData.checkOutTime}:00`
        : editData.originalCheckOutTime || null;

      if (editData.recordId) {
        // Update existing record - only send changed fields
        const updateData: any = {
          userId: editData.employeeId,
          status: editData.status,
          notes: editData.notes
        };

        // Only include times if they were changed
        if (editData.checkInTime !== originalCheckInTimeStr) {
          updateData.checkInTime = checkInTime;
        }
        if (editData.checkOutTime !== originalCheckOutTimeStr) {
          updateData.checkOutTime = checkOutTime;
        }

        await apiClient.put(`/attendance/${editData.recordId}`, updateData);
      } else {
        // Create new record
        await apiClient.post('/attendance', {
          userId: editData.employeeId,
          date: editData.date,
          checkInTime: editData.checkInTime ? `${editData.date}T${editData.checkInTime}:00` : null,
          checkOutTime: editData.checkOutTime ? `${editData.date}T${editData.checkOutTime}:00` : null,
          status: editData.status,
          notes: editData.notes
        });
      }

      toast.success('Attendance updated successfully');
      setEditDialog(false);
      setEditData(null);
      loadAttendanceData();
    } catch (error: any) {
      console.error('Failed to save attendance:', error);
      toast.error(error.response?.data?.error || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status?: string, onClick?: () => void) => {
    if (!status) {
      return (
        <Badge
          variant="outline"
          className="w-8 justify-center cursor-pointer hover:bg-accent"
          onClick={onClick}
        >
          -
        </Badge>
      );
    }

    const variants = {
      present: "default",
      late: "secondary",
      absent: "destructive",
      "half-day": "outline",
    } as const;

    const labels = {
      present: "P",
      late: "L",
      absent: "A",
      "half-day": "H",
    } as const;

    return (
      <Badge
        variant={variants[status as keyof typeof variants] || "outline"}
        className="w-8 justify-center cursor-pointer hover:opacity-80"
        onClick={onClick}
      >
        {labels[status as keyof typeof labels] || "-"}
      </Badge>
    );
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Attendance Dashboard</h1>
          <p className="text-muted-foreground">Calendar view of employee attendance</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/attendance-reports')}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Reports
          </Button>
          {/* <Button
            variant="outline"
            onClick={() => navigate('/leave-calendar')}
            className="flex items-center gap-2"
          >
            <CalendarDays className="h-4 w-4" />
            Leave Calendar
          </Button> */}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {monthYear}
            </CardTitle>
            <div className="flex items-center gap-4">
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-auto border rounded-md">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="sticky left-0 bg-background border-r px-4 py-2 text-left font-semibold">
                      Employee
                    </th>
                    <th className="sticky left-40 bg-background border-r px-4 py-2 text-left font-semibold">
                      Department
                    </th>
                    {days.map((day) => (
                      <th key={day} className="px-2 py-2 text-center text-sm font-medium min-w-[50px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.length === 0 ? (
                    <tr>
                      <td colSpan={days.length + 2} className="py-8 text-center text-muted-foreground">
                        No attendance data found
                      </td>
                    </tr>
                  ) : (
                    attendanceData.map((employee) => (
                      <tr key={employee.employee_id} className="border-b hover:bg-muted/50">
                        <td className="sticky left-0 bg-background border-r px-4 py-3 font-medium">
                          {employee.full_name}
                        </td>
                        <td className="sticky left-40 bg-background border-r px-4 py-3 text-sm text-muted-foreground">
                          {employee.department}
                        </td>
                        {days.map((day) => {
                          const dateStr = getDateString(day);
                          const attendance = employee.attendance[dateStr];
                          return (
                            <td key={day} className="px-2 py-3 text-center">
                              {getStatusBadge(attendance?.status, () => handleEditClick(employee, day))}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Badge variant="default">P</Badge>
              <span className="text-sm">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">L</Badge>
              <span className="text-sm">Late</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">A</Badge>
              <span className="text-sm">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">H</Badge>
              <span className="text-sm">Half Day</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">-</Badge>
              <span className="text-sm">No Data</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Attendance Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Attendance</DialogTitle>
          </DialogHeader>

          {editData && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Input value={editData.employeeName} disabled />
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input value={editData.date} disabled />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkIn">Check In Time</Label>
                  <Input
                    id="checkIn"
                    type="time"
                    value={editData.checkInTime}
                    onChange={(e) => setEditData({ ...editData, checkInTime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkOut">Check Out Time</Label>
                  <Input
                    id="checkOut"
                    type="time"
                    value={editData.checkOutTime}
                    onChange={(e) => setEditData({ ...editData, checkOutTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editData.status}
                  onValueChange={(value) => setEditData({ ...editData, status: value })}
                >
                  <SelectTrigger id="status">
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
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="Add any notes about this attendance record..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveAttendance} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
