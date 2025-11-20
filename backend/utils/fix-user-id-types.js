#!/usr/bin/env node
/**
 * Script to replace sql.Int with sql.NVarChar for employee_id parameters
 * This is needed because we migrated from integer IDs to UUID-based employee_ids from Supabase
 */

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'routes/bulk.js',
  'routes/employees.js',
  'routes/leaves.js',
  'routes/payslips.js',
  'routes/sessions.js',
  'routes/statistics.js',
  'routes/twoFactor.js',
  'routes/passwordReset.js',
  'utils/emailHelper.js'
];

const replacements = [
  {
    from: /\.input\('employee_id',\s*sql\.Int,/g,
    to: ".input('employee_id', sql.NVarChar,"
  },
  {
    from: /\.input\('userId',\s*sql\.Int,/g,
    to: ".input('userId', sql.NVarChar,"
  }
];

console.log('Starting employee_id type migration from sql.Int to sql.NVarChar...\n');

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    replacements.forEach(replacement => {
      const matches = content.match(replacement.from);
      if (matches) {
        content = content.replace(replacement.from, replacement.to);
        modified = true;
        console.log(`✓ Updated ${matches.length} occurrence(s) in ${file}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  File saved: ${file}\n`);
    } else {
      console.log(`- No changes needed in ${file}\n`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${file}:`, error.message);
  }
});

console.log('Migration completed!');
