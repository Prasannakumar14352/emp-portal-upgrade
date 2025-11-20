-- ============================================================================
-- FIX DUPLICATE ROLES - SQL Server Migration
-- ============================================================================
-- This script prevents duplicate role assignments and cleans up existing duplicates
-- Run this on your local SQL Server database
-- ============================================================================

USE EmployeePortal;
GO

-- Step 1: Clean up existing duplicate 'employee' roles for users who have hr/manager roles
PRINT 'Cleaning up duplicate employee roles...';
DELETE FROM user_roles
WHERE role = 'employee'
AND employee_id IN (
  SELECT DISTINCT employee_id
  FROM user_roles
  WHERE role IN ('hr', 'manager')
);
PRINT 'Duplicate employee roles removed.';
GO

-- Step 2: Add unique constraint to prevent future duplicates
-- First check if the constraint already exists
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'UQ_user_roles_employee_role' 
    AND object_id = OBJECT_ID('user_roles')
)
BEGIN
    PRINT 'Adding unique constraint to user_roles table...';
    ALTER TABLE user_roles 
    ADD CONSTRAINT UQ_user_roles_employee_role UNIQUE (employee_id, role);
    PRINT 'Unique constraint added successfully.';
END
ELSE
BEGIN
    PRINT 'Unique constraint already exists.';
END
GO

-- Step 3: Verify the changes
PRINT 'Verification - Checking for any remaining duplicate roles:';
SELECT 
    employee_id, 
    role, 
    COUNT(*) as count
FROM user_roles
GROUP BY employee_id, role
HAVING COUNT(*) > 1;

PRINT 'If no rows returned above, cleanup was successful!';
GO

PRINT 'Migration completed successfully!';
