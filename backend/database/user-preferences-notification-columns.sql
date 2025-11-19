-- Add notification preference columns to user_preferences table
-- Run this script on your local SQL Server database

-- Check if user_preferences table exists, if not create it
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_preferences')
BEGIN
    CREATE TABLE user_preferences (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        email_notifications BIT NOT NULL DEFAULT 1,
        push_notifications BIT NOT NULL DEFAULT 1,
        leave_update_notifications BIT NOT NULL DEFAULT 1,
        compact_view BIT NOT NULL DEFAULT 0,
        dark_mode BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_user_preferences_user_id FOREIGN KEY (user_id) REFERENCES profiles(user_id)
    );

    CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

    PRINT 'User preferences table created successfully';
END
ELSE
BEGIN
    PRINT 'User preferences table already exists';
    
    -- Add notification columns if they don't exist
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'user_preferences') AND name = 'email_notifications')
    BEGIN
        ALTER TABLE user_preferences ADD email_notifications BIT NOT NULL DEFAULT 1;
        PRINT 'Added email_notifications column';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'user_preferences') AND name = 'push_notifications')
    BEGIN
        ALTER TABLE user_preferences ADD push_notifications BIT NOT NULL DEFAULT 1;
        PRINT 'Added push_notifications column';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'user_preferences') AND name = 'leave_update_notifications')
    BEGIN
        ALTER TABLE user_preferences ADD leave_update_notifications BIT NOT NULL DEFAULT 1;
        PRINT 'Added leave_update_notifications column';
    END
END
GO

-- Verify the columns
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'user_preferences'
AND COLUMN_NAME IN ('email_notifications', 'push_notifications', 'leave_update_notifications')
ORDER BY COLUMN_NAME;
GO

PRINT 'User preferences migration completed successfully';
