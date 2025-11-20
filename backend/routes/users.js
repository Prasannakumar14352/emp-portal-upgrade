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
      .input('employee_id', sql.NVarChar, userId)
      .query('SELECT role FROM user_roles WHERE employee_id = @employee_id');

    if (result.recordset.length === 0) {
      return res.json({ role: 'employee' });
    }

    res.json({ role: result.recordset[0].role });
  } catch (err) {
    logError(err, req, { context: 'Get role error', userId: req.params.userId });
    res.status(500).json({ error: 'Failed to get user role' });
  }
});

// GET /api/users/:userId/profile
router.get('/:userId/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('employee_id', sql.NVarChar, userId)
      .query(`
        SELECT 
          p.employee_id, p.email, p.full_name, p.phone, 
          p.department, p.position, p.avatar_url, p.hire_date, p.created_at, p.updated_at
        FROM profiles p
        WHERE p.employee_id = @employee_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    logError(err, req, { context: 'Get profile error', userId: req.params.userId });
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
      .input('employee_id', sql.NVarChar, userId)
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
          INSERTED.employee_id, INSERTED.email, INSERTED.full_name, 
          INSERTED.phone, INSERTED.department, INSERTED.position,
          INSERTED.avatar_url, INSERTED.hire_date
        WHERE employee_id = @employee_id
      `);

    res.json(result.recordset[0]);
  } catch (err) {
    logError(err, req, { context: 'Update profile error', userId: req.params.userId });
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
          p.employee_id, p.email, p.full_name, p.phone, 
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

// GET /api/users/with-roles - Get all users with their roles (HR and Manager)
router.get('/with-roles', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const pool = await getConnection();

    const result = await pool.request()
      .query(`
        SELECT 
          p.employee_id, p.email, p.full_name, p.department, p.position,
          ur.role, ur.id as role_id, ur.created_at as role_assigned_at
        FROM profiles p
        LEFT JOIN user_roles ur ON p.employee_id = ur.employee_id
        ORDER BY p.full_name, ur.role
      `);

    // Group roles by user
    const usersMap = new Map();
    result.recordset.forEach(row => {
      if (!usersMap.has(row.employee_id)) {
        usersMap.set(row.employee_id, {
          employee_id: row.employee_id,
          email: row.email,
          full_name: row.full_name,
          department: row.department,
          position: row.position,
          roles: []
        });
      }
      if (row.role) {
        usersMap.get(row.employee_id).roles.push({
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

// POST /api/users/:userId/roles - Assign role to user (HR and Manager)
router.post('/:userId/roles', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['employee', 'hr', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be employee, hr, or manager' });
    }

    const pool = await getConnection();

    // Check if user exists
    const userCheck = await pool.request()
      .input('employee_id', sql.NVarChar, userId)
      .input('role', sql.NVarChar, role)
      .query('SELECT employee_id FROM profiles WHERE employee_id = @employee_id AND role = @role');

    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if role already assigned
    const roleCheck = await pool.request()
      .input('employee_id', sql.NVarChar, userId)
      .input('role', sql.NVarChar, role)
      .query('SELECT id FROM user_roles WHERE employee_id = @employee_id AND role = @role');

    if (roleCheck.recordset.length > 0) {
      return res.status(400).json({ error: 'Role already assigned to this user' });
    }

    // Assign role
    const result = await pool.request()
      .input('employee_id', sql.NVarChar, userId)
      .input('role', sql.NVarChar, role)
      .query(`
        INSERT INTO user_roles (employee_id, role, created_at)
        OUTPUT INSERTED.id, INSERTED.employee_id, INSERTED.role, INSERTED.created_at
        VALUES (@employee_id, @role, GETDATE())
      `);

    res.status(201).json({
      message: 'Role assigned successfully',
      role: result.recordset[0]
    });
  } catch (err) {
    logError(err, req, { context: 'Assign role error', userId: req.params.userId, role: req.body.role });
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// DELETE /api/users/roles/:roleId - Remove role from user (HR and Manager)
router.delete('/roles/:roleId', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const pool = await getConnection();

    // Get role info before deletion
    const roleInfo = await pool.request()
      .input('role_id', sql.Int, roleId)
      .query('SELECT employee_id, role FROM user_roles WHERE id = @role_id');

    if (roleInfo.recordset.length === 0) {
      return res.status(404).json({ error: 'Role assignment not found' });
    }

    // Prevent removing the last role from a user
    const userRolesCount = await pool.request()
      .input('employee_id', sql.NVarChar, roleInfo.recordset[0].employee_id)
      .query('SELECT COUNT(*) as count FROM user_roles WHERE employee_id = @employee_id');

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

// GET /api/users/:userId/preferences - Get user preferences
router.get('/:userId/preferences', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can only access their own preferences or is HR
    if (parseInt(req.user.id) !== parseInt(userId) && req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('employee_id', sql.NVarChar, userId)
      .query(`
        SELECT 
          id, employee_id, dark_mode, compact_view,
          email_notifications, push_notifications, leave_update_notifications,
          notification_sound, notification_volume,
          created_at, updated_at
        FROM user_preferences
        WHERE employee_id = @employee_id
      `);

    if (result.recordset.length === 0) {
      // Create default preferences if they don't exist
      const createResult = await pool.request()
        .input('employee_id', sql.NVarChar, userId)
        .query(`
          INSERT INTO user_preferences (
            employee_id, dark_mode, compact_view, 
            email_notifications, push_notifications, leave_update_notifications,
            notification_sound, notification_volume,
            created_at, updated_at
          )
          OUTPUT 
            INSERTED.id, INSERTED.employee_id, INSERTED.dark_mode, INSERTED.compact_view,
            INSERTED.email_notifications, INSERTED.push_notifications, 
            INSERTED.leave_update_notifications, INSERTED.notification_sound, 
            INSERTED.notification_volume, INSERTED.created_at, INSERTED.updated_at
          VALUES (
            @employee_id, 0, 0, 
            1, 1, 1,
            'default', 50,
            GETDATE(), GETDATE()
          )
        `);
      
      return res.json(createResult.recordset[0]);
    }

    res.json(result.recordset[0]);
  } catch (err) {
    logError(err, req, { context: 'Get preferences error', userId: req.params.userId });
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// PUT /api/users/:userId/preferences - Update user preferences
router.put('/:userId/preferences', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can only update their own preferences
    if (parseInt(req.user.id) !== parseInt(userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { dark_mode, compact_view, email_notifications, push_notifications, leave_update_notifications, notification_sound, notification_volume } = req.body;
    const pool = await getConnection();

    // Check if preferences exist
    const existing = await pool.request()
      .input('employee_id', sql.NVarChar, userId)
      .query('SELECT id FROM user_preferences WHERE employee_id = @employee_id');

    if (existing.recordset.length === 0) {
      // Create new preferences
      const result = await pool.request()
        .input('employee_id', sql.NVarChar, userId)
        .input('dark_mode', sql.Bit, dark_mode ?? false)
        .input('compact_view', sql.Bit, compact_view ?? false)
        .input('email_notifications', sql.Bit, email_notifications ?? true)
        .input('push_notifications', sql.Bit, push_notifications ?? true)
        .input('leave_update_notifications', sql.Bit, leave_update_notifications ?? true)
        .input('notification_sound', sql.NVarChar, notification_sound ?? 'default')
        .input('notification_volume', sql.Int, notification_volume ?? 50)
        .query(`
          INSERT INTO user_preferences (
            employee_id, dark_mode, compact_view, 
            email_notifications, push_notifications, leave_update_notifications,
            notification_sound, notification_volume,
            created_at, updated_at
          )
          OUTPUT INSERTED.*
          VALUES (
            @employee_id, @dark_mode, @compact_view,
            @email_notifications, @push_notifications, @leave_update_notifications,
            @notification_sound, @notification_volume,
            GETDATE(), GETDATE()
          )
        `);
      
      return res.json(result.recordset[0]);
    } else {
      // Update existing preferences
      const updates = [];
      const request = pool.request().input('employee_id', sql.NVarChar, userId);
      
      if (dark_mode !== undefined) {
        updates.push('dark_mode = @dark_mode');
        request.input('dark_mode', sql.Bit, dark_mode);
      }
      if (compact_view !== undefined) {
        updates.push('compact_view = @compact_view');
        request.input('compact_view', sql.Bit, compact_view);
      }
      if (email_notifications !== undefined) {
        updates.push('email_notifications = @email_notifications');
        request.input('email_notifications', sql.Bit, email_notifications);
      }
      if (push_notifications !== undefined) {
        updates.push('push_notifications = @push_notifications');
        request.input('push_notifications', sql.Bit, push_notifications);
      }
      if (leave_update_notifications !== undefined) {
        updates.push('leave_update_notifications = @leave_update_notifications');
        request.input('leave_update_notifications', sql.Bit, leave_update_notifications);
      }
      if (notification_sound !== undefined) {
        updates.push('notification_sound = @notification_sound');
        request.input('notification_sound', sql.NVarChar, notification_sound);
      }
      if (notification_volume !== undefined) {
        updates.push('notification_volume = @notification_volume');
        request.input('notification_volume', sql.Int, notification_volume);
      }

      if (updates.length > 0) {
        updates.push('updated_at = GETDATE()');
        const result = await request.query(`
          UPDATE user_preferences
          SET ${updates.join(', ')}
          OUTPUT INSERTED.*
          WHERE employee_id = @employee_id
        `);
        
        return res.json(result.recordset[0]);
      }

      return res.status(400).json({ error: 'No updates provided' });
    }
  } catch (err) {
    logError(err, req, { context: 'Update preferences error', userId: req.params.userId });
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// POST /api/users/:userId/change-password - Change user password
// Update notification sound preferences
router.put('/:userId/notification-sound', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { notification_sound, notification_volume } = req.body;
    const pool = await getConnection();

    await pool.request()
      .input('employee_id', sql.NVarChar, userId)
      .input('notification_sound', sql.NVarChar, notification_sound)
      .input('notification_volume', sql.Int, notification_volume)
      .query(`
        UPDATE user_preferences 
        SET notification_sound = @notification_sound,
            notification_volume = @notification_volume,
            updated_at = GETDATE()
        WHERE employee_id = @employee_id
      `);

    res.json({ message: 'Sound preferences updated successfully' });
  } catch (err) {
    logError(err, req, { context: 'Update sound preferences error', userId: req.params.userId });
    res.status(500).json({ error: 'Failed to update sound preferences' });
  }
});

router.post('/:userId/change-password', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Verify user can only change their own password
    if (parseInt(req.user.id) !== parseInt(userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    if (newPassword.length < 12) {
      return res.status(400).json({ error: 'New password must be at least 12 characters' });
    }

    const pool = await getConnection();
    const bcrypt = require('bcrypt');

    // Get current password hash
    const userResult = await pool.request()
      .input('employee_id', sql.NVarChar, userId)
      .query('SELECT password_hash FROM profiles WHERE employee_id = @employee_id');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, userResult.recordset[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.request()
      .input('employee_id', sql.NVarChar, userId)
      .input('password_hash', sql.NVarChar, newPasswordHash)
      .query(`
        UPDATE profiles
        SET password_hash = @password_hash, updated_at = GETDATE()
        WHERE employee_id = @employee_id
      `);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    logError(err, req, { context: 'Change password error', userId: req.params.userId });
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
