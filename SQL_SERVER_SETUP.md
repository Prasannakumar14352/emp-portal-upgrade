
# SQL Server Database Setup Guide

## Overview

This application now uses SQL Server as the primary database. All Supabase-related code has been removed and replaced with SQL Server backend integration.

## Architecture

```
Frontend (Vite + React + TypeScript)
         ↓
   API Layer (Express.js)
         ↓
   SQL Server Database
```

## Prerequisites

1. **SQL Server Instance**
   - SQL Server 2016 or later
   - SQL Server Express (free) or higher editions
   - Network access to the database server

2. **Node.js Backend**
   - Node.js 16+ installed
   - npm or yarn package manager

## Database Configuration

### 1. Environment Variables

Create or update `.env` files in both frontend and backend:

**Frontend `.env`:**
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

**Backend `.env`:**
```env
# Server Configuration
PORT=4000
NODE_ENV=development

# SQL Server Configuration
DB_SERVER=localhost
DB_DATABASE=HRMS_DB
DB_USER=your_username
DB_PASSWORD=your_password
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# OAuth Configuration (optional)
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# File Upload Configuration
UPLOAD_PATH=\\\\network-share\\avatars
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp
```

### 2. Database Schema Setup

The complete database schema is available in `backend/database/schema.sql`. Run this script to create all necessary tables, views, procedures, and triggers.

**Key Tables:**
- `Users` - Employee and user information
- `Departments` - Department management
- `Leaves` - Leave requests and approvals
- `Attendance` - Check-in/check-out records
- `Holidays` - Public holidays
- `LeaveTypes` - Leave type configurations
- `Payslips` - Payslip management
- `Notifications` - User notifications
- `Sessions` - Active user sessions
- `UserPreferences` - User-specific settings

### 3. Database Connection

The backend uses the `mssql` package for SQL Server connectivity. Connection configuration is in `backend/config/database.js`.

**Connection Pool Settings:**
```javascript
{
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
}
```

## Running the Application

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
npm install
```

### 2. Setup Database

```bash
# Connect to SQL Server and run the schema
sqlcmd -S localhost -U your_username -P your_password -d HRMS_DB -i backend/database/schema.sql
```

### 3. Start the Backend Server

```bash
cd backend
npm start
```

The backend server will start on `http://localhost:4000`

### 4. Start the Frontend

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## API Endpoints

All API endpoints are available through the backend server. See `backend/README.md` for detailed API documentation.

### Main Endpoint Categories:

- **Authentication**: `/api/auth/*`
- **Users**: `/api/users/*`
- **Departments**: `/api/departments/*`
- **Leaves**: `/api/leaves/*`
- **Attendance**: `/api/attendance/*`
- **Holidays**: `/api/holidays/*`
- **Payslips**: `/api/payslips/*`
- **Notifications**: `/api/notifications/*`
- **Statistics**: `/api/statistics/*`

## Real-Time Features

The application uses **SignalR** for real-time notifications instead of Supabase Realtime:

- Leave approval/rejection notifications
- Attendance reminders
- System notifications
- Live dashboard updates

SignalR connection is established automatically when users log in.

## Authentication

The application uses **JWT (JSON Web Tokens)** for authentication:

1. User logs in with credentials
2. Backend validates and returns JWT token
3. Token is stored in localStorage
4. All subsequent API requests include the token in Authorization header
5. Backend validates token on each request

### OAuth Integration

Azure AD OAuth is supported for enterprise single sign-on. Configure the Azure AD credentials in the backend `.env` file.

## File Uploads (Avatars)

Avatar uploads are stored on a network share:

1. Configure `UPLOAD_PATH` in backend `.env`
2. Ensure the backend server has write access to the network share
3. See `backend/NETWORK_SHARE_SETUP.md` for detailed configuration

## Database Migrations

All migration scripts are in `backend/database/`:

- `schema.sql` - Initial database schema
- `*.sql` - Feature-specific migrations (2FA, notifications, etc.)

Run migrations in order to update the database schema.

## Security Features

1. **JWT Token Authentication** - Secure token-based auth
2. **Password Hashing** - bcrypt with salt rounds
3. **Two-Factor Authentication** - TOTP-based 2FA
4. **Role-Based Access Control** - Admin, Manager, Employee roles
5. **Session Management** - Active session tracking
6. **SQL Injection Prevention** - Parameterized queries
7. **XSS Protection** - Input sanitization

## Monitoring and Logging

- Backend logs are stored in `backend/logs/`
- All API requests are logged with timestamp and user info
- Error tracking for database connection issues
- Performance monitoring for slow queries

## Testing

Use Postman or similar tools to test API endpoints:

1. Import the Postman collection from `backend/HRMS_API_Collection.postman_collection.json`
2. Set environment variables (base URL, auth token)
3. Test all endpoints

## Troubleshooting

### Database Connection Issues

1. Verify SQL Server is running: `sqlcmd -S localhost -U username -P password`
2. Check firewall rules for port 1433
3. Verify credentials in `.env` file
4. Check SQL Server error logs

### Authentication Issues

1. Clear browser localStorage
2. Verify JWT_SECRET is set in backend `.env`
3. Check token expiration settings
4. Verify user exists in database

### API Connection Issues

1. Verify backend server is running on port 4000
2. Check CORS settings in `backend/server.js`
3. Verify `VITE_API_BASE_URL` in frontend `.env`
4. Check network connectivity

## Production Deployment

### Backend

1. Set `NODE_ENV=production`
2. Use strong JWT_SECRET
3. Enable SSL/TLS for database connections
4. Configure proper CORS origins
5. Set up process manager (PM2)
6. Enable logging and monitoring

### Frontend

1. Build production bundle: `npm run build`
2. Deploy to web server (Nginx, Apache, etc.)
3. Configure environment variables
4. Enable HTTPS

### Database

1. Use SQL Server Standard or Enterprise edition
2. Enable backup and recovery
3. Set up maintenance plans
4. Monitor performance metrics
5. Implement security best practices

## Support

For issues or questions:
- Check `backend/README.md` for API documentation
- Review `backend/API_TESTING_GUIDE.md` for testing procedures
- Consult `SETUP_GUIDE.md` for general setup information
- Check database logs for SQL Server issues

## Migration from Supabase

All Supabase functionality has been replaced:

| Supabase Feature | SQL Server Replacement |
|------------------|------------------------|
| Realtime subscriptions | SignalR |
| Authentication | JWT + bcrypt |
| Row Level Security | Role-based middleware |
| Edge Functions | Express.js routes |
| Storage | Network share + file system |
| Database | SQL Server |

No Supabase code or dependencies remain in the application.
