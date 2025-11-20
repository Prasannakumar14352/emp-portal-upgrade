# Employee Portal Backend

Local Node.js/Express backend server for the Employee Portal application.

## Features

- **Authentication**: JWT-based authentication with refresh tokens
- **User Management**: Profile management and role-based access control
- **Leave Management**: Leave requests, approvals, and balance tracking
- **Notifications**: Email notifications for leave status updates
- **SQL Server Integration**: Direct connection to local SQL Server database

## Prerequisites

- Node.js 16+ and npm
- SQL Server (local or remote)
- SMTP server for email notifications (optional)

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create `.env` file from example:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
   - Database credentials
   - JWT secrets
   - SMTP settings (for emails)
   - Azure AD credentials (for OAuth)

## Database Setup

Create the required SQL Server tables:

```sql
-- Users table
CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(100) NOT NULL,
    phone NVARCHAR(20),
    department NVARCHAR(100),
    position NVARCHAR(100),
    avatar_url NVARCHAR(500),
    hire_date DATE,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- User roles table
CREATE TABLE user_roles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    employee_id UNIQUEIDENTIFIER NOT NULL,
    role NVARCHAR(20) NOT NULL CHECK (role IN ('employee', 'hr', 'manager')),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Leaves table
CREATE TABLE leaves (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    employee_id UNIQUEIDENTIFIER NOT NULL,
    leave_type NVARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INT NOT NULL,
    reason NVARCHAR(500) NOT NULL,
    status NVARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approved_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Leave balances table
CREATE TABLE leave_balances (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    employee_id UNIQUEIDENTIFIER NOT NULL,
    year INT NOT NULL,
    leave_type NVARCHAR(50) NOT NULL,
    total_days INT DEFAULT 0,
    used_days INT DEFAULT 0,
    remaining_days INT DEFAULT 0,
    carry_forward_days INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (employee_id, year, leave_type)
);

-- Leave comments table
CREATE TABLE leave_comments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    leave_id UNIQUEIDENTIFIER NOT NULL,
    employee_id UNIQUEIDENTIFIER NOT NULL,
    comment NVARCHAR(1000) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (leave_id) REFERENCES leaves(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES users(id)
);
```

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000` by default.

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/session` - Get current session
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/oauth/:provider` - OAuth login

### Users
- `GET /api/users/:userId/role` - Get user role
- `GET /api/users/:userId/profile` - Get user profile
- `PATCH /api/users/:userId/profile` - Update user profile
- `GET /api/users` - Get all users (HR/Manager only)

### Leaves
- `GET /api/leaves/user/:userId` - Get user's leave requests
- `GET /api/leaves` - Get all leaves (HR/Manager only)
- `POST /api/leaves` - Create leave request
- `PATCH /api/leaves/:leaveId` - Update leave status (HR/Manager)
- `GET /api/leaves/balances/:userId` - Get leave balances
- `POST /api/leaves/:leaveId/comments` - Add comment
- `GET /api/leaves/:leaveId/comments` - Get comments

### Notifications
- `POST /api/notifications/leave` - Send leave notification email

## Security

- JWT tokens for authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Input validation with express-validator
- CORS protection

## Testing

Test the API health:
```bash
curl http://localhost:3000/api/health
```

Test authentication:
```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123","full_name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}'
```

## Troubleshooting

1. **Database connection errors**: 
   - Verify SQL Server is running
   - Check credentials in `.env`
   - Ensure SQL Server accepts TCP/IP connections

2. **CORS errors**:
   - Verify `FRONTEND_URL` in `.env` matches your frontend URL
   - Check browser console for specific CORS issues

3. **Email not sending**:
   - Verify SMTP credentials
   - Check firewall settings
   - For Gmail, use App Passwords instead of regular password

## Development

The backend uses:
- Express.js for HTTP server
- mssql for SQL Server connectivity
- jsonwebtoken for JWT authentication
- bcrypt for password hashing
- nodemailer for email sending
- express-validator for input validation
