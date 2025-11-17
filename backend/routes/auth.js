const express = require('express');
const bcrypt = require('bcrypt');
const axios = require("axios");
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getConnection, sql } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/* ---------------------------------------------------------
   TOKEN GENERATOR
--------------------------------------------------------- */
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
      .query('SELECT id FROM users WHERE email = @email');

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({ error: 'User already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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

    await pool.request()
      .input('user_id', sql.UniqueIdentifier, newUser.id)
      .input('role', sql.NVarChar, 'employee')
      .query(`INSERT INTO user_roles (user_id, role, created_at) VALUES (@user_id, @role, GETDATE())`);

    const tokens = generateTokens({
      id: newUser.id,
      email: newUser.email,
      role: 'employee'
    });

    res.status(201).json({
      session: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: {
          id: newUser.id,
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

    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT u.id, u.email, u.password_hash, u.full_name, ur.role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.email = @email
      `);

    if (result.recordset.length === 0)
      return res.status(401).json({ error: 'Invalid email or password' });

    const user = result.recordset[0];

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword)
      return res.status(401).json({ error: 'Invalid email or password' });

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
    const pool = await getConnection();

    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, req.user.id)
      .query(`
        SELECT u.id, u.email, u.full_name, ur.role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.id = @user_id
      `);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'User not found' });

    const user = result.recordset[0];

    res.json({
      session: {
        access_token: req.headers.authorization.split(' ')[1],
        user
      }
    });

  } catch (err) {
    console.error('Session error:', err);
    return res.status(500).json({ error: 'Failed to get session' });
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
    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, decoded.id)
      .query(`
        SELECT u.id, u.email, u.full_name, ur.role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.id = @user_id
      `);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'User not found' });

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
        user
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

    /* 3) UPSERT user */
    const pool = await getConnection();

    const existing = await pool.request()
      .input("email", sql.NVarChar, email)
      .query(`SELECT id FROM users WHERE email = @email`);

    let user_id;

    if (existing.recordset.length === 0) {
      const fakePassword = await bcrypt.hash(`azure_${Date.now()}`, 10);

      const insertUser = await pool.request()
        .input("email", sql.NVarChar, email)
        .input("full_name", sql.NVarChar, fullName)
        .input("password_hash", sql.NVarChar, fakePassword)
        .query(`
          INSERT INTO users (email, full_name, password_hash, created_at)
          OUTPUT INSERTED.id
          VALUES (@email, @full_name, @password_hash, GETDATE())
        `);

      user_id = insertUser.recordset[0].id;

      await pool.request()
        .input("user_id", sql.UniqueIdentifier, user_id)
        .input("role", sql.NVarChar, "employee")
        .query(`INSERT INTO user_roles (user_id, role) VALUES (@user_id, @role)`);

    } else {
      user_id = existing.recordset[0].id;
    }

    /* 4) Generate Tokens */
    const tokens = generateTokens({
      id: user_id,
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
