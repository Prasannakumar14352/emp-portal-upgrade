const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const { shouldSendEmail } = require('../utils/emailHelper');

const router = express.Router();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// GET /api/payslips/user/:userId - Get user's payslips
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);
    const { year, month } = req.query;
    
    // Users can only view their own payslips unless HR/manager
    if (parseInt(req.user.id) !== userIdInt && !['hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const pool = await getConnection();
    let query = `
      SELECT 
        id, employee_id, month, year, basic_salary, allowances, 
        deductions, net_salary, file_url, created_at
      FROM payslips
      WHERE employee_id = @employee_id
    `;
    
    const request = pool.request().input('employee_id', sql.Int, userIdInt);
    
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
        p.id, p.employee_id, p.month, p.year, p.basic_salary, 
        p.allowances, p.deductions, p.net_salary, p.file_url, p.created_at,
        u.full_name as user_name, u.email as user_email
      FROM payslips p
      JOIN profiles u ON p.employee_id = u.employee_id
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
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          p.id, p.employee_id, p.month, p.year, p.basic_salary, 
          p.allowances, p.deductions, p.net_salary, p.file_url, p.created_at,
          u.full_name as user_name, u.email as user_email
        FROM payslips p
        JOIN profiles u ON p.employee_id = u.employee_id
        WHERE p.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    const payslip = result.recordset[0];
    
    // Users can only view their own payslips unless HR/manager
    if (req.user.id !== payslip.employee_id && !['hr', 'manager'].includes(req.user.role)) {
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
    const { employee_id, month, year, basic_salary, allowances, deductions, file_url } = req.body;
    
    // Calculate net salary
    const net_salary = parseFloat(basic_salary) + parseFloat(allowances || 0) - parseFloat(deductions || 0);
    
    const pool = await getConnection();
    const result = await pool.request()
      .input('employee_id', sql.Int, employee_id)
      .input('month', sql.NVarChar, month)
      .input('year', sql.Int, year)
      .input('basic_salary', sql.Decimal(10, 2), basic_salary)
      .input('allowances', sql.Decimal(10, 2), allowances || 0)
      .input('deductions', sql.Decimal(10, 2), deductions || 0)
      .input('net_salary', sql.Decimal(10, 2), net_salary)
      .input('file_url', sql.NVarChar, file_url)
      .query(`
        INSERT INTO payslips (employee_id, month, year, basic_salary, allowances, deductions, net_salary, file_url, created_at)
        OUTPUT INSERTED.*
        VALUES (@employee_id, @month, @year, @basic_salary, @allowances, @deductions, @net_salary, @file_url, GETDATE())
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
      .input('id', sql.Int, id)
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
      .input('id', sql.Int, id)
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
      .input('id', sql.Int, id)
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

// GET /api/payslips/notifications - Get all payslip notifications (HR only)
router.get('/notifications', authenticateToken, authorizeRole('hr'), async (req, res) => {
  try {
    const { status } = req.query;
    const pool = await getConnection();
    
    let query = `
      SELECT 
        n.id, n.employee_id, n.payslip_id, n.month, n.year, n.email,
        n.status, n.error_message, n.sent_at, n.created_at, n.updated_at,
        p.full_name as employee_name
      FROM payslip_notifications n
      LEFT JOIN profiles p ON n.employee_id = p.id
    `;
    
    const request = pool.request();
    
    if (status) {
      query += ' WHERE n.status = @status';
      request.input('status', sql.NVarChar, status);
    }
    
    query += ' ORDER BY n.created_at DESC';
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// GET /api/payslips/notifications/statistics - Get notification statistics (HR only)
router.get('/notifications/statistics', authenticateToken, authorizeRole('hr'), async (req, res) => {
  try {
    const pool = await getConnection();
    
    const result = await pool.request().query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM payslip_notifications
    `);
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Get notification statistics error:', err);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// POST /api/payslips/notify - Send payslip notification email (HR only)
router.post('/notify', authenticateToken, authorizeRole('hr'), async (req, res) => {
  try {
    const { employeeIds, month, year, payslipId } = req.body;
    
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ error: 'Employee IDs are required' });
    }
    
    const pool = await getConnection();
    const sentEmails = [];
    const failedEmails = [];
    
    for (const employeeId of employeeIds) {
      let notificationId = null;
      try {
        // Check if user has email notifications enabled
        const shouldSend = await shouldSendEmail(employeeId);
        
        if (!shouldSend) {
          console.log(`Skipping email for employee ${employeeId} - notifications disabled`);
          continue;
        }
        
        // Get employee details from SQL Server
        const result = await pool.request()
          .input('employee_id', sql.Int, employeeId)
          .query('SELECT id, full_name, email FROM profiles WHERE employee_id = @employee_id');
        
        if (result.recordset.length === 0) {
          failedEmails.push({ employeeId, reason: 'Employee not found' });
          continue;
        }
        
        const employee = result.recordset[0];
        
        // Create notification record in SQL Server
        try {
          const notifResult = await pool.request()
            .input('employee_id', sql.VarChar, employee.id)
            .input('payslip_id', sql.Int, payslipId)
            .input('month', sql.NVarChar, month)
            .input('year', sql.Int, parseInt(year))
            .input('email', sql.NVarChar, employee.email)
            .input('status', sql.NVarChar, 'pending')
            .query(`
              INSERT INTO payslip_notifications (id, employee_id, payslip_id, month, year, email, status, created_at, updated_at)
              OUTPUT INSERTED.id
              VALUES (NEWID(), @employee_id, @payslip_id, @month, @year, @email, @status, GETDATE(), GETDATE())
            `);
          
          notificationId = notifResult.recordset[0].id;
        } catch (notifError) {
          console.error('Failed to create notification record:', notifError);
        }
        
        // Send email
        await transporter.sendMail({
          from: `"HR Team" <${process.env.GMAIL_USER}>`,
          to: employee.email,
          subject: `Payslip Available - ${month} ${year}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">New Payslip Available</h2>
              <p>Dear ${employee.full_name},</p>
              <p>Your payslip for <strong>${month} ${year}</strong> is now available in the employee portal.</p>
              <p>Please log in to view and download your payslip:</p>
              <div style="margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/payslips" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Payslip
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                If you have any questions about your payslip, please contact HR.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          `
        });
        
        // Update notification status to sent
        if (notificationId) {
          await pool.request()
            .input('id', sql.VarChar, notificationId)
            .input('sent_at', sql.DateTime2, new Date())
            .query(`
              UPDATE payslip_notifications
              SET status = 'sent', sent_at = @sent_at, updated_at = GETDATE()
              WHERE id = @id
            `);
        }
        
        sentEmails.push({ employeeId, email: employee.email });
        console.log(`Payslip notification sent to ${employee.email}`);
        
      } catch (emailError) {
        console.error(`Failed to send email to employee ${employeeId}:`, emailError);
        
        // Update notification status to failed
        if (notificationId) {
          await pool.request()
            .input('id', sql.VarChar, notificationId)
            .input('error_message', sql.NVarChar, emailError.message)
            .query(`
              UPDATE payslip_notifications
              SET status = 'failed', error_message = @error_message, updated_at = GETDATE()
              WHERE id = @id
            `);
        }
        
        failedEmails.push({ employeeId, reason: emailError.message });
      }
    }
    
    res.json({
      success: true,
      sent: sentEmails.length,
      failed: failedEmails.length,
      details: { sentEmails, failedEmails }
    });
    
  } catch (err) {
    console.error('Send payslip notification error:', err);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

// POST /api/payslips/retry-notification - Retry failed notification (HR only)
router.post('/retry-notification/:notificationId', authenticateToken, authorizeRole('hr'), async (req, res) => {
  try {
    const { notificationId } = req.params;
    const pool = await getConnection();
    
    // Get notification details from SQL Server
    const notifResult = await pool.request()
      .input('id', sql.VarChar, notificationId)
      .query('SELECT * FROM payslip_notifications WHERE id = @id');
    
    if (notifResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    const notification = notifResult.recordset[0];
    
    try {
      // Check if user has email notifications enabled
      const shouldSend = await shouldSendEmail(notification.employee_id);
      
      if (!shouldSend) {
        return res.status(400).json({ error: 'Email notifications disabled for this employee' });
      }
      
      // Get employee details from SQL Server
      const result = await pool.request()
        .input('employee_id', sql.VarChar, notification.employee_id)
        .query('SELECT full_name, email FROM profiles WHERE id = @employee_id');
      
      if (result.recordset.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      const employee = result.recordset[0];
      
      // Send email
      await transporter.sendMail({
        from: `"HR Team" <${process.env.GMAIL_USER}>`,
        to: employee.email,
        subject: `Payslip Available - ${notification.month} ${notification.year}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Payslip Available</h2>
            <p>Dear ${employee.full_name},</p>
            <p>Your payslip for <strong>${notification.month} ${notification.year}</strong> is now available in the employee portal.</p>
            <p>Please log in to view and download your payslip:</p>
            <div style="margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/payslips" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                View Payslip
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If you have any questions about your payslip, please contact HR.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        `
      });
      
      // Update notification status in SQL Server
      await pool.request()
        .input('id', sql.VarChar, notificationId)
        .input('sent_at', sql.DateTime2, new Date())
        .query(`
          UPDATE payslip_notifications
          SET status = 'sent', sent_at = @sent_at, error_message = NULL, updated_at = GETDATE()
          WHERE id = @id
        `);
      
      res.json({ success: true, message: 'Email sent successfully' });
      
    } catch (emailError) {
      console.error('Failed to retry email:', emailError);
      
      // Update notification with error
      await pool.request()
        .input('id', sql.VarChar, notificationId)
        .input('error_message', sql.NVarChar, emailError.message)
        .query(`
          UPDATE payslip_notifications
          SET status = 'failed', error_message = @error_message, updated_at = GETDATE()
          WHERE id = @id
        `);
      
      res.status(500).json({ error: emailError.message });
    }
    
  } catch (err) {
    console.error('Retry notification error:', err);
    res.status(500).json({ error: 'Failed to retry notification' });
  }
});

module.exports = router;
