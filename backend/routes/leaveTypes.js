const express = require('express');
const { body, validationResult } = require('express-validator');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

/* ---------------------------------------------------------
   GET ALL LEAVE TYPES
--------------------------------------------------------- */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query('SELECT * FROM leave_types ORDER BY name');
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Get leave types error:', err);
    res.status(500).json({ error: 'Failed to fetch leave types' });
  }
});

/* ---------------------------------------------------------
   GET ACTIVE LEAVE TYPES
--------------------------------------------------------- */
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query('SELECT * FROM leave_types WHERE is_active = 1 ORDER BY name');
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Get active leave types error:', err);
    res.status(500).json({ error: 'Failed to fetch active leave types' });
  }
});

/* ---------------------------------------------------------
   GET LEAVE TYPE BY ID
--------------------------------------------------------- */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT * FROM leave_types WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Leave type not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Get leave type error:', err);
    res.status(500).json({ error: 'Failed to fetch leave type' });
  }
});

/* ---------------------------------------------------------
   CREATE LEAVE TYPE (HR/Manager only)
--------------------------------------------------------- */
router.post('/',
  authenticateToken,
  authorizeRole('hr', 'manager'),
  [
    body('name').trim().isLength({ min: 1, max: 255 }),
    body('default_days').isInt({ min: 0 }),
    body('description').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, default_days, description } = req.body;
      const pool = await getConnection();
      
      // Check if leave type with same name exists
      const existing = await pool.request()
        .input('name', sql.NVarChar, name)
        .query('SELECT id FROM leave_types WHERE name = @name');
      
      if (existing.recordset.length > 0) {
        return res.status(400).json({ error: 'Leave type with this name already exists' });
      }

      const result = await pool.request()
        .input('name', sql.NVarChar, name)
        .input('default_days', sql.Int, default_days)
        .input('description', sql.NVarChar, description || null)
        .query(`
          INSERT INTO leave_types (name, default_days, description, is_active, created_at)
          OUTPUT INSERTED.*
          VALUES (@name, @default_days, @description, 1, GETDATE())
        `);

      res.status(201).json(result.recordset[0]);
    } catch (err) {
      console.error('Create leave type error:', err);
      res.status(500).json({ error: 'Failed to create leave type' });
    }
  }
);

/* ---------------------------------------------------------
   UPDATE LEAVE TYPE (HR/Manager only)
--------------------------------------------------------- */
router.patch('/:id',
  authenticateToken,
  authorizeRole('hr', 'manager'),
  [
    body('name').optional().trim().isLength({ min: 1, max: 255 }),
    body('default_days').optional().isInt({ min: 0 }),
    body('description').optional().trim(),
    body('is_active').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, default_days, description, is_active } = req.body;
      const pool = await getConnection();
      
      // Check if leave type exists
      const existing = await pool.request()
        .input('id', sql.Int, parseInt(id))
        .query('SELECT id FROM leave_types WHERE id = @id');
      
      if (existing.recordset.length === 0) {
        return res.status(404).json({ error: 'Leave type not found' });
      }

      const result = await pool.request()
        .input('id', sql.Int, parseInt(id))
        .input('name', sql.NVarChar, name)
        .input('default_days', sql.Int, default_days)
        .input('description', sql.NVarChar, description)
        .input('is_active', sql.Bit, is_active !== undefined ? (is_active ? 1 : 0) : undefined)
        .query(`
          UPDATE leave_types
          SET 
            name = COALESCE(@name, name),
            default_days = COALESCE(@default_days, default_days),
            description = COALESCE(@description, description),
            is_active = COALESCE(@is_active, is_active),
            updated_at = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

      res.json(result.recordset[0]);
    } catch (err) {
      console.error('Update leave type error:', err);
      res.status(500).json({ error: 'Failed to update leave type' });
    }
  }
);

/* ---------------------------------------------------------
   DELETE LEAVE TYPE (HR/Manager only)
--------------------------------------------------------- */
router.delete('/:id',
  authenticateToken,
  authorizeRole('hr', 'manager'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const pool = await getConnection();
      
      // Check if leave type is being used
      const inUse = await pool.request()
        .input('leave_type_id', sql.Int, parseInt(id))
        .query(`
          SELECT COUNT(*) as count 
          FROM leaves 
          WHERE leave_type = (SELECT name FROM leave_types WHERE id = @leave_type_id)
        `);
      
      if (inUse.recordset[0].count > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete leave type that is being used in leave requests' 
        });
      }

      const result = await pool.request()
        .input('id', sql.Int, parseInt(id))
        .query('DELETE FROM leave_types WHERE id = @id');
      
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ error: 'Leave type not found' });
      }

      res.json({ message: 'Leave type deleted successfully' });
    } catch (err) {
      console.error('Delete leave type error:', err);
      res.status(500).json({ error: 'Failed to delete leave type' });
    }
  }
);

module.exports = router;
