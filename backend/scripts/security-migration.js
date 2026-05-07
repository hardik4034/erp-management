const { getAdminConnection } = require('../config/adminDatabase');
const sql = require('mssql');

async function migrate() {
    try {
        const pool = await getAdminConnection();
        console.log('Connected to solar_invest database for security migration');

        // 1. Update users table with security fields
        console.log('Updating users table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'must_change_password')
            BEGIN
                ALTER TABLE users ADD must_change_password BIT DEFAULT 1;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'failed_login_attempts')
            BEGIN
                ALTER TABLE users ADD failed_login_attempts INT DEFAULT 0;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'lockout_until')
            BEGIN
                ALTER TABLE users ADD lockout_until DATETIMEOFFSET NULL;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'refresh_token_hash')
            BEGIN
                ALTER TABLE users ADD refresh_token_hash NVARCHAR(MAX) NULL;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'created_by')
            BEGIN
                ALTER TABLE users ADD created_by INT NULL;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'created_at')
            BEGIN
                ALTER TABLE users ADD created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET();
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'updated_at')
            BEGIN
                ALTER TABLE users ADD updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET();
            END
        `);
        console.log('✅ Users table updated with security fields');

        // 2. Create audit_logs table
        console.log('Creating audit_logs table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('audit_logs') AND type = 'U')
            BEGIN
                CREATE TABLE audit_logs (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    action NVARCHAR(100) NOT NULL,
                    performed_by INT NULL, -- FK to users.id
                    target_user_id INT NULL,
                    ip_address NVARCHAR(45),
                    details NVARCHAR(MAX),
                    timestamp DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
                );
            END
        `);
        console.log('✅ Audit logs table created');

        console.log('🎉 Security Database Migration Complete');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
