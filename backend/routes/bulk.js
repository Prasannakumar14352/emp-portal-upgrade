const express = require('express');
const { body, validationResult } = require('express-validator');
const { getConnection, sql } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const JSZip = require('jszip');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/temp/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Ensure directories exist
const ensureDirectories = async () => {
  const dirs = ['uploads/temp', 'uploads/payslips'];
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {
      console.error(`Error creating directory ${dir}:`, err);
    }
  }
};
ensureDirectories();

/* ---------------------------------------------------------
   BULK USER CREATION
--------------------------------------------------------- */
router.post('/users', 
  authenticateToken, 
  authorizeRole('hr', 'manager'),
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
            .query('SELECT employee_id FROM profiles WHERE email = @email');

          if (existingUser.recordset.length > 0) {
            failedUsers.push({ email, reason: 'User already exists' });
            continue;
          }

          // Hash password if provided
          const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

          // Create profile (employee_id will be auto-generated as int identity)
          const profileResult = await transaction.request()
            .input('email', sql.NVarChar, email)
            .input('full_name', sql.NVarChar, full_name)
            .input('department', sql.NVarChar, department || null)
            .input('position', sql.NVarChar, position || null)
            .input('phone', sql.NVarChar, phone || null)
            .input('password_hash', sql.NVarChar, hashedPassword)
            .query(`
              INSERT INTO profiles (email, full_name, department, position, phone, password_hash, created_at)
              OUTPUT INSERTED.employee_id, INSERTED.email, INSERTED.full_name
              VALUES (@email, @full_name, @department, @position, @phone, @password_hash, GETDATE())
            `);

          const newProfile = profileResult.recordset[0];

          // Create employee record
          await transaction.request()
            .input('employee_id', sql.Int, newProfile.employee_id)
            .input('full_name', sql.NVarChar, full_name)
            .input('email', sql.NVarChar, email)
            .input('phone', sql.NVarChar, phone || null)
            .input('department', sql.NVarChar, department || 'Not Assigned')
            .input('position', sql.NVarChar, position || 'Employee')
            .query(`
              INSERT INTO employees (employee_id, full_name, email, phone, department, position, status, created_at)
              VALUES (@employee_id, @full_name, @email, @phone, @department, @position, 'Active', GETDATE())
            `);

          // Assign role
          const userRole = role || 'employee';
          await transaction.request()
            .input('employee_id', sql.Int, newProfile.employee_id)
            .input('role', sql.NVarChar, userRole)
            .query(`
              INSERT INTO user_roles (employee_id, role, created_at)
              VALUES (@employee_id, @role, GETDATE())
            `);

          createdUsers.push({
            employee_id: newProfile.employee_id,
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
  authorizeRole('hr', 'manager'),
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
  authorizeRole('hr', 'manager'),
  [
    body('payslips').isArray({ min: 1 }),
    body('payslips.*.employee_id').isInt(),
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
          const { employee_id, month, year, basic_salary, allowances, deductions, net_salary, file_url } = payslipData;

          // Check if user exists
          const userExists = await transaction.request()
            .input('employee_id', sql.Int, employee_id)
            .query('SELECT employee_id FROM profiles WHERE employee_id = @employee_id');

          if (userExists.recordset.length === 0) {
            failedPayslips.push({ employee_id, month, year, reason: 'User does not exist' });
            continue;
          }

          // Check if payslip already exists
          const existing = await transaction.request()
            .input('employee_id', sql.Int, employee_id)
            .input('month', sql.NVarChar, month)
            .input('year', sql.Int, year)
            .query('SELECT id FROM payslips WHERE employee_id = @employee_id AND month = @month AND year = @year');

          if (existing.recordset.length > 0) {
            failedPayslips.push({ employee_id, month, year, reason: 'Payslip already exists' });
            continue;
          }

          const result = await transaction.request()
            .input('employee_id', sql.Int, employee_id)
            .input('month', sql.NVarChar, month)
            .input('year', sql.Int, year)
            .input('basic_salary', sql.Decimal(10, 2), basic_salary)
            .input('allowances', sql.Decimal(10, 2), allowances || 0)
            .input('deductions', sql.Decimal(10, 2), deductions || 0)
            .input('net_salary', sql.Decimal(10, 2), net_salary)
            .input('file_url', sql.NVarChar, file_url || null)
            .query(`
              INSERT INTO payslips (employee_id, month, year, basic_salary, allowances, deductions, net_salary, file_url, created_at)
              OUTPUT INSERTED.*
              VALUES (@employee_id, @month, @year, @basic_salary, @allowances, @deductions, @net_salary, @file_url, GETDATE())
            `);

          createdPayslips.push(result.recordset[0]);

        } catch (payslipError) {
          console.error(`Failed to create payslip for user ${payslipData.employee_id}:`, payslipError);
          failedPayslips.push({
            employee_id: payslipData.employee_id,
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

/* ---------------------------------------------------------
   BULK PAYSLIP PDF UPLOAD (ZIP FILE)
--------------------------------------------------------- */
router.post('/payslips/zip',
  authenticateToken,
  authorizeRole('hr', 'manager'),
  upload.single('zipFile'),
  async (req, res) => {
    const pool = await getConnection();
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No ZIP file provided' });
      }

      const zipBuffer = await fs.readFile(req.file.path);
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipBuffer);

      // Get all PDF files
      const pdfFiles = Object.keys(zipContent.files).filter(
        name => name.toLowerCase().endsWith('.pdf') && !zipContent.files[name].dir
      );

      if (pdfFiles.length === 0) {
        await fs.unlink(req.file.path);
        return res.status(400).json({ error: 'No PDF files found in ZIP' });
      }

      // Get all employees
      const employeesResult = await pool.request()
        .query('SELECT employee_id, full_name, email FROM profiles');
      const employees = employeesResult.recordset;

      let successCount = 0;
      let failedCount = 0;
      const failures = [];
      const uploadedPayslips = [];

      // Process each PDF
      for (const fileName of pdfFiles) {
        try {
          // Parse filename: "IST Salary Slip Month Of Apr-2024_Singamsetty Prasanna Kumar.pdf"
          const match = fileName.match(/Month Of (.+?)-(\d{4})_(.+)\.pdf/i);
          
          if (!match) {
            failures.push({ fileName, reason: 'Invalid filename format' });
            failedCount++;
            continue;
          }

          const [, monthStr, yearStr, employeeName] = match;
          const month = monthStr.trim();
          const year = parseInt(yearStr);
          const name = employeeName.trim();

          // Find employee by name (case-insensitive)
          const employee = employees.find(
            e => e.full_name.toLowerCase() === name.toLowerCase()
          );

          if (!employee) {
            failures.push({ fileName, reason: `Employee "${name}" not found` });
            failedCount++;
            continue;
          }

          // Get PDF buffer
          const pdfBuffer = await zipContent.files[fileName].async('nodebuffer');
          
          // Save PDF to local storage
          const employeeDir = path.join('uploads/payslips', employee.employee_id.toString());
          await fs.mkdir(employeeDir, { recursive: true });
          
          const pdfFileName = `${year}-${month}.pdf`;
          const pdfPath = path.join(employeeDir, pdfFileName);
          await fs.writeFile(pdfPath, pdfBuffer);

          // Create file URL (relative path)
          const fileUrl = `/uploads/payslips/${employee.employee_id}/${pdfFileName}`;

          // Check if payslip exists
          const existingPayslip = await pool.request()
            .input('employee_id', sql.Int, employee.employee_id)
            .input('month', sql.NVarChar, month)
            .input('year', sql.Int, year)
            .query('SELECT id FROM payslips WHERE employee_id = @employee_id AND month = @month AND year = @year');

          if (existingPayslip.recordset.length > 0) {
            // Update existing payslip
            await pool.request()
              .input('id', sql.Int, existingPayslip.recordset[0].id)
              .input('file_url', sql.NVarChar, fileUrl)
              .query('UPDATE payslips SET file_url = @file_url WHERE id = @id');
          } else {
            // Create new payslip record with default values
            await pool.request()
              .input('employee_id', sql.Int, employee.employee_id)
              .input('month', sql.NVarChar, month)
              .input('year', sql.Int, year)
              .input('basic_salary', sql.Decimal(10, 2), 0)
              .input('allowances', sql.Decimal(10, 2), 0)
              .input('deductions', sql.Decimal(10, 2), 0)
              .input('net_salary', sql.Decimal(10, 2), 0)
              .input('file_url', sql.NVarChar, fileUrl)
              .query(`
                INSERT INTO payslips (employee_id, month, year, basic_salary, allowances, deductions, net_salary, file_url, created_at)
                VALUES (@employee_id, @month, @year, @basic_salary, @allowances, @deductions, @net_salary, @file_url, GETDATE())
              `);
          }

          successCount++;
          uploadedPayslips.push({ 
            employeeId: employee.employee_id,
            email: employee.email,
            month, 
            year 
          });

        } catch (error) {
          console.error(`Error processing ${fileName}:`, error);
          failures.push({ fileName, reason: error.message });
          failedCount++;
        }
      }

      // Clean up temp ZIP file
      await fs.unlink(req.file.path);

      res.status(200).json({
        success: true,
        uploaded: successCount,
        failed: failedCount,
        uploadedPayslips,
        failures
      });

    } catch (err) {
      console.error('Bulk payslip ZIP upload error:', err);
      // Clean up temp file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkErr) {
          console.error('Error deleting temp file:', unlinkErr);
        }
      }
      res.status(500).json({ error: 'Failed to process ZIP file', details: err.message });
    }
  }
);

module.exports = router;
