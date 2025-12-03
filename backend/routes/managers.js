const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/managers - Get all managers
router.get('/', authenticateToken, async (req, res) => {
  try {
    logger.process.start('Get All Managers');

    const pool = await getConnection();
    const result = await pool.request()
      .query(`
        SELECT DISTINCT p.employee_id, p.full_name, p.email, p.department, p.position
        FROM profiles p
        JOIN user_roles ur ON p.employee_id = ur.employee_id
        WHERE ur.role = 'manager'
        ORDER BY p.full_name
      `);

    logger.process.success('Get All Managers', { count: result.recordset.length });

    res.json(result.recordset);
  } catch (err) {
    logger.process.error('Get All Managers', err);
    res.status(500).json({ error: 'Failed to fetch managers' });
  }
});

module.exports = router;
