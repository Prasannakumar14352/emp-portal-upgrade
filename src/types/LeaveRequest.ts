
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
  user_name?: string;
  approved_by: string | null;
  created_at: string;
  end_date: string;
  hr_approved_by: string | null;
  hr_comments: string | null;
  hr_status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  leave_type: string;
  manager_approved_by: string | null;
  manager_comments: string | null;
  manager_status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  start_date: string;
  updated_at: string;
  user_email: string;
}
