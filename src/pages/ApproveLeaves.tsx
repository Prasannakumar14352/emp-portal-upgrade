import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Clock, Calendar, User, Eye, Download, FileText, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { EmployeeDetailModal } from "@/components/EmployeeDetailModal";
import { exportToCSV, exportToPDF, sendMockEmail, getEmailTemplate } from "@/lib/exportUtils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeaveRequest {
  id: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  appliedDate: string;
  comments?: { author: string; text: string; timestamp: string }[];
}

export default function ApproveLeaves() {
  const { role } = useUserRole();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedRequestForComment, setSelectedRequestForComment] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    // Check if user has permission
    if (role !== "hr" && role !== "manager") {
      navigate("/");
      toast.error("You don't have permission to access this page");
      return;
    }

    // Load mock leave requests
    const storedRequests = localStorage.getItem("leaveRequests");
    if (!storedRequests) {
      // Initialize with mock data
      const initialRequests: LeaveRequest[] = [
        {
          id: "1",
          employeeName: "John Doe",
          leaveType: "Annual Leave",
          startDate: "2025-12-20",
          endDate: "2025-12-24",
          days: 5,
          status: "Pending",
          reason: "Family vacation planned for Christmas",
          appliedDate: "2025-12-10",
        },
        {
          id: "2",
          employeeName: "Jane Smith",
          leaveType: "Sick Leave",
          startDate: "2025-12-18",
          endDate: "2025-12-18",
          days: 1,
          status: "Pending",
          reason: "Medical appointment",
          appliedDate: "2025-12-15",
        },
        {
          id: "3",
          employeeName: "Mike Johnson",
          leaveType: "Personal Leave",
          startDate: "2025-12-19",
          endDate: "2025-12-19",
          days: 1,
          status: "Pending",
          reason: "Home repair work scheduled",
          appliedDate: "2025-12-12",
        },
      ];
      localStorage.setItem("leaveRequests", JSON.stringify(initialRequests));
      setRequests(initialRequests);
    } else {
      setRequests(JSON.parse(storedRequests));
    }
  }, [role, navigate]);

  const handleApprove = (id: string) => {
    const request = requests.find(req => req.id === id);
    if (!request) return;

    const updatedRequests = requests.map((req) =>
      req.id === id ? { ...req, status: "Approved" } : req
    );
    setRequests(updatedRequests);
    localStorage.setItem("leaveRequests", JSON.stringify(updatedRequests));
    
    // Send mock email notification
    const template = getEmailTemplate("approved", request.employeeName, request.leaveType, request.startDate, request.endDate);
    sendMockEmail(request.employeeName, template.subject, template.body);
    
    toast.success("Leave request approved and notification sent");
  };

  const handleReject = (id: string) => {
    const request = requests.find(req => req.id === id);
    if (!request) return;

    const updatedRequests = requests.map((req) =>
      req.id === id ? { ...req, status: "Rejected" } : req
    );
    setRequests(updatedRequests);
    localStorage.setItem("leaveRequests", JSON.stringify(updatedRequests));
    
    // Send mock email notification
    const template = getEmailTemplate("rejected", request.employeeName, request.leaveType, request.startDate, request.endDate);
    sendMockEmail(request.employeeName, template.subject, template.body);
    
    toast.error("Leave request rejected and notification sent");
  };

  const handleBulkApprove = () => {
    if (selectedRequests.length === 0) {
      toast.error("No requests selected");
      return;
    }

    const updatedRequests = requests.map((req) => {
      if (selectedRequests.includes(req.id)) {
        // Send notification for each approved request
        const template = getEmailTemplate("approved", req.employeeName, req.leaveType, req.startDate, req.endDate);
        sendMockEmail(req.employeeName, template.subject, template.body);
        return { ...req, status: "Approved" };
      }
      return req;
    });
    setRequests(updatedRequests);
    localStorage.setItem("leaveRequests", JSON.stringify(updatedRequests));
    setSelectedRequests([]);
    
    toast.success(`${selectedRequests.length} leave requests approved and notifications sent`);
  };

  const handleBulkReject = () => {
    if (selectedRequests.length === 0) {
      toast.error("No requests selected");
      return;
    }

    const updatedRequests = requests.map((req) => {
      if (selectedRequests.includes(req.id)) {
        // Send notification for each rejected request
        const template = getEmailTemplate("rejected", req.employeeName, req.leaveType, req.startDate, req.endDate);
        sendMockEmail(req.employeeName, template.subject, template.body);
        return { ...req, status: "Rejected" };
      }
      return req;
    });
    setRequests(updatedRequests);
    localStorage.setItem("leaveRequests", JSON.stringify(updatedRequests));
    setSelectedRequests([]);
    
    toast.error(`${selectedRequests.length} leave requests rejected and notifications sent`);
  };

  const handleAddComment = () => {
    if (!selectedRequestForComment || !newComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    const user = JSON.parse(localStorage.getItem("mockUser") || "{}");
    const comment = {
      author: user.full_name || "HR Manager",
      text: newComment,
      timestamp: new Date().toISOString(),
    };

    const updatedRequests = requests.map((req) =>
      req.id === selectedRequestForComment
        ? { ...req, comments: [...(req.comments || []), comment] }
        : req
    );

    setRequests(updatedRequests);
    localStorage.setItem("leaveRequests", JSON.stringify(updatedRequests));
    setNewComment("");
    setCommentDialogOpen(false);
    toast.success("Comment added");
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
    if (filterEmployee && !req.employeeName.toLowerCase().includes(filterEmployee.toLowerCase())) return false;
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
                  <Button variant="default" size="sm" onClick={handleBulkApprove}>
                    Approve Selected ({selectedRequests.length})
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleBulkReject}>
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
                          {request.startDate} to {request.endDate}
                        </div>
                        <div>({request.days} days)</div>
                      </div>
                      <p className="text-sm"><strong>Reason:</strong> {request.reason}</p>
                      <p className="text-xs text-muted-foreground">Applied: {request.appliedDate}</p>
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
                          setSelectedEmployee(request.employeeName);
                          setModalOpen(true);
                        }}
                        title="View Employee Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Dialog open={commentDialogOpen && selectedRequestForComment === request.id} onOpenChange={(open) => {
                        setCommentDialogOpen(open);
                        if (open) setSelectedRequestForComment(request.id);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Add Comment">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Comment</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Comment</Label>
                              <Textarea
                                placeholder="Enter your comment or feedback..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                rows={4}
                              />
                            </div>
                            <Button onClick={handleAddComment} className="w-full">
                              <Send className="mr-2 h-4 w-4" />
                              Add Comment
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReject(request.id)}
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
                          {request.startDate} to {request.endDate}
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
          employeeName={selectedEmployee}
          employeeEmail={`${selectedEmployee.toLowerCase().replace(/\s+/g, '.')}@company.com`}
        />
      )}
    </div>
  );
}
