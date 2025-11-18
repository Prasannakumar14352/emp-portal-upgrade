const signalR = require('@microsoft/signalr');

class NotificationHub {
  constructor() {
    this.connections = new Map(); // userId -> connectionId
  }

  registerConnection(userId, connectionId) {
    this.connections.set(userId, connectionId);
    console.log(`User ${userId} connected with connection ${connectionId}`);
  }

  unregisterConnection(userId) {
    this.connections.delete(userId);
    console.log(`User ${userId} disconnected`);
  }

  sendToUser(userId, event, data) {
    const connectionId = this.connections.get(userId);
    if (connectionId) {
      // This will be handled by the SignalR middleware
      return { connectionId, event, data };
    }
    return null;
  }

  sendToAll(event, data) {
    const notifications = [];
    for (const [userId, connectionId] of this.connections.entries()) {
      notifications.push({ connectionId, event, data });
    }
    return notifications;
  }

  // Broadcast attendance notification
  broadcastAttendanceUpdate(userId, userName, action, timestamp) {
    return this.sendToAll('attendanceUpdate', {
      userId,
      userName,
      action, // 'check-in' or 'check-out'
      timestamp,
      message: `${userName} has ${action === 'check-in' ? 'checked in' : 'checked out'}`
    });
  }

  // Broadcast performance review notification
  broadcastPerformanceReview(employeeId, employeeName, reviewerId, reviewerName) {
    return this.sendToUser(employeeId, 'performanceReview', {
      employeeId,
      employeeName,
      reviewerId,
      reviewerName,
      message: `${reviewerName} has created a performance review for you`,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new NotificationHub();
