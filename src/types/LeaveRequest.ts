export interface LeaveRequest {
    id: string;
    user_name: string;
    user_email?: string;
    employee_id: number;
    leaveType: string;
    leave_type: string;
    startDate: string;
    start_date: string;
    endDate: string;
    end_date: string;
    days: number;
    reason: string;
    status: string;
    appliedDate: string;
    created_at: string;
    updated_at?: string;
    approved_by?: number;
    comments?: { author: string; text: string; timestamp: string }[];
}
