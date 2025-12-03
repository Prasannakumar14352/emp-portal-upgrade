require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const logger = require('./utils/logger');
const { ensureNetworkShareStructure, logValidationResult } = require('./utils/networkShareValidator');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const leaveRoutes = require('./routes/leaves');
const notificationRoutes = require('./routes/notifications');
const employeeRoutes = require('./routes/employees');
const departmentRoutes = require('./routes/departments');
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

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Performance monitoring configuration
const SLOW_REQUEST_THRESHOLD = 1000; // Log requests taking longer than 1 second

// Enhanced request logging and performance monitoring middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log incoming request
  console.log(`[${timestamp}] --> ${req.method} ${req.path}`);
  logger.info(`Incoming request: ${req.method} ${req.path}`, {
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
    logger.info(`Response: ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
    
    // Performance monitoring: detect and log slow requests
    if (duration > SLOW_REQUEST_THRESHOLD) {
      const warningColor = '\x1b[33m';
      console.log(`${warningColor}⚠️  SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms (threshold: ${SLOW_REQUEST_THRESHOLD}ms)${resetColor}`);
      
      logger.warn(`Slow API endpoint detected`, {
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
app.use('/api/departments', departmentRoutes);
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

// Import logs route
const logsRoutes = require('./routes/logs');
app.use('/api/logs', logsRoutes);

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

// Health check endpoint with network share status
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    message: 'Backend server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
  
  // Include network share status if configured
  const networkSharePath = process.env.NETWORK_SHARE_PATH;
  if (networkSharePath && networkSharePath.trim() !== '') {
    const { ensureNetworkShareStructure } = require('./utils/networkShareValidator');
    const validation = await ensureNetworkShareStructure(networkSharePath);
    
    health.networkShare = {
      configured: true,
      path: networkSharePath,
      accessible: validation.success,
      message: validation.message
    };
  } else {
    health.networkShare = {
      configured: false,
      message: 'Network share path not configured'
    };
  }
  
  res.json(health);
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error with full details
  logger.error(err.message || 'Internal Server Error', err, {
    status: err.status || 500,
    path: req.path,
    method: req.method,
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

// Validate network share on startup
async function validateNetworkShareOnStartup() {
  const networkSharePath = process.env.NETWORK_SHARE_PATH;
  
  if (!networkSharePath || networkSharePath.trim() === '') {
    console.warn('\n⚠️  WARNING: NETWORK_SHARE_PATH not configured in .env');
    console.warn('   Payslips will be saved to local backend folder instead.');
    console.warn('   Set NETWORK_SHARE_PATH in .env to use network storage.\n');
    
    logger.warn('Network share path not configured', {
      env: 'NETWORK_SHARE_PATH',
      fallback: 'local backend folder'
    });
    
    return;
  }
  
  console.log('\nValidating network share connection...');
  const result = await ensureNetworkShareStructure(networkSharePath);
  
  logValidationResult(result);
  
  if (result.success) {
    logger.info('Network share validation successful', result.details);
  } else {
    logger.error('Network share validation failed', new Error(result.message), {
      details: result.details
    });
    
    console.error('\n❌ CRITICAL: Network share validation failed!');
    console.error('   Payslip uploads may fail until this is resolved.');
    console.error('   Please check:');
    console.error('   1. Network share path in .env is correct');
    console.error('   2. Network share is accessible from this server');
    console.error('   3. Server has read/write permissions');
    console.error('   4. Network connection is stable\n');
  }
}

// Start server
server.listen(PORT, async () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.FRONTEND_URL || 'http://localhost:8080'
  });
  
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
  console.log(`Error logs: backend/logs/error.log`);
  console.log(`Socket.IO enabled for real-time notifications`);
  
  // Validate network share configuration
  await validateNetworkShareOnStartup();
  
  console.log(`\n✓ Server initialization complete\n`);
});

module.exports = app;
