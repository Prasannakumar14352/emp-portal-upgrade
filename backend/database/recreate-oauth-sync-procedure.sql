-- Recreate sp_sync_oauth_user stored procedure
-- This procedure syncs OAuth user data to profiles and employees tables

-- Drop existing procedure if it exists
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_sync_oauth_user')
BEGIN
    DROP PROCEDURE sp_sync_oauth_user;
END
GO

-- Create the stored procedure
CREATE PROCEDURE sp_sync_oauth_user
    @email NVARCHAR(255),
    @full_name NVARCHAR(255),
    @department NVARCHAR(255),
    @position NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @employee_id INT;
    DECLARE @employee_id NVARCHAR(50);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Check if profile exists with this email
        SELECT @employee_id = employee_id, @employee_id = employee_id 
        FROM profiles 
        WHERE email = @email;
        
        IF @employee_id IS NULL
        BEGIN
            -- Generate a new employee_id (UUID format)
            SET @employee_id = LOWER(NEWID());
            
            -- Insert into profiles table
            INSERT INTO profiles (employee_id, email, full_name, department, position, created_at, updated_at)
            VALUES (@employee_id, @email, @full_name, @department, @position, GETDATE(), GETDATE());
            
            -- Get the auto-generated employee_id
            SET @employee_id = SCOPE_IDENTITY();
            
            -- Insert into employees table (if it exists and is separate)
            IF EXISTS (SELECT * FROM sys.tables WHERE name = 'employees')
            BEGIN
                INSERT INTO employees (employee_id, email, full_name, department, position, status, created_at, updated_at)
                VALUES (@employee_id, @email, @full_name, @department, @position, 'Active', GETDATE(), GETDATE());
            END
        END
        ELSE
        BEGIN
            -- Update existing profile
            UPDATE profiles
            SET full_name = @full_name,
                department = @department,
                position = @position,
                updated_at = GETDATE()
            WHERE employee_id = @employee_id;
            
            -- Update employees table if it exists
            IF EXISTS (SELECT * FROM sys.tables WHERE name = 'employees')
            BEGIN
                UPDATE employees
                SET full_name = @full_name,
                    department = @department,
                    position = @position,
                    updated_at = GETDATE()
                WHERE employee_id = @employee_id;
            END
        END
        
        -- Return the employee_id
        SELECT @employee_id AS employee_id;
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        -- Re-throw the error with details
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

-- Grant execute permissions (adjust as needed for your security setup)
-- GRANT EXECUTE ON sp_sync_oauth_user TO [YourAppUser];

PRINT 'sp_sync_oauth_user procedure created successfully';
