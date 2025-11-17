const express = require('express');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/holidays - Get all holidays
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { year } = req.query;
    const pool = await getConnection();
    
    let query = `
      SELECT id, name, date, type, description, created_at
      FROM holidays
    `;
    
    const request = pool.request();
    
    if (year) {
      query += ' WHERE YEAR(date) = @year';
      request.input('year', sql.Int, parseInt(year));
    }
    
    query += ' ORDER BY date';
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get holidays error:', err);
    res.status(500).json({ error: 'Failed to get holidays' });
  }
});

// GET /api/holidays/upcoming - Get upcoming holidays
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const { limit } = req.query;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('limit', sql.Int, parseInt(limit) || 5)
      .query(`
        SELECT TOP (@limit) id, name, date, type, description
        FROM holidays
        WHERE date >= CAST(GETDATE() AS DATE)
        ORDER BY date
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get upcoming holidays error:', err);
    res.status(500).json({ error: 'Failed to get upcoming holidays' });
  }
});

// GET /api/holidays/:id - Get holiday by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM holidays WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Get holiday error:', err);
    res.status(500).json({ error: 'Failed to get holiday' });
  }
});

// POST /api/holidays - Create new holiday (HR/Manager only)
router.post('/', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { name, date, type, description } = req.body;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('date', sql.Date, date)
      .input('type', sql.NVarChar, type)
      .input('description', sql.NVarChar, description)
      .query(`
        INSERT INTO holidays (name, date, type, description, created_at)
        OUTPUT INSERTED.*
        VALUES (@name, @date, @type, @description, GETDATE())
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('Create holiday error:', err);
    res.status(500).json({ error: 'Failed to create holiday' });
  }
});

// PATCH /api/holidays/:id - Update holiday (HR/Manager only)
router.patch('/:id', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, type, description } = req.body;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .input('date', sql.Date, date)
      .input('type', sql.NVarChar, type)
      .input('description', sql.NVarChar, description)
      .query(`
        UPDATE holidays
        SET 
          name = COALESCE(@name, name),
          date = COALESCE(@date, date),
          type = COALESCE(@type, type),
          description = COALESCE(@description, description)
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Update holiday error:', err);
    res.status(500).json({ error: 'Failed to update holiday' });
  }
});

// DELETE /api/holidays/:id - Delete holiday (HR/Manager only)
router.delete('/:id', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM holidays WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    res.json({ message: 'Holiday deleted successfully' });
  } catch (err) {
    console.error('Delete holiday error:', err);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

module.exports = router;
