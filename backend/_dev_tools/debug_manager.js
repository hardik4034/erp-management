const { getConnection } = require('../config/database');
const sql = require('mssql');

async function debugManager() {
    try {
        const pool = await getConnection();
        
        // Check sar pat's employee record
        const emp = await pool.request()
            .input('id', sql.Int, 38)
            .query("SELECT * FROM Employees WHERE EmployeeId = @id");
        console.log('--- Manager (EmployeeId 38) Details ---');
        console.table(emp.recordset);

        // Check if anyone reports to him
        const team = await pool.request()
            .input('id', sql.Int, 38)
            .query("SELECT EmployeeId, FirstName, LastName, ReportingTo FROM Employees WHERE ReportingTo = @id");
        console.log('\n--- Team Members reporting to Manager 38 ---');
        console.table(team.recordset);

        // Check attendance records for April 2026 for Manager 38
        const attendance = await pool.request()
            .input('id', sql.Int, 38)
            .input('start', sql.Date, '2026-04-01')
            .input('end', sql.Date, '2026-04-30')
            .query("SELECT * FROM Attendance WHERE EmployeeId = @id AND AttendanceDate BETWEEN @start AND @end");
        console.log('\n--- Attendance records for Manager 38 (April 2026) ---');
        console.table(attendance.recordset);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

debugManager();
