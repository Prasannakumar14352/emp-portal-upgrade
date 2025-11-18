const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../config/database');
const authenticateToken = require('../middleware/auth');

// Get today's attendance record
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query;
    const today = new Date().toISOString().split('T')[0];
    
    const pool = await getConnection();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('date', sql.Date, today)
      .query(`
        SELECT * FROM attendance_records 
        WHERE user_id = @userId AND date = @date
      `);

    res.json(result.recordset[0] || null);
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get attendance stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { userId, month, year } = req.query;
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const pool = await getConnection();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT 
          COUNT(*) as totalDays,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
        FROM attendance_records 
        WHERE user_id = @userId 
          AND date >= @startDate 
          AND date <= @endDate
      `);

    const stats = result.recordset[0];
    const attendanceRate = stats.totalDays > 0 
      ? Math.round(((stats.present + stats.late) / stats.totalDays) * 100)
      : 0;

    res.json({
      totalDays: stats.totalDays,
      present: stats.present,
      absent: stats.absent,
      late: stats.late,
      attendanceRate,
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user attendance records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { userId, month, year } = req.query;
    
    const pool = await getConnection();
    let query = `
      SELECT * FROM attendance_records 
      WHERE user_id = @userId
    `;
    
    const request = pool.request().input('userId', sql.Int, userId);
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query += ` AND date >= @startDate AND date <= @endDate`;
      request.input('startDate', sql.Date, startDate);
      request.input('endDate', sql.Date, endDate);
    }
    
    query += ` ORDER BY date DESC`;
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check in
router.post('/checkin', authenticateToken, async (req, res) => {
  try {
    const { userId, notes } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    const pool = await getConnection();
    
    // Check if already checked in
    const existing = await pool.request()
      .input('userId', sql.Int, userId)
      .input('date', sql.Date, today)
      .query(`
        SELECT * FROM attendance_records 
        WHERE user_id = @userId AND date = @date
      `);

    if (existing.recordset[0]?.check_in_time) {
      return res.status(400).json({ error: 'Already checked in for today' });
    }

    // Get user name for notification
    const userResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT full_name FROM employees WHERE user_id = @userId');
    
    const userName = userResult.recordset[0]?.full_name || 'Unknown User';

    if (existing.recordset[0]) {
      // Update existing record
      await pool.request()
        .input('id', sql.UniqueIdentifier, existing.recordset[0].id)
        .input('checkInTime', sql.DateTime2, now)
        .input('notes', sql.NVarChar, notes)
        .query(`
          UPDATE attendance_records 
          SET check_in_time = @checkInTime, notes = @notes, updated_at = GETDATE()
          WHERE id = @id
        `);
    } else {
      // Create new record
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('date', sql.Date, today)
        .input('checkInTime', sql.DateTime2, now)
        .input('notes', sql.NVarChar, notes)
        .query(`
          INSERT INTO attendance_records (user_id, date, check_in_time, notes)
          VALUES (@userId, @date, @checkInTime, @notes)
        `);
    }

    // Emit SignalR notification
    const io = req.app.get('io');
    if (io) {
      io.emit('attendanceUpdate', {
        userId,
        userName,
        action: 'check-in',
        timestamp: now.toISOString(),
        message: `${userName} has checked in`
      });
    }

    res.json({ message: 'Checked in successfully' });
  } catch (error) {
    console.error('Error checking in:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check out
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    const pool = await getConnection();
    
    const existing = await pool.request()
      .input('userId', sql.Int, userId)
      .input('date', sql.Date, today)
      .query(`
        SELECT * FROM attendance_records 
        WHERE user_id = @userId AND date = @date
      `);

    if (!existing.recordset[0]) {
      return res.status(400).json({ error: 'No check-in record found for today' });
    }

    if (existing.recordset[0].check_out_time) {
      return res.status(400).json({ error: 'Already checked out for today' });
    }

    // Get user name for notification
    const userResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT full_name FROM employees WHERE user_id = @userId');
    
    const userName = userResult.recordset[0]?.full_name || 'Unknown User';

    await pool.request()
      .input('id', sql.UniqueIdentifier, existing.recordset[0].id)
      .input('checkOutTime', sql.DateTime2, now)
      .query(`
        UPDATE attendance_records 
        SET check_out_time = @checkOutTime, updated_at = GETDATE()
        WHERE id = @id
      `);

    // Emit SignalR notification
    const io = req.app.get('io');
    if (io) {
      io.emit('attendanceUpdate', {
        userId,
        userName,
        action: 'check-out',
        timestamp: now.toISOString(),
        message: `${userName} has checked out`
      });
    }

    res.json({ message: 'Checked out successfully' });
  } catch (error) {
    console.error('Error checking out:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
