# Employee Portal - Complete Setup Guide

This guide will walk you through setting up both the frontend and backend for local development.

## Prerequisites

Before starting, ensure you have installed:
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **SQL Server** (2019 or higher) - [Download](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
- **SQL Server Management Studio (SSMS)** - [Download](https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms)
- **Git** (optional, for version control)

---

## Part 1: Database Setup

### Step 1: Create Database

1. Open **SQL Server Management Studio (SSMS)**
2. Connect to your SQL Server instance
3. Create a new database:
   ```sql
   CREATE DATABASE EmployeePortal;
   GO
   USE EmployeePortal;
   ```

### Step 2: Run Database Schema

1. In SSMS, click **File > Open > File**
2. Navigate to `backend/database/schema.sql`
3. Execute the script (press **F5** or click **Execute**)
4. Verify tables were created:
   ```sql
   SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES;
   ```

You should see these tables:
- users
- user_roles
- employees
- holidays
- leaves
- leave_balances
- leave_comments
- payslips

### Step 3: Create Test User (Optional)

Create a test HR user for initial login:

```sql
-- Note: You'll need to sign up through the app first to get a properly hashed password
-- This is just for reference
```

---

## Part 2: Backend Setup

### Step 1: Install Dependencies

Open a terminal in the project root:

```bash
cd backend
npm install
```

This installs all required packages:
- express (web server)
- mssql (SQL Server driver)
- bcrypt (password hashing)
- jsonwebtoken (authentication)
- cors (cross-origin requests)
- nodemailer (email notifications)
- dotenv (environment variables)

### Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `backend/.env` with your settings:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration - IMPORTANT: Update these!
SQL_SERVER_HOST=localhost
SQL_SERVER_USER=your_sql_username
SQL_SERVER_PASSWORD=your_sql_password
SQL_SERVER_DATABASE=EmployeePortal
SQL_SERVER_PORT=1433

# JWT Configuration - IMPORTANT: Change in production!
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-at-least-32-characters-long
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Azure AD OAuth (Optional - for Microsoft login)
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_REDIRECT_URI=http://localhost:3000/api/auth/oauth/callback/azure

# Frontend URL
FRONTEND_URL=http://localhost:8080
```

#### Important Notes:

**Database Credentials:**
- Replace `your_sql_username` and `your_sql_password` with your SQL Server credentials
- If using Windows Authentication, use `Trusted_Connection=true` instead

**JWT Secrets:**
- Generate secure random strings (at least 32 characters)
- You can use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- NEVER use the example secrets in production!

**Email Configuration (Optional):**
- For Gmail, you need to create an [App Password](https://support.google.com/accounts/answer/185833)
- Not required for basic functionality, only for email notifications

### Step 3: Test Database Connection

Create a test file `backend/test-connection.js`:

```javascript
require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  server: process.env.SQL_SERVER_HOST,
  database: process.env.SQL_SERVER_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

async function testConnection() {
  try {
    await sql.connect(config);
    console.log('✅ Database connection successful!');
    const result = await sql.query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES');
    console.log('Tables found:', result.recordset.length);
    sql.close();
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  }
}

testConnection();
```

Run the test:
```bash
node test-connection.js
```

### Step 4: Start Backend Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

You should see:
```
Server running on http://localhost:3000
Environment: development
CORS enabled for: http://localhost:8080
Connected to SQL Server database
```

### Step 5: Test Backend API

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{"status":"ok","message":"Backend server is running"}
```

---

## Part 3: Frontend Setup

### Step 1: Install Frontend Dependencies

Open a new terminal in the project root:

```bash
npm install
```

### Step 2: Configure API Mode

Edit `src/config/api.ts`:

```typescript
export const API_CONFIG = {
  // Set to 'local' to use your local backend
  mode: 'local' as 'local' | 'cloud',
  
  local: {
    baseURL: 'http://localhost:3000/api',
  },
  
  // ... rest of config
};
```

Make sure `mode` is set to `'local'`.

### Step 3: Start Frontend Development Server

```bash
npm run dev
```

The frontend will start on `http://localhost:8080`

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
```

---

## Part 4: Testing the Application

### Step 1: Open the Application

1. Open your browser and navigate to: `http://localhost:8080`
2. You should see the login page

### Step 2: Create an Account

1. Click on the **Sign Up** tab
2. Fill in the form:
   - Email: `admin@company.com`
   - Password: `SecurePassword123` (minimum 12 characters, must include uppercase, lowercase, and number)
   - Full Name: `Test Admin`
3. Click **Sign Up**
4. You should be redirected to the dashboard

### Step 3: Verify User in Database

In SSMS, check if the user was created:

```sql
SELECT u.id, u.email, u.full_name, ur.role
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.employee_id;
```

### Step 4: Upgrade User to HR Role

To access HR features, upgrade your user:

```sql
-- Find your user ID first
SELECT id, email FROM users WHERE email = 'admin@company.com';

-- Update role to HR (replace employee_id with the actual ID)
UPDATE user_roles
SET role = 'hr'
WHERE employee_id = 'YOUR_employee_id_HERE';
```

Refresh the page to see HR menu items.

### Step 5: Test Core Features

**Test Leave Request:**
1. Navigate to **Leaves** (sidebar)
2. Click **Apply for Leave**
3. Fill in the form and submit
4. Check database: `SELECT * FROM leaves;`

**Test Leave Approval (as HR):**
1. Navigate to **Approve Leaves** (sidebar)
2. You should see pending requests
3. Approve or reject a request
4. Verify in database: `SELECT * FROM leaves WHERE status = 'Approved';`

**Test Employees:**
1. Navigate to **Employees**
2. You should see the employee list
3. Search and filter employees

---

## Part 5: Troubleshooting

### Backend Issues

**Error: "Login failed for user"**
- Check SQL Server credentials in `.env`
- Verify SQL Server is running
- For Windows Auth, try: `user: ''` and use `Trusted_Connection=true`

**Error: "Port 3000 already in use"**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

**Database connection timeout**
- Check SQL Server is configured to accept TCP/IP connections
- Enable TCP/IP in SQL Server Configuration Manager
- Restart SQL Server service

### Frontend Issues

**CORS Error**
- Verify backend is running on port 3000
- Check `FRONTEND_URL` in backend `.env` matches frontend URL
- Clear browser cache and reload

**"Network Error" or "Failed to fetch"**
- Verify backend is running: `curl http://localhost:3000/api/health`
- Check browser console for specific error
- Verify `src/config/api.ts` mode is set to `'local'`

**Login not working**
- Check browser Network tab for API responses
- Verify JWT_SECRET is set in backend `.env`
- Check backend console for errors

### Email Issues

**Emails not sending**
- SMTP configuration is optional - app works without it
- For Gmail, use App Password, not regular password
- Check firewall isn't blocking port 587

---

## Part 6: Development Workflow

### Running Both Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Making Changes

**Backend Changes:**
- Edit files in `backend/routes/` or `backend/`
- nodemon will auto-reload the server
- No need to restart manually

**Frontend Changes:**
- Edit files in `src/`
- Vite will auto-reload the browser
- Changes appear instantly

### Stopping Servers

Press `Ctrl+C` in each terminal

---

## Part 7: Production Deployment

### Backend Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use strong JWT secrets (generate new ones)
3. Enable HTTPS/SSL
4. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name employee-portal-api
   ```

### Frontend Deployment

1. Build for production:
   ```bash
   npm run build
   ```
2. Deploy the `dist/` folder to a web server (Netlify, Vercel, etc.)
3. Update `src/config/api.ts` with production backend URL

### Database Security

- Use strong passwords
- Enable SSL/TLS for database connections
- Restrict database access to application server only
- Regular backups
- Keep SQL Server updated

---

## Quick Reference

### Backend Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Health check |
| `/api/auth/signup` | POST | No | Create account |
| `/api/auth/login` | POST | No | User login |
| `/api/auth/logout` | POST | Yes | User logout |
| `/api/users/:id/profile` | GET | Yes | Get profile |
| `/api/leaves` | GET | Yes | Get leaves |
| `/api/leaves` | POST | Yes | Create leave |
| `/api/employees` | GET | Yes | Get employees |
| `/api/holidays` | GET | Yes | Get holidays |
| `/api/payslips/user/:id` | GET | Yes | Get payslips |

### Default Ports

- **Frontend:** http://localhost:8080
- **Backend:** http://localhost:3000
- **SQL Server:** localhost:1433

### Useful Commands

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build production
npm run build

# Test backend connection
curl http://localhost:3000/api/health

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Next Steps

1. ✅ Set up database
2. ✅ Configure backend
3. ✅ Configure frontend
4. ✅ Create test user
5. ✅ Test features
6. 📝 Customize for your needs
7. 🚀 Deploy to production

For more help, check:
- `backend/README.md` - Backend documentation
- `API_SETUP.md` - API configuration guide
- SQL Server logs in SSMS
- Browser DevTools console and Network tab

---

## Support

Having issues? Check:
1. Both servers are running
2. Database connection works
3. `.env` is configured correctly
4. Browser console for errors
5. Backend terminal for errors
