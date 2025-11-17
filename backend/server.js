require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { logError, logInfo, logWarning, clearOldLogs } = require('./utils/logger');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const leaveRoutes = require('./routes/leaves');
const notificationRoutes = require('./routes/notifications');
const employeeRoutes = require('./routes/employees');
const holidayRoutes = require('./routes/holidays');
const payslipRoutes = require('./routes/payslips');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Performance monitoring configuration
const SLOW_REQUEST_THRESHOLD = 1000; // Log requests taking longer than 1 second

// Enhanced request logging and performance monitoring middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log incoming request
  console.log(`[${timestamp}] --> ${req.method} ${req.path}`);
  logInfo(`Incoming request: ${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip
  });
  
  // Log request body for POST/PUT/PATCH (excluding passwords)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '***';
    if (sanitizedBody.current_password) sanitizedBody.current_password = '***';
    if (sanitizedBody.new_password) sanitizedBody.new_password = '***';
    if (sanitizedBody.refresh_token) sanitizedBody.refresh_token = '***';
    console.log(`    Body:`, JSON.stringify(sanitizedBody));
  }
  
  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    const resetColor = '\x1b[0m';
    
    console.log(`[${timestamp}] <-- ${req.method} ${req.path} ${statusColor}${res.statusCode}${resetColor} - ${duration}ms`);
    
    // Log response details
    logInfo(`Response: ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
    
    // Performance monitoring: detect and log slow requests
    if (duration > SLOW_REQUEST_THRESHOLD) {
      const warningColor = '\x1b[33m';
      console.log(`${warningColor}⚠️  SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms (threshold: ${SLOW_REQUEST_THRESHOLD}ms)${resetColor}`);
      
      logWarning(`Slow API endpoint detected`, {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        threshold: `${SLOW_REQUEST_THRESHOLD}ms`,
        statusCode: res.statusCode,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/payslips', payslipRoutes);

// Root endpoint - API info
app.get('/', (req, res) => {
  res.json({
    message: 'Employee Portal API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth (login, signup, logout)',
      users: '/api/users',
      leaves: '/api/leaves',
      employees: '/api/employees',
      holidays: '/api/holidays',
      payslips: '/api/payslips',
      notifications: '/api/notifications',
      health: '/api/health'
    },
    documentation: 'See backend/README.md for full API documentation'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error with full details
  logError(err, req, {
    status: err.status || 500,
    body: req.body
  });
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  logInfo('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.FRONTEND_URL || 'http://localhost:8080'
  });
  
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
  console.log(`Error logs: backend/logs/error.log`);
  
  // Clear old logs on startup (keep last 30 days)
  clearOldLogs(30);
});

module.exports = app;
