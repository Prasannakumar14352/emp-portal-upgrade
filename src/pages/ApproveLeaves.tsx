import { useState, useEffect } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Clock, Calendar, User, Eye, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { EmployeeDetailModal } from "@/components/EmployeeDetailModal";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { leaveApprovalService } from "@/services/leaveApprovalService";
import type { LeaveRequest } from "@/types/LeaveRequest";
import { useAuth } from "@/hooks/useAuth";

// Comment validation schema
const commentSchema = z.string()
  .trim()
  .min(5, { message: "Comment must be at least 5 characters" })
  .max(500, { message: "Comment must be less than 500 characters" });

interface BulkActionResponse {
  success: boolean;
  processed: number;
  failed: number;
  failedLeaves: Array<{ leaveId: string; reason: string }>;
}

export default function ApproveLeaves() {
  const { role, loading: roleLoading } = useUserRole();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<LeaveRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedRequestForAction, setSelectedRequestForAction] = useState<string | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [bulkApprovalDialogOpen, setBulkApprovalDialogOpen] = useState(false);
  const [bulkRejectionDialogOpen, setBulkRejectionDialogOpen] = useState(false);
  const [bulkActionComment, setBulkActionComment] = useState("");

  useEffect(() => {
    // Wait for both auth and role to load
    if (authLoading || roleLoading) return;

    // Check if user is logged in
    if (!user) {
      navigate("/auth");
      toast.error("Please log in to access this page");
      return;
    }

    // Check if user has required role
    if (role !== "hr" && role !== "manager") {
      navigate("/");
      toast.error("You don't have permission to access this page");
      return;
    }

    loadRequests();
  }, [role, roleLoading, user, authLoading, navigate]);

  // Listen for real-time leave request submissions
  useEffect(() => {
    const handleNewLeaveRequest = () => {
      console.log('New leave request submitted, reloading...');
      loadRequests();
    };

    window.addEventListener('leaveRequestSubmitted', handleNewLeaveRequest);

    return () => {
      window.removeEventListener('leaveRequestSubmitted', handleNewLeaveRequest);
    };
  }, [role, user]);


  const loadRequests = async () => {
    if (!user) {
      console.error("Cannot load requests: user is null");
      return;
    }

    try {
      console.log("Loading leave requests for role:", role, "and user ID:", user.id);

      const data = await leaveApprovalService.getRequests(role, user.id);

      console.log(`Successfully loaded ${data.length} leave requests`);
      setRequests(data);
    } catch (err) {
      console.error("Failed to load leave requests:", err);
      const error = err as { status?: number; message?: string };
      // Show specific error message based on response
      if (error.status === 403) {
        toast.error("You don't have permission to view leave requests. Please contact your administrator to grant you HR or Manager role.");
      } else if (error.status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate("/auth");
      } else {
        toast.error(`Failed to load leave requests: ${error.message || 'Unknown error'}`);
      }
    }
  };


  const handleApprove = async (id: string) => {
    // Validate comment
    const validationResult = commentSchema.safeParse(actionComment);
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    try {
      // Call backend API to update status with comments
      await leaveApprovalService.approve(id, validationResult.data);

      // Reload requests to reflect the updated status
      await loadRequests();

      // Close dialog and reset state
      setApprovalDialogOpen(false);
      setSelectedRequestForAction(null);
      setActionComment("");

      toast.success("Leave request approved and email notification sent");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to approve leave request";
      toast.error(message);
      console.error("Approval error:", error);
    }
  };

  const handleReject = async (id: string) => {
    // Validate comment
    const validationResult = commentSchema.safeParse(actionComment);
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    try {
      // Call backend API to update status with comments
      await leaveApprovalService.reject(id, validationResult.data);

      // Reload requests to reflect the updated status
      await loadRequests();

      // Close dialog and reset state
      setRejectionDialogOpen(false);
      setSelectedRequestForAction(null);
      setActionComment("");

      toast.success("Leave request rejected and email notification sent");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reject leave request";
      toast.error(message);
      console.error("Rejection error:", error);
    }
  };

  const openApprovalDialog = (id: string) => {
    setSelectedRequestForAction(id);
    setActionComment("");
    setApprovalDialogOpen(true);
  };

  const openRejectionDialog = (id: string) => {
    setSelectedRequestForAction(id);
    setActionComment("");
    setRejectionDialogOpen(true);
  };


  const openBulkApprovalDialog = () => {
    if (selectedRequests.length === 0) {
      toast.error("No requests selected");
      return;
    }
    setBulkActionComment("");
    setBulkApprovalDialogOpen(true);
  };

  const openBulkRejectionDialog = () => {
    if (selectedRequests.length === 0) {
      toast.error("No requests selected");
      return;
    }
    setBulkActionComment("");
    setBulkRejectionDialogOpen(true);
  };

  const handleBulkApprove = async () => {
    // Validate comment
    const validationResult = commentSchema.safeParse(bulkActionComment);
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    try {
      const response = await leaveApprovalService.bulkApprove(selectedRequests, validationResult.data) as BulkActionResponse;
      
      // Reload requests to reflect updated statuses
      await loadRequests();
      setSelectedRequests([]);
      setBulkApprovalDialogOpen(false);
      setBulkActionComment("");

      if (response.failed > 0) {
        toast.warning(`${response.processed} approved successfully, ${response.failed} failed`);
      } else {
        toast.success(`${response.processed} leave requests approved and notifications sent`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to approve requests";
      toast.error(message);
      console.error("Bulk approval error:", error);
    }
  };

  const handleBulkReject = async () => {
    // Validate comment
    const validationResult = commentSchema.safeParse(bulkActionComment);
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    try {
      const response = await leaveApprovalService.bulkReject(selectedRequests, validationResult.data) as BulkActionResponse;
      
      // Reload requests to reflect updated statuses
      await loadRequests();
      setSelectedRequests([]);
      setBulkRejectionDialogOpen(false);
      setBulkActionComment("");

      if (response.failed > 0) {
        toast.warning(`${response.processed} rejected successfully, ${response.failed} failed`);
      } else {
        toast.success(`${response.processed} leave requests rejected and notifications sent`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reject requests";
      toast.error(message);
      console.error("Bulk rejection error:", error);
    }
  };


  const handleExportCSV = () => {
    exportToCSV(filteredRequests, `leave-requests-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success("Exported to CSV");
  };

  const handleExportPDF = () => {
    exportToPDF(filteredRequests, `leave-requests-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Exported to PDF");
  };

  const filteredRequests = requests.filter((req) => {
    if (filterStatus !== "all" && req.status !== filterStatus) return false;
    // if (filterEmployee && (req.employeeName ? req.employeeName.toLowerCase().includes(filterEmployee.toLowerCase()) : req.user_name.toLowerCase().includes(filterEmployee.toLowerCase()))) return false;
    if (filterDateFrom && new Date(req.startDate) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(req.endDate) > new Date(filterDateTo)) return false;
    return true;
  });

  const pendingRequests = filteredRequests.filter((req) => req.status === "Pending");
  const processedRequests = filteredRequests.filter((req) => req.status !== "Pending");

  const toggleRequestSelection = (id: string) => {
    setSelectedRequests((prev) =>
      prev.includes(id) ? prev.filter((reqId) => reqId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRequests.length === pendingRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(pendingRequests.map((req) => req.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      Pending: "secondary",
      Approved: "default",
      Rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };
  const formatDate = (d: string | Date | null | undefined) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-GB').replace(/\//g, '-');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Approve Leave Requests</h1>
          <p className="text-muted-foreground">Review and manage team leave requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employee Name</Label>
              <Input
                placeholder="Search employee..."
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Pending Requests ({pendingRequests.length})
          </CardTitle>
          {pendingRequests.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedRequests.length === pendingRequests.length ? "Deselect All" : "Select All"}
              </Button>
              {selectedRequests.length > 0 && (
                <>
                  <Button variant="default" size="sm" onClick={openBulkApprovalDialog}>
                    Approve Selected ({selectedRequests.length})
                  </Button>
                  <Button variant="destructive" size="sm" onClick={openBulkRejectionDialog}>
                    Reject Selected ({selectedRequests.length})
                  </Button>
                </>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedRequests.includes(request.id)}
                      onCheckedChange={() => toggleRequestSelection(request.id)}
                    />
                    <Avatar>
                      <AvatarFallback>
                        {request.employeeName.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{request.employeeName}</h3>
                          <p className="text-sm text-muted-foreground">{request.leaveType}</p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(request.startDate)} to {formatDate(request.endDate)}
                        </div>
                        <div>({request.days} days)</div>
                      </div>
                      <p className="text-sm"><strong>Reason:</strong> {request.reason}</p>
                      <p className="text-xs text-muted-foreground">Applied: {formatDate(request.appliedDate)}</p>
                      {request.comments && request.comments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <Label className="text-xs">Comments:</Label>
                          {request.comments.map((comment, idx) => (
                            <div key={idx} className="text-xs p-2 bg-muted rounded">
                              <span className="font-semibold">{comment.author}:</span> {comment.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedEmployee(request);
                          setModalOpen(true);
                        }}
                        title="View Employee Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openApprovalDialog(request.id ? request.id : request.employee_id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openRejectionDialog(request.id ? request.id : request.employee_id)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Processed Requests ({processedRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No processed requests</p>
          ) : (
            <div className="space-y-4">
              {processedRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors opacity-80"
                >
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {request.employeeName ? request.employeeName.split(" ").map((n) => n[0]).join("") : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{request.employeeName || "Unknown"}</h3>
                          <p className="text-sm text-muted-foreground">{request.leaveType}</p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(request.startDate)} to {formatDate(request.endDate)}
                        </div>
                        <div>({request.days} days)</div>
                      </div>
                      <p className="text-sm"><strong>Reason:</strong> {request.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <EmployeeDetailModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          employeeId={selectedEmployee.employee_id || selectedEmployee.id}
          employeeName={selectedEmployee.employeeName || "Unknown"}
          employeeEmail={selectedEmployee.email || ""}
        />
      )}

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please add a comment explaining your approval decision (10-500 characters).
            </p>
            <div className="space-y-2">
              <Label htmlFor="approval-comment">Comment *</Label>
              <Textarea
                id="approval-comment"
                placeholder="Enter your approval comments (minimum 10 characters)..."
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                rows={4}
                required
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {actionComment.trim().length}/500 characters
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setApprovalDialogOpen(false);
                  setActionComment("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedRequestForAction && handleApprove(selectedRequestForAction)}
                disabled={actionComment.trim().length < 5}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please add a comment explaining the reason for rejection (10-500 characters).
            </p>
            <div className="space-y-2">
              <Label htmlFor="rejection-comment">Comment *</Label>
              <Textarea
                id="rejection-comment"
                placeholder="Enter your rejection reason (minimum 10 characters)..."
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                rows={4}
                required
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {actionComment.trim().length}/500 characters
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectionDialogOpen(false);
                  setActionComment("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedRequestForAction && handleReject(selectedRequestForAction)}
                disabled={actionComment.trim().length < 5}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Approval Dialog */}
      <Dialog open={bulkApprovalDialogOpen} onOpenChange={setBulkApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Approve Leave Requests</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are about to approve <strong>{selectedRequests.length}</strong> leave request(s).
              Please add a comment that will be applied to all selected requests (5-500 characters).
            </p>
            <div className="space-y-2">
              <Label htmlFor="bulk-approval-comment">Comment *</Label>
              <Textarea
                id="bulk-approval-comment"
                placeholder="Enter your approval comments (minimum 5 characters)..."
                value={bulkActionComment}
                onChange={(e) => setBulkActionComment(e.target.value)}
                rows={4}
                required
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {bulkActionComment.trim().length}/500 characters
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setBulkApprovalDialogOpen(false);
                  setBulkActionComment("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkApprove}
                disabled={bulkActionComment.trim().length < 5}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve {selectedRequests.length} Request(s)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Rejection Dialog */}
      <Dialog open={bulkRejectionDialogOpen} onOpenChange={setBulkRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reject Leave Requests</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are about to reject <strong>{selectedRequests.length}</strong> leave request(s).
              Please add a comment explaining the rejection (5-500 characters).
            </p>
            <div className="space-y-2">
              <Label htmlFor="bulk-rejection-comment">Comment *</Label>
              <Textarea
                id="bulk-rejection-comment"
                placeholder="Enter your rejection reason (minimum 5 characters)..."
                value={bulkActionComment}
                onChange={(e) => setBulkActionComment(e.target.value)}
                rows={4}
                required
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {bulkActionComment.trim().length}/500 characters
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setBulkRejectionDialogOpen(false);
                  setBulkActionComment("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkReject}
                disabled={bulkActionComment.trim().length < 5}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject {selectedRequests.length} Request(s)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
