const nodemailer = require('nodemailer');

/**
 * Email retry utility with exponential backoff
 */

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || process.env.SMTP_SERVER,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || process.env.GMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
    }
  });
};

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds (default: 1000ms)
 * @param {number} maxDelay - Maximum delay in milliseconds (default: 30000ms)
 * @returns {number} - Delay in milliseconds
 */
const calculateBackoff = (attempt, baseDelay = 1000, maxDelay = 30000) => {
  // Exponential backoff: baseDelay * 2^attempt with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Add random jitter up to 1 second
  return Math.min(exponentialDelay + jitter, maxDelay);
};

/**
 * Send email with retry logic and exponential backoff
 * @param {Object} mailOptions - Nodemailer mail options
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in milliseconds (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in milliseconds (default: 30000)
 * @returns {Promise<Object>} - Email send result or error
 */
const sendEmailWithRetry = async (mailOptions, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000
  } = options;

  const transporter = createTransporter();
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully on attempt ${attempt + 1}:`, result.messageId);
      return { success: true, result, attempts: attempt + 1 };
    } catch (error) {
      lastError = error;
      console.error(`Email send attempt ${attempt + 1} failed:`, error.message);

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const delay = calculateBackoff(attempt, baseDelay, maxDelay);
        console.log(`Retrying in ${Math.round(delay / 1000)} seconds...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  console.error(`Email failed after ${maxRetries + 1} attempts:`, lastError?.message);
  return { 
    success: false, 
    error: lastError, 
    attempts: maxRetries + 1,
    message: lastError?.message || 'Unknown error'
  };
};

/**
 * Send multiple emails with retry logic (processes in parallel with concurrency limit)
 * @param {Array<Object>} emailList - Array of mail options objects
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries per email (default: 3)
 * @param {number} options.concurrency - Number of concurrent emails (default: 5)
 * @returns {Promise<Object>} - Results summary
 */
const sendBulkEmailsWithRetry = async (emailList, options = {}) => {
  const { concurrency = 5, ...retryOptions } = options;
  
  const results = {
    total: emailList.length,
    successful: 0,
    failed: 0,
    details: []
  };

  // Process emails in batches
  for (let i = 0; i < emailList.length; i += concurrency) {
    const batch = emailList.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (mailOptions) => {
        const result = await sendEmailWithRetry(mailOptions, retryOptions);
        return { mailOptions, result };
      })
    );

    for (const { mailOptions, result } of batchResults) {
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }
      results.details.push({
        to: mailOptions.to,
        success: result.success,
        attempts: result.attempts,
        error: result.error?.message
      });
    }
  }

  return results;
};

/**
 * Queue an email for background sending with retry
 * This is useful for fire-and-forget email sending
 * @param {Object} mailOptions - Nodemailer mail options
 * @param {Object} options - Retry options
 */
const queueEmailWithRetry = (mailOptions, options = {}) => {
  // Process in background without blocking
  setImmediate(async () => {
    try {
      const result = await sendEmailWithRetry(mailOptions, options);
      if (!result.success) {
        console.error('Background email failed:', {
          to: mailOptions.to,
          subject: mailOptions.subject,
          error: result.message
        });
      }
    } catch (error) {
      console.error('Background email error:', error.message);
    }
  });
};

module.exports = {
  createTransporter,
  sendEmailWithRetry,
  sendBulkEmailsWithRetry,
  queueEmailWithRetry,
  calculateBackoff
};
