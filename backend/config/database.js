const sql = require('mssql');
const logger = require('../utils/logger');

const config = {
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  server: process.env.SQL_SERVER_HOST,
  database: process.env.SQL_SERVER_DATABASE,
  port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;

async function getConnection() {
  try {
    if (pool) {
      return pool;
    }
    
    pool = await sql.connect(config);
    console.log('Connected to SQL Server database');
    logger.info('Connected to SQL Server database');
    return pool;
  } catch (err) {
    logger.error(err, null, { context: 'Database connection failed' });
    throw err;
  }
}

async function closeConnection() {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      logger.info('Database connection closed');
    }
  } catch (err) {
    logger.error(err, null, { context: 'Error closing database connection' });
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

module.exports = {
  sql,
  getConnection,
  closeConnection
};
