const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logError } = require('../utils/logger');
const { shouldSendLeaveNotification, filterEmailRecipients } = require('../utils/emailHelper');
const nodemailer = require('nodemailer');

const router = express.Router();

// POST /api/leaves/bulk-action - Bulk approve/reject leave requests (HR/Manager only)
router.post('/bulk-action', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { leaveIds, action, comments } = req.body;

    if (!leaveIds || !Array.isArray(leaveIds) || leaveIds.length === 0) {
      return res.status(400).json({ error: 'Leave IDs array is required' });
    }

    if (!['Approved', 'Rejected'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be Approved or Rejected' });
    }

    if (!comments || comments.trim().length < 5) {
      return res.status(400).json({ error: 'Comment is required (minimum 5 characters)' });
    }

    const pool = await getConnection();
    
    // Fetch user roles from database
    const rolesResult = await pool.request()
      .input('employee_id', sql.Int, req.user.id)
      .query('SELECT role FROM user_roles WHERE employee_id = @employee_id');
    
    const userRoles = rolesResult.recordset.map(r => r.role);
    const isManager = userRoles.includes('manager');
    const isHR = userRoles.includes('hr');

    const processedLeaves = [];
    const failedLeaves = [];

    // Process each leave request
    for (const leaveId of leaveIds) {
      try {
        // Get current leave request
        const leaveResult = await pool.request()
          .input('leave_id', sql.Int, leaveId)
          .query('SELECT * FROM leaves WHERE id = @leave_id');
        
        if (leaveResult.recordset.length === 0) {
          failedLeaves.push({ leaveId, reason: 'Leave request not found' });
          continue;
        }

        const leave = leaveResult.recordset[0];

        // Validation: HR can only approve if manager has already approved
        if (isHR && leave.manager_status !== 'Approved') {
          failedLeaves.push({ 
            leaveId, 
            reason: 'Manager approval required first' 
          });
          continue;
        }

        // Update leave status based on role
        if (isManager) {
          await pool.request()
            .input('leave_id', sql.Int, leaveId)
            .input('status', sql.NVarChar, action)
            .input('approved_by', sql.Int, req.user.id)
            .input('comments', sql.NVarChar, comments)
            .query(`
              UPDATE leaves
              SET manager_status = @status,
                  manager_approved_by = @approved_by,
                  manager_approved_at = GETDATE(),
                  manager_comments = @comments,
                  status = CASE WHEN @status = 'Rejected' THEN 'Rejected' ELSE 'Pending' END,
                  updated_at = GETDATE()
              WHERE id = @leave_id
            `);
        } else if (isHR) {
          await pool.request()
            .input('leave_id', sql.Int, leaveId)
            .input('status', sql.NVarChar, action)
            .input('approved_by', sql.Int, req.user.id)
            .input('comments', sql.NVarChar, comments)
            .query(`
              UPDATE leaves
              SET hr_status = @status,
                  hr_approved_by = @approved_by,
                  hr_approved_at = GETDATE(),
                  hr_comments = @comments,
                  status = @status,
                  approved_by = @approved_by,
                  updated_at = GETDATE()
              WHERE id = @leave_id
            `);
        }

        // Fetch the updated leave record
        const updatedResult = await pool.request()
          .input('leave_id', sql.Int, leaveId)
          .query('SELECT * FROM leaves WHERE id = @leave_id');
        
        const updatedLeave = updatedResult.recordset[0];
        processedLeaves.push(updatedLeave);

        // Send notifications for this leave (reusing notification logic)
        try {
          // Check user preferences
          const prefsResult = await pool.request()
            .input('employee_id', sql.Int, updatedLeave.employee_id)
            .query('SELECT leave_update_notifications FROM user_preferences WHERE employee_id = @employee_id');
          
          const shouldNotify = prefsResult.recordset.length === 0 || prefsResult.recordset[0].leave_update_notifications !== false;

          if (shouldNotify) {
            // Emit real-time notification to employee
            const io = req.app.get('io');
            if (io) {
              io.to(`user-${updatedLeave.employee_id}`).emit('leaveStatusUpdate', {
                leaveId: updatedLeave.id,
                status: isManager && action === 'Approved' ? 'Pending' : updatedLeave.status,
                approver: req.user.full_name || 'Manager/HR',
                comments: comments,
                timestamp: new Date().toISOString()
              });
            }
          }

          // Create notification in database
          const userResult = await pool.request()
            .input('employee_id', sql.Int, updatedLeave.employee_id)
            .query('SELECT full_name FROM profiles WHERE employee_id = @employee_id');
          
          const employeeName = userResult.recordset[0]?.full_name || 'Employee';
          
          let notificationTitle, notificationMessage;
          if (isManager && action === 'Approved') {
            notificationTitle = 'Leave Approved by Manager';
            notificationMessage = `Your ${updatedLeave.leave_type} leave request has been approved by your manager and is now awaiting HR approval`;
          } else if (action === 'Approved') {
            notificationTitle = 'Leave Request Approved';
            notificationMessage = `Your ${updatedLeave.leave_type} leave request has been fully approved`;
          } else {
            notificationTitle = 'Leave Request Rejected';
            notificationMessage = `Your ${updatedLeave.leave_type} leave request has been rejected`;
          }

          await pool.request()
            .input('employee_id', sql.Int, updatedLeave.employee_id)
            .input('type', sql.NVarChar, action === 'Approved' ? 'leave_approved' : 'leave_rejected')
            .input('title', sql.NVarChar, notificationTitle)
            .input('message', sql.NVarChar, notificationMessage)
            .input('metadata', sql.NVarChar, JSON.stringify({
              leaveId: updatedLeave.id,
              leaveType: updatedLeave.leave_type,
              startDate: updatedLeave.start_date,
              endDate: updatedLeave.end_date,
              days: updatedLeave.days,
              comments: comments
            }))
            .query(`
              INSERT INTO notifications (employee_id, type, title, message, metadata, created_at)
              VALUES (@employee_id, @type, @title, @message, @metadata, GETDATE())
            `);

          // Send email notification
          const shouldSendEmail = await shouldSendLeaveNotification(updatedLeave.employee_id);
          if (shouldSendEmail) {
            const transporter = nodemailer.createTransporter({
              host: process.env.SMTP_HOST,
              port: 587,
              secure: false,
              auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
              }
            });

            await transporter.sendMail({
              from: process.env.GMAIL_USER,
              to: userResult.recordset[0]?.email || updatedLeave.employee_id,
              subject: notificationTitle,
              html: `
                <h2>${notificationTitle}</h2>
                <p>${notificationMessage}</p>
                <p><strong>Leave Type:</strong> ${updatedLeave.leave_type}</p>
                <p><strong>Duration:</strong> ${updatedLeave.start_date} to ${updatedLeave.end_date} (${updatedLeave.days} days)</p>
                <p><strong>Comments:</strong> ${comments}</p>
              `
            });
          }

          // Notify HR if manager approved
          if (isManager && action === 'Approved') {
            const hrResult = await pool.request()
              .query(`
                SELECT p.employee_id, p.email 
                FROM profiles p
                INNER JOIN user_roles ur ON p.employee_id = ur.employee_id
                WHERE ur.role = 'hr'
              `);
            
            for (const hr of hrResult.recordset) {
              await pool.request()
                .input('employee_id', sql.Int, hr.employee_id)
                .input('type', sql.NVarChar, 'leave_pending')
                .input('title', sql.NVarChar, 'Leave Awaiting HR Approval')
                .input('message', sql.NVarChar, `${employeeName}'s ${updatedLeave.leave_type} request has been approved by manager and requires HR approval`)
                .input('metadata', sql.NVarChar, JSON.stringify({
                  leaveId: updatedLeave.id,
                  leaveType: updatedLeave.leave_type,
                  startDate: updatedLeave.start_date,
                  endDate: updatedLeave.end_date,
                  days: updatedLeave.days,
                  employeeName: employeeName
                }))
                .query(`
                  INSERT INTO notifications (employee_id, type, title, message, metadata, created_at)
                  VALUES (@employee_id, @type, @title, @message, @metadata, GETDATE())
                `);

              const io = req.app.get('io');
              if (io) {
                io.to(`user-${hr.employee_id}`).emit('leaveRequestSubmitted', {
                  type: 'leave_pending',
                  title: 'Leave Awaiting HR Approval',
                  message: `${employeeName}'s ${updatedLeave.leave_type} request requires HR approval`,
                  leaveId: updatedLeave.id,
                  timestamp: new Date().toISOString()
                });
              }
            }

            const hrEmails = await filterEmailRecipients(hrResult.recordset);
            if (hrEmails.length > 0) {
              const transporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST,
                port: 587,
                secure: false,
                auth: {
                  user: process.env.GMAIL_USER,
                  pass: process.env.GMAIL_APP_PASSWORD
                }
              });

              await transporter.sendMail({
                from: process.env.GMAIL_USER,
                to: hrEmails.join(', '),
                subject: 'Leave Request Awaiting HR Approval',
                html: `
                  <h2>Leave Awaiting HR Approval</h2>
                  <p><strong>${employeeName}</strong> has a leave request that has been approved by the manager and now requires HR approval.</p>
                  <p><strong>Leave Type:</strong> ${updatedLeave.leave_type}</p>
                  <p><strong>Duration:</strong> ${updatedLeave.start_date} to ${updatedLeave.end_date} (${updatedLeave.days} days)</p>
                  <p><strong>Manager Comments:</strong> ${comments}</p>
                  <p>Please log in to the system to review and approve/reject this request.</p>
                `
              });
            }
          }
        } catch (notifErr) {
          console.error(`Notification error for leave ${leaveId}:`, notifErr);
          logError(notifErr, req, { context: 'Bulk action notification error', leaveId });
        }
      } catch (err) {
        console.error(`Error processing leave ${leaveId}:`, err);
        failedLeaves.push({ leaveId, reason: err.message });
      }
    }

    res.json({
      success: true,
      processed: processedLeaves.length,
      failed: failedLeaves.length,
      failedLeaves: failedLeaves
    });
  } catch (err) {
    console.error('Bulk action error:', err);
    logError(err, req, { context: 'Bulk action error', data: req.body });
    res.status(500).json({ error: 'Failed to process bulk action' });
  }
});

// GET /api/leaves/conflicts - Check for leave conflicts
router.get('/conflicts', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, employee_id } = req.query;
    const pool = await getConnection();

    const result = await pool.request()
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date)
      .input('employee_id', sql.Int, employee_id ? parseInt(employee_id) : null)
      .query(`
        SELECT 
          l.id, l.employee_id, l.leave_type, l.start_date, l.end_date, l.days,
          u.full_name, u.department
        FROM leaves l
        JOIN profiles u ON l.employee_id = u.employee_id
        WHERE l.status IN ('Pending', 'Approved')
          AND (@employee_id IS NULL OR l.employee_id != @employee_id)
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
    console.error('Check conflicts error:', err);
    logError(err, req, { context: 'Check conflicts error' });
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});

// GET /api/leaves/user/:userId - Get user's leave requests
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);
    const pool = await getConnection();
    
    // Check if user has HR or manager role
    const rolesResult = await pool.request()
      .input('employee_id', sql.Int, req.user.id)
      .query('SELECT role FROM user_roles WHERE employee_id = @employee_id');
    
    const userRoles = rolesResult.recordset.map(r => r.role);
    const isHROrManager = userRoles.includes('hr') || userRoles.includes('manager');
    
    // Users can only view their own leaves unless HR/manager
    if (parseInt(req.user.id) !== userIdInt && !isHROrManager) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.request()
      .input('employee_id', sql.Int, userIdInt)
      .query(`
        SELECT 
          *
        FROM leaves l
        WHERE l.employee_id = @employee_id
        ORDER BY l.created_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get user leaves error:', err);
    logError(err, req, { context: 'Get user leaves error', userId: req.params.userId });
    res.status(500).json({ error: 'Failed to get leaves' });
  }
});

// GET /api/leaves - Get all leave requests (HR/Manager only)
router.get('/', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { status } = req.query;
    const pool = await getConnection();
    
    // Fetch user roles from database
    const rolesResult = await pool.request()
      .input('employee_id', sql.Int, req.user.id)
      .query('SELECT role FROM user_roles WHERE employee_id = @employee_id');
    
    const userRoles = rolesResult.recordset.map(r => r.role);
    const isManager = userRoles.includes('manager');
    const isHR = userRoles.includes('hr');

    let query = `
      SELECT 
        l.id, l.employee_id, l.leave_type, l.start_date, l.end_date,
        l.days, l.reason, l.status, l.manager_status, l.hr_status,
        l.approved_by, l.manager_approved_by, l.hr_approved_by,
        l.manager_comments, l.hr_comments,
        l.created_at, l.updated_at,
        u.full_name as user_name, u.email as user_email
      FROM leaves l
      JOIN profiles u ON l.employee_id = u.employee_id
    `;

    const conditions = [];
    
    // Filter based on role and two-tier approval workflow
    if (isManager) {
      // Managers see leaves that need their approval
      conditions.push('l.manager_status = @manager_pending_status');
    } else if (isHR) {
      // HR sees leaves that manager has already approved and need HR approval
      conditions.push('l.manager_status = @manager_approved_status');
      conditions.push('l.hr_status = @hr_pending_status');
    }
    
    // Apply status filter if provided
    if (status) {
      conditions.push('l.status = @status');
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY l.created_at DESC';

    const request = pool.request();
    
    if (isManager) {
      request.input('manager_pending_status', sql.NVarChar, 'Pending');
    } else if (isHR) {
      request.input('manager_approved_status', sql.NVarChar, 'Approved');
      request.input('hr_pending_status', sql.NVarChar, 'Pending');
    }
    
    if (status) {
      request.input('status', sql.NVarChar, status);
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get leaves error:', err);
    logError(err, req, { context: 'Get leaves error', status });
    res.status(500).json({ error: 'Failed to get leaves' });
  }
});

// POST /api/leaves - Create new leave request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { leave_type, start_date, end_date, days, reason, manager_id, cc_emails } = req.body;
    const pool = await getConnection();

    const insertResult = await pool.request()
      .input('employee_id', sql.Int, req.user.id)
      .input('manager_id', sql.Int, manager_id || null)
      .input('leave_type', sql.NVarChar, leave_type)
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date)
      .input('days', sql.Int, days)
      .input('reason', sql.NVarChar, reason)
      .input('cc_emails', sql.NVarChar, cc_emails ? JSON.stringify(cc_emails) : null)
      .query(`
        INSERT INTO leaves (employee_id, manager_id, leave_type, start_date, end_date, days, reason, cc_emails, status, manager_status, hr_status, created_at)
        VALUES (@employee_id, @manager_id, @leave_type, @start_date, @end_date, @days, @reason, @cc_emails, 'Pending', 'Pending', 'Pending', GETDATE());
        SELECT * FROM leaves WHERE id = SCOPE_IDENTITY();
      `);

    const result = { recordset: insertResult.recordset };

    // Send email notifications
    try {
      const userResult = await pool.request()
        .input('employee_id', sql.Int, req.user.id)
        .query('SELECT email, full_name FROM profiles WHERE employee_id = @employee_id');

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

        // Collect all recipients with employee_id for preference checking
        const recipients = [];

        // Add manager email
        if (manager_id) {
          const managerResult = await pool.request()
            .input('manager_id', sql.Int, manager_id)
            .query('SELECT employee_id, email, full_name FROM profiles WHERE employee_id = @manager_id');
          
          if (managerResult.recordset.length > 0) {
            recipients.push({
              employee_id: managerResult.recordset[0].employee_id,
              email: managerResult.recordset[0].email
            });
          }
        }

        // Add all HR users
        const hrResult = await pool.request()
          .query(`
            SELECT p.employee_id, p.email 
            FROM profiles p
            INNER JOIN user_roles ur ON p.employee_id = ur.employee_id
            WHERE ur.role = 'hr'
          `);
        
        hrResult.recordset.forEach(hr => {
          if (!recipients.find(r => r.email === hr.email)) {
            recipients.push({
              employee_id: hr.employee_id,
              email: hr.email
            });
          }
        });

        // Filter recipients based on their email preferences
        const filteredEmails = await filterEmailRecipients(recipients);

        // Send to all recipients who have notifications enabled
        if (filteredEmails.length > 0) {
          const emailOptions = {
            from: process.env.GMAIL_USER,
            to: filteredEmails.join(', '),
            subject: emailSubject,
            html: emailHtml
          };

          // Add CC recipients if provided
          if (cc_emails && Array.isArray(cc_emails) && cc_emails.length > 0) {
            emailOptions.cc = cc_emails.join(', ');
          }

          await transporter.sendMail(emailOptions);
          console.log('Leave notification sent to:', filteredEmails.join(', '));
          if (cc_emails && cc_emails.length > 0) {
            console.log('CC sent to:', cc_emails.join(', '));
          }
        }
      }
    } catch (emailErr) {
      console.error('Send email error:', emailErr);
      logError(emailErr, req, { context: 'Failed to send email notification' });
    }

    // Create notifications in database for HR and managers
    try {
      const userResult = await pool.request()
        .input('employee_id', sql.Int, req.user.id)
        .query('SELECT full_name FROM profiles WHERE employee_id = @employee_id');
      
      const employeeName = userResult.recordset[0]?.full_name || 'Employee';
      
      // Create notification for manager if assigned
      if (manager_id) {
        await pool.request()
          .input('employee_id', sql.Int, manager_id)
          .input('type', sql.NVarChar, 'leave_pending')
          .input('title', sql.NVarChar, 'New Leave Request')
          .input('message', sql.NVarChar, `${employeeName} has submitted a ${leave_type} request for ${days} days`)
          .input('metadata', sql.NVarChar, JSON.stringify({
            leaveId: result.recordset[0].id,
            leaveType: leave_type,
            startDate: start_date,
            endDate: end_date,
            days: days,
            employeeName: employeeName
          }))
          .query(`
            INSERT INTO notifications (employee_id, type, title, message, metadata, created_at)
            VALUES (@employee_id, @type, @title, @message, @metadata, GETDATE())
          `);
      }

      // Create notifications for all HR users
      const hrResult = await pool.request()
        .query(`
          SELECT p.employee_id 
          FROM profiles p
          INNER JOIN user_roles ur ON p.employee_id = ur.employee_id
          WHERE ur.role = 'hr'
        `);
      
      for (const hr of hrResult.recordset) {
        await pool.request()
          .input('employee_id', sql.Int, hr.employee_id)
          .input('type', sql.NVarChar, 'leave_pending')
          .input('title', sql.NVarChar, 'New Leave Request')
          .input('message', sql.NVarChar, `${employeeName} has submitted a ${leave_type} request for ${days} days`)
          .input('metadata', sql.NVarChar, JSON.stringify({
            leaveId: result.recordset[0].id,
            leaveType: leave_type,
            startDate: start_date,
            endDate: end_date,
            days: days,
            employeeName: employeeName
          }))
          .query(`
            INSERT INTO notifications (employee_id, type, title, message, metadata, created_at)
            VALUES (@employee_id, @type, @title, @message, @metadata, GETDATE())
          `);
      }

      // Emit real-time Socket.IO notifications
      const io = req.app.get('io');
      if (io) {
        const notificationData = {
          type: 'leave_pending',
          title: 'New Leave Request',
          message: `${employeeName} has submitted a ${leave_type} request for ${days} days`,
          leaveId: result.recordset[0].id,
          leaveType: leave_type,
          startDate: start_date,
          endDate: end_date,
          days: days,
          employeeName: employeeName,
          timestamp: new Date().toISOString()
        };

        // Emit to manager
        if (manager_id) {
          io.to(`user-${manager_id}`).emit('leaveRequestSubmitted', notificationData);
        }

        // Emit to all HR users
        hrResult.recordset.forEach(hr => {
          io.to(`user-${hr.employee_id}`).emit('leaveRequestSubmitted', notificationData);
        });
      }

      console.log('Notifications created for new leave request');
    } catch (notifErr) {
      console.error('Create notification error:', notifErr);
      logError(notifErr, req, { context: 'Failed to create notifications' });
    }

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('Create leave error:', err);
    logError(err, req, { context: 'Create leave error', data: req.body });
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

// PATCH /api/leaves/:leaveId - Update leave status (Two-tier approval)
router.patch('/:leaveId', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, comments } = req.body;

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
    
    // Fetch user roles from database
    const rolesResult = await pool.request()
      .input('employee_id', sql.Int, req.user.id)
      .query('SELECT role FROM user_roles WHERE employee_id = @employee_id');
    
    const userRoles = rolesResult.recordset.map(r => r.role);
    const isManager = userRoles.includes('manager');
    const isHR = userRoles.includes('hr');

    // Validation: HR can only approve if manager has already approved
    if (isHR && leave.manager_status !== 'Approved') {
      return res.status(400).json({ 
        error: 'Cannot approve/reject this leave request',
        message: 'This leave request must be approved by the manager first before HR can take action.'
      });
    }

    if (isManager) {
      // Manager approval/rejection
      await pool.request()
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
          WHERE id = @leave_id
        `);
    } else if (isHR) {
      // HR approval/rejection
      await pool.request()
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
          WHERE id = @leave_id
        `);
    }

    // Fetch the updated leave record
    const updatedResult = await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .query('SELECT * FROM leaves WHERE id = @leave_id');
    
    const updatedLeave = updatedResult.recordset[0];

    // Check user preferences and emit real-time notification if enabled
    const prefsResult = await pool.request()
      .input('employee_id', sql.Int, updatedLeave.employee_id)
      .query('SELECT leave_update_notifications FROM user_preferences WHERE employee_id = @employee_id');
    
    const shouldNotify = prefsResult.recordset.length === 0 || prefsResult.recordset[0].leave_update_notifications !== false;

    if (shouldNotify) {
      // Emit real-time notification to employee
      const io = req.app.get('io');
      if (io) {
        io.to(`user-${updatedLeave.employee_id}`).emit('leaveStatusUpdate', {
          leaveId: updatedLeave.id,
          status: isManager && status === 'Approved' ? 'Pending' : updatedLeave.status,
          leaveType: updatedLeave.leave_type,
          approvedBy: isManager ? 'Manager' : 'HR',
          comments: comments || '',
          message: isManager && status === 'Approved'
            ? `Your ${updatedLeave.leave_type} request has been approved by your manager. It now awaits HR approval.`
            : `Your ${updatedLeave.leave_type} request has been ${status.toLowerCase()} by ${isManager ? 'your manager' : 'HR'}`,
          timestamp: new Date().toISOString(),
          awaitingHR: isManager && status === 'Approved'
        });
      }

      // Insert notification into database
      await pool.request()
        .input('employee_id', sql.Int, updatedLeave.employee_id)
        .input('type', sql.NVarChar, isManager && status === 'Approved' ? 'leave_pending' : status === 'Approved' ? 'leave_approved' : 'leave_rejected')
        .input('title', sql.NVarChar, isManager && status === 'Approved' ? 'Leave Approved by Manager' : `Leave Request ${status}`)
        .input('message', sql.NVarChar, isManager && status === 'Approved' 
          ? `Your ${updatedLeave.leave_type} request has been approved by your manager. It now awaits HR approval.`
          : `Your ${updatedLeave.leave_type} request has been ${status.toLowerCase()} by ${isManager ? 'your manager' : 'HR'}`
        )
        .input('metadata', sql.NVarChar, JSON.stringify({
          leaveId: updatedLeave.id,
          leaveType: updatedLeave.leave_type,
          approvedBy: isManager ? 'Manager' : 'HR',
          comments: comments || '',
          awaitingHR: isManager && status === 'Approved'
        }))
        .query(`
          INSERT INTO notifications (employee_id, type, title, message, metadata, created_at)
          VALUES (@employee_id, @type, @title, @message, @metadata, GETDATE())
        `);
    }

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
        .input('employee_id', sql.Int, updatedLeave.employee_id)
        .query('SELECT email, full_name FROM profiles WHERE employee_id = @employee_id');
      
      const approverResult = await pool.request()
        .input('approver_id', sql.Int, req.user.id)
        .query('SELECT email, full_name FROM profiles WHERE employee_id = @approver_id');

      if (employeeResult.recordset.length > 0 && approverResult.recordset.length > 0) {
        const employee = employeeResult.recordset[0];
        const approver = approverResult.recordset[0];
        
        // Check if employee wants to receive leave notifications
        const shouldNotifyEmployee = await shouldSendLeaveNotification(updatedLeave.employee_id);
        
        // Notify employee if they have notifications enabled
        if (shouldNotifyEmployee) {
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
        } else {
          console.log(`Skipping leave notification email to ${employee.email} - notifications disabled`);
        }

        // If manager approved, notify HR (always notify HR regardless of preferences)
        if (isManager && status === 'Approved') {
          const hrResult = await pool.request()
            .query(`
              SELECT p.email, p.full_name, p.employee_id
              FROM profiles p
              JOIN user_roles ur ON p.employee_id = ur.employee_id
              WHERE ur.role = 'hr'
            `);
          
          if (hrResult.recordset.length > 0) {
            // Send email notifications to HR
            const hrWithPrefs = hrResult.recordset.map(hr => ({
              employee_id: hr.employee_id,
              email: hr.email
            }));
            const hrEmails = await filterEmailRecipients(hrWithPrefs);
            
            if (hrEmails.length > 0) {
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
            
            // Send real-time notifications to HR users
            const io = req.app.get('io');
            for (const hr of hrResult.recordset) {
              // Insert notification into database
              await pool.request()
                .input('employee_id', sql.Int, hr.employee_id)
                .input('type', sql.NVarChar, 'leave_pending')
                .input('title', sql.NVarChar, 'Leave Request Requires HR Approval')
                .input('message', sql.NVarChar, `${employee.full_name}'s ${updatedLeave.leave_type} request has been approved by manager and awaits your approval`)
                .input('metadata', sql.NVarChar, JSON.stringify({
                  leaveId: updatedLeave.id,
                  leaveType: updatedLeave.leave_type,
                  startDate: updatedLeave.start_date,
                  endDate: updatedLeave.end_date,
                  days: updatedLeave.days,
                  employeeName: employee.full_name
                }))
                .query(`
                  INSERT INTO notifications (employee_id, type, title, message, metadata, created_at)
                  VALUES (@employee_id, @type, @title, @message, @metadata, GETDATE())
                `);
              
              // Emit real-time Socket.IO notification
              if (io) {
                io.to(`user-${hr.employee_id}`).emit('leaveRequestSubmitted', {
                  type: 'leave_pending',
                  title: 'Leave Request Requires HR Approval',
                  message: `${employee.full_name}'s ${updatedLeave.leave_type} request has been approved by manager and awaits your approval`,
                  leaveId: updatedLeave.id,
                  leaveType: updatedLeave.leave_type,
                  startDate: updatedLeave.start_date,
                  endDate: updatedLeave.end_date,
                  days: updatedLeave.days,
                  employeeName: employee.full_name,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        }
      }
    } catch (emailErr) {
      console.error('Send email error:', emailErr);
      logError(emailErr, req, { context: 'Failed to send email notification' });
    }

    // Update leave balance if HR approved
    if (isHR && status === 'Approved') {
      const year = new Date(updatedLeave.start_date).getFullYear();

      await pool.request()
        .input('employee_id', sql.Int, updatedLeave.employee_id)
        .input('year', sql.Int, year)
        .input('leave_type', sql.NVarChar, updatedLeave.leave_type)
        .input('days', sql.Int, updatedLeave.days)
        .query(`
          MERGE leave_balances AS target
          USING (SELECT @employee_id as employee_id, @year as year, @leave_type as leave_type) AS source
          ON target.employee_id = source.employee_id AND target.year = source.year AND target.leave_type = source.leave_type
          WHEN MATCHED THEN
            UPDATE SET 
              used_days = used_days + @days,
              remaining_days = total_days - (used_days + @days),
              updated_at = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (employee_id, year, leave_type, total_days, used_days, remaining_days, created_at)
            VALUES (@employee_id, @year, @leave_type, 20, @days, 20 - @days, GETDATE());
        `);
    }

    res.json(updatedLeave);
  } catch (err) {
    console.error('Update leave error:', err.message);
    logError(err, req, { context: 'Update leave error', leaveId: req.params.leaveId });
    res.status(500).json({ error: 'Failed to update leave status' });
  }
});

// GET /api/leaves/balances/:userId - Get leave balances
router.get('/balances/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);
    const { year } = req.query;
    const pool = await getConnection();
    
    // Check if user has HR or manager role
    const rolesResult = await pool.request()
      .input('employee_id', sql.Int, req.user.id)
      .query('SELECT role FROM user_roles WHERE employee_id = @employee_id');
    
    const userRoles = rolesResult.recordset.map(r => r.role);
    const isHROrManager = userRoles.includes('hr') || userRoles.includes('manager');
    
    if (parseInt(req.user.id) !== userIdInt && !isHROrManager) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const currentYear = year || new Date().getFullYear();

    const result = await pool.request()
      .input('employee_id', sql.Int, userIdInt)
      .input('year', sql.Int, currentYear)
      .query(`
        SELECT 
          id, employee_id, year, leave_type, total_days, 
          used_days, remaining_days, carry_forward_days
        FROM leave_balances
        WHERE employee_id = @employee_id AND year = @year
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get leave balances error:', err);
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
    await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .input('employee_id', sql.Int, req.user.id)
      .input('comment', sql.NVarChar, comment)
      .query(`
        INSERT INTO leave_comments (leave_id, employee_id, comment, created_at)
        VALUES (@leave_id, @employee_id, @comment, GETDATE())
      `);

    // Fetch the inserted comment
    const result = await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .input('employee_id', sql.Int, req.user.id)
      .query(`
        SELECT TOP 1 
          lc.id, lc.leave_id, lc.employee_id, lc.comment, lc.created_at,
          u.full_name as author_name
        FROM leave_comments lc
        JOIN profiles u ON lc.employee_id = u.employee_id
        WHERE lc.leave_id = @leave_id AND lc.employee_id = @employee_id
        ORDER BY lc.created_at DESC
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('Add comment error:', err);
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
          lc.id, lc.leave_id, lc.employee_id, lc.comment, lc.created_at,
          u.full_name as author_name
        FROM leave_comments lc
        JOIN profiles u ON lc.employee_id = u.employee_id
        WHERE lc.leave_id = @leave_id
        ORDER BY lc.created_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get comments error:', err);
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
    
    // Get leave request details
    const leaveResult = await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .query('SELECT * FROM leaves WHERE id = @leave_id');
    
    if (leaveResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const leave = leaveResult.recordset[0];
    
    // Only the employee who created the request can edit it
    if (parseInt(req.user.id) !== leave.employee_id) {
      return res.status(403).json({ error: 'You can only edit your own leave requests' });
    }

    // Only allow editing of pending requests
    if (leave.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending leave requests can be edited' });
    }

    // Update the leave request
    await pool.request()
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
        WHERE id = @leave_id
      `);

    // Fetch the updated leave request
    const result = await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .query('SELECT * FROM leaves WHERE id = @leave_id');

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
        .input('employee_id', sql.Int, leave.employee_id)
        .query('SELECT email, full_name FROM profiles WHERE employee_id = @employee_id');

      if (employeeResult.recordset.length > 0) {
        const employee = employeeResult.recordset[0];

        // Notify manager if there is one
        if (leave.manager_id) {
          const managerResult = await pool.request()
            .input('manager_id', sql.Int, leave.manager_id)
            .query('SELECT email, full_name FROM profiles WHERE employee_id = @manager_id');
          
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
            JOIN user_roles ur ON p.employee_id = ur.employee_id
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
      console.error('Send email error:', emailErr);
      logError(emailErr, req, { context: 'Failed to send edit notification email' });
    }

    res.json(updatedLeave);
  } catch (err) {
    console.error('Edit leave error:', err);
    logError(err, req, { context: 'Edit leave error', leaveId });
    res.status(500).json({ error: 'Failed to edit leave request' });
  }
});

// DELETE /api/leaves/:leaveId - Cancel leave request (Employee only)
router.delete('/:leaveId', authenticateToken, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const pool = await getConnection();
    
    // Get leave request details
    const leaveResult = await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .query('SELECT * FROM leaves WHERE id = @leave_id');
    
    if (leaveResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const leave = leaveResult.recordset[0];
    
    // Only the employee who created the request can cancel it
    if (parseInt(req.user.id) !== leave.employee_id) {
      return res.status(403).json({ error: 'You can only cancel your own leave requests' });
    }

    // Only allow cancellation of pending requests
    if (leave.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending leave requests can be cancelled' });
    }

    // Get employee details
    const employeeResult = await pool.request()
      .input('employee_id', sql.Int, leave.employee_id)
      .query('SELECT email, full_name FROM profiles WHERE employee_id = @employee_id');

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
            .query('SELECT email, full_name FROM profiles WHERE employee_id = @manager_id');
          
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
            JOIN user_roles ur ON p.employee_id = ur.employee_id
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
      console.error('Send email error:', emailErr);
      logError(emailErr, req, { context: 'Failed to send cancellation email notification' });
    }

    res.json({ message: 'Leave request cancelled successfully' });
  } catch (err) {
    console.error('Cancel leave error:', err);
    logError(err, req, { context: 'Cancel leave error', leaveId });
    res.status(500).json({ error: 'Failed to cancel leave request' });
  }
});

module.exports = router;
