-- Employee Portal Database Schema
-- Execute this script on your SQL Server database

-- Drop existing tables if they exist (for fresh setup)
IF OBJECT_ID('leave_comments', 'U') IS NOT NULL DROP TABLE leave_comments;
IF OBJECT_ID('leave_balances', 'U') IS NOT NULL DROP TABLE leave_balances;
IF OBJECT_ID('leaves', 'U') IS NOT NULL DROP TABLE leaves;
IF OBJECT_ID('payslips', 'U') IS NOT NULL DROP TABLE payslips;
IF OBJECT_ID('holidays', 'U') IS NOT NULL DROP TABLE holidays;
IF OBJECT_ID('employees', 'U') IS NOT NULL DROP TABLE employees;
IF OBJECT_ID('user_roles', 'U') IS NOT NULL DROP TABLE user_roles;
IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;

-- Users table
CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(100) NOT NULL,
    phone NVARCHAR(20),
    department NVARCHAR(100),
    position NVARCHAR(100),
    avatar_url NVARCHAR(500),
    hire_date DATE,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- User roles table (CRITICAL: Roles must be stored separately for security)
CREATE TABLE user_roles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    role NVARCHAR(20) NOT NULL CHECK (role IN ('employee', 'hr', 'manager')),
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_user_roles_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT UQ_user_roles UNIQUE (user_id, role)
);

-- Employees table (additional employee information)
CREATE TABLE employees (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER UNIQUE,
    full_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    phone NVARCHAR(20),
    department NVARCHAR(100) NOT NULL,
    position NVARCHAR(100) NOT NULL,
    status NVARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'On Leave')),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_employees_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Holidays table
CREATE TABLE holidays (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    type NVARCHAR(50) NOT NULL,
    description NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Leaves table
CREATE TABLE leaves (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    leave_type NVARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INT NOT NULL,
    reason NVARCHAR(500) NOT NULL,
    status NVARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approved_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_leaves_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT FK_leaves_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Leave balances table
CREATE TABLE leave_balances (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    year INT NOT NULL,
    leave_type NVARCHAR(50) NOT NULL,
    total_days INT DEFAULT 20,
    used_days INT DEFAULT 0,
    remaining_days INT DEFAULT 20,
    carry_forward_days INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_leave_balances_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT UQ_leave_balances UNIQUE (user_id, year, leave_type)
);

-- Leave comments table
CREATE TABLE leave_comments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    leave_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    comment NVARCHAR(1000) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_leave_comments_leaves FOREIGN KEY (leave_id) REFERENCES leaves(id) ON DELETE CASCADE,
    CONSTRAINT FK_leave_comments_users FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Payslips table
CREATE TABLE payslips (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    month NVARCHAR(20) NOT NULL,
    year INT NOT NULL,
    basic_salary DECIMAL(10, 2) NOT NULL,
    allowances DECIMAL(10, 2) DEFAULT 0,
    deductions DECIMAL(10, 2) DEFAULT 0,
    net_salary DECIMAL(10, 2) NOT NULL,
    file_url NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_payslips_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_leaves_user_id ON leaves(user_id);
CREATE INDEX idx_leaves_status ON leaves(status);
CREATE INDEX idx_leave_balances_user_id ON leave_balances(user_id, year);
CREATE INDEX idx_payslips_user_id ON payslips(user_id);
CREATE INDEX idx_holidays_date ON holidays(date);

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

PRINT 'Database schema created successfully!';
PRINT 'Tables created: users, user_roles, employees, holidays, leaves, leave_balances, leave_comments, payslips';
