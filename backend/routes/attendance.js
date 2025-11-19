const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logError } = require('../utils/logger');

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
    logError(error, req, { context: 'Error fetching today attendance', userId });
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
    logError(error, req, { context: 'Error fetching attendance stats', userId, month, year });
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
    logError(error, req, { context: 'Error fetching attendance records', userId });
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
    logError(error, req, { context: 'Error checking in', userId });
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
    logError(error, req, { context: 'Error checking out', userId });
    res.status(500).json({ error: error.message });
  }
});

// Analytics endpoints
router.get('/analytics/stats', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const pool = await getConnection();
    
    // Get today's stats
    const todayStats = await pool.request()
      .input('date', sql.Date, today)
      .query(`
        SELECT 
          COUNT(DISTINCT user_id) as totalEmployees,
          SUM(CASE WHEN status = 'present' OR check_in_time IS NOT NULL THEN 1 ELSE 0 END) as presentToday,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absentToday,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as lateToday
        FROM attendance_records 
        WHERE date = @date
      `);
    
    // Get average attendance rate for the month
    const avgStats = await pool.request()
      .query(`
        SELECT 
          AVG(CASE 
            WHEN status IN ('present', 'late') OR check_in_time IS NOT NULL 
            THEN 100.0 
            ELSE 0 
          END) as avgAttendanceRate
        FROM attendance_records 
        WHERE MONTH(date) = MONTH(GETDATE()) AND YEAR(date) = YEAR(GETDATE())
      `);

    const stats = todayStats.recordset[0];
    const avgRate = avgStats.recordset[0];

    res.json({
      totalEmployees: stats.totalEmployees || 0,
      presentToday: stats.presentToday || 0,
      absentToday: stats.absentToday || 0,
      lateToday: stats.lateToday || 0,
      avgAttendanceRate: Math.round(avgRate.avgAttendanceRate || 0),
    });
  } catch (error) {
    logError(error, req, { context: 'Error fetching analytics stats' });
    res.status(500).json({ error: error.message });
  }
});

// Update attendance record with business rules
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, checkInTime, checkOutTime, notes, date } = req.body;
    
    const pool = await getConnection();
    
    // Get the attendance record
    const recordResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM attendance_records WHERE id = @id');
    
    const record = recordResult.recordset[0];
    if (!record) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    
    // Check if user has HR role
    const roleResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT role FROM user_roles 
        WHERE user_id = (SELECT id FROM profiles WHERE employee_id = @userId)
      `);
    
    const isHR = roleResult.recordset.some(r => r.role === 'hr');
    
    // Get the date difference
    const recordDate = new Date(record.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    recordDate.setHours(0, 0, 0, 0);
    
    const daysDifference = Math.floor((today - recordDate) / (1000 * 60 * 60 * 24));
    
    // Business logic: Employee can update only if it's the next day (daysDifference === 1)
    // HR can update anytime
    if (!isHR && record.user_id !== userId) {
      return res.status(403).json({ error: 'You can only update your own attendance' });
    }
    
    if (!isHR && daysDifference > 1) {
      return res.status(403).json({ 
        error: 'You can only update attendance for the previous day. Please contact HR for older records.' 
      });
    }
    
    // Update the record
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('checkInTime', sql.DateTime2, checkInTime ? new Date(checkInTime) : null)
      .input('checkOutTime', sql.DateTime2, checkOutTime ? new Date(checkOutTime) : null)
      .input('notes', sql.NVarChar, notes || null)
      .query(`
        UPDATE attendance_records 
        SET 
          check_in_time = @checkInTime,
          check_out_time = @checkOutTime,
          notes = @notes,
          updated_at = GETDATE()
        WHERE id = @id
      `);
    
    res.json({ message: 'Attendance updated successfully' });
  } catch (error) {
    logError(error, req, { context: 'Error updating attendance' });
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics/departments', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const pool = await getConnection();
    const result = await pool.request()
      .input('date', sql.Date, today)
      .query(`
        SELECT 
          e.department,
          COUNT(DISTINCT e.user_id) as total,
          SUM(CASE WHEN ar.status = 'present' OR ar.check_in_time IS NOT NULL THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late,
          CAST(AVG(CASE 
            WHEN ar.status IN ('present', 'late') OR ar.check_in_time IS NOT NULL 
            THEN 100.0 
            ELSE 0 
          END) as INT) as attendanceRate
        FROM employees e
        LEFT JOIN attendance_records ar ON e.user_id = ar.user_id AND ar.date = @date
        GROUP BY e.department
        ORDER BY e.department
      `);

    res.json(result.recordset);
  } catch (error) {
    logError(error, req, { context: 'Error fetching department analytics' });
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics/trends', authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(days, 10);
    
    const pool = await getConnection();
    const result = await pool.request()
      .input('days', sql.Int, daysNum)
      .query(`
        SELECT 
          CONVERT(VARCHAR, date, 23) as date,
          SUM(CASE WHEN status = 'present' OR check_in_time IS NOT NULL THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
          CAST(AVG(CASE 
            WHEN status IN ('present', 'late') OR check_in_time IS NOT NULL 
            THEN 100.0 
            ELSE 0 
          END) as INT) as attendanceRate
        FROM attendance_records
        WHERE date >= DATEADD(day, -@days, GETDATE())
        GROUP BY date
        ORDER BY date ASC
      `);

    res.json(result.recordset);
  } catch (error) {
    logError(error, req, { context: 'Error fetching trend analytics', days });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
