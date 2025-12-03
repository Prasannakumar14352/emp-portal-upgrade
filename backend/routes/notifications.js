const express = require('express');
const nodemailer = require('nodemailer');
const { getConnection } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// GET /api/notifications - Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  logger.api.request('GET', '/api/notifications', { userId: req.user.id });
  const startTime = Date.now();
  
  try {
    logger.process.start('Get User Notifications', { userId: req.user.id });
    
    const pool = await getConnection();
    const result = await pool.request()
      .input('employee_id', req.user.id)
      .query(`
        SELECT 
          id,
          employee_id,
          type,
          title,
          message,
          [read],
          created_at,
          metadata
        FROM notifications
        WHERE employee_id = @employee_id
        ORDER BY created_at DESC
      `);

    logger.process.success('Get User Notifications', {
      userId: req.user.id,
      notificationCount: result.recordset.length
    });
    
    logger.api.response('GET', '/api/notifications', 200, Date.now() - startTime);
    res.json(result.recordset);
  } catch (err) {
    logger.process.error('Get User Notifications', err, { userId: req.user.id });
    logger.api.error('GET', '/api/notifications', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
  logger.api.request('GET', '/api/notifications/unread-count', { userId: req.user.id });
  const startTime = Date.now();
  
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('employee_id', req.user.id)
      .query(`
        SELECT COUNT(*) as count
        FROM notifications
        WHERE employee_id = @employee_id AND [read] = 0
      `);

    const unreadCount = result.recordset[0].count;
    logger.info('Unread notification count retrieved', {
      userId: req.user.id,
      unreadCount
    });
    
    logger.api.response('GET', '/api/notifications/unread-count', 200, Date.now() - startTime);
    res.json({ count: unreadCount });
  } catch (err) {
    logger.api.error('GET', '/api/notifications/unread-count', err);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  logger.api.request('PUT', `/api/notifications/${req.params.id}/read`, {
    userId: req.user.id,
    notificationId: req.params.id
  });
  const startTime = Date.now();
  
  try {
    logger.process.start('Mark Notification as Read', {
      userId: req.user.id,
      notificationId: req.params.id
    });
    
    const pool = await getConnection();
    await pool.request()
      .input('id', req.params.id)
      .input('employee_id', req.user.id)
      .query(`
        UPDATE notifications
        SET [read] = 1
        WHERE id = @id AND employee_id = @employee_id
      `);

    logger.process.success('Mark Notification as Read', {
      userId: req.user.id,
      notificationId: req.params.id
    });
    
    logger.api.response('PUT', `/api/notifications/${req.params.id}/read`, 200, Date.now() - startTime);
    res.json({ success: true });
  } catch (err) {
    logger.process.error('Mark Notification as Read', err, {
      userId: req.user.id,
      notificationId: req.params.id
    });
    logger.api.error('PUT', `/api/notifications/${req.params.id}/read`, err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/notifications/mark-all-read - Mark all as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  logger.api.request('PUT', '/api/notifications/mark-all-read', { userId: req.user.id });
  const startTime = Date.now();
  
  try {
    logger.process.start('Mark All Notifications as Read', { userId: req.user.id });
    
    const pool = await getConnection();
    const result = await pool.request()
      .input('employee_id', req.user.id)
      .query(`
        UPDATE notifications
        SET [read] = 1
        WHERE employee_id = @employee_id AND [read] = 0
      `);

    logger.process.success('Mark All Notifications as Read', {
      userId: req.user.id,
      updatedCount: result.rowsAffected[0]
    });
    
    logger.api.response('PUT', '/api/notifications/mark-all-read', 200, Date.now() - startTime);
    res.json({ success: true });
  } catch (err) {
    logger.process.error('Mark All Notifications as Read', err, { userId: req.user.id });
    logger.api.error('PUT', '/api/notifications/mark-all-read', err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  logger.api.request('DELETE', `/api/notifications/${req.params.id}`, {
    userId: req.user.id,
    notificationId: req.params.id
  });
  const startTime = Date.now();
  
  try {
    logger.process.start('Delete Notification', {
      userId: req.user.id,
      notificationId: req.params.id
    });
    
    const pool = await getConnection();
    await pool.request()
      .input('id', req.params.id)
      .input('employee_id', req.user.id)
      .query(`
        DELETE FROM notifications
        WHERE id = @id AND employee_id = @employee_id
      `);

    logger.process.success('Delete Notification', {
      userId: req.user.id,
      notificationId: req.params.id
    });
    
    logger.api.response('DELETE', `/api/notifications/${req.params.id}`, 200, Date.now() - startTime);
    res.json({ success: true });
  } catch (err) {
    logger.process.error('Delete Notification', err, {
      userId: req.user.id,
      notificationId: req.params.id
    });
    logger.api.error('DELETE', `/api/notifications/${req.params.id}`, err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// GET /api/notifications/preferences - Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  logger.api.request('GET', '/api/notifications/preferences', { userId: req.user.id });
  const startTime = Date.now();
  
  try {
    logger.process.start('Get Notification Preferences', { userId: req.user.id });
    
    const pool = await getConnection();
    const result = await pool.request()
      .input('employee_id', req.user.id)
      .query(`
        SELECT 
          id,
          employee_id,
          email_notifications,
          push_notifications,
          leave_update_notifications,
          compact_view,
          dark_mode,
          created_at,
          updated_at
        FROM user_preferences
        WHERE employee_id = @employee_id
      `);

    if (result.recordset.length === 0) {
      logger.process.step('Get Notification Preferences', 'Creating default preferences');
      
      const insertResult = await pool.request()
        .input('employee_id', req.user.id)
        .query(`
          INSERT INTO user_preferences (employee_id, email_notifications, push_notifications, leave_update_notifications)
          VALUES (@employee_id, 1, 1, 1);
          
          SELECT 
            id,
            employee_id,
            email_notifications,
            push_notifications,
            leave_update_notifications,
            compact_view,
            dark_mode,
            created_at,
            updated_at
          FROM user_preferences
          WHERE employee_id = @employee_id
        `);
      
      logger.process.success('Get Notification Preferences', {
        userId: req.user.id,
        action: 'created_defaults'
      });
      
      logger.api.response('GET', '/api/notifications/preferences', 200, Date.now() - startTime);
      res.json(insertResult.recordset[0]);
    } else {
      logger.process.success('Get Notification Preferences', { userId: req.user.id });
      logger.api.response('GET', '/api/notifications/preferences', 200, Date.now() - startTime);
      res.json(result.recordset[0]);
    }
  } catch (err) {
    logger.process.error('Get Notification Preferences', err, { userId: req.user.id });
    logger.api.error('GET', '/api/notifications/preferences', err);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// PUT /api/notifications/preferences - Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  logger.api.request('PUT', '/api/notifications/preferences', {
    userId: req.user.id,
    updates: req.body
  });
  const startTime = Date.now();
  
  try {
    const { email_notifications, push_notifications, leave_update_notifications } = req.body;
    
    logger.process.start('Update Notification Preferences', {
      userId: req.user.id,
      updates: { email_notifications, push_notifications, leave_update_notifications }
    });
    
    const pool = await getConnection();
    
    const checkResult = await pool.request()
      .input('employee_id', req.user.id)
      .query(`SELECT id FROM user_preferences WHERE employee_id = @employee_id`);

    if (checkResult.recordset.length === 0) {
      logger.process.step('Update Notification Preferences', 'Inserting new preferences');
      
      await pool.request()
        .input('employee_id', req.user.id)
        .input('email_notifications', email_notifications ?? true)
        .input('push_notifications', push_notifications ?? true)
        .input('leave_update_notifications', leave_update_notifications ?? true)
        .query(`
          INSERT INTO user_preferences (employee_id, email_notifications, push_notifications, leave_update_notifications)
          VALUES (@employee_id, @email_notifications, @push_notifications, @leave_update_notifications)
        `);
    } else {
      logger.process.step('Update Notification Preferences', 'Updating existing preferences');
      
      const updates = [];
      const request = pool.request().input('employee_id', req.user.id);
      
      if (email_notifications !== undefined) {
        updates.push('email_notifications = @email_notifications');
        request.input('email_notifications', email_notifications);
      }
      if (push_notifications !== undefined) {
        updates.push('push_notifications = @push_notifications');
        request.input('push_notifications', push_notifications);
      }
      if (leave_update_notifications !== undefined) {
        updates.push('leave_update_notifications = @leave_update_notifications');
        request.input('leave_update_notifications', leave_update_notifications);
      }
      
      if (updates.length > 0) {
        await request.query(`
          UPDATE user_preferences
          SET ${updates.join(', ')}
          WHERE employee_id = @employee_id
        `);
      }
    }

    logger.process.success('Update Notification Preferences', { userId: req.user.id });
    logger.api.response('PUT', '/api/notifications/preferences', 200, Date.now() - startTime);
    res.json({ success: true });
  } catch (err) {
    logger.process.error('Update Notification Preferences', err, { userId: req.user.id });
    logger.api.error('PUT', '/api/notifications/preferences', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// POST /api/notifications/leave - Send leave notification email
router.post('/leave', authenticateToken, async (req, res) => {
  logger.api.request('POST', '/api/notifications/leave', {
    userId: req.user.id,
    to: req.body.to
  });
  const startTime = Date.now();
  
  try {
    const {
      to,
      employeeName,
      leaveType,
      startDate,
      endDate,
      days,
      status,
      reason,
      comments
    } = req.body;

    logger.process.start('Send Leave Notification Email', {
      to,
      employeeName,
      leaveType,
      status
    });

    const subject = `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'} - ${leaveType}`;
    
    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: ${status === 'approved' ? '#22c55e' : '#ef4444'};">
              Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}
            </h2>
            
            <p>Dear ${employeeName},</p>
            
            <p>Your leave request has been <strong>${status.toLowerCase()}</strong>.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Leave Details:</h3>
              <p><strong>Type:</strong> ${leaveType}</p>
              <p><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> ${new Date(endDate).toLocaleDateString()}</p>
              <p><strong>Duration:</strong> ${days} day(s)</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            
            ${comments ? `
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Comments from HR:</h3>
                <p>${comments}</p>
              </div>
            ` : ''}
            
            <p>If you have any questions, please contact your HR department.</p>
            
            <p>Best regards,<br>HR Team</p>
          </div>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"Employee Portal" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlContent
    });

    logger.process.success('Send Leave Notification Email', {
      to,
      messageId: info.messageId,
      status
    });
    
    logger.api.response('POST', '/api/notifications/leave', 200, Date.now() - startTime);
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    logger.process.error('Send Leave Notification Email', err, { to: req.body.to });
    logger.api.error('POST', '/api/notifications/leave', err);
    res.status(500).json({ error: 'Failed to send email notification' });
  }
});

module.exports = router;
