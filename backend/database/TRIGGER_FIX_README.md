# SQL Server Trigger Fix

## Problem
The `trg_update_leave_balance_on_approval` trigger in your SQL Server database is referencing a column named `user_id` which doesn't exist in the `leaves` table. The correct column name is `employee_id`.

## Error Message
```
Invalid column name 'user_id' in trigger 'trg_update_leave_balance_on_approval'
```

## Solution
Run the SQL script `fix-leave-balance-trigger.sql` on your SQL Server database to fix this issue.

### Steps to Fix:

1. **Open SQL Server Management Studio (SSMS)** or any SQL Server query tool
2. **Connect to your database**: `${process.env.SQL_SERVER_DATABASE}`
3. **Open the file**: `fix-leave-balance-trigger.sql`
4. **Execute the script**: This will drop the old trigger and create a new one with correct column names

### What the script does:
- Drops the existing `trg_update_leave_balance_on_approval` trigger
- Recreates it with the correct column name `employee_id` instead of `user_id`
- Updates the leave balance logic to properly track used/remaining leave days

### After running the script:
- The bulk approval feature will work correctly
- Leave balances will be automatically updated when leaves are approved
- No more "Invalid column name 'user_id'" errors

## Alternative: Disable the Trigger (Temporary)
If you want to temporarily disable the trigger while you investigate:

```sql
-- Disable the trigger
DISABLE TRIGGER trg_update_leave_balance_on_approval ON leaves;

-- Later, re-enable it after fixing
ENABLE TRIGGER trg_update_leave_balance_on_approval ON leaves;
```

## Verification
After running the fix script, test by approving a leave request. Check that:
1. The leave status updates successfully
2. The leave balance is updated correctly in the `leave_balances` table
3. No errors appear in the application logs
