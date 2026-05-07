const { getConnection } = require('../config/database');
const sql = require('mssql');

async function fix() {
    try {
        const pool = await getConnection();

        // Fix Employee ID 1 - set IsDeleted to false (0) since it's null and the employee is active
        const result = await pool.request()
            .query("UPDATE Employees SET IsDeleted = 0 WHERE EmployeeId = 1 AND IsDeleted IS NULL");
        
        console.log(`Fixed Employee ID 1: IsDeleted set to 0. Rows affected: ${result.rowsAffected[0]}`);

        // Verify the fix
        const verify = await pool.request()
            .query("SELECT EmployeeId, FirstName, LastName, IsDeleted FROM Employees WHERE EmployeeId = 1");
        console.log('After fix:', verify.recordset);

        // Also verify SP now returns Employee 1
        const spResult = await pool.request()
            .input('FromDate', sql.Date, '2026-04-01')
            .input('ToDate', sql.Date, '2026-04-30')
            .input('EmployeeIds', sql.NVarChar(sql.MAX), null)
            .execute('sp_GetAttendanceGrid');
        
        console.log('\nEmployees from SP after fix:');
        spResult.recordsets[0].forEach(e => console.log(`  EmployeeId=${e.EmployeeId} | ${e.FirstName} ${e.LastName}`));

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
fix();
