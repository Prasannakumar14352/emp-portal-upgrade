const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/employees - Get all employees
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .query(`
        SELECT 
          e.id, e.user_id, e.full_name, e.email, e.phone,
          e.department, e.position, e.status, e.created_at, e.updated_at
        FROM employees e
        ORDER BY e.full_name
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get employees error:', err);
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

// GET /api/employees/:id - Get employee by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          e.id, e.user_id, e.full_name, e.email, e.phone,
          e.department, e.position, e.status, e.created_at, e.updated_at,
          ur.role
        FROM employees e
        LEFT JOIN user_roles ur ON e.user_id = ur.user_id
        WHERE e.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Get employee error:', err);
    res.status(500).json({ error: 'Failed to get employee' });
  }
});

// POST /api/employees - Create new employee (HR/Manager only)
router.post('/', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { full_name, email, phone, department, position, status, user_id } = req.body;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('user_id', sql.Int, user_id || null)
      .input('full_name', sql.NVarChar, full_name)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone)
      .input('department', sql.NVarChar, department)
      .input('position', sql.NVarChar, position)
      .input('status', sql.NVarChar, status || 'Active')
      .query(`
        INSERT INTO employees (user_id, full_name, email, phone, department, position, status, created_at)
        OUTPUT INSERTED.*
        VALUES (@user_id, @full_name, @email, @phone, @department, @position, @status, GETDATE())
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('Create employee error:', err);
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
      .input('id', sql.Int, id)
      .input('full_name', sql.NVarChar, full_name)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone)
      .input('department', sql.NVarChar, department)
      .input('position', sql.NVarChar, position)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE employees
        SET 
          full_name = COALESCE(@full_name, full_name),
          email = COALESCE(@email, email),
          phone = COALESCE(@phone, phone),
          department = COALESCE(@department, department),
          position = COALESCE(@position, position),
          status = COALESCE(@status, status),
          updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Update employee error:', err);
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
      .query('DELETE FROM employees WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('Delete employee error:', err);
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
          e.id, e.user_id, e.full_name, e.email, e.phone,
          e.department, e.position, e.status
        FROM employees e
        WHERE e.department = @department
        ORDER BY e.full_name
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get employees by department error:', err);
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

module.exports = router;
