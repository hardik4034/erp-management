const sql    = require('mssql');
const logger = require('../utils/logger');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Use Windows Authentication if specified, otherwise use SQL Authentication
if (process.env.DB_USE_WINDOWS_AUTH === "true") {
  config.options.trustedConnection = true;
  config.authentication = {
    type: 'ntlm',
    options: {
      domain: '',
      userName: '',
      password: ''
    }
  };
} else {
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD;
}

let pool = null;

const getConnection = async () => {
  try {
    if (pool) {
      return pool;
    }
    pool = await sql.connect(config);
    logger.info('✅ Database connected successfully');
    return pool;
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    throw error;
  }
};

const closeConnection = async () => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      logger.info('Database connection closed');
    }
  } catch (error) {
    logger.error('Error closing database connection', { error: error.message });
  }
};

module.exports = {
  sql,
  getConnection,
  closeConnection,
};
