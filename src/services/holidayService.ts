import { apiClient } from './apiClient';

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  description?: string;
  created_at: string;
}

export interface CreateHolidayRequest {
  name: string;
  date: string;
  type: string;
  description?: string;
}

class HolidayService {
  async getAllHolidays(year?: number): Promise<Holiday[]> {
    const yearParam = year ? `?year=${year}` : '';
    return apiClient.get<Holiday[]>(`/holidays${yearParam}`);
  }

  async getUpcomingHolidays(limit: number = 5): Promise<Holiday[]> {
    return apiClient.get<Holiday[]>(`/holidays/upcoming?limit=${limit}`);
  }

  async getHolidayById(id: string): Promise<Holiday> {
    return apiClient.get<Holiday>(`/holidays/${id}`);
  }

  async createHoliday(data: CreateHolidayRequest): Promise<Holiday> {
    return apiClient.post<Holiday>('/holidays', data);
  }

  async updateHoliday(id: string, data: Partial<CreateHolidayRequest>): Promise<Holiday> {
    return apiClient.patch<Holiday>(`/holidays/${id}`, data);
  }

  async deleteHoliday(id: string): Promise<void> {
    return apiClient.delete(`/holidays/${id}`);
  }
}

export const holidayService = new HolidayService();
