require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { logError, logInfo, logWarning, clearOldLogs } = require('./utils/logger');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const leaveRoutes = require('./routes/leaves');
const notificationRoutes = require('./routes/notifications');
const employeeRoutes = require('./routes/employees');
const holidayRoutes = require('./routes/holidays');
const payslipRoutes = require('./routes/payslips');
const dashboardRoutes = require('./routes/dashboard');
const statisticsRoutes = require('./routes/statistics');
const bulkRoutes = require('./routes/bulk');
const leaveTypeRoutes = require('./routes/leaveTypes');
const sessionRoutes = require('./routes/sessions');
const passwordResetRoutes = require('./routes/passwordReset');
const twoFactorRoutes = require('./routes/twoFactor');
const managersRoutes = require('./routes/managers');
const attendanceRoutes = require('./routes/attendance');
const performanceRoutes = require('./routes/performance');
const apiDocsRoutes = require('./routes/apiDocs');
const postmanRoutes = require('./routes/postman');
const uploadRoutes = require('./routes/upload');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:8081", "http://localhost:8080", process.env.FRONTEND_URL].filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"]
  }
});

// Make io accessible to routes
app.set('io', io);

// Setup Socket.IO for real-time notifications
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('register', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:8081", "http://localhost:8080", process.env.FRONTEND_URL].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/leave-types', leaveTypeRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/managers', managersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/docs', apiDocsRoutes);
app.use('/api/postman', postmanRoutes);

// Swagger API Documentation
app.use('/api/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'HRMS API Documentation',
  customfavIcon: '/favicon.ico'
}));

// Swagger JSON endpoint
app.get('/api/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Root endpoint - API info
app.get('/', (req, res) => {
  res.json({
    message: 'Employee Portal API',
    version: '1.0.0',
    documentation: {
      swagger: '🔷 Visit /api/swagger for Swagger/OpenAPI documentation with testing',
      simple: '📚 Visit /api/docs for simple API reference',
      postman: '📮 Download Postman collection at /api/postman',
      json: '📄 Get OpenAPI spec at /api/swagger.json'
    },
    endpoints: {
      swagger: '/api/swagger (Swagger UI - Interactive Testing)',
      swaggerJson: '/api/swagger.json (OpenAPI Specification)',
      postman: '/api/postman (Download Postman Collection)',
      docs: '/api/docs (Simple API Documentation)',
      docsJson: '/api/docs/json (JSON format)',
      auth: '/api/auth',
      users: '/api/users',
      leaves: '/api/leaves',
      employees: '/api/employees',
      holidays: '/api/holidays',
      payslips: '/api/payslips',
      notifications: '/api/notifications',
      health: '/api/health'
    }
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
server.listen(PORT, () => {
  logInfo('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.FRONTEND_URL || 'http://localhost:8080'
  });
  
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
  console.log(`Error logs: backend/logs/error.log`);
  console.log(`Socket.IO enabled for real-time notifications`);
  
  // Clear old logs on startup (keep last 30 days)
  clearOldLogs(30);
});

module.exports = app;
