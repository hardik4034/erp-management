const { getConnection } = require('../config/database');
const { getAdminConnection } = require('../config/adminDatabase');
const sql = require('mssql');

async function test() {
    try {
        const appPool = await getConnection();
        const adminPool = await getAdminConnection();

        // Check employee 1 details
        const emp1 = await appPool.request()
            .query("SELECT EmployeeId, FirstName, LastName, IsDeleted, DeletedAt FROM Employees WHERE EmployeeId = 1");
        console.log('Employee ID 1:', emp1.recordset);

        // Check all employees including deleted
        const allEmp = await appPool.request()
            .query("SELECT EmployeeId, FirstName, LastName, IsDeleted, DeletedAt FROM Employees ORDER BY EmployeeId");
        console.log('\nAll Employees (incl deleted):');
        allEmp.recordset.forEach(e => console.log(`  ID=${e.EmployeeId} | ${e.FirstName} ${e.LastName} | IsDeleted=${e.IsDeleted} | DeletedAt=${e.DeletedAt}`));

        // Check what the user account points to
        const user = await adminPool.request()
            .query("SELECT id, username, employee_id FROM users WHERE id = 4");
        console.log('\nUser account 4:', user.recordset);

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
test();
