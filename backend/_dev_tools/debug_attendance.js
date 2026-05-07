const { getConnection } = require('../config/database');
const sql = require('mssql');

async function test() {
    try {
        const pool = await getConnection();
        
        // Test what the SP returns for April 2026
        const result = await pool.request()
            .input('FromDate', sql.Date, '2026-04-01')
            .input('ToDate', sql.Date, '2026-04-30')
            .input('EmployeeIds', sql.NVarChar(sql.MAX), null)
            .execute('sp_GetAttendanceGrid');

        console.log('\n=== RECORDSET 0 (Employees) ===');
        console.log(result.recordsets[0]);

        console.log('\n=== RECORDSET 1 (Attendance) ===');
        console.log(result.recordsets[1]);

        console.log('\n=== RECORDSET 2 (Holidays) ===');
        console.log(result.recordsets[2]);

        console.log('\n=== TOTAL EMPLOYEES FROM SP:', result.recordsets[0]?.length);
        console.log('=== TOTAL ATTENDANCE FROM SP:', result.recordsets[1]?.length);

        process.exit(0);
    } catch(e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}
test();
