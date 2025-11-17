-- Low Balance Notification Setup
-- This script helps you identify users with low leave balances
-- and can be used to trigger email notifications

-- ===========================================
-- CONFIGURATION
-- ===========================================
DECLARE @threshold_percentage DECIMAL(5,2) = 25.0;  -- Alert when balance falls below 25%
DECLARE @current_year INT = YEAR(GETDATE());

-- ===========================================
-- FIND USERS WITH LOW BALANCE
-- ===========================================
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    u.department,
    lb.leave_type,
    lb.total_days,
    lb.used_days,
    lb.remaining_days,
    CAST(lb.remaining_days as FLOAT) / NULLIF(lb.total_days, 0) * 100 as percentage_remaining,
    CASE 
        WHEN CAST(lb.remaining_days as FLOAT) / NULLIF(lb.total_days, 0) * 100 < 10 THEN 'CRITICAL'
        WHEN CAST(lb.remaining_days as FLOAT) / NULLIF(lb.total_days, 0) * 100 < 25 THEN 'WARNING'
        ELSE 'OK'
    END as alert_level
INTO #low_balance_users
FROM leave_balances lb
INNER JOIN users u ON lb.user_id = u.id
WHERE lb.year = @current_year
    AND lb.total_days > 0
    AND CAST(lb.remaining_days as FLOAT) / NULLIF(lb.total_days, 0) * 100 < @threshold_percentage
ORDER BY percentage_remaining ASC;

-- ===========================================
-- DISPLAY SUMMARY
-- ===========================================
PRINT '========================================';
PRINT 'LOW LEAVE BALANCE ALERT REPORT';
PRINT '========================================';
PRINT 'Year: ' + CAST(@current_year AS VARCHAR);
PRINT 'Threshold: ' + CAST(@threshold_percentage AS VARCHAR) + '%';
PRINT 'Generated: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '';

-- Count by alert level
DECLARE @critical_count INT = (SELECT COUNT(*) FROM #low_balance_users WHERE alert_level = 'CRITICAL');
DECLARE @warning_count INT = (SELECT COUNT(*) FROM #low_balance_users WHERE alert_level = 'WARNING');
DECLARE @total_count INT = (SELECT COUNT(*) FROM #low_balance_users);

PRINT 'Total Alerts: ' + CAST(@total_count AS VARCHAR);
PRINT '  - Critical (< 10%): ' + CAST(@critical_count AS VARCHAR);
PRINT '  - Warning (< 25%): ' + CAST(@warning_count AS VARCHAR);
PRINT '';
PRINT '========================================';
PRINT '';

-- ===========================================
-- DETAILED REPORT
-- ===========================================
SELECT 
    alert_level as 'Alert Level',
    full_name as 'Employee Name',
    email as 'Email',
    department as 'Department',
    leave_type as 'Leave Type',
    total_days as 'Total',
    used_days as 'Used',
    remaining_days as 'Remaining',
    CAST(percentage_remaining AS DECIMAL(5,2)) as '% Remaining'
FROM #low_balance_users
ORDER BY 
    CASE alert_level 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'WARNING' THEN 2 
        ELSE 3 
    END,
    percentage_remaining ASC;

-- ===========================================
-- EMAIL NOTIFICATION TEMPLATE
-- ===========================================
PRINT '';
PRINT '========================================';
PRINT 'EMAIL NOTIFICATION TEMPLATE';
PRINT '========================================';
PRINT '';

DECLARE @employee_name NVARCHAR(100);
DECLARE @employee_email NVARCHAR(255);
DECLARE @leave_type_name NVARCHAR(100);
DECLARE @remaining DECIMAL(10,2);
DECLARE @total DECIMAL(10,2);
DECLARE @percentage DECIMAL(5,2);

DECLARE email_cursor CURSOR FOR
SELECT full_name, email, leave_type, remaining_days, total_days, percentage_remaining
FROM #low_balance_users
WHERE alert_level IN ('CRITICAL', 'WARNING');

OPEN email_cursor;
FETCH NEXT FROM email_cursor INTO @employee_name, @employee_email, @leave_type_name, @remaining, @total, @percentage;

WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT 'To: ' + @employee_email;
    PRINT 'Subject: Low Leave Balance Alert - ' + @leave_type_name;
    PRINT 'Body:';
    PRINT '--------------------------------------';
    PRINT 'Dear ' + @employee_name + ',';
    PRINT '';
    PRINT 'This is an automated notification to inform you that your ' + @leave_type_name + ' balance is running low.';
    PRINT '';
    PRINT 'Current Balance:';
    PRINT '  Total Days: ' + CAST(@total AS VARCHAR);
    PRINT '  Used Days: ' + CAST(@total - @remaining AS VARCHAR);
    PRINT '  Remaining Days: ' + CAST(@remaining AS VARCHAR);
    PRINT '  Percentage Remaining: ' + CAST(@percentage AS VARCHAR) + '%';
    PRINT '';
    
    IF @percentage < 10
        PRINT 'CRITICAL: You have less than 10% of your leave balance remaining. Please plan accordingly.';
    ELSE
        PRINT 'WARNING: You have less than 25% of your leave balance remaining. Please monitor your usage.';
    
    PRINT '';
    PRINT 'If you have any questions, please contact your HR department.';
    PRINT '';
    PRINT 'Best regards,';
    PRINT 'HR Team';
    PRINT '--------------------------------------';
    PRINT '';
    
    FETCH NEXT FROM email_cursor INTO @employee_name, @employee_email, @leave_type_name, @remaining, @total, @percentage;
END

CLOSE email_cursor;
DEALLOCATE email_cursor;

-- ===========================================
-- EXPORT FOR BULK EMAIL (CSV FORMAT)
-- ===========================================
PRINT '========================================';
PRINT 'CSV EXPORT FOR BULK EMAIL';
PRINT '========================================';
PRINT 'Copy the data below to send bulk emails:';
PRINT '';

SELECT 
    email as 'Email',
    full_name as 'Name',
    leave_type as 'LeaveType',
    CAST(remaining_days AS VARCHAR) as 'RemainingDays',
    CAST(percentage_remaining AS DECIMAL(5,2)) as 'Percentage',
    alert_level as 'AlertLevel'
FROM #low_balance_users
ORDER BY alert_level, percentage_remaining;

-- ===========================================
-- AUTOMATED NOTIFICATION JOB
-- ===========================================
PRINT '';
PRINT '========================================';
PRINT 'SETUP AUTOMATED NOTIFICATIONS';
PRINT '========================================';
PRINT 'To automate this check, consider:';
PRINT '1. SQL Server Agent Job (runs weekly/monthly)';
PRINT '2. Backend scheduled task (Node.js cron job)';
PRINT '3. Integration with your email service';
PRINT '';
PRINT 'Example: Create SQL Agent Job';
PRINT '  - Schedule: Every Monday at 9:00 AM';
PRINT '  - Action: Execute this script';
PRINT '  - Notification: Email results to HR';
PRINT '';

-- Cleanup
DROP TABLE #low_balance_users;

PRINT 'Report generation complete!';
