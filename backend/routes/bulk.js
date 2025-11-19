const express = require('express');
const { body, validationResult } = require('express-validator');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const bcrypt = require('bcrypt');

const router = express.Router();

/* ---------------------------------------------------------
   BULK USER CREATION
--------------------------------------------------------- */
router.post('/users', 
  authenticateToken, 
  authorizeRole('hr', 'manager', 'employee'),
  [
    body('users').isArray({ min: 1 }),
    body('users.*.email').isEmail().normalizeEmail(),
    body('users.*.full_name').trim().isLength({ min: 1, max: 100 }),
    body('users.*.department').optional().trim(),
    body('users.*.position').optional().trim(),
    body('users.*.phone').optional().trim(),
    body('users.*.role').optional().isIn(['employee', 'hr', 'manager'])
  ],
  async (req, res) => {
    const pool = await getConnection();
    const transaction = pool.transaction();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { users } = req.body;
      const createdUsers = [];
      const failedUsers = [];

      await transaction.begin();

      for (const userData of users) {
        try {
          const { email, full_name, department, position, phone, role, password } = userData;
          
          // Check if user exists
          const existingUser = await transaction.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT user_id FROM profiles WHERE email = @email');

          if (existingUser.recordset.length > 0) {
            failedUsers.push({ email, reason: 'User already exists' });
            continue;
          }

          // Hash password if provided
          const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

          // Create profile (user_id will be auto-generated as int identity)
          const profileResult = await transaction.request()
            .input('email', sql.NVarChar, email)
            .input('full_name', sql.NVarChar, full_name)
            .input('department', sql.NVarChar, department || null)
            .input('position', sql.NVarChar, position || null)
            .input('phone', sql.NVarChar, phone || null)
            .input('password_hash', sql.NVarChar, hashedPassword)
            .query(`
              INSERT INTO profiles (email, full_name, department, position, phone, password_hash, created_at)
              OUTPUT INSERTED.id, INSERTED.user_id, INSERTED.email, INSERTED.full_name
              VALUES (@email, @full_name, @department, @position, @phone, @password_hash, GETDATE())
            `);

          const newProfile = profileResult.recordset[0];

          // Create employee record
          await transaction.request()
            .input('user_id', sql.Int, newProfile.user_id)
            .input('full_name', sql.NVarChar, full_name)
            .input('email', sql.NVarChar, email)
            .input('phone', sql.NVarChar, phone || null)
            .input('department', sql.NVarChar, department || 'Not Assigned')
            .input('position', sql.NVarChar, position || 'Employee')
            .query(`
              INSERT INTO employees (user_id, full_name, email, phone, department, position, status, created_at)
              VALUES (@user_id, @full_name, @email, @phone, @department, @position, 'Active', GETDATE())
            `);

          // Assign role
          const userRole = role || 'employee';
          await transaction.request()
            .input('user_id', sql.Int, newProfile.user_id)
            .input('role', sql.NVarChar, userRole)
            .query(`
              INSERT INTO user_roles (user_id, role, created_at)
              VALUES (@user_id, @role, GETDATE())
            `);

          createdUsers.push({
            id: newProfile.id,
            email: newProfile.email,
            full_name: newProfile.full_name,
            role: userRole
          });

        } catch (userError) {
          console.error(`Failed to create user ${userData.email}:`, userError);
          failedUsers.push({ 
            email: userData.email, 
            reason: userError.message 
          });
        }
      }

      await transaction.commit();

      res.status(201).json({
        success: true,
        created: createdUsers.length,
        failed: failedUsers.length,
        createdUsers,
        failedUsers
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Bulk user creation error:', err);
      res.status(500).json({ error: 'Failed to create users', details: err.message });
    }
  }
);

/* ---------------------------------------------------------
   BULK HOLIDAY CREATION
--------------------------------------------------------- */
router.post('/holidays',
  authenticateToken,
  authorizeRole('hr', 'manager', 'employee'),
  [
    body('holidays').isArray({ min: 1 }),
    body('holidays.*.name').trim().isLength({ min: 1 }),
    body('holidays.*.date').isISO8601(),
    body('holidays.*.type').trim().isLength({ min: 1 }),
    body('holidays.*.description').optional().trim()
  ],
  async (req, res) => {
    const pool = await getConnection();
    const transaction = pool.transaction();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { holidays } = req.body;
      const createdHolidays = [];
      const failedHolidays = [];

      await transaction.begin();

      for (const holidayData of holidays) {
        try {
          const { name, date, type, description } = holidayData;

          // Check if holiday already exists for that date
          const existing = await transaction.request()
            .input('date', sql.Date, date)
            .query('SELECT id FROM holidays WHERE date = @date');

          if (existing.recordset.length > 0) {
            failedHolidays.push({ name, date, reason: 'Holiday already exists on this date' });
            continue;
          }

          const result = await transaction.request()
            .input('name', sql.NVarChar, name)
            .input('date', sql.Date, date)
            .input('type', sql.NVarChar, type)
            .input('description', sql.NVarChar, description || null)
            .query(`
              INSERT INTO holidays (name, date, type, description, created_at)
              OUTPUT INSERTED.*
              VALUES (@name, @date, @type, @description, GETDATE())
            `);

          createdHolidays.push(result.recordset[0]);

        } catch (holidayError) {
          console.error(`Failed to create holiday ${holidayData.name}:`, holidayError);
          failedHolidays.push({
            name: holidayData.name,
            date: holidayData.date,
            reason: holidayError.message
          });
        }
      }

      await transaction.commit();

      res.status(201).json({
        success: true,
        created: createdHolidays.length,
        failed: failedHolidays.length,
        createdHolidays,
        failedHolidays
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Bulk holiday creation error:', err);
      res.status(500).json({ error: 'Failed to create holidays', details: err.message });
    }
  }
);

/* ---------------------------------------------------------
   BULK PAYSLIP CREATION
--------------------------------------------------------- */
router.post('/payslips',
  authenticateToken,
  authorizeRole('hr', 'manager', 'employee'),
  [
    body('payslips').isArray({ min: 1 }),
    body('payslips.*.user_id').isInt(),
    body('payslips.*.month').trim().isLength({ min: 1 }),
    body('payslips.*.year').isInt({ min: 2020, max: 2100 }),
    body('payslips.*.basic_salary').isFloat({ min: 0 }),
    body('payslips.*.allowances').optional().isFloat({ min: 0 }),
    body('payslips.*.deductions').optional().isFloat({ min: 0 }),
    body('payslips.*.net_salary').isFloat({ min: 0 }),
    body('payslips.*.file_url').optional().trim()
  ],
  async (req, res) => {
    const pool = await getConnection();
    const transaction = pool.transaction();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { payslips } = req.body;
      const createdPayslips = [];
      const failedPayslips = [];

      await transaction.begin();

      for (const payslipData of payslips) {
        try {
          const { user_id, month, year, basic_salary, allowances, deductions, net_salary, file_url } = payslipData;

          // Check if user exists
          const userExists = await transaction.request()
            .input('user_id', sql.Int, user_id)
            .query('SELECT id FROM profiles WHERE id = @user_id');

          if (userExists.recordset.length === 0) {
            failedPayslips.push({ user_id, month, year, reason: 'User does not exist' });
            continue;
          }

          // Check if payslip already exists
          const existing = await transaction.request()
            .input('user_id', sql.Int, user_id)
            .input('month', sql.NVarChar, month)
            .input('year', sql.Int, year)
            .query('SELECT id FROM payslips WHERE user_id = @user_id AND month = @month AND year = @year');

          if (existing.recordset.length > 0) {
            failedPayslips.push({ user_id, month, year, reason: 'Payslip already exists' });
            continue;
          }

          const result = await transaction.request()
            .input('user_id', sql.Int, user_id)
            .input('month', sql.NVarChar, month)
            .input('year', sql.Int, year)
            .input('basic_salary', sql.Decimal(10, 2), basic_salary)
            .input('allowances', sql.Decimal(10, 2), allowances || 0)
            .input('deductions', sql.Decimal(10, 2), deductions || 0)
            .input('net_salary', sql.Decimal(10, 2), net_salary)
            .input('file_url', sql.NVarChar, file_url || null)
            .query(`
              INSERT INTO payslips (user_id, month, year, basic_salary, allowances, deductions, net_salary, file_url, created_at)
              OUTPUT INSERTED.*
              VALUES (@user_id, @month, @year, @basic_salary, @allowances, @deductions, @net_salary, @file_url, GETDATE())
            `);

          createdPayslips.push(result.recordset[0]);

        } catch (payslipError) {
          console.error(`Failed to create payslip for user ${payslipData.user_id}:`, payslipError);
          failedPayslips.push({
            user_id: payslipData.user_id,
            month: payslipData.month,
            year: payslipData.year,
            reason: payslipError.message
          });
        }
      }

      await transaction.commit();

      res.status(201).json({
        success: true,
        created: createdPayslips.length,
        failed: failedPayslips.length,
        createdPayslips,
        failedPayslips
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Bulk payslip creation error:', err);
      res.status(500).json({ error: 'Failed to create payslips', details: err.message });
    }
  }
);

module.exports = router;
