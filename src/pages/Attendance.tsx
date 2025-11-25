import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Loader2, LogIn, LogOut, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { userService } from "@/services/userService";

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  work_hours?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface AttendanceStats {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

export default function Attendance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    totalDays: 0,
    present: 0,
    absent: 0,
    late: 0,
    attendanceRate: 0
  });
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false);
  const [calculatedHours, setCalculatedHours] = useState<number>(0);

  useEffect(() => {
    if (user) {
      loadAttendanceData();
      loadUserRole();
    }
  }, [user]);

  const loadUserRole = async () => {
    if (!user) return;
    try {
      const role = await userService.getUserRole(user.id);
      setUserRole(role);
    } catch (error) {
      console.error('Failed to load user role:', error);
    }
  };

  const loadAttendanceData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const [today, stats, records] = await Promise.all([
        apiClient.get<AttendanceRecord>(`/attendance/today?userId=${user.id}`),
        apiClient.get<AttendanceStats>(`/attendance/stats?userId=${user.id}&month=${currentMonth}&year=${currentYear}`),
        apiClient.get<AttendanceRecord[]>(`/attendance?userId=${user.id}&month=${currentMonth}&year=${currentYear}`),
      ]);

      setTodayRecord(today);
      setAttendanceStats(stats);
      setRecentAttendance(records.slice(0, 5));
    } catch (error) {
      console.error('Failed to load attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;
    
    try {
      setActionLoading(true);
      await apiClient.post(`/attendance/checkin`, { userId: user.id });
      toast.success('Checked in successfully!');
      await loadAttendanceData();
    } catch (error: any) {
      console.error('Check-in failed:', error);
      toast.error(error.message || 'Failed to check in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user || !todayRecord?.check_in_time) return;
    
    // Calculate work hours
    const checkInTime = new Date(todayRecord.check_in_time);
    const currentTime = new Date();
    const hoursDiff = (currentTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    setCalculatedHours(hoursDiff);
    
    // Show confirmation dialog
    setCheckoutConfirmOpen(true);
  };

  const confirmCheckOut = async () => {
    if (!user) return;
    
    try {
      setActionLoading(true);
      setCheckoutConfirmOpen(false);
      await apiClient.post(`/attendance/checkout`, { userId: user.id });
      toast.success('Checked out successfully!');
      await loadAttendanceData();
    } catch (error: any) {
      console.error('Check-out failed:', error);
      toast.error(error.message || 'Failed to check out');
    } finally {
      setActionLoading(false);
    }
  };

  const cancelCheckOut = () => {
    setCheckoutConfirmOpen(false);
    if (todayRecord) {
      handleEditClick(todayRecord);
    }
  };

  const canEditRecord = (record: AttendanceRecord) => {
    if (userRole === 'hr') return true;
    
    const recordDate = new Date(record.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    recordDate.setHours(0, 0, 0, 0);
    
    const daysDifference = Math.floor((today.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysDifference === 1;
  };

  const handleEditClick = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setEditCheckIn(record.check_in_time ? new Date(record.check_in_time).toISOString().slice(0, 16) : "");
    setEditCheckOut(record.check_out_time ? new Date(record.check_out_time).toISOString().slice(0, 16) : "");
    setEditNotes(record.notes || "");
    setEditDialogOpen(true);
  };

  const handleUpdateAttendance = async () => {
    if (!user || !selectedRecord) return;
    
    try {
      setActionLoading(true);
      await apiClient.put(`/attendance/${selectedRecord.id}`, {
        userId: user.id,
        checkInTime: editCheckIn || null,
        checkOutTime: editCheckOut || null,
        notes: editNotes,
        date: selectedRecord.date
      });
      toast.success('Attendance updated successfully!');
      setEditDialogOpen(false);
      await loadAttendanceData();
    } catch (error: any) {
      console.error('Update failed:', error);
      toast.error(error.message || 'Failed to update attendance');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "late":
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case "absent":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      present: "default",
      late: "secondary",
      absent: "destructive",
      "half-day": "outline",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"} className="gap-1">
        {getStatusIcon(status)}
        {status === "half-day" ? "Half Day" : status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canCheckIn = !todayRecord?.check_in_time;
  const canCheckOut = todayRecord?.check_in_time && !todayRecord?.check_out_time;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track your attendance and work hours</p>
        </div>
        <div className="flex gap-2">
          {canCheckIn && (
            <Button onClick={handleCheckIn} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              Check In
            </Button>
          )}
          {canCheckOut && (
            <Button onClick={handleCheckOut} disabled={actionLoading} variant="outline">
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              Check Out
            </Button>
          )}
          {todayRecord?.check_in_time && todayRecord?.check_out_time && (
            <Button disabled variant="secondary">
              <CheckCircle className="h-4 w-4 mr-2" />
              Completed Today
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.totalDays}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{attendanceStats.present}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{attendanceStats.absent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Late</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{attendanceStats.late}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.attendanceRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
          <CardDescription>Your attendance records for this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAttendance.map((record, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <Calendar className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {new Date(record.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      In: {record.check_in_time ? formatTime(record.check_in_time) : '-'} | 
                      Out: {record.check_out_time ? formatTime(record.check_out_time) : '-'}
                      {record.work_hours && ` (${record.work_hours.toFixed(1)}h)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(record.status)}
                  {canEditRecord(record) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(record)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="text"
                value={selectedRecord ? new Date(selectedRecord.date).toLocaleDateString() : ""}
                disabled
              />
            </div>
            <div>
              <Label htmlFor="edit-checkin">Check In Time</Label>
              <Input
                id="edit-checkin"
                type="datetime-local"
                value={editCheckIn}
                onChange={(e) => setEditCheckIn(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-checkout">Check Out Time</Label>
              <Input
                id="edit-checkout"
                type="datetime-local"
                value={editCheckOut}
                onChange={(e) => setEditCheckOut(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes about this attendance record..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAttendance} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutConfirmOpen} onOpenChange={setCheckoutConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Check Out</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-lg">
              <Clock className="h-8 w-8 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Total Work Hours</p>
                <p className="text-2xl font-bold">{calculatedHours.toFixed(2)} hours</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Do you want to check out now? Click Cancel if you need to edit your check-in time.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelCheckOut}>
              Cancel & Edit
            </Button>
            <Button onClick={confirmCheckOut} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Out...
                </>
              ) : (
                "Confirm Check Out"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
