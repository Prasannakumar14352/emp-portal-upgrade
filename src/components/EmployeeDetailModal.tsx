import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeaveHistory {
  id: number;
  type: string;
  from: string;
  to: string;
  days: number;
  status: "approved" | "rejected";
  reason: string;
}

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeEmail: string;
}

export function EmployeeDetailModal({
  isOpen,
  onClose,
  employeeName,
  employeeEmail,
}: EmployeeDetailModalProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Mock employee data
  const leaveHistory: LeaveHistory[] = [
    {
      id: 1,
      type: "Annual Leave",
      from: "2024-06-15",
      to: "2024-06-20",
      days: 5,
      status: "approved",
      reason: "Summer vacation",
    },
    {
      id: 2,
      type: "Sick Leave",
      from: "2024-08-10",
      to: "2024-08-11",
      days: 2,
      status: "approved",
      reason: "Medical appointment",
    },
    {
      id: 3,
      type: "Work From Home",
      from: "2024-09-05",
      to: "2024-09-05",
      days: 1,
      status: "approved",
      reason: "Home maintenance",
    },
    {
      id: 4,
      type: "Annual Leave",
      from: "2024-10-22",
      to: "2024-10-23",
      days: 2,
      status: "rejected",
      reason: "Personal travel",
    },
  ];

  const attendanceStats = {
    totalDays: 220,
    present: 205,
    absent: 5,
    leaves: 10,
    attendanceRate: 93,
  };

  const leaveBalance = {
    annual: 12,
    sick: 8,
    casual: 5,
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3 text-success" />
          Approved
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Rejected
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Info */}
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {getInitials(employeeName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{employeeName}</h3>
              <p className="text-sm text-muted-foreground">{employeeEmail}</p>
              <div className="mt-1 flex gap-2">
                <Badge variant="secondary">Software Engineer</Badge>
                <Badge variant="outline">IT Department</Badge>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Attendance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{attendanceStats.attendanceRate}%</p>
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {attendanceStats.present} / {attendanceStats.totalDays} days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Leaves Taken
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{attendanceStats.leaves}</p>
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {attendanceStats.absent} absent days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Leave Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">
                    {leaveHistory.filter((l) => l.status === "approved").length}/
                    {leaveHistory.length}
                  </p>
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((leaveHistory.filter((l) => l.status === "approved").length / leaveHistory.length) * 100)}% approval rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Leave Balance */}
          <Card>
            <CardHeader>
              <CardTitle>Leave Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">Annual Leave</p>
                  <p className="text-2xl font-bold">{leaveBalance.annual} days</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">Sick Leave</p>
                  <p className="text-2xl font-bold">{leaveBalance.sick} days</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">Casual Leave</p>
                  <p className="text-2xl font-bold">{leaveBalance.casual} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leave History */}
          <Card>
            <CardHeader>
              <CardTitle>Leave History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaveHistory.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{leave.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(leave.from).toLocaleDateString()} - {new Date(leave.to).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(leave.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        <span className="font-medium">Reason:</span> {leave.reason}
                      </span>
                      <span className="font-medium">{leave.days} day{leave.days > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-success"></div>
                    <span className="text-sm">Present</span>
                  </div>
                  <span className="font-semibold">{attendanceStats.present} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-warning"></div>
                    <span className="text-sm">Leave</span>
                  </div>
                  <span className="font-semibold">{attendanceStats.leaves} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-destructive"></div>
                    <span className="text-sm">Absent</span>
                  </div>
                  <span className="font-semibold">{attendanceStats.absent} days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
