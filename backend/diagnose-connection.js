const sql = require('mssql');

// Test different connection configurations
const configs = [
  {
    name: 'Config 1: SA with Demo@123',
    config: {
      server: 'LAPTOP-E5CHTP4B',
      database: 'hr_employee',
      user: 'sa',
      password: 'Demo@123',
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
      }
    }
  },
  {
    name: 'Config 2: SA with empty password',
    config: {
      server: 'LAPTOP-E5CHTP4B',
      database: 'hr_employee',
      user: 'sa',
      password: '',
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
      }
    }
  },
  {
    name: 'Config 3: SA with 123456',
    config: {
      server: 'LAPTOP-E5CHTP4B',
      database: 'hr_employee',
      user: 'sa',
      password: '123456',
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
      }
    }
  }
];

async function testConfigs() {
  console.log('🔍 Testing SQL Server connection with different configurations...\n');
  
  for (const { name, config } of configs) {
    console.log(`Testing: ${name}`);
    try {
      const pool = await sql.connect(config);
      console.log('✅ SUCCESS! This configuration works!\n');
      console.log('Use this password in your .env file:');
      console.log(`DB_PASSWORD=${config.password || '(empty)'}\n`);
      await pool.close();
      return;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}\n`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n⚠️  All configurations failed. Please check:');
  console.log('1. Is SQL Server running?');
  console.log('2. Is SQL Server Authentication enabled? (Server Properties → Security → SQL Server and Windows Authentication mode)');
  console.log('3. Is SA account enabled? (Security → Logins → sa → Properties → Status → Login: Enabled)');
  console.log('4. Did you restart SQL Server after making changes?');
  console.log('\n💡 Try creating a new SQL user instead of using SA:');
  console.log('   In SSMS, run:');
  console.log('   CREATE LOGIN hrms_user WITH PASSWORD = \'YourPassword123\';');
  console.log('   USE hr_employee;');
  console.log('   CREATE USER hrms_user FOR LOGIN hrms_user;');
  console.log('   ALTER ROLE db_owner ADD MEMBER hrms_user;');
}

testConfigs().catch(console.error);
