const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/employees/departments - Get unique departments
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    logger.process.start('Get Departments List');

    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT DISTINCT department 
      FROM profiles 
      WHERE department IS NOT NULL 
      ORDER BY department ASC
    `);
    
    const departments = result.recordset.map(row => row.department);

    logger.process.success('Get Departments List', { count: departments.length });

    res.json({ departments });
  } catch (error) {
    logger.process.error('Get Departments List', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/employees - Get all employees
router.get('/', authenticateToken, async (req, res) => {
  try {
    logger.process.start('Get All Employees');

    const pool = await getConnection();
    
    const result = await pool.request()
      .query(`
        SELECT 
          e.employee_id, e.full_name, e.email, e.phone, 
          e.department, e.position, e.status, e.created_at, e.updated_at
        FROM profiles e
        ORDER BY e.full_name
      `);

    logger.process.success('Get All Employees', { count: result.recordset.length });

    res.json(result.recordset);
  } catch (err) {
    logger.process.error('Get All Employees', err);
    res.status(500).json({ error: 'Failed to get employees', details: err.message });
  }
});

// GET /api/employees/:id - Get employee by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    logger.process.start('Get Employee By ID', { employeeId: id });

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          e.employee_id, e.full_name, e.email, e.phone,
          e.department, e.position, e.status, e.created_at, e.updated_at,
          ur.role
        FROM profiles e
        LEFT JOIN user_roles ur ON e.employee_id = ur.employee_id
        WHERE e.employee_id = @id
      `);

    if (result.recordset.length === 0) {
      logger.warn('Employee not found', { employeeId: id });
      return res.status(404).json({ error: 'Employee not found' });
    }

    logger.process.success('Get Employee By ID', { 
      employeeId: id, 
      employeeName: result.recordset[0].full_name 
    });

    res.json(result.recordset[0]);
  } catch (err) {
    logger.process.error('Get Employee By ID', err, { employeeId: req.params.id });
    res.status(500).json({ error: 'Failed to get employee' });
  }
});

// POST /api/employees - Create new employee (HR/Manager only)
router.post('/', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { full_name, email, phone, department, position, status, employee_id, role } = req.body;

    logger.process.start('Create Employee', { 
      email, 
      full_name, 
      department,
      requestedBy: req.user.id 
    });

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('employee_id', sql.Int, employee_id || null)
      .input('full_name', sql.NVarChar, full_name)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone)
      .input('department', sql.NVarChar, department)
      .input('position', sql.NVarChar, position)
      .input('status', sql.NVarChar, status || 'Active')
      .query(`
        INSERT INTO profiles (employee_id, full_name, email, phone, department, position, status, created_at, updated_at)
        OUTPUT INSERTED.*
        VALUES (@employee_id, @full_name, @email, @phone, @department, @position, @status, GETDATE(), GETDATE())
      `);

    logger.process.success('Create Employee', { 
      employeeId: result.recordset[0].employee_id, 
      email, 
      full_name 
    });

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    logger.process.error('Create Employee', err, { data: req.body });
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PATCH /api/employees/:id - Update employee (HR/Manager only)
router.patch('/:id', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, department, position, status } = req.body;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('full_name', sql.NVarChar, full_name)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone)
      .input('department', sql.NVarChar, department)
      .input('position', sql.NVarChar, position)
      .input('status', sql.NVarChar, status)
      .input('employee_id', sql.Int, id)
      .query(`
        UPDATE profiles
        SET 
          full_name = COALESCE(@full_name, full_name),
          email = COALESCE(@email, email),
          phone = COALESCE(@phone, phone),
          department = COALESCE(@department, department),
          position = COALESCE(@position, position),
          status = COALESCE(@status, status),
          updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE employee_id = @employee_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    logError(err, req, { context: 'Update employee error', employeeId: id });
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE /api/employees/:id - Delete employee (HR only)
router.delete('/:id', authenticateToken, authorizeRole('hr'), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM profiles WHERE employee_id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    logError(err, req, { context: 'Delete employee error', employeeId: id });
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// GET /api/employees/department/:department - Get employees by department
router.get('/department/:department', authenticateToken, async (req, res) => {
  try {
    const { department } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('department', sql.NVarChar, department)
      .query(`
        SELECT 
          e.employee_id, e.full_name, e.email, e.phone,
          e.department, e.position, e.status, e.created_at, e.updated_at, e.role
        FROM profiles e
        WHERE e.department = @department
        ORDER BY e.full_name
      `);

    res.json(result.recordset);
  } catch (err) {
    logError(err, req, { context: 'Get employees by department error', department });
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

module.exports = router;
