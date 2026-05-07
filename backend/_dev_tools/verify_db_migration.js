const { getConnection } = require('../config/database');
const sql = require('mssql');

async function verifyMigration() {
    try {
        const pool = await getConnection();
        
        console.log('--- Checking UserRoles Table ---');
        const roles = await pool.request().query('SELECT * FROM UserRoles');
        console.table(roles.recordset);

        console.log('\n--- Checking Users Table ---');
        const users = await pool.request().query('SELECT id, username, full_name, email, role_id, status FROM Users');
        console.table(users.recordset);

        console.log('\n--- Checking audit_logs Table ---');
        const logs = await pool.request().query('SELECT TOP 5 * FROM audit_logs ORDER BY timestamp DESC');
        console.table(logs.recordset);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verifyMigration();
