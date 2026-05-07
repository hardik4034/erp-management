const { getConnection } = require('../config/database');
const { getAdminConnection } = require('../config/adminDatabase');

async function checkDatabases() {
    try {
        console.log('--- Checking solar_invest (Admin DB) ---');
        const adminPool = await getAdminConnection();
        const adminResult = await adminPool.request().query('SELECT TOP 5 id, username, email, created_at FROM users ORDER BY created_at DESC');
        console.log('Recent Users in solar_invest:');
        console.table(adminResult.recordset);

        console.log('\n--- Checking HRMS (App DB) ---');
        const appPool = await getConnection();
        const appResult = await appPool.request().query('SELECT TOP 5 EmployeeId, EmployeeCode, FirstName, LastName, Email FROM Employees ORDER BY CreatedAt DESC');
        console.log('Recent Employees in HRMS:');
        console.table(appResult.recordset);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDatabases();
