const { getConnection } = require('../config/database');
async function run() {
    try {
        const pool = await getConnection();
        const result = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Employees'");
        console.table(result.recordset);
    } catch (e) { console.error(e); }
    process.exit(0);
}
run();
