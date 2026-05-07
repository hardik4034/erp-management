
const { getConnection } = require('../config/database');

async function checkHRMSTables() {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
        `);
        console.log('HRMS Tables:');
        console.table(result.recordset);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkHRMSTables();
