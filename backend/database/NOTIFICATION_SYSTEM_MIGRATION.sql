-- ============================================================
-- NOTIFICATION SYSTEM MIGRATION FOR SQL SERVER
-- Run this script on your local SQL Server database
-- This migration updates the notifications and user_preferences tables
-- to use integer employee_id (employee_id from profiles table)
-- ============================================================

-- Step 1: Drop existing notifications table if it exists
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'notifications')
BEGIN
    DROP TABLE notifications;
    PRINT 'Dropped existing notifications table';
END
GO

-- Step 2: Create new notifications table with integer employee_id
CREATE TABLE notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    employee_id INT NOT NULL,
    type NVARCHAR(50) NOT NULL,
    title NVARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    [read] BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    metadata NVARCHAR(MAX) NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_notifications_employee_id ON notifications(employee_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications([read]);
CREATE INDEX idx_notifications_user_read ON notifications(employee_id, [read]);

PRINT 'Created notifications table with integer employee_id';
GO

-- Step 3: Update user_preferences table to use integer employee_id
-- Check if user_preferences table exists
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'user_preferences')
BEGIN
    -- Drop existing user_preferences table
    DROP TABLE user_preferences;
    PRINT 'Dropped existing user_preferences table';
END
GO

-- Create new user_preferences table with integer employee_id
CREATE TABLE user_preferences (
    id INT IDENTITY(1,1) PRIMARY KEY,
    employee_id INT NOT NULL UNIQUE,
    email_notifications BIT NOT NULL DEFAULT 1,
    push_notifications BIT NOT NULL DEFAULT 1,
    leave_update_notifications BIT NOT NULL DEFAULT 1,
    compact_view BIT NOT NULL DEFAULT 0,
    dark_mode BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE INDEX idx_user_preferences_employee_id ON user_preferences(employee_id);

PRINT 'Created user_preferences table with integer employee_id';
GO

-- Step 4: Create trigger for updating updated_at timestamp
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_user_preferences_updated_at')
BEGIN
    DROP TRIGGER trg_user_preferences_updated_at;
END
GO

CREATE TRIGGER trg_user_preferences_updated_at
ON user_preferences
AFTER UPDATE
AS
BEGIN
    UPDATE user_preferences
    SET updated_at = GETDATE()
    FROM user_preferences up
    INNER JOIN inserted i ON up.id = i.id;
END
GO

PRINT 'Created trigger for user_preferences updated_at';
GO

-- Step 5: Verify tables and columns
SELECT 
    'notifications' AS TableName,
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'notifications'
ORDER BY ORDINAL_POSITION;

SELECT 
    'user_preferences' AS TableName,
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'user_preferences'
ORDER BY ORDINAL_POSITION;
GO

PRINT 'Migration completed successfully';
PRINT '';
PRINT '=============================================================';
PRINT 'IMPORTANT NOTES:';
PRINT '- notifications.employee_id now references profiles.employee_id';
PRINT '- user_preferences.employee_id now references profiles.employee_id';
PRINT '- These are INTEGER columns, not UUID/UNIQUEIDENTIFIER';
PRINT '- Make sure your profiles table has employee_id as an INTEGER';
PRINT '=============================================================';
