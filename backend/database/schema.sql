-- Employee Portal Database Schema - Synced with Supabase
-- Execute this script on your SQL Server database
-- This schema mirrors the Supabase database structure exactly

-- Drop existing tables if they exist (for fresh setup)
IF OBJECT_ID('leave_comments', 'U') IS NOT NULL DROP TABLE leave_comments;
IF OBJECT_ID('leave_balances', 'U') IS NOT NULL DROP TABLE leave_balances;
IF OBJECT_ID('leaves', 'U') IS NOT NULL DROP TABLE leaves;
IF OBJECT_ID('leave_types', 'U') IS NOT NULL DROP TABLE leave_types;
IF OBJECT_ID('payslips', 'U') IS NOT NULL DROP TABLE payslips;
IF OBJECT_ID('holidays', 'U') IS NOT NULL DROP TABLE holidays;
IF OBJECT_ID('user_sessions', 'U') IS NOT NULL DROP TABLE user_sessions;
IF OBJECT_ID('employees', 'U') IS NOT NULL DROP TABLE employees;
IF OBJECT_ID('user_roles', 'U') IS NOT NULL DROP TABLE user_roles;
IF OBJECT_ID('profiles', 'U') IS NOT NULL DROP TABLE profiles;

-- ============================================================================
-- PROFILES TABLE (Maps to Supabase auth.users + profiles)
-- ============================================================================
-- Note: In Supabase, authentication is handled by auth.users (managed by Supabase)
-- and additional user info is stored in profiles table. In SQL Server, you'll
-- need to manage authentication separately or integrate with your auth system.
CREATE TABLE profiles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) NOT NULL UNIQUE,
    full_name NVARCHAR(255) NOT NULL,
    phone NVARCHAR(50),
    department NVARCHAR(255),
    position NVARCHAR(255),
    avatar_url NVARCHAR(500),
    hire_date DATE,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- ============================================================================
-- USER ROLES TABLE
-- ============================================================================
CREATE TABLE user_roles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    role NVARCHAR(20) NOT NULL CHECK (role IN ('employee', 'hr', 'manager')),
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_user_roles_profiles FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT UQ_user_roles UNIQUE (user_id, role)
);

-- ============================================================================
-- EMPLOYEES TABLE
-- ============================================================================
CREATE TABLE employees (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER,
    full_name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    phone NVARCHAR(50),
    department NVARCHAR(255) NOT NULL,
    position NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) DEFAULT 'Active',
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_employees_profiles FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
);

-- ============================================================================
-- USER SESSIONS TABLE (Time Tracking)
-- ============================================================================
CREATE TABLE user_sessions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    login_time DATETIME2 NOT NULL DEFAULT GETDATE(),
    logout_time DATETIME2,
    session_duration INT, -- Duration in minutes
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_user_sessions_profiles FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ============================================================================
-- HOLIDAYS TABLE
-- ============================================================================
CREATE TABLE holidays (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    type NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE()
);

-- ============================================================================
-- LEAVE TYPES TABLE
-- ============================================================================
CREATE TABLE leave_types (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    default_days INT NOT NULL DEFAULT 0,
    description NVARCHAR(MAX),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- ============================================================================
-- LEAVES TABLE
-- ============================================================================
CREATE TABLE leaves (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    leave_type NVARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INT NOT NULL,
    reason NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(50) DEFAULT 'Pending',
    approved_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_leaves_profiles FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT FK_leaves_approved_by FOREIGN KEY (approved_by) REFERENCES profiles(id)
);

-- ============================================================================
-- LEAVE BALANCES TABLE
-- ============================================================================
CREATE TABLE leave_balances (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    year INT NOT NULL,
    leave_type NVARCHAR(255) NOT NULL,
    total_days DECIMAL(10, 2) NOT NULL DEFAULT 0,
    used_days DECIMAL(10, 2) NOT NULL DEFAULT 0,
    remaining_days DECIMAL(10, 2) NOT NULL DEFAULT 0,
    carry_forward_days DECIMAL(10, 2) DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_leave_balances_profiles FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT UQ_leave_balances UNIQUE (user_id, year, leave_type)
);

-- ============================================================================
-- LEAVE COMMENTS TABLE
-- ============================================================================
CREATE TABLE leave_comments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    leave_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    comment NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_leave_comments_leaves FOREIGN KEY (leave_id) REFERENCES leaves(id) ON DELETE CASCADE,
    CONSTRAINT FK_leave_comments_profiles FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- ============================================================================
-- PAYSLIPS TABLE
-- ============================================================================
CREATE TABLE payslips (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    month NVARCHAR(50) NOT NULL,
    year INT NOT NULL,
    basic_salary DECIMAL(10, 2) NOT NULL,
    allowances DECIMAL(10, 2) DEFAULT 0,
    deductions DECIMAL(10, 2) DEFAULT 0,
    net_salary DECIMAL(10, 2) NOT NULL,
    file_url NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_payslips_profiles FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_login_time ON user_sessions(login_time);
CREATE INDEX idx_holidays_date ON holidays(date);
CREATE INDEX idx_leave_types_is_active ON leave_types(is_active);
CREATE INDEX idx_leaves_user_id ON leaves(user_id);
CREATE INDEX idx_leaves_status ON leaves(status);
CREATE INDEX idx_leaves_start_date ON leaves(start_date);
CREATE INDEX idx_leave_balances_user_id_year ON leave_balances(user_id, year);
CREATE INDEX idx_leave_balances_leave_type ON leave_balances(leave_type);
CREATE INDEX idx_leave_comments_leave_id ON leave_comments(leave_id);
CREATE INDEX idx_payslips_user_id ON payslips(user_id);
CREATE INDEX idx_payslips_year_month ON payslips(year, month);

-- ============================================================================
-- CREATE TRIGGERS FOR AUTOMATED UPDATES
-- ============================================================================

-- Create trigger for automatic session duration calculation
GO
CREATE TRIGGER trg_calculate_session_duration
ON user_sessions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE user_sessions
    SET session_duration = DATEDIFF(MINUTE, i.login_time, i.logout_time)
    FROM user_sessions us
    INNER JOIN inserted i ON us.id = i.id
    WHERE i.logout_time IS NOT NULL AND us.session_duration IS NULL;
END;
GO

-- Create trigger for automatic leave_types updated_at
CREATE TRIGGER trg_update_leave_types_updated_at
ON leave_types
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE leave_types
    SET updated_at = GETDATE()
    FROM leave_types lt
    INNER JOIN inserted i ON lt.id = i.id;
END;
GO

-- Create trigger for automatic leave_balances updated_at
CREATE TRIGGER trg_update_leave_balances_updated_at
ON leave_balances
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE leave_balances
    SET updated_at = GETDATE()
    FROM leave_balances lb
    INNER JOIN inserted i ON lb.id = i.id;
END;
GO

-- Create trigger for automated leave balance updates on approval
CREATE TRIGGER trg_update_leave_balance_on_approval
ON leaves
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Only process when status changes to 'Approved'
    IF EXISTS (
        SELECT 1 
        FROM inserted i 
        INNER JOIN deleted d ON i.id = d.id 
        WHERE i.status = 'Approved' AND d.status != 'Approved'
    )
    BEGIN
        -- Update leave balances using MERGE
        MERGE leave_balances AS target
        USING (
            SELECT 
                i.user_id,
                YEAR(i.start_date) as year,
                i.leave_type,
                i.days
            FROM inserted i
            INNER JOIN deleted d ON i.id = d.id
            WHERE i.status = 'Approved' AND d.status != 'Approved'
        ) AS source
        ON target.user_id = source.user_id 
           AND target.year = source.year 
           AND target.leave_type = source.leave_type
        WHEN MATCHED THEN
            UPDATE SET 
                used_days = target.used_days + source.days,
                remaining_days = target.total_days - (target.used_days + source.days),
                updated_at = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (user_id, year, leave_type, total_days, used_days, remaining_days)
            VALUES (source.user_id, source.year, source.leave_type, 20, source.days, 20 - source.days);
    END
END;
GO

-- Insert default leave types
INSERT INTO leave_types (name, default_days, description, is_active) VALUES
('Annual Leave', 20, 'Standard annual vacation leave', 1),
('Sick Leave', 12, 'Medical and health-related leave', 1),
('Compassionate Leave', 5, 'Leave for family emergencies and bereavement', 1),
('Loss of Pay', 0, 'Unpaid leave for personal reasons', 1),
('Paternity Leave', 15, 'Leave for new fathers', 1);

-- Insert sample holidays
INSERT INTO holidays (name, date, type, description) VALUES
('New Year''s Day', '2026-01-01', 'Public Holiday', 'First day of the year'),
('Republic Day', '2026-01-26', 'National Holiday', 'Celebrating India''s Republic'),
('Holi', '2026-03-14', 'Festival', 'Festival of Colors'),
('Good Friday', '2026-04-10', 'Religious', 'Christian holiday'),
('Independence Day', '2026-08-15', 'National Holiday', 'India''s Independence'),
('Gandhi Jayanti', '2026-10-02', 'National Holiday', 'Mahatma Gandhi''s Birthday'),
('Diwali', '2026-10-24', 'Festival', 'Festival of Lights'),
('Christmas Day', '2026-12-25', 'Religious', 'Christian holiday');

-- ============================================================================
-- SCHEMA CREATION COMPLETE
-- ============================================================================
PRINT '';
PRINT '========================================';
PRINT 'Database schema created successfully!';
PRINT '========================================';
PRINT '';
PRINT 'Tables created:';
PRINT '  - profiles (user authentication and profiles)';
PRINT '  - user_roles (role management: employee, hr, manager)';
PRINT '  - user_sessions (time tracking)';
PRINT '  - employees (employee details)';
PRINT '  - holidays (public holidays)';
PRINT '  - leave_types (leave type definitions)';
PRINT '  - leaves (leave requests)';
PRINT '  - leave_balances (leave balance tracking)';
PRINT '  - leave_comments (leave request comments)';
PRINT '  - payslips (salary information)';
PRINT '';
PRINT 'Automated Features:';
PRINT '  - Session duration auto-calculation on logout';
PRINT '  - Leave balance auto-update on leave approval';
PRINT '  - Timestamp management (updated_at triggers)';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Run setup-hr-role.sql to grant HR access';
PRINT '  2. Create user accounts in profiles table';
PRINT '  3. Sync with your authentication system';
PRINT '';
PRINT 'For detailed documentation, see DATABASE_SYNC_GUIDE.md';
PRINT '========================================';
