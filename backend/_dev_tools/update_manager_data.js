const { getConnection } = require('../config/database');
const sql = require('mssql');

async function updateRelationships() {
    try {
        const pool = await getConnection();
        
        // Target Manager: sar pat (ID 38)
        // Employees to link: Hardik (ID 1) and jems (ID 37)
        const employeesToUpdate = [1, 37];
        const managerId = 38;

        for (const empId of employeesToUpdate) {
            console.log(`Updating relationships for EmployeeId: ${empId}...`);
            await pool.request()
                .input('empId', sql.Int, empId)
                .input('mgrId', sql.Int, managerId)
                .query(`
                    UPDATE Employees 
                    SET ReportingTo = @mgrId, 
                        AttendanceApproverId = @mgrId,
                        LeaveApproverId = @mgrId
                    WHERE EmployeeId = @empId
                `);
        }

        console.log('✅ Relationships updated successfully.');

        // Verification
        const result = await pool.request()
            .input('mgrId', sql.Int, managerId)
            .query("SELECT EmployeeId, FirstName, LastName, ReportingTo, AttendanceApproverId FROM Employees WHERE ReportingTo = @mgrId");
        
        console.log('\n--- Current Reports for sar pat (ID 38) ---');
        console.table(result.recordset);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updateRelationships();
