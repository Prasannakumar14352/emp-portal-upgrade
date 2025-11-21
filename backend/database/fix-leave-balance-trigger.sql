-- Fix the leave balance trigger to use correct column name
-- The trigger is referencing 'user_id' but the column is actually 'employee_id'

-- Drop the existing trigger if it exists
IF OBJECT_ID('trg_update_leave_balance_on_approval', 'TR') IS NOT NULL
    DROP TRIGGER trg_update_leave_balance_on_approval;
GO

-- Recreate the trigger with correct column names
CREATE TRIGGER trg_update_leave_balance_on_approval
ON leaves
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Only proceed if status changed to 'Approved'
    IF UPDATE(status) OR UPDATE(hr_status)
    BEGIN
        -- Update leave balances for newly approved leaves
        DECLARE @employee_id INT;
        DECLARE @leave_type NVARCHAR(50);
        DECLARE @days INT;
        DECLARE @year INT;
        DECLARE @leave_id INT;
        
        -- Process each updated row where status is now 'Approved'
        DECLARE leave_cursor CURSOR FOR
        SELECT i.employee_id, i.leave_type, i.days, YEAR(i.start_date) as leave_year, i.id
        FROM INSERTED i
        INNER JOIN DELETED d ON i.id = d.id
        WHERE i.status = 'Approved' 
          AND (d.status != 'Approved' OR d.status IS NULL);
        
        OPEN leave_cursor;
        
        FETCH NEXT FROM leave_cursor INTO @employee_id, @leave_type, @days, @year, @leave_id;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Check if leave balance record exists
            IF EXISTS (
                SELECT 1 
                FROM leave_balances 
                WHERE employee_id = @employee_id 
                  AND leave_type = @leave_type 
                  AND year = @year
            )
            BEGIN
                -- Update existing balance
                UPDATE leave_balances
                SET used_days = used_days + @days,
                    remaining_days = total_days - (used_days + @days),
                    updated_at = GETDATE()
                WHERE employee_id = @employee_id
                  AND leave_type = @leave_type
                  AND year = @year;
            END
            ELSE
            BEGIN
                -- Create new balance record (assuming 20 days default)
                INSERT INTO leave_balances (employee_id, year, leave_type, total_days, used_days, remaining_days, created_at, updated_at)
                VALUES (@employee_id, @year, @leave_type, 20, @days, 20 - @days, GETDATE(), GETDATE());
            END
            
            FETCH NEXT FROM leave_cursor INTO @employee_id, @leave_type, @days, @year, @leave_id;
        END
        
        CLOSE leave_cursor;
        DEALLOCATE leave_cursor;
    END
END;
GO

PRINT 'Leave balance trigger fixed successfully. Changed user_id references to employee_id.';
