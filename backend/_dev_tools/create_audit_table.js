const { getConnection } = require('../config/database');
const sql = require('mssql');

async function createAuditLogTable() {
    try {
        const pool = await getConnection();
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_logs')
            BEGIN
                CREATE TABLE audit_logs (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    action NVARCHAR(100) NOT NULL,
                    performed_by INT,
                    target_user_id INT,
                    ip_address NVARCHAR(45),
                    details NVARCHAR(MAX),
                    timestamp DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
                );
                print '✅ audit_logs table created.';
            END
        `);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

createAuditLogTable();
