const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const logger = require('../utils/logger');
const { sendEmailWithRetry } = require('../utils/emailRetry');
const { shouldSendDepartmentNotification } = require('../utils/emailHelper');

const router = express.Router();

// Helper function to check if a string is a valid GUID
const isValidGuid = (str) => {
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidRegex.test(str);
};

// Helper function to get department - handles both GUID and numeric IDs
const getDepartmentById = async (pool, id) => {
  // Try GUID first if valid format
  if (isValidGuid(id)) {
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT id, name, description, manager_id FROM departments WHERE id = @id');
    if (result.recordset.length > 0) return result.recordset[0];
  }
  
  // Try as numeric ID (using row number)
  const numId = parseInt(id, 10);
  if (!isNaN(numId)) {
    const result = await pool.request()
      .input('rowNum', sql.Int, numId)
      .query(`
        WITH numbered AS (
          SELECT id, name, description, manager_id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
          FROM departments
        )
        SELECT id, name, description, manager_id FROM numbered WHERE row_num = @rowNum
      `);
    if (result.recordset.length > 0) return result.recordset[0];
  }
  
  return null;
};

// GET /api/departments - Get all departments
router.get('/', authenticateToken, async (req, res) => {
  try {
    logger.api.request('GET', '/api/departments', { userId: req.user.id });
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        d.id, d.name, d.description, d.manager_id, 
        d.created_at, d.updated_at,
        p.full_name as manager_name,
        (SELECT COUNT(*) FROM profiles WHERE department = d.name) as employee_count
      FROM departments d
      LEFT JOIN profiles p ON d.manager_id = p.employee_id
      ORDER BY d.name ASC
    `);
    
    logger.info('Fetched all departments', { count: result.recordset.length, userId: req.user.id });
    res.json(result.recordset);
  } catch (error) {
    logger.api.error('GET', '/api/departments', error, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

// GET /api/departments/:id - Get department by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    logger.api.request('GET', `/api/departments/${id}`, { userId: req.user.id, departmentId: id });
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          d.id, d.name, d.description, d.manager_id, 
          d.created_at, d.updated_at,
          p.full_name as manager_name,
          (SELECT COUNT(*) FROM profiles WHERE department = d.name) as employee_count
        FROM departments d
        LEFT JOIN profiles p ON d.manager_id = p.employee_id
        WHERE d.id = @id
      `);
    
    if (result.recordset.length === 0) {
      logger.warn('Department not found', { departmentId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Department not found' });
    }
    
    logger.info('Fetched department by ID', { departmentId: id, userId: req.user.id });
    res.json(result.recordset[0]);
  } catch (error) {
    logger.api.error('GET', `/api/departments/${req.params.id}`, error, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

// POST /api/departments - Create department (HR/Manager only)
router.post('/', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { name, description, manager_id } = req.body;
    logger.api.request('POST', '/api/departments', { userId: req.user.id, departmentName: name });
    
    if (!name || name.trim() === '') {
      logger.warn('Department creation failed: Name required', { userId: req.user.id });
      return res.status(400).json({ error: 'Department name is required' });
    }
    
    const pool = await getConnection();
    
    // Check if department already exists
    const existing = await pool.request()
      .input('name', sql.NVarChar, name.trim())
      .query('SELECT id FROM departments WHERE name = @name');
    
    if (existing.recordset.length > 0) {
      logger.warn('Department creation failed: Already exists', { departmentName: name, userId: req.user.id });
      return res.status(400).json({ error: 'Department with this name already exists' });
    }
    
    const result = await pool.request()
      .input('name', sql.NVarChar, name.trim())
      .input('description', sql.NVarChar, description)
      .input('manager_id', sql.Int, manager_id)
      .query(`
        INSERT INTO departments (name, description, manager_id, created_at, updated_at)
        OUTPUT INSERTED.*
        VALUES (@name, @description, @manager_id, GETDATE(), GETDATE())
      `);
    
    logger.process.success('Department Created', { departmentName: name, userId: req.user.id });
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    logger.api.error('POST', '/api/departments', error, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/departments/:id - Update department (HR/Manager only)
router.patch('/:id', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, manager_id } = req.body;
    logger.api.request('PATCH', `/api/departments/${id}`, { userId: req.user.id, departmentId: id });
    
    const pool = await getConnection();
    
    // Check if department exists
    const existing = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT id, name FROM departments WHERE id = @id');
    
    if (existing.recordset.length === 0) {
      logger.warn('Department update failed: Not found', { departmentId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Department not found' });
    }
    
    const oldName = existing.recordset[0].name;
    
    // If name is being changed, check for duplicates
    if (name && name !== oldName) {
      const duplicate = await pool.request()
        .input('name', sql.NVarChar, name.trim())
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT id FROM departments WHERE name = @name AND id != @id');
      
      if (duplicate.recordset.length > 0) {
        logger.warn('Department update failed: Duplicate name', { departmentName: name, userId: req.user.id });
        return res.status(400).json({ error: 'Department with this name already exists' });
      }
    }
    
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description)
      .input('manager_id', sql.Int, manager_id)
      .query(`
        UPDATE departments
        SET 
          name = COALESCE(@name, name),
          description = COALESCE(@description, description),
          manager_id = COALESCE(@manager_id, manager_id),
          updated_at = GETDATE()
        WHERE id = @id
      `);
    
    // If name changed, update all employees with this department
    if (name && name !== oldName) {
      await pool.request()
        .input('old_name', sql.NVarChar, oldName)
        .input('new_name', sql.NVarChar, name)
        .query(`
          UPDATE profiles
          SET department = @new_name
          WHERE department = @old_name
        `);
    }
    
    // Fetch updated department
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          d.id, d.name, d.description, d.manager_id, 
          d.created_at, d.updated_at,
          p.full_name as manager_name,
          (SELECT COUNT(*) FROM profiles WHERE department = d.name) as employee_count
        FROM departments d
        LEFT JOIN profiles p ON d.manager_id = p.employee_id
        WHERE d.id = @id
      `);
    
    logger.process.success('Department Updated', { departmentId: id, oldName, newName: name, userId: req.user.id });
    res.json(result.recordset[0]);
  } catch (error) {
    logger.api.error('PATCH', `/api/departments/${req.params.id}`, error, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/departments/:id - Delete department (HR only)
router.delete('/:id', authenticateToken, authorizeRole('hr'), async (req, res) => {
  try {
    const { id } = req.params;
    logger.api.request('DELETE', `/api/departments/${id}`, { userId: req.user.id, departmentId: id });
    const pool = await getConnection();
    
    // Check if department exists
    const existing = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT id, name FROM departments WHERE id = @id');
    
    if (existing.recordset.length === 0) {
      logger.warn('Department delete failed: Not found', { departmentId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Department not found' });
    }
    
    const departmentName = existing.recordset[0].name;
    
    // Check if department has employees
    const employeeCount = await pool.request()
      .input('name', sql.NVarChar, departmentName)
      .query('SELECT COUNT(*) as count FROM profiles WHERE department = @name');
    
    if (employeeCount.recordset[0].count > 0) {
      logger.warn('Department delete failed: Has employees', { departmentId: id, departmentName, employeeCount: employeeCount.recordset[0].count, userId: req.user.id });
      return res.status(400).json({ 
        error: 'Cannot delete department with assigned employees. Please reassign employees first.' 
      });
    }
    
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM departments WHERE id = @id');
    
    logger.process.success('Department Deleted', { departmentId: id, departmentName, userId: req.user.id });
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    logger.api.error('DELETE', `/api/departments/${req.params.id}`, error, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

// GET /api/departments/:id/employees - Get employees in a department
router.get('/:id/employees', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    logger.api.request('GET', `/api/departments/${id}/employees`, { userId: req.user.id, departmentId: id });
    const pool = await getConnection();
    
    // Get department using helper (handles both GUID and numeric IDs)
    const dept = await getDepartmentById(pool, id);
    
    if (!dept) {
      logger.warn('Department employees fetch failed: Department not found', { departmentId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Department not found' });
    }
    
    const departmentName = dept.name;
    
    const result = await pool.request()
      .input('department', sql.NVarChar, departmentName)
      .query(`
        SELECT 
          p.employee_id, p.full_name, p.email, p.phone, 
          p.position, p.department, p.avatar_url
        FROM profiles p
        WHERE p.department = @department
        ORDER BY p.full_name ASC
      `);
    
    logger.info('Fetched department employees', { departmentId: id, departmentName, employeeCount: result.recordset.length, userId: req.user.id });
    res.json(result.recordset);
  } catch (error) {
    logger.api.error('GET', `/api/departments/${req.params.id}/employees`, error, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

// POST /api/departments/:id/employees - Add employee to department
router.post('/:id/employees', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id } = req.body;
    logger.api.request('POST', `/api/departments/${id}/employees`, { userId: req.user.id, departmentId: id, employeeId: employee_id });
    
    if (!employee_id) {
      logger.warn('Add employee to department failed: Employee ID required', { departmentId: id, userId: req.user.id });
      return res.status(400).json({ error: 'Employee ID is required' });
    }
    
    const pool = await getConnection();
    
    // Get department using helper (handles both GUID and numeric IDs)
    const dept = await getDepartmentById(pool, id);
    
    if (!dept) {
      logger.warn('Add employee to department failed: Department not found', { departmentId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Department not found' });
    }
    
    const departmentName = dept.name;
    
    // Get employee details before update
    const employee = await pool.request()
      .input('employee_id', sql.Int, employee_id)
      .query('SELECT employee_id, full_name, email, department FROM profiles WHERE employee_id = @employee_id');
    
    if (employee.recordset.length === 0) {
      logger.warn('Add employee to department failed: Employee not found', { employeeId: employee_id, userId: req.user.id });
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const emp = employee.recordset[0];
    
    // Update employee's department
    await pool.request()
      .input('employee_id', sql.Int, employee_id)
      .input('department', sql.NVarChar, departmentName)
      .query('UPDATE profiles SET department = @department, updated_at = GETDATE() WHERE employee_id = @employee_id');
    
    // Create in-app notification for the employee
    try {
      await pool.request()
        .input('user_id', sql.Int, emp.employee_id)
        .input('type', sql.NVarChar, 'department_assignment')
        .input('title', sql.NVarChar, 'Department Assignment')
        .input('message', sql.NVarChar, `You have been assigned to the ${departmentName} department.`)
        .input('metadata', sql.NVarChar, JSON.stringify({ 
          department_name: departmentName, 
          assigned_by: req.user.full_name || 'HR',
          previous_department: emp.department || 'Not Assigned'
        }))
        .query(`
          INSERT INTO notifications (user_id, type, title, message, metadata, read, created_at)
          VALUES (@user_id, @type, @title, @message, @metadata, 0, GETDATE())
        `);
      logger.info('In-app notification created for department assignment', { employeeId: emp.employee_id, department: departmentName });
    } catch (notifError) {
      logger.warn('Failed to create in-app notification', { error: notifError.message, employeeId: emp.employee_id });
    }
    
    // Send email notification based on preferences
    try {
      const shouldEmail = await shouldSendDepartmentNotification(emp.employee_id);
      if (shouldEmail && emp.email) {
        await sendEmailWithRetry({
          to: emp.email,
          subject: `Department Assignment: ${departmentName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Department Assignment Notification</h2>
              <p>Dear ${emp.full_name},</p>
              <p>You have been assigned to the <strong>${departmentName}</strong> department.</p>
              ${emp.department && emp.department !== 'Not Assigned' ? `<p>Previous Department: ${emp.department}</p>` : ''}
              <p>Assigned by: ${req.user.full_name || 'HR'}</p>
              <p>If you have any questions, please contact your manager or HR department.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 12px;">This is an automated notification from the Employee Portal.</p>
            </div>
          `
        });
        logger.info('Email notification sent for department assignment', { employeeId: emp.employee_id, email: emp.email, department: departmentName });
      }
    } catch (emailError) {
      logger.warn('Failed to send email notification for department assignment', { error: emailError.message, employeeId: emp.employee_id });
    }
    
    logger.process.success('Employee Assigned to Department', { departmentId: id, departmentName, employeeId: employee_id, employeeName: emp.full_name, userId: req.user.id });
    res.json({ 
      success: true, 
      message: 'Employee assigned to department',
      employee: {
        employee_id: emp.employee_id,
        full_name: emp.full_name,
        email: emp.email,
        department: departmentName
      }
    });
  } catch (error) {
    logger.api.error('POST', `/api/departments/${req.params.id}/employees`, error, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/departments/:id/employees/:employeeId - Remove employee from department
router.delete('/:id/employees/:employeeId', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { id, employeeId } = req.params;
    logger.api.request('DELETE', `/api/departments/${id}/employees/${employeeId}`, { userId: req.user.id, departmentId: id, employeeId });
    const pool = await getConnection();
    
    // Get department using helper (handles both GUID and numeric IDs)
    const dept = await getDepartmentById(pool, id);
    
    if (!dept) {
      logger.warn('Remove employee from department failed: Department not found', { departmentId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Department not found' });
    }
    
    const departmentName = dept.name;
    
    // Get employee details for notification
    const employee = await pool.request()
      .input('employee_id', sql.Int, employeeId)
      .query('SELECT employee_id, full_name, email FROM profiles WHERE employee_id = @employee_id');
    
    const emp = employee.recordset[0];
    
    // Update employee's department to unassigned
    await pool.request()
      .input('employee_id', sql.Int, employeeId)
      .input('department', sql.NVarChar, 'Not Assigned')
      .query('UPDATE profiles SET department = @department, updated_at = GETDATE() WHERE employee_id = @employee_id');
    
    // Create in-app notification for removal
    if (emp) {
      try {
        await pool.request()
          .input('user_id', sql.Int, emp.employee_id)
          .input('type', sql.NVarChar, 'department_removal')
          .input('title', sql.NVarChar, 'Department Change')
          .input('message', sql.NVarChar, `You have been removed from the ${departmentName} department.`)
          .input('metadata', sql.NVarChar, JSON.stringify({ 
            department_name: departmentName, 
            removed_by: req.user.full_name || 'HR'
          }))
          .query(`
            INSERT INTO notifications (user_id, type, title, message, metadata, read, created_at)
            VALUES (@user_id, @type, @title, @message, @metadata, 0, GETDATE())
          `);
      } catch (notifError) {
        logger.warn('Failed to create removal notification', { error: notifError.message, employeeId: emp.employee_id });
      }
      
      // Send email notification
      try {
        const shouldEmail = await shouldSendDepartmentNotification(emp.employee_id);
        if (shouldEmail && emp.email) {
          await sendEmailWithRetry({
            to: emp.email,
            subject: `Department Change: Removed from ${departmentName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Department Change Notification</h2>
                <p>Dear ${emp.full_name},</p>
                <p>You have been removed from the <strong>${departmentName}</strong> department.</p>
                <p>If you have any questions, please contact your manager or HR department.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px;">This is an automated notification from the Employee Portal.</p>
              </div>
            `
          });
        }
      } catch (emailError) {
        logger.warn('Failed to send removal email notification', { error: emailError.message, employeeId: emp.employee_id });
      }
    }
    
    logger.process.success('Employee Removed from Department', { departmentId: id, employeeId, departmentName, userId: req.user.id });
    res.json({ success: true, message: 'Employee removed from department' });
  } catch (error) {
    logger.api.error('DELETE', `/api/departments/${req.params.id}/employees/${req.params.employeeId}`, error, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
