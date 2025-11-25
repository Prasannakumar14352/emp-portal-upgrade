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
        WHERE employee_id = @userId AND date = @date
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
        WHERE employee_id = @userId 
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
      WHERE employee_id = @userId
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

// Create or update attendance record (for HR/Managers)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, date, checkInTime, checkOutTime, status, notes } = req.body;
    
    // Check if requesting user has HR/Manager role using auth token
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : (req.user.role ? [req.user.role] : ['employee']);
    const isHROrManager = userRoles.some(role => role === 'hr' || role === 'manager');
    
    if (!isHROrManager) {
      return res.status(403).json({ error: 'Access denied. HR/Manager role required.' });
    }
    
    const pool = await getConnection();
    
    // Check if record exists
    const existing = await pool.request()
      .input('userId', sql.Int, userId)
      .input('date', sql.Date, date)
      .query(`
        SELECT id FROM attendance_records 
        WHERE employee_id = @userId AND date = @date
      `);
    
    // Calculate work hours if both times provided
    let workHours = null;
    if (checkInTime && checkOutTime) {
      const checkIn = new Date(checkInTime);
      const checkOut = new Date(checkOutTime);
      workHours = (checkOut - checkIn) / (1000 * 60 * 60);
    }
    
    if (existing.recordset[0]) {
      // Update existing record
      await pool.request()
        .input('id', sql.UniqueIdentifier, existing.recordset[0].id)
        .input('checkInTime', sql.DateTime2, checkInTime ? new Date(checkInTime) : null)
        .input('checkOutTime', sql.DateTime2, checkOutTime ? new Date(checkOutTime) : null)
        .input('status', sql.NVarChar, status || 'present')
        .input('notes', sql.NVarChar, notes || null)
        .input('workHours', sql.Decimal(5, 2), workHours)
        .query(`
          UPDATE attendance_records 
          SET check_in_time = @checkInTime,
              check_out_time = @checkOutTime,
              status = @status,
              notes = @notes,
              work_hours = @workHours,
              updated_at = GETDATE()
          WHERE id = @id
        `);
    } else {
      // Create new record
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('date', sql.Date, date)
        .input('checkInTime', sql.DateTime2, checkInTime ? new Date(checkInTime) : null)
        .input('checkOutTime', sql.DateTime2, checkOutTime ? new Date(checkOutTime) : null)
        .input('status', sql.NVarChar, status || 'present')
        .input('notes', sql.NVarChar, notes || null)
        .input('workHours', sql.Decimal(5, 2), workHours)
        .query(`
          INSERT INTO attendance_records (employee_id, date, check_in_time, check_out_time, status, notes, work_hours)
          VALUES (@userId, @date, @checkInTime, @checkOutTime, @status, @notes, @workHours)
        `);
    }
    
    res.json({ message: 'Attendance record saved successfully' });
  } catch (error) {
    logError(error, req, { context: 'Error creating/updating attendance' });
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
        WHERE employee_id = @userId AND date = @date
      `);

    if (existing.recordset[0]?.check_in_time) {
      return res.status(400).json({ error: 'Already checked in for today' });
    }

    // Get user name for notification
    const userResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT full_name FROM profiles WHERE employee_id = @userId');
    
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
          INSERT INTO attendance_records (employee_id, date, check_in_time, notes)
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
        WHERE employee_id = @userId AND date = @date
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
      .query('SELECT full_name FROM profiles WHERE employee_id = @userId');
    
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
          COUNT(DISTINCT employee_id) as totalEmployees,
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
    const { userId, checkInTime, checkOutTime, notes, status } = req.body;
    
    const pool = await getConnection();
    
    console.log('[Attendance Update] Request received:', { id, userId, checkInTime, checkOutTime, status });
    
    // Get the attendance record
    const recordResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM attendance_records WHERE id = @id');
    
    const record = recordResult.recordset[0];
    if (!record) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    
    // Check if requesting user has HR/Manager role using auth token
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : (req.user.role ? [req.user.role] : ['employee']);
    const isHROrManager = userRoles.some(role => role === 'hr' || role === 'manager');
    
    console.log('[Attendance Update] Auth check:', { 
      requestingUserRoles: userRoles, 
      isHROrManager,
      recordEmployeeId: record.employee_id,
      requestUserId: userId
    });
    
    // Get the date difference
    const recordDate = new Date(record.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    recordDate.setHours(0, 0, 0, 0);
    
    const daysDifference = Math.floor((today - recordDate) / (1000 * 60 * 60 * 24));
    
    // Business logic: 
    // - HR/Manager can update any attendance anytime
    // - Employee can update only their own attendance for the previous day
    const recordEmployeeId = parseInt(record.employee_id);
    const requestUserId = parseInt(userId);
    
    if (!isHROrManager && recordEmployeeId !== requestUserId) {
      console.log('[Attendance Update] Permission denied - not own record');
      return res.status(403).json({ error: 'You can only update your own attendance' });
    }
    
    if (!isHROrManager && daysDifference > 1) {
      return res.status(403).json({ 
        error: 'You can only update attendance for the previous day. Please contact HR for older records.' 
      });
    }
    
    // Calculate work hours if both times provided
    let workHours = null;
    if (checkInTime && checkOutTime) {
      const checkIn = new Date(checkInTime);
      const checkOut = new Date(checkOutTime);
      workHours = (checkOut - checkIn) / (1000 * 60 * 60); // hours
    }
    
    // Update the record
    const updateRequest = pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('checkInTime', sql.DateTime2, checkInTime ? new Date(checkInTime) : null)
      .input('checkOutTime', sql.DateTime2, checkOutTime ? new Date(checkOutTime) : null)
      .input('notes', sql.NVarChar, notes || null)
      .input('workHours', sql.Decimal(5, 2), workHours);
    
    let updateQuery = `
      UPDATE attendance_records 
      SET 
        check_in_time = @checkInTime,
        check_out_time = @checkOutTime,
        notes = @notes,
        work_hours = @workHours,
        updated_at = GETDATE()
    `;
    
    // Allow HR/Manager to update status
    if (isHROrManager && status) {
      updateRequest.input('status', sql.NVarChar, status);
      updateQuery += ', status = @status';
    }
    
    updateQuery += ' WHERE id = @id';
    
    await updateRequest.query(updateQuery);
    
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
          COUNT(DISTINCT e.employee_id) as total,
          SUM(CASE WHEN ar.status = 'present' OR ar.check_in_time IS NOT NULL THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late,
          CAST(AVG(CASE 
            WHEN ar.status IN ('present', 'late') OR ar.check_in_time IS NOT NULL 
            THEN 100.0 
            ELSE 0 
          END) as INT) as attendanceRate
        FROM profiles e
        LEFT JOIN attendance_records ar ON e.employee_id = ar.employee_id AND ar.date = @date
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

// Get attendance calendar data for HR dashboard
router.get('/calendar', authenticateToken, async (req, res) => {
  try {
    const { year, month, department } = req.query;
    
    const pool = await getConnection();
    
    // Get all employees with optional department filter
    let employeeQuery = 'SELECT employee_id, full_name, department FROM profiles WHERE status = \'Active\'';
    const request = pool.request();
    
    if (department && department !== 'all') {
      employeeQuery += ' AND department = @department';
      request.input('department', sql.NVarChar, department);
    }
    
    const employeesResult = await request.query(employeeQuery);
    const employees = employeesResult.recordset;
    
    // Get attendance records for the month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    
    const attendanceResult = await pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT 
          id,
          employee_id,
          CONVERT(VARCHAR, date, 23) as date,
          status,
          check_in_time,
          check_out_time,
          work_hours
        FROM attendance_records
        WHERE date >= @startDate AND date <= @endDate
      `);
    
    // Organize attendance by user and date
    const attendanceMap = {};
    attendanceResult.recordset.forEach(record => {
      if (!attendanceMap[record.employee_id]) {
        attendanceMap[record.employee_id] = {};
      }
      attendanceMap[record.employee_id][record.date] = {
        status: record.status,
        check_in_time: record.check_in_time,
        check_out_time: record.check_out_time,
        work_hours: record.work_hours,
        id: record.id
      };
    });
    
    // Combine employee and attendance data
    const result = employees.map(emp => ({
      employee_id: emp.employee_id,
      full_name: emp.full_name,
      department: emp.department,
      attendance: attendanceMap[emp.employee_id] || {}
    }));
    
    res.json(result);
  } catch (error) {
    logError(error, req, { context: 'Error fetching calendar attendance', year, month, department });
    res.status(500).json({ error: error.message });
  }
});

// Get attendance reports for export
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const pool = await getConnection();
    const result = await pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT 
          ar.id,
          e.employee_id,
          e.full_name as employee_name,
          e.department,
          CONVERT(VARCHAR, ar.date, 23) as date,
          ar.check_in_time,
          ar.check_out_time,
          ar.work_hours,
          ar.status,
          ar.notes
        FROM attendance_records ar
        JOIN profiles e ON ar.employee_id = e.employee_id
        WHERE ar.date >= @startDate AND ar.date <= @endDate
        ORDER BY ar.date DESC, e.full_name
      `);
    
    res.json(result.recordset);
  } catch (error) {
    logError(error, req, { context: 'Error fetching attendance reports', startDate, endDate });
    res.status(500).json({ error: error.message });
  }
});

// Get late patterns analytics
router.get('/analytics/late-patterns', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days, 10);
    
    const pool = await getConnection();
    
    // Get employees with most late arrivals
    const lateEmployees = await pool.request()
      .input('days', sql.Int, daysNum)
      .query(`
        SELECT TOP 10
          e.full_name,
          e.department,
          COUNT(*) as late_count,
          CAST(AVG(DATEDIFF(MINUTE, '09:00:00', CAST(ar.check_in_time AS TIME))) as INT) as avg_late_minutes
        FROM attendance_records ar
        JOIN profiles e ON ar.employee_id = e.employee_id
        WHERE ar.status = 'late' 
          AND ar.date >= DATEADD(day, -@days, GETDATE())
        GROUP BY e.full_name, e.department
        ORDER BY late_count DESC
      `);
    
    // Get late patterns by hour
    const hourlyPattern = await pool.request()
      .input('days', sql.Int, daysNum)
      .query(`
        SELECT 
          DATEPART(HOUR, check_in_time) as hour,
          COUNT(*) as count
        FROM attendance_records
        WHERE status = 'late'
          AND date >= DATEADD(day, -@days, GETDATE())
          AND check_in_time IS NOT NULL
        GROUP BY DATEPART(HOUR, check_in_time)
        ORDER BY hour
      `);
    
    // Get late patterns by day of week
    const weekdayPattern = await pool.request()
      .input('days', sql.Int, daysNum)
      .query(`
        SELECT 
          DATENAME(WEEKDAY, date) as day_name,
          DATEPART(WEEKDAY, date) as day_number,
          COUNT(*) as late_count,
          COUNT(DISTINCT employee_id) as unique_employees
        FROM attendance_records
        WHERE status = 'late'
          AND date >= DATEADD(day, -@days, GETDATE())
        GROUP BY DATENAME(WEEKDAY, date), DATEPART(WEEKDAY, date)
        ORDER BY day_number
      `);
    
    // Get department-wise late statistics
    const departmentLate = await pool.request()
      .input('days', sql.Int, daysNum)
      .query(`
        SELECT 
          e.department,
          COUNT(*) as late_count,
          COUNT(DISTINCT ar.employee_id) as employees_with_late,
          CAST(AVG(DATEDIFF(MINUTE, '09:00:00', CAST(ar.check_in_time AS TIME))) as INT) as avg_delay_minutes
        FROM attendance_records ar
        JOIN profiles e ON ar.employee_id = e.employee_id
        WHERE ar.status = 'late'
          AND ar.date >= DATEADD(day, -@days, GETDATE())
        GROUP BY e.department
        ORDER BY late_count DESC
      `);
    
    res.json({
      topLateEmployees: lateEmployees.recordset,
      hourlyPattern: hourlyPattern.recordset,
      weekdayPattern: weekdayPattern.recordset,
      departmentLate: departmentLate.recordset
    });
  } catch (error) {
    logError(error, req, { context: 'Error fetching late patterns', days: req.query.days });
    res.status(500).json({ error: error.message });
  }
});

// Get department comparison analytics
router.get('/analytics/department-comparison', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days, 10);
    
    const pool = await getConnection();
    const result = await pool.request()
      .input('days', sql.Int, daysNum)
      .query(`
        SELECT 
          e.department,
          COUNT(DISTINCT e.employee_id) as total_employees,
          COUNT(DISTINCT CASE WHEN ar.status IN ('present', 'late') THEN ar.employee_id END) as avg_present,
          COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as total_late,
          COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as total_absent,
          CAST(AVG(CASE WHEN ar.status IN ('present', 'late') THEN 100.0 ELSE 0 END) as DECIMAL(5,2)) as attendance_rate,
          CAST(AVG(ar.work_hours) as DECIMAL(5,2)) as avg_work_hours
        FROM profiles e
        LEFT JOIN attendance_records ar ON e.employee_id = ar.employee_id 
          AND ar.date >= DATEADD(day, -@days, GETDATE())
        WHERE e.status = 'Active'
        GROUP BY e.department
        ORDER BY attendance_rate DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    logError(error, req, { context: 'Error fetching department comparison', days });
    res.status(500).json({ error: error.message });
  }
});

// Get monthly attendance summary with trends
router.get('/summary/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;
    
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Check authorization
    const isHROrManager = req.user.role === 'hr' || req.user.role === 'manager';
    if (userId !== req.user.id.toString() && !isHROrManager) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const pool = await getConnection();
    
    // Get daily attendance for the month
    const dailyResult = await pool.request()
      .input('userId', sql.VarChar, userId)
      .input('month', sql.Int, targetMonth)
      .input('year', sql.Int, targetYear)
      .query(`
        SELECT 
          CAST(date AS DATE) as date,
          status,
          work_hours,
          check_in_time,
          check_out_time
        FROM attendance_records
        WHERE user_id = @userId
          AND MONTH(date) = @month
          AND YEAR(date) = @year
        ORDER BY date ASC
      `);

    // Get status breakdown
    const statusResult = await pool.request()
      .input('userId', sql.VarChar, userId)
      .input('month', sql.Int, targetMonth)
      .input('year', sql.Int, targetYear)
      .query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM attendance_records
        WHERE user_id = @userId
          AND MONTH(date) = @month
          AND YEAR(date) = @year
        GROUP BY status
      `);

    // Get average work hours per day
    const avgHoursResult = await pool.request()
      .input('userId', sql.VarChar, userId)
      .input('month', sql.Int, targetMonth)
      .input('year', sql.Int, targetYear)
      .query(`
        SELECT 
          AVG(CAST(work_hours AS FLOAT)) as avg_hours
        FROM attendance_records
        WHERE user_id = @userId
          AND MONTH(date) = @month
          AND YEAR(date) = @year
          AND work_hours IS NOT NULL
      `);

    // Get total work hours
    const totalHoursResult = await pool.request()
      .input('userId', sql.VarChar, userId)
      .input('month', sql.Int, targetMonth)
      .input('year', sql.Int, targetYear)
      .query(`
        SELECT 
          SUM(CAST(work_hours AS FLOAT)) as total_hours
        FROM attendance_records
        WHERE user_id = @userId
          AND MONTH(date) = @month
          AND YEAR(date) = @year
          AND work_hours IS NOT NULL
      `);

    // Get user info
    const userResult = await pool.request()
      .input('userId', sql.VarChar, userId)
      .query(`
        SELECT full_name, email, department, position
        FROM profiles
        WHERE id = @userId
      `);

    res.json({
      user: userResult.recordset[0],
      month: targetMonth,
      year: targetYear,
      dailyAttendance: dailyResult.recordset,
      statusBreakdown: statusResult.recordset,
      averageWorkHours: avgHoursResult.recordset[0]?.avg_hours || 0,
      totalWorkHours: totalHoursResult.recordset[0]?.total_hours || 0
    });
  } catch (error) {
    logError(error, req);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
});

module.exports = router;
