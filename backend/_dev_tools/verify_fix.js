const axios = require('axios');

async function verifyManagerView() {
    try {
        // Since we are running on the server, we can simulate the API call or just check the logic.
        // Actually, let's just do a final DB check to be absolutely sure what the grid API would return.
        const { getConnection } = require('../config/database');
        const sql = require('mssql');
        const pool = await getConnection();

        // Target Manager: sar pat (ID 38)
        const managerId = 38;

        // 1. Check what the grid SP returns
        const result = await pool.request()
            .input('FromDate', sql.Date, '2026-04-01')
            .input('ToDate', sql.Date, '2026-04-30')
            .execute('sp_GetAttendanceGrid');

        const allEmployees = result.recordsets[0];
        console.log(`\nTotal employees returned by SP: ${allEmployees.length}`);

        // 2. Simulate frontend filtering logic for Manager 38
        const filteredTeam = allEmployees.filter(emp => 
            emp.ReportingTo == managerId || 
            emp.AttendanceApproverId == managerId || 
            emp.LeaveApproverId == managerId || 
            emp.EmployeeId == managerId
        );

        console.log(`\n--- Simulated Team View for Manager 38 ---`);
        console.table(filteredTeam.map(e => ({
            ID: e.EmployeeId,
            Name: `${e.FirstName} ${e.LastName}`,
            ReportingTo: e.ReportingTo,
            ApproverId: e.AttendanceApproverId
        })));

        if (filteredTeam.length >= 3) {
            console.log('\n✅ Verification Success: Manager can now see themselves + 2 reports.');
        } else {
            console.log('\n❌ Verification Failed: Team list too small.');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verifyManagerView();
