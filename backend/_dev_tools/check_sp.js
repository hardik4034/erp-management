const { getConnection } = require('../config/database');
const sql = require('mssql');

async function check() {
    try {
        const pool = await getConnection();

        // Get the SP definition
        const spDef = await pool.request()
            .query("SELECT OBJECT_DEFINITION(OBJECT_ID('sp_GetAttendanceGrid')) AS SpDefinition");
        
        console.log('=== sp_GetAttendanceGrid DEFINITION ===');
        console.log(spDef.recordset[0]?.SpDefinition || 'NOT FOUND');

        // Also check column structure of employee 1 vs employee 2
        const empCompare = await pool.request()
            .query(`SELECT * FROM Employees WHERE EmployeeId IN (1, 2)`);
        
        console.log('\n=== Employee 1 full record ===');
        console.log(JSON.stringify(empCompare.recordset[0], null, 2));
        console.log('\n=== Employee 2 full record ===');
        console.log(JSON.stringify(empCompare.recordset[1], null, 2));

        process.exit(0);
    } catch(e) {
        console.error(e.message);
        process.exit(1);
    }
}
check();
