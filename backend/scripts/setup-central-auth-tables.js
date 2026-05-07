const { getAdminConnection } = require('../config/adminDatabase');
const sql = require('mssql');

async function setup() {
    try {
        const pool = await getAdminConnection();
        
        console.log('--- Creating RefreshTokens Table in Central Database ---');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RefreshTokens')
            BEGIN
                CREATE TABLE RefreshTokens (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    token_hash NVARCHAR(255) NOT NULL,
                    issued_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
                    expires_at DATETIMEOFFSET NOT NULL,
                    revoked_at DATETIMEOFFSET,
                    ip_address NVARCHAR(45),
                    user_agent NVARCHAR(MAX),
                    replaced_by_token NVARCHAR(255),
                    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
                );
                
                CREATE INDEX IX_RefreshTokens_TokenHash_Central ON RefreshTokens(token_hash);
                CREATE INDEX IX_RefreshTokens_UserId_Central ON RefreshTokens(user_id);
                
                print '✅ RefreshTokens table created in central database.';
            END
            ELSE
            BEGIN
                print 'ℹ️ RefreshTokens table already exists in central database.';
            END
        `);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

setup();
