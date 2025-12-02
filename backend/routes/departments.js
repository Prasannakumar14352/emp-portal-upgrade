const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logError } = require('../utils/logger');

const router = express.Router();

// GET /api/departments - Get all departments
router.get('/', authenticateToken, async (req, res) => {
  try {
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
    
    res.json(result.recordset);
  } catch (error) {
    logError(error, req, { context: 'Error fetching departments' });
    res.status(500).json({ error: error.message });
  }
});

// GET /api/departments/:id - Get department by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
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
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    logError(error, req, { context: 'Error fetching department' });
    res.status(500).json({ error: error.message });
  }
});

// POST /api/departments - Create department (HR/Manager only)
router.post('/', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { name, description, manager_id } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Department name is required' });
    }
    
    const pool = await getConnection();
    
    // Check if department already exists
    const existing = await pool.request()
      .input('name', sql.NVarChar, name.trim())
      .query('SELECT id FROM departments WHERE name = @name');
    
    if (existing.recordset.length > 0) {
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
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    logError(error, req, { context: 'Error creating department' });
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/departments/:id - Update department (HR/Manager only)
router.patch('/:id', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, manager_id } = req.body;
    
    const pool = await getConnection();
    
    // Check if department exists
    const existing = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT id, name FROM departments WHERE id = @id');
    
    if (existing.recordset.length === 0) {
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
    
    res.json(result.recordset[0]);
  } catch (error) {
    logError(error, req, { context: 'Error updating department' });
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/departments/:id - Delete department (HR only)
router.delete('/:id', authenticateToken, authorizeRole('hr'), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    // Check if department exists
    const existing = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT id, name FROM departments WHERE id = @id');
    
    if (existing.recordset.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    const departmentName = existing.recordset[0].name;
    
    // Check if department has employees
    const employeeCount = await pool.request()
      .input('name', sql.NVarChar, departmentName)
      .query('SELECT COUNT(*) as count FROM profiles WHERE department = @name');
    
    if (employeeCount.recordset[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete department with assigned employees. Please reassign employees first.' 
      });
    }
    
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM departments WHERE id = @id');
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    logError(error, req, { context: 'Error deleting department' });
    res.status(500).json({ error: error.message });
  }
});

// GET /api/departments/:id/employees - Get employees in a department
router.get('/:id/employees', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    // Get department name first
    const dept = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT name FROM departments WHERE id = @id');
    
    if (dept.recordset.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    const departmentName = dept.recordset[0].name;
    
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
    
    res.json(result.recordset);
  } catch (error) {
    logError(error, req, { context: 'Error fetching department employees' });
    res.status(500).json({ error: error.message });
  }
});

// POST /api/departments/:id/employees - Add employee to department
router.post('/:id/employees', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id } = req.body;
    
    if (!employee_id) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }
    
    const pool = await getConnection();
    
    // Get department
    const dept = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT name FROM departments WHERE id = @id');
    
    if (dept.recordset.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    const departmentName = dept.recordset[0].name;
    
    // Get employee details before update
    const employee = await pool.request()
      .input('employee_id', sql.Int, employee_id)
      .query('SELECT employee_id, full_name, email, department FROM profiles WHERE employee_id = @employee_id');
    
    if (employee.recordset.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const emp = employee.recordset[0];
    
    // Update employee's department
    await pool.request()
      .input('employee_id', sql.Int, employee_id)
      .input('department', sql.NVarChar, departmentName)
      .query('UPDATE profiles SET department = @department, updated_at = GETDATE() WHERE employee_id = @employee_id');
    
    // Also update employees table if exists
    await pool.request()
      .input('employee_id', sql.Int, employee_id)
      .input('department', sql.NVarChar, departmentName)
      .query('UPDATE profiles SET department = @department, updated_at = GETDATE() WHERE employee_id = @employee_id');
    
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
    logError(error, req, { context: 'Error adding employee to department' });
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/departments/:id/employees/:employeeId - Remove employee from department
router.delete('/:id/employees/:employeeId', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { id, employeeId } = req.params;
    const pool = await getConnection();
    
    // Get department
    const dept = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT name FROM departments WHERE id = @id');
    
    if (dept.recordset.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    // Update employee's department to unassigned
    await pool.request()
      .input('employee_id', sql.Int, employeeId)
      .input('department', sql.NVarChar, 'Not Assigned')
      .query('UPDATE profiles SET department = @department, updated_at = GETDATE() WHERE employee_id = @employee_id');
    
    await pool.request()
      .input('employee_id', sql.Int, employeeId)
      .input('department', sql.NVarChar, 'Not Assigned')
      .query('UPDATE profiles SET department = @department, updated_at = GETDATE() WHERE employee_id = @employee_id');
    
    res.json({ success: true, message: 'Employee removed from department' });
  } catch (error) {
    logError(error, req, { context: 'Error removing employee from department' });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
