const { getAdminConnection } = require('../config/adminDatabase');
const sql = require('mssql');

async function test() {
    try {
        const pool = await getAdminConnection();
        await pool.request().query("UPDATE users SET employee_id = 1 WHERE id = 4");
        console.log('Successfully linked User ID 4 to Employee ID 1');
        process.exit(0);
    } catch(e){
        console.error(e);
        process.exit(1);
    }
}
test();
