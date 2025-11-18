const express = require('express');
const router = express.Router();

// API Documentation data
const apiEndpoints = {
  'Authentication': [
    { method: 'POST', path: '/api/auth/login', description: 'Login with email and password', auth: false },
    { method: 'POST', path: '/api/auth/oauth/microsoft', description: 'Login with Microsoft OAuth', auth: false },
    { method: 'POST', path: '/api/auth/oauth/callback', description: 'OAuth callback handler', auth: false },
    { method: 'POST', path: '/api/auth/refresh', description: 'Refresh access token', auth: false },
    { method: 'POST', path: '/api/auth/logout', description: 'Logout and end session', auth: true },
  ],
  'Users': [
    { method: 'GET', path: '/api/users', description: 'Get all users (HR/Manager only)', auth: true, roles: ['hr', 'manager'] },
    { method: 'GET', path: '/api/users/:userId/role', description: 'Get user role', auth: true },
    { method: 'GET', path: '/api/users/:userId/profile', description: 'Get user profile', auth: true },
    { method: 'PATCH', path: '/api/users/:userId/profile', description: 'Update user profile', auth: true },
    { method: 'GET', path: '/api/users/with-roles', description: 'Get all users with roles (HR only)', auth: true, roles: ['hr'] },
    { method: 'POST', path: '/api/users/:userId/roles', description: 'Assign role to user (HR only)', auth: true, roles: ['hr'] },
    { method: 'DELETE', path: '/api/users/roles/:roleId', description: 'Remove role from user (HR only)', auth: true, roles: ['hr'] },
    { method: 'GET', path: '/api/users/:userId/preferences', description: 'Get user preferences', auth: true },
    { method: 'PUT', path: '/api/users/:userId/preferences', description: 'Update user preferences', auth: true },
  ],
  'Employees': [
    { method: 'GET', path: '/api/employees', description: 'Get all employees', auth: true },
    { method: 'GET', path: '/api/employees/:id', description: 'Get employee by ID', auth: true },
    { method: 'GET', path: '/api/employees/departments', description: 'Get unique departments', auth: true },
    { method: 'GET', path: '/api/employees/department/:department', description: 'Get employees by department', auth: true },
    { method: 'POST', path: '/api/employees', description: 'Create new employee (HR/Manager)', auth: true, roles: ['hr', 'manager'] },
    { method: 'PATCH', path: '/api/employees/:id', description: 'Update employee (HR/Manager)', auth: true, roles: ['hr', 'manager'] },
    { method: 'DELETE', path: '/api/employees/:id', description: 'Delete employee (HR only)', auth: true, roles: ['hr'] },
  ],
  'Leaves': [
    { method: 'GET', path: '/api/leaves', description: 'Get all leave requests (HR/Manager)', auth: true, roles: ['hr', 'manager'] },
    { method: 'GET', path: '/api/leaves/user/:userId', description: 'Get user leave requests', auth: true },
    { method: 'GET', path: '/api/leaves/conflicts', description: 'Check for leave conflicts', auth: true },
    { method: 'GET', path: '/api/leaves/balances/:userId', description: 'Get leave balances', auth: true },
    { method: 'POST', path: '/api/leaves', description: 'Create new leave request', auth: true },
    { method: 'PATCH', path: '/api/leaves/:leaveId', description: 'Update leave status', auth: true },
    { method: 'PUT', path: '/api/leaves/:leaveId', description: 'Edit pending leave request', auth: true },
    { method: 'DELETE', path: '/api/leaves/:leaveId', description: 'Cancel leave request', auth: true },
    { method: 'GET', path: '/api/leaves/:leaveId/comments', description: 'Get leave comments', auth: true },
    { method: 'POST', path: '/api/leaves/:leaveId/comments', description: 'Add comment to leave', auth: true },
  ],
  'Attendance': [
    { method: 'GET', path: '/api/attendance', description: 'Get user attendance records', auth: true },
    { method: 'GET', path: '/api/attendance/today', description: 'Get today\'s attendance record', auth: true },
    { method: 'GET', path: '/api/attendance/stats', description: 'Get attendance statistics', auth: true },
    { method: 'POST', path: '/api/attendance/checkin', description: 'Check in for the day', auth: true },
    { method: 'POST', path: '/api/attendance/checkout', description: 'Check out for the day', auth: true },
    { method: 'GET', path: '/api/attendance/analytics/stats', description: 'Get attendance analytics stats', auth: true },
    { method: 'GET', path: '/api/attendance/analytics/departments', description: 'Get department attendance analytics', auth: true },
    { method: 'GET', path: '/api/attendance/analytics/trends', description: 'Get attendance trends', auth: true },
  ],
  'Leave Types': [
    { method: 'GET', path: '/api/leave-types', description: 'Get all leave types', auth: true },
    { method: 'POST', path: '/api/leave-types', description: 'Create new leave type (HR/Manager)', auth: true, roles: ['hr', 'manager'] },
    { method: 'PATCH', path: '/api/leave-types/:id', description: 'Update leave type (HR/Manager)', auth: true, roles: ['hr', 'manager'] },
    { method: 'DELETE', path: '/api/leave-types/:id', description: 'Delete leave type (HR/Manager)', auth: true, roles: ['hr', 'manager'] },
  ],
  'Holidays': [
    { method: 'GET', path: '/api/holidays', description: 'Get all holidays', auth: true },
    { method: 'POST', path: '/api/holidays', description: 'Create new holiday (HR/Manager)', auth: true, roles: ['hr', 'manager'] },
    { method: 'PATCH', path: '/api/holidays/:id', description: 'Update holiday (HR/Manager)', auth: true, roles: ['hr', 'manager'] },
    { method: 'DELETE', path: '/api/holidays/:id', description: 'Delete holiday (HR/Manager)', auth: true, roles: ['hr', 'manager'] },
  ],
  'Dashboard': [
    { method: 'GET', path: '/api/dashboard/stats', description: 'Get dashboard statistics', auth: true },
    { method: 'GET', path: '/api/dashboard/recent-leaves', description: 'Get recent leave requests', auth: true },
    { method: 'GET', path: '/api/dashboard/upcoming-holidays', description: 'Get upcoming holidays', auth: true },
  ],
  'Notifications': [
    { method: 'GET', path: '/api/notifications', description: 'Get user notifications', auth: true },
    { method: 'PATCH', path: '/api/notifications/:id/read', description: 'Mark notification as read', auth: true },
    { method: 'PATCH', path: '/api/notifications/read-all', description: 'Mark all notifications as read', auth: true },
  ],
  'Payslips': [
    { method: 'GET', path: '/api/payslips/user/:userId', description: 'Get user payslips', auth: true },
    { method: 'POST', path: '/api/payslips', description: 'Create new payslip (HR only)', auth: true, roles: ['hr'] },
  ],
  'Statistics': [
    { method: 'GET', path: '/api/statistics/attendance', description: 'Get attendance statistics', auth: true },
    { method: 'GET', path: '/api/statistics/leaves', description: 'Get leave statistics', auth: true },
    { method: 'GET', path: '/api/statistics/department', description: 'Get department statistics', auth: true },
  ],
};

// HTML template for API documentation
const getHtmlTemplate = () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation - HRMS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .header p {
      font-size: 1.1rem;
      opacity: 0.9;
    }
    .content {
      padding: 2rem;
    }
    .section {
      margin-bottom: 2.5rem;
    }
    .section-title {
      font-size: 1.5rem;
      color: #667eea;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #667eea;
    }
    .endpoint {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 1rem;
      margin-bottom: 0.75rem;
      border-radius: 4px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .endpoint:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .endpoint-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;
    }
    .method {
      font-weight: bold;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.85rem;
      text-transform: uppercase;
      color: white;
    }
    .method.get { background: #28a745; }
    .method.post { background: #007bff; }
    .method.patch { background: #ffc107; color: #333; }
    .method.put { background: #17a2b8; }
    .method.delete { background: #dc3545; }
    .path {
      font-family: 'Courier New', monospace;
      font-size: 0.95rem;
      color: #333;
      flex: 1;
    }
    .badges {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge.auth {
      background: #e3f2fd;
      color: #1976d2;
    }
    .badge.role {
      background: #fff3e0;
      color: #f57c00;
    }
    .description {
      color: #666;
      font-size: 0.9rem;
      margin-left: 1rem;
    }
    .info-box {
      background: #e3f2fd;
      border-left: 4px solid #1976d2;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 2rem;
    }
    .info-box h3 {
      color: #1976d2;
      margin-bottom: 0.5rem;
    }
    .info-box p {
      color: #555;
      line-height: 1.6;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
    }
    .stat-card h3 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    .stat-card p {
      opacity: 0.9;
    }
    @media (max-width: 768px) {
      body { padding: 1rem; }
      .header h1 { font-size: 1.8rem; }
      .endpoint-header { flex-direction: column; align-items: flex-start; }
      .path { word-break: break-all; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 HRMS API Documentation</h1>
      <p>Complete reference for all available endpoints</p>
    </div>
    
    <div class="content">
      <div class="info-box">
        <h3>🔐 Authentication</h3>
        <p>Most endpoints require authentication. Include the JWT token in the Authorization header: <code>Authorization: Bearer YOUR_TOKEN</code></p>
      </div>

      <div class="stats">
        <div class="stat-card">
          <h3>${Object.keys(apiEndpoints).length}</h3>
          <p>Categories</p>
        </div>
        <div class="stat-card">
          <h3>${Object.values(apiEndpoints).flat().length}</h3>
          <p>Total Endpoints</p>
        </div>
        <div class="stat-card">
          <h3>${Object.values(apiEndpoints).flat().filter(e => e.auth).length}</h3>
          <p>Protected Routes</p>
        </div>
      </div>

      ${Object.entries(apiEndpoints).map(([category, endpoints]) => `
        <div class="section">
          <h2 class="section-title">${category}</h2>
          ${endpoints.map(endpoint => `
            <div class="endpoint">
              <div class="endpoint-header">
                <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                <span class="path">${endpoint.path}</span>
                <div class="badges">
                  ${endpoint.auth ? '<span class="badge auth">🔒 Auth Required</span>' : ''}
                  ${endpoint.roles ? endpoint.roles.map(role => 
                    `<span class="badge role">${role.toUpperCase()}</span>`
                  ).join('') : ''}
                </div>
              </div>
              <div class="description">${endpoint.description}</div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
`;

// Serve API documentation
router.get('/', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(getHtmlTemplate());
});

// Serve JSON version for programmatic access
router.get('/json', (req, res) => {
  res.json({
    title: 'HRMS API Documentation',
    version: '1.0.0',
    baseUrl: process.env.API_URL || 'http://localhost:5000',
    endpoints: apiEndpoints
  });
});

module.exports = router;
