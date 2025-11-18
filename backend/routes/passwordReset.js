const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { getConnection, sql } = require('../config/database');

const router = express.Router();

// In-memory storage for reset tokens (in production, use Redis or database)
const resetTokens = new Map();

/* ---------------------------------------------------------
   REQUEST PASSWORD RESET
--------------------------------------------------------- */
router.post('/request', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const pool = await getConnection();

    // Check if user exists
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id, email, full_name FROM profiles WHERE email = @email');

    if (result.recordset.length === 0) {
      // Don't reveal if email exists or not
      return res.json({ 
        message: 'If an account exists with that email, you will receive password reset instructions.' 
      });
    }

    const user = result.recordset[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Store token (in production, store in database)
    resetTokens.set(resetToken, {
      userId: user.id,
      email: user.email,
      expiry: resetTokenExpiry
    });

    // In production, send email with reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    console.log(`Password reset requested for ${email}`);
    console.log(`Reset link: ${resetLink}`);

    res.json({ 
      message: 'If an account exists with that email, you will receive password reset instructions.',
      // For development only - remove in production
      ...(process.env.NODE_ENV === 'development' && { resetToken, resetLink })
    });

  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

/* ---------------------------------------------------------
   VERIFY RESET TOKEN
--------------------------------------------------------- */
router.post('/verify', [
  body('token').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;
    const tokenData = resetTokens.get(token);

    if (!tokenData || tokenData.expiry < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.json({ valid: true, email: tokenData.email });

  } catch (err) {
    console.error('Token verification error:', err);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

/* ---------------------------------------------------------
   RESET PASSWORD
--------------------------------------------------------- */
router.post('/reset', [
  body('token').notEmpty(),
  body('password').isLength({ min: 12 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;
    const tokenData = resetTokens.get(token);

    if (!tokenData || tokenData.expiry < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const pool = await getConnection();

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    await pool.request()
      .input('user_id', sql.Int, tokenData.userId)
      .input('password_hash', sql.NVarChar, hashedPassword)
      .query(`
        UPDATE profiles
        SET password_hash = @password_hash, updated_at = GETDATE()
        WHERE user_id = @user_id
      `);

    // Remove used token
    resetTokens.delete(token);

    res.json({ message: 'Password reset successful' });

  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
