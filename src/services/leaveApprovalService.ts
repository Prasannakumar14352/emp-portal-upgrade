import { apiClient } from './apiClient';
import type { LeaveRequest } from "@/types/LeaveRequest";

export const leaveApprovalService = {
    async getRequests(role: string, userId: string) {
        return apiClient.get<LeaveRequest[]>(`/leaves/pending?role=${role}&manager_id=${userId}`);
    },

    async approve(leaveId: string) {
        return apiClient.post(`/leaves/${leaveId}/approve`);
    },

    async reject(leaveId: string) {
        return apiClient.post(`/leaves/${leaveId}/reject`);
    },

    async addComment(leaveId: string, comment: string) {
        return apiClient.post(`/leaves/${leaveId}/comment`, { comment });
    }
};
