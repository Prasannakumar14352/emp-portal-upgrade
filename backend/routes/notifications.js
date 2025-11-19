const express = require('express');
const nodemailer = require('nodemailer');
const { getConnection } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

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
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('user_id', req.user.employee_id)
      .query(`
        SELECT 
          id,
          user_id,
          type,
          title,
          message,
          [read],
          created_at,
          metadata
        FROM notifications
        WHERE user_id = @user_id
        ORDER BY created_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('user_id', req.user.employee_id)
      .query(`
        SELECT COUNT(*) as count
        FROM notifications
        WHERE user_id = @user_id AND [read] = 0
      `);

    res.json({ count: result.recordset[0].count });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', req.params.id)
      .input('user_id', req.user.employee_id)
      .query(`
        UPDATE notifications
        SET [read] = 1
        WHERE id = @id AND user_id = @user_id
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/notifications/mark-all-read - Mark all as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();
    await pool.request()
      .input('user_id', req.user.employee_id)
      .query(`
        UPDATE notifications
        SET [read] = 1
        WHERE user_id = @user_id AND [read] = 0
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Mark all as read error:', err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', req.params.id)
      .input('user_id', req.user.employee_id)
      .query(`
        DELETE FROM notifications
        WHERE id = @id AND user_id = @user_id
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// GET /api/notifications/preferences - Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('user_id', req.user.employee_id)
      .query(`
        SELECT 
          id,
          user_id,
          email_notifications,
          push_notifications,
          leave_update_notifications,
          compact_view,
          dark_mode,
          created_at,
          updated_at
        FROM user_preferences
        WHERE user_id = @user_id
      `);

    if (result.recordset.length === 0) {
      // Create default preferences if not exists
      const insertResult = await pool.request()
        .input('user_id', req.user.employee_id)
        .query(`
          INSERT INTO user_preferences (user_id, email_notifications, push_notifications, leave_update_notifications)
          VALUES (@user_id, 1, 1, 1);
          
          SELECT 
            id,
            user_id,
            email_notifications,
            push_notifications,
            leave_update_notifications,
            compact_view,
            dark_mode,
            created_at,
            updated_at
          FROM user_preferences
          WHERE user_id = @user_id
        `);
      
      res.json(insertResult.recordset[0]);
    } else {
      res.json(result.recordset[0]);
    }
  } catch (err) {
    console.error('Get preferences error:', err);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// PUT /api/notifications/preferences - Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { email_notifications, push_notifications, leave_update_notifications } = req.body;
    
    const pool = await getConnection();
    
    // Check if preferences exist
    const checkResult = await pool.request()
      .input('user_id', req.user.employee_id)
      .query(`SELECT id FROM user_preferences WHERE user_id = @user_id`);

    if (checkResult.recordset.length === 0) {
      // Insert new preferences
      await pool.request()
        .input('user_id', req.user.employee_id)
        .input('email_notifications', email_notifications ?? true)
        .input('push_notifications', push_notifications ?? true)
        .input('leave_update_notifications', leave_update_notifications ?? true)
        .query(`
          INSERT INTO user_preferences (user_id, email_notifications, push_notifications, leave_update_notifications)
          VALUES (@user_id, @email_notifications, @push_notifications, @leave_update_notifications)
        `);
    } else {
      // Update existing preferences
      const updates = [];
      const request = pool.request().input('user_id', req.user.employee_id);
      
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
          WHERE user_id = @user_id
        `);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update preferences error:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// POST /api/notifications/leave - Send leave notification email
router.post('/leave', authenticateToken, async (req, res) => {
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

    // Send email
    const info = await transporter.sendMail({
      from: `"Employee Portal" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlContent
    });

    console.log('Email sent:', info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: 'Failed to send email notification' });
  }
});

module.exports = router;
