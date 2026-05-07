const { getConnection } = require('../config/database');
const { getAdminConnection } = require('../config/adminDatabase');
const sql = require('mssql');

async function test() {
    try {
        const adminPool = await getAdminConnection();
        const appPool = await getConnection();

        const userResult = await adminPool.request()
            .input('Id', sql.Int, 4)
            .query('SELECT * FROM users WHERE id = @Id OR employee_id = @Id');
        console.log('Users (Admin DB):', userResult.recordset);

        const empResult = await appPool.request()
            .input('Id', sql.Int, 4)
            .query('SELECT * FROM Employees WHERE EmployeeId = @Id');
        console.log('Employees (App DB):', empResult.recordset);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
