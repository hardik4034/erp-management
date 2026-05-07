const { sql, getConnection, closeConnection } = require('../config/database');

async function alterAuditLogsTable() {
    try {
        console.log('Connecting to database...');
        const pool = await getConnection();
        
        console.log('Checking and adding new columns to AuditLogs...');

        // Add Endpoint if not exists
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'Endpoint')
                BEGIN
                    ALTER TABLE AuditLogs ADD Endpoint NVARCHAR(500);
                    PRINT 'Added Endpoint column.'
                END
            `);
        } catch (e) { console.warn('Endpoint column might already exist or error:', e.message); }

        // Add RecordId if not exists
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'RecordId')
                BEGIN
                    ALTER TABLE AuditLogs ADD RecordId NVARCHAR(100);
                    PRINT 'Added RecordId column.'
                END
            `);
        } catch (e) { console.warn('RecordId column might already exist or error:', e.message); }

        // Add UserAgent if not exists
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'UserAgent')
                BEGIN
                    ALTER TABLE AuditLogs ADD UserAgent NVARCHAR(500);
                    PRINT 'Added UserAgent column.'
                END
            `);
        } catch (e) { console.warn('UserAgent column might already exist or error:', e.message); }

        // Rename Details to Payload or just keep Details as Payload logic.
        // Wait, the plan says Payload (JSON column). I will just add Payload and we can migrate data or just use Payload.
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'Payload')
                BEGIN
                    ALTER TABLE AuditLogs ADD Payload NVARCHAR(MAX);
                    PRINT 'Added Payload column.'
                END
            `);
        } catch (e) { console.warn('Payload column might already exist or error:', e.message); }

        // Create Non-Clustered Indexes
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'IX_AuditLogs_UserId')
                BEGIN
                    CREATE NONCLUSTERED INDEX IX_AuditLogs_UserId ON AuditLogs(UserId);
                    PRINT 'Created IX_AuditLogs_UserId index.'
                END
            `);
        } catch (e) { console.warn('Index UserId might already exist or error:', e.message); }

        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'IX_AuditLogs_Module')
                BEGIN
                    CREATE NONCLUSTERED INDEX IX_AuditLogs_Module ON AuditLogs(Module);
                    PRINT 'Created IX_AuditLogs_Module index.'
                END
            `);
        } catch (e) { console.warn('Index Module might already exist or error:', e.message); }

        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'IX_AuditLogs_CreatedAt')
                BEGIN
                    CREATE NONCLUSTERED INDEX IX_AuditLogs_CreatedAt ON AuditLogs(CreatedAt);
                    PRINT 'Created IX_AuditLogs_CreatedAt index.'
                END
            `);
        } catch (e) { console.warn('Index CreatedAt might already exist or error:', e.message); }

        console.log('AuditLogs table alteration completed successfully.');
        
    } catch (error) {
        console.error('Error altering AuditLogs table:', error);
    } finally {
        await closeConnection();
    }
}

alterAuditLogsTable();
