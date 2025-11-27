const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Validates network share connectivity and permissions
 * @param {string} sharePath - Path to the network share
 * @returns {Promise<{isValid: boolean, message: string, details: object}>}
 */
async function validateNetworkShare(sharePath) {
  const validation = {
    isValid: false,
    message: '',
    details: {
      exists: false,
      readable: false,
      writable: false,
      path: sharePath,
      platform: os.platform()
    }
  };

  try {
    // Check if path is configured
    if (!sharePath || sharePath.trim() === '') {
      validation.message = 'Network share path is not configured';
      return validation;
    }

    // Normalize path for platform
    const normalizedPath = path.normalize(sharePath);
    validation.details.normalizedPath = normalizedPath;

    // Check if path exists
    try {
      const stats = await fs.stat(normalizedPath);
      validation.details.exists = true;
      validation.details.isDirectory = stats.isDirectory();

      if (!stats.isDirectory()) {
        validation.message = 'Network share path exists but is not a directory';
        return validation;
      }
    } catch (err) {
      validation.message = `Network share path does not exist or is not accessible: ${err.message}`;
      validation.details.error = err.code;
      return validation;
    }

    // Test read permissions
    try {
      await fs.access(normalizedPath, fs.constants.R_OK);
      validation.details.readable = true;
    } catch (err) {
      validation.message = 'Network share is not readable. Check permissions.';
      validation.details.readError = err.message;
      return validation;
    }

    // Test write permissions by creating a test file
    const testFileName = `.write-test-${Date.now()}.tmp`;
    const testFilePath = path.join(normalizedPath, testFileName);
    
    try {
      // Write test
      await fs.writeFile(testFilePath, 'test', 'utf8');
      validation.details.writable = true;

      // Read test
      const content = await fs.readFile(testFilePath, 'utf8');
      validation.details.readTestPassed = (content === 'test');

      // Cleanup test file
      await fs.unlink(testFilePath);
      validation.details.cleanupSuccessful = true;

    } catch (err) {
      validation.message = 'Network share is not writable. Check permissions.';
      validation.details.writeError = err.message;
      
      // Try to cleanup if file was created
      try {
        await fs.unlink(testFilePath);
      } catch (cleanupErr) {
        // Ignore cleanup errors
      }
      
      return validation;
    }

    // All checks passed
    validation.isValid = true;
    validation.message = 'Network share is accessible with read/write permissions';
    
    return validation;

  } catch (err) {
    validation.message = `Unexpected error during network share validation: ${err.message}`;
    validation.details.unexpectedError = err.stack;
    return validation;
  }
}

/**
 * Validates and creates directory structure if needed
 * @param {string} sharePath - Path to the network share
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function ensureNetworkShareStructure(sharePath) {
  try {
    const validation = await validateNetworkShare(sharePath);
    
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.message,
        details: validation.details
      };
    }

    // Ensure base directory structure exists
    const testSubDir = path.join(sharePath, 'test-employee-dir');
    try {
      await fs.mkdir(testSubDir, { recursive: true });
      await fs.rmdir(testSubDir);
    } catch (err) {
      return {
        success: false,
        message: `Cannot create subdirectories in network share: ${err.message}`,
        details: { error: err.code }
      };
    }

    return {
      success: true,
      message: 'Network share is properly configured and accessible',
      details: validation.details
    };

  } catch (err) {
    return {
      success: false,
      message: `Error ensuring network share structure: ${err.message}`,
      details: { error: err.stack }
    };
  }
}

/**
 * Logs validation results with appropriate severity
 */
function logValidationResult(result) {
  const timestamp = new Date().toISOString();
  const separator = '='.repeat(60);
  
  console.log('\n' + separator);
  console.log(`[${timestamp}] NETWORK SHARE VALIDATION`);
  console.log(separator);
  
  if (result.success) {
    console.log('✓ STATUS: VALID');
    console.log(`✓ MESSAGE: ${result.message}`);
  } else {
    console.error('✗ STATUS: INVALID');
    console.error(`✗ MESSAGE: ${result.message}`);
  }
  
  console.log('\nDetails:');
  console.log(JSON.stringify(result.details, null, 2));
  console.log(separator + '\n');
}

module.exports = {
  validateNetworkShare,
  ensureNetworkShareStructure,
  logValidationResult
};
