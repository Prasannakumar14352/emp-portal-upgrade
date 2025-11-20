const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HRMS API Documentation',
      version: '1.0.0',
      description: `
# HRMS API Documentation

Complete API documentation for the Employee Portal HRMS system.

## 🔐 Authentication Guide

Most endpoints require authentication. Follow these steps to test:

1. **Login First**: Use the \`POST /api/auth/login\` endpoint
   - Email: \`user@example.com\`
   - Password: \`password123\`
   
2. **Get Your Token**: Copy the \`token\` from the response

3. **Authorize**: Click the 🔒 **Authorize** button at the top right

4. **Enter Token**: Paste your token (no need to add "Bearer", it's automatic)

5. **Test Endpoints**: Now you can test all protected endpoints!

## 📝 Note
The Swagger documentation shows endpoints without authentication requirements for documentation purposes, but the actual API enforces authentication. Always authorize first before testing.
      `,
      contact: {
        name: 'API Support',
        email: 'support@hrms.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server (Port 5000)'
      },
      {
        url: 'http://localhost:3000',
        description: 'Alternative development server (Port 3000)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization - Enter your JWT token from the login response'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            full_name: {
              type: 'string',
              description: 'Full name of the user'
            },
            phone: {
              type: 'string',
              description: 'Phone number'
            },
            department: {
              type: 'string',
              description: 'Department name'
            },
            position: {
              type: 'string',
              description: 'Job position'
            },
            avatar_url: {
              type: 'string',
              description: 'Profile picture URL'
            },
            hire_date: {
              type: 'string',
              format: 'date',
              description: 'Date of hire'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'password123'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT access token'
            },
            refresh_token: {
              type: 'string',
              description: 'JWT refresh token'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        Leave: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Leave request ID'
            },
            employee_id: {
              type: 'integer',
              description: 'User ID who requested the leave'
            },
            leave_type: {
              type: 'string',
              description: 'Type of leave',
              enum: ['Annual Leave', 'Sick Leave', 'Casual Leave', 'Maternity Leave', 'Paternity Leave']
            },
            start_date: {
              type: 'string',
              format: 'date',
              description: 'Leave start date'
            },
            end_date: {
              type: 'string',
              format: 'date',
              description: 'Leave end date'
            },
            days: {
              type: 'integer',
              description: 'Number of days'
            },
            reason: {
              type: 'string',
              description: 'Reason for leave'
            },
            status: {
              type: 'string',
              enum: ['Pending', 'Manager Approved', 'Approved', 'Rejected'],
              description: 'Leave status'
            },
            approved_by: {
              type: 'integer',
              description: 'ID of user who approved'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        LeaveRequest: {
          type: 'object',
          required: ['leave_type', 'start_date', 'end_date', 'days', 'reason'],
          properties: {
            leave_type: {
              type: 'string',
              example: 'Annual Leave'
            },
            start_date: {
              type: 'string',
              format: 'date',
              example: '2024-01-15'
            },
            end_date: {
              type: 'string',
              format: 'date',
              example: '2024-01-20'
            },
            days: {
              type: 'integer',
              example: 5
            },
            reason: {
              type: 'string',
              example: 'Family vacation'
            },
            manager_id: {
              type: 'integer',
              example: 2
            },
            cc_emails: {
              type: 'array',
              items: {
                type: 'string',
                format: 'email'
              },
              example: ['manager@example.com']
            }
          }
        },
        Employee: {
          type: 'object',
          properties: {
            id: {
              type: 'integer'
            },
            employee_id: {
              type: 'integer'
            },
            full_name: {
              type: 'string'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            phone: {
              type: 'string'
            },
            department: {
              type: 'string'
            },
            position: {
              type: 'string'
            },
            status: {
              type: 'string',
              enum: ['Active', 'Inactive', 'On Leave']
            },
            roles: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['employee', 'manager', 'hr']
              }
            }
          }
        },
        Attendance: {
          type: 'object',
          properties: {
            id: {
              type: 'integer'
            },
            employee_id: {
              type: 'integer'
            },
            date: {
              type: 'string',
              format: 'date'
            },
            check_in_time: {
              type: 'string',
              format: 'date-time'
            },
            check_out_time: {
              type: 'string',
              format: 'date-time'
            },
            work_hours: {
              type: 'number',
              format: 'float'
            },
            status: {
              type: 'string',
              enum: ['present', 'absent', 'late', 'half-day']
            },
            notes: {
              type: 'string'
            }
          }
        },
        Holiday: {
          type: 'object',
          properties: {
            id: {
              type: 'integer'
            },
            name: {
              type: 'string'
            },
            date: {
              type: 'string',
              format: 'date'
            },
            type: {
              type: 'string',
              enum: ['public', 'optional', 'restricted']
            },
            description: {
              type: 'string'
            }
          }
        },
        LeaveBalance: {
          type: 'object',
          properties: {
            id: {
              type: 'integer'
            },
            employee_id: {
              type: 'integer'
            },
            year: {
              type: 'integer'
            },
            leave_type: {
              type: 'string'
            },
            total_days: {
              type: 'number'
            },
            used_days: {
              type: 'number'
            },
            remaining_days: {
              type: 'number'
            },
            carry_forward_days: {
              type: 'number'
            }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            id: {
              type: 'integer'
            },
            employee_id: {
              type: 'integer'
            },
            title: {
              type: 'string'
            },
            message: {
              type: 'string'
            },
            type: {
              type: 'string',
              enum: ['info', 'success', 'warning', 'error']
            },
            is_read: {
              type: 'boolean'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Payslip: {
          type: 'object',
          properties: {
            id: {
              type: 'integer'
            },
            employee_id: {
              type: 'integer'
            },
            month: {
              type: 'string'
            },
            year: {
              type: 'integer'
            },
            basic_salary: {
              type: 'number'
            },
            allowances: {
              type: 'number'
            },
            deductions: {
              type: 'number'
            },
            net_salary: {
              type: 'number'
            },
            file_url: {
              type: 'string'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Users',
        description: 'User management and profile operations'
      },
      {
        name: 'Employees',
        description: 'Employee records and management'
      },
      {
        name: 'Leaves',
        description: 'Leave request management and approval workflow'
      },
      {
        name: 'Attendance',
        description: 'Attendance tracking and analytics'
      },
      {
        name: 'Holidays',
        description: 'Company holidays management'
      },
      {
        name: 'Leave Types',
        description: 'Leave type configuration'
      },
      {
        name: 'Notifications',
        description: 'User notifications system'
      },
      {
        name: 'Payslips',
        description: 'Employee payslip management'
      },
      {
        name: 'Dashboard',
        description: 'Dashboard statistics and data'
      },
      {
        name: 'Statistics',
        description: 'Analytics and reporting'
      }
    ]
  },
  apis: ['./routes/*.js', './routes/*.swagger.js'] // Path to the API routes and swagger docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
