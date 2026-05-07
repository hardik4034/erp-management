const { sql, getConnection, closeConnection } = require('../config/database');

async function refactorAuditLogsTable() {
    try {
        console.log('Connecting to database...');
        const pool = await getConnection();
        
        console.log('Adding new denormalized columns to AuditLogs...');

        const columnsToAdd = [
            { name: 'ActorUserId', type: 'INT' },
            { name: 'ActorName', type: 'NVARCHAR(150)' },
            { name: 'ActorEmployeeId', type: 'NVARCHAR(50)' },
            { name: 'ActorRole', type: 'NVARCHAR(50)' },
            { name: 'TargetEmployeeId', type: 'NVARCHAR(50)' },
            { name: 'TargetEmployeeName', type: 'NVARCHAR(150)' }
        ];

        for (const col of columnsToAdd) {
            try {
                await pool.request().query(`
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = '${col.name}')
                    BEGIN
                        ALTER TABLE AuditLogs ADD ${col.name} ${col.type};
                        PRINT 'Added ${col.name} column.'
                    END
                `);
            } catch (e) {
                console.warn(`Error adding ${col.name}:`, e.message);
            }
        }

        console.log('AuditLogs table refactoring completed successfully.');
        
    } catch (error) {
        console.error('Error refactoring AuditLogs table:', error);
    } finally {
        await closeConnection();
    }
}

refactorAuditLogsTable();
