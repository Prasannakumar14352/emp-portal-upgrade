const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/leaves/user/:userId - Get user's leave requests
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);
    
    // Users can only view their own leaves unless HR/manager
    if (parseInt(req.user.id) !== userIdInt && !['hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('user_id', sql.Int, userIdInt)
      .query(`
        SELECT 
          l.id, l.user_id, l.leave_type, l.start_date, l.end_date,
          l.days, l.reason, l.status, l.approved_by, l.created_at, l.updated_at
        FROM leaves l
        WHERE l.user_id = @user_id
        ORDER BY l.created_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get user leaves error:', err);
    res.status(500).json({ error: 'Failed to get leaves' });
  }
});

// GET /api/leaves - Get all leave requests (HR/Manager only)
router.get('/', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { status } = req.query;
    const pool = await getConnection();

    let query = `
      SELECT 
        l.id, l.user_id, l.leave_type, l.start_date, l.end_date,
        l.days, l.reason, l.status, l.approved_by, l.created_at, l.updated_at,
        u.full_name as user_name, u.email as user_email
      FROM leaves l
      JOIN profiles u ON l.user_id = u.id
    `;

    if (status) {
      query += ' WHERE l.status = @status';
    }

    query += ' ORDER BY l.created_at DESC';

    const request = pool.request();
    if (status) {
      request.input('status', sql.NVarChar, status);
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get leaves error:', err);
    res.status(500).json({ error: 'Failed to get leaves' });
  }
});

// POST /api/leaves - Create new leave request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { leave_type, start_date, end_date, days, reason } = req.body;
    const pool = await getConnection();

    const result = await pool.request()
      .input('user_id', sql.Int, req.user.id)
      .input('leave_type', sql.NVarChar, leave_type)
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date)
      .input('days', sql.Int, days)
      .input('reason', sql.NVarChar, reason)
      .query(`
        INSERT INTO leaves (user_id, leave_type, start_date, end_date, days, reason, status, created_at)
        OUTPUT INSERTED.*
        VALUES (@user_id, @leave_type, @start_date, @end_date, @days, @reason, 'Pending', GETDATE())
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('Create leave error:', err);
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

// PATCH /api/leaves/:leaveId - Update leave status (HR/Manager only)
router.patch('/:leaveId', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, approved_by } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .input('status', sql.NVarChar, status)
      .input('approved_by', sql.Int, approved_by || req.user.id)
      .query(`
        UPDATE leaves
        SET status = @status, approved_by = @approved_by, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @leave_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    // Update leave balance if approved
    if (status === 'Approved') {
      const leave = result.recordset[0];
      const year = new Date(leave.start_date).getFullYear();

      await pool.request()
        .input('user_id', sql.Int, leave.user_id)
        .input('year', sql.Int, year)
        .input('leave_type', sql.NVarChar, leave.leave_type)
        .input('days', sql.Int, leave.days)
        .query(`
          MERGE leave_balances AS target
          USING (SELECT @user_id as user_id, @year as year, @leave_type as leave_type) AS source
          ON target.user_id = source.user_id AND target.year = source.year AND target.leave_type = source.leave_type
          WHEN MATCHED THEN
            UPDATE SET 
              used_days = used_days + @days,
              remaining_days = total_days - (used_days + @days)
          WHEN NOT MATCHED THEN
            INSERT (user_id, year, leave_type, total_days, used_days, remaining_days)
            VALUES (@user_id, @year, @leave_type, 20, @days, 20 - @days);
        `);
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Update leave error:', err);
    res.status(500).json({ error: 'Failed to update leave request' });
  }
});

// GET /api/leaves/balances/:userId - Get leave balances
router.get('/balances/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);
    const { year } = req.query;
    
    if (parseInt(req.user.id) !== userIdInt && !['hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const pool = await getConnection();
    const currentYear = year || new Date().getFullYear();

    const result = await pool.request()
      .input('user_id', sql.Int, userIdInt)
      .input('year', sql.Int, currentYear)
      .query(`
        SELECT 
          id, user_id, year, leave_type, total_days, 
          used_days, remaining_days, carry_forward_days
        FROM leave_balances
        WHERE user_id = @user_id AND year = @year
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get leave balances error:', err);
    res.status(500).json({ error: 'Failed to get leave balances' });
  }
});

// POST /api/leaves/:leaveId/comments - Add comment to leave
router.post('/:leaveId/comments', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { comment } = req.body;

    const pool = await getConnection();
    const result = await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .input('user_id', sql.Int, req.user.id)
      .input('comment', sql.NVarChar, comment)
      .query(`
        INSERT INTO leave_comments (leave_id, user_id, comment, created_at)
        OUTPUT INSERTED.*
        VALUES (@leave_id, @user_id, @comment, GETDATE())
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// GET /api/leaves/:leaveId/comments - Get leave comments
router.get('/:leaveId/comments', authenticateToken, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('leave_id', sql.Int, leaveId)
      .query(`
        SELECT 
          lc.id, lc.leave_id, lc.user_id, lc.comment, lc.created_at,
          u.full_name as author_name
        FROM leave_comments lc
        JOIN profiles u ON lc.user_id = u.id
        WHERE lc.leave_id = @leave_id
        ORDER BY lc.created_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

module.exports = router;
