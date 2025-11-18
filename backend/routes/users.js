const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logError } = require('../utils/logger');

const router = express.Router();

// GET /api/users/:userId/role
router.get('/:userId/role', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('user_id', sql.Int, userId)
      .query('SELECT role FROM user_roles WHERE user_id = @user_id');

    if (result.recordset.length === 0) {
      return res.json({ role: 'employee' });
    }

    res.json({ role: result.recordset[0].role });
  } catch (err) {
    logError(err, req, { context: 'Get role error', userId });
    res.status(500).json({ error: 'Failed to get user role' });
  }
});

// GET /api/users/:userId/profile
router.get('/:userId/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT 
          p.id, p.email, p.full_name, p.phone, 
          p.department, p.position, p.avatar_url, p.hire_date, p.created_at, p.updated_at
        FROM profiles p
        WHERE p.user_id = @user_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    logError(err, req, { context: 'Get profile error', userId });
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// PATCH /api/users/:userId/profile
router.patch('/:userId/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can only update their own profile or is HR/manager
    // Convert both to numbers for proper comparison
    if (parseInt(req.user.id) !== parseInt(userId) && !['hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    const { full_name, phone, department, position, avatar_url, hire_date } = req.body;
    const pool = await getConnection();

    const result = await pool.request()
      .input('user_id', sql.Int, userId)
      .input('full_name', sql.NVarChar, full_name)
      .input('phone', sql.NVarChar, phone)
      .input('department', sql.NVarChar, department)
      .input('position', sql.NVarChar, position)
      .input('avatar_url', sql.NVarChar, avatar_url)
      .input('hire_date', sql.Date, hire_date)
      .query(`
        UPDATE profiles
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
        WHERE user_id = @user_id
      `);

    res.json(result.recordset[0]);
  } catch (err) {
    logError(err, req, { context: 'Update profile error', userId });
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
          p.id, p.email, p.full_name, p.phone, 
          p.department, p.position, p.avatar_url, p.hire_date, p.created_at, p.updated_at
        FROM profiles p
        ORDER BY p.full_name
      `);

    res.json(result.recordset);
  } catch (err) {
    logError(err, req, { context: 'Get users error' });
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// GET /api/users/with-roles - Get all users with their roles (HR only)
router.get('/with-roles', authenticateToken, authorizeRole('hr'), async (req, res) => {
  try {
    const pool = await getConnection();

    const result = await pool.request()
      .query(`
        SELECT 
          p.id, p.email, p.full_name, p.department, p.position,
          ur.role, ur.id as role_id, ur.created_at as role_assigned_at
        FROM profiles p
        LEFT JOIN user_roles ur ON p.user_id = ur.user_id
        ORDER BY p.full_name, ur.role
      `);

    // Group roles by user
    const usersMap = new Map();
    result.recordset.forEach(row => {
      if (!usersMap.has(row.id)) {
        usersMap.set(row.id, {
          id: row.id,
          email: row.email,
          full_name: row.full_name,
          department: row.department,
          position: row.position,
          roles: []
        });
      }
      if (row.role) {
        usersMap.get(row.id).roles.push({
          role: row.role,
          role_id: row.role_id,
          role_assigned_at: row.role_assigned_at
        });
      }
    });

    res.json(Array.from(usersMap.values()));
  } catch (err) {
    logError(err, req, { context: 'Get users with roles error' });
    res.status(500).json({ error: 'Failed to get users with roles' });
  }
});

// POST /api/users/:userId/roles - Assign role to user (HR only)
router.post('/:userId/roles', authenticateToken, authorizeRole('hr'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['employee', 'hr', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be employee, hr, or manager' });
    }

    const pool = await getConnection();

    // Check if user exists
    const userCheck = await pool.request()
      .input('user_id', sql.Int, userId)
      .input('role', sql.NVarChar, role)
      .query('SELECT id FROM profiles WHERE user_id = @user_id AND role = @role');

    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if role already assigned
    const roleCheck = await pool.request()
      .input('user_id', sql.Int, userId)
      .input('role', sql.NVarChar, role)
      .query('SELECT id FROM user_roles WHERE user_id = @user_id AND role = @role');

    if (roleCheck.recordset.length > 0) {
      return res.status(400).json({ error: 'Role already assigned to this user' });
    }

    // Assign role
    const result = await pool.request()
      .input('user_id', sql.Int, userId)
      .input('role', sql.NVarChar, role)
      .query(`
        INSERT INTO user_roles (user_id, role, created_at)
        OUTPUT INSERTED.id, INSERTED.user_id, INSERTED.role, INSERTED.created_at
        VALUES (@user_id, @role, GETDATE())
      `);

    res.status(201).json({
      message: 'Role assigned successfully',
      role: result.recordset[0]
    });
  } catch (err) {
    logError(err, req, { context: 'Assign role error', userId, role });
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// DELETE /api/users/roles/:roleId - Remove role from user (HR only)
router.delete('/roles/:roleId', authenticateToken, authorizeRole('hr'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const pool = await getConnection();

    // Get role info before deletion
    const roleInfo = await pool.request()
      .input('role_id', sql.Int, roleId)
      .query('SELECT user_id, role FROM user_roles WHERE id = @role_id');

    if (roleInfo.recordset.length === 0) {
      return res.status(404).json({ error: 'Role assignment not found' });
    }

    // Prevent removing the last role from a user
    const userRolesCount = await pool.request()
      .input('user_id', sql.Int, roleInfo.recordset[0].user_id)
      .query('SELECT COUNT(*) as count FROM user_roles WHERE user_id = @user_id');

    if (userRolesCount.recordset[0].count <= 1) {
      return res.status(400).json({ 
        error: 'Cannot remove the last role. Users must have at least one role.' 
      });
    }

    // Delete role
    await pool.request()
      .input('role_id', sql.Int, roleId)
      .query('DELETE FROM user_roles WHERE id = @role_id');

    res.json({ message: 'Role removed successfully' });
  } catch (err) {
    logError(err, req, { context: 'Remove role error', roleId });
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

module.exports = router;
