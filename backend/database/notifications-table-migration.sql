-- Create notifications table for SQL Server
-- Run this script on your local SQL Server database

-- Create notifications table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'notifications')
BEGIN
    CREATE TABLE notifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        type NVARCHAR(50) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        [read] BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        metadata NVARCHAR(MAX) NULL
    );

    -- Create indexes for better query performance
    CREATE INDEX idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
    CREATE INDEX idx_notifications_read ON notifications([read]);
    CREATE INDEX idx_notifications_user_read ON notifications(user_id, [read]);

    PRINT 'Notifications table created successfully';
END
ELSE
BEGIN
    PRINT 'Notifications table already exists';
END
GO

-- Verify the table was created
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'notifications'
ORDER BY ORDINAL_POSITION;
GO

PRINT 'Migration completed successfully';
