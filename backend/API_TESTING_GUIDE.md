# Backend API Testing Guide

Complete documentation for testing all backend API endpoints with sample requests and expected responses.

## Base URL

```
Local Development: http://localhost:3000/api
```

## Authentication

Most endpoints require authentication. After logging in, include the access token in the Authorization header:

```bash
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 1. Authentication Routes

### 1.1 Sign Up

Create a new user account.

**Endpoint:** `POST /auth/signup`

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "john.doe@company.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@company.com",
    "password": "SecurePass123!",
    "full_name": "John Doe"
  }'
```

**Success Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "john.doe@company.com",
    "full_name": "John Doe",
    "role": "employee"
  }
}
```

---

### 1.2 Login

Authenticate with email and password.

**Endpoint:** `POST /auth/login`

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "john.doe@company.com",
  "password": "SecurePass123!"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@company.com",
    "password": "SecurePass123!"
  }'
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "john.doe@company.com",
    "full_name": "John Doe",
    "role": "employee"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

### 1.3 Get Session

Get current user session information.

**Endpoint:** `GET /auth/session`

**Authentication:** Required

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/auth/session \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
{
  "user": {
    "id": 1,
    "email": "john.doe@company.com",
    "full_name": "John Doe",
    "department": "Engineering",
    "position": "Software Developer",
    "role": "employee"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.4 Refresh Token

Get new access token using refresh token.

**Endpoint:** `POST /auth/refresh`

**Authentication:** Not required (uses refresh token)

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "john.doe@company.com",
    "role": "employee"
  }
}
```

---

### 1.5 Microsoft OAuth - Initiate

Get Microsoft OAuth authorization URL.

**Endpoint:** `GET /auth/oauth/azure`

**Authentication:** Not required

**Query Parameters:**
- `state` (optional): Frontend redirect URL

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/auth/oauth/azure?state=http://localhost:5173"
```

**Success Response (200):**
```json
{
  "url": "https://login.microsoftonline.com/TENANT_ID/oauth2/v2.0/authorize?..."
}
```

---

### 1.6 Logout

Logout current user.

**Endpoint:** `POST /auth/logout`

**Authentication:** Required

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## 2. Dashboard Routes

### 2.1 Employee Dashboard Stats

Get dashboard statistics for a specific employee.

**Endpoint:** `GET /dashboard/employee/:userId`

**Authentication:** Required

**Authorization:** User can only view their own stats, unless HR/Manager

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/dashboard/employee/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
{
  "leave_balance": 15,
  "pending_approvals": 2,
  "payslips_count": 12,
  "attendance_rate": 95
}
```

---

### 2.2 HR Dashboard Stats

Get overall HR dashboard statistics.

**Endpoint:** `GET /dashboard/hr/stats`

**Authentication:** Required

**Authorization:** HR or Manager only

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/dashboard/hr/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
{
  "total_requests": 150,
  "pending_requests": 12,
  "approved_requests": 120,
  "rejected_requests": 18,
  "approval_rate": 87
}
```

---

### 2.3 HR Dashboard Trends

Get monthly leave trends for the year.

**Endpoint:** `GET /dashboard/hr/trends`

**Authentication:** Required

**Authorization:** HR or Manager only

**Query Parameters:**
- `year` (optional): Target year (defaults to current year)

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/dashboard/hr/trends?year=2024" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
[
  {
    "month": "January",
    "approved": 15,
    "rejected": 2
  },
  {
    "month": "February",
    "approved": 18,
    "rejected": 1
  }
]
```

---

## 3. Employee Routes

### 3.1 Get All Employees

Retrieve list of all employees.

**Endpoint:** `GET /employees`

**Authentication:** Required

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/employees \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": 1,
    "full_name": "John Doe",
    "email": "john.doe@company.com",
    "phone": "+1234567890",
    "department": "Engineering",
    "position": "Software Developer",
    "status": "Active",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 3.2 Get Employee by ID

Get detailed information for a specific employee.

**Endpoint:** `GET /employees/:id`

**Authentication:** Required

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/employees/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": 1,
  "full_name": "John Doe",
  "email": "john.doe@company.com",
  "phone": "+1234567890",
  "department": "Engineering",
  "position": "Software Developer",
  "status": "Active",
  "role": "employee",
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (404):**
```json
{
  "error": "Employee not found"
}
```

---

### 3.3 Create Employee

Create a new employee record (HR/Manager only).

**Endpoint:** `POST /employees`

**Authentication:** Required

**Authorization:** HR or Manager only

**Request Body:**
```json
{
  "full_name": "Jane Smith",
  "email": "jane.smith@company.com",
  "phone": "+1234567891",
  "department": "Marketing",
  "position": "Marketing Manager",
  "status": "Active",
  "user_id": 5
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/employees \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Jane Smith",
    "email": "jane.smith@company.com",
    "phone": "+1234567891",
    "department": "Marketing",
    "position": "Marketing Manager",
    "status": "Active"
  }'
```

**Success Response (201):**
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440001",
  "user_id": 5,
  "full_name": "Jane Smith",
  "email": "jane.smith@company.com",
  "phone": "+1234567891",
  "department": "Marketing",
  "position": "Marketing Manager",
  "status": "Active",
  "created_at": "2024-01-20T14:22:00.000Z"
}
```

---

### 3.4 Update Employee

Update an existing employee record (HR/Manager only).

**Endpoint:** `PATCH /employees/:id`

**Authentication:** Required

**Authorization:** HR or Manager only

**Request Body (all fields optional):**
```json
{
  "full_name": "Jane Smith-Johnson",
  "phone": "+1234567899",
  "department": "Marketing",
  "position": "Senior Marketing Manager",
  "status": "Active"
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/employees/650e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "position": "Senior Marketing Manager"
  }'
```

**Success Response (200):**
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440001",
  "user_id": 5,
  "full_name": "Jane Smith-Johnson",
  "email": "jane.smith@company.com",
  "phone": "+1234567899",
  "department": "Marketing",
  "position": "Senior Marketing Manager",
  "status": "Active",
  "updated_at": "2024-02-01T09:15:00.000Z"
}
```

---

### 3.5 Delete Employee

Delete an employee record (HR/Manager only).

**Endpoint:** `DELETE /employees/:id`

**Authentication:** Required

**Authorization:** HR or Manager only

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/employees/650e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
{
  "message": "Employee deleted successfully"
}
```

---

## 4. Leave Routes

### 4.1 Get User's Leave Requests

Get all leave requests for a specific user.

**Endpoint:** `GET /leaves/user/:userId`

**Authentication:** Required

**Authorization:** User can only view their own leaves, unless HR/Manager

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/leaves/user/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
[
  {
    "id": "750e8400-e29b-41d4-a716-446655440000",
    "user_id": 1,
    "leave_type": "Annual Leave",
    "start_date": "2024-03-15",
    "end_date": "2024-03-20",
    "days": 5,
    "reason": "Family vacation",
    "status": "Approved",
    "approved_by": 2,
    "created_at": "2024-02-01T10:30:00.000Z",
    "updated_at": "2024-02-02T14:20:00.000Z"
  }
]
```

---

### 4.2 Get All Leave Requests

Get all leave requests across the organization (HR/Manager only).

**Endpoint:** `GET /leaves`

**Authentication:** Required

**Authorization:** HR or Manager only

**Query Parameters:**
- `status` (optional): Filter by status (Pending, Approved, Rejected)

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/leaves?status=Pending" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
[
  {
    "id": "750e8400-e29b-41d4-a716-446655440000",
    "user_id": 1,
    "leave_type": "Sick Leave",
    "start_date": "2024-03-10",
    "end_date": "2024-03-11",
    "days": 2,
    "reason": "Medical appointment",
    "status": "Pending",
    "approved_by": null,
    "user_name": "John Doe",
    "user_email": "john.doe@company.com",
    "created_at": "2024-03-08T09:15:00.000Z",
    "updated_at": "2024-03-08T09:15:00.000Z"
  }
]
```

---

### 4.3 Create Leave Request

Submit a new leave request.

**Endpoint:** `POST /leaves`

**Authentication:** Required

**Request Body:**
```json
{
  "leave_type": "Annual Leave",
  "start_date": "2024-04-15",
  "end_date": "2024-04-20",
  "days": 5,
  "reason": "Personal travel"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/leaves \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leave_type": "Annual Leave",
    "start_date": "2024-04-15",
    "end_date": "2024-04-20",
    "days": 5,
    "reason": "Personal travel"
  }'
```

**Success Response (201):**
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440000",
  "user_id": 1,
  "leave_type": "Annual Leave",
  "start_date": "2024-04-15",
  "end_date": "2024-04-20",
  "days": 5,
  "reason": "Personal travel",
  "status": "Pending",
  "created_at": "2024-03-10T11:45:00.000Z"
}
```

---

### 4.4 Update Leave Status

Approve or reject a leave request (HR/Manager only).

**Endpoint:** `PATCH /leaves/:leaveId`

**Authentication:** Required

**Authorization:** HR or Manager only

**Request Body:**
```json
{
  "status": "Approved",
  "approved_by": 2
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/leaves/850e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Approved"
  }'
```

**Success Response (200):**
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440000",
  "user_id": 1,
  "leave_type": "Annual Leave",
  "start_date": "2024-04-15",
  "end_date": "2024-04-20",
  "days": 5,
  "reason": "Personal travel",
  "status": "Approved",
  "approved_by": 2,
  "updated_at": "2024-03-11T09:30:00.000Z"
}
```

---

### 4.5 Get Leave Balance

Get leave balance for a specific user.

**Endpoint:** `GET /leaves/balance/:userId`

**Authentication:** Required

**Authorization:** User can only view their own balance, unless HR/Manager

**Query Parameters:**
- `year` (optional): Target year (defaults to current year)

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/leaves/balance/1?year=2024" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
[
  {
    "id": "950e8400-e29b-41d4-a716-446655440000",
    "user_id": 1,
    "year": 2024,
    "leave_type": "Annual Leave",
    "total_days": 20,
    "used_days": 5,
    "remaining_days": 15,
    "carry_forward_days": 0
  },
  {
    "id": "960e8400-e29b-41d4-a716-446655440000",
    "user_id": 1,
    "year": 2024,
    "leave_type": "Sick Leave",
    "total_days": 10,
    "used_days": 2,
    "remaining_days": 8,
    "carry_forward_days": 0
  }
]
```

---

## 5. Payslip Routes

### 5.1 Get User's Payslips

Get all payslips for a specific user.

**Endpoint:** `GET /payslips/user/:userId`

**Authentication:** Required

**Authorization:** User can only view their own payslips, unless HR/Manager

**Query Parameters:**
- `year` (optional): Filter by year
- `month` (optional): Filter by month

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/payslips/user/1?year=2024&month=January" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
[
  {
    "id": "a50e8400-e29b-41d4-a716-446655440000",
    "user_id": 1,
    "month": "January",
    "year": 2024,
    "basic_salary": 5000.00,
    "allowances": 500.00,
    "deductions": 450.00,
    "net_salary": 5050.00,
    "file_url": "https://example.com/payslips/2024-01-john-doe.pdf",
    "created_at": "2024-01-31T10:00:00.000Z"
  }
]
```

---

### 5.2 Get All Payslips

Get all payslips across the organization (HR/Manager only).

**Endpoint:** `GET /payslips`

**Authentication:** Required

**Authorization:** HR or Manager only

**Query Parameters:**
- `year` (optional): Filter by year
- `month` (optional): Filter by month

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/payslips?year=2024" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
[
  {
    "id": "a50e8400-e29b-41d4-a716-446655440000",
    "user_id": 1,
    "month": "January",
    "year": 2024,
    "basic_salary": 5000.00,
    "allowances": 500.00,
    "deductions": 450.00,
    "net_salary": 5050.00,
    "file_url": "https://example.com/payslips/2024-01-john-doe.pdf",
    "user_name": "John Doe",
    "user_email": "john.doe@company.com",
    "created_at": "2024-01-31T10:00:00.000Z"
  }
]
```

---

### 5.3 Get Payslip by ID

Get a specific payslip by its ID.

**Endpoint:** `GET /payslips/:id`

**Authentication:** Required

**Authorization:** User can only view their own payslips, unless HR/Manager

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/payslips/a50e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
{
  "id": "a50e8400-e29b-41d4-a716-446655440000",
  "user_id": 1,
  "month": "January",
  "year": 2024,
  "basic_salary": 5000.00,
  "allowances": 500.00,
  "deductions": 450.00,
  "net_salary": 5050.00,
  "file_url": "https://example.com/payslips/2024-01-john-doe.pdf",
  "user_name": "John Doe",
  "user_email": "john.doe@company.com",
  "created_at": "2024-01-31T10:00:00.000Z"
}
```

---

### 5.4 Create Payslip

Create a new payslip (HR/Manager only).

**Endpoint:** `POST /payslips`

**Authentication:** Required

**Authorization:** HR or Manager only

**Request Body:**
```json
{
  "user_id": 1,
  "month": "February",
  "year": 2024,
  "basic_salary": 5000.00,
  "allowances": 500.00,
  "deductions": 450.00,
  "net_salary": 5050.00,
  "file_url": "https://example.com/payslips/2024-02-john-doe.pdf"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/payslips \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "month": "February",
    "year": 2024,
    "basic_salary": 5000.00,
    "allowances": 500.00,
    "deductions": 450.00,
    "net_salary": 5050.00,
    "file_url": "https://example.com/payslips/2024-02-john-doe.pdf"
  }'
```

**Success Response (201):**
```json
{
  "id": "b50e8400-e29b-41d4-a716-446655440000",
  "user_id": 1,
  "month": "February",
  "year": 2024,
  "basic_salary": 5000.00,
  "allowances": 500.00,
  "deductions": 450.00,
  "net_salary": 5050.00,
  "file_url": "https://example.com/payslips/2024-02-john-doe.pdf",
  "created_at": "2024-02-29T10:00:00.000Z"
}
```

---

### 5.5 Update Payslip

Update an existing payslip (HR/Manager only).

**Endpoint:** `PATCH /payslips/:id`

**Authentication:** Required

**Authorization:** HR or Manager only

**Request Body (all fields optional):**
```json
{
  "basic_salary": 5200.00,
  "allowances": 550.00,
  "net_salary": 5280.00
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/payslips/b50e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "basic_salary": 5200.00
  }'
```

**Success Response (200):**
```json
{
  "id": "b50e8400-e29b-41d4-a716-446655440000",
  "user_id": 1,
  "month": "February",
  "year": 2024,
  "basic_salary": 5200.00,
  "allowances": 550.00,
  "deductions": 450.00,
  "net_salary": 5300.00,
  "file_url": "https://example.com/payslips/2024-02-john-doe.pdf"
}
```

---

### 5.6 Delete Payslip

Delete a payslip (HR/Manager only).

**Endpoint:** `DELETE /payslips/:id`

**Authentication:** Required

**Authorization:** HR or Manager only

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/payslips/b50e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
{
  "message": "Payslip deleted successfully"
}
```

---

## 6. Holiday Routes

### 6.1 Get All Holidays

Get all holidays.

**Endpoint:** `GET /holidays`

**Authentication:** Required

**Query Parameters:**
- `year` (optional): Filter by year

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/holidays?year=2024" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
[
  {
    "id": "c50e8400-e29b-41d4-a716-446655440000",
    "name": "New Year's Day",
    "date": "2024-01-01",
    "type": "Public Holiday",
    "description": "Start of the new year",
    "created_at": "2023-12-01T10:00:00.000Z"
  },
  {
    "id": "c60e8400-e29b-41d4-a716-446655440000",
    "name": "Independence Day",
    "date": "2024-07-04",
    "type": "Public Holiday",
    "description": "National holiday",
    "created_at": "2023-12-01T10:00:00.000Z"
  }
]
```

---

### 6.2 Get Upcoming Holidays

Get upcoming holidays from today.

**Endpoint:** `GET /holidays/upcoming`

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of holidays to return (default: 5)

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/holidays/upcoming?limit=3" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
[
  {
    "id": "c70e8400-e29b-41d4-a716-446655440000",
    "name": "Memorial Day",
    "date": "2024-05-27",
    "type": "Public Holiday",
    "description": "Day of remembrance"
  },
  {
    "id": "c80e8400-e29b-41d4-a716-446655440000",
    "name": "Independence Day",
    "date": "2024-07-04",
    "type": "Public Holiday",
    "description": "National holiday"
  }
]
```

---

### 6.3 Get Holiday by ID

Get a specific holiday by ID.

**Endpoint:** `GET /holidays/:id`

**Authentication:** Required

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/holidays/c70e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
{
  "id": "c70e8400-e29b-41d4-a716-446655440000",
  "name": "Memorial Day",
  "date": "2024-05-27",
  "type": "Public Holiday",
  "description": "Day of remembrance",
  "created_at": "2023-12-01T10:00:00.000Z"
}
```

---

### 6.4 Create Holiday

Create a new holiday (HR/Manager only).

**Endpoint:** `POST /holidays`

**Authentication:** Required

**Authorization:** HR or Manager only

**Request Body:**
```json
{
  "name": "Company Anniversary",
  "date": "2024-08-15",
  "type": "Company Holiday",
  "description": "Annual company anniversary celebration"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/holidays \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Company Anniversary",
    "date": "2024-08-15",
    "type": "Company Holiday",
    "description": "Annual company anniversary celebration"
  }'
```

**Success Response (201):**
```json
{
  "id": "c90e8400-e29b-41d4-a716-446655440000",
  "name": "Company Anniversary",
  "date": "2024-08-15",
  "type": "Company Holiday",
  "description": "Annual company anniversary celebration",
  "created_at": "2024-03-15T11:30:00.000Z"
}
```

---

### 6.5 Update Holiday

Update an existing holiday (HR/Manager only).

**Endpoint:** `PATCH /holidays/:id`

**Authentication:** Required

**Authorization:** HR or Manager only

**Request Body (all fields optional):**
```json
{
  "name": "Company Anniversary (Updated)",
  "description": "Annual company anniversary - everyone off"
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/holidays/c90e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Annual company anniversary - everyone off"
  }'
```

**Success Response (200):**
```json
{
  "id": "c90e8400-e29b-41d4-a716-446655440000",
  "name": "Company Anniversary (Updated)",
  "date": "2024-08-15",
  "type": "Company Holiday",
  "description": "Annual company anniversary - everyone off"
}
```

---

### 6.6 Delete Holiday

Delete a holiday (HR/Manager only).

**Endpoint:** `DELETE /holidays/:id`

**Authentication:** Required

**Authorization:** HR or Manager only

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/holidays/c90e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
{
  "message": "Holiday deleted successfully"
}
```

---

## 7. Notification Routes

### 7.1 Send Leave Notification

Send email notification for leave request status update.

**Endpoint:** `POST /notifications/leave`

**Authentication:** Required

**Request Body:**
```json
{
  "to": "john.doe@company.com",
  "employeeName": "John Doe",
  "leaveType": "Annual Leave",
  "startDate": "2024-04-15",
  "endDate": "2024-04-20",
  "days": 5,
  "status": "approved",
  "reason": "Personal travel",
  "comments": "Approved as requested. Enjoy your time off!"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/notifications/leave \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "john.doe@company.com",
    "employeeName": "John Doe",
    "leaveType": "Annual Leave",
    "startDate": "2024-04-15",
    "endDate": "2024-04-20",
    "days": 5,
    "status": "approved",
    "reason": "Personal travel",
    "comments": "Approved as requested."
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "messageId": "01234567-89ab-cdef-0123-456789abcdef"
}
```

---

## 8. Statistics Routes

### 8.1 Get Employee Statistics

Get detailed statistics for a specific employee.

**Endpoint:** `GET /statistics/employee/:userId`

**Authentication:** Required

**Authorization:** User can only view their own stats, unless HR/Manager

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/statistics/employee/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
{
  "leave_stats": {
    "total_leaves": 8,
    "pending_leaves": 1,
    "approved_leaves": 6,
    "rejected_leaves": 1,
    "total_days_taken": 15
  },
  "balance_stats": {
    "total_allocated": 30,
    "total_used": 15,
    "total_remaining": 15,
    "total_carry_forward": 0
  },
  "leave_type_breakdown": [
    {
      "leave_type": "Annual Leave",
      "count": 4,
      "total_days": 10
    },
    {
      "leave_type": "Sick Leave",
      "count": 2,
      "total_days": 5
    }
  ],
  "monthly_trends": [
    {
      "month": 1,
      "month_name": "January",
      "leave_count": 1,
      "days_taken": 3
    },
    {
      "month": 3,
      "month_name": "March",
      "leave_count": 2,
      "days_taken": 7
    }
  ]
}
```

---

### 8.2 Get Attendance Statistics

Get attendance statistics for a specific employee.

**Endpoint:** `GET /statistics/attendance/:userId`

**Authentication:** Required

**Authorization:** User can only view their own stats, unless HR/Manager

**Query Parameters:**
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/statistics/attendance/1?startDate=2024-01-01&endDate=2024-03-31" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
{
  "total_working_days": 63,
  "days_present": 58,
  "days_absent": 5,
  "attendance_percentage": 92.06,
  "late_arrivals": 3,
  "early_departures": 2
}
```

---

### 8.3 Get Department Statistics

Get aggregated statistics by department (HR/Manager only).

**Endpoint:** `GET /statistics/department`

**Authentication:** Required

**Authorization:** HR or Manager only

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/statistics/department \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
[
  {
    "department": "Engineering",
    "employee_count": 25,
    "avg_leave_days": 12.5,
    "pending_leaves": 5,
    "active_employees": 24,
    "inactive_employees": 1
  },
  {
    "department": "Marketing",
    "employee_count": 15,
    "avg_leave_days": 10.2,
    "pending_leaves": 2,
    "active_employees": 15,
    "inactive_employees": 0
  }
]
```

---

### 8.4 Get Leave Type Statistics

Get statistics grouped by leave type (HR/Manager only).

**Endpoint:** `GET /statistics/leave-types`

**Authentication:** Required

**Authorization:** HR or Manager only

**Query Parameters:**
- `year` (optional): Filter by year (defaults to current year)

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/statistics/leave-types?year=2024" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
[
  {
    "leave_type": "Annual Leave",
    "total_requests": 120,
    "approved_requests": 105,
    "rejected_requests": 10,
    "pending_requests": 5,
    "total_days": 450,
    "approval_rate": 91.30
  },
  {
    "leave_type": "Sick Leave",
    "total_requests": 85,
    "approved_requests": 80,
    "rejected_requests": 3,
    "pending_requests": 2,
    "total_days": 200,
    "approval_rate": 96.39
  }
]
```

---

## 9. User Routes

### 9.1 Get User Role

Get the role of a specific user.

**Endpoint:** `GET /users/:userId/role`

**Authentication:** Required

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/users/1/role \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
{
  "role": "employee"
}
```

---

### 9.2 Get User Profile

Get profile information for a specific user.

**Endpoint:** `GET /users/:userId/profile`

**Authentication:** Required

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/users/1/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
{
  "id": 1,
  "email": "john.doe@company.com",
  "full_name": "John Doe",
  "phone": "+1234567890",
  "department": "Engineering",
  "position": "Software Developer",
  "avatar_url": "https://example.com/avatars/john-doe.jpg",
  "hire_date": "2023-01-15"
}
```

---

### 9.3 Update User Profile

Update profile information for a specific user.

**Endpoint:** `PATCH /users/:userId/profile`

**Authentication:** Required

**Authorization:** User can only update their own profile, unless HR/Manager

**Request Body (all fields optional):**
```json
{
  "full_name": "John Michael Doe",
  "phone": "+1234567899",
  "department": "Engineering",
  "position": "Senior Software Developer",
  "avatar_url": "https://example.com/avatars/john-doe-new.jpg"
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/users/1/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "position": "Senior Software Developer",
    "phone": "+1234567899"
  }'
```

**Success Response (200):**
```json
{
  "id": 1,
  "email": "john.doe@company.com",
  "full_name": "John Michael Doe",
  "phone": "+1234567899",
  "department": "Engineering",
  "position": "Senior Software Developer",
  "avatar_url": "https://example.com/avatars/john-doe-new.jpg",
  "hire_date": "2023-01-15"
}
```

---

### 9.4 Get All Users

Get list of all users (HR/Manager only).

**Endpoint:** `GET /users`

**Authentication:** Required

**Authorization:** HR or Manager only

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200):**
```json
[
  {
    "id": 1,
    "email": "john.doe@company.com",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "department": "Engineering",
    "position": "Software Developer",
    "avatar_url": "https://example.com/avatars/john-doe.jpg",
    "hire_date": "2023-01-15"
  },
  {
    "id": 2,
    "email": "jane.smith@company.com",
    "full_name": "Jane Smith",
    "phone": "+1234567891",
    "department": "HR",
    "position": "HR Manager",
    "avatar_url": "https://example.com/avatars/jane-smith.jpg",
    "hire_date": "2022-06-01"
  }
]
```

---

## Common Error Responses

### 401 Unauthorized
```json
{
  "error": "Access token required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden: Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to process request"
}
```

---

## Testing with Postman

### Setting up Environment Variables

1. Create a new environment in Postman
2. Add the following variables:
   - `base_url`: `http://localhost:3000/api`
   - `access_token`: (will be set after login)
   - `user_id`: (will be set after login)

### Authentication Flow

1. **Sign Up or Login**:
   ```
   POST {{base_url}}/auth/login
   ```

2. **Save the access token**: In Tests tab, add:
   ```javascript
   const response = pm.response.json();
   pm.environment.set("access_token", response.accessToken);
   pm.environment.set("user_id", response.user.id);
   ```

3. **Use in subsequent requests**: Add to Headers:
   ```
   Authorization: Bearer {{access_token}}
   ```

---

## Rate Limiting

Currently, no rate limiting is implemented. It's recommended to implement rate limiting in production environments.

---

## Notes

- All timestamps are in ISO 8601 format
- All dates use YYYY-MM-DD format
- UUIDs are used for entity IDs (SQL Server UNIQUEIDENTIFIER)
- Numeric user IDs are INT IDENTITY values
- Bearer tokens expire after 1 hour (configurable via JWT_EXPIRY)
- Refresh tokens expire after 7 days (configurable via REFRESH_TOKEN_EXPIRY)
