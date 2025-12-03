const express = require('express');
const bcrypt = require('bcrypt');
const axios = require("axios");
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getConnection, sql } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/* ---------------------------------------------------------
   CREATE DEFAULT PREFERENCES HELPER
--------------------------------------------------------- */
const createDefaultPreferences = async (userId, pool) => {
  try {
    // Check if preferences already exist
    const existing = await pool.request()
      .input('employee_id', sql.Int, userId)
      .query('SELECT id FROM user_preferences WHERE employee_id = @employee_id');

    if (existing.recordset.length === 0) {
      // Create default preferences
      await pool.request()
        .input('employee_id', sql.Int, userId)
        .query(`
          INSERT INTO user_preferences (
            employee_id, dark_mode, compact_view, 
            email_notifications, push_notifications, leave_update_notifications,
            notification_sound, notification_volume,
            created_at, updated_at
          )
          VALUES (
            @employee_id, 0, 0, 
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
      .query('SELECT employee_id FROM profiles WHERE email = @email');

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({ error: 'User already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('full_name', sql.NVarChar, full_name)
      .query(`
        INSERT INTO profiles (email, full_name, created_at)
        OUTPUT INSERTED.employee_id, INSERTED.email, INSERTED.full_name
        VALUES (@email, @full_name, GETDATE())
      `);

    const newUser = result.recordset[0];

    await pool.request()
      .input('employee_id', sql.Int, newUser.employee_id)
      .input('role', sql.NVarChar, 'employee')
      .query(`IF NOT EXISTS (SELECT 1 FROM user_roles WHERE employee_id = @employee_id AND role = @role)
        INSERT INTO user_roles (employee_id, role, created_at) VALUES (@employee_id, @role, GETDATE())`);

    // Create default preferences for new user
    await createDefaultPreferences(newUser.employee_id, pool);

    const tokens = generateTokens({
      id: newUser.employee_id,
      email: newUser.email,
      roles: ['employee']
    });

    res.status(201).json({
      session: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: {
          id: newUser.employee_id.toString(),
          employee_id: newUser.employee_id,
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
        SELECT employee_id, email, full_name
        FROM profiles
        WHERE email = @email
      `);

    if (userResult.recordset.length === 0)
      return res.status(401).json({ error: 'Invalid email or password' });

    const user = userResult.recordset[0];

    // Get all roles for this user
    const rolesResult = await pool.request()
      .input('employee_id', sql.Int, user.employee_id)
      .query(`
        SELECT role
        FROM user_roles
        WHERE employee_id = @employee_id
      `);

    const roles = rolesResult.recordset.length > 0
      ? rolesResult.recordset.map(r => r.role)
      : ['employee'];

    // For SQL Server with profiles (no password stored)
    // OAuth-only authentication - skip password check

    // Create default preferences if they don't exist
    await createDefaultPreferences(user.employee_id, pool);

    const tokens = generateTokens({
      id: user.employee_id,
      email: user.email,
      roles: roles
    });

    res.json({
      session: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: {
          id: user.employee_id.toString(),
          employee_id: user.employee_id,
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
        SELECT employee_id, email, full_name, department, position
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
      .input('employee_id', sql.Int, user.employee_id)
      .query(`
        SELECT role
        FROM user_roles
        WHERE employee_id = @employee_id
      `);

    const roles = rolesResult.recordset.length > 0
      ? rolesResult.recordset.map(r => r.role)
      : ['employee'];

    // Map employee_id to id for frontend compatibility
    const sessionUser = {
      id: user.employee_id.toString(),
      employee_id: user.employee_id,
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
      .input('employee_id', sql.Int, decoded.id)
      .query(`
        SELECT employee_id, email, full_name
        FROM profiles
        WHERE employee_id = @employee_id
      `);

    if (userResult.recordset.length === 0)
      return res.status(404).json({ error: 'User not found' });

    const user = userResult.recordset[0];

    // Get all roles for this user
    const rolesResult = await pool.request()
      .input('employee_id', sql.Int, decoded.id)
      .query(`
        SELECT role
        FROM user_roles
        WHERE employee_id = @employee_id
      `);

    const roles = rolesResult.recordset.length > 0
      ? rolesResult.recordset.map(r => r.role)
      : ['employee'];

    const tokens = generateTokens({
      id: user.employee_id,
      email: user.email,
      roles: roles
    });

    res.json({
      session: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: {
          id: user.employee_id.toString(),
          employee_id: user.employee_id,
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

    /* 2.5) Fetch User's Azure AD Group Memberships */
    let userRoles = [];

    try {
      const groupsRes = await axios.get(
        "https://graph.microsoft.com/v1.0/me/memberOf",
        { headers: { Authorization: `Bearer ${azureTokens.access_token}` } }
      );

      const groups = groupsRes.data.value || [];

      const HR_GROUP_ID = process.env.AZURE_HR_GROUP_ID || 'HR';
      const MANAGER_GROUP_ID = process.env.AZURE_MANAGER_GROUP_ID || 'Manager';

      const isHR = groups.some(g =>
        g.id === HR_GROUP_ID ||
        g.displayName?.toLowerCase().includes('hr') ||
        g.displayName?.toLowerCase().includes('human resources')
      );

      const isManager = groups.some(g =>
        g.id === MANAGER_GROUP_ID ||
        g.displayName?.toLowerCase().includes('manager') ||
        g.displayName?.toLowerCase().includes('lead')
      );

      if (isHR) userRoles.push('hr');
      if (isManager) userRoles.push('manager');
      if (userRoles.length === 0) userRoles.push('employee');

      logger.info(`Detected roles for ${email}: ${userRoles.join(', ')}`);
    } catch (groupErr) {
      logger.error('Failed to fetch Azure AD groups, using default employee role', groupErr, {
        email
      });

      if (userRoles.length === 0) {
        userRoles.push('employee');
      }
    }


    /* 3) Sync OAuth user using stored procedure */
    const pool = await getConnection();
    console.log('Connected to database for OAuth callback processing');

    let employee_id;
    try {
      console.log('Syncing OAuth user with sp_sync_oauth_user:', { email, fullName, department: userInfo.department, position: userInfo.jobTitle });
      // Call the sync procedure which will create/update profile and employee records
      logger.info(`Attempting to sync OAuth user: ${email}`);
      const syncResult = await pool.request()
        .input("email", sql.NVarChar, email)
        .input("full_name", sql.NVarChar, fullName)
        .input("department", sql.NVarChar, userInfo.department || "Not Assigned")
        .input("position", sql.NVarChar, userInfo.jobTitle || "Employee")
        .execute("sp_sync_oauth_user");

      if (!syncResult.recordset || syncResult.recordset.length === 0) {
        throw new Error('sp_sync_oauth_user did not return employee_id');
      }

      employee_id = syncResult.recordset[0].employee_id;
      logger.info(`Successfully synced OAuth user. Employee ID: ${employee_id}`);
    } catch (syncErr) {
      logger.error('User synchronization failed', syncErr, {
        email,
        fullName,
        storedProcedure: 'sp_sync_oauth_user',
        sqlErrorNumber: syncErr.number,
        sqlErrorCode: syncErr.code,
        sqlErrorState: syncErr.state,
        sqlErrorMessage: syncErr.message,
        sqlErrorProcedure: syncErr.procName
      });
      throw new Error(`User synchronization failed: ${syncErr.message}`);
    }

    /* 3.5) Sync user roles based on Azure AD groups */
    try {
      logger.info(`Fetching employee_id for employee_id: ${employee_id}`);
      const userIdResult = await pool.request()
        .input('employee_id', sql.Int, employee_id)
        .query('SELECT employee_id FROM profiles WHERE employee_id = @employee_id');

      if (userIdResult.recordset.length === 0) {
        logger.warn(`No employee_id found for employee_id: ${employee_id}`, { email });
      } else {
        const userId = userIdResult.recordset[0].employee_id;
        logger.info(`Found employee_id: ${userId} for employee_id: ${employee_id}`);

        // Assign roles from Azure AD groups
        for (const role of userRoles) {
          try {
            logger.info(`Attempting to assign role '${role}' to user ${email} (employee_id: ${userId})`);

            await pool.request()
              .input('employee_id', sql.Int, userId)
              .input('role', sql.NVarChar, role)
              .query(`
                IF NOT EXISTS (SELECT 1 FROM user_roles WHERE employee_id = @employee_id AND role = @role)
                BEGIN
                  INSERT INTO user_roles (employee_id, role, created_at)
                  VALUES (@employee_id, @role, GETDATE())
                END
              `);
            logger.info(`Successfully assigned role '${role}' to user ${email}`);
          } catch (roleErr) {
            logger.error(`Failed to assign role: ${role}`, roleErr, {
              email,
              userId,
              roleAttempted: role,
              sqlErrorNumber: roleErr.number,
              sqlErrorCode: roleErr.code,
              sqlErrorMessage: roleErr.message
            });
          }
        }

        // Clean up: Check database for elevated roles and remove redundant 'employee' role
        try {
          const existingRolesResult = await pool.request()
            .input('employee_id', sql.Int, userId)
            .query(`
              SELECT role FROM user_roles WHERE employee_id = @employee_id
            `);

          const dbRoles = existingRolesResult.recordset.map(r => r.role);
          const hasElevatedRole = dbRoles.includes('hr') || dbRoles.includes('manager');
          const hasEmployeeRole = dbRoles.includes('employee');

          if (hasElevatedRole && hasEmployeeRole) {
            await pool.request()
              .input('employee_id', sql.Int, userId)
              .query(`
                DELETE FROM user_roles 
                WHERE employee_id = @employee_id 
                AND role = 'employee'
              `);
            logger.info(`Removed redundant 'employee' role for user ${email} with elevated roles: ${dbRoles.join(', ')}`);
          }
        } catch (cleanupErr) {
          logger.error('Failed to cleanup employee role', cleanupErr, {
            email,
            userId
          });
        }
      }
    } catch (userIdErr) {
      logger.error('Failed to fetch employee_id from profiles table', userIdErr, {
        email,
        employee_id,
        sqlErrorNumber: userIdErr.number,
        sqlErrorCode: userIdErr.code,
        sqlErrorMessage: userIdErr.message
      });
    }

    /* 4) Generate Tokens */
    const tokens = generateTokens({
      id: employee_id,
      email,
      roles: userRoles
    });

    /* 5) Redirect to Frontend */
    const redirectURL =
      `${state}?access_token=${tokens.accessToken}` +
      `&refresh_token=${tokens.refreshToken}` +
      `&email=${encodeURIComponent(email)}` +
      `&name=${encodeURIComponent(fullName)}`;

    return res.redirect(redirectURL);

  } catch (err) {
    logger.error('OAuth callback failed', err, { provider: 'azure' });

    let errorMessage = "Authentication failed. Please try again.";
    let errorDetails = err.message;

    // Provide user-friendly error messages
    if (err.response?.status === 401 || err.response?.status === 403) {
      errorMessage = "Authentication denied. Please check your Microsoft account permissions.";
      errorDetails = "Access token may be invalid or expired";
    } else if (err.response?.status === 400) {
      errorMessage = "Invalid authentication request. Please try signing in again.";
      errorDetails = err.response?.data?.error_description || "Bad request to OAuth provider";
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      errorMessage = "Unable to connect to Microsoft authentication service. Please check your connection.";
      errorDetails = "Network connection issue";
    } else if (err.message?.includes('procedure') || err.message?.includes('database')) {
      errorMessage = "Account setup failed. Please contact your administrator.";
      errorDetails = "Database synchronization error";
    }

    // Redirect to frontend with error
    const errorRedirect = `${req.query.state || process.env.FRONTEND_URL}?error=${encodeURIComponent(errorMessage)}&error_details=${encodeURIComponent(errorDetails)}`;
    return res.redirect(errorRedirect);
  }
});

module.exports = router;
