import * as signalR from '@microsoft/signalr';
import { getAPIBaseURL } from '@/config/api';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  async connect(userId: string) {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const baseUrl = getAPIBaseURL().replace('/api', '');
    
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}/notifications`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.connection.on('attendanceUpdate', (data) => {
      this.notifyListeners('attendanceUpdate', data);
    });

    this.connection.on('performanceReview', (data) => {
      this.notifyListeners('performanceReview', data);
    });

    try {
      await this.connection.start();
      console.log('SignalR Connected');
      
      // Register user
      await this.connection.invoke('register', userId);
    } catch (err) {
      console.error('SignalR Connection Error:', err);
      // Retry connection after 5 seconds
      setTimeout(() => this.connect(userId), 5000);
    }
  }

  disconnect() {
    if (this.connection) {
      this.connection.stop();
      this.connection = null;
      this.listeners.clear();
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private notifyListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }
}

export const signalrService = new SignalRService();
