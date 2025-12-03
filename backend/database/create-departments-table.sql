-- ============================================================================
-- CREATE DEPARTMENTS TABLE
-- ============================================================================
-- This script creates a departments table and migrates existing department data
-- Execute this on your SQL Server database

USE [your_database_name];
GO

-- Create departments table
IF OBJECT_ID('departments', 'U') IS NOT NULL 
    DROP TABLE departments;
GO

CREATE TABLE departments (
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(255) NOT NULL UNIQUE,
    description NVARCHAR(MAX),
    manager_id INT,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_departments_manager FOREIGN KEY (manager_id) REFERENCES profiles(id)
);
GO

-- Create index for performance
CREATE INDEX idx_departments_name ON departments(name);
CREATE INDEX idx_departments_is_active ON departments(is_active);
GO

-- Create trigger for automatic updated_at
CREATE TRIGGER trg_update_departments_updated_at
ON departments
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE departments
    SET updated_at = GETDATE()
    FROM departments d
    INNER JOIN inserted i ON d.id = i.id;
END;
GO

-- Migrate existing departments from profiles and employees tables
INSERT INTO departments (name, is_active)
SELECT DISTINCT department, 1
FROM (
    SELECT department FROM profiles WHERE department IS NOT NULL
    UNION
    SELECT department FROM employees WHERE department IS NOT NULL
) AS dept_list
WHERE department NOT IN ('Not Assigned', '')
  AND department IS NOT NULL;
GO

-- Insert default departments if none exist
IF NOT EXISTS (SELECT 1 FROM departments)
BEGIN
    INSERT INTO departments (name, description, is_active) VALUES
    ('Engineering', 'Software development and technical teams', 1),
    ('Human Resources', 'HR and people operations', 1),
    ('Sales', 'Sales and business development', 1),
    ('Marketing', 'Marketing and communications', 1),
    ('Finance', 'Accounting and financial operations', 1),
    ('Operations', 'Business operations and support', 1),
    ('Not Assigned', 'Default department for new employees', 1);
END;
GO

PRINT '========================================';
PRINT 'Departments table created successfully!';
PRINT '========================================';
PRINT '';
PRINT 'Migrated existing departments from profiles and employees tables';
PRINT 'Default departments inserted if table was empty';
PRINT '';
PRINT 'Next steps:';
PRINT '  1. Review departments: SELECT * FROM departments;';
PRINT '  2. Update bulk import to auto-create departments';
PRINT '  3. Consider adding department_id foreign keys to profiles/employees';
PRINT '========================================';
GO
