# Automatic Department Creation

## Overview
When importing users via Excel or creating users manually through the Bulk Operations interface, the system now automatically creates departments if they don't exist in the `departments` table.

## How It Works

### 1. Department Table Creation
First, run the SQL script to create the departments table:

```bash
# Execute on your SQL Server database
sqlcmd -S your_server -d your_database -i backend/database/create-departments-table.sql
```

This creates:
- `departments` table with columns: id, name, description, manager_id, is_active
- Migrates existing departments from profiles/employees tables
- Creates default departments (Engineering, HR, Sales, etc.)

### 2. Automatic Department Creation During Import

When you import users, the system:

1. **Checks** if the department exists in the `departments` table
2. **Creates** the department if it doesn't exist (with description "Auto-created department: [Name]")
3. **Continues** with user creation even if department creation fails
4. **Logs** all department creation activities

### 3. Excel Import Example

When you upload an Excel file with:

```
| Email                  | Full Name  | Department      | Position            |
|------------------------|------------|-----------------|---------------------|
| john@company.com       | John Doe   | Engineering     | Software Engineer   |
| jane@company.com       | Jane Smith | Product Design  | Product Designer    |
| bob@company.com        | Bob Wilson | Data Science    | Data Analyst        |
```

The system will:
- Check if "Engineering" exists → Use existing or create new
- Check if "Product Design" exists → Create (if new)
- Check if "Data Science" exists → Create (if new)
- Then create the user records

### 4. API Logs

During import, you'll see logs like:

```
Department "Engineering" already exists
Creating new department: "Product Design"
Department "Product Design" created with ID: 5
✅ Department "Product Design" verified/created for user jane@company.com
Creating new department: "Data Science"
Department "Data Science" created with ID: 6
✅ Department "Data Science" verified/created for user bob@company.com

========================================
BULK USER IMPORT SUMMARY
========================================
✅ Successfully created: 3 users
❌ Failed: 0 users
========================================
```

## Benefits

1. **No Manual Setup Required**: HR doesn't need to pre-create departments
2. **Flexible**: Supports any department names in the import file
3. **Safe**: User creation continues even if department creation fails
4. **Auditable**: All department creation is logged
5. **Data Integrity**: Departments are stored in a proper table with relationships

## Testing

1. **Create Test Excel File**:
   - Download the user template from Bulk Operations
   - Add employees with new department names
   - Upload the file

2. **Verify Department Creation**:
   ```sql
   SELECT * FROM departments ORDER BY created_at DESC;
   ```

3. **Check User Assignment**:
   ```sql
   SELECT p.full_name, p.email, p.department, d.name as dept_name
   FROM profiles p
   LEFT JOIN departments d ON p.department = d.name
   ORDER BY p.created_at DESC;
   ```

## Future Enhancements

1. Add department_id foreign key to profiles/employees tables
2. Create department management UI in the frontend
3. Add department-level reporting and analytics
4. Implement department hierarchy (parent/child relationships)

## Notes

- Department names are case-sensitive in the database
- Empty or whitespace-only departments are ignored
- "Not Assigned" is created as a default department
- Department creation uses the same transaction as user creation for data consistency
