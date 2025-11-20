-- ============================================================================
-- Employee Portal Database Schema - SQL Server Primary Database
-- ============================================================================
-- Execute this script on your SQL Server database
-- This schema uses numeric employee IDs instead of GUIDs for easier management
--
-- IMPORTANT: This is the primary database schema. All data operations should
-- go through the backend API routes that connect to SQL Server.
--
-- Last Updated: 2025-11-17
-- Recent Changes:
--   - Backend routes now parse userId parameters as integers for proper comparisons
--   - Authorization checks updated to compare integer user IDs correctly
--   - Database queries use proper integer types for employee_id parameters
--
-- Note: If using Supabase for authentication, ensure data created in Supabase
-- is synced to SQL Server using the backend API or sync procedures.
-- ============================================================================

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
-- PROFILES TABLE (User Authentication and Profiles)
-- ============================================================================
CREATE TABLE profiles (
    id INT PRIMARY KEY IDENTITY(1,1),  -- Numeric employee ID
    email NVARCHAR(255) NOT NULL UNIQUE,
    full_name NVARCHAR(255) NOT NULL,
    password_hash NVARCHAR(255),  -- For password-based authentication
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
    id INT PRIMARY KEY IDENTITY(1,1),
    employee_id INT NOT NULL,
    role NVARCHAR(20) NOT NULL CHECK (role IN ('employee', 'hr', 'manager')),
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_user_roles_profiles FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT UQ_user_roles UNIQUE (employee_id, role)
);

-- ============================================================================
-- EMPLOYEES TABLE
-- ============================================================================
CREATE TABLE employees (
    id INT PRIMARY KEY IDENTITY(1,1),
    employee_id INT,
    full_name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    phone NVARCHAR(50),
    department NVARCHAR(255) NOT NULL,
    position NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) DEFAULT 'Active',
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_employees_profiles FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE SET NULL
);

-- ============================================================================
-- USER SESSIONS TABLE (Time Tracking)
-- ============================================================================
CREATE TABLE user_sessions (
    id INT PRIMARY KEY IDENTITY(1,1),
    employee_id INT NOT NULL,
    login_time DATETIME2 NOT NULL DEFAULT GETDATE(),
    logout_time DATETIME2,
    session_duration INT, -- Duration in minutes
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_user_sessions_profiles FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ============================================================================
-- HOLIDAYS TABLE
-- ============================================================================
-- HOLIDAYS TABLE
-- ============================================================================
CREATE TABLE holidays (
    id INT PRIMARY KEY IDENTITY(1,1),
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
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(255) NOT NULL,
    default_days INT NOT NULL DEFAULT 0,
    description NVARCHAR(MAX),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- ============================================================================
-- LEAVES TABLE (Two-tier approval: Manager -> HR)
-- ============================================================================
CREATE TABLE leaves (
    id INT PRIMARY KEY IDENTITY(1,1),
    employee_id INT NOT NULL,
    manager_id INT,  -- Manager who will approve first
    leave_type NVARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INT NOT NULL,
    reason NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(50) DEFAULT 'Pending',
    manager_status NVARCHAR(50) DEFAULT 'Pending',
    hr_status NVARCHAR(50) DEFAULT 'Pending',
    manager_approved_by INT,
    hr_approved_by INT,
    manager_approved_at DATETIME2,
    hr_approved_at DATETIME2,
    manager_comments NVARCHAR(MAX),
    hr_comments NVARCHAR(MAX),
    approved_by INT,  -- Kept for backward compatibility
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_leaves_profiles FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT FK_leaves_manager FOREIGN KEY (manager_id) REFERENCES profiles(id),
    CONSTRAINT FK_leaves_manager_approved_by FOREIGN KEY (manager_approved_by) REFERENCES profiles(id),
    CONSTRAINT FK_leaves_hr_approved_by FOREIGN KEY (hr_approved_by) REFERENCES profiles(id),
    CONSTRAINT FK_leaves_approved_by FOREIGN KEY (approved_by) REFERENCES profiles(id)
);

-- ============================================================================
-- LEAVE BALANCES TABLE
-- ============================================================================
CREATE TABLE leave_balances (
    id INT PRIMARY KEY IDENTITY(1,1),
    employee_id INT NOT NULL,
    year INT NOT NULL,
    leave_type NVARCHAR(255) NOT NULL,
    total_days DECIMAL(10, 2) NOT NULL DEFAULT 0,
    used_days DECIMAL(10, 2) NOT NULL DEFAULT 0,
    remaining_days DECIMAL(10, 2) NOT NULL DEFAULT 0,
    carry_forward_days DECIMAL(10, 2) DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_leave_balances_profiles FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT UQ_leave_balances UNIQUE (employee_id, year, leave_type)
);

-- ============================================================================
-- LEAVE COMMENTS TABLE
-- ============================================================================
CREATE TABLE leave_comments (
    id INT PRIMARY KEY IDENTITY(1,1),
    leave_id INT NOT NULL,
    employee_id INT NOT NULL,
    comment NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_leave_comments_leaves FOREIGN KEY (leave_id) REFERENCES leaves(id) ON DELETE CASCADE,
    CONSTRAINT FK_leave_comments_profiles FOREIGN KEY (employee_id) REFERENCES profiles(id)
);

-- ============================================================================
-- PAYSLIPS TABLE
-- ============================================================================
CREATE TABLE payslips (
    id INT PRIMARY KEY IDENTITY(1,1),
    employee_id INT NOT NULL,
    month NVARCHAR(50) NOT NULL,
    year INT NOT NULL,
    basic_salary DECIMAL(10, 2) NOT NULL,
    allowances DECIMAL(10, 2) DEFAULT 0,
    deductions DECIMAL(10, 2) DEFAULT 0,
    net_salary DECIMAL(10, 2) NOT NULL,
    file_url NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_payslips_profiles FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_user_roles_employee_id ON user_roles(employee_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE INDEX idx_employees_employee_id ON employees(employee_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_user_sessions_employee_id ON user_sessions(employee_id);
CREATE INDEX idx_user_sessions_login_time ON user_sessions(login_time);
CREATE INDEX idx_holidays_date ON holidays(date);
CREATE INDEX idx_leave_types_is_active ON leave_types(is_active);
CREATE INDEX idx_leaves_employee_id ON leaves(employee_id);
CREATE INDEX idx_leaves_status ON leaves(status);
CREATE INDEX idx_leaves_start_date ON leaves(start_date);
CREATE INDEX idx_leave_balances_employee_id_year ON leave_balances(employee_id, year);
CREATE INDEX idx_leave_balances_leave_type ON leave_balances(leave_type);
CREATE INDEX idx_leave_comments_leave_id ON leave_comments(leave_id);
CREATE INDEX idx_payslips_employee_id ON payslips(employee_id);
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
                i.employee_id,
                YEAR(i.start_date) as year,
                i.leave_type,
                i.days
            FROM inserted i
            INNER JOIN deleted d ON i.id = d.id
            WHERE i.status = 'Approved' AND d.status != 'Approved'
        ) AS source
        ON target.employee_id = source.employee_id 
           AND target.year = source.year 
           AND target.leave_type = source.leave_type
        WHEN MATCHED THEN
            UPDATE SET 
                used_days = target.used_days + source.days,
                remaining_days = target.total_days - (target.used_days + source.days),
                updated_at = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (employee_id, year, leave_type, total_days, used_days, remaining_days)
            VALUES (source.employee_id, source.year, source.leave_type, 20, source.days, 20 - source.days);
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
-- OAUTH USER SYNC PROCEDURE
-- ============================================================================
-- This procedure handles automatic employee record creation for OAuth users
-- Call this when a user logs in via Microsoft OAuth (or any OAuth provider)

GO
CREATE PROCEDURE sp_sync_oauth_user
    @email NVARCHAR(255),
    @full_name NVARCHAR(255),
    @department NVARCHAR(255) = 'Not Assigned',
    @position NVARCHAR(255) = 'Employee'
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @employee_id INT;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Check if profile exists by email, if not create it
        SELECT @employee_id = id FROM profiles WHERE email = @email;
        
        IF @employee_id IS NULL
        BEGIN
            INSERT INTO profiles (email, full_name, created_at, updated_at)
            VALUES (@email, @full_name, GETDATE(), GETDATE());
            
            SET @employee_id = SCOPE_IDENTITY();
            
            PRINT 'Profile created for user: ' + @email + ' with ID: ' + CAST(@employee_id AS NVARCHAR);
        END
        ELSE
        BEGIN
            PRINT 'Profile already exists for: ' + @email + ' with ID: ' + CAST(@employee_id AS NVARCHAR);
        END
        
        -- Check if employee record exists, if not create it
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE employee_id = @employee_id)
        BEGIN
            INSERT INTO employees (employee_id, full_name, email, department, position, status, created_at, updated_at)
            VALUES (@employee_id, @full_name, @email, @department, @position, 'Active', GETDATE(), GETDATE());
            
            PRINT 'Employee record created for: ' + @email;
        END
        ELSE
        BEGIN
            -- Update existing employee record with latest info
            UPDATE employees
            SET full_name = @full_name,
                email = @email,
                department = @department,
                position = @position,
                updated_at = GETDATE()
            WHERE employee_id = @employee_id;
            
            PRINT 'Employee record updated for: ' + @email;
        END
        
        -- Assign default employee role if not exists
        IF NOT EXISTS (SELECT 1 FROM user_roles WHERE employee_id = @employee_id AND role = 'employee')
        BEGIN
            INSERT INTO user_roles (employee_id, role, created_at)
            VALUES (@employee_id, 'employee', GETDATE());
            
            PRINT 'Employee role assigned to: ' + @email;
        END
        
        COMMIT TRANSACTION;
        
        PRINT 'OAuth user sync completed successfully for: ' + @email;
        
        -- Return the user ID
        SELECT @employee_id AS employee_id;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO

-- ============================================================================
-- SCHEMA CREATION COMPLETE
-- ============================================================================
PRINT '';
PRINT '========================================';
PRINT 'Database schema created successfully!';
PRINT '========================================';
PRINT '';
PRINT 'ID System: INT IDENTITY (numeric employee IDs: 1, 2, 3...)';
PRINT '';
PRINT 'Tables created:';
PRINT '  - profiles (user authentication with numeric IDs)';
PRINT '  - user_roles (employee, hr, manager roles)';
PRINT '  - employees (employee details)';
PRINT '  - user_sessions (time tracking)';
PRINT '  - holidays (company holidays)';
PRINT '  - leave_types (configurable leave types)';
PRINT '  - leaves (leave requests and approvals)';
PRINT '  - leave_balances (leave allocation tracking)';
PRINT '  - leave_comments (leave approval comments)';
PRINT '  - payslips (salary information)';
PRINT '';
PRINT 'Triggers created:';
PRINT '  - trg_calculate_session_duration';
PRINT '  - trg_update_leave_types_updated_at';
PRINT '  - trg_update_leave_balances_updated_at';
PRINT '  - trg_update_leave_balance_on_approval';
PRINT '';
PRINT 'Procedures created:';
PRINT '  - sp_sync_oauth_user (OAuth user synchronization)';
PRINT '';
PRINT '========================================';
PRINT 'IMPORTANT ARCHITECTURE NOTES';
PRINT '========================================';
PRINT '';
PRINT 'This SQL Server database is the PRIMARY data store.';
PRINT '';
PRINT 'Data Flow:';
PRINT '  1. Frontend -> Backend API (Node.js) -> SQL Server';
PRINT '  2. All CRUD operations must go through backend API routes';
PRINT '  3. Backend routes use integer user IDs for authorization';
PRINT '';
PRINT 'If using Supabase for authentication:';
PRINT '  - User authentication happens in Supabase';
PRINT '  - User data must be synced to SQL Server via:';
PRINT '    a) Backend API calls after authentication';
PRINT '    b) Calling sp_sync_oauth_user procedure';
PRINT '    c) Using a sync service/edge function';
PRINT '';
PRINT 'Backend API Changes (2025-11-17):';
PRINT '  - Routes parse userId URL parameters as integers';
PRINT '  - Authorization compares integer user IDs correctly';
PRINT '  - Database queries use sql.Int for employee_id parameters';
PRINT '';
PRINT 'To verify data is being written to SQL Server:';
PRINT '  SELECT * FROM profiles ORDER BY created_at DESC;';
PRINT '  SELECT * FROM profiles ORDER BY created_at DESC;';
PRINT '  SELECT * FROM user_roles ORDER BY created_at DESC;';
PRINT '';
PRINT '========================================';
GO
PRINT '  - profiles (user authentication with numeric IDs)';
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
PRINT 'Stored Procedures:';
PRINT '  - sp_sync_oauth_user (OAuth user sync - uses email lookup)';
PRINT '';
PRINT 'Automated Features:';
PRINT '  - Session duration auto-calculation on logout';
PRINT '  - Leave balance auto-update on leave approval';
PRINT '  - Timestamp management (updated_at triggers)';
PRINT '  - OAuth user sync (creates employee records automatically)';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Run setup-hr-role.sql to grant HR access';
PRINT '  2. Create user accounts in profiles table (auto-increment IDs)';
PRINT '  3. Sync with your authentication system';
PRINT '  4. OAuth users will auto-create employee records';
PRINT '';
PRINT 'For detailed documentation, see DATABASE_SYNC_GUIDE.md';
PRINT '========================================';
