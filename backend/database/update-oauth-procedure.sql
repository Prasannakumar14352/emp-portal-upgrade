-- ============================================================================
-- UPDATE OAUTH USER SYNC PROCEDURE
-- ============================================================================
-- Run this to update the sp_sync_oauth_user procedure to the new version
-- that doesn't require @user_id as an input parameter

-- Drop the old procedure first
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_sync_oauth_user')
BEGIN
    DROP PROCEDURE sp_sync_oauth_user;
    PRINT 'Old procedure dropped successfully';
END
GO

-- Create the updated procedure
CREATE PROCEDURE sp_sync_oauth_user
    @email NVARCHAR(255),
    @full_name NVARCHAR(255),
    @department NVARCHAR(255) = 'Not Assigned',
    @position NVARCHAR(255) = 'Employee'
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @user_id UNIQUEIDENTIFIER;
    DECLARE @employee_id INT;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Check if profile exists by email, if not create it
        SELECT @user_id = id, @employee_id = employee_id FROM profiles WHERE email = @email;
        
        IF @user_id IS NULL
        BEGIN
            INSERT INTO profiles (id, email, full_name, created_at, updated_at)
            VALUES (NEWID(), @email, @full_name, GETDATE(), GETDATE());
            
            SET @user_id = (SELECT id FROM profiles WHERE email = @email);
            SET @employee_id = (SELECT employee_id FROM profiles WHERE email = @email);
            
            PRINT 'Profile created for user: ' + @email + ' with employee_id: ' + CAST(@employee_id AS NVARCHAR);
        END
        ELSE
        BEGIN
            PRINT 'Profile already exists for: ' + @email + ' with employee_id: ' + CAST(@employee_id AS NVARCHAR);
        END
        
        -- Check if employee record exists, if not create it
        IF NOT EXISTS (SELECT 1 FROM employees WHERE user_id = @user_id)
        BEGIN
            INSERT INTO employees (user_id, full_name, email, department, position, status, created_at, updated_at)
            VALUES (@user_id, @full_name, @email, @department, @position, 'Active', GETDATE(), GETDATE());
            
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
            WHERE user_id = @user_id;
            
            PRINT 'Employee record updated for: ' + @email;
        END
        
        -- Assign default employee role if not exists
        IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = @user_id AND role = 'employee')
        BEGIN
            INSERT INTO user_roles (user_id, role, created_at)
            VALUES (@user_id, 'employee', GETDATE());
            
            PRINT 'Employee role assigned to: ' + @email;
        END
        
        COMMIT TRANSACTION;
        
        PRINT 'OAuth user sync completed successfully for: ' + @email;
        
        -- Return the employee_id (numeric) for JWT token
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

PRINT 'sp_sync_oauth_user procedure updated successfully';
