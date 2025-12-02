import { io, Socket } from 'socket.io-client';
import { getAPIBaseURL } from '@/config/api';

type SignalRCallback = (data: unknown) => void;

class SignalRService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<SignalRCallback>> = new Map();

  async connect(userId: string) {
    if (this.socket?.connected) {
      return;
    }

    const baseUrl = getAPIBaseURL().replace('/api', '');
    
    this.socket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO Connected');
      // Register user
      this.socket?.emit('register', userId);
    });

    this.socket.on('attendanceUpdate', (data: unknown) => {
      this.notifyListeners('attendanceUpdate', data);
    });

    this.socket.on('performanceReview', (data: unknown) => {
      this.notifyListeners('performanceReview', data);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket.IO Connection Error:', err);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket.IO Disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  on(event: string, callback: SignalRCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: SignalRCallback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private notifyListeners(event: string, data: unknown) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }
}

export const signalrService = new SignalRService();
