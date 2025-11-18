# Grant HR/Manager Access

If you're getting "Forbidden: Insufficient permissions" when managing leave types, you need to grant yourself the appropriate role.

## Steps to Grant HR Access

### Option 1: Using Lovable Cloud Backend (Recommended)

1. Click the "View Backend" button below to open your Lovable Cloud dashboard
2. Navigate to **Database** → **Tables** → **user_roles**
3. Click **Insert Row**
4. Fill in:
   - `user_id`: Your user ID (find it in the `profiles` table using your email)
   - `role`: Select `hr` (or `manager`)
   - Leave other fields as default
5. Click **Save**
6. **Log out and log back in** to refresh your session with the new role

### Option 2: Using SQL (If you have database access)

Run this SQL query in your database:

```sql
-- First, find your user ID
SELECT id, email, full_name FROM profiles WHERE email = 'YOUR_EMAIL@example.com';

-- Then insert the HR role (replace YOUR_USER_ID with the ID from above)
INSERT INTO user_roles (user_id, role, created_at)
VALUES (YOUR_USER_ID, 'hr', GETDATE());
```

### After Adding the Role

**IMPORTANT:** You must log out and log back in for the role to take effect. The role is stored in your authentication token, which is only updated when you log in.

## Available Roles

- **employee**: Default role, can view and request leaves
- **manager**: Can approve leaves and manage leave types
- **hr**: Full access to all HR features including leave types, approvals, and employee management

## Verify Your Role

After logging back in, your role should be active. Try managing leave types again - the permission error should be resolved.
