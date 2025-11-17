import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { leaveService, type Leave, type LeaveBalance } from "@/services/leaveService";
import { toast } from "sonner";

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeDepartment?: string;
  employeePosition?: string;
}

export function EmployeeDetailModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeEmail,
  employeeDepartment,
  employeePosition,
}: EmployeeDetailModalProps) {
  const [leaveHistory, setLeaveHistory] = useState<Leave[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && employeeId) {
      loadEmployeeData();
    }
  }, [isOpen, employeeId]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const [leaves, balances] = await Promise.all([
        leaveService.getUserLeaves(employeeId),
        leaveService.getUserLeaveBalances(employeeId)
      ]);
      setLeaveHistory(leaves.filter(l => l.status !== 'Pending'));
      setLeaveBalances(balances);
    } catch (error) {
      console.error('Failed to load employee data:', error);
      toast.error('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    if (status === "Approved") {
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

  const totalApprovedDays = leaveHistory
    .filter(l => l.status === 'Approved')
    .reduce((sum, l) => sum + l.days, 0);

  const totalRejectedDays = leaveHistory
    .filter(l => l.status === 'Rejected')
    .reduce((sum, l) => sum + l.days, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
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
                  {employeePosition && <Badge variant="secondary">{employeePosition}</Badge>}
                  {employeeDepartment && <Badge variant="outline">{employeeDepartment}</Badge>}
                </div>
              </div>
            </div>

            {/* Leave Balance Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {leaveBalances.map((balance) => (
                <Card key={balance.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {balance.leave_type}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total</span>
                        <span className="font-semibold">{balance.total_days} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Used</span>
                        <span className="text-destructive">{balance.used_days} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Remaining</span>
                        <span className="text-success font-semibold">{balance.remaining_days} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {leaveBalances.length === 0 && (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-sm text-muted-foreground">No leave balance data</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Statistics */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Total Leave Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leaveHistory.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Approved & Rejected
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Approved Days
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{totalApprovedDays}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total days approved
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Rejected Days
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{totalRejectedDays}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total days rejected
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Leave History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Leave History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaveHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No leave history</p>
                ) : (
                  <div className="space-y-4">
                    {leaveHistory.map((leave) => (
                      <div
                        key={leave.id}
                        className="flex items-start gap-4 rounded-lg border p-4"
                      >
                        <Calendar className="mt-1 h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{leave.leave_type}</p>
                            {getStatusBadge(leave.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(leave.start_date).toLocaleDateString()} -{" "}
                            {new Date(leave.end_date).toLocaleDateString()} ({leave.days} days)
                          </p>
                          <p className="text-sm">{leave.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
