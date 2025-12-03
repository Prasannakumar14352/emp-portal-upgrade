const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const router = express.Router();

const LOGS_DIR = path.join(__dirname, '../logs');

// Helper function to read log files
async function readLogFile(filePath, limit = 100) {
  try {
    const fileStream = require('fs').createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const logs = [];
    for await (const line of rl) {
      if (line.trim()) {
        try {
          // Try to parse as JSON first
          const parsed = JSON.parse(line);
          logs.push(parsed);
        } catch {
          // If not JSON, parse the custom format
          const match = line.match(/^(\S+ \S+) \[(\w+)\]: (.+?)( \| (.+))?$/);
          if (match) {
            logs.push({
              timestamp: match[1],
              level: match[2].toLowerCase(),
              message: match[3],
              meta: match[5] ? JSON.parse(match[5]) : {}
            });
          } else {
            logs.push({
              timestamp: new Date().toISOString(),
              level: 'info',
              message: line
            });
          }
        }
      }
    }

    return logs.slice(-limit).reverse();
  } catch (error) {
    console.error('Error reading log file:', error);
    throw error;
  }
}

// Helper function to get available log files
async function getLogFiles() {
  try {
    const files = await fs.readdir(LOGS_DIR);
    const logFiles = files.filter(f => f.endsWith('.log'));
    
    const fileDetails = await Promise.all(
      logFiles.map(async (file) => {
        const filePath = path.join(LOGS_DIR, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime,
          path: filePath
        };
      })
    );

    return fileDetails.sort((a, b) => b.modified - a.modified);
  } catch (error) {
    console.error('Error getting log files:', error);
    return [];
  }
}

// GET /api/logs/files - Get list of available log files
router.get('/files', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const files = await getLogFiles();
    res.json({
      success: true,
      files: files.map(f => ({
        name: f.name,
        size: f.size,
        sizeFormatted: (f.size / 1024 / 1024).toFixed(2) + ' MB',
        modified: f.modified
      }))
    });
  } catch (error) {
    console.error('Get log files error:', error);
    res.status(500).json({ error: 'Failed to get log files' });
  }
});

// GET /api/logs/view/:filename - View specific log file
router.get('/view/:filename', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { filename } = req.params;
    const { limit = 100, level } = req.query;

    // Security: Prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(LOGS_DIR, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Log file not found' });
    }

    let logs = await readLogFile(filePath, parseInt(limit));

    // Filter by log level if specified
    if (level) {
      logs = logs.filter(log => log.level === level.toLowerCase());
    }

    res.json({
      success: true,
      filename,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('View log file error:', error);
    res.status(500).json({ error: 'Failed to read log file' });
  }
});

// GET /api/logs/recent - Get recent logs from all files
router.get('/recent', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { limit = 50, level, type } = req.query;
    
    const files = await getLogFiles();
    const recentLogs = [];

    // Read from the most recent files first
    for (const file of files.slice(0, 3)) {
      try {
        const logs = await readLogFile(file.path, parseInt(limit));
        recentLogs.push(...logs.map(log => ({ ...log, file: file.name })));
      } catch (error) {
        console.error(`Error reading ${file.name}:`, error);
      }
    }

    // Sort by timestamp
    recentLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Filter by level if specified
    let filteredLogs = recentLogs;
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level.toLowerCase());
    }

    // Filter by type if specified
    if (type) {
      filteredLogs = filteredLogs.filter(log => log.meta?.type === type);
    }

    res.json({
      success: true,
      count: filteredLogs.length,
      logs: filteredLogs.slice(0, parseInt(limit))
    });
  } catch (error) {
    console.error('Get recent logs error:', error);
    res.status(500).json({ error: 'Failed to get recent logs' });
  }
});

// GET /api/logs/errors - Get recent error logs
router.get('/errors', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const files = await getLogFiles();
    const errorFiles = files.filter(f => f.name.includes('error'));
    const errorLogs = [];

    for (const file of errorFiles.slice(0, 3)) {
      try {
        const logs = await readLogFile(file.path, parseInt(limit));
        errorLogs.push(...logs.map(log => ({ ...log, file: file.name })));
      } catch (error) {
        console.error(`Error reading ${file.name}:`, error);
      }
    }

    errorLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      count: errorLogs.length,
      logs: errorLogs.slice(0, parseInt(limit))
    });
  } catch (error) {
    console.error('Get error logs error:', error);
    res.status(500).json({ error: 'Failed to get error logs' });
  }
});

// GET /api/logs/processes - Get process-specific logs
router.get('/processes', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const { limit = 50, processName } = req.query;
    
    const files = await getLogFiles();
    const processFiles = files.filter(f => f.name.includes('process'));
    const processLogs = [];

    for (const file of processFiles.slice(0, 3)) {
      try {
        const logs = await readLogFile(file.path, parseInt(limit));
        processLogs.push(...logs.map(log => ({ ...log, file: file.name })));
      } catch (error) {
        console.error(`Error reading ${file.name}:`, error);
      }
    }

    processLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Filter by process name if specified
    let filteredLogs = processLogs;
    if (processName) {
      filteredLogs = filteredLogs.filter(log => 
        log.meta?.processName === processName || log.message.includes(processName)
      );
    }

    res.json({
      success: true,
      count: filteredLogs.length,
      logs: filteredLogs.slice(0, parseInt(limit))
    });
  } catch (error) {
    console.error('Get process logs error:', error);
    res.status(500).json({ error: 'Failed to get process logs' });
  }
});

// GET /api/logs/stats - Get log statistics
router.get('/stats', authenticateToken, authorizeRole('hr', 'manager'), async (req, res) => {
  try {
    const files = await getLogFiles();
    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      totalSizeFormatted: (files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2) + ' MB',
      oldestLog: files.length > 0 ? files[files.length - 1].modified : null,
      newestLog: files.length > 0 ? files[0].modified : null,
      files: files.map(f => ({
        name: f.name,
        size: (f.size / 1024).toFixed(2) + ' KB',
        modified: f.modified
      }))
    };

    // Get error count from recent logs
    const recentLogs = await readLogFile(files[0]?.path || '', 100);
    const errorCount = recentLogs.filter(log => log.level === 'error').length;
    const warnCount = recentLogs.filter(log => log.level === 'warn').length;

    stats.recentErrors = errorCount;
    stats.recentWarnings = warnCount;

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get log stats error:', error);
    res.status(500).json({ error: 'Failed to get log statistics' });
  }
});

module.exports = router;
