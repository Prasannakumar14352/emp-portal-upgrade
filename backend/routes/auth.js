const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getConnection, sql } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

// POST /api/auth/signup
router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 12 }),
  body('full_name').trim().isLength({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name } = req.body;
    const pool = await getConnection();

    // Check if user already exists
    const existingUser = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id FROM users WHERE email = @email');

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({ error: 'User already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashedPassword)
      .input('full_name', sql.NVarChar, full_name)
      .query(`
        INSERT INTO users (email, password_hash, full_name, created_at)
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.full_name
        VALUES (@email, @password, @full_name, GETDATE())
      `);

    const newUser = result.recordset[0];

    // Assign default role (employee)
    await pool.request()
      .input('user_id', sql.UniqueIdentifier, newUser.id)
      .input('role', sql.NVarChar, 'employee')
      .query(`
        INSERT INTO user_roles (user_id, role, created_at)
        VALUES (@user_id, @role, GETDATE())
      `);

    // Generate tokens
    const tokens = generateTokens({ 
      id: newUser.id, 
      email: newUser.email, 
      role: 'employee' 
    });

    const user = {
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name
    };

    res.status(201).json({
      session: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user
      },
      user
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const pool = await getConnection();

    // Get user with role
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT u.id, u.email, u.password_hash, u.full_name, ur.role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.email = @email
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.recordset[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role || 'employee'
    });

    const userData = {
      id: user.id,
      email: user.email,
      full_name: user.full_name
    };

    res.json({
      session: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: userData
      },
      user: userData
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  // In a production app, you'd invalidate the refresh token here
  // For now, we'll just return success
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/session
router.get('/session', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, req.user.id)
      .query(`
        SELECT u.id, u.email, u.full_name, ur.role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.id = @user_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.recordset[0];

    res.json({
      session: {
        access_token: req.headers.authorization.split(' ')[1],
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name
        }
      }
    });
  } catch (err) {
    console.error('Session error:', err);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    const pool = await getConnection();

    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, decoded.id)
      .query(`
        SELECT u.id, u.email, u.full_name, ur.role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.id = @user_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.recordset[0];
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role || 'employee'
    });

    res.json({
      session: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name
        }
      }
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/oauth/:provider
router.post('/oauth/:provider', (req, res) => {
  const { provider } = req.params;
  const { redirect_to } = req.body;

  // This is a placeholder - implement actual OAuth flow with Azure AD
  if (provider === 'azure') {
    const authUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize?` +
      `client_id=${process.env.AZURE_CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(process.env.AZURE_REDIRECT_URI)}&` +
      `response_mode=query&` +
      `scope=openid%20profile%20email&` +
      `state=${encodeURIComponent(redirect_to)}`;

    return res.json({ url: authUrl });
  }

  res.status(400).json({ error: 'Unsupported OAuth provider' });
});

module.exports = router;
