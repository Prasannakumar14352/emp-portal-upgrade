const notificationHub = require('../hubs/notificationHub');

// Store for real-time connections
const connections = new Map();

const setupSignalR = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('register', (userId) => {
      notificationHub.registerConnection(userId, socket.id);
      connections.set(socket.id, userId);
      socket.join(`user-${userId}`);
    });

    socket.on('disconnect', () => {
      const userId = connections.get(socket.id);
      if (userId) {
        notificationHub.unregisterConnection(userId);
        connections.delete(socket.id);
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

const emitToUser = (io, userId, event, data) => {
  io.to(`user-${userId}`).emit(event, data);
};

const emitToAll = (io, event, data) => {
  io.emit(event, data);
};

module.exports = { setupSignalR, emitToUser, emitToAll };
