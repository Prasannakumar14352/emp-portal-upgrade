
export interface LeaveRequest {
  id: string;
  employee_id: string;
  employeeName: string;
  email: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  appliedDate: string;
  comments?: { author: string; text: string; timestamp: string }[];
}
