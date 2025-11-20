const { getConnection, sql } = require('../config/database');

/**
 * Check if user has email notifications enabled
 * @param {number} userId - The user ID to check
 * @returns {Promise<boolean>} - True if email notifications are enabled
 */
async function shouldSendEmail(userId) {
  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('employee_id', sql.Int, userId)
      .query('SELECT email_notifications FROM user_preferences WHERE employee_id = @employee_id');
    
    // If no preferences found, default to true (send email)
    if (result.recordset.length === 0) {
      return true;
    }
    
    return result.recordset[0].email_notifications === true || result.recordset[0].email_notifications === 1;
  } catch (error) {
    console.error('Error checking email preferences:', error);
    // On error, default to sending email to avoid missing important notifications
    return true;
  }
}

/**
 * Check if user has leave update notifications enabled
 * @param {number} userId - The user ID to check
 * @returns {Promise<boolean>} - True if leave update notifications are enabled
 */
async function shouldSendLeaveNotification(userId) {
  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('employee_id', sql.Int, userId)
      .query('SELECT leave_update_notifications, email_notifications FROM user_preferences WHERE employee_id = @employee_id');
    
    // If no preferences found, default to true
    if (result.recordset.length === 0) {
      return true;
    }
    
    const prefs = result.recordset[0];
    // Both email_notifications and leave_update_notifications must be enabled
    return (prefs.email_notifications === true || prefs.email_notifications === 1) &&
           (prefs.leave_update_notifications === true || prefs.leave_update_notifications === 1);
  } catch (error) {
    console.error('Error checking leave notification preferences:', error);
    // On error, default to sending email
    return true;
  }
}

/**
 * Filter email recipients based on their preferences
 * @param {Array<{employee_id: number, email: string}>} recipients - Array of recipient objects
 * @returns {Promise<Array<string>>} - Array of email addresses that should receive emails
 */
async function filterEmailRecipients(recipients) {
  const filteredEmails = [];
  
  for (const recipient of recipients) {
    const shouldSend = await shouldSendEmail(recipient.employee_id);
    if (shouldSend) {
      filteredEmails.push(recipient.email);
    } else {
      console.log(`Skipping email to ${recipient.email} (employee_id: ${recipient.employee_id}) - email notifications disabled`);
    }
  }
  
  return filteredEmails;
}

module.exports = {
  shouldSendEmail,
  shouldSendLeaveNotification,
  filterEmailRecipients
};
