# Grant HR/Manager Access

If you're getting "Forbidden: Insufficient permissions" when managing leave types, you need to grant yourself the appropriate role in the **SQL Server database**.

## Important: This System Uses SQL Server

Your application uses **SQL Server** as the primary database (not Supabase). The HR role must be added to the SQL Server `user_roles` table.

## Steps to Grant HR Access

### Using SQL Server Management Studio or SQL Query

1. Connect to your SQL Server database
2. Run this SQL query to add the HR role:

```sql
-- First, find your user ID
SELECT id, email, full_name FROM profiles WHERE email = 'YOUR_EMAIL@example.com';

-- Then insert the HR role (replace YOUR_USER_ID with the ID from above)
-- For example, if your ID is 1:
INSERT INTO user_roles (user_id, role, created_at)
VALUES (1, 'hr', GETDATE());

-- Verify the role was added
SELECT ur.id, ur.user_id, ur.role, p.email, p.full_name
FROM user_roles ur
JOIN profiles p ON ur.user_id = p.id
WHERE p.email = 'YOUR_EMAIL@example.com';
```

### Alternative: Use the Backend API Guide

If you don't have direct SQL Server access, contact your database administrator to run the SQL above.

### After Adding the Role in SQL Server

**CRITICAL:** You MUST log out and log back in for the role to take effect! 

The role is stored in your JWT authentication token during login. The token won't include your new role until you log in again after adding it to the SQL Server database.

## Available Roles

- **employee**: Default role, can view and request leaves
- **manager**: Can approve leaves and manage leave types
- **hr**: Full access to all HR features including leave types, approvals, and employee management

## Verify Your Role

After logging back in, your role should be active. Try managing leave types again - the permission error should be resolved.
