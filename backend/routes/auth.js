const express = require('express');
const bcrypt = require('bcrypt');
const axios = require("axios");
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getConnection, sql } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/* ---------------------------------------------------------
   CREATE DEFAULT PREFERENCES HELPER
--------------------------------------------------------- */
const createDefaultPreferences = async (userId, pool) => {
  try {
    // Check if preferences already exist
    const existing = await pool.request()
      .input('user_id', sql.NVarChar, userId)
      .query('SELECT id FROM user_preferences WHERE user_id = @user_id');
    
    if (existing.recordset.length === 0) {
      // Create default preferences
      await pool.request()
        .input('user_id', sql.NVarChar, userId)
        .query(`
          INSERT INTO user_preferences (
            user_id, dark_mode, compact_view, 
            email_notifications, push_notifications, leave_update_notifications,
            notification_sound, notification_volume,
            created_at, updated_at
          )
          VALUES (
            @user_id, 0, 0, 
            1, 1, 1,
            'default', 50,
            GETDATE(), GETDATE()
          )
        `);
      console.log(`Default preferences created for user ${userId}`);
    }
  } catch (err) {
    console.error('Error creating default preferences:', err);
    // Don't throw - preferences creation shouldn't block login/signup
  }
};

/* ---------------------------------------------------------
   TOKEN GENERATOR
--------------------------------------------------------- */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      roles: user.roles || [user.role || 'employee']
    },
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

/* ---------------------------------------------------------
   SIGNUP
--------------------------------------------------------- */
router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 12 }),
  body('full_name').trim().isLength({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, full_name } = req.body;
    const pool = await getConnection();

    const existingUser = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT user_id FROM profiles WHERE email = @email');

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({ error: 'User already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('full_name', sql.NVarChar, full_name)
      .query(`
        INSERT INTO profiles (email, full_name, created_at)
        OUTPUT INSERTED.user_id, INSERTED.email, INSERTED.full_name
        VALUES (@email, @full_name, GETDATE())
      `);

    const newUser = result.recordset[0];

    await pool.request()
      .input('user_id', sql.NVarChar, newUser.user_id)
      .input('role', sql.NVarChar, 'employee')
      .query(`IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = @user_id AND role = @role)
        INSERT INTO user_roles (user_id, role, created_at) VALUES (@user_id, @role, GETDATE())`);

    // Create default preferences for new user
    await createDefaultPreferences(newUser.user_id, pool);

    const tokens = generateTokens({
      id: newUser.user_id,
      email: newUser.email,
      roles: ['employee']
    });

    res.status(201).json({
      session: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: {
          id: newUser.user_id,
          email: newUser.email,
          full_name: newUser.full_name
        }
      }
    });

  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Failed to create account' });
  }
});

/* ---------------------------------------------------------
   LOGIN
--------------------------------------------------------- */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const pool = await getConnection();

    // First get user basic info
    const userResult = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT user_id, email, full_name
        FROM profiles
        WHERE email = @email
      `);

    if (userResult.recordset.length === 0)
      return res.status(401).json({ error: 'Invalid email or password' });

    const user = userResult.recordset[0];

    // Get all roles for this user
    const rolesResult = await pool.request()
      .input('user_id', sql.NVarChar, user.user_id)
      .query(`
        SELECT role
        FROM user_roles
        WHERE user_id = @user_id
      `);

    const roles = rolesResult.recordset.length > 0 
      ? rolesResult.recordset.map(r => r.role)
      : ['employee'];

    // For SQL Server with profiles (no password stored)
    // OAuth-only authentication - skip password check

    // Create default preferences if they don't exist
    await createDefaultPreferences(user.user_id, pool);

    const tokens = generateTokens({
      id: user.user_id,
      email: user.email,
      roles: roles
    });

    res.json({
      session: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: {
          id: user.user_id,
          email: user.email,
          full_name: user.full_name
        }
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/* ---------------------------------------------------------
   LOGOUT
--------------------------------------------------------- */
router.post('/logout', authenticateToken, async (req, res) => {
  return res.json({ message: 'Logged out successfully' });
});

/* ---------------------------------------------------------
   GET SESSION
--------------------------------------------------------- */
router.get('/session', authenticateToken, async (req, res) => {
  try {
    console.log('Session request - req.user:', req.user);
    
    if (!req.user || !req.user.id) {
      console.error('Session error: No user ID in request', req.user);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const pool = await getConnection();

    // Get user basic info using id column
    const userResult = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT user_id, email, full_name, department, position
        FROM profiles
        WHERE employee_id = @id
      `);

    if (userResult.recordset.length === 0) {
      console.error('Session error: User not found for ID:', req.user.id);
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.recordset[0];

    // Get all roles for this user
    const rolesResult = await pool.request()
      .input('user_id', sql.NVarChar, user.user_id)
      .query(`
        SELECT role
        FROM user_roles
        WHERE user_id = @user_id
      `);

    const roles = rolesResult.recordset.length > 0 
      ? rolesResult.recordset.map(r => r.role)
      : ['employee'];

    // Map user_id to id for frontend compatibility
    const sessionUser = {
      id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      department: user.department,
      position: user.position,
      roles: roles
    };

    res.json({
      session: {
        access_token: req.headers.authorization.split(' ')[1],
        user: sessionUser
      }
    });

  } catch (err) {
    console.error('Session error:', err);
    return res.status(500).json({ error: 'Failed to get session', details: err.message });
  }
});

/* ---------------------------------------------------------
   REFRESH TOKEN
--------------------------------------------------------- */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token)
      return res.status(401).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);

    const pool = await getConnection();
    
    // Get user basic info
    const userResult = await pool.request()
      .input('user_id', sql.NVarChar, decoded.id)
      .query(`
        SELECT user_id, email, full_name
        FROM profiles
        WHERE user_id = @user_id
      `);

    if (userResult.recordset.length === 0)
      return res.status(404).json({ error: 'User not found' });

    const user = userResult.recordset[0];

    // Get all roles for this user
    const rolesResult = await pool.request()
      .input('user_id', sql.NVarChar, decoded.id)
      .query(`
        SELECT role
        FROM user_roles
        WHERE user_id = @user_id
      `);

    const roles = rolesResult.recordset.length > 0 
      ? rolesResult.recordset.map(r => r.role)
      : ['employee'];

    const tokens = generateTokens({
      id: user.user_id,
      email: user.email,
      roles: roles
    });

    res.json({
      session: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: {
          id: user.user_id,
          email: user.email,
          full_name: user.full_name
        }
      }
    });

  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

/* ---------------------------------------------------------
   MICROSOFT LOGIN (STEP 1)
--------------------------------------------------------- */
router.post('/oauth/:provider', (req, res) => {
  const { provider } = req.params;
  const { redirect_to } = req.body;

  if (provider !== 'azure')
    return res.status(400).json({ error: 'Unsupported OAuth provider' });

  const authUrl =
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize?` +
    `client_id=${process.env.AZURE_CLIENT_ID}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(process.env.AZURE_REDIRECT_URI)}&` +
    `response_mode=query&` +
    `scope=openid%20profile%20email%20User.Read&` +
    `state=${encodeURIComponent(redirect_to)}`;

  return res.json({ url: authUrl });
});

/* ---------------------------------------------------------
   MICROSOFT CALLBACK (STEP 2)
--------------------------------------------------------- */
router.get('/oauth/callback/azure', async (req, res) => {
  try {
    const code = req.query.code;
    const state = req.query.state;

    if (!code) return res.status(400).json({ error: "Missing authorization code" });

    /* 1) Exchange Code for Token */
    const tokenRes = await axios.post(
      `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID,
        client_secret: process.env.AZURE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.AZURE_REDIRECT_URI,
        scope: "openid profile email User.Read"
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const azureTokens = tokenRes.data;

    /* 2) Fetch User Info */
    const graphRes = await axios.get(
      "https://graph.microsoft.com/v1.0/me",
      { headers: { Authorization: `Bearer ${azureTokens.access_token}` } }
    );

    const userInfo = graphRes.data;

    const email = userInfo.mail || userInfo.userPrincipalName;
    const fullName = userInfo.displayName;

    /* 3) Sync OAuth user using stored procedure */
    const pool = await getConnection();

    // Call the sync procedure which will create/update profile and employee records
    const syncResult = await pool.request()
      .input("email", sql.NVarChar, email)
      .input("full_name", sql.NVarChar, fullName)
      .input("department", sql.NVarChar, userInfo.department || "Not Assigned")
      .input("position", sql.NVarChar, userInfo.jobTitle || "Employee")
      .execute("sp_sync_oauth_user");

    const employee_id = syncResult.recordset[0].employee_id;

    /* 4) Generate Tokens */
    const tokens = generateTokens({
      id: employee_id,
      email,
      role: "employee"
    });

    /* 5) Redirect to Frontend */
    const redirectURL =
      `${state}?access_token=${tokens.accessToken}` +
      `&refresh_token=${tokens.refreshToken}` +
      `&email=${encodeURIComponent(email)}` +
      `&name=${encodeURIComponent(fullName)}`;

    return res.redirect(redirectURL);

  } catch (err) {
    console.log("----- OAUTH CALLBACK ERROR START -----");
    console.log("ERR.MESSAGE:", err.message);
    console.log("ERR.RESPONSE.DATA:", err.response?.data);
    console.log("ERR.RESPONSE.STATUS:", err.response?.status);
    console.log("ERR.REQUEST:", err.request);
    console.log("----- OAUTH CALLBACK ERROR END -----");

    return res.status(500).json({ error: "OAuth callback failed" });
  }
});

module.exports = router;
