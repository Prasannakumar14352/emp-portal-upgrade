const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logError } = require('../utils/logger');

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
    }
  }
});

// GET /api/users/:userId/role
router.get('/:userId/role', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = await getConnection();

    const query = 'SELECT role FROM user_roles WHERE employee_id = @employee_id';
    console.log(`Executing query: ${query} with employee_id=${userId}`);

    const result = await pool.request()
      .input('employee_id', sql.Int, userId)
      .query(query);

    if (result.recordset.length === 0) {
      return res.json({ role: 'employee' });
    }

    res.json({ role: result.recordset[0].role });
  } catch (err) {
    console.error('Get user role error:', err);
    console.error('Failed query: SELECT role FROM user_roles WHERE employee_id = @employee_id');
    console.error('Table: user_roles, Column: role');
    logError(err, req, { context: 'Get role error', userId: req.params.userId, table: 'user_roles', column: 'role' });
    res.status(500).json({ 
      error: 'Failed to get user role',
      details: 'Check if user_roles table has role column in SQL Server database'
    });
  }
});

// GET /api/users/:userId/profile
router.get('/:userId/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = await getConnection();

    const query = `
      SELECT 
        *
      FROM profiles p
      WHERE p.employee_id = @employee_id
    `;
    console.log(`Executing profile query for user ${userId}`);

    const result = await pool.request()
      .input('employee_id', sql.Int, userId)
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Get profile error:', err);
    console.error('Query:', query);
    console.error('Table: profiles');
    logError(err, req, { context: 'Get profile error', userId: req.params.userId, table: 'profiles' });
    res.status(500).json({ 
      error: 'Failed to get user profile',
      details: err.message 
    });
  }
});

// POST /api/users/:userId/avatar - Upload avatar
router.post('/:userId/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can only update their own avatar or is HR/manager
    if (parseInt(req.user.id) !== parseInt(userId) && !['hr', 'manager'].includes(req.user.role)) {
      // Clean up uploaded file
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ error: 'Not authorized to update this avatar' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const pool = await getConnection();
    
    // Get old avatar URL to delete old file
    const oldAvatarResult = await pool.request()
      .input('employee_id', sql.Int, userId)
      .query('SELECT avatar_url FROM profiles WHERE employee_id = @employee_id');
    
    const oldAvatarUrl = oldAvatarResult.recordset[0]?.avatar_url;
    
    // Delete old avatar file if it exists and is a local file
    if (oldAvatarUrl && oldAvatarUrl.startsWith('/uploads/avatars/')) {
      const oldFilePath = path.join(__dirname, '..', oldAvatarUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Generate avatar URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update profile with new avatar URL (without OUTPUT due to trigger conflict)
    await pool.request()
      .input('employee_id', sql.Int, userId)
      .input('avatar_url', sql.NVarChar, avatarUrl)
      .query(`
        UPDATE profiles
        SET avatar_url = @avatar_url, updated_at = GETDATE()
        WHERE employee_id = @employee_id
      `);

    res.json({
      message: 'Avatar uploaded successfully',
      avatar_url: avatarUrl
    });
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    logError(err, req, { context: 'Upload avatar error', userId: req.params.userId });
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// PATCH /api/users/:userId/profile
router.patch('/:userId/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Received profile update request for user ${userId}:`, req.body);
    // Verify user can only update their own profile or is HR/manager
    // Convert both to numbers for proper comparison
    if (parseInt(req.user.id) !== parseInt(userId) && !['hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    const { full_name, phone, department, position, avatar_url, hire_date, latitude, longitude, location_address } = req.body;
    const pool = await getConnection();

    console.log(`Updating profile for user ${userId} with data:`, req.body);

    // Update the profile (without OUTPUT due to trigger conflict)
    await pool.request()
      .input('employee_id', sql.Int, userId)
      .input('full_name', sql.NVarChar, full_name)
      .input('phone', sql.NVarChar, phone)
      .input('department', sql.NVarChar, department)
      .input('position', sql.NVarChar, position)
      .input('avatar_url', sql.NVarChar, avatar_url)
      .input('hire_date', sql.Date, hire_date)
      .input('latitude', sql.Decimal(10, 8), latitude)
      .input('longitude', sql.Decimal(11, 8), longitude)
      .input('location_address', sql.NVarChar, location_address)
      .query(`
        UPDATE profiles
        SET 
          full_name = COALESCE(@full_name, full_name),
          phone = COALESCE(@phone, phone),
          department = COALESCE(@department, department),
          position = COALESCE(@position, position),
          avatar_url = COALESCE(@avatar_url, avatar_url),
          hire_date = COALESCE(@hire_date, hire_date),
          latitude = COALESCE(@latitude, latitude),
          longitude = COALESCE(@longitude, longitude),
          location_address = COALESCE(@location_address, location_address),
          updated_at = GETDATE()
        WHERE employee_id = @employee_id
      `);

    // Fetch the updated profile
    const result = await pool.request()
      .input('employee_id', sql.Int, userId)
      .query(`
        SELECT 
          *
        FROM profiles
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
      .input('employee_id', sql.Int, userId)
      .query('SELECT employee_id FROM profiles WHERE employee_id = @employee_id');

    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if role already assigned
    const roleCheck = await pool.request()
      .input('employee_id', sql.Int, userId)
      .input('role', sql.NVarChar, role)
      .query('SELECT id FROM user_roles WHERE employee_id = @employee_id AND role = @role');

    if (roleCheck.recordset.length > 0) {
      return res.status(400).json({ error: 'Role already assigned to this user' });
    }

    // Assign role
    const result = await pool.request()
      .input('employee_id', sql.Int, userId)
      .input('role', sql.NVarChar, role)
      .query(`
        INSERT INTO user_roles (employee_id, role, created_at)
        OUTPUT INSERTED.id, INSERTED.employee_id, INSERTED.role, INSERTED.created_at
        VALUES (@employee_id, @role, GETDATE())
      `);

    // Log the role assignment in audit log
    await pool.request()
      .input('employee_id', sql.Int, userId)
      .input('role', sql.NVarChar, role)
      .input('changed_by', sql.Int, req.user.id)
      .query(`
        INSERT INTO role_audit_log (employee_id, role, action, changed_by, changed_at)
        VALUES (@employee_id, @role, 'assigned', @changed_by, GETDATE())
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

// POST /api/users/bulk-assign-roles - Bulk assign roles to multiple users (HR and Manager)
router.post('/bulk-assign-roles', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { userIds, role } = req.body;

    if (!role || !['employee', 'hr', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be employee, hr, or manager' });
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' });
    }

    const pool = await getConnection();
    const results = {
      assigned: [],
      skipped: [],
      errors: []
    };

    for (const userId of userIds) {
      try {
        // Check if user exists
        const userCheck = await pool.request()
          .input('employee_id', sql.Int, userId)
          .query('SELECT employee_id, full_name FROM profiles WHERE employee_id = @employee_id');

        if (userCheck.recordset.length === 0) {
          results.errors.push({ userId, reason: 'User not found' });
          continue;
        }

        const userName = userCheck.recordset[0].full_name;

        // Check if role already assigned
        const roleCheck = await pool.request()
          .input('employee_id', sql.Int, userId)
          .input('role', sql.NVarChar, role)
          .query('SELECT id FROM user_roles WHERE employee_id = @employee_id AND role = @role');

        if (roleCheck.recordset.length > 0) {
          results.skipped.push({ userId, userName, reason: 'Role already assigned' });
          continue;
        }

        // Assign role
        await pool.request()
          .input('employee_id', sql.Int, userId)
          .input('role', sql.NVarChar, role)
          .query('INSERT INTO user_roles (employee_id, role, created_at) VALUES (@employee_id, @role, GETDATE())');

        // Log the role assignment in audit log
        await pool.request()
          .input('employee_id', sql.Int, userId)
          .input('role', sql.NVarChar, role)
          .input('changed_by', sql.Int, req.user.id)
          .query(`
            INSERT INTO role_audit_log (employee_id, role, action, changed_by, changed_at)
            VALUES (@employee_id, @role, 'bulk_assigned', @changed_by, GETDATE())
          `);

        results.assigned.push({ userId, userName, role });
      } catch (err) {
        logError(err, req, { context: 'Bulk role assignment error for user', userId, role });
        results.errors.push({ userId, reason: err.message });
      }
    }

    const totalProcessed = results.assigned.length + results.skipped.length + results.errors.length;
    
    res.status(200).json({
      message: `Bulk role assignment completed. ${results.assigned.length} assigned, ${results.skipped.length} skipped, ${results.errors.length} errors`,
      summary: {
        total: userIds.length,
        processed: totalProcessed,
        assigned: results.assigned.length,
        skipped: results.skipped.length,
        errors: results.errors.length
      },
      details: results
    });
  } catch (err) {
    logError(err, req, { context: 'Bulk assign roles error' });
    res.status(500).json({ error: 'Failed to bulk assign roles' });
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

    const { employee_id, role } = roleInfo.recordset[0];

    // Prevent removing the last role from a user
    const userRolesCount = await pool.request()
      .input('employee_id', sql.Int, employee_id)
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

    // Log the role removal in audit log
    await pool.request()
      .input('employee_id', sql.Int, employee_id)
      .input('role', sql.NVarChar, role)
      .input('changed_by', sql.Int, req.user.id)
      .query(`
        INSERT INTO role_audit_log (employee_id, role, action, changed_by, changed_at)
        VALUES (@employee_id, @role, 'removed', @changed_by, GETDATE())
      `);

    res.json({ message: 'Role removed successfully' });
  } catch (err) {
    logError(err, req, { context: 'Remove role error', roleId });
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

// GET /api/users/role-audit-log - Get role change audit log (HR and Manager)
router.get('/role-audit-log', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const pool = await getConnection();
    const { limit = 100, offset = 0, employeeId } = req.query;

    let query = `
      SELECT 
        ral.id,
        ral.employee_id,
        p.full_name as employee_name,
        p.email as employee_email,
        ral.role,
        ral.action,
        ral.changed_by,
        changer.full_name as changed_by_name,
        changer.email as changed_by_email,
        ral.changed_at,
        ral.notes
      FROM role_audit_log ral
      INNER JOIN profiles p ON ral.employee_id = p.employee_id
      INNER JOIN profiles changer ON ral.changed_by = changer.employee_id
    `;

    if (employeeId) {
      query += ` WHERE ral.employee_id = @employee_id`;
    }

    query += ` ORDER BY ral.changed_at DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY`;

    const request = pool.request()
      .input('limit', sql.Int, parseInt(limit))
      .input('offset', sql.Int, parseInt(offset));

    if (employeeId) {
      request.input('employee_id', sql.Int, parseInt(employeeId));
    }

    const result = await request.query(query);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM role_audit_log';
    if (employeeId) {
      countQuery += ' WHERE employee_id = @employee_id';
    }

    const countRequest = pool.request();
    if (employeeId) {
      countRequest.input('employee_id', sql.Int, parseInt(employeeId));
    }
    const countResult = await countRequest.query(countQuery);

    res.json({
      data: result.recordset,
      pagination: {
        total: countResult.recordset[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    logError(err, req, { context: 'Get role audit log error' });
    res.status(500).json({ error: 'Failed to get role audit log' });
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
      .input('employee_id', sql.Int, userId)
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
        .input('employee_id', sql.Int, userId)
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
      .input('employee_id', sql.Int, userId)
      .query('SELECT id FROM user_preferences WHERE employee_id = @employee_id');

    if (existing.recordset.length === 0) {
      // Create new preferences
      const result = await pool.request()
        .input('employee_id', sql.Int, userId)
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
      const request = pool.request().input('employee_id', sql.Int, userId);
      
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
      .input('employee_id', sql.Int, userId)
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
      .input('employee_id', sql.Int, userId)
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
      .input('employee_id', sql.Int, userId)
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
