import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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
    };
  };
}

export default function HRAttendanceDashboard() {
  const { role } = useUserRole();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [department, setDepartment] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [attendanceData, setAttendanceData] = useState<EmployeeAttendance[]>([]);

  // Check HR access
  useEffect(() => {
    if (role !== 'hr' && role !== 'manager') {
      toast.error('Access denied. HR/Manager role required.');
      navigate('/');
    }
  }, [role, navigate]);

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

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="outline">-</Badge>;
    
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
      <Badge variant={variants[status as keyof typeof variants] || "outline"} className="w-8 justify-center">
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
            <div className="overflow-x-auto">
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
                              {getStatusBadge(attendance?.status)}
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
    </div>
  );
}
