const sql = require("mssql");
require("dotenv").config();

const config = {
  server: process.env.ADMIN_DB_SERVER || process.env.DB_SERVER,
  database: process.env.ADMIN_DB_DATABASE || "solar_invest",
  port: parseInt(process.env.ADMIN_DB_PORT || process.env.DB_PORT),
  options: {
    encrypt: process.env.ADMIN_DB_ENCRYPT === "true",
    trustServerCertificate: process.env.ADMIN_DB_TRUST_SERVER_CERTIFICATE === "true",
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
  config.user = process.env.ADMIN_DB_USER || process.env.DB_USER;
  config.password = process.env.ADMIN_DB_PASSWORD || process.env.DB_PASSWORD;
}

let pool = null;

const getAdminConnection = async () => {
  try {
    if (pool) {
      return pool;
    }
    const connectionPool = new sql.ConnectionPool(config);
    pool = await connectionPool.connect();
    console.log("✅ Admin Database initialized successfully");
    return pool;
  } catch (error) {
    console.error("❌ Admin Database connection failed:", error.message);
    throw error;
  }
};

const closeAdminConnection = async () => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log("Admin Database connection closed");
    }
  } catch (error) {
    console.error("Error closing Admin database connection:", error.message);
  }
};

module.exports = {
  getAdminConnection,
  closeAdminConnection,
};
