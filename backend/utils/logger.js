const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` | ${JSON.stringify(meta)}`;
    }
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Create daily rotate file transport for all logs
const allLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'all-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'silly',
  format: logFormat
});

// Create daily rotate file transport for error logs only
const errorLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: logFormat
});

// Create daily rotate file transport for process logs
const processLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'process-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'info',
  format: logFormat
});

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let log = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0 && !meta.stack) {
            log += ` ${JSON.stringify(meta)}`;
          }
          return log;
        })
      )
    }),
    // File outputs
    allLogsTransport,
    errorLogsTransport,
    processLogsTransport
  ],
  exitOnError: false
});

// Helper functions for structured logging
const logWithContext = (level, message, context = {}) => {
  logger.log(level, message, {
    ...context,
    pid: process.pid,
    hostname: require('os').hostname()
  });
};

// Enhanced logging methods
const enhancedLogger = {
  // Standard log levels
  error: (message, error, context = {}) => {
    if (error instanceof Error) {
      logWithContext('error', message, {
        ...context,
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code,
          name: error.name
        }
      });
    } else {
      logWithContext('error', message, { ...context, error });
    }
  },

  warn: (message, context = {}) => {
    logWithContext('warn', message, context);
  },

  info: (message, context = {}) => {
    logWithContext('info', message, context);
  },

  debug: (message, context = {}) => {
    logWithContext('debug', message, context);
  },

  // Process-specific logging
  process: {
    start: (processName, context = {}) => {
      logWithContext('info', `🚀 Process Started: ${processName}`, {
        ...context,
        processName,
        type: 'PROCESS_START'
      });
    },

    success: (processName, context = {}) => {
      logWithContext('info', `✅ Process Completed: ${processName}`, {
        ...context,
        processName,
        type: 'PROCESS_SUCCESS'
      });
    },

    error: (processName, error, context = {}) => {
      logWithContext('error', `❌ Process Failed: ${processName}`, {
        ...context,
        processName,
        type: 'PROCESS_ERROR',
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code
        }
      });
    },

    step: (processName, step, context = {}) => {
      logWithContext('info', `⏳ ${processName} - ${step}`, {
        ...context,
        processName,
        step,
        type: 'PROCESS_STEP'
      });
    }
  },

  // API request logging
  api: {
    request: (method, path, context = {}) => {
      logWithContext('info', `📥 API Request: ${method} ${path}`, {
        ...context,
        method,
        path,
        type: 'API_REQUEST'
      });
    },

    response: (method, path, statusCode, duration, context = {}) => {
      const level = statusCode >= 400 ? 'warn' : 'info';
      logWithContext(level, `📤 API Response: ${method} ${path} - ${statusCode}`, {
        ...context,
        method,
        path,
        statusCode,
        duration,
        type: 'API_RESPONSE'
      });
    },

    error: (method, path, error, context = {}) => {
      logWithContext('error', `🔥 API Error: ${method} ${path}`, {
        ...context,
        method,
        path,
        type: 'API_ERROR',
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code
        }
      });
    }
  },

  // Database operation logging
  db: {
    query: (query, context = {}) => {
      logWithContext('debug', `🗄️ Database Query`, {
        ...context,
        query: query.substring(0, 200),
        type: 'DB_QUERY'
      });
    },

    error: (operation, error, context = {}) => {
      logWithContext('error', `💥 Database Error: ${operation}`, {
        ...context,
        operation,
        type: 'DB_ERROR',
        error: {
          message: error.message,
          number: error.number,
          lineNumber: error.lineNumber,
          state: error.state
        }
      });
    }
  },

  // Authentication logging
  auth: {
    login: (userId, email, context = {}) => {
      logWithContext('info', `🔐 User Login: ${email}`, {
        ...context,
        userId,
        email,
        type: 'AUTH_LOGIN'
      });
    },

    logout: (userId, email, context = {}) => {
      logWithContext('info', `👋 User Logout: ${email}`, {
        ...context,
        userId,
        email,
        type: 'AUTH_LOGOUT'
      });
    },

    failed: (email, reason, context = {}) => {
      logWithContext('warn', `🚫 Login Failed: ${email}`, {
        ...context,
        email,
        reason,
        type: 'AUTH_FAILED'
      });
    }
  }
};

// Log rotation event handlers
allLogsTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Log file rotated', { oldFilename, newFilename });
});

errorLogsTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Error log file rotated', { oldFilename, newFilename });
});

processLogsTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Process log file rotated', { oldFilename, newFilename });
});

// Capture unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  enhancedLogger.error('Unhandled Promise Rejection', reason, {
    promise: promise.toString()
  });
});

process.on('uncaughtException', (error) => {
  enhancedLogger.error('Uncaught Exception', error);
  process.exit(1);
});

module.exports = enhancedLogger;