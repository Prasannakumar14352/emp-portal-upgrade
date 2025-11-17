import { apiClient } from './apiClient';

export interface Manager {
  id: number;
  full_name: string;
  email: string;
  department?: string;
  position?: string;
}

class ManagerService {
  async getAllManagers(): Promise<Manager[]> {
    return apiClient.get<Manager[]>('/managers');
  }
}

export const managerService = new ManagerService();
