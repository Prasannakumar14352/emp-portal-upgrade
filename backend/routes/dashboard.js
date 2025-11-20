const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/employee/:userId - Get employee dashboard stats
router.get('/employee/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);
    
    // Users can only view their own dashboard unless HR/manager
    if (parseInt(req.user.id) !== userIdInt && !['hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const pool = await getConnection();
    
    // Get leave balance
    const leaveBalanceResult = await pool.request()
      .input('user_id', sql.Int, userIdInt)
      .input('year', sql.Int, new Date().getFullYear())
      .query(`
        SELECT SUM(remaining_days) as leave_balance
        FROM leave_balances
        WHERE user_id = @user_id AND year = @year
      `);
    
    // Get pending approvals count
    const pendingResult = await pool.request()
      .input('user_id', sql.Int, userIdInt)
      .query(`
        SELECT COUNT(*) as pending_count
        FROM leaves
        WHERE user_id = @user_id AND status = 'Pending'
      `);
    
    // Get payslips count
    const payslipsResult = await pool.request()
      .input('user_id', sql.Int, userIdInt)
      .query(`
        SELECT COUNT(*) as payslips_count
        FROM payslips
        WHERE user_id = @user_id
      `);

    const stats = {
      leave_balance: leaveBalanceResult.recordset[0]?.leave_balance || 0,
      pending_approvals: pendingResult.recordset[0]?.pending_count || 0,
      payslips_count: payslipsResult.recordset[0]?.payslips_count || 0,
      attendance_rate: 95, // This would need a proper calculation based on attendance data
    };

    res.json(stats);
  } catch (err) {
    console.error('Get employee dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// GET /api/dashboard/hr/stats - Get HR dashboard stats
router.get('/hr/stats', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .query(`
        SELECT 
          COUNT(*) as total_requests,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_requests,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved_requests,
          SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected_requests
        FROM leaves
      `);

    const stats = result.recordset[0];
    const approved = stats.approved_requests || 0;
    const rejected = stats.rejected_requests || 0;
    const approvalRate = (approved + rejected) > 0 
      ? Math.round((approved / (approved + rejected)) * 100) 
      : 0;

    res.json({
      total_requests: stats.total_requests || 0,
      pending_requests: stats.pending_requests || 0,
      approved_requests: approved,
      rejected_requests: rejected,
      approval_rate: approvalRate,
    });
  } catch (err) {
    console.error('Get HR dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to get HR dashboard stats' });
  }
});

// GET /api/dashboard/hr/trends - Get monthly leave trends
router.get('/hr/trends', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();
    
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('year', sql.Int, targetYear)
      .query(`
        SELECT 
          DATENAME(MONTH, created_at) as month,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected
        FROM leaves
        WHERE YEAR(created_at) = @year
        GROUP BY MONTH(created_at), DATENAME(MONTH, created_at)
        ORDER BY MONTH(created_at)
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get monthly trends error:', err);
    res.status(500).json({ error: 'Failed to get monthly trends' });
  }
});

// GET /api/dashboard/hr/leave-types - Get leave type distribution
router.get('/hr/leave-types', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();
    
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('year', sql.Int, targetYear)
      .query(`
        SELECT 
          leave_type as name,
          COUNT(*) as value
        FROM leaves
        WHERE YEAR(created_at) = @year
        GROUP BY leave_type
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get leave type distribution error:', err);
    res.status(500).json({ error: 'Failed to get leave type distribution' });
  }
});

module.exports = router;
