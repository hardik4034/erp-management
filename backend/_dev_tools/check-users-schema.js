
const { getAdminConnection } = require('../config/adminDatabase');

async function checkUsersTable() {
    try {
        const pool = await getAdminConnection();
        const result = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users'
        `);
        console.log('Users Table Schema:');
        console.table(result.recordset);

        const rolesResult = await pool.request().query(`
            SELECT id, name FROM roles
        `);
        console.log('Roles:');
        console.table(rolesResult.recordset);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkUsersTable();
