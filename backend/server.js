require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
  console.error('Error:', err);
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
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
});

module.exports = app;
