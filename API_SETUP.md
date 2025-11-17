# API Configuration Guide

This application can work with either a local backend API or Lovable Cloud (Supabase).

## Switching Between Local and Cloud

Edit `src/config/api.ts` and change the `mode` property:

```typescript
export const API_CONFIG = {
  mode: 'local',  // or 'cloud'
  // ...
};
```

## Local Backend Setup

### 1. Backend API Requirements

Your local backend should implement the following REST API endpoints:

#### Authentication Endpoints
- `POST /api/auth/signup` - Create new user account
  ```json
  Request: { "email": "string", "password": "string", "full_name": "string" }
  Response: { "session": {...}, "user": {...} }
  ```

- `POST /api/auth/login` - User login
  ```json
  Request: { "email": "string", "password": "string" }
  Response: { "session": {...}, "user": {...} }
  ```

- `POST /api/auth/logout` - User logout
  ```json
  Headers: { "Authorization": "Bearer <token>" }
  ```

- `GET /api/auth/session` - Get current session
  ```json
  Headers: { "Authorization": "Bearer <token>" }
  Response: { "session": {...} }
  ```

- `POST /api/auth/refresh` - Refresh access token
  ```json
  Request: { "refresh_token": "string" }
  Response: { "session": {...} }
  ```

- `POST /api/auth/oauth/:provider` - OAuth login (azure for Microsoft)
  ```json
  Request: { "redirect_to": "string" }
  Response: { "url": "string" }
  ```

#### User Endpoints
- `GET /api/users/:userId/role` - Get user role
  ```json
  Response: { "role": "employee" | "hr" | "manager" }
  ```

- `GET /api/users/:userId/profile` - Get user profile
  ```json
  Response: { "id": "string", "email": "string", "full_name": "string", ... }
  ```

- `PATCH /api/users/:userId/profile` - Update user profile
  ```json
  Request: { "full_name": "string", "phone": "string", ... }
  ```

- `GET /api/users` - Get all users (HR/Manager only)
  ```json
  Response: [{ "id": "string", "email": "string", ... }]
  ```

#### Leave Endpoints
- `GET /api/leaves/user/:userId` - Get user's leave requests
- `GET /api/leaves` - Get all leave requests (HR/Manager only)
- `GET /api/leaves?status=Pending` - Get filtered leaves
- `POST /api/leaves` - Create new leave request
  ```json
  Request: {
    "leave_type": "string",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "days": number,
    "reason": "string"
  }
  ```

- `PATCH /api/leaves/:leaveId` - Update leave status
  ```json
  Request: {
    "status": "Approved" | "Rejected",
    "approved_by": "string"
  }
  ```

- `GET /api/leaves/balances/:userId` - Get leave balances
- `POST /api/leaves/:leaveId/comments` - Add comment to leave
- `GET /api/leaves/:leaveId/comments` - Get leave comments

#### Notification Endpoints
- `POST /api/notifications/leave` - Send leave notification email
  ```json
  Request: {
    "to": "string",
    "employeeName": "string",
    "leaveType": "string",
    "startDate": "string",
    "endDate": "string",
    "days": number,
    "status": "approved" | "rejected",
    "reason": "string",
    "comments": "string"
  }
  ```

### 2. Authentication Flow

The application stores authentication tokens in localStorage:
- `auth_token` - Access token (JWT)
- `refresh_token` - Refresh token
- `user` - User object (JSON)

All authenticated requests include the header:
```
Authorization: Bearer <auth_token>
```

### 3. CORS Configuration

Your backend must allow CORS from your frontend origin:
```
Access-Control-Allow-Origin: http://localhost:8080
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### 4. Example Backend Structures

#### Node.js/Express Example
```javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true
}));

app.use(express.json());

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  // Implement login logic
});

// Protected routes
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  // Verify token
  next();
};

app.get('/api/leaves/user/:userId', authMiddleware, async (req, res) => {
  // Fetch user leaves from SQL Server
});

app.listen(3000);
```

### 5. Database Integration

Connect your backend to your local SQL Server:

```javascript
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

const pool = await sql.connect(config);
```

### 6. Testing the Setup

1. Start your local backend on port 3000
2. Set `mode: 'local'` in `src/config/api.ts`
3. Start the frontend: `npm run dev`
4. Try logging in - check browser console for API calls

## Switching Back to Cloud

1. Set `mode: 'cloud'` in `src/config/api.ts`
2. The app will use Lovable Cloud (Supabase) automatically

## Troubleshooting

### Common Issues

1. **CORS errors**: Ensure your backend has proper CORS configuration
2. **401 Unauthorized**: Check if tokens are being sent correctly
3. **Connection refused**: Verify backend is running on correct port
4. **API not found**: Ensure all required endpoints are implemented

### Debug Mode

Open browser DevTools → Network tab to inspect API calls and responses.
