const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all reviews (for managers)
router.get('/reviews', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.query;
    
    const pool = await getConnection();
    let query = 'SELECT * FROM performance_reviews';
    const request = pool.request();
    
    if (employeeId) {
      query += ' WHERE employee_id = @employeeId';
      request.input('employeeId', sql.Int, employeeId);
    }
    
    query += ' ORDER BY review_date DESC';
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a review
router.post('/reviews', authenticateToken, async (req, res) => {
  try {
    const {
      employee_id,
      reviewer_id,
      review_period,
      overall_score,
      quality_of_work,
      communication,
      teamwork,
      time_management,
      problem_solving,
      feedback,
      status
    } = req.body;
    
    const pool = await getConnection();
    
    // Get employee and reviewer names
    const employeeResult = await pool.request()
      .input('employeeId', sql.Int, employee_id)
      .query('SELECT full_name FROM employees WHERE user_id = @employeeId');
    
    const reviewerResult = await pool.request()
      .input('reviewerId', sql.Int, reviewer_id)
      .query('SELECT full_name FROM employees WHERE user_id = @reviewerId');
    
    const employeeName = employeeResult.recordset[0]?.full_name || 'Unknown Employee';
    const reviewerName = reviewerResult.recordset[0]?.full_name || 'Unknown Reviewer';
    
    await pool.request()
      .input('employeeId', sql.Int, employee_id)
      .input('reviewerId', sql.Int, reviewer_id)
      .input('reviewPeriod', sql.NVarChar, review_period)
      .input('overallScore', sql.Decimal(3, 2), overall_score)
      .input('qualityOfWork', sql.Decimal(3, 2), quality_of_work)
      .input('communication', sql.Decimal(3, 2), communication)
      .input('teamwork', sql.Decimal(3, 2), teamwork)
      .input('timeManagement', sql.Decimal(3, 2), time_management)
      .input('problemSolving', sql.Decimal(3, 2), problem_solving)
      .input('feedback', sql.NVarChar, feedback)
      .input('status', sql.NVarChar, status || 'draft')
      .query(`
        INSERT INTO performance_reviews (
          employee_id, reviewer_id, review_period, overall_score,
          quality_of_work, communication, teamwork, time_management,
          problem_solving, feedback, status
        ) VALUES (
          @employeeId, @reviewerId, @reviewPeriod, @overallScore,
          @qualityOfWork, @communication, @teamwork, @timeManagement,
          @problemSolving, @feedback, @status
        )
      `);

    // Emit SignalR notification to employee
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${employee_id}`).emit('performanceReview', {
        employeeId: employee_id,
        employeeName,
        reviewerId: reviewer_id,
        reviewerName,
        message: `${reviewerName} has created a performance review for you`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ message: 'Review created successfully' });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get goals
router.get('/goals', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query;
    
    const pool = await getConnection();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM performance_goals WHERE user_id = @userId ORDER BY created_at DESC');

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
