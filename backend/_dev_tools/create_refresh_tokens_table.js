const { getConnection } = require('../config/database');
const sql = require('mssql');

async function createRefreshTokenTable() {
    try {
        const pool = await getConnection();
        
        console.log('--- Creating RefreshTokens Table ---');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RefreshTokens')
            BEGIN
                CREATE TABLE RefreshTokens (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
                    token_hash NVARCHAR(255) NOT NULL,
                    issued_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
                    expires_at DATETIMEOFFSET NOT NULL,
                    revoked_at DATETIMEOFFSET,
                    ip_address NVARCHAR(45),
                    user_agent NVARCHAR(MAX),
                    replaced_by_token NVARCHAR(255), -- For rotation tracking
                    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
                );
                
                -- Index for faster lookups
                CREATE INDEX IX_RefreshTokens_TokenHash ON RefreshTokens(token_hash);
                CREATE INDEX IX_RefreshTokens_UserId ON RefreshTokens(user_id);
                
                print '✅ RefreshTokens table created.';
            END
            ELSE
            BEGIN
                print 'ℹ️ RefreshTokens table already exists.';
            END
        `);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

createRefreshTokenTable();
