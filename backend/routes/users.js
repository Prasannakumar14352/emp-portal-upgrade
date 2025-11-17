const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/:userId/role
router.get('/:userId/role', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query('SELECT role FROM user_roles WHERE user_id = @user_id');

    if (result.recordset.length === 0) {
      return res.json({ role: 'employee' });
    }

    res.json({ role: result.recordset[0].role });
  } catch (err) {
    console.error('Get role error:', err);
    res.status(500).json({ error: 'Failed to get user role' });
  }
});

// GET /api/users/:userId/profile
router.get('/:userId/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          u.id, u.email, u.full_name, u.phone, 
          u.department, u.position, u.avatar_url, u.hire_date
        FROM users u
        WHERE u.id = @user_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// PATCH /api/users/:userId/profile
router.patch('/:userId/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can only update their own profile or is HR/manager
    if (req.user.id !== userId && !['hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    const { full_name, phone, department, position, avatar_url, hire_date } = req.body;
    const pool = await getConnection();

    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .input('full_name', sql.NVarChar, full_name)
      .input('phone', sql.NVarChar, phone)
      .input('department', sql.NVarChar, department)
      .input('position', sql.NVarChar, position)
      .input('avatar_url', sql.NVarChar, avatar_url)
      .input('hire_date', sql.Date, hire_date)
      .query(`
        UPDATE users
        SET 
          full_name = COALESCE(@full_name, full_name),
          phone = COALESCE(@phone, phone),
          department = COALESCE(@department, department),
          position = COALESCE(@position, position),
          avatar_url = COALESCE(@avatar_url, avatar_url),
          hire_date = COALESCE(@hire_date, hire_date),
          updated_at = GETDATE()
        OUTPUT 
          INSERTED.id, INSERTED.email, INSERTED.full_name, 
          INSERTED.phone, INSERTED.department, INSERTED.position,
          INSERTED.avatar_url, INSERTED.hire_date
        WHERE id = @user_id
      `);

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/users - Get all users (HR/Manager only)
router.get('/', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const pool = await getConnection();

    const result = await pool.request()
      .query(`
        SELECT 
          u.id, u.email, u.full_name, u.phone, 
          u.department, u.position, u.avatar_url, u.hire_date
        FROM users u
        ORDER BY u.full_name
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

module.exports = router;
