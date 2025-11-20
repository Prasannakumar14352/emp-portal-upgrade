-- Rename profiles.id to profiles.employee_id
-- This aligns the SQL Server schema with what the backend code expects
-- Run this on your SQL Server database

USE [your_database_name];  -- Replace with your actual database name
GO

-- Check if the column needs renaming
IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('profiles') AND name = 'id'
)
AND NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('profiles') AND name = 'employee_id'
)
BEGIN
    PRINT 'Renaming profiles.id to profiles.employee_id...';
    
    -- SQL Server sp_rename procedure renames the column and automatically updates references
    EXEC sp_rename 'profiles.id', 'employee_id', 'COLUMN';
    
    PRINT 'Successfully renamed profiles.id to profiles.employee_id';
    PRINT 'All foreign key references have been automatically updated';
END
ELSE IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('profiles') AND name = 'employee_id'
)
BEGIN
    PRINT 'Column profiles.employee_id already exists. No changes needed.';
END
ELSE
BEGIN
    PRINT 'WARNING: Neither profiles.id nor profiles.employee_id found. Please check your schema.';
END
GO

-- Verify the change
PRINT '';
PRINT 'Current profiles table structure:';
SELECT 
    c.name AS ColumnName,
    t.name AS DataType,
    c.max_length AS MaxLength,
    c.is_nullable AS IsNullable,
    c.is_identity AS IsIdentity
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('profiles')
ORDER BY c.column_id;
GO
