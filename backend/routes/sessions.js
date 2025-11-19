const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

/* ---------------------------------------------------------
   CREATE SESSION (User creates their own session)
--------------------------------------------------------- */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.user.id);
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        INSERT INTO user_sessions (user_id, login_time, created_at)
        OUTPUT INSERTED.*
        VALUES (@user_id, GETDATE(), GETDATE())
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/* ---------------------------------------------------------
   END SESSION (Update logout time)
--------------------------------------------------------- */
router.patch('/:id/end', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const userId = parseInt(req.user.id);
    const pool = await getConnection();
    
    // Verify session belongs to user
    const session = await pool.request()
      .input('id', sql.Int, sessionId)
      .input('user_id', sql.Int, userId)
      .query('SELECT id, user_id FROM user_sessions WHERE id = @id');
    
    if (session.recordset.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (session.recordset[0].user_id !== userId && req.user.role !== 'hr' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized to end this session' });
    }

    const result = await pool.request()
      .input('id', sql.Int, sessionId)
      .query(`
        UPDATE user_sessions
        SET logout_time = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('End session error:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

/* ---------------------------------------------------------
   GET USER SESSIONS (User gets their own or HR/Manager gets any)
--------------------------------------------------------- */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const requestingUserId = parseInt(req.user.id);
    const { startDate, endDate } = req.query;
    
    // Check authorization
    if (targetUserId !== requestingUserId && req.user.role !== 'hr' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized to view these sessions' });
    }

    const pool = await getConnection();
    let query = `
      SELECT * FROM user_sessions 
      WHERE user_id = @user_id
    `;
    
    if (startDate) {
      query += ' AND login_time >= @startDate';
    }
    if (endDate) {
      query += ' AND login_time <= @endDate';
    }
    
    query += ' ORDER BY login_time DESC';

    const request = pool.request().input('user_id', sql.Int, targetUserId);
    
    if (startDate) {
      request.input('startDate', sql.DateTime2, startDate);
    }
    if (endDate) {
      request.input('endDate', sql.DateTime2, endDate);
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get user sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/* ---------------------------------------------------------
   GET USER SESSION STATISTICS
--------------------------------------------------------- */
router.get('/user/:userId/stats', authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const requestingUserId = parseInt(req.user.id);
    
    // Check authorization
    if (targetUserId !== requestingUserId && req.user.role !== 'hr' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized to view these statistics' });
    }

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('user_id', sql.Int, targetUserId)
      .query(`
        SELECT 
          COUNT(*) as total_sessions,
          COALESCE(SUM(session_duration), 0) as total_duration,
          COALESCE(AVG(session_duration), 0) as average_duration,
          COALESCE(SUM(CASE WHEN CAST(login_time AS DATE) = CAST(GETDATE() AS DATE) THEN session_duration ELSE 0 END), 0) as today_duration,
          COALESCE(SUM(CASE WHEN login_time >= DATEADD(day, -7, GETDATE()) THEN session_duration ELSE 0 END), 0) as this_week_duration,
          COALESCE(SUM(CASE WHEN YEAR(login_time) = YEAR(GETDATE()) AND MONTH(login_time) = MONTH(GETDATE()) THEN session_duration ELSE 0 END), 0) as this_month_duration
        FROM user_sessions
        WHERE user_id = @user_id
      `);

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Get session stats error:', err);
    res.status(500).json({ error: 'Failed to fetch session statistics' });
  }
});

/* ---------------------------------------------------------
   GET ALL EMPLOYEE SESSIONS (HR/Manager only)
--------------------------------------------------------- */
router.get('/all', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getConnection();
    
    let query = `
      SELECT 
        p.user_id,
        p.full_name,
        p.email,
        COALESCE(p.department, 'Not Assigned') as department,
        COALESCE(p.position, 'Not Assigned') as position,
        COUNT(s.id) as total_sessions,
        COALESCE(SUM(s.session_duration), 0) as total_duration,
        COALESCE(AVG(s.session_duration), 0) as average_duration,
        COALESCE(MAX(s.login_time), 'Never') as last_login
      FROM profiles p
      LEFT JOIN user_sessions s ON p.user_id = s.user_id
    `;
    
    if (startDate || endDate) {
      query += ' WHERE 1=1';
      if (startDate) {
        query += ' AND s.login_time >= @startDate';
      }
      if (endDate) {
        query += ' AND s.login_time <= @endDate';
      }
    }
    
    query += `
      GROUP BY p.id, p.full_name, p.email, p.department, p.position
      ORDER BY p.full_name
    `;

    const request = pool.request();
    
    if (startDate) {
      request.input('startDate', sql.DateTime2, startDate);
    }
    if (endDate) {
      request.input('endDate', sql.DateTime2, endDate);
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get all employee sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch employee sessions' });
  }
});

module.exports = router;
