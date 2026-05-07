const { getConnection } = require('../config/database');

async function fix() {
    try {
        const pool = await getConnection();

        // Fix Employee ID 1 - set Status to Active
        const result = await pool.request()
            .query("UPDATE Employees SET Status = 'Active' WHERE EmployeeId = 1");
        
        console.log(`Fixed! Rows affected: ${result.rowsAffected[0]}`);

        // Verify
        const verify = await pool.request()
            .query("SELECT EmployeeId, FirstName, LastName, Status FROM Employees WHERE EmployeeId = 1");
        console.log('After fix:', verify.recordset);

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
fix();
