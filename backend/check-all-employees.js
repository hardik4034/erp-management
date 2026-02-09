const { getConnection } = require('./config/database');

async function checkAllEmployees() {
    try {
        const pool = await getConnection();
        
        // Get ALL employees including inactive ones
        const result = await pool.request()
            .query('SELECT * FROM Employees ORDER BY EmployeeId');
        
        console.log(`Total employees in database: ${result.recordset.length}\n`);
        
        result.recordset.forEach(emp => {
            console.log(`ID: ${emp.EmployeeId}, Name: ${emp.FirstName} ${emp.LastName}, Email: ${emp.Email}, Status: ${emp.Status}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkAllEmployees();
