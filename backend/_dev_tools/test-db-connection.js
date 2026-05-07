const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
};

console.log('Testing database connection with config:');
console.log({
  server: config.server,
  database: config.database,
  user: config.user,
  password: '***' + config.password.slice(-3),
  port: config.port,
});

async function testConnection() {
  try {
    console.log('\n🔄 Attempting to connect...');
    const pool = await sql.connect(config);
    console.log('✅ Database connected successfully!');
    
    // Test a simple query
    const result = await pool.request().query('SELECT @@VERSION as version');
    console.log('\n📊 SQL Server Version:');
    console.log(result.recordset[0].version);
    
    await pool.close();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed:');
    console.error('Error:', error.message);
    console.error('\nPossible solutions:');
    console.error('1. Verify SQL Server is running');
    console.error('2. Check if SQL Server Authentication is enabled (not just Windows Auth)');
    console.error('3. Verify the SA password is correct');
    console.error('4. Check if SA account is enabled');
    console.error('5. Verify the database "hr_employee" exists');
    process.exit(1);
  }
}

testConnection();
