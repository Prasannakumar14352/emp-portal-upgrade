const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { getConnection, sql } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Generate 2FA setup (secret and QR code)
router.post('/setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    logger.api.request('POST', '/api/2fa/setup', { userId });
    const pool = await getConnection();

    // Get user email for QR code
    const userResult = await pool.request()
      .input('employee_id', sql.Int, userId)
      .query('SELECT email, full_name FROM profiles WHERE employee_id = @employee_id');

    if (userResult.recordset.length === 0) {
      logger.warn('2FA setup failed: User not found', { userId });
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.recordset[0];

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `HRMS (${user.email})`,
      issuer: 'HRMS'
    });

    // Generate backup codes (10 codes)
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Store secret (temporarily, not enabled yet)
    await pool.request()
      .input('employee_id', sql.Int, userId)
      .input('secret', sql.NVarChar, secret.base32)
      .input('backup_codes', sql.NVarChar, JSON.stringify(backupCodes))
      .query(`
        UPDATE profiles 
        SET two_factor_secret = @secret,
            two_factor_backup_codes = @backup_codes
        WHERE employee_id = @employee_id
      `);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    logger.process.success('2FA Setup Initialized', { userId, email: user.email });
    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes
    });
  } catch (err) {
    logger.api.error('POST', '/api/2fa/setup', err, { userId: req.user.id });
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// Verify and enable 2FA
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;
    logger.api.request('POST', '/api/2fa/verify', { userId });

    if (!token) {
      logger.warn('2FA verification failed: Token required', { userId });
      return res.status(400).json({ error: 'Token is required' });
    }

    const pool = await getConnection();

    // Get user's secret
    const result = await pool.request()
      .input('employee_id', sql.Int, userId)
      .query('SELECT two_factor_secret FROM profiles WHERE employee_id = @employee_id');

    if (result.recordset.length === 0 || !result.recordset[0].two_factor_secret) {
      logger.warn('2FA verification failed: Not set up', { userId });
      return res.status(400).json({ error: '2FA not set up' });
    }

    const secret = result.recordset[0].two_factor_secret;

    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      logger.warn('2FA verification failed: Invalid token', { userId });
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Enable 2FA
    await pool.request()
      .input('employee_id', sql.Int, userId)
      .query('UPDATE profiles SET two_factor_enabled = 1 WHERE employee_id = @employee_id');

    logger.process.success('2FA Enabled', { userId });
    res.json({ message: '2FA enabled successfully' });
  } catch (err) {
    logger.api.error('POST', '/api/2fa/verify', err, { userId: req.user.id });
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// Disable 2FA
router.post('/disable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, token } = req.body;
    logger.api.request('POST', '/api/2fa/disable', { userId });

    if (!password && !token) {
      logger.warn('2FA disable failed: Password or backup code required', { userId });
      return res.status(400).json({ error: 'Password or backup code required' });
    }

    const pool = await getConnection();

    // Get user data
    const result = await pool.request()
      .input('employee_id', sql.Int, userId)
      .query(`
        SELECT two_factor_secret, two_factor_backup_codes, password_hash 
        FROM profiles 
        WHERE employee_id = @employee_id
      `);

    if (result.recordset.length === 0) {
      logger.warn('2FA disable failed: User not found', { userId });
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.recordset[0];

    // Verify either password or token/backup code
    let verified = false;

    if (token) {
      // Check if it's a backup code
      const backupCodes = JSON.parse(user.two_factor_backup_codes || '[]');
      if (backupCodes.includes(token)) {
        verified = true;
        // Remove used backup code
        const updatedCodes = backupCodes.filter(code => code !== token);
        await pool.request()
          .input('employee_id', sql.Int, userId)
          .input('backup_codes', sql.NVarChar, JSON.stringify(updatedCodes))
          .query('UPDATE profiles SET two_factor_backup_codes = @backup_codes WHERE employee_id = @employee_id');
      } else {
        // Verify TOTP token
        verified = speakeasy.totp.verify({
          secret: user.two_factor_secret,
          encoding: 'base32',
          token,
          window: 2
        });
      }
    }

    if (!verified) {
      logger.warn('2FA disable failed: Invalid credentials', { userId });
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Disable 2FA
    await pool.request()
      .input('employee_id', sql.Int, userId)
      .query(`
        UPDATE profiles 
        SET two_factor_enabled = 0,
            two_factor_secret = NULL,
            two_factor_backup_codes = NULL
        WHERE employee_id = @employee_id
      `);

    logger.process.success('2FA Disabled', { userId });
    res.json({ message: '2FA disabled successfully' });
  } catch (err) {
    logger.api.error('POST', '/api/2fa/disable', err, { userId: req.user.id });
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Verify 2FA during login
router.post('/verify-login', async (req, res) => {
  try {
    const { userId, token } = req.body;
    logger.api.request('POST', '/api/2fa/verify-login', { userId });

    if (!userId || !token) {
      logger.warn('2FA login verification failed: Missing required fields');
      return res.status(400).json({ error: 'User ID and token required' });
    }

    const pool = await getConnection();

    // Get user's secret
    const result = await pool.request()
      .input('employee_id', sql.Int, userId)
      .query(`
        SELECT two_factor_secret, two_factor_backup_codes 
        FROM profiles 
        WHERE employee_id = @employee_id AND two_factor_enabled = 1
      `);

    if (result.recordset.length === 0 || !result.recordset[0].two_factor_secret) {
      logger.warn('2FA login verification failed: Not enabled', { userId });
      return res.status(400).json({ error: '2FA not enabled' });
    }

    const user = result.recordset[0];
    let verified = false;

    // Check if it's a backup code
    const backupCodes = JSON.parse(user.two_factor_backup_codes || '[]');
    if (backupCodes.includes(token)) {
      verified = true;
      // Remove used backup code
      const updatedCodes = backupCodes.filter(code => code !== token);
      await pool.request()
        .input('employee_id', sql.Int, userId)
        .input('backup_codes', sql.NVarChar, JSON.stringify(updatedCodes))
        .query('UPDATE profiles SET two_factor_backup_codes = @backup_codes WHERE employee_id = @employee_id');
    } else {
      // Verify TOTP token
      verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token,
        window: 2
      });
    }

    if (!verified) {
      logger.warn('2FA login verification failed: Invalid token', { userId });
      return res.status(400).json({ error: 'Invalid token' });
    }

    logger.auth.login(userId, 'unknown', { method: '2FA' });
    res.json({ verified: true });
  } catch (err) {
    logger.api.error('POST', '/api/2fa/verify-login', err);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// Get 2FA status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    logger.api.request('GET', '/api/2fa/status', { userId });
    const pool = await getConnection();

    const result = await pool.request()
      .input('employee_id', sql.Int, userId)
      .query(`
        SELECT two_factor_enabled, 
               CASE WHEN two_factor_backup_codes IS NOT NULL 
                    THEN (SELECT COUNT(*) FROM OPENJSON(two_factor_backup_codes))
                    ELSE 0 
               END as backup_codes_remaining
        FROM profiles 
        WHERE employee_id = @employee_id
      `);

    if (result.recordset.length === 0) {
      logger.warn('2FA status fetch failed: User not found', { userId });
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('Fetched 2FA status', { userId });
    res.json({
      enabled: result.recordset[0].two_factor_enabled || false,
      backupCodesRemaining: result.recordset[0].backup_codes_remaining || 0
    });
  } catch (err) {
    logger.api.error('GET', '/api/2fa/status', err, { userId: req.user.id });
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

module.exports = router;