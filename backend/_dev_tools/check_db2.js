const { getConnection } = require('../config/database');
async function test() {
    try {
        const appPool = await getConnection();
        const r = await appPool.request().query("SELECT EmployeeId, FirstName, LastName FROM Employees");
        console.log('All employees:', r.recordset);
        process.exit(0);
    } catch(e){
        console.error(e);
        process.exit(1);
    }
}
test();
