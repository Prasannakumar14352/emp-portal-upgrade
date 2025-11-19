import { apiClient } from './apiClient';

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  backupCodesRemaining: number;
}

class TwoFactorService {
  async setup(): Promise<TwoFactorSetup> {
    return await apiClient.post<TwoFactorSetup>('/2fa/setup', {});
  }

  async verify(token: string): Promise<void> {
    await apiClient.post('/2fa/verify', { token });
  }

  async disable(token: string): Promise<void> {
    await apiClient.post('/2fa/disable', { token });
  }

  async verifyLogin(userId: number, token: string): Promise<{ verified: boolean }> {
    return await apiClient.post('/2fa/verify-login', { userId, token }, { skipAuth: true });
  }

  async getStatus(): Promise<TwoFactorStatus> {
    return await apiClient.get<TwoFactorStatus>('/2fa/status');
  }
}

export const twoFactorService = new TwoFactorService();