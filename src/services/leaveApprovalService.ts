import { apiClient } from './apiClient';
import type { LeaveRequest } from "@/types/LeaveRequest";

export const leaveApprovalService = {
    async getRequests(role: string, userId: string) {
        return apiClient.get<LeaveRequest[]>(`/leaves?status=Pending`);
    },

    async approve(leaveId: string, comments?: string) {
        return apiClient.patch(`/leaves/${leaveId}`, { 
            status: 'Approved', 
            comments 
        });
    },

    async reject(leaveId: string, comments?: string) {
        return apiClient.patch(`/leaves/${leaveId}`, { 
            status: 'Rejected', 
            comments 
        });
    },

    async addComment(leaveId: string, comment: string) {
        return apiClient.post(`/leaves/${leaveId}/comment`, { comment });
    }
};
