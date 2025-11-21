export interface LeaveRequest {
    user_email: any;
    email: string;
    employee_id: string;
    created_at: any;
    end_date: any;
    start_date: any;
    user_name: any;
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
