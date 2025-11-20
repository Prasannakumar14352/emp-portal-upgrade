const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/statistics/employee/:userId - Get detailed employee statistics
router.get('/employee/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Users can only view their own stats unless HR/manager
    if (req.user.id !== userId && !['hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const pool = await getConnection();
    
    // Get leave statistics
    const leaveStats = await pool.request()
      .input('employee_id', sql.Int, userId)
      .input('year', sql.Int, new Date().getFullYear())
      .query(`
        SELECT 
          COUNT(*) as total_leaves,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_leaves,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved_leaves,
          SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected_leaves,
          SUM(CASE WHEN status = 'Approved' THEN days ELSE 0 END) as total_days_taken
        FROM leaves
        WHERE employee_id = @employee_id AND YEAR(created_at) = @year
      `);

    // Get leave balance summary
    const balanceStats = await pool.request()
      .input('employee_id', sql.Int, userId)
      .input('year', sql.Int, new Date().getFullYear())
      .query(`
        SELECT 
          SUM(total_days) as total_allocated,
          SUM(used_days) as total_used,
          SUM(remaining_days) as total_remaining,
          SUM(carry_forward_days) as total_carry_forward
        FROM leave_balances
        WHERE employee_id = @employee_id AND year = @year
      `);

    // Get leave type breakdown
    const leaveTypeBreakdown = await pool.request()
      .input('employee_id', sql.Int, userId)
      .input('year', sql.Int, new Date().getFullYear())
      .query(`
        SELECT 
          leave_type,
          COUNT(*) as count,
          SUM(days) as total_days
        FROM leaves
        WHERE employee_id = @employee_id AND YEAR(created_at) = @year AND status = 'Approved'
        GROUP BY leave_type
      `);

    // Get monthly leave trends
    const monthlyTrends = await pool.request()
      .input('employee_id', sql.Int, userId)
      .input('year', sql.Int, new Date().getFullYear())
      .query(`
        SELECT 
          MONTH(start_date) as month,
          DATENAME(MONTH, start_date) as month_name,
          COUNT(*) as leave_count,
          SUM(days) as days_taken
        FROM leaves
        WHERE employee_id = @employee_id AND YEAR(start_date) = @year AND status = 'Approved'
        GROUP BY MONTH(start_date), DATENAME(MONTH, start_date)
        ORDER BY MONTH(start_date)
      `);

    res.json({
      leave_stats: leaveStats.recordset[0],
      balance_stats: balanceStats.recordset[0],
      leave_type_breakdown: leaveTypeBreakdown.recordset,
      monthly_trends: monthlyTrends.recordset,
    });
  } catch (err) {
    console.error('Get employee statistics error:', err);
    res.status(500).json({ error: 'Failed to get employee statistics' });
  }
});

// GET /api/statistics/attendance/:userId - Get attendance statistics
router.get('/attendance/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Users can only view their own attendance unless HR/manager
    if (req.user.id !== userId && !['hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const pool = await getConnection();
    
    // Calculate working days (excluding weekends and holidays)
    const workingDaysQuery = `
      WITH DateRange AS (
        SELECT CAST(@start_date AS DATE) as date
        UNION ALL
        SELECT DATEADD(day, 1, date)
        FROM DateRange
        WHERE date < @end_date
      )
      SELECT COUNT(*) as working_days
      FROM DateRange
      WHERE DATEPART(WEEKDAY, date) NOT IN (1, 7) -- Exclude Saturday and Sunday
        AND date NOT IN (SELECT date FROM holidays)
      OPTION (MAXRECURSION 0)
    `;

    const workingDaysResult = await pool.request()
      .input('start_date', sql.Date, startDate || new Date(new Date().getFullYear(), 0, 1))
      .input('end_date', sql.Date, endDate || new Date())
      .query(workingDaysQuery);

    // Get leave days taken
    const leaveDaysResult = await pool.request()
      .input('employee_id', sql.Int, userId)
      .input('start_date', sql.Date, startDate || new Date(new Date().getFullYear(), 0, 1))
      .input('end_date', sql.Date, endDate || new Date())
      .query(`
        SELECT 
          SUM(days) as leave_days,
          COUNT(*) as leave_count
        FROM leaves
        WHERE employee_id = @employee_id 
          AND status = 'Approved'
          AND start_date >= @start_date 
          AND end_date <= @end_date
      `);

    const workingDays = workingDaysResult.recordset[0].working_days || 0;
    const leaveDays = leaveDaysResult.recordset[0].leave_days || 0;
    const presentDays = workingDays - leaveDays;
    const attendanceRate = workingDays > 0 ? ((presentDays / workingDays) * 100).toFixed(2) : 0;

    res.json({
      total_working_days: workingDays,
      present_days: presentDays,
      leave_days: leaveDays,
      leave_count: leaveDaysResult.recordset[0].leave_count || 0,
      attendance_rate: parseFloat(attendanceRate),
      period: {
        start_date: startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        end_date: endDate || new Date().toISOString().split('T')[0]
      }
    });
  } catch (err) {
    console.error('Get attendance statistics error:', err);
    res.status(500).json({ error: 'Failed to get attendance statistics' });
  }
});

// GET /api/statistics/team - Get team statistics (HR/Manager only)
router.get('/team', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { department } = req.query;
    const pool = await getConnection();
    
    let departmentFilter = '';
    if (department) {
      departmentFilter = 'WHERE e.department = @department';
    }

    // Get team overview
    const teamOverview = await pool.request()
      .input('department', sql.NVarChar, department || '')
      .input('year', sql.Int, new Date().getFullYear())
      .query(`
        SELECT 
          COUNT(DISTINCT e.id) as total_employees,
          COUNT(DISTINCT CASE WHEN e.status = 'Active' THEN e.id END) as active_employees,
          COUNT(DISTINCT l.id) as total_leave_requests,
          SUM(CASE WHEN l.status = 'Pending' THEN 1 ELSE 0 END) as pending_requests,
          AVG(CASE WHEN l.status = 'Approved' THEN l.days ELSE NULL END) as avg_leave_days
        FROM employees e
        LEFT JOIN leaves l ON e.employee_id = l.employee_id AND YEAR(l.created_at) = @year
        ${departmentFilter}
      `);

    // Get department-wise breakdown
    const departmentBreakdown = await pool.request()
      .input('year', sql.Int, new Date().getFullYear())
      .query(`
        SELECT 
          e.department,
          COUNT(DISTINCT e.id) as employee_count,
          COUNT(l.id) as leave_count,
          SUM(CASE WHEN l.status = 'Approved' THEN l.days ELSE 0 END) as total_leave_days
        FROM employees e
        LEFT JOIN leaves l ON e.employee_id = l.employee_id AND YEAR(l.created_at) = @year
        GROUP BY e.department
        ORDER BY employee_count DESC
      `);

    // Get top leave takers
    const topLeaveTakers = await pool.request()
      .input('department', sql.NVarChar, department || '')
      .input('year', sql.Int, new Date().getFullYear())
      .query(`
        SELECT TOP 10
          e.full_name,
          e.department,
          e.position,
          COUNT(l.id) as leave_count,
          SUM(l.days) as total_days
        FROM employees e
        INNER JOIN leaves l ON e.employee_id = l.employee_id
        WHERE l.status = 'Approved' 
          AND YEAR(l.created_at) = @year
          ${department ? 'AND e.department = @department' : ''}
        GROUP BY e.full_name, e.department, e.position
        ORDER BY total_days DESC
      `);

    res.json({
      overview: teamOverview.recordset[0],
      department_breakdown: departmentBreakdown.recordset,
      top_leave_takers: topLeaveTakers.recordset,
    });
  } catch (err) {
    console.error('Get team statistics error:', err);
    res.status(500).json({ error: 'Failed to get team statistics' });
  }
});

// GET /api/statistics/utilization - Get leave utilization rates (HR/Manager only)
router.get('/utilization', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const pool = await getConnection();
    const year = new Date().getFullYear();
    
    // Get leave utilization by type
    const utilizationByType = await pool.request()
      .input('year', sql.Int, year)
      .query(`
        SELECT 
          lb.leave_type,
          SUM(lb.total_days) as allocated,
          SUM(lb.used_days) as utilized,
          SUM(lb.remaining_days) as remaining,
          CAST(
            CASE 
              WHEN SUM(lb.total_days) > 0 
              THEN (SUM(lb.used_days) * 100.0 / SUM(lb.total_days))
              ELSE 0 
            END AS DECIMAL(5,2)
          ) as utilization_rate
        FROM leave_balances lb
        WHERE lb.year = @year
        GROUP BY lb.leave_type
        ORDER BY utilization_rate DESC
      `);

    // Get monthly utilization trend
    const monthlyUtilization = await pool.request()
      .input('year', sql.Int, year)
      .query(`
        SELECT 
          MONTH(l.start_date) as month,
          DATENAME(MONTH, l.start_date) as month_name,
          COUNT(DISTINCT l.employee_id) as employees_on_leave,
          SUM(l.days) as total_days_used
        FROM leaves l
        WHERE YEAR(l.start_date) = @year AND l.status = 'Approved'
        GROUP BY MONTH(l.start_date), DATENAME(MONTH, l.start_date)
        ORDER BY month
      `);

    res.json({
      utilization_by_type: utilizationByType.recordset,
      monthly_utilization: monthlyUtilization.recordset,
    });
  } catch (err) {
    console.error('Get utilization statistics error:', err);
    res.status(500).json({ error: 'Failed to get utilization statistics' });
  }
});

module.exports = router;
