const sql = require('mssql');
require('dotenv').config();

console.log('Environment Variables:');
console.log(`DB_SERVER: ${process.env.DB_SERVER}`);
console.log(`DB_DATABASE: ${process.env.DB_DATABASE}`);
console.log(`DB_USER: ${process.env.DB_USER}`);
console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD}`);
console.log(`PORT: ${process.env.PORT}`);

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

async function testConnection() {
  try {
    console.log('\n🔄 Attempting to connect to SQL Server...');
    const pool = await sql.connect(config);
    console.log('✅ Connection Successful!');
    
    console.log('\nChecking if tables exist...');
    const result = await pool.request().query("SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE'");
    if (result.recordset.length === 0) {
        console.log('❌ Connected, BUT NO TABLES FOUND! You need to run database-schema.sql');
    } else {
        console.log(`✅ Found ${result.recordset.length} tables.`);
        console.log(result.recordset.map(r => r.table_name).join(', '));
    }
    
    await pool.close();
  } catch (error) {
    console.error('\n❌ Connection Failed!');
    console.error(`Error: ${error.message}`);
    
    if (error.message.includes('Login failed')) {
        console.log('\n💡 Tip: Did you run the "01-setup-database-and-user.sql" script in SSMS?');
    } else if (error.message.includes('Cannot open database')) {
        console.log('\n💡 Tip: The database "HRMS" does not exist. Run "01-setup-database-and-user.sql"!');
    }
  }
}

testConnection();
