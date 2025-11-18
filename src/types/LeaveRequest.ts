export interface LeaveRequest {
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
