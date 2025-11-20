const express = require('express');
const router = express.Router();

// Generate Postman Collection
router.get('/', (req, res) => {
  const baseUrl = process.env.API_URL || 'http://localhost:5000';
  
  const postmanCollection = {
    info: {
      name: 'HRMS API Collection',
      description: 'Complete API collection for the HRMS Employee Portal with authentication, leave management, attendance tracking, and more.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      version: '1.0.0'
    },
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{authToken}}',
          type: 'string'
        }
      ]
    },
    variable: [
      {
        key: 'baseUrl',
        value: baseUrl,
        type: 'string'
      },
      {
        key: 'authToken',
        value: '',
        type: 'string'
      }
    ],
    item: [
      {
        name: 'Authentication',
        item: [
          {
            name: 'Login',
            request: {
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  email: 'user@example.com',
                  password: 'password123'
                }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/api/auth/login',
                host: ['{{baseUrl}}'],
                path: ['api', 'auth', 'login']
              }
            },
            response: []
          },
          {
            name: 'OAuth Microsoft',
            request: {
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify({ code: 'oauth_code_here' }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/api/auth/oauth/microsoft',
                host: ['{{baseUrl}}'],
                path: ['api', 'auth', 'oauth', 'microsoft']
              }
            },
            response: []
          },
          {
            name: 'Refresh Token',
            request: {
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify({ refresh_token: 'your_refresh_token' }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/api/auth/refresh',
                host: ['{{baseUrl}}'],
                path: ['api', 'auth', 'refresh']
              }
            },
            response: []
          },
          {
            name: 'Logout',
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{authToken}}' }
              ],
              url: {
                raw: '{{baseUrl}}/api/auth/logout',
                host: ['{{baseUrl}}'],
                path: ['api', 'auth', 'logout']
              }
            },
            response: []
          }
        ]
      },
      {
        name: 'Users',
        item: [
          {
            name: 'Get All Users',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/users',
                host: ['{{baseUrl}}'],
                path: ['api', 'users']
              }
            },
            response: []
          },
          {
            name: 'Get User Role',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/users/:userId/role',
                host: ['{{baseUrl}}'],
                path: ['api', 'users', ':userId', 'role'],
                variable: [{ key: 'userId', value: '1' }]
              }
            },
            response: []
          },
          {
            name: 'Get User Profile',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/users/:userId/profile',
                host: ['{{baseUrl}}'],
                path: ['api', 'users', ':userId', 'profile'],
                variable: [{ key: 'userId', value: '1' }]
              }
            },
            response: []
          },
          {
            name: 'Update User Profile',
            request: {
              method: 'PATCH',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{authToken}}' }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  full_name: 'John Doe',
                  phone: '+1234567890',
                  department: 'Engineering',
                  position: 'Senior Developer'
                }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/api/users/:userId/profile',
                host: ['{{baseUrl}}'],
                path: ['api', 'users', ':userId', 'profile'],
                variable: [{ key: 'userId', value: '1' }]
              }
            },
            response: []
          },
          {
            name: 'Get Users with Roles',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/users/with-roles',
                host: ['{{baseUrl}}'],
                path: ['api', 'users', 'with-roles']
              }
            },
            response: []
          },
          {
            name: 'Assign Role',
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{authToken}}' }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({ role: 'manager' }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/api/users/:userId/roles',
                host: ['{{baseUrl}}'],
                path: ['api', 'users', ':userId', 'roles'],
                variable: [{ key: 'userId', value: '1' }]
              }
            },
            response: []
          },
          {
            name: 'Remove Role',
            request: {
              method: 'DELETE',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/users/roles/:roleId',
                host: ['{{baseUrl}}'],
                path: ['api', 'users', 'roles', ':roleId'],
                variable: [{ key: 'roleId', value: '1' }]
              }
            },
            response: []
          }
        ]
      },
      {
        name: 'Employees',
        item: [
          {
            name: 'Get All Employees',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/employees',
                host: ['{{baseUrl}}'],
                path: ['api', 'employees']
              }
            },
            response: []
          },
          {
            name: 'Get Employee by ID',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/employees/:id',
                host: ['{{baseUrl}}'],
                path: ['api', 'employees', ':id'],
                variable: [{ key: 'id', value: '1' }]
              }
            },
            response: []
          },
          {
            name: 'Get Departments',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/employees/departments',
                host: ['{{baseUrl}}'],
                path: ['api', 'employees', 'departments']
              }
            },
            response: []
          },
          {
            name: 'Create Employee',
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{authToken}}' }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  full_name: 'Jane Smith',
                  email: 'jane@example.com',
                  phone: '+1234567890',
                  department: 'Marketing',
                  position: 'Marketing Manager',
                  status: 'Active'
                }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/api/employees',
                host: ['{{baseUrl}}'],
                path: ['api', 'employees']
              }
            },
            response: []
          }
        ]
      },
      {
        name: 'Leaves',
        item: [
          {
            name: 'Get All Leaves',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/leaves?status=Pending',
                host: ['{{baseUrl}}'],
                path: ['api', 'leaves'],
                query: [{ key: 'status', value: 'Pending' }]
              }
            },
            response: []
          },
          {
            name: 'Get User Leaves',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/leaves/user/:userId',
                host: ['{{baseUrl}}'],
                path: ['api', 'leaves', 'user', ':userId'],
                variable: [{ key: 'userId', value: '1' }]
              }
            },
            response: []
          },
          {
            name: 'Create Leave Request',
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{authToken}}' }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  leave_type: 'Annual Leave',
                  start_date: '2024-01-15',
                  end_date: '2024-01-20',
                  days: 5,
                  reason: 'Family vacation',
                  manager_id: 2
                }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/api/leaves',
                host: ['{{baseUrl}}'],
                path: ['api', 'leaves']
              }
            },
            response: []
          },
          {
            name: 'Approve/Reject Leave',
            request: {
              method: 'PATCH',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{authToken}}' }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  status: 'Approved',
                  comment: 'Approved - enjoy your vacation'
                }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/api/leaves/:leaveId',
                host: ['{{baseUrl}}'],
                path: ['api', 'leaves', ':leaveId'],
                variable: [{ key: 'leaveId', value: '1' }]
              }
            },
            response: []
          },
          {
            name: 'Get Leave Balances',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/leaves/balances/:userId?year=2024',
                host: ['{{baseUrl}}'],
                path: ['api', 'leaves', 'balances', ':userId'],
                query: [{ key: 'year', value: '2024' }],
                variable: [{ key: 'userId', value: '1' }]
              }
            },
            response: []
          }
        ]
      },
      {
        name: 'Attendance',
        item: [
          {
            name: 'Get Attendance Records',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/attendance?userId=1&month=1&year=2024',
                host: ['{{baseUrl}}'],
                path: ['api', 'attendance'],
                query: [
                  { key: 'userId', value: '1' },
                  { key: 'month', value: '1' },
                  { key: 'year', value: '2024' }
                ]
              }
            },
            response: []
          },
          {
            name: 'Get Today Attendance',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/attendance/today?userId=1',
                host: ['{{baseUrl}}'],
                path: ['api', 'attendance', 'today'],
                query: [{ key: 'userId', value: '1' }]
              }
            },
            response: []
          },
          {
            name: 'Check In',
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{authToken}}' }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  userId: 1,
                  notes: 'Working from office'
                }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/api/attendance/checkin',
                host: ['{{baseUrl}}'],
                path: ['api', 'attendance', 'checkin']
              }
            },
            response: []
          },
          {
            name: 'Check Out',
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{authToken}}' }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({ userId: 1 }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/api/attendance/checkout',
                host: ['{{baseUrl}}'],
                path: ['api', 'attendance', 'checkout']
              }
            },
            response: []
          }
        ]
      },
      {
        name: 'Holidays',
        item: [
          {
            name: 'Get All Holidays',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/holidays?year=2024',
                host: ['{{baseUrl}}'],
                path: ['api', 'holidays'],
                query: [{ key: 'year', value: '2024' }]
              }
            },
            response: []
          },
          {
            name: 'Create Holiday',
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{authToken}}' }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  name: "New Year's Day",
                  date: '2024-01-01',
                  type: 'public',
                  description: 'Public holiday for New Year'
                }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/api/holidays',
                host: ['{{baseUrl}}'],
                path: ['api', 'holidays']
              }
            },
            response: []
          }
        ]
      },
      {
        name: 'Notifications',
        item: [
          {
            name: 'Get Notifications',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/notifications?userId=1&limit=50',
                host: ['{{baseUrl}}'],
                path: ['api', 'notifications'],
                query: [
                  { key: 'userId', value: '1' },
                  { key: 'limit', value: '50' }
                ]
              }
            },
            response: []
          },
          {
            name: 'Mark as Read',
            request: {
              method: 'PATCH',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/notifications/:id/read',
                host: ['{{baseUrl}}'],
                path: ['api', 'notifications', ':id', 'read'],
                variable: [{ key: 'id', value: '1' }]
              }
            },
            response: []
          },
          {
            name: 'Mark All as Read',
            request: {
              method: 'PATCH',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{authToken}}' }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({ userId: 1 }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/api/notifications/read-all',
                host: ['{{baseUrl}}'],
                path: ['api', 'notifications', 'read-all']
              }
            },
            response: []
          }
        ]
      },
      {
        name: 'Payslips',
        item: [
          {
            name: 'Get User Payslips',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/payslips/user/:userId?year=2024',
                host: ['{{baseUrl}}'],
                path: ['api', 'payslips', 'user', ':userId'],
                query: [{ key: 'year', value: '2024' }],
                variable: [{ key: 'userId', value: '1' }]
              }
            },
            response: []
          },
          {
            name: 'Create Payslip',
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{authToken}}' }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  employee_id: 1,
                  month: 'January',
                  year: 2024,
                  basic_salary: 5000,
                  allowances: 1000,
                  deductions: 500,
                  net_salary: 5500
                }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/api/payslips',
                host: ['{{baseUrl}}'],
                path: ['api', 'payslips']
              }
            },
            response: []
          }
        ]
      },
      {
        name: 'Dashboard',
        item: [
          {
            name: 'Get Dashboard Stats',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/dashboard/stats',
                host: ['{{baseUrl}}'],
                path: ['api', 'dashboard', 'stats']
              }
            },
            response: []
          },
          {
            name: 'Get Recent Leaves',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
              url: {
                raw: '{{baseUrl}}/api/dashboard/recent-leaves?limit=10',
                host: ['{{baseUrl}}'],
                path: ['api', 'dashboard', 'recent-leaves'],
                query: [{ key: 'limit', value: '10' }]
              }
            },
            response: []
          }
        ]
      }
    ]
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="HRMS_API_Collection.postman_collection.json"');
  res.json(postmanCollection);
});

module.exports = router;
