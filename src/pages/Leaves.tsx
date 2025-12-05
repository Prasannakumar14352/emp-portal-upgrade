import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, CheckCircle, XCircle, Clock, Trash2, Eye, Edit, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSignalR } from "@/hooks/useSignalR";
import { useGlobalLoading } from "@/hooks/useGlobalLoading";
import { leaveService, type Leave, type LeaveBalance, type LeaveConflict } from "@/services/leaveService";
import { leaveTypeService, type LeaveType } from "@/services/leaveTypeService";
import { managerService, type Manager } from "@/services/managerService";
import { employeeService, type Employee } from "@/services/employeeService";
import { LeaveBalanceCard } from "@/components/LeaveBalanceCard";
import { LeaveHistoryTimeline } from "@/components/LeaveHistoryTimeline";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "@/components/MultiSelect";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | null | undefined;

export default function Leaves() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  useSignalR(); // Enable real-time notifications
  const { startLoading, stopLoading } = useGlobalLoading();
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<Leave[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [leaveToEdit, setLeaveToEdit] = useState<Leave | null>(null);
  const [conflicts, setConflicts] = useState<LeaveConflict[]>([]);
  const [selectedCCEmails, setSelectedCCEmails] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    leave_type: '',
    manager_id: '',
    start_date: '',
    end_date: '',
    days: 0,
    reason: ''
  });
  const [editFormData, setEditFormData] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    days: 0,
    reason: '',
    manager_id: undefined as number | undefined
  });
  const [errors, setErrors] = useState<any>({});
  const [editErrors, setEditErrors] = useState<any>({});
  const PAGE_SIZE = 5; // or whatever you like

  const [pageAll, setPageAll] = useState(1);
  const [pageApproved, setPageApproved] = useState(1);
  const [pagePending, setPagePending] = useState(1);
  const [pageRejected, setPageRejected] = useState(1);

  useEffect(() => {
    setPageAll(1);
    setPageApproved(1);
    setPagePending(1);
    setPageRejected(1);
  }, [leaveHistory]);

  useEffect(() => {
    if (user) {
      loadLeaveData();
    }
  }, [user]);

  // Listen for real-time leave status updates and reload data
  useEffect(() => {
    const handleLeaveUpdate = () => {
      if (user) {
        loadLeaveData();
      }
    };

    // Listen to custom event dispatched by SignalR
    window.addEventListener('leaveStatusUpdated', handleLeaveUpdate);

    return () => {
      window.removeEventListener('leaveStatusUpdated', handleLeaveUpdate);
    };
  }, [user]);

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      calculateDays(formData.start_date, formData.end_date);
      checkForConflicts(formData.start_date, formData.end_date);
    }
  }, [formData.start_date, formData.end_date]);

  useEffect(() => {
    if (editFormData.start_date && editFormData.end_date) {
      calculateEditDays(editFormData.start_date, editFormData.end_date);
    }
  }, [editFormData.start_date, editFormData.end_date]);

  const loadLeaveData = async () => {
    try {
      setLoading(true);
      const [balances, history, types, managersList, employeesList] = await Promise.all([
        leaveService.getUserLeaveBalances(user!.id),
        leaveService.getUserLeaves(user!.id),
        leaveTypeService.getActiveLeaveTypes(),
        managerService.getAllManagers(),
        employeeService.getAllEmployees(),
      ]);

      // Merge leave types with existing balances to show all leave types
      const effectiveBalances = types.map(type => {
        const existingBalance = balances.find(b => b.leave_type === type.name);
        return existingBalance || {
          id: String(type.id),
          employee_id: user!.id,
          year: new Date().getFullYear(),
          leave_type: type.name,
          total_days: type.default_days,
          used_days: 0,
          remaining_days: type.default_days,
          carry_forward_days: 0
        };
      });

      setLeaveBalance(effectiveBalances);
      setLeaveHistory(history);
      setLeaveTypes(types);
      setManagers(managersList);
      setEmployees(employeesList);
    } catch (error) {
      console.error('Failed to load leave data:', error);
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (startDate: string, endDate: string) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setFormData(prev => ({ ...prev, days: diffDays }));
    }
  };

  const calculateEditDays = (startDate: string, endDate: string) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setEditFormData(prev => ({ ...prev, days: diffDays }));
    }
  };

  const checkForConflicts = async (startDate: string, endDate: string) => {
    try {
      const conflictData = await leaveService.checkConflicts(startDate, endDate, user!.id);
      setConflicts(conflictData);
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    try {
      startLoading("Submitting leave request...");
      await leaveService.createLeave({
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days: formData.days,
        reason: formData.reason,
        manager_id: formData.manager_id ? parseInt(formData.manager_id) : undefined,
        cc_emails: selectedCCEmails,
      });

      toast.success("Leave request submitted successfully! Notifications sent.");
      setOpen(false);
      setFormData({
        leave_type: '',
        manager_id: '',
        start_date: '',
        end_date: '',
        days: 0,
        reason: ''
      });
      setSelectedCCEmails([]);
      setConflicts([]);
      loadLeaveData();
    } catch (error) {
      console.error("Failed to submit leave request", error);
      toast.error("Failed to submit leave request");
    } finally {
      stopLoading();
    }
  };

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.leave_type) newErrors.leave_type = "Leave type is required.";
    if (!formData.manager_id) newErrors.manager_id = "Manager is required.";
    if (!formData.start_date) newErrors.start_date = "Start date is required.";
    if (!formData.end_date) newErrors.end_date = "End date is required.";

    if (!formData.reason.trim()) newErrors.reason = "Reason is required.";

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        newErrors.end_date = "End date cannot be before start date.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEditForm = () => {
    const newErrors: any = {};

    if (!editFormData.leave_type) newErrors.leave_type = "Leave type is required.";
    if (!editFormData.start_date) newErrors.start_date = "Start date is required.";
    if (!editFormData.end_date) newErrors.end_date = "End date is required.";
    if (!editFormData.reason.trim()) newErrors.reason = "Reason is required.";
    if (!editFormData.manager_id) newErrors.manager_id = "Manager is required.";

    if (editFormData.start_date && editFormData.end_date) {
      if (new Date(editFormData.end_date) < new Date(editFormData.start_date)) {
        newErrors.end_date = "End date cannot be before start date.";
      }
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };



  const getStatusColor = (status: string): BadgeVariant => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleCancelLeave = async () => {
    if (!selectedLeaveId) return;

    try {
      startLoading("Cancelling leave request...");
      await leaveService.cancelLeave(selectedLeaveId);
      toast.success("Leave request cancelled successfully");
      setCancelDialogOpen(false);
      setSelectedLeaveId(null);
      loadLeaveData();
    } catch (error) {
      toast.error("Failed to cancel leave request");
    } finally {
      stopLoading();
    }
  };

  const handleViewDetails = (leave: Leave) => {
    setSelectedLeave(leave);
    setDetailsDialogOpen(true);
  };

  const handleEditClick = (leave: Leave) => {
    setLeaveToEdit(leave);
    setEditFormData({
      leave_type: leave.leave_type,
      start_date: leave.start_date,
      end_date: leave.end_date,
      days: leave.days,
      reason: leave.reason,
      manager_id: leave.manager_id ? parseInt(leave.manager_id) : undefined
    });
    setEditDialogOpen(true);
  };

  const handleEditLeave = async () => {
    if (!leaveToEdit) return;
    if (!validateEditForm()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    try {
      startLoading("Updating leave request...");
      await leaveService.updateLeave(leaveToEdit.id, editFormData);
      toast.success('Leave request updated successfully. Manager and HR will be notified.');
      loadLeaveData();
      setEditDialogOpen(false);
      setLeaveToEdit(null);
    } catch (error) {
      console.error('Failed to update leave:', error);
      toast.error('Failed to update leave request');
    } finally {
      stopLoading();
    }
  };

  const toggleCCEmail = (email: string) => {
    setSelectedCCEmails(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  if (loading) {
    return <div className="space-y-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">Manage your leave requests and balance</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Apply for Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
                <DialogDescription>
                  Submit your leave request for approval
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="leave-type">Leave Type</Label>
                  <Select
                    value={formData.leave_type}
                    onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                    required
                  >
                    <SelectTrigger id="leave-type">
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.name}>
                          {type.name} ({type.default_days} days)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.leave_type && (
                    <p className="text-red-500 text-xs mt-1">{errors.leave_type}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manager">Select Manager *</Label>
                  <Select
                    value={formData.manager_id}
                    onValueChange={(value) => setFormData({ ...formData, manager_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map(manager => (
                        <SelectItem
                          key={manager.id}
                          value={manager.employee_id.toString()}   // <-- fixed
                        >
                          {manager.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.manager_id && (
                    <p className="text-red-500 text-xs mt-1">{errors.manager_id}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="from-date">From Date</Label>
                    <Input
                      id="from-date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />

                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="to-date">To Date</Label>
                    <Input
                      id="to-date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />

                  </div>
                  {errors.start_date && (
                    <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>
                  )}
                  {errors.end_date && (
                    <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="days">Number of Days</Label>
                  <Input
                    id="days"
                    type="number"
                    value={formData.days}
                    readOnly
                    className="bg-muted"
                  />
                  {/* <p className="text-sm text-muted-foreground gradient">Auto-calculated</p> */}
                </div>

                {conflicts.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Leave Conflicts Detected:</strong>
                      <div className="mt-2 space-y-1 text-sm">
                        {conflicts.map((conflict) => (
                          <div key={conflict.id}>
                            • {conflict.full_name} ({conflict.department}) - {conflict.leave_type}
                            ({new Date(conflict.start_date).toLocaleDateString()} to {new Date(conflict.end_date).toLocaleDateString()})
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-2">
                  <Label>CC Employees (Optional)</Label>
                  {/* <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                    {employees
                      .filter(emp => emp.id !== user?.id)
                      .map((employee) => (
                        <div key={employee.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cc-${employee.id}`}
                            checked={selectedCCEmails.includes(employee.email)}
                            onCheckedChange={() => toggleCCEmail(employee.email)}
                          />
                          <label
                            htmlFor={`cc-${employee.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {employee.full_name} - {employee.email}
                          </label>
                        </div>
                      ))}
                  </div> */}
                  <MultiSelect
                    items={employees
                      .filter((emp) => emp.employee_id !== user?.id)
                      .map((emp) => ({
                        label: `${emp.full_name} (${emp.email})`,
                        value: emp.email,
                      }))
                    }
                    values={selectedCCEmails}
                    onChange={setSelectedCCEmails}
                    placeholder="Select employees to CC"
                  />

                  {selectedCCEmails.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedCCEmails.length} employee(s) selected
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Please provide a reason for your leave"
                    rows={3}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    required
                  />
                  {errors.reason && (
                    <p className="text-red-500 text-xs mt-1">{errors.reason}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Submit Request</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <LeaveBalanceCard
        balances={leaveBalance.map(b => ({
          leaveType: b.leave_type,
          totalDays: b.total_days,
          usedDays: b.used_days,
          remainingDays: b.remaining_days,
          carryForward: b.carry_forward_days || 0
        }))}
        year={new Date().getFullYear()}
      />

      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            {/* <TabsContent value="all" className="space-y-4 mt-4">
              {leaveHistory.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{leave.leave_type}</p>
                        <Badge variant={getStatusColor(leave.status.toLowerCase())} className="gap-1">
                          {getStatusIcon(leave.status.toLowerCase())}
                          {leave.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()} • {leave.days} day{leave.days > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">Reason: {leave.reason}</p>
                      <div className="flex flex-col gap-1 mt-2">
                        <p className="text-xs text-muted-foreground">
                          Manager: {(() => {
                            if (leave.manager_id) {
                              const manager = employees.find(e => e.employee_id === String(leave.manager_id));
                              return manager ? manager.full_name : 'N/A';
                            }
                            return 'Not Assigned';
                          })()} - {leave.manager_status} {leave.manager_approved_at && `on ${new Date(leave.manager_approved_at).toLocaleDateString()}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          HR: {(() => {
                            if (leave.hr_approved_by) {
                              const hrPerson = employees.find(e => e.employee_id === leave.hr_approved_by);
                              return hrPerson ? hrPerson.full_name : 'N/A';
                            }
                            return 'Not Yet Reviewed';
                          })()} - {leave.hr_status} {leave.hr_approved_at && `on ${new Date(leave.hr_approved_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(leave)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    {leave.status === "Pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(leave)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedLeaveId(leave.id);
                            setCancelDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {leaveHistory.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No leave requests found</p>
              )}
            </TabsContent>
            <TabsContent value="approved" className="space-y-4 mt-4">
              {leaveHistory.filter(l => l.status === "Approved").map((leave) => (
                <div key={leave.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{leave.leave_type}</p>
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-4 w-4" />
                          {leave.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()} • {leave.days} day{leave.days > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(leave)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                </div>
              ))}
              {leaveHistory.filter(l => l.status === "Approved").length === 0 && (
                <p className="text-center text-muted-foreground py-8">No approved leave requests found</p>
              )}
            </TabsContent>
            <TabsContent value="pending" className="space-y-4 mt-4">
              {leaveHistory.filter(l => l.status === "Pending").map((leave) => (
                <div key={leave.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{leave.leave_type}</p>
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-4 w-4" />
                          {leave.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()} • {leave.days} day{leave.days > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(leave)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(leave)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedLeaveId(leave.id);
                        setCancelDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
              {leaveHistory.filter(l => l.status === "Pending").length === 0 && (
                <p className="text-center text-muted-foreground py-8">No pending leave requests found</p>
              )}
            </TabsContent>
            <TabsContent value="rejected" className="space-y-4 mt-4">
              {leaveHistory.filter(l => l.status === "Rejected").map((leave) => (
                <div key={leave.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{leave.leave_type}</p>
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-4 w-4" />
                          {leave.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()} • {leave.days} day{leave.days > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(leave)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                </div>
              ))}
              {leaveHistory.filter(l => l.status === "Rejected").length === 0 && (
                <p className="text-center text-muted-foreground py-8">No rejected leave requests found</p>
              )}
            </TabsContent> */}
            <TabsContent value="all" className="space-y-4 mt-4">
              {(() => {
                const allLeaves = leaveHistory;
                const totalPages = Math.ceil(allLeaves.length / PAGE_SIZE) || 1;
                const startIndex = (pageAll - 1) * PAGE_SIZE;
                const currentLeaves = allLeaves.slice(startIndex, startIndex + PAGE_SIZE);

                return (
                  <>
                    {currentLeaves.map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{leave.leave_type}</p>
                              <Badge variant={getStatusColor(leave.status.toLowerCase())} className="gap-1">
                                {getStatusIcon(leave.status.toLowerCase())}
                                {leave.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(leave.start_date).toLocaleDateString()} -{" "}
                              {new Date(leave.end_date).toLocaleDateString()} •{" "}
                              {leave.days} day{leave.days > 1 ? "s" : ""}
                            </p>
                            <p className="text-sm text-muted-foreground">Reason: {leave.reason}</p>
                            <div className="flex flex-col gap-1 mt-2">
                              <p className="text-xs text-muted-foreground">
                                Manager: {(() => {
                                  if (leave.manager_id) {
                                    const manager = employees.find(
                                      (e) => e.employee_id === String(leave.manager_id)
                                    );
                                    return manager ? manager.full_name : "N/A";
                                  }
                                  return "Not Assigned";
                                })()}{" "}
                                - {leave.manager_status}{" "}
                                {leave.manager_approved_at &&
                                  `on ${new Date(leave.manager_approved_at).toLocaleDateString()}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                HR: {(() => {
                                  if (leave.hr_approved_by) {
                                    const hrPerson = employees.find(
                                      (e) => e.employee_id === leave.hr_approved_by
                                    );
                                    return hrPerson ? hrPerson.full_name : "N/A";
                                  }
                                  return "Not Yet Reviewed";
                                })()}{" "}
                                - {leave.hr_status}{" "}
                                {leave.hr_approved_at &&
                                  `on ${new Date(leave.hr_approved_at).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(leave)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          {leave.status === "Pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditClick(leave)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedLeaveId(leave.id);
                                  setCancelDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {allLeaves.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No leave requests found
                      </p>
                    )}

                    {allLeaves.length > 0 && (
                      <div className="flex items-center justify-between pt-4">
                        <p className="text-xs text-muted-foreground">
                          Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, allLeaves.length)} of{" "}
                          {allLeaves.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageAll((p) => Math.max(1, p - 1))}
                            disabled={pageAll === 1}
                          >
                            Prev
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Page {pageAll} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPageAll((p) => (p < totalPages ? p + 1 : p))
                            }
                            disabled={pageAll === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </TabsContent>
            <TabsContent value="approved" className="space-y-4 mt-4">
              {(() => {
                const approvedLeaves = leaveHistory.filter((l) => l.status === "Approved");
                const totalPages = Math.ceil(approvedLeaves.length / PAGE_SIZE) || 1;
                const startIndex = (pageApproved - 1) * PAGE_SIZE;
                const currentLeaves = approvedLeaves.slice(startIndex, startIndex + PAGE_SIZE);

                return (
                  <>
                    {currentLeaves.map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{leave.leave_type}</p>
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-4 w-4" />
                                {leave.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(leave.start_date).toLocaleDateString()} -{" "}
                              {new Date(leave.end_date).toLocaleDateString()} •{" "}
                              {leave.days} day{leave.days > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(leave)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    ))}

                    {approvedLeaves.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No approved leave requests found
                      </p>
                    )}

                    {approvedLeaves.length > 0 && (
                      <div className="flex items-center justify-between pt-4">
                        <p className="text-xs text-muted-foreground">
                          Showing {startIndex + 1}–
                          {Math.min(startIndex + PAGE_SIZE, approvedLeaves.length)} of{" "}
                          {approvedLeaves.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageApproved((p) => Math.max(1, p - 1))}
                            disabled={pageApproved === 1}
                          >
                            Prev
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Page {pageApproved} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPageApproved((p) => (p < totalPages ? p + 1 : p))
                            }
                            disabled={pageApproved === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </TabsContent>
            <TabsContent value="pending" className="space-y-4 mt-4">
              {(() => {
                const pendingLeaves = leaveHistory.filter((l) => l.status === "Pending");
                const totalPages = Math.ceil(pendingLeaves.length / PAGE_SIZE) || 1;
                const startIndex = (pagePending - 1) * PAGE_SIZE;
                const currentLeaves = pendingLeaves.slice(startIndex, startIndex + PAGE_SIZE);

                return (
                  <>
                    {currentLeaves.map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{leave.leave_type}</p>
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-4 w-4" />
                                {leave.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(leave.start_date).toLocaleDateString()} -{" "}
                              {new Date(leave.end_date).toLocaleDateString()} •{" "}
                              {leave.days} day{leave.days > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(leave)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(leave)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedLeaveId(leave.id);
                              setCancelDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ))}

                    {pendingLeaves.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No pending leave requests found
                      </p>
                    )}

                    {pendingLeaves.length > 0 && (
                      <div className="flex items-center justify-between pt-4">
                        <p className="text-xs text-muted-foreground">
                          Showing {startIndex + 1}–
                          {Math.min(startIndex + PAGE_SIZE, pendingLeaves.length)} of{" "}
                          {pendingLeaves.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPagePending((p) => Math.max(1, p - 1))}
                            disabled={pagePending === 1}
                          >
                            Prev
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Page {pagePending} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPagePending((p) => (p < totalPages ? p + 1 : p))
                            }
                            disabled={pagePending === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </TabsContent>
            <TabsContent value="rejected" className="space-y-4 mt-4">
              {(() => {
                const rejectedLeaves = leaveHistory.filter((l) => l.status === "Rejected");
                const totalPages = Math.ceil(rejectedLeaves.length / PAGE_SIZE) || 1;
                const startIndex = (pageRejected - 1) * PAGE_SIZE;
                const currentLeaves = rejectedLeaves.slice(startIndex, startIndex + PAGE_SIZE);

                return (
                  <>
                    {currentLeaves.map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{leave.leave_type}</p>
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-4 w-4" />
                                {leave.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(leave.start_date).toLocaleDateString()} -{" "}
                              {new Date(leave.end_date).toLocaleDateString()} •{" "}
                              {leave.days} day{leave.days > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(leave)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    ))}

                    {rejectedLeaves.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No rejected leave requests found
                      </p>
                    )}

                    {rejectedLeaves.length > 0 && (
                      <div className="flex items-center justify-between pt-4">
                        <p className="text-xs text-muted-foreground">
                          Showing {startIndex + 1}–
                          {Math.min(startIndex + PAGE_SIZE, rejectedLeaves.length)} of{" "}
                          {rejectedLeaves.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageRejected((p) => Math.max(1, p - 1))}
                            disabled={pageRejected === 1}
                          >
                            Prev
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Page {pageRejected} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPageRejected((p) => (p < totalPages ? p + 1 : p))
                            }
                            disabled={pageRejected === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Leave Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this leave request? Manager and HR will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelLeave}>
              Yes, cancel request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Leave Type</label>
              <Select
                value={editFormData.leave_type}
                onValueChange={(value) => setEditFormData({ ...editFormData, leave_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editErrors.leave_type && (
                <p className="text-red-500 text-xs mt-1">{editErrors.leave_type}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={editFormData.start_date}
                  onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                />
                {editErrors.start_date && (
                  <p className="text-red-500 text-xs mt-1">{editErrors.start_date}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={editFormData.end_date}
                  onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                />
                {editErrors.end_date && (
                  <p className="text-red-500 text-xs mt-1">{editErrors.end_date}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Number of Days</label>
              <Input
                type="number"
                value={editFormData.days}
                readOnly
                className="bg-muted"
              />
              {/* <p className="text-sm text-muted-foreground">Auto-calculated</p> */}
            </div>

            <div>
              <label className="text-sm font-medium">Select Manager</label>
              <Select
                value={editFormData.manager_id?.toString()}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, manager_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map(manager => (
                    <SelectItem
                      key={manager.id}
                      value={manager.employee_id.toString()}  // <-- fixed
                    >
                      {manager.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editErrors.manager_id && (
                <p className="text-red-500 text-xs mt-1">{editErrors.manager_id}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                value={editFormData.reason}
                onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                placeholder="Reason for leave"
                rows={4}
              />
              {editErrors.reason && (
                <p className="text-red-500 text-xs mt-1">{editErrors.reason}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditLeave}>
              Update Leave Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedLeave && (
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Leave Request Details</DialogTitle>
            </DialogHeader>
            <LeaveHistoryTimeline leave={selectedLeave} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
