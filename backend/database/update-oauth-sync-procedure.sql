-- ============================================================================
-- UPDATE OAUTH SYNC PROCEDURE - Prevent Default Employee Role Creation
-- ============================================================================
-- This script updates the sp_sync_oauth_user procedure to NOT automatically
-- create a default 'employee' role. Role assignment is handled by the OAuth
-- callback based on Azure AD group memberships.
-- ============================================================================

USE EmployeePortal;
GO

-- Drop and recreate the procedure without automatic role assignment
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_sync_oauth_user')
BEGIN
    DROP PROCEDURE sp_sync_oauth_user;
    PRINT 'Dropped existing sp_sync_oauth_user procedure';
END
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
        
        -- Check if user exists in profiles
        SELECT @employee_id = employee_id
        FROM profiles
        WHERE email = @email;
        
        IF @employee_id IS NULL
        BEGIN
            -- Create new profile
            INSERT INTO profiles (email, full_name, department, position, created_at, updated_at)
            VALUES (@email, @full_name, @department, @position, GETDATE(), GETDATE());
            
            SET @employee_id = SCOPE_IDENTITY();
            
            PRINT 'Created new profile with employee_id: ' + CAST(@employee_id AS NVARCHAR);
        END
        ELSE
        BEGIN
            -- Update existing profile
            UPDATE profiles
            SET full_name = @full_name,
                department = COALESCE(@department, department),
                position = COALESCE(@position, position),
                updated_at = GETDATE()
            WHERE employee_id = @employee_id;
            
            PRINT 'Updated existing profile with employee_id: ' + CAST(@employee_id AS NVARCHAR);
        END
        
        -- Check if employee record exists (separate table)
        IF NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = @employee_id)
        BEGIN
            INSERT INTO employees (employee_id, email, full_name, department, position, status, created_at, updated_at)
            VALUES (@employee_id, @email, @full_name, @department, @position, 'Active', GETDATE(), GETDATE());
            
            PRINT 'Created employee record for employee_id: ' + CAST(@employee_id AS NVARCHAR);
        END
        ELSE
        BEGIN
            UPDATE employees
            SET full_name = @full_name,
                department = COALESCE(@department, department),
                position = COALESCE(@position, position),
                updated_at = GETDATE()
            WHERE employee_id = @employee_id;
            
            PRINT 'Updated employee record for employee_id: ' + CAST(@employee_id AS NVARCHAR);
        END
        
        -- NOTE: Role assignment is now handled by the OAuth callback
        -- based on Azure AD group memberships. We no longer automatically
        -- assign a default 'employee' role here.
        
        COMMIT TRANSACTION;
        
        -- Return the employee_id
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
END
GO

PRINT 'sp_sync_oauth_user procedure updated successfully!';
PRINT 'The procedure no longer creates default employee roles.';
PRINT 'Role assignment is now handled by OAuth callback based on Azure AD groups.';
GO
