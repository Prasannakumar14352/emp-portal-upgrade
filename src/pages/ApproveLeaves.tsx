import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Clock, Calendar, User, Eye } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { EmployeeDetailModal } from "@/components/EmployeeDetailModal";

interface LeaveRequest {
  id: number;
  userName: string;
  userEmail: string;
  type: string;
  from: string;
  to: string;
  days: number;
  status: "pending" | "approved" | "rejected";
  reason: string;
  appliedDate: string;
}

export default function ApproveLeaves() {
  const { role } = useUserRole();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    // Check if user has permission
    if (role !== "hr" && role !== "manager") {
      navigate("/");
      toast.error("You don't have permission to access this page");
      return;
    }

    // Load mock leave requests
    const storedRequests = localStorage.getItem("mockLeaveRequests");
    if (!storedRequests) {
      // Initialize with mock data
      const initialRequests: LeaveRequest[] = [
        {
          id: 1,
          userName: "John Doe",
          userEmail: "john.doe@company.com",
          type: "Annual Leave",
          from: "2025-12-20",
          to: "2025-12-24",
          days: 5,
          status: "pending",
          reason: "Family vacation planned for Christmas",
          appliedDate: "2025-12-10",
        },
        {
          id: 2,
          userName: "Jane Smith",
          userEmail: "jane.smith@company.com",
          type: "Sick Leave",
          from: "2025-12-18",
          to: "2025-12-18",
          days: 1,
          status: "pending",
          reason: "Medical appointment",
          appliedDate: "2025-12-15",
        },
        {
          id: 3,
          userName: "Mike Johnson",
          userEmail: "mike.johnson@company.com",
          type: "Work From Home",
          from: "2025-12-19",
          to: "2025-12-19",
          days: 1,
          status: "pending",
          reason: "Home repair work scheduled",
          appliedDate: "2025-12-12",
        },
      ];
      localStorage.setItem("mockLeaveRequests", JSON.stringify(initialRequests));
      setRequests(initialRequests);
    } else {
      setRequests(JSON.parse(storedRequests));
    }
  }, [role, navigate]);

  const handleApprove = (id: number) => {
    const updatedRequests = requests.map((req) =>
      req.id === id ? { ...req, status: "approved" as const } : req
    );
    setRequests(updatedRequests);
    localStorage.setItem("mockLeaveRequests", JSON.stringify(updatedRequests));
    
    const request = requests.find((r) => r.id === id);
    toast.success(`Leave request for ${request?.userName} has been approved!`);
    
    // Add notification
    addNotification({
      type: "leave",
      title: "Leave Request Approved",
      message: `Your ${request?.type} request for ${request?.from} to ${request?.to} has been approved`,
    });
  };

  const handleReject = (id: number) => {
    const updatedRequests = requests.map((req) =>
      req.id === id ? { ...req, status: "rejected" as const } : req
    );
    setRequests(updatedRequests);
    localStorage.setItem("mockLeaveRequests", JSON.stringify(updatedRequests));
    
    const request = requests.find((r) => r.id === id);
    toast.error(`Leave request for ${request?.userName} has been rejected`);
    
    // Add notification
    addNotification({
      type: "leave",
      title: "Leave Request Rejected",
      message: `Your ${request?.type} request for ${request?.from} to ${request?.to} has been rejected`,
    });
  };

  const handleBulkApprove = () => {
    if (selectedRequests.length === 0) {
      toast.error("Please select at least one request");
      return;
    }

    const updatedRequests = requests.map((req) =>
      selectedRequests.includes(req.id) ? { ...req, status: "approved" as const } : req
    );
    setRequests(updatedRequests);
    localStorage.setItem("mockLeaveRequests", JSON.stringify(updatedRequests));
    
    selectedRequests.forEach((id) => {
      const request = requests.find((r) => r.id === id);
      addNotification({
        type: "leave",
        title: "Leave Request Approved",
        message: `Your ${request?.type} request for ${request?.from} to ${request?.to} has been approved`,
      });
    });

    toast.success(`${selectedRequests.length} leave request(s) approved successfully!`);
    setSelectedRequests([]);
  };

  const handleBulkReject = () => {
    if (selectedRequests.length === 0) {
      toast.error("Please select at least one request");
      return;
    }

    const updatedRequests = requests.map((req) =>
      selectedRequests.includes(req.id) ? { ...req, status: "rejected" as const } : req
    );
    setRequests(updatedRequests);
    localStorage.setItem("mockLeaveRequests", JSON.stringify(updatedRequests));
    
    selectedRequests.forEach((id) => {
      const request = requests.find((r) => r.id === id);
      addNotification({
        type: "leave",
        title: "Leave Request Rejected",
        message: `Your ${request?.type} request for ${request?.from} to ${request?.to} has been rejected`,
      });
    });

    toast.error(`${selectedRequests.length} leave request(s) rejected`);
    setSelectedRequests([]);
  };

  const toggleSelectRequest = (id: number) => {
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

  const openEmployeeModal = (name: string, email: string) => {
    setSelectedEmployee({ name, email });
    setModalOpen(true);
  };

  const addNotification = (notification: { type: string; title: string; message: string }) => {
    const storedNotifications = localStorage.getItem("mockNotifications");
    const notifications = storedNotifications ? JSON.parse(storedNotifications) : [];
    
    const newNotification = {
      id: Date.now(),
      ...notification,
      time: "Just now",
      read: false,
      icon: "CheckCircle",
      color: notification.title.includes("Approved") ? "text-success" : "text-destructive",
    };
    
    notifications.unshift(newNotification);
    localStorage.setItem("mockNotifications", JSON.stringify(notifications));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { variant: "secondary" as const, icon: Clock, color: "text-warning" },
      approved: { variant: "default" as const, icon: CheckCircle, color: "text-success" },
      rejected: { variant: "destructive" as const, icon: XCircle, color: "text-destructive" },
    };
    
    const { variant, icon: Icon, color } = config[status as keyof typeof config];
    
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Approvals</h1>
        <p className="text-muted-foreground">Review and approve leave requests from employees</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>Pending Requests</CardTitle>
                <Badge variant="secondary">{pendingRequests.length} pending</Badge>
              </div>
              {pendingRequests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleSelectAll}
                  >
                    {selectedRequests.length === pendingRequests.length ? "Deselect All" : "Select All"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBulkApprove}
                    disabled={selectedRequests.length === 0}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve Selected ({selectedRequests.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkReject}
                    disabled={selectedRequests.length === 0}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject Selected ({selectedRequests.length})
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-12 w-12 text-success mb-3" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground">No pending leave requests at the moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedRequests.includes(request.id)}
                          onCheckedChange={() => toggleSelectRequest(request.id)}
                        />
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(request.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{request.userName}</p>
                          <p className="text-sm text-muted-foreground">{request.userEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEmployeeModal(request.userName, request.userEmail)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{request.type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Applied on {new Date(request.appliedDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="rounded-md bg-muted/50 p-3">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {new Date(request.from).toLocaleDateString()} - {new Date(request.to).toLocaleDateString()}
                        </span>
                        <span className="text-muted-foreground">{request.days} day{request.days > 1 ? "s" : ""}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Reason:</span> {request.reason}
                      </p>
                    </div>
                    
                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          className="flex-1"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(request.id)}
                          className="flex-1"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {processedRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recently Processed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {processedRequests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(request.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{request.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.type} • {new Date(request.from).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedEmployee && (
        <EmployeeDetailModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          employeeName={selectedEmployee.name}
          employeeEmail={selectedEmployee.email}
        />
      )}
    </div>
  );
}