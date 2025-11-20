-- =====================================================
-- SQL Server Migration Script - Today's Changes
-- Date: 2025-01-18
-- Description: User preferences, Performance reviews, 
--              Attendance tracking, and Goals management
-- =====================================================

USE [YourDatabaseName]; -- Replace with your actual database name
GO

-- =====================================================
-- 1. CREATE user_preferences TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_preferences')
BEGIN
    CREATE TABLE user_preferences (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        employee_id INT NOT NULL,
        dark_mode BIT DEFAULT 0,
        compact_view BIT DEFAULT 0,
        email_notifications BIT DEFAULT 1,
        push_notifications BIT DEFAULT 1,
        leave_update_notifications BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_user_preferences_user FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT UQ_user_preferences_employee_id UNIQUE (employee_id)
    );
    
    PRINT 'Table user_preferences created successfully';
END
ELSE
BEGIN
    PRINT 'Table user_preferences already exists';
END
GO

-- =====================================================
-- 2. CREATE performance_reviews TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'performance_reviews')
BEGIN
    CREATE TABLE performance_reviews (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        employee_id INT NOT NULL,
        reviewer_id INT NOT NULL,
        review_period NVARCHAR(100) NOT NULL,
        review_date DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        overall_score DECIMAL(3,1) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 5),
        quality_of_work DECIMAL(3,1) NULL CHECK (quality_of_work IS NULL OR (quality_of_work >= 0 AND quality_of_work <= 5)),
        communication DECIMAL(3,1) NULL CHECK (communication IS NULL OR (communication >= 0 AND communication <= 5)),
        teamwork DECIMAL(3,1) NULL CHECK (teamwork IS NULL OR (teamwork >= 0 AND teamwork <= 5)),
        time_management DECIMAL(3,1) NULL CHECK (time_management IS NULL OR (time_management >= 0 AND time_management <= 5)),
        problem_solving DECIMAL(3,1) NULL CHECK (problem_solving IS NULL OR (problem_solving >= 0 AND problem_solving <= 5)),
        feedback NVARCHAR(MAX) NULL,
        status NVARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged')),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_performance_reviews_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE NO ACTION,
        CONSTRAINT FK_performance_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE NO ACTION,
        CONSTRAINT UQ_performance_reviews_employee_period UNIQUE (employee_id, review_period)
    );
    
    -- Create indexes for better query performance
    CREATE INDEX IX_performance_reviews_employee ON performance_reviews(employee_id);
    CREATE INDEX IX_performance_reviews_reviewer ON performance_reviews(reviewer_id);
    CREATE INDEX IX_performance_reviews_date ON performance_reviews(review_date DESC);
    
    PRINT 'Table performance_reviews created successfully';
END
ELSE
BEGIN
    PRINT 'Table performance_reviews already exists';
END
GO

-- =====================================================
-- 3. CREATE performance_goals TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'performance_goals')
BEGIN
    CREATE TABLE performance_goals (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        employee_id INT NOT NULL,
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        status NVARCHAR(20) DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'cancelled')),
        target_date DATE NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_performance_goals_user FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    -- Create indexes
    CREATE INDEX IX_performance_goals_user ON performance_goals(employee_id);
    CREATE INDEX IX_performance_goals_status ON performance_goals(status);
    
    PRINT 'Table performance_goals created successfully';
END
ELSE
BEGIN
    PRINT 'Table performance_goals already exists';
END
GO

-- =====================================================
-- 4. CREATE attendance_records TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'attendance_records')
BEGIN
    CREATE TABLE attendance_records (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        employee_id INT NOT NULL,
        date DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        check_in_time DATETIME2 NULL,
        check_out_time DATETIME2 NULL,
        status NVARCHAR(20) DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late', 'half-day')),
        work_hours DECIMAL(4,2) NULL,
        notes NVARCHAR(MAX) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_attendance_records_user FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT UQ_attendance_records_user_date UNIQUE (employee_id, date)
    );
    
    -- Create indexes
    CREATE INDEX IX_attendance_records_user ON attendance_records(employee_id);
    CREATE INDEX IX_attendance_records_date ON attendance_records(date DESC);
    CREATE INDEX IX_attendance_records_status ON attendance_records(status);
    
    PRINT 'Table attendance_records created successfully';
END
ELSE
BEGIN
    PRINT 'Table attendance_records already exists';
END
GO

-- =====================================================
-- 5. CREATE TRIGGER for user_preferences updated_at
-- =====================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_user_preferences_updated_at')
    DROP TRIGGER trg_user_preferences_updated_at;
GO

CREATE TRIGGER trg_user_preferences_updated_at
ON user_preferences
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE user_preferences
    SET updated_at = GETDATE()
    FROM user_preferences up
    INNER JOIN inserted i ON up.id = i.id;
END
GO

PRINT 'Trigger trg_user_preferences_updated_at created successfully';
GO

-- =====================================================
-- 6. CREATE TRIGGER for performance_reviews updated_at
-- =====================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_performance_reviews_updated_at')
    DROP TRIGGER trg_performance_reviews_updated_at;
GO

CREATE TRIGGER trg_performance_reviews_updated_at
ON performance_reviews
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE performance_reviews
    SET updated_at = GETDATE()
    FROM performance_reviews pr
    INNER JOIN inserted i ON pr.id = i.id;
END
GO

PRINT 'Trigger trg_performance_reviews_updated_at created successfully';
GO

-- =====================================================
-- 7. CREATE TRIGGER for performance_goals updated_at
-- =====================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_performance_goals_updated_at')
    DROP TRIGGER trg_performance_goals_updated_at;
GO

CREATE TRIGGER trg_performance_goals_updated_at
ON performance_goals
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE performance_goals
    SET updated_at = GETDATE()
    FROM performance_goals pg
    INNER JOIN inserted i ON pg.id = i.id;
END
GO

PRINT 'Trigger trg_performance_goals_updated_at created successfully';
GO

-- =====================================================
-- 8. CREATE TRIGGER for attendance_records updated_at
-- =====================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_attendance_records_updated_at')
    DROP TRIGGER trg_attendance_records_updated_at;
GO

CREATE TRIGGER trg_attendance_records_updated_at
ON attendance_records
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE attendance_records
    SET updated_at = GETDATE()
    FROM attendance_records ar
    INNER JOIN inserted i ON ar.id = i.id;
END
GO

PRINT 'Trigger trg_attendance_records_updated_at created successfully';
GO

-- =====================================================
-- 9. CREATE TRIGGER to calculate work hours and status
-- =====================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_attendance_calculate_work_hours')
    DROP TRIGGER trg_attendance_calculate_work_hours;
GO

CREATE TRIGGER trg_attendance_calculate_work_hours
ON attendance_records
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Only process if check_in_time or check_out_time changed
    IF UPDATE(check_in_time) OR UPDATE(check_out_time)
    BEGIN
        UPDATE attendance_records
        SET 
            work_hours = CASE 
                WHEN i.check_in_time IS NOT NULL AND i.check_out_time IS NOT NULL 
                THEN DATEDIFF(SECOND, i.check_in_time, i.check_out_time) / 3600.0
                ELSE work_hours
            END,
            status = CASE
                WHEN i.check_in_time IS NOT NULL AND i.check_out_time IS NOT NULL THEN
                    CASE
                        -- Check if late (after 9:15 AM)
                        WHEN DATEPART(HOUR, i.check_in_time) > 9 
                             OR (DATEPART(HOUR, i.check_in_time) = 9 AND DATEPART(MINUTE, i.check_in_time) > 15)
                        THEN 'late'
                        -- Check if half-day (less than 4 hours)
                        WHEN DATEDIFF(SECOND, i.check_in_time, i.check_out_time) / 3600.0 < 4
                        THEN 'half-day'
                        ELSE 'present'
                    END
                ELSE status
            END
        FROM attendance_records ar
        INNER JOIN inserted i ON ar.id = i.id;
    END
END
GO

PRINT 'Trigger trg_attendance_calculate_work_hours created successfully';
GO

-- =====================================================
-- 10. GRANT PERMISSIONS (Adjust as needed for your setup)
-- =====================================================
-- Example: Grant permissions to your application role
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences TO [YourAppRole];
-- GRANT SELECT, INSERT, UPDATE, DELETE ON performance_reviews TO [YourAppRole];
-- GRANT SELECT, INSERT, UPDATE, DELETE ON performance_goals TO [YourAppRole];
-- GRANT SELECT, INSERT, UPDATE, DELETE ON attendance_records TO [YourAppRole];

PRINT '========================================';
PRINT 'All migrations completed successfully!';
PRINT '========================================';
PRINT '';
PRINT 'Tables created:';
PRINT '  - user_preferences';
PRINT '  - performance_reviews';
PRINT '  - performance_goals';
PRINT '  - attendance_records';
PRINT '';
PRINT 'Triggers created:';
PRINT '  - trg_user_preferences_updated_at';
PRINT '  - trg_performance_reviews_updated_at';
PRINT '  - trg_performance_goals_updated_at';
PRINT '  - trg_attendance_records_updated_at';
PRINT '  - trg_attendance_calculate_work_hours';
PRINT '';
PRINT 'Next steps:';
PRINT '  1. Review and adjust foreign key references (employee_id columns)';
PRINT '  2. Grant appropriate permissions to application users';
PRINT '  3. Test the triggers with sample data';
PRINT '  4. Update your application connection strings if needed';
GO
