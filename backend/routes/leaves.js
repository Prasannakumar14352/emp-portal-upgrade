const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

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
    console.error('Get user leaves error:', err);
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
      JOIN profiles u ON l.user_id = u.id
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
    console.error('Get leaves error:', err);
    res.status(500).json({ error: 'Failed to get leaves' });
  }
});

// POST /api/leaves - Create new leave request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { leave_type, start_date, end_date, days, reason, manager_id } = req.body;
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
      .query(`
        INSERT INTO leaves (user_id, manager_id, leave_type, start_date, end_date, days, reason, status, manager_status, hr_status, created_at)
        OUTPUT INSERTED.*
        VALUES (@user_id, @manager_id, @leave_type, @start_date, @end_date, @days, @reason, 'Pending', 'Pending', 'Pending', GETDATE())
      `);

    // Send email notification to manager
    if (manager_id) {
      try {
        const managerResult = await pool.request()
          .input('manager_id', sql.Int, manager_id)
          .query('SELECT email, full_name FROM profiles WHERE id = @manager_id');
        
        const userResult = await pool.request()
          .input('user_id', sql.Int, req.user.id)
          .query('SELECT email, full_name FROM profiles WHERE id = @user_id');

        if (managerResult.recordset.length > 0 && userResult.recordset.length > 0) {
          const manager = managerResult.recordset[0];
          const employee = userResult.recordset[0];
          
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_SERVER,
            port: 587,
            secure: false,
            auth: {
              user: process.env.GMAIL_USER,
              pass: process.env.GMAIL_APP_PASSWORD
            }
          });

          await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: manager.email,
            subject: 'New Leave Request Requires Your Approval',
            html: `
              <h2>New Leave Request</h2>
              <p><strong>${employee.full_name}</strong> has applied for leave and requires your approval.</p>
              <p><strong>Leave Type:</strong> ${leave_type}</p>
              <p><strong>Duration:</strong> ${start_date} to ${end_date} (${days} days)</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <p>Please log in to the system to review and approve/reject this request.</p>
            `
          });
        }
      } catch (emailErr) {
        console.error('Failed to send email notification:', emailErr);
      }
    }

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('Create leave error:', err);
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
        .query('SELECT email, full_name FROM profiles WHERE id = @user_id');
      
      const approverResult = await pool.request()
        .input('approver_id', sql.Int, req.user.id)
        .query('SELECT email, full_name FROM profiles WHERE id = @approver_id');

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
              JOIN user_roles ur ON p.id = ur.user_id
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
      console.error('Failed to send email notification:', emailErr);
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
    console.error('Update leave error:', err);
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
    console.error('Get leave balances error:', err);
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
    console.error('Add comment error:', err);
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
        JOIN profiles u ON lc.user_id = u.id
        WHERE lc.leave_id = @leave_id
        ORDER BY lc.created_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

module.exports = router;
