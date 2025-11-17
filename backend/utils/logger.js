const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const errorLogPath = path.join(logsDir, 'error.log');
const combinedLogPath = path.join(logsDir, 'combined.log');

/**
 * Format log entry with timestamp and details
 */
function formatLogEntry(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  };
  return JSON.stringify(logEntry) + '\n';
}

/**
 * Write to log file
 */
function writeToFile(filePath, content) {
  try {
    fs.appendFileSync(filePath, content, 'utf8');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

/**
 * Log error with stack trace
 */
function logError(error, req = null, additionalInfo = {}) {
  const errorDetails = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...additionalInfo
  };

  // Add request details if available
  if (req) {
    errorDetails.request = {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    };
    
    // Add user info if authenticated
    if (req.user) {
      errorDetails.user = {
        id: req.user.id,
        email: req.user.email
      };
    }
  }

  const logEntry = formatLogEntry('ERROR', error.message, errorDetails);
  
  // Write to error log
  writeToFile(errorLogPath, logEntry);
  
  // Also write to combined log
  writeToFile(combinedLogPath, logEntry);
  
  // Console output with color
  console.error('\x1b[31m[ERROR]\x1b[0m', error.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }
}

/**
 * Log info message
 */
function logInfo(message, meta = {}) {
  const logEntry = formatLogEntry('INFO', message, meta);
  writeToFile(combinedLogPath, logEntry);
  console.log(`\x1b[36m[INFO]\x1b[0m ${message}`);
}

/**
 * Log warning message
 */
function logWarning(message, meta = {}) {
  const logEntry = formatLogEntry('WARN', message, meta);
  writeToFile(combinedLogPath, logEntry);
  console.warn(`\x1b[33m[WARN]\x1b[0m ${message}`);
}

/**
 * Get log file contents
 */
function getErrorLogs(lines = 100) {
  try {
    if (!fs.existsSync(errorLogPath)) {
      return [];
    }
    
    const content = fs.readFileSync(errorLogPath, 'utf8');
    const logs = content.trim().split('\n').filter(Boolean);
    
    return logs
      .slice(-lines)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      });
  } catch (err) {
    console.error('Failed to read error logs:', err);
    return [];
  }
}

/**
 * Clear old logs (older than specified days)
 */
function clearOldLogs(daysToKeep = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  [errorLogPath, combinedLogPath].forEach(logPath => {
    try {
      if (!fs.existsSync(logPath)) return;
      
      const content = fs.readFileSync(logPath, 'utf8');
      const logs = content.trim().split('\n').filter(Boolean);
      
      const filteredLogs = logs.filter(line => {
        try {
          const log = JSON.parse(line);
          return new Date(log.timestamp) >= cutoffDate;
        } catch {
          return true; // Keep malformed logs
        }
      });
      
      fs.writeFileSync(logPath, filteredLogs.join('\n') + '\n', 'utf8');
      console.log(`Cleared logs older than ${daysToKeep} days from ${path.basename(logPath)}`);
    } catch (err) {
      console.error(`Failed to clear old logs from ${path.basename(logPath)}:`, err);
    }
  });
}

module.exports = {
  logError,
  logInfo,
  logWarning,
  getErrorLogs,
  clearOldLogs
};
