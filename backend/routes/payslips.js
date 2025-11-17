const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/payslips/user/:userId - Get user's payslips
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;
    
    // Users can only view their own payslips unless HR/manager
    if (req.user.id !== userId && !['hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const pool = await getConnection();
    let query = `
      SELECT 
        id, user_id, month, year, basic_salary, allowances, 
        deductions, net_salary, file_url, created_at
      FROM payslips
      WHERE user_id = @user_id
    `;
    
    const request = pool.request().input('user_id', sql.UniqueIdentifier, userId);
    
    if (year) {
      query += ' AND year = @year';
      request.input('year', sql.Int, parseInt(year));
    }
    
    if (month) {
      query += ' AND month = @month';
      request.input('month', sql.NVarChar, month);
    }
    
    query += ' ORDER BY year DESC, created_at DESC';
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get user payslips error:', err);
    res.status(500).json({ error: 'Failed to get payslips' });
  }
});

// GET /api/payslips - Get all payslips (HR/Manager only)
router.get('/', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { year, month } = req.query;
    const pool = await getConnection();
    
    let query = `
      SELECT 
        p.id, p.user_id, p.month, p.year, p.basic_salary, 
        p.allowances, p.deductions, p.net_salary, p.file_url, p.created_at,
        u.full_name as user_name, u.email as user_email
      FROM payslips p
      JOIN users u ON p.user_id = u.id
    `;
    
    const conditions = [];
    const request = pool.request();
    
    if (year) {
      conditions.push('p.year = @year');
      request.input('year', sql.Int, parseInt(year));
    }
    
    if (month) {
      conditions.push('p.month = @month');
      request.input('month', sql.NVarChar, month);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY p.year DESC, p.created_at DESC';
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get payslips error:', err);
    res.status(500).json({ error: 'Failed to get payslips' });
  }
});

// GET /api/payslips/:id - Get payslip by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          p.id, p.user_id, p.month, p.year, p.basic_salary, 
          p.allowances, p.deductions, p.net_salary, p.file_url, p.created_at,
          u.full_name as user_name, u.email as user_email
        FROM payslips p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    const payslip = result.recordset[0];
    
    // Users can only view their own payslips unless HR/manager
    if (req.user.id !== payslip.user_id && !['hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(payslip);
  } catch (err) {
    console.error('Get payslip error:', err);
    res.status(500).json({ error: 'Failed to get payslip' });
  }
});

// POST /api/payslips - Create new payslip (HR only)
router.post('/', authenticateToken, authorizeRole('hr'), async (req, res) => {
  try {
    const { user_id, month, year, basic_salary, allowances, deductions, file_url } = req.body;
    
    // Calculate net salary
    const net_salary = parseFloat(basic_salary) + parseFloat(allowances || 0) - parseFloat(deductions || 0);
    
    const pool = await getConnection();
    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, user_id)
      .input('month', sql.NVarChar, month)
      .input('year', sql.Int, year)
      .input('basic_salary', sql.Decimal(10, 2), basic_salary)
      .input('allowances', sql.Decimal(10, 2), allowances || 0)
      .input('deductions', sql.Decimal(10, 2), deductions || 0)
      .input('net_salary', sql.Decimal(10, 2), net_salary)
      .input('file_url', sql.NVarChar, file_url)
      .query(`
        INSERT INTO payslips (user_id, month, year, basic_salary, allowances, deductions, net_salary, file_url, created_at)
        OUTPUT INSERTED.*
        VALUES (@user_id, @month, @year, @basic_salary, @allowances, @deductions, @net_salary, @file_url, GETDATE())
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('Create payslip error:', err);
    res.status(500).json({ error: 'Failed to create payslip' });
  }
});

// PATCH /api/payslips/:id - Update payslip (HR only)
router.patch('/:id', authenticateToken, authorizeRole('hr'), async (req, res) => {
  try {
    const { id } = req.params;
    const { basic_salary, allowances, deductions, file_url } = req.body;
    
    const pool = await getConnection();
    
    // First get the current payslip
    const current = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM payslips WHERE id = @id');
    
    if (current.recordset.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }
    
    const currentPayslip = current.recordset[0];
    
    // Calculate new net salary
    const newBasicSalary = basic_salary !== undefined ? parseFloat(basic_salary) : parseFloat(currentPayslip.basic_salary);
    const newAllowances = allowances !== undefined ? parseFloat(allowances) : parseFloat(currentPayslip.allowances);
    const newDeductions = deductions !== undefined ? parseFloat(deductions) : parseFloat(currentPayslip.deductions);
    const net_salary = newBasicSalary + newAllowances - newDeductions;
    
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('basic_salary', sql.Decimal(10, 2), basic_salary)
      .input('allowances', sql.Decimal(10, 2), allowances)
      .input('deductions', sql.Decimal(10, 2), deductions)
      .input('net_salary', sql.Decimal(10, 2), net_salary)
      .input('file_url', sql.NVarChar, file_url)
      .query(`
        UPDATE payslips
        SET 
          basic_salary = COALESCE(@basic_salary, basic_salary),
          allowances = COALESCE(@allowances, allowances),
          deductions = COALESCE(@deductions, deductions),
          net_salary = @net_salary,
          file_url = COALESCE(@file_url, file_url)
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Update payslip error:', err);
    res.status(500).json({ error: 'Failed to update payslip' });
  }
});

// DELETE /api/payslips/:id - Delete payslip (HR only)
router.delete('/:id', authenticateToken, authorizeRole('hr'), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM payslips WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    res.json({ message: 'Payslip deleted successfully' });
  } catch (err) {
    console.error('Delete payslip error:', err);
    res.status(500).json({ error: 'Failed to delete payslip' });
  }
});

module.exports = router;
