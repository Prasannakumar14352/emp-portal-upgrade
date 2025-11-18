const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logError } = require('../utils/logger');

const router = express.Router();

// GET /api/leaves/conflicts - Check for leave conflicts
router.get('/conflicts', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;
    const pool = await getConnection();

    const result = await pool.request()
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date)
      .input('user_id', sql.Int, user_id ? parseInt(user_id) : null)
      .query(`
        SELECT 
          l.id, l.user_id, l.leave_type, l.start_date, l.end_date, l.days,
          u.full_name, u.department
        FROM leaves l
        JOIN profiles u ON l.user_id = u.user_id
        WHERE l.status IN ('Pending', 'Approved')
          AND (@user_id IS NULL OR l.user_id != @user_id)
          AND (
            (l.start_date BETWEEN @start_date AND @end_date)
            OR (l.end_date BETWEEN @start_date AND @end_date)
            OR (@start_date BETWEEN l.start_date AND l.end_date)
            OR (@end_date BETWEEN l.start_date AND l.end_date)
          )
        ORDER BY l.start_date
      `);

    res.json(result.recordset);
  } catch (err) {
    logError(err, req, { context: 'Check conflicts error' });
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});

// GET /api/leaves/user/:userId - Get user's leave requests
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);
    
    // Users can only view their own leaves unless HR/manager
    if (parseInt(req.user.id) !== userIdInt && !['hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('user_id', sql.Int, userIdInt)
      .query(`
        SELECT 
          l.id, l.user_id, l.leave_type, l.start_date, l.end_date,
          l.days, l.reason, l.status, l.approved_by, l.created_at, l.updated_at
        FROM leaves l
        WHERE l.user_id = @user_id
        ORDER BY l.created_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    logError(err, req, { context: 'Get user leaves error', userId });
    res.status(500).json({ error: 'Failed to get leaves' });
  }
});

// GET /api/leaves - Get all leave requests (HR/Manager only)
router.get('/', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { status } = req.query;
    const pool = await getConnection();

    let query = `
      SELECT 
        l.id, l.user_id, l.leave_type, l.start_date, l.end_date,
        l.days, l.reason, l.status, l.approved_by, l.created_at, l.updated_at,
        u.full_name as user_name, u.email as user_email
      FROM leaves l
      JOIN profiles u ON l.user_id = u.user_id
    `;

    if (status) {
      query += ' WHERE l.status = @status';
    }

    query += ' ORDER BY l.created_at DESC';

    const request = pool.request();
    if (status) {
      request.input('status', sql.NVarChar, status);
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    logError(err, req, { context: 'Get leaves error', status });
    res.status(500).json({ error: 'Failed to get leaves' });
  }
});

// POST /api/leaves - Create new leave request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { leave_type, start_date, end_date, days, reason, manager_id, cc_emails } = req.body;
    const pool = await getConnection();
    const nodemailer = require('nodemailer');

    const result = await pool.request()
      .input('user_id', sql.Int, req.user.id)
      .input('manager_id', sql.Int, manager_id || null)
      .input('leave_type', sql.NVarChar, leave_type)
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date)
      .input('days', sql.Int, days)
      .input('reason', sql.NVarChar, reason)
      .input('cc_emails', sql.NVarChar, cc_emails ? JSON.stringify(cc_emails) : null)
      .query(`
        INSERT INTO leaves (user_id, manager_id, leave_type, start_date, end_date, days, reason, cc_emails, status, manager_status, hr_status, created_at)
        OUTPUT INSERTED.*
        VALUES (@user_id, @manager_id, @leave_type, @start_date, @end_date, @days, @reason, @cc_emails, 'Pending', 'Pending', 'Pending', GETDATE())
      `);

    // Send email notifications
    try {
      const userResult = await pool.request()
        .input('user_id', sql.Int, req.user.id)
        .query('SELECT email, full_name FROM profiles WHERE user_id = @user_id');

      if (userResult.recordset.length > 0) {
        const employee = userResult.recordset[0];
        
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: 587,
          secure: false,
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
          }
        });

        const emailSubject = 'New Leave Request Requires Your Approval';
        const emailHtml = `
          <h2>New Leave Request</h2>
          <p><strong>${employee.full_name}</strong> has applied for leave and requires approval.</p>
          <p><strong>Leave Type:</strong> ${leave_type}</p>
          <p><strong>Duration:</strong> ${start_date} to ${end_date} (${days} days)</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>Please log in to the system to review and approve/reject this request.</p>
        `;

        // Collect all recipients
        const recipients = [];

        // Add manager email
        if (manager_id) {
          const managerResult = await pool.request()
            .input('manager_id', sql.Int, manager_id)
            .query('SELECT email, full_name FROM profiles WHERE user_id = @manager_id');
          
          if (managerResult.recordset.length > 0) {
            recipients.push(managerResult.recordset[0].email);
          }
        }

        // Add all HR users
        const hrResult = await pool.request()
          .query(`
            SELECT p.email 
            FROM profiles p
            INNER JOIN user_roles ur ON p.user_id = ur.user_id
            WHERE ur.role = 'hr'
          `);
        
        hrResult.recordset.forEach(hr => {
          if (!recipients.includes(hr.email)) {
            recipients.push(hr.email);
          }
        });

        // Send to all recipients (manager + HR)
        if (recipients.length > 0) {
          const emailOptions = {
            from: process.env.GMAIL_USER,
            to: recipients.join(', '),
            subject: emailSubject,
            html: emailHtml
          };

          // Add CC recipients if provided
          if (cc_emails && Array.isArray(cc_emails) && cc_emails.length > 0) {
            emailOptions.cc = cc_emails.join(', ');
          }

          await transporter.sendMail(emailOptions);
          console.log('Leave notification sent to:', recipients.join(', '));
          if (cc_emails && cc_emails.length > 0) {
            console.log('CC sent to:', cc_emails.join(', '));
          }
        }
      }
    } catch (emailErr) {
      logError(emailErr, req, { context: 'Failed to send email notification' });
    }

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    logError(err, req, { context: 'Create leave error', data: req.body });
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

// PATCH /api/leaves/:leaveId - Update leave status (Two-tier approval)
router.patch('/:leaveId', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, comments } = req.body;
    const nodemailer = require('nodemailer');

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const pool = await getConnection();
    
    // Get current leave request
    const leaveResult = await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .query('SELECT * FROM leaves WHERE id = @leave_id');
    
    if (leaveResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const leave = leaveResult.recordset[0];
    const isManager = req.user.role === 'manager';
    const isHR = req.user.role === 'hr';

    let result;

    if (isManager) {
      // Manager approval/rejection
      result = await pool.request()
        .input('leave_id', sql.Int, leaveId)
        .input('status', sql.NVarChar, status)
        .input('approved_by', sql.Int, req.user.id)
        .input('comments', sql.NVarChar, comments || null)
        .query(`
          UPDATE leaves
          SET manager_status = @status,
              manager_approved_by = @approved_by,
              manager_approved_at = GETDATE(),
              manager_comments = @comments,
              status = CASE WHEN @status = 'Rejected' THEN 'Rejected' ELSE 'Pending' END,
              updated_at = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @leave_id
        `);
    } else if (isHR) {
      // HR approval/rejection
      result = await pool.request()
        .input('leave_id', sql.Int, leaveId)
        .input('status', sql.NVarChar, status)
        .input('approved_by', sql.Int, req.user.id)
        .input('comments', sql.NVarChar, comments || null)
        .query(`
          UPDATE leaves
          SET hr_status = @status,
              hr_approved_by = @approved_by,
              hr_approved_at = GETDATE(),
              hr_comments = @comments,
              status = @status,
              approved_by = @approved_by,
              updated_at = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @leave_id
        `);
    }

    const updatedLeave = result.recordset[0];

    // Send email notifications
    try {
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_SERVER,
        port: 587,
        secure: false,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });

      // Get employee and approver details
      const employeeResult = await pool.request()
        .input('user_id', sql.Int, updatedLeave.user_id)
        .query('SELECT email, full_name FROM profiles WHERE user_id = @user_id');
      
      const approverResult = await pool.request()
        .input('approver_id', sql.Int, req.user.id)
        .query('SELECT email, full_name FROM profiles WHERE user_id = @approver_id');

      if (employeeResult.recordset.length > 0 && approverResult.recordset.length > 0) {
        const employee = employeeResult.recordset[0];
        const approver = approverResult.recordset[0];
        
        // Notify employee
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: employee.email,
          subject: `Leave Request ${status} by ${isManager ? 'Manager' : 'HR'}`,
          html: `
            <h2>Leave Request Update</h2>
            <p>Your leave request has been <strong>${status}</strong> by ${isManager ? 'your manager' : 'HR'} (${approver.full_name}).</p>
            <p><strong>Leave Type:</strong> ${updatedLeave.leave_type}</p>
            <p><strong>Duration:</strong> ${updatedLeave.start_date} to ${updatedLeave.end_date} (${updatedLeave.days} days)</p>
            ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ''}
            ${isManager && status === 'Approved' ? '<p><em>Your request now awaits HR approval.</em></p>' : ''}
          `
        });

        // If manager approved, notify HR
        if (isManager && status === 'Approved') {
          const hrResult = await pool.request()
            .query(`
              SELECT p.email, p.full_name 
              FROM profiles p
              JOIN user_roles ur ON p.user_id = ur.user_id
              WHERE ur.role = 'hr'
            `);
          
          if (hrResult.recordset.length > 0) {
            const hrEmails = hrResult.recordset.map(hr => hr.email);
            await transporter.sendMail({
              from: process.env.GMAIL_USER,
              to: hrEmails,
              subject: 'Leave Request Requires HR Approval',
              html: `
                <h2>Leave Request Awaiting HR Approval</h2>
                <p><strong>${employee.full_name}</strong>'s leave request has been approved by the manager and now requires HR approval.</p>
                <p><strong>Leave Type:</strong> ${updatedLeave.leave_type}</p>
                <p><strong>Duration:</strong> ${updatedLeave.start_date} to ${updatedLeave.end_date} (${updatedLeave.days} days)</p>
                <p><strong>Manager:</strong> ${approver.full_name}</p>
                <p>Please log in to the system to review and approve/reject this request.</p>
              `
            });
          }
        }
      }
    } catch (emailErr) {
      logError(emailErr, req, { context: 'Failed to send email notification' });
    }

    // Update leave balance if HR approved
    if (isHR && status === 'Approved') {
      const year = new Date(updatedLeave.start_date).getFullYear();

      await pool.request()
        .input('user_id', sql.Int, updatedLeave.user_id)
        .input('year', sql.Int, year)
        .input('leave_type', sql.NVarChar, updatedLeave.leave_type)
        .input('days', sql.Int, updatedLeave.days)
        .query(`
          MERGE leave_balances AS target
          USING (SELECT @user_id as user_id, @year as year, @leave_type as leave_type) AS source
          ON target.user_id = source.user_id AND target.year = source.year AND target.leave_type = source.leave_type
          WHEN MATCHED THEN
            UPDATE SET 
              used_days = used_days + @days,
              remaining_days = total_days - (used_days + @days),
              updated_at = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (user_id, year, leave_type, total_days, used_days, remaining_days, created_at)
            VALUES (@user_id, @year, @leave_type, 20, @days, 20 - @days, GETDATE());
        `);
    }

    res.json(updatedLeave);
  } catch (err) {
    logError(err, req, { context: 'Update leave error', leaveId });
    res.status(500).json({ error: 'Failed to update leave status' });
  }
});

// GET /api/leaves/balances/:userId - Get leave balances
router.get('/balances/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);
    const { year } = req.query;
    
    if (parseInt(req.user.id) !== userIdInt && !['hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const pool = await getConnection();
    const currentYear = year || new Date().getFullYear();

    const result = await pool.request()
      .input('user_id', sql.Int, userIdInt)
      .input('year', sql.Int, currentYear)
      .query(`
        SELECT 
          id, user_id, year, leave_type, total_days, 
          used_days, remaining_days, carry_forward_days
        FROM leave_balances
        WHERE user_id = @user_id AND year = @year
      `);

    res.json(result.recordset);
  } catch (err) {
    logError(err, req, { context: 'Get leave balances error', userId });
    res.status(500).json({ error: 'Failed to get leave balances' });
  }
});

// POST /api/leaves/:leaveId/comments - Add comment to leave
router.post('/:leaveId/comments', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { comment } = req.body;

    const pool = await getConnection();
    const result = await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .input('user_id', sql.Int, req.user.id)
      .input('comment', sql.NVarChar, comment)
      .query(`
        INSERT INTO leave_comments (leave_id, user_id, comment, created_at)
        OUTPUT INSERTED.*
        VALUES (@leave_id, @user_id, @comment, GETDATE())
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    logError(err, req, { context: 'Add comment error', leaveId });
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// GET /api/leaves/:leaveId/comments - Get leave comments
router.get('/:leaveId/comments', authenticateToken, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .query(`
        SELECT 
          lc.id, lc.leave_id, lc.user_id, lc.comment, lc.created_at,
          u.full_name as author_name
        FROM leave_comments lc
        JOIN profiles u ON lc.user_id = u.user_id
        WHERE lc.leave_id = @leave_id
        ORDER BY lc.created_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    logError(err, req, { context: 'Get comments error', leaveId });
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// PUT /api/leaves/:leaveId - Edit pending leave request (Employee only)
router.put('/:leaveId', authenticateToken, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { leave_type, start_date, end_date, days, reason } = req.body;
    const pool = await getConnection();
    const nodemailer = require('nodemailer');
    
    // Get leave request details
    const leaveResult = await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .query('SELECT * FROM leaves WHERE id = @leave_id');
    
    if (leaveResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const leave = leaveResult.recordset[0];
    
    // Only the employee who created the request can edit it
    if (parseInt(req.user.id) !== leave.user_id) {
      return res.status(403).json({ error: 'You can only edit your own leave requests' });
    }

    // Only allow editing of pending requests
    if (leave.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending leave requests can be edited' });
    }

    // Update the leave request
    const result = await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .input('leave_type', sql.NVarChar, leave_type)
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date)
      .input('days', sql.Int, days)
      .input('reason', sql.NVarChar, reason)
      .query(`
        UPDATE leaves
        SET leave_type = @leave_type,
            start_date = @start_date,
            end_date = @end_date,
            days = @days,
            reason = @reason,
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @leave_id
      `);

    const updatedLeave = result.recordset[0];

    // Send email notifications about the change
    try {
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_SERVER,
        port: 587,
        secure: false,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });

      const employeeResult = await pool.request()
        .input('user_id', sql.Int, leave.user_id)
        .query('SELECT email, full_name FROM profiles WHERE user_id = @user_id');

      if (employeeResult.recordset.length > 0) {
        const employee = employeeResult.recordset[0];

        // Notify manager if there is one
        if (leave.manager_id) {
          const managerResult = await pool.request()
            .input('manager_id', sql.Int, leave.manager_id)
            .query('SELECT email, full_name FROM profiles WHERE user_id = @manager_id');
          
          if (managerResult.recordset.length > 0) {
            const manager = managerResult.recordset[0];
            await transporter.sendMail({
              from: process.env.GMAIL_USER,
              to: manager.email,
              subject: 'Leave Request Modified',
              html: `
                <h2>Leave Request Updated</h2>
                <p><strong>${employee.full_name}</strong> has modified their leave request.</p>
                <h3>Updated Details:</h3>
                <p><strong>Leave Type:</strong> ${leave_type}</p>
                <p><strong>Duration:</strong> ${start_date} to ${end_date} (${days} days)</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <p>Please review the updated request.</p>
              `
            });
          }
        }

        // Notify all HR users
        const hrResult = await pool.request()
          .query(`
            SELECT p.email, p.full_name 
            FROM profiles p
            JOIN user_roles ur ON p.user_id = ur.user_id
            WHERE ur.role = 'hr'
          `);
        
        if (hrResult.recordset.length > 0) {
          const hrEmails = hrResult.recordset.map(hr => hr.email);
          await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: hrEmails,
            subject: 'Leave Request Modified',
            html: `
              <h2>Leave Request Updated</h2>
              <p><strong>${employee.full_name}</strong> has modified their leave request.</p>
              <h3>Updated Details:</h3>
              <p><strong>Leave Type:</strong> ${leave_type}</p>
              <p><strong>Duration:</strong> ${start_date} to ${end_date} (${days} days)</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <p>Please review the updated request.</p>
            `
          });
        }
      }
    } catch (emailErr) {
      logError(emailErr, req, { context: 'Failed to send edit notification email' });
    }

    res.json(updatedLeave);
  } catch (err) {
    logError(err, req, { context: 'Edit leave error', leaveId });
    res.status(500).json({ error: 'Failed to edit leave request' });
  }
});

// DELETE /api/leaves/:leaveId - Cancel leave request (Employee only)
router.delete('/:leaveId', authenticateToken, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const pool = await getConnection();
    const nodemailer = require('nodemailer');
    
    // Get leave request details
    const leaveResult = await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .query('SELECT * FROM leaves WHERE id = @leave_id');
    
    if (leaveResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const leave = leaveResult.recordset[0];
    
    // Only the employee who created the request can cancel it
    if (parseInt(req.user.id) !== leave.user_id) {
      return res.status(403).json({ error: 'You can only cancel your own leave requests' });
    }

    // Only allow cancellation of pending requests
    if (leave.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending leave requests can be cancelled' });
    }

    // Get employee details
    const employeeResult = await pool.request()
      .input('user_id', sql.Int, leave.user_id)
      .query('SELECT email, full_name FROM profiles WHERE user_id = @user_id');

    // Delete the leave request
    await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .query('DELETE FROM leaves WHERE id = @leave_id');

    // Send email notifications
    try {
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_SERVER,
        port: 587,
        secure: false,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });

      if (employeeResult.recordset.length > 0) {
        const employee = employeeResult.recordset[0];

        // Notify manager if there is one
        if (leave.manager_id) {
          const managerResult = await pool.request()
            .input('manager_id', sql.Int, leave.manager_id)
            .query('SELECT email, full_name FROM profiles WHERE user_id = @manager_id');
          
          if (managerResult.recordset.length > 0) {
            const manager = managerResult.recordset[0];
            await transporter.sendMail({
              from: process.env.GMAIL_USER,
              to: manager.email,
              subject: 'Leave Request Cancelled',
              html: `
                <h2>Leave Request Cancelled</h2>
                <p><strong>${employee.full_name}</strong> has cancelled their leave request.</p>
                <p><strong>Leave Type:</strong> ${leave.leave_type}</p>
                <p><strong>Duration:</strong> ${leave.start_date} to ${leave.end_date} (${leave.days} days)</p>
                <p><strong>Reason:</strong> ${leave.reason}</p>
              `
            });
          }
        }

        // Notify all HR users
        const hrResult = await pool.request()
          .query(`
            SELECT p.email, p.full_name 
            FROM profiles p
            JOIN user_roles ur ON p.user_id = ur.user_id
            WHERE ur.role = 'hr'
          `);
        
        if (hrResult.recordset.length > 0) {
          const hrEmails = hrResult.recordset.map(hr => hr.email);
          await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: hrEmails,
            subject: 'Leave Request Cancelled',
            html: `
              <h2>Leave Request Cancelled</h2>
              <p><strong>${employee.full_name}</strong> has cancelled their leave request.</p>
              <p><strong>Leave Type:</strong> ${leave.leave_type}</p>
              <p><strong>Duration:</strong> ${leave.start_date} to ${leave.end_date} (${leave.days} days)</p>
              <p><strong>Reason:</strong> ${leave.reason}</p>
            `
          });
        }
      }
    } catch (emailErr) {
      logError(emailErr, req, { context: 'Failed to send cancellation email notification' });
    }

    res.json({ message: 'Leave request cancelled successfully' });
  } catch (err) {
    logError(err, req, { context: 'Cancel leave error', leaveId });
    res.status(500).json({ error: 'Failed to cancel leave request' });
  }
});

module.exports = router;
