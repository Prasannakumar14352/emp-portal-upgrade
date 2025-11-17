const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/managers - Get all managers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query(`
        SELECT DISTINCT p.id, p.full_name, p.email, p.department, p.position
        FROM profiles p
        JOIN user_roles ur ON p.id = ur.user_id
        WHERE ur.role = 'manager'
        ORDER BY p.full_name
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Get managers error:', err);
    res.status(500).json({ error: 'Failed to fetch managers' });
  }
});

module.exports = router;
