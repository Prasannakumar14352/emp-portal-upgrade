-- Setup HR Role for Your User
-- Execute this script to grant HR access to your user account

-- STEP 1: Find your user ID
-- Replace 'YOUR_EMAIL@example.com' with your actual email address
DECLARE @employee_id INT;

SELECT @employee_id = id 
FROM profiles 
WHERE email = 'YOUR_EMAIL@example.com';  -- CHANGE THIS TO YOUR EMAIL

-- STEP 2: Check if the user exists
IF @employee_id IS NULL
BEGIN
    PRINT 'ERROR: User not found. Please check the email address.';
    RETURN;
END

-- STEP 3: Check if HR role already exists for this user
IF EXISTS (SELECT 1 FROM user_roles WHERE employee_id = @employee_id AND role = 'hr')
BEGIN
    PRINT 'INFO: HR role already exists for this user.';
END
ELSE
BEGIN
    -- Insert HR role
    INSERT INTO user_roles (employee_id, role, created_at)
    VALUES (@employee_id, 'hr', GETDATE());
    
    PRINT 'SUCCESS: HR role has been granted to the user.';
END

-- Verify the role was added
SELECT 
    u.email,
    u.full_name,
    u.id AS employee_id,
    ur.role,
    ur.created_at
FROM profiles u
INNER JOIN user_roles ur ON u.id = ur.employee_id
WHERE u.id = @employee_id;

PRINT '';
PRINT '========================================';
PRINT 'HR Access Setup Complete!';
PRINT '========================================';
PRINT 'You can now:';
PRINT '  - Access HR Dashboard';
PRINT '  - Approve/Reject Leaves';
PRINT '  - Manage Leave Types';
PRINT '  - Perform Bulk Operations';
PRINT '  - View Team Time Tracking';
PRINT '';
PRINT 'Please refresh your application to see the changes.';
