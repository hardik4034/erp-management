/**
 * setup-sql-user.js
 * Run this ONCE with Windows Authentication to create:
 *   - SQL Server login: hrms_user
 *   - Database: HRMS (if it doesn't exist)
 *   - DB user mapping + db_owner role
 */

const sql = require('mssql');

// Connect using Windows Authentication (no username/password needed)
const adminConfig = {
    server: 'localhost',
    port: 1433,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        trustedConnection: true,  // Windows Auth
    },
    pool: { max: 1, min: 0, idleTimeoutMillis: 10000 }
};

async function setup() {
    let pool;
    try {
        console.log('🔄 Connecting via Windows Authentication...');
        pool = await sql.connect(adminConfig);
        console.log('✅ Connected via Windows Auth\n');

        // 1. Create the HRMS database if it doesn't exist
        await pool.request().query(`
            IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'HRMS')
            BEGIN
                CREATE DATABASE [HRMS];
                PRINT 'Database HRMS created.';
            END
            ELSE
                PRINT 'Database HRMS already exists.';
        `);
        console.log('✅ Database HRMS checked/created');

        // 2. Enable SQL Server Authentication mode (mixed mode)
        await pool.request().query(`
            EXEC xp_instance_regwrite
                N'HKEY_LOCAL_MACHINE',
                N'Software\\Microsoft\\MSSQLServer\\MSSQLServer',
                N'LoginMode',
                REG_DWORD,
                2;
        `);
        console.log('✅ SQL Server mixed authentication mode enabled');

        // 3. Create the login at server level
        await pool.request().query(`
            IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'hrms_user')
            BEGIN
                CREATE LOGIN [hrms_user] WITH PASSWORD = 'Hrms@2026',
                    DEFAULT_DATABASE = [HRMS],
                    CHECK_EXPIRATION = OFF,
                    CHECK_POLICY = OFF;
                PRINT 'Login hrms_user created.';
            END
            ELSE
            BEGIN
                -- Update password in case it changed
                ALTER LOGIN [hrms_user] WITH PASSWORD = 'Hrms@2026', CHECK_POLICY = OFF;
                ALTER LOGIN [hrms_user] ENABLE;
                PRINT 'Login hrms_user already exists — password updated and enabled.';
            END
        `);
        console.log('✅ SQL Login hrms_user created/updated');

        // 4. Switch to HRMS database and create the DB user
        await pool.request().query(`
            USE [HRMS];
            IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'hrms_user')
            BEGIN
                CREATE USER [hrms_user] FOR LOGIN [hrms_user];
                PRINT 'DB user hrms_user created.';
            END
            ELSE
                PRINT 'DB user hrms_user already exists.';
        `);
        console.log('✅ DB user hrms_user checked/created');

        // 5. Grant db_owner role
        await pool.request().query(`
            USE [HRMS];
            ALTER ROLE [db_owner] ADD MEMBER [hrms_user];
        `);
        console.log('✅ db_owner role granted to hrms_user\n');

        console.log('🎉 Setup complete! Restart SQL Server service for auth mode changes to take effect.');
        console.log('   Run: net stop MSSQLSERVER && net start MSSQLSERVER');
        console.log('   Then test with: node test-db-connection.js\n');

    } catch (err) {
        console.error('\n❌ Setup failed:', err.message);
        if (err.message.includes('Login failed') || err.message.includes('Cannot open')) {
            console.log('\n💡 Try running this script as Administrator.');
            console.log('   Or connect via SSMS and run the SQL manually.\n');
        }
    } finally {
        if (pool) await pool.close();
    }
}

setup();
