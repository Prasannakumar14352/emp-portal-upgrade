# Database Sync Guide - Supabase to SQL Server

This guide explains how to sync all Supabase tables and features to your local SQL Server database.

## 🔑 Important: ID Types

**Supabase (Cloud)**: Uses UUID (GUID) for user authentication (auth.users) + numeric `employee_id` field
**SQL Server (Local)**: Uses INT IDENTITY (1, 2, 3...) for all user IDs for simpler management

Both systems now include numeric employee IDs for human-readable identification.

## ✅ What's Included

### Tables (Using Numeric Employee IDs)
- **profiles** - User profiles with numeric employee IDs (INT IDENTITY)
- **user_roles** - Role-based access control (employee, hr, manager)
- **user_sessions** - Session tracking for time management
- **employees** - Employee directory and details
- **holidays** - Company holidays calendar
- **leave_types** - Configurable leave types with default days
- **leaves** - Leave requests and approvals
- **leave_balances** - Automated leave balance tracking per user/year/type
- **leave_comments** - Comments on leave requests
- **payslips** - Payroll information

**Note**: SQL Server uses INT IDENTITY for employee IDs (1, 2, 3...) instead of GUIDs for easier management.

### Automated Features
1. **Session Duration Calculation** - Automatically calculates session time when logout occurs
2. **Leave Balance Updates** - Automatically updates balances when leave is approved
3. **Timestamp Management** - Auto-updates `updated_at` fields on changes
4. **Low Balance Tracking** - Changed to DECIMAL for fractional day support
5. **OAuth User Sync** - Automatically creates/updates employee records for OAuth users

### Stored Procedures
- `sp_sync_oauth_user` - Syncs OAuth users to profiles and employees tables

### Triggers Created
- `trg_calculate_session_duration` - Calculates session duration on logout
- `trg_update_leave_types_updated_at` - Updates leave_types timestamp
- `trg_update_leave_balances_updated_at` - Updates leave_balances timestamp
- `trg_update_leave_balance_on_approval` - Automatically adjusts balances on approval

## 🚀 Setup Instructions

### 1. Drop and Recreate Database (Clean Setup)
```sql
-- Execute schema.sql to create all tables, indexes, triggers, and stored procedures
-- This includes sample data for holidays and leave types
-- OAuth sync procedure: sp_sync_oauth_user
```

### 2. Grant HR Access to Your User
```sql
-- Edit and run setup-hr-role.sql
-- Replace 'YOUR_EMAIL@example.com' with your actual email
```

### 3. OAuth User Synchronization
When users log in via Microsoft OAuth (or any OAuth provider), the stored procedure automatically syncs their employee record:

```sql
-- Example: Sync OAuth user after authentication (called automatically by backend)
EXEC sp_sync_oauth_user 
  @email = 'user@company.com',
  @full_name = 'John Doe',
  @department = 'Engineering',  -- Optional, defaults to 'Not Assigned'
  @position = 'Developer';       -- Optional, defaults to 'Employee'
```

The procedure will:
- Create a profile record if it doesn't exist (returns numeric employee ID)
- Create or update the employee record
- Assign the default 'employee' role if not already assigned

Returns the numeric employee ID (INT) for the user.

### 4. Verify Setup
```sql
-- Check all tables exist
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE' 
ORDER BY TABLE_NAME;

-- Check triggers exist
SELECT 
    OBJECT_NAME(parent_id) AS TableName,
    name AS TriggerName,
    type_desc AS TriggerType
FROM sys.triggers
WHERE is_disabled = 0
ORDER BY TableName;
```

## 📊 Key Features

### Leave Types Management
Default leave types included:
- Annual Leave (20 days)
- Sick Leave (12 days)
- Compassionate Leave (5 days)
- Loss of Pay (0 days)
- Paternity Leave (15 days)

HR/Managers can add, edit, or deactivate leave types via the Leave Types page.

### Automated Leave Balance Calculation
When a leave request is **approved**, the system automatically:
1. Finds or creates the leave balance record for that user/year/type
2. Adds the approved days to `used_days`
3. Calculates `remaining_days = total_days - used_days`
4. Updates timestamp

**Example:**
```
User requests 5 days of Annual Leave
→ Request approved
→ System finds/creates balance record for 2026/Annual Leave
→ used_days: 0 → 5
→ remaining_days: 20 → 15
```

### Session Tracking
Tracks user login/logout times and calculates session duration:
- Login time recorded on sign in
- Logout time recorded on sign out
- Duration automatically calculated in minutes
- Used for time tracking and productivity analytics

## 🔒 Security

### Row-Level Security Equivalent
SQL Server uses role-based checks via middleware:
- Authentication required for all protected routes
- HR/Manager roles checked via `user_roles` table
- Backend validates permissions before data access

### Role Hierarchy
- **employee** - Default role, can view own data only
- **manager** - Can approve leaves, view team data
- **hr** - Full access to all features

## 🔄 Migration from Supabase

The `schema.sql` file mirrors all Supabase tables and functionality:

| Supabase Feature | SQL Server Implementation |
|-----------------|--------------------------|
| RLS Policies | Middleware authentication & role checks |
| Triggers | SQL Server triggers |
| Functions | Stored procedures & triggers |
| Auto-updated timestamps | UPDATE triggers |
| UUID IDs | INT IDENTITY (1, 2, 3...) for easier management |

## 📝 Common Operations

### Add a New User
```sql
-- Insert user profile
INSERT INTO profiles (email, full_name, department, position, hire_date)
VALUES ('john.doe@company.com', 'John Doe', 'Engineering', 'Developer', GETDATE());

-- Get the user ID
DECLARE @user_id UNIQUEIDENTIFIER = (SELECT id FROM profiles WHERE email = 'john.doe@company.com');

-- Assign role (default is employee)
INSERT INTO user_roles (user_id, role) VALUES (@user_id, 'employee');

-- Create employee record
INSERT INTO employees (user_id, full_name, email, department, position, status)
VALUES (@user_id, 'John Doe', 'john.doe@company.com', 'Engineering', 'Developer', 'Active');

-- Initialize leave balances for current year
DECLARE @current_year INT = YEAR(GETDATE());
INSERT INTO leave_balances (user_id, year, leave_type, total_days, used_days, remaining_days)
SELECT @user_id, @current_year, name, default_days, 0, default_days
FROM leave_types WHERE is_active = 1;
```

### Check Leave Balance
```sql
SELECT 
    u.full_name,
    u.email,
    lb.year,
    lb.leave_type,
    lb.total_days,
    lb.used_days,
    lb.remaining_days,
    lb.carry_forward_days,
    CAST(lb.remaining_days as FLOAT) / NULLIF(lb.total_days, 0) * 100 as percentage_remaining
FROM leave_balances lb
INNER JOIN profiles u ON lb.user_id = u.id
WHERE lb.year = YEAR(GETDATE())
ORDER BY u.full_name, lb.leave_type;
```

### Low Balance Alert Query
```sql
-- Find users with less than 25% leave balance remaining
SELECT 
    u.full_name,
    u.email,
    lb.leave_type,
    lb.remaining_days,
    lb.total_days,
    CAST(lb.remaining_days as FLOAT) / NULLIF(lb.total_days, 0) * 100 as percentage_remaining
FROM leave_balances lb
INNER JOIN profiles u ON lb.user_id = u.id
WHERE lb.year = YEAR(GETDATE())
    AND lb.total_days > 0
    AND CAST(lb.remaining_days as FLOAT) / lb.total_days < 0.25
ORDER BY percentage_remaining ASC;
```

## 🐛 Troubleshooting

### Issue: Employees list not showing
**Cause:** SQL Server backend not running or connection failed
**Solution:**
1. Check backend server is running: `cd backend && npm start`
2. Verify database connection in `backend/.env`
3. Check `backend/config/database.js` connection settings

### Issue: HR role not working
**Cause:** User doesn't have 'hr' role in `user_roles` table
**Solution:** Run `setup-hr-role.sql` with your email

### Issue: Leave balances not updating
**Cause:** Trigger not created or disabled
**Solution:**
```sql
-- Check if trigger exists and is enabled
SELECT name, is_disabled 
FROM sys.triggers 
WHERE name = 'trg_update_leave_balance_on_approval';

-- If disabled, enable it
ENABLE TRIGGER trg_update_leave_balance_on_approval ON leaves;
```

## 📚 Additional Notes

- All dates use `DATETIME2` for better precision
- UUIDs use `UNIQUEIDENTIFIER` type
- Foreign keys set with proper CASCADE rules
- Indexes created on frequently queried columns
- Default values set for most fields
- Constraints ensure data integrity

## 🔄 Keeping in Sync

When you make changes in Supabase:
1. Note the table/column changes
2. Update `schema.sql` accordingly
3. Create migration script if needed
4. Test locally before deploying

For production, consider:
- Automated migration scripts
- Version control for schema changes
- Backup before major updates
- Test migrations on staging first
