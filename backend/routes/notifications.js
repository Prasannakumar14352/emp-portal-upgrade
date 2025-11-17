const express = require('express');
const nodemailer = require('nodemailer');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
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
